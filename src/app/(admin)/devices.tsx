import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { buildDeviceMapHtml } from '../../features/devices/buildDeviceMapHtml';
import { useSortSamples } from '../../features/admin/hooks/useFillForecast';
import { useAdminDevices, isDeviceFull } from '../../features/admin/hooks/useAdminDevices';
import { useAdminDispatch } from '../../features/admin/hooks/useAdminDispatch';
import { AdminHeader } from '../../features/admin/components/AdminHeader';
import { DeviceCard } from '../../features/admin/components/DeviceCard';
import { FilterChips } from '../../features/admin/components/FilterChips';
import { getErrorMessage, type DeviceFilter, type DeviceWithBins } from '../../features/admin/types';
import { colors } from '../../theme/colors';
import { StatCard, SectionTitle, EmptyState } from '../../shared/ui';

const DEVICE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'full', label: '⚠️ Cần thu gom' },
  { key: 'online', label: 'Đang hoạt động' },
  { key: 'offline', label: 'Ngoại tuyến' },
] as const;

/** Tab Thùng rác: bản đồ, mức đầy từng ngăn, dự báo và điều phối nhanh khi thùng đầy. */
export default function Devices() {
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
  const { data: devices, isLoading, isRefetching, refetch, error } = useAdminDevices();
  const { data: sortSamples, refetch: refetchSamples } = useSortSamples();
  const { tasks, createManualTask } = useAdminDispatch();

  const fullCount = devices?.filter(isDeviceFull).length ?? 0;
  const onlineCount = devices?.filter((d) => d.is_online).length ?? 0;

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    if (deviceFilter === 'full') return devices.filter(isDeviceFull);
    if (deviceFilter === 'online') return devices.filter((d) => d.is_online);
    if (deviceFilter === 'offline') return devices.filter((d) => !d.is_online);
    return devices;
  }, [devices, deviceFilter]);

  // Bản đồ thiết bị
  const mapMarkers = (devices ?? [])
    .filter((d): d is DeviceWithBins & { latitude: number; longitude: number } => d.latitude != null && d.longitude != null)
    .map((d) => {
      const fillLevel = d.bins?.length ? Math.max(...d.bins.map((b) => b.fill_level)) : 0;
      return {
        id: d.id,
        lat: d.latitude,
        lng: d.longitude,
        title: d.name,
        subtitle: `${d.area} — ${Math.round(fillLevel * 100)}% đầy`,
        color: isDeviceFull(d) ? colors.danger : colors.primary,
      };
    });

  // Chỉ dựng lại trang bản đồ khi danh sách thùng đổi; mức đầy đổi (realtime)
  // thì đẩy marker mới vào trang đang mở, không tải lại bản đồ.
  const mapMarkersRef = useRef(mapMarkers);
  mapMarkersRef.current = mapMarkers;
  const mapDeviceKey = mapMarkers.map((m) => m.id).join(',');
  const mapHtml = useMemo(
    () =>
      mapMarkersRef.current.length > 0
        ? buildDeviceMapHtml(mapMarkersRef.current, {
            lat: mapMarkersRef.current[0].lat,
            lng: mapMarkersRef.current[0].lng,
          })
        : null,
    [mapDeviceKey],
  );
  const mapRef = useRef<WebView>(null);
  const mapMarkersJson = JSON.stringify(mapMarkers);
  useEffect(() => {
    mapRef.current?.injectJavaScript(`window.updateMarkers && window.updateMarkers(${mapMarkersJson}); true;`);
  }, [mapMarkersJson]);

  // Thùng đầy: mở việc đang có (hoặc tạo việc mới) ở tab Điều phối để giao người.
  function openInDispatch(taskId: string) {
    router.navigate({ pathname: '/(admin)/dispatch', params: { assign: taskId } });
  }

  function handleQuickDispatch(device: DeviceWithBins) {
    const existing = tasks?.find((t) => t.device_id === device.id && t.status !== 'done');
    if (existing) {
      openInDispatch(existing.id);
      return;
    }
    createManualTask.mutate(
      { deviceId: device.id },
      {
        onSuccess: (newTask) => {
          if (newTask?.auto_assigned) {
            Alert.alert('Đã tự động giao việc', 'Hệ thống đã giao cho nhân viên đang trực có ít việc nhất.');
            router.navigate('/(admin)/dispatch');
            return;
          }
          if (newTask) openInDispatch(newTask.id);
        },
        onError: (err: unknown) => Alert.alert('Thông báo', getErrorMessage(err)),
      },
    );
  }

  return (
    <View style={styles.screen}>
      <AdminHeader title="Thùng rác" subtitle="Giám sát mức đầy & vị trí thùng" showDemo />

      <FlatList
        style={styles.body}
        data={filteredDevices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void refetchSamples();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {mapHtml && (
              <View style={styles.mapWrapper}>
                <WebView
                  ref={mapRef}
                  style={styles.map}
                  originWhitelist={['*']}
                  source={{ html: mapHtml, baseUrl: 'https://smartbin.local/' }}
                  javaScriptEnabled
                />
              </View>
            )}

            <View style={{ height: 14 }} />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[
                { label: 'Tổng số thùng', value: String(devices?.length ?? 0) },
                { label: '⚠️ Cần thu gom', value: String(fullCount) },
                { label: 'Đang Online', value: String(onlineCount) },
              ]}
              keyExtractor={(s) => s.label}
              renderItem={({ item }) => <StatCard label={item.label} value={item.value} />}
            />

            <View style={{ height: 16 }} />
            <FilterChips options={DEVICE_FILTERS} value={deviceFilter} onChange={setDeviceFilter} />

            <View style={{ height: 16 }} />
            <SectionTitle>
              {deviceFilter === 'full'
                ? `Thùng rác đang đầy (${filteredDevices.length})`
                : `Danh sách thùng rác (${filteredDevices.length})`}
            </SectionTitle>
            {isLoading && <ActivityIndicator style={{ marginTop: 12 }} />}
            {error && <Text style={{ color: colors.danger }}>{getErrorMessage(error)}</Text>}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={deviceFilter === 'full' ? 'Không có thùng nào bị đầy' : 'Không tìm thấy thùng rác phù hợp'}
              description="Tất cả các ngăn rác hiện tại đang ở mức an toàn"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <DeviceCard item={item} samples={sortSamples ?? []} onQuickDispatch={handleQuickDispatch} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: 20 },
  listHeader: { marginTop: 8, marginBottom: 8 },
  mapWrapper: { height: 200, borderRadius: 16, overflow: 'hidden' },
  map: { flex: 1 },
});
