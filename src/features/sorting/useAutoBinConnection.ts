import { useEffect } from 'react';
import { useBinConnection } from './useBinConnection';
import { useDeviceHeartbeat } from '../devices/useDeviceHeartbeat';

/** Lỗi kết nối thì tự thử lại sau khoảng này, không cần người dùng bấm. */
const RETRY_MS = 10_000;

/**
 * Tự kết nối BLE tới thùng đang dùng, tự thử lại khi lỗi (ESP32 tắt/khởi động
 * lại), tự ngắt khi đổi thùng hoặc rời màn hình, và gửi nhịp tim lên server
 * khi đang kết nối để quản lý biết thùng còn hoạt động.
 */
export function useAutoBinConnection(deviceId: string | null) {
  const { status, error, connect, disconnect } = useBinConnection();

  useEffect(() => {
    if (!deviceId) return;
    void connect();
    // Ngắt kết nối cũ khi đổi thùng (hoặc rời màn hình) — ESP32 chỉ quảng bá
    // lại khi thực sự bị ngắt, nếu không lần quét kế tiếp sẽ không thấy nó.
    return () => {
      void disconnect();
    };
  }, [deviceId, connect, disconnect]);

  useEffect(() => {
    if (!deviceId || status !== 'error') return;
    const timer = setTimeout(() => void connect(), RETRY_MS);
    return () => clearTimeout(timer);
  }, [deviceId, status, connect]);

  useDeviceHeartbeat(deviceId, status === 'connected');

  return { status, error, retry: connect };
}
