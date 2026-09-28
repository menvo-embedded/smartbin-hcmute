import { useState } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../../core/utils/time';
import { colors } from '../../theme/colors';
import { EmptyState } from '../../shared/ui';
import { useNotifications } from './useNotifications';
import type { AppNotification } from '../../shared/types/database';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Biểu tượng + màu theo loại thông báo (kind do trigger trên server đặt). */
const KIND_STYLE: Record<string, { icon: IoniconName; color: string }> = {
  task_assigned: { icon: 'clipboard', color: colors.primary },
  task_urgent: { icon: 'alert-circle', color: colors.danger },
  task_reminder: { icon: 'alarm', color: colors.warning },
  task_escalated: { icon: 'alarm', color: colors.warning },
  task_done: { icon: 'checkmark-circle', color: colors.success },
  auto_task: { icon: 'hardware-chip', color: '#0d9488' },
  bin_full: { icon: 'warning', color: colors.danger },
  pickup_scheduled: { icon: 'car', color: colors.primary },
  pickup_done: { icon: 'checkmark-done-circle', color: colors.success },
  sorting_good: { icon: 'trophy', color: colors.success },
  sorting_mixed: { icon: 'refresh-circle', color: colors.warning },
  device_offline: { icon: 'cloud-offline', color: colors.danger },
  device_online: { icon: 'wifi', color: colors.success },
};

export function kindStyle(kind: string) {
  return KIND_STYLE[kind] ?? { icon: 'notifications' as IoniconName, color: colors.primary };
}

export function NotificationRow({ item }: { item: AppNotification }) {
  const k = kindStyle(item.kind);
  return (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: k.color + '1A' }]}>
        <Ionicons name={k.icon} size={18} color={k.color} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {!!item.body && <Text style={styles.itemBody}>{item.body}</Text>}
        <Text style={styles.itemTime}>{formatRelativeTime(item.created_at)}</Text>
      </View>
      {!item.read_at && <View style={styles.unreadDot} />}
    </View>
  );
}

/** Chuông thông báo trên header (nền gradient): số chưa đọc + danh sách. */
export function NotificationBell() {
  const { items, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
    if (unread > 0) markAllRead.mutate();
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} style={styles.bell}>
        <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={24} color={colors.textOnPrimary} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Thông báo</Text>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <FlatList
            style={styles.list}
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
            renderItem={({ item }) => <NotificationRow item={item} />}
            ListEmptyComponent={
              <EmptyState title="Chưa có thông báo" description="Hệ thống sẽ tự báo khi có việc mới hoặc thùng sắp đầy." />
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { padding: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.textOnPrimary,
  },
  badgeText: { color: colors.textOnPrimary, fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  item: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { width: '100%' },
  itemText: { flex: 1, flexShrink: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemBody: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  itemTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginTop: 6 },
});
