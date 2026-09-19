#!/usr/bin/env node
/**
 * Tạo file .env từ .env.example nếu chưa có — không bao giờ ghi đè .env đã
 * tồn tại, không tự sinh key giả. Chạy: npm run setup
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');

if (fs.existsSync(ENV_PATH)) {
  console.log('.env đã tồn tại — không ghi đè. Chạy `npm run check:env` để kiểm tra lại.');
  process.exit(0);
}

if (!fs.existsSync(EXAMPLE_PATH)) {
  console.error('Không tìm thấy .env.example — không thể tạo .env.');
  process.exit(1);
}

fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
console.log('Đã tạo .env từ .env.example.');
console.log('Mở file .env, điền EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_ANON_KEY thật');
console.log('(xem README mục "Lấy cấu hình Supabase" để biết lấy ở đâu).');
console.log('Sau đó chạy: npm run check:env');
