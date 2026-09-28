-- TỰ ĐỘNG HOÁ: hệ thống tự lên lịch, tự giao việc, tự nhắc/leo thang, tự
-- giám sát thiết bị và tự gửi thông báo cho từng vai trò. Chạy một lần:
--   supabase db query --linked -f supabase/migrations_manual/2026-09-28_tu_dong_hoa.sql
--
-- Sự kiện → phản ứng tự động:
--   ngăn rác vượt 60%    → tạo việc "lịch ca" cho ca gần nhất + giao nhân viên
--   ngăn rác vượt 80%    → tạo việc khẩn (hoặc nâng việc đang có lên khẩn)
--   việc mới được tạo    → giao cho nhân viên đang trực ít việc nhất
--   việc bị bỏ quá hạn   → tự giao / nhắc nhân viên + báo quản lý   (mỗi 5 phút)
--   tốc độ bỏ rác 24 giờ → dự báo giờ đầy, lên lịch trước               (mỗi 5 phút)
--   thùng im lặng lâu    → đánh dấu mất kết nối + báo quản lý          (mỗi 5 phút)
--   mọi việc trên        → ghi vào bảng notifications (app nhận realtime)

-- ============ 1. Cấu hình (1 dòng duy nhất, admin bật/tắt trong app) ============
create table if not exists automation_settings (
  id                  int primary key default 1 check (id = 1),
  auto_dispatch       boolean not null default true,  -- tự giao việc
  predictive_schedule boolean not null default true,  -- tự lên lịch trước khi đầy
  escalate_after_min  int not null default 30 check (escalate_after_min between 5 and 1440),
  offline_after_min   int not null default 10 check (offline_after_min between 2 and 1440),
  updated_at          timestamptz not null default now()
);
insert into automation_settings (id) values (1) on conflict do nothing;

-- Nhân viên đang trực mới được tự giao việc.
alter table profiles add column if not exists on_duty boolean not null default true;

-- Việc do hệ thống tạo/giao (để hiển thị nhãn "Tự động" và thống kê).
alter table collection_tasks add column if not exists origin text not null default 'manual'
  check (origin in ('manual', 'auto_full', 'auto_forecast'));
alter table collection_tasks add column if not exists auto_assigned boolean not null default false;
alter table collection_tasks add column if not exists escalated_at timestamptz;

-- ============ 2. Thông báo ============
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles on delete cascade,  -- null = gửi mọi quản lý
  kind         text not null,
  title        text not null,
  body         text not null default '',
  device_id    uuid references devices on delete cascade,
  task_id      uuid references collection_tasks on delete cascade,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index if not exists notifications_recipient_idx on notifications (recipient_id, created_at desc);

-- ============ 3. Hàm tiện ích ============
create or replace function waste_label(w waste_type) returns text as $$
  select case w when 'huu_co' then 'Hữu cơ' when 'vo_co' then 'Vô cơ' else 'Tái chế' end;
$$ language sql immutable;

create or replace function shift_label(s text) returns text as $$
  select case s when 'morning' then 'ca sáng' when 'afternoon' then 'ca chiều' else 'trong ngày' end;
$$ language sql immutable;

create or replace function notify(
  p_recipient uuid, p_kind text, p_title text, p_body text,
  p_device uuid default null, p_task uuid default null
) returns void as $$
  insert into notifications (recipient_id, kind, title, body, device_id, task_id)
  values (p_recipient, p_kind, p_title, p_body, p_device, p_task);
$$ language sql security definer set search_path = public;

-- Ca gần nhất còn làm được (giờ Việt Nam): đang ca sáng → ca sáng, đang ca
-- chiều → ca chiều, tối → ca sáng hôm sau.
create or replace function next_shift(out shift_date date, out shift text) as $$
declare
  vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  h int := extract(hour from vn);
begin
  if h < 11 then
    shift_date := vn::date; shift := 'morning';
  elsif h < 17 then
    shift_date := vn::date; shift := 'afternoon';
  else
    shift_date := vn::date + 1; shift := 'morning';
  end if;
end;
$$ language plpgsql stable;

-- Chọn nhân viên đang trực ít việc nhất trong ngày (hoà thì ít việc tồn nhất).
create or replace function pick_collector(p_date date, p_exclude uuid default null) returns uuid as $$
  select p.id
  from profiles p
  where p.role = 'collector' and p.on_duty and p.id is distinct from p_exclude
  order by
    (select count(*) from collection_tasks t
      where t.assignee_id = p.id and t.status <> 'done' and t.scheduled_date = p_date),
    (select count(*) from collection_tasks t where t.assignee_id = p.id and t.status <> 'done'),
    random()
  limit 1;
$$ language sql volatile security definer set search_path = public;

-- Hệ thống tự tạo một việc thu gom (không tạo trùng nếu thùng đã có việc mở).
create or replace function auto_create_task(p_device uuid, p_priority text, p_origin text, p_note text)
returns uuid as $$
declare
  ns record;
  new_id uuid;
begin
  if exists (select 1 from collection_tasks where device_id = p_device and status <> 'done') then
    return null;
  end if;
  if p_priority = 'urgent' then
    insert into collection_tasks (device_id, priority, shift, scheduled_date, origin, note)
    values (p_device, 'urgent', 'all_day', (now() at time zone 'Asia/Ho_Chi_Minh')::date, p_origin, p_note)
    returning id into new_id;
  else
    select * into ns from next_shift();
    insert into collection_tasks (device_id, priority, shift, scheduled_date, origin, note)
    values (p_device, 'routine', ns.shift, ns.shift_date, p_origin, p_note)
    returning id into new_id;
  end if;
  return new_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ============ 4. Tự giao việc khi việc được tạo mà chưa có người ============
create or replace function auto_dispatch_task() returns trigger as $$
declare
  c uuid;
begin
  if new.assignee_id is null and (select auto_dispatch from automation_settings where id = 1) then
    c := pick_collector(new.scheduled_date);
    if c is not null then
      new.assignee_id := c;
      new.status := 'in_progress';
      new.auto_assigned := true;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists collection_tasks_auto_dispatch on collection_tasks;
create trigger collection_tasks_auto_dispatch
  before insert on collection_tasks
  for each row execute function auto_dispatch_task();

-- ============ 5. Thông báo theo vòng đời công việc ============
create or replace function notify_task_created() returns trigger as $$
declare
  d devices;
  staff text;
begin
  select * into d from devices where id = new.device_id;
  select full_name into staff from profiles where id = new.assignee_id;

  if new.assignee_id is not null then
    perform notify(new.assignee_id, 'task_assigned',
      case when new.priority = 'urgent' then '⚠️ Việc khẩn: ' else '📋 Việc mới: ' end || d.name,
      d.area || ' · ' || shift_label(new.shift) || ' ' || to_char(new.scheduled_date, 'DD/MM')
        || coalesce(' · ' || new.note, ''),
      d.id, new.id);
  end if;

  if new.origin <> 'manual' or new.auto_assigned then
    perform notify(null, 'auto_task',
      '🤖 Tự động ' || case when new.origin = 'manual' then 'giao' else 'tạo' end || ' việc: ' || d.name,
      coalesce(new.note || ' · ', '')
        || case when staff is not null then 'Giao cho ' || staff || ' (' || shift_label(new.shift) || ')'
                else 'Chưa có nhân viên trực để giao' end,
      d.id, new.id);
  end if;

  if d.owner_id is not null then
    perform notify(d.owner_id, 'pickup_scheduled', '🚛 Đã lên lịch thu gom thùng nhà bạn',
      upper(left(shift_label(new.shift), 1)) || substr(shift_label(new.shift), 2) || ' ngày ' || to_char(new.scheduled_date, 'DD/MM')
        || coalesce(' — nhân viên ' || staff, ''),
      d.id, new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists collection_tasks_notify_insert on collection_tasks;
create trigger collection_tasks_notify_insert
  after insert on collection_tasks
  for each row execute function notify_task_created();

create or replace function notify_task_updated() returns trigger as $$
declare
  d devices;
  staff text;
begin
  select * into d from devices where id = new.device_id;
  select full_name into staff from profiles where id = new.assignee_id;

  -- Được giao việc (bởi quản lý hoặc hệ thống) — không báo khi tự bấm "Nhận việc".
  if new.assignee_id is not null and new.assignee_id is distinct from old.assignee_id
     and auth.uid() is distinct from new.assignee_id then
    perform notify(new.assignee_id, 'task_assigned',
      case when new.priority = 'urgent' then '⚠️ Việc khẩn: ' else '📋 Việc mới: ' end || d.name,
      d.area || ' · ' || shift_label(new.shift) || ' ' || to_char(new.scheduled_date, 'DD/MM'),
      d.id, new.id);
  end if;

  -- Việc đang theo lịch bị nâng lên khẩn (thùng đầy nhanh hơn dự báo).
  if new.priority = 'urgent' and old.priority = 'routine' and new.assignee_id is not null then
    perform notify(new.assignee_id, 'task_urgent', '⚠️ Nâng lên khẩn: ' || d.name,
      'Thùng đã vượt 80%, cần thu gom ngay trong ngày', d.id, new.id);
  end if;

  if new.status = 'done' and old.status is distinct from 'done' then
    perform notify(null, 'task_done', '✅ Đã thu gom: ' || d.name,
      coalesce(staff, 'Nhân viên') || ' hoàn tất lúc '
        || to_char(coalesce(new.completed_at, now()) at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI'),
      d.id, new.id);
    if d.owner_id is not null then
      perform notify(d.owner_id, 'pickup_done', '✅ Đã thu gom thùng nhà bạn',
        'Thùng đã được làm trống. Cảm ơn bạn đã phân loại rác!', d.id, new.id);
    end if;
  end if;

  if d.owner_id is not null and new.sorting_quality is distinct from old.sorting_quality then
    if new.sorting_quality = 'good' then
      perform notify(d.owner_id, 'sorting_good', '🎉 Phân loại đúng: +5 điểm',
        'Nhân viên thu gom đánh giá rác nhà bạn được phân loại tốt.', d.id, new.id);
    elsif new.sorting_quality = 'mixed' then
      perform notify(d.owner_id, 'sorting_mixed', '♻️ Rác còn bị lẫn loại',
        'Thử dùng "Tra cứu rác" hoặc camera AI để bỏ đúng ngăn nhé.', d.id, new.id);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists collection_tasks_notify_update on collection_tasks;
create trigger collection_tasks_notify_update
  after update on collection_tasks
  for each row execute function notify_task_updated();

-- ============ 6. Ngăn rác đầy dần → tự lên lịch / tự tạo việc khẩn ============
create or replace function create_task_when_full() returns trigger as $$
declare
  d devices;
  open_task collection_tasks;
begin
  select * into d from devices where id = new.device_id;

  if new.fill_level >= 0.8 and (old.fill_level is null or old.fill_level < 0.8) then
    select * into open_task from collection_tasks
      where device_id = new.device_id and status <> 'done' limit 1;
    if open_task.id is null then
      perform auto_create_task(new.device_id, 'urgent', 'auto_full',
        'Ngăn ' || waste_label(new.waste_type) || ' vượt 80%');
    elsif open_task.priority = 'routine' then
      update collection_tasks
        set priority = 'urgent', shift = 'all_day',
            scheduled_date = least(scheduled_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date),
            note = 'Ngăn ' || waste_label(new.waste_type) || ' vượt 80% (đầy nhanh hơn dự báo)'
        where id = open_task.id;
    end if;
    if d.owner_id is not null then
      perform notify(d.owner_id, 'bin_full', '⚠️ Thùng nhà bạn sắp đầy',
        'Ngăn ' || waste_label(new.waste_type) || ' đã ' || round(new.fill_level * 100) || '% — đã báo nhân viên thu gom.',
        d.id, null);
    end if;
  elsif new.fill_level >= 0.6 and (old.fill_level is null or old.fill_level < 0.6)
        and (select predictive_schedule from automation_settings where id = 1) then
    perform auto_create_task(new.device_id, 'routine', 'auto_forecast',
      'Ngăn ' || waste_label(new.waste_type) || ' đạt 60% — thu gom trước khi đầy');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- (trigger bins_fill_alert đã có sẵn, dùng lại hàm mới ở trên)

-- ============ 7. Giám sát thiết bị: nhịp tim ============
-- App kiosk / hộ gia đình gọi định kỳ khi đang kết nối thùng; mỗi lượt bỏ rác
-- cũng tính là một nhịp. Thùng im lặng quá offline_after_min → mất kết nối.
create or replace function device_heartbeat(p_device_id uuid) returns void as $$
declare
  was_online boolean;
  d_name text;
begin
  select is_online, name into was_online, d_name from devices where id = p_device_id;
  if not found then return; end if;
  update devices set is_online = true, last_seen_at = now() where id = p_device_id;
  if not was_online then
    perform notify(null, 'device_online', '🟢 Kết nối lại: ' || d_name,
      'Thiết bị hoạt động trở lại lúc ' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI'),
      p_device_id, null);
  end if;
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function device_heartbeat(uuid) to anon, authenticated;

create or replace function heartbeat_on_sort() returns trigger as $$
begin
  perform device_heartbeat(new.device_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists sort_events_heartbeat on sort_events;
create trigger sort_events_heartbeat
  after insert on sort_events
  for each row execute function heartbeat_on_sort();

-- ============ 8. Vòng tự động định kỳ (pg_cron mỗi 5 phút, admin bấm "Chạy ngay") ============
create or replace function run_automation() returns json as $$
declare
  s automation_settings;
  r record;
  b record;
  c uuid;
  rate double precision;
  hours double precision;
  n_offline int := 0;
  n_escalated int := 0;
  n_planned int := 0;
begin
  -- Người dùng gọi thì phải là quản lý (pg_cron chạy không có auth.uid()).
  if auth.uid() is not null and my_role() <> 'admin' then
    raise exception 'Chỉ quản lý được chạy tự động hoá';
  end if;
  select * into s from automation_settings where id = 1;

  -- a) Thiết bị im lặng quá lâu → mất kết nối.
  for r in
    update devices set is_online = false
    where is_online and last_seen_at is not null
      and last_seen_at < now() - make_interval(mins => s.offline_after_min)
    returning id, name, last_seen_at
  loop
    perform notify(null, 'device_offline', '🔴 Mất kết nối: ' || r.name,
      'Không nhận tín hiệu từ ' || to_char(r.last_seen_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM'),
      r.id, null);
    n_offline := n_offline + 1;
  end loop;

  -- b) Việc bị bỏ quên quá escalate_after_min phút.
  for r in
    select t.*, d.name as device_name from collection_tasks t join devices d on d.id = t.device_id
    where t.status <> 'done' and t.escalated_at is null
      and t.created_at < now() - make_interval(mins => s.escalate_after_min)
      and (t.assignee_id is null or t.priority = 'urgent')
  loop
    if r.assignee_id is null then
      c := case when s.auto_dispatch then pick_collector(r.scheduled_date) end;
      if c is not null then
        update collection_tasks
          set assignee_id = c, status = 'in_progress', auto_assigned = true, escalated_at = now()
          where id = r.id;  -- trigger tự báo cho nhân viên
      else
        update collection_tasks set escalated_at = now() where id = r.id;
        perform notify(null, 'task_escalated', '⏰ Chưa ai nhận: ' || r.device_name,
          'Việc đã chờ quá ' || s.escalate_after_min || ' phút, không có nhân viên đang trực.', r.device_id, r.id);
      end if;
    else
      update collection_tasks set escalated_at = now() where id = r.id;
      perform notify(r.assignee_id, 'task_reminder', '⏰ Nhắc việc khẩn: ' || r.device_name,
        'Việc khẩn đã quá ' || s.escalate_after_min || ' phút, vui lòng xử lý sớm.', r.device_id, r.id);
      perform notify(null, 'task_escalated', '⏰ Việc khẩn chậm: ' || r.device_name,
        'Đã nhắc ' || coalesce((select full_name from profiles where id = r.assignee_id), 'nhân viên')
          || ' (quá ' || s.escalate_after_min || ' phút).', r.device_id, r.id);
    end if;
    n_escalated := n_escalated + 1;
  end loop;

  -- c) Dự báo theo tốc độ bỏ rác 24 giờ qua (mỗi lượt +2% như fill_bin_on_sort).
  if s.predictive_schedule then
    for r in
      select d.id from devices d
      where not exists (select 1 from collection_tasks t where t.device_id = d.id and t.status <> 'done')
    loop
      for b in select * from bins where device_id = r.id and fill_level < 0.8 loop
        select count(*) * 0.02 / 24.0 into rate from sort_events e
          where e.device_id = r.id and e.waste_type = b.waste_type
            and e.created_at > now() - interval '24 hours';
        if rate > 0 then
          hours := (0.8 - b.fill_level) / rate;
          if hours <= 12 and auto_create_task(r.id, 'routine', 'auto_forecast',
               'Dự báo ngăn ' || waste_label(b.waste_type) || ' đầy sau ~' || ceil(hours) || ' giờ') is not null then
            n_planned := n_planned + 1;
            exit;
          end if;
        end if;
      end loop;
    end loop;
  end if;

  -- d) Dọn thông báo cũ.
  delete from notifications where created_at < now() - interval '30 days';

  return json_build_object('offline', n_offline, 'escalated', n_escalated, 'planned', n_planned);
end;
$$ language plpgsql security definer set search_path = public;
grant execute on function run_automation() to authenticated;

-- ============ 9. Phân quyền ============
alter table automation_settings enable row level security;
alter table notifications enable row level security;

drop policy if exists "đăng nhập xem cấu hình tự động" on automation_settings;
create policy "đăng nhập xem cấu hình tự động" on automation_settings
  for select using (auth.uid() is not null);
drop policy if exists "admin sửa cấu hình tự động" on automation_settings;
create policy "admin sửa cấu hình tự động" on automation_settings
  for update using (my_role() = 'admin');

drop policy if exists "xem thông báo của mình" on notifications;
create policy "xem thông báo của mình" on notifications
  for select using (recipient_id = auth.uid() or (recipient_id is null and my_role() = 'admin'));
drop policy if exists "đánh dấu đã đọc" on notifications;
create policy "đánh dấu đã đọc" on notifications
  for update using (recipient_id = auth.uid() or (recipient_id is null and my_role() = 'admin'));

-- Realtime: thông báo + trạng thái online của thiết bị.
alter publication supabase_realtime add table notifications, devices;

-- Tài khoản Bình không dùng để demo (không có mật khẩu) → không nhận việc tự động.
update profiles set on_duty = false where full_name = 'Trần Văn Bình';

-- ============ 10. Lịch chạy mỗi 5 phút ============
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('smartbin-tu-dong-hoa', '*/5 * * * *', $$select public.run_automation()$$);
