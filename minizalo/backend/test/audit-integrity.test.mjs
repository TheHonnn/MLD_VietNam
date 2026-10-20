import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Prisma} from '@prisma/client';
import {workflowFixture} from './fixtures/workflow.mjs';
import {configureWorkflows} from '../dist/configure-workflows.js';
import {statements} from '../migrations/007_audit_integrity.mjs';

test('audit integrity regressions never use the shared database',async t=>{
  const f=await workflowFixture();const {db,id,request}=f;
  const raw=async(path,body,{owner=1,key,contentType='application/json'}={})=>{
    const response=await fetch(f.base+'/api'+path,{method:'POST',headers:{...f.headers(owner),'Content-Type':contentType,...(key?{'Idempotency-Key':key}:{})},body:typeof body==='string'?body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  try{
    await t.test('survey requires explicit answers, not defaults or coerced booleans',async()=>{
      for(const body of [{},{pressurePref:'MEDIUM'},{pressurePref:'LIGHT',hasSensitiveSkin:false},{pressurePref:'STRONG',hasSensitiveSkin:'false',hasOilAllergy:false}])assert.equal((await request('/consultation-surveys',{method:'POST',body})).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM consultation_surveys')).rows[0].count,0);
      const body={pressurePref:'LIGHT',hasSensitiveSkin:false,hasOilAllergy:true};
      const saved=await request('/consultation-surveys',{method:'POST',body});assert.equal(saved.status,201);assert.equal(saved.data.survey.hasOilAllergy,true);assert.equal(saved.data.survey.hasSensitiveSkin,false);
    });
    await t.test('support rejects objects, arrays, nulls, blank and excessive text without inserting',async()=>{
      for(const body of [{subject:{a:1},message:{}},{subject:['a'],message:'message'},{subject:'Subject',message:null},{subject:'  ',message:'Text'},{subject:'Subject',message:'x'.repeat(10001)}])assert.equal((await raw('/support-tickets',body)).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM support_tickets')).rows[0].count,0);
    });
    await t.test('parser errors are accurate, sanitized and leave the server operational',async()=>{
      const large=await raw('/support-tickets',{subject:'Subject',message:'x'.repeat(1100000)});assert.equal(large.status,413);assert.match(large.message,/too large/i);
      const malformed=await raw('/support-tickets','{"subject":');assert.equal(malformed.status,400);assert.match(malformed.message,/JSON/);
      assert.equal((await raw('/support-tickets','{}',{contentType:'application/json; charset=iso-8859-1'})).status,415);
      assert.equal((await request('/support-tickets')).status,200);
      for(const body of [{subject:'Null character',message:'bad\u0000text'},{subject:'Broken Unicode',message:'\ud800'},{subject:'Broken Unicode',message:'\udc00'}])assert.equal((await raw('/support-tickets',body)).status,400);
      const valid=await raw('/support-tickets',{subject:'Valid Unicode',message:'Valid pair \ud83d\ude00'});assert.equal(valid.status,201);
    });
    await t.test('lost support responses replay the same row and keys are bound to owner and payload',async()=>{
      const key=id(900),body={subject:'Actual support request',message:'Please check my record'};
      const first=await raw('/support-tickets',body,{key});assert.equal(first.status,201);
      const retry=await raw('/support-tickets',body,{key:key.toUpperCase()});assert.equal(retry.status,201);assert.equal(retry.data.ticket.id,first.data.ticket.id);
      assert.equal((await raw('/support-tickets',{...body,message:'Different'},{key})).status,409);
      const other=await raw('/support-tickets',body,{key,owner:2});assert.equal(other.status,201);assert.notEqual(other.data.ticket.id,first.data.ticket.id);
      const intentional=await raw('/support-tickets',body,{key:id(901)});assert.equal(intentional.status,201);assert.notEqual(intentional.data.ticket.id,first.data.ticket.id);
      assert.equal((await raw('/support-tickets',body,{key:'bad-key'})).status,400);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM support_tickets')).rows[0].count,4);
    });
    await t.test('survey retries are idempotent without persisting private payload copies',async()=>{
      const key=id(902),body={pressurePref:'STRONG',hasSensitiveSkin:true,hasOilAllergy:false,medicalConditions:['Explicit condition']};
      const first=await raw('/consultation-surveys',body,{key});assert.equal(first.status,201);
      assert.equal((await raw('/consultation-surveys',body,{key})).data.survey.id,first.data.survey.id);
      assert.equal((await raw('/consultation-surveys',{...body,hasOilAllergy:true},{key})).status,409);
      const [stored]=(await db.query('SELECT * FROM miniapp_customer_requests WHERE request_key=$1',[key])).rows;
      assert.match(stored.payload_hash,/^[a-f0-9]{64}$/);assert.equal(Object.hasOwn(stored,'payload'),false);
    });
    await t.test('inactive course or category blocks every private learning operation consistently',async()=>{
      const started=await request(`/courses/${id(22)}/quiz/start`,{method:'POST',body:{quizId:id(26),enrollmentId:id(29)}});assert.equal(started.status,200);
      const attempt=started.data.attempt.id;
      for(const table of ['courses','course_categories']){
        const target=table==='courses'?id(22):id(20);
        await db.query(`UPDATE ${table} SET is_active=false WHERE id=$1`,[target]);
        const calls=[
          [`/courses/${id(22)}/learning?enrollmentId=${id(29)}`,{}],
          [`/courses/${id(22)}/quiz/start`,{method:'POST',body:{quizId:id(26),enrollmentId:id(29)}}],
          [`/courses/${id(22)}/quiz/draft`,{method:'PUT',body:{attemptId:attempt,enrollmentId:id(29),answers:{}}}],
          [`/courses/${id(22)}/quiz/submit`,{method:'POST',body:{attemptId:attempt,enrollmentId:id(29),answers:{[id(27)]:'A',[id(28)]:'B'}}}],
          [`/courses/${id(22)}/lessons/${id(25)}/progress`,{method:'POST',body:{enrollmentId:id(29),isCompleted:true}}],
          [`/courses/${id(22)}/lessons/${id(25)}/playback`,{method:'POST',body:{enrollmentId:id(29)}}],
          [`/courses/${id(22)}/lessons/${id(25)}/heartbeat`,{method:'POST',body:{enrollmentId:id(29),playbackId:id(903),position:1}}]
        ];
        for(const [path,options] of calls)assert.equal((await request(path,options)).status,404,path);
        await db.query(`UPDATE ${table} SET is_active=true WHERE id=$1`,[target]);
      }
      assert.equal((await db.query('SELECT count(*)::int AS count FROM miniapp_quiz_attempts')).rows[0].count,1);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM user_lesson_progress')).rows[0].count,0);
    });
    await t.test('unread filter finds older unread rows outside the first full inbox page',async()=>{
      await db.query("INSERT INTO users(id,phone,full_name,referral_code) VALUES($1,'0900000904','Isolated inbox owner','INBOX904')",[id(904)]);
      await db.query("INSERT INTO notifications(user_id,title,message,type,is_read,created_at) SELECT $1,'Read '||n,'Read','SYSTEM',true,'2026-01-02'::timestamptz FROM generate_series(1,50) n",[id(904)]);
      await db.query("INSERT INTO notifications(user_id,title,message,type,is_read,created_at) VALUES($1,'Old unread','Unread','SYSTEM',false,'2025-01-01')",[id(904)]);
      const all=await request('/notifications',{owner:904});assert.equal(all.data.notifications.filter(n=>!n.isRead).length,0);assert.ok(all.data.nextCursor);
      const unread=await request('/notifications?filter=unread',{owner:904});assert.equal(unread.status,200);assert.equal(unread.data.notifications.length,1);assert.equal(unread.data.notifications[0].title,'Old unread');assert.equal(unread.data.totalCount,51);assert.equal(unread.data.unreadCount,1);assert.equal(unread.data.nextCursor,null);
      assert.equal((await request('/notifications?filter=invalid',{owner:904})).status,400);
      for(const sequence of ['not-a-number','9999999999999999999','9'.repeat(50),-1,{invalid:true}]){
        await db.query("INSERT INTO notifications(user_id,title,message,type,data) VALUES($1,'Imported event','Imported','SYSTEM',$2::jsonb)",[id(904),JSON.stringify({eventSequence:sequence})]);
      }
      const imported=await request('/notifications?filter=unread',{owner:904});assert.equal(imported.status,200);assert.equal(imported.data.notifications.length,6);
    });
    await t.test('delivery and card data are absent until explicitly configured; cards never cross owners',async()=>{
      const store=client=>({query:async q=>(await client.query(q.text,q.values.map(v=>Prisma.Decimal.isDecimal(v)?v.toString():v))).rows,transaction:run=>client.transaction(tx=>run(store(tx)))});
      assert.equal((await request('/courses')).data.courses[0].deliveryFormat,null);
      assert.equal((await request('/membership')).data.membershipCard,null);
      const config={courseDelivery:[{courseId:id(22),deliveryFormat:'ONLINE'}],membershipCards:[{userId:id(1),cardCode:'ISSUED-FIXTURE-CARD',expiresAt:'2099-12-31T00:00:00.000Z'}]};
      await configureWorkflows(store(db),config,false);
      assert.equal((await request('/membership')).data.membershipCard,null);
      await db.transaction(tx=>configureWorkflows(store(tx),config,true));
      assert.equal((await request('/courses')).data.courses[0].deliveryFormat,'ONLINE');
      assert.equal((await request('/membership')).data.membershipCard.cardCode,'ISSUED-FIXTURE-CARD');
      assert.equal((await request('/membership',{owner:2})).data.membershipCard,null);
      await assert.rejects(configureWorkflows(store(db),{membershipCards:[{userId:id(2),cardCode:'ISSUED-FIXTURE-CARD'}]},true),/already assigned/);
      for(const patch of [{isActive:false},{expiresAt:'2000-01-01T00:00:00.000Z'}]){
        await configureWorkflows(store(db),{membershipCards:[{...config.membershipCards[0],...patch}]},true);
        assert.equal((await request('/membership')).data.membershipCard,null);
      }
      await assert.rejects(configureWorkflows(store(db),{courseDelivery:[{courseId:id(22),deliveryFormat:'FAKE'}]},true));
      await assert.rejects(configureWorkflows(store(db),{membershipCards:[{userId:id(999),cardCode:'NO-USER'}]},true));
    });
    await t.test('additive migration is repeatable and private tables have RLS with no PUBLIC grants',async()=>{
      await db.exec(statements.join(';\n'));
      const tables=['miniapp_customer_requests','miniapp_course_delivery','miniapp_membership_cards'];
      for(const table of tables){
        const [row]=(await db.query('SELECT relrowsecurity FROM pg_class WHERE relname=$1',[table])).rows;assert.equal(row.relrowsecurity,true);
        assert.equal((await db.query("SELECT count(*)::int AS count FROM information_schema.table_privileges WHERE table_name=$1 AND grantee='PUBLIC'",[table])).rows[0].count,0);
      }
      assert.equal((await db.query('SELECT count(*)::int AS count FROM support_tickets')).rows[0].count,4);
    });
  }finally{await f.close();}
});
