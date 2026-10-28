const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  console.log('Connected to Supabase Cloud PostgreSQL.');

  // Update HD-SPA-UAT-RELEASE-4436-6c7d03 and other 8% spa invoices according to Option B
  // Pre-tax: 700.000, VAT 8%: 56.000, Total: 756.000
  const updateRes = await client.query(`
    UPDATE public.invoices
    SET 
      pre_tax_amount = 700000.00,
      vat_rate = 8.00,
      vat_amount = 56000.00,
      total_amount = 756000.00
    WHERE invoice_code = 'HD-SPA-UAT-RELEASE-4436-6c7d03'
    RETURNING id, invoice_code, pre_tax_amount, vat_rate, vat_amount, total_amount;
  `);
  console.log('Updated invoice:', updateRes.rows[0]);

  // Also update staff commission base amount to remain 700.000đ (10% = 70.000đ)
  if (updateRes.rows.length > 0) {
    const scUpdate = await client.query(`
      UPDATE public.staff_commissions
      SET 
        base_amount = 700000.00,
        commission_amount = 70000.00,
        notes = 'Hoa hồng ca trị liệu 10% theo hóa đơn HD-SPA-UAT-RELEASE-4436-6c7d03 (Giá trước thuế: 700.000đ, VAT 8%: 56.000đ, Tổng: 756.000đ)'
      WHERE invoice_id = $1
      RETURNING id, staff_id, base_amount, percentage, commission_amount, notes;
    `, [updateRes.rows[0].id]);
    console.log('Updated commission:', scUpdate.rows[0]);
  }

  await client.end();
}

main().catch(console.error);
