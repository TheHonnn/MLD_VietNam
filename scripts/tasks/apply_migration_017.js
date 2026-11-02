const fs = require('fs');
const path = require('path');
const { Client } = require('../../backend/node_modules/pg');

const client = new Client({
  connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL),
});

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Connected!');

  const sqlFile = path.resolve(__dirname, '../../database/migrations/017_enable_realtime_and_booking_admin_notifications.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Applying Migration 017...');
  await client.query(sql);
  console.log('Migration 017 applied successfully!');

  // Verify tables in supabase_realtime
  const pubRes = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log('Current tables in supabase_realtime publication:');
  console.table(pubRes.rows);

  // Verify triggers on bookings
  const trgRes = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookings';
  `);
  console.log('Triggers on bookings:');
  console.table(trgRes.rows);

  // Check nullable status of notifications.user_id
  const notifCol = await client.query(`
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'user_id';
  `);
  console.log('notifications.user_id nullable status:');
  console.table(notifCol.rows);

  await client.end();
}

run().catch((err) => {
  console.error('Error applying migration 017:', err);
  process.exit(1);
});
