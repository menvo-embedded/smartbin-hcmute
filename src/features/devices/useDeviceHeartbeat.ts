import { useEffect } from 'react';
import { supabase } from '../../core/supabase/client';

/** Mỗi phút báo server "thùng này còn sống" — server im lặng quá lâu sẽ báo mất kết nối. */
const HEARTBEAT_MS = 60_000;

/**
 * Gửi nhịp tim cho thiết bị khi app đang kết nối được với thùng (kiosk / hộ
 * gia đình). Server cập nhật last_seen_at, is_online và tự báo quản lý khi thùng
 * kết nối lại; vòng tự động báo mất kết nối khi không còn nhịp.
 */
export function useDeviceHeartbeat(deviceId: string | null, active: boolean) {
  useEffect(() => {
    if (!deviceId || !active) return;
    const beat = () => {
      // Mất mạng thì thôi, lần sau gửi tiếp — không làm phiền người dùng.
      void supabase.rpc('device_heartbeat', { p_device_id: deviceId } as never).then(
        () => undefined,
        () => undefined,
      );
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [deviceId, active]);
}
