import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { GradientView } from './GradientView';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Header cong bo góc dưới, nền gradient thương hiệu — dùng đầu mỗi màn hình chính. */
export function ScreenHeader({ title, subtitle, actionLabel, onAction }: ScreenHeaderProps) {
  return (
    <GradientView style={styles.container}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {actionLabel && (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </GradientView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.textOnPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.primaryLight,
    fontSize: 13,
    marginTop: 2,
  },
  action: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
