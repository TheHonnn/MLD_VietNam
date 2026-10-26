const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));
require(path.join(__dirname, '../../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../../backend/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function seedRevenueData() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  try {
    // 1. Get branch and users
    const branchRes = await client.query("SELECT id FROM branches WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001'");
    const branchId = branchRes.rows[0]?.id || 'aaaaaaaa-0001-0001-0001-000000000001';

    const usersRes = await client.query("SELECT id FROM users LIMIT 5");
    const cashierId = 'bbbbbbbb-0001-0001-0001-000000000002';
    const customer1 = usersRes.rows[1]?.id || 'bbbbbbbb-0001-0001-0001-000000000005';
    const customer2 = usersRes.rows[2]?.id || '7ab40597-207a-4c70-8662-70f4f8607c35';
    const customer3 = usersRes.rows[3]?.id || '097ef776-4afe-4a25-9927-910b9ab55e59';

    // 2. Check user package
    const pkgRes = await client.query("SELECT id FROM user_packages LIMIT 1");
    const userPackageId = pkgRes.rows[0]?.id || null;

    // 3. Seed Invoices
    // Stream 2: Dịch vụ trị liệu (Treatment Package / Session)
    await client.query(`
      INSERT INTO invoices (
        id, invoice_code, branch_id, customer_id, cashier_id, user_package_id,
        subtotal, discount_amount, points_redeemed_amount, vat_amount, total_amount,
        payment_method, payment_status, paid_at
      )
      VALUES (
        '99999999-0001-0001-0001-000000000001',
        'HD-202610-001',
        $1, $2, $3, $4,
        15000000.00, 0, 0, 0, 15000000.00,
        'BANK_TRANSFER', 'PAID', '2026-10-15T09:30:00.000Z'
      )
      ON CONFLICT (invoice_code) DO UPDATE SET total_amount = EXCLUDED.total_amount;
    `, [branchId, customer1, cashierId, userPackageId]);
    console.log('✅ Seeded Treatment Package invoice (Stream 2): 15,000,000đ');

    // Stream 3: Sản phẩm mang về (Retail POS - MLD Lymphatic Oil & Rosidal Bandages)
    await client.query(`
      INSERT INTO invoices (
        id, invoice_code, branch_id, customer_id, cashier_id,
        subtotal, discount_amount, points_redeemed_amount, vat_amount, total_amount,
        payment_method, payment_status, paid_at
      )
      VALUES (
        '99999999-0001-0001-0001-000000000002',
        'HD-202610-002',
        $1, $2, $3,
        2850000.00, 0, 0, 0, 2850000.00,
        'CASH_AT_SPA', 'PAID', '2026-10-14T15:20:00.000Z'
      )
      ON CONFLICT (invoice_code) DO UPDATE SET total_amount = EXCLUDED.total_amount;
    `, [branchId, customer2, cashierId]);
    console.log('✅ Seeded Retail Product invoice 1 (Stream 3): 2,850,000đ');

    // Stream 3: Sản phẩm mang về (Retail POS - Venosan Compression Garments & Scar Cream)
    await client.query(`
      INSERT INTO invoices (
        id, invoice_code, branch_id, customer_id, cashier_id,
        subtotal, discount_amount, points_redeemed_amount, vat_amount, total_amount,
        payment_method, payment_status, paid_at
      )
      VALUES (
        '99999999-0001-0001-0001-000000000003',
        'HD-202610-003',
        $1, $2, $3,
        2450000.00, 0, 0, 0, 2450000.00,
        'VNPAY', 'PAID', '2026-10-16T11:45:00.000Z'
      )
      ON CONFLICT (invoice_code) DO UPDATE SET total_amount = EXCLUDED.total_amount;
    `, [branchId, customer3, cashierId]);
    console.log('✅ Seeded Retail Product invoice 2 (Stream 3): 2,450,000đ');

    // 4. Seed Live Bookings for Dashboard Upcoming Bookings table
    await client.query(`
      INSERT INTO bookings (
        id, booking_code, customer_id, branch_id, booking_date, start_time, end_time,
        status, payment_status, payment_method, base_total, discount_amount, final_price,
        booked_for_name, booked_for_phone, special_notes, qr_code_hash
      )
      VALUES (
        '99999999-0002-0001-0001-000000000001',
        'BK-202610-001',
        $1, $2, '2026-10-16', '10:00:00', '11:30:00',
        'CONFIRMED', 'PAID', 'BANK_TRANSFER', 850000.00, 0, 850000.00,
        'Lê Hoài An', '0902000005', 'Dẫn lưu bạch huyết vùng đùi sau phẫu thuật', 'QR-BK-202610-001'
      )
      ON CONFLICT (booking_code) DO NOTHING;
    `, [customer2, branchId]);

    await client.query(`
      INSERT INTO bookings (
        id, booking_code, customer_id, branch_id, booking_date, start_time, end_time,
        status, payment_status, payment_method, base_total, discount_amount, final_price,
        booked_for_name, booked_for_phone, special_notes, qr_code_hash
      )
      VALUES (
        '99999999-0002-0001-0001-000000000002',
        'BK-202610-002',
        $1, $2, '2026-10-16', '14:00:00', '15:00:00',
        'CONFIRMED', 'UNPAID', 'CASH_AT_SPA', 650000.00, 0, 650000.00,
        'Phạm Thảo Vy', '0902000006', 'Khám tầm soát phù bạch huyết định kỳ ISL Stage 1', 'QR-BK-202610-002'
      )
      ON CONFLICT (booking_code) DO NOTHING;
    `, [customer3, branchId]);
    console.log('✅ Seeded 2 sample bookings for live operational schedule');

    // 5. Verify Invoices & Tuitions
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM invoices) AS invoice_count,
        (SELECT SUM(total_amount) FROM invoices) AS invoice_total,
        (SELECT COUNT(*) FROM tuition_transactions) AS tuition_count,
        (SELECT SUM(amount) FROM tuition_transactions) AS tuition_total,
        (SELECT COUNT(*) FROM bookings) AS booking_count
    `);
    console.log('📊 Current Live Summary:', summary.rows[0]);

  } catch (error) {
    console.error('❌ Error seeding revenue data:', error);
  } finally {
    await client.end();
  }
}

seedRevenueData();
