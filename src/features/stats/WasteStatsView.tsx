import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { Card, SectionTitle, GradientView } from '../../shared/ui';
import type { WasteStats } from './useWasteStats';

interface WasteStatsViewProps {
  stats: WasteStats;
}

/**
 * Phần trình bày thống kê (tỷ lệ theo loại + xu hướng 7 ngày) — tách ra khỏi
 * màn hình để dùng chung được giữa các luồng (public, hộ gia đình).
 */
export function WasteStatsView({ stats }: WasteStatsViewProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 20 * 2 - 14 * 2 - 24;
  const maxTypeCount = Math.max(1, ...stats.byType.map((t) => t.count));

  return (
    <View style={{ gap: 20 }}>
      <View>
        <SectionTitle>Tỷ lệ các loại rác</SectionTitle>
        <Card style={{ gap: 16 }}>
          {stats.byType.map((t) => (
            <View key={t.type} style={{ gap: 6 }}>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>{t.label}</Text>
                <Text style={styles.barValue}>{t.count}</Text>
              </View>
              <View style={styles.barTrack}>
                <GradientView style={[styles.barFill, { width: `${(t.count / maxTypeCount) * 100}%` }]} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionTitle>Xu hướng 7 ngày qua</SectionTitle>
        <Card>
          <LineChart
            data={stats.last7Days.map((d) => ({ value: d.count, label: d.label }))}
            width={chartWidth}
            areaChart
            curved
            color={colors.primary}
            startFillColor={colors.primary}
            endFillColor={colors.background}
            startOpacity={0.4}
            endOpacity={0.05}
            thickness={2.5}
            dataPointsColor={colors.primary}
            yAxisThickness={0}
            xAxisThickness={0}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 11 }}
            noOfSections={3}
            height={160}
            initialSpacing={8}
            endSpacing={8}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  barValue: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutralBg,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
});
