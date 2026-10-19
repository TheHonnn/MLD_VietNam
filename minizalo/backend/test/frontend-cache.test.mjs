import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../zalo_mini_app/my-app/src/api/read-cache.ts',import.meta.url),'utf8');
const {outputText} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {ReadCache} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('preloaded JSON reads share pending requests and return independent data copies',async()=>{
  const cache=new ReadCache(); let calls=0;
  const load=async()=>{calls++;return {items:[{id:'actual-record'}]};};
  const [first,second]=await Promise.all([cache.read('public/catalog',load),cache.read('public/catalog',load)]);
  assert.equal(calls,1);
  first.items[0].id='local-edit';
  assert.equal(second.items[0].id,'actual-record');
  const snapshot=cache.peek('public/catalog'); snapshot.items.pop();
  assert.equal((await cache.read('public/catalog',load)).items.length,1);
  assert.equal(calls,1);
});

test('expiry refreshes data and failures never become successful cached empty lists',async()=>{
  const cache=new ReadCache(5,10,result=>result.status===200); let calls=0;
  const load=async()=>({status:200,version:++calls});
  await cache.read('catalog',load);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal((await cache.read('catalog',load)).version,2);
  await cache.read('failure',async()=>({status:503}));
  assert.equal(cache.peek('failure'),null);
  assert.equal((await cache.read('failure',async()=>({status:200,items:[]}))).status,200);
  await assert.rejects(cache.read('network-error',async()=>{throw new Error('Offline');}));
  assert.equal((await cache.read('network-error',load)).status,200);
});

test('logout or mutation invalidation cannot be undone by late responses',async()=>{
  const cache=new ReadCache(); let finish;
  const response=cache.read('private:owner-A/enrollments',()=>new Promise(resolve=>{finish=resolve;}));
  await Promise.resolve();
  cache.invalidate(key=>key.startsWith('private:'));
  await cache.read('private:owner-B/enrollments',async()=>({owner:'B'}));
  finish({owner:'A'}); await response;
  assert.equal(cache.peek('private:owner-A/enrollments'),null);
  assert.equal(cache.peek('private:owner-B/enrollments').owner,'B');
});

test('targeted invalidation preserves unrelated pages and capacity stays bounded',async()=>{
  const cache=new ReadCache(60000,2);
  await cache.read('public/catalog',async()=>({id:'catalog'}));
  await cache.read('private/settings',async()=>({id:'settings'}));
  cache.invalidate(key=>key==='private/settings');
  assert.equal(cache.peek('private/settings'),null);
  assert.equal(cache.peek('public/catalog').id,'catalog');
  await cache.read('private/bookings',async()=>({id:'bookings'}));
  await cache.read('private/learning',async()=>({id:'learning'}));
  assert.equal(cache.peek('public/catalog'),null);
  assert.equal(cache.peek('private/learning').id,'learning');
});
