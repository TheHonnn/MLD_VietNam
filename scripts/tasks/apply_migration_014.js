const fs = require('fs');
const path = require('path');
const { Client } = require('../../backend/node_modules/pg');

const DATABASE_URL = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Supabase Cloud PostgreSQL.');

  const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/014_sync_invoices_and_fix_permissions.sql'), 'utf8');
  console.log('Applying Migration 014: Sync invoices & fix permissions...');

  const res = await client.query(sql);
  console.log('Migration 014 applied successfully!');

  // Check the sync result
  const syncRes = await client.query('SELECT * FROM public.fn_sync_invoices_and_revenue();');
  console.log('Sync Result:', syncRes.rows[0]);

  // Check invoices count
  const invRes = await client.query(`
    SELECT count(*), sum(total_amount) as total_revenue FROM public.invoices;
  `);
  console.log('Invoices table now has:', invRes.rows[0]);

  // List all invoices
  const list = await client.query(`
    SELECT inv.invoice_code, inv.total_amount, inv.payment_method, inv.payment_status, inv.paid_at, u.full_name as customer_name, b.name as branch_name
    FROM public.invoices inv
    LEFT JOIN public.users u ON inv.customer_id = u.id
    LEFT JOIN public.branches b ON inv.branch_id = b.id
    ORDER BY inv.paid_at DESC;
  `);
  console.log('All Synced Invoices:');
  list.rows.forEach(r => console.log(`  - [${r.invoice_code}] ${r.customer_name} | ${Number(r.total_amount).toLocaleString('vi-VN')}đ | ${r.payment_method} | ${r.branch_name}`));

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
