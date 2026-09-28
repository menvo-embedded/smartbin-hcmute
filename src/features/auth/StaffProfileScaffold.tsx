import { useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './store';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ROLE_LABELS } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { Card, StatusBadge, ScreenHeader } from '../../shared/ui';

interface Props {
  title: string;
  subtitle: string;
  /** Nội dung riêng của vai trò (thống kê công việc, tổng quan hệ thống...). */
  children?: ReactNode;
}

/**
 * Khung tab "Cá nhân" cho nhân viên thu gom và quản lý: thông tin tài khoản,
 * phần nội dung riêng của vai trò, đổi mật khẩu và đăng xuất.
 */
export function StaffProfileScaffold({ title, subtitle, children }: Props) {
  const profile = useAuth((s) => s.profile);
  const email = useAuth((s) => s.session?.user.email ?? '');
  const signOut = useAuth((s) => s.signOut);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} subtitle={subtitle} />

      <ScrollView style={styles.body} contentContainerStyle={{ gap: 20, paddingVertical: 20 }}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Chưa đặt tên'}</Text>
          {!!email && <Text style={styles.email}>{email}</Text>}
          {/* Bọc View: StatusBadge tự căn trái (alignSelf), bọc lại để nằm giữa. */}
          {profile && (
            <View>
              <StatusBadge label={ROLE_LABELS[profile.role]} tone="success" icon="shield-checkmark" />
            </View>
          )}
        </View>

        {children}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            description="Cập nhật mật khẩu để bảo vệ tài khoản"
            onPress={() => setPasswordModalOpen(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="log-out-outline"
            label="Đăng xuất"
            description="Thoát khỏi tài khoản hiện tại"
            danger
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
        </Card>
      </ScrollView>

      <ChangePasswordModal visible={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={[styles.settingsIcon, danger && styles.settingsIconDanger]}>
        <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingsLabel, danger && { color: colors.danger }]}>{label}</Text>
        <Text style={styles.settingsDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? colors.danger : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: 20 },
  identity: { alignItems: 'center', gap: 6 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconDanger: { backgroundColor: colors.dangerBg },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  settingsDescription: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
