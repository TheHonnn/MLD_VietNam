import assert from 'node:assert/strict';
import { chromium } from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:5177';
const apiBase = (process.env.TEST_API_URL || 'http://127.0.0.1:5107/api').replace(/\/$/,'');
const watchBrowserErrors=async page=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.stack||error.message));
  await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{
    // Desktop Chrome has no native Zalo login bridge; retain every other error.
    if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();
  }));
  return errors;
};
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const viewport of [{width:390,height:844}, {width:320,height:640}, {width:1366,height:900}]) {
    const page = await browser.newPage({viewport});
    const errors = await watchBrowserErrors(page), requests = [];
    page.on('response', response => { if (response.url().includes('/api/')) requests.push({url:response.url(),status:response.status()}); });
    await page.route('**/*', route => ['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.goto(origin, {waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    await page.locator('.home-branch select:not([disabled])').waitFor({timeout:45000});
    const actual = await page.request.get(apiBase+'/services');
    const services = (await actual.json()).data.services;
    const title = await page.locator('.home-feature h2').innerText();
    assert.ok(services.some(service=>service.name === title));
    assert.equal(await page.locator('.home-feature svg image').count(),0);
    assert.equal(await page.locator('.home-dashboard').evaluate(element=>element.scrollWidth > element.clientWidth),false);
    await page.screenshot({path:new URL(`../.relay-local/mini-home-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
    await page.locator('.app-bottom-nav').getByRole('button',{name:'Học viện',exact:true}).click();
    await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).waitFor();
    await page.waitForTimeout(500);
    assert.equal(requests.filter(request=>request.url.includes('/course-enrollments')).length,0);
    assert.doesNotMatch(await page.locator('body').innerText(),/Shared account authentication|Không thể tải đăng ký học/);
    await page.screenshot({path:new URL(`../.relay-local/mini-academy-guest-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
    await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
    await page.getByRole('dialog',{name:'Đăng nhập',exact:true}).waitFor();
    assert.equal(requests.filter(request=>request.url.includes('/course-enrollments')).length,0);
    await page.getByRole('button',{name:'Đóng',exact:true}).click();
    console.log(JSON.stringify({guestCatalogWithoutAuthenticationError:true,privateAcademyRequiresLogin:true}));
    console.log(JSON.stringify({viewport,realCatalog:true,requests,errors}));
    assert.deepEqual(errors,[],'Unexpected browser errors must fail the smoke test');
    await page.close();
  }
  const emptyPage = await browser.newPage({viewport:{width:390,height:844}});
  const emptyErrors=await watchBrowserErrors(emptyPage);
  await emptyPage.route(apiBase+'/**', async route => {
    assert.ok(['GET','HEAD','OPTIONS'].includes(route.request().method()));
    const path = new URL(route.request().url()).pathname.split('/').pop();
    const fields = {services:'services',doctors:'doctors',branches:'branches',courses:'courses','care-guidelines':'guidelines','course-enrollments':'enrollments'};
    const data = fields[path] ? {[fields[path]]:[]} : {serviceCategories:[],courseCategories:[],instructors:[],membershipTiers:[],loyaltySettings:null,faqs:[]};
    await route.fulfill({status:path==='me'?401:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},
      body:JSON.stringify(path==='me'?{success:false,statusCode:401,message:'Authentication required'}:{success:true,statusCode:200,data})});
  });
  await emptyPage.goto(origin,{waitUntil:'domcontentloaded'});
  await emptyPage.getByRole('button',{name:'Bỏ qua',exact:true}).click();
  await emptyPage.locator('.home-data-status').waitFor({state:'hidden',timeout:10000});
  assert.equal(await emptyPage.locator('.home-feature h2').innerText(),'');
  assert.equal(await emptyPage.locator('.home-feature img').count(),0);
  assert.equal(await emptyPage.locator('.home-book-button').isDisabled(),true);
  for (const label of ['Dịch vụ','Học viện','Trang chủ']) {
    await emptyPage.locator('.app-bottom-nav').getByRole('button',{name:label,exact:true}).click();
    assert.doesNotMatch(await emptyPage.locator('body').innerText(),/Chưa có|Chưa cập nhật|Không có dịch vụ|Không tìm thấy/);
  }
  await emptyPage.screenshot({path:new URL('../.relay-local/mini-empty.png',import.meta.url).pathname.slice(1)});
  console.log(JSON.stringify({emptyCatalog:true,blankMissingContent:true,bookingDisabled:true}));
  await emptyPage.route(apiBase+'/**', route => route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,statusCode:503,message:'Service unavailable'})}));
  await emptyPage.reload({waitUntil:'domcontentloaded'});
  await emptyPage.getByRole('button',{name:'Bỏ qua',exact:true}).click();
  await emptyPage.locator('.home-data-status[role=alert]').waitFor();
  console.log(JSON.stringify({networkErrorsRemainVisible:true}));
  assert.deepEqual(emptyErrors,[],'Empty and offline screens must not hide browser errors');
  await emptyPage.close();
} finally { await browser.close(); }
