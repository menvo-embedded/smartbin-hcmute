import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveWasteCamera } from '../../ml/components/LiveWasteCamera';
import { WASTE_LABELS, type WasteType } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { Card, GradientView } from '../../shared/ui';

interface Props {
  /** Nhận diện xong → mở đúng ngăn (luồng bỏ rác của từng màn hình). */
  onDetect: (type: WasteType, confidence: number) => void;
  /** Không cho nhận diện (vd. đang mở ngăn, chưa kết nối thùng). */
  disabled?: boolean;
  /** Mở sẵn camera khi vào màn hình (kiosk). */
  defaultOn?: boolean;
}

/**
 * Bật/tắt nhận diện rác trực tiếp bằng camera: đưa rác ra trước camera, AI
 * nhận ra loại rác và tự mở đúng ngăn — không cần bấm gì.
 */
export function LiveScanPanel({ onDetect, disabled, defaultOn = false }: Props) {
  const [on, setOn] = useState(defaultOn);
  const [lastOpened, setLastOpened] = useState<{ type: WasteType; confidence: number } | null>(null);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="videocam" size={22} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tự nhận diện & mở nắp</Text>
          <Text style={styles.desc}>Đưa rác ra trước camera, AI tự nhận ra và mở đúng ngăn</Text>
        </View>
        <Pressable onPress={() => setOn((v) => !v)} hitSlop={8}>
          {on ? (
            <View style={[styles.toggle, styles.toggleOff]}>
              <Text style={styles.toggleOffText}>Tắt</Text>
            </View>
          ) : (
            <GradientView style={styles.toggle}>
              <Text style={styles.toggleText}>Bật</Text>
            </GradientView>
          )}
        </Pressable>
      </View>

      {on && (
        <LiveWasteCamera
          paused={disabled}
          onDetect={(type, confidence) => {
            setLastOpened({ type, confidence });
            onDetect(type, confidence);
          }}
        />
      )}

      {lastOpened && (
        <View style={styles.result}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.resultText}>
            Đã mở ngăn {WASTE_LABELS[lastOpened.type]} ({Math.round(lastOpened.confidence * 100)}%)
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textMuted },
  toggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  toggleText: { color: colors.textOnPrimary, fontWeight: '700' },
  toggleOff: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  toggleOffText: { color: colors.textMuted, fontWeight: '700' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultText: { fontSize: 14, fontWeight: '600', color: colors.success },
});
