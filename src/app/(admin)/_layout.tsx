import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminRealtime } from '../../features/admin/hooks/useAdminRealtime';
import { useAdminDevices, isDeviceFull } from '../../features/admin/hooks/useAdminDevices';
import { useAdminDispatch } from '../../features/admin/hooks/useAdminDispatch';
import { useNotifications } from '../../features/notifications/useNotifications';
import { colors } from '../../theme/colors';

const badge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

/**
 * Thanh tab dưới cho quản lý — cùng phong cách với hộ gia đình. Số trên tab:
 * thùng cần thu gom, việc chờ phân công, cảnh báo tự động chưa đọc.
 * Kênh realtime mở một lần ở đây cho mọi tab.
 */
export default function AdminLayout() {
  useAdminRealtime();
  const { data: devices } = useAdminDevices();
  const { tasks } = useAdminDispatch();
  const { items } = useNotifications();

  const fullCount = devices?.filter(isDeviceFull).length ?? 0;
  const pendingCount = tasks?.filter((t) => t.status === 'pending').length ?? 0;
  const unreadAuto = items.filter((n) => n.recipient_id === null && !n.read_at).length;

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Thùng rác',
          tabBarBadge: badge(fullCount),
          tabBarIcon: ({ color, size }) => <Ionicons name="trash-bin-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dispatch"
        options={{
          title: 'Điều phối',
          tabBarBadge: badge(pendingCount),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="automation"
        options={{
          title: 'Tự động',
          tabBarBadge: badge(unreadAuto),
          tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
