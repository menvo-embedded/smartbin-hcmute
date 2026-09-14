import { useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getDb } from '../../core/storage/db';
import { enqueue } from '../../core/sync/queue';
import { binController } from '../../core/ble/binController';
import { useAuth } from '../auth/store';
import type { WasteType } from '../../shared/constants/waste';

/**
 * Luồng bỏ rác: mở ngăn trên thiết bị, ghi sự kiện vào máy,
 * rồi xếp hàng chờ đồng bộ. Ghi cục bộ trước nên vẫn dùng được khi mất mạng.
 */
export function useSortAction(deviceId: string) {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sort(type: WasteType, source: 'manual' | 'ai', confidence?: number) {
    setBusy(true);
    setError(null);
    try {
      const result = await binController.openBin(type);
      if (!result.ok) {
        setError(result.message ?? 'Không mở được ngăn rác');
        return false;
      }

      const localId = Crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const db = await getDb();
      await db.runAsync(
        `INSERT INTO sort_events (local_id, device_id, user_id, waste_type, source, confidence, created_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        localId, deviceId, userId, type, source, confidence ?? null, createdAt,
      );

      await enqueue('sort_events', 'insert', {
        local_id: localId,
        device_id: deviceId,
        user_id: userId,
        waste_type: type,
        source,
        confidence: confidence ?? null,
        created_at: createdAt,
      });

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { sort, busy, error };
}
