import { useRef, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPhotoCaptured: (photoUri: string) => void;
}

export function CameraCaptureModal({ visible, onClose, onPhotoCaptured }: Props) {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isTaking, setIsTaking] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');

  useEffect(() => {
    if (visible && !hasPermission) {
      void requestPermission();
    }
  }, [visible, hasPermission, requestPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isTaking) return;
    try {
      setIsTaking(true);
      const photo = await cameraRef.current.takePhoto({
        flash: flash,
        enableShutterSound: false,
      });

      const photoUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      onPhotoCaptured(photoUri);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Lỗi chụp ảnh', msg || 'Không thể chụp ảnh từ camera.');
    } finally {
      setIsTaking(false);
    }
  };

  const toggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Viewfinder Camera từ phần cứng điện thoại */}
        {device != null && hasPermission ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={visible}
            photo={true}
          />
        ) : (
          <View style={styles.centered}>
            {!hasPermission ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
                <Text style={styles.permissionText}>Ứng dụng cần quyền Camera để chụp ảnh bằng chứng</Text>
                <Pressable style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Cấp quyền Camera</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.permissionBox}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.permissionText}>Đang khởi động camera điện thoại...</Text>
              </View>
            )}
          </View>
        )}

        {/* Khung hướng dẫn chụp */}
        <View style={styles.guideOverlay} pointerEvents="none">
          <View style={styles.guideFrame} />
          <Text style={styles.guideText}>Hướng camera về phía thùng rác sạch</Text>
        </View>

        {/* Header điều khiển trên cùng */}
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Chụp ảnh nghiệm thu</Text>
          <Pressable style={styles.iconBtn} onPress={toggleFlash} hitSlop={10}>
            <Ionicons
              name={flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off'}
              size={22}
              color={flash !== 'off' ? colors.warning : '#FFFFFF'}
            />
          </Pressable>
        </View>

        {/* Thanh nút chụp dưới cùng */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomRow}>
            <View style={{ width: 48 }} />

            {/* Nút chụp tròn lớn */}
            <Pressable
              style={[styles.captureOuterBtn, isTaking && styles.btnDisabled]}
              onPress={handleCapture}
              disabled={isTaking || !device || !hasPermission}
            >
              {isTaking ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={styles.captureInnerBtn} />
              )}
            </Pressable>

            <View style={{ width: 48 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionBox: {
    alignItems: 'center',
    gap: 16,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  permissionBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  guideOverlay: {
    position: 'absolute',
    top: 120,
    bottom: 140,
    left: 24,
    right: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: '100%',
    height: '75%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureOuterBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureInnerBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
