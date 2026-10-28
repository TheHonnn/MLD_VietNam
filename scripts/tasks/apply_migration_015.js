const fs = require('fs');
const path = require('path');
const { Client } = require('../../backend/node_modules/pg');

const DATABASE_URL = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function applyMigration015() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Supabase Cloud PostgreSQL.');

  const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/015_fix_rls_medical_commissions_and_sync_commissions.sql'), 'utf8');
  console.log('Applying Migration 015: Fix RLS for Medical & Commissions, and sync staff commissions...');

  await client.query(sql);
  console.log('Migration 015 applied successfully!');

  // Check sync result
  const syncRes = await client.query('SELECT * FROM public.fn_sync_staff_commissions();');
  console.log('Commission Sync Result:', syncRes.rows[0]);

  // Check count of commissions
  const commRes = await client.query(`
    SELECT count(*), coalesce(sum(commission_amount), 0) as total_comm FROM public.staff_commissions;
  `);
  console.log('Staff Commissions now has:', commRes.rows[0]);

  // Check sample commissions
  const commList = await client.query(`
    SELECT sc.id, sc.commission_type, sc.base_amount, sc.percentage, sc.commission_amount, sc.status, sc.cycle_month, sc.notes, u.full_name as staff_name
    FROM public.staff_commissions sc
    LEFT JOIN public.users u ON sc.staff_id = u.id
    ORDER BY sc.created_at DESC;
  `);
  console.log('List of Commissions:');
  commList.rows.forEach(c => console.log(`  - [${c.commission_type}] ${c.staff_name} | ${Number(c.commission_amount).toLocaleString('vi-VN')}đ (${c.percentage}%) | ${c.notes}`));

  await client.end();
}

applyMigration015().catch(err => {
  console.error('Migration 015 failed:', err);
  process.exit(1);
});
