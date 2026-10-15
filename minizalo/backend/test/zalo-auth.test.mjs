import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/server.js';
import { resolveZaloAccount, verifyZaloAccount } from '../dist/zalo-auth.js';

const options = { zaloAppId:'123456',zaloAppSecret:'private-zalo-test-secret' };
const profile = {id:'90071992547409930001',name:'Actual Zalo Name',avatar:'https://example.test/avatar.png'};
const sqlStore = db => ({
  query: async q => (await db.query(q.text,q.values)).rows,
  transaction: run => db.transaction(tx => run(sqlStore(tx))),
});

test('Zalo verifier uses fixed official endpoint and server-side HMAC, never trusts client identity', async () => {
  const verified = await verifyZaloAccount('real-token',{
    ...options,
    fetch:async (url,init) => {
      assert.equal(url.origin,'https://graph.zalo.me');
      assert.equal(url.pathname,'/v2.0/me');
      assert.equal(url.searchParams.get('fields'),'id,name,picture');
      assert.equal(url.searchParams.has('access_token'),false);
      assert.equal(init.headers.access_token,'real-token');
      assert.equal(init.headers.appsecret_proof,createHmac('sha256',options.zaloAppSecret).update('real-token').digest('hex'));
      assert.equal(init.redirect,'error');
      assert.ok(init.signal);
      return Response.json({id:profile.id,name:profile.name,picture:{data:{url:profile.avatar}}});
    },
  });
  assert.deepEqual(verified,profile);
});

test('Zalo verification fails closed for invalid input, errors, timeouts, permissions and app mismatch', async () => {
  for(const value of [undefined,null,{},'', 'token\nother','x'.repeat(8193)]) {
    await assert.rejects(verifyZaloAccount(value,options),e=>e.status===400);
  }
  await assert.rejects(verifyZaloAccount('token',{}),e=>e.status===503);
  const cases = [
    [{error:-1,id:profile.id,name:profile.name},401],
    [{id:9007199254740993,name:profile.name},401],
    [{id:'fake',name:profile.name},401],
    [{id:profile.id,name:profile.name,app_id:'789'},401],
    [{id:profile.id},403],
    [{id:profile.id,name:'x'.repeat(151)},403],
  ];
  for(const [body,status] of cases) await assert.rejects(verifyZaloAccount('token',{...options,fetch:async()=>Response.json(body)}),e=>e.status===status);
  for(const status of [429,500,503]) await assert.rejects(verifyZaloAccount('token',{...options,fetch:async()=>Response.json({},{status})}),e=>e.status===502);
  await assert.rejects(verifyZaloAccount('token',{...options,fetch:async()=>{throw new Error('token must never be returned');}}),e=>e.status===502&&!e.message.includes('token must'));
  const noAvatar = await verifyZaloAccount('token',{...options,fetch:async()=>Response.json({id:profile.id,name:profile.name,picture:{data:{url:'javascript:alert(1)'}}})});
  assert.equal(noAvatar.avatar,null);
});

test('phone-free shared signup is explicit, atomic and preserves UUID across sessions', async t => {
  const db = new PGlite();
  const canonical = await readFile(new URL('../../../database/schema.sql',import.meta.url),'utf8');
  await db.exec(canonical.split(/\r?\n/).filter(l=>!l.startsWith('CREATE EXTENSION')&&!l.includes('gin_trgm_ops')).join('\n'));
  const store = sqlStore(db);
  let server;
  try {
    await t.test('schema without approved identity extension is not silently mutated',async()=>{
      await assert.rejects(resolveZaloAccount(store,profile,{...options,zaloAllowSignup:true}),e=>e.status===503);
      assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,0);
    });
    const identitySql=await readFile(new URL('../../docs/sql/001_zalo_identities.sql',import.meta.url),'utf8');
    await db.exec(identitySql);
    await db.exec(identitySql);
    await t.test('signup disabled by default and phone constraint respected',async()=>{
      await assert.rejects(resolveZaloAccount(store,profile,options),e=>e.status===409);
      await assert.rejects(resolveZaloAccount(store,profile,{...options,zaloAllowSignup:true}),e=>e.status===503);
      assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,0);
    });
    const signupSql=await readFile(new URL('../../docs/sql/002_phone_free_signup.sql',import.meta.url),'utf8');
    await db.exec(signupSql);
    await db.exec(signupSql);
    let accountId;
    await t.test('first verified login creates one real shared user and persistent identity',async()=>{
      const result=await resolveZaloAccount(store,profile,{...options,zaloAllowSignup:true});
      assert.equal(result.isNewUser,true);
      accountId=result.userId;
      assert.match(accountId,/^[a-f0-9-]{36}$/);
      const row=(await db.query('SELECT * FROM users WHERE id=$1',[accountId])).rows[0];
      assert.equal(row.phone,null);
      assert.equal(row.full_name,profile.name);
      assert.equal(row.avatar_url,profile.avatar);
      assert.equal(row.reward_points,0);
      assert.equal(row.membership_tier,'STANDARD');
      assert.equal(row.password_hash,null);
    });
    await t.test('subsequent logins reuse UUID even with signup disabled',async()=>{
      const result=await resolveZaloAccount(store,profile,options);
      assert.deepEqual(result,{userId:accountId,isNewUser:false});
      assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,1);
      assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.zalo_identities'::regclass")).rows[0].relrowsecurity,true);
      await assert.rejects(db.query('INSERT INTO zalo_identities (zalo_app_id,zalo_user_id,user_id) VALUES ($1,$2,$3)',[options.zaloAppId,'another',accountId]));
    });
    await t.test('identity insert failure rolls back new user',async()=>{
      const rejectingStore={...store,transaction:run=>store.transaction(tx=>run({...tx,query:q=>q.text.includes('INSERT INTO public.zalo_identities')?Promise.reject(new Error('Forced test rollback')):tx.query(q)}))};
      await assert.rejects(resolveZaloAccount(rejectingStore,{...profile,id:'999'},{...options,zaloAllowSignup:true}));
      assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n,1);
    });
    await t.test('HTTP login ignores forged UUID/name/phone and issues expiring Mini App token',async()=>{
      const secret='mini-app-test-secret';
      server=createApp(store,{...options,jwtSecret:secret,fetch:async()=>Response.json({id:profile.id,name:profile.name})}).listen(0,'127.0.0.1');
      await once(server,'listening');
      const base=`http://127.0.0.1:${server.address().port}/api`;
      const response=await fetch(`${base}/auth/zalo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:'real-token',userId:'forged-id',phone:'fake',userInfo:{id:'forged',name:'Forged Name'}})});
      const result=await response.json();
      assert.equal(response.status,200,JSON.stringify(result));
      assert.equal(result.data.user.id,accountId);
      assert.equal(result.data.user.fullName,profile.name);
      assert.equal(result.data.user.passwordHash,undefined);
      const payload=jwt.verify(result.data.token,secret);
      assert.equal(payload.sub,accountId);
      assert.equal(payload.exp-payload.iat,8*60*60);
      const me=await fetch(`${base}/auth/me`,{headers:{Authorization:`Bearer ${result.data.token}`}});
      assert.equal(me.status,200);
      for (const invalidToken of [
        jwt.sign({sub:accountId},'different-backend-key',{expiresIn:'1h'}),
        jwt.sign({sub:accountId},secret,{expiresIn:-1}),
        'not-a-jwt',
      ]) {
        assert.equal((await fetch(`${base}/auth/me`,{headers:{Authorization:`Bearer ${invalidToken}`}})).status,401);
      }
      await db.query('UPDATE users SET is_active=false WHERE id=$1',[accountId]);
      assert.equal((await fetch(`${base}/auth/me`,{headers:{Authorization:`Bearer ${result.data.token}`}})).status,401);
      assert.equal((await fetch(`${base}/auth/zalo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:'real-token'})})).status,401);
    });
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    await db.close();
  }
});
