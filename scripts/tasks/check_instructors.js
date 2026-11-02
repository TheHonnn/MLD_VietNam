const { Client } = require('../../backend/node_modules/pg');
const client = new Client({ connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL) });

async function main() {
  await client.connect();
  const inst = await client.query("SELECT * FROM public.instructors");
  console.log('Instructors table:');
  console.table(inst.rows);
  await client.end();
}

main().catch(console.error);
