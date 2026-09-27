import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { ProgressBar } from '../../shared/ui';
import type { Badge } from './impact';

/** Lưới huy hiệu: đã đạt thì sáng màu, chưa đạt thì mờ kèm thanh tiến độ. */
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.summary}>
        Đã đạt {earned}/{badges.length} huy hiệu
      </Text>
      <View style={styles.grid}>
        {badges.map((b) => (
          <View key={b.id} style={[styles.badge, !b.earned && styles.badgeLocked]}>
            <View style={[styles.iconWrap, b.earned && styles.iconWrapEarned]}>
              <Ionicons
                name={b.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={b.earned ? colors.textOnPrimary : colors.textMuted}
              />
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {b.title}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {b.description}
            </Text>
            {!b.earned && (
              <View style={{ alignSelf: 'stretch' }}>
                <ProgressBar value={b.progress} height={4} />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    fontSize: 13,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    width: '31%',
    alignItems: 'center',
    gap: 4,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeLocked: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconWrapEarned: {
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
