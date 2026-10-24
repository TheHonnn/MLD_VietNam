import assert from 'node:assert/strict';
import {staffFixture} from '../test/fixtures/staff.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const owner of [1,90]){
    const f=await staffFixture(),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      if(owner===90)await f.db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[f.id(90)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(owner),body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5180/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Dịch vụ',exact:true}).click();
      const pending=page.getByRole('button',{name:'Đặt lịch kiểm tra phù bạch huyết',exact:true});
      assert.equal(await pending.isDisabled(),true);
      assert.equal((await f.db.query('SELECT count(*)::int AS total FROM services')).rows[0].total,2);
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Trang chủ',exact:true}).click();
      await page.locator('.home-feature .home-book-button').click();
      if(owner===1){
        await page.getByRole('heading',{name:'Đăng nhập nhân viên',exact:true}).waitFor();
        assert.equal(await page.locator('.staff-booking').count(),0);
      }else{
        const flow=page.locator('.staff-booking');
        await flow.getByRole('alert').filter({hasText:'Hồ sơ nhân viên hoặc chi nhánh'}).waitFor();
        assert.equal(await flow.getByRole('button',{name:'Xác nhận đặt lịch',exact:true}).isDisabled(),true);
        await f.db.query('UPDATE staff_profiles SET is_active=true WHERE user_id=$1',[f.id(90)]);
        await flow.getByRole('button',{name:'Thử lại',exact:true}).click();
        await flow.locator('.staff-slot-grid button').first().waitFor();
        assert.equal(await flow.getByLabel('Lựa chọn dịch vụ',{exact:true}).isEnabled(),true);
        await f.db.query("INSERT INTO users(id,email,full_name,role,referral_code) VALUES($1,'no-phone@example.test','Customer without phone','CUSTOMER','NOPHONE94')",[f.id(94)]);
        await flow.getByLabel('Tìm khách hàng',{exact:true}).fill('Customer without phone');
        await flow.locator('.staff-customer-results button').filter({hasText:'Customer without phone'}).click();
        const confirm=flow.getByRole('button',{name:'Xác nhận đặt lịch',exact:true});
        await flow.locator('.staff-slot-grid button').first().click();
        assert.equal(await confirm.isDisabled(),true);
        await flow.getByLabel('Số điện thoại liên hệ',{exact:true}).fill('0900000094');
        assert.equal(await confirm.isEnabled(),true);
        assert.equal((await f.db.query('SELECT phone FROM users WHERE id=$1',[f.id(94)])).rows[0].phone,null);
      }
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',owner,customerBlocked:owner===1,revokedProfileRetry:owner===90,placeholderOnlyNoInventedService:true,noPageErrors:true}));
    }finally{await page.close();await f.close();}
  }
}finally{await browser.close();}
