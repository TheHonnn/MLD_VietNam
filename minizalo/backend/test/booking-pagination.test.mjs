import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
test('booking filters are applied before pagination with explicit personal ownership',async t=>{
 const f=await staffFixture(),{id,db}=f;
 try{
  for(let n=0;n<16;n++){
   await db.query("INSERT INTO bookings(id,booking_code,customer_id,branch_id,booking_date,start_time,end_time,status,base_total,final_price,qr_code_hash,booked_for_name,booked_for_phone) VALUES($1,$2,$3,$4,'2099-04-01'::date+$5::int,'08:00','09:00',$6::booking_status,100000,100000,$2,'Nguyễn Văn An','0900 000 101')",[id(200+n),'PAGE-'+n,id(1),id(3),n,n%2?'COMPLETED':'PENDING']);
   await db.query('INSERT INTO booking_items(booking_id,service_id,price,duration_minutes) VALUES($1,$2,100000,60)',[id(200+n),id(5)]);
  }
  const params=new URLSearchParams({scope:'personal',limit:'3',search:'nguyen van an',tab:'upcoming',serviceId:id(5)});
  await t.test('all matching pages have no gaps, duplicates or completed rows',async()=>{
   const ids=[];let cursor;
   do{if(cursor)params.set('cursor',cursor);const result=await f.request('/bookings?'+params);assert.equal(result.status,200,JSON.stringify(result));assert.ok(result.data.bookings.length<=3);assert.ok(result.data.bookings.every(b=>b.status==='PENDING'));ids.push(...result.data.bookings.map(b=>b.id));cursor=result.data.nextCursor;}while(cursor);
   assert.equal(ids.length,8);assert.equal(new Set(ids).size,8);params.delete('cursor');
  });
  await t.test('phones, dates, invalid input and another account cannot bypass filters or ownership',async()=>{
   params.set('search','+84 900 000 101');assert.equal((await f.request('/bookings?'+params)).data.bookings.length,3);
   assert.equal((await f.request('/bookings?'+params,{owner:2})).data.bookings.length,0);
   params.set('from','2099-04-10');assert.equal((await f.request('/bookings?'+params)).data.bookings.length,3);
   params.set('to','2099-04-01');assert.equal((await f.request('/bookings?'+params)).status,400);
   assert.equal((await f.request('/bookings?scope=personal&tab=injected')).status,400);
   assert.equal((await f.request('/bookings?scope=personal&search=%25')).data.bookings.length,0);
   assert.equal((await f.request('/bookings/'+id(200)+'?scope=personal',{owner:90})).status,404);
   assert.equal((await f.request('/bookings/'+id(200)+'?scope=work',{owner:90})).status,200);
  });
 }finally{await f.close();}
});
