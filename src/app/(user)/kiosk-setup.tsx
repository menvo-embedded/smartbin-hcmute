import { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useKioskConfig } from '../../features/devices/kioskConfigStore';
import { colors } from '../../theme/colors';
import { Card, SectionTitle, GradientView } from '../../shared/ui';

export default function KioskSetupScreen() {
  const currentBinId = useKioskConfig((s) => s.binId);
  const setBinId = useKioskConfig((s) => s.setBinId);
  const [input, setInput] = useState(currentBinId ?? 'BIN-UTE-01');
  const [busy, setBusy] = useState(false);

  function onSave() {
    const trimmed = input.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Vui lòng nhập ID thùng rác!');
      return;
    }
    setBusy(true);
    // Lưu vào store dùng chung — idle.tsx (và sau này các màn kiosk
    // khác) đọc từ đây thay vì mỗi màn tự giữ state riêng.
    setBinId(trimmed);
    setBusy(false);
    router.replace('/(user)/idle');
  }

  return (
    <View style={styles.container}>
      <SectionTitle>Cấu hình Kiosk</SectionTitle>
      <Text style={styles.hint}>Thiết lập thông tin thùng rác và kết nối BLE</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Mã thùng rác (Bin ID):</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập mã thùng rác..."
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Chế độ giả lập BLE (Mock BLE):</Text>
          <Text style={styles.statusValue}>Đang bật (EXPO_PUBLIC_MOCK_BLE=1)</Text>
        </View>

        <Pressable onPress={onSave} disabled={busy}>
          <GradientView style={[styles.button, busy && styles.buttonDisabled]}>
            {busy ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Lưu cấu hình & Bắt đầu</Text>
            )}
          </GradientView>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  card: {
    padding: 20,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  statusBox: {
    padding: 12,
    backgroundColor: colors.neutralBg,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
