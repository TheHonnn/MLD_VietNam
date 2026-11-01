import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('Admin document permissions apply to lists, direct links, enrollment revocation and download flags',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    await db.query(`UPDATE course_enrollments SET approval_status='APPROVED' WHERE student_id=$1`,[id(1)]);
    await db.exec(`ALTER TABLE miniapp_shared_content ADD COLUMN access_level text;
      ALTER TABLE miniapp_shared_content ADD COLUMN course_id uuid;
      ALTER TABLE miniapp_shared_content ADD COLUMN allow_download boolean DEFAULT false;
      ALTER TABLE miniapp_shared_content ADD COLUMN require_full_payment boolean DEFAULT true;
      ALTER TABLE miniapp_shared_content ADD COLUMN allowed_roles jsonb;
      ALTER TABLE miniapp_shared_content ADD COLUMN watermark_text text;`);
    await db.query(`INSERT INTO miniapp_shared_content(id,kind,title,content_text,status,author_id,updated_by,payload_hash,published_at,access_level,course_id,allowed_roles,watermark_text,attachments)
      VALUES($1,'DOCUMENT','Actual Admin PDF','Actual text','PUBLISHED',$2,$2,'test','2020-01-01','COURSE_ENROLLED',$3,'["STUDENT","ADMIN"]','Actual Admin watermark','[{"url":"https://files.test/admin.pdf","name":"Admin.pdf"}]')`,[id(720),id(92),id(22)]);
    const path='/portal/library/'+id(720);
    assert.equal((await f.request('/portal/content/'+id(720),{anonymous:true})).status,404);
    assert.equal((await f.request(path,{owner:2})).status,404);
    const detail=await f.request(path);
    assert.equal(detail.status,200);assert.equal(detail.data.item.canDownload,false);
    assert.equal(detail.data.item.watermarkText,'Actual Admin watermark');assert.equal(detail.data.item.attachments[0].canDownload,false);
    assert.ok((await f.request('/portal/library?kind=DOCUMENT')).data.items.some(row=>row.id===id(720)));
    assert.equal((await f.request(path,{owner:90})).status,404,'Receptionists cannot read student-only content just because they are staff');
    await db.query('UPDATE miniapp_shared_content SET allow_download=true WHERE id=$1',[id(720)]);
    await db.query('UPDATE course_enrollments SET tuition_total=100,amount_paid=0 WHERE student_id=$1',[id(1)]);
    assert.equal((await f.request(path)).data.item.canDownload,false);
    await db.query('UPDATE course_enrollments SET amount_paid=100 WHERE student_id=$1',[id(1)]);
    assert.equal((await f.request(path)).data.item.canDownload,true);
    await db.query(`UPDATE course_enrollments SET status='CONSULTING' WHERE student_id=$1`,[id(1)]);
    assert.equal((await f.request(path)).status,404);
    assert.equal((await f.request('/portal/library?kind=DOCUMENT')).data.items.length,0);
    assert.equal((await f.request(path,{owner:92})).status,200);
    await db.query(`UPDATE miniapp_shared_content SET access_level='PUBLIC',allow_download=false WHERE id=$1`,[id(720)]);
    const publicItem=await f.request('/portal/content/'+id(720),{anonymous:true});
    assert.equal(publicItem.status,200);assert.equal(publicItem.data.item.canDownload,false);
  }finally{await f.close();}
});
