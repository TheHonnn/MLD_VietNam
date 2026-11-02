const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL) });

async function main() {
  await client.connect();
  const fkeys = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid) 
    FROM pg_constraint c 
    WHERE conrelid = 'public.users'::regclass;
  `);
  console.log('users constraints:', fkeys.rows);
  await client.end();
}

main().catch(console.error);
