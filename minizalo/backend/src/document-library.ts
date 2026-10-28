import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {collectionPage} from './collection-page.js';
import {ownedEnrollment,assertLessonUnlocked} from './learning.js';

const documentLesson=Prisma.sql`(l.lesson_type::text IN ('READING_DOC','PRACTICE_GUIDE','PDF','TEXT') OR
  (jsonb_typeof(l.attachments)='array' AND l.attachments<>'[]'::jsonb))`;
const usableEnrollment=Prisma.sql`SELECT ce.id FROM course_enrollments ce
  WHERE ce.student_id=viewer.id AND ce.course_id=c.id AND ce.status IN ('ENROLLED','STUDYING','GRADUATED')
  ORDER BY ce.enrolled_at DESC,ce.id DESC LIMIT 1`;

export async function documentLibrary(store:Store,userId:string,input:Record<string,unknown>){
  if(input.search!==undefined&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid document search');
  const pattern='%'+String(input.search||'').trim().replace(/[\\%_]/g,'\\$&')+'%';
  return collectionPage(store,Prisma.sql`SELECT l.id,l.title,l.lesson_type,l.created_at,ch.title AS chapter_title,c.id AS course_id,c.title AS course_title,EXISTS(SELECT 1 FROM course_lessons prior JOIN course_chapters pc ON pc.id=prior.chapter_id
        LEFT JOIN user_lesson_progress progress ON progress.lesson_id=prior.id AND progress.enrollment_id=enrollment.id
        WHERE pc.course_id=c.id AND (pc.chapter_order,prior.lesson_order,prior.id)<(ch.chapter_order,l.lesson_order,l.id) AND NOT COALESCE(progress.is_completed,false)) AS is_locked
    FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id
    JOIN courses c ON c.id=ch.course_id JOIN course_categories cat ON cat.id=c.category_id
    JOIN users viewer ON viewer.id=${userId}::uuid AND viewer.is_active
    JOIN LATERAL (${usableEnrollment}) enrollment ON true
    LEFT JOIN miniapp_course_access access ON access.enrollment_id=enrollment.id
    WHERE c.is_active AND cat.is_active AND ${documentLesson}
      AND NOT COALESCE(access.is_suspended,false) AND (access.expires_at IS NULL OR access.expires_at>clock_timestamp())
      AND (l.title ILIKE ${pattern} OR c.title ILIKE ${pattern} OR ch.title ILIKE ${pattern})`,input);
}

export function documentAttachments(value:unknown){
  if(!Array.isArray(value))return [];
  return value.flatMap((entry:unknown)=>{
    const item=typeof entry==='string'?{url:entry}:entry as Row|null;
    if(!item||typeof item!=='object')return [];
    try{
      const url=new URL(item.url??item.fileUrl);
      if(url.protocol!=='https:'||url.username||url.password)return [];
      const name=typeof item.name==='string'?item.name:typeof item.title==='string'?item.title:url.pathname.split('/').pop()||url.hostname;
      return [{url:url.href,name}];
    }catch{return [];}
  });
}

export async function libraryDocument(store:Store,userId:string,id:string,enrollmentId:string|null=null){
  const [item]=await store.query(Prisma.sql`SELECT l.id,l.title,l.content_text,l.attachments,ch.title AS chapter_title,c.id AS course_id,c.title AS course_title
    FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id JOIN courses c ON c.id=ch.course_id
    WHERE l.id=${id}::uuid AND ${documentLesson}`);
  if(!item)throw new ApiError(404,'Document not found');
  const enrollment=await ownedEnrollment(store,userId,item.course_id,enrollmentId);
  await assertLessonUnlocked(store,enrollment,String(item.id));
  return {...item,attachments:documentAttachments(item.attachments)};
}
