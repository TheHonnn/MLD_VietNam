import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';
import {documentAttachments} from '../dist/document-library.js';

test('document attachment links only expose actual HTTPS files without URL credentials',()=>{
  assert.deepEqual(documentAttachments(null),[]);
  assert.deepEqual(documentAttachments(['javascript:alert(1)','http://insecure.test/file','https://user:password@files.test/file',{},null]),[]);
  assert.deepEqual(documentAttachments(['https://files.test/a.pdf',{fileUrl:'https://files.test/b.pdf',title:'Actual filename'}]),[{url:'https://files.test/a.pdf',name:'a.pdf'},{url:'https://files.test/b.pdf',name:'Actual filename'}]);
});

test('document library uses shared lessons and rechecks ownership, latest access and catalog state',async t=>{
  const f=await workflowFixture(),{id,db}=f;
  try{
    await db.query('UPDATE course_lessons SET attachments=$1::jsonb WHERE id=$2',[JSON.stringify([{name:'Actual attachment',url:'https://files.test/actual.pdf'}]),id(24)]);
    await t.test('anonymous and other accounts cannot read private document content',async()=>{
      assert.equal((await f.request('/documents',{anonymous:true})).status,401);
      assert.equal((await f.request('/documents/'+id(24),{owner:2})).status,403);
      assert.equal((await f.request('/documents',{owner:2})).data.documents.length,0);
      assert.equal((await f.request('/documents/'+id(31))).status,404);
      assert.equal((await f.request('/documents/not-an-id')).status,400);
    });
    await t.test('pagination, search and detail reference original lesson IDs, never fake content',async()=>{
      const first=await f.request('/documents?limit=1');assert.equal(first.status,200,JSON.stringify(first));assert.equal(first.data.documents.length,1);assert.ok(first.data.nextCursor);
      assert.equal(first.data.documents[0].contentText,undefined);assert.equal(first.data.documents[0].attachments,undefined);
      const next=await f.request('/documents?limit=1&cursor='+first.data.nextCursor);assert.equal(next.data.documents.length,1);assert.notEqual(next.data.documents[0].id,first.data.documents[0].id);
      assert.equal((await f.request('/documents?search=Reading')).data.documents.length,1);
      assert.equal((await f.request('/documents?search=%25')).data.documents.length,0);
      assert.equal((await f.request('/documents?search[a]=invalid')).status,400);
      const detail=await f.request('/documents/'+id(24));assert.equal(detail.data.document.contentText,'Actual practice instructions');assert.equal(detail.data.document.attachments[0].name,'Actual attachment');
    });
    await t.test('an older allowed enrollment cannot bypass latest suspended or expired enrollment',async()=>{
      await db.query("UPDATE course_enrollments SET enrolled_at=CASE WHEN id=$1 THEN '2026-10-01'::timestamptz ELSE '2026-09-01'::timestamptz END WHERE student_id=$2",[id(32),id(1)]);
      await db.query("INSERT INTO miniapp_course_access(enrollment_id,is_suspended,reason) VALUES($1,true,'Fixture restriction')",[id(32)]);
      assert.equal((await f.request('/documents')).data.documents.length,0);assert.equal((await f.request('/documents/'+id(24))).status,403);
      await db.query("UPDATE miniapp_course_access SET is_suspended=false,expires_at='2020-01-01' WHERE enrollment_id=$1",[id(32)]);
      assert.equal((await f.request('/documents')).data.documents.length,0);assert.equal((await f.request('/documents/'+id(24))).status,403);
      await db.query('UPDATE miniapp_course_access SET expires_at=NULL WHERE enrollment_id=$1',[id(32)]);
      assert.equal((await f.request('/documents')).data.documents.length,2);
    });
    await t.test('inactive courses/categories are not leaked through the library',async()=>{
      await db.query('UPDATE course_categories SET is_active=false WHERE id=$1',[id(20)]);
      assert.equal((await f.request('/documents')).data.documents.length,0);assert.equal((await f.request('/documents/'+id(24))).status,404);
    });
  }finally{await f.close();}
});
