# Báo cáo khảo sát hiện trạng — SmartBin

*Đọc trực tiếp toàn bộ source, không tin docs. Đường dẫn tương đối từ gốc repo.
Khảo sát ngày 2026-09-14 bằng cách đọc trực tiếp source code (không suy diễn
từ CLAUDE.md/docs/README — các tài liệu đó có thể đã lỗi thời).*

## 1. Cấu trúc & điều hướng

`src/app/` có 4 route group: `(auth)`, `(user)`, `(collector)`, `(admin)` — mỗi
group **đã có màn hình thật, không còn trống** (CLAUDE.md nói "chưa có" đã lỗi
thời).

`src/app/index.tsx:9-33`: chờ loading xong → không có session thì vào
`sign-in`; có session thì switch theo `profile.role`: `admin`→devices,
`collector`→tasks, còn lại→`sort`.

| Màn hình | Trạng thái |
|---|---|
| `(auth)/sign-in.tsx` | Hoàn chỉnh — nhưng có nút "đăng nhập nhanh" hardcode 3 tài khoản test (dòng 9-13) |
| `(user)/sort.tsx` | Hoàn chỉnh — data thật từ Supabase + SQLite |
| `(user)/stats.tsx` | Hoàn chỉnh — đọc SQLite thật, xuất CSV thật |
| `(user)/profile.tsx` | Hoàn chỉnh — mục "Ngôn ngữ" chỉ là `Alert.alert` tĩnh, không có chức năng |
| `(collector)/tasks.tsx` | Hoàn chỉnh |
| `(collector)/task-detail.tsx` | Hoàn chỉnh nhưng **vi phạm kiến trúc** (xem mục 5) |
| `(admin)/devices.tsx` | Hoàn chỉnh — bản đồ Leaflet/OSM thật |

Không còn màn hình nào là placeholder thuần.

## 2. Dữ liệu

**Schema Supabase**: `profiles`, `devices`, `bins` (FK→devices), `sort_events`
(FK→devices, profiles), `collection_tasks` (FK→devices, profiles). Có trigger
tự tạo `collection_tasks` khi `fill_level ≥ 0.8`.

**RLS**: `profiles` chỉ có SELECT policy, **thiếu INSERT/UPDATE**. `bins` chỉ
có SELECT, **thiếu mọi policy ghi**. `collection_tasks` **thiếu INSERT
policy** (task tạo qua trigger không khai báo `security definer` — chưa xác
định được có bị RLS chặn hay không nếu không chạy thử thật). `sort_events`
INSERT chỉ cho phép `user_id = auth.uid()` — **đây chính là điểm cần sửa cho
pivot bỏ đăng nhập** đã bàn trước đó.

**SQLite local** có `sort_events`, `sync_queue`, và **`devices_cache` định
nghĩa nhưng không nơi nào dùng** (khung rỗng). Không có bảng local cho
`collection_tasks`/`bins`/`profiles`.

**Hàng đợi đồng bộ**: `src/core/sync/engine.ts` — `flush()` chỉ insert/update
thẳng, **không có logic last-write-wins** dù comment trong code (dòng 14-17)
mô tả có — comment sai lệch với code thật. Chỉ `useSortAction.ts` (dùng bởi
`sort.tsx`) đi đúng luồng cục bộ→enqueue. **`task-detail.tsx` ghi thẳng
Supabase**, bỏ qua toàn bộ cơ chế này.

## 3. BLE

`BleBinController` **có logic thật đầy đủ** (scan/connect/openBin/disconnect
qua `react-native-ble-plx` thật), không phải khung rỗng. `MockBinController`
giả lập luôn thành công, không mô phỏng lỗi. Chỉ `useSortAction.ts` gọi tới
controller này — không nơi nào khác dùng BLE.

## 4. Trạng thái tính năng

| Tính năng | Trạng thái |
|---|---|
| Bỏ rác + ghi sự kiện | **XONG** |
| Đăng nhập, phân quyền | **XONG** |
| Danh sách/chi tiết thu gom | **XONG** (nhưng vi phạm local-first) |
| Bản đồ thiết bị | **XONG** |
| Thống kê, xuất CSV | **XONG** |
| Đọc GPS | **CHƯA CÓ** — `expo-location` có cài nhưng không import ở đâu trong `src/` |
| Cờ nghi ngờ/chống gian lận | **CHƯA CÓ** — không có cột, không có logic gì (đúng như đã bàn, mới dừng ở thiết kế) |
| Kiosk / cấu hình thiết bị cục bộ | **CHƯA CÓ** |

## 5. Nợ kỹ thuật & rủi ro

- **Vi phạm nguyên tắc "ghi cục bộ trước, enqueue sau"**:
  `src/app/(collector)/task-detail.tsx` — mutation `claim` (dòng 35-47) và
  `complete` (dòng 49-61) gọi thẳng
  `supabase.from('collection_tasks').update(...)`, không ghi SQLite/không
  `enqueue()`. Tác giả tự nhận trong comment TODO (dòng 11-15).
- **Comment sai lệch với code thật**: `src/core/sync/engine.ts` dòng 14-17 mô
  tả cơ chế xung đột "last-write-wins theo `created_at`", nhưng thân hàm
  `flush()` (dòng 19-70) không có logic so sánh/giải quyết xung đột nào — chỉ
  insert/update thẳng, lỗi thì đánh dấu `markFailed` và giữ nguyên trong hàng
  đợi.
- **Module AI (`src/ml/`) không được wire vào bất kỳ feature nào**: grep
  `classifier|Classifier|registry|MODELS` trong `src/` chỉ khớp trong chính
  `src/ml/classifier.ts` và `src/ml/registry.ts` — không có screen/feature
  nào import. Đồng thời `src/ml/registry.ts` (dòng 11, 18, 25) `require()` 3
  file `.tflite` trong `./models/waste_fp32.tflite`, `waste_int8.tflite`,
  `waste_pruned_int8.tflite`, nhưng thư mục `src/ml/models/` **rỗng** (không
  có file `.tflite` nào trong toàn repo). Nếu bất kỳ đâu import
  `registry.ts`, Metro sẽ lỗi resolve asset — đây là "gọi tới thứ không có
  thật", may là hiện chưa bị lộ vì không ai import.
- **Bảng `devices_cache` trong SQLite định nghĩa nhưng không dùng**:
  `src/core/storage/db.ts` dòng 32-42 tạo bảng nhưng grep toàn `src/` không
  thấy `devices_cache` được INSERT/SELECT ở đâu khác — khung rỗng chưa có tác
  dụng (`sort.tsx` và `devices.tsx` đều query trực tiếp Supabase mỗi lần thay
  vì đọc cache này).
- **`sign-in.tsx` hardcode tài khoản test** (dòng 9-13): 3 email/password cố
  định `user1@test.com`...`123456` để demo nhanh — hardcode có chủ đích cho
  demo, không phải lỗi, nhưng là dữ liệu giả cứng trong code production.
- **`supabase/seed.sql` tạo trùng policy đã có trong `schema.sql`** (dòng
  15-18 trùng dòng 116-119 của `schema.sql`) — chạy seed sau schema sẽ lỗi do
  policy trùng tên.
- **RLS thiếu policy**: không thấy `CREATE POLICY` nào cho
  `INSERT`/`UPDATE`/`DELETE` trên `profiles` và `bins`, cũng không có
  `INSERT` policy cho `collection_tasks` (task được tạo qua trigger
  `create_task_when_full`, hàm này không khai báo `security definer` nên có
  thể bị chặn bởi RLS khi chạy dưới quyền người dùng thường — không xác định
  được chắc chắn vì cần kiểm tra hành vi Postgres trigger thực tế).
- **Xử lý lỗi/loading không nhất quán**:
  - `(collector)/tasks.tsx`: query `collection_tasks` không destructure/hiển
    thị `error` (chỉ có `isLoading`), khác với `(admin)/devices.tsx` có hiển
    thị lỗi.
  - `(collector)/task-detail.tsx`: mutation `claim`/`complete` không có xử lý
    `onError` hay hiển thị lỗi cho người dùng khi update thất bại — chỉ `if
    (error) throw error` trong `mutationFn`, lỗi bị nuốt vì không có UI nào
    bắt.
  - `src/features/stats/useWasteStats.ts`: không có `try/catch` quanh các
    truy vấn SQLite, nếu query lỗi sẽ crash thay vì set trạng thái lỗi.
  - `(user)/sort.tsx`: query `devices` không hiển thị `error` (chỉ
    `isLoading`).
- **Dependency cài nhưng không dùng** (grep import trong `src/` không có kết
  quả): `react-native-maps`, `react-native-vision-camera`, `expo-camera`,
  `expo-notifications`, `i18next`, `react-i18next`, `expo-image-manipulator`,
  `expo-asset`, `expo-font`, `react-native-worklets-core`.
- Không tìm thấy `TODO`/`FIXME` nào khác ngoài dòng đã nêu ở
  `task-detail.tsx:12`.

## 6. Biến môi trường

Grep `EXPO_PUBLIC_` trong `src/`, các biến thực sự được đọc trong code:

| Biến | Nơi đọc | Dòng |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/core/config/env.ts` | 6 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/core/config/env.ts` | 7 |
| `EXPO_PUBLIC_MOCK_BLE` | `src/core/ble/binController.ts` | 91 |

`.env.example` liệt kê đúng 3 biến này (khớp hoàn toàn với code, không có
biến thừa chỉ tồn tại trong `.env.example` mà không được đọc).

---

## Ghi chú tổng hợp (điểm đáng chú ý nhất cho việc tiếp theo)

3 điểm này ảnh hưởng trực tiếp tới các quyết định đang bàn trong
`docs/KE-HOACH.md`:

- RLS `sort_events` (chỉ cho insert khi `user_id = auth.uid()`) cần sửa cho
  pivot bỏ đăng nhập ở luồng công khai.
- `task-detail.tsx` vẫn còn nợ kỹ thuật local-first, chưa fix.
- GPS/chống gian lận đúng là chưa có dòng code nào — khớp với hiểu biết
  trước đó, mới ở mức thiết kế trong `docs/KE-HOACH.md`, chưa triển khai.
