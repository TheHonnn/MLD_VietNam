import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Prisma} from '@prisma/client';
import {workflowFixture} from './fixtures/workflow.mjs';
import {lessonMediaSource} from '../dist/lesson-media.js';
import {configureWorkflows} from '../dist/configure-workflows.js';
import {statements} from '../migrations/015_lesson_media_policy.mjs';

test('YouTube sources use exact HTTPS hosts and valid video identifiers',()=>{
  for(const url of ['https://www.youtube.com/watch?v=abcdefghijk','https://youtu.be/abcdefghijk?t=10','https://www.youtube-nocookie.com/embed/abcdefghijk','https://m.youtube.com/shorts/abcdefghijk'])assert.deepEqual(lessonMediaSource(url),{valid:true,youtube:true,id:'abcdefghijk'});
  for(const url of ['https://www.youtube.com/watch?v=bad','https://youtu.be/abcdefghijk/extra','https://youtube.com:444/embed/abcdefghijk'])assert.equal(lessonMediaSource(url).valid,false);
  for(const url of ['javascript:alert(1)','http://youtube.com/watch?v=abcdefghijk','https://user:secret@youtube.com/watch?v=abcdefghijk'])assert.equal(lessonMediaSource(url).valid,false);
  assert.equal(lessonMediaSource('https://youtube.com.evil.test/embed/abcdefghijk').youtube,false);
});

test('public embedding requires a real decision bound to the actual lesson media',async t=>{
  const f=await workflowFixture(),{db,id}=f;
  const store={query:async q=>(await db.query(q.text,q.values.map(v=>Prisma.Decimal.isDecimal(v)?v.toString():v))).rows};
  const course='/courses/'+id(22),lesson=course+'/lessons/'+id(70);
  const config=allowed=>({lessonMedia:[{lessonId:id(70),allowPublicEmbed:allowed,reason:'Actual content-owner decision in isolated test'}]});
  let playbackId;
  try{
    await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,video_url,duration_minutes) VALUES($1,$2,'Configured YouTube lesson','VIDEO','https://www.youtube.com/watch?v=abcdefghijk',1)",[id(70),id(23)]);
    await db.query("UPDATE course_lessons SET lesson_order=-1 WHERE lesson_type='VIDEO'");
    await t.test('unapproved protected lessons expose neither a YouTube ID nor raw video URL',async()=>{
      const learning=await f.request(course+'/learning?enrollmentId='+id(29));assert.equal(learning.status,200,JSON.stringify(learning));
      const item=learning.data.course.lessons.find(l=>l.id===id(70));assert.equal(item.videoUrl,null);assert.equal(item.youtubeVideoId,null);assert.equal(item.mediaErrorCode,'YOUTUBE_NOT_APPROVED');
      assert.equal(Object.hasOwn(item,'allowPublicEmbed'),false);assert.equal(Object.hasOwn(item,'policyMediaUrl'),false);
      const blocked=await f.request(lesson+'/playback',{method:'POST',body:{enrollmentId:id(29)}});assert.equal(blocked.status,403);assert.equal(blocked.code,'YOUTUBE_NOT_APPROVED');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_lesson_playbacks')).rows[0].n,0);
    });
    await t.test('dry runs never create permission rows; explicit approval enables the enrolled owner only',async()=>{
      await configureWorkflows(store,config(true),false);assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_lesson_media_policy')).rows[0].n,0);
      await configureWorkflows(store,config(true),true);
      const enrolled=await f.request(course+'/learning?enrollmentId='+id(29));assert.equal(enrolled.data.course.lessons.find(l=>l.id===id(70)).youtubeVideoId,'abcdefghijk');
      const publicCourse=await f.request(course,{anonymous:true});assert.equal(publicCourse.data.course.lessons.find(l=>l.id===id(70)).videoUrl,null);
      assert.equal((await f.request(lesson+'/playback',{method:'POST',owner:2,body:{enrollmentId:id(29)}})).status,403);
      const started=await f.request(lesson+'/playback',{method:'POST',body:{enrollmentId:id(29)}});assert.equal(started.status,200,JSON.stringify(started));playbackId=started.data.playback.id;
    });
    await t.test('YouTube progress uses the real existing elapsed-time ledger, not a completion button',async()=>{
      await db.query("UPDATE miniapp_lesson_playbacks SET last_seen_at=clock_timestamp()-interval '6 seconds' WHERE id=$1",[playbackId]);
      const result=await f.request(lesson+'/heartbeat',{method:'POST',body:{enrollmentId:id(29),playbackId,position:10}});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.progress.watchedSeconds,10);assert.equal(result.data.progress.isCompleted,false);
    });
    await t.test('revocation blocks the existing player and overrides an old public preview flag',async()=>{
      await configureWorkflows(store,config(false),true);await db.query('UPDATE course_lessons SET is_free_preview=true WHERE id=$1',[id(70)]);
      const result=await f.request(lesson+'/heartbeat',{method:'POST',body:{enrollmentId:id(29),playbackId,position:20}});assert.equal(result.status,403);assert.equal(result.code,'YOUTUBE_NOT_APPROVED');
      const item=(await f.request(course,{anonymous:true})).data.course.lessons.find(l=>l.id===id(70));assert.equal(item.videoUrl,null);assert.equal(item.youtubeVideoId,null);
      assert.equal((await db.query('SELECT watched_seconds FROM user_lesson_progress WHERE lesson_id=$1',[id(70)])).rows[0].watched_seconds,10);
    });
    await t.test('public outlines stay locked even when preview is flagged; approved media changes require reapproval',async()=>{
      await configureWorkflows(store,config(true),true);
      const outline=(await f.request(course,{anonymous:true})).data.course.lessons.find(l=>l.id===id(70));
      assert.equal(outline.youtubeVideoId,null);assert.equal(outline.videoUrl,null);assert.equal(outline.isFreePreview,false);
      await db.query("UPDATE course_lessons SET video_url='https://youtu.be/12345678901' WHERE id=$1",[id(70)]);
      assert.equal((await f.request(course,{anonymous:true})).data.course.lessons.find(l=>l.id===id(70)).videoUrl,null);
      const result=await f.request(lesson+'/playback',{method:'POST',body:{enrollmentId:id(29)}});assert.equal(result.status,403);
      await configureWorkflows(store,config(true),true);assert.equal((await f.request(lesson+'/playback',{method:'POST',body:{enrollmentId:id(29)}})).status,200);
    });
    await t.test('migration is additive and repeatable with no public table access',async()=>{
      const before=(await db.query('SELECT * FROM miniapp_lesson_media_policy')).rows;
      await db.exec(statements.join(';\n'));assert.deepEqual((await db.query('SELECT * FROM miniapp_lesson_media_policy')).rows,before);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.table_privileges WHERE table_name='miniapp_lesson_media_policy' AND grantee IN ('PUBLIC','anon','authenticated')")).rows[0].n,0);
    });
  }finally{await f.close();}
});
