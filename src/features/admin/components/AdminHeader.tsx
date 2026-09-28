import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../shared/ui';
import { NotificationBell } from '../../notifications/NotificationBell';
import { LiveIndicator } from './LiveIndicator';
import { DemoControlModal } from './DemoControlModal';
import { useAdminLastUpdate } from '../hooks/useAdminRealtime';
import { useAdminDevices } from '../hooks/useAdminDevices';
import { useAdminDispatch } from '../hooks/useAdminDispatch';
import { colors } from '../../../theme/colors';

interface Props {
  title: string;
  subtitle?: string;
  /** Hiện nút "Mô phỏng Demo" (tab Thùng rác và Tự động). */
  showDemo?: boolean;
}

/** Đầu mỗi tab admin: tiêu đề + chuông thông báo, chỉ báo realtime, nút mô phỏng demo. */
export function AdminHeader({ title, subtitle, showDemo }: Props) {
  const lastUpdate = useAdminLastUpdate((s) => s.lastUpdate);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <>
      <ScreenHeader title={title} subtitle={subtitle} right={<NotificationBell />} />
      <View style={styles.bar}>
        <LiveIndicator lastUpdate={lastUpdate} />
        {showDemo && (
          <Pressable style={styles.demoBtn} onPress={() => setDemoOpen(true)} hitSlop={4}>
            <Ionicons name="flask" size={16} color={colors.primaryDark} />
            <Text style={styles.demoText}>Mô phỏng Demo Đồ án (Thùng đầy / Reset)</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
          </Pressable>
        )}
      </View>
      {showDemo && <DemoModal visible={demoOpen} onClose={() => setDemoOpen(false)} />}
    </>
  );
}

function DemoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data: devices } = useAdminDevices();
  const { simulateBinFill, resetDeviceBins } = useAdminDispatch();
  return (
    <DemoControlModal
      visible={visible}
      devices={devices ?? []}
      onClose={onClose}
      onSimulateFill={async (binId, fillLevel) => {
        await simulateBinFill.mutateAsync({ binId, fillLevel });
      }}
      onResetBins={async (deviceId) => {
        await resetDeviceBins.mutateAsync({ deviceId });
      }}
    />
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  demoText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, flex: 1, marginHorizontal: 8 },
});
