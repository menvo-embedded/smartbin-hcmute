import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import { useTableChanges } from '../../../core/supabase/useTableChanges';

/** Bảng nào đổi thì tải lại những dữ liệu nào trên các màn admin. */
const QUERIES_BY_TABLE: Record<string, string[][]> = {
  bins: [['admin_devices']],
  collection_tasks: [['admin_tasks'], ['admin_devices']],
  sort_events: [['admin_sort_samples']],
  devices: [['admin_devices']],
};

const TABLE_LABELS: Record<string, string> = {
  bins: 'Mức đầy thùng rác',
  collection_tasks: 'Công việc thu gom',
  sort_events: 'Lượt bỏ rác',
  devices: 'Trạng thái thiết bị',
};

type LastUpdate = { label: string; at: number } | null;

/** Lần cập nhật realtime gần nhất — các tab admin cùng đọc để hiện chỉ báo "Trực tiếp". */
export const useAdminLastUpdate = create<{ lastUpdate: LastUpdate; set: (u: LastUpdate) => void }>((set) => ({
  lastUpdate: null,
  set: (lastUpdate) => set({ lastUpdate }),
}));

/**
 * Gắn MỘT lần ở layout admin (không gắn ở từng tab, tránh mở trùng kênh):
 * các màn admin tự cập nhật khi thùng đầy thêm, nhân viên nhận/hoàn tất việc
 * hay có người bỏ rác — không cần kéo để làm mới.
 */
export function useAdminRealtime() {
  const qc = useQueryClient();
  const setLastUpdate = useAdminLastUpdate((s) => s.set);

  useTableChanges('admin-dashboard', Object.keys(QUERIES_BY_TABLE), (table) => {
    for (const queryKey of QUERIES_BY_TABLE[table] ?? []) {
      void qc.invalidateQueries({ queryKey });
    }
    setLastUpdate({ label: TABLE_LABELS[table] ?? table, at: Date.now() });
  });
}
