import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/admin/api.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',plugins:[{
  name:'isolated-supabase',setup(builder){
    builder.onResolve({filter:/supabaseClient$/},()=>({path:'supabaseClient',namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const SUPABASE_URL='https://fixture.invalid';export const getSupabaseHeaders=extra=>({Authorization:'Bearer isolated-admin',...extra});`,loader:'js'}));
  },
}]});
const {adminApi}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id='10000000-0000-0000-0000-000000000001';
const input={key:{id},values:{role:'RECEPTIONIST'}};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});

test('Admin reports success only for persisted account updates',async t=>{
  const originalFetch=globalThis.fetch,originalWindow=globalThis.window,originalStorage=globalThis.localStorage;
  let localWrites=0;
  globalThis.window={location:{protocol:'https:',hostname:'admin.example.test'},dispatchEvent:()=>true};
  globalThis.localStorage={getItem:()=>null,setItem:()=>{localWrites++;}};
  try{
    await t.test('an RLS-filtered empty PATCH fails without writing a browser copy',async()=>{
      globalThis.fetch=async()=>response([]);
      await assert.rejects(adminApi('users/update',input),/Database chưa xác nhận/);
      assert.equal(localWrites,0);
    });
    await t.test('missing tables and denied writes do not fall back to local success',async()=>{
      for(const status of [403,404]){
        globalThis.fetch=async()=>response({message:'Denied by server'},status);
        await assert.rejects(adminApi('users/update',input),/Denied by server/);
      }
      assert.equal(localWrites,0);
    });
    await t.test('missing or invalid keys cannot produce an unfiltered update',async()=>{
      globalThis.fetch=()=>{throw new Error('must not fetch');};
      for(const key of [{},{id:null},{role:'CUSTOMER'},{'id&x':'bad'}])await assert.rejects(adminApi('users/update',{...input,key}),/Không xác định/);
    });
    await t.test('role change is verified with an uncached GET before success',async()=>{
      const calls=[];
      globalThis.fetch=async(url,options)=>{calls.push({url,options});return response([{id,role:'RECEPTIONIST'}]);};
      assert.equal((await adminApi('users/update',input)).role,'RECEPTIONIST');
      assert.equal(calls.length,2);assert.equal(calls[0].options.method,'PATCH');
      assert.deepEqual(JSON.parse(calls[0].options.body),{role:'RECEPTIONIST'});
      assert.match(calls[1].url,/select=id,role/);assert.equal(calls[1].options.cache,'no-store');
    });
    await t.test('a stale read, wrong identity or failed verification never claims success',async()=>{
      for(const result of [[{id,role:'CUSTOMER'}],[{id:'other',role:'RECEPTIONIST'}],[]]){
        let calls=0;globalThis.fetch=async()=>response(++calls===1?[{id,role:'RECEPTIONIST'}]:result);
        await assert.rejects(adminApi('users/update',input),/Chưa xác minh/);
      }
    });
    await t.test('updates with multiple returned rows fail rather than accepting an arbitrary account',async()=>{
      globalThis.fetch=async()=>response([{id},{id:'other'}]);
      await assert.rejects(adminApi('users/update',input),/Database chưa xác nhận/);
    });
  }finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow;globalThis.localStorage=originalStorage;}
});
