# Mô-đun AI: phân loại rác zero-shot bằng MobileCLIP-S0

Tính năng "Quét rác bằng AI" (màn Hộ gia đình) dùng mô hình đã công bố trong
bài báo khoa học **MobileCLIP** của Apple tại hội nghị IEEE/CVF CVPR 2024 [1],
chạy hoàn toàn trên điện thoại bằng TensorFlow Lite. Nhóm không huấn luyện lại
trọng số: mô hình phân loại theo kiểu *zero-shot* của CLIP [2], tức so khớp ảnh
với các câu mô tả từng nhóm rác.

## 1. Vì sao chọn mô hình này

| Tiêu chí | Kết quả khảo sát |
|---|---|
| Bài báo uy tín, có công bố trọng số | MobileCLIP [1] — CVPR 2024 (IEEE), trọng số công khai trên Hugging Face |
| Chạy được trên điện thoại | Họ mô hình được thiết kế cho thiết bị di động, tối ưu độ trễ – độ chính xác [1] |
| Khớp 3 nhóm rác của app (hữu cơ / vô cơ / tái chế) | Zero-shot: đổi nhóm chỉ cần đổi câu mô tả, không cần train lại |
| Các lựa chọn bị loại | Mô hình TrashNet [3] / Hugging Face: 6 nhãn vật liệu, **không có nhãn hữu cơ**; MobileNetV2 của Yong et al. [4]: chỉ công bố mã, không công bố trọng số |

## 2. Cách hoạt động

```
Ảnh ──► resize cạnh ngắn 256, cắt giữa 256×256, chia 255 ──► Image encoder (TFLite) ──► vector 512 chiều
                                                                                        │ cosine × 100, softmax
150 câu mô tả ("a photo of a banana peel." ...) ──► Text encoder (tính sẵn trên PC) ──► 150 vector 512 chiều
                                                                                        ▼
                                        Điểm nhóm = tổng xác suất các câu thuộc nhóm ──► Hữu cơ / Vô cơ / Tái chế
```

- Hướng zero-shot bằng mô hình thị giác–ngôn ngữ đã được áp dụng cho phân loại rác trong [7].
- **Prompt ensembling** [2]: mỗi nhóm có nhiều đối tượng × 3 mẫu câu (`prompts.py`).
- Text encoder chỉ chạy một lần trên máy tính (`embed_text.py`) → lưu
  `src/ml/mobileclip/text_embeddings.json`; điện thoại chỉ chạy image encoder.
- Nhờ zero-shot, thêm/bớt loại rác chỉ cần sửa `prompts.py` rồi chạy lại `embed_text.py`.

## 3. Quy trình chuyển đổi (đã làm, có thể lặp lại)

1. Tải `vision_model.onnx`, `text_model.onnx`, `tokenizer.json` (bản ONNX của MobileCLIP-S0, repo `Xenova/mobileclip_s0`).
2. Cố định batch = 1, rút gọn đồ thị bằng `onnxslim`.
3. `onnx2tf -i vision_static.onnx -o tflite_out -odrqt -rtpo Erf`
   (`-rtpo Erf`: thay phép Erf trong GELU bằng công thức xấp xỉ để không cần
   Flex delegate; `-odrqt`: xuất thêm bản lượng tử hoá INT8 dynamic range).
4. Đánh giá: `python evaluate.py test tflite:<file>`.

Lỗi đáng chú ý khi làm: token đệm của tokenizer phải là `!` (id 0) theo
`tokenizer_config.json`; đệm bằng `<|endoftext|>` làm mọi câu mô tả ra vector
gần như trùng nhau (cosine 0,99) và độ chính xác rơi xuống 47%.

## 4. Kết quả

Tập dữ liệu: `dataset3_v2` của nhóm (RealWaste [5] + nguồn bổ sung, gộp 3 nhóm).
Câu mô tả chỉ được chỉnh trên tập **val**; tập **test** (2.749 ảnh) chỉ chạy
một lần để báo cáo.

| Bản mô hình | Dung lượng | Accuracy (test) | Balanced acc. | Độ trễ CPU PC | Trên Android |
|---|---|---|---|---|---|
| ONNX FP32 (gốc) | 45,5 MB | 93,16% | 94,63% | 27 ms | — |
| TFLite FP32 | 45,6 MB | **93,16%** | 94,63% | 82 ms | ✅ 516 ms (máy ảo) — **mặc định** |
| TFLite FP16 | 22,9 MB | 91,92% | 93,71% | 78 ms | ❌ ra NaN (tràn số) — loại |
| TFLite INT8 dynamic | 12,1 MB | 92,91% | 93,86% | 342 ms | ✅ ~5.100 ms (máy ảo) |

Recall từng nhóm (TFLite FP32): hữu cơ 98,2% · vô cơ 96,3% · tái chế 89,4%
(nhầm nhiều nhất: tái chế → vô cơ, 123 ảnh). Chi tiết: `results/results_test_*.txt`.

So sánh: mô hình MobileNetV2 nhóm tự huấn luyện trước đó đạt 90,08% trên cùng
tập test. MobileCLIP zero-shot cao hơn 3 điểm % **mà không cần huấn luyện**.

Nhận xét về lượng tử hoá: INT8 dynamic range giảm dung lượng 3,8 lần, chỉ mất
0,25 điểm %, nhưng **chậm hơn** trên CPU vì phải giải nén trọng số mỗi lần
chạy. Lượng tử hoá INT8 đầy đủ (full-integer) theo Jacob et al. [6] sẽ nhanh
hơn và là hướng cải tiến tiếp theo.

## 5. Giấy phép

Trọng số MobileCLIP thuộc *Apple Machine Learning Research Model License*,
**chỉ dùng cho mục đích nghiên cứu / học thuật phi thương mại**, xem
`LICENSE_APPLE_MLR.txt`. Đồ án môn học thuộc phạm vi này.

> Apple Machine Learning Research Model is licensed under the Apple Machine Learning Research Model License Agreement.

Các file `.tflite` trong `src/ml/models/` là *Model Derivative* (đã chuyển
định dạng và lượng tử hoá, không đổi trọng số gốc).

## Tài liệu tham khảo

[1] P. K. A. Vasu, H. Pouransari, F. Faghri, R. Vemulapalli, and O. Tuzel, "MobileCLIP: Fast image-text models through multi-modal reinforced training," in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)*, Seattle, WA, USA, 2024, pp. 15963–15974, doi: 10.1109/CVPR52733.2024.01511.

[2] A. Radford, J. W. Kim, C. Hallacy, A. Ramesh, G. Goh, S. Agarwal, G. Sastry, A. Askell, P. Mishkin, J. Clark, G. Krueger, and I. Sutskever, "Learning transferable visual models from natural language supervision," in *Proc. 38th Int. Conf. Mach. Learn. (ICML)*, vol. 139, 2021, pp. 8748–8763.

[3] M. Yang and G. Thung, "Classification of trash for recyclability status," CS229 Project Report, Stanford Univ., Stanford, CA, USA, 2016.

[4] L. Yong, L. Ma, D. Sun, and L. Du, "Application of MobileNetV2 to waste classification," *PLoS ONE*, vol. 18, no. 3, Art. no. e0282336, 2023, doi: 10.1371/journal.pone.0282336.

[5] S. Single, S. Iranmanesh, and R. Raad, "RealWaste: A novel real-life data set for landfill waste classification using deep learning," *Information*, vol. 14, no. 12, Art. no. 633, 2023, doi: 10.3390/info14120633.

[6] B. Jacob, S. Kligys, B. Chen, M. Zhu, M. Tang, A. Howard, H. Adam, and D. Kalenichenko, "Quantization and training of neural networks for efficient integer-arithmetic-only inference," in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)*, Salt Lake City, UT, USA, 2018, pp. 2704–2713, doi: 10.1109/CVPR.2018.00286.

[7] I. Ranjbar, Y. Ventikos, and M. Arashpour, "Zero-shot and few-shot multimodal plastic waste classification with vision-language models," *Waste Management*, vol. 202, Art. no. 114815, Jul. 2025, doi: 10.1016/j.wasman.2025.114815.
