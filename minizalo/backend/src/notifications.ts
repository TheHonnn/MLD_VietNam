import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { Store, Row } from './store.js';
import {inboxPage} from './notification-inbox.js';

const labels: Record<string, string> = {
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', CHECKED_IN: 'Đã check-in', IN_SERVICE: 'Đang thực hiện',
  COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến', CONSULTING: 'Chờ tư vấn',
  DEPOSITED: 'Đã đặt cọc', ENROLLED: 'Đã ghi danh', STUDYING: 'Đang học', GRADUATED: 'Đã tốt nghiệp', DROPPED: 'Đã ngừng học',
  ACTIVE: 'Đang sử dụng', EXPIRED: 'Đã hết hạn', ISSUED: 'Đã cấp', REVOKED: 'Đã thu hồi',
  PAID: 'Đã thanh toán', UNPAID: 'Chưa thanh toán', PARTIAL: 'Đã thanh toán một phần', REFUNDED: 'Đã hoàn tiền', FAILED: 'Không thành công',
  RESOLVED: 'Đã giải quyết', IN_PROGRESS: 'Đang xử lý', CLOSED: 'Đã đóng',
  PRESENT: 'Có mặt', ABSENT: 'Vắng mặt', LATE: 'Đi muộn', EXCUSED: 'Vắng có phép',
  AVAILABLE: 'Khả dụng', USED: 'Đã sử dụng',
  PAUSED: 'Tạm dừng', PLANNED: 'Đã lên kế hoạch', OPEN_FOR_ENROLLMENT: 'Đang tuyển sinh', ONGOING: 'Đang diễn ra',
};
const label = (value: string) => labels[value] || value;
const money = (value: unknown) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const day = (value: unknown) => value ? new Intl.DateTimeFormat('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(String(value))) : '';

// Observe canonical records, including changes made by the shared admin. No new schema or synthetic business records.
export async function syncNotifications(store: Store, userId: string) {
  const [schema]=await store.query(Prisma.sql`SELECT to_regclass('public.miniapp_schema_versions') IS NOT NULL AS ready`);
  if(schema.ready) {
    const reminders=await store.query(Prisma.sql`SELECT b.id,b.booking_code,to_char(b.booking_date,'YYYY-MM-DD') AS day,to_char(b.start_time,'HH24:MI:SS') AS time,
      EXTRACT(EPOCH FROM ((b.booking_date+b.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'-clock_timestamp())) AS seconds
      FROM bookings b WHERE b.customer_id=${userId}::uuid AND b.status IN ('PENDING','CONFIRMED')
      AND (b.booking_date+b.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp()
      AND (b.booking_date+b.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'<=clock_timestamp()+interval '24 hours'
      AND COALESCE((SELECT appointment_reminder FROM user_settings WHERE user_id=${userId}::uuid),true)`);
    await store.query(Prisma.sql`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`);
    for(const reminder of reminders) {
      const sourceKey=`reminder:${reminder.id}:${reminder.day}:${reminder.time}:${Number(reminder.seconds)<=7200?'2h':'24h'}`;
      await store.query(Prisma.sql`INSERT INTO notifications(user_id,title,message,type,data)
        SELECT ${userId}::uuid,'Nhắc lịch hẹn sắp tới',${`${reminder.booking_code} · ${reminder.day} ${reminder.time}`},'BOOKING',${JSON.stringify({sourceKey,channel:'reminder',target:{screen:'booking',entityId:reminder.id}})}::jsonb
        WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE user_id=${userId}::uuid AND data->>'sourceKey'=${sourceKey}) RETURNING id`);
    }
    const expired=await store.query(Prisma.sql`SELECT p.id,p.expires_at,t.name FROM user_packages p JOIN treatment_packages t ON t.id=p.package_id WHERE p.customer_id=${userId}::uuid AND p.status='ACTIVE' AND p.expires_at<=CURRENT_TIMESTAMP`);
    for(const plan of expired) {
      const sourceKey=`expired-package:${plan.id}:${new Date(plan.expires_at).toISOString()}`;
      await store.query(Prisma.sql`INSERT INTO notifications(user_id,title,message,type,data) SELECT ${userId}::uuid,'Liệu trình đã hết hạn',${plan.name},'TREATMENT',${JSON.stringify({sourceKey,target:{screen:'treatment',tab:'packages',entityId:plan.id}})}::jsonb
        WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE user_id=${userId}::uuid AND data->>'sourceKey'=${sourceKey}) RETURNING id`);
    }
    return;
  }
  await store.query(Prisma.sql`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`);
  const sources = await store.query(Prisma.sql`
    (SELECT 'booking' AS source,b.id::text,b.created_at AS occurred_at,jsonb_build_object('status',b.status,'date',b.booking_date,'time',b.start_time,'end',b.end_time,'branch',br.name,'technicianId',b.technician_id,'reason',b.cancellation_reason,'code',b.booking_code) AS details
      FROM bookings b JOIN branches br ON br.id=b.branch_id WHERE b.customer_id=${userId}::uuid ORDER BY b.updated_at DESC LIMIT 100)
    UNION ALL
    (SELECT 'enrollment',e.id::text,e.enrolled_at,jsonb_build_object('status',e.status,'courseId',e.course_id,'enrollmentId',e.id,'name',c.title,'batchId',e.batch_id,'batchCode',cb.batch_code,'batchStatus',cb.status,'instructorId',cb.instructor_id,'branchId',cb.branch_id,'schedule',cb.schedule_text,'startDate',cb.start_date,'endDate',cb.end_date,'paid',e.amount_paid,'progress',CASE WHEN e.progress_percent=100 THEN 100 ELSE 0 END)
      FROM course_enrollments e JOIN courses c ON c.id=e.course_id LEFT JOIN course_batches cb ON cb.id=e.batch_id WHERE e.student_id=${userId}::uuid ORDER BY e.enrolled_at DESC LIMIT 100)
    UNION ALL
    (SELECT 'quiz',q.id::text,q.submitted_at,jsonb_build_object('courseId',e.course_id,'enrollmentId',e.id,'name',c.title,'quizId',q.quiz_id,'score',q.score,'passed',q.passed,'feedback',q.instructor_feedback)
      FROM quiz_submissions q JOIN course_enrollments e ON e.id=q.enrollment_id JOIN courses c ON c.id=e.course_id WHERE e.student_id=${userId}::uuid ORDER BY q.submitted_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'results',a.id::text,a.created_at,to_jsonb(a)||jsonb_build_object('courseId',e.course_id,'enrollmentId',e.id,'name',c.title)
      FROM student_academic_records a JOIN course_enrollments e ON e.id=a.enrollment_id JOIN courses c ON c.id=e.course_id WHERE e.student_id=${userId}::uuid ORDER BY a.created_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'certificate',s.id::text,s.created_at,jsonb_build_object('status',s.status,'courseId',s.course_id,'enrollmentId',s.enrollment_id,'name',s.course_title,'code',s.certificate_code,'reason',s.revocation_reason,'pdf',s.certificate_pdf_url)
      FROM student_certificates s WHERE s.student_id=${userId}::uuid ORDER BY s.created_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'schedule',s.id||':'||e.id,e.enrolled_at,to_jsonb(s)||jsonb_build_object('courseId',e.course_id,'enrollmentId',e.id,'name',c.title)
      FROM batch_schedules s JOIN course_enrollments e ON e.batch_id=s.batch_id JOIN courses c ON c.id=e.course_id WHERE e.student_id=${userId}::uuid AND e.status IN ('ENROLLED','STUDYING','GRADUATED') ORDER BY s.session_date DESC LIMIT 100)
    UNION ALL
    (SELECT 'attendance',a.id::text,e.enrolled_at,jsonb_build_object('status',a.status,'courseId',e.course_id,'enrollmentId',e.id,'name',c.title,'date',s.session_date,'topic',s.topic,'notes',a.notes)
      FROM student_attendance a JOIN batch_schedules s ON s.id=a.schedule_id JOIN course_enrollments e ON e.id=a.enrollment_id JOIN courses c ON c.id=e.course_id WHERE e.student_id=${userId}::uuid ORDER BY s.session_date DESC LIMIT 50)
    UNION ALL
    (SELECT 'package',p.id::text,p.purchased_at,jsonb_build_object('status',p.status,'name',t.name,'completed',p.completed_sessions,'total',p.total_sessions,'expires',p.expires_at)
      FROM user_packages p JOIN treatment_packages t ON t.id=p.package_id WHERE p.customer_id=${userId}::uuid ORDER BY p.purchased_at DESC LIMIT 100)
    UNION ALL
    (SELECT 'journal',j.id::text,j.created_at,to_jsonb(j) FROM treatment_journal j WHERE j.customer_id=${userId}::uuid ORDER BY j.created_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'support',s.id::text,s.created_at,jsonb_build_object('status',s.status,'name',s.subject,'reply',s.admin_reply) FROM support_tickets s WHERE s.customer_id=${userId}::uuid ORDER BY s.created_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'review',r.id::text,r.created_at,jsonb_build_object('bookingId',r.booking_id,'reply',r.branch_reply,'rating',r.rating) FROM reviews r WHERE r.customer_id=${userId}::uuid AND r.branch_reply IS NOT NULL ORDER BY r.created_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'invoice',i.id::text,i.paid_at,jsonb_build_object('status',i.payment_status,'code',i.invoice_code,'amount',i.total_amount,'refund',i.refund_amount) FROM invoices i WHERE i.customer_id=${userId}::uuid ORDER BY i.paid_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'tuition',t.id::text,t.paid_at,jsonb_build_object('status',t.payment_status,'code',t.transaction_code,'amount',t.amount,'name',c.title,'courseId',t.course_id,'enrollmentId',t.enrollment_id)
      FROM tuition_transactions t JOIN courses c ON c.id=t.course_id JOIN course_enrollments e ON e.id=t.enrollment_id WHERE t.student_id=${userId}::uuid AND e.student_id=${userId}::uuid ORDER BY t.paid_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'points',p.id::text,p.created_at,jsonb_build_object('change',p.points_change,'balance',p.balance_after,'description',p.description) FROM point_transactions p WHERE p.user_id=${userId}::uuid ORDER BY p.created_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'voucher',v.id::text,v.claimed_at,jsonb_build_object('status',v.status,'code',c.code,'expires',v.expires_at) FROM user_vouchers v JOIN coupons c ON c.id=v.coupon_id WHERE v.user_id=${userId}::uuid ORDER BY v.claimed_at DESC LIMIT 50)
    UNION ALL
    (SELECT 'content',e.id::text,e.enrolled_at,jsonb_build_object('courseId',e.course_id,'enrollmentId',e.id,'name',c.title,
      'lessons',(SELECT md5(COALESCE(jsonb_agg(jsonb_build_object('chapter',to_jsonb(ch),'lesson',to_jsonb(l)) ORDER BY ch.id,l.id)::text,'[]')) FROM course_chapters ch LEFT JOIN course_lessons l ON ch.id=l.chapter_id WHERE ch.course_id=e.course_id),
      'quizzes',(SELECT md5(COALESCE(jsonb_agg(to_jsonb(q)||jsonb_build_object('questions',(SELECT jsonb_agg(to_jsonb(question) ORDER BY question.id) FROM quiz_questions question WHERE question.quiz_id=q.id)) ORDER BY q.id)::text,'[]')) FROM course_quizzes q WHERE q.course_id=e.course_id))
      FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=${userId}::uuid AND e.status IN ('ENROLLED','STUDYING','GRADUATED') ORDER BY e.enrolled_at DESC LIMIT 100)
  `);
  const [settings] = await store.query(Prisma.sql`SELECT appointment_reminder FROM user_settings WHERE user_id=${userId}::uuid`);
  if (settings?.appointment_reminder !== false) for (const booking of [...sources]) {
    if (booking.source !== 'booking' || !['PENDING','CONFIRMED'].includes(booking.details.status)) continue;
    const d = booking.details;
    const remaining = Date.parse(`${String(d.date).slice(0,10)}T${d.time}+07:00`) - Date.now();
    if (remaining <= 0 || remaining > 86400000) continue;
    sources.push({...booking,source:'reminder',id:`${booking.id}:${d.date}:${d.time}:${remaining <= 7200000 ? '2h' : '24h'}`,details:{...d,bookingId:booking.id},occurred_at:new Date()});
  }
  const previous = await store.query(Prisma.sql`SELECT DISTINCT ON (data->>'sourceKey') data FROM notifications WHERE user_id=${userId}::uuid AND data ? 'sourceKey' ORDER BY data->>'sourceKey',created_at DESC,id DESC`);
  const known = new Map(previous.map(row => [row.data.sourceKey, row.data.fingerprint]));
  const pending: {title:string; message:string; type:string; data:Row; created:Date}[] = [];
  for (const row of sources) {
    const d = row.details, key = `${row.source}:${row.id}`;
    const fingerprint = createHash('sha256').update(JSON.stringify(d, Object.keys(d).sort())).digest('hex');
    if (known.get(key) === fingerprint) continue;
    const target: Row = {screen:'treatment',entityId:String(row.id)};
    let title = '', message = '', type = 'SYSTEM';
    switch (row.source) {
      case 'booking': title = `Lịch hẹn: ${label(d.status)}`; message = `${d.code} · ${day(d.date)} ${d.time} · ${d.branch}${d.reason ? ` · ${d.reason}` : ''}`; type = 'BOOKING'; target.screen = 'booking'; break;
      case 'reminder': title = 'Nhắc lịch hẹn sắp tới'; message = `${d.code} · ${day(d.date)} ${d.time} · ${d.branch}`; type = 'BOOKING'; target.screen = 'booking'; target.entityId = d.bookingId; break;
      case 'enrollment': title = `Khóa học: ${label(d.status)}`; message = `${d.name}${d.batchCode ? ` · ${d.batchCode}` : ''}${d.batchStatus ? ` · Lớp: ${label(d.batchStatus)}` : ''} · Đã thanh toán ${money(d.paid)}${d.progress === 100 ? ' · Đã hoàn thành nội dung học' : ''}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'content'; break;
      case 'content': title = known.has(key) ? 'Nội dung khóa học đã cập nhật' : 'Nội dung khóa học của bạn'; message = d.name; type = 'COURSE'; target.screen = 'academy'; target.tab = 'content'; break;
      case 'quiz': title = 'Kết quả bài trắc nghiệm'; message = `${d.name} · ${d.score}/10 · ${d.passed ? 'Đạt' : 'Chưa đạt'}${d.feedback ? ` · ${d.feedback}` : ''}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'exam'; target.quizId = d.quizId; break;
      case 'results': title = 'Kết quả và đánh giá học tập'; message = `${d.name} · Lý thuyết ${d.theory_score}/10 · Thực hành ${d.practical_score}/10${d.is_graduated ? ' · Đã tốt nghiệp' : ''}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'results'; break;
      case 'certificate': title = `Chứng chỉ: ${label(d.status)}`; message = `${d.name} · ${d.code}${d.reason ? ` · ${d.reason}` : ''}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'results'; break;
      case 'schedule': title = 'Lịch học của bạn'; message = `${d.name} · ${day(d.session_date)} ${d.start_time} · ${d.topic}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'schedule'; break;
      case 'attendance': title = `Điểm danh: ${label(d.status)}`; message = `${d.name} · ${day(d.date)} · ${d.topic}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'schedule'; break;
      case 'package': title = `Liệu trình: ${label(d.status)}`; message = `${d.name} · ${d.completed}/${d.total} buổi · Hạn ${day(d.expires)}`; type = 'TREATMENT'; target.tab = 'packages'; break;
      case 'journal': title = 'Nhật ký chăm sóc của bạn'; message = `Buổi ${d.session_number} · ${day(d.session_date)}${d.specialist_advice ? ` · ${d.specialist_advice}` : ''}`; type = 'TREATMENT'; target.tab = 'journal'; break;
      case 'support': title = d.reply ? 'Phản hồi yêu cầu hỗ trợ' : `Hỗ trợ: ${label(d.status)}`; message = `${d.name}${d.reply ? ` · ${d.reply}` : ''}`; target.tab = 'support'; break;
      case 'review': title = 'Phản hồi đánh giá của bạn'; message = d.reply; target.tab = 'journal'; target.bookingId = d.bookingId; break;
      case 'invoice': title = `Hóa đơn: ${label(d.status)}`; message = `${d.code} · ${money(d.amount)}${Number(d.refund) ? ` · Hoàn ${money(d.refund)}` : ''}`; target.screen = 'profile'; target.tab = 'payments'; break;
      case 'tuition': title = `Học phí: ${label(d.status)}`; message = `${d.name} · ${d.code} · ${money(d.amount)}`; type = 'COURSE'; target.screen = 'academy'; target.tab = 'payment'; break;
      case 'points': title = 'Biến động điểm thưởng'; message = `${Number(d.change)>0?'+':''}${d.change} điểm · Số dư ${d.balance} · ${d.description}`; target.screen = 'profile'; target.tab = 'points'; break;
      case 'voucher': title = `Voucher: ${label(d.status)}`; message = `${d.code} · Hạn ${day(d.expires)}`; target.screen = 'profile'; target.tab = 'vouchers'; break;
    }
    if (!title) continue;
    if (d.courseId) { target.courseId = d.courseId; target.enrollmentId = d.enrollmentId; }
    const created = known.has(key) ? new Date() : new Date(row.occurred_at);
    pending.push({title,message,type,data:{sourceKey:key,fingerprint,target,entityId:String(row.id)},created});
  }
  if (pending.length) await store.query(Prisma.sql`INSERT INTO notifications(user_id,title,message,type,data,created_at) VALUES ${Prisma.join(pending.map(item => Prisma.sql`(${userId}::uuid,${item.title},${item.message},${item.type},${JSON.stringify(item.data)}::jsonb,${item.created})`))} RETURNING id`);
}

export async function listNotifications(store: Store, userId: string, cursor?:unknown,filter:unknown='all') {
  for (let attempt = 0; ; attempt++) {
    try {
      return await store.transaction(async tx => {
        if(!cursor) await syncNotifications(tx, userId);
        return inboxPage(tx,userId,cursor,filter);
      });
    } catch (error) {
      const failure = error as {code?:string; meta?:{code?:string}};
      if (attempt >= 2 || !(failure.code === 'P2034' || failure.code === '40001' || failure.meta?.code === '40001')) throw error;
    }
  }
}
