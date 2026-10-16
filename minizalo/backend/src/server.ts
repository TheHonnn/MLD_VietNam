import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { camel, Store, Row } from './store.js';
import { ApiError } from './errors.js';
import { findZaloAccount, resolveZaloAccount } from './zalo-auth.js';
import { authenticateZalo, RelayAuthOptions } from './zalo-relay-client.js';
export { ApiError } from './errors.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuid(value: unknown) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new ApiError(400, 'Expected a shared UUID');
  return value;
}

function success(res: Response, data: unknown, status = 200, message = 'OK') {
  return res.status(status).json({ success: true, statusCode: status, message, data: camel(data) });
}

const publicUser = Prisma.sql`id, phone, email, full_name, avatar_url, gender, date_of_birth,
  address, emergency_contact_name, emergency_contact_phone, purpose, role,
  membership_tier, reward_points, total_spent, referral_code, is_active, created_at, updated_at`;

async function user(store: Store, id: string) {
  const [record] = await store.query(Prisma.sql`SELECT ${publicUser} FROM users WHERE id = ${id}::uuid AND is_active`);
  if (!record) throw new ApiError(401, 'Shared account is missing or inactive');
  return record;
}

const bookingSelect = Prisma.sql`
  SELECT b.*, to_char(b.booking_date, 'YYYY-MM-DD') AS booking_date,
    to_char(b.start_time, 'HH24:MI:SS') AS start_time, to_char(b.end_time, 'HH24:MI:SS') AS end_time,
    u.full_name AS customer_name, u.phone AS customer_phone, br.name AS branch_name,
    t.full_name AS technician_name,
    COALESCE((SELECT json_agg(json_build_object('id', bi.id, 'service_id', bi.service_id,
      'service_title', s.name, 'image_url',s.image_url,'price', bi.price, 'duration_minutes', bi.duration_minutes,
      'technician_id', bi.technician_id)) FROM booking_items bi
      JOIN services s ON s.id = bi.service_id WHERE bi.booking_id = b.id), '[]'::json) AS items
  FROM bookings b JOIN users u ON u.id = b.customer_id JOIN branches br ON br.id = b.branch_id
  LEFT JOIN technicians t ON t.id = b.technician_id`;

const journalSelect = Prisma.sql`SELECT j.*,t.full_name AS technician_name,br.name AS branch_name,b.status AS booking_status,
  s.id AS service_id,s.name AS service_name,s.image_url AS service_image,r.id AS review_id
  FROM treatment_journal j LEFT JOIN technicians t ON t.id=j.technician_id
  LEFT JOIN bookings b ON b.id=j.booking_id LEFT JOIN branches br ON br.id=b.branch_id
  LEFT JOIN user_packages up ON up.id=j.user_package_id LEFT JOIN treatment_packages tp ON tp.id=up.package_id
  LEFT JOIN services s ON s.id=COALESCE(tp.service_id,(SELECT CASE WHEN count(*)=1 THEN min(bi.service_id::text)::uuid ELSE NULL END FROM booking_items bi WHERE bi.booking_id=b.id))
  LEFT JOIN reviews r ON r.booking_id=j.booking_id`;

const serviceSelect = Prisma.sql`SELECT s.*,cat.name AS category_name,
  (SELECT avg(r.rating) FROM reviews r WHERE r.service_id=s.id) AS rating_avg,
  (SELECT count(*) FROM reviews r WHERE r.service_id=s.id) AS review_count,
  COALESCE((SELECT json_agg(json_build_object('id',r.id,'rating',r.rating,'comment',r.comment,'photos',r.photos,'branchReply',r.branch_reply,'createdAt',r.created_at) ORDER BY r.created_at DESC) FROM reviews r WHERE r.service_id=s.id),'[]'::json) AS reviews
  FROM services s JOIN service_categories cat ON cat.id=s.category_id`;
const technicianSelect = Prisma.sql`SELECT t.id,t.branch_id,t.full_name,t.title,t.avatar_url,t.experience_years,t.specialties,t.bio,t.is_active,t.created_at,t.updated_at,b.name AS branch_name,
  (SELECT avg(r.rating) FROM reviews r WHERE r.technician_id=t.id) AS rating_avg,
  (SELECT count(*) FROM reviews r WHERE r.technician_id=t.id) AS review_count,
  COALESCE((SELECT json_agg(json_build_object('id',r.id,'rating',r.rating,'comment',r.comment,'createdAt',r.created_at) ORDER BY r.created_at DESC) FROM reviews r WHERE r.technician_id=t.id),'[]'::json) AS reviews
  FROM technicians t JOIN branches b ON b.id=t.branch_id`;

async function booking(store: Store, id: string, customerId: string) {
  const [record] = await store.query(Prisma.sql`${bookingSelect} WHERE b.id = ${id}::uuid AND b.customer_id = ${customerId}::uuid`);
  if (!record) throw new ApiError(404, 'Booking not found');
  return record;
}

export function bookingTime(date: unknown, time: unknown, duration: number) {
  if (typeof date !== 'string' || typeof time !== 'string') throw new ApiError(400, 'Date and time are required');
  const parts = date.split('/');
  const day = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : date;
  const start = time.split(' - ')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}(:\d{2})?$/.test(start)) throw new ApiError(400, 'Invalid booking date/time');
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
  const instant = new Date(`${day}T${start.length === 5 ? `${start}:00` : start}+07:00`);
  if (!Number.isFinite(instant.getTime())) throw new ApiError(400, 'Invalid booking date/time');
  const localDate = new Date(instant.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  if (!Number.isFinite(instant.getTime()) || localDate !== day || startMinutes >= 1440 || Number(start.slice(3, 5)) >= 60 || duration <= 0 || !Number.isInteger(duration) || startMinutes + duration >= 1440) throw new ApiError(400, 'Invalid booking date/time');
  if (instant.getTime() <= Date.now()) throw new ApiError(400, 'Booking must be in the future');
  const endMinutes = startMinutes + duration;
  return { day, start: `${start.slice(0, 5)}:00`, end: `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00` };
}

async function reserveSlot(store: Store, customerId: string, branchId: string, technicianId: string | null, time: ReturnType<typeof bookingTime>, excludedId: string | null = null) {
  const [slot] = await store.query(Prisma.sql`
    SELECT ts.* FROM technician_slots ts JOIN technicians t ON t.id = ts.technician_id
    WHERE ts.branch_id = ${branchId}::uuid AND t.branch_id = ts.branch_id AND t.is_active
      AND (${technicianId}::uuid IS NULL OR ts.technician_id = ${technicianId}::uuid)
      AND ts.slot_date = ${time.day}::date AND ts.start_time = ${time.start}::time AND ts.end_time >= ${time.end}::time
      AND (ts.status = 'AVAILABLE' OR (ts.status = 'HOLD' AND (ts.held_by_user_id = ${customerId}::uuid OR ts.hold_expires_at < CURRENT_TIMESTAMP)))
    ORDER BY ts.technician_id FOR UPDATE OF ts SKIP LOCKED LIMIT 1`);
  if (!slot) throw new ApiError(409, 'No shared technician slot is available');
  // All Mini App changes for a technician are serialized, including overlapping slots.
  await store.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${String(slot.technician_id)}))::text AS locked`);
  const conflicts = await store.query(Prisma.sql`SELECT id FROM bookings
    WHERE technician_id = ${slot.technician_id}::uuid AND booking_date = ${time.day}::date
      AND status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE')
      AND start_time < ${time.end}::time AND end_time > ${time.start}::time
      AND (${excludedId}::uuid IS NULL OR id <> ${excludedId}::uuid)`);
  if (conflicts.length) throw new ApiError(409, 'Technician has an overlapping booking');
  await store.query(Prisma.sql`UPDATE technician_slots SET status = 'BOOKED', held_by_user_id = NULL, hold_expires_at = NULL WHERE id = ${slot.id}::uuid RETURNING id`);
  return String(slot.technician_id);
}

async function notify(store: Store, id: string, title: string, message: string, entityId: string) {
  await store.query(Prisma.sql`INSERT INTO notifications (user_id,title,message,type,data)
    VALUES (${id}::uuid,${title},${message},'BOOKING',${JSON.stringify({ entityId })}::jsonb) RETURNING id`);
}

async function voucherForOrder(store: Store, customerId: string, code: string, amount: Prisma.Decimal) {
  const [record] = await store.query(Prisma.sql`
    SELECT uv.id AS wallet_id, c.* FROM user_vouchers uv JOIN coupons c ON c.id = uv.coupon_id
    WHERE uv.user_id = ${customerId}::uuid AND UPPER(c.code) = ${code.trim().toUpperCase()}
      AND uv.status = 'AVAILABLE' AND uv.expires_at > CURRENT_TIMESTAMP AND c.is_active
      AND c.valid_from <= CURRENT_TIMESTAMP AND c.valid_to > CURRENT_TIMESTAMP
      AND c.used_count < c.usage_limit ORDER BY uv.expires_at FOR UPDATE OF uv, c LIMIT 1`);
  if (!record) throw new ApiError(400, 'Voucher is unavailable');
  if (amount.lt(record.min_order_amount)) throw new ApiError(400, 'Order does not meet voucher minimum');
  const percent = amount.mul(record.discount_percent).div(100);
  const discount = Prisma.Decimal.min(amount, percent.add(record.discount_amount), record.max_discount == null ? amount : record.max_discount).toDecimalPlaces(2);
  return { record, discount };
}

async function courseList(store: Store, courseId: string | null = null) {
  const courses = await store.query(Prisma.sql`SELECT c.*, cat.name AS category_name, i.full_name AS instructor_name,
    i.avatar_url AS instructor_avatar,CASE WHEN i.is_active THEN row_to_json(i) ELSE NULL END AS instructor,
    (SELECT count(*) FROM course_chapters ch WHERE ch.course_id=c.id) AS modules_count,
    (SELECT count(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status IN ('ENROLLED','STUDYING','GRADUATED')) AS students_count
    FROM courses c JOIN course_categories cat ON cat.id = c.category_id LEFT JOIN instructors i ON i.id = c.primary_instructor_id AND i.is_active
    WHERE c.is_active AND cat.is_active AND (${courseId}::uuid IS NULL OR c.id = ${courseId}::uuid) ORDER BY c.created_at`);
  for (const course of courses) {
    course.chapters = await store.query(Prisma.sql`SELECT id,title,description,chapter_order FROM course_chapters WHERE course_id=${course.id}::uuid ORDER BY chapter_order`);
    course.batches = await store.query(Prisma.sql`SELECT cb.*,br.name AS branch_name,i.full_name AS instructor_name
      FROM course_batches cb JOIN branches br ON br.id=cb.branch_id LEFT JOIN instructors i ON i.id=cb.instructor_id
      WHERE cb.course_id=${course.id}::uuid AND br.is_active AND cb.status='OPEN_FOR_ENROLLMENT' ORDER BY cb.start_date`);
    course.lessons = await store.query(Prisma.sql`SELECT l.id,l.chapter_id,l.title,l.lesson_type,l.duration_minutes,l.is_free_preview,
      l.learning_goals,CASE WHEN l.is_free_preview THEN l.content_text ELSE NULL END AS content_text,
      CASE WHEN l.is_free_preview THEN l.attachments ELSE '[]'::jsonb END AS attachments,
      CASE WHEN l.is_free_preview THEN l.video_url ELSE NULL END AS video_url
      FROM course_lessons l JOIN course_chapters ch ON ch.id = l.chapter_id
      WHERE ch.course_id = ${course.id}::uuid ORDER BY ch.chapter_order,l.lesson_order`);
    const [quiz] = await store.query(Prisma.sql`SELECT id,title,passing_score,total_questions,time_limit_minutes FROM course_quizzes WHERE course_id = ${course.id}::uuid ORDER BY created_at LIMIT 1`);
    course.quiz = quiz ? { ...quiz, questions: [] } : null;
  }
  return courses;
}

async function enrollments(store: Store, customerId: string) {
  return store.query(Prisma.sql`SELECT ce.*, c.title AS course_title, c.image_url AS course_image,
    u.full_name AS student_name,u.phone,u.email FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id JOIN users u ON u.id = ce.student_id
    WHERE ce.student_id = ${customerId}::uuid ORDER BY ce.enrolled_at DESC`);
}

export interface AppOptions extends RelayAuthOptions { jwtSecret: string; }

export function createApp(store: Store, options: AppOptions) {
  if (!options.jwtSecret) throw new Error('JWT_SECRET is required');
  const app = express();
  app.use((_req,res,next)=>{ res.set('Cache-Control','no-store'); next(); });
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  const route = (handler: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => { Promise.resolve(handler(req, res)).catch(next); };

  app.get('/api/health', route(async (_req, res) => {
    await store.query(Prisma.sql`SELECT 1 AS ready`);
    return success(res, { status: 'ok', schema: 'database/schema.sql', authFlow: 'zalo-phone-registration', contentContract: 'shared-admin-v1' });
  }));

  app.get('/api/app-metadata', route(async (_req,res) => {
    const serviceCategories = await store.query(Prisma.sql`SELECT * FROM service_categories WHERE is_active ORDER BY display_order,name`);
    const courseCategories = await store.query(Prisma.sql`SELECT * FROM course_categories WHERE is_active ORDER BY display_order,name`);
    const instructors = await store.query(Prisma.sql`SELECT id,full_name,title,avatar_url,experience_years,bio,achievements FROM instructors WHERE is_active ORDER BY full_name`);
    const membershipTiers = await store.query(Prisma.sql`SELECT tier,min_accumulated_spent,point_earning_rate,discount_service_percent,free_head_spa_sessions,priority_booking,description FROM membership_tier_rules ORDER BY min_accumulated_spent`);
    const [loyaltySettings] = await store.query(Prisma.sql`SELECT earn_amount_per_point,redeem_value_per_point,max_redeem_percent_per_order,point_expiry_months FROM loyalty_point_settings WHERE id=1 AND is_active`);
    const faqs = await store.query(Prisma.sql`SELECT id,category,question,answer,display_order FROM support_faqs WHERE is_active ORDER BY display_order`);
    return success(res,{serviceCategories,courseCategories,instructors,membershipTiers,loyaltySettings:loyaltySettings??null,faqs});
  }));
  app.get('/api/support-faqs', route(async (_req,res) => success(res,{faqs:await store.query(Prisma.sql`SELECT id,category,question,answer,display_order FROM support_faqs WHERE is_active ORDER BY display_order`)})));
  app.get('/api/care-guidelines',route(async(_req,res)=>success(res,{guidelines:await store.query(Prisma.sql`SELECT * FROM home_care_guidelines WHERE is_published ORDER BY is_featured DESC,created_at DESC`)})));

  app.post('/api/auth/zalo', route(async (req, res) => {
    const profile = await authenticateZalo(req.body?.accessToken, req.body?.phoneToken, options);
    const identity = await findZaloAccount(store, profile.phone);
    if (!identity) {
      if (!options.zaloAllowSignup) throw new ApiError(409, 'New customer signup is disabled; contact support');
      const registrationToken = jwt.sign({ purpose: 'zalo-registration', phone: profile.phone }, options.jwtSecret,
        { algorithm: 'HS256', expiresIn: '5m', audience: 'mld-zalo-registration', issuer: 'mld-miniapp-api' });
      return success(res, { registrationRequired: true, registrationToken, phone: profile.phone });
    }
    const record = await user(store, uuid(identity.userId));
    const token = jwt.sign({}, options.jwtSecret, { algorithm: 'HS256', subject: identity.userId, expiresIn: '8h' });
    return success(res, { token, user: record, isNewUser: identity.isNewUser });
  }));

  app.post('/api/auth/zalo/register', route(async (req, res) => {
    let proof: jwt.JwtPayload;
    try {
      proof = jwt.verify(req.body?.registrationToken ?? '', options.jwtSecret,
        { algorithms: ['HS256'], audience: 'mld-zalo-registration', issuer: 'mld-miniapp-api' }) as jwt.JwtPayload;
    } catch { throw new ApiError(401, 'Phone verification expired; allow Zalo phone sharing again'); }
    if (proof.purpose !== 'zalo-registration' || typeof proof.phone !== 'string' || !/^0[1-9]\d{8,9}$/.test(proof.phone)) {
      throw new ApiError(401, 'Invalid phone verification proof');
    }
    const input = req.body;
    const name = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim() : '';
    const dob = input.dateOfBirth || null;
    const gender = input.gender === '' || input.gender == null ? null : input.gender;
    const purpose = input.purpose ?? 'BEAUTY_SPA';
    const avatar = input.avatarUrl || null;
    if (!['BEAUTY_SPA','ACADEMY','BOTH'].includes(purpose)) throw new ApiError(400, 'Invalid purpose');
    if (avatar !== null) {
      if (typeof avatar !== 'string' || avatar.length > 750000) throw new ApiError(400, 'Invalid profile image');
      const localImage = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatar);
      let remoteImage = false;
      try {
        const url = new URL(avatar);
        remoteImage = url.protocol === 'https:' && !url.username && !url.password;
      } catch { /* Uploaded images use a bounded data URL instead. */ }
      if (!localImage && !remoteImage) throw new ApiError(400, 'Invalid profile image');
    }
    if (!name || name.length > 150 || /[\x00-\x1f\x7f]/.test(name)) throw new ApiError(400, 'Full name is required, up to 150 characters');
    if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new ApiError(400, 'Invalid email');
    if (gender !== null && !['MALE','FEMALE','OTHER'].includes(gender)) throw new ApiError(400, 'Invalid gender');
    if (dob && (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob)
      || !Number.isFinite(Date.parse(dob)) || new Date(dob).toISOString().slice(0,10) !== dob || Date.parse(dob) > Date.now())) {
      throw new ApiError(400, 'Invalid date of birth');
    }
    const identity = await resolveZaloAccount(store, { phone: proof.phone, name, avatar,
      email: email || null, dateOfBirth: dob, gender, purpose }, options);
    const record = await user(store, uuid(identity.userId));
    const token = jwt.sign({}, options.jwtSecret, { algorithm: 'HS256', subject: identity.userId, expiresIn: '8h' });
    return success(res, { token, user: record, isNewUser: identity.isNewUser });
  }));

  app.get('/api/services', route(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const services = await store.query(Prisma.sql`${serviceSelect}
      WHERE s.is_active AND cat.is_active AND (${search} = '' OR s.name ILIKE ${`%${search}%`} OR s.short_description ILIKE ${`%${search}%`})
      AND (${category} = '' OR cat.code = ${category} OR cat.name = ${category}) ORDER BY s.created_at`);
    return success(res, { services });
  }));
  app.get('/api/services/:id', route(async (req,res) => {
    const [service] = await store.query(Prisma.sql`${serviceSelect} WHERE s.id = ${uuid(req.params.id)}::uuid AND s.is_active AND cat.is_active`);
    if (!service) throw new ApiError(404,'Service not found');
    return success(res,{service});
  }));
  app.get('/api/doctors', route(async (_req,res) => success(res,{doctors:await store.query(Prisma.sql`${technicianSelect} WHERE t.is_active AND b.is_active ORDER BY t.full_name`)})));
  app.get('/api/doctors/:id', route(async (req,res) => {
    const [doctor] = await store.query(Prisma.sql`${technicianSelect} WHERE t.id = ${uuid(req.params.id)}::uuid AND t.is_active AND b.is_active`);
    if (!doctor) throw new ApiError(404,'Technician not found');
    return success(res,{doctor});
  }));
  app.get('/api/branches', route(async (_req,res) => success(res,{branches:await store.query(Prisma.sql`SELECT *,to_char(opening_time,'HH24:MI') AS opening_time,to_char(closing_time,'HH24:MI') AS closing_time FROM branches WHERE is_active ORDER BY name`)})));
  app.get('/api/slots',route(async(req,res)=>{
    const branchId = uuid(req.query.branchId), serviceId = uuid(req.query.serviceId);
    const technicianId = req.query.technicianId ? uuid(req.query.technicianId) : null;
    const day = String(req.query.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ApiError(400,'Slot date must be YYYY-MM-DD');
    let customerId: string | null = null;
    try { const payload = jwt.verify(req.headers.authorization?.replace(/^Bearer\s+/i,'') ?? '',options.jwtSecret,{algorithms:['HS256']}) as jwt.JwtPayload; customerId = uuid(payload.sub); }
    catch { /* Public users see available slots, but not another user's hold. */ }
    const slots = await store.query(Prisma.sql`SELECT ts.id,ts.technician_id,ts.branch_id,to_char(ts.slot_date,'YYYY-MM-DD') AS slot_date,
      to_char(ts.start_time,'HH24:MI:SS') AS start_time,to_char(ts.start_time + s.duration_minutes * INTERVAL '1 minute','HH24:MI:SS') AS end_time
      FROM technician_slots ts JOIN technicians t ON t.id = ts.technician_id JOIN services s ON s.id = ${serviceId}::uuid
      WHERE ts.branch_id = ${branchId}::uuid AND t.branch_id = ts.branch_id AND t.is_active AND s.is_active
        AND (${technicianId}::uuid IS NULL OR ts.technician_id = ${technicianId}::uuid)
        AND ts.slot_date = ${day}::date AND ts.end_time >= ts.start_time + s.duration_minutes * INTERVAL '1 minute'
        AND (ts.status = 'AVAILABLE' OR (ts.status = 'HOLD' AND (ts.held_by_user_id = ${customerId}::uuid OR ts.hold_expires_at < CURRENT_TIMESTAMP)))
        AND (ts.slot_date + ts.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' > CURRENT_TIMESTAMP
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.technician_id = ts.technician_id AND b.booking_date = ts.slot_date
          AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND b.start_time < ts.start_time + s.duration_minutes * INTERVAL '1 minute' AND b.end_time > ts.start_time)
      ORDER BY ts.start_time`);
    return success(res,{slots});
  }));
  app.get('/api/courses', route(async (_req,res) => success(res,{courses:await courseList(store)})));
  app.get('/api/courses/:id', route(async (req,res) => {
    const [course] = await courseList(store,uuid(req.params.id));
    if (!course) throw new ApiError(404,'Course not found');
    return success(res,{course});
  }));

  // Private routes use the shared UUID, signed by this Mini App backend.
  app.use('/api', (req,res,next) => { Promise.resolve().then(async () => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i,'');
    let payload: jwt.JwtPayload;
    try { payload = jwt.verify(token ?? '', options.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload; }
    catch { throw new ApiError(401,'Shared account authentication is required'); }
    res.locals.userId = uuid(payload.sub);
    res.locals.user = await user(store,res.locals.userId);
  }).then(()=>next()).catch(next); });

  app.get('/api/auth/me', route(async (_req,res) => success(res,{user:res.locals.user})));
  app.get('/api/auth/settings', route(async (_req,res) => {
    const [settings] = await store.query(Prisma.sql`SELECT * FROM user_settings WHERE user_id=${res.locals.userId}::uuid`);
    return success(res,{settings:settings??null});
  }));
  app.put('/api/auth/settings', route(async (req,res) => {
    const fields = ['biometricEnabled','appointmentReminder','promotionNotify','systemNotify'];
    if (fields.some(key=>req.body[key]!==undefined&&typeof req.body[key]!=='boolean')
      || (req.body.language!==undefined&&!['vi','en'].includes(req.body.language))) throw new ApiError(400,'Invalid app settings');
    const [settings] = await store.query(Prisma.sql`INSERT INTO user_settings(user_id,biometric_enabled,appointment_reminder,promotion_notify,system_notify,language)
      VALUES (${res.locals.userId}::uuid,COALESCE(${req.body.biometricEnabled??null}::boolean,false),COALESCE(${req.body.appointmentReminder??null}::boolean,true),COALESCE(${req.body.promotionNotify??null}::boolean,true),COALESCE(${req.body.systemNotify??null}::boolean,true),COALESCE(${req.body.language??null}::text,'vi'))
      ON CONFLICT(user_id) DO UPDATE SET
        biometric_enabled=COALESCE(${req.body.biometricEnabled??null}::boolean,user_settings.biometric_enabled),
        appointment_reminder=COALESCE(${req.body.appointmentReminder??null}::boolean,user_settings.appointment_reminder),
        promotion_notify=COALESCE(${req.body.promotionNotify??null}::boolean,user_settings.promotion_notify),
        system_notify=COALESCE(${req.body.systemNotify??null}::boolean,user_settings.system_notify),
        language=COALESCE(${req.body.language??null}::text,user_settings.language),updated_at=CURRENT_TIMESTAMP RETURNING *`);
    return success(res,{settings});
  }));
  app.put('/api/auth/profile', route(async (req,res) => {
    const input = req.body;
    const name = input.fullName ?? input.name ?? res.locals.user.full_name;
    const gender = input.gender === 'Nam' ? 'MALE' : input.gender === 'Nữ' ? 'FEMALE' : input.gender === 'Khác' ? 'OTHER' : input.gender !== undefined ? input.gender : res.locals.user.gender;
    if (typeof name !== 'string' || !name.trim() || name.trim().length>150 || /[\x00-\x1f\x7f]/.test(name) || (gender !== null && !['MALE','FEMALE','OTHER'].includes(gender))) throw new ApiError(400,'Invalid profile');
    if(input.email!==undefined&&(typeof input.email!=='string'||input.email.length>255||(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)))) throw new ApiError(400,'Invalid email');
    const dobValue = input.dateOfBirth !== undefined ? input.dateOfBirth : input.dob !== undefined ? input.dob : res.locals.user.date_of_birth;
    const dob = dobValue instanceof Date ? dobValue.toISOString().slice(0,10) : dobValue;
    if (dob && (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob.slice(0,10)) || !Number.isFinite(Date.parse(dob.slice(0,10))) || new Date(dob.slice(0,10)).toISOString().slice(0,10)!==dob.slice(0,10) || Date.parse(dob.slice(0,10))>Date.now())) throw new ApiError(400,'Birth date must be a valid past YYYY-MM-DD');
    // Phone changes need the shared verified identity flow, not an editable form.
    if (input.phone && input.phone !== res.locals.user.phone) throw new ApiError(400,'Change phone through the shared verified identity service');
    const avatar = input.avatarUrl ?? input.avatar ?? res.locals.user.avatar_url;
    if (avatar && (typeof avatar !== 'string' || avatar.length > 750000 || !/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(avatar))) throw new ApiError(400,'Invalid profile image');
    const purpose = input.purpose ?? res.locals.user.purpose;
    if (!['BEAUTY_SPA','ACADEMY','BOTH'].includes(purpose)) throw new ApiError(400,'Invalid purpose');
    const [updated] = await store.query(Prisma.sql`UPDATE users SET full_name = ${name.trim()},gender = ${gender},
      avatar_url = ${avatar},purpose = ${purpose}::purpose_interest,
      email = ${input.email ?? res.locals.user.email},address = ${input.address ?? res.locals.user.address},
      date_of_birth = ${dob ? String(dob).slice(0,10) : null}::date,
      emergency_contact_name = ${input.emergencyContactName ?? res.locals.user.emergency_contact_name},
      emergency_contact_phone = ${input.emergencyContactPhone ?? res.locals.user.emergency_contact_phone}
      WHERE id = ${res.locals.userId}::uuid RETURNING ${publicUser}`);
    return success(res,{user:updated});
  }));

  app.get('/api/bookings', route(async (_req,res) => success(res,{bookings:await store.query(Prisma.sql`${bookingSelect} WHERE b.customer_id = ${res.locals.userId}::uuid ORDER BY b.created_at DESC`)})));
  app.get('/api/bookings/:id', route(async (req,res) => success(res,{booking:await booking(store,uuid(req.params.id),res.locals.userId)})));
  app.post('/api/bookings', route(async (req,res) => {
    const ids = req.body.serviceIds ?? [req.body.serviceId];
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10 || new Set(ids).size !== ids.length) throw new ApiError(400,'Choose 1-10 unique services');
    ids.forEach(uuid);
    const branchId = uuid(req.body.branchId);
    const technicianId = req.body.technicianId || req.body.doctorId ? uuid(req.body.technicianId || req.body.doctorId) : null;
    const customerId = res.locals.userId;
    const recipientName=req.body.bookedForName??req.body.userName;
    const recipientPhone=req.body.bookedForPhone??req.body.userPhone;
    const notes=req.body.specialNotes??req.body.notes;
    if((recipientName!=null&&(typeof recipientName!=='string'||!recipientName.trim()||recipientName.length>150))
      ||(recipientPhone!=null&&(typeof recipientPhone!=='string'||! /^(?:0|\+?84)[1-9]\d{8,9}$/.test(recipientPhone)))
      ||(notes!=null&&(typeof notes!=='string'||notes.length>10000))) throw new ApiError(400,'Invalid booking recipient or notes');
    const result = await store.transaction(async tx => {
      const services = await tx.query(Prisma.sql`SELECT * FROM services WHERE id IN (${Prisma.join(ids.map(id=>Prisma.sql`${id}::uuid`))}) AND is_active FOR SHARE`);
      if (services.length !== ids.length) throw new ApiError(404,'A service is missing or inactive');
      const [branch] = await tx.query(Prisma.sql`SELECT * FROM branches WHERE id = ${branchId}::uuid AND is_active`);
      if (!branch) throw new ApiError(404,'Branch not found');
      const time = bookingTime(req.body.bookingDate ?? req.body.date,req.body.startTime ?? req.body.timeSlot,services.reduce((sum,s)=>sum+Number(s.duration_minutes),0));
      const assigned = await reserveSlot(tx,customerId,branchId,technicianId,time);
      const total = services.reduce<Prisma.Decimal>((sum,s)=>sum.add(s.discount_price ?? s.price),new Prisma.Decimal(0));
      const coupon = req.body.couponCode ?? req.body.voucherCode;
      const applied = coupon ? await voucherForOrder(tx,customerId,String(coupon),total) : null;
      if (req.body.pointsToUse) throw new ApiError(400,'Point redemption must use the shared payment workflow');
      const [saved] = await tx.query(Prisma.sql`INSERT INTO bookings
        (booking_code,customer_id,branch_id,technician_id,booking_date,start_time,end_time,status,base_total,coupon_id,discount_amount,final_price,
        booked_for_name,booked_for_phone,special_notes,qr_code_hash)
        VALUES (${`SPA-${randomUUID()}`.slice(0,30)},${customerId}::uuid,${branchId}::uuid,${assigned}::uuid,${time.day}::date,${time.start}::time,${time.end}::time,
        'CONFIRMED',${total},${applied?.record.id ?? null}::uuid,${applied?.discount ?? new Prisma.Decimal(0)},${total.sub(applied?.discount ?? 0)},
        ${req.body.bookedForName ?? req.body.userName ?? null},${req.body.bookedForPhone ?? req.body.userPhone ?? null},${req.body.specialNotes ?? req.body.notes ?? null},${randomUUID()}) RETURNING id`);
      for (const service of services) await tx.query(Prisma.sql`INSERT INTO booking_items (booking_id,service_id,technician_id,duration_minutes,price)
        VALUES (${saved.id}::uuid,${service.id}::uuid,${assigned}::uuid,${service.duration_minutes},${service.discount_price ?? service.price}) RETURNING id`);
      if (applied) {
        await tx.query(Prisma.sql`UPDATE user_vouchers SET status = 'USED',used_at = CURRENT_TIMESTAMP,used_in_booking_id = ${saved.id}::uuid WHERE id = ${applied.record.wallet_id}::uuid RETURNING id`);
        await tx.query(Prisma.sql`UPDATE coupons SET used_count = used_count + 1 WHERE id = ${applied.record.id}::uuid RETURNING id`);
      }
      await notify(tx,customerId,'Booking confirmed',`${time.day} ${time.start}`,saved.id);
      return booking(tx,saved.id,customerId);
    });
    return success(res,{booking:result},201);
  }));

  app.patch('/api/bookings/:id/reschedule', route(async (req,res) => {
    const id = uuid(req.params.id), customerId = res.locals.userId;
    const result = await store.transaction(async tx => {
      const [current] = await tx.query(Prisma.sql`SELECT *,to_char(booking_date,'YYYY-MM-DD') AS booking_date,to_char(start_time,'HH24:MI:SS') AS start_time,to_char(end_time,'HH24:MI:SS') AS end_time FROM bookings WHERE id = ${id}::uuid AND customer_id = ${customerId}::uuid FOR UPDATE`);
      if (!current) throw new ApiError(404,'Booking not found');
      if (!['PENDING','CONFIRMED'].includes(current.status)) throw new ApiError(409,'This booking cannot be rescheduled');
      const [duration] = await tx.query(Prisma.sql`SELECT sum(duration_minutes)::int AS minutes FROM booking_items WHERE booking_id = ${id}::uuid`);
      const time = bookingTime(req.body.bookingDate ?? req.body.date,req.body.startTime ?? req.body.timeSlot,Number(duration.minutes));
      if (time.day === current.booking_date && time.start === current.start_time) return booking(tx,id,customerId);
      await reserveSlot(tx,customerId,current.branch_id,current.technician_id,time,id);
      await tx.query(Prisma.sql`UPDATE technician_slots SET status = 'AVAILABLE' WHERE technician_id = ${current.technician_id}::uuid AND slot_date = ${current.booking_date}::date AND start_time = ${current.start_time}::time AND status = 'BOOKED' RETURNING id`);
      await tx.query(Prisma.sql`UPDATE bookings SET booking_date = ${time.day}::date,start_time = ${time.start}::time,end_time = ${time.end}::time WHERE id = ${id}::uuid RETURNING id`);
      await notify(tx,customerId,'Booking rescheduled',`${time.day} ${time.start}`,id);
      return booking(tx,id,customerId);
    });
    return success(res,{booking:result});
  }));
  app.patch('/api/bookings/:id/cancel', route(async (req,res) => {
    const id = uuid(req.params.id), customerId = res.locals.userId;
    const result = await store.transaction(async tx => {
      const [current] = await tx.query(Prisma.sql`SELECT *,to_char(booking_date,'YYYY-MM-DD') AS booking_date,to_char(start_time,'HH24:MI:SS') AS start_time FROM bookings WHERE id = ${id}::uuid AND customer_id = ${customerId}::uuid FOR UPDATE`);
      if (!current) throw new ApiError(404,'Booking not found');
      if (!['PENDING','CONFIRMED'].includes(current.status) || current.payment_status === 'PAID' || current.payment_status === 'PARTIAL') throw new ApiError(409,'Use the shared refund workflow for a paid or started booking');
      await tx.query(Prisma.sql`UPDATE bookings SET status = 'CANCELLED',cancellation_reason = ${req.body.reason ?? null},cancelled_by_id = ${customerId}::uuid WHERE id = ${id}::uuid RETURNING id`);
      await tx.query(Prisma.sql`UPDATE technician_slots SET status = 'AVAILABLE' WHERE technician_id = ${current.technician_id}::uuid AND slot_date = ${current.booking_date}::date AND start_time = ${current.start_time}::time AND status = 'BOOKED' RETURNING id`);
      const vouchers = await tx.query(Prisma.sql`UPDATE user_vouchers SET status = 'AVAILABLE',used_at = NULL,used_in_booking_id = NULL
        WHERE user_id = ${customerId}::uuid AND used_in_booking_id = ${id}::uuid AND used_in_invoice_id IS NULL RETURNING coupon_id`);
      for (const voucher of vouchers) await tx.query(Prisma.sql`UPDATE coupons SET used_count = GREATEST(0,used_count - 1) WHERE id = ${voucher.coupon_id}::uuid RETURNING id`);
      await notify(tx,customerId,'Booking cancelled',String(req.body.reason ?? ''),id);
      return booking(tx,id,customerId);
    });
    return success(res,{booking:result});
  }));

  app.get('/api/course-enrollments',route(async (_req,res)=>success(res,{enrollments:await enrollments(store,res.locals.userId)})));
  app.post('/api/course-enrollments',route(async (req,res)=>{
    const courseId = uuid(req.body.courseId), customerId = res.locals.userId;
    if (req.body.voucherCode || req.body.couponCode) throw new ApiError(400,'Course discounts must be applied by the shared tuition workflow');
    const saved = await store.transaction(async tx=>{
      await tx.query(Prisma.sql`SELECT id FROM users WHERE id = ${customerId}::uuid FOR UPDATE`);
      const existing = await tx.query(Prisma.sql`SELECT id FROM course_enrollments WHERE student_id = ${customerId}::uuid AND course_id = ${courseId}::uuid AND status <> 'DROPPED'`);
      if (existing.length) throw new ApiError(409,'Already registered for this course');
      const [course] = await tx.query(Prisma.sql`SELECT * FROM courses WHERE id = ${courseId}::uuid AND is_active`);
      if (!course) throw new ApiError(404,'Course not found');
      const [entry] = await tx.query(Prisma.sql`INSERT INTO course_enrollments (student_id,course_id,tuition_total,status)
        VALUES (${customerId}::uuid,${courseId}::uuid,${course.tuition_fee},'CONSULTING') RETURNING id`);
      return (await enrollments(tx,customerId)).find(item=>item.id === entry.id);
    });
    return success(res,{enrollment:saved},201);
  }));

  app.get('/api/courses/:id/learning',route(async (req,res)=>{
    const courseId = uuid(req.params.id), customerId = res.locals.userId;
    const [enrollment] = await store.query(Prisma.sql`SELECT id,batch_id FROM course_enrollments WHERE course_id = ${courseId}::uuid AND student_id = ${customerId}::uuid AND status IN ('ENROLLED','STUDYING','GRADUATED') ORDER BY enrolled_at DESC LIMIT 1`);
    if (!enrollment) throw new ApiError(403,'Enrollment is required to access course content');
    const [course] = await courseList(store,courseId);
    if (!course) throw new ApiError(404,'Course is unavailable');
    course.lessons = await store.query(Prisma.sql`SELECT l.*,COALESCE(p.is_completed,false) AS is_completed,p.watched_seconds,p.student_notes FROM course_lessons l JOIN course_chapters ch ON ch.id = l.chapter_id LEFT JOIN user_lesson_progress p ON p.lesson_id = l.id AND p.enrollment_id = ${enrollment.id}::uuid WHERE ch.course_id = ${courseId}::uuid ORDER BY ch.chapter_order,l.lesson_order`);
    if (course.quiz) course.quiz.questions = await store.query(Prisma.sql`SELECT id,question_number,question_text,options FROM quiz_questions WHERE quiz_id = ${course.quiz.id}::uuid ORDER BY question_number`);
    course.schedules = await store.query(Prisma.sql`SELECT bs.*,a.status AS attendance_status,br.name AS branch_name,r.name AS room_name,i.full_name AS instructor_name FROM batch_schedules bs
      LEFT JOIN student_attendance a ON a.schedule_id=bs.id AND a.enrollment_id=${enrollment.id}::uuid
      JOIN course_batches cb ON cb.id=bs.batch_id JOIN branches br ON br.id=cb.branch_id
      LEFT JOIN branch_rooms r ON r.id=bs.assigned_room_id LEFT JOIN instructors i ON i.id=cb.instructor_id
      WHERE bs.batch_id=${enrollment.batch_id}::uuid ORDER BY bs.session_date,bs.start_time`);
    [course.academicRecord] = await store.query(Prisma.sql`SELECT * FROM student_academic_records WHERE enrollment_id=${enrollment.id}::uuid`);
    [course.certificate] = await store.query(Prisma.sql`SELECT * FROM student_certificates WHERE student_id=${customerId}::uuid AND enrollment_id=${enrollment.id}::uuid AND status='ISSUED' ORDER BY issue_date DESC LIMIT 1`);
    course.quizSubmissions = await store.query(Prisma.sql`SELECT id,quiz_id,score,correct_count,passed,submitted_at FROM quiz_submissions WHERE enrollment_id=${enrollment.id}::uuid ORDER BY submitted_at DESC`);
    return success(res,{course});
  }));
  app.post('/api/courses/:id/lessons/:lessonId/progress',route(async(req,res)=>{
    const courseId=uuid(req.params.id),lessonId=uuid(req.params.lessonId),customerId=res.locals.userId;
    const watched=req.body.watchedSeconds??0,completed=req.body.isCompleted??false,notes=req.body.studentNotes;
    if (!Number.isInteger(watched)||watched<0||watched>604800||typeof completed!=='boolean'
      ||(notes!==undefined&&(typeof notes!=='string'||notes.length>10000))) throw new ApiError(400,'Invalid lesson progress');
    const progress=await store.transaction(async tx=>{
      const [enrollment]=await tx.query(Prisma.sql`SELECT id FROM course_enrollments WHERE student_id=${customerId}::uuid AND course_id=${courseId}::uuid AND status IN ('ENROLLED','STUDYING','GRADUATED') ORDER BY enrolled_at DESC LIMIT 1 FOR UPDATE`);
      if(!enrollment) throw new ApiError(403,'Enrollment is required');
      const [lesson]=await tx.query(Prisma.sql`SELECT l.id FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id WHERE l.id=${lessonId}::uuid AND ch.course_id=${courseId}::uuid`);
      if(!lesson) throw new ApiError(404,'Lesson not found in this course');
      const [saved]=await tx.query(Prisma.sql`INSERT INTO user_lesson_progress(enrollment_id,lesson_id,watched_seconds,is_completed,student_notes,completed_at)
        VALUES(${enrollment.id}::uuid,${lessonId}::uuid,${watched},${completed},${notes??null},CASE WHEN ${completed} THEN CURRENT_TIMESTAMP ELSE NULL END)
        ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET watched_seconds=GREATEST(user_lesson_progress.watched_seconds,EXCLUDED.watched_seconds),
          is_completed=user_lesson_progress.is_completed OR EXCLUDED.is_completed,
          student_notes=COALESCE(${notes??null}::text,user_lesson_progress.student_notes),
          completed_at=COALESCE(user_lesson_progress.completed_at,EXCLUDED.completed_at) RETURNING *`);
      const [counts]=await tx.query(Prisma.sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE p.is_completed)::int AS completed FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id LEFT JOIN user_lesson_progress p ON p.lesson_id=l.id AND p.enrollment_id=${enrollment.id}::uuid WHERE ch.course_id=${courseId}::uuid`);
      await tx.query(Prisma.sql`UPDATE course_enrollments SET completed_lessons_count=${counts.completed},progress_percent=${counts.total?Math.floor(counts.completed/counts.total*100):0} WHERE id=${enrollment.id}::uuid RETURNING id`);
      return saved;
    });
    return success(res,{progress});
  }));
  app.post('/api/courses/:id/quiz/submit',route(async(req,res)=>{
    const courseId = uuid(req.params.id), customerId = res.locals.userId;
    const [enrollment] = await store.query(Prisma.sql`SELECT id FROM course_enrollments WHERE course_id = ${courseId}::uuid AND student_id = ${customerId}::uuid AND status IN ('ENROLLED','STUDYING','GRADUATED') ORDER BY enrolled_at DESC LIMIT 1`);
    if (!enrollment) throw new ApiError(403,'Enrollment is required');
    const [quiz] = await store.query(Prisma.sql`SELECT * FROM course_quizzes WHERE course_id = ${courseId}::uuid ORDER BY created_at LIMIT 1`);
    if (!quiz) throw new ApiError(404,'Quiz not found');
    const questions = await store.query(Prisma.sql`SELECT * FROM quiz_questions WHERE quiz_id = ${quiz.id}::uuid ORDER BY question_number`);
    if (!questions.length) throw new ApiError(409,'Quiz has no questions');
    const answers = req.body.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new ApiError(400,'Answers must be keyed by question UUID');
    const correct = questions.filter(q=>{
      const answer = answers[q.id];
      const option = typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < 26 ? String.fromCharCode(65+answer) : answer;
      return option === q.correct_option;
    }).length;
    const score = new Prisma.Decimal(correct).div(questions.length).mul(10).toDecimalPlaces(2);
    const [submission] = await store.query(Prisma.sql`INSERT INTO quiz_submissions (enrollment_id,quiz_id,score,correct_count,submitted_answers,passed)
      VALUES (${enrollment.id}::uuid,${quiz.id}::uuid,${score},${correct},${JSON.stringify(answers)}::jsonb,${score.gte(quiz.passing_score)}) RETURNING *`);
    return success(res,{submission,score:score.mul(10),correctCount:correct,totalQuestions:questions.length,isPassed:submission.passed,certificateCode:null});
  }));

  app.get('/api/records',route(async(_req,res)=>success(res,{records:await store.query(Prisma.sql`${journalSelect} WHERE j.customer_id = ${res.locals.userId}::uuid ORDER BY j.session_date DESC`)})));
  app.get('/api/records/:id',route(async(req,res)=>{
    const [record] = await store.query(Prisma.sql`${journalSelect} WHERE j.id = ${uuid(req.params.id)}::uuid AND j.customer_id = ${res.locals.userId}::uuid`);
    if (!record) throw new ApiError(404,'Record not found');
    return success(res,{record});
  }));
  app.get('/api/support-tickets',route(async(_req,res)=>success(res,{tickets:await store.query(Prisma.sql`SELECT * FROM support_tickets WHERE customer_id = ${res.locals.userId}::uuid ORDER BY created_at DESC`)})));
  app.get('/api/consultation-surveys',route(async(_req,res)=>success(res,{surveys:await store.query(Prisma.sql`SELECT * FROM consultation_surveys WHERE customer_id=${res.locals.userId}::uuid ORDER BY created_at DESC`)})));
  app.get('/api/reviews/mine',route(async(_req,res)=>success(res,{reviews:await store.query(Prisma.sql`SELECT id,booking_id,service_id,rating,review_tags,comment,photos,branch_reply,created_at FROM reviews WHERE customer_id=${res.locals.userId}::uuid ORDER BY created_at DESC`)})));
  app.post('/api/support-tickets',route(async(req,res)=>{
    const subject = String(req.body.subject ?? '').trim(),message = String(req.body.message ?? '').trim();
    if (!subject || subject.length>200 || !message || message.length>10000) throw new ApiError(400,'A subject and message are required');
    const [ticket] = await store.query(Prisma.sql`INSERT INTO support_tickets(customer_id,subject,message) VALUES (${res.locals.userId}::uuid,${subject},${message}) RETURNING *`);
    return success(res,{ticket},201);
  }));
  app.post('/api/consultation-surveys',route(async(req,res)=>{
    const id = req.body.bookingId ? uuid(req.body.bookingId) : null,customerId = res.locals.userId;
    if (id) await booking(store,id,customerId);
    const pressure = req.body.pressurePref ?? 'MEDIUM';
    if (!['LIGHT','MEDIUM','STRONG'].includes(pressure)) throw new ApiError(400,'Invalid pressure preference');
    const areas = req.body.focusAreas ?? [],conditions = req.body.medicalConditions ?? [];
    if (![areas,conditions].every(values=>Array.isArray(values)&&values.length<=30&&values.every(value=>typeof value==='string'&&value.length<=200))) throw new ApiError(400,'Invalid consultation details');
    const [survey] = await store.query(Prisma.sql`INSERT INTO consultation_surveys(customer_id,booking_id,focus_areas,pressure_pref,has_sensitive_skin,has_oil_allergy,allergy_details,medical_conditions,special_requests)
      VALUES (${customerId}::uuid,${id}::uuid,${areas}::text[],${pressure},${req.body.hasSensitiveSkin===true},${req.body.hasOilAllergy===true},${req.body.allergyDetails??null},${conditions}::text[],${req.body.specialRequests??null}) RETURNING *`);
    return success(res,{survey},201);
  }));
  app.post('/api/reviews',route(async(req,res)=>{
    const id = uuid(req.body.bookingId),serviceId = uuid(req.body.serviceId),customerId = res.locals.userId;
    if (!Number.isInteger(req.body.rating)||req.body.rating<1||req.body.rating>5) throw new ApiError(400,'Rating must be 1-5');
    const [owned] = await store.query(Prisma.sql`SELECT b.technician_id FROM bookings b JOIN booking_items bi ON bi.booking_id=b.id WHERE b.id=${id}::uuid AND b.customer_id=${customerId}::uuid AND b.status='COMPLETED' AND bi.service_id=${serviceId}::uuid`);
    if (!owned) throw new ApiError(403,'Only a completed service from your own booking can be reviewed');
    const [existing] = await store.query(Prisma.sql`SELECT id FROM reviews WHERE booking_id=${id}::uuid`);
    if (existing) throw new ApiError(409,'This booking has already been reviewed');
    if(req.body.comment!==undefined&&(typeof req.body.comment!=='string'||req.body.comment.length>10000)) throw new ApiError(400,'Invalid review comment');
    for (const values of [req.body.reviewTags??[],req.body.photos??[]]) {
      if (!Array.isArray(values)||values.length>30||values.some(value=>typeof value!=='string'||value.length>2000)) throw new ApiError(400,'Invalid review details');
    }
    const [review] = await store.query(Prisma.sql`INSERT INTO reviews(customer_id,booking_id,service_id,technician_id,rating,comment,review_tags,photos)
      VALUES (${customerId}::uuid,${id}::uuid,${serviceId}::uuid,${owned.technician_id}::uuid,${req.body.rating},${req.body.comment??null},${JSON.stringify(req.body.reviewTags??[])}::jsonb,${JSON.stringify(req.body.photos??[])}::jsonb) RETURNING *`);
    return success(res,{review},201);
  }));
  app.get('/api/treatment-plans',route(async(_req,res)=>{
    const plans = await store.query(Prisma.sql`SELECT up.*,row_to_json(tp) AS package,s.name AS service_name,s.image_url AS service_image,s.id AS service_id FROM user_packages up JOIN treatment_packages tp ON tp.id = up.package_id LEFT JOIN services s ON s.id=tp.service_id WHERE up.customer_id = ${res.locals.userId}::uuid ORDER BY up.purchased_at DESC`);
    for (const plan of plans) plan.sessions = await store.query(Prisma.sql`${journalSelect} WHERE j.user_package_id = ${plan.id}::uuid AND j.customer_id = ${res.locals.userId}::uuid ORDER BY j.session_number`);
    return success(res,{treatmentPlans:plans});
  }));
  app.get('/api/membership',route(async(_req,res)=>{
    const id = res.locals.userId;
    const vouchers = await store.query(Prisma.sql`SELECT uv.*,row_to_json(c) AS coupon FROM user_vouchers uv JOIN coupons c ON c.id = uv.coupon_id WHERE uv.user_id = ${id}::uuid ORDER BY uv.claimed_at DESC`);
    const [summary] = await store.query(Prisma.sql`SELECT
      (SELECT count(*) FROM bookings WHERE customer_id = ${id}::uuid AND status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND booking_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS upcoming_bookings,
      (SELECT COALESCE(sum(total_sessions-completed_sessions),0) FROM user_packages WHERE customer_id = ${id}::uuid AND status = 'ACTIVE' AND expires_at > CURRENT_TIMESTAMP) AS remaining_treatment_sessions,
      (SELECT count(*) FROM course_enrollments WHERE student_id = ${id}::uuid AND status IN ('ENROLLED','STUDYING')) AS active_courses`);
    const membershipTiers=await store.query(Prisma.sql`SELECT * FROM membership_tier_rules ORDER BY min_accumulated_spent`);
    const [loyaltySettings]=await store.query(Prisma.sql`SELECT * FROM loyalty_point_settings WHERE id=1 AND is_active`);
    const referrals=await store.query(Prisma.sql`SELECT id,reward_points,is_rewarded,rewarded_at,created_at FROM referrals WHERE referrer_id=${id}::uuid ORDER BY created_at DESC`);
    return success(res,{user:res.locals.user,vouchers,summary,membershipTiers,loyaltySettings:loyaltySettings??null,referrals});
  }));
  app.get('/api/transactions',route(async(_req,res)=>{
    const invoices = await store.query(Prisma.sql`SELECT inv.*,b.name AS branch_name,b.address AS branch_address,b.phone AS branch_phone,
      json_build_object('id',cu.id,'full_name',cu.full_name,'phone',cu.phone) AS customer,
      COALESCE((SELECT json_agg(ii ORDER BY ii.id) FROM invoice_items ii WHERE ii.invoice_id=inv.id),'[]'::json) AS items
      FROM invoices inv JOIN branches b ON b.id=inv.branch_id JOIN users cu ON cu.id=inv.customer_id WHERE inv.customer_id = ${res.locals.userId}::uuid ORDER BY inv.paid_at DESC`);
    const points = await store.query(Prisma.sql`SELECT * FROM point_transactions WHERE user_id = ${res.locals.userId}::uuid ORDER BY created_at DESC`);
    return success(res,{invoices,pointTransactions:points,totalSpent:res.locals.user.total_spent});
  }));
  app.get('/api/notifications',route(async(_req,res)=>success(res,{notifications:await store.query(Prisma.sql`SELECT * FROM notifications WHERE user_id = ${res.locals.userId}::uuid ORDER BY created_at DESC LIMIT 50`)})));
  app.patch('/api/notifications/read-all',route(async(_req,res)=>{
    await store.query(Prisma.sql`UPDATE notifications SET is_read = true WHERE user_id = ${res.locals.userId}::uuid RETURNING id`);
    return success(res,{updated:true});
  }));
  app.patch('/api/notifications/:id/read',route(async(req,res)=>{
    const [notification] = await store.query(Prisma.sql`UPDATE notifications SET is_read = true WHERE id = ${uuid(req.params.id)}::uuid AND user_id = ${res.locals.userId}::uuid RETURNING *`);
    if (!notification) throw new ApiError(404,'Notification not found');
    return success(res,{notification});
  }));

  app.post('/api/vouchers/claim',route(async(req,res)=>{
    const customerId = res.locals.userId, code = String(req.body.code ?? '').trim().toUpperCase();
    const result = await store.transaction(async tx=>{
      const [owner] = await tx.query(Prisma.sql`SELECT membership_tier FROM users WHERE id = ${customerId}::uuid FOR UPDATE`);
      const [coupon] = await tx.query(Prisma.sql`SELECT * FROM coupons WHERE UPPER(code) = ${code} AND is_active AND valid_from <= CURRENT_TIMESTAMP AND valid_to > CURRENT_TIMESTAMP AND used_count < usage_limit FOR UPDATE`);
      if (!coupon) throw new ApiError(400,'Voucher is unavailable');
      const [rule] = await tx.query(Prisma.sql`SELECT * FROM voucher_distribution_rules WHERE coupon_id = ${coupon.id}::uuid AND trigger_event = 'PUBLIC_CLAIM' AND is_active AND (target_tier IS NULL OR target_tier = ${owner.membership_tier}::member_tier) ORDER BY created_at LIMIT 1`);
      if (!rule) throw new ApiError(403,'Voucher is not available for public claim by this membership tier');
      const existing = await tx.query(Prisma.sql`SELECT id FROM user_vouchers WHERE user_id = ${customerId}::uuid AND coupon_id = ${coupon.id}::uuid`);
      if (existing.length) throw new ApiError(409,'Voucher already claimed');
      const [wallet] = await tx.query(Prisma.sql`INSERT INTO user_vouchers(user_id,coupon_id,expires_at,source_trigger)
        VALUES (${customerId}::uuid,${coupon.id}::uuid,LEAST(${coupon.valid_to}::timestamptz,CURRENT_TIMESTAMP + ${rule.valid_days_after_claim} * INTERVAL '1 day'),'PUBLIC_CLAIM') RETURNING *`);
      return {...wallet,coupon};
    });
    return success(res,{voucher:result},201);
  }));
  app.post('/api/vouchers/apply',route(async(req,res)=>{
    if (req.body.scope !== 'service') throw new ApiError(400,'Course discounts use the shared tuition workflow');
    // Preview only. The final discount is recalculated from database prices on booking.
    const amount = new Prisma.Decimal(req.body.orderValue ?? 0);
    if (!amount.isFinite() || amount.lt(0)) throw new ApiError(400,'Invalid order amount');
    const result = await store.transaction(tx=>voucherForOrder(tx,res.locals.userId,String(req.body.code ?? ''),amount));
    return success(res,{valid:true,code:result.record.code,discountAmount:result.discount,finalAmount:amount.sub(result.discount),message:'Voucher preview; final price is calculated by the server'});
  }));

  app.use((_req,res)=>res.status(404).json({success:false,statusCode:404,message:'Endpoint not available',error:'Endpoint not available'}));
  app.use((error: unknown,_req:Request,res:Response,_next:NextFunction)=>{
    const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (['P2034','P2002'].includes(error.code) || ['23505','40001','40P01'].includes(String(error.meta?.code)));
    const status = error instanceof ApiError ? error.status : retryable ? 409 : error instanceof SyntaxError ? 400 : 500;
    const message = error instanceof ApiError ? error.message : status === 409 ? 'Data changed concurrently; retry the request' : 'Shared database operation failed';
    if (status === 500) console.error('[Mini App database]',error instanceof Error ? error.name : 'Error');
    res.status(status).json({success:false,statusCode:status,message,error:message});
  });
  return app;
}
