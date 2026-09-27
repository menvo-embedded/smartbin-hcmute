-- Hoàn thiện luồng Cộng đồng + Hộ gia đình (chạy 1 lần trên DB đang có dữ liệu).
-- schema.sql đã được cập nhật tương ứng cho lần dựng DB mới.

-- 1. Tài khoản test: đúng vai trò, đúng tên hiển thị.
update profiles set role = 'household', full_name = 'Nhà bác Ba'
  where id = (select id from auth.users where email = 'user1@test.com');
update profiles set full_name = 'Anh Tư (thu gom)'
  where id = (select id from auth.users where email = 'user2@test.com');
update profiles set full_name = 'Quản trị viên'
  where id = (select id from auth.users where email = 'user3@test.com');

-- 2. Cột lịch thu gom mà app admin/nhân viên đang dùng nhưng DB thật còn thiếu.
alter table collection_tasks
  add column if not exists scheduled_date date not null default current_date,
  add column if not exists shift text not null default 'morning'
    check (shift in ('morning', 'afternoon', 'all_day')),
  add column if not exists priority text not null default 'routine'
    check (priority in ('routine', 'urgent'));
create index if not exists collection_tasks_scheduled_date_shift_idx
  on collection_tasks (scheduled_date, shift);

create or replace function create_task_when_full() returns trigger as $$
begin
  if new.fill_level >= 0.8 and (old.fill_level is null or old.fill_level < 0.8) then
    insert into collection_tasks (device_id, priority, scheduled_date)
    select new.device_id, 'urgent', current_date
    where not exists (
      select 1 from collection_tasks
      where device_id = new.device_id and status <> 'done'
    );
  end if;
  return new;
end;
$$ language plpgsql;

-- 3. Mỗi lần hộ gia đình bỏ rác được +1 điểm.
create or replace function add_points_on_sort() returns trigger as $$
begin
  if new.user_id is not null then
    update profiles set points = points + 1
    where id = new.user_id and role = 'household';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists sort_events_add_points on sort_events;
create trigger sort_events_add_points
  after insert on sort_events
  for each row execute function add_points_on_sort();

-- Cộng bù điểm cho các lần bỏ rác đã có từ trước.
update profiles p
  set points = (select count(*) from sort_events s where s.user_id = p.id)
  where p.role = 'household';

-- 4. Kiosk cộng đồng không cần đăng nhập (vai trò anon của Supabase).
drop policy if exists "kiosk xem thiết bị" on devices;
create policy "kiosk xem thiết bị" on devices
  for select to anon using (true);

drop policy if exists "kiosk xem ngăn rác" on bins;
create policy "kiosk xem ngăn rác" on bins
  for select to anon using (true);

drop policy if exists "kiosk ghi sự kiện ẩn danh" on sort_events;
create policy "kiosk ghi sự kiện ẩn danh" on sort_events
  for insert to anon with check (user_id is null);

-- Cần để insert(...).select('id') trả về id cho hàng đợi đồng bộ.
drop policy if exists "kiosk đọc lại sự kiện ẩn danh" on sort_events;
create policy "kiosk đọc lại sự kiện ẩn danh" on sort_events
  for select to anon using (user_id is null);

-- 5. Các policy có trong schema.sql nhưng DB thật còn thiếu.
drop policy if exists "admin và chủ tài khoản sửa hồ sơ" on profiles;
create policy "admin và chủ tài khoản sửa hồ sơ" on profiles
  for update using (id = auth.uid() or my_role() = 'admin');

drop policy if exists "chỉ admin cập nhật ngăn rác" on bins;
create policy "chỉ admin cập nhật ngăn rác" on bins
  for all using (my_role() = 'admin');

drop policy if exists "admin tạo việc thu gom" on collection_tasks;
create policy "admin tạo việc thu gom" on collection_tasks
  for insert with check (my_role() = 'admin');
