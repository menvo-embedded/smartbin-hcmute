-- Đưa hệ thống về trạng thái đẹp để demo. Chạy lại bao nhiêu lần cũng được:
--   supabase db query --linked -f supabase/reset_demo.sql
-- GIỮ: tài khoản, điểm, lịch sử bỏ rác, các việc đã hoàn tất (có ảnh nghiệm thu).
-- XOÁ: mọi việc thu gom đang mở (chưa nhận / đang xử lý) — thường là dữ liệu test,
--       và toàn bộ thông báo / nhật ký tự động.
begin;

delete from collection_tasks where status <> 'done';
delete from notifications;

-- Thiết bị về trạng thái "chưa từng gửi nhịp tim" (không bị báo mất kết nối);
-- app kiosk / hộ gia đình mở lên sẽ tự gửi nhịp tim lại.
update devices set is_online = true, last_seen_at = null;
-- Nhân viên demo đang trực (Bình không có mật khẩu → nghỉ, không nhận việc tự động).
update profiles set on_duty = (full_name <> 'Trần Văn Bình') where role = 'collector';
update automation_settings set auto_dispatch = true, predictive_schedule = true,
  escalate_after_min = 30, offline_after_min = 10 where id = 1;

-- Về 0 trước, rồi đặt mức đầy demo. Trigger bins_fill_alert chạy khi mức đầy
-- VƯỢT ngưỡng: thùng B tái chế 60% → hệ thống tự lên lịch ca gần nhất và tự
-- giao nhân viên; vô cơ 85% → nâng việc đó lên khẩn. Thùng A, C dưới 60%.
update bins set fill_level = 0, updated_at = now();

update bins b set fill_level = v.fill, updated_at = now()
from devices d, (values
  ('BIN-001', 'huu_co', 0.30), ('BIN-001', 'vo_co', 0.20), ('BIN-001', 'tai_che', 0.45),
  ('BIN-002', 'huu_co', 0.40), ('BIN-002', 'vo_co', 0.85), ('BIN-002', 'tai_che', 0.60),
  ('BIN-003', 'huu_co', 0.10), ('BIN-003', 'vo_co', 0.50), ('BIN-003', 'tai_che', 0.55)
) as v(code, waste, fill)
where d.id = b.device_id and d.code = v.code and b.waste_type = v.waste::waste_type;

commit;

-- Kiểm tra nhanh sau khi chạy: việc hệ thống vừa tự tạo + tự giao.
select d.code, t.priority, t.shift, t.origin, t.auto_assigned, p.full_name as nhan_vien, t.note
from collection_tasks t
join devices d on d.id = t.device_id
left join profiles p on p.id = t.assignee_id
where t.status <> 'done';
