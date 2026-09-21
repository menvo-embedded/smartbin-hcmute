import type { CollectionTask } from '../../shared/types/database';
import type { StatusTone } from '../../theme/colors';

/** Việc "chưa nhận" quá số giờ này thì hiển thị "Quá hạn" để nhân viên ưu tiên xử lý. */
export const TASK_OVERDUE_HOURS = 24;

export type TaskDisplayStatus = 'pending' | 'overdue' | 'in_progress' | 'done';

export const TASK_STATUS_LABEL: Record<TaskDisplayStatus, string> = {
  pending: 'Chưa nhận',
  overdue: 'Quá hạn',
  in_progress: 'Đang xử lý',
  done: 'Hoàn tất',
};

export const TASK_STATUS_TONE: Record<TaskDisplayStatus, StatusTone> = {
  pending: 'neutral',
  overdue: 'danger',
  in_progress: 'warning',
  done: 'success',
};

/**
 * "Quá hạn" chỉ là biến thể hiển thị của "pending" khi việc bị bỏ quên quá lâu —
 * không phải trạng thái riêng trong DB (collection_tasks.status vẫn là 'pending').
 */
export function getTaskDisplayStatus(task: Pick<CollectionTask, 'status' | 'created_at'>): TaskDisplayStatus {
  if (task.status === 'pending') {
    const ageHours = (Date.now() - new Date(task.created_at).getTime()) / 3_600_000;
    return ageHours >= TASK_OVERDUE_HOURS ? 'overdue' : 'pending';
  }
  return task.status;
}
