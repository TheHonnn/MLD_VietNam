import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]) {
    const f=await workflowFixture(),page=await browser.newPage({viewport}),errors=[];
    let hold=false,pending=false,release;
    const gate=new Promise(resolve=>release=resolve);
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await f.db.query("INSERT INTO notifications(id,user_id,title,message,type,data) VALUES($1,$2,'Delayed navigation notification','Open the actual booking','BOOKING',$3::jsonb)",[f.id(950),f.id(1),JSON.stringify({target:{screen:'booking',entityId:f.id(13)}})]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
        const body=await response.text();
        if(hold&&url.pathname==='/api/bookings'){pending=true;await gate;}
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.home-bell').click();
      await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor();
      hold=true;await page.getByRole('button').filter({has:page.getByText('Delayed navigation notification',{exact:true})}).click();
      for(let n=0;n<150&&!pending;n++)await page.waitForTimeout(20);
      assert.equal(pending,true,'Hold the real booking lookup after the notification is marked read');
      await page.getByRole('button',{name:'Quay lại',exact:true}).click();
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Học viện',exact:true}).click();
      await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).waitFor();
      const responseDone=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/bookings');
      release();await(await responseDone).finished();await page.waitForTimeout(150);
      assert.equal(await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).isVisible(),true);
      assert.equal(await page.locator('.appointment-detail').count(),0);
      assert.equal((await f.db.query('SELECT is_read FROM notifications WHERE id=$1',[f.id(950)])).rows[0].is_read,true);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,closedNotificationCannotRedirect:true,readPersisted:true,noPageErrors:true}));
    } catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2200)}));throw error;}
    finally {release();await page.close();await f.close();}
  }
} finally {await browser.close();}
