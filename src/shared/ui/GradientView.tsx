import { LinearGradient } from 'expo-linear-gradient';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface GradientViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Mặc định dùng gradient thương hiệu xanh lá → xanh ngọc. */
  gradientColors?: [string, string];
}

/** Khối nền gradient dùng chung cho header và nút chính, giữ đồng bộ màu thương hiệu. */
export function GradientView({ children, style, gradientColors }: GradientViewProps) {
  return (
    <LinearGradient
      colors={gradientColors ?? [colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
