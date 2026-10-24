import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
import {statements} from '../migrations/013_shared_content.mjs';

test('shared community and document publishing stays real, staff-private, revisioned and non-destructive',async t=>{
  const f=await staffFixture(),{db,id}=f;
  const content={kind:'COMMUNITY',status:'DRAFT',title:'Actual staff update',summary:'Shared internal summary',contentText:'Actual published text',attachments:[],expectedRevision:0};
  const put=(body,owner=92,n=600)=>f.request('/shared-content/'+id(n),{method:'PUT',owner,body});
  const list=(kind='COMMUNITY',suffix='')=>f.request('/shared-content?kind='+kind+suffix,{owner:90});
  try{
    await t.test('an empty database has no invented posts and rejects anonymous or customer access',async()=>{
      assert.equal((await list()).data.items.length,0);
      assert.equal((await f.request('/shared-content?kind=COMMUNITY',{anonymous:true})).status,401);
      assert.equal((await f.request('/shared-content?kind=COMMUNITY',{owner:1})).status,403);
      assert.equal((await put(content,90)).status,403);
      assert.equal((await f.request('/shared-content/manage',{owner:90})).status,403);
      assert.equal((await list('INVALID')).status,400);
    });
    await t.test('administrators can save and reload drafts without exposing them to readers',async()=>{
      const saved=await put(content);assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(saved.data.item.revision,1);
      assert.equal((await list()).data.items.length,0);
      assert.equal((await f.request('/shared-content/'+id(600),{owner:90})).status,404);
      const edit=await f.request('/shared-content/'+id(600)+'/edit',{owner:92});assert.equal(edit.data.item.status,'DRAFT');assert.equal(edit.data.item.contentText,content.contentText);
      assert.equal((await f.request('/shared-content/'+id(600)+'/edit',{owner:90})).status,403);
      assert.equal((await f.request('/shared-content/manage',{owner:92})).data.items.length,1);
      const replay=await put(content);assert.equal(replay.data.item.revision,1);assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='MINIAPP_CONTENT_SAVE'")).rows[0].n,1);
    });
    await t.test('publication uses canonical rows, safe files and optimistic edit conflicts',async()=>{
      const published={...content,status:'PUBLISHED',expectedRevision:1,attachments:[{url:'https://files.test/actual.pdf',name:'Actual PDF'}]};
      assert.equal((await put(published)).data.item.revision,2);
      const feed=await list();assert.equal(feed.data.items[0].id,id(600));assert.equal(feed.data.items[0].contentText,undefined);assert.equal(feed.data.items[0].attachments,undefined);
      const detail=await f.request('/shared-content/'+id(600),{owner:90});assert.equal(detail.data.item.contentText,content.contentText);assert.equal(detail.data.item.attachments[0].name,'Actual PDF');
      assert.equal((await put({...published,title:'Outdated overwrite'})).status,409);
      assert.equal((await put(published)).data.item.revision,2);
      assert.equal((await list('COMMUNITY','&search=%25')).data.items.length,0);
    });
    await t.test('invalid media, missing revisions, and empty publications never create rows',async()=>{
      for(const body of [{...content,imageUrl:'javascript:alert(1)'},{...content,attachments:['https://user:secret@files.test/private']},{...content,expectedRevision:undefined},{...content,status:'PUBLISHED',contentText:'',summary:''},{...content,publishedAt:'not-a-date'}])assert.equal((await put(body,92,601)).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_shared_content')).rows[0].n,1);
    });
    await t.test('scheduled publications stay hidden, kinds do not mix and keyset pages do not skip records',async()=>{
      assert.equal((await put({...content,status:'PUBLISHED',publishedAt:'2099-01-01T00:00:00.000Z'},92,602)).status,200);
      assert.equal((await list()).data.items.length,1);
      assert.equal((await put({...content,kind:'DOCUMENT',status:'PUBLISHED'},92,603)).status,200);
      assert.equal((await list('DOCUMENT')).data.items.length,1);assert.equal((await list()).data.items.length,1);
      assert.equal((await put({...content,status:'PUBLISHED'},92,604)).status,200);
      const page=await list('COMMUNITY','&limit=1');assert.ok(page.data.nextCursor);
      const next=await list('COMMUNITY','&limit=1&cursor='+page.data.nextCursor);assert.notEqual(next.data.items[0].id,page.data.items[0].id);
    });
    await t.test('archival removes public access without deleting any content or history',async()=>{
      assert.equal((await put({...content,status:'ARCHIVED',expectedRevision:2})).data.item.revision,3);
      assert.equal((await f.request('/shared-content/'+id(600),{owner:90})).status,404);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_shared_content')).rows[0].n,4);
      assert.equal((await f.request('/shared-content/'+id(600)+'/edit',{owner:92})).data.item.status,'ARCHIVED');
      await db.exec(statements.join(';\n'));
      assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.table_privileges WHERE table_name='miniapp_shared_content' AND grantee IN ('PUBLIC','anon','authenticated')")).rows[0].n,0);
      await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
      assert.equal((await list()).status,403);
    });
  }finally{await f.close();}
});
