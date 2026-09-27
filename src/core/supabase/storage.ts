import { supabase } from './client';

/** Tiền tố đánh dấu giá trị là file trong Supabase Storage: "storage://<bucket>/<path>". */
const STORAGE_PREFIX = 'storage://';
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Tải một file trong máy (uri dạng file://) lên bucket riêng tư, trả về chuỗi
 * tham chiếu "storage://<bucket>/<path>" để lưu vào DB. Ném lỗi nếu không tải
 * được (mất mạng, không có quyền...).
 */
export async function uploadFile(bucket: string, path: string, uri: string, contentType: string) {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: true });
  if (error) throw error;

  return `${STORAGE_PREFIX}${bucket}/${path}`;
}

/**
 * Đổi giá trị lưu trong DB thành URL hiển thị được: file trong bucket riêng tư
 * thì xin signed URL (hết hạn sau 1 giờ), còn lại (file:// trong máy, http...)
 * giữ nguyên.
 */
export async function resolveFileUrl(value: string): Promise<string> {
  if (!value.startsWith(STORAGE_PREFIX)) return value;

  const rest = value.slice(STORAGE_PREFIX.length);
  const slash = rest.indexOf('/');
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
