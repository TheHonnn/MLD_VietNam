import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createZaloRelay } from '../dist/zalo-relay.js';
import { authenticateZalo } from '../dist/zalo-relay-client.js';
import { RELAY_PATH, signRelayRequest, encryptRelayPayload, decryptRelayPayload } from '../dist/zalo-relay-protocol.js';

const appId='4323051856943738133';
const relaySecret='test-private-relay-key-at-least-32-characters';
const options={zaloAppId:appId,zaloAppSecret:'private-parent-app-secret',relaySecret};
const profile={id:'1234567890123456789',name:'Verified Customer',avatar:null,phone:'0912345678'};
const data={accessToken:'private-user-access-token',phoneToken:'private-single-use-phone-code'};
const requestTimestamp=String(Date.now());
const requestNonce=randomUUID();
const body=JSON.stringify(encryptRelayPayload(data,relaySecret,'request',requestTimestamp,requestNonce));
function headers(payload=body,timestamp=requestTimestamp,nonce=requestNonce,secret=relaySecret) {
  return {'Content-Type':'application/json','X-Relay-Timestamp':timestamp,'X-Relay-Nonce':nonce,
    'X-Relay-Signature':signRelayRequest(payload,timestamp,nonce,secret)};
}

test('private Vietnam relay verifies signatures, timestamp and replay before contacting Zalo',async t=>{
  let calls=0;
  const app=createZaloRelay({...options,fetch:async(url,init)=>{
    calls++;
    assert.equal(init.headers.access_token,data.accessToken);
    if(String(url).endsWith('/me/info')) {
      assert.equal(init.headers.code,data.phoneToken);
      assert.equal(init.headers.secret_key,options.zaloAppSecret);
      return Response.json({error:0,data:{number:'84912345678'}});
    }
    assert.equal(new URL(url).origin,'https://graph.zalo.me');
    return Response.json({id:profile.id,name:profile.name});
  }});
  const server=app.listen(0,'127.0.0.1');
  await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  const request=(h,payload=body)=>fetch(origin+RELAY_PATH,{method:'POST',headers:h,body:payload});
  try {
    await t.test('unsigned, tampered, expired and wrong-secret requests fail before upstream',async()=>{
      for(const h of [
        {'Content-Type':'application/json'},headers(body,String(Date.now()-120000)),
        headers(body,String(Date.now()+120000)),headers(body,undefined,undefined,'wrong-key'),
        headers(JSON.stringify({...data,accessToken:'tampered'})),
      ]) assert.equal((await request(h)).status,401);
      assert.equal(calls,0);
    });
    await t.test('valid request returns verified fields only; replay is rejected',async()=>{
      const h=headers();
      const result=await request(h);
      assert.equal(result.status,200);
      const envelope=await result.json();
      assert.equal(envelope.success,true);
      assert.equal(JSON.stringify(envelope).includes(profile.phone),false);
      assert.deepEqual(decryptRelayPayload(envelope.data,relaySecret,'response',requestTimestamp,requestNonce),{phone:profile.phone,appId});
      assert.equal(calls,1);
      assert.equal((await request(h)).status,401);
      assert.equal(calls,1);
    });
    await t.test('malformed JSON, query targets and unsupported routes cannot become an open proxy',async()=>{
      assert.equal((await request(headers('not-json',requestTimestamp,randomUUID()),'not-json')).status,400);
      assert.equal((await fetch(origin+RELAY_PATH+'?target=https://untrusted.test',{method:'POST',headers:headers(),body})).status,401);
      assert.equal((await fetch(origin+'/proxy',{method:'POST',headers:headers(),body})).status,404);
      assert.equal(calls,1);
    });
    await t.test('Render client signs a real request; Zalo app secret stays only on relay',async()=>{
      const result=await authenticateZalo(data.accessToken,data.phoneToken,{
        zaloAppId:appId,zaloRelayUrl:'https://own-relay.example.vn',zaloRelaySecret:relaySecret,
        fetch:async(url,init)=>{
          assert.equal(url.origin,'https://own-relay.example.vn');
          assert.equal(url.pathname,RELAY_PATH);
          assert.equal(init.redirect,'error');
          assert.ok(init.signal);
          assert.equal(init.body.includes(options.zaloAppSecret),false);
          assert.equal(init.body.includes(data.accessToken),false);
          assert.equal(init.body.includes(data.phoneToken),false);
          assert.equal(JSON.stringify(init.headers).includes(relaySecret),false);
          return fetch(origin+url.pathname,init);
        },
      });
      assert.deepEqual(result,{phone:profile.phone});
    });
    assert.equal((await fetch(origin+'/health')).status,200);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('Render relay client fails closed on unsafe URLs, errors, wrong app and malformed accounts',async()=>{
  const base={zaloAppId:appId,zaloRelayUrl:'https://own-relay.example.vn',zaloRelaySecret:relaySecret};
  for(const zaloRelayUrl of ['http://untrusted.test','https://user:password@own-relay.example.vn','https://own-relay.example.vn/?target=x','https://own-relay.example.vn/path','not-a-url']) {
    await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,zaloRelayUrl,fetch:async()=>{assert.fail('Unsafe URL contacted');}}),e=>e.status===503);
  }
  await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,zaloRelaySecret:'short'}),e=>e.status===503);
  for(const invalid of [{...profile,appId:'other'},{...profile,appId,phone:'fake'},{...profile,appId,phone:84912345678}]) {
    await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,fetch:async(_url,init)=>Response.json({success:true,
      data:encryptRelayPayload(invalid,relaySecret,'response',init.headers['X-Relay-Timestamp'],init.headers['X-Relay-Nonce'])})}),e=>e.status===502);
  }
  let calls=0;
  await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,fetch:async()=>{calls++;throw new Error('private credentials');}}),e=>e.status===502&&!e.message.includes('private credentials'));
  assert.equal(calls,1,'No direct overseas fallback or replay of single-use phone token');
  await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,fetch:async()=>Response.json({success:true,data:{phone:profile.phone,appId}})}),e=>e.status===502);
  await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,fetch:async()=>Response.json({success:false,statusCode:401,message:'do not expose this relay body'},{status:401})}),e=>e.status===401&&!e.message.includes('do not expose'));
  await assert.rejects(authenticateZalo(data.accessToken,data.phoneToken,{...base,fetch:async()=>Response.json({success:false,statusCode:401},{status:503})}),e=>e.status===502);
  assert.throws(()=>createZaloRelay({...options,relaySecret:'short'}));
});

test('relay encryption rejects plaintext, tampering, wrong keys, reflection and response swaps',()=>{
  const encrypted=encryptRelayPayload(data,relaySecret,'request',requestTimestamp,requestNonce);
  assert.deepEqual(decryptRelayPayload(encrypted,relaySecret,'request',requestTimestamp,requestNonce),data);
  const another=encryptRelayPayload(data,relaySecret,'request',requestTimestamp,requestNonce);
  assert.notEqual(encrypted.iv,another.iv);
  assert.notEqual(encrypted.ciphertext,another.ciphertext);
  assert.ok(Buffer.byteLength(JSON.stringify(encryptRelayPayload({accessToken:'a'.repeat(8192),phoneToken:'b'.repeat(8192)},relaySecret,'request',requestTimestamp,requestNonce)))<24*1024);
  for(const field of ['iv','tag','ciphertext']) {
    const altered={...encrypted,[field]:(encrypted[field][0]==='A'?'B':'A')+encrypted[field].slice(1)};
    assert.throws(()=>decryptRelayPayload(altered,relaySecret,'request',requestTimestamp,requestNonce));
  }
  assert.throws(()=>decryptRelayPayload(data,relaySecret,'request',requestTimestamp,requestNonce));
  assert.throws(()=>decryptRelayPayload(encrypted,'wrong-secret-with-at-least-32-characters','request',requestTimestamp,requestNonce));
  assert.throws(()=>decryptRelayPayload(encrypted,relaySecret,'response',requestTimestamp,requestNonce));
  assert.throws(()=>decryptRelayPayload(encrypted,relaySecret,'request',String(Number(requestTimestamp)+1),requestNonce));
  assert.throws(()=>decryptRelayPayload(encrypted,relaySecret,'request',requestTimestamp,randomUUID()));
});

test('signed plaintext and corrupt ciphertext are rejected before Zalo is called',async()=>{
  let calls=0;
  const server=createZaloRelay({...options,fetch:async()=>{calls++;assert.fail('Must not contact Zalo');}}).listen(0,'127.0.0.1');
  await once(server,'listening');
  try {
    for(const payload of [JSON.stringify(data),JSON.stringify({version:2,iv:'00'.repeat(12),tag:'00'.repeat(16),ciphertext:'AAAA'})]) {
      const response=await fetch(`http://127.0.0.1:${server.address().port}${RELAY_PATH}`,{method:'POST',headers:headers(payload,requestTimestamp,randomUUID()),body:payload});
      assert.equal(response.status,400);
    }
    assert.equal(calls,0);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
