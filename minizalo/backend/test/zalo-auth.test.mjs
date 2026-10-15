import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/server.js';
import { resolveZaloAccount, verifyZaloAccount, verifyZaloPhone } from '../dist/zalo-auth.js';

const options = { zaloAppId:'123456',zaloAppSecret:'private-zalo-test-secret' };
const profile = {id:'90071992547409930001',name:'Actual Zalo Name',avatar:'https://example.test/avatar.png',phone:'0912345678'};
const sqlStore = db => ({
  query: async q => (await db.query(q.text,q.values)).rows,
  transaction: run => db.transaction(tx => run(sqlStore(tx))),
});

test('Zalo profile verifier uses fixed official endpoint and server-side HMAC', async () => {
  const verified = await verifyZaloAccount('real-token',{
    ...options,fetch:async (url,init) => {
      assert.equal(url.origin,'https://graph.zalo.me');
      assert.equal(url.pathname,'/v2.0/me');
      assert.equal(url.searchParams.get('fields'),'id,name,picture');
      assert.equal(url.searchParams.has('access_token'),false);
      assert.equal(init.headers.access_token,'real-token');
      assert.equal(init.headers.appsecret_proof,createHmac('sha256',options.zaloAppSecret).update('real-token').digest('hex'));
      assert.equal(init.redirect,'error');
      return Response.json({id:profile.id,name:profile.name,picture:{data:{url:profile.avatar}}});
    },
  });
  assert.deepEqual(verified,{id:profile.id,name:profile.name,avatar:profile.avatar});
});

test('profile verification rejects malformed tokens, wrong app, expired token and missing consent', async () => {
  for(const value of [undefined,null,{},'', 'token\nother','x'.repeat(8193)]) await assert.rejects(verifyZaloAccount(value,options),e=>e.status===400);
  await assert.rejects(verifyZaloAccount('token',{}),e=>e.status===503);
  for(const [body,status] of [
    [{error:-1,id:profile.id,name:profile.name},401],
    [{id:9007199254740993,name:profile.name},502],
    [{id:'fake',name:profile.name},502],
    [{id:profile.id,name:profile.name,app_id:'789'},401],
    [{id:profile.id},403],
  ]) await assert.rejects(verifyZaloAccount('token',{...options,fetch:async()=>Response.json(body)}),e=>e.status===status);
  for(const status of [429,500,503]) await assert.rejects(verifyZaloAccount('token',{...options,fetch:async()=>Response.json({},{status})}),e=>e.status===502);
});

test('provider diagnostics redact credentials and user data while preserving useful provider errors', async () => {
  const original=console.warn;
  const logs=[];
  console.warn=(...args)=>logs.push(args.join(' '));
  try {
    await assert.rejects(verifyZaloAccount('private-access-token',{
      ...options,fetch:async()=>Response.json({error:-1241,message:'private-access-token private-zalo-test-secret customer-private-phone',id:'123'}),
    }),e=>e.status===401&&e.message.includes('Zalo code -1241')&&!e.message.includes('private-access-token'));
    assert.equal(logs.length,1);
    assert.ok(logs[0].includes('"providerCode":-1241'));
    for(const secret of ['private-access-token','private-zalo-test-secret','customer-private-phone']) assert.equal(logs[0].includes(secret),false);
    await assert.rejects(verifyZaloAccount('token',{
      ...options,fetch:async()=>Response.json({error:{code:'-124',message:'private response'}}),
    }),e=>e.status===401&&e.message.includes('Zalo code -124'));
    await assert.rejects(verifyZaloAccount('secret-access-token',{
      ...options,fetch:async()=>Response.json({error:-501,message:'Request blocked from server. secret-access-token customer@example.test 0912345678 https://example.test/?token=secret',name:'Customer Private'}),
    }),e=>e.status===502&&e.message.includes('Zalo code -501')&&!e.message.includes('secret-access-token'));
    const last=logs.at(-1);
    assert.ok(last.includes('Request blocked from server.'));
    for(const value of ['secret-access-token','customer@example.test','0912345678','https://example.test','Customer Private']) assert.equal(last.includes(value),false);
  } finally { console.warn=original; }
});

test('phone is exchanged server-to-server with matching Zalo token and app secret', async () => {
  for(const number of ['84912345678','+84912345678']) {
    const phone=await verifyZaloPhone('real-token','single-use-phone-code',{...options,fetch:async(url,init)=>{
      assert.equal(url,'https://graph.zalo.me/v2.0/me/info');
      assert.deepEqual(init.headers,{access_token:'real-token',code:'single-use-phone-code',secret_key:options.zaloAppSecret});
      assert.equal(init.redirect,'error');
      return Response.json({error:0,data:{number}});
    }});
    assert.equal(phone,profile.phone);
  }
  for(const token of [undefined,{},'', 'x\nother']) await assert.rejects(verifyZaloPhone('token',token,options),e=>e.status===400);
  for(const body of [{error:-1,data:{number:'84912345678'}},{error:0,data:{number:'fake'}},{error:0,data:{number:84912345678}},{error:0,data:{number:'84012345678'}}]) {
    await assert.rejects(verifyZaloPhone('token','code',{...options,fetch:async()=>Response.json(body)}),e=>e.status===401);
  }
  await assert.rejects(verifyZaloPhone('token','code',{...options,fetch:async()=>{throw new Error('private details');}}),e=>e.status===502&&!e.message.includes('private'));
});

test('Zalo phone permission preserves shared accounts without schema changes or OTP', async t => {
  const db=new PGlite();
  const canonical=await readFile(new URL('../../../database/schema.sql',import.meta.url),'utf8');
  await db.exec(canonical.split(/\r?\n/).filter(l=>!l.startsWith('CREATE EXTENSION')&&!l.includes('gin_trgm_ops')).join('\n'));
  const store=sqlStore(db);
  let accountId;
  let server;
  try {
    await t.test('signup respects the switch and original NOT NULL phone schema',async()=>{
      await assert.rejects(resolveZaloAccount(store,profile,options),e=>e.status===409);
      const result=await resolveZaloAccount(store,profile,{...options,zaloAllowSignup:true});
      accountId=result.userId;
      assert.equal(result.isNewUser,true);
      const row=(await db.query('SELECT * FROM users WHERE id=$1',[accountId])).rows[0];
      assert.equal(row.phone,profile.phone);
      assert.equal(row.full_name,profile.name);
      assert.equal(row.avatar_url,profile.avatar);
      assert.equal(row.membership_tier,'STANDARD');
      assert.equal(row.reward_points,0);
      assert.equal((await db.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='phone'")).rows[0].is_nullable,'NO');
    });
    await t.test('repeated login and national/international aliases reuse UUID and retain rewards',async()=>{
      await db.query("UPDATE users SET membership_tier='GOLD',reward_points=350,full_name='Shared Name' WHERE id=$1",[accountId]);
      for(const phone of [profile.phone,'84912345678','+84912345678']) {
        await db.query('UPDATE users SET phone=$1 WHERE id=$2',[phone,accountId]);
        assert.deepEqual(await resolveZaloAccount(store,profile,options),{userId:accountId,isNewUser:false});
      }
      const row=(await db.query('SELECT * FROM users WHERE id=$1',[accountId])).rows[0];
      assert.equal(row.reward_points,350);
      assert.equal(row.membership_tier,'GOLD');
      assert.equal(row.full_name,'Shared Name');
      assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,1);
    });
    await t.test('duplicate alias identities, inactive users and staff accounts are rejected',async()=>{
      await db.query("INSERT INTO users(phone,full_name,referral_code) VALUES ($1,'Duplicate','DUP')",[profile.phone]);
      await assert.rejects(resolveZaloAccount(store,profile,options),e=>e.status===409);
      await db.query("DELETE FROM users WHERE referral_code='DUP'");
      await db.query('UPDATE users SET is_active=false WHERE id=$1',[accountId]);
      await assert.rejects(resolveZaloAccount(store,profile,options),e=>e.status===401);
      await db.query("UPDATE users SET is_active=true,role='ADMIN' WHERE id=$1",[accountId]);
      await assert.rejects(resolveZaloAccount(store,profile,options),e=>e.status===403);
      await db.query("UPDATE users SET role='CUSTOMER' WHERE id=$1",[accountId]);
    });
    await t.test('HTTP login ignores client phone and UUID; missing/expired phone code creates no user',async()=>{
      let phoneError=false;
      const secret='mini-app-test-secret';
      server=createApp(store,{...options,jwtSecret:secret,fetch:async url=>String(url).endsWith('/me/info')
        ?Response.json(phoneError?{error:-1}:{error:0,data:{number:'84912345678'}})
        :Response.json({id:profile.id,name:profile.name})}).listen(0,'127.0.0.1');
      await once(server,'listening');
      const base=`http://127.0.0.1:${server.address().port}/api`;
      const login=body=>fetch(`${base}/auth/zalo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      assert.equal((await login({accessToken:'real-token',phone:'0900000000'})).status,400);
      phoneError=true;
      assert.equal((await login({accessToken:'real-token',phoneToken:'expired'})).status,401);
      phoneError=false;
      const response=await login({accessToken:'real-token',phoneToken:'real-code',phone:'0900000000',userId:'forged',userInfo:{name:'Forged'}});
      const result=await response.json();
      assert.equal(response.status,200,JSON.stringify(result));
      assert.equal(result.data.user.id,accountId);
      assert.equal(result.data.user.fullName,'Shared Name');
      assert.equal(result.data.user.rewardPoints,350);
      assert.equal(result.data.user.passwordHash,undefined);
      const payload=jwt.verify(result.data.token,secret);
      assert.equal(payload.sub,accountId);
      assert.equal(payload.exp-payload.iat,8*60*60);
      assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,1);
      assert.equal((await fetch(`${base}/auth/me`,{headers:{Authorization:`Bearer ${result.data.token}`}})).status,200);
      for(const token of [jwt.sign({sub:accountId},'wrong-key'),jwt.sign({sub:accountId},secret,{expiresIn:-1}),'invalid']) {
        assert.equal((await fetch(`${base}/auth/me`,{headers:{Authorization:`Bearer ${token}`}})).status,401);
      }
    });
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await db.close();
  }
});
