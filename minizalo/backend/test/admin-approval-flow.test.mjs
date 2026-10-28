import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
test('registration remains locked until canonical Admin approval, with no client-selected ownership or status',async()=>{
  const f=await workflowFixture(),{db,id,request}=f;
  try{
    await db.query("UPDATE course_lessons SET is_free_preview=true,content_text='Protected lesson body',attachments='[{\"url\":\"https://files.test/lesson.pdf\",\"name\":\"Lesson PDF\"}]'::jsonb WHERE id=$1",[id(25)]);
    const publicCourse=await request(`/courses/${id(22)}`,{anonymous:true});assert.equal(publicCourse.status,200);
    const outline=publicCourse.data.course.lessons.find(l=>l.id===id(25));assert.ok(outline.title);assert.equal(outline.isFreePreview,false);assert.equal(outline.contentText,null);assert.deepEqual(outline.attachments,[]);
    assert.deepEqual((await request('/course-enrollments',{owner:2})).data.enrollments,[]);
    const registered=await request('/course-enrollments',{owner:2,method:'POST',body:{courseId:id(22),studentId:id(1),status:'ENROLLED'}});
    assert.equal(registered.status,201,JSON.stringify(registered));assert.equal(registered.data.enrollment.status,'CONSULTING');
    const enrollmentId=registered.data.enrollment.id;
    assert.equal((await db.query('SELECT student_id FROM course_enrollments WHERE id=$1',[enrollmentId])).rows[0].student_id,id(2));
    const learning=()=>request(`/courses/${id(22)}/learning?enrollmentId=${enrollmentId}`,{owner:2});
    assert.equal((await learning()).status,403);
    assert.equal((await request(`/documents/${id(25)}`,{owner:2})).status,403);
    assert.equal((await request('/course-enrollments',{owner:2,method:'POST',body:{courseId:id(22)}})).status,409);
    // Simulate the existing Admin writing its real shared enrollment row.
    await db.query("UPDATE course_enrollments SET status='ENROLLED',batch_id=$2 WHERE id=$1",[enrollmentId,id(30)]);
    const approved=await learning();assert.equal(approved.status,200,JSON.stringify(approved));
    assert.equal(approved.data.course.lessons.find(l=>l.id===id(25)).contentText,null);
    const read=await request(`/courses/${id(22)}/lessons/${id(24)}/progress`,{owner:2,method:'POST',body:{enrollmentId,isCompleted:true}});assert.equal(read.status,200,JSON.stringify(read));
    assert.equal((await learning()).data.course.lessons.find(l=>l.id===id(25)).contentText,'Protected lesson body');
    assert.equal((await request(`/documents/${id(25)}`,{owner:2})).status,200);
    assert.equal((await request(`/courses/${id(22)}/learning?enrollmentId=${enrollmentId}`,{owner:1})).status,403);
    await db.query("UPDATE course_enrollments SET status='DROPPED' WHERE id=$1",[enrollmentId]);
    assert.equal((await learning()).status,403);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM course_enrollments WHERE id=$1',[enrollmentId])).rows[0].n,1);
  }finally{await f.close();}
});
