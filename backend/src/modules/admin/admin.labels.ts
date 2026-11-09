export const REFERENCE_DISPLAYS: Record<string, string> = {
  users: 'full_name', branches: 'name', departments: 'name', services: 'name',
  service_categories: 'name', treatment_packages: 'name', technicians: 'full_name',
  instructors: 'full_name', courses: 'title', course_categories: 'name',
  course_batches: 'batch_code', course_chapters: 'title', course_lessons: 'title',
  course_quizzes: 'title', bookings: 'booking_code', invoices: 'invoice_code',
};
const outputNames: Record<string, string> = {
  user_id: 'full_name', customer_id: 'customer_name', student_id: 'student_name',
  staff_id: 'staff_name', technician_id: 'technician_name', instructor_id: 'instructor_name',
  branch_id: 'branch_name', department_id: 'department_name', service_id: 'service_name',
  package_id: 'package_name', course_id: 'course_title', batch_id: 'batch_code',
};
export async function enrichReferenceLabels(connection: any, columns: any[], rows: any[]) {
  for (const column of columns) {
    const reference = column.reference;
    const display = reference && REFERENCE_DISPLAYS[reference.table];
    if (!display || reference.column !== 'id') continue;
    const ids = [...new Set(rows.map(row => row[column.name]).filter(Boolean))];
    if (!ids.length) continue;
    // Both identifiers come from the fixed display registry, never HTTP input.
    const result = await connection.query('SELECT id,"' + display + '" AS label FROM public."' + reference.table + '" WHERE id=ANY($1::uuid[])', [ids]);
    const labels = new Map(result.rows.map((row: any) => [row.id, row.label]));
    for (const row of rows) {
      const label = labels.get(row[column.name]);
      if (label == null) continue;
      const output = outputNames[column.name];
      if (output && !row[output]) row[output] = label;
      const nested = reference.table === 'users' && column.name === 'customer_id' ? 'customer'
        : reference.table === 'users' && column.name === 'student_id' ? 'student' : reference.table;
      if (!row[nested]) row[nested] = { id: row[column.name], [display]: label };
    }
  }
}
