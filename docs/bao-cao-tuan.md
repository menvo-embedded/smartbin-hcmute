# Báo cáo tiến độ hàng tuần — SmartBin

Repo: https://github.com/menvo-embedded/smartbin-hcmute

*Lưu ý: nội dung từng tuần dưới đây chia theo đúng trình tự tính năng đã hoàn
thành trong dự án (đối chiếu `docs/tien-do.md` — báo cáo khảo sát dựa trên
source code thật). Ranh giới tuần là ước lượng theo thứ tự công việc, **cần
người trong nhóm chỉnh lại ngày tháng cụ thể** cho khớp lịch học thật trước
khi nộp.*

---

## Tuần 2

**Mục tiêu:** dựng khung dự án, môi trường chạy được trên máy.

- Khởi tạo kiến trúc thư mục dùng chung cho 2 đồ án (`src/core`, `src/features`,
  `src/ml`, `src/shared`) — tách hạ tầng khỏi nghiệp vụ theo đúng nguyên tắc
  đã thống nhất.
- Dựng lớp hạ tầng cốt lõi: kết nối Supabase (`src/core/supabase`), SQLite cục
  bộ + hàng đợi đồng bộ (`src/core/storage`, `src/core/sync`), BLE controller
  có cả bản thật lẫn bản giả lập (`src/core/ble/binController.ts`).
- Thiết lập schema Supabase đầy đủ (`supabase/schema.sql`): bảng `profiles`,
  `devices`, `bins`, `sort_events`, `collection_tasks`, kèm RLS phân quyền
  theo vai trò.
- Cài đặt môi trường chạy Android Emulator trên máy, xử lý xong sự cố cấu hình
  ban đầu (dung lượng ổ đĩa, đường dẫn AVD).

## Tuần 3

**Mục tiêu:** dựng đủ 4 luồng màn hình chính theo vai trò, chạy được thao tác
đầu-cuối.

- `(auth)/sign-in.tsx`: đăng nhập qua Supabase Auth, có nút đăng nhập nhanh
  demo theo 3 vai trò (quản lý / nhân viên / hộ gia đình).
- `(user)/sort.tsx`: luồng bỏ rác — chọn loại rác, mở ngăn thùng qua BLE
  (`MockBinController` khi chưa có phần cứng), ghi sự kiện cục bộ (SQLite)
  rồi tự đồng bộ lên Supabase khi có mạng — đúng nguyên tắc local-first.
- `(collector)/tasks.tsx` + `task-detail.tsx`: danh sách và xử lý công việc
  thu gom (nhận việc, đánh dấu hoàn thành).
- `(admin)/devices.tsx`: danh sách thiết bị, trạng thái online/offline, %
  đầy từng ngăn rác.
- Điều hướng gốc theo vai trò (`src/app/index.tsx`) hoạt động đúng: vào app
  tự rẽ nhánh theo `admin` / `collector` / còn lại → màn bỏ rác.

## Tuần 4

**Mục tiêu:** hoàn thiện giao diện theo bản thiết kế mẫu, thêm thống kê.

- Áp dụng theme gradient (xanh lá → xanh ngọc) đồng bộ trên toàn app: header,
  nút chính, thẻ điểm, chip lọc — khớp bản mockup thiết kế ban đầu.
- Thêm icon cho từng loại rác và từng vai trò (`@expo/vector-icons`).
- `(user)/stats.tsx`: thống kê cá nhân theo loại rác và theo 7 ngày gần nhất
  (đọc trực tiếp từ SQLite cục bộ), có xuất báo cáo CSV qua Share API.
- `(user)/profile.tsx`: hồ sơ cá nhân, đổi mật khẩu.
- Sửa các lỗi giao diện phát sinh: nút chọn loại rác không đều nhau, icon
  không hiển thị do thiếu font asset.

## Tuần 5

**Mục tiêu:** thêm bản đồ thiết bị, tiếp tục cải thiện giao diện.

- **Thêm bản đồ thiết bị ở màn quản trị** (`(admin)/devices.tsx`): hiển thị vị
  trí từng thùng rác trên bản đồ thật (OpenStreetMap qua WebView + Leaflet —
  giải pháp miễn phí, không cần API key/tài khoản thanh toán như Google Maps),
  chấm màu phân biệt thùng đầy/chưa đầy, bấm vào xem chi tiết khu vực và %
  đầy từng loại rác.
- **Cải thiện giao diện**: tinh chỉnh lại các màn hình đã có cho đồng bộ với
  theme gradient, sửa các chi tiết hiển thị chưa khớp bản mockup.
- Khảo sát lại toàn bộ hiện trạng source code, ghi nhận rõ phần đã hoàn thiện
  và phần còn nợ kỹ thuật (xem `docs/tien-do.md`) để làm cơ sở phân công tiếp.
- Tạo repo GitHub công khai (`smartbin-hcmute`) để cả nhóm cùng đẩy code và
  làm cơ sở báo cáo tiến độ cho giảng viên.
- **Dựng xong phần cứng (ESP32 + servo)**, đang trong quá trình tích hợp với
  app qua BLE — chuyển dần từ `MockBinController` sang kết nối thiết bị thật.
- **Dựng luồng "Hộ gia đình" (nhánh `feat/household`, chưa merge vào `master`):**
  - 4 màn hình mới `(household)/home`, `history`, `stats`, `profile`, điều
    hướng bằng thanh tab dưới cùng (`Tabs` của Expo Router) thay vì link
    header như luồng công cộng.
  - Màn chính có chỗ chừa sẵn cho tính năng camera + AI nhận diện rác (định
    hướng lâu dài), hiện tại dùng lưới chọn loại rác thủ công.
  - Lọc đúng thiết bị theo hộ gia đình qua cột mới `devices.owner_id` (thêm
    vào schema Supabase), thay vì hiển thị lẫn thiết bị công cộng.
  - Tách các phần dùng chung để tránh trùng lặp code giữa luồng công cộng và
    hộ gia đình: `WasteTypeGrid`, `WasteStatsView`, `ChangePasswordModal`.
  - Xử lý 2 lỗi build native phát sinh khi thêm tính năng: xung đột phiên
    bản Kotlin/Compose Compiler, và font icon chưa được nhúng vào bản build
    Android (cả hai đều đã ghi lại cách sửa trong code để không lặp lại).

---

## Việc dự kiến tuần tới (chưa làm, đang ở bước thiết kế)

Tham khảo chi tiết đầy đủ trong `docs/KE-HOACH.md`:

- Sửa `task-detail.tsx` cho đúng nguyên tắc ghi cục bộ trước khi đồng bộ
  (hiện đang gọi thẳng Supabase — nợ kỹ thuật đã biết).
- Thiết kế cơ chế chống gian lận khi xác nhận thu gom (kết hợp kiểm tra vị
  trí GPS + dữ liệu cảm biến độ đầy thùng) — đã thống nhất hướng, chưa code.
- Xác nhận với nhóm việc có triển khai luồng AI nhận diện rác (camera điện
  thoại + TFLite) hay không, và mức độ ưu tiên so với phần app.
