import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase/client';
import { getDb } from '../storage/db';
import { pending, remove, markFailed } from './queue';
/**
 * pending() - Lấy danh sách các thao tác đang chờ đồng bộ.
 * remove(id) - Xóa thao tác đã đồng bộ thành công.
 * markFailed(id, error) - Đánh dấu thao tác thất bại, ghi lại lỗi.
 */
export const MAX_ATTEMPTS = 5;
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

    const jobs = await pending(50, MAX_ATTEMPTS);
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
        // Lỗi của supabase-js là object thường ({ message, code... }), không
        // phải Error — lấy message ra, không thì chỉ ghi được "[object Object]".
        const message =
          e instanceof Error ? e.message
          : typeof e === 'object' && e !== null && 'message' in e ? String(e.message)
          : String(e);
        // Mất mạng giữa chừng: dừng, giữ nguyên hàng đợi, không tính là một
        // lần thất bại (nếu không, mạng chập chờn vài lần là thao tác bị bỏ).
        if (/network request failed|failed to fetch|network error/i.test(message)) break;
        await markFailed(job.id, message);
        failed++;
      }
    }
  } finally {
    running = false;
  }

  return { pushed, failed };
}

const RETRY_INTERVAL_MS = 15_000;

/**
 * Tự đẩy hàng đợi mỗi khi mạng được khôi phục, và thử lại định kỳ các thao
 * tác còn tồn (vd. lần trước server tạm lỗi). Trả về hàm huỷ.
 */
export function startAutoSync() {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) void flush();
  });
  const timer = setInterval(() => void flush(), RETRY_INTERVAL_MS);
  return () => {
    unsubscribe();
    clearInterval(timer);
  };
}
