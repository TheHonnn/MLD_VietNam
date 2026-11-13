import { ForbiddenException } from '@nestjs/common';
import { quote } from './admin.resources';
import type { AdminActor } from './admin.service';

export function allowedBranches(actor: AdminActor, permission: string): string[] | null {
  if (['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) return null;
  const grants = actor.scopes?.filter(scope => scope.permission === permission) || [];
  if (grants.some(scope => scope.branchId === null)) return null;
  if (!grants.length) throw new ForbiddenException('Tài khoản chưa được cấp quyền cho thao tác này.');
  return [...new Set(grants.map(scope => scope.branchId!))];
}

export function packageBranchIdsSql(row: string) {
  return `WITH RECURSIVE lineage AS (
    SELECT ${row}.id AS id,${row}.transferred_from_package_id AS parent,0 AS depth,ARRAY[${row}.id] AS path
    UNION ALL SELECT up.id,up.transferred_from_package_id,l.depth+1,l.path||up.id
    FROM user_packages up JOIN lineage l ON up.id=l.parent WHERE NOT up.id=ANY(l.path) AND l.depth<32
  ), candidates AS (
    SELECT i.branch_id,l.depth,0 AS priority FROM lineage l JOIN invoices i ON i.user_package_id=l.id
    UNION ALL SELECT b.branch_id,l.depth,1 AS priority FROM lineage l
      JOIN treatment_journal j ON j.user_package_id=l.id JOIN bookings b ON b.id=j.booking_id
  ), chosen AS (SELECT priority,depth FROM candidates ORDER BY priority,depth LIMIT 1)
  SELECT DISTINCT c.branch_id FROM candidates c JOIN chosen x USING(priority,depth)`;
}

export function branchPredicate(table: string, row: string, parameter: string, columns: string[]) {
  if (table === 'branches') return `${row}.id=ANY(${parameter}::uuid[])`;
  if (columns.includes('branch_id')) return `${row}.branch_id=ANY(${parameter}::uuid[])`;
  const relations: Record<string, string> = {
    treatment_stock_movements: `EXISTS(SELECT 1 FROM branch_material_stock s WHERE s.id=${row}.stock_id AND s.branch_id=ANY(${parameter}::uuid[]))`,
    post_care_outbox: `EXISTS(SELECT 1 FROM treatment_journal j JOIN bookings b ON b.id=j.booking_id WHERE j.id=${row}.treatment_journal_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    home_care_deliveries: `EXISTS(SELECT 1 FROM bookings b WHERE b.id=${row}.booking_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    booking_items: `EXISTS(SELECT 1 FROM bookings b WHERE b.id=${row}.booking_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    invoice_items: `EXISTS(SELECT 1 FROM invoices i WHERE i.id=${row}.invoice_id AND i.branch_id=ANY(${parameter}::uuid[]))`,
    course_enrollments: `EXISTS(SELECT 1 FROM course_batches b WHERE b.id=${row}.batch_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    course_batch_assistants: `EXISTS(SELECT 1 FROM course_batches b WHERE b.id=${row}.batch_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    student_attendance: `EXISTS(SELECT 1 FROM batch_schedules s JOIN course_batches b ON b.id=s.batch_id WHERE s.id=${row}.schedule_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    student_academic_records: `EXISTS(SELECT 1 FROM course_enrollments e JOIN course_batches b ON b.id=e.batch_id WHERE e.id=${row}.enrollment_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    staff_leaves: `EXISTS(SELECT 1 FROM staff_profiles s WHERE s.id=${row}.staff_id AND s.branch_id=ANY(${parameter}::uuid[]))`,
    treatment_journal: `(EXISTS(SELECT 1 FROM bookings b WHERE b.id=${row}.booking_id AND b.branch_id=ANY(${parameter}::uuid[])) OR (${row}.booking_id IS NULL AND EXISTS(SELECT 1 FROM invoices i WHERE i.user_package_id=${row}.user_package_id AND i.branch_id=ANY(${parameter}::uuid[]))))`,
    user_packages: `EXISTS(SELECT 1 FROM (${packageBranchIdsSql(row)}) inherited WHERE inherited.branch_id=ANY(${parameter}::uuid[]))`,
    student_certificates: `EXISTS(SELECT 1 FROM course_enrollments e JOIN course_batches b ON b.id=e.batch_id WHERE e.id=${row}.enrollment_id AND b.branch_id=ANY(${parameter}::uuid[]))`,
    users: `(EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=${row}.id AND b.branch_id=ANY(${parameter}::uuid[])) OR EXISTS(SELECT 1 FROM course_enrollments e JOIN course_batches b ON b.id=e.batch_id WHERE e.student_id=${row}.id AND b.branch_id=ANY(${parameter}::uuid[])))`,
  };
  if (!relations[table]) throw new ForbiddenException('Phân hệ dùng chung cần quyền toàn hệ thống.');
  return relations[table];
}

export async function assertRowScope(connection: any, table: string, row: any, columns: string[], actor: AdminActor, operation: string) {
  const branches = allowedBranches(actor, `${table}.${operation}`);
  if (branches === null) return;
  const predicate = branchPredicate(table, 'scoped_row', '$2', columns);
  const result = await connection.query(
    `SELECT 1 FROM jsonb_populate_record(NULL::public.${quote(table)},$1::jsonb) scoped_row WHERE ${predicate}`,
    [JSON.stringify(row), branches],
  );
  if (!result.rowCount) throw new ForbiddenException('Bản ghi không thuộc chi nhánh được cấp quyền.');
}

export function assertCashierBranch(actor: AdminActor, branchId: string, permission: string) {
  const branches = allowedBranches(actor, permission);
  if (branches !== null && !branches.includes(branchId)) throw new ForbiddenException('Không được thao tác thu ngân ở chi nhánh này.');
}
