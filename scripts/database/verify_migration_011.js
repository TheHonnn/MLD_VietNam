const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  await client.connect();
  console.log('--- TEST 1: Check course_enrollments validity columns ---');
  const enrCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'course_enrollments' 
      AND column_name IN ('valid_until', 'access_status', 'expired_at', 'extension_months', 'extension_reason', 'last_expiry_notified_at')
    ORDER BY column_name;
  `);
  console.log('Columns found:', enrCols.rows);

  const enrRows = await client.query(`
    SELECT id, student_name, enrolled_at, valid_until, access_status 
    FROM course_enrollments 
    LIMIT 5;
  `);
  console.log('Sample Enrollments:', enrRows.rows);

  console.log('\n--- TEST 2: Check 6 technicians count ---');
  const branchId = 'aaaaaaaa-0001-0001-0001-000000000001';
  const techs = await client.query(`
    SELECT id, full_name, title, is_active 
    FROM technicians 
    WHERE branch_id = $1 AND is_active = true
    ORDER BY full_name;
  `, [branchId]);
  console.log(`Active Technicians at HQ (${techs.rows.length}):`, techs.rows);

  console.log('\n--- TEST 3: Test fn_check_slot_dual_availability RPC ---');
  const slotCheck = await client.query(`
    SELECT * FROM fn_check_slot_dual_availability(
      $1::uuid,
      CURRENT_DATE,
      '09:00:00'::time,
      '10:00:00'::time
    );
  `, [branchId]);
  console.log('Single Slot Result (09:00 - 10:00):', slotCheck.rows[0]);

  console.log('\n--- TEST 4: Test fn_get_day_slots_dual_availability RPC ---');
  const allSlots = await client.query(`
    SELECT * FROM fn_get_day_slots_dual_availability(
      $1::uuid,
      CURRENT_DATE
    )
    ORDER BY recommended_order;
  `, [branchId]);
  console.table(allSlots.rows);

  await client.end();
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
