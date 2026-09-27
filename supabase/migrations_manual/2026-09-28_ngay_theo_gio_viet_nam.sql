-- current_date của Postgres theo giờ UTC → từ 0h–7h sáng ở VN bị lùi 1 ngày.
-- Ngày thu gom tính theo giờ Việt Nam; việc đột xuất (thùng đầy) để "Cả ngày".
begin;

alter table collection_tasks
  alter column scheduled_date set default (now() at time zone 'Asia/Ho_Chi_Minh')::date;

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

-- Sửa các việc đột xuất đang mở tạo bởi seed_demo.sql trong đêm nay.
update collection_tasks
  set scheduled_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date, shift = 'all_day'
  where priority = 'urgent' and status <> 'done';

commit;
