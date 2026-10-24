import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';
import {documentAttachments} from './document-library.js';

const visible=Prisma.sql`c.status='PUBLISHED' AND c.published_at<=clock_timestamp()`;
const fields=Prisma.sql`c.id,c.kind,c.title,c.summary,c.image_url,c.published_at,c.created_at,u.full_name AS author_name`;
const select=Prisma.sql`FROM miniapp_shared_content c JOIN users u ON u.id=c.author_id`;
async function publisher(store:Store,actorId:string){
  await staffScope(store,actorId);
  const [actor]=await store.query(Prisma.sql`SELECT role FROM users WHERE id=${actorId}::uuid AND is_active FOR SHARE`);
  if(!actor||!['ADMIN','SUPER_ADMIN'].includes(actor.role))throw new ApiError(403,'Content publishing requires an administrator');
}
export async function sharedContent(store:Store,actorId:string,input:Record<string,unknown>){
  await staffScope(store,actorId);
  if(!['COMMUNITY','DOCUMENT'].includes(String(input.kind))||typeof input.kind!=='string')throw new ApiError(400,'Invalid content kind');
  if(input.search!==undefined&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid content search');
  const pattern='%'+String(input.search||'').trim().replace(/[\\%_]/g,'\\$&')+'%';
  return collectionPage(store,Prisma.sql`SELECT ${fields} ${select} WHERE ${visible} AND c.kind=${input.kind}
    AND (c.title ILIKE ${pattern} OR c.summary ILIKE ${pattern})`,input);
}
export async function sharedContentDetail(store:Store,actorId:string,id:string){
  await staffScope(store,actorId);
  const [item]=await store.query(Prisma.sql`SELECT ${fields},c.content_text,c.attachments ${select} WHERE c.id=${id}::uuid AND ${visible}`);
  if(!item)throw new ApiError(404,'Shared content is unavailable');
  return {...item,attachments:documentAttachments(item.attachments)};
}
export async function sharedContentEdit(store:Store,actorId:string,id:string){
  await publisher(store,actorId);
  const [item]=await store.query(Prisma.sql`SELECT ${fields},c.content_text,c.attachments,c.status,c.revision ${select} WHERE c.id=${id}::uuid`);
  if(!item)throw new ApiError(404,'Shared content is unavailable');
  return item;
}
export async function manageSharedContent(store:Store,actorId:string,input:Record<string,unknown>){
  await publisher(store,actorId);
  return collectionPage(store,Prisma.sql`SELECT ${fields},c.status,c.revision ${select}`,input);
}
function contentInput(body:Row){
  if(typeof body.kind!=='string'||!['COMMUNITY','DOCUMENT'].includes(body.kind)||typeof body.status!=='string'||!['DRAFT','PUBLISHED','ARCHIVED'].includes(body.status))throw new ApiError(400,'Invalid content kind or status');
  for(const [key,max] of [['title',200],['summary',2000],['contentText',100000]] as const){
    if(typeof body[key]!=='string'||body[key].length>max||body[key].includes('\0'))throw new ApiError(400,'Invalid content text');
  }
  if(!body.title.trim())throw new ApiError(400,'Content title is required');
  let imageUrl:null|string=null;
  if(body.imageUrl!=null&&body.imageUrl!==''){
    const [image]=documentAttachments([body.imageUrl]);if(!image)throw new ApiError(400,'Content image must use HTTPS');imageUrl=image.url;
  }
  if(body.attachments!==undefined&&(!Array.isArray(body.attachments)||body.attachments.length>20))throw new ApiError(400,'Invalid content attachments');
  const attachments=documentAttachments(body.attachments??[]);
  if(attachments.length!==(body.attachments??[]).length)throw new ApiError(400,'Content attachments must use HTTPS');
  if(body.status==='PUBLISHED'&&!body.contentText.trim()&&!body.summary.trim()&&!imageUrl&&!attachments.length)throw new ApiError(400,'Published content must include actual text or media');
  if(body.publishedAt!=null&&(typeof body.publishedAt!=='string'||!Number.isFinite(Date.parse(body.publishedAt))||new Date(body.publishedAt).toISOString()!==body.publishedAt))throw new ApiError(400,'Invalid publication date');
  if(!Number.isInteger(body.expectedRevision)||body.expectedRevision<0)throw new ApiError(400,'Expected content revision is required');
  return {kind:body.kind,status:body.status,title:body.title.trim(),summary:body.summary,contentText:body.contentText,imageUrl,attachments,publishedAt:body.publishedAt??null};
}
export async function saveSharedContent(store:Store,actorId:string,id:string,body:Row){
  const input=contentInput(body),hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return store.transaction(async tx=>{
    await publisher(tx,actorId);
    await tx.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`content:${id}`}))::text AS locked`);
    const [previous]=await tx.query(Prisma.sql`SELECT id,revision,payload_hash,updated_by FROM miniapp_shared_content WHERE id=${id}::uuid FOR UPDATE`);
    if(previous&&previous.payload_hash===hash&&previous.updated_by===actorId&&body.expectedRevision===previous.revision-1)return {id:previous.id,revision:previous.revision};
    if((previous?.revision??0)!==body.expectedRevision)throw new ApiError(409,'Content changed; reload before editing');
    const [saved]=await tx.query(Prisma.sql`INSERT INTO miniapp_shared_content(id,kind,title,summary,content_text,image_url,attachments,status,author_id,updated_by,payload_hash,published_at)
      VALUES(${id}::uuid,${input.kind},${input.title},${input.summary},${input.contentText},${input.imageUrl},${JSON.stringify(input.attachments)}::jsonb,${input.status},${actorId}::uuid,${actorId}::uuid,${hash},CASE WHEN ${input.status}='PUBLISHED' THEN COALESCE(${input.publishedAt}::timestamptz,clock_timestamp()) ELSE ${input.publishedAt}::timestamptz END)
      ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,title=EXCLUDED.title,summary=EXCLUDED.summary,content_text=EXCLUDED.content_text,image_url=EXCLUDED.image_url,
        attachments=EXCLUDED.attachments,status=EXCLUDED.status,updated_by=EXCLUDED.updated_by,payload_hash=EXCLUDED.payload_hash,published_at=EXCLUDED.published_at,
        revision=miniapp_shared_content.revision+1,updated_at=clock_timestamp() RETURNING id,revision`);
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data)
      VALUES(${actorId}::uuid,'MINIAPP_CONTENT_SAVE','miniapp_shared_content',${id}::uuid,${JSON.stringify({revision:previous?.revision??0})}::jsonb,${JSON.stringify({revision:saved.revision,status:input.status,kind:input.kind})}::jsonb) RETURNING id`);
    return saved;
  });
}
