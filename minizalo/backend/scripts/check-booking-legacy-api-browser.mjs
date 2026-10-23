import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const f=await workflowFixture();
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await (useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const errors=[];
let legacyStatus=401;
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.addInitScript(()=>{
    window.__expiredSessions=0;
    window.addEventListener('mld:session-expired',()=>window.__expiredSessions++);
    window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();});
  });
  await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
    if(url.pathname==='/api/slots/dates')return route.fulfill({status:legacyStatus,contentType:'application/json',body:JSON.stringify({success:false,message:'Legacy route unavailable'})});
    if(url.pathname==='/api/auth/zalo/register'){
      const current=await f.request('/auth/me');
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{user:current.data.user,token:f.headers().Authorization.replace(/^Bearer /,'')}})});
    }
    const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
    await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
  });
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
  await page.locator('.home-branch select:not([disabled])').waitFor();
  await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(name=>/\/api\/client\.ts(?:\?|$)/.test(name));
    const {apiClient}=await import(url||'/api/client.ts');
    const result=await apiClient.registerZaloProfile('fixture-registration',{fullName:'Workflow customer'});
    if(!result.token)throw new Error('Fixture login failed');
  });
  await page.locator('.home-feature .home-book-button').click();
  const flow=page.locator('.booking-flow'),next=()=>flow.locator('.booking-footer > button').click();
  await flow.locator('.booking-service-choice').filter({hasText:'Workflow service'}).click();
  await next();await next();await next();
  const error=flow.getByRole('alert').filter({hasText:'Máy chủ chưa cập nhật'});
  await error.waitFor();
  await flow.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).fill('2099-01-12');
  await flow.getByRole('button',{name:'10:00 - 11:00',exact:true}).click();
  assert.equal(await flow.locator('.booking-footer > button').isEnabled(),true);
  legacyStatus=404;
  await error.getByRole('button',{name:'Thử tải ngày trống',exact:true}).click();
  await error.waitFor();
  const state=await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(name=>/\/api\/client\.ts(?:\?|$)/.test(name));
    const {apiClient}=await import(url||'/api/client.ts');
    return {expired:window.__expiredSessions,user:(await apiClient.getCurrentUser()).user?.id};
  });
  assert.equal(state.expired,0);assert.equal(state.user,f.id(1));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',legacyDates401And404PreserveSession:true,manualDateAndRealSlotsWork:true,noPageErrors:true}));
}finally{await browser.close();await f.close();}
