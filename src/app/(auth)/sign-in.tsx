import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../features/auth/store';
import type { Role } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { GradientView } from '../../shared/ui';

type Mode = 'community' | 'household';

/**
 * Hai chế độ tách riêng: Cộng đồng = hệ thống thùng rác công cộng (nhân viên
 * thu gom, quản lý, kiosk công khai); Hộ gia đình = thùng rác riêng của từng
 * hộ. Mỗi chế độ chỉ nhận đúng các vai trò của nó.
 */
const MODES: Record<Mode, { title: string; roles: Role[]; wrongRole: string }> = {
  community: {
    title: 'Cộng đồng',
    roles: ['collector', 'admin'],
    wrongRole: 'Tài khoản này không thuộc chế độ Cộng đồng. Hãy quay lại chọn "Hộ gia đình".',
  },
  household: {
    title: 'Hộ gia đình',
    roles: ['household'],
    wrongRole: 'Tài khoản này không phải tài khoản hộ gia đình. Hãy quay lại chọn "Cộng đồng".',
  },
};

/** Tài khoản test để demo nhanh, không cần gõ tay. */
const TEST_ACCOUNTS: Record<Mode, { label: string; email: string; password: string }[]> = {
  community: [
    { label: 'Quản lý', email: 'user3@test.com', password: '123456' },
    { label: 'Nhân viên thu gom', email: 'user2@test.com', password: '123456' },
  ],
  household: [{ label: 'Hộ gia đình', email: 'user1@test.com', password: '123456' }],
};

export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = params.mode === 'household' ? 'household' : 'community';
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(loginEmail = email, loginPassword = password) {
    setBusy(true);
    setError(null);
    try {
      const role = await signIn(loginEmail, loginPassword);
      if (!role || !MODES[mode].roles.includes(role)) {
        await signOut();
        setError(MODES[mode].wrongRole);
        return;
      }
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }

  function onQuickLogin(acc: (typeof TEST_ACCOUNTS)[Mode][number]) {
    setEmail(acc.email);
    setPassword(acc.password);
    onSubmit(acc.email, acc.password);
  }

  return (
    <View style={styles.screen}>
      <GradientView style={styles.brand}>
        <Pressable onPress={() => router.replace('/')} hitSlop={8} style={styles.back}>
          <Text style={styles.backText}>‹ Chọn chế độ</Text>
        </Pressable>
        <Text style={styles.brandText}>SmartBin</Text>
        <Text style={styles.brandSubtext}>Phân loại và thu gom rác thông minh</Text>
      </GradientView>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Đăng nhập · {MODES[mode].title}</Text>

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
        {TEST_ACCOUNTS[mode].map((acc) => (
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

        {mode === 'community' && (
          <Pressable
            onPress={() => router.push('/(user)/idle')}
            disabled={busy}
            style={[styles.secondaryButton, busy && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>Mở kiosk bỏ rác công cộng</Text>
            <Text style={styles.secondaryButtonEmail}>Cho người dân, không cần đăng nhập</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    marginBottom: 12,
  },
  backText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  brand: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
