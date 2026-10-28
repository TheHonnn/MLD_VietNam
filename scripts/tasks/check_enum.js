const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'user_role';
  `);
  console.log('user_role enum labels:', res.rows.map(r => r.enumlabel));
  await client.end();
}

main().catch(console.error);
