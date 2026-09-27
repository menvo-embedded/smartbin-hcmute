import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';

/**
 * Tiền xử lý ảnh đúng như MobileCLIP-S0 yêu cầu (preprocessor_config.json):
 * resize cạnh ngắn về 256 → cắt giữa 256×256 → RGB, chia 255 về [0, 1],
 * KHÔNG chuẩn hoá mean/std. Trả về Float32Array NHWC (256·256·3) cho TFLite.
 */
export const INPUT_SIZE = 256;

export async function imageToTensor(uri: string, width: number, height: number): Promise<Float32Array> {
  const scale = INPUT_SIZE / Math.min(width, height);
  const w = Math.max(INPUT_SIZE, Math.round(width * scale));
  const h = Math.max(INPUT_SIZE, Math.round(height * scale));

  const result = await manipulateAsync(
    uri,
    [
      { resize: { width: w, height: h } },
      {
        crop: {
          originX: Math.floor((w - INPUT_SIZE) / 2),
          originY: Math.floor((h - INPUT_SIZE) / 2),
          width: INPUT_SIZE,
          height: INPUT_SIZE,
        },
      },
    ],
    { format: SaveFormat.JPEG, compress: 1, base64: true },
  );
  if (!result.base64) throw new Error('Không đọc được dữ liệu ảnh');

  // Giải mã JPEG ra RGBA 8-bit bằng JS thuần (không cần module native).
  const decoded = jpeg.decode(base64ToBytes(result.base64), { useTArray: true, formatAsRGBA: true });
  const { data } = decoded;

  const tensor = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0, j = 0; i < INPUT_SIZE * INPUT_SIZE; i++, j += 4) {
    tensor[i * 3] = data[j] / 255;
    tensor[i * 3 + 1] = data[j + 1] / 255;
    tensor[i * 3 + 2] = data[j + 2] / 255;
  }
  return tensor;
}

/** base64 → bytes, dùng atob có sẵn trong Hermes. */
function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
