import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';

export const MAX_BOOKING_PEOPLE=20;
export function bookingPeople(value:unknown){
  if(value===undefined)return 1;
  if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>MAX_BOOKING_PEOPLE)throw new ApiError(400,'Choose 1-20 people');
  return value;
}

// Unmapped legacy appointments still consume capacity. Never treat them as free beds.
export function freeBeds(branch:Prisma.Sql,day:Prisma.Sql,start:Prisma.Sql,end:Prisma.Sql,excluded:Prisma.Sql=Prisma.sql`NULL::uuid`){
  return Prisma.sql`WITH occupied AS (
    SELECT b.id,b.assigned_room_id,b.assigned_bed_number,CASE WHEN COALESCE(bb.bed_number,numbered.bed) BETWEEN 1 AND r.bed_capacity THEN r.id END AS room_id,
      COALESCE(bb.bed_number,numbered.bed) AS bed_number FROM bookings b
    LEFT JOIN miniapp_booking_beds bb ON bb.booking_id=b.id
    LEFT JOIN branch_rooms r ON r.id=COALESCE(bb.room_id,b.assigned_room_id) AND r.branch_id=b.branch_id AND r.is_available AND r.room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB')
    CROSS JOIN LATERAL (SELECT CASE WHEN btrim(b.assigned_bed_number) ~ '^0*[1-9][0-9]{0,8}$' THEN btrim(b.assigned_bed_number)::integer END AS bed) numbered
    WHERE b.branch_id=${branch} AND b.booking_date=${day}
      AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE')
      AND b.start_time<${end} AND b.end_time>${start} AND b.id IS DISTINCT FROM ${excluded}
  ), candidates AS (
    SELECT r.id AS room_id,n.bed_number,row_number() OVER(PARTITION BY r.id ORDER BY n.bed_number) AS position
    FROM branch_rooms r CROSS JOIN LATERAL generate_series(1,r.bed_capacity) n(bed_number)
    WHERE r.branch_id=${branch} AND r.is_available AND r.room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB')
      AND NOT EXISTS(SELECT 1 FROM occupied o WHERE o.room_id=r.id AND o.bed_number=n.bed_number)
      AND NOT EXISTS(SELECT 1 FROM occupied o WHERE o.room_id IS NULL AND o.assigned_room_id=r.id AND NULLIF(btrim(o.assigned_bed_number),'') IS NOT NULL)
  ), remaining AS (
    SELECT c.room_id,c.bed_number FROM candidates c WHERE c.position>(SELECT count(*) FROM occupied o WHERE o.room_id IS NULL AND o.assigned_room_id=c.room_id)
  ) SELECT room_id,bed_number FROM remaining ORDER BY room_id,bed_number
    OFFSET (SELECT count(*) FROM occupied WHERE room_id IS NULL AND (assigned_room_id IS NULL OR NOT EXISTS(
      SELECT 1 FROM branch_rooms r WHERE r.id=occupied.assigned_room_id AND r.is_available AND r.room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB'))))`;
}

export async function reserveBed(store:Store,branchId:string,day:string,start:string,end:string,excludedId:string|null=null){
  // A branch/day lock serializes group allocations and single staff appointments.
  await store.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`beds:${branchId}:${day}`}))::text AS locked`);
  const [bed]=await store.query(freeBeds(Prisma.sql`${branchId}::uuid`,Prisma.sql`${day}::date`,Prisma.sql`${start}::time`,Prisma.sql`${end}::time`,Prisma.sql`${excludedId}::uuid`));
  if(!bed)throw new ApiError(409,'No treatment bed is available',{code:'NO_BED_CAPACITY'});
  return bed;
}

export async function filterResourceSlots(store:Store,slots:Row[],branchId:string,people:number,excludedId:string|null=null){
  if(!slots.length)return [];
  const grouped=new Map<string,Row[]>();
  for(const slot of slots){
    const key=JSON.stringify([slot.slot_date,slot.start_time,slot.end_time]);
    const group=grouped.get(key)||[];
    if(!group.some(item=>item.technician_id===slot.technician_id))group.push(slot);
    grouped.set(key,group);
  }
  const candidates=[...grouped.values()].filter(group=>group.length>=people);
  if(!candidates.length)return [];
  const values=Prisma.join(candidates.map(group=>Prisma.sql`(${group[0].slot_date}::date,${group[0].start_time}::time,${group[0].end_time}::time)`));
  const capacity=await store.query(Prisma.sql`SELECT to_char(c.day,'YYYY-MM-DD') AS day,to_char(c.start,'HH24:MI:SS') AS start,
      (SELECT count(*)::int FROM (${freeBeds(Prisma.sql`${branchId}::uuid`,Prisma.sql`c.day`,Prisma.sql`c.start`,Prisma.sql`c.finish`,Prisma.sql`${excludedId}::uuid`)}) available) AS beds
    FROM (VALUES ${values}) c(day,start,finish)`);
  const bedsByTime=new Map(capacity.map(row=>[`${row.day}:${row.start}`,Number(row.beds)]));
  return candidates.flatMap(group=>{
    const count=Math.min(group.length,bedsByTime.get(`${group[0].slot_date}:${group[0].start_time}`)||0);
    return count>=people?group.map(slot=>({...slot,available_people:count})):[];
  });
}
