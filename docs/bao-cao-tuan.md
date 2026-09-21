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

## Tuần 6 (19–21/09)

**Mục tiêu:** đổi phân loại rác theo đúng thực tế, tích hợp phần cứng thật,
mở rộng nhóm làm việc, chuẩn bị và huấn luyện lại model AI.

- **Đổi phân loại rác** từ 4 nhãn theo vật liệu (nhựa/giấy/kim loại/khác)
  sang 3 nhóm theo đúng cách phân loại rác tại nguồn ở Việt Nam — hữu cơ/vô
  cơ/tái chế. Đồng bộ đổi cả `src/shared/constants/waste.ts` lẫn enum
  `waste_type` trong `supabase/schema.sql`.
- Merge nhánh `feat/household` (hoàn thiện hồ sơ hộ gia đình theo mockup,
  thêm màn "Chọn chế độ" Cộng đồng/Hộ gia đình trước đăng nhập) và nhánh
  `nhanh2-giao-dien` (hoàn thiện luồng kiosk: idle/kiosk-setup/thanks) vào
  `master`. Thêm CODEOWNERS, bắt buộc PR review trước khi vào `master`.
- Chuẩn hoá cấu hình Supabase env + thông báo lỗi đăng nhập rõ ràng hơn; sửa
  lỗi build native do lệch phiên bản Kotlin/Compose Compiler (ghim qua
  `expo-build-properties`).
- **Tích hợp phần cứng thật (ESP32 + servo) qua BLE** — test trực tiếp trên
  điện thoại qua USB (scrcpy), mở/đóng ngăn thùng thành công từ app.
- Đối chiếu kỹ và merge nhánh `feature/collector` của NhanLe (hoàn thiện
  luồng hộ gia đình: tự chọn thùng ít đầy nhất, hiển thị rõ trạng thái kết
  nối BLE) — phát hiện và sửa 1 lỗi trùng tên hook (`useSortHistory`) trước
  khi merge để tránh vỡ màn lịch sử của hộ gia đình. Sửa thêm 2 lỗi phát
  sinh khi test thật: mất kết nối BLE khi đổi thùng, cảnh báo React do gọi
  điều hướng trong lúc render ở màn cảm ơn.
- Đồng bộ thanh tab điều hướng giữa luồng Cộng đồng và Hộ gia đình; sửa lỗi
  icon bị mất trắng trên toàn app (nguyên nhân thật: thiếu gói
  `expo-file-system` khiến `expo-font` tải font thất bại âm thầm, không
  crash nên rất khó phát hiện).
- **Audit lại toàn bộ dataset AI**: kiểm tra thủ công 453 ảnh rác hỗn hợp
  chưa rõ nhãn, loại trùng lặp (SHA256 cho trùng hệt, perceptual hash cho
  gần giống), dựng kiến trúc "source pool" có ghi nguồn gốc từng ảnh, tổng
  hợp lại thành 18.307 ảnh sạch cho 3 nhóm.
- **Train lại model AI theo 3 nhóm mới** (MobileNetV2 transfer learning,
  2 giai đoạn: đóng băng backbone rồi fine-tune), pruning 50% trọng số,
  quantize INT8. Kết quả: accuracy test 93.42% (tăng so với 91.82% trước
  pivot), kích thước giảm từ 8.47MB xuống 2.58MB (giảm 3.3 lần).
- Review kỹ nhánh mới của thành viên Thanh (`feat/app-icon-and-fixes`):
  phát hiện nhánh dựa trên code cũ (trước khi pivot 3 nhóm, trước khi có
  role hộ gia đình), nếu merge trực tiếp sẽ làm hỏng nhiều tiến độ đã có —
  đã **không merge nguyên nhánh**, mà tách riêng và tích hợp thủ công phần
  tính năng thật sự mới: tab "Phân công" cho admin (gán việc thu gom theo
  ca/ngày, bảng ca trực nhân viên), chụp ảnh minh chứng thu gom, icon app
  thật, cấu hình `metro.config.js` (dự án trước đó thiếu hẳn file này).

## Còn tồn đọng, cần làm tiếp

- **Tích hợp model AI (.tflite) vào app thật qua camera** — model đã train
  và tối ưu xong nhưng chưa nối vào luồng ứng dụng thật.
- **Benchmark tốc độ suy luận trên điện thoại thật (chip ARM)** — mới đo
  trên CPU Kaggle (x86), không phản ánh đúng lợi ích tốc độ của INT8 trên
  di động; đây là phần đồ án giữa kỳ chấm trọng tâm, cần làm sớm.
- Module quét QR cấu hình WiFi cho ESP32 qua BLE — chưa làm.
- Sửa `task-detail.tsx` cho đúng nguyên tắc ghi cục bộ trước khi đồng bộ
  (hiện đang gọi thẳng Supabase — nợ kỹ thuật đã biết từ trước).
- `src/shared/types/database.ts` có field `owner_id` cho bảng `devices`
  nhưng `supabase/schema.sql` chưa có cột này — lệch schema có sẵn từ
  trước, cần bổ sung migration cho khớp.
- 3 hạng mục "MQTT Broker" trong kế hoạch gốc không còn phù hợp — kiến trúc
  thực tế app↔ESP32 đi thẳng qua BLE, không qua MQTT broker nào cả, cần
  cập nhật lại kế hoạch thay vì tính là "trễ tiến độ".

---

## Việc dự kiến tuần tới (chưa làm, đang ở bước thiết kế)

- Nối model AI 3 nhóm (`.tflite` INT8) vào luồng camera thật trong app.
- Benchmark thật trên điện thoại (so sánh FP32 / pruned / INT8 về tốc độ và
  độ chính xác) — số liệu bắt buộc phải đo trên máy thật, không dùng số đo
  từ Kaggle/Colab.
- Thiết kế cơ chế chống gian lận khi xác nhận thu gom (kết hợp kiểm tra vị
  trí GPS + dữ liệu cảm biến độ đầy thùng) — đã thống nhất hướng, chưa code.
- Bổ sung migration cho cột `owner_id` còn thiếu trong `schema.sql`.
