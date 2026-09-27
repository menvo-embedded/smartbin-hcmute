import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../core/storage/db';
import { useAuth } from '../auth/store';
import type { WasteType } from '../../shared/constants/waste';

export interface RecentSortRow {
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
 * Dùng cho màn hình sort.tsx: 10 lần bỏ rác gần nhất + số liệu tổng/đang-chờ.
 * KHÁC với useSortHistory.ts (dùng cho màn lịch sử đầy đủ có lọc theo loại
 * rác của luồng hộ gia đình) — cố tình tách tên riêng để không đụng nhau dù
 * cùng đọc từ bảng sort_events.
 */
export function useSortStats() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const [history, setHistory] = useState<RecentSortRow[]>([]);
  const [stats, setStats] = useState<SortStats>({ total: 0, pending: 0 });

  const reload = useCallback(async () => {
    const db = await getDb();

    const rows = await db.getAllAsync<RecentSortRow>(
      `SELECT local_id, waste_type, synced, created_at
       FROM sort_events
       WHERE user_id IS ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, HISTORY_LIMIT],
    );
    setHistory(rows);

    // Gộp 2 câu COUNT riêng biệt thành 1 lần truy vấn.
    const counts = await db.getFirstAsync<{ total: number; pending: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) AS pending
       FROM sort_events
       WHERE user_id IS ?`,
      [userId],
    );
    setStats({
      total: counts?.total ?? 0,
      pending: counts?.pending ?? 0,
    });
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { history, stats, reload };
}
