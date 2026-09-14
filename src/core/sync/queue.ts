import { getDb } from '../storage/db';

export type SyncEntity = 'sort_events' | 'collection_tasks';

/** Đưa một thao tác vào hàng đợi. Gọi ngay sau khi ghi vào bảng cục bộ. */
export async function enqueue(entity: SyncEntity, operation: 'insert' | 'update', payload: unknown) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue (entity, operation, payload, created_at) VALUES (?, ?, ?, ?)`,
    entity,
    operation,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
}

export async function pending(limit = 50) {
  const db = await getDb();
  return db.getAllAsync<{
    id: number;
    entity: SyncEntity;
    operation: 'insert' | 'update';
    payload: string;
    attempts: number;
  }>(`SELECT * FROM sync_queue ORDER BY id ASC LIMIT ?`, limit);
}

export async function remove(id: number) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, id);
}

export async function markFailed(id: number, error: string) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    error,
    id,
  );
}

export async function pendingCount() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM sync_queue`);
  return row?.n ?? 0;
}
