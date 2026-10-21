import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {OwnerWriteQueue} from '../../zalo_mini_app/my-app/src/utils/owner-write-queue.ts';
import {abortable,concurrentMap} from '../../zalo_mini_app/my-app/src/utils/async-control.ts';
import {createRateLimiter} from '../dist/rate-limit.js';
import {createApp} from '../dist/server.js';
import {preloadCatalogImages} from '../../zalo_mini_app/my-app/src/api/preload-images.ts';

test('cancelled SDK work rejects promptly and handles a late rejection',async()=>{
  const controller=new AbortController();
  let rejectSdk;
  const pending=abortable(new Promise((_resolve,reject)=>{rejectSdk=reject;}),controller.signal);
  controller.abort();
  await assert.rejects(pending);
  rejectSdk(new Error('late SDK response'));
  await new Promise(resolve=>setImmediate(resolve));
});

test('catalog workers respect concurrency and stop taking work after cancellation',async()=>{
  const controller=new AbortController();let running=0,peak=0,started=0;
  await concurrentMap(Array.from({length:20},(_,i)=>i),3,async()=>{
    started++;running++;peak=Math.max(peak,running);
    await new Promise(resolve=>setImmediate(resolve));
    controller.abort();running--;
  },controller.signal);
  assert.equal(peak,3);assert.equal(started,3);
});

test('timed-out image preloads release downloads and keep the catalog cap',async()=>{
  const oldWindow=globalThis.window,oldImage=globalThis.Image;
  let running=0,peak=0,requested=0;
  globalThis.window={location:{origin:'https://fixture.test'},setTimeout:callback=>setTimeout(callback,0)};
  globalThis.Image=class{
    loading=false;
    set src(value){
      if(!value){if(this.loading){running--;this.loading=false;}return;}
      this.loading=true;requested++;running++;peak=Math.max(peak,running);
    }
  };
  try{
    await preloadCatalogImages([{services:Array.from({length:200},(_,id)=>({image:`https://fixture.test/image-${id}.jpg`}))}]);
    assert.equal(requested,128);assert.equal(peak,3);assert.equal(running,0);
  }finally{globalThis.window=oldWindow;globalThis.Image=oldImage;}
});

test('aborting image preload stops active images and schedules no further images',async()=>{
  const oldWindow=globalThis.window,oldImage=globalThis.Image;
  let running=0,requested=0;
  globalThis.window={location:{origin:'https://fixture.test'},setTimeout:callback=>setTimeout(callback,1000)};
  globalThis.Image=class{
    loading=false;
    set src(value){if(value){this.loading=true;running++;requested++;}else if(this.loading){this.loading=false;running--;}}
  };
  const controller=new AbortController();
  try{
    const operation=preloadCatalogImages([{courses:Array.from({length:20},(_,id)=>({image:`https://fixture.test/cancel-${id}.jpg`}))}],controller.signal);
    controller.abort();await operation;
    assert.equal(requested,3);assert.equal(running,0);
  }finally{globalThis.window=oldWindow;globalThis.Image=oldImage;}
});

test('history queue deduplicates pending writes and serializes delete behind save',async()=>{
  const queue=new OwnerWriteQueue(()=> 'user-A');let release,calls=0;
  const order=[];
  const first=queue.run('save:spa',async()=>{calls++;await new Promise(resolve=>{release=resolve;});order.push('save');return 1;});
  const duplicate=queue.run('save:spa',async()=>{calls++;return 2;});
  const deletion=queue.run('delete:*',async()=>{order.push('delete');});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(first,duplicate);assert.equal(calls,1);
  release();await Promise.all([first,duplicate,deletion]);assert.deepEqual(order,['save','delete']);
});

test('queued work cannot cross a session change and a failed write does not poison the queue',async()=>{
  let owner='old',ran=false,release;
  const queue=new OwnerWriteQueue(()=>owner);
  const first=queue.run('one',()=>new Promise(resolve=>{release=resolve;}));
  const second=queue.run('two',async()=>{ran=true;});
  const rejected=assert.rejects(second,/Phiên/);
  await new Promise(resolve=>setImmediate(resolve));owner='new';release();
  await first;await rejected;assert.equal(ran,false);
  assert.equal(await queue.run('three',async()=>3),3);
});

test('auth rate limit blocks abuse before provider and ignores forged forwarded IP',async()=>{
  let now=0,providerCalls=0;
  const app=express();app.post('/auth',createRateLimiter(2,1000,undefined,()=>now),(_req,res)=>{providerCalls++;res.json({ok:true});});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}/auth`;
  try{
    for(let i=0;i<2;i++)assert.equal((await fetch(url,{method:'POST'})).status,200);
    const blocked=await fetch(url,{method:'POST',headers:{'X-Forwarded-For':'1.2.3.4'}});
    assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'1');assert.equal(providerCalls,2);
    now=1001;assert.equal((await fetch(url,{method:'POST'})).status,200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('CORS preflight does not consume the auth quota',async()=>{
  const app=createApp({query:async()=>{throw new Error('No database query is expected');}},{jwtSecret:'isolated-preflight-test'});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}/api/auth/zalo`;
  try{
    for(let index=0;index<35;index++){
      const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://fixture.test','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
      assert.equal(preflight.status,204);
    }
    const response=await fetch(url,{method:'POST',headers:{Origin:'https://fixture.test','Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,400); // Missing phone/access token, not an exhausted quota.
    assert.equal(response.headers.get('access-control-allow-origin'),'*');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
