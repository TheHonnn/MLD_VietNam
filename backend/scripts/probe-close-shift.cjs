const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

function loadLocalEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  loadLocalEnv();
  const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL_MISSING');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  let step = 'begin';
  try {
    await client.query('BEGIN');
    step = 'select-open-shift';
    const shift = (await client.query(
      "SELECT * FROM cashier_shifts WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1 FOR UPDATE",
    )).rows[0];
    if (!shift) throw new Error('NO_OPEN_SHIFT');
    step = 'update-close';
    await client.query(
      `UPDATE cashier_shifts SET closing_cash=$2,
       discrepancy_amount=$2::numeric-$3::numeric,status='CLOSED',closed_at=now(),
       notes=COALESCE($4,notes),updated_at=now() WHERE id=$1 RETURNING id`,
      [shift.id, Number(shift.system_cash || shift.opening_cash || 0), Number(shift.system_cash || shift.opening_cash || 0), null],
    );
    step = 'insert-audit';
    await client.query(
      'INSERT INTO audit_logs(actor_id,action,table_name,record_id) VALUES($1,$2,$3,$4)',
      [shift.cashier_id, 'CLOSE', 'cashier_shifts', shift.id],
    );
    console.log(JSON.stringify({ ok: true, testedShiftCode: shift.shift_code, rolledBack: true }));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, step, code: error.code, message: error.message, detail: error.detail }));
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, step: 'bootstrap', code: error.code, message: error.message }));
  process.exitCode = 1;
});
