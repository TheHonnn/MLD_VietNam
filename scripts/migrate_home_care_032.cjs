const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../backend/node_modules/pg');

async function main() {
  const envFile = process.argv.find(arg => arg.startsWith('--env-file='))?.slice(11);
  if (envFile) process.loadEnvFile(envFile);
  const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Database URL is not configured.');
  const url = new URL(connectionString);
  if (url.hostname !== 'aws-0-ap-northeast-1.pooler.supabase.com' || decodeURIComponent(url.username) !== 'postgres.wstvwushpwcdsmhpunvh' || url.pathname !== '/postgres') {
    throw new Error('Database target does not match the authorized production Supabase project.');
  }
  // Limit the previously authorized TLS exception to this exact Supabase pooler.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SET LOCAL statement_timeout='60s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-schema-migration'))");
    const before = (await client.query('SELECT (SELECT count(*)::int FROM home_care_guidelines) templates,(SELECT count(*)::int FROM home_care_deliveries) deliveries')).rows[0];
    if (process.argv.includes('--apply')) {
      const sql = fs.readFileSync(path.join(__dirname, '../database/migrations/032_home_care_delivery_snapshots.sql'), 'utf8').replace(/^BEGIN;\s*/i, '').replace(/COMMIT;\s*$/i, '');
      await client.query(sql);
    }
    const columns = (await client.query(`SELECT table_name,column_name,data_type,column_default,is_nullable
      FROM information_schema.columns WHERE table_schema='public' AND
      ((table_name='home_care_guidelines' AND column_name IN ('version','service_id'))
       OR (table_name='home_care_deliveries' AND column_name='guideline_version')) ORDER BY table_name,column_name`)).rows;
    const index = (await client.query(`SELECT i.indisunique,i.indisvalid,pg_get_indexdef(i.indexrelid) definition
      FROM pg_index i WHERE i.indexrelid=to_regclass('public.uq_home_care_guideline_delivery')`)).rows[0];
    if (columns.length !== 3 || !index?.indisunique || !index?.indisvalid) throw new Error('Migration 032 verification failed.');
    const after = (await client.query('SELECT (SELECT count(*)::int FROM home_care_guidelines) templates,(SELECT count(*)::int FROM home_care_deliveries) deliveries')).rows[0];
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Unexpected row count change; rolling back.');
    await client.query('COMMIT');
    console.log(JSON.stringify({ applied: process.argv.includes('--apply'), verified: true, project: 'wstvwushpwcdsmhpunvh', before, after, columns, index }, null, 2));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(JSON.stringify({ success: false, code: error.code || null, message: String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted]') })); process.exitCode = 1; });
