// Read-only schema diagnostic. Prints table names/counts, never rows or credentials.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { Pool } = require('pg');
const { ADMIN_RESOURCES } = require('../dist/modules/admin/admin.resources');
const envPath = path.resolve(
  process.argv[2] || path.join(__dirname, '../.env'),
);
const env = fs.existsSync(envPath)
  ? parseEnv(fs.readFileSync(envPath, 'utf8'))
  : {};
const connectionString =
  process.env.ADMIN_DATABASE_URL ||
  env.ADMIN_DATABASE_URL ||
  process.env.DATABASE_URL ||
  env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing ADMIN_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
});
(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const tables = new Set(
      (
        await client.query(
          'SELECT tablename FROM pg_tables WHERE schemaname=$1',
          ['public'],
        )
      ).rows.map((r) => r.tablename),
    );
    const missing = Object.keys(ADMIN_RESOURCES).filter(
      (name) => !tables.has(name),
    );
    const roles = await client.query(
      'SELECT role,count(*)::int AS count,count(password_hash)::int AS with_password FROM users GROUP BY role',
    );
    console.log(
      JSON.stringify(
        {
          expectedTables: Object.keys(ADMIN_RESOURCES).length,
          missing,
          accountRoleCounts: roles.rows,
        },
        null,
        2,
      ),
    );
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
})()
  .catch((error) => {
    console.error('Schema check failed:', error.code || error.name);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
