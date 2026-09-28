import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { colors } from '../../theme/colors';

/**
 * Thanh tab dưới cho nhân viên thu gom — cùng phong cách với hộ gia đình.
 * Số trên tab Công việc = việc mình đang phụ trách chưa xong.
 * task-detail là màn con (mở từ danh sách / lộ trình) nên ẩn khỏi thanh tab.
 */
export default function CollectorLayout() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const { data: openCount } = useQuery({
    queryKey: ['collection_tasks', 'open_count', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('collection_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', userId!)
        .neq('status', 'done');
      if (error) throw error;
      return count ?? 0;
    },
  });

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
        name="tasks"
        options={{
          title: 'Công việc',
          tabBarBadge: openCount ? openCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Lộ trình',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="task-detail" options={{ href: null }} />
    </Tabs>
  );
}
