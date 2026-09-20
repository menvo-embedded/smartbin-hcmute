import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { Card, GradientView } from '../../shared/ui';

const AUTO_RETURN_SECONDS = 5;
const DEFAULT_RETURN_PATH = '/(user)/idle';

export default function ThanksScreen() {
  // Mặc định quay về màn chờ kiosk công khai; nếu được điều hướng tới từ
  // một màn có đăng nhập (vd. sort.tsx), returnTo cho biết quay lại đúng
  // chỗ đó thay vì đưa người dùng ra màn idle ẩn danh.
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const target = returnTo || DEFAULT_RETURN_PATH;
  const [countdown, setCountdown] = useState(AUTO_RETURN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace(target as Parameters<typeof router.replace>[0]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [target]);

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

        <Pressable onPress={() => router.replace(target as Parameters<typeof router.replace>[0])}>
          <GradientView style={styles.button}>
            <Text style={styles.buttonText}>Hoàn tất ngay</Text>
          </GradientView>
        </Pressable>
      </Card>
    </View>
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
    maxWidth: 400,
    padding: 32,
    alignItems: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  timerContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.neutralBg,
    borderRadius: 20,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  timerHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
