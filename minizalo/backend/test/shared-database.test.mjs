import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { createApp, bookingTime } from '../dist/server.js';
import { validateSharedSchema } from '../dist/store.js';

const ids = {
  user: '00000000-0000-0000-0000-000000000001',
  other: '00000000-0000-0000-0000-000000000002',
  branch: '00000000-0000-0000-0000-000000000003',
  category: '00000000-0000-0000-0000-000000000004',
  service: '00000000-0000-0000-0000-000000000005',
  technician: '00000000-0000-0000-0000-000000000006',
  coupon: '00000000-0000-0000-0000-000000000007',
  course: '00000000-0000-0000-0000-000000000008',
  courseCategory: '00000000-0000-0000-0000-000000000009',
};
const secret = 'shared-test-secret';
const sqlStore = db => ({
  async query(query) {
    const params = query.values.map(value => Prisma.Decimal.isDecimal(value) ? value.toString() : value);
    return (await db.query(query.text, params)).rows;
  },
  transaction: run => db.transaction(tx => run(sqlStore(tx))),
});

test('Mini App uses the canonical PostgreSQL database and preserves shared ownership', async t => {
  const db = new PGlite();
  // The embedded engine uses its built-in UUID function; optional production
  // extensions and their search index are the only omitted schema statements.
  const canonical = await readFile(new URL('../../../database/schema.sql', import.meta.url), 'utf8');
  const schema = canonical.split(/\r?\n/).filter(line => !line.startsWith('CREATE EXTENSION') && !line.includes('gin_trgm_ops')).join('\n');
  await db.exec(schema);
  const store = sqlStore(db);
  await validateSharedSchema(store);
  await db.exec(`
    INSERT INTO users (id,phone,full_name,referral_code) VALUES
      ('${ids.user}','0900000001','Shared Customer','TEST-1'),
      ('${ids.other}','0900000002','Other Customer','TEST-2');
    INSERT INTO service_categories (id,name,code,icon_url) VALUES ('${ids.category}','Massage','MASSAGE','/icon.png');
    INSERT INTO branches (id,name,code,phone,address,district,latitude,longitude,image_url)
      VALUES ('${ids.branch}','Shared Branch','TEST','0900000000','Address','District',10,106,'/branch.png');
    INSERT INTO services (id,category_id,name,slug,short_description,full_description,price,image_url)
      VALUES ('${ids.service}','${ids.category}','Shared Service','shared-service','Short','Full',100000,'/service.png');
    INSERT INTO technicians (id,branch_id,full_name,avatar_url) VALUES ('${ids.technician}','${ids.branch}','Shared Technician','/avatar.png');
    INSERT INTO technician_slots (technician_id,branch_id,slot_date,start_time,end_time)
      VALUES ('${ids.technician}','${ids.branch}','2099-01-02','10:00','11:00'),
      ('${ids.technician}','${ids.branch}','2099-01-03','10:00','11:00');
    INSERT INTO coupons (id,code,title,discount_amount,valid_from,valid_to)
      VALUES ('${ids.coupon}','TEST10','Shared Voucher',10000,'2000-01-01','2100-01-01');
    INSERT INTO voucher_distribution_rules (coupon_id,trigger_event,description)
      VALUES ('${ids.coupon}','PUBLIC_CLAIM','Test rule');
    INSERT INTO course_categories (id,name,code,icon_url) VALUES ('${ids.courseCategory}','Training','TRAINING','/icon.png');
    INSERT INTO courses (id,category_id,title,code,short_description,full_description,image_url)
      VALUES ('${ids.course}','${ids.courseCategory}','Shared Course','TEST-COURSE','Short','Full','/course.png');
  `);
  const app = createApp(store, { jwtSecret: secret });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = jwt.sign({ sub: ids.user }, secret, { expiresIn: '1h' });
  const request = async (path, { body, anonymous, tokenOverride, ...options } = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(!anonymous ? { Authorization: `Bearer ${tokenOverride ?? token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, ...(await response.json()) };
  };
  try {
    await t.test('public catalog returns shared UUIDs and uppercase account enums', async () => {
      const catalog = await request('/services', { anonymous: true });
      assert.equal(catalog.status, 200);
      assert.equal(catalog.data.services[0].id, ids.service);
      assert.equal(catalog.data.services[0].name, 'Shared Service');
      const account = await request('/auth/me');
      assert.equal(account.data.user.id, ids.user);
      assert.equal(account.data.user.membershipTier, 'STANDARD');
      assert.equal(account.data.user.passwordHash, undefined);
      const slots = await request(`/slots?branchId=${ids.branch}&serviceId=${ids.service}&date=2099-01-02`,{anonymous:true});
      assert.equal(slots.status,200,JSON.stringify(slots));
      assert.equal(slots.data.slots[0].startTime,'10:00:00');
      assert.equal(slots.data.slots[0].endTime,'11:00:00');
    });
    await t.test('no demo user, fake login or unconfigured Zalo identity succeeds', async () => {
      assert.equal((await request('/bookings', { anonymous: true })).status, 401);
      assert.equal((await request('/bookings', { tokenOverride: jwt.sign({ sub: 'usr_001' }, secret) })).status, 400);
      assert.equal((await request('/auth/zalo', { method: 'POST', body: { accessToken: 'fake',phoneToken:'code' }, anonymous: true })).status, 503);
      assert.equal((await request('/auth/login', { method: 'POST', body: { phone: '0900000001' }, anonymous: true })).status, 401);
    });
    await t.test('Zalo login reuses the shared UUID through verified phone permission without OTP or client identity', async () => {
      let exchangeCount = 0;
      const zaloFetch = async (url, options) => {
        exchangeCount++;
        assert.equal(String(url),'https://graph.zalo.me/v2.0/me/info');
        if (String(url).endsWith('/me/info')) {
          assert.equal(options.headers.code,'verified-phone-code');
          assert.equal(options.headers.secret_key,'zalo-test-secret');
          return Response.json({error:0,data:{number:'84900000001'}});
        }
        assert.equal(new URL(url).origin, 'https://graph.zalo.me');
        assert.equal(options.headers.access_token, 'verified-zalo-token');
        assert.equal(options.headers.appsecret_proof.length,64);
        assert.equal(options.body, undefined);
        exchangeCount++;
        return Response.json({ id:'987654',name:'Verified Zalo Name',picture:{data:{url:'https://example.test/avatar.png'}} });
      };
      const authServer = createApp(store, { jwtSecret: secret, zaloAppId:'123456',zaloAppSecret:'zalo-test-secret', fetch: zaloFetch }).listen(0, '127.0.0.1');
      await once(authServer,'listening');
      try {
        const response = await fetch(`http://127.0.0.1:${authServer.address().port}/api/auth/zalo`, {
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({accessToken:'verified-zalo-token',phoneToken:'verified-phone-code',userInfo:{id:ids.other,phone:'0900000002'},userId:ids.other}),
        });
        const result = await response.json();
        assert.equal(response.status,200,JSON.stringify(result));
        assert.equal(result.data.user.id,ids.user);
        assert.equal(jwt.verify(result.data.token,secret).sub,ids.user);
        assert.equal(result.data.isNewUser,false);
        assert.equal(exchangeCount,1);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,2);
      } finally { await new Promise(resolve=>authServer.close(resolve)); }
    });
    await t.test('Zalo phone login rejects invalid provider responses and unregistered customers', async()=>{
      let providerProfile;
      const authServer = createApp(store,{jwtSecret:secret,zaloAppId:'123456',zaloAppSecret:'zalo-test-secret',
        fetch:async url=>{assert.equal(String(url),'https://graph.zalo.me/v2.0/me/info');return Response.json(providerProfile);}}).listen(0,'127.0.0.1');
      await once(authServer,'listening');
      try {
        const cases = [
          [{error:-216,message:'Expired token'},401],
          [{error:0,data:{number:84999999999}},401],
          [{error:0,data:{number:'fake'}},401],
          [{error:-501,message:'IP restricted'},502],
          [{error:0,data:{number:'84999999999'}},409],
        ];
        for (const [profile,status] of cases) {
          providerProfile=profile;
          const response=await fetch(`http://127.0.0.1:${authServer.address().port}/api/auth/zalo`,{
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:'zalo-token',phoneToken:'phone-code'}),
          });
          assert.equal(response.status,status);
          assert.equal((await response.json()).success,false);
        }
        assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,2);
      } finally { await new Promise(resolve=>authServer.close(resolve)); }
    });
    await t.test('claim voucher respects shared distribution rules and duplicate claims', async () => {
      const claim = await request('/vouchers/claim', { method: 'POST', body: { code: 'TEST10' } });
      assert.equal(claim.status, 201);
      assert.equal(claim.data.voucher.coupon.id, ids.coupon);
      assert.equal((await request('/vouchers/claim', { method: 'POST', body: { code: 'TEST10' } })).status, 409);
    });
    let bookingId;
    await t.test('failed booking rolls back the shared slot reservation', async () => {
      const result = await request('/bookings',{method:'POST',body:{serviceId:ids.service,branchId:ids.branch,date:'02/01/2099',timeSlot:'10:00',voucherCode:'INVALID'}});
      assert.equal(result.status,400);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM technician_slots WHERE status='AVAILABLE'")).rows[0].n,2);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM bookings')).rows[0].n,0);
    });
    await t.test('booking is persisted in shared bookings/items/slots, ignores client price', async () => {
      const result = await request('/bookings', { method: 'POST', body: {
        serviceId: ids.service, branchId: ids.branch, doctorId: ids.technician,
        date: '02/01/2099', timeSlot: '10:00 - 11:00', voucherCode: 'TEST10', finalPrice: 1,
      } });
      assert.equal(result.status, 201, JSON.stringify(result));
      assert.equal(result.data.booking.customerId, ids.user);
      assert.equal(result.data.booking.status, 'CONFIRMED');
      assert.equal(Number(result.data.booking.finalPrice), 90000);
      assert.equal(result.data.booking.items[0].serviceId, ids.service);
      bookingId = result.data.booking.id;
      const rows = await db.query('SELECT id,customer_id FROM bookings');
      assert.equal(rows.rows[0].id, bookingId);
      assert.equal(rows.rows[0].customer_id, ids.user);
      assert.equal((await request('/bookings', { method: 'POST', body: { serviceId: ids.service, branchId: ids.branch, date: '02/01/2099', timeSlot: '10:00' } })).status, 409);
    });
    await t.test('different customer cannot read, cancel or mark another customer data', async () => {
      const tokenOverride = jwt.sign({ sub: ids.other }, secret, { expiresIn: '1h' });
      assert.equal((await request(`/bookings/${bookingId}`, { tokenOverride })).status, 404);
      assert.equal((await request(`/bookings/${bookingId}/cancel`, { method: 'PATCH', body: {}, tokenOverride })).status, 404);
      assert.equal((await request('/bookings', { tokenOverride })).data.bookings.length, 0);
      assert.equal((await request('/records', { tokenOverride })).data.records.length, 0);
    });
    await t.test('rescheduling and cancellation update shared slots and voucher wallet', async () => {
      await db.query("UPDATE bookings SET status='CHECKED_IN' WHERE id=$1",[bookingId]);
      assert.equal((await request(`/bookings/${bookingId}/cancel`,{method:'PATCH',body:{}})).status,409);
      assert.equal((await request(`/bookings/${bookingId}/reschedule`,{method:'PATCH',body:{date:'03/01/2099',timeSlot:'10:00'}})).status,409);
      await db.query("UPDATE bookings SET status='CONFIRMED' WHERE id=$1",[bookingId]);
      const changed = await request(`/bookings/${bookingId}/reschedule`, { method: 'PATCH', body: { date: '03/01/2099', timeSlot: '10:00' } });
      assert.equal(changed.status, 200, JSON.stringify(changed));
      assert.equal(changed.data.booking.bookingDate, '2099-01-03');
      const cancelled = await request(`/bookings/${bookingId}/cancel`, { method: 'PATCH', body: { reason: 'Test' } });
      assert.equal(cancelled.data.booking.status, 'CANCELLED');
      const wallet = (await db.query('SELECT status,used_in_booking_id FROM user_vouchers')).rows[0];
      assert.equal(wallet.status, 'AVAILABLE');
      assert.equal(wallet.used_in_booking_id, null);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM technician_slots WHERE status='AVAILABLE'")).rows[0].n, 2);
    });
    await t.test('course registration uses canonical CONSULTING state without faking payment', async () => {
      const result = await request('/course-enrollments', { method: 'POST', body: { courseId: ids.course, totalAmount: 1 } });
      assert.equal(result.status, 201, JSON.stringify(result));
      assert.equal(result.data.enrollment.status, 'CONSULTING');
      assert.equal(Number(result.data.enrollment.amountPaid), 0);
      assert.equal(Number(result.data.enrollment.tuitionTotal), 9000000);
      assert.equal((await request(`/courses/${ids.course}/learning`)).status, 403);
    });
    await t.test('learning and quiz results read/write canonical academy tables without issuing fake certificates',async()=>{
      await db.query("UPDATE course_enrollments SET status='ENROLLED' WHERE student_id=$1 AND course_id=$2",[ids.user,ids.course]);
      const chapter = (await db.query("INSERT INTO course_chapters(course_id,title) VALUES ($1,'Shared Chapter') RETURNING id",[ids.course])).rows[0];
      await db.query("INSERT INTO course_lessons(chapter_id,title,video_url) VALUES ($1,'Shared Lesson','https://example.test/lesson.mp4')",[chapter.id]);
      const quiz = (await db.query("INSERT INTO course_quizzes(course_id,title,total_questions) VALUES ($1,'Shared Quiz',1) RETURNING id",[ids.course])).rows[0];
      const question = (await db.query("INSERT INTO quiz_questions(quiz_id,question_number,question_text,options,correct_option) VALUES ($1,1,'Shared question',$2::jsonb,'A') RETURNING id",[quiz.id,JSON.stringify({A:'Correct',B:'Incorrect'})])).rows[0];
      const publicCourse = await request(`/courses/${ids.course}`,{anonymous:true});
      assert.equal(publicCourse.data.course.quiz.questions.length,0);
      assert.equal(publicCourse.data.course.lessons[0].videoUrl,null);
      const learning = await request(`/courses/${ids.course}/learning`);
      assert.equal(learning.status,200,JSON.stringify(learning));
      assert.equal(learning.data.course.lessons[0].videoUrl,'https://example.test/lesson.mp4');
      assert.equal(learning.data.course.quiz.questions[0].correctOption,undefined);
      const submission = await request(`/courses/${ids.course}/quiz/submit`,{method:'POST',body:{answers:{[question.id]:0}}});
      assert.equal(submission.status,200,JSON.stringify(submission));
      assert.equal(Number(submission.data.submission.score),10);
      assert.equal(submission.data.certificateCode,null);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM quiz_submissions')).rows[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM student_certificates')).rows[0].n,0);
    });
    await t.test('database changes from another client appear immediately in Mini App', async () => {
      await db.query('UPDATE services SET price=125000 WHERE id=$1', [ids.service]);
      const result = await request('/services', { anonymous: true });
      assert.equal(Number(result.data.services[0].price), 125000);
      await db.query("UPDATE users SET membership_tier='DIAMOND',reward_points=500 WHERE id=$1", [ids.user]);
      const membership = await request('/membership');
      assert.equal(membership.data.user.membershipTier, 'DIAMOND');
      assert.equal(membership.data.user.rewardPoints, 500);
    });
    await t.test('support and consultation data persist under the authenticated shared customer',async()=>{
      const ticket = await request('/support-tickets',{method:'POST',body:{subject:'Shared support',message:'Need help',customerId:ids.other}});
      assert.equal(ticket.status,201,JSON.stringify(ticket));
      assert.equal(ticket.data.ticket.customerId,ids.user);
      assert.equal((await request('/support-tickets')).data.tickets.length,1);
      const survey = await request('/consultation-surveys',{method:'POST',body:{focusAreas:['Neck'],pressurePref:'LIGHT',customerId:ids.other}});
      assert.equal(survey.status,201,JSON.stringify(survey));
      assert.equal(survey.data.survey.customerId,ids.user);
      assert.deepEqual(survey.data.survey.focusAreas,['Neck']);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM consultation_surveys')).rows[0].n,1);
    });
    await t.test('schema preflight rejects an old standalone database', async () => {
      const old = new PGlite();
      try { await assert.rejects(validateSharedSchema(sqlStore(old)), /Database does not match/); }
      finally { await old.close(); }
    });
    await t.test('invalid dates and old identifiers do not enter SQL', () => {
      assert.throws(() => bookingTime('31/02/2099','10:00',60));
      assert.throws(() => bookingTime('2099-01-02','25:00',60));
      assert.throws(() => bookingTime('bad','10:00',60));
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.close();
  }
});
