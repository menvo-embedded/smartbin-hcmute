import type { ModelSpec } from './classifier';
import { WASTE_TYPES } from '../shared/constants/waste';

/**
 * Danh sách mô hình. Màn hình benchmark cho phép chọn từng bản
 * để đo và so sánh trực tiếp trên máy thật.
 */
export const MODELS: ModelSpec[] = [
  {
    name: 'MobileNetV3 — FP32 (gốc)',
    asset: require('./models/waste_fp32.tflite'),
    labels: [...WASTE_TYPES],
    inputSize: 224,
    quantized: false,
  },
  {
    name: 'MobileNetV3 — INT8',
    asset: require('./models/waste_int8.tflite'),
    labels: [...WASTE_TYPES],
    inputSize: 224,
    quantized: true,
  },
  {
    name: 'MobileNetV3 — Pruned + INT8',
    asset: require('./models/waste_pruned_int8.tflite'),
    labels: [...WASTE_TYPES],
    inputSize: 224,
    quantized: true,
  },
];
