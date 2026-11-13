import { ADMIN_RESOURCES } from './admin.resources';

export const ADMIN_SCHEMA_REQUIREMENTS: Record<string, string[]> = {
  ...Object.fromEntries(Object.keys(ADMIN_RESOURCES).map(table => [table, []])),
  departments: ['id', 'name', 'code', 'sort_order'],
  staff_profiles: ['user_id', 'branch_id', 'department_id'],
  course_batch_assistants: ['batch_id', 'instructor_id', 'can_mark_attendance', 'can_enter_grades'],
  course_enrollments: ['student_id', 'course_id', 'batch_id', 'assigned_staff_id'],
  course_quizzes: ['exam_type'],
  cashier_shifts: ['id', 'branch_id', 'cashier_id', 'status', 'system_cash'],
  invoices: ['shift_id', 'payment_status', 'receipt_customer_name', 'refund_amount'],
  tuition_transactions: ['shift_id', 'payment_status', 'enrollment_id'],
  staff_commissions: ['staff_id','invoice_id','tuition_transaction_id','reversal_of_id','commission_amount'],
  home_products: ['price_min','price_max','sort_order'],
  admin_payment_requests: ['actor_id', 'request_id', 'payload', 'result'],
  student_academic_record_history: ['academic_record_id', 'before_data', 'after_data'],
  user_packages: [
    'id', 'customer_id', 'package_id', 'status', 'completed_sessions', 'total_sessions',
    'paused_at', 'resumed_at', 'cancelled_at', 'cancelled_reason',
    'transferred_to_user_id', 'transferred_at', 'transfer_reason',
    'transferred_from_package_id', 'refunded_at', 'refund_amount',
    'refund_reason', 'extension_months', 'original_expires_at',
  ],
  treatment_journal: [
    'id', 'user_package_id', 'session_number', 'is_reversed', 'reversed_at',
    'reversed_by', 'reversal_reason', 'reversal_id', 'confirmation_status',
    'clinical_approved_by', 'clinical_approved_at', 'consumables_used',
    'home_care_instructions', 'post_care_status',
  ],
  treatment_session_reversals: ['id', 'journal_id', 'user_package_id', 'session_number', 'reason', 'reversed_by'],
  user_package_lifecycle_logs: ['id', 'user_package_id', 'action', 'reason'],
  treatment_inventory_outbox: ['id', 'operation_type', 'sync_status'],
  branch_material_stock: ['id','branch_id','quantity','material_name','unit'],
  treatment_stock_movements: ['id','stock_id','outbox_id','delta'],
  post_care_outbox: ['id', 'treatment_journal_id', 'customer_id', 'status'],
  home_care_guidelines: ['id', 'version', 'service_id'],
  home_care_deliveries: ['id', 'guideline_version', 'content_snapshot'],
};

export async function inspectAdminSchema(connection: { query: (sql: string, values?: any[]) => Promise<any> }) {
  const tables = Object.keys(ADMIN_SCHEMA_REQUIREMENTS);
  const result = await connection.query(
    `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])`, [tables],
  );
  const missing: string[] = [];
  for (const table of tables) {
    const columns = new Set(result.rows.filter((row: any) => row.table_name === table).map((row: any) => row.column_name));
    if (!columns.size) missing.push(table);
    else for (const column of ADMIN_SCHEMA_REQUIREMENTS[table]) if (!columns.has(column)) missing.push(`${table}.${column}`);
  }
  const security = await connection.query(
    `SELECT to_regprocedure('public.admin_can_access_branch(uuid)') IS NOT NULL AS branch_guard,
      to_regprocedure('public.admin_can_access_journal(uuid,uuid)') IS NOT NULL AS journal_guard,
      to_regprocedure('public.admin_can_collect_finance(uuid)') IS NOT NULL AS finance_guard,
      (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND policyname IN
        ('Admin scoped treatment journal','Customer reads own treatment journal','Admin scoped inventory consumption','Admin read own roles','Admin manage roles',
         'Invoice owner or branch reads','No direct invoice updates',
         'Invoice owner or branch reads items','No direct invoice item updates',
         'Student or branch reads tuition','No direct tuition writes')) AS policy_count`,
  );
  if (!security.rows[0]?.branch_guard || !security.rows[0]?.journal_guard || !security.rows[0]?.finance_guard || security.rows[0]?.policy_count !== 11)
    missing.push('migration 028 admin access policies');
  return { ready: missing.length === 0, missing, checkedAt: new Date().toISOString() };
}
