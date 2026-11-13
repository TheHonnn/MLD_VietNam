const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('../backend/node_modules/pg');

const tables = ['user_packages', 'treatment_journal', 'treatment_inventory_outbox', 'branch_material_stock', 'treatment_stock_movements'];
async function counts(client) {
  const result = {};
  for (const table of tables) {
    const exists = (await client.query('SELECT to_regclass($1) AS name', [`public.${table}`])).rows[0].name;
    result[table] = exists ? Number((await client.query(`SELECT count(*) AS count FROM public.${table}`)).rows[0].count) : null;
  }
  return result;
}
async function verify(client) {
  const index = (await client.query(`SELECT indisunique,indisvalid,pg_get_indexdef(indexrelid) AS definition,
    pg_get_expr(indpred,indrelid) AS predicate FROM pg_index WHERE indexrelid=to_regclass('public.uq_treatment_journal_package_session')`)).rows[0];
  assert.ok(index?.indisunique && index.indisvalid && /is_reversed IS NOT TRUE/i.test(index.predicate), 'Migration 033 index is not valid');
  const stock = (await client.query(`SELECT relname,relrowsecurity FROM pg_class WHERE oid IN
    (to_regclass('public.branch_material_stock'),to_regclass('public.treatment_stock_movements')) ORDER BY relname`)).rows;
  assert.equal(stock.length, 2, 'Missing inventory tables');
  assert.ok(stock.every(table => table.relrowsecurity), 'Inventory RLS is not enabled');
  const column = (await client.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='treatment_inventory_outbox' AND column_name='sync_error'")).rowCount;
  assert.equal(column, 1, 'Missing outbox error column');
  const policies = (await client.query("SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('branch_material_stock','treatment_stock_movements')")).rows;
  assert.equal(policies.length, 2, 'Inventory policies differ from the migration');
  const privileges = (await client.query(`SELECT has_table_privilege('anon','public.branch_material_stock','SELECT') AS anon_read,
    has_table_privilege('authenticated','public.branch_material_stock','INSERT,UPDATE,DELETE') AS client_write,
    has_table_privilege('authenticated','public.treatment_stock_movements','INSERT,UPDATE,DELETE') AS ledger_write`)).rows[0];
  assert.ok(!privileges.anon_read && !privileges.client_write && !privileges.ledger_write, 'Unexpected public write/read access');
  const permissions = (await client.query("SELECT code FROM permissions WHERE code=ANY($1::text[]) ORDER BY code", [[
    'branch_material_stock.read','branch_material_stock.action','treatment_stock_movements.read','treatment_inventory_outbox.read','treatment_inventory_outbox.action',
  ]])).rows.map(row => row.code);
  assert.equal(permissions.length, 5, 'Missing inventory permissions');
  return { index, tables: stock, policies, permissions, privileges };
}
async function main() {
  const envFile = process.argv.find(arg => arg.startsWith('--env-file='))?.slice(11);
  if (envFile) process.loadEnvFile(envFile);
  const raw = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error('Database URL is not configured');
  const url = new URL(raw);
  if (url.hostname !== 'aws-0-ap-northeast-1.pooler.supabase.com' || decodeURIComponent(url.username) !== 'postgres.wstvwushpwcdsmhpunvh' || url.pathname !== '/postgres')
    throw new Error('Database target is not the authorized production Supabase project');
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  const client = new Client({connectionString:url.toString(),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
  await client.connect();
  let transaction = false;
  try {
    await client.query('BEGIN'); transaction = true;
    await client.query("SET LOCAL lock_timeout='10s'");
    await client.query("SET LOCAL statement_timeout='60s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-schema-migration'))");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mld-admin-mutation'))");
    const before = await counts(client);
    assert.ok(before.user_packages !== null && before.treatment_journal !== null && before.treatment_inventory_outbox !== null, 'Prerequisite treatment schema is missing');
    const duplicates = await client.query(`SELECT 1 FROM treatment_journal WHERE user_package_id IS NOT NULL AND is_reversed IS NOT TRUE
      GROUP BY user_package_id,session_number HAVING count(*)>1 LIMIT 1`);
    assert.equal(duplicates.rowCount,0,'Active session duplicates require reconciliation before migration');
    if (process.argv.includes('--apply')) {
      for (const file of ['033_treatment_replacement_sessions.sql','034_treatment_inventory_stock.sql']) {
        const sql=fs.readFileSync(path.join(__dirname,'../database/migrations',file),'utf8').replace(/^\s*BEGIN;\s*/i,'').replace(/COMMIT;\s*$/i,'');
        await client.query(sql);
      }
    }
    const structure = await verify(client);
    const after = await counts(client);
    for (const table of tables) assert.equal(after[table],before[table] ?? 0,`Unexpected row count change in ${table}`);
    await client.query('COMMIT'); transaction = false;
    const persisted = await verify(client);
    console.log(JSON.stringify({applied:process.argv.includes('--apply'),verified:true,project:'wstvwushpwcdsmhpunvh',before,after,structure,persistedIndex:persisted.index,checkedAt:new Date().toISOString()},null,2));
  } catch (error) {
    if (transaction) await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
main().catch(error => { console.error(JSON.stringify({success:false,code:error.code || null,message:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[redacted]')}));process.exitCode=1; });
