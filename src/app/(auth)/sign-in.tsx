import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../features/auth/store';
import { colors } from '../../theme/colors';
import { GradientView } from '../../shared/ui';

/** Tài khoản test dùng để demo nhanh, không cần gõ tay — mỗi tài khoản ứng
 * với 1 vai trò thật trong hệ thống (xem `supabase/seed.sql` để gán role).
 * `mode` khớp với lựa chọn ở màn "Chọn chế độ" (`src/app/index.tsx`): vào từ
 * "Cộng đồng" chỉ thấy tài khoản quản lý/nhân viên, vào từ "Hộ gia đình" chỉ
 * thấy tài khoản hộ dân. */
const TEST_ACCOUNTS = [
  { label: 'Quản lý', email: 'user3@test.com', password: '123456', mode: 'community' as const },
  { label: 'Nhân viên', email: 'user2@test.com', password: '123456', mode: 'community' as const },
  { label: 'Hộ gia đình', email: 'user1@test.com', password: '123456', mode: 'household' as const },
];

export default function SignIn() {
  const { signIn } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  // Vào thẳng /(auth)/sign-in không qua màn chọn chế độ (deep link, back
  // button...) thì không có `mode` — hiện đủ cả 3 tài khoản demo cho an toàn.
  const visibleAccounts = mode ? TEST_ACCOUNTS.filter((acc) => acc.mode === mode) : TEST_ACCOUNTS;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(loginEmail = email, loginPassword = password) {
    setBusy(true);
    setError(null);
    try {
      await signIn(loginEmail, loginPassword);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }

  function onQuickLogin(acc: (typeof TEST_ACCOUNTS)[number]) {
    setEmail(acc.email);
    setPassword(acc.password);
    onSubmit(acc.email, acc.password);
  }

  return (
    <View style={styles.screen}>
      <GradientView style={styles.brand}>
        <Pressable
          style={styles.backButton}
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.brandText}>SmartBin</Text>
        <Text style={styles.brandSubtext}>Phân loại và thu gom rác thông minh</Text>
      </GradientView>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Đăng nhập</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={() => onSubmit()} disabled={busy} style={busy && styles.disabled}>
          <GradientView style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Text>
          </GradientView>
        </Pressable>

        <Text style={styles.quickLoginLabel}>Đăng nhập nhanh (demo):</Text>
        {visibleAccounts.map((acc) => (
          <Pressable
            key={acc.email}
            onPress={() => onQuickLogin(acc)}
            disabled={busy}
            style={[styles.secondaryButton, busy && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>{acc.label}</Text>
            <Text style={styles.secondaryButtonEmail}>{acc.email}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  brand: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  brandText: {
    color: colors.textOnPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  brandSubtext: {
    color: colors.primaryLight,
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    padding: 24,
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    color: colors.text,
  },
  error: {
    color: colors.danger,
  },
  primaryButton: {
    padding: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  quickLoginLabel: {
    marginTop: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 10,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryButtonEmail: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 2,
  },
});
