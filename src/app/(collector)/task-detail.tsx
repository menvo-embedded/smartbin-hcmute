import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from '../../features/collection/taskStatus';
import type { TaskWithDevice } from '../../features/collection/types';
import { claimTask, completeTask, GOOD_SORTING_BONUS, type SortingQuality } from '../../features/collection/taskActions';
import { SHIFT_SHORT_LABELS } from '../../features/admin/types';
import { colors } from '../../theme/colors';
import { Card, StatusBadge, SectionTitle, GradientView } from '../../shared/ui';
import { ProofImage } from '../../features/collection/components/ProofImage';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const qc = useQueryClient();

  const [proofImage, setProofImage] = useState<string | null>(null);
  const [quality, setQuality] = useState<SortingQuality | null>(null);
  // Màn này nằm trong thanh tab nên được giữ lại giữa các lần mở: đổi sang
  // việc khác thì xoá ảnh / đánh giá của việc trước.
  useEffect(() => {
    setProofImage(null);
    setQuality(null);
  }, [id]);

  const { data: task, isLoading, error, refetch } = useQuery({
    queryKey: ['collection_task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*, devices(name, area, code, owner_id)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as TaskWithDevice;
    },
    enabled: !!id,
  });

  const isHouseholdBin = !!task?.devices?.owner_id;

  // Mở ứng dụng camera của điện thoại để chụp ảnh bằng chứng dọn rác
  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền Camera', 'Hãy cho phép ứng dụng dùng camera để chụp ảnh nghiệm thu.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]?.uri) {
      setProofImage(result.assets[0].uri);
    }
  };

  // Chọn ảnh từ thư viện (hỗ trợ khi test trên máy ảo không có camera cứng)
  const handlePickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setProofImage(result.assets[0].uri);
    }
  };

  function afterChange() {
    qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    qc.invalidateQueries({ queryKey: ['admin_tasks'] });
    qc.invalidateQueries({ queryKey: ['collector_route_tasks'] });
    return refetch();
  }

  // Nhận việc thu gom
  const claim = useMutation({
    mutationFn: async () => {
      if (!id || !userId) throw new Error('Chưa đăng nhập');
      await claimTask(id, userId);
    },
    onSuccess: async () => {
      const { data } = await afterChange();
      if (data?.assignee_id === userId) {
        Alert.alert('Thành công', 'Bạn đã nhận nhiệm vụ thu gom này.');
      } else {
        Alert.alert('Chưa nhận được', 'Việc này đã có người nhận, hoặc chưa có mạng để gửi lên.');
      }
    },
    onError: (err: unknown) => Alert.alert('Lỗi', err instanceof Error ? err.message : String(err)),
  });

  // Hoàn tất công việc thu gom (kèm ảnh chụp bằng chứng nghiệm thu)
  const complete = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Không tìm thấy công việc');
      if (!proofImage) {
        throw new Error('Vui lòng chụp ảnh thùng rác sạch làm bằng chứng nghiệm thu trước khi hoàn tất!');
      }
      if (isHouseholdBin && !quality) {
        throw new Error('Vui lòng đánh giá hộ gia đình đã phân loại đúng hay còn lẫn rác.');
      }
      return completeTask(id, proofImage, quality ?? undefined);
    },
    onSuccess: async (uploaded) => {
      await afterChange();
      Alert.alert(
        'Nghiệm thu thành công',
        uploaded
          ? 'Công việc đã được xác nhận hoàn tất kèm ảnh bằng chứng.'
          : 'Công việc đã hoàn tất. Ảnh chưa tải lên server được nên chỉ xem được trên máy này.',
        [{ text: 'Về danh sách', onPress: () => router.back() }],
      );
    },
    onError: (err: unknown) => Alert.alert('Lỗi', err instanceof Error ? err.message : String(err)),
  });

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.danger, textAlign: 'center', padding: 24 }}>
          Không tải được công việc: {error instanceof Error ? error.message : String(error)}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>‹ Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAssignee = task.assignee_id === userId;
  const canComplete = !!proofImage && (!isHouseholdBin || !!quality);

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Chi tiết công việc</Text>
      </GradientView>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={{ gap: 10 }}>
          {/* Tên thùng rác & trạng thái */}
          <View style={styles.row}>
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceTitle}>{task.devices?.name ?? 'Thùng rác'}</Text>
              <Text style={styles.deviceArea}>Vị trí: {task.devices?.area || 'Khuôn viên trường'}</Text>
            </View>
            <StatusBadge label={TASK_STATUS_LABEL[task.status]} tone={TASK_STATUS_TONE[task.status]} />
          </View>

          {/* Ca trực & Ngày */}
          {(task.shift || task.scheduled_date) && (
            <View style={styles.metaRow}>
              {task.scheduled_date && (
                <View style={styles.metaBadge}>
                  <Ionicons name="calendar-outline" size={13} color={colors.primaryDark} />
                  <Text style={styles.metaBadgeText}>{task.scheduled_date}</Text>
                </View>
              )}
              {task.shift && (
                <View style={styles.metaBadge}>
                  <Ionicons name="time-outline" size={13} color={colors.primaryDark} />
                  <Text style={styles.metaBadgeText}>{SHIFT_SHORT_LABELS[task.shift] || task.shift}</Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.meta}>Tạo lúc: {new Date(task.created_at).toLocaleString('vi-VN')}</Text>
          {task.completed_at && (
            <Text style={styles.meta}>Hoàn tất lúc: {new Date(task.completed_at).toLocaleString('vi-VN')}</Text>
          )}
          {task.note && (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Chỉ đạo / Ghi chú:</Text>
              <Text style={styles.noteText}>{task.note}</Text>
            </View>
          )}
        </Card>

        <View style={{ height: 20 }} />
        <SectionTitle>Thực hiện nhiệm vụ</SectionTitle>

        {/* 1. Trạng thái Chờ nhận (Pending) */}
        {task.status === 'pending' && !task.assignee_id && (
          <Pressable onPress={() => claim.mutate()} disabled={claim.isPending} style={claim.isPending && styles.disabled}>
            <GradientView style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {claim.isPending ? 'Đang nhận việc...' : 'Nhận việc thu gom này'}
              </Text>
            </GradientView>
          </Pressable>
        )}

        {/* 2. Trạng thái Đang xử lý (In Progress) */}
        {task.status === 'in_progress' && isAssignee && (
          <View style={{ gap: 12 }}>
            <Text style={styles.instructionText}>
              Sau khi thu gom sạch sẽ thùng rác, vui lòng chụp ảnh bằng chứng nghiệm thu để hoàn tất:
            </Text>

            {/* Khung chụp ảnh bằng chứng */}
            <View style={styles.photoContainer}>
              {proofImage ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: proofImage }} style={styles.previewImage} />
                  <Pressable style={styles.retakeBtn} onPress={handleTakePhoto}>
                    <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                    <Text style={styles.retakeText}>Chụp lại</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.photoActionRow}>
                  <Pressable style={styles.cameraBtn} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.cameraBtnText}>Chụp ảnh bằng chứng</Text>
                    <Text style={styles.cameraBtnSub}>Mở máy ảnh điện thoại</Text>
                  </Pressable>
                  <Pressable style={styles.galleryBtn} onPress={handlePickFromLibrary}>
                    <Ionicons name="images-outline" size={24} color={colors.textMuted} />
                    <Text style={styles.galleryBtnText}>Chọn từ thư viện</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Thùng của hộ gia đình: đánh giá chất lượng phân loại */}
            {isHouseholdBin && (
              <View style={{ gap: 8 }}>
                <Text style={styles.instructionText}>
                  Thùng của hộ gia đình — đánh giá việc phân loại (đúng được +{GOOD_SORTING_BONUS} điểm):
                </Text>
                <View style={styles.qualityRow}>
                  <QualityChip
                    label="Phân loại đúng"
                    icon="checkmark-circle"
                    active={quality === 'good'}
                    color={colors.success}
                    onPress={() => setQuality('good')}
                  />
                  <QualityChip
                    label="Còn lẫn rác"
                    icon="alert-circle"
                    active={quality === 'mixed'}
                    color={colors.warning}
                    onPress={() => setQuality('mixed')}
                  />
                </View>
              </View>
            )}

            {/* Nút Hoàn tất */}
            <Pressable
              onPress={() => complete.mutate()}
              disabled={complete.isPending || !canComplete}
              style={[
                complete.isPending && styles.disabled,
                !canComplete && { opacity: 0.5 },
              ]}
            >
              <GradientView style={styles.primaryButton}>
                {complete.isPending ? (
                  <ActivityIndicator color={colors.textOnPrimary} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Xác nhận hoàn tất thu gom</Text>
                )}
              </GradientView>
            </Pressable>
          </View>
        )}

        {/* 3. Trạng thái Đã hoàn tất (Done) */}
        {task.status === 'done' && (
          <View style={{ gap: 12 }}>
            <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success }}>
              <View style={styles.doneHeaderRow}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={styles.doneTitleText}>Công việc đã hoàn tất nghiệm thu</Text>
              </View>
              {task.sorting_quality && (
                <Text style={styles.qualityResult}>
                  {task.sorting_quality === 'good'
                    ? `Hộ gia đình phân loại đúng (+${GOOD_SORTING_BONUS} điểm)`
                    : 'Hộ gia đình còn lẫn rác — đã gửi nhắc nhở'}
                </Text>
              )}
            </Card>

            {/* Hiển thị ảnh bằng chứng nghiệm thu */}
            {(task.proof_photo_url || proofImage) && (
              <View style={styles.proofImageBox}>
                <Text style={styles.proofImageLabel}>Ảnh bằng chứng nghiệm thu đã gửi Quản trị:</Text>
                <ProofImage source={(task.proof_photo_url || proofImage)!} style={styles.doneProofImage} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 6,
    marginBottom: 8,
  },
  backText: { color: colors.textOnPrimary, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textOnPrimary },
  body: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deviceHeader: { flex: 1, marginRight: 8 },
  deviceTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  deviceArea: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primaryDark },
  meta: { color: colors.textMuted, fontSize: 12 },
  noteBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
  },
  noteLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  noteText: { fontSize: 12, color: colors.text, marginTop: 2 },
  instructionText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  photoContainer: {
    backgroundColor: '#FAFBF9',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photoActionRow: { padding: 16, gap: 12 },
  cameraBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  cameraBtnText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  cameraBtnSub: { fontSize: 11, color: colors.textMuted },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    gap: 6,
  },
  galleryBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  previewContainer: { position: 'relative', width: '100%', height: 220 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  retakeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  retakeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  primaryButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: colors.textOnPrimary, textAlign: 'center', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5 },
  doneHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneTitleText: { color: colors.success, fontWeight: '700', fontSize: 14 },
  qualityResult: { marginTop: 6, fontSize: 13, color: colors.text },
  qualityRow: { flexDirection: 'row', gap: 10 },
  qualityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  qualityChipText: { fontWeight: '700', fontSize: 14 },
  proofImageBox: { gap: 6, marginTop: 4 },
  proofImageLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  doneProofImage: { width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
});

function QualityChip({
  label,
  icon,
  active,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.qualityChip, active && { borderColor: color, backgroundColor: `${color}1A` }]}
    >
      <Ionicons name={icon} size={18} color={active ? color : colors.textMuted} />
      <Text style={[styles.qualityChipText, { color: active ? color : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}
