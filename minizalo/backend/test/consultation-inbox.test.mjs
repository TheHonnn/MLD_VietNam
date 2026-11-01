import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
test('consultation requests reach only the selected branch and retain a real staff reply',async t=>{
 const f=await staffFixture(),{id,db}=f;
 const body={branchId:id(3),name:'Actual contact',phone:'+84900000101',message:'Actual question'};
 const create=async()=>{const r=await fetch(f.base+'/api/consultations',{method:'POST',headers:{...f.headers(1),'Idempotency-Key':id(170)},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
 try{
  await t.test('invalid contacts and unverified accounts cannot create a request',async()=>{
   assert.equal((await f.request('/consultations',{method:'POST',body,anonymous:true})).status,401);
   for(const patch of [{phone:'abc'},{name:' '},{name:'bad\nname'},{branchId:id(199)},{message:42}])assert.ok((await f.request('/consultations',{method:'POST',body:{...body,...patch}})).status>=400);
   assert.equal((await f.request('/support-tickets',{method:'POST',body:{subject:'MINIAPP_CONSULTATION:'+id(104),message:'forged'}})).status,400);
  });
  const first=await create();assert.equal(first.status,201,JSON.stringify(first));const request=first.data.ticket;
  await t.test('retries keep one canonical row and owner sees the readable actual request',async()=>{
   assert.equal((await create()).data.ticket.id,request.id);
   assert.equal((await db.query('SELECT count(*)::int n FROM support_tickets')).rows[0].n,1);
   const own=(await f.request('/support-tickets')).data.tickets[0];assert.equal(own.subject,'Yêu cầu tư vấn');assert.equal(own.contactPhone,'0900000101');
   assert.equal((await f.request('/support-tickets',{owner:2})).data.tickets.length,0);
  });
  await t.test('staff branch and role scope apply to both list and mutations',async()=>{
   assert.equal((await f.request('/staff/consultations')).status,403);
   assert.equal((await f.request('/staff/consultations',{owner:91})).data.tickets.length,0);
   const list=await f.request('/staff/consultations?status=PENDING&limit=1',{owner:90});assert.equal(list.data.tickets[0].id,request.id);
   const patch={status:'RESOLVED',reply:'Real answer',expectedStatus:'PENDING',expectedReply:''};
   assert.equal((await f.request('/staff/consultations/'+request.id,{owner:91,method:'PATCH',body:patch})).status,404);
   assert.equal((await f.request('/staff/consultations/'+request.id,{method:'PATCH',body:patch})).status,403);
   const saved=await f.request('/staff/consultations/'+request.id,{owner:90,method:'PATCH',body:patch});assert.equal(saved.status,200,JSON.stringify(saved));
   assert.equal((await f.request('/staff/consultations/'+request.id,{owner:90,method:'PATCH',body:patch})).status,200);
   assert.equal((await db.query("SELECT count(*)::int n FROM audit_logs WHERE action='MINIAPP_CONSULTATION_REPLY'")).rows[0].n,1);
   assert.equal((await f.request('/support-tickets')).data.tickets[0].adminReply,'Real answer');
   assert.equal((await f.request('/staff/consultations/'+request.id,{owner:90,method:'PATCH',body:{...patch,reply:'Overwrite'}})).status,409);
  });
 }finally{await f.close();}
});
