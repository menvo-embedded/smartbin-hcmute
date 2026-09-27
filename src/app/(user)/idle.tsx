import { useEffect } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useKioskConfig } from '../../features/devices/kioskConfigStore';
import { colors } from '../../theme/colors';
import { Card, GradientView } from '../../shared/ui';

export default function IdleScreen() {
  const binId = useKioskConfig((s) => s.binId);

  useEffect(() => {
    // Kiosk chưa được cấu hình mã thùng rác thì bắt đi thiết lập trước,
    // tránh vào thẳng màn hình chờ mà không biết đang gắn với thùng nào.
    if (!binId) {
      router.replace('/(user)/kiosk-setup');
    }
  }, [binId]);

  if (!binId) {
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={() => router.push('/(user)/sort')}>
      <Card style={styles.card}>
        <Text style={styles.badge}>SMARTBIN KIOSK · {binId}</Text>
        <Text style={styles.title}>Thùng Rác Thông Minh</Text>
        <Text style={styles.subtitle}>
          Phân loại rác dễ dàng — Bảo vệ môi trường cùng UTE
        </Text>

        <GradientView style={styles.actionPrompt}>
          <Text style={styles.actionText}>Chạm vào màn hình để bắt đầu</Text>
        </GradientView>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: 32,
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actionPrompt: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    marginTop: 8,
  },
  actionText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
