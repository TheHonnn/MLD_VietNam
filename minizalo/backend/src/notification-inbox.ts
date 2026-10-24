import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';

export function notificationView(notification:Record<string,any>){
  const key=notification.data?.sourceKey;
  if(typeof key!=='string'||!/^certificate:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(key))return notification;
  return {...notification,title:notification.title.replace(/^Chứng chỉ:/,'Giấy chứng nhận:'),data:{...notification.data,
    target:{...notification.data.target,screen:'academy',tab:'certificates',entityId:key.slice('certificate:'.length)}}};
}

const eventSequence=Prisma.sql`CASE WHEN (n.data->>'eventSequence') ~ '^[0-9]{1,19}$'
  THEN LEAST((n.data->>'eventSequence')::numeric,9223372036854775807::numeric)::bigint ELSE 0::bigint END`;

export const notificationAccess=(userId:string)=>Prisma.sql`n.user_id=${userId}::uuid
  AND (n.data->>'staffBranchId' IS NULL OR EXISTS(SELECT 1 FROM users staff WHERE staff.id=${userId}::uuid AND staff.is_active
    AND (staff.role IN ('ADMIN','SUPER_ADMIN') OR (staff.role IN ('RECEPTIONIST','CASHIER','TECHNICIAN','INSTRUCTOR','BRANCH_MANAGER')
      AND EXISTS(SELECT 1 FROM staff_profiles p JOIN branches b ON b.id=p.branch_id WHERE p.user_id=staff.id AND p.is_active AND p.resignation_date IS NULL AND b.is_active AND p.branch_id::text=n.data->>'staffBranchId')))))`;
export const inboxFilter=(userId:string)=>Prisma.sql`${notificationAccess(userId)}
  AND (COALESCE(n.data->>'channel',CASE WHEN n.type='SYSTEM' THEN 'system' WHEN n.type='PROMOTION' THEN 'promotion' ELSE 'activity' END)<>'system' OR COALESCE((SELECT system_notify FROM user_settings WHERE user_id=${userId}::uuid),true))
  AND (COALESCE(n.data->>'channel',CASE WHEN n.type='PROMOTION' THEN 'promotion' ELSE '' END)<>'promotion' OR COALESCE((SELECT promotion_notify FROM user_settings WHERE user_id=${userId}::uuid),true))
  AND (COALESCE(n.data->>'channel','')<>'reminder' OR COALESCE((SELECT appointment_reminder FROM user_settings WHERE user_id=${userId}::uuid),true))`;
export async function unreadCount(store:Store,userId:string) {
  const [row]=await store.query(Prisma.sql`SELECT count(*)::int AS count FROM notifications n WHERE ${inboxFilter(userId)} AND NOT n.is_read`);
  return Number(row.count);
}
export async function inboxPage(store:Store,userId:string,rawCursor:unknown,filter:unknown='all') {
  if(filter!=='all'&&filter!=='unread')throw new ApiError(400,'Invalid notification filter');
  let cursor:{time:string;sequence:string;id:string}|null=null;
  if(rawCursor!=null) {
    try {
      if(typeof rawCursor!=='string'||rawCursor.length>500) throw new Error();
      cursor=JSON.parse(Buffer.from(rawCursor,'base64url').toString('utf8'));
      if(!cursor||typeof cursor.time!=='string'||typeof cursor.sequence!=='string'||typeof cursor.id!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.time)||!Number.isFinite(Date.parse(cursor.time))||new Date(cursor.time).toISOString()!==cursor.time.slice(0,23)+'Z'||!/^\d{1,19}$/.test(cursor.sequence)||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(cursor.id)) throw new Error();
      if(BigInt(cursor.sequence)>9223372036854775807n) throw new Error();
    } catch {throw new ApiError(400,'Invalid notification cursor');}
  }
  const rows=await store.query(Prisma.sql`SELECT n.*,to_char(n.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time,
    (${eventSequence})::text AS event_sequence FROM notifications n WHERE ${inboxFilter(userId)}
    ${filter==='unread'?Prisma.sql`AND NOT n.is_read`:Prisma.empty}
    ${cursor?Prisma.sql`AND (n.created_at,(${eventSequence}),n.id)<(${cursor.time}::timestamptz,${cursor.sequence}::bigint,${cursor.id}::uuid)`:Prisma.empty}
    ORDER BY n.created_at DESC,(${eventSequence}) DESC,n.id DESC LIMIT 51`);
  const notifications=rows.slice(0,50).map(notificationView),last=notifications[notifications.length-1];
  const [totals]=await store.query(Prisma.sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE NOT n.is_read)::int AS unread FROM notifications n WHERE ${inboxFilter(userId)}`);
  return {notifications,totalCount:Number(totals.total),unreadCount:Number(totals.unread),nextCursor:rows.length>50?Buffer.from(JSON.stringify({time:last.cursor_time,sequence:last.event_sequence,id:last.id})).toString('base64url'):null};
}
