import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { createApp } from '../dist/server.js';

test('admin-managed catalog, settings, learning and private documents use the canonical database', async t => {
  const db = new PGlite();
  const source = await readFile(new URL('../../../database/schema.sql', import.meta.url), 'utf8');
  await db.exec(source.split(/\r?\n/).filter(line => !line.startsWith('CREATE EXTENSION') && !line.includes('gin_trgm_ops')).join('\n'));
  const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  await db.exec(`
    INSERT INTO users(id,phone,full_name,referral_code) VALUES('${id(1)}','0900000001','Test customer','R1'),('${id(2)}','0900000002','Other customer','R2');
    INSERT INTO branches(id,name,code,phone,address,district,latitude,longitude,image_url) VALUES('${id(3)}','Admin branch','B1','0900000000','Admin address','District',10,106,'/branch.jpg');
    INSERT INTO service_categories(id,name,code,icon_url) VALUES('${id(4)}','Admin category','C1','/category.png');
    INSERT INTO services(id,category_id,name,slug,short_description,full_description,price,image_url,steps,benefits) VALUES('${id(5)}','${id(4)}','Admin service','admin-service','Summary','Actual description',125000,'/service.jpg','[{"title":"Actual step"}]','["Actual benefit"]');
    INSERT INTO technicians(id,branch_id,full_name,avatar_url) VALUES('${id(6)}','${id(3)}','Admin technician','/technician.jpg');
    INSERT INTO course_categories(id,name,code,icon_url) VALUES('${id(7)}','Admin training','ACA','/course.png');
    INSERT INTO instructors(id,full_name,avatar_url,bio) VALUES('${id(8)}','Admin instructor','/instructor.jpg','Actual biography');
    INSERT INTO courses(id,category_id,primary_instructor_id,title,code,short_description,full_description,image_url) VALUES('${id(9)}','${id(7)}','${id(8)}','Admin course','COURSE1','Summary','Full content','/course.jpg');
    INSERT INTO course_chapters(id,course_id,title) VALUES('${id(10)}','${id(9)}','Actual chapter');
    INSERT INTO course_lessons(id,chapter_id,title,duration_minutes,video_url,content_text,attachments,is_free_preview) VALUES
      ('${id(11)}','${id(10)}','Protected lesson',5,'https://example.test/private.mp4','Private text','["https://example.test/private.pdf"]',false),
      ('${id(12)}','${id(10)}','Preview lesson',5,'https://example.test/preview.mp4','Preview text','[]',true);
    INSERT INTO branch_rooms(id,branch_id,name) VALUES('${id(13)}','${id(3)}','Actual room');
    INSERT INTO course_batches(id,course_id,branch_id,batch_code,instructor_id,start_date,end_date,schedule_text) VALUES('${id(14)}','${id(9)}','${id(3)}','BATCH1','${id(8)}','2099-01-01','2099-02-01','Actual schedule');
    INSERT INTO course_enrollments(id,student_id,course_id,batch_id,status) VALUES('${id(15)}','${id(1)}','${id(9)}','${id(14)}','STUDYING');
    INSERT INTO batch_schedules(id,batch_id,assigned_room_id,session_date,start_time,end_time,topic) VALUES('${id(16)}','${id(14)}','${id(13)}','2099-01-01','10:00','11:00','Actual topic');
    INSERT INTO home_care_guidelines(title,category,summary,content,image_url,is_published) VALUES('Published guide','Care','Summary','Published content','/guide.jpg',true),('Hidden guide','Care','Summary','Secret draft','/draft.jpg',false);
    INSERT INTO support_faqs(question,answer,category) VALUES('Actual question','Actual answer','Care');
    INSERT INTO invoices(id,invoice_code,branch_id,customer_id,subtotal,total_amount) VALUES('${id(17)}','INV1','${id(3)}','${id(1)}',125000,125000),('${id(18)}','INV2','${id(3)}','${id(2)}',999,999);
    INSERT INTO invoice_items(invoice_id,item_name,quantity,unit_price,amount) VALUES('${id(17)}','Actual invoice item',1,125000,125000),('${id(18)}','Other private item',1,999,999);
    INSERT INTO referrals(referrer_id,referee_id,reward_points) VALUES('${id(1)}','${id(2)}',73);
  `);
  const store = client => ({ query: async q => (await client.query(q.text, q.values.map(value => Prisma.Decimal.isDecimal(value) ? value.toString() : value))).rows,
    transaction: run => client.transaction(tx => run(store(tx))) });
  const secret = 'isolated-admin-content-test-secret';
  const server = createApp(store(db), { jwtSecret: secret }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, owner = 1, anonymous = false } = {}) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json',
      ...(!anonymous ? { Authorization: `Bearer ${jwt.sign({sub:id(owner)},secret)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, ...await response.json() };
  };
  try {
    await t.test('public metadata changes when admin changes data, with no invented records', async () => {
      const metadata = await call('/app-metadata', { anonymous: true });
      assert.equal(metadata.status, 200, JSON.stringify(metadata));
      assert.equal(metadata.data.serviceCategories[0].id, id(4));
      assert.equal(metadata.data.instructors[0].fullName, 'Admin instructor');
      assert.equal(metadata.data.faqs[0].answer, 'Actual answer');
      assert.equal(metadata.data.membershipTiers.length, 5);
      const guides = await call('/care-guidelines', { anonymous: true });
      assert.deepEqual(guides.data.guidelines.map(g => g.title), ['Published guide']);
      const services = await call('/services', { anonymous: true });
      assert.equal(Number(services.data.services[0].price), 125000);
      assert.equal(services.data.services[0].steps[0].title, 'Actual step');
      assert.equal(services.data.services[0].reviewCount, 0);
      await db.query('UPDATE services SET name=$1,price=155000 WHERE id=$2', ['Changed by admin', id(5)]);
      const changed = await call('/services', { anonymous: true });
      assert.equal(changed.data.services[0].name, 'Changed by admin');
      assert.equal(Number(changed.data.services[0].price), 155000);
    });
    await t.test('unspecified gender remains unset when saving a real profile', async () => {
      await db.query('UPDATE users SET gender=NULL WHERE id=$1',[id(1)]);
      const saved=await call('/auth/profile',{method:'PUT',body:{fullName:'Updated customer'}});
      assert.equal(saved.status,200,JSON.stringify(saved));
      assert.equal(saved.data.user.gender,null);
      assert.equal((await call('/auth/profile',{method:'PUT',body:{gender:'ADMIN'}})).status,400);
      const explicit=await call('/auth/profile',{method:'PUT',body:{gender:'OTHER'}});
      assert.equal(explicit.data.user.gender,'OTHER');
      const cleared=await call('/auth/profile',{method:'PUT',body:{gender:null}});
      assert.equal(cleared.data.user.gender,null);
    });
    await t.test('settings persist per customer and cannot select another owner', async () => {
      assert.equal((await call('/auth/settings', { anonymous: true })).status, 401);
      assert.equal((await call('/auth/settings')).data.settings, null);
      const saved = await call('/auth/settings', { method:'PUT', body:{userId:id(2),appointmentReminder:false,language:'vi'} });
      assert.equal(saved.status, 200, JSON.stringify(saved));
      assert.equal(saved.data.settings.userId, id(1));
      assert.equal((await call('/auth/settings')).data.settings.appointmentReminder, false);
      assert.equal((await call('/auth/settings', {owner:2})).data.settings, null);
      assert.equal((await call('/auth/settings', {method:'PUT',body:{systemNotify:'yes'}})).status,400);
    });
    await t.test('public course descriptions do not expose protected lesson media or documents', async () => {
      const catalog = await call('/courses', {anonymous:true});
      assert.equal(catalog.status,200,JSON.stringify(catalog));
      const course = catalog.data.courses[0];
      assert.equal(course.instructor.fullName,'Admin instructor');
      assert.equal(course.batches[0].branchName,'Admin branch');
      assert.equal(course.chapters[0].title,'Actual chapter');
      const privateLesson=course.lessons.find(l=>l.id===id(11));
      assert.equal(privateLesson.videoUrl,null);
      assert.equal(privateLesson.contentText,null);
      assert.deepEqual(privateLesson.attachments,[]);
      assert.equal(course.lessons.find(l=>l.id===id(12)).videoUrl,'https://example.test/preview.mp4');
    });
    await t.test('learning uses actual schedule/room and progress persists without issuing certificates', async () => {
      assert.equal((await call(`/courses/${id(9)}/learning`,{owner:2})).status,403);
      const learning=await call(`/courses/${id(9)}/learning`);
      assert.equal(learning.status,200,JSON.stringify(learning));
      assert.equal(learning.data.course.schedules[0].roomName,'Actual room');
      assert.equal(learning.data.course.schedules[0].instructorName,'Admin instructor');
      const path=`/courses/${id(9)}/lessons/${id(11)}/progress`;
      assert.equal((await call(path,{method:'POST',owner:2,body:{watchedSeconds:10}})).status,403);
      assert.equal((await call(path,{method:'POST',body:{watchedSeconds:-1}})).status,400);
      const saved=await call(path,{method:'POST',body:{watchedSeconds:300,isCompleted:true,studentNotes:'My actual note'}});
      assert.equal(saved.status,200,JSON.stringify(saved));
      assert.equal(saved.data.progress.studentNotes,'My actual note');
      await call(path,{method:'POST',body:{watchedSeconds:2,isCompleted:false}});
      const reload=await call(`/courses/${id(9)}/learning`);
      const lesson=reload.data.course.lessons.find(l=>l.id===id(11));
      assert.equal(lesson.isCompleted,true);
      assert.equal(lesson.watchedSeconds,300);
      assert.equal(lesson.studentNotes,'My actual note');
      assert.equal(reload.data.course.certificate,undefined);
      const [enrollment]=(await db.query('SELECT progress_percent FROM course_enrollments WHERE id=$1',[id(15)])).rows;
      assert.equal(enrollment.progress_percent,50);
    });
    await t.test('invoice items, loyalty and referral history come only from the signed-in customer', async () => {
      const result=await call('/transactions');
      assert.equal(result.status,200,JSON.stringify(result));
      assert.equal(result.data.invoices.length,1);
      assert.equal(result.data.invoices[0].items[0].itemName,'Actual invoice item');
      assert.equal(JSON.stringify(result.data).includes('Other private item'),false);
      const membership=await call('/membership');
      assert.equal(membership.status,200,JSON.stringify(membership));
      assert.equal(membership.data.referrals[0].rewardPoints,73);
      assert.equal((await call('/membership',{owner:2})).data.referrals.length,0);
    });
    await t.test('reviews, surveys, journals and admin support replies persist with owner checks', async () => {
      await db.exec(`INSERT INTO bookings(id,booking_code,customer_id,branch_id,technician_id,booking_date,start_time,end_time,status,base_total,final_price,qr_code_hash)
        VALUES('${id(20)}','REVIEW-BOOKING','${id(1)}','${id(3)}','${id(6)}','2020-01-01','10:00','11:00','COMPLETED',155000,155000,'test-review-hash');
        INSERT INTO booking_items(booking_id,service_id,technician_id,price,duration_minutes) VALUES('${id(20)}','${id(5)}','${id(6)}',155000,60);
        INSERT INTO treatment_journal(booking_id,customer_id,technician_id,session_date,treatment_notes) VALUES('${id(20)}','${id(1)}','${id(6)}','2020-01-01','Actual journal');`);
      const body={bookingId:id(20),serviceId:id(5),rating:4,comment:'Real persisted test review',customerId:id(2)};
      assert.equal((await call('/reviews',{method:'POST',owner:2,body})).status,403);
      const saved=await call('/reviews',{method:'POST',body});
      assert.equal(saved.status,201,JSON.stringify(saved));
      assert.equal(saved.data.review.customerId,id(1));
      assert.equal((await call('/reviews',{method:'POST',body})).status,409);
      assert.equal((await call('/reviews/mine')).data.reviews.length,1);
      assert.equal((await call('/reviews/mine',{owner:2})).data.reviews.length,0);
      const doctors=await call('/doctors',{anonymous:true});
      assert.equal(Number(doctors.data.doctors[0].ratingAvg),4);
      assert.equal(doctors.data.doctors[0].reviewCount,1);
      const services=await call('/services',{anonymous:true});
      assert.equal(Number(services.data.services[0].ratingAvg),4);
      assert.equal(services.data.services[0].reviews[0].comment,body.comment);
      const survey=await call('/consultation-surveys',{method:'POST',body:{bookingId:id(20),focusAreas:['Shoulder'],pressurePref:'LIGHT'}});
      assert.equal(survey.status,201,JSON.stringify(survey));
      assert.equal((await call('/consultation-surveys')).data.surveys[0].focusAreas[0],'Shoulder');
      assert.equal((await call('/consultation-surveys',{owner:2})).data.surveys.length,0);
      const records=await call('/records');
      assert.equal(records.status,200,JSON.stringify(records));
      assert.equal(records.data.records[0].bookingStatus,'COMPLETED');
      assert.equal(records.data.records[0].serviceId,id(5));
      assert.equal(records.data.records[0].reviewId,saved.data.review.id);
      assert.equal((await call('/records',{owner:2})).data.records.length,0);
      const ticket=await call('/support-tickets',{method:'POST',body:{subject:'Actual ticket',message:'Actual question'}});
      await db.query('UPDATE support_tickets SET admin_reply=$1 WHERE id=$2',['Actual admin reply',ticket.data.ticket.id]);
      assert.equal((await call('/support-tickets')).data.tickets[0].adminReply,'Actual admin reply');
      assert.equal((await call('/support-tickets',{owner:2})).data.tickets.length,0);
    });
  } finally { await new Promise(resolve=>server.close(resolve)); await db.close(); }
});
