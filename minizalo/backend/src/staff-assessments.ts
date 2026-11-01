import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';

async function assessmentScope(store:Store,actorId:string){
  const scope=await staffScope(store,actorId);
  const [actor]=await store.query(Prisma.sql`SELECT role FROM users WHERE id=${actorId}::uuid AND is_active`);
  if(!['ADMIN','SUPER_ADMIN','BRANCH_MANAGER','INSTRUCTOR'].includes(actor?.role))throw new ApiError(403,'Instructor review access is required');
  return Prisma.sql`(${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid)
    AND (${actor.role!=='INSTRUCTOR'} OR EXISTS(SELECT 1 FROM instructors i WHERE i.user_id=${actorId}::uuid AND i.is_active AND (i.id=c.primary_instructor_id OR i.id=cb.instructor_id)))`;
}
const relation=Prisma.sql`FROM quiz_submissions submission JOIN course_enrollments ce ON ce.id=submission.enrollment_id
  JOIN users u ON u.id=ce.student_id JOIN course_quizzes quiz ON quiz.id=submission.quiz_id AND quiz.course_id=ce.course_id
  JOIN courses c ON c.id=ce.course_id LEFT JOIN course_batches cb ON cb.id=ce.batch_id`;
export async function assessmentSubmissions(store:Store,actorId:string,input:Row){
  const scope=await assessmentScope(store,actorId);
  if(input.search!=null&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid review search');
  const search='%'+String(input.search||'').replace(/[\\%_]/g,'\\$&')+'%';
  const page=await collectionPage(store,Prisma.sql`SELECT submission.id,submission.submitted_at AS created_at,submission.score,submission.passed,
    submission.instructor_feedback,quiz.title AS quiz_title,c.title AS course_title,COALESCE(ce.student_name,u.full_name) AS student_name,cb.batch_code
    ${relation} WHERE ${scope} AND (COALESCE(ce.student_name,u.full_name) ILIKE ${search} OR quiz.title ILIKE ${search} OR c.title ILIKE ${search})`,input);
  return {submissions:page.rows,nextCursor:page.nextCursor};
}
export async function reviewSubmission(store:Store,actorId:string,id:string,body:Row){
  if(typeof body.feedback!=='string'||!body.feedback.trim()||body.feedback.length>10000||body.feedback.includes('\0')||(body.expectedFeedback!==null&&typeof body.expectedFeedback!=='string'))throw new ApiError(400,'Instructor feedback is required');
  return store.transaction(async tx=>{
    const scope=await assessmentScope(tx,actorId);
    const [previous]=await tx.query(Prisma.sql`SELECT submission.id,submission.instructor_feedback ${relation} WHERE submission.id=${id}::uuid AND ${scope} FOR UPDATE OF submission`);
    if(!previous)throw new ApiError(404,'Submission is unavailable');
    if(previous.instructor_feedback!==body.expectedFeedback)throw new ApiError(409,'Feedback changed; reload before saving');
    const [saved]=await tx.query(Prisma.sql`UPDATE quiz_submissions SET instructor_feedback=${body.feedback.trim()} WHERE id=${id}::uuid RETURNING id,instructor_feedback,score,passed`);
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data) VALUES(${actorId}::uuid,'MINIAPP_QUIZ_FEEDBACK','quiz_submissions',${id}::uuid,${JSON.stringify({feedback:previous.instructor_feedback})}::jsonb,${JSON.stringify({feedback:saved.instructor_feedback})}::jsonb) RETURNING id`);
    return saved;
  });
}
