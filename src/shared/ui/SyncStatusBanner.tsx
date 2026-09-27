import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSyncStatus } from '../../core/sync/useSyncStatus';
import { colors } from '../../theme/colors';

/**
 * Thanh nhỏ nổi trên cùng màn hình: báo đang offline và/hoặc còn bao nhiêu
 * thao tác chờ đồng bộ. Ẩn khi có mạng và hàng đợi trống.
 */
export function SyncStatusBanner() {
  const { isOnline, pending } = useSyncStatus();
  const insets = useSafeAreaInsets();

  if (isOnline && pending === 0) return null;

  const text = !isOnline
    ? pending > 0
      ? `Đang offline — ${pending} thao tác chờ đồng bộ`
      : 'Đang offline — dữ liệu vẫn được lưu trên máy'
    : `Đang đồng bộ ${pending} thao tác...`;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <View style={[styles.pill, !isOnline && styles.pillOffline]}>
        <Ionicons
          name={isOnline ? 'sync' : 'cloud-offline'}
          size={14}
          color={colors.textOnPrimary}
        />
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
    elevation: 4,
  },
  pillOffline: {
    backgroundColor: '#374151',
  },
  text: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
