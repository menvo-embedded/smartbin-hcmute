import { Redirect, router } from 'expo-router';
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../features/auth/store';
import { colors } from '../theme/colors';
import { GradientView } from '../shared/ui';

/**
 * Điểm rẽ nhánh theo vai trò. Mỗi vai trò vào một nhóm màn hình riêng,
 * không dùng chung tab rồi ẩn/hiện bằng điều kiện.
 */
export default function Entry() {
  const { session, profile, loading } = useAuth();

  // Vẫn đang lấy phiên đăng nhập lần đầu, hoặc đã có session nhưng profile
  // (chứa role) chưa tải xong — chờ profile trước khi rẽ nhánh, nếu không
  // sẽ luôn rơi vào nhánh mặc định "user" trong lúc đang tải.
  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (session) {
    switch (profile?.role) {
      case 'admin':
        return <Redirect href="/(admin)/devices" />;
      case 'collector':
        return <Redirect href="/(collector)/tasks" />;
      case 'household':
        return <Redirect href="/(household)/home" />;
      default:
        return <Redirect href="/(user)/sort" />;
    }
  }

  // Chưa đăng nhập: cho chọn chế độ trước khi vào màn đăng nhập — "Cộng đồng"
  // vào thẳng luồng công khai (không cần tài khoản), "Hộ gia đình" mới cần
  // đăng nhập vì phải biết gắn với hộ nào để tính điểm/lịch sử riêng.
  return <ModeSelect />;
}

function ModeSelect() {
  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Ionicons name="leaf" size={70} color="rgba(255,255,255,0.2)" style={styles.leafBack} />
        <Ionicons name="leaf" size={46} color="rgba(255,255,255,0.28)" style={styles.leafFront} />
        <Text style={styles.brand}>SmartBin</Text>
        <Text style={styles.brandSubtitle}>Phân loại rác thông minh</Text>
      </GradientView>

      <View style={styles.body}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Chọn chế độ</Text>
          <View style={styles.sectionUnderline} />
        </View>

        <ModeCard
          icon="people"
          label="Cộng đồng"
          onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { mode: 'community' } })}
        />
        <ModeCard
          icon="home"
          label="Hộ gia đình"
          onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { mode: 'household' } })}
        />
      </View>
    </View>
  );
}

function ModeCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardIconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.cardChevronWrap}>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 64,
    paddingBottom: 44,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  leafBack: {
    position: 'absolute',
    top: 20,
    right: 30,
    transform: [{ rotate: '20deg' }],
  },
  leafFront: {
    position: 'absolute',
    top: 55,
    right: 60,
    transform: [{ rotate: '-15deg' }],
  },
  brand: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.primaryLight,
    marginTop: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 16,
  },
  sectionHead: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionUnderline: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  cardChevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
