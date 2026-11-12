const tables = new Set(['users','branches','services','service_categories','treatment_packages','user_packages','treatment_journal','bookings','booking_items','invoices','invoice_items','course_enrollments','courses','course_batches','cashier_shifts','technicians','staff_profiles','home_products','tuition_transactions','departments']);
async function readSupabaseFixture(pg, url) {
  const table = url.pathname.split('/').pop();
  if (!tables.has(table)) return [];
  let rows = (await pg.query('SELECT * FROM "' + table + '"')).rows;
  for (const [field,value] of url.searchParams) {
    if (['id','role','branch_id','customer_id','student_id','batch_id','is_active'].includes(field)) {
      if (value.startsWith('eq.')) rows = rows.filter(row => String(row[field]) === value.slice(3));
      if (value.startsWith('in.(')) { const values=value.slice(4,-1).split(','); rows=rows.filter(row=>values.includes(String(row[field]))); }
    }
  }
  if (table === 'course_batches') {
    const courses = (await pg.query('SELECT * FROM courses')).rows;
    const branches = (await pg.query('SELECT * FROM branches')).rows;
    rows=rows.map(row=>({...row,courses:courses.find(course=>course.id===row.course_id),branches:branches.find(branch=>branch.id===row.branch_id)}));
  }
  if (table === 'user_packages') {
    const packages = (await pg.query('SELECT * FROM treatment_packages')).rows;
    rows=rows.map(row=>({...row,package:packages.find(pkg=>pkg.id===row.package_id) || null}));
  }
  return rows;
}
module.exports={readSupabaseFixture};
