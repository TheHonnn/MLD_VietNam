import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';

export async function staffRecords(store:Store,actorId:string,customerId:string,input:Record<string,unknown>){
  const scope=await staffScope(store,actorId),section=input.section??'appointments';
  if(typeof section!=='string'||!['appointments','treatments','packages'].includes(section))throw new ApiError(400,'Invalid customer record section');
  // Knowing an exact customer name/phone permits booking, not cross-branch clinical access.
  const [customer]=await store.query(Prisma.sql`SELECT u.id,u.full_name,u.phone,u.date_of_birth FROM users u
    WHERE u.id=${customerId}::uuid AND u.is_active AND u.role IN ('CUSTOMER','STUDENT')
      AND (${scope.branchId}::uuid IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND b.branch_id=${scope.branchId}::uuid))`);
  if(!customer)throw new ApiError(404,'Customer records are unavailable');
  const branch=Prisma.sql`(${scope.branchId}::uuid IS NULL OR b.branch_id=${scope.branchId}::uuid)`;
  const query=section==='appointments'?Prisma.sql`SELECT b.id,b.created_at,b.booking_code,to_char(b.booking_date,'YYYY-MM-DD') AS date,
      to_char(b.start_time,'HH24:MI') AS start_time,to_char(b.end_time,'HH24:MI') AS end_time,b.status,br.name AS branch_name,b.booked_for_name AS recipient_name,
      (SELECT string_agg(s.name,', ' ORDER BY bi.id) FROM booking_items bi JOIN services s ON s.id=bi.service_id WHERE bi.booking_id=b.id) AS title
    FROM bookings b JOIN branches br ON br.id=b.branch_id WHERE b.customer_id=${customerId}::uuid AND ${branch}`:
    section==='treatments'?Prisma.sql`SELECT j.id,j.booking_id,j.created_at,to_char(j.session_date,'YYYY-MM-DD') AS date,j.session_number,
      (SELECT string_agg(s.name,', ' ORDER BY bi.id) FROM booking_items bi JOIN services s ON s.id=bi.service_id WHERE bi.booking_id=b.id) AS title,
      j.treatment_notes,j.condition_before,j.condition_after,j.specialist_advice,br.name AS branch_name,t.full_name AS technician_name,b.booked_for_name AS recipient_name
    FROM treatment_journal j JOIN bookings b ON b.id=j.booking_id AND b.customer_id=j.customer_id
      JOIN branches br ON br.id=b.branch_id LEFT JOIN technicians t ON t.id=j.technician_id
    WHERE j.customer_id=${customerId}::uuid AND ${branch}`:
    Prisma.sql`SELECT up.id,up.purchased_at,CASE WHEN up.status='ACTIVE' AND up.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE up.status::text END AS status,up.expires_at,tp.name AS title,tp.description AS package_description,tp.service_id,up.total_sessions,
      s.name AS service_name,s.full_description AS service_description,s.steps AS service_steps,s.duration_minutes,
      GREATEST(up.completed_sessions,(SELECT count(*)::int FROM treatment_journal j WHERE j.user_package_id=up.id AND j.customer_id=up.customer_id)) AS completed_sessions,
      (SELECT count(*)::int FROM miniapp_booking_packages link JOIN bookings b ON b.id=link.booking_id
        WHERE link.user_package_id=up.id AND b.customer_id=up.customer_id AND link.state='RESERVED') AS reserved_sessions
    FROM user_packages up JOIN treatment_packages tp ON tp.id=up.package_id LEFT JOIN services s ON s.id=tp.service_id WHERE up.customer_id=${customerId}::uuid`;
  const page=await collectionPage(store,query,input,section==='packages'?'purchased_at':'created_at');
  return {customer,records:page.rows.map(row=>section==='packages'?{...row,remaining_sessions:Math.max(0,Number(row.total_sessions)-Number(row.completed_sessions)-Number(row.reserved_sessions))}:row),nextCursor:page.nextCursor};
}
