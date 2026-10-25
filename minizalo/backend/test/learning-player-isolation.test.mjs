import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('a new learning player replaces only that student across enrollments',async()=>{
  const f=await workflowFixture(),{db,id}=f;
  try{
    await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,video_url,duration_minutes) VALUES($1,$2,'Isolated video','VIDEO','https://example.test/video.mp4',1)",[id(70),id(23)]);
    await db.query("INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES($1,$2,$3,$4,'STUDYING')",[id(71),id(2),id(22),id(30)]);
    const start=async(owner,enrollmentId)=>{
      const result=await f.request(`/courses/${id(22)}/lessons/${id(70)}/playback`,{method:'POST',owner,body:{enrollmentId}});
      assert.equal(result.status,200,JSON.stringify(result));return result.data.playback.id;
    };
    const active=async playbackId=>(await db.query('SELECT expires_at>clock_timestamp() AS active FROM miniapp_lesson_playbacks WHERE id=$1',[playbackId])).rows[0].active;
    const first=await start(1,id(29)),otherStudent=await start(2,id(71));
    assert.equal(await active(first),true);
    const replacement=await start(1,id(32));
    assert.equal(await active(first),false);assert.equal(await active(replacement),true);assert.equal(await active(otherStudent),true);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_lesson_playbacks')).rows[0].n,3);
  }finally{await f.close();}
});
