const fs = require('fs');
const path = require('path');
const { Client } = require('../../backend/node_modules/pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
  console.log('--- ĐANG ÁP DỤNG MIGRATION GIAI ĐOẠN 4: DRC & AUTO-RELEASE LÊN SUPABASE CLOUD ---');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Đã kết nối Supabase Cloud PostgreSQL');

  const sqlPath = path.join(__dirname, '../../database/migrations/013_phase4_drc_auto_release_and_least_busy.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await client.query(sql);
  console.log('✅ Đã áp dụng thành công migration 013_phase4_drc_auto_release_and_least_busy.sql');

  // Kiểm tra hàm fn_auto_release_expired_bookings
  const testRelease = await client.query('SELECT * FROM public.fn_auto_release_expired_bookings()');
  console.log('Test fn_auto_release_expired_bookings():', testRelease.rows[0]);

  // Kiểm tra hàm fn_dispatch_least_busy_technician
  const branchRes = await client.query('SELECT id FROM public.branches LIMIT 1');
  const branchId = branchRes.rows[0].id;
  const today = new Date().toISOString().split('T')[0];
  const testDispatch = await client.query('SELECT * FROM public.fn_dispatch_least_busy_technician($1, $2, $3, $4)', [
    branchId,
    today,
    '09:00:00',
    '10:00:00',
  ]);
  console.log('Test fn_dispatch_least_busy_technician():', testDispatch.rows[0]);

  await client.end();
  console.log('--- HOÀN TẤT ÁP DỤNG MIGRATION GIAI ĐOẠN 4 ---');
}

applyMigration().catch((err) => {
  console.error('❌ Lỗi áp dụng migration:', err);
  process.exit(1);
});
