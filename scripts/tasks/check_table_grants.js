const { Client } = require('../../backend/node_modules/pg');
const DATABASE_URL = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function checkGrants() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' 
      AND table_name IN ('edema_assessments', 'staff_commissions', 'treatment_journal', 'inventory_consumption_logs', 'zns_config', 'zalo_identities')
      AND grantee IN ('anon', 'authenticated')
    ORDER BY table_name, grantee, privilege_type;
  `);
  console.log('Grants on core tables:');
  console.log(res.rows);

  const tables = [
    'edema_assessments',
    'inventory_consumption_logs',
    'staff_commissions',
    'treatment_journal',
    'zalo_identities',
    'miniapp_account_revocations',
    'miniapp_account_sessions',
    'miniapp_booking_beds',
    'miniapp_booking_group_members',
    'miniapp_course_access',
    'miniapp_course_audiences',
    'miniapp_course_delivery',
    'miniapp_customer_profiles',
    'miniapp_customer_requests',
    'miniapp_lesson_media_policy',
    'miniapp_membership_cards',
    'miniapp_search_history',
    'miniapp_staff_bookings'
  ];

  console.log('\n--- Technicians ---');
  const techs = await client.query(`
    SELECT t.id, t.branch_id, t.status, t.rating, u.full_name, u.phone, u.role
    FROM public.technicians t
    JOIN public.users u ON t.user_id = u.id;
  `);
  console.log(techs.rows);

  console.log('\n--- Instructors ---');
  const instrs = await client.query(`
    SELECT i.id, i.bio, u.full_name, u.phone, u.role
    FROM public.instructors i
    JOIN public.users u ON i.user_id = u.id;
  `);
  console.log(instrs.rows);

  await client.end();
}
checkGrants().catch(console.error);
