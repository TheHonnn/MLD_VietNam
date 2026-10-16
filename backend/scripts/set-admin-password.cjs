// Run locally, never through HTTP. Does not create users or modify their roles.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const root = path.resolve(__dirname, '..');
async function main() {
  const envPath = fs.existsSync(path.join(root, '.env'))
    ? path.join(root, '.env')
    : path.resolve(root, '../minizalo/backend/.env');
  const env = fs.existsSync(envPath)
    ? parseEnv(fs.readFileSync(envPath, 'utf8'))
    : {};
  const connectionString =
    process.env.ADMIN_DATABASE_URL ||
    env.ADMIN_DATABASE_URL ||
    env.DATABASE_URL;
  if (!connectionString) throw new Error('Configure ADMIN_DATABASE_URL first.');
  if (!process.stdin.isTTY)
    throw new Error('Run this command directly in your terminal.');
  const normal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const identifier = (await normal.question('Admin phone or email: ')).trim();
  const confirmation = await normal.question(
    'Set password for this EXISTING admin in the shared database? Type YES: ',
  );
  normal.close();
  if (confirmation !== 'YES') return;
  let hidden = false;
  const output = new Writable({
    write(chunk, encoding, done) {
      if (!hidden) process.stdout.write(chunk, encoding);
      done();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  process.stdout.write('New password (12+ characters, hidden): ');
  hidden = true;
  const password = await rl.question('');
  hidden = false;
  process.stdout.write('\n');
  process.stdout.write('Repeat password (hidden): ');
  hidden = true;
  const repeat = await rl.question('');
  hidden = false;
  rl.close();
  process.stdout.write('\n');
  if (password.length < 12 || password.length > 256 || password !== repeat)
    throw new Error('Passwords must match and be 12-256 characters.');
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      "SELECT id FROM users WHERE (phone=$1 OR email=$1) AND role IN ('ADMIN','SUPER_ADMIN') AND is_active=true FOR UPDATE",
      [identifier],
    );
    if (found.rowCount !== 1)
      throw new Error(
        'No unique active admin matched; no new account was created.',
      );
    await client.query('UPDATE users SET password_hash=$2 WHERE id=$1', [
      found.rows[0].id,
      await bcrypt.hash(password, 12),
    ]);
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,table_name,record_id) VALUES($1,'local-password-reset','users',$1)",
      [found.rows[0].id],
    );
    await client.query('COMMIT');
    console.log('Admin password updated securely.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    error.message.startsWith('Passwords') ||
      error.message.startsWith('No unique') ||
      error.message.startsWith('Configure') ||
      error.message.startsWith('Run this')
      ? error.message
      : 'Could not update password. Check database connection.',
  );
  process.exitCode = 1;
});
