import { useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useSortHistory } from '../../features/sorting/useSortHistory';
import { WASTE_TYPES, WASTE_LABELS, type WasteType } from '../../shared/constants/waste';
import { formatRelativeTime } from '../../core/utils/time';
import { colors } from '../../theme/colors';
import { Card, StatusBadge, EmptyState, GradientView } from '../../shared/ui';

type FilterOption = WasteType | 'all';

export default function HouseholdHistory() {
  const [filter, setFilter] = useState<FilterOption>('all');
  const { rows, loading, error, reload } = useSortHistory(filter === 'all' ? null : filter);

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Text style={styles.title}>Lịch sử bỏ rác</Text>
      </GradientView>

      <View style={styles.filterRow}>
        <FilterChip label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
        {WASTE_TYPES.map((type) => (
          <FilterChip
            key={type}
            label={WASTE_LABELS[type]}
            active={filter === type}
            onPress={() => setFilter(type)}
          />
        ))}
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} />}

      {!loading && error && (
        <View style={styles.body}>
          <EmptyState title="Không tải được lịch sử" description={error} />
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.local_id}
          contentContainerStyle={styles.body}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onRefresh={reload}
          refreshing={false}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View>
                <Text style={styles.rowLabel}>{WASTE_LABELS[item.waste_type]}</Text>
                <Text style={styles.rowTime}>{formatRelativeTime(item.created_at)}</Text>
              </View>
              <StatusBadge
                label={item.synced ? 'Đã đồng bộ' : 'Đang chờ'}
                tone={item.synced ? 'success' : 'warning'}
              />
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              title="Chưa có lần bỏ rác nào"
              description={filter === 'all' ? undefined : `Chưa có lần nào thuộc loại "${WASTE_LABELS[filter as WasteType]}"`}
            />
          }
        />
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  if (active) {
    return (
      <Pressable onPress={onPress}>
        <GradientView style={styles.chip}>
          <Text style={styles.chipTextActive}>{label}</Text>
        </GradientView>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={[styles.chip, styles.chipInactive]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipInactive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  rowTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
