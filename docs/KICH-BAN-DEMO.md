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

Chuẩn bị: chạy `supabase db query --linked -f supabase/reset_demo.sql` để đưa thùng
về mức đầy demo (thùng B đã được hệ thống tự tạo + tự giao 1 việc khẩn cho An, xoá
thông báo cũ), điện thoại có mạng, `EXPO_PUBLIC_MOCK_BLE=1` (không cần ESP32). Mở sẵn
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
4. Ô **"Rác này bỏ ngăn nào?"**: gõ "vo chuoi" (không dấu) → Hữu cơ, bấm **Bỏ ngay**;
   gõ "pin" → cảnh báo rác nguy hại, không bỏ vào thùng.
5. Tab **Cá nhân**: tác động môi trường (kg rác, CO₂, quy ra cây xanh) + 6 huy hiệu;
   trang chủ có 🔥 chuỗi ngày liên tiếp.
6. Tab **Lịch sử** (lọc theo loại), **Thống kê** (tỷ lệ + biểu đồ 7 ngày, xuất báo cáo).

## 3. Hệ thống TỰ VẬN HÀNH — điểm nhấn chính (3 phút)
Cần 2 máy: máy A **Quản lý**, máy B **Nhân viên An** (hoặc Hộ gia đình nếu mô phỏng thùng A).
1. Máy A › tab **Tự động**: "Hệ thống đang tự vận hành", các quy tắc (bật/tắt được),
   nhân viên đang trực, nhật ký tự động. Nói: *"Quản lý không phải giao việc bằng tay
   nữa — server tự làm, app chỉ cấu hình."*
2. **Mô phỏng Demo** › thùng C › ngăn Tái chế **65%**. Không bấm gì thêm:
   - trigger thấy vượt 60% → tự tạo việc "lịch ca" cho ca gần nhất (`auto_create_task`);
   - trigger `auto_dispatch_task` tự giao cho nhân viên **đang trực ít việc nhất**;
   - máy B **rung + hiện thông báo** "📋 Việc mới: Thùng rác khu C" và danh sách tự cập nhật;
   - máy A: nhật ký "🤖 Tự động tạo việc ... Giao cho ...", tab Điều phối có nhãn **🤖 Tự động**.
3. Mô phỏng tiếp ngăn đó **85%** → việc được **nâng lên khẩn** và nhân viên được báo lại.
4. Thùng A (của hộ gia đình) làm tương tự → máy hộ gia đình nhận "🚛 Đã lên lịch thu gom
   thùng nhà bạn", trang chủ có thẻ **Lịch thu gom kế tiếp**.
5. Tắt công tắc **đang trực** của An rồi mô phỏng lại → việc sang Cường. Bấm **Chạy
   kiểm tra ngay** để chạy vòng định kỳ (bình thường pg_cron tự chạy mỗi 5 phút):
   nhắc việc khẩn quá hạn, tự giao việc bị bỏ quên, dự báo theo tốc độ bỏ rác 24 giờ,
   báo thùng mất kết nối (không nhận nhịp tim quá 10 phút).

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
- **"Tự động" chạy ở đâu, tắt app có chạy không?** Ở server: trigger Postgres phản ứng
  tức thì với thay đổi dữ liệu, `pg_cron` chạy `run_automation()` mỗi 5 phút. Tắt hết
  app hệ thống vẫn tự lên lịch / nhắc việc. Code: `supabase/migrations_manual/2026-09-28_tu_dong_hoa.sql`.
- **Thông báo gửi thế nào?** Trigger ghi bảng `notifications` → Supabase Realtime đẩy
  về app → app bật thông báo hệ thống (`expo-notifications`, không cần máy chủ push).
- **Chọn nhân viên theo tiêu chí gì?** `pick_collector()`: đang trực, ít việc trong
  ngày nhất, hoà thì ít việc tồn nhất.
- **Sao biết thùng mất kết nối?** App kiosk/hộ gia đình đang nối BLE với thùng gửi nhịp
  tim mỗi phút (`device_heartbeat`); mỗi lượt bỏ rác cũng tính. Im lặng quá ngưỡng → offline.
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
