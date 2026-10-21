import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]) {
    const f=await workflowFixture(),{db,id,base,headers}=f;
    const page=await browser.newPage({viewport});const errors=[];let ticketPages=0;
    page.on('pageerror',error=>errors.push(error.message));
    try {
      for(let n=0;n<105;n++)await db.query('INSERT INTO support_tickets(customer_id,subject,message) VALUES($1,$2,$3)',[id(1),`History ${n}`,'Fixture only']);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(request.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/support-tickets')ticketPages++;
        const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:headers(),body:request.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5177/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=async name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Dịch vụ');
      await page.locator('.service-catalog-card').first().getByRole('button',{name:'Chi tiết',exact:true}).click();
      await page.locator('.service-detail-book').click();
      await page.locator('.booking-flow[data-step="1"]').waitFor();
      await page.locator('.booking-footer button').last().click();
      await page.locator('.booking-flow[data-step="2"]').waitFor();
      await page.goBack();await page.locator('.booking-flow[data-step="1"]').waitFor();
      await page.goBack();await page.locator('.booking-flow').waitFor({state:'hidden'});
      await page.locator('.service-detail').waitFor();
      await page.goBack();await page.locator('.service-detail').waitFor({state:'hidden'});
      await nav('Đặt lịch');await page.locator('.appointment-list-card').first().click();
      await page.getByRole('button',{name:'Đổi lịch',exact:true}).click();
      await page.goBack();await page.locator('.appointment-detail').waitFor();
      assert.equal(await page.locator('.appointment-reschedule').count(),0);
      await page.getByRole('button',{name:'Hủy lịch',exact:true}).click();
      await page.goBack();await page.locator('.appointment-cancel-confirm').waitFor({state:'hidden'});
      await page.locator('.appointment-detail').waitFor();
      await page.evaluate(()=>{window.auditRealNow=Date.now;Date.now=()=>Date.parse('2099-01-10T03:00:01Z');window.dispatchEvent(new Event('focus'));});
      await page.getByRole('button',{name:'Đặt lại dịch vụ',exact:true}).waitFor();
      await page.evaluate(()=>{Date.now=window.auditRealNow;window.dispatchEvent(new Event('focus'));});
      await page.getByRole('button',{name:'Hủy lịch',exact:true}).waitFor();
      await db.query("UPDATE bookings SET status='CANCELLED' WHERE id=$1",[id(13)]);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.getByRole('button',{name:'Đặt lại dịch vụ',exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Hủy lịch',exact:true}).count(),0);
      await page.goBack();await page.locator('.appointments-list').waitFor();
      if(viewport.width<640)await page.addStyleTag({content:'.mini-app-shell { --app-safe-top:47px !important; --app-safe-bottom:34px !important; }'});
      await nav('Cá nhân');await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
      const assertProfileFrame=async()=>{
        const shell=await page.locator('.mini-app-shell').boundingBox(),layer=await page.locator('.profile-overlay').boundingBox();
        assert.ok(layer&&shell&&Math.abs(layer.x-shell.x)<=2&&Math.abs(layer.y-shell.y)<=2&&Math.abs(layer.height-shell.height)<=2,'Profile layers must fill the phone, not the scrollable profile content');
      };
      await assertProfileFrame();
      await page.getByRole('combobox',{name:'Chi nhánh yêu thích'}).selectOption(id(3));
      await page.getByRole('button',{name:'Thể trạng & EMR Notes',exact:true}).click();
      await page.getByRole('textbox',{name:'Đặc điểm làn da',exact:true}).fill('Sensitive');
      await page.getByRole('textbox',{name:'Lưu ý thể trạng',exact:true}).fill('Saved actual profile note');
      await page.getByRole('textbox',{name:'Họ tên liên hệ khẩn cấp',exact:true}).fill('Emergency contact');
      await page.getByRole('textbox',{name:'Số điện thoại khẩn cấp',exact:true}).fill('0900000004');
      await page.getByRole('button',{name:'Lưu thay đổi hồ sơ',exact:true}).scrollIntoViewIfNeeded();
      const saveBox=await page.getByRole('button',{name:'Lưu thay đổi hồ sơ',exact:true}).boundingBox(),phoneBox=await page.locator('.mini-app-shell').boundingBox();
      assert.ok(saveBox.y+saveBox.height<=phoneBox.y+phoneBox.height);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/audit-profile-${viewport.width}.png`,import.meta.url))});
      await page.getByRole('button',{name:'Lưu thay đổi hồ sơ',exact:true}).click();
      await page.getByRole('heading',{name:'Hồ sơ cá nhân & Y tế',exact:true}).waitFor({state:'hidden'});
      const profile=(await f.request('/membership')).data.user;
      assert.equal(profile.preferredBranch,id(3));assert.equal(profile.skinType,'Sensitive');assert.equal(profile.healthNotes,'Saved actual profile note');
      await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
      assert.equal(await page.getByRole('textbox',{name:'Lưu ý thể trạng',exact:true}).inputValue(),'Saved actual profile note');
      await page.goBack();
      await page.getByRole('button',{name:/Xem thẻ hội viên/}).click();
      await page.getByRole('heading',{name:'Thẻ hội viên điện tử',exact:true}).waitFor();
      await assertProfileFrame();
      assert.equal(await page.getByRole('button',{name:'Chia sẻ',exact:true}).isDisabled(),true);
      assert.equal(await page.getByRole('img',{name:'Mã QR',exact:true}).count(),0);
      await page.goBack();
      for(const menu of [/Điểm tích lũy & Hạng hội viên/,/Ưu đãi của tôi/,/Giới thiệu bạn bè/,/Cài đặt tài khoản & Bảo mật/]) {
        await page.getByRole('button',{name:menu}).click();await assertProfileFrame();await page.goBack();
        await page.locator('.profile-overlay').waitFor({state:'hidden'});
      }
      await page.getByRole('button',{name:/Gói liệu trình/}).click();
      await page.getByRole('button',{name:'Xem chi tiết gói',exact:true}).click();
      await page.getByRole('heading',{name:'Các bước thực hiện mỗi buổi',exact:true}).waitFor();
      await page.goBack();await page.getByRole('button',{name:'Xem chi tiết gói',exact:true}).waitFor();
      await page.goBack();
      await nav('Trang chủ');
      await page.waitForTimeout(300);
      assert.ok(ticketPages>=2,'Preload must drain all collection pages');
      await nav('Dịch vụ');
      await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate',{state:{mldView:'evicted-view'}})));
      await page.locator('.home-branch').waitFor();
      assert.equal(await page.locator('.mini-app-shell').evaluate(element=>element.scrollWidth>element.clientWidth+1),false);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/audit-completion-${viewport.width}.png`,import.meta.url))});
      console.log(JSON.stringify({viewport,nestedBack:true,liveAppointmentDetails:true,healthProfilePersisted:true,allCollectionPagesPreloaded:true,evictedHistoryRecovered:true,noPageErrors:true}));
    } catch(error) {console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-1800)}));throw error;}
    finally {await page.close();await f.close();}
  }
} finally {await browser.close();}
