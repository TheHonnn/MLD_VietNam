import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/server.js';

test('phone-only Zalo registration needs verified phone plus a real name, never Social profile permission',async t=>{
  const db=new PGlite();
  const schema=await readFile(new URL('../../../database/schema.sql',import.meta.url),'utf8');
  await db.exec(schema.split(/\r?\n/).filter(l=>!l.startsWith('CREATE EXTENSION')&&!l.includes('gin_trgm_ops')).join('\n'));
  const sqlStore=client=>({query:async q=>(await client.query(q.text,q.values)).rows,transaction:run=>client.transaction(tx=>run(sqlStore(tx)))});
  const secret='private-miniapp-registration-test-key';
  let providerError=false;
  let calls=0;
  const server=createApp(sqlStore(db),{jwtSecret:secret,zaloAppId:'12345',zaloAppSecret:'parent-app-secret',zaloAllowSignup:true,
    fetch:async(url,init)=>{
      calls++;
      assert.equal(String(url),'https://graph.zalo.me/v2.0/me/info','Never call the Social /me endpoint');
      assert.equal(init.headers.access_token,'real-token');
      assert.equal(init.headers.secret_key,'parent-app-secret');
      return Response.json(providerError?{error:-501,message:'IP restricted'}:{error:0,data:{number:'84987654321'}});
    }}).listen(0,'127.0.0.1');
  await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const post=async(path,body)=>{
    const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:r.status,...await r.json()};
  };
  const count=async()=>(await db.query('SELECT count(*)::int n FROM users')).rows[0].n;
  let registrationToken;
  let userId;
  try {
    await t.test('verified phone returns short-lived registration proof but creates no placeholder account',async()=>{
      const result=await post('/auth/zalo',{accessToken:'real-token',phoneToken:'real-code',phone:'0900000000',fullName:'Forged',userId:'forged'});
      assert.equal(result.status,200,JSON.stringify(result));
      assert.equal(calls,1);
      assert.equal(result.data.registrationRequired,true);
      assert.equal(result.data.phone,'0987654321');
      assert.equal(result.data.token,undefined);
      registrationToken=result.data.registrationToken;
      const proof=jwt.verify(registrationToken,secret,{audience:'mld-zalo-registration',issuer:'mld-miniapp-api'});
      assert.equal(proof.phone,'0987654321');
      assert.equal(proof.sub,undefined);
      assert.equal(proof.exp-proof.iat,300);
      assert.equal(await count(),0);
      const privateResult=await fetch(base+'/bookings',{headers:{Authorization:`Bearer ${registrationToken}`}});
      assert.notEqual(privateResult.status,200);
    });
    await t.test('unverified phone, forged, expired and wrong-purpose proofs cannot register',async()=>{
      const cases=[undefined,'fake',jwt.sign({purpose:'zalo-registration',phone:'0900000000'},'wrong-key',{audience:'mld-zalo-registration',issuer:'mld-miniapp-api'}),
        jwt.sign({purpose:'zalo-registration',phone:'0900000000'},secret,{audience:'mld-zalo-registration',issuer:'mld-miniapp-api',expiresIn:-1}),
        jwt.sign({sub:'00000000-0000-0000-0000-000000000001'},secret)];
      for(const token of cases) assert.equal((await post('/auth/zalo/register',{registrationToken:token,fullName:'Name',phone:'0900000000'})).status,401);
      assert.equal(await count(),0);
    });
    await t.test('invalid or missing form values cannot create an account',async()=>{
      for(const data of [{fullName:''},{fullName:' '.repeat(5)},{fullName:'x'.repeat(151)},{fullName:'Name',email:'invalid'},
        {fullName:'Name',dateOfBirth:'2026-02-31'},{fullName:'Name',dateOfBirth:'2099-01-01'},{fullName:'Name',gender:'ADMIN'}]) {
        assert.equal((await post('/auth/zalo/register',{registrationToken,...data})).status,400);
      }
      assert.equal(await count(),0);
    });
    await t.test('form creates canonical account using proof phone, not client phone, UUID, role or rewards',async()=>{
      const result=await post('/auth/zalo/register',{registrationToken,fullName:'  Real Customer  ',email:'customer@example.test',
        gender:'FEMALE',dateOfBirth:'2000-01-02',phone:'0900000000',userId:'forged',role:'SUPER_ADMIN',rewardPoints:9999});
      assert.equal(result.status,200,JSON.stringify(result));
      userId=result.data.user.id;
      assert.equal(result.data.isNewUser,true);
      assert.equal(result.data.user.fullName,'Real Customer');
      assert.equal(result.data.user.phone,'0987654321');
      assert.equal(result.data.user.email,'customer@example.test');
      assert.equal(result.data.user.gender,'FEMALE');
      assert.equal(result.data.user.role,'CUSTOMER');
      assert.equal(result.data.user.rewardPoints,0);
      assert.equal(result.data.user.membershipTier,'STANDARD');
      assert.equal(result.data.user.avatarUrl,null);
      assert.equal(jwt.verify(result.data.token,secret).sub,userId);
      assert.equal(await count(),1);
    });
    await t.test('retries and subsequent Zalo login preserve existing UUID, rewards and profile without form',async()=>{
      await db.query("UPDATE users SET membership_tier='GOLD',reward_points=350 WHERE id=$1",[userId]);
      const retry=await post('/auth/zalo/register',{registrationToken,fullName:'Must not overwrite'});
      assert.equal(retry.status,200);
      assert.equal(retry.data.user.id,userId);
      assert.equal(retry.data.isNewUser,false);
      const result=await post('/auth/zalo',{accessToken:'real-token',phoneToken:'another-code'});
      assert.equal(result.status,200);
      assert.equal(result.data.user.id,userId);
      assert.equal(result.data.user.fullName,'Real Customer');
      assert.equal(result.data.user.rewardPoints,350);
      assert.equal(result.data.registrationToken,undefined);
      assert.equal(await count(),1);
    });
    await t.test('phone IP restriction fails closed with no account creation or profile fallback',async()=>{
      providerError=true;
      const result=await post('/auth/zalo',{accessToken:'real-token',phoneToken:'new-code'});
      assert.equal(result.status,502);
      assert.ok(result.message.includes('-501'));
      assert.equal(await count(),1);
    });
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await db.close();
  }
});
