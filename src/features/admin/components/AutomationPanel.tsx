import type { ComponentProps } from 'react';
import { View, Text, Pressable, ScrollView, Switch, RefreshControl, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toLocalDateString } from '../../../core/utils/time';
import { useAutomation } from '../hooks/useAutomation';
import { useNotifications } from '../../notifications/useNotifications';
import { NotificationRow } from '../../notifications/NotificationBell';
import { formatStaffName, getErrorMessage, type TaskWithDetails } from '../types';
import type { Profile } from '../../../shared/types/database';
import { colors } from '../../../theme/colors';
import { Card, SectionTitle, GradientView, EmptyState } from '../../../shared/ui';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ESCALATE_OPTIONS = [15, 30, 60];
const OFFLINE_OPTIONS = [5, 10, 30];

interface Props {
  tasks: TaskWithDetails[];
  collectors: Profile[];
}

/**
 * Trung tâm tự động hoá của quản lý: xem hệ thống đã tự làm gì hôm nay,
 * bật/tắt từng quy tắc, chọn nhân viên đang trực và xem nhật ký tự động.
 * Mọi quy tắc chạy trên server (trigger + pg_cron mỗi 5 phút), app chỉ cấu hình.
 */
export function AutomationPanel({ tasks, collectors }: Props) {
  const { settings, isLoading, refetch, updateSettings, setOnDuty, runNow } = useAutomation();
  const { items: notifications, refetch: refetchLog } = useNotifications();

  const today = toLocalDateString();
  const createdToday = tasks.filter((t) => toLocalDateString(new Date(t.created_at)) === today);
  const autoCreated = createdToday.filter((t) => t.origin && t.origin !== 'manual').length;
  const autoAssigned = createdToday.filter((t) => t.auto_assigned).length;
  const log = notifications.filter((n) => n.recipient_id === null).slice(0, 20);
  const unreadAlerts = log.filter((n) => !n.read_at).length;

  function openCount(collectorId: string) {
    return tasks.filter((t) => t.assignee_id === collectorId && t.status !== 'done').length;
  }

  function onRunNow() {
    runNow.mutate(undefined, {
      onSuccess: (r) =>
        Alert.alert(
          'Đã chạy vòng kiểm tra',
          `• Lên lịch mới theo dự báo: ${r.planned}\n• Việc được nhắc / tự giao lại: ${r.escalated}\n• Thiết bị mất kết nối: ${r.offline}`,
        ),
      onError: (e) => Alert.alert('Lỗi', getErrorMessage(e)),
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ gap: 16, paddingBottom: 32, paddingTop: 4 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void refetch();
            void refetchLog();
          }}
        />
      }
    >
      <GradientView style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.pulse} />
          <Text style={styles.heroTitle}>Hệ thống đang tự vận hành</Text>
        </View>
        <Text style={styles.heroSub}>Tự kiểm tra mỗi 5 phút · phản ứng ngay khi thùng đầy</Text>
        <View style={styles.heroStats}>
          <HeroStat value={autoCreated} label="Việc tự tạo hôm nay" />
          <HeroStat value={autoAssigned} label="Tự giao hôm nay" />
          <HeroStat value={unreadAlerts} label="Cảnh báo mới" />
        </View>
        <Pressable style={styles.runBtn} onPress={onRunNow} disabled={runNow.isPending}>
          {runNow.isPending ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (
            <>
              <Ionicons name="play-circle" size={18} color={colors.primaryDark} />
              <Text style={styles.runBtnText}>Chạy kiểm tra ngay</Text>
            </>
          )}
        </Pressable>
      </GradientView>

      <SectionTitle>Quy tắc tự động</SectionTitle>
      <Card style={styles.card}>
        {isLoading || !settings ? (
          <ActivityIndicator />
        ) : (
          <>
            <RuleRow
              icon="warning"
              title="Thùng vượt 80%: việc khẩn"
              desc="Tạo việc trong ngày, hoặc nâng việc đang có lên khẩn"
              locked
            />
            <RuleRow
              icon="analytics"
              title="Lên lịch trước khi đầy"
              desc="Ngăn đạt 60% hoặc dự báo đầy trong 12 giờ: xếp vào ca gần nhất"
              value={settings.predictive_schedule}
              onChange={(v) => updateSettings.mutate({ predictive_schedule: v })}
            />
            <RuleRow
              icon="git-branch"
              title="Tự giao việc"
              desc="Việc mới giao cho nhân viên đang trực có ít việc nhất trong ngày"
              value={settings.auto_dispatch}
              onChange={(v) => updateSettings.mutate({ auto_dispatch: v })}
            />
            <OptionRow
              icon="alarm"
              title="Nhắc & leo thang sau"
              desc="Việc khẩn chưa xong / việc chưa ai nhận"
              options={ESCALATE_OPTIONS}
              value={settings.escalate_after_min}
              onChange={(v) => updateSettings.mutate({ escalate_after_min: v })}
            />
            <OptionRow
              icon="cloud-offline"
              title="Báo mất kết nối sau"
              desc="Thùng không gửi tín hiệu trong khoảng này"
              options={OFFLINE_OPTIONS}
              value={settings.offline_after_min}
              onChange={(v) => updateSettings.mutate({ offline_after_min: v })}
              last
            />
          </>
        )}
      </Card>

      <SectionTitle>Nhân viên đang trực</SectionTitle>
      <Card style={styles.card}>
        {collectors.length === 0 && <Text style={styles.muted}>Chưa có nhân viên thu gom.</Text>}
        {collectors.map((c, i) => {
          const onDuty = c.on_duty !== false;
          return (
            <View key={c.id} style={[styles.staffRow, i === collectors.length - 1 && styles.lastRow]}>
              <View style={[styles.avatar, !onDuty && styles.avatarOff]}>
                <Text style={styles.avatarText}>{formatStaffName(c.full_name).charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{formatStaffName(c.full_name)}</Text>
                <Text style={styles.ruleDesc}>
                  {onDuty ? 'Đang trực' : 'Nghỉ — không nhận việc tự động'} · {openCount(c.id)} việc đang mở
                </Text>
              </View>
              <Switch
                value={onDuty}
                onValueChange={(v) => setOnDuty.mutate({ collectorId: c.id, onDuty: v })}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.card}
              />
            </View>
          );
        })}
      </Card>

      <SectionTitle>Nhật ký tự động</SectionTitle>
      {log.length === 0 ? (
        <EmptyState title="Chưa có hoạt động" description="Khi hệ thống tự tạo, tự giao hay cảnh báo, nhật ký sẽ hiện ở đây." />
      ) : (
        <View style={{ gap: 8 }}>
          {log.map((n) => (
            <NotificationRow key={n.id} item={n} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function RuleRow({
  icon,
  title,
  desc,
  value,
  onChange,
  locked,
}: {
  icon: IoniconName;
  title: string;
  desc: string;
  value?: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleDesc}>{desc}</Text>
      </View>
      {locked ? (
        <View style={styles.lockedTag}>
          <Ionicons name="lock-closed" size={12} color={colors.success} />
          <Text style={styles.lockedText}>Luôn bật</Text>
        </View>
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.card}
        />
      )}
    </View>
  );
}

function OptionRow({
  icon,
  title,
  desc,
  options,
  value,
  onChange,
  last,
}: {
  icon: IoniconName;
  title: string;
  desc: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.ruleRow, styles.optionRow, last && styles.lastRow]}>
      <View style={styles.optionHead}>
        <View style={styles.ruleIcon}>
          <Ionicons name={icon} size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ruleTitle}>{title}</Text>
          <Text style={styles.ruleDesc}>{desc}</Text>
        </View>
      </View>
      <View style={styles.chips}>
        {options.map((o) => (
          <Pressable key={o} onPress={() => onChange(o)} style={[styles.chip, value === o && styles.chipActive]}>
            <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o} phút</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 18, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#86efac',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  heroTitle: { color: colors.textOnPrimary, fontSize: 17, fontWeight: '800' },
  heroSub: { color: colors.primaryLight, fontSize: 13 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  heroStatValue: { color: colors.textOnPrimary, fontSize: 22, fontWeight: '800' },
  heroStatLabel: { color: colors.primaryLight, fontSize: 11, textAlign: 'center', marginTop: 2 },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 4,
  },
  runBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  card: { paddingVertical: 4 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionRow: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastRow: { borderBottomWidth: 0 },
  ruleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  ruleDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockedText: { fontSize: 11, fontWeight: '700', color: colors.success },
  chips: { flexDirection: 'row', gap: 8, paddingLeft: 48 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOff: { backgroundColor: colors.neutral },
  avatarText: { color: colors.textOnPrimary, fontWeight: '700' },
  muted: { color: colors.textMuted, paddingVertical: 12 },
});
