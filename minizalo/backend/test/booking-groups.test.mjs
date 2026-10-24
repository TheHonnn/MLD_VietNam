import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';

test('named group appointments retain the contact and cancel atomically',async t=>{
  const f=await staffFixture(),{id,db,day}=f;
  const input={serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',customerId:id(1),customerPhone:'0900000001',people:2,expectedFinalPrice:200000,guests:[{name:'First actual guest',phone:'+84900000101'},{name:'Second actual guest',phone:''}]};
  const create=body=>f.request('/staff/bookings',{owner:90,method:'POST',body});
  let saved,members;
  try{
    await db.query("INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES($1,$2,'Group test specialist','')",[id(93),id(3)]);
    await db.query('INSERT INTO miniapp_technician_services(technician_id,service_id) VALUES($1,$2)',[id(93),id(5)]);
    await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,$3::date,'14:00','16:00')",[id(93),id(3),day]);
    await t.test('partial, invalid and oversized guest lists fail before a write',async()=>{
      for(const guests of [[],input.guests.slice(0,1),[...input.guests,input.guests[0]],[{name:''},input.guests[1]],[{name:'x',phone:'abc'},input.guests[1]],[{name:'x\u0000'},input.guests[1]],null])assert.equal((await create({...input,guests})).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_booking_group_members')).rows[0].n,0);
    });
    await t.test('each real supplied guest is saved without creating or overwriting their customer identity',async()=>{
      saved=await create(input);assert.equal(saved.status,201,JSON.stringify(saved));
      const rows=(await db.query('SELECT b.* FROM bookings b JOIN miniapp_booking_group_members gm ON gm.booking_id=b.id WHERE gm.group_id=$1 ORDER BY gm.member_number',[saved.data.booking.groupId])).rows;
      assert.deepEqual(rows.map(row=>row.booked_for_name),input.guests.map(g=>g.name));
      assert.deepEqual(rows.map(row=>row.booked_for_phone),['0900000101','0900000001']);
      assert.ok(rows.every(row=>row.customer_id===id(1)));
      assert.equal((await db.query('SELECT full_name FROM users WHERE id=$1',[id(1)])).rows[0].full_name,'Workflow customer');
    });
    await t.test('group details load every member and deny customers and other branches',async()=>{
      const path='/staff/bookings/'+saved.data.booking.id+'/group';
      members=(await f.request(path,{owner:90})).data.bookings;assert.equal(members.length,2);
      assert.ok(members.every(row=>row.groupId===saved.data.booking.groupId));
      assert.equal((await f.request(path,{owner:1})).status,403);
      assert.equal((await f.request(path,{owner:91})).status,404);
    });
    const cancel=()=>f.request('/staff/bookings/'+saved.data.booking.id+'/group/cancel',{owner:90,method:'PATCH',body:{reason:'Actual group cancellation'}});
    await t.test('a started member prevents cancellation of every member, without partial updates',async()=>{
      await db.query("UPDATE bookings SET status='CHECKED_IN' WHERE id=$1",[members[1].id]);
      assert.equal((await cancel()).status,409);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM bookings WHERE id=ANY($1::uuid[]) AND status='CANCELLED'",[members.map(m=>m.id)])).rows[0].n,0);
      await db.query("UPDATE bookings SET status='CONFIRMED' WHERE id=$1",[members[1].id]);
    });
    await t.test('all group reservations release together and retries do not duplicate audit events',async()=>{
      const result=await cancel();assert.equal(result.status,200,JSON.stringify(result));
      assert.equal(result.data.bookings.length,2);assert.ok(result.data.bookings.every(row=>row.status==='CANCELLED'));
      assert.equal((await cancel()).status,200);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_logs WHERE action='MINIAPP_GROUP_CANCEL'")).rows[0].n,2);
      const slots=await f.request('/staff/slots?'+new URLSearchParams({branchId:id(3),date:day,serviceId:id(5),people:'2'}),{owner:90});
      assert.equal(slots.data.slots.length,2);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_booking_group_members')).rows[0].n,2);
    });
  }finally{await f.close();}
});
