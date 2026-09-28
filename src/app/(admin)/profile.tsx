import { View, ScrollView } from 'react-native';
import { toLocalDateString } from '../../core/utils/time';
import { useAdminDispatch } from '../../features/admin/hooks/useAdminDispatch';
import { useAdminDevices, isDeviceFull } from '../../features/admin/hooks/useAdminDevices';
import { StaffProfileScaffold } from '../../features/auth/StaffProfileScaffold';
import { StatCard, SectionTitle } from '../../shared/ui';

/** Tab Cá nhân của quản lý: tài khoản + tổng quan hệ thống trong ngày. */
export default function AdminProfile() {
  const { tasks, collectors } = useAdminDispatch();
  const { data: devices } = useAdminDevices();

  const today = toLocalDateString();
  const todayTasks = (tasks ?? []).filter((t) => (t.scheduled_date || t.created_at.slice(0, 10)) === today);
  const doneToday = todayTasks.filter((t) => t.status === 'done').length;
  const onDuty = collectors.filter((c) => c.on_duty !== false).length;

  return (
    <StaffProfileScaffold title="Cá nhân" subtitle="Tài khoản quản trị hệ thống">
      <View style={{ gap: 10 }}>
        <SectionTitle>Tổng quan hôm nay</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <StatCard label="Thùng rác" value={String(devices?.length ?? 0)} hint={`${devices?.filter(isDeviceFull).length ?? 0} thùng cần thu gom`} />
          <StatCard label="Nhân viên đang trực" value={`${onDuty}/${collectors.length}`} />
          <StatCard label="Việc hôm nay" value={`${doneToday}/${todayTasks.length}`} hint="đã hoàn tất" />
        </ScrollView>
      </View>
    </StaffProfileScaffold>
  );
}
