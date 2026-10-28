const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position");
  console.log(cols.rows);
  await client.end();
}

main().catch(console.error);
