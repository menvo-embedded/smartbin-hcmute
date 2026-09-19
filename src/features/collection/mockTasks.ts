import type { CollectionTask } from '../../shared/types/database';

export type TaskWithDevice = CollectionTask & { devices: { name: string; area: string } | null };

// Nguồn dữ liệu mẫu DUY NHẤT, dùng chung cho cả tasks.tsx và task-detail.tsx.
// Không khai báo mock data riêng ở từng file nữa — mọi thay đổi trạng thái
// đều đi qua React Query cache (xem cách dùng trong tasks.tsx / task-detail.tsx),
// nên 2 màn hình luôn nhìn thấy cùng một trạng thái.
export const MOCK_TASKS: TaskWithDevice[] = [
  {
    id: 'mock-1',
    device_id: 'dev-1',
    collector_id: null,
    assignee_id: null,
    status: 'pending',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    completed_at: null,
    note: 'Thùng rác nhựa đầy 90%, cần dọn dẹp gấp.',
    devices: { name: 'Thùng rác Nhựa - BIN-UTE-01', area: 'Sảnh A - Tầng 1' },
  } as unknown as TaskWithDevice,
  {
    id: 'mock-2',
    device_id: 'dev-2',
    collector_id: 'user-2',
    assignee_id: 'user-2',
    status: 'in_progress',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    completed_at: null,
    note: 'Thùng rác hữu cơ đầy 75% tại Sảnh B.',
    devices: { name: 'Thùng rác Hữu cơ - BIN-UTE-02', area: 'Sảnh B - Tầng 2' },
  } as unknown as TaskWithDevice,
  {
    id: 'mock-3',
    device_id: 'dev-3',
    collector_id: 'user-2',
    assignee_id: 'user-2',
    status: 'done',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    note: 'Đã thu gom sạch dọn dẹp khu vực.',
    devices: { name: 'Thùng rác Giấy - BIN-UTE-03', area: 'Khu tự học' },
  } as unknown as TaskWithDevice,
];