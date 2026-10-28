const { Client } = require('../../backend/node_modules/pg');

const DATABASE_URL = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function check() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('--- TABLES WITH FINANCIAL / BOOKINGS / ENROLLMENTS ---');
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name LIKE '%pay%' OR table_name LIKE '%inv%' OR table_name LIKE '%bill%' OR table_name LIKE '%trans%' OR table_name LIKE '%book%' OR table_name LIKE '%enroll%')
    ORDER BY table_name;
  `);

  for (const t of tables.rows) {
    try {
      const c = await client.query(`SELECT count(*) FROM public."${t.table_name}";`);
      console.log(`  - ${t.table_name}: ${c.rows[0].count} rows`);
    } catch (e) {
      console.log(`  - ${t.table_name}: error`, e.message);
    }
  }

  console.log('\n--- PAID BOOKINGS IN PUBLIC.BOOKINGS ---');
  const paidBookings = await client.query(`
    SELECT id, booking_code, branch_id, customer_id, booking_date, start_time, end_time,
           status, payment_status, payment_method, base_total, final_price
    FROM public.bookings
    ORDER BY booking_date DESC
    LIMIT 10;
  `);
  console.log(`Paid bookings (${paidBookings.rows.length}):`);
  paidBookings.rows.forEach(b => console.log(b));

  console.log('\n--- PAID ENROLLMENTS IN PUBLIC.COURSE_ENROLLMENTS ---');
  const paidEnrollments = await client.query(`
    SELECT id, student_id, course_id, status, tuition_total, amount_paid, payment_status, enrolled_at, order_code
    FROM public.course_enrollments
    ORDER BY enrolled_at DESC
    LIMIT 10;
  `);
  console.log(`Enrollments (${paidEnrollments.rows.length}):`);
  paidEnrollments.rows.forEach(e => console.log(e));

  console.log('\n--- INVOICES IN PUBLIC.INVOICES ---');
  const invRes = await client.query(`SELECT count(*) FROM public.invoices;`);
  console.log('Invoices count:', invRes.rows[0].count);

  console.log('\n--- FINANCIAL LEDGER / TRANSACTIONS ---');
  try {
    const fl = await client.query(`SELECT * FROM public.financial_ledger LIMIT 5;`);
    console.log('financial_ledger rows:', fl.rows.length);
  } catch (e) {
    console.log('financial_ledger query failed:', e.message);
  }

  await client.end();
}

check().catch(console.error);
