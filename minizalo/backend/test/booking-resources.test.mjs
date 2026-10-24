import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
import {statements} from '../migrations/010_booking_resources.mjs';
import {validateSharedSchema} from '../dist/store.js';

test('group booking reserves actual beds and specialists atomically',async t=>{
  const f=await staffFixture(),{db,id,day}=f;
  const input={serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',customerId:id(1),customerPhone:'0900000001',people:2,expectedFinalPrice:200000};
  const slots=async(people=2)=>f.request('/staff/slots?'+new URLSearchParams({branchId:id(3),date:day,serviceId:id(5),people:String(people)}),{owner:90});
  const post=async(body=input,key=id(950))=>{
    const response=await fetch(f.base+'/api/staff/bookings',{method:'POST',headers:{...f.headers(90),'Idempotency-Key':key},body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  try{
    await db.query("INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES($1,$2,'Second fixture specialist','')",[id(93),id(3)]);
    await db.query('INSERT INTO miniapp_technician_services(technician_id,service_id) VALUES($1,$2)',[id(93),id(5)]);
    await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,$3::date,'14:00','16:00')",[id(93),id(3),day]);
    await t.test('availability counts unique specialists and actual treatment beds, not classroom seats',async()=>{
      assert.equal((await slots()).data.slots.length,2);
      assert.equal((await slots(3)).data.slots.length,0);
      const dates=await f.request('/staff/slots/dates?'+new URLSearchParams({branchId:id(3),date:day,throughDate:day,serviceId:id(5),people:'2'}),{owner:90});
      assert.deepEqual(dates.data.dates,[day]);
      await db.query('UPDATE branch_rooms SET is_available=false WHERE id=$1',[id(8)]);
      assert.equal((await slots(1)).data.slots.length,0);
      await db.query('UPDATE branch_rooms SET is_available=true,bed_capacity=1 WHERE id=$1',[id(8)]);
      assert.equal((await slots()).data.slots.length,0);
      assert.equal((await slots(1)).data.slots.length,2);
      await db.query('UPDATE branch_rooms SET bed_capacity=2 WHERE id=$1',[id(8)]);
    });
    await t.test('insufficient specialists or beds rolls back even after allocating the first group member',async()=>{
      await db.query('UPDATE technicians SET is_active=false WHERE id=$1',[id(93)]);
      assert.equal((await post(input,id(954))).status,409);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_booking_beds')).rows[0].total,0);
      await db.query('UPDATE technicians SET is_active=true WHERE id=$1',[id(93)]);
      await db.query('UPDATE branch_rooms SET bed_capacity=1 WHERE id=$1',[id(8)]);
      assert.equal((await post(input,id(955))).status,409);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_booking_beds')).rows[0].total,0);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM technician_slots WHERE slot_date=$1::date AND status='AVAILABLE'",[day])).rows[0].total,2);
      await db.query('UPDATE branch_rooms SET bed_capacity=2 WHERE id=$1',[id(8)]);
    });
    let result;
    await t.test('a group gets separate appointments, beds and specialists under one real customer',async()=>{
      result=await post();assert.equal(result.status,201,JSON.stringify(result));
      assert.equal(result.data.booking.groupSize,2);
      const rows=(await db.query('SELECT b.*,bb.bed_number,gm.group_id FROM bookings b JOIN miniapp_booking_beds bb ON bb.booking_id=b.id JOIN miniapp_booking_group_members gm ON gm.booking_id=b.id WHERE gm.group_id=$1',[result.data.booking.groupId])).rows;
      assert.equal(rows.length,2);assert.equal(new Set(rows.map(row=>row.technician_id)).size,2);
      assert.equal(new Set(rows.map(row=>row.bed_number)).size,2);
      assert.ok(rows.every(row=>row.customer_id===id(1)&&Number(row.final_price)===100000&&row.assigned_room_id===id(8)&&row.assigned_bed_number===String(row.bed_number)));
      assert.equal((await post()).data.booking.id,result.data.booking.id);
      assert.equal((await slots(1)).data.slots.length,0);
    });
    await t.test('over-capacity requests roll back all group rows and any new customer',async()=>{
      const failed=await post({...input,customerId:undefined,customerPhone:undefined,customer:{name:'No orphan customer',phone:'0900000097'}},id(951));
      assert.equal(failed.status,409);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM users WHERE phone='0900000097'")).rows[0].total,0);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_booking_beds')).rows[0].total,2);
    });
    await t.test('shared writers cannot overlap a specialist or exceed protected branch capacity',async()=>{
      await assert.rejects(db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,technician_id,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('OVERLAP-OTHER-WRITER',$1,$2,$3,$4::date,'14:00','15:00',100000,100000,'OVERLAP-QR')",[id(2),id(3),id(7),day]),error=>error.code==='23P01');
      await assert.rejects(db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('OVER-CAPACITY-OTHER-WRITER',$1,$2,$3::date,'14:00','15:00',100000,100000,'CAPACITY-QR')",[id(2),id(3),day]),error=>error.code==='23P01');
    });
    await t.test('cancellation frees only that guest and another group member remains reserved',async()=>{
      const cancelled=await f.request('/bookings/'+result.data.booking.id+'/cancel',{owner:90,method:'PATCH',body:{reason:'Fixture cancellation'}});
      assert.equal(cancelled.status,200,JSON.stringify(cancelled));
      assert.equal((await slots(1)).data.slots.length,1);assert.equal((await slots(2)).data.slots.length,0);
    });
    await t.test('invalid counts cannot bypass group rules or consume one personal package for a group',async()=>{
      for(const people of [0,-1,21,1.5,'2',null])assert.equal((await post({...input,people},id(952))).status,400);
      assert.equal((await post({...input,userPackageId:id(10)},id(953))).status,400);
      assert.equal((await f.request('/staff/slots?'+new URLSearchParams({branchId:id(3),date:day,serviceId:id(5),people:'0'}),{owner:90})).status,400);
    });
    await t.test('additive resource migration is repeatable and direct public reads are denied',async()=>{
      await db.exec(statements.join(';\n'));
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_booking_beds')).rows[0].total,2);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM information_schema.table_privileges WHERE table_name IN ('miniapp_booking_beds','miniapp_booking_group_members') AND grantee IN ('PUBLIC','anon','authenticated')")).rows[0].total,0);
      const store={query:async sql=>(await db.query(sql.text,sql.values)).rows};
      await validateSharedSchema(store);
      await db.exec('ALTER TABLE bookings DISABLE TRIGGER trg_miniapp_booking_resources');
      await assert.rejects(validateSharedSchema(store),/miniapp_booking_resources_v3 required/);
      await db.exec('ALTER TABLE bookings ENABLE TRIGGER trg_miniapp_booking_resources');
      await validateSharedSchema(store);
    });
  }finally{await f.close();}
});

test('Admin canonical bed assignments and Mini App links protect the same physical bed',async()=>{
  const f=await staffFixture(),{db,id,day}=f;
  const insert=(code,bed)=>db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,assigned_room_id,assigned_bed_number,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES($1,$2,$3,$4,$5,$6::date,'14:00','15:00',100000,100000,$1)",[code,id(2),id(3),id(8),bed,day]);
  try{
    await db.query('UPDATE branch_rooms SET bed_capacity=2 WHERE id=$1',[id(8)]);
    await insert('ADMIN-EXISTING-BED','02');
    const saved=await f.request('/staff/bookings',{owner:90,method:'POST',body:{serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',customerId:id(1),customerPhone:'0900000001',expectedFinalPrice:100000}});
    assert.equal(saved.status,201,JSON.stringify(saved));
    const mapped=(await db.query('SELECT b.assigned_bed_number,bb.bed_number FROM bookings b JOIN miniapp_booking_beds bb ON bb.booking_id=b.id WHERE b.id=$1',[saved.data.booking.id])).rows[0];
    assert.equal(mapped.bed_number,1);assert.equal(mapped.assigned_bed_number,'1');
    await db.query('UPDATE branch_rooms SET bed_capacity=3 WHERE id=$1',[id(8)]);
    await assert.rejects(insert('ADMIN-DUPLICATE-MINIAPP','01'),error=>error.code==='23P01');
    await assert.rejects(insert('ADMIN-DUPLICATE-ADMIN','2'),error=>error.code==='23P01');
    await assert.rejects(insert('ADMIN-AMBIGUOUS-BED','BED-ALPHA'),error=>error.code==='23P01');
    await assert.rejects(insert('ADMIN-INVALID-BED','4'),error=>error.code==='23P01');
    await assert.rejects(db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,technician_id,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('CROSS-BRANCH-TECHNICIAN',$1,$2,$3,$4::date,'14:00','15:00',100000,100000,'CROSS-BRANCH-TECHNICIAN')",[id(2),id(104),id(7),day]),error=>error.code==='23P01');
    await assert.rejects(db.query("UPDATE bookings SET assigned_bed_number='2' WHERE id=$1",[saved.data.booking.id]),error=>error.code==='23P01');
    await assert.rejects(db.query("UPDATE bookings SET assigned_bed_number='NOT-A-MAPPED-BED' WHERE id=$1",[saved.data.booking.id]),error=>error.code==='23P01');
    await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,$3::date,'15:00','16:00')",[id(7),id(3),day]);
    const moved=await f.request('/bookings/'+saved.data.booking.id+'/reschedule',{owner:90,method:'PATCH',body:{date:day,timeSlot:'15:00 - 16:00'}});
    assert.equal(moved.status,200,JSON.stringify(moved));
    const after=(await db.query('SELECT b.assigned_bed_number,bb.bed_number FROM bookings b JOIN miniapp_booking_beds bb ON bb.booking_id=b.id WHERE b.id=$1',[saved.data.booking.id])).rows[0];
    assert.equal(after.assigned_bed_number,String(after.bed_number));
  }finally{await f.close();}
});

test('ambiguous named Admin beds close that room instead of guessing a physical number',async()=>{
  const f=await staffFixture(),{db,id,day}=f;
  try{
    await db.query('UPDATE branch_rooms SET bed_capacity=3 WHERE id=$1',[id(8)]);
    await db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,assigned_room_id,assigned_bed_number,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES('NAMED-ADMIN-BED',$1,$2,$3,'BED-ALPHA',$4::date,'14:00','15:00',100000,100000,'NAMED-ADMIN-BED')",[id(2),id(3),id(8),day]);
    const result=await f.request('/staff/slots?'+new URLSearchParams({branchId:id(3),date:day,serviceId:id(5),people:'1'}),{owner:90});
    assert.equal(result.status,200);assert.equal(result.data.slots.length,0);
  }finally{await f.close();}
});

test('consecutive short Admin bookings do not falsely reject another bed for one longer session',async()=>{
  const f=await staffFixture(),{db,id,day}=f;
  try{
    await db.query('UPDATE branch_rooms SET bed_capacity=2 WHERE id=$1',[id(8)]);
    for(const [index,start,end] of [[1,'14:00','14:30'],[2,'14:30','15:00']]){
      await db.query("INSERT INTO bookings(booking_code,customer_id,branch_id,assigned_room_id,assigned_bed_number,booking_date,start_time,end_time,base_total,final_price,qr_code_hash) VALUES($1,$2,$3,$4,'2',$5::date,$6::time,$7::time,100000,100000,$1)",['SHORT-ADMIN-'+index,id(2),id(3),id(8),day,start,end]);
    }
    const saved=await f.request('/staff/bookings',{owner:90,method:'POST',body:{serviceId:id(5),branchId:id(3),date:day,timeSlot:'14:00 - 15:00',customerId:id(1),customerPhone:'0900000001',expectedFinalPrice:100000}});
    assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(saved.data.booking.bedNumber,'1');
  }finally{await f.close();}
});
