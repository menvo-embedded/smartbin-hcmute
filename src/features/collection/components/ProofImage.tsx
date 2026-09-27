import { View, Text, Image, ActivityIndicator, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { resolveFileUrl } from '../../../core/supabase/storage';
import { colors } from '../../../theme/colors';

interface Props {
  /** Giá trị proof_photo_url trong DB (storage://..., file://... hoặc http...). */
  source: string;
  style?: StyleProp<ImageStyle>;
}

/** Ảnh nghiệm thu: tự xin signed URL nếu ảnh nằm trong bucket riêng tư. */
export function ProofImage({ source, style }: Props) {
  const { data: uri, isLoading, error } = useQuery({
    queryKey: ['proof_image', source],
    queryFn: () => resolveFileUrl(source),
    // Signed URL sống 1 giờ — làm mới trước khi hết hạn.
    staleTime: 50 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={[styles.placeholder, style as object]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !uri) {
    return (
      <View style={[styles.placeholder, style as object]}>
        <Text style={styles.errorText}>Không tải được ảnh nghiệm thu</Text>
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
