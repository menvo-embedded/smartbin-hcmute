import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { GradientView } from '../../shared/ui';
import type { Impact } from './impact';

function fmt(n: number) {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

/** Thẻ "tác động môi trường": kg rác đã phân loại, CO₂ giảm, quy ra cây xanh. */
export function ImpactCard({ impact }: { impact: Impact }) {
  return (
    <GradientView style={styles.card}>
      <Ionicons name="earth" size={96} color="rgba(255,255,255,0.12)" style={styles.watermark} />
      <Text style={styles.label}>Tác động môi trường của bạn</Text>
      <View style={styles.row}>
        <Metric value={`${fmt(impact.totalKg)} kg`} caption="rác đã phân loại" />
        <Metric value={`${fmt(impact.co2SavedKg)} kg`} caption="CO₂ giảm được" />
        <Metric value={fmt(impact.treesEquivalent)} caption="cây xanh / năm" />
      </View>
      <Text style={styles.note}>Số liệu ước tính theo khối lượng trung bình mỗi lượt bỏ rác.</Text>
    </GradientView>
  );
}

function Metric({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  label: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
  },
  value: {
    color: colors.textOnPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  caption: {
    color: colors.primaryLight,
    fontSize: 12,
  },
  note: {
    color: colors.primaryLight,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
