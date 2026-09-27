-- Kho ảnh nghiệm thu thu gom — RIÊNG TƯ: không có đường dẫn công khai; app
-- xem ảnh qua signed URL (hết hạn sau 1 giờ). Chỉ nhân viên thu gom tải lên,
-- chỉ nhân viên và admin xem được.
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do update set public = false;

drop policy if exists "nhân viên tải ảnh nghiệm thu" on storage.objects;
create policy "nhân viên tải ảnh nghiệm thu" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proofs' and public.my_role() = 'collector');

drop policy if exists "nhân viên và admin xem ảnh nghiệm thu" on storage.objects;
create policy "nhân viên và admin xem ảnh nghiệm thu" on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and public.my_role() in ('collector', 'admin'));
