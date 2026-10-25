import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {staffFixture} from '../test/fixtures/staff.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';
const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await staffFixture(),{db,id}=f,page=await browser.newPage({viewport}),errors=[];
    let moreRequests=0,failMore=viewport.width===390;let verificationPage;
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query("UPDATE users SET date_of_birth='1998-05-15' WHERE id=$1",[id(90)]);
      await db.query("INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES($1,$2,$3,$4,'STUDYING')",[id(94),id(90),id(22),id(30)]);
      await db.query("INSERT INTO miniapp_course_access(enrollment_id,expires_at,is_suspended,reason) VALUES($1,'2020-01-01',true,'Actual fixture expiry')",[id(94)]);
      await db.query("INSERT INTO courses(id,category_id,title,code,short_description,full_description,image_url,level) VALUES($1,$2,'Khóa nâng cao dành cho kỹ thuật viên đang làm nghề','PRACTITIONER-FIXTURE','Fixture summary','Fixture description','','ADVANCED')",[id(98),id(20)]);
      await db.query("INSERT INTO student_certificates(id,enrollment_id,student_id,course_id,certificate_code,qr_verification_code,student_name,course_title,issue_date,theory_score,practical_score,certificate_pdf_url) VALUES($1,$2,$3,$4,'PRIMARY-ISSUED','PRIMARY-VERIFY','Fixture receptionist','Workflow course','2026-10-24',8,9,'https://fixture.invalid/certificate.pdf')",[id(95),id(94),id(90),id(22)]);
      for(let n=100;n<121;n++)await db.query("INSERT INTO student_certificates(id,enrollment_id,student_id,course_id,certificate_code,qr_verification_code,student_name,course_title,theory_score,practical_score) VALUES($1,$2,$3,$4,$5,$6,'Fixture receptionist','Other fixture program',8,9)",[id(n),id(94),id(90),id(22),'FIXTURE-'+n,'VERIFY-'+n]);
      // Exercise old notification targets without changing existing production events.
      await db.query("INSERT INTO notifications(id,user_id,title,message,type,data) VALUES($1,$2,'Legacy certificate notification','Open the actual issued record','COURSE',$3::jsonb)",[id(950),id(90),JSON.stringify({sourceKey:'certificate:'+id(95),target:{screen:'academy',tab:'results',entityId:id(95),courseId:id(22),enrollmentId:id(94)}})]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/certificates'&&url.searchParams.has('cursor')){
          moreRequests++;
          if(failMore){failMore=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'Fixture transient failure'})});}
        }
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(90),body:req.postData()||undefined});
        const body=await response.json();
        if(viewport.width===1366&&url.pathname==='/api/courses')for(const course of body.data?.courses||[])delete course.trainingAudience;
        await route.fulfill({status:response.status,contentType:'application/json',body:JSON.stringify(body)});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5180/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Học viện');
      await page.getByRole('button',{name:'Mới bắt đầu',exact:true}).click();
      await page.locator('.academy-course-card').filter({hasText:'Workflow course'}).waitFor();
      assert.equal(await page.locator('.academy-course-card').count(),1);
      await page.getByRole('button',{name:'Đang làm nghề',exact:true}).click();
      await page.locator('.academy-course-card').filter({hasText:'Khóa nâng cao'}).waitFor();
      assert.equal(await page.locator('.academy-course-card').count(),1);
      await page.getByRole('textbox',{name:'Tìm khóa học',exact:true}).fill('Workflow course');
      assert.equal(await page.locator('.academy-course-card').count(),0);
      await page.getByRole('button',{name:'Tất cả',exact:true}).click();
      await page.locator('.academy-course-card').filter({hasText:'Workflow course'}).waitFor();
      await page.locator('.academy-header .academy-back').click();
      await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByText('Quyền học đã hết hạn hoặc tạm dừng.',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Tiếp tục học',exact:true}).count(),0);
      await page.getByRole('button',{name:'Giấy chứng nhận',exact:true}).click();
      const list=page.locator('.academy-certificates');
      await list.locator('.academy-enrollment').nth(19).waitFor();
      await list.getByRole('button',{name:'Xem thêm',exact:true}).evaluate(button=>{button.click();button.click();});
      if(viewport.width===390){
        await list.getByRole('alert').waitFor();assert.equal(await list.locator('.academy-enrollment').count(),20);
        await list.getByRole('button',{name:'Thử lại',exact:true}).click();
      }
      await list.locator('.academy-enrollment').nth(21).waitFor();
      assert.equal(await list.locator('.academy-enrollment').count(),22);
      assert.equal(moreRequests,viewport.width===390?2:1);
      await list.locator('.academy-enrollment').filter({hasText:'PRIMARY-ISSUED'}).getByRole('button',{name:'Xem giấy chứng nhận',exact:true}).click();
      await list.getByText('Ngày sinh: 15/5/1998',{exact:true}).waitFor();
      await list.getByRole('link',{name:'Mở giấy chứng nhận PDF',exact:true}).waitFor();
      await list.locator('.academy-certificate-qr img').waitFor();
      assert.equal(await list.locator('.academy-certificate-qr img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
      const verificationUrl=await list.getByRole('link',{name:'Tra cứu giấy chứng nhận',exact:true}).getAttribute('href');
      const verificationPath=new URL(verificationUrl).pathname;
      assert.match(verificationPath,/^\/verify\/certificates\/[0-9a-f-]+\.[A-Za-z0-9_-]{43}$/);
      assert.equal(verificationUrl.includes('PRIMARY-VERIFY'),false);
      // Never open the configured external API: verify this fixture's signed link on its isolated backend.
      verificationPage=await browser.newPage({viewport});
      verificationPage.on('pageerror',error=>errors.push(error.message));
      assert.equal((await verificationPage.goto(f.base+verificationPath)).status(),200);
      await verificationPage.getByRole('heading',{name:'Tra cứu giấy chứng nhận',exact:true}).waitFor();
      await verificationPage.getByText('PRIMARY-ISSUED',{exact:true}).waitFor();
      assert.equal(await verificationPage.getByText('15/5/1998',{exact:false}).count(),0);
      assert.equal(await verificationPage.locator('a[href*=certificate]').count(),0);
      assert.equal(await verificationPage.locator('body').evaluate(el=>el.scrollWidth>innerWidth+1),false);
      await verificationPage.screenshot({path:fileURLToPath(new URL(`../.relay-local/certificate-verification-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/certificate-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      await db.query("UPDATE student_certificates SET status='REVOKED',revocation_reason='Actual fixture revocation' WHERE id=$1",[id(95)]);
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await list.getByText('Actual fixture revocation',{exact:true}).waitFor();
      await verificationPage.reload();await verificationPage.getByText('Đã thu hồi',{exact:true}).waitFor();
      assert.equal(await list.getByRole('link',{name:'Mở giấy chứng nhận PDF',exact:true}).count(),0);
      assert.equal(await list.locator('.academy-certificate-qr').count(),0);
      await nav('Trang chủ');await page.locator('.home-bell').click();
      await page.getByRole('button').filter({has:page.getByText('Legacy certificate notification',{exact:true})}).click();
      await page.locator('.academy-certificates').getByText('Actual fixture revocation',{exact:true}).waitFor();
      assert.equal((await db.query('SELECT is_read FROM notifications WHERE id=$1',[id(950)])).rows[0].is_read,true);
      assert.equal(await page.locator('.mini-app-shell').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,levelBasedAudiences:true,legacyCatalog:viewport.width===1366,combinedFilters:true,expiredLearningCannotContinue:true,certificateAfterExpiry:true,publicSignedVerification:true,noPublicBirthDateOrPdf:true,paginationAndRetry:true,revocationRefresh:true,legacyNotification:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2200)}));throw error;}
    finally{await verificationPage?.close();await page.close();await f.close();}
  }
}finally{await browser.close();}
