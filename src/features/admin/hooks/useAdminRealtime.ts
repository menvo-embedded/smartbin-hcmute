import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTableChanges } from '../../../core/supabase/useTableChanges';

/** Bảng nào đổi thì tải lại những dữ liệu nào trên màn admin. */
const QUERIES_BY_TABLE: Record<string, string[][]> = {
  bins: [['admin_devices']],
  collection_tasks: [['admin_tasks'], ['admin_devices']],
  sort_events: [['admin_sort_samples']],
};

const TABLE_LABELS: Record<string, string> = {
  bins: 'Mức đầy thùng rác',
  collection_tasks: 'Công việc thu gom',
  sort_events: 'Lượt bỏ rác',
};

/**
 * Màn admin tự cập nhật khi thùng đầy thêm, nhân viên nhận/hoàn tất việc hay
 * có người bỏ rác — không cần kéo để làm mới. Trả về thông tin lần cập nhật
 * gần nhất để hiển thị chỉ báo "Trực tiếp".
 */
export function useAdminRealtime() {
  const qc = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<{ label: string; at: number } | null>(null);

  useTableChanges('admin-dashboard', Object.keys(QUERIES_BY_TABLE), (table) => {
    for (const queryKey of QUERIES_BY_TABLE[table] ?? []) {
      void qc.invalidateQueries({ queryKey });
    }
    setLastUpdate({ label: TABLE_LABELS[table] ?? table, at: Date.now() });
  });

  return { lastUpdate };
}
