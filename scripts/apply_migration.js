const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Migration failed: ADMIN_DATABASE_URL hoặc DATABASE_URL chưa được cấu hình.');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const fileArg = process.argv[2] || '007_certificates_and_edema.sql';
  const filePath = path.join(__dirname, '../database/migrations', fileArg);
  
  console.log('Reading migration file:', filePath);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();

  console.log('Executing SQL in a transaction...');
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-schema-migration'))");
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration executed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
