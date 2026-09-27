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

/** "YYYY-MM-DD" theo giờ trên máy (toISOString là giờ UTC, lệch ngày ở VN trước 7h sáng). */
export function toLocalDateString(d: Date = new Date()): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
