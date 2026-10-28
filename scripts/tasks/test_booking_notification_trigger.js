const { Client } = require('../../backend/node_modules/pg');
const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
});

async function run() {
  await client.connect();

  const code = 'TEST-APP-' + Math.floor(100000 + Math.random() * 900000);
  console.log(`Inserting test booking with code ${code}...`);

  const bkRes = await client.query(`
    INSERT INTO public.bookings (
      booking_code,
      customer_id,
      branch_id,
      booking_date,
      start_time,
      end_time,
      status,
      payment_status,
      base_total,
      final_price,
      booked_for_name,
      booked_for_phone,
      special_notes,
      qr_code_hash
    ) VALUES (
      $1,
      '4ee38f82-bb0a-4c15-a9d3-868d20a3f0a9',
      'aaaaaaaa-0001-0001-0001-000000000001',
      CURRENT_DATE + INTERVAL '1 day',
      '10:00:00',
      '11:00:00',
      'CONFIRMED',
      'UNPAID',
      500000,
      500000,
      'Chị Ngọc Mai (Khách đặt qua App)',
      '0987654321',
      'Khách muốn đặt phòng yên tĩnh',
      'QR_TEST_HASH_123'
    ) RETURNING id, booking_code, booked_for_name, created_at;
  `, [code]);

  const createdBk = bkRes.rows[0];
  console.log('Booking inserted:', createdBk);

  // Check notifications table for this booking
  const notifRes = await client.query(`
    SELECT id, user_id, title, message, type, is_read, data, created_at
    FROM public.notifications
    WHERE data->>'booking_code' = $1
    ORDER BY created_at DESC;
  `, [code]);

  console.log(`Notifications created for booking ${code}:`, notifRes.rowCount);
  console.table(notifRes.rows);

  // Clean up test booking and its notifications
  await client.query(`DELETE FROM public.notifications WHERE data->>'booking_code' = $1;`, [code]);
  await client.query(`DELETE FROM public.bookings WHERE id = $1;`, [createdBk.id]);
  console.log('Cleaned up test booking and test notifications.');

  await client.end();
}

run().catch(console.error);
