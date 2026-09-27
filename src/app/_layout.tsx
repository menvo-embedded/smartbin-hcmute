import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../features/auth/store';
import { startAutoSync } from '../core/sync/engine';
import { assertEnv } from '../core/config/env';
import { SyncStatusBanner } from '../shared/ui';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

export default function RootLayout() {
  const init = useAuth((s) => s.init);

  // Mỗi <Ionicons> tự load font riêng khi mount lần đầu — trên Android hay
  // gặp race condition (tải xong nhưng typeface chưa kịp gắn trước khi layout
  // đo lại), khiến icon vĩnh viễn trống thay vì chỉ chớp nháy lúc đầu. Load
  // font một lần duy nhất ở gốc app và chặn render cho tới khi xong tránh
  // được race đó.
  // Tải font lỗi (vd. bản native cũ lệch thư viện) thì vẫn cho vào app,
  // chỉ mất icon — không kẹt mãi ở vòng quay.
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    assertEnv();
    const stopAuth = init();
    const stopSync = startAutoSync();
    return () => {
      stopAuth();
      stopSync();
    };
  }, [init]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
      <SyncStatusBanner />
    </QueryClientProvider>
  );
}
