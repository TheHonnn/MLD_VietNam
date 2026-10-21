import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await workflowFixture(),{db,id}=f,page=await browser.newPage({viewport});
    let releaseDraft,pending=false,returned=false,held=false;
    const gate=new Promise(resolve=>releaseDraft=resolve),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query('INSERT INTO course_quizzes(id,course_id,title,passing_score) VALUES($1,$2,$3,7)',[id(850),id(22),'Second configured quiz']);
      await db.query('INSERT INTO quiz_questions(id,quiz_id,question_number,question_text,options,correct_option) VALUES($1,$2,1,$3,$4::jsonb,$5)',[id(851),id(850),'Second quiz question',JSON.stringify(['Second quiz first option','Second quiz other option']),'A']);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        const delayed=url.pathname.endsWith('/quiz/draft')&&!held;
        if(delayed){held=true;pending=true;await gate;}
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
        const body=await response.text();
        if(delayed)assert.equal(response.status,409,'The previous attempt actually expires before its delayed draft reaches the server');
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body});
        if(delayed)returned=true;
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Học viện',exact:true}).click();
      await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-tabs').getByRole('button',{name:'Kiểm tra',exact:true}).click();
      const start=page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true});
      await page.getByRole('combobox',{name:'Bài kiểm tra',exact:true}).selectOption(id(26));await start.click();
      await page.locator('fieldset').first().getByRole('radio').first().check();
      for(let n=0;n<100&&!pending;n++)await page.waitForTimeout(20);
      assert.equal(pending,true);
      await db.query("UPDATE miniapp_quiz_attempts SET started_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour' WHERE quiz_id=$1",[id(26)]);
      await page.getByRole('combobox',{name:'Bài kiểm tra',exact:true}).selectOption(id(850));await start.click();
      await page.getByRole('radio',{name:'Second quiz first option',exact:true}).check();releaseDraft();
      for(let n=0;n<150&&!returned;n++)await page.waitForTimeout(20);
      assert.equal(returned,true);await page.waitForTimeout(150);
      assert.equal(await page.locator('.academy-feedback [role="alert"]').count(),0,'A previous quiz draft cannot display an error on the newly selected quiz');
      let saved=false;
      for(let n=0;n<100;n++){
        const attempt=(await db.query('SELECT draft_answers FROM miniapp_quiz_attempts WHERE quiz_id=$1',[id(850)])).rows[0];
        if(attempt?.draft_answers?.[id(851)]==='A'){saved=true;assert.deepEqual(attempt.draft_answers,{[id(851)]:'A'});break;}
        await page.waitForTimeout(20);
      }
      assert.equal(saved,true,'An expired previous draft cannot poison later quiz saves');assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,previousQuizErrorIsolated:true,newQuizDraftPersisted:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-2400),errors}));throw error;}
    finally{releaseDraft();await page.close();await f.close();}
  }
}finally{await browser.close();}
