/**
 * Diễn giải lỗi đăng nhập Supabase thành thông báo tiếng Việt dễ hiểu cho
 * người dùng. Log chi tiết lỗi gốc ra console cho developer debug, không
 * hiện stack trace hay lộ anon key lên UI.
 */
export function toSignInErrorMessage(error: unknown): string {
  console.error('[auth] Đăng nhập lỗi:', error);

  const message = error instanceof Error ? error.message : String(error);

  if (/network request failed|failed to fetch|fetch failed/i.test(message)) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Internet hoặc cấu hình Supabase.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.';
  }
  if (/user not found/i.test(message)) {
    return 'Tài khoản không tồn tại.';
  }

  return message || 'Đăng nhập thất bại. Vui lòng thử lại.';
}
