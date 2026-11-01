import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('catalog edits require admin, preserve rich fields, and reject stale versions',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    assert.equal((await f.request('/staff/catalog/services',{owner:1})).status,403);
    assert.equal((await f.request('/staff/catalog/services',{owner:90})).status,403);
    const list=await f.request('/staff/catalog/services',{owner:92});assert.equal(list.status,200);
    const previous=list.data.items.find(item=>item.id===id(5));
    const input={title:'Updated service from Mini App',code:previous.slug,categoryId:previous.categoryId,shortDescription:previous.shortDescription,fullDescription:previous.fullDescription,price:120000,durationMinutes:90,imageUrl:previous.imageUrl,isActive:true,isFeatured:true,expectedVersion:previous.version};
    const saved=await f.request('/staff/catalog/services/'+id(5),{method:'PUT',owner:92,body:input});assert.equal(saved.status,200,JSON.stringify(saved));
    assert.equal(saved.data.item.name,input.title);assert.deepEqual(saved.data.item.steps,previous.steps);
    assert.equal((await f.request('/staff/catalog/services/'+id(5),{method:'PUT',owner:92,body:input})).status,409);
    const source=(await f.request('/services')).data.services.find(item=>item.id===id(5));assert.equal(source.name,input.title);assert.equal(Number(source.price),120000);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM audit_logs WHERE action='MINIAPP_CATALOG_SAVE'`)).rows[0].n,1);
  }finally{await f.close();}
});

test('admissions approves both canonical states, unlocks learning and enforces branch/capacity',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    await db.query(`UPDATE course_batches SET status='OPEN_FOR_ENROLLMENT' WHERE id=$1`,[id(30)]);
    await db.query(`UPDATE course_enrollments SET status='CONSULTING',approval_status='PENDING_APPROVAL',selected_branch='Workflow branch' WHERE id=$1`,[id(29)]);
    assert.equal((await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29))).status,403);
    assert.equal((await f.request('/staff/academy/candidates',{owner:1})).status,403);
    assert.ok((await f.request('/staff/academy/candidates',{owner:90})).data.candidates.some(item=>item.id===id(29)));
    assert.ok(!(await f.request('/staff/academy/candidates',{owner:91})).data.candidates.some(item=>item.id===id(29)));
    const body={batchId:id(30),expectedStatus:'CONSULTING',expectedApproval:'PENDING_APPROVAL',expectedBatchId:id(30)};
    assert.equal((await f.request('/staff/academy/candidates/'+id(29)+'/approve',{owner:91,method:'PATCH',body})).status,404);
    const saved=await f.request('/staff/academy/candidates/'+id(29)+'/approve',{owner:90,method:'PATCH',body});assert.equal(saved.status,200,JSON.stringify(saved));
    assert.equal(saved.data.enrollment.status,'ENROLLED');assert.equal(saved.data.enrollment.approvalStatus,'APPROVED');
    assert.equal((await f.request('/courses/'+id(22)+'/learning?enrollmentId='+id(29))).status,200);
    assert.equal((await f.request('/staff/academy/candidates/'+id(29)+'/approve',{owner:90,method:'PATCH',body})).status,409);
    await db.query(`UPDATE course_batches SET max_students=1 WHERE id=$1`,[id(30)]);
    await db.query(`UPDATE course_enrollments SET status='CONSULTING',approval_status='PENDING_APPROVAL' WHERE id=$1`,[id(32)]);
    const full=await f.request('/staff/academy/candidates/'+id(32)+'/approve',{owner:92,method:'PATCH',body:{...body,expectedBatchId:id(33)}});assert.equal(full.status,409);
    assert.equal((await db.query(`SELECT approval_status FROM course_enrollments WHERE id=$1`,[id(32)])).rows[0].approval_status,'PENDING_APPROVAL');
  }finally{await f.close();}
});
