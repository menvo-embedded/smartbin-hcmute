import type { ComponentProps } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { GradientView } from '../../../shared/ui';
import type { AdminTab } from '../types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  fullCount: number;
  pendingTaskCount: number;
  /** Số cảnh báo tự động chưa đọc. */
  automationCount?: number;
}

const TABS: { key: AdminTab; label: string; icon: IoniconName; tone: 'danger' | 'warning' }[] = [
  { key: 'devices', label: 'Thùng rác', icon: 'trash-bin', tone: 'danger' },
  { key: 'dispatch', label: 'Điều phối', icon: 'people', tone: 'warning' },
  { key: 'automation', label: 'Tự động', icon: 'hardware-chip', tone: 'warning' },
];

export function AdminSegmentedControl({
  activeTab,
  onTabChange,
  fullCount,
  pendingTaskCount,
  automationCount = 0,
}: Props) {
  const counts: Record<AdminTab, number> = {
    devices: fullCount,
    dispatch: pendingTaskCount,
    automation: automationCount,
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        const count = counts[tab.key];
        const badgeText = tab.tone === 'danger' ? styles.badgeTextDanger : styles.badgeTextWarning;
        const softBadge = tab.tone === 'danger' ? styles.badgeDangerSoft : styles.badgeWarningSoft;
        const content = (
          <>
            <Ionicons
              name={active ? tab.icon : (`${tab.icon}-outline` as IoniconName)}
              size={16}
              color={active ? colors.textOnPrimary : colors.textMuted}
            />
            <Text style={active ? styles.activeTabText : styles.inactiveTabText}>{tab.label}</Text>
            {count > 0 && (
              <View style={[styles.badge, active ? styles.badgeOnActive : softBadge]}>
                <Text style={badgeText}>{count > 99 ? '99+' : count}</Text>
              </View>
            )}
          </>
        );
        return (
          <Pressable key={tab.key} style={styles.tabButton} onPress={() => onTabChange(tab.key)} hitSlop={4}>
            {active ? (
              <GradientView style={styles.tab}>{content}</GradientView>
            ) : (
              <View style={styles.tab}>{content}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EBEFE8',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    gap: 4,
  },
  tabButton: {
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 5,
  },
  activeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  inactiveTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOnActive: {
    backgroundColor: '#FFFFFF',
  },
  badgeDangerSoft: {
    backgroundColor: colors.dangerBg,
  },
  badgeWarningSoft: {
    backgroundColor: colors.warningBg,
  },
  badgeTextDanger: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  badgeTextWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
});
