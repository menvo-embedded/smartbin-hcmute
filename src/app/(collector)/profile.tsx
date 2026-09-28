import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../core/supabase/client';
import { toLocalDateString } from '../../core/utils/time';
import { useAuth } from '../../features/auth/store';
import { StaffProfileScaffold } from '../../features/auth/StaffProfileScaffold';
import type { TaskWithDevice } from '../../features/collection/types';
import { colors } from '../../theme/colors';
import { Card, StatCard, SectionTitle } from '../../shared/ui';

/** Tab Cá nhân của nhân viên thu gom: trạng thái trực, kết quả làm việc, tài khoản. */
export default function CollectorProfile() {
  const userId = useAuth((s) => s.session?.user.id ?? null);
  const onDuty = useAuth((s) => s.profile?.on_duty !== false);

  // Cùng khoá với màn Công việc → dùng chung cache, không tải lại.
  const { data: tasks } = useQuery({
    queryKey: ['collection_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*, devices(name, area, code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TaskWithDevice[];
    },
  });

  const mine = (tasks ?? []).filter((t) => t.assignee_id === userId);
  const today = toLocalDateString();
  const todayMine = mine.filter((t) => (t.scheduled_date || t.created_at.slice(0, 10)) === today);
  const doneToday = todayMine.filter((t) => t.status === 'done').length;
  const doneTotal = mine.filter((t) => t.status === 'done').length;
  const open = mine.filter((t) => t.status !== 'done').length;

  return (
    <StaffProfileScaffold title="Cá nhân" subtitle="Tài khoản nhân viên thu gom">
      <Card style={[styles.dutyCard, !onDuty && styles.dutyOff]}>
        <View style={[styles.dot, { backgroundColor: onDuty ? colors.success : colors.neutral }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.dutyTitle}>{onDuty ? 'Đang trực' : 'Đang nghỉ ca'}</Text>
          <Text style={styles.dutyDesc}>
            {onDuty
              ? 'Hệ thống có thể tự giao việc mới cho bạn.'
              : 'Bạn sẽ không nhận việc tự động. Quản lý bật lại khi vào ca.'}
          </Text>
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <SectionTitle>Kết quả làm việc</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <StatCard label="Hôm nay" value={`${doneToday}/${todayMine.length}`} hint="thùng đã dọn" />
          <StatCard label="Đang phụ trách" value={String(open)} hint="việc chưa xong" />
          <StatCard label="Tổng đã hoàn tất" value={String(doneTotal)} />
        </ScrollView>
      </View>
    </StaffProfileScaffold>
  );
}

const styles = StyleSheet.create({
  dutyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.success, borderWidth: 1 },
  dutyOff: { borderColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dutyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  dutyDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
