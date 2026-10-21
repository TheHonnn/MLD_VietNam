import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:390,height:844},{width:320,height:640},{width:1366,height:900}]){
    const fixture=await workflowFixture(),{db,id,base,headers}=fixture;
    const page=await browser.newPage({viewport});let dropNextBooking=false;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',e=>{if(e.reason?.code===-2000&&e.reason?.api==='login')e.preventDefault();}));
      await db.query("INSERT INTO coupons(id,code,title,discount_amount,valid_from,valid_to) VALUES($1,'QA-VOUCHER','Actual fixture voucher',10000,'2020-01-01','2099-12-31')",[id(91)]);
      await db.query("INSERT INTO user_vouchers(user_id,coupon_id,expires_at) VALUES($1,$2,'2099-12-31')",[id(1),id(91)]);
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        if(route.request().resourceType()==='script')return route.fallback();
        const request=route.request(),url=new URL(request.url()),requestHeaders=headers();
        if(request.headers()['idempotency-key'])requestHeaders['Idempotency-Key']=request.headers()['idempotency-key'];
        const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:requestHeaders,body:request.postData()||undefined});
        if(dropNextBooking&&url.pathname==='/api/bookings'&&request.method()==='POST'&&response.status===201){dropNextBooking=false;await route.abort('failed');return;}
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:5177/')+`?serviceId=${id(5)}`,{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      const detail=page.locator('.service-detail'),heart=detail.getByRole('button',{name:'Yêu thích',exact:true});
      await detail.waitFor();await heart.click();
      await page.waitForFunction(()=>document.querySelector('.service-detail [aria-label="Yêu thích"]')?.getAttribute('aria-pressed')==='true');
      assert.equal((await fixture.request(`/services/${id(5)}/favorite`)).data.isFavorite,true);
      await detail.getByRole('button',{name:'Quay lại',exact:true}).click();
      const nav=label=>page.locator('.app-bottom-nav').getByRole('button',{name:label,exact:true}).click();
      await nav('Học viện');await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-lesson-row').filter({hasText:'Quiz lesson'}).click();
      await page.evaluate(()=>{const actual=Date.now;Date.now=()=>actual()+86400000;});
      await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();
      const radio=page.locator('fieldset').first().getByRole('radio').first();await radio.check();
      assert.ok((await page.getByRole('timer').innerText()).includes(':'));
      await nav('Trang chủ');
      await nav('Học viện');await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-lesson-row').filter({hasText:'Quiz lesson'}).click();
      await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();
      assert.equal(await page.locator('fieldset').first().getByRole('radio').first().isChecked(),true);
      await page.evaluate(()=>localStorage.setItem('mld_pending_voucher',JSON.stringify({code:'QA-VOUCHER',scope:'service'})));
      await nav('Dịch vụ');
      await page.locator('.service-catalog-card').filter({hasText:'Workflow service'}).getByRole('button',{name:'Đặt Lịch',exact:true}).click();
      const next=()=>page.locator('.booking-footer > button').click();
      await next();await next();await next();
      await page.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).fill('2099-01-12');
      await page.getByRole('button',{name:'10:00 - 11:00',exact:true}).click();
      await next();await next();await next();
      await page.getByRole('button',{name:'Bỏ mã ưu đãi',exact:true}).waitFor();
      await db.query('UPDATE coupons SET is_active=false WHERE id=$1',[id(91)]);
      await next();await page.locator('.booking-error').waitFor();
      await page.getByRole('button',{name:'Bỏ mã ưu đãi',exact:true}).click();
      dropNextBooking=true;await next();await page.locator('.booking-error').waitFor();
      const before=(await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n;
      await next();await page.getByRole('heading',{name:'Đặt lịch thành công!',exact:true}).waitFor();
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,before);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM miniapp_booking_requests')).rows[0].n,1);
      assert.equal(await page.locator('.mini-app-shell').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/final-regressions-${viewport.width}.png`,import.meta.url))});
      console.log(JSON.stringify({viewport,favoritePersisted:true,quizWorksWithWrongDeviceClock:true,draftSurvivesImmediateNavigation:true,invalidVoucherCanBeRemoved:true,lostResponseRetryIsIdempotent:true,noOverflow:true}));
    }catch(error){
      console.error(JSON.stringify({viewport,text:(await page.locator('body').innerText()).slice(-6000)}));throw error;
    }finally{await page.close();await fixture.close();}
  }
}finally{await browser.close();}
