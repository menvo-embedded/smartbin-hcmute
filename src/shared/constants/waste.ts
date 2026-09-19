/**
 * Nhóm rác dùng chung cho app và cho nhãn đầu ra của mô hình AI.
 * Theo đúng cách phân loại rác tại nguồn phổ biến ở Việt Nam: hữu cơ / vô cơ /
 * tái chế — thay cho cách chia theo vật liệu kỹ thuật (nhựa/giấy/kim loại/thuỷ
 * tinh) trước đó, vì nhóm vật liệu tái chế (nhựa, kim loại, thuỷ tinh) hay bị
 * mô hình AI nhầm lẫn qua lại (bề mặt bóng/trong suốt tương tự nhau), trong khi
 * việc phân biệt tái chế/không tái chế thì dễ và chính xác hơn hẳn.
 */
export const WASTE_TYPES = ['huu_co', 'vo_co', 'tai_che'] as const;
export type WasteType = (typeof WASTE_TYPES)[number];

export const WASTE_LABELS: Record<WasteType, string> = {
  huu_co: 'Hữu cơ',
  vo_co: 'Vô cơ',
  tai_che: 'Tái chế',
};

/** Tên icon Ionicons (`name` prop của `<Ionicons>`) tương ứng từng loại rác. */
export const WASTE_ICONS: Record<WasteType, string> = {
  huu_co: 'leaf-outline',
  vo_co: 'trash-outline',
  tai_che: 'sync-outline',
};

/** Dưới ngưỡng này thì để người dùng tự chọn thay vì phân loại cưỡng bức. */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Ngăn vượt mức này sẽ sinh công việc thu gom. */
export const FILL_ALERT_THRESHOLD = 0.8;

export const ROLES = ['user', 'collector', 'admin', 'household'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Người dùng',
  collector: 'Nhân viên thu gom',
  admin: 'Quản trị viên',
  household: 'Hộ gia đình',
};
