// Verification script for Migration 031 & 030
// Database tooling is installed by the backend workspace rather than at the
// repository root. Resolve it explicitly so this verifier can be launched
// from the repository root as documented.
const { PGlite } = require('../../backend/node_modules/@electric-sql/pglite');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { loadAdminSchema } = require('./admin-schema.cjs');

async function verifyMigration() {
  const db = new PGlite();
  try {
    await loadAdminSchema(db);

    // A production redeploy may retry the same migration. Execute 031 a
    // second time in the same database to prove the script is actually
    // idempotent rather than merely claiming it in documentation.
    const migration031 = await readFile(
      path.join(__dirname, '..', 'migrations', '031_treatment_lifecycle_management.sql'),
      'utf8',
    );
    await db.exec(migration031);

    // Verify user_packages new columns
    const upCols = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_packages'
      AND column_name IN ('paused_at', 'cancelled_at', 'transferred_at', 'transferred_from_package_id', 'refunded_at', 'extension_months')
    `);
    if (upCols.rows.length < 6) {
      throw new Error(`user_packages is missing required migration 031 columns. Found: ${upCols.rows.length}`);
    }

    // Verify treatment_journal new columns
    const tjCols = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'treatment_journal'
      AND column_name IN ('is_reversed', 'reversal_reason', 'treatment_areas', 'consumables_used', 'has_abnormal_reaction', 'photos_metadata')
    `);
    if (tjCols.rows.length < 6) {
      throw new Error(`treatment_journal is missing required migration 031 columns. Found: ${tjCols.rows.length}`);
    }

    // Verify treatment_session_reversals table
    const revTable = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'treatment_session_reversals'
    `);
    if (!revTable.rows.length) {
      throw new Error('treatment_session_reversals table does not exist');
    }

    // Verify user_package_lifecycle_logs table
    const logTable = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_package_lifecycle_logs'
    `);
    if (!logTable.rows.length) {
      throw new Error('user_package_lifecycle_logs table does not exist');
    }

    // Verify treatment_inventory_outbox table
    const outboxTable = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'treatment_inventory_outbox'
    `);
    if (!outboxTable.rows.length) {
      throw new Error('treatment_inventory_outbox table does not exist');
    }

    // Verify post_care_outbox table
    const postCareTable = await db.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'post_care_outbox'
    `);
    if (!postCareTable.rows.length) {
      throw new Error('post_care_outbox table does not exist');
    }

    console.log('✅ Migration 030 and 031 schema verification PASSED successfully!');
    return true;
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  verifyMigration().catch((err) => {
    console.error('❌ Migration verification failed:', err);
    process.exit(1);
  });
}

module.exports = { verifyMigration };
