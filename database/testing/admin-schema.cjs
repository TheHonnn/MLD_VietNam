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
  '038_system_settings.sql',
  '041_admin_internal_support.sql',
  '042_branch_custom_time_slots.sql',
  '042_zalo_oa_admin_settings.sql',
  '043_canva_certificate_connections.sql',
  '044_home_products_is_active.sql',
  '047_pos_80mm_commissions_hv_autopay.sql',
  '048_qa_fixes_tuition_qr_settings.sql',
  '049_system_audit_unification_fixes.sql',
  '050_edge_audit_complete_fixes.sql',
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
  await database.exec(`
    CREATE TABLE public.miniapp_shared_content (
      id UUID PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      content_text TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      author_id UUID NOT NULL REFERENCES public.users(id),
      updated_by UUID NOT NULL REFERENCES public.users(id),
      payload_hash TEXT NOT NULL,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const portalMigration = readFileSync(resolve(__dirname, '../migrations/008_portal_content_and_email.sql'), 'utf8');
  const seedStart = portalMigration.indexOf('-- 5.');
  if (seedStart < 0) throw new Error('Portal migration seed boundary is missing.');
  await database.exec(portalMigration.slice(0, seedStart));
  for (const migration of ADMIN_MIGRATIONS) {
    await database.exec(readFileSync(resolve(__dirname, '../migrations', migration), 'utf8'));
  }
}
module.exports = { loadAdminSchema, ADMIN_MIGRATIONS };
