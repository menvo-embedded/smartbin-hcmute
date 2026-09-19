import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { formatRelativeTime } from '../../core/utils/time';
import {
  getTaskDisplayStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
} from '../../features/collection/taskStatus';
import { MOCK_TASKS, type TaskWithDevice } from '../../features/collection/mockTasks';
import { colors } from '../../theme/colors';
import { Card, StatCard, StatusBadge, ScreenHeader, SectionTitle, EmptyState, GradientView } from '../../shared/ui';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chưa nhận' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'done', label: 'Hoàn tất' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function Tasks() {
  const signOut = useAuth((s) => s.signOut);
  const [filter, setFilter] = useState<FilterKey>('all');

  // QUAN TRỌNG: fallback về MOCK_TASKS được đưa vào TRONG queryFn, không còn
  // tính ở phần thân component nữa. Nhờ vậy cache của key ['collection_tasks']
  // thực sự CHỨA dữ liệu đang hiển thị — task-detail.tsx có thể patch thẳng
  // vào cache này (qc.setQueryData) và tasks.tsx sẽ thấy thay đổi ngay khi
  // quay lại, kể cả khi Supabase chưa có dữ liệu thật.
  const {
    data: tasks,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['collection_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*, devices(name, area)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data as unknown as TaskWithDevice[];
      return rows.length > 0 ? rows : MOCK_TASKS;
    },
  });

  const pendingCount = tasks?.filter((t) => t.status === 'pending').length ?? 0;
  const inProgressCount = tasks?.filter((t) => t.status === 'in_progress').length ?? 0;
  const doneCount = tasks?.filter((t) => t.status === 'done').length ?? 0;

  const filteredTasks = useMemo(() => {
    if (!tasks) return tasks;
    if (filter === 'all') return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Công việc thu gom"
        subtitle={`${tasks?.length ?? 0} việc trong hệ thống`}
        actionLabel="Đăng xuất"
        onAction={async () => {
          await signOut();
          router.replace('/');
        }}
      />

      <View style={styles.body}>
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
          }
          ListHeaderComponent={
            <View style={{ marginTop: 16, marginBottom: 16 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                  { label: 'Chưa nhận', value: String(pendingCount) },
                  { label: 'Đang xử lý', value: String(inProgressCount) },
                  { label: 'Hoàn tất', value: String(doneCount) },
                ]}
                keyExtractor={(s) => s.label}
                renderItem={({ item }) => <StatCard label={item.label} value={item.value} />}
              />

              <View style={{ height: 16 }} />
              <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  if (active) {
                    return (
                      <Pressable key={f.key} onPress={() => setFilter(f.key)}>
                        <GradientView style={styles.filterChip}>
                          <Text style={styles.filterChipTextActive}>{f.label}</Text>
                        </GradientView>
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setFilter(f.key)}
                      style={[styles.filterChip, styles.filterChipInactive]}
                    >
                      <Text style={styles.filterChipText}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: 16 }} />
              <SectionTitle>Danh sách việc</SectionTitle>
              {isLoading && <ActivityIndicator />}
            </View>
          }
          ListEmptyComponent={!isLoading ? <EmptyState title="Không có việc nào phù hợp" /> : null}
          renderItem={({ item }) => {
            const displayStatus = getTaskDisplayStatus(item);
            return (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/(collector)/task-detail', params: { id: item.id } })
                }
              >
                <Card>
                  <View style={styles.row}>
                    <View style={styles.taskTitleRow}>
                      <View style={styles.taskIcon}>
                        <Ionicons name="trash-bin-outline" size={16} color={colors.primaryDark} />
                      </View>
                      <Text style={styles.taskTitle}>{item.devices?.name ?? 'Thùng rác'}</Text>
                    </View>
                    <StatusBadge
                      label={TASK_STATUS_LABEL[displayStatus]}
                      tone={TASK_STATUS_TONE[displayStatus]}
                    />
                  </View>
                  {item.devices?.area && <Text style={styles.taskMeta}>{item.devices.area}</Text>}
                  <Text style={styles.taskMeta}>{formatRelativeTime(item.created_at)}</Text>
                </Card>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  taskIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  taskMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterChipInactive: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
});