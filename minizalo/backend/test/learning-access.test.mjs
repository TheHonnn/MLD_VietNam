import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Prisma} from '@prisma/client';
import {workflowFixture} from './fixtures/workflow.mjs';
import {configureWorkflows} from '../dist/configure-workflows.js';

test('course access follows explicit operator dates and never fabricates an expiry or certificate',async t=>{
  const f=await workflowFixture(),{db,id}=f;
  const store={query:async q=>(await db.query(q.text,q.values.map(value=>Prisma.Decimal.isDecimal(value)?value.toString():value))).rows};
  const configure=async(expiresAt,isSuspended=false)=>configureWorkflows(store,{courseAccess:[{enrollmentId:id(29),expiresAt,isSuspended,reason:'Actual fixture access decision'}]},true);
  try{
    await t.test('existing enrollments retain access until an explicit policy is configured',async()=>{
      const result=await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29));
      assert.equal(result.status,200);assert.equal(result.data.course.accessExpiresAt,null);
      const dry=await configureWorkflows(store,{courseAccess:[{enrollmentId:id(29),expiresAt:'2020-01-01T00:00:00.000Z',reason:'Dry run'}]});
      assert.equal(dry.applied,false);assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_course_access')).rows[0].total,0);
    });
    await t.test('expiry denies lesson media, progress, quizzes and existing playback requests',async()=>{
      await configure('2020-01-01T00:00:00.000Z');
      const paths=[
        ['/courses/'+id(22)+'/learning?enrollmentId='+id(29),'GET'],
        ['/courses/'+id(22)+'/lessons/'+id(24)+'/progress','POST'],
        ['/courses/'+id(22)+'/lessons/'+id(24)+'/playback','POST'],
        ['/courses/'+id(22)+'/lessons/'+id(24)+'/heartbeat','POST'],
        ['/courses/'+id(22)+'/quiz/start','POST']
      ];
      for(const [path,method] of paths){
        const result=await f.request(path,{method,...(method==='POST'?{body:{enrollmentId:id(29),quizId:id(26),playbackId:id(999),position:0}}:{})});
        assert.equal(result.status,403,JSON.stringify(result));assert.equal(result.code,'COURSE_ACCESS_EXPIRED');
      }
      assert.equal((await db.query('SELECT count(*)::int AS total FROM quiz_submissions')).rows[0].total,0);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM user_lesson_progress')).rows[0].total,0);
      const entries=await f.request('/course-enrollments');
      assert.equal(entries.data.enrollments.find(entry=>entry.id===id(29)).accessExpired,true);
      assert.equal(entries.data.enrollments.find(entry=>entry.id===id(32)).accessExpired,false);
    });
    await t.test('a real extension restores access; suspension still overrides a future expiry',async()=>{
      await configure('2099-01-01T00:00:00.000Z');
      assert.equal((await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29))).status,200);
      await configure('2099-01-01T00:00:00.000Z',true);
      assert.equal((await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29))).status,403);
      await configure(null,false);
    });
    await t.test('issued certificates read the real student birth date and never cross owners',async()=>{
      await db.query("UPDATE users SET date_of_birth='1998-05-15' WHERE id=$1",[id(1)]);
      await db.query("INSERT INTO student_certificates(enrollment_id,student_id,course_id,certificate_code,qr_verification_code,student_name,course_title,issue_date,theory_score,practical_score) VALUES($1,$2,$3,'ACTUAL-FIXTURE-CERT','ACTUAL-FIXTURE-VERIFY','Workflow customer','Workflow course','2026-10-23',8,9)",[id(29),id(1),id(22)]);
      const result=await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29));
      assert.equal(result.data.course.certificate.studentDateOfBirth,'1998-05-15');
      assert.equal(result.data.course.certificate.issueDate.slice(0,10),'2026-10-23');
      assert.equal((await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29),{owner:2})).status,403);
    });
  }finally{await f.close();}
});
