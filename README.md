# SmartBin — khung dự án dùng chung

Khung này phục vụ cả hai project của môn Phát triển ứng dụng di động:

- **Giữa kỳ (NC — Dạng 2):** app nhận diện rác bằng AI, trọng tâm là tối ưu mô hình
  (quantize, pruning) và benchmark trên máy thật.
- **Cuối kỳ (CK):** app quản lý hệ thống thùng rác thông minh, có phần cứng, AI là
  phần mở rộng.

Phần dùng chung là `src/ml/` và `src/core/` — viết một lần, dùng cho cả hai.

## Cài đặt

```bash
npm install
cp .env.example .env      # điền URL và anon key của Supabase
npx expo prebuild --clean
npx expo run:android
```

Cần dev build chứ không dùng được Expo Go, vì BLE và TFLite là native module.

## Biến môi trường

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MOCK_BLE=1     # bật giả lập thiết bị khi chưa có phần cứng
```

`MOCK_BLE=1` cho phép chạy toàn bộ luồng bỏ rác mà không cần ESP32 — hữu ích lúc
làm giao diện và lúc demo nếu phần cứng gặp sự cố.

Bản đồ thiết bị ở màn admin dùng OpenStreetMap qua WebView (`react-native-webview`)
— miễn phí hoàn toàn, không cần API key hay tài khoản Google Cloud.

## Cơ sở dữ liệu

Mở Supabase → SQL Editor → chạy `supabase/schema.sql`. Tệp này tạo bảng, trigger
sinh công việc thu gom khi thùng đầy, và các policy phân quyền theo vai trò.

## Kiến trúc

Xem `docs/KIEN-TRUC.md` — cây thư mục, sơ đồ hệ thống và cơ chế đồng bộ offline.

## Thứ tự làm

1. Chạy schema, tạo vài tài khoản thử với ba vai trò khác nhau
2. Đăng nhập và kiểm tra điều hướng rẽ đúng nhánh
3. Luồng bỏ rác với `MOCK_BLE=1`
4. Firmware ESP32, đổi sang BLE thật
5. Luồng thu gom và thông báo đẩy
6. Thử offline: bật chế độ máy bay, thao tác, bật mạng lại, kiểm tra đồng bộ
7. Thống kê, biểu đồ, xuất báo cáo
8. Tích hợp mô hình AI và màn hình benchmark

## Kiểm thử offline

Đây là phần đáng nhấn khi bảo vệ. Cách thử:

- Bật chế độ máy bay
- Thực hiện 5 lần bỏ rác, xác nhận giao diện vẫn phản hồi bình thường
- Kiểm tra `sync_queue` có 5 dòng đang chờ
- Tắt chế độ máy bay
- Xác nhận hàng đợi rỗng dần và dữ liệu xuất hiện trên Supabase
