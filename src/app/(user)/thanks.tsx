import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// Nhập các UI component dùng chung
import { Card } from '@/shared/ui/Card';

export default function ThanksScreen() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Đếm ngược tự động chuyển về màn hình chờ (Idle)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/(user)/idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleReturnNow = () => {
    router.replace('/(user)/idle');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <Text style={styles.title}>Cảm ơn bạn!</Text>
        <Text style={styles.subtitle}>
          Hành động phân loại rác của bạn góp phần bảo vệ môi trường sạch đẹp.
        </Text>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            Tự động quay lại màn hình chính sau <Text style={styles.timerHighlight}>{countdown}</Text> giây
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.button}
          onPress={handleReturnNow}
        >
          <Text style={styles.buttonText}>Hoàn tất ngay</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    alignItems: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  timerContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 13,
    color: '#475569',
  },
  timerHighlight: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});