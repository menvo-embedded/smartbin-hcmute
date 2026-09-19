/**
 * Cấu hình môi trường.
 * Không hardcode key trong mã nguồn — đọc từ biến môi trường của Expo.
 */
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const missingKeys = [
  !rawSupabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
  !rawSupabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter((v): v is string => Boolean(v));

/**
 * true nếu đã có URL + anon key thật. Dùng để chặn sớm các luồng gọi
 * Supabase (ví dụ đăng nhập) thay vì để lỗi mạng mơ hồ như
 * "Network request failed" khi chỉ đơn giản là thiếu file .env.
 */
export const isEnvConfigured = missingKeys.length === 0;

export const env = {
  // Khi thiếu cấu hình vẫn cần 1 URL hợp lệ cú pháp để `createClient` không
  // crash ngay lúc khởi động app — không nơi nào thật sự gọi tới URL giả
  // này vì các luồng gọi Supabase đều tự chặn sớm bằng `isEnvConfigured`.
  supabaseUrl: rawSupabaseUrl || 'https://missing-config.invalid',
  supabaseAnonKey: rawSupabaseAnonKey || 'missing-anon-key',
  mockBle: process.env.EXPO_PUBLIC_MOCK_BLE === '1',
} as const;

/** Gọi 1 lần lúc khởi động app (xem `src/app/_layout.tsx`) để log rõ biến nào thiếu. */
export function assertEnv() {
  if (missingKeys.length) {
    console.error(
      `[env] Thiếu biến môi trường: ${missingKeys.join(', ')}. ` +
        'Tạo file .env từ .env.example (hoặc chạy `npm run setup`) rồi điền URL/anon key thật của Supabase — xem README.',
    );
  }
}
