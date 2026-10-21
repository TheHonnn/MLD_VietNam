import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/server.js';
import {migrateFixture} from '../test/fixtures/migrations.mjs';
import { chromium } from '../.relay-local/browser-check/node_modules/playwright/index.mjs';

// All writes in this browser check target only isolated PostgreSQL in memory.
const db=new PGlite();
const schema=await readFile(new URL('../../../database/schema.sql',import.meta.url),'utf8');
await db.exec(schema.split(/\r?\n/).filter(line=>!line.startsWith('CREATE EXTENSION')&&!line.includes('gin_trgm_ops')).join('\n'));
await migrateFixture(db);
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
await db.exec(`INSERT INTO users(id,phone,full_name,referral_code) VALUES('${id(1)}','0900000001','Học viên kiểm thử','ACADEMY1');
  INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES('${id(3)}','Chi nhánh kiểm thử','QA','0900000000','Địa chỉ kiểm thử','Quận kiểm thử',10,106,'');
  INSERT INTO course_categories(id,name,code,icon_url) VALUES('${id(7)}','Đào tạo kiểm thử','ACA','');
  INSERT INTO instructors(id,full_name,avatar_url,bio) VALUES('${id(8)}','Giảng viên kiểm thử','','Giới thiệu từ cơ sở dữ liệu kiểm thử.');
  INSERT INTO courses(id,category_id,primary_instructor_id,title,code,short_description,full_description,image_url,tuition_fee) VALUES
    ('${id(9)}','${id(7)}','${id(8)}','Khóa học đang học','QA1','Mô tả kiểm thử','Nội dung khóa học lấy từ PostgreSQL kiểm thử.','/static/onboarding-academy.jpg',1250000),
    ('${id(19)}','${id(7)}','${id(8)}','Khóa học mở đăng ký','QA2','Mô tả kiểm thử','Nội dung đăng ký lấy từ PostgreSQL kiểm thử.','/static/onboarding-academy.jpg',2500000);
  INSERT INTO course_chapters(id,course_id,title) VALUES('${id(10)}','${id(9)}','Chương 1 từ database');
  INSERT INTO course_lessons(id,chapter_id,title,duration_minutes,lesson_type,content_text,attachments) VALUES
    ('${id(11)}','${id(10)}','Bài học đọc',5,'READING_DOC','Nội dung học riêng tư từ database.','[]'),
    ('${id(12)}','${id(10)}','Bài học tiếp theo',10,'READING_DOC','Bài học thứ hai.','[]');
  INSERT INTO branch_rooms(id,branch_id,name) VALUES('${id(13)}','${id(3)}','Phòng học kiểm thử');
  INSERT INTO course_batches(id,course_id,branch_id,batch_code,instructor_id,start_date,end_date,schedule_text) VALUES
    ('${id(14)}','${id(9)}','${id(3)}','QA-CLASS1','${id(8)}','2099-01-01','2099-02-01','Lịch từ database'),
    ('${id(24)}','${id(19)}','${id(3)}','QA-CLASS2','${id(8)}','2099-01-01','2099-02-01','Lịch lớp đăng ký');
  INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES('${id(15)}','${id(1)}','${id(9)}','${id(14)}','STUDYING');
  INSERT INTO batch_schedules(id,batch_id,assigned_room_id,session_date,start_time,end_time,topic) VALUES('${id(16)}','${id(14)}','${id(13)}','2099-01-01','10:00','11:00','Buổi học từ database');
  INSERT INTO course_quizzes(id,course_id,title,passing_score) VALUES('${id(30)}','${id(9)}','Bài kiểm tra từ database',8);
  INSERT INTO quiz_questions(id,quiz_id,question_number,question_text,options,correct_option) VALUES('${id(31)}','${id(30)}',1,'Câu hỏi từ database','{"A":"Lựa chọn A","B":"Lựa chọn B"}','A');`);
const store=client=>({query:async q=>(await client.query(q.text,q.values.map(value=>Prisma.Decimal.isDecimal(value)?value.toString():value))).rows,transaction:run=>client.transaction(tx=>run(store(tx)))});
const secret='isolated-academy-browser-secret';
const server=createApp(store(db),{jwtSecret:secret}).listen(0,'127.0.0.1'); await once(server,'listening');
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for(const viewport of [{width:390,height:844},{width:320,height:640},{width:1366,height:900}]) {
    await db.exec(`DELETE FROM miniapp_quiz_attempts; DELETE FROM course_enrollments WHERE course_id='${id(19)}'; DELETE FROM user_lesson_progress; DELETE FROM quiz_submissions; UPDATE course_enrollments SET completed_lessons_count=0,progress_percent=0;`);
    const page=await browser.newPage({viewport});
    await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
    await page.route('**/api/**',async route=>{
      if(route.request().resourceType()==='script')return route.fallback();
      const request=route.request(),url=new URL(request.url());
      const response=await fetch(base+url.pathname+url.search,{method:request.method(),headers:{Authorization:`Bearer ${jwt.sign({sub:id(1)},secret)}`,'Content-Type':'application/json'},body:request.postData()||undefined});
      await route.fulfill({status:response.status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:await response.text()});
    });
    await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5177/',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Bỏ qua',exact:true}).click();
    await page.locator('.home-branch select:not([disabled])').waitFor();
    await page.locator('.app-bottom-nav').getByRole('button',{name:'Học viện',exact:true}).click();
    const shot=async name=>{
      const bounds=await page.locator('.academy-screen').boundingBox(),nav=await page.locator('.app-bottom-nav').boundingBox();
      await page.screenshot({path:new URL(`../.relay-local/academy-${name}-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
      assert.ok(bounds.y+bounds.height<=nav.y+1,JSON.stringify({name,bounds,nav}));
      assert.equal(await page.locator('.academy-header').evaluate(element=>element.scrollWidth>element.clientWidth),false);
      assert.doesNotMatch(await page.locator('.academy-screen').innerText(),/minh họa|Nguyễn Minh Anh|Nguyễn Thanh Hương|Chưa có/);
      await page.screenshot({path:new URL(`../.relay-local/academy-${name}-${viewport.width}.png`,import.meta.url).pathname.slice(1)});
    };
    await page.getByRole('heading',{name:'Học viện đào tạo',exact:true}).waitFor(); await shot('home');
    await page.getByRole('button',{name:'Khám phá khóa học',exact:true}).click(); await shot('catalog');
    await page.locator('.academy-course-card').filter({hasText:'Khóa học mở đăng ký'}).click(); await shot('course');
    await page.locator('.academy-instructor-link').click(); await shot('instructor');
    await page.getByRole('button',{name:'Xem khóa học của giảng viên',exact:true}).click();
    assert.equal(await page.locator('.academy-course-card').count(),2);
    await page.locator('.academy-course-card').filter({hasText:'Khóa học mở đăng ký'}).click();
    await page.getByRole('button',{name:'Đăng ký khóa học',exact:true}).click();
    assert.equal(await page.getByLabel('Họ và tên',{exact:true}).inputValue(),'Học viên kiểm thử');
    await page.getByLabel('Lớp khai giảng',{exact:true}).selectOption(id(24)); await shot('registration');
    await page.getByRole('button',{name:'Kiểm tra học phí',exact:true}).click(); await shot('payment');
    const registered=page.waitForResponse(response=>response.url().endsWith('/course-enrollments')&&response.request().method()==='POST'&&response.status()===201);
    await page.getByRole('button',{name:'Gửi đăng ký',exact:true}).click(); await registered;
    await page.getByRole('button',{name:'Khóa học của tôi',exact:true}).click(); await shot('my-courses');
    const [entry]=(await db.query('SELECT * FROM course_enrollments WHERE course_id=$1',[id(19)])).rows;
    assert.equal(entry.status,'CONSULTING'); assert.equal(Number(entry.amount_paid),0); assert.equal(entry.batch_id,id(24));
    await page.getByRole('button',{name:'Tiếp tục học',exact:true}).click();
    await page.getByRole('button',{name:'Tiếp tục bài học',exact:true}).waitFor(); await shot('class');
    await page.getByRole('button',{name:'Tiếp tục bài học',exact:true}).click();
    await page.getByRole('dialog',{name:'Bài học đọc',exact:true}).waitFor();
    await page.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();
    await page.getByRole('button',{name:'Đã xác nhận đã đọc',exact:true}).waitFor();
    await page.getByRole('button',{name:'Đóng bài học',exact:true}).click();
    assert.equal((await db.query('SELECT progress_percent FROM course_enrollments WHERE id=$1',[id(15)])).rows[0].progress_percent,50);
    await page.getByRole('button',{name:'Lịch học',exact:true}).click(); await page.getByText('Buổi học từ database',{exact:true}).waitFor(); await shot('schedule');
    await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
    await page.getByRole('button',{name:'Bắt đầu / tiếp tục làm bài',exact:true}).click();
    await page.getByRole('radio',{name:'Lựa chọn A',exact:true}).check();
    await page.getByRole('button',{name:'Nộp bài',exact:true}).click();
    await page.getByText(/Điểm: 100%/).waitFor();
    assert.equal((await db.query('SELECT passed FROM quiz_submissions')).rows[0].passed,true);
    console.log(JSON.stringify({viewport,isolatedDatabase:true,academyViews:true,registrationPersisted:true,realProgressAndQuiz:true,noFakePayments:true}));
    await page.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await db.close();}
