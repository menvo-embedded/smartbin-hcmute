import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from '../../features/collection/taskStatus';
import { MOCK_TASKS, type TaskWithDevice } from '../../features/collection/mockTasks';
import { colors } from '../../theme/colors';
import { Card, StatusBadge, SectionTitle, GradientView } from '../../shared/ui';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.session?.user.id) ?? 'user-2';
  const qc = useQueryClient();
  const isMock = !!id && id.startsWith('mock-');

  const [proofImage, setProofImage] = useState<string | null>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ['collection_task', id],
    queryFn: async () => {
      if (isMock) {
        const cachedList = qc.getQueryData<TaskWithDevice[]>(['collection_tasks']);
        return (
          cachedList?.find((t) => t.id === id) ??
          MOCK_TASKS.find((t) => t.id === id) ??
          MOCK_TASKS[0]
        );
      }
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as TaskWithDevice;
    },
    enabled: !!id,
  });

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền mở máy ảnh để chụp ảnh bằng chứng!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setProofImage(result.assets[0].uri);
    }
  };

  const claim = useMutation({
    mutationFn: async () => {
      if (isMock) return;
      const { error } = await supabase
        .from('collection_tasks')
        .update({ status: 'in_progress', assignee_id: userId } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (isMock) {
        qc.setQueryData<TaskWithDevice>(['collection_task', id], (old: TaskWithDevice | undefined) =>
          old ? { ...old, status: 'in_progress', assignee_id: userId } : old
        );
        qc.setQueryData<TaskWithDevice[]>(['collection_tasks'], (old: TaskWithDevice[] | undefined) =>
          old?.map((t: TaskWithDevice) => (t.id === id ? { ...t, status: 'in_progress', assignee_id: userId } : t))
        );
        return;
      }
      qc.invalidateQueries({ queryKey: ['collection_task', id] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
  });

  const complete = useMutation({
    mutationFn: async () => {
      if (!proofImage && isMock) {
        throw new Error('Vui lòng chụp ảnh bằng chứng trước khi hoàn tất!');
      }

      if (isMock) return;

      const { error } = await supabase
        .from('collection_tasks')
        .update({ 
          status: 'done', 
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (isMock) {
        const completedAt = new Date().toISOString();
        qc.setQueryData<TaskWithDevice>(['collection_task', id], (old: TaskWithDevice | undefined) =>
          old ? { ...old, status: 'done', completed_at: completedAt } : old
        );
        qc.setQueryData<TaskWithDevice[]>(['collection_tasks'], (old: TaskWithDevice[] | undefined) =>
          old?.map((t: TaskWithDevice) => (t.id === id ? { ...t, status: 'done', completed_at: completedAt } : t))
        );
        return;
      }
      qc.invalidateQueries({ queryKey: ['collection_task', id] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err.message || 'Không thể hoàn thành công việc');
    }
  });

  if (isLoading || !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAssignee = task.assignee_id === userId || isMock;

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>← Danh sách việc</Text>
        </Pressable>
        <Text style={styles.title}>Chi tiết công việc</Text>
      </GradientView>

      <View style={styles.body}>
        <Card style={{ gap: 8 }}>
          <View style={styles.row}>
            <Text style={styles.label}>Trạng thái</Text>
            <StatusBadge label={TASK_STATUS_LABEL[task.status]} tone={TASK_STATUS_TONE[task.status]} />
          </View>
          <Text style={styles.meta}>
            Tạo lúc: {new Date(task.created_at).toLocaleString('vi-VN')}
          </Text>
          {task.completed_at && (
            <Text style={styles.meta}>
              Hoàn tất lúc: {new Date(task.completed_at).toLocaleString('vi-VN')}
            </Text>
          )}
          {task.note && <Text style={styles.meta}>Ghi chú: {task.note}</Text>}
        </Card>

        <View style={{ height: 20 }} />
        <SectionTitle>Hành động</SectionTitle>

        {task.status === 'pending' && !task.assignee_id && (
          <Pressable onPress={() => claim.mutate()} disabled={claim.isPending} style={claim.isPending && styles.disabled}>
            <GradientView style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {claim.isPending ? 'Đang nhận việc...' : 'Nhận việc'}
              </Text>
            </GradientView>
          </Pressable>
        )}

        {task.status === 'in_progress' && isAssignee && (
          <View style={{ gap: 12 }}>
            <Pressable onPress={handlePickImage} style={styles.photoPicker}>
              {proofImage ? (
                <Image source={{ uri: proofImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={colors.primary} />
                  <Text style={styles.photoText}>Chụp ảnh bằng chứng thu gom</Text>
                </View>
              )}
            </Pressable>

            <Pressable 
              onPress={() => {
                if (!proofImage) {
                  Alert.alert('Chưa có ảnh', 'Bạn cần chụp ảnh bằng chứng sau khi dọn rác xong!');
                  return;
                }
                complete.mutate();
              }} 
              disabled={complete.isPending} 
              style={[complete.isPending && styles.disabled, !proofImage && { opacity: 0.6 }]}
            >
              <GradientView style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {complete.isPending ? 'Đang xác nhận...' : 'Xác nhận hoàn tất'}
                </Text>
              </GradientView>
            </Pressable>
          </View>
        )}

        {task.status === 'done' && (
          <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success }}>
            <Text style={{ color: colors.success, fontWeight: '600', textAlign: 'center' }}>
              ✓ Công việc đã hoàn tất
            </Text>
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 6, marginBottom: 8 },
  backText: { color: colors.textOnPrimary, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textOnPrimary },
  body: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textMuted, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 13 },
  primaryButton: { padding: 14, borderRadius: 10 },
  primaryButtonText: { color: colors.textOnPrimary, textAlign: 'center', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  photoPicker: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.card,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: { alignItems: 'center', gap: 6 },
  photoText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
});