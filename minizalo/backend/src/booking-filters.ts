import {Prisma} from '@prisma/client';
import {ApiError} from './errors.js';

// Keep filters in SQL before the cursor boundary, rather than filtering one page in the UI.
export function bookingFilters(input:Record<string,unknown>){
  const text=(key:string,max=150)=>{const value=input[key];if(value===undefined)return '';if(typeof value!=='string'||value.length>max||value.includes('\0'))throw new ApiError(400,'Invalid booking filter');return value.trim();};
  const id=(key:string)=>{const v=text(key);if(v&&!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v))throw new ApiError(400,'Invalid booking filter');return v;};
  const day=(key:string)=>{const v=text(key);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw new ApiError(400,'Invalid booking date');return v;};
  const tab=text('tab'),status=text('status').toUpperCase(),branch=id('branchId'),service=id('serviceId'),from=day('from'),to=day('to'),search=text('search');
  if(tab&&!['all','upcoming','completed','cancelled'].includes(tab))throw new ApiError(400,'Invalid booking tab');
  if(status&&!['PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE','COMPLETED','CANCELLED','NO_SHOW'].includes(status))throw new ApiError(400,'Invalid booking status');
  if(from&&to&&from>to)throw new ApiError(400,'Invalid booking date range');
  const clauses:Prisma.Sql[]=[];
  if(tab==='upcoming')clauses.push(Prisma.sql`b.status NOT IN ('COMPLETED','CANCELLED','NO_SHOW') AND ((b.booking_date+b.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'>clock_timestamp() OR b.booking_date=(clock_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date OR b.status IN ('CHECKED_IN','IN_SERVICE'))`);
  else if(tab&&tab!=='all')clauses.push(Prisma.sql`b.status::text=${tab.toUpperCase()}`);
  if(status)clauses.push(Prisma.sql`b.status::text=${status}`);
  if(branch)clauses.push(Prisma.sql`b.branch_id=${branch}::uuid`);
  if(service)clauses.push(Prisma.sql`EXISTS(SELECT 1 FROM booking_items filter_item WHERE filter_item.booking_id=b.id AND filter_item.service_id=${service}::uuid)`);
  if(from)clauses.push(Prisma.sql`b.booking_date>=${from}::date`);
  if(to)clauses.push(Prisma.sql`b.booking_date<=${to}::date`);
  if(search){
    const folded=search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
    const pattern='%'+folded.replace(/[\\%_]/g,'\\$&')+'%';
    const digits=/^[+\d\s().-]+$/.test(search)?search.replace(/\D/g,'').replace(/^84/,'0'):'';
    const names=Prisma.sql`concat_ws(' ',b.booking_code,b.booked_for_name,b.booked_for_phone,u.full_name,u.phone,br.name,t.full_name,(SELECT string_agg(s.name,' ') FROM booking_items i JOIN services s ON s.id=i.service_id WHERE i.booking_id=b.id))`;
    clauses.push(Prisma.sql`(replace(regexp_replace(normalize(lower(${names}),NFD),'[̀-ͯ]','','g'),'đ','d') LIKE ${pattern} OR (${digits}<>'' AND (regexp_replace(regexp_replace(COALESCE(b.booked_for_phone,''),'[^0-9]','','g'),'^84','0') LIKE ${'%'+digits+'%'} OR regexp_replace(regexp_replace(COALESCE(u.phone,''),'[^0-9]','','g'),'^84','0') LIKE ${'%'+digits+'%'})))`);
  }
  return clauses.length?Prisma.sql`AND ${Prisma.join(clauses.map(c=>Prisma.sql`(${c})`),' AND ')}`:Prisma.empty;
}
