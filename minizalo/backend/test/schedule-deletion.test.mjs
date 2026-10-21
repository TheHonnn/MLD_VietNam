import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {statements} from '../migrations/008_schedule_deletion_notifications.mjs';

test('schedule deletion notifies only the affected class and rolls back with the deletion',async()=>{
  const f=await workflowFixture(),{db,id}=f;
  try{
    await db.exec(statements.join(';\n'));
    await db.exec(statements.join(';\n'));
    await db.query('INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES($1,$2,$3,$4,$5)',[id(801),id(2),id(22),id(33),'STUDYING']);
    await db.query("INSERT INTO batch_schedules(id,batch_id,session_date,start_time,end_time,topic) VALUES($1,$2,'2099-01-01','10:00','12:00','Removed class session')",[id(800),id(30)]);
    const deletionEvents=async()=> (await db.query("SELECT user_id,data FROM notifications WHERE data->>'sourceKey' LIKE 'deleted-schedule:%'")).rows;
    await assert.rejects(db.transaction(async tx=>{
      await tx.query('DELETE FROM batch_schedules WHERE id=$1',[id(800)]);
      throw Error('Fixture rollback');
    }),/Fixture rollback/);
    assert.equal((await deletionEvents()).length,0);
    assert.equal((await db.query('SELECT id FROM batch_schedules WHERE id=$1',[id(800)])).rows.length,1);
    await db.query('DELETE FROM batch_schedules WHERE id=$1',[id(800)]);
    const events=await deletionEvents();assert.equal(events.length,1);
    assert.equal(events[0].user_id,id(1));
    assert.deepEqual(events[0].data.target,{screen:'academy',courseId:id(22),enrollmentId:id(29),tab:'schedule'});
    await f.request('/notifications');await f.request('/notifications');
    assert.equal((await deletionEvents()).length,1);
    const learning=await f.request(`/courses/${id(22)}/learning?enrollmentId=${id(29)}`);
    assert.equal(learning.status,200);assert.deepEqual(learning.data.course.schedules,[]);
    const roles=await db.query("SELECT EXISTS(SELECT 1 FROM information_schema.routine_privileges WHERE routine_name='miniapp_schedule_deleted' AND grantee='PUBLIC' AND privilege_type='EXECUTE') AS allowed");
    assert.equal(roles.rows[0].allowed,false);
  }finally{await f.close();}
});
