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

function getVietnamDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

function safeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Hàm gửi Push Notification đến Firebase Cloud Messaging (FCM)
async function sendFcmNotification(
  deviceToken: string,
  title: string,
  body: string,
  payloadData: Record<string, string> = {}
): Promise<{ success: boolean; response?: any; error?: string }> {
  const fcmServerKey = Deno.env.get('FIREBASE_SERVER_KEY');

  // Nếu chưa cấu hình FIREBASE_SERVER_KEY, báo rõ push chưa được phát
  if (!fcmServerKey) {
    console.warn('⚠️ Chưa thiết lập biến môi trường FIREBASE_SERVER_KEY. Thông báo đã được ghi vào bảng notifications trong DB nhưng chưa phát Push Notification.');
    return {
      success: false,
      response: 'FCM_SERVER_KEY_NOT_CONFIGURED',
      error: 'Chưa cấu hình FIREBASE_SERVER_KEY trên server.',
    };
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

    const authHeader = req.headers.get('Authorization') || '';
    const cronSecretHeader = req.headers.get('x-cron-secret') || '';
    const configuredCronSecret = Deno.env.get('REMINDER_CRON_SECRET') || Deno.env.get('CRON_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const isInternalCron =
      Boolean(configuredCronSecret && (
        safeCompare(cronSecretHeader, configuredCronSecret) ||
        safeCompare(bearerToken, configuredCronSecret)
      )) ||
      Boolean(serviceRoleKey && safeCompare(bearerToken, serviceRoleKey));

    // Kiểm tra quyền kích hoạt batch
    if (!body.booking_id) {
      if (!isInternalCron) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Từ chối truy cập: Quét nhắc lịch hàng loạt (batch cron) yêu cầu mã xác thực nội bộ (REMINDER_CRON_SECRET).',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const notificationsSent: any[] = [];
    const windowHours = Math.min(24, Math.max(1, Number(body.window_hours) || 2));

    // 1. Trường hợp gửi nhắc nhở đơn lẻ theo booking_id
    if (body.booking_id) {
      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id, booking_code, booking_date, start_time, status, customer_id,
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

      // Nếu không phải internal cron, kiểm tra JWT người gọi
      if (!isInternalCron) {
        if (!bearerToken) {
          return new Response(
            JSON.stringify({ success: false, message: 'Yêu cầu token xác thực người dùng.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data: authUser, error: aErr } = await supabase.auth.getUser(bearerToken);
        if (aErr || !authUser?.user) {
          return new Response(
            JSON.stringify({ success: false, message: 'Phiên xác thực không hợp lệ.' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const callerId = authUser.user.id;
        const bookingCustomerId = booking.customer_id;
        if (callerId !== bookingCustomerId) {
          const { data: callerUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', callerId)
            .maybeSingle();
          const isStaff = ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'TECHNICIAN', 'STAFF'].includes(callerUser?.role || '');
          if (!isStaff) {
            return new Response(
              JSON.stringify({ success: false, message: 'Bạn không có quyền kích hoạt thông báo cho lịch hẹn này.' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      const user = (booking as any).users;
      const branch = (booking as any).branches;

      if (booking.status !== 'CONFIRMED') {
        return new Response(
          JSON.stringify({ success: false, message: 'Chỉ có thể nhắc lịch đã xác nhận.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingReminder } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user?.id)
        .eq('type', 'APPOINTMENT_REMINDER')
        .contains('data', { booking_id: booking.id })
        .limit(1);
      if (existingReminder?.length) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, message: 'Nhắc lịch này đã được gửi trước đó.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Đọc ngôn ngữ người dùng từ user_settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', user?.id)
        .maybeSingle();

      const isEn = userSettings?.language === 'en';
      const title = isEn ? '🌸 Beauty Appointment Reminder - MLD' : '🌸 Nhắc lịch hẹn làm đẹp tại MLD';
      const message = isEn
        ? `Dear ${user?.full_name || 'Valued Guest'}, you have an appointment at ${booking.start_time?.slice(0, 5)} on ${booking.booking_date} at ${branch?.name || 'MLD Beauty'}. See you soon!`
        : `Chào ${user?.full_name || 'Quý khách'}, bạn có lịch hẹn lúc ${booking.start_time?.slice(0, 5)} ngày ${booking.booking_date} tại ${branch?.name || 'MLD Beauty'}. Hẹn gặp bạn nhé!`;

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
    const vietnamNow = getVietnamDateTime();
    const today = vietnamNow.date;

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
    const currentMinutes = vietnamNow.minutes;

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

        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();

        const isEn = userSettings?.language === 'en';
        const title = isEn ? '🌸 Upcoming Appointment Reminder - MLD' : '🌸 Nhắc lịch hẹn sắp tới tại MLD';
        const message = isEn
          ? `Dear ${user.full_name}, your appointment at ${branch?.name || 'MLD'} will start in ${diffMinutes} minutes (${bk.start_time?.slice(0, 5)}).`
          : `Chào ${user.full_name}, lịch hẹn của bạn tại ${branch?.name || 'MLD'} sẽ bắt đầu sau ${diffMinutes} phút nữa (${bk.start_time?.slice(0, 5)}).`;

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

    const { data: upcomingSessions, error: scheduleError } = await supabase
      .from('batch_schedules')
      .select('id, session_date, start_time, topic, batch_id, course_batches:batch_id(batch_code, course_id, courses:course_id(title))')
      .eq('session_date', today);

    if (scheduleError) {
      console.error('Không thể tải lịch học sắp tới:', scheduleError.message);
    }

    let scannedStudentSessions = 0;
    for (const session of upcomingSessions || []) {
      const [hour, minute] = (session.start_time || '00:00:00').split(':').map(Number);
      const diffMinutes = hour * 60 + minute - currentMinutes;
      if (diffMinutes < 15 || diffMinutes > windowHours * 60) continue;

      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('student_id, student:users(id, full_name, fcm_device_token)')
        .eq('batch_id', session.batch_id)
        .eq('approval_status', 'APPROVED');

      for (const enrollment of enrollments || []) {
        const student = (enrollment as any).student;
        if (!student?.id) continue;
        scannedStudentSessions += 1;

        const { data: existingReminder } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', student.id)
          .eq('type', 'CLASS_REMINDER')
          .contains('data', { batch_schedule_id: session.id })
          .limit(1);
        if (existingReminder?.length) continue;

        const classInfo = (session as any).course_batches;
        const courseTitle = classInfo?.courses?.title || 'lớp học MLD';
        const title = 'Nhắc lịch học tại Học viện MLD';
        const message = `Chào ${student.full_name || 'bạn'}, buổi học ${courseTitle} sẽ bắt đầu lúc ${session.start_time?.slice(0, 5)} hôm nay. Nội dung: ${session.topic}.`;
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: student.id,
          title,
          message,
          type: 'CLASS_REMINDER',
          data: {
            batch_schedule_id: session.id,
            batch_id: session.batch_id,
            batch_code: classInfo?.batch_code,
            course_title: courseTitle,
            session_date: session.session_date,
            start_time: session.start_time,
          },
          is_read: false,
        });
        if (notificationError) continue;

        if (student.fcm_device_token) {
          await sendFcmNotification(student.fcm_device_token, title, message, {
            batch_schedule_id: session.id,
            screen: 'COURSE_SCHEDULE',
          });
        }
        sentCount += 1;
        notificationsSent.push({ batch_schedule_id: session.id, student: student.full_name, start_time: session.start_time });
      }
    }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned_count: upcomingBookings?.length || 0,
        scanned_student_sessions: scannedStudentSessions,
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

