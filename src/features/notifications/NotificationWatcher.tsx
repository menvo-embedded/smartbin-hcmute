import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/store';
import { useTableChanges } from '../../core/supabase/useTableChanges';
import { prepareLocalNotifications, showLocalNotification } from '../../core/notifications/localNotify';
import { NOTIFICATIONS_KEY, useNotifications } from './useNotifications';

/**
 * Dữ liệu mà một thông báo mới có thể làm thay đổi — tải lại để màn hình tự
 * cập nhật (việc mới được giao, thùng nhà mình được lên lịch, đã thu gom...).
 */
const RELATED_QUERIES = [
  ['collection_tasks'],
  ['collector_route_tasks'],
  ['household_devices'],
  ['collection_feedback'],
  ['household_next_pickup'],
  ['admin_tasks'],
  ['admin_devices'],
];

/** Thông báo cũ hơn mức này (vd. lúc mở lại app) thì không bật banner nữa. */
const FRESH_MS = 5 * 60_000;

/**
 * Gắn một lần ở gốc app khi đã đăng nhập: nghe bảng notifications qua
 * Realtime, bật thông báo hệ thống cho dòng mới và làm mới dữ liệu liên quan.
 */
export function NotificationWatcher() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  return userId ? <Watch key={userId} userId={userId} /> : null;
}

function Watch({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { items, isLoading } = useNotifications();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    prepareLocalNotifications();
  }, []);

  useTableChanges(`notifications-${userId}`, ['notifications'], () => {
    void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    for (const queryKey of RELATED_QUERIES) void qc.invalidateQueries({ queryKey });
  });

  useEffect(() => {
    if (isLoading) return;
    // Lần tải đầu: chỉ ghi nhớ, không bật lại banner cho thông báo cũ.
    if (seen.current === null) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    for (const n of [...items].reverse()) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.read_at && Date.now() - new Date(n.created_at).getTime() < FRESH_MS) {
        void showLocalNotification(n.title, n.body);
      }
    }
  }, [items, isLoading]);

  return null;
}
