import { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';

const HIGHLIGHT_MS = 4_000;

/** "● Trực tiếp", kèm dòng "Vừa cập nhật: ..." sáng lên vài giây khi có thay đổi. */
export function LiveIndicator({ lastUpdate }: { lastUpdate: { label: string; at: number } | null }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!lastUpdate) return;
    setHighlight(lastUpdate.label);
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [lastUpdate]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.live}>Trực tiếp</Text>
      {highlight && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Vừa cập nhật: {highlight}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  live: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  badge: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});
