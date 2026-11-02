const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: (process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false }
});

async function inspectEmail() {
  await client.connect();
  const tmplCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'email_templates'");
  console.log('email_templates cols:', tmplCols.rows);
  const logCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'email_logs'");
  console.log('email_logs cols:', logCols.rows);
  const templates = await client.query('SELECT id, name, subject FROM email_templates');
  console.log('Existing email_templates:', templates.rows);
  await client.end();
}

inspectEmail().catch(err => {
  console.error('inspectEmail error:', err);
  process.exit(1);
});
