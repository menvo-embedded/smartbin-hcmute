import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { pendingCount } from './queue';
import { MAX_ATTEMPTS } from './engine';

const POLL_MS = 3_000;

/** Trạng thái mạng + số thao tác đang chờ đồng bộ, cập nhật mỗi vài giây. */
export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable null = chưa kiểm tra xong, coi như còn mạng.
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });

    let cancelled = false;
    const refresh = async () => {
      const n = await pendingCount(MAX_ATTEMPTS);
      if (!cancelled) setPending(n);
    };
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  return { isOnline, pending };
}
