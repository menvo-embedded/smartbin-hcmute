import textData from './mobileclip/text_embeddings.json';

/**
 * Phân loại zero-shot kiểu CLIP (Radford et al., 2021):
 * 1. Chuẩn hoá vector ảnh về độ dài 1.
 * 2. Cosine với vector của từng câu mô tả (tính sẵn bằng text encoder,
 *    xem ai-mobileclip/embed_text.py), nhân nhiệt độ 100 rồi softmax.
 * 3. Điểm một nhóm = tổng xác suất các câu thuộc nhóm đó.
 */
const LOGIT_SCALE = 100;

interface TextData {
  classes: string[];
  prompt_classes: string[];
  prompts: string[];
  embeddings: number[][];
}

const data = textData as TextData;
const DIM = data.embeddings[0].length;
// Gộp thành 1 mảng liền để tính nhanh.
const TEXT = new Float32Array(data.embeddings.length * DIM);
data.embeddings.forEach((row, i) => TEXT.set(row, i * DIM));
const PROMPT_CLASS = data.prompt_classes.map((c) => data.classes.indexOf(c));

export interface ZeroShotResult {
  /** Nhóm có điểm cao nhất. */
  label: string;
  confidence: number;
  /** Điểm của từng nhóm (tổng = 1). */
  scores: Record<string, number>;
  /** Câu mô tả khớp nhất — để giải thích vì sao ra kết quả. */
  bestPrompt: string;
}

export function classifyEmbedding(imageEmbedding: ArrayLike<number>): ZeroShotResult {
  let norm = 0;
  for (let k = 0; k < DIM; k++) norm += imageEmbedding[k] * imageEmbedding[k];
  norm = Math.sqrt(norm) || 1;

  const logits = new Float64Array(data.prompts.length);
  let max = -Infinity;
  for (let p = 0; p < data.prompts.length; p++) {
    let dot = 0;
    const off = p * DIM;
    for (let k = 0; k < DIM; k++) dot += TEXT[off + k] * imageEmbedding[k];
    logits[p] = (LOGIT_SCALE * dot) / norm;
    if (logits[p] > max) max = logits[p];
  }

  let sum = 0;
  let best = 0;
  for (let p = 0; p < logits.length; p++) {
    logits[p] = Math.exp(logits[p] - max);
    sum += logits[p];
    if (logits[p] > logits[best]) best = p;
  }

  const classScores = new Array(data.classes.length).fill(0);
  for (let p = 0; p < logits.length; p++) classScores[PROMPT_CLASS[p]] += logits[p] / sum;

  let top = 0;
  for (let c = 1; c < classScores.length; c++) if (classScores[c] > classScores[top]) top = c;

  return {
    label: data.classes[top],
    confidence: classScores[top],
    scores: Object.fromEntries(data.classes.map((c, i) => [c, classScores[i]])),
    bestPrompt: data.prompts[best],
  };
}
