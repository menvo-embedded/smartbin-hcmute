import { View, Text, Pressable, ScrollView, ActivityIndicator, Share, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWasteStats } from '../../features/stats/useWasteStats';
import { WasteStatsView } from '../../features/stats/WasteStatsView';
import { colors } from '../../theme/colors';
import { StatCard, GradientView, EmptyState } from '../../shared/ui';

export default function HouseholdStats() {
  const { stats, loading, error } = useWasteStats();

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
      title: 'Báo cáo phân loại rác - SmartBin (hộ gia đình)',
      message: lines.join('\n'),
    });
  }

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Thống kê nhà bạn</Text>
      </GradientView>

      {loading && <ActivityIndicator style={{ marginTop: 40 }} />}

      {!loading && error && (
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <EmptyState title="Không tải được thống kê" description={error} />
        </View>
      )}

      {!loading && !error && stats && (
        <ScrollView style={styles.body} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <StatCard label="Tổng lượt bỏ rác" value={String(stats.total)} />
          </ScrollView>

          <WasteStatsView stats={stats} />

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
