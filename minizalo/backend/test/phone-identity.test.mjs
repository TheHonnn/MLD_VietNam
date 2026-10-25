import {test} from 'node:test';
import assert from 'node:assert/strict';
import {staffFixture} from './fixtures/staff.mjs';
import {findZaloAccount} from '../dist/zalo-auth.js';
import {localPhone} from '../dist/phone-identity.js';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

test('phone identity accepts presentation separators but never guesses invalid numbers',()=>{
  for(const phone of ['0900 000 090','0900.000.090','+84 (900) 000-090','84900000090'])assert.equal(localPhone(phone),'0900000090');
  for(const phone of [null,123,'customer0900000090','0900000090 ext 2','++84900000090','900000090','x'.repeat(101)])assert.equal(localPhone(phone),null);
});

test('Mini App contact validation agrees with the server for Admin phone formats',async()=>{
  const source=await readFile(new URL('../../zalo_mini_app/my-app/src/utils/phone.ts',import.meta.url),'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}});
  const {contactPhone}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'));
  for(const value of [null,'','0900000090','0900 000 090','+84 (900) 000-090','0900.000.090','customer0900000090','0900000090 ext 2','++84900000090','900000090'])assert.equal(contactPhone(value),localPhone(value));
});

test('Admin formatted phones resolve the same staff and customers without changing canonical records',async()=>{
  const f=await staffFixture(),{db,id}=f;
  const store={query:async q=>(await db.query(q.text,q.values)).rows};
  try{
    for(const phone of ['0900 000 090','+84 (900) 000-090','0900.000.090']){
      await db.query('UPDATE users SET phone=$1 WHERE id=$2',[phone,id(90)]);
      assert.deepEqual(await findZaloAccount(store,'0900000090','staff'),{userId:id(90),isNewUser:false});
      assert.equal((await db.query('SELECT phone FROM users WHERE id=$1',[id(90)])).rows[0].phone,phone);
    }
    await db.query('UPDATE users SET phone=$1 WHERE id=$2',['0900 000 001',id(1)]);
    const found=await f.request('/staff/customers?search='+encodeURIComponent('+84 (900) 000-001'),{owner:90});
    assert.equal(found.status,200);assert.equal(found.data.customers[0].id,id(1));
    const body={serviceId:id(5),branchId:id(3),date:'2099-01-12',timeSlot:'10:00 - 11:00',expectedFinalPrice:100000,customer:{name:'Must not overwrite',phone:'0900.000.001'}};
    const booked=await f.request('/staff/bookings',{method:'POST',owner:90,body});
    assert.equal(booked.status,201,JSON.stringify(booked));assert.equal(booked.data.booking.customerId,id(1));
    assert.equal((await db.query('SELECT full_name FROM users WHERE id=$1',[id(1)])).rows[0].full_name,'Workflow customer');
    await db.query('UPDATE users SET phone=$1 WHERE id=$2',['+84 900 000 090',id(2)]);
    await assert.rejects(findZaloAccount(store,'0900000090','staff'),e=>e.status===409);
    await db.query('UPDATE users SET phone=$1 WHERE id=$2',['0900000002',id(2)]);
    await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
    await assert.rejects(findZaloAccount(store,'0900000090','staff'),e=>e.status===403);
    await assert.rejects(findZaloAccount(store,'0900000001','staff'),e=>e.status===403);
  }finally{await f.close();}
});
