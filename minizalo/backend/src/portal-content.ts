import {Prisma} from '@prisma/client';
import type {Store} from './store.js';
import {ApiError} from './errors.js';
import {collectionPage} from './collection-page.js';
import {documentAttachments} from './document-library.js';
import {isStaffRole,optionalStaffScope} from './staff-booking.js';

async function audience(store:Store,actorId?:string){
  if(!actorId)return {staff:false,member:false};
  const [actor]=await store.query(Prisma.sql`SELECT role FROM users WHERE id=${actorId}::uuid AND is_active`);
  if(!actor)throw new ApiError(401,'Shared account is missing or inactive');
  if(isStaffRole(actor.role)&&await optionalStaffScope(store,actorId))return {staff:true,member:true};
  const [card]=await store.query(Prisma.sql`SELECT user_id FROM miniapp_membership_cards WHERE user_id=${actorId}::uuid AND is_active AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)`);
  return {staff:false,member:Boolean(card)};
}
const fields=Prisma.sql`c.id,c.kind,c.title,c.summary,c.image_url,c.published_at,c.created_at,
  to_jsonb(c)->>'category' AS category,COALESCE(to_jsonb(c)->>'author_name',u.full_name) AS author_name`;
const from=Prisma.sql`FROM miniapp_shared_content c LEFT JOIN users u ON u.id=c.author_id`;
function visible(scope:{staff:boolean;member:boolean}){
  // Legacy internal posts without an audience remain staff-only, never public by default.
  const access=Prisma.sql`UPPER(COALESCE(NULLIF(to_jsonb(c)->>'access_level',''),'STAFF_ONLY'))`;
  return Prisma.sql`UPPER(c.status) IN ('PUBLISHED','APPROVED') AND (c.published_at IS NULL OR c.published_at<=CURRENT_TIMESTAMP)
    AND (${access}='PUBLIC' OR ${access}='FREE_TRIAL' OR (${scope.member} AND ${access}='MEMBERS_ONLY') OR ${scope.staff})`;
}
export async function portalContent(store:Store,input:Record<string,unknown>,actorId?:string){
  if(input.kind!=='COMMUNITY'&&input.kind!=='DOCUMENT')throw new ApiError(400,'Invalid content kind');
  if(input.search!==undefined&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid content search');
  if(input.category!==undefined&&(typeof input.category!=='string'||input.category.length>150))throw new ApiError(400,'Invalid content category');
  const scope=await audience(store,actorId),pattern='%'+String(input.search||'').trim().replace(/[\\%_]/g,'\\$&')+'%';
  const kind=input.kind==='COMMUNITY'?Prisma.sql`UPPER(c.kind) IN ('COMMUNITY','ARTICLE')`:Prisma.sql`UPPER(c.kind)='DOCUMENT'`;
  const page=await collectionPage(store,Prisma.sql`SELECT ${fields} ${from} WHERE ${visible(scope)} AND ${kind}
    AND (${String(input.category||'')}='' OR to_jsonb(c)->>'category'=${String(input.category||'')})
    AND (c.title ILIKE ${pattern} OR c.summary ILIKE ${pattern} OR COALESCE(to_jsonb(c)->>'author_name',u.full_name,'') ILIKE ${pattern})`,input);
  const categories=await store.query(Prisma.sql`SELECT DISTINCT to_jsonb(c)->>'category' AS name ${from} WHERE ${visible(scope)} AND ${kind} AND NULLIF(to_jsonb(c)->>'category','') IS NOT NULL ORDER BY name`);
  return {...page,categories:categories.map(row=>row.name)};
}
export async function portalContentDetail(store:Store,id:string,actorId?:string){
  const scope=await audience(store,actorId);
  const [item]=await store.query(Prisma.sql`SELECT ${fields},c.content_text,c.attachments,to_jsonb(c)->>'file_url' AS file_url ${from}
    WHERE c.id=${id}::uuid AND UPPER(c.kind) IN ('DOCUMENT','COMMUNITY','ARTICLE') AND ${visible(scope)}`);
  if(!item)throw new ApiError(404,'Shared content is unavailable');
  const attachments=documentAttachments([...(Array.isArray(item.attachments)?item.attachments:[]),...(item.file_url?[{url:item.file_url,name:item.title}]:[])]);
  const {file_url,...record}=item;
  return {...record,attachments:[...new Map(attachments.map(file=>[file.url,file])).values()]};
}
