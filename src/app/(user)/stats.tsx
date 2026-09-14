import { View, Text, Pressable, ScrollView, ActivityIndicator, Share, useWindowDimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useAuth } from '../../features/auth/store';
import { useWasteStats } from '../../features/stats/useWasteStats';
import { colors } from '../../theme/colors';
import { Card, StatCard, SectionTitle, GradientView } from '../../shared/ui';

export default function Stats() {
  const profile = useAuth((s) => s.profile);
  const { stats, loading } = useWasteStats();
  const { width } = useWindowDimensions();
  const chartWidth = width - 20 * 2 - 14 * 2 - 24;

  async function onExport() {
    if (!stats) return;
    const lines = [
      'Loại rác,Số lượt',
      ...stats.byType.map((t) => `${t.label},${t.count}`),
      '',
      'Ngày,Số lượt',
      ...stats.last7Days.map((d) => `${d.label},${d.count}`),
    ];
    await Share.share({
      title: 'Báo cáo phân loại rác - SmartBin',
      message: lines.join('\n'),
    });
  }

  const maxTypeCount = stats ? Math.max(1, ...stats.byType.map((t) => t.count)) : 1;

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Thống kê phân loại rác</Text>
      </GradientView>

      {loading || !stats ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <StatCard label="Tổng lượt bỏ rác" value={String(stats.total)} />
            <StatCard label="Điểm thưởng" value={String(profile?.points ?? 0)} />
          </ScrollView>

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
                    <GradientView
                      style={[styles.barFill, { width: `${(t.count / maxTypeCount) * 100}%` }]}
                    />
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

          <Pressable onPress={onExport}>
            <GradientView style={styles.exportButton}>
              <Ionicons name="download-outline" size={18} color={colors.textOnPrimary} />
              <Text style={styles.exportButtonText}>Xuất báo cáo</Text>
            </GradientView>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 6,
    marginBottom: 8,
  },
  backText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  exportButton: {
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  exportButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});
