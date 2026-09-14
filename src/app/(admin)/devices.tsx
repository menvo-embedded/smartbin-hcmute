import { View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { buildDeviceMapHtml } from '../../features/devices/buildDeviceMapHtml';
import { WASTE_LABELS, FILL_ALERT_THRESHOLD } from '../../shared/constants/waste';
import type { Device, Bin } from '../../shared/types/database';
import { colors } from '../../theme/colors';
import { Card, StatCard, StatusBadge, ScreenHeader, SectionTitle, EmptyState } from '../../shared/ui';

type DeviceWithBins = Device & { bins: Bin[] };

export default function Devices() {
  const signOut = useAuth((s) => s.signOut);

  const { data: devices, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin_devices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('devices').select('*, bins(*)');
      if (error) throw error;
      return data as DeviceWithBins[];
    },
  });

  const total = devices?.length ?? 0;
  const online = devices?.filter((d) => d.is_online).length ?? 0;
  const full = devices?.filter((d) => d.bins?.some((b) => b.fill_level >= FILL_ALERT_THRESHOLD)).length ?? 0;

  const devicesOnMap = (devices ?? []).filter(
    (d): d is DeviceWithBins & { latitude: number; longitude: number } =>
      d.latitude != null && d.longitude != null,
  );

  const mapHtml =
    devicesOnMap.length > 0
      ? buildDeviceMapHtml(
          devicesOnMap.map((d) => {
            const fillLevel = d.bins?.length ? Math.max(...d.bins.map((b) => b.fill_level)) : 0;
            const isFull = fillLevel >= FILL_ALERT_THRESHOLD;
            return {
              id: d.id,
              lat: d.latitude,
              lng: d.longitude,
              title: d.name,
              subtitle: `${d.area} — ${Math.round(fillLevel * 100)}% đầy`,
              color: isFull ? colors.danger : colors.primary,
            };
          }),
          { lat: devicesOnMap[0].latitude, lng: devicesOnMap[0].longitude },
        )
      : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Bảng điều khiển"
        subtitle="Tổng quan hệ thống thùng rác"
        actionLabel="Đăng xuất"
        onAction={async () => {
          await signOut();
          router.replace('/');
        }}
      />

      <View style={styles.body}>
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
          }
          ListHeaderComponent={
            <View style={{ marginTop: 16, marginBottom: 16 }}>
              {mapHtml && (
                <View style={styles.mapWrapper}>
                  <WebView
                    style={styles.map}
                    originWhitelist={['*']}
                    source={{ html: mapHtml }}
                    javaScriptEnabled
                  />
                </View>
              )}
              <View style={{ height: 16 }} />
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                  { label: 'Tổng thiết bị', value: String(total) },
                  { label: 'Đang hoạt động', value: String(online) },
                  { label: 'Cần thu gom', value: String(full) },
                ]}
                keyExtractor={(s) => s.label}
                renderItem={({ item }) => <StatCard label={item.label} value={item.value} />}
              />
              <View style={{ height: 16 }} />
              <SectionTitle>Danh sách thiết bị</SectionTitle>
              {isLoading && <ActivityIndicator />}
              {error && <Text style={{ color: colors.danger }}>{String(error)}</Text>}
            </View>
          }
          ListEmptyComponent={!isLoading ? <EmptyState title="Chưa có thiết bị nào" /> : null}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={styles.deviceTitleRow}>
                  <View style={styles.deviceIcon}>
                    <Ionicons name="trash-bin-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.deviceName}>
                    {item.name} <Text style={styles.deviceCode}>({item.code})</Text>
                  </Text>
                </View>
                <StatusBadge
                  label={item.is_online ? 'Online' : 'Offline'}
                  tone={item.is_online ? 'success' : 'neutral'}
                />
              </View>
              <Text style={styles.deviceArea}>Khu vực: {item.area}</Text>

              <View style={{ marginTop: 8, gap: 6 }}>
                {item.bins?.map((bin) => {
                  const isFull = bin.fill_level >= FILL_ALERT_THRESHOLD;
                  return (
                    <View key={bin.id} style={styles.binRow}>
                      <Text style={styles.binLabel}>{WASTE_LABELS[bin.waste_type]}</Text>
                      <StatusBadge
                        label={`${Math.round(bin.fill_level * 100)}% đầy`}
                        tone={isFull ? 'danger' : 'neutral'}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mapWrapper: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  deviceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontWeight: '600',
    color: colors.text,
  },
  deviceCode: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  deviceArea: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  binRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  binLabel: {
    color: colors.text,
    fontSize: 13,
  },
});
