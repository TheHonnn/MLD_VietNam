import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Prisma} from '@prisma/client';
import {workflowFixture} from './fixtures/workflow.mjs';
import {createApp} from '../dist/server.js';
import {once} from 'node:events';
import {statements as profileStatements} from '../migrations/006_customer_profile.mjs';

test('remaining audit regressions use isolated records only',async t=>{
  const f=await workflowFixture();const {db,id,request}=f;
  try {
    await t.test('invalid emergency contacts fail with 400 and never modify a profile',async()=>{
      for(const body of [{emergencyContactPhone:'abc'},{emergencyContactPhone:'1'.repeat(21)},{emergencyContactName:'N'.repeat(151)},{address:{}},{healthNotes:'x'.repeat(10001)}]) {
        const response=await request('/auth/profile',{method:'PUT',body});assert.equal(response.status,400,JSON.stringify(body).slice(0,100));
      }
      assert.equal((await db.query('SELECT count(*)::int AS count FROM miniapp_customer_profiles')).rows[0].count,0);
      assert.equal((await request('/auth/profile',{method:'PUT',body:[]})).status,400);
    });
    await t.test('blank email is null for multiple customers, never a conflicting empty string',async()=>{
      for(const owner of [1,2]) {
        assert.equal((await request('/auth/profile',{method:'PUT',owner,body:{email:'  '}})).status,200);
      }
      assert.equal((await db.query('SELECT count(*)::int AS count FROM users WHERE email IS NULL')).rows[0].count,2);
    });
    await t.test('birth date uses Vietnam calendar before 07:00 rather than the previous UTC day',async()=>{
      const now=Date.now;
      try {
        Date.now=()=>Date.UTC(2026,0,1,17,30);
        assert.equal((await request('/auth/profile',{method:'PUT',body:{dateOfBirth:'2026-01-02'}})).status,200);
        assert.equal((await request('/auth/profile',{method:'PUT',body:{dateOfBirth:'2026-01-03'}})).status,400);
      }finally{Date.now=now;}
    });
    await t.test('health and preferred branch persist, can clear, and cannot overwrite another customer',async()=>{
      const saved=await request('/auth/profile',{method:'PUT',body:{preferredBranch:id(3),skinType:'Sensitive',healthNotes:'Actual customer note',emergencyContactPhone:'0900000004',userId:id(2)}});
      assert.equal(saved.status,200);assert.equal(saved.data.user.preferredBranch,id(3));assert.equal(saved.data.user.skinType,'Sensitive');
      assert.equal((await request('/membership')).data.user.healthNotes,'Actual customer note');
      assert.equal((await request('/membership',{owner:2})).data.user.healthNotes,'');
      const partial=await request('/auth/profile',{method:'PUT',body:{address:'New address'}});
      assert.equal(partial.data.user.healthNotes,'Actual customer note');
      assert.equal((await request('/auth/profile',{method:'PUT',body:{preferredBranch:id(999)}})).status,400);
      const cleared=await request('/auth/profile',{method:'PUT',body:{preferredBranch:'',skinType:'',healthNotes:''}});
      assert.equal(cleared.status,200);assert.equal(cleared.data.user.preferredBranch,null);assert.equal(cleared.data.user.healthNotes,'');
    });
    await t.test('microsecond keyset pages preserve every record and owner boundary',async()=>{
      for(let n=0;n<105;n++)await db.query('INSERT INTO support_tickets(customer_id,subject,message,created_at) VALUES($1,$2,$3,$4)',[id(1),`Ticket ${n}`,'Real fixture message','2026-10-19T00:00:00.123456Z']);
      await db.query('INSERT INTO support_tickets(customer_id,subject,message) VALUES($1,$2,$3)',[id(2),'Private other customer','Private']);
      const first=await request('/support-tickets');assert.equal(first.data.tickets.length,100);assert.ok(first.data.nextCursor);
      const next=await request('/support-tickets?cursor='+encodeURIComponent(first.data.nextCursor));assert.equal(next.data.tickets.length,5);assert.equal(next.data.nextCursor,null);
      assert.equal(new Set([...first.data.tickets,...next.data.tickets].map(row=>row.id)).size,105);
      assert.ok([...first.data.tickets,...next.data.tickets].every(row=>row.customerId===id(1)));
      assert.equal((await request('/support-tickets?limit=0')).status,400);
      assert.equal((await request('/support-tickets?cursor=bad')).status,400);
      for(const cursor of [{time:['2026-10-19T00:00:00.000000Z'],id:id(1)}, {time:'2026-02-31T00:00:00.000000Z',id:id(1)}]) {
        const encoded=encodeURIComponent(Buffer.from(JSON.stringify(cursor)).toString('base64url'));
        assert.equal((await request('/support-tickets?cursor='+encoded)).status,400);
        assert.equal((await request('/notifications?cursor='+encoded)).status,400);
      }
      assert.equal((await request('/bookings?limit=1')).data.bookings.length,1);
    });
    await t.test('catalog uses five queries independent of course count and keeps paid lesson media private',async()=>{
      for(let n=100;n<110;n++)await db.query("INSERT INTO courses(id,category_id,title,code,short_description,full_description,image_url) VALUES($1,$2,$3,$4,$5,$6,'')",[id(n),id(20),`Course ${n}`,`WF${n}`,'','']);
      let queries=0;
      const store={query:async q=>{queries++;return(await db.query(q.text,q.values.map(v=>Prisma.Decimal.isDecimal(v)?v.toString():v))).rows;},transaction:run=>run(store)};
      const server=createApp(store,{jwtSecret:'isolated-catalog-test'}).listen(0,'127.0.0.1');await once(server,'listening');
      try {
        const response=await fetch(`http://127.0.0.1:${server.address().port}/api/courses`);const body=await response.json();
        assert.equal(response.status,200);assert.equal(body.data.courses.length,11);assert.equal(queries,5);
        const course=body.data.courses.find(course=>course.id===id(22));assert.equal(course.lessons.length,3);assert.ok(course.lessons.every(lesson=>lesson.contentText===null&&lesson.videoUrl===null));
        assert.equal(body.data.courses.find(course=>course.id===id(100)).lessons.length,0);
      }finally{await new Promise(resolve=>server.close(resolve));}
    });
    await t.test('profile migration is repeatable and denies direct public-role access',async()=>{
      const before=(await db.query('SELECT count(*)::int AS count FROM users')).rows[0].count;
      await db.exec('CREATE ROLE anon; GRANT SELECT ON miniapp_customer_profiles TO anon');
      await db.exec(profileStatements.join(';\n'));
      assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='miniapp_customer_profiles'::regclass")).rows[0].relrowsecurity,true);
      assert.equal((await db.query("SELECT has_table_privilege('anon','miniapp_customer_profiles','SELECT') AS allowed")).rows[0].allowed,false);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM users')).rows[0].count,before);
    });
  }finally{await f.close();}
});
