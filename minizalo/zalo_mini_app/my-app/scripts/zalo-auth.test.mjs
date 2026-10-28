import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

let sequence=0;
const staff={id:'10000000-0000-0000-0000-000000000090',fullName:'Isolated staff',phone:'0900000090',role:'RECEPTIONIST',membershipTier:'BRONZE',rewardPoints:0,totalSpent:0,purpose:'BOTH'};
const response=(data={},status=200,message='OK')=>Response.json({success:status<400,statusCode:status,message,data},{status});
async function client(fixture){
  globalThis.__zaloAuthFixture=fixture;
  const result=await build({entryPoints:[fileURLToPath(new URL('../src/api/client.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent',define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('https://fixture.invalid/api')},plugins:[{
    name:'isolated-zalo-sdk',setup(builder){
      builder.onResolve({filter:/^zmp-sdk$/},()=>({path:'zmp-sdk',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`const f=globalThis.__zaloAuthFixture;export const nativeStorage=f.storage;export const getPhoneNumber=()=>f.phone();export const getAccessToken=()=>Promise.resolve('isolated-access');export const getUserInfo=()=>f.profile?f.profile():Promise.resolve({userInfo:{}});`,loader:'js'}));
    },
  }]});
  const api=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64')+'#'+(++sequence))).apiClient;
  return api;
}

test('Mini App Zalo auth keeps permissions and storage failures separate',async t=>{
  const originalWindow=globalThis.window;
  try{
    await t.test('a denied native storage is tried once and never floods writes/removals on auth retries',async()=>{
      let reads=0,writes=0,removes=0,phones=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async input=>new URL(input).pathname.endsWith('/auth/zalo')?response({},403,'Staff booking access is required'):response({status:'ok'})};
      const api=await client({storage:{getItem(){reads++;throw new DOMException('Denied','SecurityError');},setItem(){writes++;throw new Error('must not retry');},removeItem(){removes++;throw new Error('must not retry');}},phone:()=>{phones++;return Promise.resolve({token:'isolated-phone'});}});
      for(let i=0;i<12;i++)await api.getHealth();
      for(let i=0;i<2;i++){const result=await api.loginWithZalo(true);assert.equal(result.status,403);assert.equal(result.authIssue,'STAFF_ACCESS_REQUIRED');assert.equal(result.user,undefined);}
      assert.deepEqual([reads,writes,removes,phones],[1,0,0,2]);assert.equal(api.getSessionDiagnostics().nativeStorageAvailable,false);
    });
    await t.test('failed native writes retain only the in-memory authenticated session and are not repeated',async()=>{
      let writes=0,removes=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async input=>new URL(input).pathname.endsWith('/auth/logout')?new Response(null,{status:204}):response({user:staff,token:'isolated-token'})};
      const api=await client({storage:{getItem:()=>'',setItem(){writes++;throw new DOMException('Full','QuotaExceededError');},removeItem(){removes++;}},phone:()=>Promise.resolve({token:'isolated-phone'})});
      assert.equal((await api.loginWithZalo(true)).user.id,staff.id);assert.equal((await api.loginWithZalo(true)).user.id,staff.id);
      assert.equal(api.getSessionDiagnostics().verifiedZaloSessionThisPage,true);assert.equal(writes,1);assert.equal(removes,1);
      await api.logout();assert.equal(api.hasSession(),false);assert.equal(api.getSessionDiagnostics().verifiedZaloSessionThisPage,false);
    });
    await t.test('a cached token cannot silently select the previous host-Zalo account on a new page',async()=>{
      let phones=0,me=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async input=>{const path=new URL(input).pathname;if(path.endsWith('/auth/me'))me++;return response(path.endsWith('/auth/zalo')?{user:staff,token:'new-host-token'}:path.endsWith('/auth/me')?{user:staff}:{status:'ok'});}};
      const api=await client({storage:{getItem:()=> 'previous-account-token',setItem(){},removeItem(){}},phone:()=>{phones++;return Promise.resolve({token:'current-host-phone'});}});
      await api.getHealth();assert.equal((await api.loginWithZalo(false)).needsConsent,true);assert.equal(me,0);assert.equal(phones,0);
      await api.loginWithZalo(true);assert.equal((await api.loginWithZalo(false)).user.id,staff.id);assert.equal(phones,1);assert.equal(me,1);
    });
    await t.test('an inactive staff profile has a distinct reason; an unrelated provider 403 is not relabeled as staff access',async()=>{
      let message='Active staff profile and branch are required';
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async()=>response({},403,message)};
      const api=await client({storage:{getItem:()=>'',setItem(){throw new Error('must not persist');},removeItem(){}},phone:()=>Promise.resolve({token:'isolated-phone'})});
      assert.equal((await api.loginWithZalo(true)).authIssue,'STAFF_PROFILE_INACTIVE');
      message='No shared staff account matches the verified Zalo phone';assert.equal((await api.loginWithZalo(true)).authIssue,'STAFF_ACCOUNT_NOT_FOUND');
      message='Provider denied request';assert.equal((await api.loginWithZalo(true)).authIssue,undefined);
      assert.equal(api.hasSession(),false);
    });
    await t.test('unified login accepts the actual customer role without making it employee access',async()=>{
      let writes=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async()=>response({user:{...staff,role:'CUSTOMER'},token:'must-not-save'})};
      const api=await client({storage:{getItem:()=>'',setItem(){writes++;},removeItem(){}},phone:()=>Promise.resolve({token:'isolated-phone'})});
      const result=await api.loginWithZalo(true);assert.equal(result.user.role,'patient');assert.equal(api.hasSession(),true);assert.equal(writes,1);
    });
    await t.test('one login accepts actual customer/staff roles and registration challenges, never a client-selected role',async()=>{
      let reply={user:{...staff,role:'CUSTOMER'},token:'customer-token'};
      const bodies=[];
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async(_input,options)=>{bodies.push(JSON.parse(options.body));return response(reply);}};
      const api=await client({storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>Promise.resolve({token:'phone'})});
      assert.equal((await api.loginWithZalo(true)).user.role,'patient');assert.equal(api.hasSession(),true);
      assert.equal(bodies[0].audience,undefined);assert.equal(bodies[0].role,undefined);
      reply={registrationRequired:true,registrationToken:'registration-proof',phone:'0900000090'};
      const challenge=await api.loginWithZalo(true);assert.equal(challenge.registrationRequired,true);assert.equal(api.hasSession(),false);
      reply={user:staff,token:'unmatched-staff'};
      assert.equal((await api.loginWithZalo(true)).user.role,'receptionist');assert.equal(api.hasSession(),true);
      reply={user:{...staff,role:'UNKNOWN'},token:'invalid-role'};
      assert.equal((await api.loginWithZalo(true)).status,403);assert.equal(api.hasSession(),false);
    });
    await t.test('permission denial and duplicate clicks release auth without creating a fake login',async()=>{
      let complete,requests=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async()=>{requests++;return response({user:staff,token:'isolated-token'});}};
      const fixture={storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'))};
      const api=await client(fixture);assert.ok((await api.loginWithZalo(true)).error);assert.equal(requests,0);
      fixture.phone=()=>new Promise(resolve=>{complete=resolve;});const pending=api.loginWithZalo(true);assert.match((await api.loginWithZalo(true)).error,/Đang kết nối/);complete({token:'isolated-phone'});assert.equal((await pending).user.id,staff.id);assert.equal(requests,1);
    });
    await t.test('cancelled SDK results cannot overwrite a subsequent verified account',async()=>{
      let finish,requests=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async()=>{requests++;return response({user:staff,token:'latest-token'});}};
      const fixture={storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>new Promise(resolve=>{finish=resolve;})};
      const api=await client(fixture),old=api.loginWithZalo(true);api.cancelZaloLogin();assert.ok((await old).error);
      fixture.phone=()=>Promise.resolve({token:'new-phone'});assert.equal((await api.loginWithZalo(true)).user.id,staff.id);finish({token:'old-phone'});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(requests,1);assert.equal(api.getSessionDiagnostics().verifiedZaloSessionThisPage,true);
    });
    await t.test('an actual role change is reflected in the common login without retaining the old employee role',async()=>{
      const events=[];
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:event=>{events.push(event.type);return true;},fetch:async input=>response(new URL(input).pathname.endsWith('/auth/zalo')?{user:staff,token:'isolated-token'}:{user:{...staff,role:'CUSTOMER'}})};
      const api=await client({storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>Promise.resolve({token:'isolated-phone'})});
      await api.loginWithZalo(true);assert.equal((await api.loginWithZalo(false)).user.role,'patient');assert.equal(api.hasSession(),true);
      assert.deepEqual(events,[]);
    });
    await t.test('losing operational access invalidates cached work reads while preserving the common login',async()=>{
      let bookingReads=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async input=>{
        const path=new URL(input).pathname;
        if(path.endsWith('/auth/zalo'))return response({user:{...staff,staffAccess:true,staffBranchId:'10000000-0000-0000-0000-000000000003'},token:'unified-token'});
        if(path.endsWith('/auth/me'))return response({user:{...staff,staffAccess:false,staffBranchId:null}});
        bookingReads++;return response({bookings:[],nextCursor:null});
      }};
      const api=await client({storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>Promise.resolve({token:'phone'})});
      await api.loginWithZalo(true);await api.getBookings();await api.getBookings();assert.equal(bookingReads,1);
      const current=await api.loginWithZalo(false);assert.equal(current.user.staffAccess,false);assert.equal(api.hasSession(),true);
      await api.getBookings();assert.equal(bookingReads,2);
    });
    await t.test('Zalo name and photo update only the verified current account, never role or phone',async()=>{
      const writes=[];
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async(input,init)=>{const path=new URL(input).pathname;if(path.endsWith('/auth/profile')){const patch=JSON.parse(init.body);writes.push(patch);return response({user:{...staff,...patch}});}return response({user:staff,token:'profile-owner-token'});}};
      const api=await client({storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>Promise.resolve({token:'verified-phone'}),profile:()=>Promise.resolve({userInfo:{name:'Current Zalo name',avatar:'https://images.test/current.png'}})});
      await api.loginWithZalo(true);const synced=await api.syncZaloProfile();assert.equal(synced.user.name,'Current Zalo name');assert.equal(synced.user.avatar,'https://images.test/current.png');assert.deepEqual(writes,[{fullName:'Current Zalo name',avatarUrl:'https://images.test/current.png'}]);
      api.clearUnverifiedSession();assert.equal(api.hasSession(),true);
    });
    await t.test('a late Zalo profile cannot be written to a newly signed-in account',async()=>{
      let finish,writes=0;
      globalThis.window={setTimeout,clearTimeout,dispatchEvent:()=>true,fetch:async(input)=>{const path=new URL(input).pathname;if(path.endsWith('/auth/profile'))writes++;return response({user:staff,token:'profile-owner-token'});}};
      const api=await client({storage:{getItem:()=>'',setItem(){},removeItem(){}},phone:()=>Promise.resolve({token:'verified-phone'}),profile:()=>new Promise(resolve=>{finish=resolve;})});
      await api.loginWithZalo(true);const old=api.syncZaloProfile();await api.logout();await api.loginWithZalo(true);finish({userInfo:{name:'Old owner',avatar:'https://images.test/old.png'}});assert.equal((await old).skipped,true);assert.equal(writes,0);
    });
  }finally{globalThis.window=originalWindow;delete globalThis.__zaloAuthFixture;}
});
