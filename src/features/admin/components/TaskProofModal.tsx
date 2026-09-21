import { Modal, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { StatusBadge } from '../../../shared/ui';
import type { TaskWithDetails } from '../types';

interface Props {
  visible: boolean;
  task: TaskWithDetails | null;
  onClose: () => void;
}

export function TaskProofModal({ visible, task, onClose }: Props) {
  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nghiệm thu dọn sạch</Text>
              <Text style={styles.subtitle}>
                Thùng: {task.devices?.name ?? 'Không xác định'} ({task.devices?.area ?? '—'})
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Proof Photo */}
          <View style={styles.photoContainer}>
            {task.proof_photo_url ? (
              <Image
                source={{ uri: task.proof_photo_url }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noPhoto}>
                <Ionicons name="image-outline" size={48} color={colors.textMuted} />
                <Text style={styles.noPhotoText}>Không có ảnh đính kèm</Text>
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Trạng thái:</Text>
              <StatusBadge label="Đã hoàn tất" tone="success" />
            </View>

            {task.profiles?.full_name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nhân viên thực hiện:</Text>
                <Text style={styles.detailValue}>{task.profiles.full_name}</Text>
              </View>
            )}

            {task.completed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hoàn tất lúc:</Text>
                <Text style={styles.detailValue}>
                  {new Date(task.completed_at).toLocaleString('vi-VN')}
                </Text>
              </View>
            )}

            {task.note ? (
              <View style={styles.noteContainer}>
                <Text style={styles.detailLabel}>Ghi chú của nhân viên:</Text>
                <Text style={styles.noteText}>{task.note}</Text>
              </View>
            ) : null}
          </View>

          {/* Close button */}
          <Pressable style={styles.closeActionButton} onPress={onClose}>
            <Text style={styles.closeActionText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noPhotoText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  details: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  noteContainer: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  closeActionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.neutralBg,
    alignItems: 'center',
  },
  closeActionText: {
    fontWeight: '600',
    color: colors.text,
  },
});
