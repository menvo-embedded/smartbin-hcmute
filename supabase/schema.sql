-- Schema cho Supabase. Chạy trong SQL Editor.

create type user_role as enum ('user', 'collector', 'admin');
create type waste_type as enum ('plastic', 'paper', 'metal', 'other');
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
  last_seen_at timestamptz
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
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index on sort_events (device_id, created_at desc);
create index on collection_tasks (assignee_id, status);

-- Tự tạo công việc thu gom khi một ngăn vượt ngưỡng đầy.
create or replace function create_task_when_full() returns trigger as $$
begin
  if new.fill_level >= 0.8 and (old.fill_level is null or old.fill_level < 0.8) then
    insert into collection_tasks (device_id)
    select new.device_id
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

create policy "ai đăng nhập cũng xem được thiết bị" on devices
  for select using (auth.uid() is not null);

create policy "chỉ admin sửa thiết bị" on devices
  for all using (my_role() = 'admin');

create policy "ai đăng nhập cũng xem được ngăn rác" on bins
  for select using (auth.uid() is not null);

create policy "tự ghi sự kiện của mình" on sort_events
  for insert with check (user_id = auth.uid());

create policy "xem sự kiện của mình, admin xem tất cả" on sort_events
  for select using (user_id = auth.uid() or my_role() = 'admin');

create policy "nhân viên xem việc được giao" on collection_tasks
  for select using (assignee_id = auth.uid() or my_role() = 'admin');

create policy "nhân viên cập nhật việc của mình" on collection_tasks
  for update using (assignee_id = auth.uid() or my_role() = 'admin');

-- Cho phép nhận một việc chưa ai nhận (trigger tạo việc không gán assignee_id).
create policy "nhân viên nhận việc chưa có người" on collection_tasks
  for update
  using (assignee_id is null and status = 'pending' and my_role() = 'collector')
  with check (assignee_id = auth.uid());
