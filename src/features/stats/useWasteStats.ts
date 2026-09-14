import { useCallback, useEffect, useState } from 'react';
import { getDb } from '../../core/storage/db';
import { WASTE_TYPES, WASTE_LABELS, type WasteType } from '../../shared/constants/waste';

export interface WasteStats {
  total: number;
  byType: { type: WasteType; label: string; count: number }[];
  last7Days: { label: string; count: number }[];
}

/** Đọc thống kê từ SQLite cục bộ — hoạt động cả khi offline, không cần gọi Supabase. */
export function useWasteStats() {
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const db = await getDb();

    const totalRow = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM sort_events`);

    const typeRows = await db.getAllAsync<{ waste_type: WasteType; n: number }>(
      `SELECT waste_type, COUNT(*) AS n FROM sort_events GROUP BY waste_type`,
    );
    const countByType = new Map(typeRows.map((r) => [r.waste_type, r.n]));
    const byType = WASTE_TYPES.map((type) => ({
      type,
      label: WASTE_LABELS[type],
      count: countByType.get(type) ?? 0,
    }));

    const dayRows = await db.getAllAsync<{ day: string; n: number }>(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n
       FROM sort_events
       WHERE created_at >= date('now', '-6 days')
       GROUP BY day`,
    );
    const countByDay = new Map(dayRows.map((r) => [r.day, r.n]));

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      const [, month, day] = iso.split('-');
      return { label: `${day}/${month}`, count: countByDay.get(iso) ?? 0 };
    });

    setStats({ total: totalRow?.n ?? 0, byType, last7Days });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, reload: load };
}
