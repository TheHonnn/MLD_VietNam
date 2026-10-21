import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { workflowFixture } from '../test/fixtures/workflow.mjs';
import { chromium } from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const fixture=await workflowFixture();
const {base,headers,id}=fixture;
const origin=process.env.PREVIEW_URL||'http://127.0.0.1:5177';
const installApiAccess = page => page.addInitScript(() => {
  window.testApi = async () => {
    const url = performance.getEntriesByType('resource').map(entry=>entry.name).find(value=>new URL(value).pathname.endsWith('/api/client.ts'));
    return (await import(url || '/api/client.ts')).apiClient;
  };
});
try {
  const guest=await browser.newPage({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 Zalo Mini App preload check'});
  await installApiAccess(guest);
  const guestRequests=[];
  await guest.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
  await guest.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(/\.(ts|tsx)$/.test(url.pathname))return route.fallback();
    guestRequests.push(url.pathname);
    const response=await fetch(base+url.pathname+url.search);
    await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
  });
  await guest.goto(origin,{waitUntil:'domcontentloaded'});
  await guest.getByRole('heading',{name:'Kết nối tài khoản Zalo',exact:true}).waitFor();
  await guest.waitForFunction(async()=>{
    const apiClient=await window.testApi();
    return Boolean(apiClient.peek('/courses')&&apiClient.peek('/support-faqs')&&apiClient.peek('/search/popular'));
  });
  assert.ok(guestRequests.includes('/api/courses'));
  assert.equal(guestRequests.some(path=>['/api/transactions','/api/course-enrollments','/api/treatment-plans'].includes(path)||path.endsWith('/learning')),false);
  console.log(JSON.stringify({publicPreloadedDuringConsent:true,noPrivateDataBeforeConsent:true}));
  await guest.close();

  for(const viewport of [{width:390,height:844},{width:320,height:640},{width:1366,height:900}]) {
    const page=await browser.newPage({viewport});
    await installApiAccess(page);
    const requests=[]; let owner=1;
    await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
    await page.route('**/api/**',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(/\.(ts|tsx)$/.test(url.pathname))return route.fallback();
      requests.push({path:url.pathname,query:url.search,method:request.method()});
      const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:headers(owner),body:request.postData()||undefined});
      await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
    });
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    await page.locator('.home-branch select:not([disabled])').waitFor();
    const paths=['/auth/settings','/transactions','/course-enrollments','/support-tickets','/consultation-surveys','/reviews/mine','/search/history'];
    await page.waitForFunction(async()=>{
      const api=await window.testApi(),enrollments=api.peek('/course-enrollments')?.enrollments;
      return enrollments?.length===2&&enrollments.every(e=>api.peek(`/courses/${e.courseId}/learning?enrollmentId=${e.id}`));
    });
    for(const path of paths) assert.equal(requests.filter(request=>request.method==='GET'&&request.path==='/api'+path).length,1,path);
    assert.equal(requests.filter(request=>request.path.endsWith('/learning')).length,2);
    const before=requests.length;
    await page.locator('.app-bottom-nav').getByRole('button',{name:'Học viện',exact:true}).click();
    await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
    await page.getByRole('button',{name:'Tiếp tục bài học',exact:true}).waitFor();
    await page.locator('.app-bottom-nav').getByRole('button',{name:'Cá nhân',exact:true}).click();
    await page.waitForTimeout(200);
    assert.equal(requests.length,before,'Opening preloaded pages should not send duplicate requests');
    await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/startup-preloaded-${viewport.width}.png`,import.meta.url))});
    // A real mutation invalidates only relevant data, not the preloaded catalog.
    const settingCount=requests.filter(request=>request.path==='/api/auth/settings'&&request.method==='GET').length;
    const changed=await page.evaluate(async()=>{const apiClient=await window.testApi();await apiClient.updateSettings({appointmentReminder:false});return await apiClient.getSettings();});
    assert.equal(changed.settings.appointmentReminder,false);
    assert.equal(requests.filter(request=>request.path==='/api/auth/settings'&&request.method==='GET').length,settingCount+1);
    const catalogCount=requests.filter(request=>request.path==='/api/courses').length;
    await page.evaluate(async()=>{const apiClient=await window.testApi();await apiClient.getCourses();});
    assert.equal(requests.filter(request=>request.path==='/api/courses').length,catalogCount);
    const slotCount=requests.filter(request=>request.path==='/api/slots').length;
    await page.evaluate(async ids=>{const apiClient=await window.testApi();await apiClient.getSlots(ids.branch,'2099-01-12',ids.service);await apiClient.getSlots(ids.branch,'2099-01-12',ids.service);},{branch:id(3),service:id(5)});
    assert.equal(requests.filter(request=>request.path==='/api/slots').length,slotCount+2);
    await page.evaluate(async()=>{const apiClient=await window.testApi();apiClient.logout();});
    owner=2;
    const next=await page.evaluate(async()=>{const apiClient=await window.testApi();const old=apiClient.peek('/course-enrollments');const fresh=await apiClient.getCourseEnrollments();return {old,fresh};});
    assert.equal(next.old,null);
    assert.deepEqual(next.fresh.enrollments,[]);
    console.log(JSON.stringify({viewport,allPrivateMetadataPreloaded:true,allEligibleClassesPreloaded:true,openingPagesUsesCache:true,mutationsInvalidate:true,slotsAlwaysFresh:true,logoutClearsPrivateData:true}));
    await page.close();
  }
} finally {await browser.close();await fixture.close();}
