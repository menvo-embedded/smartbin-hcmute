import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../core/supabase/client';
import { SHIFT_SHORT_LABELS, type TaskShift } from '../admin/types';
import { colors } from '../../theme/colors';
import { Card } from '../../shared/ui';

interface OpenTask {
  id: string;
  status: 'pending' | 'in_progress';
  priority: 'routine' | 'urgent';
  shift: TaskShift;
  scheduled_date: string;
  note: string | null;
}

function formatDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/**
 * Lịch thu gom kế tiếp của thùng nhà mình — do hệ thống tự lên khi thùng đạt
 * 60% (hoặc dự báo sắp đầy), người dùng không phải gọi ai.
 */
export function NextPickupCard({ deviceId }: { deviceId: string }) {
  const { data: task } = useQuery({
    queryKey: ['household_next_pickup', deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('id, status, priority, shift, scheduled_date, note')
        .eq('device_id', deviceId)
        .neq('status', 'done')
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OpenTask | null;
    },
  });

  const urgent = task?.priority === 'urgent';
  return (
    <Card style={[styles.card, urgent && styles.cardUrgent]}>
      <View style={[styles.icon, urgent && styles.iconUrgent]}>
        <Ionicons name={task ? 'car' : 'checkmark-circle'} size={20} color={urgent ? colors.danger : colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        {task ? (
          <>
            <Text style={styles.title}>
              Thu gom {SHIFT_SHORT_LABELS[task.shift].toLowerCase()} {formatDate(task.scheduled_date)}
              {urgent ? ' · khẩn' : ''}
            </Text>
            <Text style={styles.desc}>
              {task.status === 'in_progress' ? 'Đã có nhân viên nhận việc' : 'Đang chờ nhân viên'}
              {task.note ? ` — ${task.note}` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Chưa cần thu gom</Text>
            <Text style={styles.desc}>Hệ thống sẽ tự đặt lịch khi thùng đạt 60%</Text>
          </>
        )}
      </View>
      <View style={styles.autoTag}>
        <Text style={styles.autoTagText}>🤖 Tự động</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardUrgent: { borderColor: colors.danger, borderWidth: 1 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUrgent: { backgroundColor: colors.dangerBg },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  desc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  autoTag: { backgroundColor: '#ccfbf1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  autoTagText: { fontSize: 11, fontWeight: '700', color: '#0f766e' },
});
