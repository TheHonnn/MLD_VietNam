import { test } from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture,seedCompletedReadings} from './fixtures/workflow.mjs';

test('complete customer workflows persist canonical data with ownership and fail-closed validation', async t => {
  const {db,id,request,close} = await workflowFixture();
  try {
    await t.test('rescheduling uses all booked durations and preserves item prices after catalog changes',async()=>{
      const path=`/bookings/${id(13)}/slots?date=2099-01-12`;
      assert.equal((await request(path,{anonymous:true})).status,401);
      assert.equal((await request(path,{owner:2})).status,404);
      await db.query('UPDATE services SET duration_minutes=5,price=999999 WHERE id=$1',[id(5)]);
      const result=await request(path);
      assert.equal(result.status,200,JSON.stringify(result));
      assert.equal(result.data.slots.length,1);
      assert.equal(result.data.slots[0].endTime,'11:30:00');
      const moved=await request(`/bookings/${id(13)}/reschedule`,{method:'PATCH',body:{date:'2099-01-12',timeSlot:'10:00 - 11:30'}});
      assert.equal(moved.status,200,JSON.stringify(moved));
      assert.equal(moved.data.booking.endTime,'11:30:00');
      assert.equal(Number(moved.data.booking.finalPrice),125000);
      assert.deepEqual(moved.data.booking.items.map(item=>item.durationMinutes).sort((a,b)=>a-b),[30,60]);
      assert.equal((await request(`/bookings/${id(13)}`)).data.booking.bookingDate,'2099-01-12');
      const cancelled=await request(`/bookings/${id(13)}/cancel`,{method:'PATCH',body:{reason:'Customer changed plans'}});
      assert.equal(cancelled.data.booking.status,'CANCELLED');
      assert.equal((await db.query('SELECT status FROM technician_slots WHERE id=$1',[id(17)])).rows[0].status,'AVAILABLE');
      assert.equal((await request(path)).status,409);
    });
    await t.test('unsupported payment or package redemption never creates a misleading ordinary booking',async()=>{
      const before=(await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n;
      for(const body of [{paymentMethod:'BANK_TRANSFER'},{userPackageId:id(10)}]) assert.equal((await request('/bookings',{method:'POST',body})).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,before);
    });
    await t.test('package detail returns owned session counts, service steps, room and signed care journal',async()=>{
      const result=await request('/treatment-plans');
      assert.equal(result.status,200);
      const plan=result.data.treatmentPlans[0];
      assert.equal(plan.totalSessions,4);
      assert.equal(plan.package.totalSessions,5);
      assert.equal(plan.serviceSteps[0].title,'Assessment');
      assert.equal(plan.serviceBenefits[0],'Configured benefit');
      assert.equal(plan.sessions[0].roomName,'Workflow room');
      assert.equal(plan.sessions[0].conditionBefore,'Before condition');
      assert.equal(plan.sessions[0].customerSignatureUrl,'https://example.test/signature.png');
      assert.deepEqual((await request('/treatment-plans',{owner:2})).data.treatmentPlans,[]);
      assert.equal((await request(`/records/${id(12)}`,{owner:2})).status,404);
    });
    await t.test('quiz validates complete answers, persists selections and reloads teacher feedback only for its enrollment',async()=>{
      await seedCompletedReadings(db,id(29));
      const path=`/courses/${id(22)}/quiz/submit`;
      const body={quizId:id(26),enrollmentId:id(29)};
      for(const answers of [{},{[id(27)]:'A',[id(28)]:'Z'},{[id(27)]:'A',[id(28)]:'B',[id(99)]:'A'}]) assert.equal((await request(path,{method:'POST',body:{...body,answers}})).status,400);
      const result=await request(path,{method:'POST',body:{...body,answers:{[id(27)]:0,[id(28)]:1}}});
      assert.equal(result.status,200,JSON.stringify(result));
      assert.equal(Number(result.data.submission.score),10);
      assert.deepEqual(result.data.submission.submittedAnswers,{[id(27)]:'A',[id(28)]:'B'});
      await db.query('UPDATE quiz_submissions SET instructor_feedback=$1 WHERE id=$2',['Actual teacher feedback',result.data.submission.id]);
      const learning=await request(`/courses/${id(22)}/learning?enrollmentId=${id(29)}`);
      assert.equal(learning.data.course.quizSubmissions[0].instructorFeedback,'Actual teacher feedback');
      assert.deepEqual(learning.data.course.quizSubmissions[0].submittedAnswers,{[id(27)]:'A',[id(28)]:'B'});
      assert.equal(learning.data.course.quizSubmissions[0].questions[0].correctOption,'A');
      assert.equal((await request(`/courses/${id(22)}/learning?enrollmentId=${id(32)}`)).data.course.quizSubmissions.length,0);
      assert.equal((await request(`/courses/${id(22)}/learning?enrollmentId=${id(29)}`,{owner:2})).status,403);
    });
    await t.test('practice notes and completion survive reopening without leaking into another class',async()=>{
      const saved=await request(`/courses/${id(22)}/lessons/${id(24)}/progress`,{method:'POST',body:{enrollmentId:id(29),studentNotes:'Saved practice notes',isCompleted:true}});
      assert.equal(saved.status,200,JSON.stringify(saved));
      const lesson=(await request(`/courses/${id(22)}/learning?enrollmentId=${id(29)}`)).data.course.lessons.find(lesson=>lesson.id===id(24));
      assert.equal(lesson.studentNotes,'Saved practice notes');
      assert.equal(lesson.isCompleted,true);
      const other=(await request(`/courses/${id(22)}/learning?enrollmentId=${id(32)}`)).data.course.lessons.find(lesson=>lesson.id===id(24));
      assert.equal(other.isCompleted,false);
      assert.equal(other.studentNotes,null);
    });
    await t.test('surveys reject mistyped clinical data rather than storing false answers',async()=>{
      assert.equal((await request('/consultation-surveys',{method:'POST',body:{hasSensitiveSkin:'yes'}})).status,400);
      const saved=await request('/consultation-surveys',{method:'POST',body:{focusAreas:['Shoulders'],pressurePref:'LIGHT',hasSensitiveSkin:true,hasOilAllergy:false,allergyDetails:'Actual allergy details'}});
      assert.equal(saved.status,201);
      assert.equal((await request('/consultation-surveys')).data.surveys[0].hasSensitiveSkin,true);
      assert.deepEqual((await request('/consultation-surveys',{owner:2})).data.surveys,[]);
    });
  } finally {await close();}
});
