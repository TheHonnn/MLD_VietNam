import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('availability dates use the same real assignment, duration and conflict rules as slots',async()=>{
  const f=await workflowFixture(),{id,db}=f;
  try{
    const query=`branchId=${id(3)}&serviceId=${id(5)}&date=2099-01-01&throughDate=2099-01-31`;
    const read=async(extra='')=>f.request('/slots/dates?'+query+extra,{anonymous:true});
    assert.deepEqual((await read()).data.dates,['2099-01-12']);
    assert.equal((await read()).data.availabilityReason,'AVAILABLE');
    assert.deepEqual((await read('&technicianId='+id(7))).data.dates,['2099-01-12']);
    assert.deepEqual((await read('&technicianId='+id(99))).data.dates,[]);
    const invalid=await f.request(`/slots/dates?branchId=${id(3)}&serviceId=${id(5)}&date=2099-01-01&throughDate=2099-03-01`,{anonymous:true});
    assert.equal(invalid.status,400);
    assert.equal((await f.request(`/slots/dates?branchId=${id(3)}&serviceId=${id(5)}&date=2099-02-30&throughDate=2099-03-02`,{anonymous:true})).status,400);
    await db.query('UPDATE miniapp_technician_services SET is_active=false WHERE service_id=$1',[id(5)]);
    assert.deepEqual((await read()).data.dates,[]);
    assert.equal((await read()).data.availabilityReason,'NO_SERVICE_ASSIGNMENT');
    await db.query('UPDATE miniapp_technician_services SET is_active=true WHERE service_id=$1',[id(5)]);
    await db.query('UPDATE services SET duration_minutes=180 WHERE id=$1',[id(5)]);
    assert.deepEqual((await read()).data.dates,[]);
    assert.equal((await read()).data.availabilityReason,'NO_MATCHING_TIMES');
    await db.query('UPDATE services SET duration_minutes=60 WHERE id=$1',[id(5)]);
    await db.query("UPDATE technician_slots SET status='BOOKED' WHERE slot_date='2099-01-12'");
    assert.deepEqual((await read()).data.dates,[]);
    assert.equal((await read()).data.availabilityReason,'NO_MATCHING_TIMES');
    await db.query('DELETE FROM technician_slots');
    assert.equal((await read()).data.availabilityReason,'NO_PUBLISHED_SLOTS');
  }finally{await f.close();}
});
