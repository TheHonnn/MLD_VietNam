import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('staff customer dossier only exposes canonical branch-scoped history and real package balances',async t=>{
  const f=await staffFixture(),{id,db}=f;
  const read=(section,owner=90,extra='')=>f.request('/staff/customers/'+id(1)+'/records?section='+section+extra,{owner});
  try{
    await t.test('customers and unrelated branch employees cannot read clinical records',async()=>{
      assert.equal((await read('treatments',1)).status,403);
      assert.equal((await read('treatments',91)).status,404);
      assert.equal((await f.request('/staff/customers/not-an-id/records',{owner:90})).status,400);
      assert.equal((await read('invalid')).status,400);
      assert.equal((await f.request('/staff/customers/'+id(1)+'/records?section[]=appointments',{owner:90})).status,400);
    });
    await t.test('appointments paginate and journal fields match shared records without private account fields',async()=>{
      const first=await read('appointments',90,'&limit=1');assert.equal(first.status,200,JSON.stringify(first));assert.equal(first.data.records.length,1);assert.ok(first.data.nextCursor);
      const next=await read('appointments',90,'&limit=1&cursor='+first.data.nextCursor);assert.notEqual(next.data.records[0].id,first.data.records[0].id);
      assert.deepEqual(Object.keys(first.data.customer).sort(),['dateOfBirth','fullName','id','phone']);
      const journals=await read('treatments');assert.equal(journals.data.records.length,1);assert.equal(journals.data.records[0].treatmentNotes,'Actual care notes');assert.equal(journals.data.records[0].conditionBefore,'Before condition');
      const packages=await read('packages');assert.equal(packages.data.records[0].remainingSessions,3);assert.equal(packages.data.records[0].completedSessions,1);
    });
    await t.test('a relationship in another branch does not expose this branch clinical notes',async()=>{
      await db.query("INSERT INTO bookings(id,booking_code,customer_id,branch_id,booking_date,start_time,end_time,status,base_total,final_price,qr_code_hash) VALUES($1,'OTHER-DOSSIER',$2,$3,'2020-01-01','12:00','13:00','COMPLETED',0,0,'OTHER-DOSSIER-QR')",[id(501),id(1),id(104)]);
      assert.equal((await read('treatments',91)).data.records.length,0);
      assert.equal((await read('appointments',91)).data.records.length,1);
      assert.equal((await read('appointments',90)).data.records.length,2);
      assert.equal((await read('appointments',92)).data.records.length,3);
      await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
      assert.equal((await read('treatments')).status,403);
    });
  }finally{await f.close();}
});
