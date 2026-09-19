import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../shared/ui';

/**
 * Chỗ chừa cho tính năng camera + AI tự nhận diện loại rác (định hướng lâu
 * dài cho luồng hộ gia đình). CHƯA tích hợp thật — không import gì từ
 * `src/ml/` vì chưa có model/luồng camera thật để gọi. Khi làm AI thật, thay
 * nội dung component này bằng camera view + gọi `src/ml/classifier.ts`,
 * KHÔNG import TFLite/vision-camera trực tiếp ở đây (đúng nguyên tắc "Module
 * AI độc lập" trong CLAUDE.md).
 */
export function AiScanPlaceholder() {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Quét bằng camera — sắp ra mắt</Text>
        <Text style={styles.desc}>
          Sau này chỉ cần đưa rác vào camera, ứng dụng tự nhận diện loại rác. Hiện tại
          chọn loại rác thủ công ở bên dưới.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.neutralBg,
    borderStyle: 'dashed',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  desc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
