const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const client = new Client({
  connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const tmpl = await client.query("SELECT id, name, subject FROM public.email_templates;");
  console.log('Email Templates:', tmpl.rows.length);
  console.table(tmpl.rows);

  const shared = await client.query("SELECT count(*) FROM public.miniapp_shared_content;");
  console.log('Shared Content count:', shared.rows[0].count);

  await client.end();
}

check().catch(console.error);
