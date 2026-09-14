/** Nhóm rác dùng chung cho app và cho nhãn đầu ra của mô hình AI. */
export const WASTE_TYPES = ['plastic', 'paper', 'metal', 'other'] as const;
export type WasteType = (typeof WASTE_TYPES)[number];

export const WASTE_LABELS: Record<WasteType, string> = {
  plastic: 'Nhựa',
  paper: 'Giấy, bìa carton',
  metal: 'Kim loại',
  other: 'Khác',
};

/** Tên icon Ionicons (`name` prop của `<Ionicons>`) tương ứng từng loại rác. */
export const WASTE_ICONS: Record<WasteType, string> = {
  plastic: 'water-outline',
  paper: 'document-text-outline',
  metal: 'construct-outline',
  other: 'trash-outline',
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
