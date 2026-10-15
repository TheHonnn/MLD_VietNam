// ==============================================================================
// MLD VIỆT NAM - SUPABASE EDGE FUNCTION: APPOINTMENT REMINDER & FCM NOTIFICATIONS
// Tự động quét lịch hẹn sắp diễn ra và bắn Push Notification qua Firebase (FCM)
// ==============================================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAdminClient } from '../_shared/supabase-client.ts';

interface ReminderRequestBody {
  booking_id?: string; // Nếu truyền booking_id thì nhắc lịch đơn lẻ
  window_hours?: number; // Số giờ trước lịch hẹn để quét (mặc định: 2 giờ)
}

// Hàm gửi Push Notification đến Firebase Cloud Messaging (FCM)
async function sendFcmNotification(
  deviceToken: string,
  title: string,
  body: string,
  payloadData: Record<string, string> = {}
): Promise<{ success: boolean; response?: any; error?: string }> {
  const fcmServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

  // Nếu chưa cấu hình FIREBASE_SERVER_KEY, vẫn lưu database và trả về thông báo mô phỏng
  if (!fcmServerKey) {
    console.warn('⚠️ Chưa thiết lập biến môi trường FIREBASE_SERVER_KEY. Thông báo đã được ghi vào bảng notifications trong DB.');
    return { success: true, response: 'SIMULATED_LOCAL_NOTIFICATION_SAVED_IN_DB' };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: deviceToken,
        notification: {
          title,
          body,
          sound: 'default',
          badge: 1,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: payloadData,
        priority: 'high',
      }),
    });

    const resJson = await response.json();
    return { success: response.ok, response: resJson };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req: Request) => {
  // Xử lý Preflight CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getAdminClient();
    const body: ReminderRequestBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    const notificationsSent: any[] = [];
    const windowHours = body.window_hours ?? 2;

    // 1. Trường hợp gửi nhắc nhở đơn lẻ theo booking_id
    if (body.booking_id) {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id, booking_code, booking_date, start_time, status,
          users:customer_id (id, full_name, phone, fcm_device_token),
          branches:branch_id (id, name, address, phone)
        `)
        .eq('id', body.booking_id)
        .single();

      if (bErr || !booking) {
        return new Response(
          JSON.stringify({ success: false, message: 'Không tìm thấy lịch hẹn.', error: bErr }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const user = (booking as any).users;
      const branch = (booking as any).branches;

      const title = '🌸 Nhắc lịch hẹn làm đẹp tại MLD';
      const message = `Chào ${user?.full_name || 'Quý khách'}, bạn có lịch hẹn lúc ${booking.start_time?.slice(0, 5)} ngày ${booking.booking_date} tại ${branch?.name || 'MLD Beauty'}. Hẹn gặp bạn nhé!`;

      // Ghi nhận thông báo vào bảng notifications trong Database
      const { data: notifData, error: nErr } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          type: 'APPOINTMENT_REMINDER',
          data: {
            booking_id: booking.id,
            booking_code: booking.booking_code,
            branch_name: branch?.name,
            address: branch?.address,
            start_time: booking.start_time,
            booking_date: booking.booking_date,
          },
          is_read: false,
        })
        .select()
        .single();

      // Bắn FCM nếu user có token
      let fcmResult: any = null;
      if (user?.fcm_device_token) {
        fcmResult = await sendFcmNotification(
          user.fcm_device_token,
          title,
          message,
          { booking_id: booking.id, screen: 'BOOKING_DETAIL' }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Đã gửi thông báo nhắc lịch hẹn thành công.',
          notification: notifData,
          fcm: fcmResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Trường hợp quét tự động hàng loạt (Batch cron)
    const today = new Date().toISOString().split('T')[0];

    // Lấy các lịch hẹn trong ngày có trạng thái CONFIRMED
    const { data: upcomingBookings, error: fetchErr } = await supabase
      .from('bookings')
      .select(`
        id, booking_code, booking_date, start_time, status,
        users:customer_id (id, full_name, phone, fcm_device_token),
        branches:branch_id (id, name, address, phone)
      `)
      .eq('booking_date', today)
      .eq('status', 'CONFIRMED');

    if (fetchErr) {
      return new Response(
        JSON.stringify({ success: false, message: 'Lỗi truy vấn lịch hẹn.', error: fetchErr }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sentCount = 0;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const bk of (upcomingBookings || [])) {
      const user = (bk as any).users;
      const branch = (bk as any).branches;

      if (!user?.id) continue;

      // Tính khoảng thời gian đến giờ hẹn (phút)
      const [bHour, bMin] = (bk.start_time || '00:00:00').split(':').map(Number);
      const bookingMinutes = bHour * 60 + bMin;
      const diffMinutes = bookingMinutes - currentMinutes;

      // Nhắc nhở nếu lịch hẹn diễn ra trong khoảng từ 15 phút đến windowHours*60 phút
      if (diffMinutes >= 15 && diffMinutes <= windowHours * 60) {
        // Kiểm tra xem đã gửi thông báo nhắc lịch này chưa (tránh spam)
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'APPOINTMENT_REMINDER')
          .filter('data->>booking_id', 'eq', bk.id)
          .limit(1);

        if (existingNotif && existingNotif.length > 0) {
          continue; // Đã gửi rồi, bỏ qua
        }

        const title = '🌸 Nhắc lịch hẹn sắp tới tại MLD';
        const message = `Chào ${user.full_name}, lịch hẹn của bạn tại ${branch?.name || 'MLD'} sẽ bắt đầu sau ${diffMinutes} phút nữa (${bk.start_time?.slice(0, 5)}).`;

        await supabase.from('notifications').insert({
          user_id: user.id,
          title,
          message,
          type: 'APPOINTMENT_REMINDER',
          data: {
            booking_id: bk.id,
            booking_code: bk.booking_code,
            branch_name: branch?.name,
            address: branch?.address,
            start_time: bk.start_time,
          },
          is_read: false,
        });

        if (user.fcm_device_token) {
          await sendFcmNotification(user.fcm_device_token, title, message, {
            booking_id: bk.id,
            screen: 'BOOKING_DETAIL',
          });
        }

        sentCount++;
        notificationsSent.push({ booking_id: bk.id, customer: user.full_name, start_time: bk.start_time });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned_count: upcomingBookings?.length || 0,
        sent_count: sentCount,
        notifications: notificationsSent,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Lỗi xử lý gửi nhắc lịch hẹn', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

