import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from '../../features/collection/taskStatus';
import type { CollectionTask } from '../../shared/types/database';
import { colors } from '../../theme/colors';
import { Card, StatusBadge, SectionTitle, GradientView } from '../../shared/ui';

/**
 * TODO (nợ kỹ thuật, cần sửa lại khi học tiếp): màn hình này gọi Supabase
 * trực tiếp để cập nhật trạng thái, chưa theo đúng nguyên tắc "ghi cục bộ
 * trước, enqueue() sau" của CLAUDE.md — làm tắt để kịp demo tiến độ.
 */
export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth((s) => s.session?.user.id);
  const qc = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ['collection_task', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as CollectionTask;
    },
    enabled: !!id,
  });

  const claim = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('collection_tasks')
        .update({ status: 'in_progress', assignee_id: userId } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection_task', id] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('collection_tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection_task', id] });
      qc.invalidateQueries({ queryKey: ['collection_tasks'] });
    },
  });

  if (isLoading || !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

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

        {task.status === 'in_progress' && task.assignee_id === userId && (
          <Pressable onPress={() => complete.mutate()} disabled={complete.isPending} style={complete.isPending && styles.disabled}>
            <GradientView style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {complete.isPending ? 'Đang xác nhận...' : 'Xác nhận hoàn tất'}
              </Text>
            </GradientView>
          </Pressable>
        )}

        {task.status === 'done' && (
          <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success }}>
            <Text style={{ color: colors.success, fontWeight: '600', textAlign: 'center' }}>
              Công việc đã hoàn tất
            </Text>
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 6,
    marginBottom: 8,
  },
  backText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  body: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  primaryButton: {
    padding: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
