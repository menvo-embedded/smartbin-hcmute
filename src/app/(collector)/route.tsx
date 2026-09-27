import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import type { TaskWithDevice } from '../../features/collection/types';
import {
  optimizeRoute,
  optimizeRouteFromAnyStop,
  distanceKm,
  googleMapsRouteUrl,
  buildRouteMapHtml,
  type LatLng,
  type RouteStop,
} from '../../features/collection/route';
import { colors } from '../../theme/colors';
import { Card, EmptyState, GradientView } from '../../shared/ui';

/** Xa hơn khoảng này so với các thùng thì coi như vị trí không dùng được. */
const MAX_START_DISTANCE_KM = 20;

/** Vị trí hiện tại của máy, null nếu không có quyền / không lấy được. */
async function getCurrentPosition(): Promise<LatLng | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export default function CollectorRoute() {
  const userId = useAuth((s) => s.session?.user.id ?? null);

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['collector_route_tasks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('collection_tasks')
        .select('*, devices(name, area, code, latitude, longitude)')
        .eq('assignee_id', userId)
        .eq('status', 'in_progress');
      if (error) throw error;
      return data as unknown as TaskWithDevice[];
    },
    enabled: !!userId,
  });

  const { data: myPosition, isLoading: locating } = useQuery({
    queryKey: ['collector_position'],
    queryFn: getCurrentPosition,
    staleTime: 60_000,
  });

  const stops = useMemo<(RouteStop & { taskId: string })[]>(
    () =>
      (tasks ?? [])
        .filter((t) => t.devices?.latitude != null && t.devices?.longitude != null)
        .map((t) => ({
          id: t.device_id,
          taskId: t.id,
          lat: t.devices!.latitude!,
          lng: t.devices!.longitude!,
          title: t.devices!.name,
          subtitle: t.devices!.area,
        })),
    [tasks],
  );

  const plan = useMemo(() => {
    if (stops.length === 0) return null;
    const usableGps =
      myPosition && Math.min(...stops.map((s) => distanceKm(myPosition, s))) <= MAX_START_DISTANCE_KM;
    if (usableGps) {
      const { order, totalKm } = optimizeRoute(myPosition, stops);
      return { start: myPosition as LatLng, order, totalKm, fromGps: true };
    }
    const { start, order, totalKm } = optimizeRouteFromAnyStop(stops);
    return { start: start as LatLng, order, totalKm, fromGps: false };
  }, [stops, myPosition]);

  const mapHtml = useMemo(() => (plan ? buildRouteMapHtml(plan.start, plan.order) : null), [plan]);

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>‹ Danh sách việc</Text>
        </Pressable>
        <Text style={styles.title}>Lộ trình thu gom tối ưu</Text>
      </GradientView>

      {(isLoading || (locating && !plan)) && <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}

      {error && (
        <Text style={styles.error}>
          Không tải được việc: {error instanceof Error ? error.message : String(error)}
        </Text>
      )}

      {!isLoading && !locating && !plan && !error && (
        <View style={{ padding: 20 }}>
          <EmptyState
            title="Chưa có thùng nào cần đi"
            description="Nhận việc hoặc chờ quản lý phân công ca, lộ trình sẽ hiện ở đây."
          />
        </View>
      )}

      {plan && mapHtml && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.mapBox}>
            <WebView source={{ html: mapHtml }} originWhitelist={['*']} style={{ flex: 1 }} />
          </View>

          <Card style={styles.summary}>
            <Text style={styles.summaryValue}>
              {plan.order.length} thùng · {plan.totalKm.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km
            </Text>
            <Text style={styles.summaryHint}>
              {plan.fromGps
                ? 'Xuất phát từ vị trí hiện tại của bạn'
                : 'Chưa lấy được vị trí gần khu vực — xuất phát từ thùng số 1'}
            </Text>
          </Card>

          {plan.order.map((stop, i) => (
            <Pressable
              key={stop.taskId}
              onPress={() => router.push({ pathname: '/(collector)/task-detail', params: { id: stop.taskId } })}
            >
              <Card style={styles.stopRow}>
                <View style={styles.stopIndex}>
                  <Text style={styles.stopIndexText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopTitle}>{stop.title}</Text>
                  <Text style={styles.stopSubtitle}>{stop.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            </Pressable>
          ))}

          <Pressable onPress={() => Linking.openURL(googleMapsRouteUrl(plan.start, plan.order))}>
            <GradientView style={styles.navButton}>
              <Ionicons name="navigate" size={18} color={colors.textOnPrimary} />
              <Text style={styles.navButtonText}>Chỉ đường bằng Google Maps</Text>
            </GradientView>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 8,
  },
  backText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: colors.textOnPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    padding: 20,
  },
  body: {
    padding: 20,
    gap: 12,
  },
  mapBox: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summary: {
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  summaryHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIndexText: {
    color: colors.textOnPrimary,
    fontWeight: '800',
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  stopSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  navButtonText: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
