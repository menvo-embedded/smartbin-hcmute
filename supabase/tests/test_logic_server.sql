-- KIỂM THỬ TOÀN BỘ LOGIC SERVER (trigger, RLS theo vai trò, tự động hoá).
-- Chạy trong 1 transaction rồi ROLLBACK — không để lại dữ liệu:
--   supabase db query --linked -f supabase/tests/test_logic_server.sql
-- Kết quả: mỗi dòng một phép kiểm tra, cột ok = true là đạt.
-- Giả định trạng thái sau reset_demo.sql. Đóng vai người dùng bằng
-- set_config('request.jwt.claims') + set local role (giống PostgREST).
begin;

create temp table r (n serial, name text, ok boolean, detail text);
grant all on r to public;
grant usage on sequence r_n_seq to public;

create temp table v (k text primary key, val text);
insert into v values
  ('hh', '045af3af-8fd3-4620-a5c0-b28cdea0e38a'),
  ('admin', 'bc04c0c4-2f0f-4019-8f72-395f50e01275'),
  ('an', 'd5a8efa9-17a9-43d0-bb2e-a773e57ca4f0'),
  ('cuong', 'a63a0cd0-93a0-49bb-bb4f-34cf1c2ee473');
insert into v select 'bin1', id::text from devices where code = 'BIN-001';
insert into v select 'bin2', id::text from devices where code = 'BIN-002';
insert into v select 'bin3', id::text from devices where code = 'BIN-003';
grant all on v to public;

create function pg_temp.id(key text) returns uuid as $$ select val::uuid from v where k = key $$ language sql;
create function pg_temp.fill(dev text, w text) returns real as $$
  select fill_level from bins where device_id = pg_temp.id(dev) and waste_type = w::waste_type $$ language sql;
create function pg_temp.claims(key text) returns text as $$
  select set_config('request.jwt.claims',
    case when key = 'anon' then '{"role":"anon"}'
    else json_build_object('sub', pg_temp.id(key), 'role', 'authenticated')::text end, true) $$ language sql;

-- Trạng thái đầu
insert into r (name, ok, detail) select '0. trạng thái đầu: BIN-002 có 1 việc mở, giao An',
  count(*) = 1 and bool_and(assignee_id = pg_temp.id('an')), count(*)::text
  from collection_tasks where device_id = pg_temp.id('bin2') and status <> 'done';
insert into v values ('pts_hh', (select points from profiles where id = pg_temp.id('hh'))::text);
insert into v values ('f2', pg_temp.fill('bin2', 'huu_co')::text);

-- ========== 1. KIOSK (anon) ==========
update devices set is_online = false, last_seen_at = null where id = pg_temp.id('bin2');
select pg_temp.claims('anon');
set local role anon;
insert into sort_events (device_id, user_id, waste_type, source, confidence)
  values ((select val::uuid from v where k = 'bin2'), null, 'huu_co', 'ai', 0.91);
do $$ begin
  insert into sort_events (device_id, user_id, waste_type) values
    ((select val::uuid from v where k = 'bin2'), (select val::uuid from v where k = 'hh'), 'huu_co');
  insert into r (name, ok, detail) values ('1b. kiosk KHÔNG ghi được sự kiện mang user_id', false, 'đã ghi được');
exception when others then
  insert into r (name, ok, detail) values ('1b. kiosk KHÔNG ghi được sự kiện mang user_id', true, sqlerrm);
end $$;
insert into r (name, ok, detail) select '1c. kiosk xem được thiết bị + ngăn rác',
  (select count(*) from devices) = 3 and (select count(*) from bins) = 9, null;
insert into r (name, ok, detail) select '1d. kiosk không xem được việc thu gom / thông báo',
  (select count(*) from collection_tasks) = 0 and (select count(*) from notifications) = 0, null;
reset role;
insert into r (name, ok, detail) select '1a. bỏ rác ở kiosk: ngăn +2%',
  abs(pg_temp.fill('bin2', 'huu_co') - (select val::real from v where k = 'f2') - 0.02) < 0.001,
  pg_temp.fill('bin2', 'huu_co')::text;
insert into r (name, ok, detail) select '1e. bỏ rác = nhịp tim: thiết bị online + last_seen',
  is_online and last_seen_at is not null, null from devices where id = pg_temp.id('bin2');
insert into r (name, ok, detail) select '1f. thiết bị kết nối lại → báo quản lý',
  count(*) = 1, null from notifications where kind = 'device_online' and device_id = pg_temp.id('bin2');

-- ========== 2. HỘ GIA ĐÌNH ==========
select pg_temp.claims('hh');
set local role authenticated;
insert into sort_events (device_id, user_id, waste_type, source)
  values ((select val::uuid from v where k = 'bin1'), (select val::uuid from v where k = 'hh'), 'tai_che', 'manual');
do $$ begin
  insert into sort_events (device_id, user_id, waste_type) values
    ((select val::uuid from v where k = 'bin1'), (select val::uuid from v where k = 'an'), 'tai_che');
  insert into r (name, ok, detail) values ('2b. hộ KHÔNG ghi được sự kiện đứng tên người khác', false, null);
exception when others then
  insert into r (name, ok, detail) values ('2b. hộ KHÔNG ghi được sự kiện đứng tên người khác', true, sqlerrm);
end $$;
update automation_settings set auto_dispatch = false;
update bins set fill_level = 0 where device_id = (select val::uuid from v where k = 'bin1');
insert into r (name, ok, detail) select '2d. hộ chỉ xem được hồ sơ của mình', count(*) = 1, count(*)::text from profiles;
insert into r (name, ok, detail) select '2e. hộ không xem việc của thùng khác',
  count(*) = 0, null from collection_tasks where device_id <> (select val::uuid from v where k = 'bin1');
insert into r (name, ok, detail) select '2f. hộ không thấy nhật ký quản lý', count(*) = 0, null
  from notifications where recipient_id is null;
reset role;
insert into r (name, ok, detail) select '2a. hộ bỏ rác → +1 điểm',
  points = (select val::int from v where k = 'pts_hh') + 1, points::text from profiles where id = pg_temp.id('hh');
insert into r (name, ok, detail) select '2c. hộ KHÔNG sửa được cấu hình tự động / mức đầy',
  (select auto_dispatch from automation_settings) and pg_temp.fill('bin1', 'huu_co') > 0, null;

-- ========== 3. NGƯỠNG 60% / 80% (admin mô phỏng) ==========
select pg_temp.claims('admin');
set local role authenticated;
update bins set fill_level = 0.62 where device_id = (select val::uuid from v where k = 'bin3') and waste_type = 'huu_co';
reset role;
insert into v select 't3', id::text from collection_tasks where device_id = pg_temp.id('bin3') and status <> 'done';
insert into r (name, ok, detail) select '3a. vượt 60% → tự tạo việc lịch ca (auto_forecast)',
  count(*) = 1 and bool_and(priority = 'routine' and origin = 'auto_forecast' and shift <> 'all_day'),
  string_agg(priority || '/' || shift || '/' || origin, ',') from collection_tasks
  where device_id = pg_temp.id('bin3') and status <> 'done';
insert into r (name, ok, detail) select '3b. tự giao cho người đang trực ít việc nhất (Cường, An đã có 1)',
  assignee_id = pg_temp.id('cuong') and auto_assigned and status = 'in_progress',
  (select full_name from profiles where id = assignee_id) from collection_tasks where id = pg_temp.id('t3');
insert into r (name, ok, detail) select '3c. báo Cường việc mới + nhật ký quản lý',
  (select count(*) from notifications where task_id = pg_temp.id('t3') and recipient_id = pg_temp.id('cuong') and kind = 'task_assigned') = 1
  and (select count(*) from notifications where task_id = pg_temp.id('t3') and recipient_id is null and kind = 'auto_task') = 1, null;
select pg_temp.claims('admin');
set local role authenticated;
update bins set fill_level = 0.85 where device_id = (select val::uuid from v where k = 'bin3') and waste_type = 'huu_co';
update bins set fill_level = 0.95 where device_id = (select val::uuid from v where k = 'bin3') and waste_type = 'vo_co';
reset role;
insert into r (name, ok, detail) select '3d. vượt 80% → nâng việc lên khẩn, không tạo trùng',
  (select count(*) from collection_tasks where device_id = pg_temp.id('bin3') and status <> 'done') = 1
  and priority = 'urgent' and shift = 'all_day', priority || ' ' || coalesce(note, '') from collection_tasks where id = pg_temp.id('t3');
insert into r (name, ok, detail) select '3e. báo Cường việc được nâng khẩn', count(*) = 1, null
  from notifications where task_id = pg_temp.id('t3') and kind = 'task_urgent' and recipient_id = pg_temp.id('cuong');
-- Thùng mới đầy thẳng lên 85% (không qua 60%) → việc khẩn luôn
update bins set fill_level = 0.85 where device_id = pg_temp.id('bin1') and waste_type = 'vo_co';
insert into v select 't1', id::text from collection_tasks where device_id = pg_temp.id('bin1') and status <> 'done';
insert into r (name, ok, detail) select '3f. nhảy thẳng qua 80% → việc khẩn auto_full',
  priority = 'urgent' and origin = 'auto_full' and assignee_id is not null,
  (select full_name from profiles where id = assignee_id) from collection_tasks where id = pg_temp.id('t1');
insert into r (name, ok, detail) select '3g. hộ gia đình được báo: thùng đầy + đã lên lịch',
  (select count(*) from notifications where recipient_id = pg_temp.id('hh') and kind = 'bin_full') = 1
  and (select count(*) from notifications where recipient_id = pg_temp.id('hh') and kind = 'pickup_scheduled') = 1, null;
insert into v select 't1_who', assignee_id::text from collection_tasks where id = pg_temp.id('t1');

-- ========== 4. NHÂN VIÊN ==========
select set_config('request.jwt.claims',
  json_build_object('sub', (select val from v where k = 't1_who'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into r (name, ok, detail) select '4a. nhân viên chỉ thấy việc của mình (+ việc chưa ai nhận)',
  bool_and(assignee_id = (select val::uuid from v where k = 't1_who') or assignee_id is null), count(*)::text
  from collection_tasks;
insert into r (name, ok, detail) select '4b. nhân viên chỉ thấy thông báo của mình',
  coalesce(bool_and(recipient_id = (select val::uuid from v where k = 't1_who')), true), count(*)::text from notifications;
update notifications set read_at = now() where read_at is null;
do $$ begin
  perform run_automation();
  insert into r (name, ok, detail) values ('4c. nhân viên KHÔNG chạy được run_automation', false, null);
exception when others then
  insert into r (name, ok, detail) values ('4c. nhân viên KHÔNG chạy được run_automation', true, sqlerrm);
end $$;
update collection_tasks set status = 'done', completed_at = now(), proof_photo_url = 'storage://proofs/test.jpg',
  sorting_quality = 'good' where id = (select val::uuid from v where k = 't1');
reset role;
insert into r (name, ok, detail) select '4d. đánh dấu đã đọc không đụng nhật ký quản lý',
  count(*) > 0, count(*)::text from notifications where recipient_id is null and read_at is null;
insert into r (name, ok, detail) select '4e. hoàn tất → thùng về 0%',
  max(fill_level) = 0, max(fill_level)::text from bins where device_id = pg_temp.id('bin1');
insert into r (name, ok, detail) select '4f. phân loại tốt → hộ +5 điểm',
  points = (select val::int from v where k = 'pts_hh') + 6, points::text from profiles where id = pg_temp.id('hh');
insert into r (name, ok, detail) select '4g. hộ nhận "đã thu gom" + "phân loại đúng", quản lý nhận "đã thu gom"',
  (select count(*) from notifications where task_id = pg_temp.id('t1') and recipient_id = pg_temp.id('hh') and kind in ('pickup_done', 'sorting_good')) = 2
  and (select count(*) from notifications where task_id = pg_temp.id('t1') and recipient_id is null and kind = 'task_done') = 1, null;

-- ========== 5. TẮT TỰ GIAO → nhân viên tự nhận ==========
update automation_settings set auto_dispatch = false;
update bins set fill_level = 0.9 where device_id = pg_temp.id('bin1') and waste_type = 'huu_co';
insert into v select 't5', id::text from collection_tasks where device_id = pg_temp.id('bin1') and status <> 'done';
insert into r (name, ok, detail) select '5a. tắt tự giao → việc chờ, chưa có người',
  assignee_id is null and status = 'pending' and not auto_assigned, status from collection_tasks where id = pg_temp.id('t5');
insert into r (name, ok, detail) select '5b. nhật ký báo "chưa có nhân viên để giao"',
  count(*) = 0, 'tắt tự giao thì không ghi nhật ký tự giao' from notifications where task_id = pg_temp.id('t5') and kind = 'auto_task' and body like 'Giao cho%';
select pg_temp.claims('an');
set local role authenticated;
insert into r (name, ok, detail) select '5c. nhân viên thấy việc chưa ai nhận', count(*) = 1, null
  from collection_tasks where id = (select val::uuid from v where k = 't5');
update collection_tasks set status = 'in_progress', assignee_id = (select val::uuid from v where k = 'an')
  where id = (select val::uuid from v where k = 't5');
reset role;
insert into r (name, ok, detail) select '5d. nhân viên nhận việc thành công', assignee_id = pg_temp.id('an') and status = 'in_progress', null
  from collection_tasks where id = pg_temp.id('t5');
insert into r (name, ok, detail) select '5e. tự nhận thì không tự báo cho chính mình', count(*) = 0, null
  from notifications where task_id = pg_temp.id('t5') and kind = 'task_assigned';

-- ========== 6. LEO THANG (run_automation) ==========
update automation_settings set auto_dispatch = false;
insert into collection_tasks (device_id, priority, shift, created_at, note)
  values (pg_temp.id('bin2'), 'routine', 'afternoon', now() - interval '2 hours', 'việc bị bỏ quên') ;
insert into v select 't6', id::text from collection_tasks where note = 'việc bị bỏ quên';
update automation_settings set auto_dispatch = true;
update collection_tasks set created_at = now() - interval '2 hours', escalated_at = null
  where device_id = pg_temp.id('bin2') and status <> 'done' and id <> pg_temp.id('t6');  -- việc khẩn của An cũ đi
select pg_temp.claims('admin');
set local role authenticated;
insert into v select 'run6', run_automation()::text;
reset role;
insert into r (name, ok, detail) select '6a. việc chưa ai nhận quá hạn → tự giao',
  assignee_id is not null and auto_assigned and escalated_at is not null,
  (select full_name from profiles where id = assignee_id) from collection_tasks where id = pg_temp.id('t6');
insert into r (name, ok, detail) select '6b. việc khẩn chậm → nhắc nhân viên + báo quản lý',
  (select count(*) from notifications where kind = 'task_reminder' and recipient_id = pg_temp.id('an')) >= 1
  and (select count(*) from notifications where kind = 'task_escalated') >= 1, (select val from v where k = 'run6');
insert into v select 'run6b', run_automation()::text;
insert into r (name, ok, detail) select '6c. chạy lại không nhắc trùng', (val::json ->> 'escalated')::int = 0, val from v where k = 'run6b';

-- ========== 7. MẤT KẾT NỐI / KẾT NỐI LẠI ==========
update devices set is_online = true, last_seen_at = now() - interval '1 hour' where id = pg_temp.id('bin3');
select run_automation();
insert into r (name, ok, detail) select '7a. im lặng quá 10 phút → offline + báo quản lý',
  not d.is_online and (select count(*) from notifications where kind = 'device_offline' and device_id = d.id) = 1, null
  from devices d where d.id = pg_temp.id('bin3');
select pg_temp.claims('anon');
set local role anon;
select device_heartbeat((select val::uuid from v where k = 'bin3'));
reset role;
insert into r (name, ok, detail) select '7b. nhịp tim (kiosk) → online lại + báo quản lý',
  d.is_online and (select count(*) from notifications where kind = 'device_online' and device_id = d.id) = 1, null
  from devices d where d.id = pg_temp.id('bin3');
insert into r (name, ok, detail) select '7c. thiết bị chưa từng gửi nhịp tim không bị báo offline',
  is_online, null from devices where id = pg_temp.id('bin2') ;

-- ========== 8. DỰ BÁO THEO TỐC ĐỘ 24 GIỜ ==========
update collection_tasks set status = 'done' where device_id = pg_temp.id('bin3') and status <> 'done';
insert into sort_events (device_id, waste_type, created_at)
  select pg_temp.id('bin3'), 'tai_che', now() - (g || ' minutes')::interval from generate_series(1, 30) g;
update collection_tasks set status = 'done' where device_id = pg_temp.id('bin3') and status <> 'done';
update bins set fill_level = 0.55 where device_id = pg_temp.id('bin3');
insert into v select 'run8', run_automation()::text;
insert into r (name, ok, detail) select '8a. 30 lượt/24h, 55% → dự báo đầy ~10h → tự lên lịch',
  count(*) = 1 and bool_and(origin = 'auto_forecast' and note like 'Dự báo%'), string_agg(note, ',')
  from collection_tasks where device_id = pg_temp.id('bin3') and status <> 'done';

-- ========== 9. CA TRỰC ==========
update profiles set on_duty = false where role = 'collector';
update collection_tasks set status = 'done' where device_id = pg_temp.id('bin1') and status <> 'done';
update bins set fill_level = 0.1 where device_id = pg_temp.id('bin1');
update bins set fill_level = 0.95 where device_id = pg_temp.id('bin1') and waste_type = 'tai_che';
insert into r (name, ok, detail) select '9a. không ai trực → việc chờ + nhật ký báo không có người',
  t.assignee_id is null and (select count(*) from notifications n where n.task_id = t.id and n.body like '%Chưa có nhân viên trực%') = 1, null
  from collection_tasks t where t.device_id = pg_temp.id('bin1') and t.status <> 'done';
update profiles set on_duty = true where id = pg_temp.id('an');
update collection_tasks set status = 'done' where device_id = pg_temp.id('bin1') and status <> 'done';
update bins set fill_level = 0.1 where device_id = pg_temp.id('bin1');
update bins set fill_level = 0.95 where device_id = pg_temp.id('bin1') and waste_type = 'tai_che';
insert into r (name, ok, detail) select '9b. chỉ An trực → giao An dù An nhiều việc',
  assignee_id = pg_temp.id('an'), null from collection_tasks where device_id = pg_temp.id('bin1') and status <> 'done';

-- ========== 10. QUẢN LÝ ==========
select pg_temp.claims('admin');
set local role authenticated;
update automation_settings set escalate_after_min = 15;
update profiles set on_duty = true where id = (select val::uuid from v where k = 'cuong');
insert into r (name, ok, detail) select '10a. quản lý thấy toàn bộ việc + nhật ký',
  (select count(*) from collection_tasks) > 5 and (select count(*) from notifications where recipient_id is null) > 0, null;
do $$ begin
  update automation_settings set escalate_after_min = 1;
  insert into r (name, ok, detail) values ('10c. ràng buộc: nhắc sau tối thiểu 5 phút', false, null);
exception when others then
  insert into r (name, ok, detail) values ('10c. ràng buộc: nhắc sau tối thiểu 5 phút', true, sqlerrm);
end $$;
reset role;
insert into r (name, ok, detail) select '10b. quản lý đổi được cấu hình + ca trực',
  (select escalate_after_min from automation_settings) = 15 and (select on_duty from profiles where id = pg_temp.id('cuong')), null;

select n, ok, name, detail from r order by n;
rollback;
