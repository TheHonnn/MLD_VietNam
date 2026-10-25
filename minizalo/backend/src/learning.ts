import {Prisma} from '@prisma/client';
import type {Store,Row} from './store.js';
import {ApiError} from './errors.js';
import {assertLessonMedia} from './lesson-media.js';

export const MAX_QUIZ_ATTEMPTS = 3;
export async function ownedEnrollment(store:Store,userId:string,courseId:string,enrollmentId:string|null,lock=false) {
  const [available]=await store.query(Prisma.sql`SELECT c.id FROM courses c JOIN course_categories cat ON cat.id=c.category_id WHERE c.id=${courseId}::uuid AND c.is_active AND cat.is_active`);
  if(!available) throw new ApiError(404,'Course is unavailable');
  const [entry]=await store.query(Prisma.sql`SELECT * FROM course_enrollments WHERE student_id=${userId}::uuid AND course_id=${courseId}::uuid
    AND (${enrollmentId}::uuid IS NULL OR id=${enrollmentId}::uuid) AND status IN ('ENROLLED','STUDYING','GRADUATED') ORDER BY enrolled_at DESC,id DESC LIMIT 1 ${lock?Prisma.sql`FOR UPDATE`:Prisma.empty}`);
  if(!entry) throw new ApiError(403,'Enrollment is required');
  const [access]=await store.query(Prisma.sql`SELECT expires_at,is_suspended,(expires_at IS NOT NULL AND expires_at<=clock_timestamp()) AS expired FROM miniapp_course_access WHERE enrollment_id=${entry.id}::uuid`);
  if(access?.is_suspended||access?.expired)throw new ApiError(403,'Course access has expired or is suspended',{code:'COURSE_ACCESS_EXPIRED'});
  entry.access_expires_at=access?.expires_at??null;
  return entry;
}
export const lessonQuizLinks = Prisma.sql`SELECT l.id AS lesson_id,COALESCE(link.quiz_id,
  CASE WHEN (SELECT count(*) FROM course_quizzes q WHERE q.course_id=ch.course_id)=1 AND
    (SELECT count(*) FROM course_lessons ql JOIN course_chapters qc ON qc.id=ql.chapter_id WHERE qc.course_id=ch.course_id AND ql.lesson_type='QUIZ')=1
    THEN (SELECT q.id FROM course_quizzes q WHERE q.course_id=ch.course_id LIMIT 1) END) AS quiz_id
  FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id LEFT JOIN miniapp_lesson_quizzes link ON link.lesson_id=l.id WHERE l.lesson_type='QUIZ'`;

export async function recomputeProgress(store:Store,enrollment:Row) {
  await store.query(Prisma.sql`UPDATE user_lesson_progress p SET is_completed=false,completed_at=NULL
    FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id WHERE p.lesson_id=l.id AND p.enrollment_id=${enrollment.id}::uuid
    AND ch.course_id=${enrollment.course_id}::uuid AND l.lesson_type='QUIZ'
    AND NOT EXISTS(SELECT 1 FROM (${lessonQuizLinks}) links JOIN quiz_submissions s ON s.quiz_id=links.quiz_id
      WHERE links.lesson_id=l.id AND s.enrollment_id=${enrollment.id}::uuid AND s.passed) RETURNING p.id`);
  await store.query(Prisma.sql`INSERT INTO user_lesson_progress(enrollment_id,lesson_id,is_completed,completed_at)
    SELECT ${enrollment.id}::uuid,links.lesson_id,true,CURRENT_TIMESTAMP FROM (${lessonQuizLinks}) links
      JOIN course_lessons l ON l.id=links.lesson_id JOIN course_chapters ch ON ch.id=l.chapter_id
      WHERE ch.course_id=${enrollment.course_id}::uuid AND EXISTS(SELECT 1 FROM quiz_submissions q WHERE q.enrollment_id=${enrollment.id}::uuid AND q.quiz_id=links.quiz_id AND q.passed)
    ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET is_completed=true,completed_at=COALESCE(user_lesson_progress.completed_at,EXCLUDED.completed_at) RETURNING id`);
  const [counts]=await store.query(Prisma.sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE CASE WHEN l.lesson_type='QUIZ' THEN
    EXISTS(SELECT 1 FROM (${lessonQuizLinks}) link JOIN quiz_submissions s ON s.quiz_id=link.quiz_id WHERE link.lesson_id=l.id AND s.enrollment_id=${enrollment.id}::uuid AND s.passed)
    ELSE COALESCE(p.is_completed,false) END)::int AS completed FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id
    LEFT JOIN user_lesson_progress p ON p.lesson_id=l.id AND p.enrollment_id=${enrollment.id}::uuid WHERE ch.course_id=${enrollment.course_id}::uuid`);
  await store.query(Prisma.sql`UPDATE course_enrollments SET completed_lessons_count=${counts.completed},progress_percent=${counts.total?Math.floor(counts.completed/counts.total*100):0} WHERE id=${enrollment.id}::uuid RETURNING id`);
}

const publicAttempt=(attempt:Row,maxAttempts:number)=>({id:attempt.id,quizId:attempt.quiz_id,enrollmentId:attempt.enrollment_id,startedAt:attempt.started_at,expiresAt:attempt.expires_at,submissionId:attempt.submission_id,maxAttempts,draftAnswers:attempt.draft_answers});
const publicQuestions=(questions:Row[])=>questions.map(({id,question_number,question_text,options})=>({id,question_number,question_text,options}));
function validateQuizConfiguration(quiz:Row,questions:Row[]) {
  const passing=Number(quiz.passing_score);
  if(!Number.isFinite(passing)||passing<0||passing>10)throw new ApiError(409,'Quiz passing score is not configured correctly');
  for(const question of questions){
    const options=question.options;
    if(!options||typeof options!=='object')throw new ApiError(409,'Quiz questions are not configured correctly');
    const entries=Array.isArray(options)?options.map((value,index)=>[String.fromCharCode(65+index),value]):Object.entries(options);
    if(typeof question.question_text!=='string'||!question.question_text.trim()||entries.length<2||entries.length>26
      ||entries.some(([key,value])=>!key.trim()||key.length>5||typeof value!=='string'||!value.trim())
      ||!entries.some(([key])=>key===question.correct_option))throw new ApiError(409,'Quiz questions are not configured correctly');
  }
}
export async function saveQuizDraft(store:Store,userId:string,courseId:string,attemptId:string,enrollmentId:string|null,answers:unknown) {
  return store.transaction(async tx=>{
    const enrollment=await ownedEnrollment(tx,userId,courseId,enrollmentId,true);
    const [attempt]=await tx.query(Prisma.sql`SELECT * FROM miniapp_quiz_attempts WHERE id=${attemptId}::uuid AND enrollment_id=${enrollment.id}::uuid AND submission_id IS NULL AND expires_at>clock_timestamp() FOR UPDATE`);
    if(!attempt) throw new ApiError(409,'Attempt expired or already submitted');
    if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length>attempt.questions.length) throw new ApiError(400,'Invalid answer draft');
    for(const [id,value] of Object.entries(answers)) {
      const question=attempt.questions.find((q:Row)=>q.id===id);
      const options=question&&(Array.isArray(question.options)?question.options.map((_:unknown,i:number)=>String.fromCharCode(65+i)):Object.keys(question.options||{}));
      if(!question||typeof value!=='string'||!options.includes(value)) throw new ApiError(400,'Invalid answer draft');
    }
    await tx.query(Prisma.sql`UPDATE miniapp_quiz_attempts SET draft_answers=${JSON.stringify(answers)}::jsonb WHERE id=${attemptId}::uuid RETURNING id`);
    return {saved:true};
  });
}
export async function startQuiz(store:Store,userId:string,courseId:string,quizId:string,enrollmentId:string|null) {
  return store.transaction(async tx=>{
    const enrollment=await ownedEnrollment(tx,userId,courseId,enrollmentId,true);
    const [quiz]=await tx.query(Prisma.sql`SELECT * FROM course_quizzes WHERE id=${quizId}::uuid AND course_id=${courseId}::uuid`);
    if(!quiz) throw new ApiError(404,'Quiz not found');
    const [limits]=await tx.query(Prisma.sql`SELECT max_attempts FROM miniapp_quiz_limits WHERE enrollment_id=${enrollment.id}::uuid AND quiz_id=${quizId}::uuid`);
    const maxAttempts=limits?.max_attempts??MAX_QUIZ_ATTEMPTS;
    let [attempt]=await tx.query(Prisma.sql`SELECT * FROM miniapp_quiz_attempts WHERE enrollment_id=${enrollment.id}::uuid AND quiz_id=${quizId}::uuid AND submission_id IS NULL AND expires_at>clock_timestamp() ORDER BY started_at DESC LIMIT 1`);
    if(!attempt) {
      const [{count}]=await tx.query(Prisma.sql`SELECT count(*)::int FROM miniapp_quiz_attempts WHERE enrollment_id=${enrollment.id}::uuid AND quiz_id=${quizId}::uuid`);
      if(count>=maxAttempts) throw new ApiError(409,'Đã hết lượt thi. Vui lòng liên hệ giảng viên.',{code:'ATTEMPTS_EXHAUSTED',maxAttempts});
      const questions=await tx.query(Prisma.sql`SELECT id,question_number,question_text,options,correct_option FROM quiz_questions WHERE quiz_id=${quizId}::uuid ORDER BY question_number,id`);
      if(!questions.length) throw new ApiError(409,'Quiz has no questions');
      if(!Number.isInteger(quiz.time_limit_minutes)||quiz.time_limit_minutes<=0) throw new ApiError(409,'Quiz duration is not configured');
      validateQuizConfiguration(quiz,questions);
      [attempt]=await tx.query(Prisma.sql`INSERT INTO miniapp_quiz_attempts(enrollment_id,quiz_id,expires_at,questions,passing_score)
        VALUES(${enrollment.id}::uuid,${quizId}::uuid,clock_timestamp()+${quiz.time_limit_minutes}*interval '1 minute',${JSON.stringify(questions)}::jsonb,${quiz.passing_score}) RETURNING *`);
    }
    const [{server_now}]=await tx.query(Prisma.sql`SELECT clock_timestamp() AS server_now`);
    return {serverNow:server_now,attempt:publicAttempt(attempt,maxAttempts),quiz:{...quiz,max_attempts:maxAttempts,passing_score:attempt.passing_score,questions:publicQuestions(attempt.questions)}};
  });
}

export async function submitAttempt(store:Store,userId:string,courseId:string,attemptId:string,enrollmentId:string|null,answers:unknown) {
  return store.transaction(async tx=>{
    const enrollment=await ownedEnrollment(tx,userId,courseId,enrollmentId,true);
    const [attempt]=await tx.query(Prisma.sql`SELECT * FROM miniapp_quiz_attempts WHERE id=${attemptId}::uuid AND enrollment_id=${enrollment.id}::uuid FOR UPDATE`);
    if(!attempt) throw new ApiError(404,'Attempt not found');
    if(attempt.submission_id) {
      const [submission]=await tx.query(Prisma.sql`SELECT * FROM quiz_submissions WHERE id=${attempt.submission_id}::uuid`);
      return {submission,score:Number(submission.score)*10,correctCount:submission.correct_count,totalQuestions:attempt.questions.length,isPassed:submission.passed,certificateCode:null};
    }
    if(new Date(attempt.expires_at).getTime()<=Date.now()) throw new ApiError(409,'Đã hết thời gian làm bài.',{code:'ATTEMPT_EXPIRED'});
    if(!answers||typeof answers!=='object'||Array.isArray(answers)) throw new ApiError(400,'Answers must be keyed by question UUID');
    const provided=answers as Record<string,unknown>,questions=attempt.questions as Row[],normalized:Record<string,string>={};
    if(Object.keys(provided).some(id=>!questions.some(q=>q.id===id))) throw new ApiError(400,'Answers contain a question outside this attempt');
    for(const q of questions) {
      const value=provided[q.id];
      const option=typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<26?String.fromCharCode(65+value):value;
      const allowed=Array.isArray(q.options)?q.options.map((_:unknown,i:number)=>String.fromCharCode(65+i)):Object.keys(q.options||{});
      if(typeof option!=='string'||!allowed.includes(option)) throw new ApiError(400,'Answer every question using an available option');
      normalized[q.id]=option;
    }
    const correct=questions.filter(q=>normalized[q.id]===q.correct_option).length;
    const score=new Prisma.Decimal(correct).div(questions.length).mul(10).toDecimalPlaces(2);
    const [submission]=await tx.query(Prisma.sql`INSERT INTO quiz_submissions(enrollment_id,quiz_id,score,correct_count,submitted_answers,passed)
      VALUES(${enrollment.id}::uuid,${attempt.quiz_id}::uuid,${score},${correct},${JSON.stringify(normalized)}::jsonb,${score.gte(attempt.passing_score)}) RETURNING *`);
    await tx.query(Prisma.sql`UPDATE miniapp_quiz_attempts SET submission_id=${submission.id}::uuid,submitted_at=clock_timestamp() WHERE id=${attemptId}::uuid RETURNING id`);
    await recomputeProgress(tx,enrollment);
    return {submission,score:score.mul(10),correctCount:correct,totalQuestions:questions.length,isPassed:submission.passed,certificateCode:null};
  });
}

function mergeRanges(ranges:number[][],duration:number) {
  const merged:number[][]=[];
  for(const [from,to] of ranges.filter(r=>r.length===2&&r.every(Number.isFinite)).map(([a,b])=>[Math.max(0,a),Math.min(duration,b)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])) {
    const last=merged[merged.length-1];
    if(last&&from<=last[1]+.25) last[1]=Math.max(last[1],to); else merged.push([from,to]);
  }
  return merged;
}
export async function startPlayback(store:Store,userId:string,courseId:string,lessonId:string,enrollmentId:string|null) {
  return store.transaction(async tx=>{
    await tx.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`learning-player:${userId}`}))::text AS locked`);
    const enrollment=await ownedEnrollment(tx,userId,courseId,enrollmentId,true);
    const [lesson]=await tx.query(Prisma.sql`SELECT l.*,policy.allow_public_embed,policy.media_url AS policy_media_url FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id LEFT JOIN miniapp_lesson_media_policy policy ON policy.lesson_id=l.id WHERE l.id=${lessonId}::uuid AND ch.course_id=${courseId}::uuid AND l.lesson_type='VIDEO'`);
    if(!lesson||!lesson.video_url||lesson.duration_minutes<=0) throw new ApiError(409,'Video duration or media is not configured');
    assertLessonMedia(lesson);
    // Keep the watched ranges; revoke only the old playback lease, not learning history.
    await tx.query(Prisma.sql`UPDATE miniapp_lesson_playbacks p SET expires_at=clock_timestamp() FROM course_enrollments ce
      WHERE ce.id=p.enrollment_id AND ce.student_id=${userId}::uuid AND p.expires_at>clock_timestamp() RETURNING p.id`);
    const [playback]=await tx.query(Prisma.sql`INSERT INTO miniapp_lesson_playbacks(enrollment_id,lesson_id,media_url,duration_seconds) VALUES(${enrollment.id}::uuid,${lessonId}::uuid,${lesson.video_url},${lesson.duration_minutes*60}) RETURNING id,duration_seconds`);
    return {playback};
  });
}
export async function heartbeat(store:Store,userId:string,courseId:string,lessonId:string,playbackId:string,enrollmentId:string|null,position:unknown) {
  if(typeof position!=='number'||!Number.isFinite(position)||position<0) throw new ApiError(400,'Invalid video position');
  return store.transaction(async tx=>{
    await tx.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`learning-player:${userId}`}))::text AS locked`);
    const enrollment=await ownedEnrollment(tx,userId,courseId,enrollmentId,true);
    const [playback]=await tx.query(Prisma.sql`SELECT p.*,l.video_url,l.duration_minutes,l.is_free_preview,policy.allow_public_embed,policy.media_url AS policy_media_url FROM miniapp_lesson_playbacks p JOIN course_lessons l ON l.id=p.lesson_id LEFT JOIN miniapp_lesson_media_policy policy ON policy.lesson_id=l.id
      WHERE p.id=${playbackId}::uuid AND p.lesson_id=${lessonId}::uuid AND p.enrollment_id=${enrollment.id}::uuid AND p.expires_at>clock_timestamp() FOR UPDATE OF p`);
    if(!playback||playback.media_url!==playback.video_url||playback.duration_seconds!==playback.duration_minutes*60) throw new ApiError(409,'Video session expired, replaced on another device or media changed',{code:'VIDEO_SESSION_EXPIRED'});
    assertLessonMedia(playback);
    const elapsed=Math.max(0,(Date.now()-new Date(playback.last_seen_at).getTime())/1000);
    if(elapsed<.5) throw new ApiError(429,'Video heartbeat is too frequent');
    const delta=position-playback.last_position;
    const ranges=playback.covered_ranges as number[][];
    if(delta>0&&delta<=Math.min(elapsed,15)*2+.05&&position<=playback.duration_seconds+1) ranges.push([playback.last_position,position]);
    const merged=mergeRanges(ranges,playback.duration_seconds);
    await tx.query(Prisma.sql`UPDATE miniapp_lesson_playbacks SET covered_ranges=${JSON.stringify(merged)}::jsonb,last_position=${position},last_seen_at=clock_timestamp() WHERE id=${playbackId}::uuid RETURNING id`);
    const sessions=await tx.query(Prisma.sql`SELECT covered_ranges FROM miniapp_lesson_playbacks WHERE enrollment_id=${enrollment.id}::uuid AND lesson_id=${lessonId}::uuid AND media_url=${playback.media_url} AND duration_seconds=${playback.duration_seconds}`);
    const total=mergeRanges(sessions.flatMap(p=>p.covered_ranges),playback.duration_seconds).reduce((sum,[a,b])=>sum+b-a,0);
    const completed=total>=playback.duration_seconds*.95;
    const [progress]=await tx.query(Prisma.sql`INSERT INTO user_lesson_progress(enrollment_id,lesson_id,watched_seconds,is_completed,completed_at)
      VALUES(${enrollment.id}::uuid,${lessonId}::uuid,${Math.floor(total)},${completed},CASE WHEN ${completed} THEN clock_timestamp() END)
      ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET watched_seconds=EXCLUDED.watched_seconds,is_completed=user_lesson_progress.is_completed OR EXCLUDED.is_completed,completed_at=COALESCE(user_lesson_progress.completed_at,EXCLUDED.completed_at) RETURNING *`);
    await recomputeProgress(tx,enrollment);
    return {progress};
  });
}
