import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]) {
    const f=await workflowFixture(),page=await browser.newPage({viewport}),errors=[];
    let releaseClaim,claimRequests=0;
    const authHeaders=[];
    const claimGate=new Promise(resolve=>releaseClaim=resolve);
    const blocked=new Set(['/api/bookings','/api/treatment-plans','/api/records','/api/care-guidelines','/api/auth/settings']);
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await f.db.query("INSERT INTO home_care_guidelines(title,category,summary,content,image_url) VALUES('Recovery guide','CARE','Canonical summary','Canonical guide content','')");
      await f.db.query("INSERT INTO coupons(id,code,title,discount_amount,valid_from,valid_to) VALUES($1,'RECOVERY-CLAIM','Canonical claim',10000,'2020-01-01','2099-12-31')",[f.id(901)]);
      await f.db.query("INSERT INTO voucher_distribution_rules(coupon_id,trigger_event,valid_days_after_claim,description) VALUES($1,'PUBLIC_CLAIM',30,'Isolated claim rule')",[f.id(901)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/auth/zalo/register'){
          const current=await f.request('/auth/me');
          return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,data:{user:current.data.user,token:f.headers().Authorization.replace(/^Bearer /,'')}})});
        }
        if(url.pathname==='/api/auth/me')authHeaders.push(req.headers().authorization||'');
        if(blocked.has(url.pathname))return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Temporarily unavailable'})});
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
        if(url.pathname==='/api/vouchers/claim'){claimRequests++;await claimGate;}
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Đặt lịch');
      const appointments=page.locator('.appointments-list');
      await appointments.getByRole('alert').waitFor();
      blocked.delete('/api/bookings');
      await appointments.getByRole('button',{name:'Thử lại',exact:true}).click();
      await appointments.locator('.appointment-list-card').first().waitFor();
      assert.equal(await appointments.getByRole('alert').count(),0);
      await nav('Cá nhân');await page.getByRole('button',{name:/Gói liệu trình/}).click();
      await page.getByRole('heading',{name:'Gói liệu trình của tôi',exact:true}).waitFor();
      const planError=page.getByRole('alert').filter({hasText:'Không thể tải gói liệu trình.'});
      await planError.waitFor();
      blocked.delete('/api/treatment-plans');
      await planError.getByRole('button',{name:'Thử lại',exact:true}).click();
      await page.getByRole('button',{name:'Xem chi tiết gói',exact:true}).waitFor();
      await page.getByRole('button',{name:'Nhật ký',exact:true}).click();
      await page.getByRole('alert').filter({hasText:'Không thể tải nhật ký chăm sóc.'}).waitFor();
      blocked.delete('/api/records');
      await page.getByRole('button',{name:'Thử lại',exact:true}).last().click();
      await page.getByText('Actual care notes',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Chăm sóc tại nhà',exact:true}).click();
      await page.getByRole('button',{name:'Thử lại',exact:true}).last().waitFor();
      blocked.delete('/api/care-guidelines');
      await page.getByRole('button',{name:'Thử lại',exact:true}).last().click();
      await page.getByRole('button',{name:'Xem hướng dẫn',exact:true}).click();
      await page.getByText('Canonical guide content',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Quay lại',exact:true}).click();
      await page.getByRole('button',{name:'Quay lại',exact:true}).click();
      await page.getByRole('button',{name:/Cài đặt/}).click();
      await page.getByText('Không thể tải cài đặt tài khoản.',{exact:true}).waitFor();
      blocked.delete('/api/auth/settings');
      await page.locator('.profile-overlay').getByRole('button',{name:'Thử lại',exact:true}).click();
      await page.getByRole('button',{name:'Lưu cài đặt mặc định của hệ thống',exact:true}).click();
      await page.getByRole('checkbox').first().waitFor({state:'visible'});
      assert.equal(await page.getByRole('checkbox').first().isEnabled(),true);
      await page.getByRole('dialog',{name:'Cài đặt tài khoản',exact:true}).getByRole('button').first().click();
      await page.getByRole('button',{name:/Ưu đãi của tôi/}).click();
      const voucher=page.getByRole('dialog',{name:'Ưu đãi của tôi',exact:true});
      await voucher.getByPlaceholder('Nhập mã voucher...').fill('RECOVERY-CLAIM');
      await voucher.getByRole('button',{name:'Áp dụng',exact:true}).evaluate(button=>{button.click();button.click();});
      for(let n=0;n<100&&!claimRequests;n++)await page.waitForTimeout(20);
      assert.equal(claimRequests,1);
      assert.equal(await voucher.getByPlaceholder('Nhập mã voucher...').isDisabled(),true);
      assert.equal(await voucher.getByRole('button',{name:'Đang thêm...',exact:true}).isDisabled(),true);
      releaseClaim();await voucher.getByText('RECOVERY-CLAIM',{exact:true}).waitFor();
      assert.equal((await f.db.query('SELECT count(*)::int AS n FROM user_vouchers WHERE coupon_id=$1',[f.id(901)])).rows[0].n,1);
      await voucher.getByRole('button').first().click();await nav('Trang chủ');
      const installed=await page.evaluate(async()=>{
        const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(value=>new URL(value).pathname.endsWith('/api/client.ts'));
        const {apiClient}=await import(url||'/api/client.ts');
        return Boolean((await apiClient.registerZaloProfile('isolated-proof',{fullName:'Fixture customer'}))?.token);
      });
      assert.equal(installed,true);
      authHeaders.length=0;
      blocked.add('/api/auth/me');
      await page.locator('.home-feature').getByTitle('Cập nhật dữ liệu',{exact:true}).click();
      await page.getByText('Không thể xác minh phiên đăng nhập. Kiểm tra kết nối và thử lại.',{exact:true}).waitFor();
      blocked.delete('/api/auth/me');
      await page.getByTitle('Thử tải lại',{exact:true}).click();
      await page.locator('.home-greeting-copy h1').filter({hasText:'Workflow customer'}).waitFor();
      assert.ok(authHeaders.length>=2&&authHeaders[0].startsWith('Bearer '));
      assert.equal(authHeaders.at(-1),authHeaders[0],'Temporary verification failure preserves the existing session credential');
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,bookingRetry:true,packageRetry:true,journalRetry:true,guideRetry:true,settingsRetry:true,singleVoucherClaim:true,temporaryAuthFailurePreservesSession:true,noPageErrors:true}));
    } catch(error) {console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2600)}));throw error;}
    finally {releaseClaim();await page.close();await f.close();}
  }
} finally {await browser.close();}
