import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '../../core/supabase/client';
import { getDb } from '../../core/storage/db';
import { useAuth } from '../../features/auth/store';
import { useSortAction } from '../../features/sorting/useSortAction';
import { WasteTypeGrid } from '../../features/sorting/WasteTypeGrid';
import { AiScanPlaceholder } from '../../features/household/AiScanPlaceholder';
import { WASTE_LABELS, FILL_ALERT_THRESHOLD, type WasteType } from '../../shared/constants/waste';
import type { Device, Bin } from '../../shared/types/database';
import { colors } from '../../theme/colors';
import { Card, StatCard, StatusBadge, SectionTitle, EmptyState, GradientView } from '../../shared/ui';

interface LocalSortRow {
  local_id: string;
  waste_type: WasteType;
  synced: number;
  created_at: string;
}

type DeviceWithBins = Device & { bins: Bin[] };

export default function HouseholdHome() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const userId = useAuth((s) => s.session?.user.id ?? null);

  const { data: devices, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['household_devices', userId],
    enabled: !!userId,
    queryFn: async () => {
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
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [history, setHistory] = useState<LocalSortRow[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<LocalSortRow>(
        `SELECT local_id, waste_type, synced, created_at FROM sort_events ORDER BY created_at DESC LIMIT 10`,
      );
      setHistory(rows);
      setDbError(null);
    } catch (e) {
      setDbError(e instanceof Error ? e.message : 'Không đọc được lịch sử cục bộ');
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function onPickType(type: WasteType) {
    if (!device) return;
    setLastResult(null);
    const ok = await sort(type, 'manual');
    setLastResult(ok ? `Đã ghi nhận: ${WASTE_LABELS[type]}` : null);
    await loadHistory();
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
        <View style={{ marginTop: 16 }}>
          <AiScanPlaceholder />
        </View>

        {isLoading && <ActivityIndicator style={{ marginTop: 8 }} />}

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
          <View style={{ gap: 10 }}>
            <Card style={styles.deviceCard}>
              <View style={styles.deviceRow}>
                <View>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceArea}>{device.area}</Text>
                </View>
                <StatusBadge label={`${Math.round(fillLevel * 100)}% đầy`} tone={isFull ? 'danger' : 'success'} />
              </View>
            </Card>
          </View>
        )}

        {device && (
          <View style={{ gap: 10 }}>
            <SectionTitle>Chọn loại rác</SectionTitle>
            <WasteTypeGrid onPick={onPickType} disabled={busy} />
          </View>
        )}

        {busy && <Text style={{ color: colors.textMuted }}>Đang mở ngăn rác...</Text>}
        {sortError && <Text style={{ color: colors.danger }}>{sortError}</Text>}
        {lastResult && <Text style={{ color: colors.success, fontWeight: '600' }}>{lastResult}</Text>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <StatCard label="Tổng số lần bỏ rác" value={String(history.length)} hint="10 lần gần nhất" />
        </ScrollView>

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
