import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('notification inbox observes canonical changes, isolates customers and persists read state', async t => {
  const {db,id,request,close} = await workflowFixture();
  const inbox = async (owner=1) => {
    const result = await request('/notifications',{owner});
    assert.equal(result.status,200,JSON.stringify(result));
    return result.data.notifications;
  };
  const count = async () => (await db.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n;
  const source = (items,key) => items.find(item => item.data?.sourceKey === key);
  try {
    await t.test('anonymous requests are rejected and baseline comes only from owned records',async()=>{
      assert.equal((await request('/notifications',{anonymous:true})).status,401);
      assert.deepEqual(await inbox(2),[]);
      const items = await inbox();
      assert.ok(source(items,`booking:${id(13)}`).message.includes('WF-FUTURE'));
      assert.equal(source(items,`enrollment:${id(29)}`).data.target.enrollmentId,id(29));
      assert.equal(source(items,`package:${id(10)}`).data.target.tab,'packages');
      const n=await count(); await inbox(); await inbox(); assert.equal(await count(),n);
    });
    await t.test('read-one and read-all persist across refresh and cannot cross accounts',async()=>{
      const item=(await inbox())[0];
      assert.equal((await request(`/notifications/${item.id}/read`,{method:'PATCH',owner:2})).status,404);
      assert.equal((await request(`/notifications/${item.id}/read`,{method:'PATCH'})).status,200);
      assert.equal((await inbox()).find(value=>value.id===item.id).isRead,true);
      assert.equal((await request('/notifications/read-all',{method:'PATCH'})).status,200);
      assert.ok((await inbox()).every(value=>value.isRead));
    });
    await t.test('admin booking status and time changes create distinct notifications, not repeated polling duplicates',async()=>{
      const n=await count();
      await db.query("UPDATE bookings SET status='IN_SERVICE',start_time='12:00',end_time='13:30' WHERE id=$1",[id(13)]);
      let items=await inbox();
      assert.equal(await count(),n+1);
      let notification=source(items,`booking:${id(13)}`);
      assert.match(notification.title,/Đang thực hiện/); assert.match(notification.message,/12:00/);
      assert.equal(notification.data.target.entityId,id(13)); assert.equal(notification.isRead,false);
      await inbox(); assert.equal(await count(),n+1);
      await db.query("UPDATE bookings SET status='COMPLETED' WHERE id=$1",[id(13)]);
      assert.match(source(await inbox(),`booking:${id(13)}`).title,/hoàn thành/);
    });
    await t.test('new registration is not falsely marked paid and completion is reported from shared enrollment',async()=>{
      const saved=await request('/course-enrollments',{owner:2,method:'POST',body:{courseId:id(22)}});
      assert.equal(saved.status,201);
      let items=await inbox(2);
      assert.equal(items.length,1); assert.match(items[0].title,/Chờ tư vấn/); assert.match(items[0].message,/0đ/);
      await db.query("UPDATE course_enrollments SET status='GRADUATED',progress_percent=100 WHERE id=$1",[id(29)]);
      items=await inbox(); const result=source(items,`enrollment:${id(29)}`);
      assert.match(result.title,/tốt nghiệp/); assert.match(result.message,/hoàn thành nội dung/);
    });
    await t.test('quiz grades, feedback, lesson changes and schedule changes deep-link to the exact enrollment',async()=>{
      const submitted=await request(`/courses/${id(22)}/quiz/submit`,{method:'POST',body:{enrollmentId:id(29),quizId:id(26),answers:{[id(27)]:'A',[id(28)]:'B'}}});
      assert.equal(submitted.status,200);
      let notification=source(await inbox(),`quiz:${submitted.data.submission.id}`);
      assert.match(notification.message,/10\/10/); assert.equal(notification.data.target.tab,'exam'); assert.equal(notification.data.target.quizId,id(26));
      await db.query('UPDATE quiz_submissions SET instructor_feedback=$1 WHERE id=$2',['Verified teacher feedback',submitted.data.submission.id]);
      assert.match(source(await inbox(),`quiz:${submitted.data.submission.id}`).message,/Verified teacher feedback/);
      await db.query('UPDATE course_lessons SET title=$1 WHERE id=$2',['Updated actual lesson',id(24)]);
      assert.match(source(await inbox(),`content:${id(29)}`).title,/đã cập nhật/);
      await db.query("INSERT INTO batch_schedules(id,batch_id,session_date,start_time,end_time,topic) VALUES($1,$2,'2099-01-01','10:00','12:00','Actual class topic')",[id(40),id(30)]);
      notification=source(await inbox(),`schedule:${id(40)}:${id(29)}`);
      assert.equal(notification.data.target.enrollmentId,id(29)); assert.equal(notification.data.target.tab,'schedule'); assert.match(notification.message,/Actual class topic/);
      await db.query("UPDATE batch_schedules SET start_time='13:00' WHERE id=$1",[id(40)]);
      assert.match(source(await inbox(),`schedule:${id(40)}:${id(29)}`).message,/13:00/);
    });
    await t.test('care progress, clinical advice and support replies come from admin records',async()=>{
      await db.query("UPDATE user_packages SET completed_sessions=4,status='COMPLETED' WHERE id=$1",[id(10)]);
      await db.query('UPDATE treatment_journal SET specialist_advice=$1 WHERE id=$2',['Updated actual care advice',id(12)]);
      let items=await inbox(); assert.match(source(items,`package:${id(10)}`).message,/4\/4/);
      assert.match(source(items,`journal:${id(12)}`).message,/Updated actual care advice/);
      const ticket=await request('/support-tickets',{method:'POST',body:{subject:'Actual request',message:'Actual question'}});
      await inbox(); await db.query("UPDATE support_tickets SET admin_reply='Actual support reply',status='RESOLVED' WHERE id=$1",[ticket.data.ticket.id]);
      const reply=source(await inbox(),`support:${ticket.data.ticket.id}`);
      assert.match(reply.message,/Actual support reply/); assert.equal(reply.data.target.tab,'support');
      assert.equal((await inbox(2)).some(item=>item.message.includes('Actual support reply')),false);
    });
    await t.test('published results, certificates, attendance and money use real ledger states',async()=>{
      await db.query('INSERT INTO student_academic_records(id,enrollment_id,theory_score,practical_score) VALUES($1,$2,8,9)',[id(41),id(29)]);
      await db.query("INSERT INTO student_certificates(id,enrollment_id,student_id,course_id,certificate_code,qr_verification_code,student_name,course_title,theory_score,practical_score) VALUES($1,$2,$3,$4,'WF-CERT','WF-CERT-QR','Workflow customer','Workflow course',8,9)",[id(42),id(29),id(1),id(22)]);
      await db.query("INSERT INTO student_attendance(id,schedule_id,enrollment_id,status) VALUES($1,$2,$3,'PRESENT')",[id(43),id(40),id(29)]);
      await db.query("INSERT INTO tuition_transactions(id,transaction_code,enrollment_id,student_id,course_id,branch_id,amount,payment_status) VALUES($1,'WF-TUITION',$2,$3,$4,$5,200000,'PAID')",[id(44),id(29),id(1),id(22),id(3)]);
      await db.query("INSERT INTO invoices(id,invoice_code,customer_id,branch_id,subtotal,total_amount,payment_status) VALUES($1,'WF-INVOICE',$2,$3,100000,100000,'UNPAID')",[id(45),id(1),id(3)]);
      await db.query("INSERT INTO point_transactions(id,user_id,points_change,balance_after,action_type,description) VALUES($1,$2,10,10,'TEST','Actual points entry')",[id(46),id(1)]);
      let items=await inbox();
      assert.equal(source(items,`results:${id(41)}`).data.target.tab,'results');
      assert.match(source(items,`certificate:${id(42)}`).title,/Đã cấp/);
      assert.match(source(items,`attendance:${id(43)}`).title,/Có mặt/);
      assert.match(source(items,`tuition:${id(44)}`).message,/200.000đ/);
      assert.match(source(items,`invoice:${id(45)}`).title,/Chưa thanh toán/);
      assert.equal(source(items,`invoice:${id(45)}`).data.target.tab,'payments');
      assert.equal(source(items,`points:${id(46)}`).data.target.tab,'points');
      await db.query("UPDATE student_certificates SET status='REVOKED',revocation_reason='Actual revocation reason' WHERE id=$1",[id(42)]);
      await db.query("UPDATE student_attendance SET status='ABSENT' WHERE id=$1",[id(43)]);
      items=await inbox();
      assert.match(source(items,`certificate:${id(42)}`).title,/thu hồi/);
      assert.match(source(items,`certificate:${id(42)}`).message,/Actual revocation reason/);
      assert.match(source(items,`attendance:${id(43)}`).title,/Vắng mặt/);
      assert.equal((await inbox(2)).some(item=>item.message.includes('WF-INVOICE')),false);
    });
    await t.test('reminders respect the customer switch, current time and cancellation',async()=>{
      await db.query("INSERT INTO user_settings(user_id,appointment_reminder) VALUES($1,false)",[id(1)]);
      await db.query("UPDATE bookings SET status='CONFIRMED',booking_date=((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')+interval '1 hour')::date,start_time=((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')+interval '1 hour')::time WHERE id=$1",[id(13)]);
      assert.equal((await inbox()).some(item=>item.data?.sourceKey?.startsWith('reminder:')),false);
      await db.query('UPDATE user_settings SET appointment_reminder=true WHERE user_id=$1',[id(1)]);
      const reminder=(await inbox()).find(item=>item.data?.sourceKey?.startsWith('reminder:'));
      assert.ok(reminder); assert.equal(reminder.data.target.entityId,id(13));
      const n=await count(); await inbox(); assert.equal(await count(),n);
    });
  } finally {await close();}
});
