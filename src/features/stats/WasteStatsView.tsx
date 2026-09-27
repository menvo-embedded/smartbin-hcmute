import { View, Text, useWindowDimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { Card, SectionTitle, GradientView } from '../../shared/ui';
import type { WasteStats } from './useWasteStats';

const CHART_SECTIONS = 3;
const CHART_EDGE = 18;
const Y_LABEL_WIDTH = 24;

interface WasteStatsViewProps {
  stats: WasteStats;
}

/**
 * Phần trình bày thống kê (tỷ lệ theo loại + xu hướng 7 ngày) — tách ra khỏi
 * màn hình để dùng chung được giữa các luồng (public, hộ gia đình).
 */
export function WasteStatsView({ stats }: WasteStatsViewProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 20 * 2 - 14 * 2 - Y_LABEL_WIDTH;
  const maxTypeCount = Math.max(1, ...stats.byType.map((t) => t.count));
  // Trục Y chia 3 khoảng bằng số nguyên (0, 1, 2, 3 / 0, 2, 4, 6...), không ra 0.4, 0.7.
  const maxDayCount = Math.max(...stats.last7Days.map((d) => d.count));
  const chartMax = Math.max(CHART_SECTIONS, Math.ceil(maxDayCount / CHART_SECTIONS) * CHART_SECTIONS);
  // Dàn đều 7 điểm trong khung, chừa lề hai đầu để nhãn ngày không bị cắt.
  const spacing = (chartWidth - CHART_EDGE * 2) / (stats.last7Days.length - 1);

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
            yAxisLabelWidth={Y_LABEL_WIDTH}
            formatYLabel={(label) => String(Math.round(Number(label)))}
            maxValue={chartMax}
            noOfSections={CHART_SECTIONS}
            height={160}
            spacing={spacing}
            initialSpacing={CHART_EDGE}
            endSpacing={CHART_EDGE}
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
