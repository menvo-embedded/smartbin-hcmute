-- Nhân viên thu gom thật thay cho danh sách "Nhân viên 1/2/3" giả trong app.
begin;

-- 1. Tài khoản test thứ 3 cho nhân viên (mật khẩu 123456).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'user4@test.com', crypt('123456', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
where not exists (select 1 from auth.users where email = 'user4@test.com');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email = 'user4@test.com'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- 2. Hồ sơ cho mọi tài khoản còn thiếu (thiếu hồ sơ thì app kẹt ở màn chờ).
insert into profiles (id, full_name, role)
select u.id, '', 'collector'
from auth.users u
where u.email in ('nhanvien2.smartbin@gmail.com', 'user4@test.com')
  and not exists (select 1 from profiles p where p.id = u.id);

-- 3. Tên thật cho 3 nhân viên.
update profiles set full_name = 'Nguyễn Văn An', role = 'collector'
  where id = (select id from auth.users where email = 'user2@test.com');
update profiles set full_name = 'Trần Văn Bình', role = 'collector'
  where id = (select id from auth.users where email = 'nhanvien2.smartbin@gmail.com');
update profiles set full_name = 'Lê Văn Cường', role = 'collector'
  where id = (select id from auth.users where email = 'user4@test.com');

-- 4. Nhân viên thấy được việc chưa ai nhận (trước đây chỉ có quyền nhận
--    mà không có quyền xem, nên danh sách việc của nhân viên luôn trống).
drop policy if exists "nhân viên xem việc chưa có người" on collection_tasks;
create policy "nhân viên xem việc chưa có người" on collection_tasks
  for select using (assignee_id is null and my_role() = 'collector');

-- 5. Admin cần xem hồ sơ nhân viên để phân công (đã có qua my_role() = 'admin').

commit;
