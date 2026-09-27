-- Thu gom xong → các ngăn của thùng về 0% (khi có cảm biến ESP32, số đo thật
-- sẽ ghi đè). Không có bước này thùng cứ "đầy" mãi và không bao giờ vượt
-- ngưỡng 80% lần nữa để tự tạo việc mới.
create or replace function empty_bins_on_done() returns trigger as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    update bins set fill_level = 0, updated_at = now() where device_id = new.device_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists collection_tasks_empty_bins on collection_tasks;
create trigger collection_tasks_empty_bins
  after update of status on collection_tasks
  for each row execute function empty_bins_on_done();
