const fs = require('fs');
const path = require('path');
const { parseEnv } = require('node:util');
const { Client } = require('../../backend/node_modules/pg');

const envPath = path.resolve(__dirname, '../../backend/.env');
const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};
const connectionString = process.env.ADMIN_DATABASE_URL || env.ADMIN_DATABASE_URL || process.env.DATABASE_URL || env.DATABASE_URL;

async function cleanup() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('🔍 Đang tìm các hóa đơn thử nghiệm (UAT, TEST, E2E, SEC-ENR)...');
  const findRes = await client.query(`
    SELECT id, invoice_code, total_amount, paid_at 
    FROM public.invoices 
    WHERE invoice_code LIKE '%UAT%' 
       OR invoice_code LIKE '%TEST%' 
       OR invoice_code LIKE '%E2E%' 
       OR invoice_code LIKE '%SEC-ENR%'
  `);

  const ids = findRes.rows.map(r => r.id);
  console.log(`Phát hiện ${ids.length} hóa đơn thử nghiệm cần dọn dẹp:`);
  findRes.rows.forEach(r => console.log(` - ${r.invoice_code} (${Number(r.total_amount).toLocaleString('vi-VN')}đ)`));

  if (ids.length > 0) {
    // 1. Xóa các bản ghi liên quan trong invoice_items
    const delItems = await client.query('DELETE FROM public.invoice_items WHERE invoice_id = ANY($1::uuid[]) RETURNING id;', [ids]);
    console.log(`✅ Đã xóa ${delItems.rowCount} dòng hàng invoice_items.`);

    // 2. Xóa các bản ghi liên quan trong invoice_edit_history
    const delHistory = await client.query('DELETE FROM public.invoice_edit_history WHERE invoice_id = ANY($1::uuid[]) RETURNING id;', [ids]);
    console.log(`✅ Đã xóa ${delHistory.rowCount} bản ghi invoice_edit_history.`);

    // 3. Xóa các hoa hồng liên quan trong staff_commissions
    const delComm = await client.query('DELETE FROM public.staff_commissions WHERE invoice_id = ANY($1::uuid[]) RETURNING id;', [ids]);
    console.log(`✅ Đã xóa ${delComm.rowCount} bản ghi staff_commissions.`);

    // 4. Xóa hóa đơn trong invoices
    const delInv = await client.query('DELETE FROM public.invoices WHERE id = ANY($1::uuid[]) RETURNING id;', [ids]);
    console.log(`✅ Đã xóa thành công ${delInv.rowCount} hóa đơn thử nghiệm trong invoices.`);
  }

  // Kiểm tra lại danh sách hóa đơn còn lại
  const remainRes = await client.query('SELECT count(*)::int as count, sum(total_amount)::numeric as total FROM public.invoices;');
  console.log('📊 Trạng thái sau dọn dẹp:', remainRes.rows[0]);

  await client.end();
}

cleanup().catch((err) => {
  console.error('Lỗi dọn dẹp:', err);
  process.exit(1);
});
