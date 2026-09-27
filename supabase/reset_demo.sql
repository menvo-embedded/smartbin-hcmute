-- Đưa hệ thống về trạng thái đẹp để demo. Chạy lại bao nhiêu lần cũng được:
--   supabase db query --linked -f supabase/reset_demo.sql
-- GIỮ: tài khoản, điểm, lịch sử bỏ rác, các việc đã hoàn tất (có ảnh nghiệm thu).
-- XOÁ: mọi việc thu gom đang mở (chưa nhận / đang xử lý) — thường là dữ liệu test.
begin;

delete from collection_tasks where status <> 'done';

-- Về 0 trước, rồi đặt mức đầy demo: trigger bins_fill_alert chỉ chạy khi mức
-- đầy VƯỢT 80%, nên thùng B (85%) sẽ tự sinh đúng 1 việc đột xuất "Chờ phân công".
update bins set fill_level = 0, updated_at = now();

update bins b set fill_level = v.fill, updated_at = now()
from devices d, (values
  ('BIN-001', 'huu_co', 0.30), ('BIN-001', 'vo_co', 0.20), ('BIN-001', 'tai_che', 0.45),
  ('BIN-002', 'huu_co', 0.40), ('BIN-002', 'vo_co', 0.85), ('BIN-002', 'tai_che', 0.60),
  ('BIN-003', 'huu_co', 0.10), ('BIN-003', 'vo_co', 0.50), ('BIN-003', 'tai_che', 0.55)
) as v(code, waste, fill)
where d.id = b.device_id and d.code = v.code and b.waste_type = v.waste::waste_type;

commit;

-- Kiểm tra nhanh sau khi chạy.
select d.code, b.waste_type, b.fill_level
from bins b join devices d on d.id = b.device_id
order by d.code, b.waste_type;
