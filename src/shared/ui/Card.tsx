import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

/** Khối nền trắng bo góc dùng chung cho mọi màn hình. */
export function Card({ style, ...rest }: CardProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
});
