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
        <View>
          <Text style={styles.title}>Hộ gia đình</Text>
          <Text style={styles.subtitle}>Quản lý thông tin và thành viên</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => Alert.alert('Thông báo', 'Chưa có thông báo mới.')}
        >
          <View style={styles.bellWrap}>
            <Ionicons name="notifications-outline" size={22} color={colors.textOnPrimary} />
            <View style={styles.bellDot} />
          </View>
        </Pressable>
      </GradientView>

      <View style={styles.body}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Chưa đặt tên'}</Text>
          {profile && <StatusBadge label={ROLE_LABELS[profile.role]} tone="success" icon="people" />}
        </View>

        <View style={{ height: 20 }} />

        <GradientView style={styles.pointsCard}>
          <Ionicons
            name="trophy"
            size={90}
            color="rgba(255,255,255,0.15)"
            style={styles.pointsWatermark}
          />
          <Text style={styles.pointsLabel}>Điểm tích luỹ của nhà bạn</Text>
          <Text style={styles.pointsValue}>{points} điểm</Text>
          <View style={{ height: 10 }} />
          <ProgressBar value={points / nextTier} color={colors.textOnPrimary} trackColor="rgba(255,255,255,0.3)" />
          <View style={styles.pointsHintRow}>
            <Text style={styles.pointsHint}>Còn {pointsToNextTier} điểm để lên hạng tiếp theo</Text>
            <Text style={styles.pointsHint}>
              {points}/{nextTier}
            </Text>
          </View>
        </GradientView>

        <View style={{ height: 20 }} />

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            description="Cập nhật mật khẩu để bảo vệ tài khoản"
            onPress={() => setPasswordModalOpen(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="globe-outline"
            label="Ngôn ngữ: Tiếng Việt"
            description="Thay đổi ngôn ngữ ứng dụng"
            onPress={() => Alert.alert('Ngôn ngữ', 'Ứng dụng hiện chỉ hỗ trợ Tiếng Việt.')}
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
      </View>

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
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconWrap, danger && styles.settingsIconWrapDanger]}>
          <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingsLabel, danger && { color: colors.danger }]}>{label}</Text>
          <Text style={styles.settingsDescription}>{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? colors.danger : colors.textMuted} />
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
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.primaryLight,
    marginTop: 4,
  },
  bellWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  body: {
    paddingHorizontal: 20,
  },
  identity: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
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
    overflow: 'hidden',
  },
  pointsWatermark: {
    position: 'absolute',
    top: -10,
    right: -10,
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
  pointsHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  pointsHint: {
    color: colors.primaryLight,
    fontSize: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  settingsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconWrapDanger: {
    backgroundColor: colors.dangerBg,
  },
  settingsLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  settingsDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
