import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth/store';
import { loadSortEvents, type SortEventRow } from './loadSortEvents';
import type { WasteType } from '../../shared/constants/waste';

export type SortHistoryRow = SortEventRow;

/**
 * Lịch sử bỏ rác của người đang đăng nhập (kiosk chưa đăng nhập thì là các
 * lượt ẩn danh), gồm cả server lẫn lượt chờ đồng bộ; có thể lọc theo loại rác.
 */
export function useSortHistory(filterType: WasteType | null) {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const [rows, setRows] = useState<SortHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // loading chỉ true ở lần tải đầu; các lần tải lại sau chạy ngầm.
  const load = useCallback(async () => {
    setError(null);
    try {
      const all = await loadSortEvents(userId);
      setRows(filterType ? all.filter((r) => r.waste_type === filterType) : all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được lịch sử');
    } finally {
      setLoading(false);
    }
  }, [filterType, userId]);

  // Tải lại mỗi lần màn được mở (tab giữ trạng thái nên useEffect chỉ chạy
  // một lần — bỏ rác xong quay lại sẽ thấy số liệu cũ).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { rows, loading, error, reload: load };
}
