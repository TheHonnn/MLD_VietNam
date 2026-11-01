import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
test('instructor feedback is scoped to assigned courses, preserves exam scores and rejects stale edits',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    await db.query(`INSERT INTO quiz_submissions(id,quiz_id,enrollment_id,submitted_answers,score,correct_count,passed) VALUES($1,$2,$3,'{}',8,2,true)`,[id(800),id(26),id(29)]);
    const path='/staff/academy/submissions';
    assert.equal((await f.request(path)).status,403);assert.equal((await f.request(path,{owner:90})).status,403);
    await db.query(`UPDATE users SET role='INSTRUCTOR' WHERE id=$1`,[id(90)]);
    assert.equal((await f.request(path,{owner:90})).data.submissions.length,0);
    await db.query(`UPDATE instructors SET user_id=$1 WHERE id=$2`,[id(90),id(21)]);
    assert.equal((await f.request(path,{owner:90})).data.submissions[0].studentName,'Workflow customer');
    const save=await f.request(path+'/'+id(800),{owner:90,method:'PATCH',body:{feedback:'Nhận xét thật từ giảng viên',expectedFeedback:null,score:0,passed:false}});
    assert.equal(save.status,200);assert.equal(Number(save.data.submission.score),8);assert.equal(save.data.submission.passed,true);
    assert.equal((await f.request(path+'/'+id(800),{owner:90,method:'PATCH',body:{feedback:'Ghi đè cũ',expectedFeedback:null}})).status,409);
    await db.query(`UPDATE users SET role='BRANCH_MANAGER' WHERE id=$1`,[id(91)]);
    assert.equal((await f.request(path,{owner:91})).data.submissions.length,0);
    assert.equal((await f.request(path+'/'+id(800),{owner:91,method:'PATCH',body:{feedback:'Other branch',expectedFeedback:'Nhận xét thật từ giảng viên'}})).status,404);
    assert.equal((await db.query(`SELECT instructor_feedback FROM quiz_submissions WHERE id=$1`,[id(800)])).rows[0].instructor_feedback,'Nhận xét thật từ giảng viên');
  }finally{await f.close();}
});
