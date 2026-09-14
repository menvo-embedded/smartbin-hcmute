-- Dữ liệu mẫu để demo. Chạy 1 lần trong SQL Editor sau khi đã chạy schema.sql.

with new_device as (
  insert into devices (code, name, area, is_online)
  values ('BIN-001', 'Thùng rác khu A', 'Khu A', true)
  returning id
)
insert into bins (device_id, waste_type, fill_level)
select id, t.waste_type, 0.2
from new_device, unnest(array['plastic','paper','metal','other']::waste_type[]) as t(waste_type);

-- Cho phép nhân viên thu gom tự nhận một việc chưa ai nhận (RLS gốc chỉ cho
-- sửa việc đã được giao cho mình, nên việc mới tạo bởi trigger không ai nhận
-- được nếu không có policy này).
create policy "nhân viên nhận việc chưa có người" on collection_tasks
  for update
  using (assignee_id is null and status = 'pending' and my_role() = 'collector')
  with check (assignee_id = auth.uid());
