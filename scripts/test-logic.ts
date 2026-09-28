/**
 * Kiểm thử các hàm logic thuần của app (không cần điện thoại):
 *   npx -y tsx scripts/test-logic.ts
 */
import assert from 'node:assert/strict';
import { forecastDevice, formatEta } from '../src/features/admin/fillForecast';
import { optimizeRoute, optimizeRouteFromAnyStop, distanceKm, googleMapsRouteUrl } from '../src/features/collection/route';
import { computeImpact } from '../src/features/stats/impact';
import { searchGuide, normalize } from '../src/features/sorting/wasteGuide';
import { getTaskDisplayStatus } from '../src/features/collection/taskStatus';
import { classifyEmbedding, NONE } from '../src/ml/zeroShot';
import textData from '../src/ml/mobileclip/text_embeddings.json';
import type { Bin } from '../src/shared/types/database';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`OK   ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n     ${e instanceof Error ? e.message : String(e)}`);
  }
}

const HOUR = 3_600_000;
const now = Date.parse('2026-09-28T10:00:00Z');
const bin = (waste_type: Bin['waste_type'], fill_level: number): Bin => ({
  id: waste_type,
  device_id: 'd',
  waste_type,
  fill_level,
  updated_at: '',
});
const sample = (waste_type: Bin['waste_type'], hoursAgo: number) => ({
  device_id: 'd',
  waste_type,
  created_at: new Date(now - hoursAgo * HOUR).toISOString(),
});

// ---------- Dự báo đầy ----------
test('dự báo: ngăn ≥80% → đã đầy', () => {
  assert.equal(forecastDevice([bin('huu_co', 0.85)], [], now).kind, 'full');
});
test('dự báo: không có lượt bỏ rác → chưa đủ dữ liệu', () => {
  assert.equal(forecastDevice([bin('huu_co', 0.3)], [], now).kind, 'no_data');
});
test('dự báo: 10 lượt/10 giờ ở 40% → 20 giờ nữa chạm 80%', () => {
  const samples = Array.from({ length: 10 }, (_, i) => sample('huu_co', i + 1));
  const f = forecastDevice([bin('huu_co', 0.4)], samples, now);
  assert.equal(f.kind, 'eta');
  if (f.kind === 'eta') assert.ok(Math.abs(f.hours - 20) < 0.01, `hours=${f.hours}`);
});
test('dự báo: chọn ngăn chạm ngưỡng sớm nhất', () => {
  const samples = [...Array.from({ length: 10 }, (_, i) => sample('huu_co', i + 1)), sample('tai_che', 10)];
  const f = forecastDevice([bin('huu_co', 0.2), bin('tai_che', 0.78)], samples, now);
  assert.ok(f.kind === 'eta' && f.wasteType === 'tai_che');
});
test('dự báo: bỏ qua lượt cũ hơn 7 ngày', () => {
  assert.equal(forecastDevice([bin('huu_co', 0.3)], [sample('huu_co', 24 * 8)], now).kind, 'no_data');
});
test('formatEta', () => {
  assert.equal(formatEta(0.5), 'dưới 1 giờ');
  assert.equal(formatEta(5.4), '~5 giờ');
  assert.equal(formatEta(72), '~3 ngày');
});

// ---------- Lộ trình ----------
const A = { lat: 10.85, lng: 106.77 };
test('khoảng cách haversine ~1 độ vĩ ≈ 111 km', () => {
  const d = distanceKm({ lat: 10, lng: 106 }, { lat: 11, lng: 106 });
  assert.ok(Math.abs(d - 111.2) < 0.5, `d=${d}`);
});
test('lộ trình: ghé đủ mọi điểm, mỗi điểm 1 lần', () => {
  const stops = Array.from({ length: 7 }, (_, i) => ({ id: String(i), lat: 10.85 + Math.sin(i) * 0.01, lng: 106.77 + Math.cos(i * 2) * 0.01 }));
  const { order } = optimizeRoute(A, stops);
  assert.equal(order.length, stops.length);
  assert.equal(new Set(order.map((s) => s.id)).size, stops.length);
});
test('lộ trình: các điểm trên một đường thẳng → đi theo thứ tự', () => {
  const stops = [3, 1, 4, 2].map((k) => ({ id: String(k), lat: 10.85 + k * 0.01, lng: 106.77 }));
  const { order, totalKm } = optimizeRoute(A, stops);
  assert.deepEqual(order.map((s) => s.id), ['1', '2', '3', '4']);
  assert.ok(Math.abs(totalKm - distanceKm(A, stops[2])) < 0.01);
});
test('lộ trình: 2-opt không tệ hơn đi theo thứ tự nhập', () => {
  const stops = Array.from({ length: 8 }, (_, i) => ({ id: String(i), lat: 10.85 + ((i * 37) % 11) * 0.003, lng: 106.77 + ((i * 53) % 13) * 0.003 }));
  const naive = stops.reduce((acc, s, i) => acc + distanceKm(i === 0 ? A : stops[i - 1], s), 0);
  assert.ok(optimizeRoute(A, stops).totalKm <= naive + 1e-9);
});
test('lộ trình không có GPS: xuất phát ở thùng đầu mút, danh sách vẫn đủ mọi thùng', () => {
  const stops = [2, 1, 3].map((k) => ({ id: String(k), lat: 10.85 + k * 0.01, lng: 106.77 }));
  const r = optimizeRouteFromAnyStop(stops);
  assert.equal(r.order.length, stops.length);
  assert.equal(r.order[0], r.start);
  assert.ok(['1', '3'].includes(r.start.id), `start=${r.start.id}`);
});
test('link Google Maps có điểm đến', () => {
  assert.match(googleMapsRouteUrl(A, [{ lat: 10.86, lng: 106.78 }]), /destination=10\.86,106\.78/);
});

// ---------- Tác động môi trường + huy hiệu ----------
const row = (waste_type: Bin['waste_type'], daysAgo: number) =>
  ({ waste_type, created_at: new Date(Date.now() - daysAgo * 24 * HOUR).toISOString() }) as never;
test('tác động: kg + CO₂ theo hệ số', () => {
  const imp = computeImpact([row('huu_co', 0), row('tai_che', 0), row('vo_co', 0)]);
  assert.ok(Math.abs(imp.totalKg - 1.0) < 1e-9);
  assert.ok(Math.abs(imp.co2SavedKg - (0.5 * 0.5 + 0.2 * 1.5)) < 1e-9);
});
test('chuỗi ngày: 3 ngày liên tiếp tới hôm nay = 3', () => {
  assert.equal(computeImpact([row('huu_co', 0), row('huu_co', 1), row('huu_co', 2), row('huu_co', 4)]).streakDays, 3);
});
test('chuỗi ngày: hôm nay chưa bỏ nhưng hôm qua có → vẫn giữ chuỗi', () => {
  assert.equal(computeImpact([row('huu_co', 1), row('huu_co', 2)]).streakDays, 2);
});
test('huy hiệu: lần đầu đạt, 100 lượt chưa đạt', () => {
  const b = computeImpact([row('huu_co', 0)]).badges;
  assert.ok(b.find((x) => x.id === 'first')!.earned);
  assert.ok(!b.find((x) => x.id === 'hundred')!.earned);
});

// ---------- Tra cứu rác ----------
test('tra cứu không dấu: "vo chuoi" → Hữu cơ', () => {
  const r = searchGuide('vo chuoi');
  assert.ok(r.length > 0 && r[0].kind === 'item' && r[0].item.type === 'huu_co');
});
test('tra cứu "pin" → cảnh báo rác nguy hại', () => {
  assert.equal(searchGuide('pin')[0]?.kind, 'hazard');
});
test('tra cứu "chai nhựa" → Tái chế', () => {
  const r = searchGuide('chai nhựa');
  assert.ok(r[0]?.kind === 'item' && r[0].item.type === 'tai_che');
});
test('tra cứu chuỗi rỗng → không có kết quả', () => {
  assert.equal(searchGuide('   ').length, 0);
});
test('normalize bỏ dấu + đ', () => {
  assert.equal(normalize('  Đồ ĂN Thừa '), 'do an thua');
});

// ---------- Trạng thái việc ----------
test('việc chưa nhận quá 24 giờ → Quá hạn', () => {
  assert.equal(getTaskDisplayStatus({ status: 'pending', created_at: new Date(Date.now() - 25 * HOUR).toISOString() }), 'overdue');
  assert.equal(getTaskDisplayStatus({ status: 'pending', created_at: new Date().toISOString() }), 'pending');
  assert.equal(getTaskDisplayStatus({ status: 'done', created_at: '2020-01-01' }), 'done');
});

// ---------- Phân loại zero-shot (MobileCLIP) ----------
const data = textData as { classes: string[]; prompt_classes: string[]; prompts: string[]; embeddings: number[][] };
test('zero-shot: vector trùng câu mô tả của lớp nào → ra đúng lớp đó (mọi câu)', () => {
  let wrong = 0;
  data.embeddings.forEach((e, i) => {
    const r = classifyEmbedding(e);
    const expected = data.prompt_classes[i];
    if (expected === NONE ? r.liveLabel !== NONE : r.label !== expected) wrong++;
  });
  assert.equal(wrong, 0, `${wrong}/${data.embeddings.length} câu sai`);
});
test('zero-shot: điểm 3 nhóm rác cộng lại = 1, độ tin cậy trong [0,1]', () => {
  const r = classifyEmbedding(data.embeddings[0]);
  const sum = Object.values(r.scores).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9 && r.confidence > 0 && r.confidence <= 1 && r.liveConfidence <= 1);
  assert.ok(!(NONE in r.scores));
});
test('zero-shot: vector không (ảnh đen) không làm crash / NaN', () => {
  const r = classifyEmbedding(new Array(data.embeddings[0].length).fill(0));
  assert.ok(Number.isFinite(r.confidence));
});

console.log(`\n${passed} đạt, ${failed} lỗi`);
process.exit(failed ? 1 : 0);
