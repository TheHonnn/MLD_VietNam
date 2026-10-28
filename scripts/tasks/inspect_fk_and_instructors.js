const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%instructor%'");
  console.log('Instructor tables:', tables.rows);

  const fkeysBatches = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid) 
    FROM pg_constraint c 
    WHERE conrelid = 'public.course_batches'::regclass;
  `);
  console.log('course_batches constraints:', fkeysBatches.rows);

  const scFkeys = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid) 
    FROM pg_constraint c 
    WHERE conrelid = 'public.staff_commissions'::regclass;
  `);
  console.log('staff_commissions constraints:', scFkeys.rows);

  const searchId = await client.query(`
    SELECT * FROM information_schema.columns WHERE column_name = 'id' AND table_schema = 'public';
  `);
  // Let's check where 2af0c0f3-b9fa-4867-8613-0c383f540614 is located
  for (const col of searchId.rows) {
    try {
      const res = await client.query(`SELECT id FROM public."${col.table_name}" WHERE id = '2af0c0f3-b9fa-4867-8613-0c383f540614'::uuid LIMIT 1`);
      if (res.rows.length > 0) {
        console.log(`FOUND 2af0c0f3-b9fa-4867-8613-0c383f540614 in table: ${col.table_name}`);
      }
    } catch (e) {}
  }

  await client.end();
}

main().catch(console.error);
