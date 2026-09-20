import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { useSortAction } from '../../features/sorting/useSortAction';
import { useSortHistory } from '../../features/sorting/useSortHistory';
import { WASTE_TYPES, WASTE_LABELS, WASTE_ICONS, FILL_ALERT_THRESHOLD, type WasteType } from '../../shared/constants/waste';
import type { Device, Bin } from '../../shared/types/database';
import { colors } from '../../theme/colors';
import { Card, StatCard, StatusBadge, SectionTitle, EmptyState, GradientView } from '../../shared/ui';

type DeviceWithBins = Device & { bins: Bin[] };
type IoniconName = ComponentProps<typeof Ionicons>['name'];

function deviceFillLevel(d: DeviceWithBins) {
  return d.bins?.length ? Math.max(...d.bins.map((b) => b.fill_level)) : 0;
}

export default function Sort() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);

  const { data: devices, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('devices').select('*, bins(*)');
      if (error) throw error;
      return data as unknown as DeviceWithBins[];
    },
  });

  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    // Mặc định chọn bin ít đầy nhất, không phải bin đầu tiên trong danh
    // sách — tránh người dùng lỡ tay chọn nhầm một bin gần đầy làm mặc định.
    if (!deviceId && devices && devices.length > 0) {
      const leastFull = [...devices].sort((a, b) => deviceFillLevel(a) - deviceFillLevel(b))[0];
      setDeviceId(leastFull.id);
    }
  }, [devices, deviceId]);

  const { sort, busy, error } = useSortAction(deviceId ?? '');
  const { history, stats, reload: loadHistory } = useSortHistory();

  async function onPickType(type: WasteType) {
    if (!deviceId) return;
    const ok = await sort(type, 'manual');
    await loadHistory();
    if (ok) {
      // Bỏ rác thành công → sang màn cảm ơn, tự quay lại đúng màn này
      // (không phải màn chờ kiosk công khai, vì đang đăng nhập ở đây).
      router.push({ pathname: '/(user)/thanks', params: { returnTo: '/(user)/sort' } });
    }
  }

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable style={styles.identity} onPress={() => router.push('/(user)/profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Xin chào, {profile?.full_name ?? '...'}</Text>
            <Text style={styles.points}>Điểm thưởng: {profile?.points ?? 0}</Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/(user)/stats')} hitSlop={8}>
            <Text style={styles.headerAction}>Thống kê</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
            hitSlop={8}
          >
            <Text style={styles.headerAction}>Đăng xuất</Text>
          </Pressable>
        </View>
      </GradientView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ gap: 20, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              loadHistory();
            }}
          />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          <Pressable onPress={() => router.push('/(user)/stats')}>
            <StatCard label="Tổng số lần bỏ rác" value={String(stats.total)} />
          </Pressable>
          <StatCard label="Đang chờ đồng bộ" value={String(stats.pending)} hint="sẽ tự đẩy lên khi có mạng" />
        </ScrollView>

        {isLoading && <ActivityIndicator />}

        {!isLoading && (!devices || devices.length === 0) && (
          <EmptyState
            title="Chưa có thiết bị nào"
            description="Chạy supabase/seed.sql trước để tạo thùng rác mẫu."
          />
        )}

        {devices && devices.length > 0 && (
          <View style={{ gap: 10 }}>
            <SectionTitle>Chọn thùng rác</SectionTitle>
            {devices.map((d) => {
              const fillLevel = deviceFillLevel(d);
              const isFull = fillLevel >= FILL_ALERT_THRESHOLD;
              return (
                <Pressable key={d.id} onPress={() => setDeviceId(d.id)}>
                  <Card
                    style={[
                      styles.deviceCard,
                      deviceId === d.id && styles.deviceCardActive,
                    ]}
                  >
                    <View style={styles.deviceRow}>
                      <View>
                        <Text style={styles.deviceName}>{d.name}</Text>
                        <Text style={styles.deviceArea}>{d.area}</Text>
                      </View>
                      <StatusBadge
                        label={`${Math.round(fillLevel * 100)}% đầy`}
                        tone={isFull ? 'danger' : 'success'}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        {deviceId && (
          <View style={{ gap: 10 }}>
            <SectionTitle>Chọn loại rác</SectionTitle>
            <View style={styles.typeGrid}>
              {WASTE_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => onPickType(type)}
                  disabled={busy}
                  style={[styles.typeButtonWrapper, busy && styles.disabled]}
                >
                  <GradientView style={styles.typeButton}>
                    <Ionicons name={WASTE_ICONS[type] as IoniconName} size={20} color={colors.textOnPrimary} />
                    <Text style={styles.typeButtonText} numberOfLines={2}>
                      {WASTE_LABELS[type]}
                    </Text>
                  </GradientView>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {busy && <Text style={{ color: colors.textMuted }}>Đang mở ngăn rác...</Text>}
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <View style={{ gap: 10 }}>
          <View style={styles.historyHeaderRow}>
            <SectionTitle>Lịch sử gần đây</SectionTitle>
            <Pressable onPress={() => router.push('/(user)/stats')} hitSlop={8}>
              <Text style={styles.historyLink}>Xem tất cả</Text>
            </Pressable>
          </View>
          <FlatList
            data={history}
            keyExtractor={(item) => item.local_id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Card style={styles.historyRow}>
                <Text style={styles.historyLabel}>{WASTE_LABELS[item.waste_type]}</Text>
                <StatusBadge
                  label={item.synced ? 'Đã đồng bộ' : 'Đang chờ'}
                  tone={item.synced ? 'success' : 'warning'}
                />
              </Card>
            )}
            ListEmptyComponent={<EmptyState title="Chưa có lần bỏ rác nào" />}
          />
        </View>
      </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  greeting: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  points: {
    color: colors.primaryLight,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerAction: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deviceCard: {
    borderColor: colors.border,
  },
  deviceCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceName: {
    fontWeight: '600',
    color: colors.text,
  },
  deviceArea: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  typeButtonWrapper: {
    width: '48%',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  typeButtonText: {
    flexShrink: 1,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLabel: {
    color: colors.text,
    fontWeight: '500',
  },
});
