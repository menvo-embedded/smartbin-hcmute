import { enqueue } from '../../core/sync/queue';
import { flush } from '../../core/sync/engine';
import { uploadFile } from '../../core/supabase/storage';

const PROOF_BUCKET = 'proofs';

export type SortingQuality = 'good' | 'mixed';

/** Điểm thưởng khi phân loại đúng — khớp với trigger reward_sorting_quality trong schema.sql. */
export const GOOD_SORTING_BONUS = 5;

/**
 * Nhân viên nhận một việc chưa có người. Ghi vào hàng đợi rồi đẩy lên ngay
 * (mất mạng thì hàng đợi tự gửi lại khi có mạng) — cùng mẫu với luồng bỏ rác.
 */
export async function claimTask(taskId: string, userId: string) {
  await enqueue('collection_tasks', 'update', {
    id: taskId,
    status: 'in_progress',
    assignee_id: userId,
  });
  await flush();
}

/**
 * Xác nhận thu gom xong kèm ảnh nghiệm thu. Ảnh được tải lên Storage để admin
 * xem được trên máy khác; nếu chưa tải được (mất mạng / chưa tạo bucket) thì
 * giữ đường dẫn ảnh trong máy, việc vẫn được ghi nhận hoàn tất.
 * Trả về true nếu ảnh đã lên server.
 */
export async function completeTask(taskId: string, photoUri: string, sortingQuality?: SortingQuality) {
  let photoUrl = photoUri;
  let uploaded = false;
  if (photoUri.startsWith('file:')) {
    try {
      photoUrl = await uploadFile(PROOF_BUCKET, `${taskId}-${Date.now()}.jpg`, photoUri, 'image/jpeg');
      uploaded = true;
    } catch {
      // Giữ ảnh trong máy, không chặn việc xác nhận hoàn tất.
    }
  } else {
    uploaded = true;
  }

  await enqueue('collection_tasks', 'update', {
    id: taskId,
    status: 'done',
    completed_at: new Date().toISOString(),
    proof_photo_url: photoUrl,
    // Thùng của hộ gia đình: kèm đánh giá phân loại (server tự cộng điểm nếu đúng).
    ...(sortingQuality ? { sorting_quality: sortingQuality } : {}),
  });
  await flush();
  return uploaded;
}
