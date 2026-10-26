process.env.NODE_PATH = './backend/node_modules';
require('module').Module._initPaths();
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:Anhyeuemnhieu123@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  const tables = ['home_care_guidelines', 'miniapp_shared_content'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log('TABLE:', t);
    console.table(res.rows);
  }
  await client.end();
}

run().catch(console.error);

