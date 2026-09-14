import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../features/auth/store';
import { startAutoSync } from '../core/sync/engine';
import { assertEnv } from '../core/config/env';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

export default function RootLayout() {
  const init = useAuth((s) => s.init);

  useEffect(() => {
    assertEnv();
    const stopAuth = init();
    const stopSync = startAutoSync();
    return () => {
      stopAuth();
      stopSync();
    };
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
