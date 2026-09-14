import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
});
