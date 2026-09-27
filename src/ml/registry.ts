import { Classifier, type ModelSpec } from './classifier';

/**
 * Các bản MobileCLIP-S0 (Vasu et al., CVPR 2024) đã chuyển sang TFLite.
 * Độ chính xác đo trên tập test dataset3_v2 (2.749 ảnh) bằng
 * ml-research/evaluate.py.
 *
 * Apple Machine Learning Research Model is licensed under the Apple Machine
 * Learning Research Model License Agreement (xem mobileclip/LICENSE_APPLE_MLR.txt).
 * Đây là Model Derivative: chuyển ONNX → TFLite, thay phép Erf bằng công thức
 * xấp xỉ, lượng tử hoá INT8 (dynamic range).
 */
export const MODELS: ModelSpec[] = [
  {
    name: 'MobileCLIP-S0 — FP32',
    asset: require('./models/mobileclip_s0_fp32.tflite'),
    sizeMb: 45.6,
    testAccuracy: 0.9316,
  },
  {
    name: 'MobileCLIP-S0 — INT8',
    asset: require('./models/mobileclip_s0_int8.tflite'),
    sizeMb: 12.1,
    testAccuracy: 0.9291,
  },
];

/**
 * Mặc định FP32: đúng nhất và nhanh nhất khi chạy CPU (516 ms/ảnh trên máy ảo).
 * INT8 nhỏ bằng 1/4 nhưng chậm hơn nhiều vì lượng tử hoá động phải giải nén
 * trọng số mỗi lần chạy. Bản FP16 (91,92%) bị loại: ra NaN trên Android do
 * tràn số — xem ml-research/README.md.
 */
export const DEFAULT_MODEL = MODELS[0];

const cache = new Map<string, Classifier>();

/** Mỗi bản model chỉ nạp một lần trong suốt phiên chạy. */
export function getClassifier(spec: ModelSpec = DEFAULT_MODEL) {
  let c = cache.get(spec.name);
  if (!c) {
    c = new Classifier(spec);
    cache.set(spec.name, c);
  }
  return c;
}
