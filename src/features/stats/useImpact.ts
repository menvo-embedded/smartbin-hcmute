import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth/store';
import { loadSortEvents } from '../sorting/loadSortEvents';
import { computeImpact, type Impact } from './impact';

/** Tác động môi trường + chuỗi ngày + huy hiệu của người đang đăng nhập. */
export function useImpact() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const [impact, setImpact] = useState<Impact | null>(null);

  const load = useCallback(async () => {
    try {
      setImpact(computeImpact(await loadSortEvents(userId)));
    } catch {
      // Không đọc được thì giữ số liệu cũ, không chặn màn hình.
    }
  }, [userId]);

  // Tải lại mỗi lần mở màn (bỏ rác xong quay lại thấy số mới).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { impact, reload: load };
}
