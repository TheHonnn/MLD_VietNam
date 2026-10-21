import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';
import jwt from 'jsonwebtoken';

// Every API read/write is redirected to the disposable in-memory fixture.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await workflowFixture(),{db,id}=f,page=await browser.newPage({viewport});
    const errors=[],playbacks=[];let releaseMembership,releaseSave,releaseUnread;
    const membershipGate=new Promise(resolve=>releaseMembership=resolve),saveGate=new Promise(resolve=>releaseSave=resolve);
    let holdMembership=true,holdSave=true,savePending=false,dropSupport=true;const requestKeys=[];
    const unreadGate=new Promise(resolve=>releaseUnread=resolve);
    let delayNextUnread=false,unreadPending=false,failPhoto=true;
    let sessionNumber=0;
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query("INSERT INTO courses(id,category_id,title,code,short_description,full_description,image_url) VALUES($1,$2,'Preview course','PREVIEW','','','')",[id(900),id(20)]);
      await db.query("UPDATE courses SET image_url='/fixture-course-image.jpg' WHERE id=$1",[id(900)]);
      await db.query("INSERT INTO course_chapters(id,course_id,title) VALUES($1,$2,'Preview chapter')",[id(901),id(900)]);
      await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,is_free_preview,video_url,duration_minutes) VALUES($1,$2,'Public preview video','VIDEO',true,'https://example.test/preview.mp4',1)",[id(902),id(901)]);
      await db.query("INSERT INTO miniapp_course_delivery(course_id,delivery_format) VALUES($1,'ONLINE'),($2,'ONSITE')",[id(22),id(900)]);
      await db.query("INSERT INTO miniapp_membership_cards(user_id,card_code) VALUES($1,'ISSUED-BROWSER-CARD')",[id(1)]);
      await db.query("INSERT INTO notifications(user_id,title,message,type,is_read,created_at) SELECT $1,'New read '||n,'Read','SYSTEM',true,'2099-01-01'::timestamptz+n*interval '1 second' FROM generate_series(1,55) n",[id(1)]);
      await db.query("INSERT INTO notifications(user_id,title,message,type,is_read,created_at) VALUES($1,'Old unread browser event','Unread','SYSTEM',false,'2020-01-01')",[id(1)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/fixture-course-image.jpg',route=>failPhoto?route.abort('failed'):route.fulfill({path:fileURLToPath(new URL('../../zalo_mini_app/my-app/src/static/onboarding-academy.jpg',import.meta.url)),contentType:'image/jpeg'}));
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/auth/zalo/register'){
          // Authentication is covered separately; seed only this browser's disposable fixture session.
          const current=await f.request('/auth/me');
          const token=jwt.sign({sub:id(1),jti:`fixture-${++sessionNumber}`},'isolated-workflow-audit-secret');
          return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,data:{user:current.data.user,token}})});
        }
        const headers=f.headers();if(req.headers()['idempotency-key'])headers['Idempotency-Key']=req.headers()['idempotency-key'];
        if(url.pathname.endsWith('/playback'))playbacks.push(url.pathname);
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});
        const body=await response.text();
        if(url.pathname==='/api/membership'&&holdMembership)await membershipGate;
        if(url.pathname==='/api/notifications'&&url.searchParams.get('filter')==='unread'&&delayNextUnread){delayNextUnread=false;unreadPending=true;await unreadGate;}
        if(url.pathname==='/api/auth/profile'&&req.method()==='PUT'&&holdSave){savePending=true;await saveGate;}
        if(url.pathname==='/api/support-tickets'&&req.method()==='POST'){
          requestKeys.push(headers['Idempotency-Key']);
          if(dropSupport){dropSupport=false;await route.abort('failed');return;}
        }
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      await page.locator('.home-branch select:not([disabled])').waitFor();
      if(viewport.width<640)await page.addStyleTag({content:'.mini-app-shell { --app-safe-top:47px !important; --app-safe-bottom:34px !important; }'});
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Cá nhân');await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
      const name=page.locator('.profile-overlay input[type="text"]').first();
      await name.fill('Unsaved draft survives');holdMembership=false;releaseMembership();
      await page.waitForTimeout(500);assert.equal(await name.inputValue(),'Unsaved draft survives');
      await page.goBack();await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
      assert.equal(await name.inputValue(),'Workflow customer','Cancel must restore canonical data');
      await name.fill('Persisted edited customer');
      await page.getByRole('button',{name:'Lưu',exact:true}).click();
      for(let n=0;n<100&&!savePending;n++)await page.waitForTimeout(20);
      assert.equal(savePending,true);assert.equal(await name.isDisabled(),true);
      holdSave=false;releaseSave();await page.locator('.profile-overlay').waitFor({state:'hidden'});
      assert.equal((await f.request('/membership')).data.user.fullName,'Persisted edited customer');
      await page.getByRole('button',{name:/Xem thẻ hội viên/}).click();
      assert.equal(await page.getByRole('button',{name:'Chia sẻ',exact:true}).isDisabled(),false);
      await page.getByRole('img',{name:'Mã QR',exact:true}).waitFor();
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/integrity-card-${viewport.width}.png`,import.meta.url))});
      await page.goBack();await nav('Học viện');
      await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-lesson-row').first().waitFor();
      await page.goBack();await page.goBack();
      await page.getByRole('button',{name:'Khám phá khóa học',exact:true}).click();
      await page.getByRole('combobox',{name:'Hình thức',exact:true}).selectOption('ONSITE');
      assert.equal(await page.locator('.academy-course-card').count(),1);
      assert.match(await page.locator('.academy-course-card').innerText(),/Preview course/);
      failPhoto=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
      await page.waitForFunction(()=>{const image=document.querySelector('.academy-course-card img');return image?.complete&&image.naturalWidth>0;});
      await page.locator('.academy-course-card').click();
      await page.getByRole('button',{name:/Public preview video/}).click();
      await page.getByRole('dialog',{name:'Public preview video',exact:true}).waitFor();
      await page.waitForTimeout(200);assert.deepEqual(playbacks,[],'Public preview must not open another course private playback');
      assert.equal(await page.getByRole('textbox',{name:'Ghi chú',exact:true}).count(),0);
      await page.getByRole('button',{name:'Đóng bài học',exact:true}).click();
      await nav('Trang chủ');await page.locator('.home-bell').click();
      await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor();
      await page.getByRole('button',{name:/^Chưa đọc \(/}).click();
      await page.getByText('Old unread browser event',{exact:true}).waitFor();
      const shell=await page.locator('.mini-app-shell').boundingBox(),heading=await page.getByRole('heading',{name:'Thông báo',exact:true}).boundingBox();
      assert.ok(heading.y>=shell.y&&heading.y+heading.height<=shell.y+shell.height);
      if(viewport.width<640)assert.ok(shell.y>=46,'Notification screen must preserve the shell status-bar inset');
      assert.equal(await page.getByText('New read 55',{exact:true}).count(),0);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/integrity-unread-${viewport.width}.png`,import.meta.url))});
      await page.getByRole('button',{name:/^Tất cả \(/}).click();
      await page.getByText('New read 55',{exact:true}).waitFor();
      delayNextUnread=true;await page.getByRole('button',{name:/^Chưa đọc \(/}).click();
      for(let n=0;n<100&&!unreadPending;n++)await page.waitForTimeout(20);
      assert.equal(unreadPending,true);
      await db.query("UPDATE notifications SET title='Updated unread browser event' WHERE user_id=$1 AND title='Old unread browser event'",[id(1)]);
      await page.getByRole('button',{name:/^Tất cả \(/}).click();
      await page.getByRole('button',{name:/^Chưa đọc \(/}).click();
      await page.getByText('Updated unread browser event',{exact:true}).waitFor();
      releaseUnread();await page.waitForTimeout(150);
      assert.equal(await page.getByText('Old unread browser event',{exact:true}).count(),0,'An old unread response cannot overwrite a newer filter cycle');
      // Dev imports exercise the actual API client's retry fingerprint, not a test replica.
      const results=await page.evaluate(async()=>{
        const {apiClient}=await import('/api/client.ts');
        const session=await apiClient.registerZaloProfile('isolated-fixture-proof',{fullName:'Persisted edited customer'});
        if(!session?.token)throw new Error('Fixture session was not installed');
        const first=await apiClient.createSupportTicket('Retry fixture subject','Retry fixture message');
        await apiClient.registerZaloProfile('isolated-fixture-proof',{fullName:'Persisted edited customer'});
        const second=await apiClient.createSupportTicket('Retry fixture subject','Retry fixture message');
        return {failed:Boolean(first?.error),saved:Boolean(second?.ticket)};
      });
      assert.deepEqual(results,{failed:true,saved:true});assert.ok(requestKeys[0]);assert.equal(requestKeys[0],requestKeys[1]);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM support_tickets')).rows[0].count,1);
      assert.equal(await page.locator('.mini-app-shell').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,profileDraftProtected:true,profileSaveLocked:true,realCardQR:true,realDeliveryFilter:true,previewIsolated:true,imageRecoversOnline:true,oldUnreadVisible:true,filterRaceProtected:true,supportRetryIdempotent:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2000)}));throw error;}
    finally{releaseMembership();releaseSave();releaseUnread();await page.close();await f.close();}
  }
}finally{await browser.close();}
