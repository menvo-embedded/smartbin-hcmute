import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { GradientView } from '../../../shared/ui';
import type { AdminTab } from '../types';

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  fullCount: number;
  pendingTaskCount: number;
}

export function AdminSegmentedControl({ activeTab, onTabChange, fullCount, pendingTaskCount }: Props) {
  return (
    <View style={styles.container}>
      {/* Tab Giám sát Thùng rác */}
      <Pressable
        style={styles.tabButton}
        onPress={() => onTabChange('devices')}
        hitSlop={4}
      >
        {activeTab === 'devices' ? (
          <GradientView style={styles.activeTab}>
            <Ionicons name="trash-bin" size={16} color={colors.textOnPrimary} />
            <Text style={styles.activeTabText}>Thùng rác</Text>
            {fullCount > 0 && (
              <View style={[styles.badge, styles.badgeDanger]}>
                <Text style={styles.badgeTextDanger}>{fullCount}</Text>
              </View>
            )}
          </GradientView>
        ) : (
          <View style={styles.inactiveTab}>
            <Ionicons name="trash-bin-outline" size={16} color={colors.textMuted} />
            <Text style={styles.inactiveTabText}>Thùng rác</Text>
            {fullCount > 0 && (
              <View style={[styles.badge, styles.badgeDangerSoft]}>
                <Text style={styles.badgeTextDanger}>{fullCount}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {/* Tab Điều phối Thu gom */}
      <Pressable
        style={styles.tabButton}
        onPress={() => onTabChange('dispatch')}
        hitSlop={4}
      >
        {activeTab === 'dispatch' ? (
          <GradientView style={styles.activeTab}>
            <Ionicons name="people" size={16} color={colors.textOnPrimary} />
            <Text style={styles.activeTabText}>Điều phối thu gom</Text>
            {pendingTaskCount > 0 && (
              <View style={[styles.badge, styles.badgeWarning]}>
                <Text style={styles.badgeTextWarning}>{pendingTaskCount}</Text>
              </View>
            )}
          </GradientView>
        ) : (
          <View style={styles.inactiveTab}>
            <Ionicons name="people-outline" size={16} color={colors.textMuted} />
            <Text style={styles.inactiveTabText}>Điều phối thu gom</Text>
            {pendingTaskCount > 0 && (
              <View style={[styles.badge, styles.badgeWarningSoft]}>
                <Text style={styles.badgeTextWarning}>{pendingTaskCount}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
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
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDanger: {
    backgroundColor: '#FFFFFF',
  },
  badgeDangerSoft: {
    backgroundColor: colors.dangerBg,
  },
  badgeWarning: {
    backgroundColor: '#FFFFFF',
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
