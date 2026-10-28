const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  const inst = await client.query("SELECT * FROM public.instructors");
  console.log('Instructors table:');
  console.table(inst.rows);
  await client.end();
}

main().catch(console.error);
