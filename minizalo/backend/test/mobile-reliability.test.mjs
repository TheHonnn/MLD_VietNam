import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {migrateFixture} from './fixtures/migrations.mjs';

test('mobile reliability regressions use an isolated database only',async t=>{
  const {db,id,request,close}=await workflowFixture();
  const course=`/courses/${id(22)}`;
  const scope={enrollmentId:id(29),quizId:id(26)};
  const answers={[id(27)]:'A',[id(28)]:'B'};
  const booking={serviceId:id(5),branchId:id(3),date:'2099-01-12',timeSlot:'10:00 - 11:00',expectedFinalPrice:100000};
  const row=async(sql,values=[])=>(await db.query(sql,values)).rows[0];
  try {
    await t.test('migration is repeatable and never removes business records',async()=>{
      const before=await row('SELECT (SELECT count(*) FROM bookings)::int AS bookings,(SELECT count(*) FROM users)::int AS users,(SELECT count(*) FROM notifications)::int AS notifications');
      await migrateFixture(db);
      assert.deepEqual(await row('SELECT (SELECT count(*) FROM bookings)::int AS bookings,(SELECT count(*) FROM users)::int AS users,(SELECT count(*) FROM notifications)::int AS notifications'),before);
    });
    await t.test('hours and changed prices are checked before any reservation is written',async()=>{
      await db.query("UPDATE branches SET opening_time='08:30',closing_time='18:00' WHERE id=$1",[id(3)]);
      const slots=await request(`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-01-12`);
      assert.equal(slots.status,200,JSON.stringify(slots));
      assert.equal(slots.data.slots.some(slot=>slot.startTime==='08:00:00'),false);
      assert.equal((await request('/bookings',{method:'POST',body:{...booking,timeSlot:'08:00 - 09:00'}})).status,409);
      await db.query('UPDATE services SET price=200000 WHERE id=$1',[id(5)]);
      const stale=await request('/bookings',{method:'POST',body:booking});
      assert.equal(stale.status,409);assert.equal(stale.code,'PRICE_CHANGED');assert.equal(stale.pricing.finalPrice,200000);
      assert.equal((await row('SELECT status FROM technician_slots WHERE id=$1',[id(17)])).status,'AVAILABLE');
      const saved=await request('/bookings',{method:'POST',body:{...booking,expectedFinalPrice:200000}});
      assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(Number(saved.data.booking.finalPrice),200000);
      assert.equal((await request(`/bookings/${saved.data.booking.id}/cancel`,{method:'PATCH',body:{}})).status,200);
      await db.query('UPDATE services SET price=100000 WHERE id=$1',[id(5)]);
    });
    await t.test('past confirmed bookings cannot be cancelled or rescheduled',async()=>{
      await db.query("UPDATE bookings SET status='CONFIRMED' WHERE id=$1",[id(11)]);
      for(const action of ['cancel','reschedule']) assert.equal((await request(`/bookings/${id(11)}/${action}`,{method:'PATCH',body:booking})).status,409);
      assert.equal((await row('SELECT status FROM bookings WHERE id=$1',[id(11)])).status,'CONFIRMED');
    });
    await t.test('quiz completion is server verified, draft resumes, a passing quiz completes its linked lesson',async()=>{
      assert.equal((await request(`${course}/lessons/${id(31)}/progress`,{method:'POST',body:{enrollmentId:id(29),isCompleted:true}})).status,400);
      const start=await request(`${course}/quiz/start`,{method:'POST',body:scope});
      assert.equal(start.status,200,JSON.stringify(start));
      assert.equal(JSON.stringify(start).includes('correctOption'),false);
      const attemptId=start.data.attempt.id;
      assert.equal((await request(`${course}/quiz/draft`,{method:'PUT',body:{...scope,attemptId,answers:{[id(27)]:'A'}}})).status,200);
      const resumed=await request(`${course}/quiz/start`,{method:'POST',body:scope});
      assert.equal(resumed.data.attempt.id,attemptId);assert.deepEqual(resumed.data.attempt.draftAnswers,{[id(27)]:'A'});
      for(const lesson of [24,25]) assert.equal((await request(`${course}/lessons/${id(lesson)}/progress`,{method:'POST',body:{enrollmentId:id(29),isCompleted:true}})).status,200);
      // An admin question edit must not change the grading of an active attempt.
      await db.query("UPDATE quiz_questions SET correct_option='B' WHERE id=$1",[id(27)]);
      const submitted=await request(`${course}/quiz/submit`,{method:'POST',body:{...scope,attemptId,answers}});
      assert.equal(submitted.status,200,JSON.stringify(submitted));assert.equal(submitted.data.isPassed,true);
      const again=await request(`${course}/quiz/submit`,{method:'POST',body:{...scope,attemptId,answers}});
      assert.equal(again.data.submission.id,submitted.data.submission.id);
      assert.equal(Number((await row('SELECT progress_percent FROM course_enrollments WHERE id=$1',[id(29)])).progress_percent),100);
      const learning=await request(`${course}/learning?enrollmentId=${id(29)}`);
      assert.equal(learning.data.course.lessons.find(l=>l.id===id(31)).isCompleted,true);
      assert.equal(learning.data.course.quizSubmissions[0].questions[0].questionText,'First question');
      assert.equal(JSON.stringify(learning).includes('correctOption'),false);
      assert.equal((await row('SELECT count(*)::int AS n FROM student_certificates')).n,0);
      assert.equal((await request(`${course}/quiz/start`,{method:'POST',body:scope,owner:2})).status,403);
    });
    await t.test('attempt deadlines and three-attempt limit survive reconnecting',async()=>{
      const body={...scope,enrollmentId:id(32)};
      for(let i=0;i<3;i++){
        const started=await request(`${course}/quiz/start`,{method:'POST',body});
        assert.equal(started.status,200,JSON.stringify(started));
        await db.query("UPDATE miniapp_quiz_attempts SET started_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour' WHERE id=$1",[started.data.attempt.id]);
        const expired=await request(`${course}/quiz/submit`,{method:'POST',body:{...body,attemptId:started.data.attempt.id,answers}});
        assert.equal(expired.status,409);assert.equal(expired.code,'ATTEMPT_EXPIRED');
      }
      const exhausted=await request(`${course}/quiz/start`,{method:'POST',body});
      assert.equal(exhausted.status,409);assert.equal(exhausted.code,'ATTEMPTS_EXHAUSTED');
    });
    await t.test('fabricated video seconds and seeks grant no completion; real elapsed segments are credited once',async()=>{
      await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,video_url,duration_minutes) VALUES($1,$2,'Actual video','VIDEO','https://example.test/video.mp4',1)",[id(70),id(23)]);
      assert.equal((await request(`${course}/lessons/${id(70)}/progress`,{method:'POST',body:{enrollmentId:id(29),isCompleted:true,watchedSeconds:99999}})).status,400);
      const started=await request(`${course}/lessons/${id(70)}/playback`,{method:'POST',body:{enrollmentId:id(29)}});
      assert.equal(started.status,200,JSON.stringify(started));
      const heartbeat=`${course}/lessons/${id(70)}/heartbeat`;
      const body={enrollmentId:id(29),playbackId:started.data.playback.id};
      assert.equal((await request(heartbeat,{method:'POST',owner:2,body:{...body,position:10}})).status,403);
      const beat=async position=>{
        await db.query("UPDATE miniapp_lesson_playbacks SET last_seen_at=clock_timestamp()-interval '6 seconds' WHERE id=$1",[body.playbackId]);
        const result=await request(heartbeat,{method:'POST',body:{...body,position}});
        assert.equal(result.status,200,JSON.stringify(result));return result.data.progress;
      };
      assert.equal((await beat(60)).isCompleted,false);
      await beat(0);
      for(let position=10;position<=60;position+=10)await beat(position);
      assert.equal((await beat(60)).watchedSeconds,60);
      await beat(0);assert.equal((await beat(10)).watchedSeconds,60);
      assert.equal((await row('SELECT is_completed FROM user_lesson_progress WHERE enrollment_id=$1 AND lesson_id=$2',[id(29),id(70)])).is_completed,true);
      const replacement=await request(`${course}/lessons/${id(70)}/playback`,{method:'POST',body:{enrollmentId:id(29)}});
      assert.equal(replacement.status,200,JSON.stringify(replacement));assert.notEqual(replacement.data.playback.id,body.playbackId);
      const old=await request(heartbeat,{method:'POST',body:{...body,position:20}});
      assert.equal(old.status,409);assert.equal(old.code,'VIDEO_SESSION_EXPIRED');
      assert.equal((await row('SELECT watched_seconds FROM user_lesson_progress WHERE enrollment_id=$1 AND lesson_id=$2',[id(29),id(70)])).watched_seconds,60);
      const invalid=await request(`${course}/lessons/${id(999)}/playback`,{method:'POST',body:{enrollmentId:id(29)}});
      assert.equal(invalid.status,409);
      assert.equal((await row('SELECT expires_at>clock_timestamp() AS active FROM miniapp_lesson_playbacks WHERE id=$1',[replacement.data.playback.id])).active,true);
    });
    await t.test('package reservations charge zero, release on cancellation and consume only an actual journal',async()=>{
      await db.query('UPDATE user_packages SET total_sessions=2 WHERE id=$1',[id(10)]);
      const body={...booking,userPackageId:id(10),expectedFinalPrice:0};
      assert.equal((await request('/bookings',{method:'POST',owner:2,body})).status,404);
      assert.equal((await request('/bookings',{method:'POST',body:{...body,serviceId:id(6)}})).status,400);
      let saved=await request('/bookings',{method:'POST',body});
      assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(Number(saved.data.booking.finalPrice),0);
      assert.equal(saved.data.booking.userPackageId,id(10));
      assert.equal((await row('SELECT completed_sessions FROM user_packages WHERE id=$1',[id(10)])).completed_sessions,1);
      assert.equal((await request('/bookings',{method:'POST',body})).status,409);
      // An unrelated journal must not spend the last already-reserved session.
      await assert.rejects(db.query("INSERT INTO treatment_journal(user_package_id,customer_id,session_number,session_date) VALUES($1,$2,2,'2099-01-12')",[id(10),id(1)]));
      assert.equal((await request(`/bookings/${saved.data.booking.id}/cancel`,{method:'PATCH',body:{}})).status,200);
      assert.equal((await row('SELECT state FROM miniapp_booking_packages WHERE booking_id=$1',[saved.data.booking.id])).state,'RELEASED');
      saved=await request('/bookings',{method:'POST',body});assert.equal(saved.status,201,JSON.stringify(saved));
      const journal=await row("INSERT INTO treatment_journal(user_package_id,customer_id,booking_id,session_number,session_date) VALUES($1,$2,$3,2,'2099-01-12') RETURNING id",[id(10),id(1),saved.data.booking.id]);
      assert.equal((await row('SELECT state FROM miniapp_booking_packages WHERE booking_id=$1',[saved.data.booking.id])).state,'CONSUMED');
      await db.query('UPDATE user_packages SET completed_sessions=(SELECT count(*) FROM treatment_journal WHERE user_package_id=$1) WHERE id=$1',[id(10)]);
      assert.equal((await row('SELECT completed_sessions FROM user_packages WHERE id=$1',[id(10)])).completed_sessions,2);
      await assert.rejects(db.query("INSERT INTO treatment_journal(user_package_id,customer_id,booking_id,session_number,session_date) VALUES($1,$2,$3,3,'2099-01-12')",[id(10),id(1),saved.data.booking.id]));
      await db.query('UPDATE treatment_journal SET treatment_notes=$1 WHERE id=$2',['Corrected actual note',journal.id]);
      assert.equal((await row('SELECT completed_sessions FROM user_packages WHERE id=$1',[id(10)])).completed_sessions,2);
      assert.equal((await row('SELECT count(*)::int AS n FROM invoices')).n,0);
    });
    await t.test('expired packages are reported consistently without altering stored records',async()=>{
      await db.query("UPDATE user_packages SET status='ACTIVE',total_sessions=4,expires_at='2020-01-01' WHERE id=$1",[id(10)]);
      const result=await request('/treatment-plans');
      assert.equal(result.data.treatmentPlans[0].status,'EXPIRED');
      assert.equal((await row('SELECT status FROM user_packages WHERE id=$1',[id(10)])).status,'ACTIVE');
      assert.equal((await request('/bookings',{method:'POST',body:{...booking,userPackageId:id(10),expectedFinalPrice:0}})).status,409);
    });
    await t.test('legacy session counts survive a canonical admin journal recount',async()=>{
      await db.query("INSERT INTO user_packages(id,customer_id,package_id,total_sessions,completed_sessions,expires_at) VALUES($1,$2,$3,3,2,'2099-12-31')",[id(71),id(1),id(9)]);
      await db.query("INSERT INTO treatment_journal(user_package_id,customer_id,session_number,session_date) VALUES($1,$2,2,'2020-01-01')",[id(71),id(1)]);
      await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time,status) VALUES($1,$2,'2099-01-13','10:00','11:00','AVAILABLE')",[id(7),id(3)]);
      const saved=await request('/bookings',{method:'POST',body:{...booking,date:'2099-01-13',userPackageId:id(71),expectedFinalPrice:0}});
      assert.equal(saved.status,201,JSON.stringify(saved));
      await db.query("INSERT INTO treatment_journal(user_package_id,customer_id,booking_id,session_number,session_date) VALUES($1,$2,$3,3,'2099-01-13')",[id(71),id(1),saved.data.booking.id]);
      await db.query('UPDATE user_packages SET completed_sessions=(SELECT count(*) FROM treatment_journal WHERE user_package_id=$1) WHERE id=$1',[id(71)]);
      assert.equal((await row('SELECT completed_sessions FROM user_packages WHERE id=$1',[id(71)])).completed_sessions,3);
    });
    await t.test('restricted admin writers can fire triggers without accessing private tables or forging events',async()=>{
      const before=(await row('SELECT count(*)::int AS n FROM notifications')).n;
      await db.exec('CREATE ROLE miniapp_restricted_writer; GRANT USAGE ON SCHEMA public TO miniapp_restricted_writer; GRANT SELECT,UPDATE ON bookings TO miniapp_restricted_writer; SET ROLE miniapp_restricted_writer;');
      try{
        await db.query('UPDATE bookings SET special_notes=$1 WHERE id=$2',['Real restricted-admin update',id(13)]);
        await assert.rejects(db.query('SELECT * FROM miniapp_quiz_attempts'));
        await assert.rejects(db.query("SELECT miniapp_emit_notification($1,'Forged event','','SYSTEM','{}','forged')",[id(1)]));
        await db.exec('CREATE TEMP TABLE attacker_events(customer_id uuid,id uuid,status text);');
        await assert.rejects(db.exec('CREATE TRIGGER attacker_event AFTER INSERT ON attacker_events FOR EACH ROW EXECUTE FUNCTION public.miniapp_capture_event();'));
      }finally{await db.exec('RESET ROLE');}
      assert.equal((await row('SELECT count(*)::int AS n FROM notifications')).n,before+1);
    });
    await t.test('offline A-B-A transitions persist immediately and unchanged polls do not duplicate them',async()=>{
      await request('/notifications');
      const before=(await row('SELECT count(*)::int AS n FROM notifications')).n;
      await db.query("UPDATE bookings SET status='IN_SERVICE' WHERE id=$1",[id(13)]);
      await db.query("UPDATE bookings SET status='CONFIRMED' WHERE id=$1",[id(13)]);
      assert.equal((await row('SELECT count(*)::int AS n FROM notifications')).n,before+2);
      await request('/notifications');await request('/notifications');
      assert.equal((await row('SELECT count(*)::int AS n FROM notifications')).n,before+2);
    });
    await t.test('pagination has no gaps or duplicate IDs and badge counts all visible unread events',async()=>{
      await db.query("INSERT INTO notifications(user_id,title,message,type,data,created_at) SELECT $1,'Actual event '||n,'Persisted event','SYSTEM',jsonb_build_object('channel','activity','eventSequence',nextval('miniapp_notification_sequence')),TIMESTAMPTZ '2099-01-01' FROM generate_series(1,125) n",[id(1)]);
      const first=await request('/notifications');
      assert.equal(first.data.notifications.length,50);assert.ok(first.data.nextCursor);
      assert.ok(first.data.unreadCount>=125);
      const ids=[],counts=[];let page=first;
      do{
        ids.push(...page.data.notifications.map(item=>item.id));counts.push(page.data.totalCount);
        if(!page.data.nextCursor)break;
        page=await request(`/notifications?cursor=${encodeURIComponent(page.data.nextCursor)}`);
        assert.equal(page.status,200,JSON.stringify(page));
      }while(true);
      assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,first.data.totalCount);
      assert.ok(counts.every(n=>n===first.data.totalCount));
      const bad=Buffer.from(JSON.stringify({time:'2099-01-01T00:00:00.000000Z',sequence:'9999999999999999999',id:id(1)})).toString('base64url');
      assert.equal((await request(`/notifications?cursor=${bad}`)).status,400);
      assert.deepEqual((await request('/notifications',{owner:2})).data.notifications,[]);
      const read=await request('/notifications/read-all',{method:'PATCH'});
      assert.equal(read.data.unreadCount,0);
      await db.query("INSERT INTO notifications(user_id,title,message,type,data) VALUES($1,'System event','Actual system event','SYSTEM','{\"channel\":\"system\"}')",[id(1)]);
      await request('/auth/settings',{method:'PUT',body:{systemNotify:false,promotionNotify:false}});
      const filtered=await request('/notifications');assert.equal(filtered.data.unreadCount,0);
      assert.equal(filtered.data.notifications.some(item=>item.data?.channel==='system'),false);
    });
  }finally{await close();}
});
