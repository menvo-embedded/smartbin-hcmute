import { useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '../../core/supabase/client';
import { useAuth } from '../../features/auth/store';
import { useSortAction } from '../../features/sorting/useSortAction';
import { useSortHistory } from '../../features/sorting/useSortHistory';
import { WasteTypeGrid } from '../../features/sorting/WasteTypeGrid';
import { WasteGuideSearch } from '../../features/sorting/WasteGuideSearch';
import { CollectionFeedback } from '../../features/household/CollectionFeedback';
import { AiScanCard } from '../../features/household/AiScanCard';
import { LiveScanPanel } from '../../features/sorting/LiveScanPanel';
import { useImpact } from '../../features/stats/useImpact';
import { useAutoBinConnection } from '../../features/sorting/useAutoBinConnection';
import { NextPickupCard } from '../../features/household/NextPickupCard';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import { useTableChanges } from '../../core/supabase/useTableChanges';
import { WASTE_LABELS, FILL_ALERT_THRESHOLD, type WasteType } from '../../shared/constants/waste';
import type { Device, Bin } from '../../shared/types/database';
import { colors } from '../../theme/colors';
import { Card, StatCard, StatusBadge, SectionTitle, EmptyState, GradientView } from '../../shared/ui';

type DeviceWithBins = Device & { bins: Bin[] };

export default function HouseholdHome() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const userId = useAuth((s) => s.session?.user.id ?? null);

  const { data: devices, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['household_devices', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('devices')
        .select('*, bins(*)')
        .eq('owner_id', userId);
      if (error) throw error;
      return data as unknown as DeviceWithBins[];
    },
  });

  const device = devices?.[0] ?? null;
  const { sort, busy, error: sortError } = useSortAction(device?.id ?? '');
  // Tự kết nối thùng nhà mình (tự thử lại khi lỗi) + gửi nhịp tim lên server.
  const { status: bleStatus } = useAutoBinConnection(device?.id ?? null);
  const connected = bleStatus === 'connected';
  // Mức đầy thùng tự cập nhật khi vừa bỏ rác hoặc nhân viên vừa thu gom.
  useTableChanges('household-bins', ['bins'], () => void refetch());
  const [lastResult, setLastResult] = useState<string | null>(null);
  // Cuộn ô tra cứu lên đầu màn hình khi gõ, để bàn phím không che kết quả.
  const scrollRef = useRef<ScrollView>(null);
  const pickSection = useRef({ y: 0, height: 0 });
  const scrollToSearch = () =>
    setTimeout(() => {
      const { y, height } = pickSection.current;
      scrollRef.current?.scrollTo({ y: Math.max(0, y + height - 90), animated: true });
    }, 250);
  const { rows: allHistory, error: dbError, reload: loadHistory } = useSortHistory(null);
  const history = allHistory.slice(0, 5);
  const { impact, reload: reloadImpact } = useImpact();

  async function onPickType(type: WasteType, source: 'manual' | 'ai' = 'manual', confidence?: number) {
    if (!device) return;
    setLastResult(null);
    const ok = await sort(type, source, confidence);
    setLastResult(ok ? `Đã ghi nhận: ${WASTE_LABELS[type]}` : null);
    await Promise.all([loadHistory(), reloadImpact()]);
  }

  const fillLevel = device?.bins?.length ? Math.max(...device.bins.map((b) => b.fill_level)) : 0;
  const isFull = fillLevel >= FILL_ALERT_THRESHOLD;

  return (
    <View style={styles.screen}>
      <GradientView style={styles.header}>
        <Pressable style={styles.identity} onPress={() => router.push('/(household)/profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Xin chào, {profile?.full_name ?? 'hộ gia đình'}</Text>
            <Text style={styles.subGreeting}>Thùng rác nhà bạn</Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <NotificationBell />
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
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
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
        {isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}

        {!isLoading && error && (
          <Text style={{ color: colors.danger }}>
            Không tải được thông tin thùng rác: {error instanceof Error ? error.message : String(error)}
          </Text>
        )}

        {!isLoading && !error && !device && (
          <EmptyState
            title="Chưa có thùng rác nào được gán cho nhà bạn"
            description="Liên hệ quản trị viên để gán thiết bị cho tài khoản này."
          />
        )}

        {device && (
          <View style={{ gap: 10, marginTop: 16 }}>
            <Card style={styles.deviceCard}>
              <View style={styles.deviceRow}>
                <View>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceArea}>{device.area}</Text>
                </View>
                <StatusBadge label={`${Math.round(fillLevel * 100)}% đầy`} tone={isFull ? 'danger' : 'success'} />
              </View>
              <View style={styles.connRow}>
                <View style={[styles.connDot, { backgroundColor: connected ? colors.success : colors.warning }]} />
                <Text style={styles.connText}>
                  {connected
                    ? 'Đã kết nối thùng · tự động'
                    : bleStatus === 'error'
                      ? 'Mất kết nối thùng — đang tự thử lại'
                      : 'Đang tự kết nối thùng...'}
                </Text>
              </View>
            </Card>
            <NextPickupCard deviceId={device.id} />
          </View>
        )}

        {device && (
          // Bật sẵn: đưa rác ra trước camera là tự mở đúng ngăn.
          <LiveScanPanel
            defaultOn
            onDetect={(type, conf) => onPickType(type, 'ai', conf)}
            disabled={busy || !connected}
          />
        )}

        {device && <AiScanCard onConfirm={(type, conf) => onPickType(type, 'ai', conf)} disabled={busy} />}

        {device && (
          <View style={{ gap: 10 }} onLayout={(e) => (pickSection.current = e.nativeEvent.layout)}>
            <SectionTitle>Chọn loại rác</SectionTitle>
            <WasteTypeGrid onPick={(t) => onPickType(t)} disabled={busy} />
            <WasteGuideSearch onPick={(t) => onPickType(t)} disabled={busy} onFocus={scrollToSearch} />
          </View>
        )}

        {busy && <Text style={{ color: colors.textMuted }}>Đang mở ngăn rác...</Text>}
        {sortError && <Text style={{ color: colors.danger }}>{sortError}</Text>}
        {lastResult && <Text style={{ color: colors.success, fontWeight: '600' }}>{lastResult}</Text>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable onPress={() => router.push('/(household)/profile')}>
            <StatCard label="Điểm tích luỹ" value={String(profile?.points ?? 0)} hint="+1 điểm mỗi lần bỏ rác" />
          </Pressable>
          <Pressable onPress={() => router.push('/(household)/profile')}>
            <StatCard
              label="🔥 Chuỗi ngày"
              value={impact ? `${impact.streakDays} ngày` : '—'}
              hint="phân loại liên tiếp"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/(household)/profile')}>
            <StatCard
              label="🌱 CO₂ giảm được"
              value={impact ? `${impact.co2SavedKg.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg` : '—'}
              hint="ước tính"
            />
          </Pressable>
        </ScrollView>

        {device && <CollectionFeedback deviceId={device.id} />}

        <View style={{ gap: 10 }}>
          <View style={styles.historyHeaderRow}>
            <SectionTitle>Lịch sử gần đây</SectionTitle>
            <Pressable onPress={() => router.push('/(household)/history')} hitSlop={8}>
              <Text style={styles.historyLink}>Xem tất cả</Text>
            </Pressable>
          </View>

          {dbError && <Text style={{ color: colors.danger }}>{dbError}</Text>}

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
            ListEmptyComponent={!dbError ? <EmptyState title="Chưa có lần bỏ rác nào" /> : null}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 12, color: colors.textMuted },
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
  subGreeting: {
    color: colors.primaryLight,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
