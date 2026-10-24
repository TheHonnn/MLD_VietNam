import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('staff book the selected customer package, never their own or another customer package',async t=>{
  const f=await staffFixture(),{id,db}=f;
  const packages=owner=>f.request('/staff/customers/'+id(1)+'/packages',{owner});
  const body={serviceId:id(5),branchId:id(3),date:f.day,timeSlot:'14:00 - 15:00',customerId:id(1),customerPhone:'0900000001',userPackageId:id(10),expectedFinalPrice:0};
  const post=body=>f.request('/staff/bookings',{owner:90,method:'POST',body});
  try{
    await t.test('only staff can read actual remaining and reserved package sessions',async()=>{
      assert.equal((await packages(1)).status,403);
      const result=await packages(90);
      assert.equal(result.data.packages.length,1);assert.equal(result.data.packages[0].id,id(10));
      assert.equal(result.data.packages[0].remainingSessions,3);assert.equal(result.data.packages[0].reservedSessions,0);
    });
    await t.test('staff cannot transfer another customer package or share one package with a group',async()=>{
      assert.equal((await post({...body,customerId:id(2),customerPhone:'0900000002'})).status,404);
      assert.equal((await post({...body,people:2})).status,400);
    });
    await t.test('reserving and cancelling update the actual owner balance without charging again',async()=>{
      const saved=await post(body);assert.equal(saved.status,201,JSON.stringify(saved));
      assert.equal(saved.data.booking.customerId,id(1));assert.equal(Number(saved.data.booking.finalPrice),0);
      assert.equal(saved.data.booking.userPackageId,id(10));
      const during=(await packages(90)).data.packages[0];assert.equal(during.remainingSessions,2);assert.equal(during.reservedSessions,1);
      assert.equal((await f.request('/bookings/'+saved.data.booking.id+'/cancel',{method:'PATCH',owner:90,body:{reason:'Fixture release'}})).status,200);
      const after=(await packages(90)).data.packages[0];assert.equal(after.remainingSessions,3);assert.equal(after.completedSessions,1);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM invoices')).rows[0].total,0);
    });
  }finally{await f.close();}
});
