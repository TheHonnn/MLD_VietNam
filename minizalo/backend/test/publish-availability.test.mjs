import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishAvailability} from '../dist/publish-availability.js';
import {workflowFixture} from './fixtures/workflow.mjs';

test('operator availability publication is additive, repeatable and bookable',async t=>{
  const f=await workflowFixture(),{db,id,request}=f;
  const store=client=>({query:async q=>(await client.query(q.text,q.values)).rows});
  const run=(plan,apply=false)=>db.transaction(tx=>publishAvailability(store(tx),plan,apply));
  const window={technicianId:id(7),branchId:id(3),serviceIds:[id(5)],startTime:'09:00',endTime:'12:00'};
  const plan={startDate:'2099-02-01',endDate:'2099-02-02',intervalMinutes:30,windows:[window]};
  const count=async table=>(await db.query(`SELECT count(*)::int AS total FROM ${table}`)).rows[0].total;
  try{
    await t.test('dry run never inserts or modifies existing business data',async()=>{
      const before={slots:await count('technician_slots'),shifts:await count('technician_shifts'),bookings:await count('bookings')};
      const dry=await run(plan);
      assert.equal(dry.slotsAdded,10);assert.equal(dry.shiftsAdded,2);
      assert.deepEqual({slots:await count('technician_slots'),shifts:await count('technician_shifts'),bookings:await count('bookings')},before);
    });
    await t.test('publication produces real days/times, preserving every pre-existing row',async()=>{
      const old=(await db.query('SELECT * FROM technician_slots ORDER BY id')).rows;
      const saved=await run(plan,true);
      assert.equal(saved.slotsAdded,10);assert.equal(saved.shiftsAdded,2);
      for(const row of old)assert.deepEqual((await db.query('SELECT * FROM technician_slots WHERE id=$1',[row.id])).rows[0],row);
      const dates=await request(`/slots/dates?branchId=${id(3)}&serviceId=${id(5)}&date=2099-02-01&throughDate=2099-02-02`,{anonymous:true});
      assert.deepEqual(dates.data.dates,['2099-02-01','2099-02-02']);
      const slots=await request(`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-02-01`,{anonymous:true});
      assert.equal(slots.data.slots.length,5);
      assert.equal(slots.data.slots[0].startTime,'09:00:00');assert.equal(slots.data.slots[0].endTime,'10:00:00');
      const repeat=await run(plan,true);
      assert.equal(repeat.slotsAdded,0);assert.equal(repeat.shiftsAdded,0);assert.equal(repeat.assignmentsAdded,0);
    });
    await t.test('a persisted booking excludes every overlapping published start',async()=>{
      const saved=await request('/bookings',{method:'POST',body:{serviceId:id(5),branchId:id(3),date:'2099-02-01',timeSlot:'09:00 - 10:00',expectedFinalPrice:100000}});
      assert.equal(saved.status,201,JSON.stringify(saved));
      const slots=await request(`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-02-01`,{anonymous:true});
      assert.deepEqual(slots.data.slots.map(row=>row.startTime),['10:00:00','10:30:00','11:00:00']);
      const before=(await db.query('SELECT * FROM bookings WHERE id=$1',[saved.data.booking.id])).rows;
      await run(plan,true);
      assert.deepEqual((await db.query('SELECT * FROM bookings WHERE id=$1',[saved.data.booking.id])).rows,before);
    });
    await t.test('bad plans roll back, and cancelled/overlapping shifts are not changed',async()=>{
      const total=await count('technician_slots');
      for(const invalid of [{...plan,startDate:'2020-01-01'},{...plan,intervalMinutes:0},{...plan,windows:[{...window,startTime:'01:00'}]},{...plan,windows:[{...window,branchId:id(99)}]},{...plan,windows:[window,window]}])await assert.rejects(run(invalid,true));
      assert.equal(await count('technician_slots'),total);
      await db.query("INSERT INTO technician_shifts(technician_id,branch_id,shift_date,start_time,end_time,is_cancelled) VALUES($1,$2,'2099-02-03','09:00','12:00',true)",[id(7),id(3)]);
      const result=await run({...plan,startDate:'2099-02-03',endDate:'2099-02-03'},true);
      assert.equal(result.slotsAdded,0);assert.equal(result.skipped[0].reason,'EXISTING_SHIFT');
      assert.equal((await db.query("SELECT count(*)::int AS total FROM technician_shifts WHERE is_cancelled")).rows[0].total,1);
    });
    await t.test('later admin shift cancellation or shortening removes slots and blocks reservation',async()=>{
      const path=`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-02-02`;
      await db.query("UPDATE technician_shifts SET is_cancelled=true WHERE shift_date='2099-02-02'");
      assert.deepEqual((await request(path,{anonymous:true})).data.slots,[]);
      const attempt=await request('/bookings',{method:'POST',body:{serviceId:id(5),branchId:id(3),date:'2099-02-02',timeSlot:'09:00 - 10:00',expectedFinalPrice:100000}});
      assert.equal(attempt.status,409);
      await db.query("UPDATE technician_shifts SET is_cancelled=false,end_time='10:00' WHERE shift_date='2099-02-02'");
      assert.deepEqual((await request(path,{anonymous:true})).data.slots.map(s=>s.startTime),['09:00:00']);
    });
    await t.test('approved staff leave and inactive assignments cannot be overridden',async()=>{
      await db.query("INSERT INTO staff_profiles(id,user_id,branch_id,employee_code,position) VALUES($1,$2,$3,'AVAILABILITY-STAFF','Fixture specialist')",[id(91),id(1),id(3)]);
      await db.query('UPDATE technicians SET staff_profile_id=$1 WHERE id=$2',[id(91),id(7)]);
      await db.query("INSERT INTO staff_leaves(staff_id,start_date,end_date,reason,status) VALUES($1,'2099-02-04','2099-02-04','Fixture approved leave','APPROVED')",[id(91)]);
      await db.query("INSERT INTO staff_leaves(staff_id,start_date,end_date,reason,status) VALUES($1,'2099-02-02','2099-02-02','Fixture later leave','APPROVED')",[id(91)]);
      assert.deepEqual((await request(`/slots?branchId=${id(3)}&serviceId=${id(5)}&date=2099-02-02`,{anonymous:true})).data.slots,[]);
      const leave=await run({...plan,startDate:'2099-02-04',endDate:'2099-02-04'},true);
      assert.equal(leave.slotsAdded,0);assert.equal(leave.skipped[0].reason,'APPROVED_LEAVE');
      await db.query('UPDATE miniapp_technician_services SET is_active=false WHERE technician_id=$1 AND service_id=$2',[id(7),id(5)]);
      await assert.rejects(run({...plan,startDate:'2099-02-05',endDate:'2099-02-05'},true),/inactive service assignments/);
      assert.equal((await db.query('SELECT is_active FROM miniapp_technician_services WHERE technician_id=$1 AND service_id=$2',[id(7),id(5)])).rows[0].is_active,false);
    });
  }finally{await f.close();}
});
