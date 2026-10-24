import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';

const uuid=(value:unknown)=>{
  if(typeof value!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value))throw new ApiError(400,'Availability requires canonical UUIDs');
  return value;
};
const date=(value:unknown)=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new ApiError(400,'Invalid availability date');
  return value;
};
const minutes=(value:unknown)=>{
  if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new ApiError(400,'Availability times must be HH:MM');
  return Number(value.slice(0,2))*60+Number(value.slice(3));
};
const time=(value:number)=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');

// Operator-only publication. Call within a transaction; never exposed as a customer API.
export async function publishAvailability(store:Store,input:unknown,apply=false){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'Availability plan must be an object');
  const plan=input as Record<string,any>;
  if(Object.keys(plan).some(key=>!['startDate','endDate','intervalMinutes','windows'].includes(key)))throw new ApiError(400,'Unknown availability field');
  const start=date(plan.startDate),end=date(plan.endDate),interval=plan.intervalMinutes;
  const today=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
  if(start<today||end<start||Date.parse(end)-Date.parse(start)>30*86400000)throw new ApiError(400,'Publish only future availability for at most 31 days');
  if(!Number.isInteger(interval)||interval<15||interval>120||!Array.isArray(plan.windows)||!plan.windows.length||plan.windows.length>40)throw new ApiError(400,'Invalid interval or availability windows');
  const windows:{technicianId:string;branchId:string;serviceIds:string[];from:number;to:number;minDuration:number}[]=[];
  for(const raw of plan.windows){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!['technicianId','branchId','serviceIds','startTime','endTime'].includes(key)))throw new ApiError(400,'Invalid availability window');
    const technicianId=uuid(raw.technicianId),branchId=uuid(raw.branchId),from=minutes(raw.startTime),to=minutes(raw.endTime);
    if(to<=from||!Array.isArray(raw.serviceIds)||!raw.serviceIds.length||raw.serviceIds.length>30)throw new ApiError(400,'Window needs positive duration and real services');
    const serviceIds=[...new Set<string>(raw.serviceIds.map(uuid))];
    const [technician]=await store.query(Prisma.sql`SELECT t.id FROM technicians t JOIN branches b ON b.id=t.branch_id WHERE t.id=${technicianId}::uuid AND b.id=${branchId}::uuid AND t.is_active AND b.is_active AND ${raw.startTime}::time>=b.opening_time AND ${raw.endTime}::time<=b.closing_time`);
    if(!technician)throw new ApiError(400,'Technician/branch is inactive, mismatched, or window is outside opening hours');
    const services=await store.query(Prisma.sql`SELECT s.id,s.duration_minutes FROM services s JOIN service_categories c ON c.id=s.category_id WHERE s.id IN (${Prisma.join(serviceIds.map(id=>Prisma.sql`${id}::uuid`))}) AND s.is_active AND c.is_active`);
    if(services.length!==serviceIds.length||services.some(s=>Number(s.duration_minutes)<=0||Number(s.duration_minutes)>to-from))throw new ApiError(400,'Every service must be active and fit in the window');
    const disabled=await store.query(Prisma.sql`SELECT service_id FROM miniapp_technician_services WHERE technician_id=${technicianId}::uuid AND service_id IN (${Prisma.join(serviceIds.map(id=>Prisma.sql`${id}::uuid`))}) AND NOT is_active`);
    if(disabled.length)throw new ApiError(409,'Existing inactive service assignments are preserved; review them explicitly');
    if(windows.some(w=>w.technicianId===technicianId&&w.from<to&&w.to>from))throw new ApiError(400,'Publication windows overlap');
    windows.push({technicianId,branchId,serviceIds,from,to,minDuration:Math.min(...services.map(s=>Number(s.duration_minutes)))});
  }
  windows.sort((a,b)=>a.technicianId.localeCompare(b.technicianId)||a.from-b.from);
  if(apply)for(const id of [...new Set(windows.map(w=>w.technicianId))])await store.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${id}))::text AS locked`);
  const result={applied:apply,assignmentsAdded:0,shiftsAdded:0,slotsAdded:0,skipped:[] as {technicianId:string;date:string;reason:string}[]};
  const assignments=new Set<string>();
  for(const w of windows){
    for(const serviceId of w.serviceIds){
      const key=w.technicianId+':'+serviceId;if(assignments.has(key))continue;assignments.add(key);
      const existing=await store.query(Prisma.sql`SELECT technician_id FROM miniapp_technician_services WHERE technician_id=${w.technicianId}::uuid AND service_id=${serviceId}::uuid`);
      if(!existing.length){
        if(apply)await store.query(Prisma.sql`INSERT INTO miniapp_technician_services(technician_id,service_id,is_active) VALUES(${w.technicianId}::uuid,${serviceId}::uuid,true) ON CONFLICT DO NOTHING RETURNING technician_id`);
        result.assignmentsAdded++;
      }
    }
    for(let day=start;day<=end;day=new Date(Date.parse(day)+86400000).toISOString().slice(0,10)){
      const from=time(w.from),to=time(w.to);
      const leaves=await store.query(Prisma.sql`SELECT l.id FROM staff_leaves l JOIN staff_profiles p ON p.id=l.staff_id JOIN technicians t ON (t.staff_profile_id=p.id OR t.user_id=p.user_id) WHERE t.id=${w.technicianId}::uuid AND l.status='APPROVED' AND ${day}::date BETWEEN l.start_date AND l.end_date LIMIT 1`);
      if(leaves.length){result.skipped.push({technicianId:w.technicianId,date:day,reason:'APPROVED_LEAVE'});continue;}
      const shifts=await store.query(Prisma.sql`SELECT id,is_cancelled,branch_id,to_char(start_time,'HH24:MI') AS start_time,to_char(end_time,'HH24:MI') AS end_time FROM technician_shifts WHERE technician_id=${w.technicianId}::uuid AND shift_date=${day}::date AND start_time<${to}::time AND end_time>${from}::time`);
      if(shifts.some(s=>s.is_cancelled||String(s.branch_id)!==w.branchId||s.start_time!==from||s.end_time!==to)){result.skipped.push({technicianId:w.technicianId,date:day,reason:'EXISTING_SHIFT'});continue;}
      if(!shifts.length){
        if(apply)await store.query(Prisma.sql`INSERT INTO technician_shifts(technician_id,branch_id,shift_date,start_time,end_time) VALUES(${w.technicianId}::uuid,${w.branchId}::uuid,${day}::date,${from}::time,${to}::time) RETURNING id`);
        result.shiftsAdded++;
      }
      const existing=await store.query(Prisma.sql`SELECT to_char(start_time,'HH24:MI') AS start_time FROM technician_slots WHERE technician_id=${w.technicianId}::uuid AND slot_date=${day}::date`);
      const occupied=new Set(existing.map(row=>row.start_time));
      const conflicts=await store.query(Prisma.sql`SELECT to_char(start_time,'HH24:MI') AS start_time,to_char(end_time,'HH24:MI') AS end_time FROM bookings WHERE technician_id=${w.technicianId}::uuid AND booking_date=${day}::date AND status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE')`);
      const candidates:string[]=[];
      for(let at=w.from;at+w.minDuration<=w.to;at+=interval){
        const candidate=time(at);
        if(occupied.has(candidate)||conflicts.some(b=>minutes(b.start_time)<at+w.minDuration&&minutes(b.end_time)>at)||Date.parse(`${day}T${candidate}:00+07:00`)<=Date.now())continue;
        candidates.push(candidate);
      }
      if(candidates.length&&apply){
        const inserted=await store.query(Prisma.sql`INSERT INTO technician_slots(technician_id,branch_id,slot_date,start_time,end_time,status) VALUES ${Prisma.join(candidates.map(candidate=>Prisma.sql`(${w.technicianId}::uuid,${w.branchId}::uuid,${day}::date,${candidate}::time,${to}::time,'AVAILABLE')`))} ON CONFLICT DO NOTHING RETURNING id`);
        result.slotsAdded+=inserted.length;
      }else result.slotsAdded+=candidates.length;
    }
  }
  return result;
}
