import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../core/storage/db';
import type { WasteType } from '../../shared/constants/waste';

export interface LocalSortRow {
  local_id: string;
  waste_type: WasteType;
  synced: number;
  created_at: string;
}

export interface SortStats {
  total: number;
  pending: number;
}

const HISTORY_LIMIT = 10;

/**
 * Nguồn duy nhất cho lịch sử bỏ rác cục bộ (SQLite) và số liệu
 * tổng/đang-chờ-đồng-bộ đi kèm. Trước đây logic này nằm thẳng trong
 * sort.tsx; tách ra đây để screen chỉ lo render, và để chỗ khác
 * (vd. stats.tsx) có thể tái sử dụng cùng một nguồn số liệu thay vì
 * tự tính lại — tránh lặp lại kiểu bug lệch dữ liệu đã gặp ở
 * tasks.tsx / task-detail.tsx bên Collector.
 */
export function useSortHistory() {
  const [history, setHistory] = useState<LocalSortRow[]>([]);
  const [stats, setStats] = useState<SortStats>({ total: 0, pending: 0 });

  const reload = useCallback(async () => {
    const db = await getDb();

    const rows = await db.getAllAsync<LocalSortRow>(
      `SELECT local_id, waste_type, synced, created_at
       FROM sort_events
       ORDER BY created_at DESC
       LIMIT ?`,
      [HISTORY_LIMIT],
    );
    setHistory(rows);

    // Gộp 2 câu COUNT riêng biệt thành 1 lần truy vấn.
    const counts = await db.getFirstAsync<{ total: number; pending: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) AS pending
       FROM sort_events`,
    );
    setStats({
      total: counts?.total ?? 0,
      pending: counts?.pending ?? 0,
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { history, stats, reload };
}