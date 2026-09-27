-- 1) Nhân viên chấm chất lượng phân loại khi thu gom thùng của hộ gia đình.
-- 2) Mỗi lượt bỏ rác làm ngăn tương ứng đầy thêm (ước lượng khi chưa có cảm biến).
begin;

alter table collection_tasks
  add column if not exists sorting_quality text
    check (sorting_quality in ('good', 'mixed'));

-- Phân loại đúng → hộ sở hữu thùng được +5 điểm (chỉ cộng một lần mỗi việc).
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

drop trigger if exists collection_tasks_reward_quality on collection_tasks;
create trigger collection_tasks_reward_quality
  after update of sorting_quality on collection_tasks
  for each row execute function reward_sorting_quality();

-- Hộ gia đình xem được các lần thu gom thùng nhà mình (để thấy đánh giá).
drop policy if exists "hộ gia đình xem thu gom thùng nhà mình" on collection_tasks;
create policy "hộ gia đình xem thu gom thùng nhà mình" on collection_tasks
  for select using (
    exists (select 1 from devices d where d.id = device_id and d.owner_id = auth.uid())
  );

-- Mỗi lượt bỏ rác ≈ 2% dung tích ngăn (thùng 60 L, mỗi lượt ~1,2 L). Có cảm
-- biến ESP32 thì số đo thật ghi đè lên fill_level. Vượt 80% → trigger
-- bins_fill_alert tự tạo việc thu gom.
create or replace function fill_bin_on_sort() returns trigger as $$
begin
  update bins
    set fill_level = least(1, fill_level + 0.02), updated_at = now()
    where device_id = new.device_id and waste_type = new.waste_type;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists sort_events_fill_bin on sort_events;
create trigger sort_events_fill_bin
  after insert on sort_events
  for each row execute function fill_bin_on_sort();

commit;
