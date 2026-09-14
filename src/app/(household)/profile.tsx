import { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../features/auth/store';
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal';
import { ROLE_LABELS } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { Card, ProgressBar, StatusBadge, GradientView } from '../../shared/ui';

const POINTS_PER_TIER = 100;

export default function HouseholdProfile() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const points = profile?.points ?? 0;
  const nextTier = (Math.floor(points / POINTS_PER_TIER) + 1) * POINTS_PER_TIER;
  const pointsToNextTier = nextTier - points;

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Text style={styles.title}>Hộ gia đình</Text>
      </GradientView>

      <View style={styles.body}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Chưa đặt tên'}</Text>
          {profile && <StatusBadge label={ROLE_LABELS[profile.role]} tone="success" />}
        </View>

        <View style={{ height: 20 }} />

        <GradientView style={styles.pointsCard}>
          <View style={styles.pointsLabelRow}>
            <Ionicons name="leaf-outline" size={16} color={colors.textOnPrimary} />
            <Text style={styles.pointsLabel}>Điểm tích luỹ của nhà bạn</Text>
          </View>
          <Text style={styles.pointsValue}>{points} điểm</Text>
          <View style={{ height: 10 }} />
          <ProgressBar value={points / nextTier} color={colors.textOnPrimary} trackColor="rgba(255,255,255,0.3)" />
          <Text style={styles.pointsHint}>Còn {pointsToNextTier} điểm để lên hạng tiếp theo</Text>
        </GradientView>

        <View style={{ height: 20 }} />

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => setPasswordModalOpen(true)} />
          <View style={styles.divider} />
          <SettingsRow
            icon="globe-outline"
            label="Ngôn ngữ: Tiếng Việt"
            onPress={() => Alert.alert('Ngôn ngữ', 'Ứng dụng hiện chỉ hỗ trợ Tiếng Việt.')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="log-out-outline"
            label="Đăng xuất"
            danger
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
        </Card>
      </View>

      <ChangePasswordModal visible={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsLeft}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.textMuted} />
        <Text style={[styles.settingsLabel, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      <Text style={[styles.chevron, danger && { color: colors.danger }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  body: {
    paddingHorizontal: 20,
  },
  identity: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  pointsCard: {
    borderRadius: 16,
    padding: 18,
  },
  pointsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsLabel: {
    color: colors.primaryLight,
    fontSize: 13,
  },
  pointsValue: {
    color: colors.textOnPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  pointsHint: {
    color: colors.primaryLight,
    fontSize: 12,
    marginTop: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsLabel: {
    color: colors.text,
    fontSize: 14,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
