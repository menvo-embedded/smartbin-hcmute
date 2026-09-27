-- Đổi DB từ 4 loại rác cũ (plastic/paper/metal/other) sang 3 loại mà app và
-- schema.sql đang dùng (huu_co/vo_co/tai_che). Chạy 1 lần.
-- Quy đổi: plastic/paper/metal → tai_che, other → vo_co.
begin;

create type waste_type_new as enum ('huu_co', 'vo_co', 'tai_che');

-- Lịch sử bỏ rác: đổi thẳng giá trị theo quy đổi.
alter table sort_events
  alter column waste_type type waste_type_new
  using (case waste_type::text when 'other' then 'vo_co' else 'tai_che' end)::waste_type_new;

-- Ngăn rác: mỗi thùng có unique (device_id, waste_type) nên phải gộp rồi tạo
-- lại — ngăn tái chế lấy mức đầy cao nhất của plastic/paper/metal.
create temp table bins_quy_doi on commit drop as
  select device_id,
         case waste_type::text when 'other' then 'vo_co' else 'tai_che' end as loai,
         max(fill_level) as fill_level
  from bins
  group by 1, 2;

delete from bins;

alter table bins
  alter column waste_type type waste_type_new
  using waste_type::text::waste_type_new;

insert into bins (device_id, waste_type, fill_level)
  select device_id, loai::waste_type_new, fill_level from bins_quy_doi
  union all
  select distinct device_id, 'huu_co'::waste_type_new, 0 from bins_quy_doi;

drop type waste_type;
alter type waste_type_new rename to waste_type;

commit;
