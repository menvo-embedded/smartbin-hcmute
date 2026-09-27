import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWasteScanner } from '../../ml/hooks/useWasteScanner';
import { WASTE_TYPES, WASTE_LABELS, WASTE_ICONS, type WasteType } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';
import { Card, GradientView, ProgressBar } from '../../shared/ui';

/** Dưới ngưỡng này thì nhắc người dùng kiểm tra lại trước khi bỏ. */
const LOW_CONFIDENCE = 0.6;

interface Props {
  /** Người dùng xác nhận bỏ rác theo gợi ý của AI. */
  onConfirm: (type: WasteType, confidence: number) => void;
  disabled?: boolean;
}

/**
 * Quét rác bằng AI (MobileCLIP-S0, chạy hoàn toàn trên máy): chụp/chọn ảnh →
 * gợi ý ngăn + độ tin cậy → người dùng xác nhận mới bỏ rác.
 */
export function AiScanCard({ onConfirm, disabled }: Props) {
  const { scan, result, busy, error, reset } = useWasteScanner();
  const label = result?.label as WasteType | undefined;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="scan" size={24} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Quét rác bằng AI</Text>
          <Text style={styles.desc}>Chụp ảnh rác, AI gợi ý bỏ vào ngăn nào (chạy ngay trên máy, không cần mạng)</Text>
        </View>
      </View>

      {!result && !busy && (
        <View style={styles.row}>
          <Pressable style={{ flex: 1 }} onPress={() => scan('camera')} disabled={disabled}>
            <GradientView style={styles.button}>
              <Ionicons name="camera" size={18} color={colors.textOnPrimary} />
              <Text style={styles.buttonText}>Chụp ảnh</Text>
            </GradientView>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonGhost]} onPress={() => scan('library')} disabled={disabled}>
            <Ionicons name="images" size={18} color={colors.primaryDark} />
            <Text style={styles.buttonGhostText}>Chọn ảnh</Text>
          </Pressable>
        </View>
      )}

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.desc}>Đang phân tích ảnh...</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {result && label && (
        <View style={{ gap: 10 }}>
          <View style={styles.resultRow}>
            <Image source={{ uri: result.imageUri }} style={styles.thumb} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.resultLabel}>
                <Ionicons name={WASTE_ICONS[label] as never} size={16} color={colors.primaryDark} />{' '}
                {WASTE_LABELS[label]}
              </Text>
              <Text style={styles.desc}>Độ tin cậy {Math.round(result.confidence * 100)}%</Text>
              <Text style={styles.hint} numberOfLines={2}>
                Khớp nhất: “{result.bestPrompt.replace(/^a (close-up )?photo of /, '').replace(/\.$/, '')}”
              </Text>
              <Text style={styles.hint}>
                Suy luận {Math.round(result.latencyMs)} ms · xử lý ảnh {Math.round(result.preprocessMs)} ms
              </Text>
            </View>
          </View>

          {WASTE_TYPES.map((t) => (
            <View key={t} style={{ gap: 2 }}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{WASTE_LABELS[t]}</Text>
                <Text style={styles.scoreLabel}>{Math.round((result.scores[t] ?? 0) * 100)}%</Text>
              </View>
              <ProgressBar value={result.scores[t] ?? 0} height={5} color={t === label ? colors.primary : colors.neutral} />
            </View>
          ))}

          {result.confidence < LOW_CONFIDENCE && (
            <Text style={styles.warn}>AI chưa chắc chắn — hãy kiểm tra lại hoặc tự chọn loại rác bên dưới.</Text>
          )}

          <View style={styles.row}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                onConfirm(label, result.confidence);
                reset();
              }}
              disabled={disabled}
            >
              <GradientView style={[styles.button, disabled && { opacity: 0.5 }]}>
                <Text style={styles.buttonText}>Bỏ vào ngăn {WASTE_LABELS[label]}</Text>
              </GradientView>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonGhost]} onPress={reset}>
              <Text style={styles.buttonGhostText}>Quét lại</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.credit}>Mô hình MobileCLIP-S0 (Apple, CVPR 2024) · phân loại zero-shot</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  buttonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  buttonGhost: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.card },
  buttonGhostText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  error: { color: colors.danger, fontSize: 13 },
  resultRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: colors.background },
  resultLabel: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  hint: { fontSize: 11, color: colors.textMuted },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 12, color: colors.text },
  warn: { fontSize: 13, color: colors.warning, fontWeight: '600' },
  credit: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
});
