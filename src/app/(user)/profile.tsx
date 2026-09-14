import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../features/auth/store';
import { supabase } from '../../core/supabase/client';
import { ROLE_LABELS } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { Card, ProgressBar, StatusBadge, GradientView } from '../../shared/ui';

const POINTS_PER_TIER = 100;

export default function Profile() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const points = profile?.points ?? 0;
  const nextTier = (Math.floor(points / POINTS_PER_TIER) + 1) * POINTS_PER_TIER;
  const pointsToNextTier = nextTier - points;

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.title}>Cá nhân</Text>
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
            <Text style={styles.pointsLabel}>Điểm thưởng của bạn</Text>
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

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPassword('');
    setConfirm('');
    setError(null);
  }

  async function onSubmit() {
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    reset();
    onClose();
    Alert.alert('Thành công', 'Đã đổi mật khẩu.');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

          <TextInput
            placeholder="Mật khẩu mới"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <TextInput
            placeholder="Xác nhận mật khẩu"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            style={styles.input}
          />

          {error && <Text style={styles.modalError}>{error}</Text>}

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.modalCancel]}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={styles.modalCancelText}>Huỷ</Text>
            </Pressable>
            <Pressable style={styles.modalConfirmWrapper} onPress={onSubmit} disabled={busy}>
              <GradientView style={styles.modalButton}>
                {busy ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.modalConfirmText}>Lưu</Text>}
              </GradientView>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    color: colors.text,
  },
  modalError: {
    color: colors.danger,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: colors.neutralBg,
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: '600',
  },
  modalConfirmWrapper: {
    flex: 1,
  },
  modalConfirmText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});
