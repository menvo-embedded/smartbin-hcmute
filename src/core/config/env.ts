/**
 * Cấu hình môi trường.
 * Không hardcode key trong mã nguồn — đọc từ biến môi trường của Expo.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;

export function assertEnv() {
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) console.warn(`Thiếu biến môi trường: ${missing.join(', ')}`);
}
