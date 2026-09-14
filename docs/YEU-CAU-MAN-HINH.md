# Yêu cầu: dựng màn hình tối thiểu để chạy được

## Mục tiêu
Tạo đủ route để app build và chạy thật trên điện thoại, chưa cần đẹp.
Người dùng đang học code, xin giải thích ngắn từng đoạn code mới khi tạo.

## Cần tạo (4 file, mỗi file 1 màn hình đơn giản)

1. `src/app/(auth)/sign-in.tsx`
   - 2 ô nhập: email, password
   - nút "Đăng nhập" gọi `useAuth().signIn(email, password)`
   - hiện lỗi nếu đăng nhập sai

2. `src/app/(user)/sort.tsx`
   - hiện chữ "Màn hình người dùng"
   - nút gọi `useSortAction()` với 1 device_id giả để test luồng bỏ rác
   - hiện kết quả thành công/thất bại

3. `src/app/(collector)/tasks.tsx`
   - hiện chữ "Màn hình nhân viên thu gom"
   - lấy danh sách `collection_tasks` từ Supabase bằng React Query, hiện dạng list đơn giản

4. `src/app/(admin)/devices.tsx`
   - hiện chữ "Màn hình quản trị"
   - lấy danh sách `devices` từ Supabase bằng React Query, hiện dạng list đơn giản

## Ràng buộc
- Dùng React Native cơ bản (View, Text, TextInput, Button/Pressable) — chưa cần thư viện UI ngoài
- Không cần đẹp, không cần style phức tạp, chỉ cần chạy và thấy dữ liệu thật
- Tuân thủ CLAUDE.md: ghi cục bộ trước khi đồng bộ, không sửa core/
- Sau mỗi file, giải thích ngắn gọn (3-5 dòng) đoạn code mới với người mới học JS/TS

## Sau khi tạo xong 4 màn hình mẫu

Không tự code hộ thêm. Thay vào đó giao bài tập để người dùng tự viết lại, dựa
trên đúng 4 file mẫu vừa tạo (dùng làm "giao diện đọc trước"):

- Với mỗi file mẫu, ra 1 bài tập yêu cầu tự viết lại một biến thể nhỏ — ví dụ:
  thêm ô nhập thứ 3, đổi Text tĩnh thành lấy từ state, thêm 1 nút mới, đổi cách
  hiện danh sách từ `.map` sang `FlatList`.
- Mỗi bài tập nêu rõ: yêu cầu, gợi ý hàm/API cần dùng (không cho sẵn code), và
  kết quả mong đợi khi chạy thử.
- Không đưa lời giải trước. Chỉ đưa lời giải khi được hỏi lại sau khi người
  dùng đã tự thử.
- Độ khó tăng dần theo thứ tự 4 file ở trên.
