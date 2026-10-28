const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL.');

  // Check supabase_realtime publication tables
  const pubRes = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log('Tables in supabase_realtime publication:');
  console.table(pubRes.rows);

  // Check rows in notifications table
  const notifCount = await client.query('SELECT count(*) FROM public.notifications');
  console.log('Total rows in notifications table:', notifCount.rows[0]);

  const recentNotifs = await client.query('SELECT id, user_id, title, message, type, is_read, created_at FROM public.notifications ORDER BY created_at DESC LIMIT 10');
  console.log('Recent notifications:');
  console.table(recentNotifs.rows);

  // Check triggers on bookings table
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookings';
  `);
  console.log('Triggers on bookings:', triggers.rows);

  // Check recent bookings
  const bookings = await client.query('SELECT id, booking_code, customer_id, branch_id, booking_date, start_time, status, created_at FROM public.bookings ORDER BY created_at DESC LIMIT 5');
  console.log('Recent bookings in DB:');
  console.table(bookings.rows);

  await client.end();
}

main().catch(console.error);
