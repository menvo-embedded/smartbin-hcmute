import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { GradientView } from '../../../shared/ui';
import type { Profile } from '../../../shared/types/database';
import type { TaskWithDetails } from '../types';
import { COLLECTOR_STAFF_PRESETS } from '../types';

interface Props {
  visible: boolean;
  task: TaskWithDetails | null;
  collectors: Profile[];
  isAssigning: boolean;
  onClose: () => void;
  onAssign: (taskId: string, collectorId: string) => void;
}

interface StaffOption {
  key: string;
  targetId: string;
  name: string;
  area: string;
  shift: string;
}

export function AssignCollectorModal({
  visible,
  task,
  collectors,
  isAssigning,
  onClose,
  onAssign,
}: Props) {
  // Chuẩn bị danh sách nhân viên 1, 2, 3 chuẩn chỉnh
  const staffList = useMemo<StaffOption[]>(() => {
    const fallbackId = collectors.length > 0 ? collectors[0].id : 'd5a8efa9-17a9-43d0-bb2e-a773e57ca4f0';
    return COLLECTOR_STAFF_PRESETS.map((preset, idx) => ({
      key: `staff-${idx}`,
      targetId: collectors[idx]?.id || fallbackId,
      name: preset.name,
      area: preset.area,
      shift: preset.shift,
    }));
  }, [collectors]);

  const [selectedKey, setSelectedKey] = useState<string>('staff-0');

  if (!task) return null;

  const handleConfirm = () => {
    const chosen = staffList.find((s) => s.key === selectedKey) || staffList[0];
    if (!chosen) return;
    onAssign(task.id, chosen.targetId);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Phân công thu gom</Text>
              <Text style={styles.subtitle}>
                Thùng: {task.devices?.name ?? 'Không xác định'} ({task.devices?.area ?? '—'})
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Chọn nhân viên phụ trách:</Text>

          <FlatList
            data={staffList}
            keyExtractor={(item) => item.key}
            style={styles.collectorList}
            renderItem={({ item }) => {
              const isSelected = selectedKey === item.key;
              return (
                <Pressable
                  style={[styles.collectorItem, isSelected && styles.collectorItemSelected]}
                  onPress={() => setSelectedKey(item.key)}
                >
                  <View style={[styles.collectorAvatar, isSelected && styles.collectorAvatarSelected]}>
                    <Ionicons
                      name="person"
                      size={18}
                      color={isSelected ? colors.primaryDark : colors.textMuted}
                    />
                  </View>
                  <View style={styles.collectorInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.collectorName, isSelected && styles.collectorNameSelected]}>
                        {item.name}
                      </Text>
                      <View style={styles.readyBadge}>
                        <View style={styles.readyDot} />
                        <Text style={styles.readyText}>Sẵn sàng</Text>
                      </View>
                    </View>
                    <Text style={styles.collectorArea}>Phụ trách: {item.area}</Text>
                    <Text style={styles.collectorShift}>Lịch: {item.shift}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.primary : colors.neutral}
                  />
                </Pressable>
              );
            }}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={isAssigning}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, isAssigning && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={isAssigning}
            >
              <GradientView style={styles.gradientBtn}>
                {isAssigning ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Xác nhận giao việc</Text>
                )}
              </GradientView>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  collectorList: {
    maxHeight: 280,
  },
  collectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 10,
    backgroundColor: '#FAFBF9',
  },
  collectorItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  collectorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  collectorAvatarSelected: {
    backgroundColor: '#BBF7D0',
  },
  collectorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    marginBottom: 3,
  },
  collectorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  collectorNameSelected: {
    color: colors.primaryDark,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  readyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  collectorArea: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  collectorShift: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.neutralBg,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  confirmBtn: {
    flex: 2,
  },
  gradientBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
