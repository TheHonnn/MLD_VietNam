import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const fixture=await workflowFixture();
const {db,id,base,headers}=fixture;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.addInitScript(()=>{
    window.addEventListener('unhandledrejection',event=>{
      // Chrome has no native Zalo login bridge; retain all other application errors.
      if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();
    });
  });
  await db.query("INSERT INTO notifications(user_id,title,message,type,data,created_at) SELECT $1,'Persisted event '||n,'Actual event history','SYSTEM',jsonb_build_object('channel','activity','eventSequence',nextval('miniapp_notification_sequence')),clock_timestamp() FROM generate_series(1,125) n",[id(1)]);
  await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
  await page.route('**/api/**',async route=>{
    if(route.request().resourceType()==='script')return route.fallback();
    const request=route.request(),url=new URL(request.url());
    const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:headers(),body:request.postData()||undefined});
    await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
  });
  await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:5177/')+`?serviceId=${id(5)}`,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
  await page.locator('.service-detail').getByRole('heading',{name:'Workflow service',exact:true}).waitFor();
  await page.locator('.service-detail').getByRole('button',{name:'Quay lại',exact:true}).click();
  await page.locator('.home-bell').click();
  const heading=page.getByRole('heading',{name:'Thông báo',exact:true});
  await heading.waitFor();
  const panel=heading.locator('..').locator('..');
  const events=panel.locator('main > button').filter({hasText:'Actual event history'});
  await events.nth(49).waitFor();assert.equal(await events.count(),50);
  await panel.getByRole('button',{name:'Xem thông báo cũ hơn',exact:true}).click();
  await events.nth(99).waitFor();assert.equal(await events.count(),100);
  await panel.getByRole('button',{name:'Xem thông báo cũ hơn',exact:true}).click();
  await events.nth(124).waitFor();assert.equal(await events.count(),125);
  assert.equal((await fixture.request('/notifications')).data.unreadCount>125,true);
  await panel.getByRole('button',{name:'Đọc tất cả',exact:true}).click();
  await panel.getByRole('button',{name:'Chưa đọc (0)',exact:true}).waitFor();
  assert.equal((await fixture.request('/notifications')).data.unreadCount,0);
  await page.screenshot({path:fileURLToPath(new URL('../.relay-local/reliability-inbox-390.png',import.meta.url))});
  // Exercise the shared expiry handler without a real Zalo session in Chrome.
  await page.evaluate(()=>window.dispatchEvent(new Event('mld:session-expired')));
  await heading.waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'Kết nối tài khoản Zalo',exact:true}).waitFor();
  assert.equal(await page.locator('.mini-app-shell').evaluate(element=>element.scrollWidth>element.clientWidth+1),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({isolatedDatabase:true,serviceDeepLink:true,pagination125Events:true,readAllPersists:true,sessionExpiryClosesPrivateViews:true,noOverflow:true}));
}catch(failure){
  console.error((await page.locator('body').innerText()).slice(-5000));throw failure;
}finally{await page.close();await browser.close();await fixture.close();}
