import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth/store';
import { loadSortEvents } from '../sorting/loadSortEvents';
import { WASTE_TYPES, WASTE_LABELS, type WasteType } from '../../shared/constants/waste';

export interface WasteStats {
  total: number;
  byType: { type: WasteType; label: string; count: number }[];
  last7Days: { label: string; count: number }[];
}

/** Khoá ngày theo giờ trên máy (không dùng toISOString vì đó là giờ UTC). */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Thống kê của người đang đăng nhập: tính trên cùng nguồn với lịch sử
 * (server + lượt chờ đồng bộ), nên tổng lượt khớp với điểm thưởng. Mất mạng
 * thì tự lùi về dữ liệu trong máy.
 */
export function useWasteStats() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // loading chỉ true ở lần tải đầu; các lần tải lại sau chạy ngầm.
  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await loadSortEvents(userId);

      const countByType = new Map<WasteType, number>();
      const countByDay = new Map<string, number>();
      for (const r of rows) {
        countByType.set(r.waste_type, (countByType.get(r.waste_type) ?? 0) + 1);
        const key = dayKey(new Date(r.created_at));
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
      }

      const byType = WASTE_TYPES.map((type) => ({
        type,
        label: WASTE_LABELS[type],
        count: countByType.get(type) ?? 0,
      }));

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { label, count: countByDay.get(dayKey(d)) ?? 0 };
      });

      setStats({ total: rows.length, byType, last7Days });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được thống kê');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Tải lại mỗi lần màn được mở (tab giữ trạng thái nên useEffect chỉ chạy
  // một lần — bỏ rác xong quay lại sẽ thấy số liệu cũ).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { stats, loading, error, reload: load };
}
