#!/usr/bin/env node
/**
 * Kiểm tra nhanh file .env đã có đủ biến môi trường cần thiết chưa, không in
 * ra giá trị key thật. Chạy: npm run check:env
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');

const REQUIRED_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_MOCK_BLE',
];

// Chỉ các key này mới bị coi là lỗi nếu vẫn còn nguyên giá trị mẫu —
// MOCK_BLE=1 giống hệt .env.example là bình thường, không phải secret.
const PLACEHOLDER_CHECK_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    result[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return result;
}

console.log('Environment check\n');

const envValues = parseEnvFile(ENV_PATH);

if (!envValues) {
  console.log('✗ Không tìm thấy file .env\n');
  console.log('Chạy `npm run setup` để tạo .env từ .env.example, rồi điền giá trị Supabase thật.');
  process.exit(1);
}

const exampleValues = parseEnvFile(EXAMPLE_PATH) ?? {};
let ok = true;

for (const key of REQUIRED_KEYS) {
  const value = envValues[key];

  if (!value) {
    console.log(`✗ ${key} missing`);
    ok = false;
    continue;
  }

  if (PLACEHOLDER_CHECK_KEYS.includes(key) && value === exampleValues[key]) {
    console.log(`✗ ${key} vẫn là giá trị mẫu trong .env.example — cần thay bằng giá trị Supabase thật`);
    ok = false;
    continue;
  }

  console.log(`✓ ${key} found`);
}

console.log('');
if (ok) {
  console.log('Environment configuration OK.');
} else {
  console.log('Thiếu hoặc sai cấu hình. Mở .env.example để xem hướng dẫn rồi cập nhật lại .env.');
  process.exit(1);
}
