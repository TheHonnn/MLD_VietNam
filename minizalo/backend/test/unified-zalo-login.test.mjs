import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Prisma} from '@prisma/client';
import {staffFixture} from './fixtures/staff.mjs';
import {createApp} from '../dist/server.js';

test('one Zalo login identifies the real account without requiring an operational employee profile',async()=>{
  const f=await staffFixture(),{db,id}=f;
  const store=client=>({query:async q=>(await client.query(q.text,q.values.map(value=>Prisma.Decimal.isDecimal(value)?value.toString():value))).rows,transaction:run=>client.transaction(tx=>run(store(tx)))});
  let phone='84900000090';
  const server=createApp(store(db),{jwtSecret:'unified-login-fixture-secret',zaloAppId:'123456789',zaloAppSecret:'fixture-secret',fetch:async()=>Response.json({error:0,data:{number:phone}})}).listen(0,'127.0.0.1');
  await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api`;
  const login=async(extra={})=>{const response=await fetch(base+'/auth/zalo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:'fixture-access',phoneToken:'fixture-phone',...extra})});return {status:response.status,...await response.json()};};
  const request=async(token,path,body)=>{const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,...await response.json()};};
  try{
    const health=await (await fetch(base+'/health')).json();
    for(const feature of ['unified-zalo-login-v1','personal-booking-resources-v1','portal-content-v1'])assert.ok(health.data.features.includes(feature));
    const before=(await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n;
    await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
    const signed=await login({audience:'customer',role:'SUPER_ADMIN',staffAccess:true,userId:id(92)});
    assert.equal(signed.status,200,JSON.stringify(signed));assert.equal(signed.data.user.id,id(90));assert.equal(signed.data.user.role,'RECEPTIONIST');assert.equal(signed.data.user.staffAccess,false);
    const token=signed.data.token;
    assert.equal((await request(token,'/auth/me')).status,200);
    assert.equal((await request(token,'/staff/context')).status,403);
    assert.equal((await request(token,'/staff/customers?search=Workflow')).status,403);
    const booking=await request(token,'/bookings',{serviceId:id(5),branchId:id(3),date:f.day,timeSlot:'14:00 - 15:00',people:1,expectedFinalPrice:100000,bookedForName:'Personal recipient',bookedForPhone:'0900000090'});
    assert.equal(booking.status,201,JSON.stringify(booking));assert.equal(booking.data.booking.customerId,id(90));
    const own=await request(token,'/bookings');assert.ok(own.data.bookings.every(item=>item.customerId===id(90)));
    assert.equal((await request(token,'/bookings/'+id(11))).status,404);
    assert.equal((await request(token,'/staff/bookings',{serviceId:id(5),customerId:id(1)})).status,403);
    await db.query('UPDATE branches SET is_active=false WHERE id=$1',[id(3)]);
    assert.equal((await login({audience:'staff'})).status,200);
    await db.query('UPDATE users SET is_active=false WHERE id=$1',[id(90)]);
    assert.equal((await login()).status,401);
    phone='84900000001';
    const customer=await login({audience:'staff',role:'ADMIN'});assert.equal(customer.status,200);assert.equal(customer.data.user.role,'CUSTOMER');
    assert.equal((await request(customer.data.token,'/staff/context')).status,403);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,before);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_staff_bookings')).rows[0].n,0);
  }finally{await new Promise(resolve=>server.close(resolve));await f.close();}
});
