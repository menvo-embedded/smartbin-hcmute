import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toneColors, type StatusTone } from '../../theme/colors';

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Pill trạng thái bo tròn màu — dùng cho trạng thái đồng bộ, công việc, thiết bị... */
export function StatusBadge({ label, tone, icon }: StatusBadgeProps) {
  const { fg, bg } = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={13} color={fg} />}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
