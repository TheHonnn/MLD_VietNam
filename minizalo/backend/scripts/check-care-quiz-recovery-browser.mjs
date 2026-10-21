import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await workflowFixture(),{db,id}=f,page=await browser.newPage({viewport});
    const gates=[],errors=[];let supportGate,surveyGate,dropSubmit='',blockLearning=false;
    page.on('pageerror',error=>errors.push(error.message));
    const makeGate=()=>{let release;const promise=new Promise(resolve=>release=resolve);const gate={release,promise,seen:false};gates.push(gate);return gate;};
    const waitGate=async gate=>{for(let n=0;n<150&&!gate.seen;n++)await page.waitForTimeout(20);assert.equal(gate.seen,true);};
    const count=async()=> (await db.query('SELECT (SELECT count(*)::int FROM miniapp_quiz_attempts) AS attempts,(SELECT count(*)::int FROM quiz_submissions) AS submissions')).rows[0];
    const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
    const openExam=async()=>{
      await nav('Học viện');await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-tabs').getByRole('button',{name:'Kiểm tra',exact:true}).click();
    };
    const fillAnswers=async()=>{await page.locator('fieldset').nth(0).getByRole('radio').nth(0).check();await page.locator('fieldset').nth(1).getByRole('radio').nth(1).check();};
    const result=()=>page.getByText('Điểm: 100% · 2/2 câu đúng · Đạt',{exact:true});
    try{
      await db.query('UPDATE course_quizzes SET time_limit_minutes=1');
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/auth/zalo/register'){
          const user=(await f.request('/auth/me')).data.user;
          return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,data:{user,token:f.headers().Authorization.replace(/^Bearer /,'')}})});
        }
        if(blockLearning&&url.pathname.endsWith('/learning'))return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Fixture learning offline'})});
        if(dropSubmit==='before'&&url.pathname.endsWith('/quiz/submit')){dropSubmit='';return route.abort('failed');}
        const headers=f.headers();if(req.headers()['idempotency-key'])headers['Idempotency-Key']=req.headers()['idempotency-key'];
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});const body=await response.text();
        if(dropSubmit==='after'&&url.pathname.endsWith('/quiz/submit')){dropSubmit='';return route.abort('failed');}
        const gate=req.method()==='POST'?(url.pathname==='/api/support-tickets'?supportGate:url.pathname==='/api/consultation-surveys'?surveyGate:null):null;
        if(gate){gate.seen=true;await gate.promise;}
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.evaluate(async()=>{
        const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>new URL(url).pathname.endsWith('/api/client.ts'));
        const {apiClient}=await import(url||'/api/client.ts');await apiClient.registerZaloProfile('isolated-proof',{fullName:'Fixture customer'});
      });
      await nav('Cá nhân');await page.getByText('Gói liệu trình',{exact:true}).click();await page.getByRole('button',{name:'Hỗ trợ',exact:true}).click();
      await page.getByRole('textbox',{name:'Tiêu đề',exact:true}).fill('Fixture pending support');await page.getByRole('textbox',{name:'Nội dung',exact:true}).fill('Fixture support details');
      supportGate=makeGate();await page.getByRole('button',{name:'Gửi yêu cầu hỗ trợ',exact:true}).click();await waitGate(supportGate);
      assert.equal(await page.getByRole('button',{name:'Gói liệu trình',exact:true}).isDisabled(),true);
      assert.equal(await page.getByRole('button',{name:'Quay lại',exact:true}).isDisabled(),true);
      supportGate.release();await page.getByText('Đã gửi yêu cầu hỗ trợ.',{exact:true}).waitFor();supportGate=null;
      await page.getByRole('button',{name:'Gói liệu trình',exact:true}).click();await page.getByRole('button',{name:'Thông tin trước dịch vụ',exact:true}).click();
      const choices=page.locator('form select[required]');await choices.nth(0).selectOption('MEDIUM');await choices.nth(1).selectOption('no');await choices.nth(2).selectOption('no');
      surveyGate=makeGate();await page.getByRole('button',{name:'Gửi phiếu thông tin',exact:true}).click();await waitGate(surveyGate);
      assert.equal(await page.getByRole('button',{name:'Quay lại',exact:true}).isDisabled(),true);assert.equal(await choices.nth(0).isDisabled(),true);
      surveyGate.release();await page.getByText('Đã gửi phiếu thông tin.',{exact:true}).waitFor();surveyGate=null;
      assert.equal((await db.query('SELECT count(*)::int AS count FROM consultation_surveys')).rows[0].count,1);
      await page.getByRole('button',{name:'Quay lại',exact:true}).click();await openExam();
      await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();await fillAnswers();dropSubmit='after';
      await page.getByRole('button',{name:'Nộp bài',exact:true}).click();await result().waitFor();
      assert.deepEqual(await count(),{attempts:1,submissions:1},'A lost success response must recover the saved result without a new attempt');
      const rejectLocalPending=()=>{
        const set=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(this===window.localStorage&&key.startsWith('mld_quiz_pending:'))throw new DOMException('Fixture quota','QuotaExceededError');
          return set.call(this,key,value);
        };
      };
      await page.addInitScript(rejectLocalPending);await page.evaluate(rejectLocalPending);
      await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();await fillAnswers();dropSubmit='after';blockLearning=true;
      await page.getByRole('button',{name:'Nộp bài',exact:true}).click();
      const retry=page.getByRole('button',{name:'Kiểm tra / gửi lại bài nộp',exact:true});await retry.waitFor();await page.locator('.academy-feedback [role=alert]').first().waitFor();
      await page.evaluate(()=>{const now=performance.now.bind(performance);Object.defineProperty(performance,'now',{configurable:true,value:()=>now()+120000});document.dispatchEvent(new Event('visibilitychange'));});
      await page.getByRole('timer').waitFor({state:'hidden'});
      assert.equal(await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).count(),0,'An unresolved submission cannot open a fresh attempt after expiry');
      assert.deepEqual(await count(),{attempts:2,submissions:2});
      await db.query("UPDATE miniapp_quiz_attempts SET started_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour' WHERE submission_id IS NOT NULL");
      blockLearning=false;await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();await openExam();
      await retry.waitFor();assert.equal(await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).count(),0);
      await retry.click();await result().waitFor();assert.deepEqual(await count(),{attempts:2,submissions:2},'Retry after reload/expiry must reuse the same submitted attempt');
      await page.evaluate(()=>{
        const set=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key.startsWith('mld_quiz_pending:'))throw new DOMException('Fixture unavailable stores','QuotaExceededError');
          return set.call(this,key,value);
        };
      });
      await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();await fillAnswers();dropSubmit='before';
      await page.getByRole('button',{name:'Nộp bài',exact:true}).click();await retry.waitFor();await page.locator('.academy-feedback [role=alert]').first().waitFor();
      assert.deepEqual(await count(),{attempts:3,submissions:2});
      await nav('Trang chủ');await openExam();await retry.waitFor();
      assert.equal(await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).count(),0,'Unavailable storage must not lose a pending receipt on tab switches');
      await retry.click();await result().waitFor();assert.deepEqual(await count(),{attempts:3,submissions:3},'A request lost before commit must retry the original attempt');
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,careTabsAndFormsLocked:true,surveyPersistsAfterSupport:true,lostSuccessRecovered:true,pendingSurvivesReloadAndExpiry:true,localQuotaUsesSessionStorage:true,bothStoresUnavailableTabSwitch:true,originalAttemptRetriedBeforeCommit:true,noExtraAttempts:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2500),errors}));throw error;}
    finally{for(const gate of gates)gate.release();await page.close();await f.close();}
  }
}finally{await browser.close();}
