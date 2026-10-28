const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT tgname, proname 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.bookings'::regclass;
  `);
  console.table(res.rows);
  await client.end();
}
run().catch(console.error);
