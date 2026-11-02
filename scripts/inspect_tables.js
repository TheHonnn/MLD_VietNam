process.env.NODE_PATH = './backend/node_modules';
require('module').Module._initPaths();
const { Client } = require('pg');

const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('LỖI: Vui lòng thiết lập biến môi trường ADMIN_DATABASE_URL hoặc DATABASE_URL');
  process.exit(1);
}

const client = new Client({
  connectionString
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

