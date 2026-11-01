import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('personal groups reserve real capacity, await approval and remain owner scoped',async t=>{
  const f=await staffFixture(),{db,id,day}=f;
  const input={serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',people:2,bookedForName:'Actual contact',bookedForPhone:'0900000001',expectedFinalPrice:200000};
  const create=body=>f.request('/bookings',{method:'POST',body});
  try{
    await db.query('UPDATE branch_rooms SET bed_capacity=2 WHERE id=$1',[id(8)]);
    await t.test('insufficient specialists reject the whole group without partial writes',async()=>{
      assert.equal((await create(input)).status,409);
      assert.equal((await db.query('SELECT count(*)::int n FROM bookings WHERE booking_date=$1',[day])).rows[0].n,0);
    });
    await db.query("INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES($1,$2,'Second actual specialist','')",[id(93),id(3)]);
    await db.query('INSERT INTO miniapp_technician_services(technician_id,service_id) VALUES($1,$2)',[id(93),id(5)]);
    await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,$3::date,'14:00','16:00')",[id(93),id(3),day]);
    await t.test('availability checks requested capacity and personal limits',async()=>{
      const query=new URLSearchParams({branchId:id(3),serviceId:id(5),date:day,people:'2'});
      assert.ok((await f.request('/slots?'+query)).data.slots.length>0);
      query.set('people','3');assert.equal((await f.request('/slots?'+query)).data.slots.length,0);
      query.set('people','11');assert.equal((await f.request('/slots?'+query)).status,400);
      assert.equal((await create({...input,people:11})).status,400);
      assert.equal((await create({...input,customerId:id(2)})).status,403);
    });
    const saved=await create(input);assert.equal(saved.status,201,JSON.stringify(saved));
    const groupPath='/bookings/'+saved.data.booking.id+'/group';
    const members=(await f.request(groupPath)).data.bookings;
    await t.test('each guest has a pending canonical booking and separate bed and specialist',async()=>{
      assert.equal(members.length,2);
      assert.ok(members.every(b=>b.customerId===id(1)&&b.status==='PENDING'&&Number(b.finalPrice)===100000));
      const rows=(await db.query('SELECT * FROM bookings WHERE id=ANY($1::uuid[])',[members.map(b=>b.id)])).rows;
      assert.equal(new Set(rows.map(b=>b.technician_id)).size,2);
      assert.equal(new Set(rows.map(b=>b.assigned_room_id+':'+b.assigned_bed_number)).size,2);
      assert.ok(rows.every(b=>b.booked_for_name===input.bookedForName));
    });
    await t.test('other owners and another branch cannot read, confirm or cancel the group',async()=>{
      assert.equal((await f.request(groupPath,{owner:2})).status,404);
      assert.equal((await f.request(groupPath+'/cancel',{owner:2,method:'PATCH',body:{}})).status,404);
      assert.equal((await f.request('/staff/bookings/'+members[0].id+'/status',{method:'PATCH',body:{status:'CONFIRMED'}})).status,403);
      assert.equal((await f.request('/staff/bookings/'+members[0].id+'/status',{owner:91,method:'PATCH',body:{status:'CONFIRMED'}})).status,404);
    });
    await t.test('branch staff can confirm a future pending reservation without checking it in',async()=>{
      const result=await f.request('/staff/bookings/'+members[0].id+'/status',{owner:90,method:'PATCH',body:{status:'CONFIRMED'}});
      assert.equal(result.status,200,JSON.stringify(result));
      assert.equal((await db.query('SELECT status FROM bookings WHERE id=$1',[members[0].id])).rows[0].status,'CONFIRMED');
    });
    await t.test('owner cancellation keeps a real reason, frees capacity and is repeatable',async()=>{
      const cancel=()=>f.request(groupPath+'/cancel',{method:'PATCH',body:{reason:'Owner changed plans'}});
      assert.equal((await cancel()).status,200);assert.equal((await cancel()).status,200);
      const rows=(await db.query('SELECT status,cancellation_reason FROM bookings WHERE id=ANY($1::uuid[])',[members.map(b=>b.id)])).rows;
      assert.ok(rows.every(b=>b.status==='CANCELLED'&&b.cancellation_reason==='Owner changed plans'));
      assert.equal((await db.query("SELECT count(*)::int n FROM audit_logs WHERE action='MINIAPP_GROUP_CANCEL'")).rows[0].n,2);
    });
  }finally{await f.close();}
});
