import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const fixture = await workflowFixture();
const {base,headers,id,db} = fixture;
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:5177';
try {
  await db.query("UPDATE services SET image_url='/static/onboarding-academy.jpg'");
  for (const viewport of [{width:390,height:844},{width:320,height:640},{width:1366,height:900}]) {
    const page = await browser.newPage({viewport});
    const errors=[]; page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack}));
    await page.addInitScript(() => {
      window.testRejections=[];
      window.addEventListener('unhandledrejection',event => {
        // Native Zalo login is unavailable in desktop Chrome; do not hide application failures.
        if (event.reason?.code === -2000 && event.reason?.api === 'login') { event.preventDefault(); return; }
        window.testRejections.push({code:event.reason?.code,message:event.reason?.message,api:event.reason?.api});
      });
    });
    await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.route('**/static/onboarding-academy.jpg',route=>route.fulfill({path:fileURLToPath(new URL('../../zalo_mini_app/my-app/src/static/onboarding-academy.jpg',import.meta.url)),contentType:'image/jpeg'}));
    await page.route('**/api/**',async route=>{
      if(route.request().resourceType()==='script')return route.fallback();
      const request=route.request(),url=new URL(request.url());
      const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:headers(),body:request.postData()||undefined});
      await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
    });
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    const intro=page.locator('.care-intro-screen');
    await intro.getByRole('button',{name:'Bỏ qua',exact:true}).waitFor();
    const first=await intro.locator('h1').textContent();
    await page.waitForTimeout(3300);
    assert.notEqual(await intro.locator('h1').textContent(),first,'Intro must rotate after 3 seconds');
    const introLayout=await intro.evaluate(element=>({overflow:element.scrollHeight>element.clientHeight+1,footer:element.querySelector('footer').getBoundingClientRect().bottom,bottom:element.getBoundingClientRect().bottom}));
    assert.equal(introLayout.overflow,false); assert.ok(introLayout.footer<=introLayout.bottom+1);
    assert.equal(await intro.locator('.care-intro-photo img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/carousel-intro-${viewport.width}.png`,import.meta.url))});
    await intro.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    await page.locator('.home-branch select:not([disabled])').waitFor();
    const hero=page.locator('.home-feature');
    const firstService=await hero.locator('h2').textContent();
    await page.waitForTimeout(3300);
    assert.notEqual(await hero.locator('h2').textContent(),firstService,'Home must rotate after 3 seconds');
    assert.equal(await hero.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    const layout=await hero.evaluate(element=>({bottom:element.getBoundingClientRect().bottom,nav:document.querySelector('.app-bottom-nav').getBoundingClientRect().top,width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(layout.bottom<=layout.nav+1); assert.ok(layout.width<=layout.viewport+1);
    await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/carousel-home-${viewport.width}.png`,import.meta.url))});
    await page.locator('.home-bell').click();
    await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor();
    const booking=page.getByRole('button').filter({has:page.getByText('WF-FUTURE',{exact:false})}).last();
    await booking.click();
    await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor({state:'hidden'});
    await page.getByRole('heading',{name:'Chi tiết lịch hẹn',exact:true}).waitFor();
    await page.getByText('WF-FUTURE',{exact:false}).first().waitFor();
    assert.ok((await fixture.request('/notifications')).data.notifications.find(item=>item.data?.sourceKey===`booking:${id(13)}`).isRead);
    await page.getByTitle('Quay lại lịch hẹn của tôi',{exact:true}).click();
    await page.getByTitle('Về trang chủ',{exact:true}).click();
    await page.locator('.home-bell').click();
    await page.getByRole('button').filter({hasText:'Khóa học: Đang học'}).filter({hasText:'WF-CLASS'}).first().click();
    await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor({state:'hidden'});
    await page.locator('.academy-summary').getByText('Đang học · WF-CLASS',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Nội dung học',exact:true}).getAttribute('aria-current'),'page');
    await page.getByText('Practice lesson',{exact:true}).first().waitFor();
    if (errors.length) console.log(JSON.stringify({errors,rejections:await page.evaluate(()=>window.testRejections)}));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({viewport,introRotates:true,homeRotates:true,imagesLoaded:true,noOverflow:true,bookingNotificationDeepLink:true,exactEnrollmentDeepLink:true,readPersisted:true}));
    await page.close();
  }
} finally {await browser.close();await fixture.close();}
