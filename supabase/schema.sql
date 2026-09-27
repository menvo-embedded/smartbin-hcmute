-- Schema cho Supabase. Chạy trong SQL Editor.

create type user_role as enum ('user', 'collector', 'admin', 'household');
create type waste_type as enum ('huu_co', 'vo_co', 'tai_che');
create type task_status as enum ('pending', 'in_progress', 'done');
create type sort_source as enum ('manual', 'ai');

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null default '',
  role       user_role not null default 'user',
  points     integer not null default 0,
  created_at timestamptz not null default now()
);

create table devices (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,           -- mã in trên QR dán ở thùng
  name         text not null,
  area         text not null default '',
  latitude     double precision,
  longitude    double precision,
  is_online    boolean not null default false,
  last_seen_at timestamptz,
  owner_id     uuid references profiles on delete set null  -- thùng riêng của hộ gia đình
);

create table bins (
  id         uuid primary key default gen_random_uuid(),
  device_id  uuid not null references devices on delete cascade,
  waste_type waste_type not null,
  fill_level real not null default 0 check (fill_level between 0 and 1),
  updated_at timestamptz not null default now(),
  unique (device_id, waste_type)
);

create table sort_events (
  id         uuid primary key default gen_random_uuid(),
  local_id   uuid unique,                      -- chống ghi trùng khi đồng bộ lại
  device_id  uuid not null references devices on delete cascade,
  user_id    uuid references profiles on delete set null,
  waste_type waste_type not null,
  source     sort_source not null default 'manual',
  confidence real,
  created_at timestamptz not null default now()
);

create table collection_tasks (
  id              uuid primary key default gen_random_uuid(),
  device_id       uuid not null references devices on delete cascade,
  assignee_id     uuid references profiles on delete set null,
  status          task_status not null default 'pending',
  proof_photo_url text,
  note            text,
  scheduled_date  date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,  -- ngày theo giờ VN
  shift           text not null default 'morning' check (shift in ('morning', 'afternoon', 'all_day')),
  priority        text not null default 'routine' check (priority in ('routine', 'urgent')),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  sorting_quality text check (sorting_quality in ('good', 'mixed'))  -- nhân viên chấm khi thu gom thùng hộ gia đình
);

create index on sort_events (device_id, created_at desc);
create index on collection_tasks (assignee_id, status);
create index on collection_tasks (scheduled_date, shift);

-- Tự tạo công việc thu gom khi một ngăn vượt ngưỡng đầy.
create or replace function create_task_when_full() returns trigger as $$
begin
  if new.fill_level >= 0.8 and (old.fill_level is null or old.fill_level < 0.8) then
    insert into collection_tasks (device_id, priority, shift, scheduled_date)
    select new.device_id, 'urgent', 'all_day', (now() at time zone 'Asia/Ho_Chi_Minh')::date
    where not exists (
      select 1 from collection_tasks
      where device_id = new.device_id and status <> 'done'
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger bins_fill_alert
  after update on bins
  for each row execute function create_task_when_full();

-- Mỗi lần hộ gia đình bỏ rác được +1 điểm (security definer để vượt RLS
-- của profiles — người dùng không tự sửa được điểm của mình).
create or replace function add_points_on_sort() returns trigger as $$
begin
  if new.user_id is not null then
    update profiles set points = points + 1
    where id = new.user_id and role = 'household';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger sort_events_add_points
  after insert on sort_events
  for each row execute function add_points_on_sort();

-- Phân loại đúng (nhân viên chấm) → hộ sở hữu thùng +5 điểm, một lần mỗi việc.
create or replace function reward_sorting_quality() returns trigger as $$
begin
  if new.sorting_quality = 'good' and old.sorting_quality is distinct from 'good' then
    update profiles p set points = p.points + 5
    from devices d
    where d.id = new.device_id and p.id = d.owner_id and p.role = 'household';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger collection_tasks_reward_quality
  after update of sorting_quality on collection_tasks
  for each row execute function reward_sorting_quality();

-- Mỗi lượt bỏ rác ≈ 2% dung tích ngăn (thùng 60 L, mỗi lượt ~1,2 L); cảm biến
-- ESP32 có thì số đo thật ghi đè. Vượt 80% → bins_fill_alert tạo việc thu gom.
create or replace function fill_bin_on_sort() returns trigger as $$
begin
  update bins
    set fill_level = least(1, fill_level + 0.02), updated_at = now()
    where device_id = new.device_id and waste_type = new.waste_type;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger sort_events_fill_bin
  after insert on sort_events
  for each row execute function fill_bin_on_sort();

-- Thu gom xong → các ngăn của thùng về 0% (cảm biến ESP32 có thì đo lại).
create or replace function empty_bins_on_done() returns trigger as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    update bins set fill_level = 0, updated_at = now() where device_id = new.device_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger collection_tasks_empty_bins
  after update of status on collection_tasks
  for each row execute function empty_bins_on_done();

-- Phân quyền theo vai trò.
alter table profiles enable row level security;
alter table devices enable row level security;
alter table bins enable row level security;
alter table sort_events enable row level security;
alter table collection_tasks enable row level security;

create or replace function my_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create policy "đọc hồ sơ của mình" on profiles
  for select using (id = auth.uid() or my_role() = 'admin');

create policy "admin và chủ tài khoản sửa hồ sơ" on profiles
  for update using (id = auth.uid() or my_role() = 'admin');

create policy "ai đăng nhập cũng xem được thiết bị" on devices
  for select using (auth.uid() is not null);

create policy "chỉ admin sửa thiết bị" on devices
  for all using (my_role() = 'admin');

create policy "ai đăng nhập cũng xem được ngăn rác" on bins
  for select using (auth.uid() is not null);

create policy "chỉ admin cập nhật ngăn rác" on bins
  for all using (my_role() = 'admin');

create policy "tự ghi sự kiện của mình" on sort_events
  for insert with check (user_id = auth.uid());

create policy "xem sự kiện của mình, admin xem tất cả" on sort_events
  for select using (user_id = auth.uid() or my_role() = 'admin');

-- Kiosk cộng đồng chạy không đăng nhập (vai trò anon): chỉ xem thiết bị,
-- ngăn rác và ghi/đọc lại sự kiện ẩn danh (user_id rỗng).
create policy "kiosk xem thiết bị" on devices
  for select to anon using (true);

create policy "kiosk xem ngăn rác" on bins
  for select to anon using (true);

create policy "kiosk ghi sự kiện ẩn danh" on sort_events
  for insert to anon with check (user_id is null);

create policy "kiosk đọc lại sự kiện ẩn danh" on sort_events
  for select to anon using (user_id is null);

create policy "nhân viên xem việc được giao" on collection_tasks
  for select using (assignee_id = auth.uid() or my_role() = 'admin');

create policy "hộ gia đình xem thu gom thùng nhà mình" on collection_tasks
  for select using (
    exists (select 1 from devices d where d.id = device_id and d.owner_id = auth.uid())
  );

-- Nhân viên cần thấy việc chưa ai nhận thì mới bấm "Nhận việc" được.
create policy "nhân viên xem việc chưa có người" on collection_tasks
  for select using (assignee_id is null and my_role() = 'collector');

create policy "nhân viên cập nhật việc của mình" on collection_tasks
  for update using (assignee_id = auth.uid() or my_role() = 'admin');

create policy "admin tạo việc thu gom" on collection_tasks
  for insert with check (my_role() = 'admin');

-- Cho phép nhận một việc chưa ai nhận (trigger tạo việc không gán assignee_id).
create policy "nhân viên nhận việc chưa có người" on collection_tasks
  for update
  using (assignee_id is null and status = 'pending' and my_role() = 'collector')
  with check (assignee_id = auth.uid());

-- Supabase Realtime cho các bảng màn admin theo dõi (RLS vẫn áp dụng).
alter publication supabase_realtime add table bins, collection_tasks, sort_events;
