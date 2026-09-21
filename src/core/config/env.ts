/**
 * Cấu hình môi trường.
 * Không hardcode key trong mã nguồn — đọc từ biến môi trường của Expo.
 */
export const env = {
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://kcdzuebpfcszcnrpxkae.supabase.co',
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_6VNfi-6rvrDanL_9XvbVTQ_9NU3Chv9',
} as const;

export function assertEnv() {
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) console.warn(`Thiếu biến môi trường: ${missing.join(', ')}`);
}
