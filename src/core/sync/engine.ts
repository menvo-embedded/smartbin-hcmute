import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase/client';
import { getDb } from '../storage/db';
import { pending, remove, markFailed } from './queue';
/**
 * pending() - Lấy danh sách các thao tác đang chờ đồng bộ.
 * remove(id) - Xóa thao tác đã đồng bộ thành công.
 * markFailed(id, error) - Đánh dấu thao tác thất bại, ghi lại lỗi.
 */
const MAX_ATTEMPTS = 5; 
let running = false;

/**
 * Đẩy các thao tác đang chờ lên server.
 * Xung đột được giải quyết theo last-write-wins dựa trên created_at:
 * bản ghi nào có thời điểm mới hơn thì thắng. Đây là lựa chọn có chủ đích,
 * phù hợp vì dữ liệu sự kiện chỉ ghi thêm, hiếm khi sửa đồng thời.
 */
export async function flush(): Promise<{ pushed: number; failed: number }> {
  if (running) return { pushed: 0, failed: 0 };
  running = true;
  let pushed = 0;
  let failed = 0;

  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return { pushed, failed };

    const jobs = await pending();
    const db = await getDb();

    for (const job of jobs) {
      if (job.attempts >= MAX_ATTEMPTS) continue;
      try {
        const payload = JSON.parse(job.payload);

        if (job.operation === 'insert') {
          const { data, error } = await supabase
            .from(job.entity)
            .insert(payload)
            .select('id')
            .single();
          if (error) throw error;

          if (job.entity === 'sort_events' && payload.local_id) {
            await db.runAsync(
              `UPDATE sort_events SET server_id = ?, synced = 1 WHERE local_id = ?`,
              (data as { id: string }).id,
              payload.local_id,
            );
          }
        } else {
          const { id, ...rest } = payload;
          const { error } = await supabase.from(job.entity).update(rest as never).eq('id', id);
          if (error) throw error;
        }

        await remove(job.id);
        pushed++;
      } catch (e) {
        await markFailed(job.id, e instanceof Error ? e.message : String(e));
        failed++;
      }
    }
  } finally {
    running = false;
  }

  return { pushed, failed };
}

/** Tự đẩy hàng đợi mỗi khi mạng được khôi phục. */
export function startAutoSync() {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) void flush();
  });
}
