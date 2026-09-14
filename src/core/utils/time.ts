/** Hàm dùng chung, không biết gì về nghiệp vụ — chỉ format thời gian. */

const DIVISIONS: { amount: number; label: string }[] = [
  { amount: 60, label: 'giây' },
  { amount: 60, label: 'phút' },
  { amount: 24, label: 'giờ' },
  { amount: 7, label: 'ngày' },
  { amount: 4.345, label: 'tuần' },
  { amount: 12, label: 'tháng' },
  { amount: Infinity, label: 'năm' },
];

/** "5 phút trước", "2 giờ trước"... từ một chuỗi ISO. */
export function formatRelativeTime(isoDate: string): string {
  let diff = (Date.now() - new Date(isoDate).getTime()) / 1000;
  if (diff < 5) return 'vừa xong';

  for (const division of DIVISIONS) {
    if (diff < division.amount) {
      return `${Math.floor(diff)} ${division.label} trước`;
    }
    diff /= division.amount;
  }
  return 'vừa xong';
}
