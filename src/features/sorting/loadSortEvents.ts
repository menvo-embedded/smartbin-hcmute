import { supabase } from '../../core/supabase/client';
import { getDb } from '../../core/storage/db';
import type { WasteType } from '../../shared/constants/waste';

export interface SortEventRow {
  local_id: string;
  waste_type: WasteType;
  synced: number;
  created_at: string;
}

interface ServerSortRow {
  id: string;
  local_id: string | null;
  waste_type: WasteType;
  created_at: string;
}

const SERVER_LIMIT = 500;
/** Mất mạng thì fetch có thể treo lâu — quá hạn này thì dùng dữ liệu nhớ sẵn. */
const SERVER_TIMEOUT_MS = 4_000;

/**
 * Bản sao dữ liệu server lần tải thành công gần nhất (theo người dùng). Mất
 * mạng thì dùng lại bản này thay vì chỉ còn các lượt trong máy — nếu không,
 * thống kê/chuỗi ngày tụt hẳn xuống mỗi khi offline.
 */
const lastServerRows = new Map<string, SortEventRow[]>();

/**
 * Lịch sử bỏ rác của một người (userId = null: kiosk cộng đồng, sự kiện ẩn
 * danh), gộp từ 2 nguồn:
 *  - Supabase: mọi lượt đã đồng bộ, kể cả lượt bỏ trên máy khác — nhờ vậy
 *    số liệu khớp với điểm thưởng (điểm do server đếm).
 *  - SQLite: các lượt trên máy này chưa lên server (đang chờ đồng bộ).
 * Không có mạng thì dùng bản server lần trước + dữ liệu trong máy. Kết quả xếp mới nhất trước.
 */
export async function loadSortEvents(userId: string | null): Promise<SortEventRow[]> {
  const db = await getDb();
  const localRows = await db.getAllAsync<SortEventRow>(
    `SELECT local_id, waste_type, synced, created_at FROM sort_events WHERE user_id IS ?`,
    userId,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
  let query = supabase
    .from('sort_events')
    .select('id, local_id, waste_type, created_at')
    .order('created_at', { ascending: false })
    .limit(SERVER_LIMIT)
    .abortSignal(controller.signal);
  query = userId ? query.eq('user_id', userId) : query.is('user_id', null);
  const { data, error } = await query.then(
    (res) => res,
    () => ({ data: null, error: new Error('timeout') }),
  );
  clearTimeout(timer);

  const cacheKey = userId ?? 'kiosk';
  let merged: SortEventRow[];
  if (error || !data) {
    merged = [...(lastServerRows.get(cacheKey) ?? [])];
  } else {
    merged = (data as unknown as ServerSortRow[]).map((r) => ({
      // Sự kiện cũ tạo thẳng trên server có thể không có local_id.
      local_id: r.local_id ?? r.id,
      waste_type: r.waste_type,
      synced: 1,
      created_at: r.created_at,
    }));
    lastServerRows.set(cacheKey, merged);
    merged = [...merged];
  }
  // Có dữ liệu server thì server là nguồn đúng cho các lượt đã đồng bộ (lượt
  // đã bị xoá trên server không được hiện lại) — chỉ thêm lượt đang chờ đồng bộ.
  // Chưa từng tải được từ server (mở app lần đầu khi offline) thì dùng hết dữ liệu trong máy.
  const haveServerData = !(error || !data) || lastServerRows.has(cacheKey);
  const onServer = new Set(merged.map((r) => r.local_id));
  for (const row of localRows) {
    if (onServer.has(row.local_id)) continue;
    if (haveServerData && row.synced) continue;
    merged.push(row);
  }
  return merged.sort(byNewest);
}

function byNewest(a: SortEventRow, b: SortEventRow) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
