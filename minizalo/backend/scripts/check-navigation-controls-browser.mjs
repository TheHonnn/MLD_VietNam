import assert from 'node:assert/strict';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1366,height:900}]) {
    const f=await workflowFixture();
    try {
      for(const guest of [false,true]) {
        const page=await browser.newPage({viewport}),errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        try {
          await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
          await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
          await page.route('**/api/**',async route=>{
            const req=route.request(),url=new URL(req.url());
            if(req.resourceType()==='script')return route.fallback();
            const headers=guest?{'Content-Type':'application/json'}:f.headers();
            const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers,body:req.postData()||undefined});
            await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
          });
          await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
          await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
          await page.locator('.home-branch select:not([disabled])').waitFor();
          const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
          if(!guest) {
            await page.locator('.home-information').filter({has:page.getByRole('heading',{name:'Đào tạo và phát triển nghề',exact:true})}).locator('.home-preview-list > button').first().click();
            await page.locator('.academy-screen').getByRole('heading',{name:'Workflow course',exact:true}).waitFor();
            await nav('Trang chủ');await nav('Học viện');
            await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).waitFor();
            await page.getByRole('button',{name:'Khám phá khóa học',exact:true}).click();
            await nav('Học viện');
            await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).waitFor();
            await nav('Trang chủ');await page.locator('.home-search-field').click();
            await page.getByRole('searchbox',{name:'Từ khóa tìm kiếm',exact:true}).fill('Workflow');
            await page.locator('.search-categories').getByRole('button',{name:'Khóa học',exact:true}).click();
            await page.getByRole('heading',{name:'Khám phá khóa học',exact:true}).waitFor();
            await nav('Trang chủ');
            await page.getByRole('navigation',{name:'Tiện ích nhanh'}).getByRole('button',{name:'Học viện',exact:true}).click();
            await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).waitFor();
          } else {
            await page.locator('.home-bell').click();
            await page.getByRole('dialog',{name:'Đăng nhập',exact:true}).waitFor();
            await page.getByRole('dialog',{name:'Đăng nhập',exact:true}).getByRole('button',{name:'Đóng',exact:true}).click();
            await page.locator('.home-direction-link').click();
            const directions=page.locator('.branch-location-screen');await directions.waitFor();
            await directions.getByRole('button',{name:'Đặt lịch tại cơ sở này',exact:true}).click();
            await page.getByRole('dialog',{name:'Đăng nhập',exact:true}).waitFor();
            await page.getByRole('dialog',{name:'Đăng nhập',exact:true}).getByRole('button',{name:'Đóng',exact:true}).click();
            assert.equal(await directions.isVisible(),true,'Dismissing guest login preserves the directions screen');
            await directions.getByRole('button',{name:'Quay lại',exact:true}).click();
            await page.locator('.branch-detail').waitFor();
          }
          assert.deepEqual(errors,[]);
          console.log(JSON.stringify({viewport,guest,navigationControls:true,noPageErrors:true}));
        } catch(error) {console.error(JSON.stringify({viewport,guest,body:(await page.locator('body').innerText()).slice(-2200)}));throw error;}
        finally {await page.close();}
      }
    } finally {await f.close();}
  }
} finally {await browser.close();}
