import { useCallback, useState } from 'react';
import { binController } from '../../core/ble/binController';
import { ensureBlePermissions } from '../../core/ble/permissions';

export type ConnectionStatus = 'idle' | 'scanning' | 'connected' | 'error';

/**
 * Quét và kết nối BLE tới ESP32 của thùng rác đang chọn. Dùng chung được cho cả
 * bản thật và bản giả lập vì binController che giấu khác biệt đó — hook không
 * cần biết đang chạy MOCK_BLE hay không.
 */
export function useBinConnection() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus('scanning');
    setError(null);

    const granted = await ensureBlePermissions();
    if (!granted) {
      setError('Cần cấp quyền Bluetooth để kết nối thùng rác');
      setStatus('error');
      return false;
    }

    try {
      const devices = await binController.scan();
      if (devices.length === 0) {
        setError('Không tìm thấy thùng rác gần đây. Kiểm tra ESP32 đã bật chưa.');
        setStatus('error');
        return false;
      }

      await binController.connect(devices[0].id);
      setStatus('connected');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không kết nối được thùng rác');
      setStatus('error');
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await binController.disconnect();
    setStatus('idle');
  }, []);

  return { status, error, connect, disconnect };
}
