import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await workflowFixture(),page=await browser.newPage({viewport}),errors=[];let offline=true,owner=1;
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(offline&&url.pathname==='/api/membership')return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Fixture membership offline'})});
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(owner),body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Cá nhân',exact:true}).click();
      const alert=page.getByRole('alert').filter({has:page.getByRole('button',{name:'Thử lại',exact:true})});await alert.waitFor();
      const metrics=page.locator('[aria-busy] > button');assert.equal(await metrics.count(),3);
      assert.deepEqual(await metrics.locator('span:first-child').allTextContents(),['','','']);
      offline=false;await alert.getByRole('button',{name:'Thử lại',exact:true}).click();
      const expected=(await f.request('/membership')).data.summary;
      await page.waitForFunction(()=>{
        const metrics=document.querySelector('[aria-busy="false"]');
        return metrics&&Array.from(metrics.querySelectorAll('button > span:first-child')).every(span=>span.textContent!=='');
      });
      assert.deepEqual(await metrics.locator('span:first-child').allTextContents(),[String(expected.upcomingBookings),String(expected.remainingTreatmentSessions),String(expected.activeCourses)]);
      assert.equal(await alert.count(),0);
      owner=2;await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Cá nhân',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('[aria-busy="false"] button > span:first-child')?.textContent==='0');
      assert.deepEqual(await metrics.locator('span:first-child').allTextContents(),['0','0','0']);
      assert.equal(await alert.count(),0);assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,failedMembershipIsNotZero:true,errorVisible:true,retryLoadsCanonicalCounts:true,realZeroCountsRemainVisible:true,noPageErrors:true}));
    }finally{await page.close();await f.close();}
  }
}finally{await browser.close();}
