const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL) });

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
