import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('public banner read follows Admin publication, audience and schedule without exposing other portal content',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    await db.exec(`ALTER TABLE miniapp_shared_content DROP CONSTRAINT IF EXISTS miniapp_shared_content_kind_check;
      ALTER TABLE miniapp_shared_content DROP CONSTRAINT IF EXISTS miniapp_shared_content_status_check;
      ALTER TABLE miniapp_shared_content ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'PUBLIC';
      ALTER TABLE miniapp_shared_content ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
      ALTER TABLE miniapp_shared_content ADD COLUMN IF NOT EXISTS target_link text;`);
    const read=()=>f.request('/portal/banners',{anonymous:true});
    assert.deepEqual((await read()).data.banners,[]);
    for(const [n,kind,status,access,published,order] of [
      [700,'BANNER','PUBLISHED','PUBLIC','2020-01-01',2],
      [701,'BANNER','APPROVED','PUBLIC',null,1],
      [702,'BANNER','DRAFT','PUBLIC',null,0],
      [703,'BANNER','PUBLISHED','MEMBERS_ONLY','2020-01-01',0],
      [704,'BANNER','PUBLISHED','PUBLIC','2099-01-01',0],
      [705,'DOCUMENT','PUBLISHED','PUBLIC','2020-01-01',0],
    ])await db.query(`INSERT INTO miniapp_shared_content(id,kind,status,title,content_text,author_id,updated_by,payload_hash,access_level,published_at,sort_order,target_link)
      VALUES($1,$2,$3,$4,'Database content',$5,$5,'test',$6,$7,$8,'/documents')`,[id(n),kind,status,'Banner '+n,id(92),access,published,order]);
    const page=await read();assert.equal(page.status,200);
    assert.deepEqual(page.data.banners.map(item=>item.id),[id(701),id(700)]);
    assert.equal(page.data.banners[0].targetLink,'/documents');
    assert.equal(page.data.banners[0].payloadHash,undefined);
    assert.equal(page.data.banners[0].updatedBy,undefined);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_shared_content')).rows[0].n,6);
  }finally{await f.close();}
});
