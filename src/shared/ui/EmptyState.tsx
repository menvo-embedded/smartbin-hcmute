import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface EmptyStateProps {
  title: string;
  description?: string;
}

/** Trạng thái rỗng tử tế thay vì để danh sách trắng trơn. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutralBg,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
