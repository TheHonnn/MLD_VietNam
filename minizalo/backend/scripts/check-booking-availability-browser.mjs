import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const f=await workflowFixture(),{db,id}=f;
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
  await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
  await page.route('**/api/**',async route=>{
    const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
    const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
    await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
  });
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5179/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
  await page.locator('.home-feature .home-book-button').click();
  const flow=page.locator('.booking-flow'),next=()=>flow.locator('.booking-footer > button').click();
  await flow.locator('.booking-service-choice').filter({hasText:'Workflow service'}).click();
  await next();await next();await next();
  await flow.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).fill('2099-01-12');
  await flow.getByRole('button',{name:'10:00 - 11:00',exact:true}).waitFor();
  await db.query('UPDATE miniapp_technician_services SET is_active=false WHERE service_id=$1',[id(5)]);
  await flow.getByTitle('Tuần sau',{exact:true}).click();
  await flow.getByText('Chi nhánh chưa mở nhận dịch vụ này',{exact:false}).waitFor();
  assert.equal(await flow.locator('.booking-footer > button').isDisabled(),true);
  assert.equal(await flow.getByRole('button',{name:'Tìm ngày trống tiếp theo',exact:true}).count(),0);
  await flow.getByRole('button',{name:'Đổi chi nhánh',exact:true}).click();
  await flow.getByRole('heading',{name:'Chọn chi nhánh',exact:true}).waitFor();
  await next();await next();
  await flow.getByText('Chi nhánh chưa mở nhận dịch vụ này',{exact:false}).waitFor();
  await db.query('UPDATE miniapp_technician_services SET is_active=true WHERE service_id=$1',[id(5)]);
  await db.query('DELETE FROM technician_slots');
  await flow.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).fill('2099-02-01');
  await flow.getByText('Chi nhánh chưa công bố lịch nhận khách',{exact:false}).waitFor();
  assert.equal(await flow.getByRole('button',{name:'Tìm ngày trống tiếp theo',exact:true}).count(),0);
  await db.query("INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES($1,$2,'2099-02-02','14:00','16:00')",[id(7),id(3)]);
  await flow.getByLabel('Chọn ngày trong lịch tháng',{exact:true}).fill('2099-02-02');
  await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();
  assert.equal(await flow.locator('.booking-footer > button').isEnabled(),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',assignmentAndPublicationReasons:true,noPointlessRangeSearch:true,branchRecoveryWorks:true,newPublishedSlotsBecomeBookable:true,noPageErrors:true}));
}finally{await browser.close();await f.close();}
