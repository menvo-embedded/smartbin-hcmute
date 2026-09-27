import type { WasteType } from '../../shared/constants/waste';
import type { SortEventRow } from '../sorting/loadSortEvents';

/**
 * Hệ số ƯỚC TÍNH để quy đổi lượt bỏ rác ra tác động môi trường — đủ để
 * minh hoạ, không phải số đo thật (app không cân rác).
 * - Khối lượng trung bình một lượt bỏ rác gia đình theo loại.
 * - CO₂ tránh được trên mỗi kg so với chôn lấp: tái chế ~1,5 kg (nhựa/giấy/kim
 *   loại trung bình), ủ phân hữu cơ ~0,5 kg (giảm khí mê-tan); vô cơ vẫn chôn lấp.
 * - Một cây xanh trưởng thành hấp thụ ~21 kg CO₂ mỗi năm.
 */
export const KG_PER_SORT: Record<WasteType, number> = { huu_co: 0.5, vo_co: 0.3, tai_che: 0.2 };
export const CO2_SAVED_PER_KG: Record<WasteType, number> = { huu_co: 0.5, vo_co: 0, tai_che: 1.5 };
export const CO2_PER_TREE_YEAR = 21;

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  /** Tiến độ 0..1 tới khi đạt. */
  progress: number;
}

export interface Impact {
  totalKg: number;
  recycledKg: number;
  co2SavedKg: number;
  treesEquivalent: number;
  streakDays: number;
  badges: Badge[];
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Số ngày liên tiếp có bỏ rác, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa bỏ). */
function computeStreak(rows: SortEventRow[]) {
  const days = new Set(rows.map((r) => dayKey(new Date(r.created_at))));
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeImpact(rows: SortEventRow[]): Impact {
  const count: Record<WasteType, number> = { huu_co: 0, vo_co: 0, tai_che: 0 };
  for (const r of rows) count[r.waste_type]++;

  const kg = (t: WasteType) => count[t] * KG_PER_SORT[t];
  const totalKg = kg('huu_co') + kg('vo_co') + kg('tai_che');
  const co2SavedKg =
    kg('huu_co') * CO2_SAVED_PER_KG.huu_co + kg('tai_che') * CO2_SAVED_PER_KG.tai_che;
  const streakDays = computeStreak(rows);

  const goal = (value: number, target: number) => Math.min(1, value / target);
  const badges: Badge[] = [
    { id: 'first', title: 'Khởi đầu xanh', description: 'Lần đầu bỏ rác đúng cách', icon: 'leaf', progress: goal(rows.length, 1) },
    { id: 'streak7', title: 'Bền bỉ 7 ngày', description: 'Phân loại 7 ngày liên tiếp', icon: 'flame', progress: goal(streakDays, 7) },
    { id: 'recycle20', title: 'Nhà tái chế', description: '20 lượt rác tái chế', icon: 'sync', progress: goal(count.tai_che, 20) },
    { id: 'organic20', title: 'Người ủ phân', description: '20 lượt rác hữu cơ', icon: 'nutrition', progress: goal(count.huu_co, 20) },
    { id: 'tree', title: 'Trồng một cây', description: `Giảm ${CO2_PER_TREE_YEAR} kg CO₂`, icon: 'flower', progress: goal(co2SavedKg, CO2_PER_TREE_YEAR) },
    { id: 'hundred', title: 'Chiến binh xanh', description: '100 lượt bỏ rác', icon: 'shield-checkmark', progress: goal(rows.length, 100) },
  ].map((b) => ({ ...b, earned: b.progress >= 1 }));

  return {
    totalKg,
    recycledKg: kg('tai_che'),
    co2SavedKg,
    treesEquivalent: co2SavedKg / CO2_PER_TREE_YEAR,
    streakDays,
    badges,
  };
}
