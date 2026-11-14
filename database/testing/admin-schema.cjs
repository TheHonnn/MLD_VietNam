// Local PostgreSQL only. Supabase identity is supplied by the test session.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ADMIN_MIGRATIONS = [
  '022_registration_commissions.sql',
  '024_academy_assistants_and_exam_types.sql',
  '025_admin_workflows.sql',
  '026_receipt_items_refund_commission.sql',
  '027_admin_reliability.sql',
  '028_admin_access_hardening.sql',
  '029_academy_enrollment_lifecycle.sql',
  '030_treatment_lifecycle_integrity.sql',
  '031_treatment_lifecycle_management.sql',
  '032_home_care_delivery_snapshots.sql',
  '033_treatment_replacement_sessions.sql',
  '034_treatment_inventory_stock.sql',
  '035_academy_admission_safeguards.sql',
  '036_academy_schedule_and_transfers.sql',
  '037_academy_preserve_suspended_access.sql',
];
async function loadAdminSchema(database) {
  await database.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  await database.exec(readFileSync(resolve(__dirname, '../schema.sql'), 'utf8')
    .replace(/^CREATE EXTENSION[^\n]*$/gm, '')
    .replace(/^CREATE INDEX[^\n]*gin_trgm_ops[^\n]*$/gm, ''));
  await database.exec(readFileSync(resolve(__dirname, '../enterprise_features.sql'), 'utf8'));
  for (const migration of ADMIN_MIGRATIONS) {
    await database.exec(readFileSync(resolve(__dirname, '../migrations', migration), 'utf8'));
  }
}
module.exports = { loadAdminSchema, ADMIN_MIGRATIONS };
