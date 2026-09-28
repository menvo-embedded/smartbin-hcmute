import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../core/supabase/client';
import { formatRelativeTime } from '../../core/utils/time';
import { GOOD_SORTING_BONUS } from '../collection/taskActions';
import { colors } from '../../theme/colors';
import { Card, SectionTitle } from '../../shared/ui';

interface RatedTask {
  id: string;
  sorting_quality: 'good' | 'mixed';
  completed_at: string;
}

const MIXED_TIP =
  'Mẹo: vỏ trái cây, thức ăn thừa: Hữu cơ; chai nhựa, lon, giấy sạch: Tái chế; ' +
  'túi nilon bẩn, sành sứ, tã: Vô cơ.';

/** Đánh giá phân loại do nhân viên thu gom chấm cho thùng nhà mình. */
export function CollectionFeedback({ deviceId }: { deviceId: string }) {
  const { data: tasks } = useQuery({
    queryKey: ['collection_feedback', deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('id, sorting_quality, completed_at')
        .eq('device_id', deviceId)
        .not('sorting_quality', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as unknown as RatedTask[];
    },
  });

  if (!tasks || tasks.length === 0) return null;
  const latest = tasks[0];
  const good = latest.sorting_quality === 'good';

  return (
    <View style={{ gap: 10 }}>
      <SectionTitle>Đánh giá từ nhân viên thu gom</SectionTitle>
      <Card style={[styles.card, { borderColor: good ? colors.success : colors.warning }]}>
        <View style={styles.row}>
          <Ionicons
            name={good ? 'checkmark-circle' : 'alert-circle'}
            size={26}
            color={good ? colors.success : colors.warning}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {good ? `Phân loại đúng! +${GOOD_SORTING_BONUS} điểm` : 'Lần thu gom gần nhất còn lẫn rác'}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(latest.completed_at)}</Text>
          </View>
        </View>
        {!good && <Text style={styles.tip}>{MIXED_TIP}</Text>}
        {tasks.length > 1 && (
          <Text style={styles.history}>
            Các lần trước:{' '}
            {tasks
              .slice(1)
              .map((t) => (t.sorting_quality === 'good' ? '✅' : '⚠️'))
              .join(' ')}
          </Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tip: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  history: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
