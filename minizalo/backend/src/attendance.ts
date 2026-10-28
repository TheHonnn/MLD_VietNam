import jwt from 'jsonwebtoken';
import {createHmac} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {ownedEnrollment} from './learning.js';

const key=(secret:string)=>createHmac('sha256',secret).update('miniapp-class-attendance-v1').digest('hex');
const windowSql=Prisma.sql`((bs.session_date+bs.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')-interval '30 minutes'<=clock_timestamp()
  AND clock_timestamp()<=((bs.session_date+bs.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')`;

export async function staffClassSchedules(store:Store,actorId:string){
  const scope=await staffScope(store,actorId);
  return store.query(Prisma.sql`SELECT bs.id,bs.session_date,bs.start_time,bs.end_time,bs.topic,cb.batch_code,c.title AS course_title,br.name AS branch_name,
    (${windowSql}) AS attendance_open
    FROM batch_schedules bs JOIN course_batches cb ON cb.id=bs.batch_id JOIN courses c ON c.id=cb.course_id JOIN course_categories cat ON cat.id=c.category_id JOIN branches br ON br.id=cb.branch_id
    WHERE br.is_active AND c.is_active AND cat.is_active AND cb.status NOT IN ('CANCELLED','COMPLETED') AND (${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid)
    AND bs.session_date BETWEEN (clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND (clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+7
    ORDER BY bs.session_date,bs.start_time,bs.id LIMIT 100`);
}

export async function attendanceCode(store:Store,actorId:string,scheduleId:string,secret:string){
  const scope=await staffScope(store,actorId);
  const [schedule]=await store.query(Prisma.sql`SELECT bs.id,(${windowSql}) AS attendance_open FROM batch_schedules bs
    JOIN course_batches cb ON cb.id=bs.batch_id JOIN courses c ON c.id=cb.course_id JOIN course_categories cat ON cat.id=c.category_id JOIN branches br ON br.id=cb.branch_id
    WHERE bs.id=${scheduleId}::uuid AND br.is_active AND c.is_active AND cat.is_active AND cb.status NOT IN ('CANCELLED','COMPLETED') AND (${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid)`);
  if(!schedule)throw new ApiError(404,'Attendance session is unavailable');
  if(!schedule.attendance_open)throw new ApiError(409,'Attendance is outside the session window');
  const token=jwt.sign({scheduleId,actorId},key(secret),{algorithm:'HS256',audience:'miniapp-attendance',issuer:'mld-miniapp',expiresIn:120});
  return {content:'MLD-ATTENDANCE:'+token,expiresAt:new Date((jwt.decode(token) as jwt.JwtPayload).exp!*1000).toISOString()};
}

export async function recordAttendance(store:Store,userId:string,courseId:string,enrollmentId:string,content:unknown,secret:string){
  if(typeof content!=='string'||content.length>3000||!content.startsWith('MLD-ATTENDANCE:'))throw new ApiError(400,'Invalid attendance QR code');
  let proof:jwt.JwtPayload;
  try{proof=jwt.verify(content.slice(15),key(secret),{algorithms:['HS256'],audience:'miniapp-attendance',issuer:'mld-miniapp',maxAge:'2m'}) as jwt.JwtPayload;}
  catch{throw new ApiError(400,'Attendance QR code has expired or is invalid');}
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  if(!uuid.test(proof.scheduleId)||!uuid.test(proof.actorId))throw new ApiError(400,'Invalid attendance QR code');
  return store.transaction(async tx=>{
    const enrollment=await ownedEnrollment(tx,userId,courseId,enrollmentId,true);
    const scope=await staffScope(tx,proof.actorId);
    const [schedule]=await tx.query(Prisma.sql`SELECT bs.id,(${windowSql}) AS attendance_open,
      clock_timestamp()>((bs.session_date+bs.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS is_late
      FROM batch_schedules bs JOIN course_batches cb ON cb.id=bs.batch_id JOIN branches br ON br.id=cb.branch_id
      WHERE bs.id=${proof.scheduleId}::uuid AND bs.batch_id=${enrollment.batch_id}::uuid AND br.is_active AND cb.status NOT IN ('CANCELLED','COMPLETED')
      AND (${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid) FOR SHARE OF bs,cb,br`);
    if(!schedule)throw new ApiError(403,'Attendance QR does not match your class');
    if(!schedule.attendance_open)throw new ApiError(409,'Attendance is outside the session window');
    const [existing]=await tx.query(Prisma.sql`SELECT * FROM student_attendance WHERE schedule_id=${schedule.id}::uuid AND enrollment_id=${enrollment.id}::uuid FOR UPDATE`);
    // Keep the teacher's manual decision; repeated scans are idempotent.
    if(existing){if(!['PRESENT','LATE'].includes(existing.status))throw new ApiError(409,'Attendance was already marked by staff');return existing;}
    const [saved]=await tx.query(Prisma.sql`INSERT INTO student_attendance(schedule_id,enrollment_id,status,check_in_time,marked_by_id)
      VALUES(${schedule.id}::uuid,${enrollment.id}::uuid,${schedule.is_late?'LATE':'PRESENT'}::attendance_status,clock_timestamp(),${proof.actorId}::uuid) RETURNING *`);
    return saved;
  });
}
