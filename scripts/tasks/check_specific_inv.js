const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  const inv = await client.query("SELECT * FROM public.invoices WHERE invoice_code = 'HD-SPA-UAT-RELEASE-4436-6c7d03'");
  console.log('Invoice in DB:', inv.rows[0]);
  if (inv.rows.length > 0) {
    const sc = await client.query("SELECT * FROM public.staff_commissions WHERE invoice_id = $1", [inv.rows[0].id]);
    console.log('Commissions for this invoice:', sc.rows);
  }
  await client.end();
}

main().catch(console.error);
