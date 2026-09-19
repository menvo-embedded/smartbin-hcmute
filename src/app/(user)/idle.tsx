import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Nhập các UI component dùng chung
import { Card } from '@/shared/ui/Card';

export default function IdleScreen() {
  const router = useRouter();

  const handleStart = () => {
    // Chuyển sang màn hình phân loại rác
    router.push('/(user)/sort');
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.container}
      onPress={handleStart}
    >
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.badge}>SMARTBIN KIOSK</Text>
          <Text style={styles.title}>Thùng Rác Thông Minh</Text>
          <Text style={styles.subtitle}>
            Phân loại rác dễ dàng — Bảo vệ môi trường cùng UTE
          </Text>

          <View style={styles.actionPrompt}>
            <Text style={styles.actionText}>Chạm vào màn hình để bắt đầu</Text>
          </View>
        </Card>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Màu tối sang trọng cho màn hình chờ
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actionPrompt: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    marginTop: 8,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});