import { View, Text, StyleSheet } from 'react-native';
import { toneColors, type StatusTone } from '../../theme/colors';

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

/** Pill trạng thái bo tròn màu — dùng cho trạng thái đồng bộ, công việc, thiết bị... */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const { fg, bg } = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
