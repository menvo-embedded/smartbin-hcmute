import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { GradientView } from '../../../shared/ui';

interface Props<K extends string> {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

/** Hàng nút lọc dạng viên thuốc — nút đang chọn tô gradient. */
export function FilterChips<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={styles.row}>
      {options.map((f) =>
        f.key === value ? (
          <Pressable key={f.key} onPress={() => onChange(f.key)}>
            <GradientView style={styles.chip}>
              <Text style={styles.activeText}>{f.label}</Text>
            </GradientView>
          </Pressable>
        ) : (
          <Pressable key={f.key} style={[styles.chip, styles.inactive]} onPress={() => onChange(f.key)}>
            <Text style={styles.inactiveText}>{f.label}</Text>
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 },
  inactive: { backgroundColor: colors.neutralBg, borderWidth: 1, borderColor: colors.border },
  activeText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 13 },
  inactiveText: { color: colors.textMuted, fontWeight: '500', fontSize: 13 },
});
