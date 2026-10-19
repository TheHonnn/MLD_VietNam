import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';

export const inboxFilter=(userId:string)=>Prisma.sql`n.user_id=${userId}::uuid
  AND (COALESCE(n.data->>'channel',CASE WHEN n.type='SYSTEM' THEN 'system' WHEN n.type='PROMOTION' THEN 'promotion' ELSE 'activity' END)<>'system' OR COALESCE((SELECT system_notify FROM user_settings WHERE user_id=${userId}::uuid),true))
  AND (COALESCE(n.data->>'channel',CASE WHEN n.type='PROMOTION' THEN 'promotion' ELSE '' END)<>'promotion' OR COALESCE((SELECT promotion_notify FROM user_settings WHERE user_id=${userId}::uuid),true))
  AND (COALESCE(n.data->>'channel','')<>'reminder' OR COALESCE((SELECT appointment_reminder FROM user_settings WHERE user_id=${userId}::uuid),true))`;
export async function unreadCount(store:Store,userId:string) {
  const [row]=await store.query(Prisma.sql`SELECT count(*)::int AS count FROM notifications n WHERE ${inboxFilter(userId)} AND NOT n.is_read`);
  return Number(row.count);
}
export async function inboxPage(store:Store,userId:string,rawCursor:unknown) {
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
    COALESCE((n.data->>'eventSequence')::bigint,0)::text AS event_sequence FROM notifications n WHERE ${inboxFilter(userId)}
    ${cursor?Prisma.sql`AND (n.created_at,COALESCE((n.data->>'eventSequence')::bigint,0),n.id)<(${cursor.time}::timestamptz,${cursor.sequence}::bigint,${cursor.id}::uuid)`:Prisma.empty}
    ORDER BY n.created_at DESC,COALESCE((n.data->>'eventSequence')::bigint,0) DESC,n.id DESC LIMIT 51`);
  const notifications=rows.slice(0,50),last=notifications[notifications.length-1];
  const [totals]=await store.query(Prisma.sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE NOT n.is_read)::int AS unread FROM notifications n WHERE ${inboxFilter(userId)}`);
  return {notifications,totalCount:Number(totals.total),unreadCount:Number(totals.unread),nextCursor:rows.length>50?Buffer.from(JSON.stringify({time:last.cursor_time,sequence:last.event_sequence,id:last.id})).toString('base64url'):null};
}
