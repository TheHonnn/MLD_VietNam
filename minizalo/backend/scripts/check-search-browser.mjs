import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/server.js';
import {migrateFixture} from '../test/fixtures/migrations.mjs';
import { chromium } from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

// Browser writes go only to this isolated, in-memory PostgreSQL database.
const db=new PGlite();
const schema=await readFile(new URL('../../../database/schema.sql',import.meta.url),'utf8');
await db.exec(schema.split(/\r?\n/).filter(line=>!line.startsWith('CREATE EXTENSION')&&!line.includes('gin_trgm_ops')).join('\n'));
await migrateFixture(db);
const migration=JSON.parse(await readFile(new URL('../../docs/sql/003_search_history.json',import.meta.url),'utf8'));
for(const statement of migration.statements) await db.exec(statement+';');
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
await db.exec(`INSERT INTO users(id,phone,full_name,referral_code) VALUES('${id(1)}','0900000001','Browser test customer','BROWSER1'),('${id(2)}','0900000002','Other test customer','BROWSER2');
  INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES('${id(3)}','Test branch','B1','0900000000','Test address','Test district',10,106,'');
  INSERT INTO service_categories(id,name,code,icon_url) VALUES('${id(4)}','Test category','C1','');
  INSERT INTO services(id,category_id,name,slug,short_description,full_description,price,image_url) VALUES
    ('${id(5)}','${id(4)}','Chăm sóc da','test-care','Test summary','Test description',125000,''),
    ('${id(6)}','${id(4)}','Massage thư giãn','test-massage','Test summary','Test description',250000,'');`);
await db.exec(`UPDATE services SET duration_minutes=90 WHERE id='${id(6)}';
  INSERT INTO branches(id,name,code,phone,address,district,city,latitude,longitude,image_url) VALUES('${id(7)}','Second test branch','B2','0900000003','Second address','Other district','Other city',11,107,'');
  INSERT INTO technicians(id,branch_id,full_name,avatar_url,specialties) VALUES
    ('${id(8)}','${id(3)}','First test specialist','','["Massage"]'),
    ('${id(9)}','${id(7)}','Second test specialist','','["Skin care"]');
  INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time) VALUES
    ('${id(8)}','${id(3)}','2099-01-02','10:00','11:00'),
    ('${id(9)}','${id(7)}','2099-01-02','14:00','16:00');`);
await db.exec('INSERT INTO miniapp_technician_services(technician_id,service_id) SELECT t.id,s.id FROM technicians t CROSS JOIN services s');
const store=client=>({query:async q=>(await client.query(q.text,q.values.map(value=>Prisma.Decimal.isDecimal(value)?value.toString():value))).rows,
  transaction:run=>client.transaction(tx=>run(store(tx)))});
const secret='isolated-browser-test-secret';
const server=createApp(store(db),{jwtSecret:secret}).listen(0,'127.0.0.1');
await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const headers=owner=>({Authorization:`Bearer ${jwt.sign({sub:id(owner)},secret)}`,'Content-Type':'application/json'});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  await fetch(base+'/api/search/history',{method:'POST',headers:headers(2),body:JSON.stringify({query:'Other private history'})});
  for(const viewport of [{width:390,height:844},{width:320,height:640},{width:1366,height:900}]) {
    const page=await browser.newPage({viewport});
    await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
    await page.route('**/api/**',async route=>{
      if(route.request().resourceType()==='script')return route.fallback();
      const request=route.request(),url=new URL(request.url());
      const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:headers(1),body:request.postData()||undefined});
      await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
    });
    await page.goto('http://127.0.0.1:5177/',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    await page.locator('.home-branch select:not([disabled])').waitFor();
    const open=async()=>{
      await page.locator('.home-search').getByRole('button',{name:'Tìm kiếm',exact:true}).click();
      await page.getByRole('heading',{name:'Bạn đang tìm kiếm điều gì?',exact:true}).waitFor();
    };
    const input=page.getByRole('searchbox',{name:'Từ khóa tìm kiếm'});
    const save=async query=>{
      await input.fill(query);
      const saved=page.waitForResponse(response=>response.url().endsWith('/search/history')&&response.request().method()==='POST'&&response.status()===200);
      const refreshed=page.waitForResponse(response=>response.url().endsWith('/search/history')&&response.request().method()==='GET');
      await input.press('Enter'); await saved;
      await refreshed;
    };
    await open();
    await save('Massage thư giãn');
    await save('Chăm sóc da');
    await input.fill('');
    await page.locator('.search-history-query').filter({hasText:'Chăm sóc da'}).waitFor();
    await page.locator('.search-popular button').filter({hasText:'Chăm sóc da'}).waitFor();
    assert.equal(await page.getByText('Other private history',{exact:true}).count(),0);
    assert.equal(await page.locator('.search-screen').evaluate(element=>element.scrollWidth>element.clientWidth),false);
    const bounds=await page.locator('.search-screen').boundingBox(),nav=await page.locator('.app-bottom-nav').boundingBox();
    assert.ok(bounds.y+bounds.height<=nav.y+1);
    await page.screenshot({path:new URL(`../.relay-local/search-history-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
    await page.getByRole('button',{name:'Quay lại',exact:true}).click();
    await open();
    await page.locator('.search-history-query').filter({hasText:'Massage thư giãn'}).waitFor();
    await page.locator('.search-popular button').filter({hasText:'Chăm sóc da'}).waitFor();
    const deleted=page.waitForResponse(response=>response.request().method()==='DELETE'&&response.status()===200);
    await page.getByRole('button',{name:'Xóa tìm kiếm: Massage thư giãn',exact:true}).click(); await deleted;
    await page.locator('.search-history-query').filter({hasText:'Massage thư giãn'}).waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Xóa tìm kiếm',exact:true}).click();
    await page.locator('.search-history-query').waitFor({state:'hidden'});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    await page.locator('.home-branch select:not([disabled])').waitFor(); await open();
    await input.fill('cham soc da');
    await page.locator('.search-result').filter({hasText:'Chăm sóc da'}).waitFor();
    await page.getByRole('button',{name:'Khóa học',exact:true}).click();
    await page.getByRole('heading',{name:'Khám phá khóa học',exact:true}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Tìm khóa học',exact:true}).inputValue(),'cham soc da');
    assert.equal(await page.locator('.academy-course-card').count(),0);
    await page.locator('.app-bottom-nav').getByRole('button',{name:'Trang chủ',exact:true}).click();
    await open();
    await page.getByRole('group',{name:'Loại kết quả'}).getByRole('button',{name:'Dịch vụ',exact:true}).click();
    await page.locator('.search-screen').waitFor({state:'hidden'});
    assert.equal(await page.locator('.service-catalog-card').count(),1);
    await page.locator('.service-catalog-card').filter({hasText:'Chăm sóc da'}).getByRole('button',{name:'Chi tiết',exact:true}).click();
    await page.locator('.service-detail').waitFor();
    const saved=(await db.query('SELECT query FROM miniapp_search_history WHERE user_id=$1',[id(1)])).rows;
    assert.deepEqual(saved.map(entry=>entry.query),['cham soc da']);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM miniapp_search_history WHERE user_id=$1',[id(2)])).rows[0].count,1);
    await page.locator('.service-detail-back').click();
    const serviceInput = page.getByRole('searchbox',{name:'Tìm dịch vụ chăm sóc',exact:true});
    await serviceInput.fill('');
    await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();
    await page.getByRole('spinbutton',{name:'Giá dịch vụ từ',exact:true}).fill('200000');
    assert.equal(await page.locator('.service-catalog-card').count(),1);
    assert.ok((await page.locator('.service-catalog-card').innerText()).includes('Massage thư giãn'));
    await page.getByRole('spinbutton',{name:'Giá dịch vụ đến',exact:true}).fill('100000');
    assert.equal(await page.locator('.service-catalog-card').count(),0);
    await page.getByRole('button',{name:'Xóa bộ lọc',exact:true}).click();
    await page.getByRole('combobox',{name:'Thời lượng dịch vụ tối đa',exact:true}).selectOption('60');
    assert.equal(await page.locator('.service-catalog-card').count(),1);
    assert.ok((await page.locator('.service-catalog-card').innerText()).includes('Chăm sóc da'));
    await page.getByRole('button',{name:'Xóa bộ lọc',exact:true}).click();
    const navigate = async label => {
      await page.getByRole('button',{name:'Tìm kiếm tất cả',exact:true}).click();
      await input.fill('');
      await page.getByRole('group',{name:'Loại kết quả'}).getByRole('button',{name:label,exact:true}).click();
    };
    await navigate('Chi nhánh');
    const branchResults = page.locator('.branch-results');
    assert.equal(await page.locator('.branch-card').count(),2);
    await page.getByRole('combobox',{name:'Dịch vụ có lịch trống',exact:true}).selectOption(id(6));
    await page.getByRole('textbox',{name:'Ngày có lịch tại chi nhánh',exact:true}).fill('2099-01-02');
    await page.locator('.branch-card').filter({hasText:'Second test branch'}).waitFor();
    assert.equal(await page.locator('.branch-card').count(),1);
    assert.ok((await branchResults.boundingBox()).height > 80);
    await page.screenshot({path:new URL(`../.relay-local/branch-availability-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
    await page.locator('.branch-heading-row .branch-back').click();
    await navigate('Chuyên viên');
    await page.locator('#specialist-directory-heading').waitFor();
    await page.getByRole('combobox',{name:'Chuyên môn',exact:true}).selectOption('Massage');
    assert.equal(await page.locator('.specialist-card').count(),1);
    await page.getByRole('combobox',{name:'Chuyên môn',exact:true}).selectOption('');
    await page.getByRole('combobox',{name:'Chi nhánh',exact:true}).selectOption(id(3));
    assert.equal(await page.locator('.specialist-card').count(),1);
    await page.getByRole('combobox',{name:'Chi nhánh',exact:true}).selectOption('');
    await page.getByRole('combobox',{name:'Dịch vụ có lịch trống',exact:true}).selectOption(id(5));
    await page.getByRole('textbox',{name:'Ngày có lịch chuyên viên',exact:true}).fill('2099-01-02');
    await page.waitForFunction(() => Array.from(document.querySelector('select[aria-label="Giờ trống"]').options).some(option => option.value === '14:00'));
    await page.waitForFunction(() => document.querySelectorAll('.specialist-card').length === 2);
    await page.getByRole('combobox',{name:'Giờ trống',exact:true}).selectOption('14:00');
    assert.equal(await page.locator('.specialist-card').count(),1);
    assert.ok((await page.locator('.specialist-card').innerText()).includes('Second test specialist'));
    await page.screenshot({path:new URL(`../.relay-local/specialist-availability-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
    await page.getByRole('textbox',{name:'Ngày có lịch chuyên viên',exact:true}).fill('2099-01-03');
    await page.waitForFunction(() => document.querySelector('.specialist-result-count')?.textContent === '0 chuyên viên phù hợp');
    assert.equal(await page.locator('.specialist-card').count(),0);
    // API failures must remain visible rather than masquerading as empty availability.
    await page.route('**/api/slots?**', route => route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,statusCode:503,message:'Availability unavailable'})}));
    await page.getByRole('textbox',{name:'Ngày có lịch chuyên viên',exact:true}).fill('2099-01-04');
    await page.locator('.specialist-filters [role=alert]').waitFor();
    assert.equal(await page.locator('.specialist-card').count(),0);
    await fetch(base+'/api/search/history',{method:'DELETE',headers:headers(1)});
    console.log(JSON.stringify({viewport,isolatedDatabase:true,saveReloadDelete:true,privateHistoryIsolated:true,unaccentedSearch:true,navigationUnobscured:true,servicePriceDuration:true,realSlotFiltering:true,availabilityErrorsVisible:true}));
    await page.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await db.close();}
