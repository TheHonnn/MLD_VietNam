import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
import jwt from 'jsonwebtoken';
import {createHmac} from 'node:crypto';

test('attendance QR is scoped, signed, time-bound and persists one real enrollment record',async()=>{
  const f=await staffFixture(),{db,id,request}=f;
  try{
    await db.query("INSERT INTO batch_schedules(id,batch_id,session_date,start_time,end_time,topic) VALUES($1,$2,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'00:00','23:59:59','Attendance fixture')",[id(150),id(30)]);
    const issue=()=>request(`/staff/class-schedules/${id(150)}/attendance-code`,{owner:90});
    assert.equal((await request('/staff/class-schedules',{owner:1})).status,403);
    assert.equal((await request(`/staff/class-schedules/${id(150)}/attendance-code`,{owner:91})).status,404);
    const code=await issue();assert.equal(code.status,200,JSON.stringify(code));assert.ok(code.data.content.startsWith('MLD-ATTENDANCE:'));
    const submit=(content=code.data.content,enrollmentId=id(29),owner=1)=>request(`/courses/${id(22)}/attendance`,{owner,method:'POST',body:{content,enrollmentId}});
    assert.equal((await submit('MCN-0926-B08')).status,400);
    assert.equal((await submit(code.data.content+'tampered')).status,400);
    assert.equal((await submit(code.data.content,id(32))).status,403);
    assert.equal((await submit(code.data.content,id(29),2)).status,403);
    const key=createHmac('sha256','isolated-workflow-audit-secret').update('miniapp-class-attendance-v1').digest('hex');
    const expired='MLD-ATTENDANCE:'+jwt.sign({scheduleId:id(150),actorId:id(90)},key,{algorithm:'HS256',audience:'miniapp-attendance',issuer:'mld-miniapp',expiresIn:-1});
    assert.equal((await submit(expired)).status,400);
    const saved=await submit();assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(saved.data.attendance.enrollmentId,id(29));assert.equal(saved.data.attendance.markedById,id(90));
    assert.equal((await submit()).data.attendance.id,saved.data.attendance.id);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM student_attendance WHERE schedule_id=$1',[id(150)])).rows[0].n,1);
    await db.query("UPDATE course_batches SET status='CANCELLED' WHERE id=$1",[id(30)]);
    assert.equal((await issue()).status,404);assert.equal((await submit()).status,403);
    assert.deepEqual((await request('/staff/class-schedules',{owner:90})).data.schedules,[]);
    await db.query("UPDATE course_batches SET status='IN_PROGRESS' WHERE id=$1",[id(30)]);
    await db.query("UPDATE student_attendance SET status='EXCUSED' WHERE schedule_id=$1",[id(150)]);
    assert.equal((await submit()).status,409);
    await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
    assert.equal((await submit()).status,403);
    assert.equal((await issue()).status,403);
    await db.query('UPDATE staff_profiles SET is_active=true WHERE user_id=$1',[id(90)]);
    await db.query("UPDATE batch_schedules SET session_date=session_date+1 WHERE id=$1",[id(150)]);
    assert.equal((await issue()).status,409);
    assert.equal((await submit()).status,409);
  }finally{await f.close();}
});
