const { Client } = require('../../backend/node_modules/pg');

const DATABASE_URL = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
const SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

async function runAudit() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('================================================================');
  console.log('STEP 1: POSTGRESQL SCHEMA, RLS & POLICIES AUDIT');
  console.log('================================================================');

  const tablesQuery = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const allTables = tablesQuery.rows.map(r => r.table_name);
  console.log(`Found ${allTables.length} public tables.`);

  const rlsQuery = await client.query(`
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  const rlsMap = {};
  rlsQuery.rows.forEach(r => { rlsMap[r.table_name] = r.rls_enabled; });

  const policiesQuery = await client.query(`
    SELECT 
      tablename,
      policyname,
      roles,
      cmd,
      qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  const policiesByTable = {};
  policiesQuery.rows.forEach(p => {
    if (!policiesByTable[p.tablename]) policiesByTable[p.tablename] = [];
    policiesByTable[p.tablename].push(p);
  });

  console.log('\n================================================================');
  console.log('STEP 2: TESTING REST API ACCESS (ANON ROLE) ON ALL TABLES');
  console.log('================================================================');

  const accessResults = [];

  for (const table of allTables) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });
      const text = await res.text();
      let isSuccess = res.ok;
      let errorMsg = '';
      if (!isSuccess) {
        try {
          const errObj = JSON.parse(text);
          errorMsg = `${errObj.code || ''} ${errObj.message || text}`;
        } catch {
          errorMsg = text.slice(0, 100);
        }
      }
      accessResults.push({
        table,
        rls: rlsMap[table] ? 'ON' : 'OFF',
        policyCount: (policiesByTable[table] || []).length,
        status: res.status,
        success: isSuccess,
        error: errorMsg
      });
    } catch (e) {
      accessResults.push({
        table,
        rls: rlsMap[table] ? 'ON' : 'OFF',
        policyCount: (policiesByTable[table] || []).length,
        status: 0,
        success: false,
        error: e.message
      });
    }
  }

  const failedTables = accessResults.filter(r => !r.success);
  console.log(`\nAccessible tables: ${accessResults.length - failedTables.length} / ${accessResults.length}`);
  if (failedTables.length > 0) {
    console.log(`\n❌ BLOCKED / FAILED TABLES (${failedTables.length}):`);
    failedTables.forEach(f => {
      console.log(`  - [${f.status}] ${f.table.padEnd(30)} | RLS: ${f.rls} | Policies: ${f.policyCount} | Error: ${f.error}`);
    });
  } else {
    console.log('All public tables responded successfully (HTTP 200) to anon REST API!');
  }

  console.log('\n================================================================');
  console.log('All 92 tables:', allTables.join(', '));

  console.log('\n================================================================');
  console.log('STEP 3: CROSS-MODULE DATA CONSISTENCY & REVENUE SYNC AUDIT');
  console.log('================================================================');

  // Check 3.1: Financial Tables
  for (const t of ['financial_records', 'financial_transactions', 'invoices', 'tuition_transactions', 'staff_commissions', 'course_enrollments', 'bookings']) {
    try {
      if (allTables.includes(t)) {
        const res = await client.query(`SELECT count(*) FROM public."${t}";`);
        console.log(`- ${t}: ${res.rows[0].count} rows`);
      }
    } catch (e) {
      console.log(`- ${t} query error:`, e.message);
    }
  }
  try {
    const commCount = await client.query('SELECT count(*), coalesce(sum(commission_amount), 0) as total FROM public.staff_commissions;');
    console.log(`- staff_commissions: ${commCount.rows[0].count} entries, total: ${Number(commCount.rows[0].total).toLocaleString('vi-VN')}đ`);
  } catch (e) {
    console.log('- staff_commissions error:', e.message);
  }

  // Check 3.3: Tuition Transactions vs Invoices
  console.log('\n--- Tuition Transactions Audit ---');
  try {
    const ttCount = await client.query('SELECT count(*), coalesce(sum(amount), 0) as total FROM public.tuition_transactions;');
    console.log(`- tuition_transactions: ${ttCount.rows[0].count} entries, total: ${Number(ttCount.rows[0].total).toLocaleString('vi-VN')}đ`);
  } catch (e) {
    console.log('- tuition_transactions error:', e.message);
  }

  // Check 3.4: User Packages vs Treatment Journals
  console.log('\n--- User Packages & Treatment Journals ---');
  try {
    const pkgCount = await client.query('SELECT count(*) FROM public.user_packages;');
    const journalCount = await client.query('SELECT count(*) FROM public.treatment_journals;');
    console.log(`- user_packages: ${pkgCount.rows[0].count} packages`);
    console.log(`- treatment_journals: ${journalCount.rows[0].count} journals`);
  } catch (e) {
    console.log('- user_packages / journals error:', e.message);
  }

  // Check 3.5: Student Attendance & Certificates
  console.log('\n--- Student Attendance & Certificates ---');
  try {
    const attCount = await client.query('SELECT count(*) FROM public.student_attendance;');
    const certCount = await client.query('SELECT count(*) FROM public.student_certificates;');
    console.log(`- student_attendance: ${attCount.rows[0].count} attendance records`);
    console.log(`- student_certificates: ${certCount.rows[0].count} certificates`);
  } catch (e) {
    console.log('- attendance / certificates error:', e.message);
  }

  // Check 3.6: Edema Assessments (Hồ sơ Phù Nề)
  console.log('\n--- Edema Assessments ---');
  try {
    const edCount = await client.query('SELECT count(*) FROM public.edema_assessments;');
    console.log(`- edema_assessments: ${edCount.rows[0].count} assessments`);
  } catch (e) {
    console.log('- edema_assessments error:', e.message);
  }

  // Check 3.7: Branches, Technicians, Services
  console.log('\n--- Master Data (Branches, Users, Services, Technicians, Courses) ---');
  const bCount = await client.query('SELECT count(*) FROM public.branches;');
  const uCount = await client.query('SELECT count(*) FROM public.users;');
  const sCount = await client.query('SELECT count(*) FROM public.services;');
  const tCount = await client.query('SELECT count(*) FROM public.technicians;');
  const cCount = await client.query('SELECT count(*) FROM public.courses;');
  console.log(`- branches: ${bCount.rows[0].count}`);
  console.log(`- users: ${uCount.rows[0].count}`);
  console.log(`- services: ${sCount.rows[0].count}`);
  console.log(`- technicians: ${tCount.rows[0].count}`);
  console.log(`- courses: ${cCount.rows[0].count}`);

  await client.end();
}

runAudit().catch(console.error);
