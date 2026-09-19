import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// Nhập các UI component dùng chung
import { Card } from '@/shared/ui/Card';
import { SectionTitle } from '@/shared/ui/SectionTitle';

export default function KioskSetupScreen() {
  const router = useRouter();
  const [binId, setBinId] = useState('BIN-UTE-01');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSetup = async () => {
    if (!binId.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ID thùng rác!');
      return;
    }

    setIsSaving(true);
    try {
      // Lưu cấu hình Kiosk vào bộ nhớ / state
      // (Có thể mở rộng gọi service trong src/features/devices)
      
      Alert.alert('Thành công', 'Đã lưu cấu hình Kiosk!', [
        {
          text: 'Vào màn hình chờ',
          onPress: () => router.push('/(user)/idle'),
        },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SectionTitle>Cấu hình Kiosk</SectionTitle>
        <Text style={styles.statusLabel}>Thiết lập thông tin thùng rác và kết nối BLE</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Mã thùng rác (Bin ID):</Text>
        <TextInput
          style={styles.input}
          value={binId}
          onChangeText={setBinId}
          placeholder="Nhập mã thùng rác..."
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Chế độ giả lập BLE (Mock BLE):</Text>
          <Text style={styles.statusValue}>Đang bật (EXPO_PUBLIC_MOCK_BLE=1)</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.button, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={handleSaveSetup}
        >
          <Text style={styles.buttonText}>
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình & Bắt đầu'}
          </Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  statusBox: {
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
    marginTop: 2,
  },
  button: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});