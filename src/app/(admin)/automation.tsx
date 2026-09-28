import { View, StyleSheet } from 'react-native';
import { useAdminDispatch } from '../../features/admin/hooks/useAdminDispatch';
import { AdminHeader } from '../../features/admin/components/AdminHeader';
import { AutomationPanel } from '../../features/admin/components/AutomationPanel';
import { colors } from '../../theme/colors';

/** Tab Tự động: bật/tắt quy tắc tự vận hành, ca trực, nhật ký tự động. */
export default function Automation() {
  const { tasks, collectors } = useAdminDispatch();
  return (
    <View style={styles.screen}>
      <AdminHeader title="Tự động hoá" subtitle="Hệ thống tự lên lịch, tự giao việc, tự cảnh báo" showDemo />
      <View style={styles.body}>
        <AutomationPanel tasks={tasks ?? []} collectors={collectors} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: 20 },
});
