import type { WasteType } from '../../shared/constants/waste';

export interface GuideItem {
  name: string;
  type: WasteType;
  /** Lưu ý thêm khi bỏ (rửa sạch, tách nắp...). */
  tip?: string;
}

/**
 * Danh mục tra cứu theo hướng dẫn phân loại rác tại nguồn 3 nhóm (hữu cơ /
 * vô cơ / tái chế). Chạy hoàn toàn offline.
 */
export const WASTE_GUIDE: GuideItem[] = [
  // Hữu cơ
  { name: 'Vỏ chuối', type: 'huu_co' },
  { name: 'Vỏ trái cây', type: 'huu_co' },
  { name: 'Rau củ thừa', type: 'huu_co' },
  { name: 'Cơm thừa', type: 'huu_co' },
  { name: 'Thức ăn thừa', type: 'huu_co', tip: 'Chắt bớt nước trước khi bỏ' },
  { name: 'Xương cá, xương gà', type: 'huu_co' },
  { name: 'Vỏ trứng', type: 'huu_co' },
  { name: 'Bã cà phê', type: 'huu_co' },
  { name: 'Bã trà, túi lọc trà', type: 'huu_co' },
  { name: 'Lá cây, cỏ', type: 'huu_co' },
  { name: 'Hoa tàn', type: 'huu_co' },
  { name: 'Hạt, vỏ hạt', type: 'huu_co' },
  { name: 'Bánh mì cũ', type: 'huu_co' },
  { name: 'Mì, bún thừa', type: 'huu_co' },
  // Tái chế
  { name: 'Chai nhựa', type: 'tai_che', tip: 'Đổ hết nước, bóp dẹp' },
  { name: 'Lon nước ngọt', type: 'tai_che', tip: 'Tráng sơ, bóp dẹp' },
  { name: 'Lon bia', type: 'tai_che' },
  { name: 'Giấy báo', type: 'tai_che' },
  { name: 'Giấy vở, giấy in', type: 'tai_che' },
  { name: 'Thùng carton', type: 'tai_che', tip: 'Gấp dẹp, bỏ băng keo' },
  { name: 'Hộp giấy', type: 'tai_che' },
  { name: 'Hộp sữa giấy', type: 'tai_che', tip: 'Tráng sạch, gấp dẹp' },
  { name: 'Chai thuỷ tinh', type: 'tai_che', tip: 'Không làm vỡ' },
  { name: 'Lọ thuỷ tinh', type: 'tai_che' },
  { name: 'Hộp nhựa đựng thức ăn', type: 'tai_che', tip: 'Rửa sạch thức ăn bám' },
  { name: 'Can nhựa', type: 'tai_che' },
  { name: 'Đồ kim loại, sắt vụn', type: 'tai_che' },
  { name: 'Nồi, chảo hỏng', type: 'tai_che' },
  { name: 'Sách cũ', type: 'tai_che' },
  { name: 'Túi giấy', type: 'tai_che' },
  // Vô cơ (rác còn lại)
  { name: 'Túi nilon bẩn', type: 'vo_co' },
  { name: 'Hộp xốp', type: 'vo_co' },
  { name: 'Ly nhựa dùng một lần', type: 'vo_co', tip: 'Ly dính trà sữa khó tái chế' },
  { name: 'Ống hút', type: 'vo_co' },
  { name: 'Khăn giấy đã dùng', type: 'vo_co' },
  { name: 'Giấy vệ sinh', type: 'vo_co' },
  { name: 'Tã, băng vệ sinh', type: 'vo_co' },
  { name: 'Sành sứ, gốm vỡ', type: 'vo_co', tip: 'Gói kỹ để tránh đứt tay' },
  { name: 'Kính vỡ', type: 'vo_co', tip: 'Gói kỹ để tránh đứt tay' },
  { name: 'Vỏ bánh kẹo', type: 'vo_co' },
  { name: 'Gói mì tôm', type: 'vo_co' },
  { name: 'Đầu lọc thuốc lá', type: 'vo_co' },
  { name: 'Bàn chải đánh răng', type: 'vo_co' },
  { name: 'Khẩu trang', type: 'vo_co' },
  { name: 'Giấy bạc bẩn', type: 'vo_co' },
  { name: 'Hộp pizza dính dầu', type: 'vo_co' },
  { name: 'Cát, đất, gạch vụn', type: 'vo_co' },
];

/**
 * Rác nguy hại KHÔNG bỏ vào 3 ngăn — cần mang tới điểm thu gom riêng.
 * Hiện thành cảnh báo thay vì gợi ý một ngăn.
 */
export const HAZARDOUS: { name: string; tip: string }[] = [
  { name: 'Pin', tip: 'Mang tới điểm thu gom pin cũ' },
  { name: 'Bóng đèn', tip: 'Chứa thuỷ ngân — gói kỹ, mang tới điểm thu gom riêng' },
  { name: 'Thuốc hết hạn', tip: 'Mang tới nhà thuốc có nhận thu hồi' },
  { name: 'Điện thoại, đồ điện tử', tip: 'Rác điện tử — mang tới điểm thu gom chuyên dụng' },
  { name: 'Bình xịt côn trùng', tip: 'Rác nguy hại — không bỏ chung' },
];

/** Bỏ dấu, chữ thường — để gõ "vo chuoi" vẫn ra "Vỏ chuối". */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export type GuideResult =
  | { kind: 'item'; item: GuideItem }
  | { kind: 'hazard'; name: string; tip: string };

/** Tìm theo từng từ khoá: mọi từ gõ vào đều phải xuất hiện trong tên. */
export function searchGuide(query: string, limit = 6): GuideResult[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const match = (name: string) => {
    const n = normalize(name);
    return words.every((w) => n.includes(w));
  };
  return [
    ...HAZARDOUS.filter((h) => match(h.name)).map((h) => ({ kind: 'hazard' as const, ...h })),
    ...WASTE_GUIDE.filter((i) => match(i.name)).map((item) => ({ kind: 'item' as const, item })),
  ].slice(0, limit);
}
