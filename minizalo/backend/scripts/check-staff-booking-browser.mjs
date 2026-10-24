import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {staffFixture} from '../test/fixtures/staff.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1366,height:900}]){
    const f=await staffFixture(),{db,id,day}=f,page=await browser.newPage({viewport,isMobile:viewport.width!==1366,hasTouch:viewport.width!==1366});
    const errors=[],slotRequests=[];let writes=0,release,hold=true;
    const gate=new Promise(resolve=>release=resolve);
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query("UPDATE services SET name='Kiểm tra phù bạch huyết' WHERE id=$1",[id(5)]);
      const nextDay=new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
      await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,$3::date,'14:00','16:00')",[id(7),id(3),nextDay]);
      const people=viewport.width===390?2:1;
      if(people===2){
        await db.query("INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES($1,$2,'Second browser fixture specialist','')",[id(93),id(3)]);
        await db.query('INSERT INTO miniapp_technician_services(technician_id,service_id) VALUES($1,$2)',[id(93),id(5)]);
        await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,$3::date,'14:00','16:00')",[id(93),id(3),day]);
      }
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname.startsWith('/api/staff/slots'))slotRequests.push(url);
        const headers=f.headers(90);if(req.headers()['idempotency-key'])headers['Idempotency-Key']=req.headers()['idempotency-key'];
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});
        const body=await response.text();
        if(url.pathname==='/api/staff/bookings'&&req.method()==='POST'){writes++;if(hold)await gate;}
        await route.fulfill({status:response.status,contentType:'application/json',body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5180/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Dịch vụ');await page.getByRole('button',{name:'Đặt lịch Kiểm tra phù bạch huyết',exact:true}).click();
      const flow=page.locator('.staff-booking');await flow.getByRole('heading',{name:'Đặt lịch cho khách',exact:true}).waitFor();
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).waitFor();
      if(people===2){
        await flow.getByLabel('Số người đến trị liệu',{exact:true}).selectOption('2');await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).waitFor();
        await flow.getByLabel('Nhập thông tin từng người',{exact:true}).check();
        await flow.getByLabel('Họ tên người 1',{exact:true}).fill('Browser guest one');
        await flow.getByLabel('Số điện thoại người 1',{exact:true}).fill('0900000101');
        await flow.getByLabel('Họ tên người 2',{exact:true}).fill('Browser guest two');
      }
      assert.equal(await flow.getByLabel('Ngày đến',{exact:true}).inputValue(),day);
      assert.equal(await flow.getByLabel('Địa điểm cơ sở',{exact:true}).locator('option').count(),1);
      assert.equal(await flow.getByText('Chọn chuyên viên',{exact:true}).count(),0);
      assert.ok(slotRequests.every(url=>!url.searchParams.has('technicianId')));
      await flow.getByLabel('Tìm khách hàng',{exact:true}).fill('0900000001');
      await flow.locator('.staff-customer-results button').filter({hasText:'Workflow customer'}).click();
      if(viewport.width===430)await flow.getByLabel('Liệu trình của khách',{exact:true}).selectOption(id(10));
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/staff-form-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      const submit=flow.getByRole('button',{name:'Xác nhận đặt lịch',exact:true});
      await submit.evaluate(button=>{button.click();button.click();});
      await page.waitForFunction(()=>document.querySelector('.staff-booking .booking-footer>button')?.disabled===true);
      assert.equal(await flow.getByLabel('Tìm khách hàng',{exact:true}).isDisabled(),true);
      hold=false;release();
      await page.getByRole('heading',{name:'Đặt lịch thành công!',exact:true}).waitFor();
      assert.equal(writes,1);
      const saved=(await db.query('SELECT b.*,s.staff_id FROM bookings b JOIN miniapp_staff_bookings s ON s.booking_id=b.id WHERE b.booking_date=$1::date',[day])).rows;
      assert.equal(saved.length,people);assert.ok(saved.every(row=>row.customer_id===id(1)&&row.staff_id===id(90)));assert.equal(new Set(saved.map(row=>row.technician_id)).size,people);
      assert.equal((await db.query('SELECT count(*)::int AS total FROM miniapp_booking_beds')).rows[0].total,people);
      if(viewport.width===430){assert.equal(Number(saved[0].final_price),0);assert.equal((await db.query('SELECT user_package_id FROM miniapp_booking_packages WHERE booking_id=$1',[saved[0].id])).rows[0].user_package_id,id(10));}
      if(people===2){
        assert.deepEqual(saved.map(row=>row.booked_for_name).sort(),['Browser guest one','Browser guest two']);
        await page.locator('.booking-success').getByRole('button',{name:'Xem lịch hẹn',exact:true}).click();
        await page.locator('.appointment-list-card').filter({hasText:'Browser guest one'}).click();
        const detail=page.locator('.appointment-detail');
        await detail.locator('.appointment-group').getByRole('button',{name:'Hủy cả nhóm',exact:true}).waitFor();
        assert.equal(await detail.locator('.appointment-group > button').count(),3);
        await detail.getByRole('button',{name:'Hủy cả nhóm',exact:true}).click();
        await detail.locator('.appointment-cancel-confirm').getByRole('button',{name:'Giữ lịch',exact:true}).click();
        await detail.getByRole('button',{name:'Hủy cả nhóm',exact:true}).click();
        await detail.locator('.appointment-cancel-confirm').getByRole('button',{name:'Xác nhận hủy',exact:true}).click();
        await detail.getByRole('status').filter({hasText:'Đã hủy toàn bộ nhóm đặt lịch.'}).waitFor();
        assert.equal((await db.query("SELECT count(*)::int AS n FROM bookings WHERE booking_date=$1::date AND status='CANCELLED'",[day])).rows[0].n,2);
        await detail.getByTitle('Quay lại lịch hẹn của tôi',{exact:true}).click();
        await page.getByTitle('Về trang chủ',{exact:true}).click();
      }else await page.locator('.booking-success').getByTitle('Quay lại',{exact:true}).click();
      await nav('Dịch vụ');await page.getByRole('button',{name:'Đặt lịch Kiểm tra phù bạch huyết',exact:true}).click();
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).waitFor();
      await flow.getByLabel('Khách mới',{exact:true}).check();
      await flow.getByLabel('Họ tên khách',{exact:true}).fill('Browser new customer');
      await flow.getByLabel('Số điện thoại khách',{exact:true}).fill('0900000088');
      await flow.getByLabel('Ngày đến',{exact:true}).fill(nextDay);
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();
      if(viewport.width===390){
        await db.query('UPDATE services SET price=120000 WHERE id=$1',[id(5)]);
        await submit.click();await flow.getByRole('alert').filter({hasText:'Giá đã thay đổi'}).waitFor();
        await flow.locator('.booking-footer-summary').filter({hasText:'120.000'}).waitFor();
        await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();
      }
      await submit.click();await page.getByRole('heading',{name:'Đặt lịch thành công!',exact:true}).waitFor();
      const customer=(await db.query("SELECT * FROM users WHERE phone='0900000088'")).rows;
      assert.equal(customer.length,1);assert.equal(customer[0].role,'CUSTOMER');
      const booked=(await db.query('SELECT customer_id,final_price FROM bookings WHERE booking_date=$1::date',[nextDay])).rows[0];
      assert.equal(booked.customer_id,customer[0].id);
      if(viewport.width===390)assert.equal(Number(booked.final_price),120000);
      assert.equal(await page.locator('.mini-app-shell').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/staff-booking-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,people,packageBooking:viewport.width===430,existingAndNewCustomers:true,correctCustomerAndStaff:true,automaticAssignment:true,bedAllocation:true,branchRestricted:true,noDuplicateClicks:true,priceRecovery:viewport.width===390,noPageErrors:true}));
    }finally{release();await page.close();await f.close();}
  }
}finally{await browser.close();}
