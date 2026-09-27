-- Bật Supabase Realtime cho các bảng màn admin theo dõi. RLS vẫn áp dụng:
-- mỗi người chỉ nhận thay đổi của những dòng mình được phép xem.
alter publication supabase_realtime add table bins, collection_tasks, sort_events;
