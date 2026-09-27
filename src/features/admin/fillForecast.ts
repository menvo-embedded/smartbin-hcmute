import { FILL_ALERT_THRESHOLD, type WasteType } from '../../shared/constants/waste';
import type { Bin } from '../../shared/types/database';

/** Mỗi lượt bỏ rác làm ngăn đầy thêm bấy nhiêu — khớp trigger fill_bin_on_sort. */
export const FILL_PER_SORT = 0.02;
/** Chỉ dùng lượt bỏ rác trong khoảng này để tính tốc độ. */
export const FORECAST_WINDOW_HOURS = 7 * 24;

export interface SortSample {
  device_id: string;
  waste_type: WasteType;
  created_at: string;
}

export type BinForecast =
  | { kind: 'full' }
  | { kind: 'no_data' }
  | { kind: 'eta'; hours: number; wasteType: WasteType };

/**
 * Dự báo khi nào thùng chạm ngưỡng thu gom (80%): lấy tốc độ bỏ rác trung bình
 * của từng ngăn trong 7 ngày qua × mức đầy mỗi lượt, rồi xem ngăn nào chạm
 * ngưỡng sớm nhất. Hồi quy tuyến tính đơn giản — đủ để admin lên lịch trước.
 */
export function forecastDevice(bins: Bin[], samples: SortSample[], now = Date.now()): BinForecast {
  if (bins.some((b) => b.fill_level >= FILL_ALERT_THRESHOLD)) return { kind: 'full' };

  const windowStart = now - FORECAST_WINDOW_HOURS * 3_600_000;
  const recent = samples.filter((s) => new Date(s.created_at).getTime() >= windowStart);
  if (recent.length === 0) return { kind: 'no_data' };

  // Khoảng quan sát thực tế: từ lượt cũ nhất trong cửa sổ tới giờ (tối thiểu 1 giờ).
  const oldest = Math.min(...recent.map((s) => new Date(s.created_at).getTime()));
  const observedHours = Math.max(1, (now - oldest) / 3_600_000);

  let best: BinForecast = { kind: 'no_data' };
  for (const bin of bins) {
    const count = recent.filter((s) => s.waste_type === bin.waste_type).length;
    if (count === 0) continue;
    const fillPerHour = (count / observedHours) * FILL_PER_SORT;
    const hours = (FILL_ALERT_THRESHOLD - bin.fill_level) / fillPerHour;
    if (best.kind !== 'eta' || hours < best.hours) {
      best = { kind: 'eta', hours, wasteType: bin.waste_type };
    }
  }
  return best;
}

/** "~5 giờ", "~2 ngày", "dưới 1 giờ". */
export function formatEta(hours: number) {
  if (hours < 1) return 'dưới 1 giờ';
  if (hours < 48) return `~${Math.round(hours)} giờ`;
  return `~${Math.round(hours / 24)} ngày`;
}
