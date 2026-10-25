import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {staffFixture} from '../test/fixtures/staff.mjs';
import {chromium,webkit} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

// This SDK transport is test-only; no YouTube view or production media is fabricated.
const sdk=`window.fixtureYoutube={created:0,destroyed:0,reads:0};window.YT={Player:class{
 constructor(target,options){this.options=options;this.state=2;this.position=0;this.started=0;this.frame=document.createElement('iframe');this.frame.srcdoc='<body style="margin:0;background:#173f4c;color:white;font-family:system-ui"><h3>Isolated player transport</h3><button id="play">Play fixture</button><button id="pause">Pause fixture</button></body>';target.replaceWith(this.frame);window.fixtureYoutube.created++;window.fixtureYoutube.last=this;this.frame.addEventListener('load',()=>{this.frame.contentDocument.getElementById('play').onclick=()=>this.playVideo();this.frame.contentDocument.getElementById('pause').onclick=()=>this.pauseVideo();options.events.onReady();},{once:true});}
 getCurrentTime(){window.fixtureYoutube.reads++;return this.position+(this.state===1?(performance.now()-this.started)/1000:0);}
 getPlayerState(){return this.state;}
 getVideoUrl(){return 'https://www.youtube.com/watch?v='+(this.currentVideoId||this.options.videoId);}
 playVideo(){this.started=performance.now();this.state=1;this.options.events.onStateChange({data:1});}
 pauseVideo(){if(this.state!==1)return;this.position=this.getCurrentTime();this.state=2;this.options.events.onStateChange({data:2});}
 getIframe(){return this.frame;}
 destroy(){this.state=2;this.frame.remove();window.fixtureYoutube.destroyed++;}
}};window.onYouTubeIframeAPIReady();`;

const useWebKit=process.env.BROWSER_ENGINE==='webkit';
const browser=await(useWebKit?webkit:chromium).launch({...(useWebKit?{}:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),headless:true});
try{
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]){
    const f=await staffFixture(),{db,id}=f,page=await browser.newPage({viewport}),errors=[];let scripts=0;
    page.on('pageerror',error=>errors.push(error.message));
    try{
      await db.query("INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES($1,$2,$3,$4,'STUDYING')",[id(94),id(90),id(22),id(30)]);
      await db.query("INSERT INTO course_lessons(id,chapter_id,title,lesson_type,video_url,duration_minutes) VALUES($1,$2,'YouTube fixture lesson','VIDEO','https://www.youtube.com/watch?v=abcdefghijk',1)",[id(97),id(23)]);
      await db.query("INSERT INTO miniapp_lesson_media_policy(lesson_id,media_url,allow_public_embed,reason) VALUES($1,'https://www.youtube.com/watch?v=abcdefghijk',true,'Explicit isolated test permission')",[id(97)]);
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('https://www.youtube.com/iframe_api',route=>{scripts++;return scripts===1&&viewport.width===390?route.abort():route.fulfill({status:200,contentType:'text/javascript',body:sdk});});
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(90),body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5181/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.app-bottom-nav').getByRole('button',{name:'Học viện',exact:true}).click();
      await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục học',exact:true}).click();
      const openLesson=()=>page.getByRole('button').filter({hasText:'YouTube fixture lesson'}).first().click();
      await openLesson();const dialog=page.locator('.academy-lesson-dialog');
      await dialog.getByRole('button',{name:'Mở video YouTube',exact:true}).waitFor();assert.equal(scripts,0);assert.equal(await dialog.locator('iframe').count(),0);
      await dialog.getByRole('button',{name:'Mở video YouTube',exact:true}).click();
      if(viewport.width===390){await dialog.getByRole('button',{name:'Thử lại YouTube',exact:true}).click();}
      await dialog.locator('.academy-youtube iframe').waitFor();await page.waitForFunction(()=>window.fixtureYoutube?.last&&document.querySelector('.academy-youtube iframe')?.getAttribute('title')==='YouTube fixture lesson');
      assert.equal(scripts,viewport.width===390?2:1);assert.equal(await dialog.locator('.academy-video-watermark').count(),0);
      const box=await dialog.locator('.academy-youtube iframe').boundingBox();assert.ok(box.width>=200&&box.height>=200);
      assert.equal(await page.evaluate(()=>window.fixtureYoutube.last.options.playerVars.origin),new URL(page.url()).origin);
      await dialog.frameLocator('iframe').getByRole('button',{name:'Play fixture',exact:true}).click();await page.waitForTimeout(2100);
      await dialog.frameLocator('iframe').getByRole('button',{name:'Pause fixture',exact:true}).click();
      for(let n=0;n<40;n++){const rows=(await db.query('SELECT watched_seconds FROM user_lesson_progress WHERE enrollment_id=$1 AND lesson_id=$2',[id(94),id(97)])).rows;if(rows[0]?.watched_seconds>0)break;await page.waitForTimeout(100);}
      const progress=(await db.query('SELECT watched_seconds,is_completed FROM user_lesson_progress WHERE enrollment_id=$1 AND lesson_id=$2',[id(94),id(97)])).rows[0];assert.ok(progress.watched_seconds>0&&progress.watched_seconds<60);assert.equal(progress.is_completed,false);
      await page.evaluate(()=>{window.fixtureYoutube.last.currentVideoId='12345678901';});
      await dialog.frameLocator('iframe').getByRole('button',{name:'Play fixture',exact:true}).click();await page.waitForTimeout(1100);
      await dialog.frameLocator('iframe').getByRole('button',{name:'Pause fixture',exact:true}).click();
      assert.equal((await db.query('SELECT watched_seconds FROM user_lesson_progress WHERE enrollment_id=$1 AND lesson_id=$2',[id(94),id(97)])).rows[0].watched_seconds,progress.watched_seconds);
      await page.evaluate(seconds=>{window.fixtureYoutube.last.currentVideoId=window.fixtureYoutube.last.options.videoId;window.fixtureYoutube.last.position=seconds;},progress.watched_seconds);
      await dialog.locator('button').last().scrollIntoViewIfNeeded();
      const lastButton=await dialog.locator('button').last().boundingBox(),nav=await page.locator('.app-bottom-nav').boundingBox();
      assert.ok(lastButton.y+lastButton.height<=nav.y+1,'The last lesson action must scroll above bottom navigation');
      await dialog.evaluate(el=>{el.scrollTop=0;});
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/youtube-${useWebKit?'webkit':'chrome'}-${viewport.width}.png`,import.meta.url))});
      await dialog.getByRole('button',{name:'Đóng bài học',exact:true}).click();await dialog.waitFor({state:'detached'});
      const reads=await page.evaluate(()=>window.fixtureYoutube.reads);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.fixtureYoutube.reads),reads);assert.equal(await page.evaluate(()=>window.fixtureYoutube.destroyed),1);
      await openLesson();await dialog.getByRole('button',{name:'Mở video YouTube',exact:true}).click();await dialog.frameLocator('iframe').getByRole('button',{name:'Play fixture',exact:true}).click();
      await db.query('UPDATE miniapp_lesson_media_policy SET allow_public_embed=false WHERE lesson_id=$1',[id(97)]);await page.waitForTimeout(700);
      await dialog.frameLocator('iframe').getByRole('button',{name:'Pause fixture',exact:true}).click();
      await page.getByText('Quyền phát video đã thay đổi. Vui lòng mở lại bài học.',{exact:true}).waitFor();await dialog.waitFor({state:'detached'});
      await openLesson();await dialog.getByText('Video chưa được cho phép phát với cấu hình hiện tại.',{exact:true}).waitFor();assert.equal(await dialog.locator('iframe').count(),0);assert.equal(await dialog.getByRole('button',{name:'Mở video YouTube',exact:true}).count(),0);
      assert.deepEqual(errors,[]);assert.equal(await page.locator('.mini-app-shell').evaluate(el=>el.scrollWidth>el.clientWidth+2),false);
      console.log(JSON.stringify({engine:useWebKit?'webkit':'chromium',viewport,lazySdk:true,retry:viewport.width===390,serverProgress:true,cleanup:true,revocationClosesPlayer:true,providerSimulated:true,actualYouTubePlaybackTested:false}));
    }catch(error){console.error(JSON.stringify({viewport,errors,body:(await page.locator('body').innerText()).slice(-2200)}));throw error;}
    finally{await page.close();await f.close();}
  }
}finally{await browser.close();}
