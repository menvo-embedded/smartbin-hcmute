import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import type { Profile } from '../../../shared/types/database';
import type { TaskWithDetails, DeviceWithBins, TaskShift } from '../types';
import { COLLECTOR_STAFF_PRESETS, SHIFT_LABELS, SHIFT_SHORT_LABELS } from '../types';

interface Props {
  selectedDate: string; // YYYY-MM-DD
  tasks: TaskWithDetails[];
  collectors: Profile[];
  devices: DeviceWithBins[];
  onOpenScheduleModal: (preselectedStaffIndex?: number) => void;
  onSelectTask?: (task: TaskWithDetails) => void;
}

export function AllStaffDailyShiftBoard({
  selectedDate,
  tasks,
  collectors,
  devices: _devices,
  onOpenScheduleModal,
  onSelectTask,
}: Props) {
  // Định dạng ngày hiển thị (VD: 20/09/2026)
  const formattedDate = (() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return selectedDate;
  })();

  // Lọc các tasks thuộc về ngày được chọn
  const tasksForDate = tasks.filter((t) => {
    const d = t.scheduled_date || t.created_at.slice(0, 10);
    return d === selectedDate;
  });

  // Xây dựng dữ liệu ca trực cho từng nhân viên (NV1, NV2, NV3)
  const staffSchedule = COLLECTOR_STAFF_PRESETS.map((preset, idx) => {
    const staffId = collectors[idx]?.id;

    // Tìm tất cả task được phân cho nhân viên này trong ngày
    const assignedTasks = tasksForDate.filter((t) => {
      if (staffId && t.assignee_id === staffId) return true;
      if (t.profiles?.full_name && t.profiles.full_name.includes(`Nhân viên ${idx + 1}`)) return true;
      if (t.note && t.note.includes(`NV${idx + 1}`)) return true;
      if (idx === 0 && t.assignee_id && !t.profiles?.full_name?.includes('Nhân viên 2') && !t.profiles?.full_name?.includes('Nhân viên 3')) {
        return true;
      }
      return false;
    });

    const isWorking = assignedTasks.length > 0;
    const completedTasks = assignedTasks.filter((t) => t.status === 'done');
    const inProgressTasks = assignedTasks.filter((t) => t.status === 'in_progress');

    // Xác định ca làm việc chính trong ngày của nhân viên
    let mainShift: TaskShift = idx === 0 ? 'morning' : idx === 1 ? 'afternoon' : 'all_day';
    if (assignedTasks.length > 0 && assignedTasks[0].shift) {
      mainShift = assignedTasks[0].shift;
    }

    return {
      preset,
      index: idx,
      isWorking,
      mainShift,
      assignedTasks,
      completedCount: completedTasks.length,
      inProgressCount: inProgressTasks.length,
      totalCount: assignedTasks.length,
    };
  });

  const activeStaffCount = staffSchedule.filter((s) => s.isWorking).length;

  return (
    <View style={styles.container}>
      {/* Header bảng ca trực */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.calendarIconBox}>
            <Ionicons name="calendar" size={18} color={colors.primaryDark} />
          </View>
          <View>
            <Text style={styles.title}>Bảng ca trực toàn nhân viên</Text>
            <Text style={styles.subtitle}>
              Ngày {formattedDate} • <Text style={styles.highlightText}>{activeStaffCount}/3 nhân viên có ca</Text>
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.addShiftBtn}
          onPress={() => onOpenScheduleModal()}
          hitSlop={6}
        >
          <Ionicons name="add-circle" size={16} color={colors.primary} />
          <Text style={styles.addShiftBtnText}>+ Thêm ca</Text>
        </Pressable>
      </View>

      {/* Danh sách thẻ ca trực của từng nhân viên */}
      <View style={styles.staffGrid}>
        {staffSchedule.map(({ preset, index, isWorking, mainShift, assignedTasks, completedCount, totalCount }) => {
          return (
            <View
              key={preset.id}
              style={[styles.staffCard, isWorking && styles.staffCardActive]}
            >
              {/* Đầu thẻ: Tên nhân viên & Ca trực */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarBox}>
                  <Ionicons
                    name="person"
                    size={16}
                    color={isWorking ? colors.primaryDark : colors.textMuted}
                  />
                </View>
                <View style={styles.staffMeta}>
                  <Text style={styles.staffName}>{preset.name}</Text>
                  <Text style={styles.staffArea}>{preset.area}</Text>
                </View>

                {/* Badge ca trực */}
                {isWorking ? (
                  <View style={styles.shiftBadgeWorking}>
                    <Text style={styles.shiftBadgeWorkingText}>
                      {SHIFT_SHORT_LABELS[mainShift]}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.shiftBadgeOff}>
                    <Text style={styles.shiftBadgeOffText}>Nghỉ ca</Text>
                  </View>
                )}
              </View>

              {/* Nội dung ca trực */}
              {isWorking ? (
                <View style={styles.cardContent}>
                  <View style={styles.statsRow}>
                    <Text style={styles.shiftTimeText}>
                      ⏰ {SHIFT_LABELS[mainShift]}
                    </Text>
                    <Text style={styles.progressText}>
                      Đã dọn: <Text style={styles.boldText}>{completedCount}/{totalCount}</Text>
                    </Text>
                  </View>

                  {/* Danh sách thùng rác nhân viên này phụ trách dọn */}
                  <View style={styles.assignedBinsList}>
                    {assignedTasks.map((task) => {
                      const deviceName = task.devices?.name || 'Thùng rác';
                      const deviceCode = task.devices?.code || '';
                      const isDone = task.status === 'done';
                      const isInProgress = task.status === 'in_progress';

                      return (
                        <Pressable
                          key={task.id}
                          style={styles.binItem}
                          onPress={() => onSelectTask && onSelectTask(task)}
                        >
                          <Ionicons
                            name={isDone ? 'checkmark-circle' : isInProgress ? 'time' : 'ellipse-outline'}
                            size={14}
                            color={isDone ? colors.success : isInProgress ? colors.warning : colors.textMuted}
                          />
                          <Text style={[styles.binItemName, isDone && styles.binItemDone]} numberOfLines={1}>
                            {deviceName} {deviceCode ? `(${deviceCode})` : ''}
                          </Text>
                          <Text style={[styles.binStatusTag, isDone ? styles.statusDone : isInProgress ? styles.statusInProgress : styles.statusPending]}>
                            {isDone ? 'Đã xong' : isInProgress ? 'Đang dọn' : 'Chờ'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.offContent}>
                  <Text style={styles.offNotice}>Chưa có thùng rác phân công cho ngày này</Text>
                  <Pressable
                    style={styles.assignNowBtn}
                    onPress={() => onOpenScheduleModal(index)}
                  >
                    <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
                    <Text style={styles.assignNowBtnText}>Phân công ca trực</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  highlightText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  addShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addShiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  staffGrid: {
    gap: 10,
  },
  staffCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  staffCardActive: {
    backgroundColor: '#FAFDF9',
    borderColor: '#A7F3D0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  staffMeta: {
    flex: 1,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  staffArea: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  shiftBadgeWorking: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftBadgeWorkingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  shiftBadgeOff: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftBadgeOffText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardContent: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shiftTimeText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  assignedBinsList: {
    gap: 4,
  },
  binItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  binItemName: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  binItemDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  binStatusTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDone: {
    backgroundColor: '#DCFCE7',
    color: colors.success,
  },
  statusInProgress: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
  },
  statusPending: {
    backgroundColor: '#F3F4F6',
    color: colors.textMuted,
  },
  offContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offNotice: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  assignNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  assignNowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
