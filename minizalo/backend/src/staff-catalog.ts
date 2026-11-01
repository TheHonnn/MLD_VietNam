import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';

async function catalogAdmin(store:Store,actorId:string){
  await staffScope(store,actorId);
  const [actor]=await store.query(Prisma.sql`SELECT role FROM users WHERE id=${actorId}::uuid AND is_active`);
  if(!['ADMIN','SUPER_ADMIN'].includes(actor?.role))throw new ApiError(403,'Catalog editing requires an administrator');
}
const version=(row:Row)=>createHash('sha256').update(JSON.stringify(row)).digest('hex');
const kindOf=(kind:unknown)=>{if(kind!=='services'&&kind!=='courses')throw new ApiError(400,'Invalid catalog');return kind;};
export async function staffCatalog(store:Store,actorId:string,kind:unknown,input:Row){
  await catalogAdmin(store,actorId);const service=kindOf(kind)==='services';
  if(input.search!=null&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid catalog search');
  const pattern='%'+String(input.search||'').replace(/[\\%_]/g,'\\$&')+'%';
  const page=await collectionPage(store,service?Prisma.sql`SELECT * FROM services WHERE name ILIKE ${pattern}`:Prisma.sql`SELECT * FROM courses WHERE title ILIKE ${pattern}`,input);
  const categories=await store.query(service?Prisma.sql`SELECT id,name FROM service_categories WHERE is_active ORDER BY name`:Prisma.sql`SELECT id,name FROM course_categories WHERE is_active ORDER BY name`);
  const instructors=service?[]:await store.query(Prisma.sql`SELECT id,full_name FROM instructors WHERE is_active ORDER BY full_name`);
  return {items:page.rows.map(row=>({...row,version:version(row)})),nextCursor:page.nextCursor,categories,instructors};
}
function nonempty(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.length>max||value.includes('\0'))throw new ApiError(400,'Required catalog text is missing');return value.trim();}
function number(value:unknown,minimum=0,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<minimum||value>9999999999.99||(integer&&(!Number.isInteger(value)||value>1000000)))throw new ApiError(400,'Invalid catalog number');return value;}
function reference(value:unknown){if(typeof value!=='string'||!(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i).test(value))throw new ApiError(400,'Invalid catalog reference');return value;}
export async function saveStaffCatalog(store:Store,actorId:string,kind:unknown,id:string,body:Row){
  const service=kindOf(kind)==='services',categoryId=reference(body.categoryId),title=nonempty(body.title,service?200:250);
  if(typeof body.shortDescription!=='string'||body.shortDescription.length>10000||body.shortDescription.includes('\0')||typeof body.fullDescription!=='string'||body.fullDescription.length>100000||body.fullDescription.includes('\0')||typeof body.isActive!=='boolean'||typeof body.isFeatured!=='boolean')throw new ApiError(400,'Invalid catalog details');
  const price=number(body.price),duration=service?number(body.durationMinutes,1,true):0;
  const code=nonempty(body.code,service?200:50),image=typeof body.imageUrl==='string'?body.imageUrl.trim():'';
  if(image){try{const url=new URL(image);if(url.protocol!=='https:'||url.username||url.password)throw new Error();}catch{throw new ApiError(400,'Image must use HTTPS');}}
  const hours=service?0:number(body.totalHours,0,true),theory=service?0:number(body.theoryHours,0,true),practice=service?0:number(body.practiceHours,0,true),lessons=service?0:number(body.totalLessons,0,true),deposit=service?0:number(body.depositAmount);
  if(!service&&(!['BEGINNER','INTERMEDIATE','ADVANCED','MASTER'].includes(body.level)||theory+practice!==hours||deposit>price||typeof body.certificateTitle!=='string'||body.certificateTitle.length>200))throw new ApiError(400,'Course hours, level or deposit are invalid');
  const instructorId=!service&&body.instructorId?reference(body.instructorId):null;
  return store.transaction(async tx=>{
    await catalogAdmin(tx,actorId);
    const [previous]=await tx.query(service?Prisma.sql`SELECT * FROM services WHERE id=${id}::uuid FOR UPDATE`:Prisma.sql`SELECT * FROM courses WHERE id=${id}::uuid FOR UPDATE`);
    if((previous?version(previous):null)!==(body.expectedVersion??null))throw new ApiError(409,'Catalog changed; reload before saving');
    const [category]=await tx.query(service?Prisma.sql`SELECT id FROM service_categories WHERE id=${categoryId}::uuid AND is_active`:Prisma.sql`SELECT id FROM course_categories WHERE id=${categoryId}::uuid AND is_active`);
    if(!category)throw new ApiError(400,'Category is unavailable');
    if(instructorId){const [entry]=await tx.query(Prisma.sql`SELECT id FROM instructors WHERE id=${instructorId}::uuid AND is_active`);if(!entry)throw new ApiError(400,'Instructor is unavailable');}
    const [saved]=await tx.query(service?Prisma.sql`INSERT INTO services(id,category_id,name,slug,short_description,full_description,price,duration_minutes,image_url,is_active,is_featured)
      VALUES(${id}::uuid,${categoryId}::uuid,${title},${code},${body.shortDescription},${body.fullDescription},${price},${duration},${image},${body.isActive},${body.isFeatured})
      ON CONFLICT(id) DO UPDATE SET category_id=EXCLUDED.category_id,name=EXCLUDED.name,slug=EXCLUDED.slug,short_description=EXCLUDED.short_description,full_description=EXCLUDED.full_description,price=EXCLUDED.price,duration_minutes=EXCLUDED.duration_minutes,image_url=EXCLUDED.image_url,is_active=EXCLUDED.is_active,is_featured=EXCLUDED.is_featured RETURNING *`:
      Prisma.sql`INSERT INTO courses(id,category_id,primary_instructor_id,title,code,short_description,full_description,tuition_fee,total_hours,theory_hours,practice_hours,total_lessons,deposit_amount,level,certificate_title,image_url,is_active,is_featured)
      VALUES(${id}::uuid,${categoryId}::uuid,${instructorId}::uuid,${title},${code},${body.shortDescription},${body.fullDescription},${price},${hours},${theory},${practice},${lessons},${deposit},${body.level}::course_level,${body.certificateTitle},${image},${body.isActive},${body.isFeatured})
      ON CONFLICT(id) DO UPDATE SET category_id=EXCLUDED.category_id,primary_instructor_id=EXCLUDED.primary_instructor_id,title=EXCLUDED.title,code=EXCLUDED.code,short_description=EXCLUDED.short_description,full_description=EXCLUDED.full_description,tuition_fee=EXCLUDED.tuition_fee,total_hours=EXCLUDED.total_hours,theory_hours=EXCLUDED.theory_hours,practice_hours=EXCLUDED.practice_hours,total_lessons=EXCLUDED.total_lessons,deposit_amount=EXCLUDED.deposit_amount,level=EXCLUDED.level,certificate_title=EXCLUDED.certificate_title,image_url=EXCLUDED.image_url,is_active=EXCLUDED.is_active,is_featured=EXCLUDED.is_featured RETURNING *`);
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data) VALUES(${actorId}::uuid,'MINIAPP_CATALOG_SAVE',${service?'services':'courses'},${id}::uuid,${JSON.stringify({version:previous?version(previous):null})}::jsonb,${JSON.stringify({version:version(saved),isActive:saved.is_active})}::jsonb) RETURNING id`);
    return {...saved,version:version(saved)};
  });
}

