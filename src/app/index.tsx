import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../features/auth/store';

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

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  switch (profile?.role) {
    case 'admin':
      return <Redirect href="/(admin)/devices" />;
    case 'collector':
      return <Redirect href="/(collector)/tasks" />;
    default:
      return <Redirect href="/(user)/sort" />;
  }
}
