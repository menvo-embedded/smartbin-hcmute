import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

/** Thanh tiến trình đơn giản — dùng cho % đầy thùng rác, tiến độ điểm thưởng... */
export function ProgressBar({ value, color = colors.primary, trackColor = colors.neutralBg, height = 8 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: color, height, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});
