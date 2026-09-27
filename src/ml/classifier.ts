/**
 * Chạy image encoder MobileCLIP-S0 (TFLite) trên máy + phân loại zero-shot.
 * Nơi DUY NHẤT trong app import react-native-fast-tflite (quy ước "Module AI
 * độc lập"): phần còn lại chỉ nhận { label, confidence }.
 */
import { loadTensorflowModel, type TensorflowModel } from 'react-native-fast-tflite';
import { imageToTensor } from './preprocess';
import { classifyEmbedding, type ZeroShotResult } from './zeroShot';

export interface ModelSpec {
  /** Tên hiển thị trong màn benchmark. */
  name: string;
  /** require('./models/xxx.tflite') */
  asset: number;
  /** Dung lượng file, MB — để so sánh khi benchmark. */
  sizeMb: number;
  /** Độ chính xác đo trên tập test (ai-mobileclip/evaluate.py). */
  testAccuracy: number;
}

export interface Prediction extends ZeroShotResult {
  /** Thời gian chạy riêng model (không tính đọc ảnh), ms. */
  latencyMs: number;
  /** Thời gian tiền xử lý ảnh, ms. */
  preprocessMs: number;
}

export class Classifier {
  private model: TensorflowModel | null = null;

  constructor(readonly spec: ModelSpec) {}

  async load() {
    if (!this.model) this.model = await loadTensorflowModel(this.spec.asset);
    return this;
  }

  /** Phân loại một ảnh (uri file://) có kích thước width × height. */
  async classify(uri: string, width: number, height: number): Promise<Prediction> {
    await this.load();
    const t0 = performance.now();
    const input = await imageToTensor(uri, width, height);
    const t1 = performance.now();
    const [embedding] = this.model!.runSync([input]);
    const t2 = performance.now();
    if (!Number.isFinite((embedding as Float32Array)[0])) {
      throw new Error(`Mô hình ${this.spec.name} trả về giá trị không hợp lệ trên thiết bị này`);
    }
    return { ...classifyEmbedding(embedding as Float32Array), preprocessMs: t1 - t0, latencyMs: t2 - t1 };
  }
}
