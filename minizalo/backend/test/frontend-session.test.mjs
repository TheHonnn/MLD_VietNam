import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../../zalo_mini_app/my-app/src/api/client.ts',import.meta.url),'utf8');
const cacheSource=await readFile(new URL('../../zalo_mini_app/my-app/src/api/read-cache.ts',import.meta.url),'utf8');
const asyncSource=await readFile(new URL('../../zalo_mini_app/my-app/src/utils/async-control.ts',import.meta.url),'utf8');
const verificationSource=await readFile(new URL('../../zalo_mini_app/my-app/src/utils/certificate-verification.ts',import.meta.url),'utf8');
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
import {abortable} from ${JSON.stringify(moduleUrl(asyncSource))};
import {certificateVerificationUrl as verificationLink} from ${JSON.stringify(moduleUrl(verificationSource))};
class OwnerWriteQueue {run(_key,operation){return operation();}}
const getAccessToken=()=>Promise.resolve('fixture-access'),getPhoneNumber=()=>globalThis.__zaloAuthFixture?.()??Promise.resolve({token:'fixture-phone'}),getUserInfo=()=>{};
const isStaffRole=role=>['ADMIN','RECEPTIONIST'].includes(role);
const isCustomerRole=role=>['CUSTOMER','STUDENT','patient'].includes(role);
const isMiniAppRole=role=>isStaffRole(role)||isCustomerRole(role);
// fixture ${++sequence}
`;
  return (await import(moduleUrl(prefix+isolated))).apiClient;
}

test('native session reads and public availability failures do not break authentication',async t=>{
  const originalWindow=globalThis.window;
  const events=[];
  globalThis.window={setTimeout,clearTimeout,fetch:async()=>new Response(JSON.stringify({success:true,data:{}})),dispatchEvent:event=>{events.push(event.type);return true;}};
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
    await t.test('late reads and remote logout for account A cannot replace or clear account B',async()=>{
      events.length=0;let stored='account-a',resolveRead,resolveLogout;
      const api=await client({getItem:()=>stored,setItem(_key,value){stored=value;},removeItem(){stored='';}});
      window.fetch=async(input,init)=>{
        const path=new URL(input).pathname;
        if(path.endsWith('/auth/logout')){assert.equal(new Headers(init.headers).get('Authorization'),'Bearer account-a');return new Promise(resolve=>resolveLogout=resolve);}
        if(path.endsWith('/auth/zalo'))return Response.json({success:true,data:{token:'account-b',user:{id:'b',role:'ADMIN'}}});
        return new Promise(resolve=>resolveRead=resolve);
      };
      const oldRead=api.getCurrentUser(),logout=api.logout();assert.equal(stored,'');
      const signedIn=await api.loginWithZalo(true,'staff');assert.equal(signedIn.user.id,'b');assert.equal(stored,'account-b');
      resolveRead(Response.json({success:true,data:{user:{id:'a'}}}));assert.equal((await oldRead).status,401);
      resolveLogout(Response.json({success:true,data:{revoked:true}}));assert.equal((await logout).revoked,true);assert.equal(stored,'account-b');
      assert.deepEqual(events,['mld:session-cleared']);
    });
    await t.test('permission denial, cancellation and offline logout always release loading without fake login',async()=>{
      let stored='';const api=await client({getItem:()=>stored,setItem(_key,value){stored=value;},removeItem(){stored='';}});
      globalThis.__zaloAuthFixture=()=>Promise.reject({code:-1,message:'Permission denied'});
      assert.match((await api.loginWithZalo(true)).error,/Permission denied/);assert.equal(api.hasSession(),false);
      let release;globalThis.__zaloAuthFixture=()=>new Promise(resolve=>release=resolve);
      const pending=api.loginWithZalo(true);api.cancelZaloLogin();release({token:'late-phone'});
      assert.ok((await pending).error);assert.equal(api.hasSession(),false);
      delete globalThis.__zaloAuthFixture;
      const online=await client({getItem:()=> 'old-session',removeItem(){stored='';}});
      window.fetch=async()=>{throw new TypeError('Offline');};
      assert.ok((await online.logout()).error);assert.equal(online.hasSession(),false);
    });
  }finally{globalThis.window=originalWindow;delete globalThis.__sessionFixture;}
});
