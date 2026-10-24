import {randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';

export const staffRoles=['RECEPTIONIST','CASHIER','TECHNICIAN','INSTRUCTOR','BRANCH_MANAGER','ADMIN','SUPER_ADMIN'];
export const isStaffRole=(role:unknown)=>typeof role==='string'&&staffRoles.includes(role.toUpperCase());
export async function staffScope(store:Store,actorId:string){
  const [actor]=await store.query(Prisma.sql`SELECT id,role FROM users WHERE id=${actorId}::uuid AND is_active`);
  if(!actor||!isStaffRole(actor.role))throw new ApiError(403,'Staff booking access is required');
  if(['ADMIN','SUPER_ADMIN'].includes(actor.role))return {actorId,branchId:null as string|null};
  const [profile]=await store.query(Prisma.sql`SELECT p.branch_id FROM staff_profiles p JOIN branches b ON b.id=p.branch_id WHERE p.user_id=${actorId}::uuid AND p.is_active AND p.resignation_date IS NULL AND b.is_active`);
  if(!profile)throw new ApiError(403,'Active staff profile and branch are required');
  return {actorId,branchId:String(profile.branch_id)};
}
export async function bookingAccess(store:Store,viewerId:string){
  const [actor]=await store.query(Prisma.sql`SELECT role FROM users WHERE id=${viewerId}::uuid AND is_active`);
  if(isStaffRole(actor?.role)){
    const scope=await staffScope(store,viewerId);
    return scope.branchId?Prisma.sql`b.branch_id=${scope.branchId}::uuid`:Prisma.sql`true`;
  }
  return Prisma.sql`b.customer_id=${viewerId}::uuid`;
}
const canonicalPhone=(input:unknown)=>{
  if(typeof input!=='string')throw new ApiError(400,'Customer name and phone are required');
  const phone=input.trim().replace(/^(?:\+?84)/,'0');
  if(!/^0[1-9]\d{8,9}$/.test(phone))throw new ApiError(400,'Customer name and phone are required');
  return phone;
};
const aliases=(phone:string)=>[phone,'84'+phone.slice(1),'+84'+phone.slice(1)];
export function bookingGuests(value:unknown,people:number){
  if(value===undefined)return null;
  if(!Array.isArray(value)||value.length!==people)throw new ApiError(400,'Enter details for every person in the group');
  return value.map(guest=>{
    if(!guest||typeof guest!=='object'||Array.isArray(guest)||typeof guest.name!=='string'||!guest.name.trim()||guest.name.trim().length>150||/[\x00-\x1f\x7f]/.test(guest.name))throw new ApiError(400,'Invalid guest name');
    return {name:guest.name.trim(),phone:guest.phone===undefined||guest.phone===''?null:canonicalPhone(guest.phone)};
  });
}
export async function staffCustomers(store:Store,actorId:string,input:unknown){
  const scope=await staffScope(store,actorId);
  const query=typeof input==='string'?input.trim():'';
  if(query.length<2||query.length>150)return [];
  let phones:string[]=[];
  try{phones=aliases(canonicalPhone(query));}catch{/* Name lookup remains branch scoped. */}
  const pattern='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
  return store.query(Prisma.sql`SELECT u.id,u.full_name,u.phone FROM users u WHERE u.is_active AND u.role IN ('CUSTOMER','STUDENT')
    AND (${phones.length?Prisma.sql`u.phone IN (${Prisma.join(phones)})`:Prisma.sql`false`}
      OR lower(u.full_name)=lower(${query})
      OR (u.full_name ILIKE ${pattern} AND (${scope.branchId}::uuid IS NULL OR EXISTS(SELECT 1 FROM bookings b WHERE b.customer_id=u.id AND b.branch_id=${scope.branchId}::uuid))))
    ORDER BY u.full_name,u.id LIMIT 20`);
}
export async function staffCustomer(store:Store,actorId:string,branchId:string,body:Row){
  const scope=await staffScope(store,actorId);
  if(scope.branchId&&scope.branchId!==branchId)throw new ApiError(403,'Staff cannot book another branch');
  if(body.customerId&&body.customer)throw new ApiError(400,'Choose an existing customer or enter a new customer');
  if(body.customerId){
    if(typeof body.customerId!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.customerId))throw new ApiError(400,'Invalid customer');
    const phone=canonicalPhone(body.customerPhone);
    const [customer]=await store.query(Prisma.sql`SELECT id,full_name,phone FROM users WHERE id=${body.customerId}::uuid AND is_active AND role IN ('CUSTOMER','STUDENT') AND (phone IS NULL OR phone IN (${Prisma.join(aliases(phone))})) FOR SHARE`);
    if(!customer)throw new ApiError(404,'Customer is unavailable or contact details changed');
    return {...customer,phone:customer.phone||phone};
  }
  const input=body.customer;
  if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>150||/[\x00-\x1f\x7f]/.test(input.name))throw new ApiError(400,'Customer name and phone are required');
  const phone=canonicalPhone(input.phone);
  await store.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${phone}))::text AS locked`);
  const matches=await store.query(Prisma.sql`SELECT id,full_name,phone,role,is_active FROM users WHERE phone IN (${Prisma.join(aliases(phone))}) FOR UPDATE`);
  if(matches.length>1)throw new ApiError(409,'Duplicate shared phone identities require administrator review');
  if(matches.length){
    const customer=matches[0];
    if(!customer.is_active||!['CUSTOMER','STUDENT'].includes(customer.role))throw new ApiError(409,'Phone belongs to an unavailable or staff account');
    return customer;
  }
  const [customer]=await store.query(Prisma.sql`INSERT INTO users(id,phone,full_name,role,referral_code) VALUES(${randomUUID()}::uuid,${phone},${input.name.trim()},'CUSTOMER',${randomUUID().replace(/-/g,'').slice(0,20)}) RETURNING id,full_name,phone`);
  return customer;
}

export async function staffSessionStatus(store:Store,actorId:string,bookingId:string,body:Row){
  const scope=await staffScope(store,actorId),status=body.status;
  if(!['CHECKED_IN','IN_SERVICE','COMPLETED'].includes(status))throw new ApiError(400,'Invalid treatment session status');
  for(const field of ['treatmentNotes','conditionBefore','conditionAfter','specialistAdvice']){
    if(body[field]!==undefined&&(typeof body[field]!=='string'||body[field].length>10000||body[field].includes('\0')))throw new ApiError(400,'Invalid treatment notes');
  }
  const [current]=await store.query(Prisma.sql`SELECT *,to_char(booking_date,'YYYY-MM-DD') AS day,to_char(start_time,'HH24:MI:SS') AS start FROM bookings WHERE id=${bookingId}::uuid
    AND (${scope.branchId}::uuid IS NULL OR branch_id=${scope.branchId}::uuid) FOR UPDATE`);
  if(!current)throw new ApiError(404,'Booking not found');
  if(current.status===status)return;
  if(({CHECKED_IN:'CONFIRMED',IN_SERVICE:'CHECKED_IN',COMPLETED:'IN_SERVICE'} as Record<string,string>)[status]!==current.status)throw new ApiError(409,'Invalid treatment session transition');
  const today=new Date(Date.now()+7*3600_000).toISOString().slice(0,10);
  if(current.day>today||(status==='CHECKED_IN'&&current.day!==today)||(status!=='CHECKED_IN'&&Date.parse(`${current.day}T${current.start}+07:00`)>Date.now()))throw new ApiError(409,'Treatment session has not started');
  if(status==='COMPLETED'){
    if(!body.treatmentNotes?.trim())throw new ApiError(400,'Treatment notes are required to end a session');
    const [link]=await store.query(Prisma.sql`SELECT user_package_id,state,journal_id FROM miniapp_booking_packages WHERE booking_id=${bookingId}::uuid FOR UPDATE`);
    const journals=await store.query(Prisma.sql`SELECT id FROM treatment_journal WHERE booking_id=${bookingId}::uuid`);
    if(!journals.length){
      let sessionNumber=1;
      if(link){
        const [owned]=await store.query(Prisma.sql`SELECT completed_sessions FROM user_packages WHERE id=${link.user_package_id}::uuid AND customer_id=${current.customer_id}::uuid FOR UPDATE`);
        if(!owned||link.state!=='RESERVED')throw new ApiError(409,'Treatment package session is unavailable');
        sessionNumber=Number(owned.completed_sessions)+1;
      }
      await store.query(Prisma.sql`INSERT INTO treatment_journal(booking_id,customer_id,technician_id,assigned_room_id,user_package_id,session_number,session_date,treatment_notes,condition_before,condition_after,specialist_advice)
        VALUES(${bookingId}::uuid,${current.customer_id}::uuid,${current.technician_id}::uuid,${current.assigned_room_id}::uuid,${link?.user_package_id??null}::uuid,${sessionNumber},${current.day}::date,${body.treatmentNotes.trim()},${body.conditionBefore??null},${body.conditionAfter??null},${body.specialistAdvice??null}) RETURNING id`);
    }
    await store.query(Prisma.sql`UPDATE technician_slots SET status='AVAILABLE',held_by_user_id=NULL,hold_expires_at=NULL WHERE technician_id=${current.technician_id}::uuid AND slot_date=${current.day}::date AND start_time=${current.start}::time AND status='BOOKED' RETURNING id`);
  }
  await store.query(Prisma.sql`UPDATE bookings SET status=${status}::booking_status WHERE id=${bookingId}::uuid RETURNING id`);
  await store.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data) VALUES(${actorId}::uuid,'MINIAPP_SESSION_STATUS','bookings',${bookingId}::uuid,${JSON.stringify({status:current.status})}::jsonb,${JSON.stringify({status})}::jsonb) RETURNING id`);
}
