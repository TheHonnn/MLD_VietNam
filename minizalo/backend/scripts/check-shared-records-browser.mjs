import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {staffFixture} from '../test/fixtures/staff.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await staffFixture(),{db,id}=f,page=await browser.newPage({viewport}),errors=[];
    let pageRequests=0,failMore=viewport.width===390;
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query("INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES($1,$2,$3,$4,'STUDYING')",[id(94),id(90),id(22),id(30)]);
      await db.query('UPDATE course_lessons SET attachments=$1::jsonb WHERE id=$2',[JSON.stringify([{name:'Actual file.pdf',url:'https://fixture.invalid/actual.pdf'},{name:'Unsafe file',url:'javascript:alert(1)'}]),id(24)]);
      for(let n=100;n<121;n++)await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,content_text) VALUES($1,$2,$3,'READING_DOC','Shared reading text')",[id(n),id(23),'Shared reading '+n]);
      const sharedDocument={kind:'DOCUMENT',status:'PUBLISHED',title:'Actual shared fixture document',summary:'Shared fixture summary',contentText:'Shared fixture document body',attachments:[{url:'https://fixture.invalid/actual-shared.pdf',name:'Actual shared PDF'}],expectedRevision:0};
      const sharedPost={kind:'COMMUNITY',status:'PUBLISHED',title:'Actual shared fixture announcement',summary:'Internal fixture notice',contentText:'Shared fixture announcement body',attachments:[],expectedRevision:0};
      assert.equal((await f.request('/shared-content/'+id(900),{owner:92,method:'PUT',body:sharedDocument})).status,200);
      assert.equal((await f.request('/shared-content/'+id(901),{owner:92,method:'PUT',body:sharedPost})).status,200);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/documents'&&url.searchParams.has('cursor')){
          pageRequests++;if(failMore){failMore=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'Fixture temporary failure'})});}
        }
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(90),body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5180/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      assert.equal(await page.locator('.app-bottom-nav button').count(),5);
      await nav('Tài liệu');const library=page.locator('.document-library');
      await library.locator('.record-row').nth(19).waitFor();
      await library.getByRole('button',{name:'Xem thêm',exact:true}).evaluate(button=>{button.click();button.click();});
      if(viewport.width===390){await library.getByRole('alert').waitFor();await library.getByRole('button',{name:'Thử lại',exact:true}).click();}
      await library.locator('.record-row').nth(22).waitFor();assert.equal(await library.locator('.record-row').count(),23);
      assert.equal(pageRequests,viewport.width===390?2:1);
      await library.getByRole('textbox',{name:'Tìm tài liệu',exact:true}).fill('Practice lesson');
      await library.locator('.record-row').filter({hasText:'Practice lesson'}).waitFor();
      await library.locator('.record-row').filter({hasText:'Practice lesson'}).click();
      await library.getByText('Actual practice instructions',{exact:true}).waitFor();
      assert.equal(await library.getByRole('link',{name:'Actual file.pdf',exact:true}).getAttribute('href'),'https://fixture.invalid/actual.pdf');
      assert.equal(await library.getByRole('link',{name:'Unsafe file',exact:true}).count(),0);
      await db.query("INSERT INTO miniapp_course_access(enrollment_id,is_suspended,reason) VALUES($1,true,'Fixture access revocation')",[id(94)]);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await library.getByRole('alert').waitFor();assert.equal(await library.locator('.document-reading').count(),0);assert.equal(await library.getByRole('link').count(),0);
      await library.getByTitle('Quay lại',{exact:true}).click();
      await library.getByRole('textbox',{name:'Tìm tài liệu',exact:true}).fill('');
      await library.getByRole('tab',{name:'Được chia sẻ',exact:true}).click();
      await library.locator('.record-row').filter({hasText:sharedDocument.title}).click();
      await library.getByText(sharedDocument.contentText,{exact:true}).waitFor();
      await library.getByRole('link',{name:'Actual shared PDF',exact:true}).waitFor();
      assert.equal((await f.request('/shared-content/'+id(900),{owner:92,method:'PUT',body:{...sharedDocument,status:'ARCHIVED',expectedRevision:1}})).status,200);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await library.getByRole('alert').waitFor();
      assert.equal(await library.getByRole('link').count(),0);
      await nav('Trang chủ');await page.getByRole('button',{name:'Cộng đồng',exact:true}).click();
      const community=page.locator('.community');await community.locator('.record-row').filter({hasText:sharedPost.title}).click();
      await community.getByText(sharedPost.contentText,{exact:true}).waitFor();
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/community-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      assert.equal((await f.request('/shared-content/'+id(901),{owner:92,method:'PUT',body:{...sharedPost,status:'ARCHIVED',expectedRevision:1}})).status,200);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await community.getByRole('alert').waitFor();assert.equal(await community.locator('.document-reading').count(),0);
      await nav('Trang chủ');await page.getByRole('button',{name:'Hồ sơ khách',exact:true}).click();
      const dossier=page.locator('.staff-customers');await dossier.getByRole('textbox',{name:'Tìm hồ sơ khách',exact:true}).fill('0900000001');
      await dossier.locator('.record-row').filter({hasText:'Workflow customer'}).click();
      await dossier.locator('.customer-record').filter({hasText:'WF-COMPLETED'}).waitFor();
      await dossier.getByRole('tab',{name:'Trị liệu',exact:true}).click();await dossier.getByText('Actual care notes',{exact:true}).waitFor();
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/shared-records-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      await dossier.getByRole('tab',{name:'Liệu trình',exact:true}).click();await dossier.getByText('1/4 buổi đã dùng · 0 buổi đã đặt',{exact:true}).waitFor();
      await dossier.getByRole('button',{name:'Đặt buổi tiếp theo',exact:true}).click();
      const flow=page.locator('.staff-booking');await flow.waitFor();
      await page.waitForFunction(expected=>document.querySelector('.staff-booking select[aria-label="Liệu trình của khách"]')?.value===expected,id(10));
      await flow.getByRole('button',{name:'14:00 - 15:00',exact:true}).click();
      await flow.getByRole('button',{name:'Xác nhận đặt lịch',exact:true}).click();
      await page.getByRole('heading',{name:'Đặt lịch thành công!',exact:true}).waitFor();
      const reserved=(await db.query('SELECT b.id,b.booking_code,b.customer_id,b.final_price,p.user_package_id FROM miniapp_booking_packages p JOIN bookings b ON b.id=p.booking_id')).rows;
      assert.equal(reserved.length,1);assert.equal(reserved[0].customer_id,id(1));assert.equal(reserved[0].user_package_id,id(10));assert.equal(Number(reserved[0].final_price),0);
      await page.locator('.booking-success').getByTitle('Quay lại',{exact:true}).click();
      await nav('Trang chủ');await page.getByRole('button',{name:'Hồ sơ khách',exact:true}).click();
      await dossier.getByRole('textbox',{name:'Tìm hồ sơ khách',exact:true}).fill('0900000001');await dossier.locator('.record-row').filter({hasText:'Workflow customer'}).click();
      await dossier.getByRole('tab',{name:'Lịch hẹn',exact:true}).click();
      await dossier.locator('.customer-record').filter({hasText:'WF-COMPLETED'}).getByRole('button',{name:'Xem lịch hẹn',exact:true}).click();
      await page.getByRole('heading',{name:'Chi tiết lịch hẹn',exact:true}).waitFor();
      await page.getByTitle('Quay lại lịch hẹn của tôi',{exact:true}).click();
      await nav('Trang chủ');await page.getByTitle('Cập nhật dữ liệu',{exact:true}).click();
      await page.locator('.home-branch select:not([disabled])').waitFor();await page.locator('.home-bell').click();
      await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor();
      await page.getByRole('button').filter({hasText:reserved[0].booking_code}).first().click();
      await page.getByRole('heading',{name:'Chi tiết lịch hẹn',exact:true}).waitFor();
      assert.ok((await db.query("SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND is_read AND data->'target'->>'entityId'=$2",[id(90),reserved[0].id])).rows[0].n>0);
      await page.getByTitle('Quay lại lịch hẹn của tôi',{exact:true}).click();
      await nav('Trang chủ');await page.getByRole('button',{name:'Hồ sơ khách',exact:true}).click();
      await dossier.getByRole('textbox',{name:'Tìm hồ sơ khách',exact:true}).fill('0900000001');await dossier.locator('.record-row').filter({hasText:'Workflow customer'}).click();
      await dossier.locator('.customer-record').first().waitFor();
      await db.query('UPDATE staff_profiles SET is_active=false WHERE user_id=$1',[id(90)]);
      await dossier.getByRole('tab',{name:'Trị liệu',exact:true}).click();await dossier.getByRole('alert').waitFor();
      assert.equal(await dossier.locator('.customer-record').count(),0);
      const overflow=await page.locator('.mini-app-shell').evaluate(shell=>[...shell.querySelectorAll('.app-main-content,.shared-records,input,.records-tabs')].filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.className));
      assert.deepEqual(overflow,[]);assert.deepEqual(errors,[]);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,documentsFromSharedLessons:true,sharedPublicationsAndArchive:true,community:true,unsafeLinksRemoved:true,revocation:true,paginationRetryNoDoubleClick:true,branchDossier:true,appointmentLink:true,packageFollowupPersistsCorrectOwner:true,staffNotificationDeepLink:true,noPageErrors:true,noOverflow:true}));
    }finally{await page.close();await f.close();}
  }
}finally{await browser.close();}
