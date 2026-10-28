import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture,seedCompletedReadings} from './fixtures/workflow.mjs';
import {configureWorkflows} from '../dist/configure-workflows.js';
import {runReminderBatch} from '../dist/reminders.js';

test('customer workflow regressions and operator configuration',async t=>{
  const f=await workflowFixture(),{db,id,request,headers,base}=f;
  const query=async(sql,values=[])=>(await db.query(sql,values)).rows;
  const store={query:q=>query(q.text,q.values)};
  const body={serviceId:id(5),branchId:id(3),date:'2099-01-12',timeSlot:'10:00 - 11:00',expectedFinalPrice:100000};
  try{
    await t.test('auto assignment skips an occupied first technician and enforces actual service permissions',async()=>{
      await query("UPDATE bookings SET booking_date='2099-01-12' WHERE id=$1",[id(13)]);
      await query("INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES($1,$2,'Qualified second technician','')",[id(80),id(3)]);
      await query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time,status) VALUES($1,$2,'2099-01-12','10:00','12:00','AVAILABLE')",[id(80),id(3)]);
      assert.deepEqual((await request(`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-01-12`)).data.slots,[]);
      await configureWorkflows(store,{technicianServices:[{technicianId:id(80),serviceId:id(5)}]},true);
      const slots=await request(`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-01-12`);
      assert.equal(slots.data.slots.length,1);assert.equal(slots.data.slots[0].technicianId,id(80));
      assert.equal((await request('/bookings',{method:'POST',body:{...body,serviceId:id(6),expectedFinalPrice:50000,doctorId:id(80)}})).status,409);
      const saved=await request('/bookings',{method:'POST',body});
      assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(saved.data.booking.technicianId,id(80));
      await request(`/bookings/${saved.data.booking.id}/cancel`,{method:'PATCH',body:{}});
      await query("UPDATE bookings SET booking_date='2099-01-10' WHERE id=$1",[id(13)]);
    });
    await t.test('lost-response retries return the same booking and reject changed input under the same key',async()=>{
      const send=async(payload,owner=1)=>{
        const response=await fetch(base+'/api/bookings',{method:'POST',headers:{...headers(owner),'Idempotency-Key':id(90)},body:JSON.stringify(payload)});
        return {status:response.status,...await response.json()};
      };
      const before=(await query('SELECT count(*)::int AS n FROM bookings'))[0].n;
      const original=await send(body),replay=await send(Object.fromEntries(Object.entries(body).reverse()));
      assert.equal(original.status,201,JSON.stringify(original));assert.equal(replay.data.booking.id,original.data.booking.id);
      assert.equal((await query('SELECT count(*)::int AS n FROM bookings'))[0].n,before+1);
      assert.equal((await send({...body,notes:'Changed request'})).status,409);
      const other=await send({...body,doctorId:id(80)},2);
      assert.equal(other.status,201,JSON.stringify(other));assert.notEqual(other.data.booking.id,original.data.booking.id);
      await request(`/bookings/${original.data.booking.id}/cancel`,{method:'PATCH',body:{}});
    });
    await t.test('an admin regrade immediately reconciles quiz completion and enrollment progress',async()=>{
      const course=`/courses/${id(22)}`;
      for(const n of [24,25])await request(`${course}/lessons/${id(n)}/progress`,{method:'POST',body:{enrollmentId:id(29),isCompleted:true}});
      const submitted=await request(`${course}/quiz/submit`,{method:'POST',body:{enrollmentId:id(29),quizId:id(26),answers:{[id(27)]:'A',[id(28)]:'B'}}});
      await query('UPDATE quiz_submissions SET passed=false,score=0 WHERE id=$1',[submitted.data.submission.id]);
      const learning=await request(`${course}/learning?enrollmentId=${id(29)}`);
      assert.equal(learning.data.course.lessons.find(l=>l.id===id(31)).isCompleted,false);
      assert.equal(Number((await query('SELECT progress_percent FROM course_enrollments WHERE id=$1',[id(29)]))[0].progress_percent),66);
      await query('UPDATE quiz_submissions SET passed=true,score=10 WHERE id=$1',[submitted.data.submission.id]);
      assert.equal(Number((await query('SELECT progress_percent FROM course_enrollments WHERE id=$1',[id(29)]))[0].progress_percent),100);
    });
    await t.test('resuming uses the original grading threshold and authoritative server time',async()=>{
      await seedCompletedReadings(db,id(32));
      const path=`/courses/${id(22)}/quiz/start`,input={quizId:id(26),enrollmentId:id(32)};
      const first=await request(path,{method:'POST',body:input});
      await query('UPDATE course_quizzes SET passing_score=10 WHERE id=$1',[id(26)]);
      const resumed=await request(path,{method:'POST',body:input});
      assert.equal(resumed.data.attempt.id,first.data.attempt.id);assert.equal(Number(resumed.data.quiz.passingScore),7);
      assert.ok(Number.isFinite(Date.parse(resumed.data.serverNow)));
      assert.ok(Date.parse(resumed.data.attempt.expiresAt)>Date.parse(resumed.data.serverNow));
    });
    await t.test('favorites persist per owner, accept explicit state and never trust supplied user IDs',async()=>{
      const path=`/services/${id(5)}/favorite`;
      assert.equal((await request(path,{anonymous:true})).status,401);
      assert.equal((await request(path)).data.isFavorite,false);
      assert.equal((await request(path,{method:'PUT',body:{isFavorite:true,userId:id(2)}})).data.isFavorite,true);
      assert.equal((await request(path)).data.isFavorite,true);
      assert.equal((await request(path,{owner:2})).data.isFavorite,false);
      assert.equal((await request(path,{method:'PUT',body:{isFavorite:'true'}})).status,400);
      assert.equal((await request(path,{method:'PUT',body:{isFavorite:false}})).data.isFavorite,false);
      assert.equal((await query('SELECT count(*)::int AS n FROM miniapp_favorite_services'))[0].n,1);
    });
    await t.test('operator configuration validates course ownership and grants retries without erasing attempts',async()=>{
      const config={lessonQuizzes:[{lessonId:id(31),quizId:id(26)}],quizLimits:[{enrollmentId:id(32),quizId:id(26),maxAttempts:4,reason:'Approved additional attempt'}]};
      const before=(await query('SELECT count(*)::int AS n FROM miniapp_quiz_attempts'))[0].n;
      const dry=await configureWorkflows(store,config,false);assert.equal(dry.applied,false);
      assert.equal((await query('SELECT count(*)::int AS n FROM miniapp_quiz_limits'))[0].n,0);
      await configureWorkflows(store,config,true);
      await assert.rejects(configureWorkflows(store,{lessonQuizzes:[{lessonId:id(24),quizId:id(26)}]},true));
      await assert.rejects(configureWorkflows(store,{quizLimits:[{enrollmentId:id(32),quizId:id(26),maxAttempts:999,reason:''}]},true));
      const resumed=await request(`/courses/${id(22)}/quiz/start`,{method:'POST',body:{quizId:id(26),enrollmentId:id(32)}});
      assert.equal(resumed.data.attempt.maxAttempts,4);
      assert.equal((await query('SELECT count(*)::int AS n FROM miniapp_quiz_attempts'))[0].n,before);
    });
    await t.test('background reminders persist without the customer opening the inbox and do not repeat',async()=>{
      await query("UPDATE bookings SET booking_date=((clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')+interval '1 hour')::date,start_time=((clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')+interval '1 hour')::time WHERE id=$1",[id(13)]);
      const run=()=>runReminderBatch({query:store.query,transaction:fn=>db.transaction(tx=>fn({query:async q=>(await tx.query(q.text,q.values)).rows}))});
      await run();const count=await query("SELECT count(*)::int AS n FROM notifications WHERE data->>'channel'='reminder'");
      assert.equal(count[0].n,1);await run();assert.equal((await query("SELECT count(*)::int AS n FROM notifications WHERE data->>'channel'='reminder'"))[0].n,1);
    });
  }finally{await f.close();}
});
