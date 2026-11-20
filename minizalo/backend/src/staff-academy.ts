import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {staffScope} from './staff-booking.js';
import {collectionPage} from './collection-page.js';

async function academyScope(store:Store,actorId:string){
  const scope=await staffScope(store,actorId);
  const [actor]=await store.query(Prisma.sql`SELECT role FROM users WHERE id=${actorId}::uuid AND is_active`);
  if(!['ADMIN','SUPER_ADMIN','BRANCH_MANAGER','RECEPTIONIST'].includes(actor?.role))throw new ApiError(403,'Academy admissions access is required');
  return scope;
}
export function resolveCandidateFields(row:Row){
  let outcomes:Record<string,any>={};
  if(row.learning_outcomes&&typeof row.learning_outcomes==='object')outcomes=row.learning_outcomes as Record<string,any>;
  else if(typeof row.learning_outcomes==='string'){try{const parsed=JSON.parse(row.learning_outcomes);if(parsed&&typeof parsed==='object')outcomes=parsed;}catch{}}
  const targetAudience=String(outcomes.target_audience||outcomes.targetAudience||'').trim();
  let consultationHistory:any[]=[];
  if(Array.isArray(row.consultation_history))consultationHistory=row.consultation_history;
  else if(typeof row.consultation_history==='string'){try{const parsed=JSON.parse(row.consultation_history);if(Array.isArray(parsed))consultationHistory=parsed;}catch{}}
  const consultStatus=typeof row.consultation_status==='string'&&row.consultation_status.trim()?row.consultation_status.trim():'';
  let effectiveStatus=String(row.status||'CONSULTING');
  if(effectiveStatus==='CONSULTING'&&consultationHistory.length>3)effectiveStatus='ARCHIVED';
  else if(effectiveStatus==='CONSULTING'&&consultStatus==='PENDING_CONSULTATION')effectiveStatus='PENDING_CONSULTATION';
  const latestNote=consultationHistory.length?String(consultationHistory[consultationHistory.length-1]?.note||''):'';
  return {...row,status:effectiveStatus,target_audience:targetAudience,consultation_history:consultationHistory,consultation_count:consultationHistory.length,latest_consultation_summary:latestNote};
}
export async function academyCandidates(store:Store,actorId:string,input:Row){
  const scope=await academyScope(store,actorId);
  if(input.search!=null&&(typeof input.search!=='string'||input.search.length>150))throw new ApiError(400,'Invalid candidate search');
  const search='%'+String(input.search||'').replace(/[\\%_]/g,'\\$&')+'%';
  const page=await collectionPage(store,Prisma.sql`SELECT ce.*,ce.enrolled_at AS created_at,c.title AS course_title,c.learning_outcomes,
    to_jsonb(u)->>'student_code' AS student_code,u.role AS student_role,u.email AS student_email,
    to_jsonb(ce)->'consultation_history' AS consultation_history,to_jsonb(ce)->>'consultation_status' AS consultation_status,
    COALESCE(ce.student_name,u.full_name) AS full_name,COALESCE(ce.student_phone,u.phone) AS phone,cb.batch_code
    FROM course_enrollments ce JOIN users u ON u.id=ce.student_id JOIN courses c ON c.id=ce.course_id
    LEFT JOIN course_batches cb ON cb.id=ce.batch_id
    WHERE ce.status IN ('CONSULTING','ENROLLED','STUDYING','NOT_GRADUATED','ARCHIVED')
      AND (${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid OR (ce.batch_id IS NULL AND ce.selected_branch=(SELECT name FROM branches WHERE id=${scope.branchId}::uuid)))
      AND (COALESCE(ce.student_name,u.full_name) ILIKE ${search} OR COALESCE(ce.student_phone,u.phone,'') ILIKE ${search} OR c.title ILIKE ${search} OR COALESCE(to_jsonb(u)->>'student_code','') ILIKE ${search})`,input);
  const batches=await store.query(Prisma.sql`SELECT cb.id,cb.course_id,cb.batch_code,cb.branch_id,br.name AS branch_name,cb.max_students,
      (SELECT count(*)::int FROM course_enrollments e WHERE e.batch_id=cb.id AND e.status IN ('ENROLLED','STUDYING','GRADUATED')) AS enrolled_count
    FROM course_batches cb JOIN branches br ON br.id=cb.branch_id AND br.is_active JOIN courses c ON c.id=cb.course_id AND c.is_active
    WHERE cb.status='OPEN_FOR_ENROLLMENT' AND (${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid) ORDER BY cb.start_date,cb.id`);
  return {candidates:page.rows.map(resolveCandidateFields),nextCursor:page.nextCursor,batches};
}
export async function approveCandidate(store:Store,actorId:string,id:string,body:Row){
  if(typeof body.batchId!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.batchId)||!['CONSULTING','ENROLLED','STUDYING'].includes(body.expectedStatus)||typeof body.expectedApproval!=='string')throw new ApiError(400,'Class and current enrollment state are required');
  return store.transaction(async tx=>{
    const scope=await academyScope(tx,actorId);
    const [batch]=await tx.query(Prisma.sql`SELECT cb.*,br.name AS branch_name FROM course_batches cb JOIN branches br ON br.id=cb.branch_id AND br.is_active JOIN courses c ON c.id=cb.course_id AND c.is_active
      WHERE cb.id=${body.batchId}::uuid AND cb.status='OPEN_FOR_ENROLLMENT' AND (${scope.branchId}::uuid IS NULL OR cb.branch_id=${scope.branchId}::uuid) FOR UPDATE OF cb`);
    if(!batch)throw new ApiError(404,'Class is unavailable');
    const [entry]=await tx.query(Prisma.sql`SELECT * FROM course_enrollments WHERE id=${id}::uuid AND course_id=${batch.course_id}::uuid FOR UPDATE`);
    if(!entry)throw new ApiError(404,'Enrollment is unavailable');
    // Branch staff cannot claim another branch's pending application.
    if(scope.branchId&&entry.batch_id!==batch.id&&entry.selected_branch!==batch.branch_name)throw new ApiError(403,'Enrollment belongs to another branch');
    if(scope.branchId&&entry.batch_id){
      const [previousClass]=await tx.query(Prisma.sql`SELECT branch_id FROM course_batches WHERE id=${entry.batch_id}::uuid`);
      if(previousClass?.branch_id!==scope.branchId)throw new ApiError(403,'Enrollment belongs to another branch');
    }
    if(entry.status!==body.expectedStatus||entry.approval_status!==body.expectedApproval||entry.batch_id!==(body.expectedBatchId||null))throw new ApiError(409,'Enrollment changed; reload before approving');
    if(!['CONSULTING','ENROLLED','STUDYING'].includes(entry.status))throw new ApiError(409,'Enrollment cannot be approved');
    if(entry.approval_status==='APPROVED'&&entry.batch_id===batch.id)return entry;
    const [count]=await tx.query(Prisma.sql`SELECT count(*)::int AS n FROM course_enrollments WHERE batch_id=${batch.id}::uuid AND id<>${id}::uuid AND status IN ('ENROLLED','STUDYING','GRADUATED')`);
    if(count.n>=batch.max_students)throw new ApiError(409,'Class has no places remaining');
    const [saved]=await tx.query(Prisma.sql`UPDATE course_enrollments SET batch_id=${batch.id}::uuid,status=CASE WHEN status='STUDYING' THEN status ELSE 'ENROLLED' END,
      approval_status='APPROVED',approved_by=${actorId}::uuid,approved_at=clock_timestamp(),selected_branch=${batch.branch_name}
      WHERE id=${id}::uuid RETURNING *`);
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,old_data,new_data)
      VALUES(${actorId}::uuid,'MINIAPP_ENROLLMENT_APPROVE','course_enrollments',${id}::uuid,${JSON.stringify({status:entry.status,batchId:entry.batch_id,approvalStatus:entry.approval_status})}::jsonb,${JSON.stringify({batchId:batch.id,approvalStatus:'APPROVED'})}::jsonb) RETURNING id`);
    return saved;
  });
}

export async function updateCandidateStudentCode(store:Store,actorId:string,enrollmentId:string,rawCode:unknown){
  const code=typeof rawCode==='string'?rawCode.trim().toUpperCase():'';
  if(!/^[A-Z0-9-]{3,32}$/.test(code))throw new ApiError(400,'Mã học viên phải từ 3-32 ký tự chữ hoa, số hoặc dấu gạch ngang');
  return store.transaction(async tx=>{
    const scope=await academyScope(tx,actorId);
    const [entry]=await tx.query(Prisma.sql`SELECT ce.id,ce.student_id,ce.batch_id,ce.selected_branch FROM course_enrollments ce WHERE ce.id=${enrollmentId}::uuid`);
    if(!entry)throw new ApiError(404,'Enrollment is unavailable');
    if(scope.branchId&&entry.batch_id){
      const [batch]=await tx.query(Prisma.sql`SELECT branch_id FROM course_batches WHERE id=${entry.batch_id}::uuid`);
      if(batch?.branch_id!==scope.branchId)throw new ApiError(403,'Enrollment belongs to another branch');
    }
    const [dup]=await tx.query(Prisma.sql`SELECT id FROM users WHERE to_jsonb(users)->>'student_code'=${code} AND id<>${entry.student_id}::uuid`);
    if(dup)throw new ApiError(409,'Mã học viên đã tồn tại trên hệ thống');
    const [col]=await tx.query(Prisma.sql`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='student_code') AS has_col`);
    if(!col?.has_col)throw new ApiError(400,'Cơ sở dữ liệu chưa cập nhật cột student_code');
    await tx.query(Prisma.sql`UPDATE users SET student_code=${code},updated_at=clock_timestamp() WHERE id=${entry.student_id}::uuid`);
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,new_data) VALUES(${actorId}::uuid,'MINIAPP_UPDATE_STUDENT_CODE','users',${entry.student_id}::uuid,${JSON.stringify({studentCode:code})}::jsonb) RETURNING id`);
    return {studentId:entry.student_id,studentCode:code};
  });
}

export async function addCandidateConsultationNote(store:Store,actorId:string,enrollmentId:string,rawNote:unknown){
  const note=typeof rawNote==='string'?rawNote.trim():'';
  if(!note||note.length>1000||note.includes('\0'))throw new ApiError(400,'Ghi chú tư vấn phải từ 1 đến 1000 ký tự');
  return store.transaction(async tx=>{
    const scope=await academyScope(tx,actorId);
    const [entry]=await tx.query(Prisma.sql`SELECT ce.id,ce.status,ce.batch_id,to_jsonb(ce)->'consultation_history' AS consultation_history FROM course_enrollments ce WHERE ce.id=${enrollmentId}::uuid FOR UPDATE`);
    if(!entry)throw new ApiError(404,'Enrollment is unavailable');
    if(scope.branchId&&entry.batch_id){
      const [batch]=await tx.query(Prisma.sql`SELECT branch_id FROM course_batches WHERE id=${entry.batch_id}::uuid`);
      if(batch?.branch_id!==scope.branchId)throw new ApiError(403,'Enrollment belongs to another branch');
    }
    const cols=await tx.query(Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='course_enrollments' AND column_name IN ('consultation_history','consultation_status')`);
    const colSet=new Set(cols.map(c=>String(c.column_name)));
    if(!colSet.has('consultation_history'))throw new ApiError(400,'Cơ sở dữ liệu chưa cập nhật cột consultation_history');
    let history:any[]=[];
    if(Array.isArray(entry.consultation_history))history=[...entry.consultation_history];
    else if(typeof entry.consultation_history==='string'){try{const parsed=JSON.parse(entry.consultation_history);if(Array.isArray(parsed))history=parsed;}catch{}}
    const [actor]=await tx.query(Prisma.sql`SELECT full_name FROM users WHERE id=${actorId}::uuid`);
    history.push({timestamp:new Date().toISOString(),author:actor?.full_name||'Nhân viên',note});
    const nextConsultStatus=history.length>3?'ARCHIVED':'PENDING_CONSULTATION';
    if(colSet.has('consultation_status')){
      await tx.query(Prisma.sql`UPDATE course_enrollments SET consultation_history=${JSON.stringify(history)}::jsonb,consultation_status=${nextConsultStatus} WHERE id=${enrollmentId}::uuid`);
    }else{
      await tx.query(Prisma.sql`UPDATE course_enrollments SET consultation_history=${JSON.stringify(history)}::jsonb WHERE id=${enrollmentId}::uuid`);
    }
    await tx.query(Prisma.sql`INSERT INTO audit_logs(actor_id,action,table_name,record_id,new_data) VALUES(${actorId}::uuid,'MINIAPP_ENROLLMENT_CONSULT','course_enrollments',${enrollmentId}::uuid,${JSON.stringify({note,count:history.length,consultationStatus:nextConsultStatus})}::jsonb) RETURNING id`);
    const effectiveStatus=entry.status==='CONSULTING'?(history.length>3?'ARCHIVED':'PENDING_CONSULTATION'):entry.status;
    return {id:enrollmentId,consultationHistory:history,consultationCount:history.length,status:effectiveStatus,latestConsultationSummary:note};
  });
}
