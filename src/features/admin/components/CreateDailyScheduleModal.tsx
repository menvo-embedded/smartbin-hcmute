import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { GradientView } from '../../../shared/ui';
import type { Profile } from '../../../shared/types/database';
import type { DeviceWithBins, TaskShift } from '../types';
import { SHIFT_LABELS, COLLECTOR_STAFF_PRESETS } from '../types';

interface Props {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  devices: DeviceWithBins[];
  collectors: Profile[];
  initialStaffIndex?: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (params: {
    scheduledDate: string;
    shift: TaskShift;
    collectorId: string;
    deviceIds: string[];
    note?: string;
  }) => void;
}

const SHIFTS: TaskShift[] = ['morning', 'afternoon', 'all_day'];

export function CreateDailyScheduleModal({
  visible,
  selectedDate,
  devices,
  collectors,
  initialStaffIndex,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [shift, setShift] = useState<TaskShift>('morning');

  const staffList = useMemo(() => {
    const fallbackId =
      collectors.length > 0 ? collectors[0].id : 'd5a8efa9-17a9-43d0-bb2e-a773e57ca4f0';
    return COLLECTOR_STAFF_PRESETS.map((preset, idx) => ({
      key: `staff-${idx}`,
      targetId: collectors[idx]?.id || fallbackId,
      name: preset.name,
      shortName: preset.shortName,
      area: preset.area,
      shift: preset.shift,
    }));
  }, [collectors]);

  const [selectedStaffKey, setSelectedStaffKey] = useState<string>(
    initialStaffIndex !== undefined ? `staff-${initialStaffIndex}` : 'staff-0',
  );
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const toggleDevice = (id: string) => {
    if (selectedDeviceIds.includes(id)) {
      setSelectedDeviceIds(selectedDeviceIds.filter((d) => d !== id));
    } else {
      setSelectedDeviceIds([...selectedDeviceIds, id]);
    }
  };

  const selectAllDevices = () => {
    if (selectedDeviceIds.length === devices.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map((d) => d.id));
    }
  };

  const handleSubmit = () => {
    const chosenStaff = staffList.find((s) => s.key === selectedStaffKey) || staffList[0];
    if (!chosenStaff) {
      Alert.alert('Chưa chọn nhân viên', 'Vui lòng chọn nhân viên phụ trách ca trực.');
      return;
    }
    if (selectedDeviceIds.length === 0) {
      Alert.alert('Chưa chọn thùng rác', 'Vui lòng chọn ít nhất 1 thùng rác để phân công.');
      return;
    }

    onSubmit({
      scheduledDate: selectedDate,
      shift,
      collectorId: chosenStaff.targetId,
      deviceIds: selectedDeviceIds,
      note,
    });
  };

  // Định dạng ngày hiển thị dd/mm/yyyy
  const formattedDate = (() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return selectedDate;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Lên lịch ca trực ngày</Text>
              <Text style={styles.subtitle}>Ngày thực hiện: {formattedDate}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Chọn Ca làm việc */}
            <Text style={styles.sectionLabel}>1. Chọn ca làm việc:</Text>
            <View style={styles.shiftRow}>
              {SHIFTS.map((s) => {
                const active = shift === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.shiftChip, active && styles.shiftChipActive]}
                    onPress={() => setShift(s)}
                  >
                    <Text style={[styles.shiftChipText, active && styles.shiftChipTextActive]}>
                      {SHIFT_LABELS[s]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 2. Chọn Nhân viên thu gom */}
            <Text style={styles.sectionLabel}>2. Chọn nhân viên phụ trách:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectorScroll}
            >
              {staffList.map((item) => {
                const active = selectedStaffKey === item.key;
                return (
                  <Pressable
                    key={item.key}
                    style={[styles.collectorCard, active && styles.collectorCardActive]}
                    onPress={() => setSelectedStaffKey(item.key)}
                  >
                    <View style={[styles.collectorAvatar, active && styles.collectorAvatarActive]}>
                      <Ionicons
                        name="person"
                        size={18}
                        color={active ? colors.primaryDark : colors.textMuted}
                      />
                    </View>
                    <Text
                      style={[styles.collectorName, active && styles.collectorNameActive]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.collectorRole} numberOfLines={1}>
                      {item.area}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 3. Chọn Thùng rác cần dọn */}
            <View style={styles.deviceHeaderRow}>
              <Text style={styles.sectionLabel}>
                3. Thùng rác phân công ({selectedDeviceIds.length}/{devices.length}):
              </Text>
              <Pressable onPress={selectAllDevices} hitSlop={6}>
                <Text style={styles.selectAllText}>
                  {selectedDeviceIds.length === devices.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.deviceList}>
              {devices.map((d) => {
                const selected = selectedDeviceIds.includes(d.id);
                return (
                  <Pressable
                    key={d.id}
                    style={[styles.deviceItem, selected && styles.deviceItemSelected]}
                    onPress={() => toggleDevice(d.id)}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, selected && styles.deviceNameSelected]}>
                        {d.name} <Text style={styles.deviceCode}>({d.code})</Text>
                      </Text>
                      <Text style={styles.deviceArea}>Khu vực: {d.area || '—'}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? colors.primary : colors.neutral}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* 4. Ghi chú chỉ đạo */}
            <Text style={styles.sectionLabel}>4. Ghi chú ca trực (tùy chọn):</Text>
            <TextInput
              placeholder="VD: Kiểm tra kỹ khu vực lối đi toà nhà chính..."
              value={note}
              onChangeText={setNote}
              style={styles.noteInput}
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitBtn,
                (selectedDeviceIds.length === 0 || isSubmitting) && styles.btnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={selectedDeviceIds.length === 0 || isSubmitting}
            >
              <GradientView style={styles.gradientSubmit}>
                {isSubmitting ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Xác nhận phân công</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    maxHeight: 460,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
    marginBottom: 8,
  },
  shiftRow: {
    gap: 8,
  },
  shiftChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  shiftChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  shiftChipTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  collectorScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  collectorCard: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.neutralBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 100,
  },
  collectorCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  collectorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  collectorAvatarActive: {
    backgroundColor: '#BBF7D0',
  },
  collectorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  collectorNameActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  collectorRole: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyNotice: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deviceList: {
    gap: 6,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FAFBF9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  deviceNameSelected: {
    color: colors.primaryDark,
  },
  deviceCode: {
    fontWeight: '400',
    color: colors.textMuted,
  },
  deviceArea: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: '#FAFBF9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.neutralBg,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  submitBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientSubmit: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
