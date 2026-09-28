import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../auth/store';
import type { AppNotification } from '../../shared/types/database';

export const NOTIFICATIONS_KEY = ['notifications'] as const;

/**
 * Thông báo của người đang đăng nhập (RLS lọc sẵn: quản lý thấy thêm nhật ký
 * tự động chung). Realtime do NotificationWatcher lo; ở đây chỉ đọc/đánh dấu.
 */
export function useNotifications() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.session?.user.id ?? null);

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, userId],
    enabled: !!userId,
    // Dự phòng khi kênh realtime bị ngắt (mạng chập chờn).
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AppNotification[];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() } as never)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const items = query.data ?? [];
  return {
    items,
    unread: items.filter((n) => !n.read_at).length,
    isLoading: query.isLoading,
    refetch: query.refetch,
    markAllRead,
  };
}
