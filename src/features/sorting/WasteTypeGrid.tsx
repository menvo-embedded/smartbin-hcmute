import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WASTE_TYPES, WASTE_LABELS, WASTE_ICONS, type WasteType } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { GradientView } from '../../shared/ui';

interface WasteTypeGridProps {
  onPick: (type: WasteType) => void;
  disabled?: boolean;
}

/** Lưới 2 cột chọn loại rác — tách dùng chung, tránh lặp lại giữa các luồng bỏ rác. */
export function WasteTypeGrid({ onPick, disabled }: WasteTypeGridProps) {
  return (
    <View style={styles.grid}>
      {WASTE_TYPES.map((type) => (
        <Pressable
          key={type}
          onPress={() => onPick(type)}
          disabled={disabled}
          style={[styles.wrapper, disabled && styles.disabled]}
        >
          <GradientView style={styles.button}>
            <Ionicons name={WASTE_ICONS[type] as never} size={20} color={colors.textOnPrimary} />
            <Text style={styles.buttonText} numberOfLines={2}>
              {WASTE_LABELS[type]}
            </Text>
          </GradientView>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  wrapper: {
    width: '48%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  buttonText: {
    flexShrink: 1,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
