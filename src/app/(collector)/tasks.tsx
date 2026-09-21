import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { formatRelativeTime } from '../../core/utils/time';
import {
  getTaskDisplayStatus,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
} from '../../features/collection/taskStatus';
import { localTasksStore } from '../../features/collection/localTasksStore';
import { MOCK_TASKS, type TaskWithDevice } from '../../features/collection/mockTasks';
import { SHIFT_SHORT_LABELS } from '../../features/admin/types';
import { colors } from '../../theme/colors';
import { Card, StatCard, StatusBadge, ScreenHeader, SectionTitle, EmptyState, GradientView, ProgressBar } from '../../shared/ui';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'today', label: '📅 Hôm nay' },
  { key: 'pending', label: 'Chưa nhận' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'done', label: 'Hoàn tất' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function Tasks() {
  const signOut = useAuth((s) => s.signOut);
  const userId = useAuth((s) => s.session?.user.id);
  const [filter, setFilter] = useState<FilterKey>('all');

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const { data: tasks, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['collection_tasks'],
    queryFn: async () => {
      let serverTasks: TaskWithDevice[] = [];
      try {
        const { data, error } = await supabase
          .from('collection_tasks')
          .select('*, devices(name, area)')
          .order('created_at', { ascending: false });
        if (!error && data) {
          serverTasks = data as unknown as TaskWithDevice[];
        }
      } catch {
        // Fallback
      }

      // Hợp nhất server tasks và localTasksStore (chứa các việc Admin điều phối)
      const combined = [...localTasksStore];
      for (const st of serverTasks) {
        if (!combined.some((ct) => ct.id === st.id)) {
          combined.push(st);
        }
      }

      return combined.length > 0 ? combined : MOCK_TASKS;
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const pendingCount = tasks?.filter((t) => t.status === 'pending').length ?? 0;
  const inProgressCount = tasks?.filter((t) => t.status === 'in_progress').length ?? 0;
  const doneCount = tasks?.filter((t) => t.status === 'done').length ?? 0;

  // Công việc ca trực hôm nay được giao cho chính nhân viên này
  const myTodayTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      const d = t.scheduled_date || t.created_at.slice(0, 10);
      const isMine = !userId || t.assignee_id === userId || !t.assignee_id;
      return isMine && d === todayStr;
    });
  }, [tasks, userId, todayStr]);

  const myTodayDoneCount = myTodayTasks.filter((t) => t.status === 'done').length;
  const myTodayTotalCount = myTodayTasks.length;
  const myTodayProgress = myTodayTotalCount > 0 ? myTodayDoneCount / myTodayTotalCount : 0;

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (filter === 'all') return tasks;
    if (filter === 'today') {
      return tasks.filter((t) => {
        const d = t.scheduled_date || t.created_at.slice(0, 10);
        return d === todayStr;
      });
    }
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter, todayStr]);

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
              {/* Banner ca trực hôm nay nếu có */}
              {myTodayTotalCount > 0 && (
                <View style={styles.todayBanner}>
                  <View style={styles.todayBannerHeader}>
                    <View style={styles.todayBannerIcon}>
                      <Ionicons name="calendar" size={18} color={colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.todayBannerTitle}>
                        Ca trực hôm nay ({new Date().toLocaleDateString('vi-VN')})
                      </Text>
                      <Text style={styles.todayBannerSub}>
                        Bạn được phân công {myTodayTotalCount} thùng rác cần hoàn tất
                      </Text>
                    </View>
                  </View>
                  <View style={styles.todayBannerProgressRow}>
                    <Text style={styles.todayBannerProgressText}>
                      Tiến độ: {myTodayDoneCount}/{myTodayTotalCount} thùng ({Math.round(myTodayProgress * 100)}%)
                    </Text>
                  </View>
                  <ProgressBar
                    value={myTodayProgress}
                    color={myTodayProgress === 1 ? colors.success : colors.primary}
                    height={7}
                  />
                </View>
              )}

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
                  {item.devices?.area && <Text style={styles.taskMeta}>Khu vực: {item.devices.area}</Text>}
                  
                  {/* Nhãn ca trực & độ ưu tiên */}
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.taskMetaTime}>
                      {item.scheduled_date ? `📅 ${item.scheduled_date}` : formatRelativeTime(item.created_at)}
                    </Text>
                    <View style={styles.taskTagGroup}>
                      {item.shift && (
                        <View style={styles.shiftTag}>
                          <Text style={styles.shiftTagText}>
                            {SHIFT_SHORT_LABELS[item.shift] || item.shift}
                          </Text>
                        </View>
                      )}
                      {item.priority === 'urgent' ? (
                        <View style={styles.urgentTag}>
                          <Text style={styles.urgentTagText}>⚠️ Đầy đột xuất</Text>
                        </View>
                      ) : (
                        <View style={styles.routineTag}>
                          <Text style={styles.routineTagText}>📋 Lịch ca</Text>
                        </View>
                      )}
                    </View>
                  </View>
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
  todayBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  todayBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todayBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  todayBannerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  todayBannerProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayBannerProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskMetaTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  taskTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  shiftTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  urgentTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.dangerBg,
  },
  urgentTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  routineTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  routineTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
