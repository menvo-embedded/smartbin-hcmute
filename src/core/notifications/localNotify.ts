import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Hiện thông báo hệ thống (banner + rung) ngay trên máy. Không cần máy chủ
 * push: dữ liệu đến qua Supabase Realtime, app tự bật thông báo cục bộ.
 * Lỗi (chưa cấp quyền, máy không hỗ trợ) thì bỏ qua — thông báo trong app vẫn có.
 */
const CHANNEL_ID = 'smartbin-alerts';
let ready: Promise<boolean> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function prepare(): Promise<boolean> {
  ready ??= (async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Cảnh báo SmartBin',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    } catch {
      return false;
    }
  })();
  return ready;
}

/** Xin quyền sớm (lúc đăng nhập) để thông báo đầu tiên không bị lỡ. */
export function prepareLocalNotifications() {
  void prepare();
}

export async function showLocalNotification(title: string, body: string) {
  if (!(await prepare())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    // Bỏ qua: thông báo trong app vẫn hiển thị.
  }
}
