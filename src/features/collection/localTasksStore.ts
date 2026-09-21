import { MOCK_TASKS, type TaskWithDevice } from './mockTasks';

// Kho lưu trữ nhiệm vụ chia sẻ giữa Admin (Quản trị viên) và Collector (Nhân viên thu gom)
// Giúp đồng bộ dữ liệu hai chiều ngay lập tức kể cả khi Supabase RLS hạn chế ghi
export const localTasksStore: TaskWithDevice[] = [...MOCK_TASKS];

export function getLocalTasks(): TaskWithDevice[] {
  return localTasksStore;
}

export function findLocalTask(id: string): TaskWithDevice | undefined {
  return localTasksStore.find((t) => t.id === id);
}

export function upsertLocalTask(task: TaskWithDevice): void {
  const index = localTasksStore.findIndex((t) => t.id === task.id);
  if (index >= 0) {
    localTasksStore[index] = { ...localTasksStore[index], ...task };
  } else {
    localTasksStore.unshift(task);
  }
}

export function updateLocalTaskStatus(
  id: string,
  updates: Partial<TaskWithDevice>
): TaskWithDevice | undefined {
  const item = localTasksStore.find((t) => t.id === id);
  if (item) {
    Object.assign(item, updates);
    return item;
  }
  return undefined;
}
