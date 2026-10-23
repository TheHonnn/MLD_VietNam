import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await (useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1366,height:900}]){
    const f=await workflowFixture(),{db,id}=f;
    const page=await browser.newPage({viewport,hasTouch:viewport.width!==1366,isMobile:viewport.width!==1366});
    const errors=[];let offline=false,slotRequests=[];
    page.on('pageerror',error=>errors.push(error.message));
    const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
    const flow=page.locator('.booking-flow');
    const next=()=>flow.locator('.booking-footer > button').click();
    try{
      await db.query("UPDATE services SET image_url='/static/onboarding-academy.jpg'");
      await db.query("INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES($1,$2,'Unassigned specialist','')",[id(900),id(3)]);
      await db.query("INSERT INTO support_faqs(category,question,answer) VALUES('GENERAL','Fixture project question','Canonical FAQ answer')");
      await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+3,'14:00','16:00')",[id(7),id(3)]);
      const day=(await db.query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+3,'YYYY-MM-DD') AS day")).rows[0].day;
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/static/onboarding-academy.jpg',route=>route.fulfill({path:fileURLToPath(new URL('../../zalo_mini_app/my-app/src/static/onboarding-academy.jpg',import.meta.url)),contentType:'image/jpeg'}));
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname.startsWith('/api/slots')){
          slotRequests.push(url.href);
          if(offline)return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Fixture unavailable'})});
        }
        const headers=f.headers();if(req.headers()['idempotency-key'])headers['Idempotency-Key']=req.headers()['idempotency-key'];
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.addStyleTag({content:':root { --zaui-safe-area-inset-top: 59px; --zaui-safe-area-inset-bottom: 34px; }'});
      const verifyFrame=async()=>{
        const shell=await page.locator('.mini-app-shell').boundingBox(),bar=await page.locator('.app-bottom-nav').boundingBox();
        assert.ok(shell.y>=0&&shell.y+shell.height<=viewport.height+1);
        assert.ok(bar.y+bar.height<=shell.y+shell.height+1);
        if(viewport.width!==1366)assert.ok(shell.y>=59);
        assert.equal(await page.locator('.mini-app-shell').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      };
      await verifyFrame();
      await page.locator('.home-information details summary').click();await page.getByText('Canonical FAQ answer',{exact:true}).waitFor();
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/home-expanded-${viewport.width}.png`,import.meta.url))});
      await page.getByRole('navigation',{name:'Tiện ích nhanh'}).getByRole('button',{name:'Chuyên viên',exact:true}).click();
      await page.locator('.specialist-card').filter({hasText:'Unassigned specialist'}).click();
      await page.getByRole('button',{name:'Đặt lịch với chuyên viên',exact:true}).click();
      await page.locator('.specialist-detail [role=alert]').waitFor();assert.equal(await flow.count(),0);
      await page.getByTitle('Quay lại danh sách chuyên viên',{exact:true}).click();
      await page.locator('.specialist-card').filter({hasText:'Workflow specialist'}).click();
      await page.getByRole('button',{name:'Đặt lịch với chuyên viên',exact:true}).click();await flow.waitFor();
      await flow.locator('.booking-service-choice').filter({hasText:'Workflow service'}).click();
      await next();await next();
      assert.equal(await flow.locator('.booking-doctor-choice[aria-pressed=true]').count(),1);
      await next();await flow.getByRole('combobox',{name:'Ngày có lịch trống',exact:true}).waitFor();
      assert.equal(await flow.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).inputValue(),day);
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).waitFor();
      assert.ok(slotRequests.some(url=>new URL(url).searchParams.get('technicianId')===id(7)));
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/booking-available-${viewport.width}.png`,import.meta.url))});
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();await next();
      await next();await next();await next();await page.getByRole('heading',{name:'Đặt lịch thành công!',exact:true}).waitFor();
      const saved=(await db.query("SELECT technician_id,booking_date::text AS day FROM bookings WHERE customer_id=$1 AND booking_date=$2::date",[id(1),day])).rows;
      assert.equal(saved.length,1);assert.equal(saved[0].technician_id,id(7));
      await page.locator('.booking-success').getByTitle('Quay lại',{exact:true}).click();
      for(const label of ['Dịch vụ','Đặt lịch','Học viện','Cá nhân','Trang chủ']){await nav(label);await verifyFrame();}
      await page.locator('.home-preview-list > button').first().click();await page.locator('.service-detail').waitFor();
      await page.locator('.service-detail .service-detail-back').click();
      await page.getByRole('navigation',{name:'Tiện ích nhanh'}).getByRole('button',{name:'Chi nhánh',exact:true}).click();
      await page.locator('.branch-card').first().click();await page.locator('.branch-detail').waitFor();
      await page.locator('.branch-detail .branch-back').click();await nav('Trang chủ');
      await page.locator('.home-information').filter({has:page.getByRole('heading',{name:'Đào tạo và phát triển nghề',exact:true})}).locator('.home-preview-list > button').first().click();
      await page.locator('.academy-screen').getByRole('heading',{name:'Workflow course',exact:true}).waitFor();await nav('Trang chủ');
      await page.locator('.home-feature .home-book-button').click();await next();await next();await next();
      await flow.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).fill('2099-02-01');
      await flow.getByText('Ngày này chưa có giờ trống phù hợp.',{exact:false}).waitFor();
      assert.equal(await flow.locator('.booking-footer > button').isDisabled(),true);
      offline=true;await flow.getByTitle('Tuần sau',{exact:true}).click();await flow.getByRole('alert').first().waitFor();
      assert.equal(await flow.locator('.booking-footer > button').isDisabled(),true);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,specialistFailureStaysOnProfile:true,assignedSpecialistPreserved:true,nearestRealDate:true,bookingPersisted:true,emptyAndOfflineHandled:true,homeContentAndLinks:true,safeFrame:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2400),errors}));throw error;}
    finally{await page.close();await f.close();}
  }
}finally{await browser.close();}
