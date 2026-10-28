const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

async function verify() {
  console.log('--- 1. Testing Sync RPC (public.fn_sync_invoices_and_revenue) ---');
  const syncRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_sync_invoices_and_revenue`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('Sync RPC status:', syncRes.status);
  const syncData = await syncRes.json();
  console.log('Sync RPC result:', syncData);

  console.log('\n--- 2. Testing Invoices & Items Retrieval ---');
  const invRes = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=*,customer:customer_id(id,full_name,phone,email,avatar_url,membership_tier),branch:branch_id(id,name,code,address,district,city),items:invoice_items(*)&order=paid_at.desc`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  console.log('Invoices query status:', invRes.status);
  const invoices = await invRes.json();
  console.log('Total invoices found:', invoices.length);

  let totalRevenue = 0;
  invoices.forEach((inv, index) => {
    totalRevenue += Number(inv.total_amount);
    const itemName = inv.items && inv.items[0] ? inv.items[0].item_name : 'No items';
    console.log(`  [${index + 1}] Code: ${inv.invoice_code} | Customer: ${inv.customer?.full_name} | ${Number(inv.total_amount).toLocaleString('vi-VN')}đ | ${inv.payment_method} | ${itemName}`);
  });
  console.log(`\n==> TỔNG THỰC THU TOÀN HỆ THỐNG: ${totalRevenue.toLocaleString('vi-VN')}đ`);
}

verify().catch(console.error);
