import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';

// A timestamp plus UUID provides a stable boundary even when new records arrive.
export async function collectionPage(store:Store,query:Prisma.Sql,input:Record<string,unknown>,dateColumn:'created_at'|'purchased_at'='created_at') {
  const limit=input.limit===undefined?100:Number(input.limit);
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new ApiError(400,'Invalid page size');
  let cursor:{time:string;id:string}|null=null;
  if(input.cursor!==undefined) {
    try {
      if(typeof input.cursor!=='string'||input.cursor.length>300)throw new Error();
      cursor=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8'));
      if(!cursor||typeof cursor.time!=='string'||typeof cursor.id!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.time)||!Number.isFinite(Date.parse(cursor.time))||new Date(cursor.time).toISOString()!==cursor.time.slice(0,23)+'Z'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(cursor.id))throw new Error();
    } catch {throw new ApiError(400,'Invalid collection cursor');}
  }
  const column=dateColumn==='purchased_at'?Prisma.sql`items.purchased_at`:Prisma.sql`items.created_at`;
  const rows=await store.query(Prisma.sql`SELECT items.*,to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS pagination_time
    FROM (${query}) items ${cursor?Prisma.sql`WHERE (${column},items.id)<(${cursor.time}::timestamptz,${cursor.id}::uuid)`:Prisma.empty}
    ORDER BY ${column} DESC,items.id DESC LIMIT ${limit+1}`);
  const selected=rows.slice(0,limit),last=selected[selected.length-1];
  return {rows:selected.map(({pagination_time,...row})=>row),nextCursor:rows.length>limit?Buffer.from(JSON.stringify({time:last.pagination_time,id:last.id})).toString('base64url'):null};
}
