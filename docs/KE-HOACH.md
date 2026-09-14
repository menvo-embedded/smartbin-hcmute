# Kế hoạch triển khai SmartBin

File này để theo dõi: đã làm gì, đang bàn hướng gì, sắp làm gì. Cập nhật mỗi khi
có quyết định lớn hoặc xong một phần việc — không cần cập nhật cho sửa lặt vặt.

## Đã hoàn thành

### Khung dự án
- Kiến trúc thư mục theo `docs/KIEN-TRUC.md`: `src/core` (hạ tầng) tách khỏi
  `src/features` (nghiệp vụ) tách khỏi `src/ml` (AI).
- SQLite + hàng đợi đồng bộ (`src/core/storage`, `src/core/sync`) — ghi cục bộ
  trước, đồng bộ Supabase sau khi có mạng.
- BLE controller có bản thật và bản giả lập (`src/core/ble/binController.ts`),
  bật/tắt qua `EXPO_PUBLIC_MOCK_BLE`.
- Auth store (Zustand) + điều hướng theo vai trò (`src/app/_layout.tsx`,
  `src/app/index.tsx`).
- Schema Supabase đầy đủ kèm RLS theo vai trò (`supabase/schema.sql`,
  `supabase/seed.sql` — seed idempotent, có 3 thiết bị demo quanh khu vực
  trường UTE để test bản đồ).

### Môi trường chạy máy
- Android emulator chạy được trên PC (từng vướng lỗi đầy ổ C — đã chuyển AVD
  sang ổ D qua `ANDROID_AVD_HOME`).
- Build native ổn định: biết cách xử lý cache Metro cũ (`taskkill` +
  `npx expo start --clear`) mỗi khi đổi dependency.

### Màn hình đã dựng (theo mẫu ảnh mockup, có gradient xanh lá → xanh ngọc)
- `(auth)/sign-in.tsx` — đăng nhập.
- `(user)/sort.tsx` — màn bỏ rác: header gradient (avatar/tên/điểm), lưới nút
  loại rác 2 cột có icon, hiện % đầy của thùng.
- `(user)/stats.tsx` — thống kê cá nhân: biểu đồ tự dựng (bỏ `gifted-charts`
  BarChart do lỗi chồng nhãn), xuất CSV qua Share API.
- `(user)/profile.tsx` — hồ sơ cá nhân, thẻ điểm, đổi mật khẩu.
- `(collector)/tasks.tsx` — danh sách công việc thu gom, filter chip, icon
  thiết bị.
- `(collector)/task-detail.tsx` — chi tiết công việc, nút xác nhận gradient.
- `(admin)/devices.tsx` — bảng điều khiển: **bản đồ thiết bị** bằng
  WebView + Leaflet + OpenStreetMap (free, không cần API key/thẻ tín dụng,
  thay cho Google Maps), danh sách thiết bị + % đầy từng thùng.

### Cập nhật tài liệu
- `CLAUDE.md` (gốc): làm rõ nhóm chỉ chốt **đề tài** với giảng viên, còn thiết
  kế app/kiến trúc/phạm vi phần cứng là do nhóm tự quyết — không cần hỏi lại
  giảng viên khi đổi hướng thiết kế, chỉ cần xác nhận với người dùng (chủ đồ án).

## Đang bàn hướng (đã thống nhất ý tưởng, CHƯA code)

### 1. Bỏ tài khoản cá nhân + điểm thưởng — hướng đến công cộng
**Quyết định:** app hướng tới khu vực công cộng thay vì hộ gia đình. Người dân
bỏ rác **không cần đăng nhập**. Chỉ `collector` và `admin` còn giữ đăng nhập.

**Việc cần làm khi "chốt":**
- `supabase/schema.sql`: sửa RLS cho phép insert `sort_events` không cần
  `auth.uid()` (ghi ẩn danh); rà lại policy các bảng khác theo 2 vai trò còn
  lại.
- `src/app/index.tsx`: bỏ nhánh điều hướng vào `(user)`, vào thẳng màn bỏ rác.
- `src/app/(user)/sort.tsx`: bỏ avatar/tên/điểm/nút đăng xuất ở header.
- `src/app/(user)/profile.tsx`: xoá hẳn (không còn tài khoản cá nhân để xem hồ
  sơ).
- `src/app/(user)/stats.tsx`: đổi từ thống kê cá nhân sang thống kê cộng
  đồng/toàn hệ thống (tổng lượt bỏ rác theo khu vực, theo loại rác...).
- Có thể cần đổi tên route group `(user)` cho đúng ngữ nghĩa (không còn là
  "user" có tài khoản nữa, mà là màn hình công khai).

**Trạng thái:** đã thống nhất hướng, đang chờ người dùng gõ "chốt" mới bắt đầu
code (theo yêu cầu: thảo luận xong xuôi mới triển khai).

### 2. ESP32 → Supabase: đã CHỐT dùng HTTPS trực tiếp (không MQTT)
Đã cân nhắc 2 cách: (1) ESP32 gọi thẳng REST API Supabase qua WiFi, (2) qua
MQTT broker trung gian rồi bridge về Supabase. **Đã chốt cách 1** — đơn giản
hơn, không cần dựng thêm hạ tầng (broker + bridge) cho đồ án chỉ cần demo.
`docs/KIEN-TRUC.md` đã cập nhật sơ đồ theo hướng này.

**Việc cần làm khi triển khai phần cứng:** code ESP32 dùng `HTTPClient` gửi
`PATCH /rest/v1/bins?id=eq.xxx` để cập nhật `fill_level` mỗi khi cảm biến đo
xong — độc lập với điện thoại, không qua BLE.

### 3. Xác thực hoàn thành thu gom (collector) — chống gian lận
Đã bàn qua nhiều phương án: chụp ảnh (loại — tay dơ, không khả thi), nút bấm
đơn giản, BLE proximity, cảm biến khoảng cách hồng ngoại đo mực rác, GPS.

**Hướng đã thống nhất (đang bàn chi tiết, CHƯA code): kết hợp 2 tín hiệu mềm,
không hard-gate riêng lẻ tín hiệu nào.**

**Tín hiệu 1 — GPS (dùng `expo-location`, đã có sẵn, không cần cài thêm).**
So khoảng cách vị trí điện thoại lúc bấm "Hoàn thành" với toạ độ
`devices.latitude/longitude`:

| Khoảng cách | Xử lý |
|---|---|
| ≤ 150m | Qua bình thường, không cảnh báo (trong sai số GPS thông thường) |
| 150m–500m | Qua, nhưng gắn cờ "vị trí cần xem lại" cho admin |
| > 500m | **Chặn cứng**, không cho xác nhận — mức này không thể do sai số GPS |

**Tín hiệu 2 — Cảm biến độ sâu (`bins.fill_level`, cập nhật độc lập qua HTTPS
như mục 2 ở trên).** Không hard-gate riêng (cảm biến demo có thể không chính
xác) — chỉ dùng để tăng/giảm độ tin cậy của cảnh báo khi kết hợp với GPS:

| GPS | Cảm biến | Xử lý |
|---|---|---|
| Đúng vị trí | Đã trống | Qua bình thường |
| Đúng vị trí | Vẫn đầy | Gắn cờ nhẹ (có thể cảm biến delay/lỗi) |
| Sai vị trí (150-500m) | Đã trống | Gắn cờ nhẹ (có thể GPS trôi) |
| Sai vị trí (150-500m) | Vẫn đầy | **Cảnh báo mạnh** cho admin — khả năng gian lận cao |
| Cảm biến không có dữ liệu (ESP32 mất mạng/lỗi) | — | Bỏ qua tín hiệu này, chỉ xét GPS |

Phù hợp tinh thần "phần cứng chỉ cần chạy được ở mức demo" — không có ngưỡng
nào chặn cứng dựa riêng vào cảm biến, chỉ GPS lệch quá xa (>500m) mới chặn.

**Trạng thái:** thiết kế đã khá rõ, **chưa code**. Việc cần làm khi triển
khai: thêm cột đánh dấu (ví dụ `location_mismatch`, `sensor_mismatch`) vào
`collection_tasks`, xin quyền `expo-location` trong app, sửa
`task-detail.tsx` để tính khoảng cách + đọc `fill_level` lúc xác nhận.

### 4. Tính năng AI nhận diện rác
**Quyết định của nhóm:** dùng camera điện thoại thay cho ESP32-CAM — điện
thoại đảm nhiệm camera + chạy model TFLite, ESP32 chỉ lo servo + BLE. (Nhóm
chỉ chốt đề tài với giảng viên, các quyết định thiết kế như thế này là do
nhóm tự quyết — xem CLAUDE.md gốc.)

**Luồng dự kiến (nâng cao, không bắt buộc):**
1. Điện thoại gắn cố định trước thùng, camera quét rác người dùng đưa vào.
2. Model TFLite (`src/ml/`) phân loại ra `{ label, confidence }`.
3. Ghi cục bộ (SQLite → hàng đợi đồng bộ) như luồng bỏ rác thủ công.
4. Gọi `BinController.openBin(wasteType)` qua BLE → ESP32 mở đúng ngăn.

**Luồng thủ công hiện tại** (`sort.tsx` — bấm nút chọn loại rác) vẫn là luồng
chính, chắc chắn chạy được, nên ưu tiên hoàn thiện trước. Luồng AI là tính
năng cộng thêm nếu kịp thời gian.

**Trạng thái:** mới dừng ở ý tưởng kiến trúc, chưa có gì được code. Cần một
track riêng: (a) huấn luyện + quantize model (Python/Colab, ngoài repo này),
(b) tích hợp camera + benchmark trong app.

## Nợ kỹ thuật đã biết (chưa fix)
- `src/app/(collector)/task-detail.tsx`: đang gọi Supabase trực tiếp cho việc
  nhận/hoàn thành công việc, chưa theo đúng nguyên tắc ghi cục bộ trước →
  hàng đợi đồng bộ như các luồng ghi khác. Cần sửa lại theo mẫu
  `src/features/sorting/useSortAction.ts`.

## Ghi chú vận hành
- Mọi lệnh cài thư viện / build native đều do người dùng tự chạy trên máy —
  Claude chỉ đưa lệnh, không tự chạy `npm install` hay `npx expo run:android`.
- Đổi dependency xong nhớ tắt hẳn Metro rồi chạy lại `npx expo start --clear`
  (cache cũ hay gây lỗi "Unmatched Route" / "module not found" giả).
