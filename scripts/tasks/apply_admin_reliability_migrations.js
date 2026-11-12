const fs = require('fs');
const path = require('path');
const { parseEnv } = require('node:util');
const { Client } = require('../../backend/node_modules/pg');

const envPath = path.resolve(__dirname, '../../backend/.env');
const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};
const connectionString = process.env.ADMIN_DATABASE_URL || env.ADMIN_DATABASE_URL || process.env.DATABASE_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Không tìm thấy chuỗi kết nối DATABASE_URL');
  process.exit(1);
}

async function run() {
  console.log('--- BẮT ĐẦU ÁP DỤNG CÁC MIGRATION ADMIN RELIABILITY LÊN DATABASE ---');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Đã kết nối thành công tới Database PostgreSQL');

  const migrations = [
    '022_registration_commissions.sql',
    '027_admin_reliability.sql',
    '028_admin_access_hardening.sql',
  ];

  for (const file of migrations) {
    const fullPath = path.join(__dirname, '../../database/migrations', file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Không tìm thấy tệp migration: ${file}`);
      continue;
    }
    console.log(`⏳ Đang thực thi ${file}...`);
    const sql = fs.readFileSync(fullPath, 'utf8');
    await client.query(sql);
    console.log(`✅ Đã thực thi thành công: ${file}`);
  }

  await client.end();
  console.log('--- HOÀN TẤT ÁP DỤNG MIGRATIONS ADMIN RELIABILITY ---');
}

run().catch((err) => {
  console.error('❌ Lỗi khi thực thi migrations:', err);
  process.exit(1);
});
