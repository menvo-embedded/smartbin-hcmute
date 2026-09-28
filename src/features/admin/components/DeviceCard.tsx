import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forecastDevice, formatEta, type SortSample } from '../fillForecast';
import { WASTE_LABELS, FILL_ALERT_THRESHOLD } from '../../../shared/constants/waste';
import { colors } from '../../../theme/colors';
import { Card, StatusBadge, ProgressBar, GradientView } from '../../../shared/ui';
import type { DeviceWithBins } from '../types';

interface Props {
  item: DeviceWithBins;
  /** Lượt bỏ rác gần đây của mọi thùng (để dự báo). */
  samples: SortSample[];
  onQuickDispatch: (device: DeviceWithBins) => void;
}

/** Thẻ một thùng rác trên tab Thùng rác: mức đầy từng ngăn, dự báo, nút điều phối khi đầy. */
export function DeviceCard({ item, samples, onQuickDispatch }: Props) {
  const maxFill = item.bins?.length
    ? Math.max(...item.bins.map((b) => b.fill_level))
    : 0;
  const isFull = maxFill >= FILL_ALERT_THRESHOLD;

  return (
    <Card style={[styles.deviceCard, isFull && styles.deviceCardFull]}>
      {/* Header thùng */}
      <View style={styles.row}>
        <View style={styles.deviceTitleRow}>
          <View style={[styles.deviceIcon, isFull && styles.deviceIconDanger]}>
            <Ionicons
              name="trash-bin"
              size={16}
              color={isFull ? colors.danger : colors.primaryDark}
            />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.deviceName}>
              {item.name} <Text style={styles.deviceCode}>({item.code})</Text>
            </Text>
            <Text style={styles.deviceArea}>Khu vực: {item.area || 'Chưa cập nhật'}</Text>
          </View>
        </View>
        <StatusBadge
          label={item.is_online ? 'Online' : 'Offline'}
          tone={item.is_online ? 'success' : 'neutral'}
        />
      </View>

      {/* Thanh đo mức đầy từng ngăn */}
      <View style={styles.binsSection}>
        <Text style={styles.binsSectionTitle}>Mức đầy các ngăn rác:</Text>
        {item.bins?.map((bin) => {
          const fillPct = Math.round(bin.fill_level * 100);
          const binFull = bin.fill_level >= FILL_ALERT_THRESHOLD;
          const binHalf = bin.fill_level >= 0.5;
          const barColor = binFull
            ? colors.danger
            : binHalf
            ? colors.warning
            : colors.primary;

          return (
            <View key={bin.id} style={styles.binItem}>
              <View style={styles.binItemHeader}>
                <Text style={styles.binLabel}>{WASTE_LABELS[bin.waste_type]}</Text>
                <Text style={[styles.binPercent, { color: barColor }]}>{fillPct}%</Text>
              </View>
              <ProgressBar value={bin.fill_level} color={barColor} height={6} />
            </View>
          );
        })}
      </View>

      {/* Dự báo khi nào chạm ngưỡng thu gom */}
      {!isFull && (() => {
        const forecast = forecastDevice(
          item.bins ?? [],
          samples.filter((s) => s.device_id === item.id),
        );
        const soon = forecast.kind === 'eta' && forecast.hours < 24;
        return (
          <View style={[styles.forecastRow, soon && styles.forecastRowSoon]}>
            <Ionicons
              name="analytics"
              size={14}
              color={soon ? colors.warning : colors.primaryDark}
            />
            <Text style={[styles.forecastText, soon && { color: colors.warning }]}>
              {forecast.kind === 'eta'
                ? `Dự báo đầy sau ${formatEta(forecast.hours)} (ngăn ${WASTE_LABELS[forecast.wasteType]})`
                : 'Chưa đủ dữ liệu 7 ngày để dự báo'}
            </Text>
          </View>
        );
      })()}

      {/* Hành động điều phối nếu thùng đầy */}
      {isFull && (
        <View style={styles.deviceActionBox}>
          <View style={styles.alertNotice}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.alertNoticeText}>Thùng vượt ngưỡng 80% — Cần thu gom!</Text>
          </View>
          <Pressable
            style={styles.dispatchNowBtn}
            onPress={() => onQuickDispatch(item)}
          >
            <GradientView style={styles.dispatchNowGradient}>
              <Ionicons name="paper-plane" size={14} color={colors.textOnPrimary} />
              <Text style={styles.dispatchNowText}>Điều phối nhân viên dọn</Text>
            </GradientView>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  deviceCard: {
    padding: 14,
  },
  deviceCardFull: {
    borderColor: '#FECACA',
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconDanger: {
    backgroundColor: colors.dangerBg,
  },
  deviceName: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.text,
  },
  deviceCode: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 13,
  },
  deviceArea: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  binsSection: {
    marginTop: 12,
    gap: 8,
    backgroundColor: '#FAFBF9',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  binsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  binItem: {
    gap: 4,
  },
  binItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  binLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  binPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  forecastRowSoon: {
    backgroundColor: colors.warningBg,
  },
  forecastText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  deviceActionBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  dispatchNowBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  dispatchNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  dispatchNowText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
});
