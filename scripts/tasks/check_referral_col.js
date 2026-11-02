const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL) });

async function main() {
  await client.connect();
  const cols = await client.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referral_code';
  `);
  console.log(cols.rows);
  await client.end();
}

main().catch(console.error);
