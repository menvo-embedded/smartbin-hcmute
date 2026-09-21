import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { buildDeviceMapHtml } from '../../features/devices/buildDeviceMapHtml';
import { WASTE_LABELS, FILL_ALERT_THRESHOLD } from '../../shared/constants/waste';
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
} from '../../features/collection/taskStatus';
import { colors } from '../../theme/colors';
import {
  Card,
  StatCard,
  StatusBadge,
  ScreenHeader,
  SectionTitle,
  EmptyState,
  ProgressBar,
  GradientView,
} from '../../shared/ui';

import type { CollectionTask } from '../../shared/types/database';
import type { AdminTab, DeviceFilter, TaskFilter, DeviceWithBins, TaskWithDetails, TaskShift } from '../../features/admin/types';
import { SHIFT_SHORT_LABELS, formatStaffName, getErrorMessage } from '../../features/admin/types';
import { useAdminDispatch } from '../../features/admin/hooks/useAdminDispatch';
import { AdminSegmentedControl } from '../../features/admin/components/AdminSegmentedControl';
import { AssignCollectorModal } from '../../features/admin/components/AssignCollectorModal';
import { TaskProofModal } from '../../features/admin/components/TaskProofModal';
import { DemoControlModal } from '../../features/admin/components/DemoControlModal';
import { DateStrip } from '../../features/admin/components/DateStrip';
import { CreateDailyScheduleModal } from '../../features/admin/components/CreateDailyScheduleModal';
import { AllStaffDailyShiftBoard } from '../../features/admin/components/AllStaffDailyShiftBoard';

const DEVICE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'full', label: '⚠️ Cần thu gom' },
  { key: 'online', label: 'Đang hoạt động' },
  { key: 'offline', label: 'Ngoại tuyến' },
] as const;

const TASK_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ phân công' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'done', label: 'Hoàn tất' },
] as const;

export default function Devices() {
  const signOut = useAuth((s) => s.signOut);
  const [activeTab, setActiveTab] = useState<AdminTab>('devices');
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Modal states
  const [assigningTask, setAssigningTask] = useState<TaskWithDetails | null>(null);
  const [inspectingTask, setInspectingTask] = useState<TaskWithDetails | null>(null);
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleStaffIndex, setScheduleStaffIndex] = useState<number | undefined>(undefined);

  // Hook quản lý dispatch & demo
  const {
    tasks,
    isTasksLoading,
    isTasksRefetching,
    refetchTasks,
    collectors,
    assignTask,
    unassignTask,
    createManualTask,
    createDailySchedule,
    simulateBinFill,
    resetDeviceBins,
  } = useAdminDispatch();

  // Query thiết bị & các ngăn rác
  const {
    data: devices,
    isLoading: isDevicesLoading,
    isRefetching: isDevicesRefetching,
    refetch: refetchDevices,
    error: devicesError,
  } = useQuery({
    queryKey: ['admin_devices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('devices').select('*, bins(*)');
      if (error) throw error;
      return data as DeviceWithBins[];
    },
  });

  const totalDevices = devices?.length ?? 0;
  const onlineDevices = devices?.filter((d) => d.is_online).length ?? 0;
  const fullDevices =
    devices?.filter((d) => d.bins?.some((b) => b.fill_level >= FILL_ALERT_THRESHOLD)) ?? [];
  const fullDevicesCount = fullDevices.length;

  const pendingTasksCount = tasks?.filter((t) => t.status === 'pending').length ?? 0;
  const inProgressTasksCount = tasks?.filter((t) => t.status === 'in_progress').length ?? 0;
  const doneTasksCount = tasks?.filter((t) => t.status === 'done').length ?? 0;

  // Lọc thiết bị
  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    if (deviceFilter === 'full') {
      return devices.filter((d) => d.bins?.some((b) => b.fill_level >= FILL_ALERT_THRESHOLD));
    }
    if (deviceFilter === 'online') return devices.filter((d) => d.is_online);
    if (deviceFilter === 'offline') return devices.filter((d) => !d.is_online);
    return devices;
  }, [devices, deviceFilter]);

  // Lọc tasks theo cả ngày hẹn và trạng thái
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let list = tasks;
    if (selectedDate !== null) {
      list = list.filter((t) => {
        const d = t.scheduled_date || t.created_at.slice(0, 10);
        return d === selectedDate;
      });
    }
    if (taskFilter !== 'all') {
      list = list.filter((t) => t.status === taskFilter);
    }
    return list;
  }, [tasks, selectedDate, taskFilter]);

  // Bản đồ thiết bị
  const devicesOnMap = (devices ?? []).filter(
    (d): d is DeviceWithBins & { latitude: number; longitude: number } =>
      d.latitude != null && d.longitude != null,
  );

  const mapHtml =
    devicesOnMap.length > 0
      ? buildDeviceMapHtml(
          devicesOnMap.map((d) => {
            const fillLevel = d.bins?.length ? Math.max(...d.bins.map((b) => b.fill_level)) : 0;
            const isFull = fillLevel >= FILL_ALERT_THRESHOLD;
            return {
              id: d.id,
              lat: d.latitude,
              lng: d.longitude,
              title: d.name,
              subtitle: `${d.area} — ${Math.round(fillLevel * 100)}% đầy`,
              color: isFull ? colors.danger : colors.primary,
            };
          }),
          { lat: devicesOnMap[0].latitude, lng: devicesOnMap[0].longitude },
        )
      : null;

  // Thao tác giao việc từ modal
  const handleConfirmAssign = (taskId: string, collectorId: string) => {
    assignTask.mutate(
      { taskId, collectorId },
      {
        onSuccess: () => {
          setAssigningTask(null);
          Alert.alert('Thành công', 'Đã phân công nhân viên thu gom.');
        },
        onError: (err: unknown) => {
          const msg = getErrorMessage(err);
          Alert.alert('Lỗi', msg);
        },
      },
    );
  };

  // Nút hành động nhanh: Tạo việc & phân công ngay cho 1 thùng đầy
  const handleQuickDispatch = (device: DeviceWithBins) => {
    // Kiểm tra xem đã có task pending/in_progress cho thùng này chưa
    const existingTask = tasks?.find(
      (t) => t.device_id === device.id && t.status !== 'done',
    );
    if (existingTask) {
      setActiveTab('dispatch');
      setAssigningTask(existingTask);
    } else {
      createManualTask.mutate(
        { deviceId: device.id },
        {
          onSuccess: (newTask) => {
            setActiveTab('dispatch');
            if (newTask) {
              const created = newTask as unknown as CollectionTask;
              setAssigningTask({
                ...created,
                devices: { name: device.name, area: device.area, code: device.code },
              } as TaskWithDetails);
            }
          },
          onError: (err: unknown) => {
            const msg = getErrorMessage(err);
            Alert.alert('Thông báo', msg);
          },
        },
      );
    }
  };

  // Thao tác lên lịch ca trực ngày
  const handleCreateSchedule = async (params: {
    scheduledDate: string;
    shift: TaskShift;
    collectorId: string;
    deviceIds: string[];
    note?: string;
  }) => {
    try {
      await createDailySchedule.mutateAsync(params);
      setScheduleModalVisible(false);
      setScheduleStaffIndex(undefined);
      Alert.alert(
        'Thành công',
        `Đã lên lịch ca trực cho ${params.deviceIds.length} thùng rác ngày ${params.scheduledDate}.`,
      );
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      Alert.alert('Lỗi', msg);
    }
  };

  const isRefreshing = isDevicesRefetching || isTasksRefetching;
  const onRefresh = () => {
    refetchDevices();
    refetchTasks();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Quản trị SmartBin"
        subtitle="Hệ thống quản lý & điều phối thu gom"
        actionLabel="Đăng xuất"
        onAction={async () => {
          await signOut();
          router.replace('/');
        }}
      />

      {/* Thanh chuyển tab phân hệ */}
      <AdminSegmentedControl
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fullCount={fullDevicesCount}
        pendingTaskCount={pendingTasksCount}
      />

      {/* Thanh công cụ Demo & Báo cáo */}
      <View style={styles.demoBar}>
        <Pressable
          style={styles.demoBarBtn}
          onPress={() => setDemoModalVisible(true)}
          hitSlop={4}
        >
          <Ionicons name="flask" size={16} color={colors.primaryDark} />
          <Text style={styles.demoBarBtnText}>Mô phỏng Demo Đồ án (Thùng đầy / Reset)</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* ================= TAB 1: THÙNG RÁC ================= */}
        {activeTab === 'devices' ? (
          <FlatList
            data={filteredDevices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                {/* Bản đồ định vị */}
                {mapHtml && (
                  <View style={styles.mapWrapper}>
                    <WebView
                      style={styles.map}
                      originWhitelist={['*']}
                      source={{ html: mapHtml }}
                      javaScriptEnabled
                    />
                  </View>
                )}

                <View style={{ height: 14 }} />

                {/* Thống kê số lượng thùng */}
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={[
                    { label: 'Tổng số thùng', value: String(totalDevices) },
                    { label: '⚠️ Cần thu gom', value: String(fullDevicesCount) },
                    { label: 'Đang Online', value: String(onlineDevices) },
                  ]}
                  keyExtractor={(s) => s.label}
                  renderItem={({ item }) => <StatCard label={item.label} value={item.value} />}
                />

                <View style={{ height: 16 }} />

                {/* Bộ lọc thùng */}
                <View style={styles.filterRow}>
                  {DEVICE_FILTERS.map((f) => {
                    const active = deviceFilter === f.key;
                    if (active) {
                      return (
                        <Pressable key={f.key} onPress={() => setDeviceFilter(f.key)}>
                          <GradientView style={styles.filterChip}>
                            <Text style={styles.filterChipTextActive}>{f.label}</Text>
                          </GradientView>
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={f.key}
                        style={styles.filterChipInactive}
                        onPress={() => setDeviceFilter(f.key)}
                      >
                        <Text style={styles.filterChipTextInactive}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ height: 16 }} />
                <SectionTitle>
                  {deviceFilter === 'full'
                    ? `Thùng rác đang đầy (${filteredDevices.length})`
                    : `Danh sách thùng rác (${filteredDevices.length})`}
                </SectionTitle>
                {isDevicesLoading && <ActivityIndicator style={{ marginTop: 12 }} />}
                {devicesError && <Text style={{ color: colors.danger }}>{String(devicesError)}</Text>}
              </View>
            }
            ListEmptyComponent={
              !isDevicesLoading ? (
                <EmptyState
                  title={
                    deviceFilter === 'full'
                      ? 'Không có thùng nào bị đầy'
                      : 'Không tìm thấy thùng rác phù hợp'
                  }
                  description="Tất cả các ngăn rác hiện tại đang ở mức an toàn"
                />
              ) : null
            }
            renderItem={({ item }) => {
              const maxFill = item.bins?.length
                ? Math.max(...item.bins.map((b) => b.fill_level))
                : 0;
              const isFull = maxFill >= FILL_ALERT_THRESHOLD;

              return (
                <Card style={[styles.deviceCard, isFull && styles.deviceCardFull]}>
                  {/* Header thùng */}
                  <View style={styles.row}>
                    <View style={styles.deviceTitleRow}>
                      <View style={[styles.deviceIcon, isFull && styles.deviceIconDanger]}>
                        <Ionicons
                          name="trash-bin"
                          size={16}
                          color={isFull ? colors.danger : colors.primaryDark}
                        />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.deviceName}>
                          {item.name} <Text style={styles.deviceCode}>({item.code})</Text>
                        </Text>
                        <Text style={styles.deviceArea}>Khu vực: {item.area || 'Chưa cập nhật'}</Text>
                      </View>
                    </View>
                    <StatusBadge
                      label={item.is_online ? 'Online' : 'Offline'}
                      tone={item.is_online ? 'success' : 'neutral'}
                    />
                  </View>

                  {/* Thanh đo mức đầy từng ngăn */}
                  <View style={styles.binsSection}>
                    <Text style={styles.binsSectionTitle}>Mức đầy các ngăn rác:</Text>
                    {item.bins?.map((bin) => {
                      const fillPct = Math.round(bin.fill_level * 100);
                      const binFull = bin.fill_level >= FILL_ALERT_THRESHOLD;
                      const binHalf = bin.fill_level >= 0.5;
                      const barColor = binFull
                        ? colors.danger
                        : binHalf
                        ? colors.warning
                        : colors.primary;

                      return (
                        <View key={bin.id} style={styles.binItem}>
                          <View style={styles.binItemHeader}>
                            <Text style={styles.binLabel}>{WASTE_LABELS[bin.waste_type]}</Text>
                            <Text style={[styles.binPercent, { color: barColor }]}>{fillPct}%</Text>
                          </View>
                          <ProgressBar value={bin.fill_level} color={barColor} height={6} />
                        </View>
                      );
                    })}
                  </View>

                  {/* Hành động điều phối nếu thùng đầy */}
                  {isFull && (
                    <View style={styles.deviceActionBox}>
                      <View style={styles.alertNotice}>
                        <Ionicons name="alert-circle" size={16} color={colors.danger} />
                        <Text style={styles.alertNoticeText}>Thùng vượt ngưỡng 80% — Cần thu gom!</Text>
                      </View>
                      <Pressable
                        style={styles.dispatchNowBtn}
                        onPress={() => handleQuickDispatch(item)}
                      >
                        <GradientView style={styles.dispatchNowGradient}>
                          <Ionicons name="paper-plane" size={14} color={colors.textOnPrimary} />
                          <Text style={styles.dispatchNowText}>Điều phối nhân viên dọn</Text>
                        </GradientView>
                      </Pressable>
                    </View>
                  )}
                </Card>
              );
            }}
          />
        ) : (
          /* ================= TAB 2: ĐIỀU PHỐI THU GOM ================= */
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                {/* Thống kê công việc */}
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={[
                    { label: 'Chờ phân công', value: String(pendingTasksCount) },
                    { label: 'Đang xử lý', value: String(inProgressTasksCount) },
                    { label: 'Đã hoàn tất', value: String(doneTasksCount) },
                  ]}
                  keyExtractor={(s) => s.label}
                  renderItem={({ item }) => <StatCard label={item.label} value={item.value} />}
                />

                <View style={{ height: 14 }} />

                {/* Thanh chọn ngày (DateStrip) */}
                <DateStrip
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  tasks={tasks ?? []}
                />

                {/* Bảng ca trực toàn thể nhân viên theo ngày được chọn */}
                <AllStaffDailyShiftBoard
                  selectedDate={selectedDate || new Date().toISOString().slice(0, 10)}
                  tasks={tasks ?? []}
                  collectors={collectors ?? []}
                  devices={devices ?? []}
                  onOpenScheduleModal={(preselectedIdx) => {
                    setScheduleStaffIndex(preselectedIdx);
                    setScheduleModalVisible(true);
                  }}
                  onSelectTask={(task) => {
                    if (task.status === 'done') {
                      setInspectingTask(task);
                    } else {
                      setAssigningTask(task);
                    }
                  }}
                />

                {/* Nút Lên lịch ca trực ngày */}
                <Pressable
                  style={styles.addScheduleBtn}
                  onPress={() => {
                    setScheduleStaffIndex(undefined);
                    setScheduleModalVisible(true);
                  }}
                >
                  <GradientView style={styles.addScheduleGradient}>
                    <Ionicons name="calendar" size={16} color={colors.textOnPrimary} />
                    <Text style={styles.addScheduleText}>+ Lên lịch ca trực ngày</Text>
                  </GradientView>
                </Pressable>

                <View style={{ height: 14 }} />

                {/* Bộ lọc trạng thái việc */}
                <View style={styles.filterRow}>
                  {TASK_FILTERS.map((f) => {
                    const active = taskFilter === f.key;
                    if (active) {
                      return (
                        <Pressable key={f.key} onPress={() => setTaskFilter(f.key)}>
                          <GradientView style={styles.filterChip}>
                            <Text style={styles.filterChipTextActive}>{f.label}</Text>
                          </GradientView>
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={f.key}
                        style={styles.filterChipInactive}
                        onPress={() => setTaskFilter(f.key)}
                      >
                        <Text style={styles.filterChipTextInactive}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ height: 16 }} />
                <SectionTitle>{`Danh sách nhiệm vụ thu gom (${filteredTasks.length})`}</SectionTitle>
                {isTasksLoading && <ActivityIndicator style={{ marginTop: 12 }} />}
              </View>
            }
            ListEmptyComponent={
              !isTasksLoading ? (
                <EmptyState
                  title={
                    selectedDate
                      ? 'Không có nhiệm vụ nào cho ngày này'
                      : 'Không có công việc thu gom nào'
                  }
                  description={
                    selectedDate
                      ? 'Bấm "+ Lên lịch ca trực ngày" để phân công công việc cho nhân viên'
                      : 'Khi thùng rác đạt ngưỡng đầy, công việc sẽ tự động xuất hiện tại đây'
                  }
                />
              ) : null
            }
            renderItem={({ item }) => {
              const hasAssignee = !!item.assignee_id && !!item.profiles;
              const isPending = item.status === 'pending';
              const isInProgress = item.status === 'in_progress';
              const isDone = item.status === 'done';

              return (
                <Card style={styles.taskCard}>
                  {/* Tiêu đề & trạng thái task */}
                  <View style={styles.row}>
                    <View style={styles.taskTitleRow}>
                      <View style={styles.taskIcon}>
                        <Ionicons name="clipboard" size={16} color={colors.primaryDark} />
                      </View>
                      <View>
                        <Text style={styles.taskDeviceName}>
                          {item.devices?.name ?? 'Thùng rác'}
                        </Text>
                        <Text style={styles.taskDeviceArea}>
                          Vị trí: {item.devices?.area || 'Khuôn viên trường'}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge
                      label={TASK_STATUS_LABEL[item.status]}
                      tone={TASK_STATUS_TONE[item.status]}
                    />
                  </View>

                  {/* Nhãn ca trực & độ ưu tiên */}
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.taskTime}>
                      {item.scheduled_date ? `📅 ${item.scheduled_date}` : `Tạo lúc: ${new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                    </Text>
                    <View style={styles.taskBadgeGroup}>
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
                          <Text style={styles.routineTagText}>📋 Định kỳ ca</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Thông tin nhân viên & Hành động phân công */}
                  <View style={styles.assigneeContainer}>
                    {isPending && !hasAssignee && (
                      <View style={styles.unassignedBox}>
                        <View style={styles.unassignedNotice}>
                          <Ionicons name="time-outline" size={16} color={colors.warning} />
                          <Text style={styles.unassignedText}>Chưa có người phụ trách</Text>
                        </View>
                        <Pressable
                          style={styles.assignBtn}
                          onPress={() => setAssigningTask(item)}
                        >
                          <GradientView style={styles.assignBtnGradient}>
                            <Ionicons name="person-add" size={14} color={colors.textOnPrimary} />
                            <Text style={styles.assignBtnText}>Giao việc cho nhân viên</Text>
                          </GradientView>
                        </Pressable>
                      </View>
                    )}

                    {isInProgress && (
                      <View style={styles.inProgressBox}>
                        <View style={styles.collectorInfoRow}>
                          <Ionicons name="person-circle" size={20} color={colors.primary} />
                          <Text style={styles.collectorNameText}>
                            Người phụ trách: <Text style={styles.boldText}>{formatStaffName(item.profiles?.full_name)}</Text>
                          </Text>
                        </View>
                        <View style={styles.inProgressActions}>
                          <Pressable
                            style={styles.reassignBtn}
                            onPress={() => setAssigningTask(item)}
                          >
                            <Text style={styles.reassignBtnText}>Đổi nhân viên</Text>
                          </Pressable>
                          <Pressable
                            style={styles.unassignBtn}
                            onPress={() => {
                              Alert.alert('Hủy phân công', 'Đưa công việc về trạng thái chờ nhận?', [
                                { text: 'Không' },
                                { text: 'Hủy phân công', onPress: () => unassignTask.mutate({ taskId: item.id }) },
                              ]);
                            }}
                          >
                            <Text style={styles.unassignBtnText}>Hủy gán</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {isDone && (
                      <View style={styles.doneBox}>
                        <View style={styles.collectorInfoRow}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                          <Text style={styles.doneText}>
                            Đã dọn xong bởi: <Text style={styles.boldText}>{formatStaffName(item.profiles?.full_name)}</Text>
                          </Text>
                        </View>
                        <Pressable
                          style={styles.proofBtn}
                          onPress={() => setInspectingTask(item)}
                          hitSlop={8}
                        >
                          <Ionicons name="image" size={15} color={colors.primaryDark} />
                          <Text style={styles.proofBtnText}>Xem ảnh nghiệm thu dọn sạch</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </Card>
              );
            }}
          />
        )}
      </View>

      {/* Modal Phân công nhân viên */}
      <AssignCollectorModal
        visible={!!assigningTask}
        task={assigningTask}
        collectors={collectors}
        isAssigning={assignTask.isPending}
        onClose={() => setAssigningTask(null)}
        onAssign={handleConfirmAssign}
      />

      {/* Modal Xem ảnh nghiệm thu hoàn tất */}
      <TaskProofModal
        visible={!!inspectingTask}
        task={inspectingTask}
        onClose={() => setInspectingTask(null)}
      />

      {/* Modal Mô phỏng Demo Đồ án */}
      <DemoControlModal
        visible={demoModalVisible}
        devices={devices ?? []}
        onClose={() => setDemoModalVisible(false)}
        onSimulateFill={async (binId, fillLevel) => {
          await simulateBinFill.mutateAsync({ binId, fillLevel });
        }}
        onResetBins={async (deviceId) => {
          await resetDeviceBins.mutateAsync({ deviceId });
        }}
      />

      {/* Modal Lên lịch ca trực ngày */}
      <CreateDailyScheduleModal
        visible={scheduleModalVisible}
        selectedDate={selectedDate || new Date().toISOString().slice(0, 10)}
        devices={devices ?? []}
        collectors={collectors}
        initialStaffIndex={scheduleStaffIndex}
        isSubmitting={createDailySchedule.isPending}
        onClose={() => {
          setScheduleModalVisible(false);
          setScheduleStaffIndex(undefined);
        }}
        onSubmit={handleCreateSchedule}
      />
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
  demoBar: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  demoBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  demoBarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
    marginHorizontal: 8,
  },
  listHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  filterChipInactive: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  filterChipTextInactive: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceCard: {
    padding: 14,
  },
  deviceCardFull: {
    borderColor: '#FECACA',
    borderWidth: 1.5,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconDanger: {
    backgroundColor: colors.dangerBg,
  },
  deviceName: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.text,
  },
  deviceCode: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 13,
  },
  deviceArea: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  binsSection: {
    marginTop: 12,
    gap: 8,
    backgroundColor: '#FAFBF9',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  binsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  binItem: {
    gap: 4,
  },
  binItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  binLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  binPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceActionBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  dispatchNowBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  dispatchNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  dispatchNowText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  taskCard: {
    padding: 14,
    gap: 8,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDeviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  taskDeviceArea: {
    fontSize: 12,
    color: colors.textMuted,
  },
  taskTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  assigneeContainer: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  unassignedBox: {
    gap: 8,
  },
  unassignedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unassignedText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  assignBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  assignBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 6,
  },
  assignBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  inProgressBox: {
    gap: 8,
  },
  collectorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectorNameText: {
    fontSize: 13,
    color: colors.text,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  inProgressActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  reassignBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  reassignBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  unassignBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.neutralBg,
  },
  unassignBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  doneBox: {
    gap: 8,
    marginTop: 4,
  },
  doneText: {
    fontSize: 13,
    color: colors.success,
  },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  proofBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  addScheduleBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  addScheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 8,
  },
  addScheduleText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  taskBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  shiftTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  urgentTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.dangerBg,
  },
  urgentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  routineTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  routineTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
