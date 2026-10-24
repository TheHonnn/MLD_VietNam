import {test} from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {staffFixture} from './fixtures/staff.mjs';
import {accountSession} from '../dist/account-sessions.js';
import {statements} from '../migrations/014_account_sessions.mjs';

test('account sessions support another device, owner-only revocation and legacy token invalidation',async t=>{
  const f=await staffFixture(),{db,id}=f,secret='isolated-workflow-audit-secret';
  const token=(owner,n,extra={})=>jwt.sign({...extra},secret,{subject:id(owner),jwtid:id(n),expiresIn:'8h'});
  const a=token(90,801),b=token(90,802),other=token(91,803),unseen=token(90,804);
  const call=async(auth,path,method='GET',agent='Zalo iPhone')=>{
    const response=await fetch(f.base+'/api'+path,{method,headers:{Authorization:'Bearer '+auth,'User-Agent':agent}});
    return {status:response.status,...await response.json()};
  };
  try{
    let sessionA,sessionB;
    await t.test('two real signed sessions share business identity but never expose tokens or device fingerprints',async()=>{
      const first=await call(a,'/auth/sessions');assert.equal(first.status,200,JSON.stringify(first));sessionA=first.data.sessions[0].id;
      assert.equal(first.data.sessions[0].deviceLabel,'Zalo - iPhone');assert.equal(first.data.sessions[0].isCurrent,true);
      const second=await call(b,'/auth/sessions','GET','Zalo Android');assert.equal(second.data.sessions.length,2);sessionB=second.data.sessions.find(row=>row.isCurrent).id;
      assert.notEqual(sessionA,sessionB);assert.equal(second.data.sessions.find(row=>row.id===sessionA).isCurrent,false);
      assert.equal(JSON.stringify(second).includes(a),false);assert.equal(JSON.stringify(second).includes('tokenHash'),false);
      assert.deepEqual(Object.keys(first.data.sessions[0]).sort(),['createdAt','deviceLabel','expiresAt','id','isCurrent','lastSeenAt']);
    });
    await t.test('another account cannot list or revoke an employee session',async()=>{
      assert.equal((await call(other,'/auth/sessions/'+sessionA+'/revoke','POST')).status,404);
      const privateList=await call(other,'/auth/sessions');assert.ok(privateList.data.sessions.every(row=>row.id!==sessionA&&row.id!==sessionB));
      assert.equal((await call(a,'/auth/sessions/not-an-id/revoke','POST')).status,400);
    });
    await t.test('single-device revocation is repeatable and blocks every subsequent private request',async()=>{
      assert.equal((await call(b,'/auth/sessions/'+sessionA+'/revoke','POST')).status,200);
      assert.equal((await call(b,'/auth/sessions/'+sessionA+'/revoke','POST')).status,200);
      for(const [path,method] of [['/auth/me','GET'],['/notifications','GET'],['/staff/bookings','POST']])assert.equal((await call(a,path,method)).status,401);
      assert.equal((await call(b,'/auth/me')).data.user.id,id(90));
    });
    await t.test('revoke others also blocks an older signed token never seen by the new backend',async()=>{
      assert.equal((await call(b,'/auth/sessions/revoke-others','POST')).status,200);
      assert.equal((await call(unseen,'/auth/me')).status,401);
      assert.equal((await call(b,'/auth/sessions')).data.sessions.length,1);
      const fresh=token(90,805),payload=jwt.decode(fresh);
      const store=client=>({query:async q=>(await client.query(q.text,q.values)).rows,transaction:run=>client.transaction(tx=>run(store(tx)))});
      await accountSession(store(db),id(90),fresh,payload,'Zalo Android',true);
      assert.equal((await call(fresh,'/auth/me')).status,200);
      assert.equal((await call(b,'/auth/logout','POST')).status,200);
      assert.equal((await call(b,'/auth/me')).status,401);
      assert.equal((await call(fresh,'/auth/me')).status,200);
    });
    await t.test('expired, old and missing-iat tokens do not become new sessions; business data is retained',async()=>{
      const invalid=[jwt.sign({sub:id(90),iat:Math.floor(Date.now()/1000)-9*3600},secret),jwt.sign({sub:id(90)},secret,{noTimestamp:true})];
      for(const auth of invalid)assert.equal((await call(auth,'/auth/me')).status,401);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,2);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM treatment_journal')).rows[0].n,1);
      await db.exec(statements.join(';\n'));
      assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.table_privileges WHERE table_name IN ('miniapp_account_sessions','miniapp_account_revocations') AND grantee IN ('PUBLIC','anon','authenticated')")).rows[0].n,0);
    });
    await t.test('inactive accounts can revoke their own token and reactivation cannot resurrect it',async()=>{
      const stale=token(90,810);
      const store=client=>({query:async q=>(await client.query(q.text,q.values)).rows,transaction:run=>client.transaction(tx=>run(store(tx)))});
      await accountSession(store(db),id(90),stale,jwt.decode(stale),'Zalo iPhone',true);
      await db.query('UPDATE users SET is_active=false WHERE id=$1',[id(90)]);
      assert.equal((await call(stale,'/auth/me')).status,401);
      assert.equal((await call(stale,'/auth/logout','POST')).status,200);
      await db.query('UPDATE users SET is_active=true WHERE id=$1',[id(90)]);
      assert.equal((await call(stale,'/auth/me')).status,401);
    });
  }finally{await f.close();}
});
