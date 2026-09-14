/**
 * Lớp bọc TensorFlow Lite dùng chung cho cả hai project.
 * Đổi bài toán chỉ cần đổi ModelSpec, không sửa phần còn lại.
 */
import { loadTensorflowModel, type TensorflowModel } from 'react-native-fast-tflite';

export interface ModelSpec {
  /** Tên hiển thị trong màn hình benchmark. */
  name: string;
  /** require('../assets/models/xxx.tflite') */
  asset: number;
  /** Nhãn đầu ra, đúng thứ tự index của mô hình. */
  labels: string[];
  inputSize: number;
  /** true nếu mô hình đã lượng tử hoá INT8. */
  quantized: boolean;
}

export interface Prediction {
  label: string;
  confidence: number;
  /** Thời gian suy luận thực tế, dùng cho phần benchmark. */
  latencyMs: number;
}

export class Classifier {
  private model: TensorflowModel | null = null;

  constructor(private spec: ModelSpec) {}

  async load() {
    if (!this.model) this.model = await loadTensorflowModel(this.spec.asset);
    return this;
  }

  /** input là mảng pixel đã resize và chuẩn hoá theo inputSize của mô hình. */
  run(input: Float32Array | Uint8Array): Prediction {
    if (!this.model) throw new Error('Mô hình chưa được nạp');

    const start = performance.now();
    const output = this.model.runSync([input])[0] as Float32Array | Uint8Array;
    const latencyMs = performance.now() - start;

    let bestIndex = 0;
    for (let i = 1; i < output.length; i++) {
      if (output[i] > output[bestIndex]) bestIndex = i;
    }

    // Đầu ra INT8 nằm trong khoảng 0..255, cần đưa về 0..1.
    const raw = output[bestIndex];
    const confidence = this.spec.quantized ? raw / 255 : raw;

    return {
      label: this.spec.labels[bestIndex] ?? 'unknown',
      confidence,
      latencyMs,
    };
  }

  get info() {
    return this.spec;
  }
}
