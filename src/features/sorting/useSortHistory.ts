import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../core/storage/db';
import type { WasteType } from '../../shared/constants/waste';

export interface SortHistoryRow {
  local_id: string;
  waste_type: WasteType;
  synced: number;
  created_at: string;
}

/** Đọc toàn bộ lịch sử bỏ rác từ SQLite cục bộ, có thể lọc theo loại rác. */
export function useSortHistory(filterType: WasteType | null) {
  const [rows, setRows] = useState<SortHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await getDb();
      const result = filterType
        ? await db.getAllAsync<SortHistoryRow>(
            `SELECT local_id, waste_type, synced, created_at FROM sort_events
             WHERE waste_type = ? ORDER BY created_at DESC`,
            filterType,
          )
        : await db.getAllAsync<SortHistoryRow>(
            `SELECT local_id, waste_type, synced, created_at FROM sort_events ORDER BY created_at DESC`,
          );
      setRows(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được lịch sử cục bộ');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
}
