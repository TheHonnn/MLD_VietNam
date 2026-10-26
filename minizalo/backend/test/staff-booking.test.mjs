import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
import {findZaloAccount} from '../dist/zalo-auth.js';
import {statements} from '../migrations/009_staff_booking.mjs';

test('staff booking keeps the actual customer, creator, branch and permissions separate',async t=>{
  const f=await staffFixture(),{id,db}=f;
  const read=(path,owner=90)=>f.request(path,{owner});
  const body={serviceId:id(5),branchId:id(3),date:'2099-01-12',timeSlot:'10:00 - 11:00',expectedFinalPrice:100000,customerId:id(1),customerPhone:'0900000001'};
  const post=async(input=body,key=id(990),owner=90)=>{
    const response=await fetch(f.base+'/api/staff/bookings',{method:'POST',headers:{...f.headers(owner),'Idempotency-Key':key},body:JSON.stringify(input)});
    return {status:response.status,...await response.json()};
  };
  let saved;
  try{
    await t.test('guests/customers cannot search or book as staff; branch access is checked on the server',async()=>{
      assert.equal((await f.request('/staff/context',{anonymous:true})).status,401);
      for(const path of ['/staff/context','/staff/customers?search=Workflow'])assert.equal((await read(path,1)).status,403);
      assert.equal((await post(body,id(991),1)).status,403);
      assert.equal((await post(body,id(992),91)).status,403);
      assert.equal((await post({...body,doctorId:id(7)},id(993))).status,400);
      const before=(await db.query('SELECT count(*)::int AS total FROM miniapp_staff_bookings')).rows[0].total;
      assert.equal(before,0);
    });
    await t.test('Zalo staff audience requires a pre-existing active staff profile, not customer signup',async()=>{
      const store={query:async q=>(await db.query(q.text,q.values)).rows};
      assert.deepEqual(await findZaloAccount(store,'0900000090','staff'),{userId:id(90),isNewUser:false});
      await assert.rejects(findZaloAccount(store,'0900000001','staff'),e=>e.status===403);
      await assert.rejects(findZaloAccount(store,'0900000090'),e=>e.status===403);
      assert.equal(await findZaloAccount(store,'0900000999','staff'),null);
    });
    await t.test('lookup is bounded, contains minimal fields and scopes names to the assigned branch',async()=>{
      assert.deepEqual((await read('/staff/customers?search=')).data.customers,[]);
      const result=await read('/staff/customers?search=Workflow');
      assert.equal(result.data.customers.length,1);
      assert.deepEqual(Object.keys(result.data.customers[0]).sort(),['fullName','id','phone']);
      assert.deepEqual((await read('/staff/customers?search=Workflow',91)).data.customers,[]);
      assert.equal((await read('/staff/customers?search=0900000002')).data.customers[0].id,id(2));
      assert.equal((await read('/staff/customers?search=Other%20customer')).data.customers[0].id,id(2));
      assert.deepEqual((await read('/staff/customers?search=0900000090')).data.customers,[]);
    });
    await t.test('existing customer booking auto assigns, persists creator and is replay-safe',async()=>{
      saved=await post();assert.equal(saved.status,201,JSON.stringify(saved));
      assert.equal(saved.data.booking.customerId,id(1));assert.equal(saved.data.booking.technicianId,id(7));
      const link=(await db.query('SELECT * FROM miniapp_staff_bookings WHERE booking_id=$1',[saved.data.booking.id])).rows[0];
      assert.equal(link.staff_id,id(90));assert.equal(link.branch_id,id(3));
      const repeated=await post();assert.equal(repeated.data.booking.id,saved.data.booking.id);
      assert.equal((await post({...body,customerId:id(2),customerPhone:'0900000002'})).status,409);
      assert.ok((await read('/bookings')).data.bookings.some(b=>b.id===saved.data.booking.id));
      assert.equal((await read('/bookings/'+saved.data.booking.id,91)).status,404);
      assert.equal((await read('/bookings/'+saved.data.booking.id,2)).status,404);
      assert.equal((await read('/bookings/'+saved.data.booking.id,1)).status,200);
    });
    await t.test('staff can reschedule and cancel for the customer without changing their identity',async()=>{
      const changed=await f.request('/bookings/'+saved.data.booking.id+'/reschedule',{owner:90,method:'PATCH',body:{date:'2099-01-14',timeSlot:'14:00 - 15:00'}});
      assert.equal(changed.status,200,JSON.stringify(changed));assert.equal(changed.data.booking.customerId,id(1));
      const cancelled=await f.request('/bookings/'+saved.data.booking.id+'/cancel',{owner:90,method:'PATCH',body:{reason:'Fixture cancellation'}});
      assert.equal(cancelled.status,200);assert.equal(cancelled.data.booking.cancelledById,id(90));
    });
    await t.test('new customer creation is atomic with booking and never overwrites returning customers',async()=>{
      const input={...body,customerId:undefined,customerPhone:undefined,customer:{name:'New fixture customer',phone:'0900000099'}};
      const created=await post(input,id(994));assert.equal(created.status,201,JSON.stringify(created));
      assert.notEqual(created.data.booking.customerId,id(90));assert.equal(created.data.booking.bookedForName,'New fixture customer');
      assert.equal((await post(input,id(994))).data.booking.id,created.data.booking.id);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM users WHERE phone='0900000099'")).rows[0].total,1);
      const old=await post({...input,date:'2099-01-14',timeSlot:'14:00 - 15:00',customer:{name:'Do not overwrite existing name',phone:'+84900000001'}},id(995));
      assert.equal(old.status,201,JSON.stringify(old));assert.equal(old.data.booking.customerId,id(1));assert.equal(old.data.booking.bookedForName,'Workflow customer');
      const failed=await post({...input,date:'2099-02-01',customer:{name:'Must roll back',phone:'0900000098'}},id(996));
      assert.equal(failed.status,409);assert.equal((await db.query("SELECT count(*)::int AS total FROM users WHERE phone='0900000098'")).rows[0].total,0);
      const mismatch=await post({...body,customerPhone:'0900000002'},id(997));assert.equal(mismatch.status,404);
    });
    await t.test('existing customers without a phone use a booking contact without overwriting their profile',async()=>{
      await db.query("INSERT INTO users(id,email,full_name,role,referral_code) VALUES($1,'no-phone@example.test','Customer without phone','CUSTOMER','NOPHONE94')",[id(94)]);
      const found=await read('/staff/customers?search=Customer%20without%20phone');
      assert.equal(found.data.customers[0].id,id(94));assert.equal(found.data.customers[0].phone,null);
      const created=await post({...body,date:f.day,timeSlot:'14:00 - 15:00',customerId:id(94),customerPhone:'0900000094'},id(999));
      assert.equal(created.status,201,JSON.stringify(created));
      assert.equal(created.data.booking.customerId,id(94));assert.equal(created.data.booking.bookedForPhone,'0900000094');
      assert.equal((await db.query('SELECT phone FROM users WHERE id=$1',[id(94)])).rows[0].phone,null);
    });
    await t.test('revoking a staff profile immediately removes access despite a valid JWT',async()=>{
      await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
      assert.equal((await read('/staff/context')).status,403);
      const personal=await read('/bookings');assert.equal(personal.status,200);assert.deepEqual(personal.data.bookings,[]);
      assert.equal((await post(body,id(998))).status,403);
    });
    await t.test('migration is repeatable and public roles cannot read the staff audit table',async()=>{
      const before=(await db.query('SELECT * FROM miniapp_staff_bookings ORDER BY booking_id')).rows;
      await db.exec(statements.join(';\n'));
      assert.deepEqual((await db.query('SELECT * FROM miniapp_staff_bookings ORDER BY booking_id')).rows,before);
      assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname='miniapp_staff_bookings'")).rows[0].relrowsecurity,true);
      assert.equal((await db.query("SELECT count(*)::int AS total FROM information_schema.table_privileges WHERE table_name='miniapp_staff_bookings' AND grantee IN ('PUBLIC','anon','authenticated')")).rows[0].total,0);
    });
  }finally{await f.close();}
});
