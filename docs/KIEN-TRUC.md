# Kiến trúc chương trình

Tài liệu này phục vụ mục "Trình bày được kiến trúc chương trình" — gồm cấu trúc
cây thư mục và kiến trúc hệ thống.

## 1. Cây thư mục

```
src/
├── app/                    Điều hướng (expo-router). Mỗi tệp là một route.
│   ├── _layout.tsx         Provider gốc: React Query, khởi tạo auth và đồng bộ
│   ├── index.tsx           Điểm rẽ nhánh theo vai trò
│   ├── (auth)/             Đăng nhập, đăng ký
│   ├── (user)/             Luồng người dùng: bỏ rác, lịch sử, điểm thưởng
│   ├── (collector)/        Luồng nhân viên: danh sách và xác nhận thu gom
│   └── (admin)/            Luồng quản trị: thiết bị, bản đồ, thống kê
│
├── core/                   Hạ tầng, không chứa logic nghiệp vụ
│   ├── config/             Biến môi trường
│   ├── supabase/           Khởi tạo client, lưu phiên vào SecureStore
│   ├── storage/            SQLite cục bộ và migration
│   ├── sync/               Hàng đợi và bộ máy đồng bộ
│   ├── ble/                Giao tiếp với ESP32, kèm bản giả lập
│   └── utils/              Hàm dùng chung
│
├── features/               Chia theo nghiệp vụ, không chia theo loại tệp
│   ├── auth/               Trạng thái đăng nhập, vai trò
│   ├── sorting/            Luồng bỏ rác
│   ├── devices/            Quản lý thiết bị, quét QR, bản đồ
│   ├── collection/         Công việc thu gom
│   ├── stats/              Biểu đồ, xuất báo cáo
│   └── profile/            Hồ sơ, điểm thưởng
│
├── ml/                     Module AI, tách riêng để bật/tắt được
│   ├── classifier.ts       Lớp bọc TFLite, dùng chung cho mọi bài toán
│   ├── registry.ts         Danh sách mô hình để so sánh khi benchmark
│   ├── models/             Tệp .tflite
│   ├── hooks/              Hook nhận diện qua camera
│   └── components/         Khung ngắm, thẻ kết quả
│
├── shared/                 Dùng chung nhiều feature
│   ├── ui/                 Thành phần giao diện cơ bản
│   ├── hooks/              Hook chung
│   ├── types/              Kiểu dữ liệu, khớp với schema Supabase
│   └── constants/          Nhóm rác, ngưỡng, vai trò
│
└── theme/                  Màu, kiểu chữ, khoảng cách
```

### Vì sao chia như vậy

Ba nguyên tắc:

**Tách hạ tầng khỏi nghiệp vụ.** `core/` biết cách nói chuyện với SQLite, BLE và
Supabase nhưng không biết gì về rác hay thu gom. Nhờ vậy đổi backend hoặc đổi
cách kết nối thiết bị không phải sửa vào màn hình.

**Chia theo nghiệp vụ, không chia theo loại tệp.** Không có thư mục `screens/`
chứa toàn bộ màn hình và `components/` chứa toàn bộ thành phần. Mỗi nghiệp vụ tự
gom màn hình, hook, kiểu dữ liệu của nó vào một chỗ, nên sửa một tính năng chỉ
cần mở một thư mục.

**Module AI tách rời.** Toàn bộ phần nhận diện nằm trong `ml/`. Các feature khác
không import trực tiếp từ đây; luồng bỏ rác nhận vào một nhãn và độ tin cậy, không
quan tâm nhãn đó do người dùng chọn tay hay do mô hình sinh ra. Tắt AI thì hệ
thống vẫn chạy đủ.

## 2. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────┐
│           Ứng dụng React Native              │
│                                              │
│   Giao diện theo vai trò                     │
│        ↓                                     │
│   Tầng nghiệp vụ (features/)                 │
│        ↓                                     │
│   SQLite cục bộ  →  Hàng đợi đồng bộ         │
│        ↓                    ↓                │
│   Module AI            Kết nối mạng          │
└──────────┬──────────────────┬────────────────┘
           │ BLE              │ HTTPS / Realtime
           ↓                  ↓
    ┌────────────┐     ┌──────────────┐
    │   ESP32    │────→│   Supabase   │
    │ servo,     │HTTPS│ dữ liệu, xác │
    │ cảm biến   │     │ thực, realtime│
    └────────────┘     └──────────────┘
```

**ESP32 → Supabase:** gọi thẳng REST API (PostgREST) của Supabase qua WiFi
(thư viện `HTTPClient` trên Arduino core), không qua broker MQTT trung gian —
đơn giản hơn, không cần dựng thêm hạ tầng (broker + bridge) cho một đồ án chỉ
cần chạy demo. Ví dụ: cảm biến đo xong, ESP32 gửi
`PATCH /rest/v1/bins?id=eq.xxx` để cập nhật `fill_level`.

Ba điểm cần nhấn khi trình bày:

**Ghi cục bộ trước.** Mọi thao tác của người dùng ghi vào SQLite rồi mới xếp hàng
đẩy lên server. Người dùng luôn thấy phản hồi tức thì, và mất mạng không chặn thao
tác nào.

**Điều khiển không đi qua server.** Lệnh mở ngăn rác đi thẳng từ điện thoại tới
ESP32 qua BLE. Thùng rác vẫn dùng được khi không có Internet.

**Thiết bị chỉ thực thi.** ESP32 nhận lệnh, quay servo, báo trạng thái. Toàn bộ
quyết định nằm ở ứng dụng.

## 3. Cơ chế đồng bộ

Mỗi bản ghi có `local_id` sinh từ máy, `server_id` nhận về sau khi đồng bộ, và cờ
`synced`. Khi ghi, dữ liệu vào bảng cục bộ đồng thời một dòng vào `sync_queue`.

Bộ máy đồng bộ chạy khi mạng được khôi phục: lấy từng việc trong hàng đợi, gọi
Supabase, thành công thì xoá khỏi hàng đợi và cập nhật `server_id`, thất bại thì
tăng số lần thử và giữ lại. Quá 5 lần thì bỏ qua để không chặn các việc phía sau.

Xung đột giải quyết theo last-write-wins dựa trên thời điểm tạo. Đây là lựa chọn
có chủ đích: dữ liệu sự kiện chỉ ghi thêm, gần như không có trường hợp hai người
sửa cùng một bản ghi.
