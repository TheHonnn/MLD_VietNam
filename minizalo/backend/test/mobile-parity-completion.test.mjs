import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('sequential learning, enrollment contacts and personal scope follow canonical records',async t=>{
  const f=await workflowFixture(),{db,id,request}=f;
  const course=`/courses/${id(22)}`,enrollmentId=id(29);
  try{
    await t.test('later lessons cannot be read, marked complete, played or tested before prerequisites',async()=>{
      await db.query('UPDATE course_lessons SET lesson_order=CASE id WHEN $1 THEN 1 WHEN $2 THEN 2 ELSE 4 END WHERE chapter_id=$3',[id(24),id(25),id(23)]);
      await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,lesson_order,video_url,duration_minutes) VALUES($1,$2,'Ordered actual video','VIDEO',3,'https://files.test/video.mp4',1)",[id(70),id(23)]);
      const study=()=>request(`${course}/learning?enrollmentId=${enrollmentId}`);
      const before=await study();assert.equal(before.status,200);assert.equal(before.data.course.lessons.find(l=>l.id===id(25)).isLocked,true);assert.equal(before.data.course.lessons.find(l=>l.id===id(25)).contentText,null);
      assert.equal((await request('/documents/'+id(25)+'?enrollmentId='+enrollmentId)).status,403);
      const progress=n=>request(`${course}/lessons/${id(n)}/progress`,{method:'POST',body:{enrollmentId,isCompleted:true}});
      const blocked=await progress(25);assert.equal(blocked.status,403);assert.equal(blocked.code,'LESSON_LOCKED');
      assert.equal((await request(`${course}/lessons/${id(70)}/playback`,{method:'POST',body:{enrollmentId}})).code,'LESSON_LOCKED');
      const quiz=()=>request(`${course}/quiz/start`,{method:'POST',body:{enrollmentId,quizId:id(26)}});
      assert.equal((await quiz()).code,'LESSON_LOCKED');
      assert.equal((await progress(24)).status,200);assert.equal((await request('/documents/'+id(25)+'?enrollmentId='+enrollmentId)).status,200);assert.equal((await progress(25)).status,200);
      const player=await request(`${course}/lessons/${id(70)}/playback`,{method:'POST',body:{enrollmentId}});assert.equal(player.status,200,JSON.stringify(player));
      assert.equal((await quiz()).code,'LESSON_LOCKED');
      for(let position=10;position<=60;position+=10){await db.query("UPDATE miniapp_lesson_playbacks SET last_seen_at=clock_timestamp()-interval '6 seconds' WHERE id=$1",[player.data.playback.id]);const beat=await request(`${course}/lessons/${id(70)}/heartbeat`,{method:'POST',body:{enrollmentId,playbackId:player.data.playback.id,position}});assert.equal(beat.status,200,JSON.stringify(beat));}
      const started=await quiz();assert.equal(started.status,200,JSON.stringify(started));assert.equal(JSON.stringify(started).includes('correctOption'),false);
      const submitted=await request(`${course}/quiz/submit`,{method:'POST',body:{enrollmentId,attemptId:started.data.attempt.id,answers:{[id(27)]:'A',[id(28)]:'B'}}});assert.equal(submitted.status,200,JSON.stringify(submitted));
      assert.equal((await study()).data.course.quizSubmissions[0].questions[0].correctOption,'A');
    });
    await t.test('registration persists actual application details, keeps approval server-owned and rejects invalid branch/contact',async()=>{
      const body={courseId:id(22),studentName:'Actual applicant',studentPhone:'0900000002',studentEmail:'applicant@example.test',studentAddress:'Actual applicant address',branchId:id(3),studentType:'PRO',status:'GRADUATED'};
      assert.equal((await request('/course-enrollments',{owner:2,method:'POST',body:{...body,studentType:'ADMIN'}})).status,400);
      assert.equal((await request('/course-enrollments',{owner:2,method:'POST',body:{...body,branchId:id(999)}})).status,400);
      const saved=await request('/course-enrollments',{owner:2,method:'POST',body});assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(saved.data.enrollment.status,'CONSULTING');assert.equal(saved.data.enrollment.studentName,body.studentName);
      const row=(await db.query('SELECT * FROM course_enrollments WHERE id=$1',[saved.data.enrollment.id])).rows[0];assert.equal(row.student_id,id(2));assert.equal(row.selected_branch,'Workflow branch');assert.equal(row.student_type,'PRO');assert.equal(row.approval_status,'PENDING_APPROVAL');
      assert.equal((await request(`${course}/learning?enrollmentId=${row.id}`,{owner:2})).status,403);
      assert.equal((await db.query('SELECT address FROM users WHERE id=$1',[id(2)])).rows[0].address,body.studentAddress);
    });
    await t.test('an administrator personal appointment list cannot include branch work',async()=>{
      await db.query("UPDATE users SET role='ADMIN' WHERE id=$1",[id(2)]);
      assert.deepEqual((await request('/bookings?scope=personal',{owner:2})).data.bookings,[]);
      assert.ok((await request('/bookings?scope=work',{owner:2})).data.bookings.length>0);
      assert.equal((await request('/bookings?scope=other',{owner:2})).status,400);
      assert.equal((await request('/bookings?scope=work',{owner:1})).data.bookings.every(b=>b.customerId===id(1)),true);
    });
    await t.test('notification type filters paginate within the signed-in account',async()=>{
      for(const [filter,type]of [['booking','BOOKING'],['treatment','TREATMENT'],['academy','COURSE']]){
        const result=await request('/notifications?filter='+filter);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.notifications.every(n=>n.type===type&&n.userId===id(1)),true);
      }
    });
  }finally{await f.close();}
});
