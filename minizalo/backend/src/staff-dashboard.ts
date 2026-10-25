import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';
import {localPhone,phoneIdentity} from './phone-identity.js';

export async function staffDashboard(store:Store,actorId:string){
  const scope=await staffScope(store,actorId);
  const [profile]=await store.query(Prisma.sql`SELECT p.employee_code,p.position,p.department,p.branch_id,b.name AS branch_name
    FROM staff_profiles p JOIN branches b ON b.id=p.branch_id WHERE p.user_id=${actorId}::uuid
      AND p.is_active AND p.resignation_date IS NULL AND b.is_active`);
  const branch=Prisma.sql`(${scope.branchId}::uuid IS NULL OR b.branch_id=${scope.branchId}::uuid)`;
  const [summary]=await store.query(Prisma.sql`SELECT
    (SELECT count(*)::int FROM bookings b WHERE ${branch} AND b.booking_date=(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND b.status NOT IN ('CANCELLED','NO_SHOW')) AS today_bookings,
    (SELECT count(*)::int FROM bookings b WHERE ${branch} AND b.status='PENDING' AND b.booking_date>=(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS pending_bookings,
    (SELECT count(*)::int FROM bookings b WHERE ${branch} AND b.status IN ('CHECKED_IN','IN_SERVICE')) AS in_service_bookings,
    (SELECT count(*)::int FROM bookings b WHERE ${branch} AND b.status IN ('PENDING','CONFIRMED') AND (b.booking_date+b.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp()) AS upcoming_bookings,
    (SELECT count(*)::int FROM users u WHERE u.is_active AND u.role IN ('CUSTOMER','STUDENT') AND
      (${scope.branchId}::uuid IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND ${branch}))) AS customers,
    (SELECT count(*)::int FROM user_packages up JOIN users u ON u.id=up.customer_id
      WHERE u.is_active AND u.role IN ('CUSTOMER','STUDENT') AND up.status='ACTIVE' AND up.expires_at>clock_timestamp()
      AND (${scope.branchId}::uuid IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND ${branch}))) AS active_packages`);
  return {profile:profile??null,summary,scope};
}

export async function staffCustomerDirectory(store:Store,actorId:string,input:Record<string,unknown>){
  const scope=await staffScope(store,actorId);
  if(input.search!==undefined&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid customer search');
  const search=String(input.search??'').trim(),phone=localPhone(search);
  const pattern='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
  const page=await collectionPage(store,Prisma.sql`SELECT u.id,u.full_name,u.phone,u.created_at FROM users u
    WHERE u.is_active AND u.role IN ('CUSTOMER','STUDENT')
      AND (${scope.branchId}::uuid IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND b.branch_id=${scope.branchId}::uuid))
      AND (${search}='' OR u.full_name ILIKE ${pattern} OR ${phone?phoneIdentity(Prisma.sql`u.phone`,phone):Prisma.sql`u.phone ILIKE ${pattern}`})`,input);
  return {customers:page.rows,nextCursor:page.nextCursor};
}
