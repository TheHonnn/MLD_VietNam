import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('journal shares require ownership/branch, use signed expiring links and export a real Vietnamese PDF',async()=>{
  const f=await staffFixture(),{db,id}=f;
  try{
    assert.equal((await f.request('/records/'+id(12)+'/share',{method:'POST',owner:2})).status,404);
    assert.equal((await f.request('/records/'+id(12)+'/share',{method:'POST',owner:91})).status,404);
    const result=await f.request('/records/'+id(12)+'/share',{method:'POST'});
    assert.equal(result.status,200);assert.match(result.data.path,/^\/share\/journals\//);assert.ok(Date.parse(result.data.expiresAt)>Date.now());
    const html=await fetch(f.base+result.data.path);assert.equal(html.status,200);assert.equal(html.headers.get('referrer-policy'),'no-referrer');
    assert.match(await html.text(),/Actual care notes/);
    const pdf=await fetch(f.base+result.data.pdfPath);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');
    const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>5000);
    assert.equal((await fetch(f.base+result.data.path+'tampered')).status,404);
    await db.query(`UPDATE treatment_journal SET treatment_notes='Updated care notes' WHERE id=$1`,[id(12)]);
    assert.equal((await fetch(f.base+result.data.path)).status,404,'An old share must stop exposing a changed record');
    const fresh=await f.request('/records/'+id(12)+'/share',{method:'POST',owner:90});assert.equal(fresh.status,200);
    await db.query(`UPDATE staff_profiles SET is_active=false WHERE user_id=$1`,[id(90)]);
    assert.equal((await fetch(f.base+fresh.data.path)).status,404,'A revoked staff member cannot keep a branch record public');
  }finally{await f.close();}
});
