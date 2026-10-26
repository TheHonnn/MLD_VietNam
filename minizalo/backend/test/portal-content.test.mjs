import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('portal library separates public, actual membership and staff-only content on every read',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    await db.exec(`ALTER TABLE miniapp_shared_content ADD COLUMN access_level text;
      ALTER TABLE miniapp_shared_content ADD COLUMN category text;
      ALTER TABLE miniapp_shared_content ADD COLUMN author_name text;
      ALTER TABLE miniapp_shared_content ADD COLUMN file_url text;
      ALTER TABLE miniapp_shared_content ALTER COLUMN author_id DROP NOT NULL;`);
    for(const [n,access,status,published] of [[700,'PUBLIC','PUBLISHED','2020-01-01'],[701,'MEMBERS_ONLY','PUBLISHED','2020-01-01'],[702,null,'PUBLISHED','2020-01-01'],[703,'PUBLIC','DRAFT',null],[704,'PUBLIC','PUBLISHED','2099-01-01']]){
      await db.query(`INSERT INTO miniapp_shared_content(id,kind,title,content_text,status,author_id,updated_by,payload_hash,published_at,access_level,author_name,file_url,attachments)
        VALUES($1,'DOCUMENT',$2,'Actual portal document',$3,NULL,$4,'test',$5,$6,'Approved author','https://files.test/actual.pdf','[{"url":"javascript:alert(1)","name":"Unsafe"}]')`,[id(n),'Document '+n,status,id(92),published,access]);
    }
    const list=(owner)=>f.request(owner===undefined?'/portal/content?kind=DOCUMENT':'/portal/library?kind=DOCUMENT',{...(owner===undefined?{anonymous:true}:{owner})});
    assert.deepEqual((await list()).data.items.map(item=>item.id),[id(700)]);
    assert.deepEqual((await list(1)).data.items.map(item=>item.id),[id(700)]);
    assert.equal((await f.request('/portal/library/'+id(701),{owner:1})).status,404);
    assert.equal((await f.request('/portal/content/'+id(702),{anonymous:true})).status,404);
    const detail=await f.request('/portal/content/'+id(700),{anonymous:true});
    assert.equal(detail.data.item.authorName,'Approved author');assert.equal(detail.data.item.contentText,'Actual portal document');
    assert.deepEqual(detail.data.item.attachments,[{url:'https://files.test/actual.pdf',name:'Document 700'}]);
    assert.equal(detail.data.item.payloadHash,undefined);
    await db.query(`INSERT INTO miniapp_membership_cards(user_id,card_code,is_active,expires_at) VALUES($1,'ACTUAL-CARD',true,'2099-12-31')`,[id(1)]);
    assert.equal((await list(1)).data.items.length,2);
    assert.equal((await f.request('/portal/library/'+id(701),{owner:1})).status,200);
    await db.query('UPDATE miniapp_membership_cards SET is_active=false WHERE user_id=$1',[id(1)]);
    assert.equal((await f.request('/portal/library/'+id(701),{owner:1})).status,404);
    assert.equal((await list(90)).data.items.length,3);
    assert.equal((await f.request('/portal/library?kind=DOCUMENT&search=Approved%20author',{owner:1})).data.items.length,1);
    assert.equal((await f.request('/portal/content?kind=DOCUMENT&search=%25',{anonymous:true})).data.items.length,0);
    assert.equal((await f.request('/portal/content?kind=DOCUMENT&cursor=bad',{anonymous:true})).status,400);
    await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
    const revoked=await list(90);assert.equal(revoked.status,200);assert.deepEqual(revoked.data.items.map(item=>item.id),[id(700)]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_shared_content')).rows[0].n,5);
  }finally{await f.close();}
});
