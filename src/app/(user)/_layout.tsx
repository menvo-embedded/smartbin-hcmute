import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../features/auth/store';
import { colors } from '../../theme/colors';

/**
 * Thanh tab dưới cùng cho luồng cộng đồng — đồng bộ phong cách (cùng icon,
 * cùng màu) với thanh tab của (household).
 *
 * idle/kiosk-setup/thanks là màn hình flow kiosk công khai (không phải màn
 * điều hướng hàng ngày của người dùng đã đăng nhập) nên ẩn khỏi tab bar
 * bằng `href: null` — vẫn điều hướng tới được bằng router.push bình
 * thường, chỉ không hiện nút tab riêng.
 *
 * Kiosk cộng đồng (chưa đăng nhập) ẩn hẳn thanh tab: người qua đường chỉ
 * cần màn chờ → bỏ rác → cảm ơn, không có hồ sơ/thống kê cá nhân.
 */
export default function UserLayout() {
  const isKiosk = useAuth((s) => !s.session);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isKiosk ? { display: 'none' } : undefined,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="sort"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen name="idle" options={{ href: null }} />
      <Tabs.Screen name="kiosk-setup" options={{ href: null }} />
      <Tabs.Screen name="thanks" options={{ href: null }} />
    </Tabs>
  );
}
