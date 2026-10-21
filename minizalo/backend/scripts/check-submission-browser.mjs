import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

// Every API request is intercepted and forwarded only to an in-memory fixture.
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const viewport of [{width:390,height:844},{width:320,height:640},{width:1366,height:900}]){
    const fixture=await workflowFixture(),{db,id,base,headers}=fixture;
    const page=await browser.newPage({viewport});
    const errors=[];let historyPosts=0,releaseHistory,holdHistory=false,releaseQuiz,holdQuiz=false;
    let historyGate=Promise.resolve(),quizGate=Promise.resolve();
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query('INSERT INTO course_quizzes(id,course_id,title,passing_score,time_limit_minutes) VALUES($1,$2,$3,7,10)',[id(95),id(22),'Second configured quiz']);
      await db.query('INSERT INTO miniapp_lesson_quizzes(lesson_id,quiz_id) VALUES($1,$2)',[id(31),id(26)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/api/**',async route=>{
        if(route.request().resourceType()==='script')return route.fallback();
        const request=route.request(),url=new URL(request.url());
        if(url.pathname.endsWith('/search/history')&&request.method()==='POST'){
          historyPosts++;if(holdHistory)await historyGate;
        }
        if(url.pathname.endsWith('/quiz/start')&&holdQuiz)await quizGate;
        const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:headers(),body:request.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5177/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
      await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.home-search').getByRole('button',{name:'Tìm kiếm',exact:true}).click();
      const input=page.getByRole('searchbox',{name:'Từ khóa tìm kiếm'});
      await input.fill('Workflow service');
      historyGate=new Promise(resolve=>{releaseHistory=resolve;});holdHistory=true;
      await page.getByRole('group',{name:'Loại kết quả'}).getByRole('button',{name:'Dịch vụ',exact:true}).click();
      await page.locator('.service-catalog-card').filter({hasText:'Workflow service'}).waitFor({timeout:1500});
      assert.equal(await page.locator('.search-screen').count(),0,'History must not block navigation');
      releaseHistory();holdHistory=false;
      await page.waitForResponse(response=>response.url().endsWith('/search/history')&&response.request().method()==='POST');

      await page.getByRole('button',{name:'Tìm kiếm tất cả',exact:true}).click();
      await input.fill('Repeated search');
      const before=historyPosts;
      historyGate=new Promise(resolve=>{releaseHistory=resolve;});holdHistory=true;
      for(let i=0;i<6;i++)await input.press('Enter');
      await page.waitForTimeout(150);
      assert.equal(historyPosts-before,1,'Repeated Enter must share the pending write');
      await page.getByRole('group',{name:'Loại kết quả'}).getByRole('button',{name:'Dịch vụ',exact:true}).click();
      await page.locator('.search-screen').waitFor({state:'hidden',timeout:1500});
      releaseHistory();holdHistory=false;
      await page.waitForResponse(response=>response.url().endsWith('/search/history')&&response.request().method()==='POST');
      await page.getByRole('searchbox',{name:'Tìm dịch vụ chăm sóc',exact:true}).fill('');
      await page.locator('.service-catalog-card').filter({hasText:'Workflow service'}).getByRole('button',{name:'Chi tiết',exact:true}).click();
      await page.locator('.service-detail').waitFor();
      await page.goBack();
      await page.locator('.service-detail').waitFor({state:'hidden'});

      const nav=label=>page.locator('.app-bottom-nav').getByRole('button',{name:label,exact:true}).click();
      await nav('Học viện');await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();
      await page.getByRole('button',{name:'Tiếp tục học',exact:true}).first().click();
      await page.locator('.academy-lesson-row').filter({hasText:'Quiz lesson'}).click();
      quizGate=new Promise(resolve=>{releaseQuiz=resolve;});holdQuiz=true;
      await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();
      assert.equal(await page.getByRole('combobox',{name:'Bài kiểm tra',exact:true}).isDisabled(),true);
      releaseQuiz();holdQuiz=false;
      await page.getByRole('timer').waitFor();
      await nav('Trang chủ');
      if(viewport.width<640)await page.addStyleTag({content:'.mini-app-shell { --app-safe-top:47px !important; --app-safe-bottom:34px !important; }'});
      for(const label of ['Dịch vụ','Đặt lịch','Học viện','Cá nhân','Trang chủ']){
        await nav(label);
        const shell=await page.locator('.mini-app-shell').boundingBox(),bar=await page.locator('.app-bottom-nav').boundingBox();
        assert.ok(bar.y+bar.height<=shell.y+shell.height+1);
        assert.equal(await page.locator('.mini-app-shell').evaluate(element=>element.scrollWidth>element.clientWidth+1),false);
        if(viewport.width<640){assert.equal(Math.round(shell.y),47);assert.ok(bar.height>=96);}
      }
      await nav('Cá nhân');
      await page.getByRole('button',{name:/Cài đặt tài khoản & Bảo mật/}).click();
      await page.getByRole('button',{name:'Chính sách bảo mật',exact:true}).click();
      await page.getByRole('heading',{name:'Chính sách bảo mật',exact:true}).waitFor();
      await page.getByText('Bản dự thảo minh họa.',{exact:true}).waitFor();
      await page.goBack();
      await page.getByRole('heading',{name:'Chính sách bảo mật',exact:true}).waitFor({state:'hidden'});
      await page.getByRole('heading',{name:'Cài đặt tài khoản',exact:true}).waitFor();
      await page.getByRole('button',{name:'Điều khoản sử dụng',exact:true}).click();
      await page.getByRole('heading',{name:'Điều khoản sử dụng',exact:true}).waitFor();
      await page.getByRole('button',{name:'Đóng chính sách',exact:true}).click();
      await page.goBack();
      await page.getByRole('heading',{name:'Cài đặt tài khoản',exact:true}).waitFor({state:'hidden'});
      await nav('Trang chủ');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/submission-hardening-${viewport.width}.png`,import.meta.url))});
      assert.equal((await db.query('SELECT count(*)::int AS count FROM miniapp_search_history WHERE user_id=$1 AND query=$2',[id(1),'Repeated search'])).rows[0].count,1);
      console.log(JSON.stringify({viewport,historyDoesNotBlockNavigation:true,historySpamDeduplicated:true,browserBackClosesDetail:true,quizSelectorLocked:true,simulatedInsetsAndNavFit:true,draftLegalPagesAndNestedBack:true,noPageErrors:true}));
    }catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-3000)}));throw error;}
    finally{releaseHistory?.();releaseQuiz?.();await page.close();await fixture.close();}
  }
}finally{await browser.close();}
