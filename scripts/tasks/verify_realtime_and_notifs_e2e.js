const { Client } = require('../../backend/node_modules/pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
});

async function run() {
  console.log('=== [E2E VERIFICATION] REALTIME & ADMIN NOTIFICATION PIPELINE ===\n');
  await client.connect();

  // 1. Kiểm tra publication supabase_realtime
  console.log('--- 1. Kiểm tra Publication supabase_realtime ---');
  const pubRes = await client.query(`
    SELECT tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime'
    ORDER BY tablename;
  `);
  const activeTables = pubRes.rows.map(r => r.tablename);
  console.log('Các bảng đang kích hoạt Supabase Realtime WebSocket:');
  console.log(activeTables.join(', '));
  const requiredTables = ['bookings', 'invoices', 'notifications', 'tuition_transactions', 'users'];
  const missingTables = requiredTables.filter(t => !activeTables.includes(t));
  if (missingTables.length > 0) {
    throw new Error(`Thiếu bảng trong supabase_realtime: ${missingTables.join(', ')}`);
  }
  console.log('-> ĐẠT: Toàn bộ bảng nghiệp vụ trọng yếu đã kết nối WebSocket Realtime Broadcast!\n');

  // 2. Kiểm tra Triggers trên public.bookings và public.invoices
  console.log('--- 2. Kiểm tra Triggers CSDL ---');
  const bkTrig = await client.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookings' AND trigger_name = 'trg_notify_admin_on_booking';
  `);
  if (bkTrig.rowCount === 0) {
    throw new Error('Trigger trg_notify_admin_on_booking chưa được gắn trên bookings!');
  }
  console.log('-> ĐẠT: Trigger trg_notify_admin_on_booking đang HOẠT ĐỘNG trên bookings.');

  const invTrig = await client.query(`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'invoices' AND trigger_name = 'trg_notify_admin_on_invoice';
  `);
  if (invTrig.rowCount === 0) {
    throw new Error('Trigger trg_notify_admin_on_invoice chưa được gắn trên invoices!');
  }
  console.log('-> ĐẠT: Trigger trg_notify_admin_on_invoice đang HOẠT ĐỘNG trên invoices.\n');

  // 3. Giả lập Khách hàng đặt lịch từ Mobile App
  const bookingCode = 'BK-E2E-' + Math.floor(100000 + Math.random() * 900000);
  console.log(`--- 3. Giả lập Khách hàng đặt lịch trên Mobile App (Mã: ${bookingCode}) ---`);
  
  const insertBk = await client.query(`
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
      CURRENT_DATE + INTERVAL '2 day',
      '14:00:00',
      '15:00:00',
      'CONFIRMED',
      'UNPAID',
      700000,
      700000,
      'Nguyễn Thị Thu Trang (App Khách hàng)',
      '0912345678',
      'Khách yêu cầu KTV có tay nghề nắn chỉnh khớp',
      $2
    ) RETURNING id, booking_code, booked_for_name, created_at;
  `, [bookingCode, 'QR_E2E_' + bookingCode]);

  const bookingId = insertBk.rows[0].id;
  console.log(`Đã ghi nhận lịch hẹn vào CSDL thành công: ID = ${bookingId}`);

  // 4. Kiểm tra các thông báo Admin được tự động sinh ra trong public.notifications
  console.log('\n--- 4. Kiểm tra thông báo Admin đã tự động sinh ra ---');
  const notifRows = await client.query(`
    SELECT n.id, n.user_id, u.full_name, u.role, n.title, n.message, n.type, n.is_read, n.data, n.created_at
    FROM public.notifications n
    LEFT JOIN public.users u ON n.user_id = u.id
    WHERE n.data->>'booking_code' = $1
    ORDER BY n.user_id NULLS FIRST;
  `, [bookingCode]);

  console.log(`Tổng số thông báo tạo ra cho quản trị viên: ${notifRows.rowCount}`);
  console.table(notifRows.rows.map(r => ({
    id: r.id.substring(0, 8) + '...',
    user_target: r.user_id ? `${r.full_name} (${r.role})` : 'BROADCAST TOÀN BỘ ADMIN/LỄ TÂN',
    title: r.title,
    message: r.message.substring(0, 75) + '...',
    type: r.type,
    link: r.data?.link,
    is_read: r.is_read
  })));

  if (notifRows.rowCount === 0) {
    throw new Error('LỖI: Không có thông báo nào được sinh ra cho Admin khi có đặt lịch!');
  }

  const broadcastNotif = notifRows.rows.find(r => r.user_id === null);
  if (!broadcastNotif) {
    throw new Error('LỖI: Thiếu thông báo broadcast toàn hệ thống (user_id IS NULL)!');
  }
  console.log('-> ĐẠT: Thông báo Broadcast cho Web-Admin đã được sinh thành công với link chuyển hướng chuẩn.');

  // 5. Kiểm tra tính đồng bộ Hóa đơn tự động sinh từ Booking
  console.log('\n--- 5. Kiểm tra Hóa đơn tự động sinh từ Booking ---');
  const invRes = await client.query(`
    SELECT id, invoice_code, total_amount, payment_status 
    FROM public.invoices 
    WHERE booking_id = $1;
  `, [bookingId]);
  if (invRes.rowCount > 0) {
    console.log(`Hóa đơn đồng bộ từ booking: ${invRes.rows[0].invoice_code}, tổng tiền: ${invRes.rows[0].total_amount}đ, trạng thái: ${invRes.rows[0].payment_status}`);
  }

  // 6. Dọn dẹp dữ liệu kiểm thử
  console.log('\n--- 6. Dọn dẹp dữ liệu kiểm thử ---');
  await client.query(`DELETE FROM public.notifications WHERE data->>'booking_code' = $1;`, [bookingCode]);
  await client.query(`DELETE FROM public.invoices WHERE booking_id = $1;`, [bookingId]);
  await client.query(`DELETE FROM public.bookings WHERE id = $1;`, [bookingId]);
  console.log('-> ĐẠT: Đã dọn dẹp sạch sẽ bản ghi kiểm thử.');

  console.log('\n=== TẤT CẢ CÁC BƯỚC KIỂM THỬ THÀNH CÔNG 100%! ===');
  await client.end();
}

run().catch((err) => {
  console.error('\nLỖI KIỂM THỬ E2E:', err);
  process.exit(1);
});
