import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  useCameraDevice,
  useCameraDevices,
  useCameraFormat,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { useLiveWasteDetector } from '../hooks/useLiveWasteDetector';
import { NONE } from '../zeroShot';
import { WASTE_LABELS, type WasteType } from '../../shared/constants/waste';
import { colors } from '../../theme/colors';

interface Props {
  /** Gọi một lần khi nhận diện ổn định một loại rác. */
  onDetect: (type: WasteType, confidence: number) => void;
  /** Tạm dừng nhận diện (vd. đang mở nắp, chưa kết nối thùng). */
  paused?: boolean;
  height?: number;
}

/**
 * Khung camera nhận diện rác trực tiếp: đưa rác ra trước camera là tự nhận
 * diện, không cần bấm chụp. Hiển thị trạng thái và tiến độ xác nhận.
 */
export function LiveWasteCamera({ onDetect, paused = false, height = 300 }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const back = useCameraDevice('back');
  const all = useCameraDevices();
  const device = back ?? all[0];
  // Model chỉ cần ảnh 256×256: quay 640×480 cho nhẹ, hình xem trước mượt hơn.
  const format = useCameraFormat(device, [{ videoResolution: { width: 640, height: 480 } }, { fps: 30 }]);
  const isFocused = useIsFocused();

  const { frameProcessor, status, modelState, stableFrames, delegate } = useLiveWasteDetector(
    (label, confidence) => onDetect(label as WasteType, confidence),
    paused,
  );

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={[styles.box, styles.center, { height }]}>
        <Ionicons name="camera-outline" size={36} color={colors.textOnPrimary} />
        <Text style={styles.message}>Cần quyền camera để nhận diện rác</Text>
        <Pressable onPress={requestPermission} style={styles.permButton}>
          <Text style={styles.permText}>Cấp quyền</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.box, styles.center, { height }]}>
        <Text style={styles.message}>Không tìm thấy camera trên thiết bị này</Text>
      </View>
    );
  }

  const last = status.last;
  const seesWaste = last && last.liveLabel !== NONE;
  let caption = 'Đưa rác ra trước camera';
  if (modelState === 'loading') caption = 'Đang nạp mô hình AI...';
  else if (modelState === 'error') caption = 'Không nạp được mô hình AI';
  else if (paused) caption = 'Tạm dừng';
  else if (status.phase === 'cooldown') caption = 'Đã mở nắp — mời bỏ rác';
  else if (status.phase === 'clear') caption = 'Rút vật ra khỏi khung để bỏ lượt mới';
  else if (status.phase === 'detecting' && seesWaste) {
    caption = `Có vẻ là ${WASTE_LABELS[last.liveLabel as WasteType]}... giữ yên`;
  }

  return (
    <View style={[styles.box, { height }]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={isFocused}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {/* Khung ngắm ở giữa — vùng model thật sự nhìn (cắt giữa hình vuông). */}
      <View pointerEvents="none" style={styles.guide} />

      <View pointerEvents="none" style={styles.overlay}>
        {modelState === 'loading' && <ActivityIndicator color={colors.textOnPrimary} />}
        <Text style={styles.caption}>{caption}</Text>
        {status.phase === 'detecting' && (
          <View style={styles.dots}>
            {Array.from({ length: stableFrames }, (_, i) => (
              <View key={i} style={[styles.dot, i < status.streak && styles.dotOn]} />
            ))}
          </View>
        )}
        {last && (
          <Text style={styles.debug}>
            {last.liveLabel === NONE ? 'Không có rác' : WASTE_LABELS[last.liveLabel as WasteType]}{' '}
            {Math.round(last.liveConfidence * 100)}% · {Math.round(status.latencyMs)} ms/khung ·{' '}
            {delegate.toUpperCase()}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  message: {
    color: colors.textOnPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  permButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  permText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  guide: {
    position: 'absolute',
    alignSelf: 'center',
    top: '12%',
    width: '60%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  caption: {
    color: colors.textOnPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotOn: {
    backgroundColor: colors.primaryLight,
  },
  debug: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
});
