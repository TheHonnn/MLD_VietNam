import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';

const uuid=(value:unknown)=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value))throw new ApiError(400,'Configuration requires real UUIDs');return value;};
export async function configureWorkflows(store:Store,input:unknown,apply=false){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'Configuration must be an object');
  const config=input as Record<string,unknown>;
  if(Object.keys(config).some(key=>!['technicianServices','lessonQuizzes','quizLimits','courseDelivery','membershipCards'].includes(key)))throw new ApiError(400,'Unknown configuration section');
  const counts={technicianServices:0,lessonQuizzes:0,quizLimits:0,courseDelivery:0,membershipCards:0};
  for(const section of Object.keys(counts) as (keyof typeof counts)[]){
    const rows=config[section]??[];
    if(!Array.isArray(rows)||rows.length>1000)throw new ApiError(400,'Invalid configuration list');
    for(const row of rows){
      if(!row||typeof row!=='object'||Array.isArray(row))throw new ApiError(400,'Invalid configuration entry');
      if(section==='technicianServices'){
        const technicianId=uuid(row.technicianId),serviceId=uuid(row.serviceId),active=row.isActive??true;
        if(typeof active!=='boolean')throw new ApiError(400,'isActive must be boolean');
        const [valid]=await store.query(Prisma.sql`SELECT t.id FROM technicians t JOIN branches b ON b.id=t.branch_id CROSS JOIN services s WHERE t.id=${technicianId}::uuid AND s.id=${serviceId}::uuid AND (NOT ${active} OR (t.is_active AND b.is_active AND s.is_active))`);
        if(!valid)throw new ApiError(400,'Technician or service is missing/inactive');
        if(apply)await store.query(Prisma.sql`INSERT INTO miniapp_technician_services(technician_id,service_id,is_active) VALUES(${technicianId}::uuid,${serviceId}::uuid,${active}) ON CONFLICT(technician_id,service_id) DO UPDATE SET is_active=EXCLUDED.is_active RETURNING technician_id`);
      }else if(section==='lessonQuizzes'){
        const lessonId=uuid(row.lessonId),quizId=uuid(row.quizId);
        const [valid]=await store.query(Prisma.sql`SELECT l.id FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id JOIN course_quizzes q ON q.course_id=ch.course_id WHERE l.id=${lessonId}::uuid AND q.id=${quizId}::uuid AND l.lesson_type='QUIZ'`);
        if(!valid)throw new ApiError(400,'Lesson and quiz must belong to the same course');
        if(apply)await store.query(Prisma.sql`INSERT INTO miniapp_lesson_quizzes(lesson_id,quiz_id) VALUES(${lessonId}::uuid,${quizId}::uuid) ON CONFLICT(lesson_id) DO UPDATE SET quiz_id=EXCLUDED.quiz_id RETURNING lesson_id`);
      }else if(section==='courseDelivery'){
        const courseId=uuid(row.courseId),format=row.deliveryFormat;
        if(!['ONLINE','ONSITE','HYBRID'].includes(format))throw new ApiError(400,'Invalid course delivery format');
        const [valid]=await store.query(Prisma.sql`SELECT id FROM courses WHERE id=${courseId}::uuid`);
        if(!valid)throw new ApiError(400,'Course does not exist');
        if(apply)await store.query(Prisma.sql`INSERT INTO miniapp_course_delivery(course_id,delivery_format) VALUES(${courseId}::uuid,${format}) ON CONFLICT(course_id) DO UPDATE SET delivery_format=EXCLUDED.delivery_format,updated_at=clock_timestamp() RETURNING course_id`);
      }else if(section==='membershipCards'){
        const userId=uuid(row.userId),code=row.cardCode,expires=row.expiresAt??null,active=row.isActive??true;
        if(typeof code!=='string'||!code.trim()||code.length>100||/[\x00-\x1f\x7f]/.test(code)||typeof active!=='boolean'||(expires!==null&&(typeof expires!=='string'||!Number.isFinite(Date.parse(expires))||new Date(expires).toISOString()!==expires)))throw new ApiError(400,'Invalid membership card configuration');
        const [valid]=await store.query(Prisma.sql`SELECT id FROM users WHERE id=${userId}::uuid`);
        if(!valid)throw new ApiError(400,'Customer does not exist');
        const [assigned]=await store.query(Prisma.sql`SELECT user_id FROM miniapp_membership_cards WHERE card_code=${code.trim()} AND user_id<>${userId}::uuid`);
        if(assigned)throw new ApiError(400,'Card is already assigned to another customer');
        if(apply)await store.query(Prisma.sql`INSERT INTO miniapp_membership_cards(user_id,card_code,expires_at,is_active) VALUES(${userId}::uuid,${code.trim()},${expires}::timestamptz,${active}) ON CONFLICT(user_id) DO UPDATE SET card_code=EXCLUDED.card_code,expires_at=EXCLUDED.expires_at,is_active=EXCLUDED.is_active,updated_at=clock_timestamp() RETURNING user_id`);
      }else{
        const enrollmentId=uuid(row.enrollmentId),quizId=uuid(row.quizId),max=row.maxAttempts,reason=row.reason;
        if(!Number.isInteger(max)||max<1||max>50||typeof reason!=='string'||!reason.trim()||reason.length>1000)throw new ApiError(400,'Attempt limit requires 1-50 attempts and an audit reason');
        const [valid]=await store.query(Prisma.sql`SELECT e.id FROM course_enrollments e JOIN course_quizzes q ON q.course_id=e.course_id WHERE e.id=${enrollmentId}::uuid AND q.id=${quizId}::uuid`);
        if(!valid)throw new ApiError(400,'Enrollment and quiz must belong to the same course');
        if(apply)await store.query(Prisma.sql`INSERT INTO miniapp_quiz_limits(enrollment_id,quiz_id,max_attempts,reason) VALUES(${enrollmentId}::uuid,${quizId}::uuid,${max},${reason.trim()}) ON CONFLICT(enrollment_id,quiz_id) DO UPDATE SET max_attempts=EXCLUDED.max_attempts,reason=EXCLUDED.reason,updated_at=clock_timestamp() RETURNING enrollment_id`);
      }
      counts[section]++;
    }
  }
  return {applied:apply,counts};
}
