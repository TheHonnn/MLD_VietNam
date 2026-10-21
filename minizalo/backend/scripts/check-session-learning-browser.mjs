import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await workflowFixture(),{db,id}=f,page=await browser.newPage({viewport});
    const holds=new Map(),allHolds=[],errors=[];let registrationOwner=1,failDraft=false;
    page.on('pageerror',error=>errors.push(error.message));
    const hold=(method,path,overrideStatus)=>{
      let release;const gate=new Promise(resolve=>release=resolve);
      const entry={gate,release,seen:false,overrideStatus};holds.set(method+' '+path,entry);allHolds.push(entry);return entry;
    };
    const waitHold=async entry=>{
      for(let n=0;n<150&&!entry.seen;n++)await page.waitForTimeout(20);
      assert.equal(entry.seen,true,'Expected a real fixture response to reach its gate');
    };
    const install=async owner=>{
      registrationOwner=owner;
      const installed=await page.evaluate(async()=>Boolean((await window.auditApi.registerZaloProfile('isolated-proof',{fullName:'Fixture customer'}))?.token));
      assert.equal(installed,true);
    };
    try{
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/auth/zalo/register'){
          const current=await f.request('/auth/me',{owner:registrationOwner});
          return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,data:{user:current.data.user,token:f.headers(registrationOwner).Authorization.replace(/^Bearer /,'')}})});
        }
        if(failDraft&&url.pathname.endsWith('/quiz/draft')){
          failDraft=false;
          return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Temporary fixture failure'})});
        }
        const headers=f.headers();if(req.headers().authorization)headers.Authorization=req.headers().authorization;
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});
        let status=response.status,body=await response.text();
        const entry=holds.get(req.method()+' '+url.pathname);
        if(entry){holds.delete(req.method()+' '+url.pathname);entry.seen=true;await entry.gate;if(entry.overrideStatus){status=entry.overrideStatus;body=JSON.stringify({success:false,message:'Authentication required'});}}
        await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.evaluate(async()=>{
        const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>new URL(url).pathname.endsWith('/api/client.ts'));
        window.auditApi=(await import(url||'/api/client.ts')).apiClient;
      });
      await install(1);await page.evaluate(()=>window.auditApi.clearReadCache());
      const privateGates=[hold('GET','/api/auth/me'),hold('GET',`/api/services/${id(5)}/favorite`),hold('GET',`/api/bookings/${id(13)}/slots`),hold('GET','/api/membership'),hold('GET','/api/slots')];
      const publicGate=hold('GET','/api/services');
      await page.evaluate(({serviceId,bookingId,branchId})=>{
        window.oldReads=Promise.all([window.auditApi.getCurrentUser(),window.auditApi.getServiceFavorite(serviceId),window.auditApi.getBookingSlots(bookingId,'2099-01-12'),window.auditApi.getMembership(),window.auditApi.getSlots(branchId,'2099-01-12',serviceId,undefined,new AbortController().signal)]);
        window.publicRead=window.auditApi.getServices();
      },{serviceId:id(5),bookingId:id(13),branchId:id(3)});
      for(const entry of [...privateGates,publicGate])await waitHold(entry);
      await page.evaluate(()=>window.auditApi.logout());await install(2);
      for(const entry of [...privateGates,publicGate])entry.release();
      const stale=await page.evaluate(async()=>(await window.oldReads).map(result=>({status:result?.status,isNull:result===null,hasError:Boolean(result?.error),hasUser:Boolean(result?.user)})));
      assert.ok(stale.every((result,index)=>!result.hasUser&&(index===3?result.isNull:result.status===401&&result.hasError)),JSON.stringify(stale));
      assert.equal(await page.evaluate(async()=>Array.isArray((await window.publicRead)?.services)),true,'Public catalogs survive a session change');
      const oldFailure=hold('GET','/api/auth/me',401);
      await page.evaluate(()=>{window.oldFailure=window.auditApi.getCurrentUser();});await waitHold(oldFailure);
      await page.evaluate(()=>window.auditApi.logout());await install(1);
      const epoch=await page.evaluate(()=>{window.expiryEvents=0;window.activityEvents=0;window.addEventListener('mld:session-expired',()=>window.expiryEvents++);window.addEventListener('mld:activity',()=>window.activityEvents++);return window.auditApi.sessionVersion();});
      oldFailure.release();await page.evaluate(()=>window.oldFailure);
      assert.equal(await page.evaluate(()=>window.auditApi.sessionVersion()),epoch);
      assert.equal(await page.evaluate(()=>window.expiryEvents),0,'An old 401 cannot expire a newer session');
      const mutation=hold('PUT','/api/auth/profile');
      await page.evaluate(()=>{window.oldMutation=window.auditApi.updateProfile({name:'Fixture update before logout'});});await waitHold(mutation);
      await page.evaluate(()=>window.auditApi.logout());await install(2);mutation.release();
      assert.equal((await page.evaluate(()=>window.oldMutation)).status,401);
      assert.equal(await page.evaluate(()=>window.activityEvents),0,'A stale write cannot refresh the new owner views');
      assert.equal((await page.evaluate(()=>window.auditApi.getCurrentUser())).user.id,id(2));
      await install(1);
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Học viện');await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-tabs').getByRole('button',{name:'Kiểm tra',exact:true}).click();await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();
      failDraft=true;await page.locator('fieldset').nth(0).getByRole('radio').nth(0).check();
      await page.locator('.academy-feedback [role=alert]').waitFor();
      const recovered=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/quiz/draft')&&response.status()===200);
      await page.locator('fieldset').nth(0).getByRole('radio').nth(1).check();await(await recovered).finished();
      await page.locator('.academy-feedback [role=alert]').waitFor({state:'hidden'});
      await page.locator('fieldset').nth(0).getByRole('radio').nth(0).check();await page.locator('fieldset').nth(1).getByRole('radio').nth(1).check();
      const submission=hold('POST',`/api/courses/${id(22)}/quiz/submit`);
      await page.getByRole('button',{name:'Nộp bài',exact:true}).click();await waitHold(submission);
      assert.equal(await page.getByRole('button',{name:'Tiếp tục bài học',exact:true}).isDisabled(),true);
      assert.equal(await page.locator('.academy-header .academy-back').isDisabled(),true);
      assert.equal(await page.getByRole('dialog').count(),0);
      submission.release();await page.getByText('Điểm: 100% · 2/2 câu đúng · Đạt',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Tiếp tục bài học',exact:true}).click();await page.getByRole('dialog',{name:'Practice lesson',exact:true}).waitFor();
      assert.equal((await db.query('SELECT count(*)::int AS count FROM quiz_submissions')).rows[0].count,1);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,stalePrivateReadsRejected:stale.length,publicReadPreserved:true,newSessionSurvivesOld401:true,staleMutationHasNoActivity:true,draftErrorRecovers:true,submissionNavigationLocked:true,learningAvailableAfterSubmit:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2400),errors}));throw error;}
    finally{for(const entry of allHolds)entry.release();await page.close();await f.close();}
  }
}finally{await browser.close();}
