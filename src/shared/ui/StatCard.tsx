import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

/** Thẻ số liệu nhỏ, dùng trong dải cuộn ngang ở đầu dashboard. */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    width: 150,
    marginRight: 10,
    gap: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
  },
  value: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
