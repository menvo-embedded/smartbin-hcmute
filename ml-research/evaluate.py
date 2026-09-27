"""Đánh giá MobileCLIP-S0 zero-shot trên dataset3_v2 (RealWaste gộp 3 nhóm).

Chạy: env/Scripts/python evaluate.py [val|test] [onnx|tflite:<file>]
In ra accuracy, balanced accuracy, recall từng nhóm, ma trận nhầm lẫn và
thời gian suy luận trung bình trên CPU máy tính.
"""
import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

DATA = Path(__file__).parent.parent / "realwaste-main" / "dataset3_v2"
SIZE = 256
LOGIT_SCALE = 100.0  # nhiệt độ softmax của CLIP

text = json.load(open("text_embeddings.json", encoding="utf-8"))
CLASSES = text["classes"]
WASTE = [c for c in CLASSES if c != "none"]      # 3 nhóm rác có trong dataset
LIVE_THRESHOLD = 0.8                              # ngưỡng tự mở nắp của app
T = np.array(text["embeddings"], dtype=np.float32)          # (P, 512)
prompt_cls = np.array([CLASSES.index(c) for c in text["prompt_classes"]])


def preprocess(path):
    """Giống preprocessor_config.json: resize cạnh ngắn 256 → cắt giữa 256 → [0,1]."""
    img = Image.open(path).convert("RGB")
    w, h = img.size
    s = SIZE / min(w, h)
    img = img.resize((max(SIZE, round(w * s)), max(SIZE, round(h * s))), Image.BILINEAR)
    w, h = img.size
    left, top = (w - SIZE) // 2, (h - SIZE) // 2
    img = img.crop((left, top, left + SIZE, top + SIZE))
    return np.asarray(img, dtype=np.float32) / 255.0          # (256, 256, 3)


def make_runner(spec):
    if spec == "onnx":
        import onnxruntime as ort
        sess = ort.InferenceSession("model/vision_model.onnx", providers=["CPUExecutionProvider"])
        return lambda x: sess.run(None, {"pixel_values": x.transpose(2, 0, 1)[None]})[0][0]
    path = spec.split(":", 1)[1]
    from ai_edge_litert.interpreter import Interpreter
    it = Interpreter(model_path=path, num_threads=4)
    it.allocate_tensors()
    inp, out = it.get_input_details()[0], it.get_output_details()[0]
    nhwc = inp["shape"][-1] == 3

    def run(x):
        it.set_tensor(inp["index"], (x if nhwc else x.transpose(2, 0, 1))[None].astype(np.float32))
        it.invoke()
        return it.get_tensor(out["index"])[0]
    return run


def classify(img_emb):
    img_emb = img_emb / np.linalg.norm(img_emb)
    logits = LOGIT_SCALE * (T @ img_emb)
    p = np.exp(logits - logits.max())
    p /= p.sum()
    scores = np.bincount(prompt_cls, weights=p, minlength=len(CLASSES))
    # Chế độ chụp ảnh: chỉ chọn trong 3 nhóm rác (bỏ qua "none").
    waste_scores = scores[: len(WASTE)] / scores[: len(WASTE)].sum()
    return int(waste_scores.argmax()), scores


def main():
    split = sys.argv[1] if len(sys.argv) > 1 else "val"
    spec = sys.argv[2] if len(sys.argv) > 2 else "onnx"
    run = make_runner(spec)
    conf = np.zeros((len(WASTE), len(WASTE)), dtype=int)
    times = []
    live = {"open_right": 0, "open_wrong": 0, "wait": 0}
    for ci, cls in enumerate(WASTE):
        for f in sorted((DATA / split / cls).iterdir()):
            x = preprocess(f)
            t0 = time.perf_counter()
            emb = run(x)
            times.append(time.perf_counter() - t0)
            pred, scores = classify(emb)
            conf[ci, pred] += 1
            # Chế độ trực tiếp: chỉ mở nắp khi nhóm cao nhất (tính cả "none")
            # là rác và điểm ≥ ngưỡng; còn lại thì chờ khung hình tiếp theo.
            top = int(scores.argmax())
            if CLASSES[top] == "none" or scores[top] < LIVE_THRESHOLD:
                live["wait"] += 1
            elif top == ci:
                live["open_right"] += 1
            else:
                live["open_wrong"] += 1
    recall = conf.diagonal() / conf.sum(axis=1)
    print(f"model={spec} split={split} n={conf.sum()}")
    print(f"accuracy          = {conf.diagonal().sum() / conf.sum():.4f}")
    print(f"balanced accuracy = {recall.mean():.4f}")
    for c, r in zip(WASTE, recall):
        print(f"  recall {c:8s} = {r:.4f}")
    print("confusion (hàng = thật, cột = dự đoán):", WASTE)
    print(conf)
    n = conf.sum()
    opened = live["open_right"] + live["open_wrong"]
    print(f"[trực tiếp, ngưỡng {LIVE_THRESHOLD}] mở nắp ngay {opened / n:.4f} "
          f"(đúng ngăn {live['open_right'] / max(opened, 1):.4f}), chờ khung sau {live['wait'] / n:.4f}")
    print(f"latency CPU trung bình = {1000 * np.mean(times):.1f} ms/ảnh")


if __name__ == "__main__":
    main()
