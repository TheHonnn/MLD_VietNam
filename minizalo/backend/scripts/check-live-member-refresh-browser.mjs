import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]) {
    const f=await workflowFixture(),page=await browser.newPage({viewport}),errors=[];
    let firstMembership=true,membershipPending=false,claimPending=false,releaseMembership,releaseClaim;
    const membershipGate=new Promise(resolve=>releaseMembership=resolve),claimGate=new Promise(resolve=>releaseClaim=resolve);
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await f.db.query("INSERT INTO coupons(id,code,title,discount_amount,valid_from,valid_to) VALUES($1,'LIVE-WALLET','Live wallet claim',10000,'2020-01-01','2099-12-31')",[f.id(951)]);
      await f.db.query("INSERT INTO voucher_distribution_rules(coupon_id,trigger_event,valid_days_after_claim,description) VALUES($1,'PUBLIC_CLAIM',30,'Isolated live wallet rule')",[f.id(951)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        const oldMembership=url.pathname==='/api/membership'&&firstMembership;
        if(oldMembership)firstMembership=false;
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
        const body=await response.text();
        if(oldMembership){membershipPending=true;await membershipGate;}
        if(url.pathname==='/api/vouchers/claim'){claimPending=true;await claimGate;}
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      for(let n=0;n<100&&!membershipPending;n++)await page.waitForTimeout(20);
      assert.equal(membershipPending,true);
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Cá nhân');await page.getByTitle('Chỉnh sửa thông tin',{exact:true}).click();
      await page.locator('.profile-overlay input[type=text]').first().fill('Updated canonical customer');
      await page.getByRole('dialog',{name:'Hồ sơ cá nhân',exact:true}).getByRole('button',{name:'Lưu',exact:true}).first().click();
      await page.getByRole('dialog',{name:'Hồ sơ cá nhân',exact:true}).waitFor({state:'hidden'});
      await page.getByRole('heading',{name:'Updated canonical customer',exact:true}).waitFor();
      const oldResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/membership');
      releaseMembership();await(await oldResponse).finished();await page.waitForTimeout(150);
      assert.equal(await page.getByRole('heading',{name:'Updated canonical customer',exact:true}).isVisible(),true,'An old membership snapshot cannot overwrite the newly saved profile');
      await page.getByRole('button',{name:/Ưu đãi của tôi/}).click();
      const wallet=page.getByRole('dialog',{name:'Ưu đãi của tôi',exact:true});
      await wallet.getByPlaceholder('Nhập mã voucher...').fill('LIVE-WALLET');await wallet.getByRole('button',{name:'Áp dụng',exact:true}).click();
      for(let n=0;n<100&&!claimPending;n++)await page.waitForTimeout(20);
      assert.equal(claimPending,true);
      await wallet.getByRole('button').first().click();await nav('Trang chủ');
      const received=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/vouchers/claim');
      releaseClaim();await(await received).finished();
      await page.locator('.home-greeting-copy h1').filter({hasText:'Updated canonical customer'}).waitFor();
      await nav('Cá nhân');await page.getByRole('button',{name:/Ưu đãi của tôi/}).click();
      await wallet.getByText('LIVE-WALLET',{exact:true}).waitFor();
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,staleMembershipCannotRevertProfile:true,claimSurvivesSourceUnmount:true,canonicalWalletRefreshed:true,noPageErrors:true}));
    } catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2200)}));throw error;}
    finally {releaseMembership();releaseClaim();await page.close();await f.close();}
  }
} finally {await browser.close();}
