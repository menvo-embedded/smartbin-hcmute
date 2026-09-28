import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from '../../collection/taskStatus';
import { SHIFT_SHORT_LABELS, formatStaffName, type TaskWithDetails } from '../types';
import { colors } from '../../../theme/colors';
import { Card, StatusBadge, GradientView } from '../../../shared/ui';

interface Props {
  item: TaskWithDetails;
  onAssign: (task: TaskWithDetails) => void;
  onInspect: (task: TaskWithDetails) => void;
  onUnassign: (taskId: string) => void;
}

/** Thẻ một việc thu gom trên tab Điều phối: ca, độ ưu tiên, người phụ trách, nghiệm thu. */
export function TaskCard({ item, onAssign, onInspect, onUnassign }: Props) {
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
          {(item.auto_assigned || (item.origin && item.origin !== 'manual')) && (
            <View style={styles.autoTag}>
              <Text style={styles.autoTagText}>🤖 Tự động</Text>
            </View>
          )}
        </View>
      </View>
      {!!item.note && <Text style={styles.taskNote}>{item.note}</Text>}

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
              onPress={() => onAssign(item)}
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
                onPress={() => onAssign(item)}
              >
                <Text style={styles.reassignBtnText}>Đổi nhân viên</Text>
              </Pressable>
              <Pressable
                style={styles.unassignBtn}
                onPress={() => {
                  Alert.alert('Hủy phân công', 'Đưa công việc về trạng thái chờ nhận?', [
                    { text: 'Không' },
                    { text: 'Hủy phân công', onPress: () => onUnassign(item.id) },
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
              onPress={() => onInspect(item)}
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
}

const styles = StyleSheet.create({
  taskCard: {
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  taskTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  taskBadgeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexShrink: 1,
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
  autoTag: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  autoTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  taskNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
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
});
