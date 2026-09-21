import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { WASTE_LABELS } from '../../../shared/constants/waste';
import type { DeviceWithBins } from '../types';

interface Props {
  visible: boolean;
  devices: DeviceWithBins[];
  onClose: () => void;
  onSimulateFill: (binId: string, fillLevel: number) => Promise<void>;
  onResetBins: (deviceId: string) => Promise<void>;
}

export function DemoControlModal({
  visible,
  devices,
  onClose,
  onSimulateFill,
  onResetBins,
}: Props) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    devices.length > 0 ? devices[0].id : null,
  );
  const [busy, setBusy] = useState(false);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? devices[0];

  const handleSimulate = async () => {
    if (!selectedDevice || !selectedDevice.bins || selectedDevice.bins.length === 0) {
      Alert.alert('Thông báo', 'Thùng rác này chưa có ngăn rác nào.');
      return;
    }
    setBusy(true);
    try {
      // Làm đầy ngăn đầu tiên lên 85% để kích hoạt cảnh báo & trigger tạo task
      const targetBin = selectedDevice.bins[0];
      await onSimulateFill(targetBin.id, 0.85);
      Alert.alert(
        'Đã kích hoạt kịch bản!',
        `Đã mô phỏng ngăn "${WASTE_LABELS[targetBin.waste_type]}" của thùng "${selectedDevice.name}" đạt 85% đầy.\nTrigger hệ thống sẽ tự động tạo công việc thu gom.`,
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!selectedDevice) return;
    setBusy(true);
    try {
      await onResetBins(selectedDevice.id);
      Alert.alert('Thành công', `Đã đặt lại tất cả các ngăn của "${selectedDevice.name}" về 0%.`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="flask-outline" size={20} color={colors.primary} />
              <Text style={styles.title}>Mô phỏng Thuyết trình Demo</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.desc}>
            Công cụ hỗ trợ trình diễn báo cáo đồ án: Thay đổi nhanh dữ liệu mức đầy thùng rác để kiểm tra phản hồi hệ thống và điều phối nhân viên.
          </Text>

          <Text style={styles.sectionLabel}>Chọn thùng rác cần mô phỏng:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={devices}
            keyExtractor={(d) => d.id}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            renderItem={({ item }) => {
              const active = item.id === (selectedDevice?.id ?? selectedDeviceId);
              return (
                <Pressable
                  style={[styles.deviceChip, active && styles.deviceChipActive]}
                  onPress={() => setSelectedDeviceId(item.id)}
                >
                  <Text style={[styles.deviceChipText, active && styles.deviceChipTextActive]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />

          {selectedDevice && (
            <View style={styles.devicePreview}>
              <Text style={styles.previewTitle}>
                {selectedDevice.name} - Khu vực: {selectedDevice.area || 'Chưa đặt'}
              </Text>
              <Text style={styles.previewSub}>
                Số ngăn rác: {selectedDevice.bins?.length ?? 0} ngăn
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            {/* Nút làm đầy thùng */}
            <Pressable
              style={[styles.actionBtn, styles.fillActionBtn, busy && styles.disabled]}
              onPress={handleSimulate}
              disabled={busy}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.fillText}>Mô phỏng thùng đầy (85%)</Text>
            </Pressable>

            {/* Nút reset về 0% */}
            <Pressable
              style={[styles.actionBtn, styles.resetActionBtn, busy && styles.disabled]}
              onPress={handleReset}
              disabled={busy}
            >
              <Ionicons name="refresh-circle" size={18} color={colors.primary} />
              <Text style={styles.resetText}>Dọn sạch (Reset về 0%)</Text>
            </Pressable>
          </View>

          {busy && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Đang cập nhật dữ liệu...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  desc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  deviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  deviceChipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  deviceChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  devicePreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  previewSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actions: {
    gap: 10,
    marginTop: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  fillActionBtn: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  fillText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  resetActionBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  resetText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
