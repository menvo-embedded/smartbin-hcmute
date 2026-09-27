"""Tính sẵn vector văn bản (text embeddings) cho các prompt bằng text encoder
của MobileCLIP-S0, lưu JSON để app chỉ cần chạy image encoder trên máy.

Chạy: env/Scripts/python embed_text.py
"""
import json
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
from prompts import all_prompts, CLASS_ORDER

CONTEXT_LEN = 77
tok = Tokenizer.from_file("model/tokenizer.json")
bos = tok.token_to_id("<|startoftext|>")
eos = tok.token_to_id("<|endoftext|>")
PAD = 0


def encode(text: str):
    ids = tok.encode(text, add_special_tokens=False).ids
    ids = [bos] + ids[: CONTEXT_LEN - 2] + [eos]
    # Đệm bằng token "!" (id 0) theo tokenizer_config.json của bản ONNX này;
    # đệm bằng eos làm mọi câu ra vector gần như trùng nhau (cos ≈ 0,99).
    return ids + [PAD] * (CONTEXT_LEN - len(ids))


def main():
    sess = ort.InferenceSession("model/text_model.onnx", providers=["CPUExecutionProvider"])
    prompts = all_prompts()
    ids = np.array([encode(p) for _, p in prompts], dtype=np.int64)
    emb = sess.run(None, {"input_ids": ids})[0]
    emb = emb / np.linalg.norm(emb, axis=1, keepdims=True)

    out = {
        "model": "MobileCLIP-S0 (Vasu et al., CVPR 2024)",
        "classes": CLASS_ORDER,
        "prompt_classes": [c for c, _ in prompts],
        "prompts": [p for _, p in prompts],
        # Làm tròn 5 chữ số để file gọn mà không ảnh hưởng kết quả.
        "embeddings": np.round(emb, 5).tolist(),
    }
    with open("text_embeddings.json", "w", encoding="utf-8") as f:
        json.dump(out, f)
    print(len(prompts), "prompt ->", emb.shape)


if __name__ == "__main__":
    main()
