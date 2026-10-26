const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const fileArg = process.argv[2] || '007_certificates_and_edema.sql';
  const filePath = path.join(__dirname, '../database/migrations', fileArg);
  
  console.log('Reading migration file:', filePath);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();

  console.log('Executing SQL...');
  await client.query(sql);

  console.log('Migration executed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
