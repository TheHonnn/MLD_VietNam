import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';

export async function bookingGroup(store:Store,actorId:string,bookingId:string,lock=false){
  const scope=await staffScope(store,actorId);
  const [member]=await store.query(Prisma.sql`SELECT gm.group_id FROM miniapp_booking_group_members gm JOIN bookings b ON b.id=gm.booking_id
    WHERE b.id=${bookingId}::uuid AND (${scope.branchId}::uuid IS NULL OR b.branch_id=${scope.branchId}::uuid)`);
  if(!member)throw new ApiError(404,'Booking group is unavailable');
  // All group operations lock in UUID order, including a retry from a different member.
  const rows=await store.query(Prisma.sql`SELECT b.*,to_char(b.booking_date,'YYYY-MM-DD') AS day,to_char(b.start_time,'HH24:MI:SS') AS start
    FROM bookings b JOIN miniapp_booking_group_members gm ON gm.booking_id=b.id WHERE gm.group_id=${member.group_id}::uuid
    ORDER BY b.id ${lock?Prisma.sql`FOR UPDATE OF b`:Prisma.empty}`);
  if(!rows.length||rows.some(row=>scope.branchId&&row.branch_id!==scope.branchId))throw new ApiError(404,'Booking group is unavailable');
  return rows;
}

export async function cancelBookingGroup(store:Store,actorId:string,bookingId:string,reason:unknown){
  if(reason!==undefined&&(typeof reason!=='string'||reason.length>10000||reason.includes('\0')))throw new ApiError(400,'Invalid cancellation reason');
  const rows=await bookingGroup(store,actorId,bookingId,true);
  const active=rows.filter(row=>row.status!=='CANCELLED');
  if(active.some(row=>!['PENDING','CONFIRMED'].includes(row.status)||['PAID','PARTIAL'].includes(row.payment_status)||Date.parse(`${row.day}T${row.start}+07:00`)<=Date.now()))throw new ApiError(409,'The group contains a paid, started or past appointment; review each appointment');
  for(const row of active){
    await store.query(Prisma.sql`UPDATE bookings SET status='CANCELLED',cancellation_reason=${reason??null},cancelled_by_id=${actorId}::uuid WHERE id=${row.id}::uuid RETURNING id`);
    await store.query(Prisma.sql`UPDATE technician_slots SET status='AVAILABLE' WHERE technician_id=${row.technician_id}::uuid AND slot_date=${row.day}::date AND start_time=${row.start}::time AND status='BOOKED' RETURNING id`);
    const vouchers=await store.query(Prisma.sql`UPDATE user_vouchers SET status='AVAILABLE',used_at=NULL,used_in_booking_id=NULL WHERE user_id=${row.customer_id}::uuid AND used_in_booking_id=${row.id}::uuid AND used_in_invoice_id IS NULL RETURNING coupon_id`);
    for(const voucher of vouchers)await store.query(Prisma.sql`UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=${voucher.coupon_id}::uuid RETURNING id`);
    await store.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data) VALUES(${actorId}::uuid,'MINIAPP_GROUP_CANCEL','bookings',${row.id}::uuid,${JSON.stringify({status:row.status})}::jsonb,'{"status":"CANCELLED"}'::jsonb) RETURNING id`);
  }
  return rows;
}
