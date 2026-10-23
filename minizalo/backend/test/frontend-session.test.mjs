import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../../zalo_mini_app/my-app/src/api/client.ts',import.meta.url),'utf8');
const cacheSource=await readFile(new URL('../../zalo_mini_app/my-app/src/api/read-cache.ts',import.meta.url),'utf8');
const moduleUrl=code=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const parsed=ts.createSourceFile('client.ts',source,ts.ScriptTarget.Latest,true);
let isolated=source;
for(const statement of [...parsed.statements].reverse())if(ts.isImportDeclaration(statement))isolated=isolated.slice(0,statement.getFullStart())+isolated.slice(statement.end);
isolated=isolated.replace('import.meta.env.VITE_API_BASE_URL',JSON.stringify('https://fixture.invalid/api'));
let sequence=0;
async function client(storage){
  globalThis.__sessionFixture=storage;
  const prefix=`import {ReadCache} from ${JSON.stringify(moduleUrl(cacheSource))};
const nativeStorage=globalThis.__sessionFixture;
const adaptPayload=value=>value, profileToCanonical=value=>value;
const apiErrorMessage=value=>value;
const preloadCatalogImages=()=>{},bookingRequest=()=>{},completeBookingRequest=()=>{};
const abortable=value=>value;
class OwnerWriteQueue {run(_key,operation){return operation();}}
const getAccessToken=()=>{},getPhoneNumber=()=>{},getUserInfo=()=>{};
// fixture ${++sequence}
`;
  return (await import(moduleUrl(prefix+isolated))).apiClient;
}

test('native session reads and public availability failures do not break authentication',async t=>{
  const originalWindow=globalThis.window;
  const events=[];
  globalThis.window={fetch:async()=>new Response(JSON.stringify({success:true,data:{}})),dispatchEvent:event=>{events.push(event.type);return true;}};
  try{
    for(const unavailable of [false,true])await t.test(`guest native storage is resolved once (throws=${unavailable})`,async()=>{
      let reads=0;
      const api=await client({getItem(){reads++;if(unavailable)throw new DOMException('Storage denied','SecurityError');return '';}});
      await Promise.all(Array.from({length:20},()=>api.getHealth()));
      await api.getSlots('branch','date','service');
      assert.equal(reads,1);
    });
    await t.test('cancelled availability requests handle DOMException without clearing the session',async()=>{
      let clears=0;
      const api=await client({getItem:()=> 'fixture-token',removeItem(){clears++;}});
      window.fetch=async(_input,init)=>new Promise((_resolve,reject)=>{
        const cancel=()=>reject(new DOMException('Request aborted','AbortError'));
        if(init.signal.aborted)cancel();else init.signal.addEventListener('abort',cancel,{once:true});
      });
      const controller=new AbortController();
      const pending=[api.getSlots('branch','2099-01-01','service',undefined,controller.signal),api.getSlotDates('branch','2099-01-01','2099-01-31','service',undefined,controller.signal)];
      controller.abort();
      const results=await Promise.all(pending);
      assert.ok(results.every(result=>typeof result.error==='string'));
      assert.equal(clears,0);
    });
    await t.test('missing public dates route cannot clear a signed-in session; private 401 still does',async()=>{
      let reads=0,clears=0;
      const authorizations=[];
      const api=await client({getItem(){reads++;return 'fixture-token';},removeItem(){clears++;}});
      window.fetch=async(input,init)=>{
        authorizations.push(init.headers.get('Authorization'));
        return new Response(JSON.stringify({success:false,message:'Shared account authentication is required'}),{status:401});
      };
      const result=await api.getSlotDates('branch','2099-01-01','2099-01-31','service');
      assert.equal(result.status,401);assert.match(result.error,/chưa cập nhật/);
      assert.equal(clears,0);assert.deepEqual(events,[]);
      await api.getSlots('branch','2099-01-01','service');
      assert.equal(clears,0);
      await api.getCurrentUser();
      assert.equal(clears,1);assert.deepEqual(events,['mld:session-expired']);
      assert.deepEqual(authorizations,['Bearer fixture-token','Bearer fixture-token','Bearer fixture-token']);
      assert.equal(reads,1);
    });
  }finally{globalThis.window=originalWindow;delete globalThis.__sessionFixture;}
});
