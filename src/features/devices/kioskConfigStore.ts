import { create } from 'zustand';

interface KioskConfigState {
  binId: string | null;
  setBinId: (binId: string) => void;
  clearBinId: () => void;
}

/**
 * Cấu hình kiosk hiện tại (mã thùng rác được gán cho thiết bị này).
 * Lưu trong bộ nhớ ứng dụng, tồn tại trong suốt phiên chạy của kiosk.
 * Nếu sau này cần giữ giá trị qua các lần khởi động lại app, có thể
 * bọc thêm `persist` middleware của zustand (cần AsyncStorage) —
 * để sau khi team lead xác nhận vị trí chính thức của kiosk mode
 * trong kiến trúc, vì hiện tại nó vẫn đang tạm đặt cạnh sort.tsx.
 */
export const useKioskConfig = create<KioskConfigState>((set) => ({
  binId: null,
  setBinId: (binId) => set({ binId }),
  clearBinId: () => set({ binId: null }),
}));