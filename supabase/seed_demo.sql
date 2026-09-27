-- Dữ liệu demo cho buổi bảo vệ: lượt bỏ rác rải trong 7 ngày gần nhất và việc
-- thu gom cho các thùng đang đầy. Chạy lại được: mỗi lần thêm một đợt mới.

-- 1. Hộ gia đình "Nhà bác Ba" bỏ rác ở thùng nhà mình (trigger tự +1 điểm/lượt).
insert into sort_events (local_id, device_id, user_id, waste_type, source, created_at)
select gen_random_uuid(), d.id, p.id,
       (array['huu_co','huu_co','vo_co','tai_che','tai_che'])[1 + (g % 5)]::waste_type,
       'manual',
       date_trunc('day', now()) - make_interval(days => g % 7) + make_interval(hours => 1 + (g * 5) % 12)
from generate_series(1, 18) as g
join profiles p on p.role = 'household'
join devices d on d.owner_id = p.id;

-- 2. Người dân bỏ rác ở các kiosk công cộng (ẩn danh).
insert into sort_events (local_id, device_id, user_id, waste_type, source, created_at)
select gen_random_uuid(), d.id, null,
       (array['huu_co','vo_co','vo_co','tai_che'])[1 + (g % 4)]::waste_type,
       'manual',
       date_trunc('day', now()) - make_interval(days => g % 7) + make_interval(hours => 1 + (g * 7) % 12)
from generate_series(1, 30) as g
join devices d on d.owner_id is null and d.code = (array['BIN-002','BIN-003'])[1 + (g % 2)];

-- 3. Việc thu gom đột xuất cho các thùng đang có ngăn ≥ 80% mà chưa có việc mở.
insert into collection_tasks (device_id, priority, shift, scheduled_date, note)
select distinct b.device_id, 'urgent', 'all_day', (now() at time zone 'Asia/Ho_Chi_Minh')::date, 'Thùng đầy trên 80%, cần thu gom sớm.'
from bins b
where b.fill_level >= 0.8
  and not exists (
    select 1 from collection_tasks t where t.device_id = b.device_id and t.status <> 'done'
  );
