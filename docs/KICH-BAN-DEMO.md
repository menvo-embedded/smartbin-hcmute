# Kịch bản demo SmartBin (~10 phút)

App có 2 chế độ tách riêng ở màn đầu tiên:
- **Cộng đồng** — hệ thống thùng rác công cộng: nhân viên thu gom, quản lý, và
  kiosk bỏ rác cho người dân (không cần tài khoản).
- **Hộ gia đình** — thùng rác riêng của từng hộ, tích điểm.

Đăng nhập nhầm chế độ (vd. tài khoản hộ gia đình ở chế độ Cộng đồng) sẽ bị từ chối.

Tài khoản test — mật khẩu đều là `123456`, có nút "Đăng nhập nhanh" trên màn đăng nhập:

| Vai trò | Email | Tên hiển thị |
|---|---|---|
| Hộ gia đình | user1@test.com | Nhà bác Ba (sở hữu Thùng rác khu A) |
| Nhân viên thu gom | user2@test.com | Nguyễn Văn An |
| Nhân viên thu gom | user4@test.com | Lê Văn Cường |
| Quản trị | user3@test.com | Quản trị viên |

Chuẩn bị: điện thoại có mạng, `EXPO_PUBLIC_MOCK_BLE=1` (không cần ESP32). Mở sẵn
Supabase Dashboard › Table Editor để chứng minh dữ liệu là thật.

## 1. Cộng đồng — kiosk công khai (2 phút)
1. Chọn chế độ › **Cộng đồng** › **Mở kiosk bỏ rác công cộng** → Cấu hình kiosk (mã `BIN-002`) → Lưu.
2. Chạm màn hình chờ → chọn **Tái chế** → màn Cảm ơn, 5 giây tự quay về.
3. Nói: *"Kiosk không cần tài khoản. Lượt bỏ rác ghi vào SQLite trước, rồi hàng
   đợi đồng bộ đẩy lên Supabase; mất mạng vẫn bỏ rác được."*
4. Mở bảng `sort_events` trên Supabase: dòng mới, `user_id` rỗng.

## 2. Hộ gia đình (2 phút)
1. Chọn chế độ › **Hộ gia đình** › đăng nhập → trang chủ thấy thùng nhà mình + điểm tích luỹ.
2. Bỏ rác **Hữu cơ** → điểm +1 ngay (trigger `add_points_on_sort` trên server),
   thùng đầy thêm 2% (trigger `fill_bin_on_sort`).
3. **Demo offline (điểm nhấn kiến trúc):** tắt Wi-Fi → bỏ rác → thanh "Đang offline —
   1 thao tác chờ đồng bộ", lịch sử ghi "Đang chờ" → bật Wi-Fi → tự đồng bộ, điểm tăng.
4. Tab **Cá nhân**: tác động môi trường (kg rác, CO₂, quy ra cây xanh) + 6 huy hiệu;
   trang chủ có 🔥 chuỗi ngày liên tiếp.
5. Tab **Lịch sử** (lọc theo loại), **Thống kê** (tỷ lệ + biểu đồ 7 ngày, xuất báo cáo).

## 3. Admin phát hiện thùng đầy (2 phút)
1. Chọn chế độ › **Cộng đồng** › đăng nhập **Quản lý** → bản đồ + danh sách thùng, % đầy từng ngăn,
   và **dự báo** "Dự báo đầy sau ~X giờ/ngày" (tốc độ bỏ rác 7 ngày × mức đầy mỗi lượt).
2. **Mô phỏng Demo** › chọn thùng › **Dọn sạch (0%)** rồi **Mô phỏng thùng đầy (85%)**.
3. Nói: *"Khi ngăn vượt 80%, trigger `create_task_when_full` trong Postgres tự
   tạo việc thu gom đột xuất."* → tab **Điều phối** thấy việc mới "Chờ phân công".
4. **Phân công ca trực** cho một nhân viên (chọn ca, chọn thùng).

## 4. Nhân viên thu gom (2 phút)
1. **Cộng đồng** › đăng nhập **Nhân viên thu gom** → banner ca hôm nay + danh sách việc.
2. Nút **Lộ trình tối ưu** → bản đồ đánh số thứ tự ghé thùng + tổng km (láng giềng gần
   nhất + cải thiện 2-opt), nút mở Google Maps chỉ đường.
3. Mở việc → **Nhận việc** → **Chụp ảnh bằng chứng** → với thùng của hộ gia đình, chấm
   **Phân loại đúng / Còn lẫn rác** → **Xác nhận hoàn tất**. Đúng → hộ được +5 điểm
   (trigger `reward_sorting_quality`), thùng tự về 0%. Đăng nhập lại hộ gia đình để
   thấy thẻ "Đánh giá từ nhân viên thu gom".
3. Nói: *"Ảnh lên bucket riêng tư trên Supabase Storage; chỉ nhân viên và admin
   xem được, qua đường dẫn có hạn 1 giờ."*

## Điểm nhấn: realtime 2 máy (1 phút)
Máy A đăng nhập **Quản lý** (có chấm đỏ "● Trực tiếp"), máy B đăng nhập **Nhân viên**
hoặc mở kiosk. Máy B bỏ rác / nhận việc / hoàn tất → máy A tự cập nhật trong ~1 giây,
không cần kéo làm mới, kèm nhãn "Vừa cập nhật: ...". Nói: *"Dùng Supabase Realtime
(WebSocket lắng nghe thay đổi Postgres); RLS vẫn áp dụng nên mỗi người chỉ nhận dữ
liệu mình được xem."*

## 5. Admin nghiệm thu (1 phút)
Đăng nhập lại **Quản lý** › **Điều phối** → bảng ca thấy "Đã dọn 1/1" → bấm vào
thùng để xem ảnh nghiệm thu, tên nhân viên, giờ hoàn tất.

## Câu hỏi hay gặp
- **Mất mạng thì sao?** Ghi SQLite + hàng đợi `sync_queue`; có mạng lại
  (`NetInfo`) thì `flush()` gửi, tối đa 5 lần thử.
- **Phân quyền ở đâu?** RLS trong `supabase/schema.sql`, hàm `my_role()`.
- **Không có phần cứng?** `MockBinController` giả lập mở ngăn; có ESP32 thì đặt
  `EXPO_PUBLIC_MOCK_BLE=0`, cùng một interface `BinController`.
- **Điểm có bị sửa tay được không?** Không — chỉ trigger phía server cộng điểm.
- **Dự báo tính thế nào?** Tốc độ bỏ rác từng ngăn trong 7 ngày × 2%/lượt → số giờ tới
  ngưỡng 80%; lấy ngăn chạm sớm nhất (`features/admin/fillForecast.ts`).
- **Lộ trình tối ưu thế nào?** Bài toán người du lịch (TSP) cỡ nhỏ: láng giềng gần nhất
  rồi 2-opt, khoảng cách haversine (`features/collection/route.ts`).
- **CO₂ lấy số ở đâu?** Hệ số ước tính ghi rõ trong `features/stats/impact.ts`.
