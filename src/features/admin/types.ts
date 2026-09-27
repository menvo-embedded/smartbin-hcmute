import type { Device, Bin, CollectionTask, Profile } from '../../shared/types/database';

export type AdminTab = 'devices' | 'dispatch';

export type DeviceFilter = 'all' | 'full' | 'online' | 'offline';

export type TaskFilter = 'all' | 'pending' | 'in_progress' | 'done';

export type TaskShift = 'morning' | 'afternoon' | 'all_day';
export type TaskPriority = 'routine' | 'urgent';

export const SHIFT_LABELS: Record<TaskShift, string> = {
  morning: '🌅 Ca sáng (07:00 - 11:30)',
  afternoon: '🌇 Ca chiều (13:00 - 17:30)',
  all_day: '☀️ Cả ngày',
};

export const SHIFT_SHORT_LABELS: Record<TaskShift, string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  all_day: 'Cả ngày',
};

export type DeviceWithBins = Device & { bins: Bin[] };

/** Tên hiển thị của nhân viên (hồ sơ chưa đặt tên thì ghi rõ để admin biết). */
export function formatStaffName(rawName?: string | null): string {
  return rawName?.trim() || 'Nhân viên chưa đặt tên';
}

export type TaskWithDetails = CollectionTask & {
  devices: {
    name: string;
    area: string;
    code?: string | null;
  } | null;
  profiles?: Profile | null;
  scheduled_date?: string | null;
  shift?: TaskShift | null;
  priority?: TaskPriority | null;
};

export function getErrorMessage(err: unknown): string {
  if (!err) return 'Đã xảy ra lỗi không xác định.';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.error_description === 'string') return o.error_description;
    if (typeof o.details === 'string') return o.details;
    try {
      return JSON.stringify(err);
    } catch {
      return 'Lỗi thao tác dữ liệu.';
    }
  }
  return String(err);
}


