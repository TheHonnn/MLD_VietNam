import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {workflowFixture} from '../test/fixtures/workflow.mjs';
import {chromium} from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1366,height:900}]) {
    const f=await workflowFixture(),page=await browser.newPage({viewport,hasTouch:true,isMobile:viewport.width!==1366}),errors=[];
    let failServices=false;
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await f.db.query("UPDATE services SET name=CASE WHEN id=$1 THEN 'Chăm sóc chuyên sâu' ELSE name END,is_featured=true,image_url='/static/onboarding-academy.jpg'",[f.id(5)]);
      await f.db.query("INSERT INTO service_categories(id,name,code,icon_url) VALUES($1,'Other actual category','OTHER','')",[f.id(903)]);
      await f.db.query('UPDATE services SET category_id=$1 WHERE id=$2',[f.id(903),f.id(6)]);
      await f.db.query("INSERT INTO branches(id,name,code,phone,address,district,city,latitude,longitude,image_url) VALUES($1,'Northern fixture branch','NORTH','0900000999','Northern actual address','District','Hà Nội',21,105,'')",[f.id(902)]);
      await f.db.query("INSERT INTO support_faqs(category,question,answer) VALUES('GENERAL','Home actual question','Home actual answer')");
      await page.addInitScript(()=>window.addEventListener('unhandledrejection',event=>{if(event.reason?.code===-2000&&event.reason?.api==='login')event.preventDefault();}));
      await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
      await page.route('**/static/onboarding-academy.jpg',route=>route.fulfill({path:fileURLToPath(new URL('../../zalo_mini_app/my-app/src/static/onboarding-academy.jpg',import.meta.url)),contentType:'image/jpeg'}));
      await page.route('**/api/**',async route=>{
        const req=route.request(),url=new URL(req.url());if(req.resourceType()==='script')return route.fallback();
        if(failServices&&url.pathname==='/api/services')return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'Fixture unavailable'})});
        const response=await fetch(f.base+url.pathname+url.search,{method:req.method(),headers:f.headers(),body:req.postData()||undefined});
        await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
      });
      await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5178/',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      const nav=name=>page.locator('.app-bottom-nav').getByRole('button',{name,exact:true}).click();
      const home=()=>nav('Trang chủ');
      const catalog=page.getByRole('dialog',{name:'Khám phá dịch vụ và tiện ích',exact:true});
      const openCatalog=()=>page.getByTitle('Khám phá dịch vụ và tiện ích',{exact:true}).click();
      const branchInfo=page.locator('.home-information').filter({has:page.getByRole('heading',{name:'Chi nhánh của bạn',exact:true})});
      const hero=page.locator('.home-feature');
      assert.equal(await page.locator('.home-greeting-copy h1').innerText(),'Xin chào, Workflow customer!');
      await page.getByTitle('Hồ sơ cá nhân',{exact:true}).click();await page.getByTitle('Chỉnh sửa thông tin',{exact:true}).waitFor();await home();
      await page.locator('.home-branch select').selectOption(f.id(902));
      await branchInfo.getByRole('heading',{name:'Northern fixture branch',exact:true}).waitFor();
      assert.equal(await branchInfo.getByRole('link').getAttribute('href'),'tel:0900000999');
      await branchInfo.getByRole('button',{name:'Chi tiết',exact:true}).click();
      await page.locator('.branch-detail').getByRole('heading',{name:'Northern fixture branch',exact:true}).waitFor();
      await page.locator('.branch-detail .branch-back').click();
      await branchInfo.getByRole('button',{name:'Chỉ đường',exact:true}).click();
      assert.equal(new URL(await page.locator('.branch-location-screen').getByRole('link',{name:'Mở bản đồ',exact:true}).getAttribute('href')).searchParams.get('destination'),'21,105');
      await page.locator('.branch-location-screen').getByRole('button',{name:'Quay lại',exact:true}).click();await page.locator('.branch-detail .branch-back').click();
      await page.getByTitle('Tìm kiếm',{exact:true}).click();await page.locator('.search-screen').waitFor();await page.locator('.search-back').click();
      await page.locator('.home-search-field').click();await page.locator('.search-screen').waitFor();
      const paused=await hero.locator('h2').innerText();await page.waitForTimeout(3200);assert.equal(await hero.locator('h2').innerText(),paused);
      await page.locator('.search-back').click();
      await page.locator('.home-bell').click();await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor();await page.getByRole('button',{name:'Quay lại',exact:true}).click();
      await page.locator('.home-upcoming').click();await page.getByRole('heading',{name:'Chi tiết lịch hẹn',exact:true}).waitFor();
      await page.getByText('WF-FUTURE',{exact:true}).waitFor();await page.getByTitle('Quay lại lịch hẹn của tôi',{exact:true}).click();await home();
      for(const [label,selector] of [['Lịch hẹn','.appointments-list'],['Học viện','.academy-screen'],['Chi nhánh','.branch-directory'],['Chuyên viên','.specialist-directory']]) {
        await page.getByRole('navigation',{name:'Tiện ích nhanh'}).getByRole('button',{name:label,exact:true}).click();await page.locator(selector).waitFor();await home();
      }
      for(const [heading,selector] of [['Dịch vụ chăm sóc','.service-catalog-card'],['Đào tạo và phát triển nghề','.academy-screen']]) {
        const section=page.locator('.home-information').filter({has:page.getByRole('heading',{name:heading,exact:true})});
        await section.getByRole('button',{name:'Xem tất cả',exact:true}).click();await page.locator(selector).first().waitFor();await home();
        await section.locator('.home-preview-list > button').first().click();await page.locator(heading==='Dịch vụ chăm sóc'?'.service-detail':'.academy-screen').waitFor();
        if(heading==='Dịch vụ chăm sóc')await page.locator('.service-detail-back').click();else await home();
      }
      await page.locator('.home-information details summary').click();await page.getByText('Home actual answer',{exact:true}).waitFor();
      assert.equal(await page.locator('.home-about').innerText().then(text=>text.includes('2 dịch vụ')&&text.includes('2 chi nhánh')&&text.includes('1 khóa học')),true);
      await openCatalog();
      await catalog.getByLabel('Tìm dịch vụ',{exact:true}).fill('cham soc');
      await catalog.getByRole('heading',{name:'Chăm sóc chuyên sâu',exact:true}).waitFor();
      assert.equal(await catalog.getByRole('heading',{name:'Additional service',exact:true}).count(),0);
      await catalog.getByLabel('Tìm dịch vụ',{exact:true}).fill('');await catalog.getByLabel('Danh mục',{exact:true}).selectOption(f.id(4));
      assert.equal(await catalog.getByRole('heading',{name:'Additional service',exact:true}).count(),0);
      await catalog.getByLabel('Danh mục',{exact:true}).selectOption('');
      await catalog.getByLabel('Sắp xếp',{exact:true}).selectOption('priceAsc');
      const serviceSection=catalog.locator('section').filter({has:page.getByRole('heading',{name:'Dịch vụ',exact:true})});
      assert.equal(await serviceSection.locator('article h3').first().innerText(),'Additional service');
      await catalog.getByLabel('Sắp xếp',{exact:true}).selectOption('priceDesc');assert.equal(await serviceSection.locator('article h3').first().innerText(),'Chăm sóc chuyên sâu');
      await catalog.getByLabel('Sắp xếp',{exact:true}).selectOption('duration');assert.equal(await serviceSection.locator('article h3').first().innerText(),'Additional service');
      await catalog.getByLabel('Tỉnh / thành phố',{exact:true}).selectOption('Hà Nội');
      assert.equal(await catalog.getByRole('heading',{name:'Workflow branch',exact:true}).count(),0);
      await catalog.getByRole('heading',{name:'Northern fixture branch',exact:true}).waitFor();
      await catalog.getByRole('button',{name:'Đóng',exact:true}).click();await openCatalog();await page.keyboard.press('Escape');await catalog.waitFor({state:'hidden'});
      if(viewport.width===390){
        const section=title=>catalog.locator('section').filter({has:page.getByRole('heading',{name:title,exact:true})});
        await openCatalog();await section('Dịch vụ').getByRole('button',{name:'Xem chi tiết',exact:true}).first().click();
        await page.locator('.service-detail').getByRole('heading',{name:'Additional service',exact:true}).waitFor();await page.locator('.service-detail-back').click();
        await openCatalog();await section('Dịch vụ').getByRole('button',{name:'Đặt lịch',exact:true}).first().click();await page.locator('.booking-flow').waitFor();await page.locator('.booking-back').click();
        await openCatalog();await section('Lịch hẹn sắp tới').getByRole('button',{name:'Xem lịch hẹn',exact:true}).click();
        await page.getByText('WF-FUTURE',{exact:true}).waitFor();await page.getByTitle('Quay lại lịch hẹn của tôi',{exact:true}).click();await home();
        await openCatalog();await section('Chuyên viên').getByRole('button').filter({hasText:'Workflow specialist'}).click();await page.locator('.specialist-detail').waitFor();await page.getByTitle('Quay lại danh sách chuyên viên',{exact:true}).click();
        await openCatalog();await section('Khóa học').getByRole('button',{name:'Xem chi tiết',exact:true}).click();await page.locator('.academy-screen').getByRole('heading',{name:'Workflow course',exact:true}).waitFor();await home();
        await openCatalog();await section('Chi nhánh').getByRole('button',{name:'Xem chi tiết',exact:true}).first().click();await page.locator('.branch-detail').waitFor();await page.locator('.branch-detail .branch-back').click();
        await openCatalog();await section('Chi nhánh').getByRole('button',{name:'Chỉ đường',exact:true}).first().click();await page.locator('.branch-location-screen').waitFor();await page.locator('.branch-location-screen').getByRole('button',{name:'Quay lại',exact:true}).click();await page.locator('.branch-detail .branch-back').click();
        for(const [title,button,selector] of [['Dịch vụ','Xem tất cả','.service-catalog-card'],['Chuyên viên','Xem tất cả','.specialist-directory'],['Khóa học','Xem khóa học','.academy-screen'],['Chi nhánh',/^Xem tất cả/,'.branch-directory']]) {
          await openCatalog();await section(title).getByRole('button',{name:button,exact:typeof button==='string'}).click();await page.locator(selector).first().waitFor();await home();
        }
        await openCatalog();await catalog.getByRole('button',{name:/^Thông báo/}).click();await page.getByRole('heading',{name:'Thông báo',exact:true}).waitFor();await page.getByRole('button',{name:'Quay lại',exact:true}).click();
        await openCatalog();await catalog.getByRole('button',{name:'Tìm dịch vụ, khóa học, chuyên viên...',exact:true}).click();await page.locator('.search-screen').waitFor();await page.locator('.search-back').click();
      }
      await hero.scrollIntoViewIfNeeded();
      await hero.getByRole('button',{name:/^Dịch vụ:/}).first().click();
      const before=await hero.locator('h2').innerText();
      await hero.locator('.home-feature-photo').evaluate(target=>{const touch=new Touch({identifier:1,target,clientX:220,clientY:100});target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch],changedTouches:[touch]}));});
      await page.waitForTimeout(3200);assert.equal(await hero.locator('h2').innerText(),before);
      await hero.locator('.home-feature-photo').evaluate(target=>{const touch=new Touch({identifier:1,target,clientX:70,clientY:100});target.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[touch]}));target.click();});
      assert.equal(await page.locator('.service-detail').count(),0,'Swiping must not trigger a service click');
      assert.notEqual(await hero.locator('h2').innerText(),before);
      await hero.locator('.home-feature-photo').click();await page.locator('.service-detail').waitFor();await page.locator('.service-detail-back').click();
      await hero.locator('.home-book-button').click();await page.locator('.booking-footer > button').click();
      assert.ok((await page.locator('.booking-branch-choice[aria-pressed=true]').innerText()).includes('Northern fixture branch'));
      await page.locator('.booking-back').click();await page.locator('.booking-back').click();
      await f.db.query('UPDATE services SET discount_price=75000 WHERE id=$1',[f.id(5)]);
      await hero.getByTitle('Cập nhật dữ liệu',{exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      assert.equal(await page.locator('.home-branch select').inputValue(),f.id(902));
      await page.locator('.home-preview-list > button').filter({hasText:'Chăm sóc chuyên sâu'}).getByText('60 phút · 75.000đ',{exact:true}).waitFor();
      failServices=true;await hero.getByTitle('Cập nhật dữ liệu',{exact:true}).click();await page.locator('.home-data-status[role=alert]').waitFor();
      assert.equal(await hero.locator('.home-book-button').isDisabled(),true);
      failServices=false;await page.getByTitle('Thử tải lại',{exact:true}).click();await page.locator('.home-branch select:not([disabled])').waitFor();
      await page.locator('.home-preview-list > button').filter({hasText:'Chăm sóc chuyên sâu'}).waitFor();
      await page.locator('.app-main-content--home').evaluate(element=>{element.scrollTop=0;});
      assert.equal(await page.locator('.mini-app-shell').evaluate(element=>element.scrollWidth>element.clientWidth+1),false);
      const media=await hero.locator('.home-feature-photo').boundingBox(),title=await hero.locator('h2').boundingBox();
      assert.ok(media.height>=60&&title.height>=20,'The home image and title remain framed, including landscape');
      assert.equal(await hero.evaluate(element=>element.scrollHeight>element.clientHeight+1),false,'The banner must not clip its own controls or text');
      await hero.locator('.home-feature-photo img').waitFor();
      assert.equal(await hero.locator('.home-feature-photo img').evaluate(image=>image.complete&&image.naturalWidth>0),true);
      await page.screenshot({path:fileURLToPath(new URL(`../.relay-local/home-controls-${viewport.width}.png`,import.meta.url))});
      await page.evaluate(()=>{Date.now=()=>Date.parse('2099-01-11T00:00:00+07:00');window.dispatchEvent(new Event('focus'));});
      await page.locator('.home-upcoming').waitFor({state:'hidden'});
      assert.deepEqual(errors,[]);
      console.log(JSON.stringify({viewport,homeLinksAndInputs:true,selectedBranchPreserved:true,exactUpcomingBooking:true,catalogFilters:true,touchAndOverlayPause:true,realPriceRefresh:true,offlineRecovery:true,noPageErrors:true}));
    } catch(error){console.error(JSON.stringify({viewport,body:(await page.locator('body').innerText()).slice(-3000)}));throw error;}
    finally {await page.close();await f.close();}
  }
} finally {await browser.close();}
