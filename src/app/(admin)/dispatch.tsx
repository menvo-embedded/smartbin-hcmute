import { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { toLocalDateString } from '../../core/utils/time';
import { useAdminDispatch } from '../../features/admin/hooks/useAdminDispatch';
import { useAdminDevices } from '../../features/admin/hooks/useAdminDevices';
import { AdminHeader } from '../../features/admin/components/AdminHeader';
import { TaskCard } from '../../features/admin/components/TaskCard';
import { FilterChips } from '../../features/admin/components/FilterChips';
import { AssignCollectorModal } from '../../features/admin/components/AssignCollectorModal';
import { TaskProofModal } from '../../features/admin/components/TaskProofModal';
import { DateStrip } from '../../features/admin/components/DateStrip';
import { CreateDailyScheduleModal } from '../../features/admin/components/CreateDailyScheduleModal';
import { AllStaffDailyShiftBoard } from '../../features/admin/components/AllStaffDailyShiftBoard';
import { getErrorMessage, type TaskFilter, type TaskShift, type TaskWithDetails } from '../../features/admin/types';
import { colors } from '../../theme/colors';
import { StatCard, SectionTitle, EmptyState, GradientView } from '../../shared/ui';

const TASK_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ phân công' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'done', label: 'Hoàn tất' },
] as const;

/** Tab Điều phối: bảng ca trực theo ngày, danh sách việc, giao / đổi / huỷ gán, xem nghiệm thu. */
export default function Dispatch() {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toLocalDateString());
  const [assigningTask, setAssigningTask] = useState<TaskWithDetails | null>(null);
  const [inspectingTask, setInspectingTask] = useState<TaskWithDetails | null>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleCollectorId, setScheduleCollectorId] = useState<string | undefined>(undefined);

  const {
    tasks,
    isTasksLoading,
    isTasksRefetching,
    refetchTasks,
    collectors,
    assignTask,
    unassignTask,
    createDailySchedule,
  } = useAdminDispatch();
  const { data: devices } = useAdminDevices();

  // Tab Thùng rác chuyển sang kèm ?assign=<id> → mở ngay hộp giao việc đó.
  const { assign } = useLocalSearchParams<{ assign?: string }>();
  useEffect(() => {
    if (!assign || !tasks) return;
    const task = tasks.find((t) => t.id === assign);
    if (task) {
      setSelectedDate(task.scheduled_date ?? task.created_at.slice(0, 10));
      setAssigningTask(task);
    }
    router.setParams({ assign: undefined });
  }, [assign, tasks]);

  const pendingCount = tasks?.filter((t) => t.status === 'pending').length ?? 0;
  const inProgressCount = tasks?.filter((t) => t.status === 'in_progress').length ?? 0;
  const doneCount = tasks?.filter((t) => t.status === 'done').length ?? 0;

  // Lọc việc theo cả ngày hẹn và trạng thái
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let list = tasks;
    if (selectedDate !== null) {
      list = list.filter((t) => (t.scheduled_date || t.created_at.slice(0, 10)) === selectedDate);
    }
    if (taskFilter !== 'all') list = list.filter((t) => t.status === taskFilter);
    return list;
  }, [tasks, selectedDate, taskFilter]);

  function handleConfirmAssign(taskId: string, collectorId: string) {
    assignTask.mutate(
      { taskId, collectorId },
      {
        onSuccess: () => {
          setAssigningTask(null);
          Alert.alert('Thành công', 'Đã phân công nhân viên thu gom.');
        },
        onError: (err: unknown) => Alert.alert('Lỗi', getErrorMessage(err)),
      },
    );
  }

  async function handleCreateSchedule(params: {
    scheduledDate: string;
    shift: TaskShift;
    collectorId: string;
    deviceIds: string[];
    note?: string;
  }) {
    try {
      await createDailySchedule.mutateAsync(params);
      setScheduleModalVisible(false);
      setScheduleCollectorId(undefined);
      Alert.alert(
        'Thành công',
        `Đã lên lịch ca trực cho ${params.deviceIds.length} thùng rác ngày ${params.scheduledDate}.`,
      );
    } catch (err: unknown) {
      Alert.alert('Lỗi', getErrorMessage(err));
    }
  }

  function openSchedule(collectorId?: string) {
    setScheduleCollectorId(collectorId);
    setScheduleModalVisible(true);
  }

  return (
    <View style={styles.screen}>
      <AdminHeader title="Điều phối thu gom" subtitle="Ca trực, giao việc và nghiệm thu" />

      <FlatList
        style={styles.body}
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isTasksRefetching} onRefresh={() => void refetchTasks()} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { label: 'Chờ phân công', value: String(pendingCount) },
                { label: 'Đang xử lý', value: String(inProgressCount) },
                { label: 'Đã hoàn tất', value: String(doneCount) },
              ]}
              keyExtractor={(s) => s.label}
              renderItem={({ item }) => <StatCard label={item.label} value={item.value} />}
            />

            <View style={{ height: 14 }} />
            <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} tasks={tasks ?? []} />

            <AllStaffDailyShiftBoard
              selectedDate={selectedDate || toLocalDateString()}
              tasks={tasks ?? []}
              collectors={collectors}
              devices={devices ?? []}
              onOpenScheduleModal={openSchedule}
              onSelectTask={(task) => (task.status === 'done' ? setInspectingTask(task) : setAssigningTask(task))}
            />

            <Pressable style={styles.addScheduleBtn} onPress={() => openSchedule()}>
              <GradientView style={styles.addScheduleGradient}>
                <Ionicons name="calendar" size={16} color={colors.textOnPrimary} />
                <Text style={styles.addScheduleText}>Lên lịch ca trực ngày</Text>
              </GradientView>
            </Pressable>

            <View style={{ height: 14 }} />
            <FilterChips options={TASK_FILTERS} value={taskFilter} onChange={setTaskFilter} />

            <View style={{ height: 16 }} />
            <SectionTitle>{`Danh sách nhiệm vụ thu gom (${filteredTasks.length})`}</SectionTitle>
            {isTasksLoading && <ActivityIndicator style={{ marginTop: 12 }} />}
          </View>
        }
        ListEmptyComponent={
          !isTasksLoading ? (
            <EmptyState
              title={selectedDate ? 'Không có nhiệm vụ nào cho ngày này' : 'Không có công việc thu gom nào'}
              description={
                selectedDate
                  ? 'Bấm "Lên lịch ca trực ngày" để phân công công việc cho nhân viên'
                  : 'Khi thùng rác đạt ngưỡng đầy, công việc sẽ tự động xuất hiện tại đây'
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <TaskCard
            item={item}
            onAssign={setAssigningTask}
            onInspect={setInspectingTask}
            onUnassign={(taskId) => unassignTask.mutate({ taskId })}
          />
        )}
      />

      <AssignCollectorModal
        visible={!!assigningTask}
        task={assigningTask}
        collectors={collectors}
        isAssigning={assignTask.isPending}
        onClose={() => setAssigningTask(null)}
        onAssign={handleConfirmAssign}
      />

      <TaskProofModal visible={!!inspectingTask} task={inspectingTask} onClose={() => setInspectingTask(null)} />

      <CreateDailyScheduleModal
        visible={scheduleModalVisible}
        selectedDate={selectedDate || toLocalDateString()}
        devices={devices ?? []}
        collectors={collectors}
        initialCollectorId={scheduleCollectorId}
        isSubmitting={createDailySchedule.isPending}
        onClose={() => {
          setScheduleModalVisible(false);
          setScheduleCollectorId(undefined);
        }}
        onSubmit={handleCreateSchedule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: 20 },
  listHeader: { marginTop: 8, marginBottom: 8 },
  addScheduleBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  addScheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 8,
  },
  addScheduleText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
});
