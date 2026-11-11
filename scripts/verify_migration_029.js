const path = require('path');
const { Client } = require(path.join(__dirname, '../backend/node_modules/pg'));

const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Verification failed: database URL is not configured.');
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function verify() {
  await client.connect();
  try {
    const columns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='course_enrollments'
        AND column_name IN ('consultation_status','payment_status','student_status','required_deposit','final_tuition','valid_until')
    `);
    const relations = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('enrollment_status_history','enrollment_change_requests')
      UNION ALL
      SELECT table_name FROM information_schema.views
      WHERE table_schema='public' AND table_name='academy_enrollment_funnel'
    `);
    const functions = await client.query(`
      SELECT proname FROM pg_proc JOIN pg_namespace ON pg_namespace.oid=pg_proc.pronamespace
      WHERE nspname='public' AND proname IN (
        'fn_finalize_enrollment_consultation','fn_reconcile_enrollment_payment','fn_approve_enrollment',
        'fn_assign_enrollment_batch','fn_graduate_enrollment','fn_resolve_enrollment_change_request'
      )
    `);
    const result = {
      enrollmentColumns: columns.rowCount,
      lifecycleRelations: relations.rowCount,
      workflowFunctions: functions.rowCount,
    };
    if (result.enrollmentColumns !== 6 || result.lifecycleRelations !== 3 || result.workflowFunctions !== 6) {
      throw new Error(`Migration 029 verification mismatch: ${JSON.stringify(result)}`);
    }
    console.log(`Migration 029 verified: ${JSON.stringify(result)}`);
  } finally {
    await client.end();
  }
}

verify().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
