import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await workflowFixture(),{db,id}=f,page=await browser.newPage({viewport});
    let releaseSupport,supportPending=false,blockedNoteWrites=0,releaseNotes,notesPending=false;
    const supportGate=new Promise(resolve=>releaseSupport=resolve),notesGate=new Promise(resolve=>releaseNotes=resolve),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,video_url,duration_minutes) VALUES($1,$2,'Expiring video lesson','VIDEO','https://example.test/fixture.mp4',1)",[id(904),id(23)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/fixture.mp4',route=>route.fulfill({status:404,body:''}));
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(url.pathname==='/api/auth/zalo/register'){
          const current=await f.request('/auth/me');
          return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,data:{user:current.data.user,token:f.headers().Authorization.replace(/^Bearer /,'')}})});
        }
        const headers=f.headers();if(req.headers()['idempotency-key'])headers['Idempotency-Key']=req.headers()['idempotency-key'];
        if(url.pathname.endsWith('/progress')&&JSON.parse(req.postData()||'{}').studentNotes==='Permanently rejected draft'){
          blockedNoteWrites++;
          return route.fulfill({status:400,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Invalid lesson progress'})});
        }
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});
        const body=await response.text();
        if(url.pathname==='/api/support-tickets'&&req.method()==='POST'){supportPending=true;await supportGate;}
        if(url.pathname.endsWith('/progress')&&JSON.parse(req.postData()||'{}').studentNotes==='Delayed previous draft'){notesPending=true;await notesGate;}
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      await nav('Cá nhân');await page.getByRole('button',{name:'Chỉnh sửa thông tin',exact:true}).click();
      await page.evaluate(()=>{
        const ActualImage=window.Image,descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
        window.Image=function(...args){
          const image=new ActualImage(...args);
          Object.defineProperty(image,'src',{get(){return descriptor.get.call(image);},set(value){if(String(value).startsWith('blob:'))window.releaseAvatar=()=>descriptor.set.call(image,value);else descriptor.set.call(image,value);}});
          return image;
        };
        window.restoreImage=()=>{window.Image=ActualImage;};
      });
      await page.locator('.profile-overlay input[type="file"]').setInputFiles(fileURLToPath(new URL('../../zalo_mini_app/my-app/src/static/onboarding-academy.jpg',import.meta.url)));
      await page.waitForFunction(()=>typeof window.releaseAvatar==='function');
      const avatarSaveLocked=await page.getByRole('button',{name:/^Lưu$|^Đang xử lý ảnh/}).first().isDisabled();
      await page.evaluate(()=>{window.releaseAvatar();window.restoreImage();});
      await page.getByText('Chọn ảnh từ thiết bị',{exact:true}).waitFor();
      await page.goBack();
      const sessionReady=await page.evaluate(async()=>{
        const url=performance.getEntriesByType('resource').map(entry=>entry.name).find(value=>new URL(value).pathname.endsWith('/api/client.ts'));
        const{apiClient}=await import(url||'/api/client.ts');
        return Boolean((await apiClient.registerZaloProfile('isolated-proof',{fullName:'Workflow customer'}))?.token);
      });
      assert.equal(sessionReady,true,'Install the disposable fixture session into the application API module');
      await page.getByRole('button',{name:/Gói liệu trình/}).click();
      await page.getByRole('button',{name:'Hỗ trợ',exact:true}).click();
      await page.getByRole('textbox',{name:'Tiêu đề',exact:true}).fill('Held fixture support');
      await page.getByRole('textbox',{name:'Nội dung',exact:true}).fill('Payload being sent');
      await page.getByRole('button',{name:'Gửi yêu cầu hỗ trợ',exact:true}).click();
      for(let n=0;n<100&&!supportPending;n++)await page.waitForTimeout(20);
      assert.equal(supportPending,true);
      const supportFieldsLocked=await page.getByRole('textbox',{name:'Nội dung',exact:true}).isDisabled();
      releaseSupport();await page.getByText('Đã gửi yêu cầu hỗ trợ.',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Quay lại',exact:true}).click();
      await nav('Học viện');await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-lesson-row').filter({hasText:'Expiring video lesson'}).click();
      const dialog=page.getByRole('dialog',{name:'Expiring video lesson',exact:true});await dialog.waitFor();
      await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).fill('Delayed previous draft');
      for(let n=0;n<100&&!notesPending;n++)await page.waitForTimeout(20);
      assert.equal(notesPending,true,'Hold a persisted old note response while the customer edits again');
      await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).fill('');releaseNotes();
      let revertedNotesSaved=false;
      for(let n=0;n<150;n++){
        const row=(await db.query('SELECT student_notes FROM user_lesson_progress WHERE lesson_id=$1',[id(904)])).rows[0];
        if(row?.student_notes===''){revertedNotesSaved=true;break;}
        await page.waitForTimeout(20);
      }
      assert.equal(revertedNotesSaved,true,'Reverting to the previously saved text must still persist after an older response arrives');
      for(let n=0;n<100;n++){if((await db.query('SELECT id FROM miniapp_lesson_playbacks')).rows.length)break;await page.waitForTimeout(20);}
      await db.query("UPDATE miniapp_lesson_playbacks SET expires_at='2000-01-01'");
      await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).fill('Draft survives expired video session');
      await page.waitForTimeout(650);
      await dialog.getByRole('button',{name:'Đóng bài học',exact:true}).click();
      await dialog.getByRole('alert').waitFor();
      const canRecover=await dialog.getByRole('button',{name:'Đóng và giữ bản nháp',exact:true}).count()===1;
      if(canRecover){
        await dialog.getByRole('button',{name:'Đóng và giữ bản nháp',exact:true}).click();await dialog.waitFor({state:'hidden'});
        await page.locator('.academy-lesson-row').filter({hasText:'Expiring video lesson'}).click();
        assert.equal(await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).inputValue(),'Draft survives expired video session');
      }
      const notesBounded=await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).getAttribute('maxLength')==='10000';
      await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).fill('Permanently rejected draft');
      for(let n=0;n<100&&!blockedNoteWrites;n++)await page.waitForTimeout(20);
      assert.equal(blockedNoteWrites,1);await page.waitForTimeout(3400);
      const permanentErrorsStopRetry=blockedNoteWrites===1;
      await page.goBack();
      await page.waitForFunction(()=>!document.querySelector('.academy-lesson-dialog')||Array.from(document.querySelectorAll('.academy-lesson-dialog button')).some(button=>button.textContent==='Đóng và giữ bản nháp'));
      assert.equal(await page.locator('.academy-lesson-row').filter({hasText:'Expiring video lesson'}).getAttribute('data-lesson-id'),id(904),'A video progress row must never replace the lesson UUID');
      if(await dialog.isVisible())await page.goBack();
      await dialog.waitFor({state:'hidden'});
      await page.locator('.academy-lesson-row').filter({hasText:'Expiring video lesson'}).click();
      assert.equal(await dialog.getByRole('textbox',{name:'Ghi chú',exact:true}).inputValue(),'Permanently rejected draft');
      const result={viewport,avatarSaveLocked,supportFieldsLocked,revertedNotesSaved,expiredVideoRecoverable:canRecover,notesBounded,permanentErrorsStopRetry,noPageErrors:errors.length===0};console.log(JSON.stringify(result));
      assert.equal(avatarSaveLocked,true,'Saving must wait for the selected avatar to finish decoding');
      assert.equal(supportFieldsLocked,true,'Editing a pending support form must not lose a new draft');
      assert.equal(canRecover,true,'An expired playback must not trap the user in a lesson');assert.deepEqual(errors,[]);
      assert.equal(notesBounded,true);assert.equal(permanentErrorsStopRetry,true,'A permanent validation error must not trigger endless automatic writes');
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2200),errors}));throw error;}
    finally{releaseSupport();releaseNotes();await page.close();await f.close();}
  }
}finally{await browser.close();}
