import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('menus expose only granted modules while permissions load or fail', async () => {
  const bundle = await build({entryPoints:[fileURLToPath(new URL('../src/admin/access.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
  const {canAccessAdminPath} = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  assert.equal(canAccessAdminPath('/manage/roles','CASHIER',[]),false);
  assert.equal(canAccessAdminPath('/services-catalog','RECEPTIONIST',[]),false);
  const resources=[{name:'branches',actions:[]},{name:'cashier',actions:['shifts']}];
  assert.equal(canAccessAdminPath('/branches?tab=rooms','CASHIER',resources),true);
  assert.equal(canAccessAdminPath('/cashier-pos','CASHIER',resources),true);
  assert.equal(canAccessAdminPath('/manage/users','CASHIER',resources),false);
  assert.equal(canAccessAdminPath('/manage/roles','ADMIN',resources),false);
  assert.equal(canAccessAdminPath('/manage/roles','SUPER_ADMIN',resources),true);
});

test('cashier retains each unresolved request key across cart changes and confirms before clearing it', async () => {
  const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/services/pos.service.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',plugins:[{name:'fixture',setup(builder){
    builder.onResolve({filter:/admin\/api$/},()=>({path:'api',namespace:'fixture'}));
    builder.onResolve({filter:/supabaseService$/},()=>({path:'supabase',namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='api'
      ? 'export const adminCommand=(path,body)=>globalThis.__collect(path,body);'
      : 'export const supabaseService={};',loader:'js'}));
  }}]});
  const original={sessionStorage:globalThis.sessionStorage,collect:globalThis.__collect};
  const storage=new Map(),calls=[];
  globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  globalThis.__collect=async(path,body)=>{calls.push({path,body});throw new Error('Connection lost');};
  try{
    const {posService,effectiveCataloguePrice}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    assert.equal(effectiveCataloguePrice({price:100000,discountPrice:80000}),80000);
    assert.equal(effectiveCataloguePrice({price:0,discountPrice:null}),0);
    assert.equal(effectiveCataloguePrice({price:100000,discountPrice:120000}),100000);
    const first={kind:'TUITION',enrollmentId:'student-one',amount:200000,shiftId:'shift-one',paymentMethod:'CASH_AT_SPA'};
    assert.equal((await posService.collectPayment(first)).success,false);
    await posService.collectPayment({...first,enrollmentId:'student-two'});
    globalThis.__collect=async(path,body)=>{calls.push({path,body});return {transactionCode:'confirmed'};};
    assert.equal((await posService.collectPayment(first)).success,true);
    assert.equal(calls[0].body.requestId,calls[2].body.requestId);
    assert.notEqual(calls[0].body.requestId,calls[1].body.requestId);
    assert.equal(Object.keys(JSON.parse(storage.get('mld_admin_cashier_requests'))).length,1);
  }finally{globalThis.sessionStorage=original.sessionStorage;globalThis.__collect=original.collect;}
});
