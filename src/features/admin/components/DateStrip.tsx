import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { GradientView } from '../../../shared/ui';
import type { TaskWithDetails } from '../types';

interface Props {
  selectedDate: string | null; // YYYY-MM-DD or null (for all)
  onSelectDate: (date: string | null) => void;
  tasks: TaskWithDetails[];
}

interface DayItem {
  dateString: string; // YYYY-MM-DD
  dayOfWeek: string;  // T2, T3...
  dayNumber: number;  // 20
  monthNumber: number;// 9
  relativeLabel?: string; // 'Hôm nay', 'Ngày mai'
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function formatDateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateStrip({ selectedDate, onSelectDate, tasks }: Props) {
  // Sinh danh sách 7 ngày (từ Hôm qua, Hôm nay, Ngày mai, và 4 ngày tới)
  const days: DayItem[] = useMemo(() => {
    const list: DayItem[] = [];
    const now = new Date();
    const todayStr = formatDateToIso(now);

    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tmrStr = formatDateToIso(tmr);

    // Bắt đầu từ hôm nay và 6 ngày tiếp theo
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = formatDateToIso(d);

      let label: string | undefined;
      if (iso === todayStr) label = 'Hôm nay';
      else if (iso === tmrStr) label = 'Ngày mai';

      list.push({
        dateString: iso,
        dayOfWeek: DAY_NAMES[d.getDay()],
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        relativeLabel: label,
      });
    }
    return list;
  }, []);

  // Đếm số lượng task cho từng ngày
  const taskCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      // Ưu tiên scheduled_date, nếu không có thì lấy ngày của created_at
      const dateKey = t.scheduled_date || t.created_at.slice(0, 10);
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Nút Xem tất cả */}
        <Pressable
          style={[styles.chip, selectedDate === null && styles.chipActive]}
          onPress={() => onSelectDate(null)}
          hitSlop={4}
        >
          {selectedDate === null ? (
            <GradientView style={styles.gradientChip}>
              <Text style={styles.chipTextActive}>Tất cả</Text>
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={styles.badgeTextActive}>{tasks.length}</Text>
              </View>
            </GradientView>
          ) : (
            <View style={styles.plainChip}>
              <Text style={styles.chipText}>Tất cả</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tasks.length}</Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* Danh sách từng ngày */}
        {days.map((item) => {
          const isSelected = selectedDate === item.dateString;
          const count = taskCountByDate[item.dateString] ?? 0;

          return (
            <Pressable
              key={item.dateString}
              style={[styles.dayCard, isSelected && styles.dayCardActive]}
              onPress={() => onSelectDate(item.dateString)}
              hitSlop={4}
            >
              {isSelected ? (
                <GradientView style={styles.gradientDayCard}>
                  <Text style={styles.dayOfWeekActive}>
                    {item.relativeLabel || item.dayOfWeek}
                  </Text>
                  <Text style={styles.dayNumberActive}>{item.dayNumber}</Text>
                  <Text style={styles.monthActive}>Th{item.monthNumber}</Text>
                  {count > 0 && (
                    <View style={styles.dayBadgeActive}>
                      <Text style={styles.dayBadgeTextActive}>{count}</Text>
                    </View>
                  )}
                </GradientView>
              ) : (
                <View style={styles.plainDayCard}>
                  <Text style={[styles.dayOfWeek, item.relativeLabel && styles.dayOfWeekHighlight]}>
                    {item.relativeLabel || item.dayOfWeek}
                  </Text>
                  <Text style={styles.dayNumber}>{item.dayNumber}</Text>
                  <Text style={styles.month}>Th{item.monthNumber}</Text>
                  {count > 0 && (
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>{count}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chipActive: {},
  plainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  gradientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  badgeTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  dayCard: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 64,
  },
  dayCardActive: {},
  plainDayCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 2,
  },
  gradientDayCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 2,
  },
  dayOfWeek: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dayOfWeekHighlight: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  dayOfWeekActive: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  dayNumberActive: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  month: {
    fontSize: 10,
    color: colors.textMuted,
  },
  monthActive: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  dayBadge: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  dayBadgeActive: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dayBadgeTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
