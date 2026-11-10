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
  primary_instructor_id: 'instructor_name', assistant_instructor_id: 'assistant_name',
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
    const selectFields = reference.table === 'branches' ? 'id,"' + display + '" AS label, code'
      : reference.table === 'users' ? 'id,"' + display + '" AS label, phone, avatar_url'
      : 'id,"' + display + '" AS label';
    const result = await connection.query('SELECT ' + selectFields + ' FROM public."' + reference.table + '" WHERE id=ANY($1::uuid[])', [ids]);
    const labels = new Map(result.rows.map((row: any) => [row.id, row]));
    for (const row of rows) {
      const match: any = labels.get(row[column.name]);
      if (match == null) continue;
      const output = outputNames[column.name];
      if (output && !row[output]) row[output] = match.label;
      if (reference.table === 'branches' && !row.branch_code && match.code) {
        row.branch_code = match.code;
      }
      if (reference.table === 'users') {
        if (column.name === 'customer_id') {
          if (!row.customer_phone && match.phone) row.customer_phone = match.phone;
          if (!row.customer_avatar && match.avatar_url) row.customer_avatar = match.avatar_url;
        } else if (column.name === 'user_id') {
          if (!row.phone && match.phone) row.phone = match.phone;
          if (!row.avatar_url && match.avatar_url) row.avatar_url = match.avatar_url;
        } else if (column.name === 'student_id') {
          if (!row.student_phone && match.phone) row.student_phone = match.phone;
        }
      }
      const nested = reference.table === 'users' && column.name === 'customer_id' ? 'customer'
        : reference.table === 'users' && column.name === 'student_id' ? 'student'
        : column.name === 'assistant_instructor_id' ? 'assistant_instructor'
        : reference.table;
      if (!row[nested]) row[nested] = {
        id: row[column.name],
        [display]: match.label,
        ...(match.code ? { code: match.code } : {}),
        ...(match.phone ? { phone: match.phone } : {}),
        ...(match.avatar_url ? { avatar_url: match.avatar_url } : {})
      };
    }
  }
}
