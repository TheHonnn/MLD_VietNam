import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const f=await workflowFixture();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],privateRequests=[];
let releaseBranches,holdBranches=true;
const branchGate=new Promise(resolve=>releaseBranches=resolve);
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
  await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
    if(['/api/bookings','/api/records','/api/membership','/api/notifications','/api/treatment-plans','/api/auth/settings'].includes(url.pathname))privateRequests.push(url.pathname);
    const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:{'Content-Type':'application/json'},body:req.postData()||undefined});
    const body=await response.text();
    if(holdBranches&&url.pathname==='/api/branches')await branchGate;
    await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
  });
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
  await page.locator('.home-data-status[role=status]').waitFor();
  assert.equal(await page.locator('.home-about > div').count(),0,'Unknown branch/course counts must not be displayed as actual zeroes');
  for(const selector of ['.home-branch select','.home-book-button','.home-search-field'])assert.equal(await page.locator(selector).isDisabled(),true);
  for(const title of ['Cập nhật dữ liệu','Khám phá dịch vụ và tiện ích'])assert.equal(await page.getByTitle(title,{exact:true}).isDisabled(),true);
  holdBranches=false;releaseBranches();await page.locator('.home-branch select:not([disabled])').waitFor();
  await page.locator('.home-about').getByText('1 chi nhánh',{exact:true}).waitFor();
  for(const action of [()=>page.getByTitle('Hồ sơ cá nhân',{exact:true}).click(),()=>page.locator('.home-bell').click(),()=>page.locator('.home-book-button').click()]) {
    await action();const login=page.getByRole('dialog',{name:'Đăng nhập',exact:true});await login.waitFor();await login.getByRole('button',{name:'Đóng',exact:true}).click();
    assert.equal(await page.locator('.home-dashboard').isVisible(),true);
  }
  assert.deepEqual(privateRequests,[],'Home guest actions must not load protected customer records');
  await f.db.query('UPDATE services SET is_active=false');await f.db.query('UPDATE branches SET is_active=false');await f.db.query('UPDATE courses SET is_active=false');
  await page.getByTitle('Cập nhật dữ liệu',{exact:true}).click();
  await page.locator('.home-about').getByText('0 dịch vụ',{exact:true}).waitFor();
  assert.equal(await page.locator('.home-feature h2').innerText(),'');assert.equal(await page.locator('.home-feature img').count(),0);
  assert.equal(await page.locator('.home-book-button').isDisabled(),true);assert.equal(await page.locator('.home-branch select').isDisabled(),true);
  assert.equal(await page.locator('.home-information').getByRole('heading',{name:'Câu hỏi thường gặp',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({slowCatalogHasNoInventedZeroCounts:true,loadingControlsLocked:true,guestActionsRequireLogin:true,noPrivateGuestReads:true,emptyContentRemainsBlank:true,noPageErrors:true}));
} finally {releaseBranches();await page.close();await browser.close();await f.close();}
