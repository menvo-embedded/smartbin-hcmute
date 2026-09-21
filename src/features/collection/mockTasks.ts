import type { CollectionTask, Profile } from '../../shared/types/database';
import type { TaskShift, TaskPriority } from '../admin/types';

export type TaskWithDevice = CollectionTask & {
  devices: { name: string; area: string; code?: string | null } | null;
  profiles?: Profile | null;
  scheduled_date?: string | null;
  shift?: TaskShift | null;
  priority?: TaskPriority | null;
};

// Dữ liệu mẫu dùng chung cho phần nhân viên thu gom (HCMUTE)
export const MOCK_TASKS: TaskWithDevice[] = [
  {
    id: 'mock-1',
    device_id: 'dev-1',
    assignee_id: null,
    status: 'pending',
    scheduled_date: new Date().toISOString().slice(0, 10),
    shift: 'morning',
    priority: 'urgent',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    completed_at: null,
    proof_photo_url: null,
    note: 'Thùng rác nhựa đầy 90%, cần dọn dẹp gấp.',
    devices: { name: 'Thùng rác Nhựa - BIN-UTE-01', area: 'Sảnh A - Tầng 1', code: 'BIN-UTE-01' },
  } as unknown as TaskWithDevice,
  {
    id: 'mock-2',
    device_id: 'dev-2',
    assignee_id: 'user-2',
    status: 'in_progress',
    scheduled_date: new Date().toISOString().slice(0, 10),
    shift: 'morning',
    priority: 'routine',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    completed_at: null,
    proof_photo_url: null,
    note: 'Thùng rác hữu cơ đầy 75% tại Sảnh B.',
    devices: { name: 'Thùng rác Hữu cơ - BIN-UTE-02', area: 'Sảnh B - Tầng 2', code: 'BIN-UTE-02' },
  } as unknown as TaskWithDevice,
  {
    id: 'mock-3',
    device_id: 'dev-3',
    assignee_id: 'user-2',
    status: 'done',
    scheduled_date: new Date().toISOString().slice(0, 10),
    shift: 'morning',
    priority: 'routine',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    proof_photo_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    note: 'Đã thu gom sạch dọn dẹp khu vực.',
    devices: { name: 'Thùng rác Giấy - BIN-UTE-03', area: 'Khu tự học', code: 'BIN-UTE-03' },
  } as unknown as TaskWithDevice,
];
