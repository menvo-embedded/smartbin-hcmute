/** Bảng màu dùng chung cho cả 3 vai trò — xanh lá làm chủ đạo, nền sáng. */
export const colors = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  primaryLight: '#dcfce7',
  /** Gradient thương hiệu: xanh lá → xanh ngọc, dùng cho header và nút chính. */
  gradientStart: '#16a34a',
  gradientEnd: '#0d9488',

  background: '#F7F8F5',
  card: '#FFFFFF',
  border: '#E5E7EB',

  text: '#1F2937',
  textMuted: '#6B7280',
  textOnPrimary: '#FFFFFF',

  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  neutral: '#6B7280',
  neutralBg: '#F3F4F6',
} as const;

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export const toneColors: Record<StatusTone, { fg: string; bg: string }> = {
  success: { fg: colors.success, bg: colors.successBg },
  warning: { fg: colors.warning, bg: colors.warningBg },
  danger: { fg: colors.danger, bg: colors.dangerBg },
  neutral: { fg: colors.neutral, bg: colors.neutralBg },
};
