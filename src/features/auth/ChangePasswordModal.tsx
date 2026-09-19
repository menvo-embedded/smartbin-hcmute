import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../../core/supabase/client';
import { colors } from '../../theme/colors';
import { GradientView } from '../../shared/ui';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal đổi mật khẩu dùng chung cho mọi vai trò (public lẫn hộ gia đình).
 * Tách ra từ logic từng trùng lặp trong từng màn hồ sơ.
 */
export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
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
