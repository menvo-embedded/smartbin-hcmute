# HƯỚNG DẪN DEMO SMARTBIN (~12 phút)

## 0. Chuẩn bị (5 phút trước giờ)

| Việc | Cách làm |
|---|---|
| Dữ liệu sạch | Đã reset lúc 12:45. Muốn reset lại: `supabase db query --linked -f supabase/reset_demo.sql` (hoặc dán file đó vào Supabase › SQL Editor › Run) |
| Điện thoại | Bật Wi-Fi, mở app SmartBin, cho phép thông báo. Không để vật gì nằm trước camera. |
| Supabase trên laptop | Mở https://supabase.com/dashboard/project/kcdzuebpfcszcnrpxkae, đăng nhập sẵn. Mở sẵn các tab: **Table Editor** (bảng `bins`, `collection_tasks`, `notifications`), **SQL Editor** |
| Tài khoản (mật khẩu `123456`) | `user1@test.com` hộ gia đình · `user2@test.com` nhân viên An · `user4@test.com` nhân viên Cường · `user3@test.com` quản lý · Kiosk: không cần tài khoản |

Mẹo: chỉ có 1 điện thoại thì dùng **Supabase Table Editor làm "máy thứ 2"**: sửa dữ liệu trên laptop → điện thoại tự cập nhật + hiện thông báo trong ~2 giây.

---

## 1. Mở đầu — kiến trúc (30 giây)

Nói: *"App React Native (Expo), backend Supabase (PostgreSQL). App có 2 chế độ: **Cộng đồng**
(kiosk cho người dân, nhân viên thu gom, quản lý) và **Hộ gia đình**. Mọi thao tác ghi vào
SQLite trên máy trước rồi mới đồng bộ lên server, nên mất mạng vẫn dùng được. Logic quan
trọng (cộng điểm, tạo việc, tự giao việc) chạy bằng trigger trên server, app không tự sửa được."*

---

## 2. Hộ gia đình (3 phút)

Màn đầu › **Hộ gia đình** › `user1@test.com` / `123456`.

1. **Trang chủ**: tên thùng + % đầy, chấm xanh *"Đã kết nối thùng · tự động"*, thẻ **Lịch thu gom kế tiếp** (🤖 Tự động).
2. **Camera AI tự mở nắp** (đang bật sẵn):
   - Cầm rác (chai nhựa, vỏ trái cây, giấy...) đưa **vào khung nét đứt**, giữ yên ~1 giây.
   - Hiện *"Có vẻ là ... giữ yên"* → *"Đã mở nắp — mời bỏ rác"* + dòng *"Đã mở ngăn X (9x%)"*.
   - **Rút vật ra khỏi khung** rồi mới đưa vật tiếp theo (vật nằm yên chỉ tính 1 lần).
   - Nói: *"Mô hình MobileCLIP-S0 của Apple, bài báo CVPR 2024, phân loại zero-shot: so ảnh với 180 câu mô tả, không cần tự huấn luyện. Chạy TFLite trên GPU điện thoại ~0,5 giây/khung, không cần mạng. Độ chính xác 93,16% trên 2.749 ảnh."*
3. **Quét rác bằng AI (chụp ảnh)**: bấm Chụp ảnh → AI gợi ý → xác nhận.
4. **Chọn loại rác** bằng tay: bấm **Hữu cơ** → *"Đã ghi nhận"*, **Điểm tích luỹ +1**.
5. **Tra cứu**: gõ `vo chuoi` (không dấu) → *Vỏ chuối › Hữu cơ* → **Bỏ ngay**. Gõ `pin` → cảnh báo rác nguy hại.
6. **Offline** (điểm nhấn): kéo thanh thông báo tắt Wi-Fi + 4G → bỏ rác → thanh *"Đang offline — 1 thao tác chờ đồng bộ"* → bật mạng lại → tự đồng bộ, điểm tăng.
7. Lướt nhanh tab **Lịch sử** (lọc theo loại), **Thống kê** (tỷ lệ, xu hướng 7 ngày), **Cá nhân** (điểm, CO₂ giảm, huy hiệu).
8. **🔔 Chuông**: thông báo "Đã lên lịch thu gom", "Phân loại đúng +5 điểm"...

**Supabase:** Table Editor › `sort_events` → dòng mới nhất là lượt vừa bỏ (`source = ai`, `confidence`). Bảng `profiles` → điểm của *Nhà bác Ba*.

---

## 3. Hệ thống tự vận hành — ĐIỂM NHẤN (3 phút)

Tab **Cá nhân › Đăng xuất** › **Cộng đồng** › đăng nhập nhanh **Quản lý**.

1. Tab **Tự động**: *"Hệ thống đang tự vận hành"*, 4 quy tắc (bật/tắt được), **Nhân viên đang trực**, **Nhật ký tự động**.
   Nói: *"Quản lý không cần giao việc bằng tay: server tự lên lịch, tự giao việc, tự nhắc việc trễ."*
2. Bấm **Mô phỏng Demo** › chọn **Thùng rác khu C** › **Mô phỏng sắp đầy (65%)**. Không bấm gì thêm:
   - Trigger thấy ngăn vượt 60% → **tự tạo việc** cho ca gần nhất.
   - Tự **giao cho nhân viên đang trực ít việc nhất** (An, vì Cường đang có 1 việc).
   - Điện thoại **rung + hiện thông báo** *"🤖 Tự động tạo việc ... Giao cho Nguyễn Văn An"*.
   - Tab **Điều phối** có việc mới với nhãn **🤖 Tự động**.
3. **Mô phỏng thùng đầy (85%)** cùng thùng → việc được **nâng lên khẩn**, nhân viên được báo lại.
4. Gạt tắt công tắc **đang trực** của An → mô phỏng thùng khác → việc sang Cường.
   (Nhớ bật lại công tắc của An sau khi thử.)
5. Bấm **Chạy kiểm tra ngay** (bình thường pg_cron tự chạy mỗi 5 phút): nhắc việc khẩn quá hạn, tự giao việc bị bỏ quên, dự báo đầy theo tốc độ bỏ rác 24 giờ, báo thùng mất kết nối.

**Cách làm bằng Supabase thay cho nút Mô phỏng (thuyết phục hơn):** Table Editor › `bins` → sửa `fill_level` của một ngăn thùng C (hoặc thùng A để hộ gia đình nhận thông báo) từ 0.5 thành **0.65** → Save → điện thoại quản lý hiện thông báo ngay. Mở bảng `collection_tasks` → dòng mới `origin = auto_forecast`, `auto_assigned = true`.

---

## 4. Quản lý — các tab còn lại (1 phút)

- **Thùng rác**: bản đồ vị trí thùng (đỏ = cần thu gom), % đầy từng ngăn, **dự báo "đầy sau ~X giờ"**, nút **Điều phối nhân viên dọn** (tự chuyển sang tab Điều phối và mở hộp giao việc).
- **Điều phối**: chọn ngày, **bảng ca trực**, **Lên lịch ca trực ngày** (chọn ca, nhân viên, thùng), **Đổi nhân viên / Hủy gán**, **Xem ảnh nghiệm thu**.
- Chấm đỏ **"● Trực tiếp"**: dữ liệu tự cập nhật (Supabase Realtime), không cần kéo làm mới.

---

## 5. Nhân viên thu gom (2 phút)

Đăng xuất (tab **Cá nhân**) › **Cộng đồng** › đăng nhập nhanh **Nhân viên** (An).

1. Tab **Công việc**: banner ca hôm nay + tiến độ, việc có nhãn **🤖 Tự giao** và ghi chú lý do.
2. Tab **Lộ trình**: bản đồ đánh số thứ tự ghé thùng, tổng km (láng giềng gần nhất + 2-opt), **Chỉ đường bằng Google Maps**.
3. Mở việc → **Chụp ảnh bằng chứng** → (thùng hộ gia đình: chấm **Phân loại đúng / Còn lẫn rác**) → **Xác nhận hoàn tất thu gom**.
   → Thùng tự về 0%, hộ gia đình +5 điểm (nếu phân loại đúng), quản lý nhận "✅ Đã thu gom".
4. Tab **Cá nhân**: trạng thái đang trực, số thùng đã dọn.

**Supabase:** Storage › bucket **`proofs`** (riêng tư) → ảnh vừa chụp. Bảng `collection_tasks` → `status = done`, `proof_photo_url`.

---

## 6. Kiosk cộng đồng (1 phút)

Đăng xuất › **Cộng đồng** › **Mở kiosk bỏ rác công cộng** → mã `BIN-002` → **Lưu cấu hình & Bắt đầu** → chạm màn hình chờ.
- Camera AI bật sẵn; hoặc bấm **Tái chế** → màn **Cảm ơn** → 5 giây tự quay về.
- Nói: *"Kiosk không cần tài khoản: RLS cho vai trò `anon` chỉ được ghi sự kiện không gắn người dùng."*
- Thoát kiosk: nút **Thoát** góc trên.

---

## 7. Tham quan Supabase (1 phút)

| Mục | Chỉ cho thầy xem |
|---|---|
| **Table Editor** | `profiles`, `devices`, `bins`, `sort_events`, `collection_tasks`, `notifications`, `automation_settings` |
| **Database › Functions** | `create_task_when_full`, `auto_dispatch_task`, `pick_collector`, `run_automation`, `device_heartbeat`, `add_points_on_sort` |
| **Database › Triggers** | `bins_fill_alert`, `collection_tasks_auto_dispatch`, `sort_events_add_points`, `sort_events_fill_bin`... |
| **Integrations › Cron** | job `smartbin-tu-dong-hoa` chạy `*/5 * * * *` |
| **Authentication › Users** | các tài khoản test |
| **Authentication › Policies** (RLS) | mỗi bảng có chính sách theo vai trò (`my_role()`) |
| **Storage** | bucket `proofs` riêng tư (ảnh xem qua link có hạn) |
| **SQL Editor** | chạy `supabase/tests/test_logic_server.sql` → 44 dòng `ok = true` (kiểm thử toàn bộ logic, tự hoàn tác) |

---

## 8. Câu hỏi hay gặp

- **Mất mạng thì sao?** Ghi SQLite + hàng đợi `sync_queue`; có mạng lại thì tự gửi (thử lại mỗi 15 giây).
- **Tắt app thì còn tự động không?** Có — trigger + pg_cron chạy trên server.
- **Chọn nhân viên thế nào?** `pick_collector()`: đang trực → ít việc trong ngày nhất → ít việc tồn nhất.
- **Điểm có bị sửa tay được không?** Không — chỉ trigger phía server cộng điểm; RLS chặn sửa.
- **AI lấy ở đâu?** MobileCLIP-S0 (Vasu et al., CVPR 2024), trích nguồn IEEE trong `ml-research/README.md`.
- **Không có phần cứng?** `MockBinController` giả lập mở ngăn; có ESP32 thì đổi `EXPO_PUBLIC_MOCK_BLE=0`.
- **Sao biết thùng mất kết nối?** App kiosk/hộ gia đình gửi nhịp tim mỗi phút; im lặng quá 10 phút → báo quản lý.
- **Kiểm thử thế nào?** 44 kiểm thử server (SQL), 25 kiểm thử logic app, test thủ công trên điện thoại.

## Nếu có sự cố
- App không cập nhật → kéo xuống để làm mới.
- Camera không mở nắp → kiểm tra chấm "Đã kết nối thùng", đưa vật vào giữa khung, đủ sáng, giữ yên 1 giây.
- Dữ liệu rối → chạy lại `reset_demo.sql`.
