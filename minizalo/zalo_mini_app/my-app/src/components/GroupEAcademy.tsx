import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QuizTimer } from './QuizTimer';
import { useBackAction } from '@/hooks/useNavigationHistory';
import { events, EventName } from 'zmp-sdk';
import { apiClient } from '@/api/client';
import type { Branch, Course, CourseAudience, User } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, FileTextIcon, PlayCircleIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import {AcademyCertificates} from './AcademyCertificates';
import {YouTubeLessonPlayer} from './YouTubeLessonPlayer';
import type {LessonPlayerHandle} from './YouTubeLessonPlayer';
import { AcademyHome, AcademyCatalog, AcademyCourseDetail, AcademyInstructor, AcademyRegistration, AcademyRegistrationStatus, AcademyMyCourses, AcademyClassSummary, AcademyHeader, AcademyFooter } from './AcademyViews';
import type { AcademyEnrollment } from './AcademyViews';
import '@/css/academy.scss';

interface GroupEAcademyProps {
  courses: Course[];
  userId: string;
  user?: User;
  branches?: Branch[];
  onOpenNotifications?: () => void;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onRequireLogin: () => void;
  onOpenBooking?: () => void;
  mode?: 'catalog' | 'learning';
  initialCourseId?: string;
  catalogSearch?: { query: string; id: number };
  notificationTarget?: {id:string; enrollmentId:string; tab:string; quizId?:string;certificateId?:string};
  onBusyChange?: (busy:boolean) => void;
}

type Lesson = Course['lessons'][number] & {
  chapterId?: string; lessonType?: string; contentText?: string; learningGoals?: string[];
  attachments?: unknown[]; watchedSeconds?: number; studentNotes?: string; isFreePreview?: boolean;
  quizId?:string|null;
};
// These fields are returned by the shared learning endpoint and preserved by the adapter.
type QuizSubmission = { id: string; score: number; correctCount: number; passed: boolean; submittedAt: string; quizId: string; submittedAnswers?: Record<string,string|number>; instructorFeedback?: string | null; questions?: NonNullable<Course['quiz']>['questions'] };
type AcademyCourse = Omit<Course, 'lessons' | 'quizSubmissions'> & {
  accessExpiresAt?: string|null;
  lessons: Lesson[];
  quizSubmissions?: QuizSubmission[];
  chapters?: { id: string; title: string; description?: string }[];
  instructorProfile?: { fullName: string; title?: string; avatarUrl?: string; bio?: string; experienceYears?: number; achievements?: string[] };
  batches?: { id: string; batchCode: string; branchName?: string; instructorName?: string; startDate: string; endDate: string; scheduleText: string; status: string }[];
  schedules?: { id: string; sessionDate: string; startTime: string; endTime: string; topic: string; roomName?: string; instructorName?: string; attendanceStatus?: string }[];
  academicRecord?: { theoryScore: number; practicalScore: number; attendanceRate: number; attendedSessions: number; totalBatchSessions: number; isGraduated: boolean; feedbackTheory?: string; feedbackPractical?: string; feedbackAttendance?: string; feedbackAttitude?: string };
  certificate?: { status: string; certificateCode: string; studentName: string; studentDateOfBirth?:string|null; courseTitle: string; issueDate: string; finalGrade: string; certificatePdfUrl?: string; qrVerificationCode?: string };
};
type Tab = 'catalog' | 'my_courses' | 'content' | 'schedule' | 'documents' | 'exam' | 'results' | 'certificates';
type ProgressSave='saved'|'retry'|'blocked';
type QuizResult = { courseId: string; score: number; correctCount: number; totalQuestions: number; isPassed: boolean };
type PendingQuizSubmission = {courseId:string;enrollmentId:string;quizId:string;attemptId:string;answers:Record<string,string>};
// Pending receipts must survive component unmounts even when WebView storage is full.
const pendingQuizReceipts = new Map<string, PendingQuizSubmission>();
const accessible = (status: string) => ['enrolled', 'studying', 'graduated'].includes(status.toLowerCase());
const isReadingLesson = (lesson: Lesson) => ['TEXT', 'PDF', 'READING_DOC', 'PRACTICE_GUIDE'].includes(lesson.lessonType?.toUpperCase() || '');
const statusLabel = (status: string) => ({ consulting: 'Chờ tư vấn', deposited: 'Đã đặt cọc', enrolled: 'Đã ghi danh', studying: 'Đang học', graduated: 'Đã tốt nghiệp', dropped: 'Đã ngừng học' }[status.toLowerCase()] || status);
const attendanceLabel = (value?: string) => ({PRESENT:'Có mặt',ABSENT:'Vắng mặt',LATE:'Đi muộn',EXCUSED:'Vắng có phép'}[value || ''] || value || '');
const date = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};
const safeUrl = (value?: string) => {
  try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
};
const displayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const item = value as { title?: unknown; text?: unknown; description?: unknown };
  const text = item.title ?? item.text ?? item.description;
  return typeof text === 'string' ? text : '';
};
const buttonClass = 'min-h-10 rounded-[8px] border border-[#D5DAD7] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50';
const Empty = ({ children }: { children?: React.ReactNode }) => children ? <p className="py-4 text-xs text-[#66736C]">{children}</p> : null;

export const GroupEAcademy: React.FC<GroupEAcademyProps> = ({ courses, userId, user, branches = [], onOpenNotifications, loading, error, onRefresh, onRequireLogin, mode = 'catalog', initialCourseId, catalogSearch, notificationTarget,onBusyChange }) => {
  const [tab, setTab] = useState<Tab>(initialCourseId ? 'catalog' : mode === 'learning' ? 'my_courses' : 'catalog');
  const [selectedId, setSelectedId] = useState<string | null>(initialCourseId || null);
  const [catalogView, setCatalogView] = useState<'home'|'catalog'|'course'|'instructor'|'registration'|'payment'>(initialCourseId?'course':'catalog');
  const [branchId, setBranchId] = useState('');
  const [catalogAudience,setCatalogAudience]=useState<CourseAudience|''>('');
  const [batchId, setBatchId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [paymentEnrollmentId, setPaymentEnrollmentId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>(() => userId ? apiClient.peek('/course-enrollments')?.enrollments || [] : []);
  const [enrollmentLoading, setEnrollmentLoading] = useState(() => Boolean(userId && !apiClient.peek('/course-enrollments')));
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrollmentAuthRequired, setEnrollmentAuthRequired] = useState(false);
  const [enrollmentVersion, setEnrollmentVersion] = useState(0);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [studyId, setStudyId] = useState('');
  const [learning, setLearning] = useState<AcademyCourse | null>(null);
  const [learningEnrollmentId, setLearningEnrollmentId] = useState('');
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningError, setLearningError] = useState('');
  const [learningVersion, setLearningVersion] = useState(0);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [playbackReady,setPlaybackReady]=useState(false);
  const [notes, setNotes] = useState('');
  const latestNotes=useRef(notes);latestNotes.current=notes;
  const persistedNotes=useRef('');
  const noteKey = (courseId:string,enrollmentId:string,lessonId:string) => `mld_lesson_notes:${userId}:${courseId}:${enrollmentId}:${lessonId}`;
  const pendingNoteSave = useRef<() => Promise<ProgressSave>>(async () => 'saved');
  const [lessonExitBlocked,setLessonExitBlocked]=useState(false);
  const [draftStorageFailed,setDraftStorageFailed]=useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizId, setQuizId] = useState('');
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [pendingSubmission,setPendingSubmission]=useState<PendingQuizSubmission|null>(null);
  const pendingSubmissionRef=useRef<PendingQuizSubmission|null>(null);
  const pendingKey=(entry:Pick<PendingQuizSubmission,'courseId'|'enrollmentId'|'quizId'>)=>`mld_quiz_pending:${userId}:${entry.courseId}:${entry.enrollmentId}:${entry.quizId}`;
  const readPending=(scope:Pick<PendingQuizSubmission,'courseId'|'enrollmentId'|'quizId'>):PendingQuizSubmission|null=>{
    const key=pendingKey(scope),memory=pendingQuizReceipts.get(key);
    if(memory)return memory;
    for(const storage of ['localStorage','sessionStorage'] as const)try{
      const entry=JSON.parse(window[storage].getItem(key)||'null');
      if(entry?.courseId===scope.courseId&&entry.enrollmentId===scope.enrollmentId&&entry.quizId===scope.quizId
        &&typeof entry.attemptId==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(entry.attemptId)
        &&entry.answers&&typeof entry.answers==='object'&&!Array.isArray(entry.answers)&&Object.values(entry.answers).every(value=>typeof value==='string')){
          pendingQuizReceipts.set(key,entry);return entry;
        }
    }catch{/* Restricted or corrupt storage cannot supply a pending submission. */}
    return null;
  };
  const rememberPending=(entry:PendingQuizSubmission)=>{
    pendingSubmissionRef.current=entry;setPendingSubmission(entry);
    const key=pendingKey(entry);pendingQuizReceipts.set(key,entry);
    for(const storage of ['localStorage','sessionStorage'] as const)try{window[storage].setItem(key,JSON.stringify(entry));}catch{/* Account-scoped memory survives tab switches if both stores are unavailable. */}
  };
  const clearPending=(entry:PendingQuizSubmission)=>{
    if(pendingSubmissionRef.current?.attemptId===entry.attemptId){pendingSubmissionRef.current=null;setPendingSubmission(null);}
    const key=pendingKey(entry);
    if(pendingQuizReceipts.get(key)?.attemptId===entry.attemptId)pendingQuizReceipts.delete(key);
    for(const storage of ['localStorage','sessionStorage'] as const)try{
      if(JSON.parse(window[storage].getItem(key)||'null')?.attemptId===entry.attemptId)window[storage].removeItem(key);
    }catch{}
  };
  const [quizAttempt,setQuizAttempt]=useState<{id:string;quizId:string;enrollmentId:string;expiresAt:string}|null>(null);
  const [attemptBusy,setAttemptBusy]=useState(false);
  const [quizExpired,setQuizExpired]=useState(false);
  const expireQuiz = useCallback(() => setQuizExpired(true), []);
  const quizRequest = useRef(0);
  const attemptLock = useRef(false);
  const selectedQuizScope = useRef('');
  const quizDeadline=useRef(0);
  const draftQueue=useRef(Promise.resolve());
  const draftRevision=useRef(0);
  const [draftFeedback,setDraftFeedback]=useState<{scope:string;attemptId:string;message:string}|null>(null);
  const submittedAttempts=useRef(new Set<string>());
  const draftKey=(attemptId:string)=>`mld_quiz_draft:${userId}:${attemptId}`;
  const chooseAnswer=(questionId:string,value:string)=>{
    if(!quizAttempt||!activeCourseId||quizSubmitting||pendingSubmissionRef.current?.attemptId===quizAttempt.id||performance.now()>=quizDeadline.current)return;
    const next={...answers,[questionId]:value},attemptId=quizAttempt.id,courseId=activeCourseId,enrollmentId=activeEnrollmentId,scope=selectedQuizScope.current,request=quizRequest.current,revision=++draftRevision.current;
    let draftStored=false;
    try{localStorage.setItem(draftKey(attemptId),JSON.stringify(next));draftStored=true;}catch{/* The server save still runs with restricted storage. */}
    const canReport=()=>draftRevision.current===revision&&quizRequest.current===request&&selectedQuizScope.current===scope&&!quizLock.current&&!submittedAttempts.current.has(attemptId);
    setAnswers(next);setDraftFeedback(null);
    draftQueue.current=draftQueue.current.then(async()=>{
      if(submittedAttempts.current.has(attemptId))return;
      const result=await apiClient.saveQuizDraft(courseId,attemptId,enrollmentId,next);
      if(canReport())setDraftFeedback(result?.error?{scope,attemptId,message:result.error}:null);
      if(!result?.error)try{if(localStorage.getItem(draftKey(attemptId))===JSON.stringify(next))localStorage.removeItem(draftKey(attemptId));}catch{}
    }).catch(()=>{if(canReport())setDraftFeedback({scope,attemptId,message:draftStored?'Chưa đồng bộ đáp án. Bản nháp được giữ trên thiết bị.':'Chưa lưu được đáp án. Vui lòng kiểm tra kết nối và thử lại.'});});
  };
  const playback=useRef<{id:string;lessonId:string;enrollmentId:string;courseId:string}|null>(null);
  const heartbeatPending=useRef<Promise<boolean>|null>(null);
  const lastHeartbeat=useRef(0);
  const playbackGeneration=useRef(0);
  const registrationLock = useRef(false);
  const quizLock = useRef(false);
  const progressLock = useRef(false);
  const progressCompletion=useRef<Promise<void>|null>(null);
  const watched = useRef(0);
  const lastPlaybackTime = useRef<number | null>(null);
  const videoRef = useRef<LessonPlayerHandle|null>(null);
  const closingLesson = useRef(false);
  const activeScope = useRef('');
  const openedNotification = useRef('');
  const enrollmentOwner=useRef(userId);

  useEffect(() => {
    if (!catalogSearch || mode !== 'catalog' || initialCourseId) return;
    setTab('catalog'); setCatalogView('catalog'); setSelectedId(null); setBranchId(''); setInstructorId('');
  }, [catalogSearch, mode, initialCourseId]);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedId(initialCourseId);
      setCatalogView('course');
      setTab('catalog');
      setLessonId(null);
      setActionError('');
      setNotice('');
    } else setTab(mode === 'learning' ? 'my_courses' : 'catalog');
  }, [mode, initialCourseId]);
  useEffect(() => {
    let cancelled = false;
    const cached = userId ? apiClient.peek('/course-enrollments') : null;
    const ownerChanged=enrollmentOwner.current!==userId;
    enrollmentOwner.current=userId;
    if(cached||ownerChanged||!userId)setEnrollments(cached?.enrollments||[]);
    setEnrollmentLoading(Boolean(userId && !cached));
    setEnrollmentError('');
    setEnrollmentAuthRequired(false);
    if (!userId) return;
    apiClient.getCourseEnrollments().then(response => {
      if (cancelled) return;
      if (response?.status === 401) setEnrollmentAuthRequired(true);
      else if (response?.error || !Array.isArray(response?.enrollments)) setEnrollmentError(response?.error || 'Không thể tải đăng ký học.');
      else setEnrollments(response.enrollments);
    }).catch(() => { if (!cancelled) setEnrollmentError('Không thể tải đăng ký học.'); })
      .then(() => { if (!cancelled) setEnrollmentLoading(false); });
    return () => { cancelled = true; };
  }, [userId, enrollmentVersion]);

  const eligible = enrollments.filter(item => accessible(item.status));
  useEffect(() => {
    if (!notificationTarget || openedNotification.current === notificationTarget.id) return;
    if(notificationTarget.tab==='certificates'){openedNotification.current=notificationTarget.id;setTab('certificates');setLessonId(null);return;}
    const entry = enrollments.find(item => item.id === notificationTarget.enrollmentId);
    if (!entry) return;
    openedNotification.current = notificationTarget.id;
    if (!accessible(entry.status) || notificationTarget.tab === 'payment') {
      setPaymentEnrollmentId(entry.id); setTab('catalog'); setCatalogView('payment'); setSelectedId(entry.courseId);
    } else {
      setStudyId(entry.id);
      setTab((['content','schedule','exam','results'].includes(notificationTarget.tab) ? notificationTarget.tab : 'content') as Tab);
      if (notificationTarget.quizId) setQuizId(notificationTarget.quizId);
    }
  }, [notificationTarget, enrollments]);
  const studyEnrollment = eligible.find(item => item.id === studyId) || eligible[0];
  const activeCourseId = studyEnrollment?.courseId;
  const activeEnrollmentId = studyEnrollment?.id;
  activeScope.current = `${activeCourseId || ''}/${activeEnrollmentId || ''}`;
  const loadedStudy = learning?.id === activeCourseId && learningEnrollmentId === activeEnrollmentId ? learning : null;
  const quizzes = loadedStudy?.quizzes ?? (loadedStudy?.quiz ? [loadedStudy.quiz] : []);
  const study = loadedStudy ? { ...loadedStudy, quiz: quizzes.find(quiz => quiz.id === quizId) || quizzes[0] } : null;
  const selected = courses.find(course => course.id === selectedId) as AcademyCourse | undefined;
  const activeLesson = tab!=='catalog'?study?.lessons.find(lesson => lesson.id === lessonId):undefined;
  const previewLesson = selected?.lessons.find(lesson => lesson.id === lessonId && lesson.isFreePreview === true);
  const lesson = activeLesson || previewLesson;
  selectedQuizScope.current = `${activeScope.current}/${study?.quiz?.id || ''}`;
  const attemptExpired=quizExpired||Boolean(quizAttempt&&performance.now()>=quizDeadline.current);
  const attemptActive=Boolean(quizAttempt&&quizAttempt.quizId===study?.quiz?.id&&quizAttempt.enrollmentId===activeEnrollmentId&&!attemptExpired&&!quizResult);
  const pendingForQuiz=pendingSubmission?.courseId===activeCourseId&&pendingSubmission?.enrollmentId===activeEnrollmentId&&pendingSubmission?.quizId===study?.quiz?.id?pendingSubmission:null;
  useEffect(()=>{
    const entry=activeCourseId&&activeEnrollmentId&&study?.quiz?.id?readPending({courseId:activeCourseId,enrollmentId:activeEnrollmentId,quizId:study.quiz.id}):null;
    pendingSubmissionRef.current=entry;setPendingSubmission(entry);
  },[userId,activeCourseId,activeEnrollmentId,study?.quiz?.id]);
  const quizDraftError=tab==='exam'&&attemptActive&&!quizSubmitting&&draftFeedback?.scope===selectedQuizScope.current&&draftFeedback.attemptId===quizAttempt?.id?draftFeedback.message:'';
  const learningActionBusy=attemptBusy||quizSubmitting||progressSaving;
  const navigationBusy=learningActionBusy||registering;
  useEffect(()=>{onBusyChange?.(navigationBusy);return()=>onBusyChange?.(false);},[navigationBusy,onBusyChange]);
  useEffect(() => () => { quizRequest.current++; }, []);
  const beginQuiz=async()=>{
    if(!study?.quiz||attemptLock.current||quizLock.current) return;
    const previous=pendingForQuiz||readPending({courseId:study.id,enrollmentId:activeEnrollmentId||'',quizId:study.quiz.id});
    if(previous){rememberPending(previous);await sendQuizSubmission(previous);return;}
    const scope=selectedQuizScope.current,request=++quizRequest.current;
    attemptLock.current=true;
    setAttemptBusy(true);setActionError('');
    try {
      const sentAt=performance.now();
      const result=await apiClient.startQuiz(study.id,study.quiz.id,activeEnrollmentId);
      if(selectedQuizScope.current!==scope||quizRequest.current!==request)return;
      if(result?.error||!result?.attempt||!result?.quiz)throw new Error(result?.error||'Không thể bắt đầu bài kiểm tra.');
      if(!Number.isFinite(Date.parse(result.serverNow)))throw new Error('Không thể đồng bộ thời gian bài thi.');
      quizDeadline.current=performance.now()+Math.max(0,Date.parse(result.attempt.expiresAt)-Date.parse(result.serverNow)-(performance.now()-sentAt));
      setQuizAttempt(result.attempt);setQuizExpired(quizDeadline.current<=performance.now());
      let restored=result.attempt.draftAnswers||{};
      try{
        const local=JSON.parse(localStorage.getItem(draftKey(result.attempt.id))||'null');
        if(local&&typeof local==='object'&&!Array.isArray(local))restored=Object.fromEntries(Object.entries(local).filter(([id,value])=>result.quiz.questions.some((q:any)=>q.id===id&&(q.optionKeys||[]).includes(value))));
      }catch{/* Malformed device drafts never replace canonical questions. */}
      setAnswers(restored);setQuizResult(null);
      setLearning(current=>current?{...current,quizzes:(current.quizzes||[]).map(quiz=>quiz.id===result.quiz.id?result.quiz:quiz)}:current);
    }catch(failure){if(selectedQuizScope.current===scope&&quizRequest.current===request)setActionError(failure instanceof Error?failure.message:'Không thể bắt đầu bài kiểm tra.');}
    finally{if(quizRequest.current===request){attemptLock.current=false;setAttemptBusy(false);}}
  };
  const flushHeartbeat=async()=>{
    if(heartbeatPending.current)return heartbeatPending.current;
    const session=playback.current,video=videoRef.current;
    if(!session||!video||performance.now()-lastHeartbeat.current<600)return true;
    const position=video.currentTime;lastHeartbeat.current=performance.now();
    const pending=(async()=>{
      try{
        const result=await apiClient.videoHeartbeat(session.courseId,session.lessonId,session.enrollmentId,session.id,position);
        if(activeScope.current!==`${session.courseId}/${session.enrollmentId}`||playback.current?.id!==session.id)return false;
        if(result?.error){
          setActionError(result.error);
          if(result.code==='COURSE_ACCESS_EXPIRED'){videoRef.current?.pause();playback.current=null;setLessonId(null);setLearning(null);setLearningError('Quyền truy cập khóa học đã hết hạn hoặc tạm dừng.');}
          else if(result.code==='VIDEO_SESSION_EXPIRED'){videoRef.current?.pause();playback.current=null;setLessonId(null);setActionError('Phiên xem đã hết hạn hoặc đã mở video trên thiết bị khác. Vui lòng mở lại bài học.');}
          else if(['YOUTUBE_NOT_APPROVED','INVALID_VIDEO_SOURCE'].includes(result.code)){videoRef.current?.pause();playback.current=null;setLessonId(null);setNotice('Quyền phát video đã thay đổi. Vui lòng mở lại bài học.');setLearningVersion(value=>value+1);}
          else videoRef.current?.pause();
          return false;
        }
        if(result?.progress)setLearning(current=>current?{...current,lessons:current.lessons.map(item=>item.id===session.lessonId?{
          ...item,watchedSeconds:result.progress.watchedSeconds,isCompleted:result.progress.isCompleted===true,
        }:item)}:current);
        return true;
      }catch{if(playback.current?.id===session.id){videoRef.current?.pause();setActionError('Không thể lưu tiến độ video. Vui lòng thử lại.');}return false;}
    })();
    heartbeatPending.current=pending;
    try{return await pending;}finally{if(heartbeatPending.current===pending)heartbeatPending.current=null;}
  };
  useEffect(()=>{const timer=window.setInterval(()=>{if(videoRef.current&&!videoRef.current.paused)void flushHeartbeat();},10000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!learning?.accessExpiresAt)return;
    const expiry=Date.parse(learning.accessExpiresAt);
    const check=()=>{
      if(Date.now()<expiry)return;
      videoRef.current?.pause();playback.current=null;setLessonId(null);setLearning(null);setLearningError('Quyền truy cập khóa học đã hết hạn.');setEnrollmentVersion(value=>value+1);
    };
    check();const timer=window.setInterval(check,1000);
    return()=>clearInterval(timer);
  },[learning?.accessExpiresAt]);

  useEffect(() => {
    let cancelled = false;
    const cached = tab!=='certificates'&&activeCourseId && activeEnrollmentId ? apiClient.peek(`/courses/${encodeURIComponent(activeCourseId)}/learning?enrollmentId=${encodeURIComponent(activeEnrollmentId)}`) : null;
    setLearning(cached?.course || null);
    setLearningEnrollmentId(cached ? activeEnrollmentId || '' : '');
    setLearningError('');
    setLessonId(null);
    setActionError('');
    setLearningLoading(Boolean(activeCourseId && !cached));
    if (!activeCourseId||tab==='certificates') {setLearningLoading(false);return;}
    apiClient.getCourseLearning(activeCourseId, activeEnrollmentId).then(response => {
      if (cancelled) return;
      if (response?.status === 401) { setEnrollmentAuthRequired(true); setEnrollments([]); }
      else if (response?.error || response?.course?.id !== activeCourseId) setLearningError(response?.error || 'Không thể tải nội dung học.');
      else { setLearning(response.course); setLearningEnrollmentId(activeEnrollmentId || ''); }
    }).catch(() => { if (!cancelled) setLearningError('Không thể tải nội dung học.'); })
      .then(() => { if (!cancelled) setLearningLoading(false); });
    return () => { cancelled = true; };
  }, [activeCourseId, activeEnrollmentId, learningVersion,tab==='certificates']);
  useEffect(()=>{setQuizAttempt(null);setQuizResult(null);setAnswers({});},[activeCourseId,activeEnrollmentId,quizId]);

  const openLesson = (item: Lesson) => {
    if(attemptLock.current||quizLock.current||progressLock.current||closingLesson.current)return;
    setLessonExitBlocked(false);setDraftStorageFailed(false);
    const ownedLesson=Boolean(tab!=='catalog'&&study?.lessons.some(lesson=>lesson.id===item.id)&&activeEnrollmentId);
    if (item.lessonType === 'QUIZ' && ownedLesson) {
      if(!item.quizId){setActionError('Bài học chưa được liên kết với bài kiểm tra. Vui lòng liên hệ giảng viên.');return;}
      setQuizId(item.quizId);setQuizAttempt(null);setQuizResult(null);setAnswers({});setTab('exam');setLessonId(null);setActionError('');setNotice('');return;
    }
    setActionError(''); setNotice('');
    watched.current = Number(item.watchedSeconds) || 0;
    lastPlaybackTime.current = null;
    let savedNotes = item.studentNotes || '';
    persistedNotes.current=savedNotes;
    if(ownedLesson && study && activeEnrollmentId)try {
      const draft=JSON.parse(localStorage.getItem(noteKey(study.id,activeEnrollmentId,item.id)) || 'null');
      if(typeof draft==='string')savedNotes=draft;
    }catch{/* Server notes remain available with restricted storage. */}
    setNotes(savedNotes);
    setLessonId(item.id);
    setPlaybackReady(false);
    playback.current=null;
    const generation=++playbackGeneration.current;
    if(item.lessonType==='VIDEO'&&!item.mediaErrorCode&&ownedLesson&&study&&activeEnrollmentId) {
      const scope=activeScope.current;
      void apiClient.startPlayback(study.id,item.id,activeEnrollmentId).then(result=>{
        if(activeScope.current!==scope||playbackGeneration.current!==generation)return;
        if(result?.error||!result?.playback){setActionError(result?.error||'Không thể lưu phiên xem video.');return;}
        playback.current={id:result.playback.id,lessonId:item.id,enrollmentId:activeEnrollmentId,courseId:study.id};lastHeartbeat.current=performance.now();setPlaybackReady(true);
      });
    }
  };
  const saveProgress = async (completed = false, studentNotes?: string):Promise<ProgressSave> => {
    if (!study || !activeLesson) return 'blocked';
    if(progressLock.current)return 'retry';
    if(studentNotes!==undefined&&studentNotes.length>10000){setActionError('Ghi chú tối đa 10.000 ký tự.');return 'blocked';}
    const courseId = study.id, savedLessonId = activeLesson.id;
    const scope = activeScope.current;
    let finish!:()=>void;
    const completion=new Promise<void>(resolve=>{finish=resolve;});
    progressCompletion.current=completion;
    progressLock.current = true; setProgressSaving(true); setActionError('');
    try {
      const response = await apiClient.saveLessonProgress(courseId, savedLessonId, {
        enrollmentId: activeEnrollmentId,
        watchedSeconds: Math.floor(watched.current), ...(completed ? { isCompleted: true } : {}),
        ...(studentNotes !== undefined ? { studentNotes } : {}),
      });
      if (!response || response.error || !response.progress){
        if(activeScope.current===scope)setActionError(response?.error||'Không thể lưu tiến trình học.');
        return !response?.status||response.status===429||response.status>=500?'retry':'blocked';
      }
      const progress = response.progress;
      if (activeScope.current !== scope) return 'blocked';
      persistedNotes.current=progress.studentNotes||'';
      if(studentNotes!==undefined)try {
        const key=noteKey(courseId,activeEnrollmentId || '',savedLessonId);
        if(localStorage.getItem(key)===JSON.stringify(studentNotes))localStorage.removeItem(key);
      }catch{}
      setLearning(current => current?.id === courseId ? { ...current, lessons: current.lessons.map(item => item.id === savedLessonId ? {
        ...item, watchedSeconds: progress.watchedSeconds, isCompleted: progress.isCompleted, studentNotes: progress.studentNotes,
      } : item) } : current);
      if (response.enrollment) setEnrollments(current => current.map(item => item.id === response.enrollment.id ? response.enrollment : item));
      else setEnrollmentVersion(value => value + 1);
      setNotice(completed && isReadingLesson(activeLesson) && progress.isCompleted ? 'Đã ghi nhận xác nhận đã đọc.' : 'Đã lưu tiến trình học.');
      return 'saved';
    } catch (error) { if (activeScope.current === scope) setActionError(error instanceof Error ? error.message : 'Không thể lưu tiến trình học.'); return 'retry'; }
    finally { progressLock.current = false;if(progressCompletion.current===completion)progressCompletion.current=null;finish();setProgressSaving(false); }
  };
  pendingNoteSave.current=()=>saveProgress(false,notes);
  useEffect(() => {
    if(!activeLesson || notes===(activeLesson.studentNotes || ''))return;
    let cancelled=false,timer:number;
    const save=async()=>{
      const saved=await pendingNoteSave.current();
      if(saved==='retry'&&!cancelled)timer=window.setTimeout(()=>void save(),3000);
    };
    timer=window.setTimeout(()=>void save(),800);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[notes,activeLesson?.id,activeLesson?.studentNotes,activeCourseId,activeEnrollmentId]);
  const closeLesson = async () => {
    if (closingLesson.current || progressLock.current) return;
    closingLesson.current=true;
    videoRef.current?.pause();
    try {
      if (!await flushHeartbeat()){setLessonExitBlocked(true);return;}
      if (!activeLesson || await saveProgress(false,notes)==='saved') {
        playbackGeneration.current++; playback.current=null; setLessonId(null);
        setLessonExitBlocked(false);
      }else setLessonExitBlocked(true);
    } finally { closingLesson.current=false; }
  };
  const leaveLessonWithDraft=async(discard=false)=>{
    if(closingLesson.current)return;
    const scope=activeScope.current,generation=playbackGeneration.current;
    closingLesson.current=true;
    try {
      await progressCompletion.current;
      if(scope!==activeScope.current||generation!==playbackGeneration.current)return;
      if(discard&&study&&activeLesson&&activeEnrollmentId)try{localStorage.removeItem(noteKey(study.id,activeEnrollmentId,activeLesson.id));}catch{/* Restricted storage cannot supply this draft on reopen either. */}
      if(!discard&&study&&activeLesson&&activeEnrollmentId&&latestNotes.current!==persistedNotes.current){
        try{localStorage.setItem(noteKey(study.id,activeEnrollmentId,activeLesson.id),JSON.stringify(latestNotes.current));}
        catch{setDraftStorageFailed(true);setActionError('Thiết bị không giữ được bản nháp. Ghi chú chưa được lưu lên hệ thống.');return;}
      }
      videoRef.current?.pause();playbackGeneration.current++;playback.current=null;setLessonId(null);setLessonExitBlocked(false);
    } finally {closingLesson.current=false;}
  };
  useBackAction(Boolean(lesson) || tab !== 'catalog' || catalogView !== 'catalog', () => {
    if (lesson) { if(lessonExitBlocked)leaveLessonWithDraft();else void closeLesson();return; }
    if (registering || quizSubmitting || attemptBusy || progressSaving) return;
    if (tab !== 'catalog') { setTab(tab==='my_courses'?'catalog':'my_courses'); return; }
    if (catalogView === 'registration' || catalogView === 'instructor' || catalogView === 'payment') { setCatalogView('course'); return; }
    if (catalogView === 'course') { setCatalogView('catalog');setSelectedId(null); return; }
    setCatalogView('catalog');
  });
  useEffect(() => {
    const pauseVideo = () => { videoRef.current?.pause(); lastPlaybackTime.current=null; };
    const pause = () => { if(document.hidden)pauseVideo(); };
    document.addEventListener('visibilitychange',pause);
    events.on(EventName.AppPaused,pauseVideo);
    return () => { events.off(EventName.AppPaused,pauseVideo);document.removeEventListener('visibilitychange',pause);videoRef.current?.pause();playbackGeneration.current++; };
  }, []);
  const register = async () => {
    if (!userId || enrollmentAuthRequired) { onRequireLogin(); return; }
    if (!selected || registrationLock.current || enrollmentLoading || enrollmentError) return;
    registrationLock.current = true; setRegistering(true); setActionError(''); setNotice('');
    try {
      const response = await apiClient.enrollCourse({ courseId: selected.id, ...(batchId ? {batchId} : {}) });
      if (response?.status === 401) { setEnrollmentAuthRequired(true); onRequireLogin(); return; }
      if (response?.error || !response?.enrollment?.id) throw new Error(response?.error || 'Không thể đăng ký khóa học.');
      setEnrollments(current => [response.enrollment, ...current.filter(item => item.id !== response.enrollment.id)]);
      setPaymentEnrollmentId(response.enrollment.id); setCatalogView('payment');
      setNotice(`Đã ghi nhận đăng ký: ${statusLabel(response.enrollment.status)}.`);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Không thể đăng ký khóa học.'); }
    finally { registrationLock.current = false; setRegistering(false); }
  };
  const acceptQuizSubmission=(response:any,entry:PendingQuizSubmission)=>{
      const score=Number(response?.score);
      if(response?.error||!response?.submission?.id||response.submission.quizId!==entry.quizId||response.score==null
        ||!Number.isFinite(score)||score<0||score>100||typeof response.isPassed!=='boolean'
        ||!Number.isInteger(response.totalQuestions)||response.totalQuestions<1
        ||!Number.isInteger(response.correctCount)||response.correctCount<0||response.correctCount>response.totalQuestions)return false;
      submittedAttempts.current.add(entry.attemptId);clearPending(entry);setDraftFeedback(null);setActionError('');
      try{localStorage.removeItem(draftKey(entry.attemptId));}catch{}
      setLearningVersion(value=>value+1);setEnrollmentVersion(value=>value+1);
      setQuizResult({ courseId:entry.courseId, score: Number(response.score), correctCount: response.correctCount, totalQuestions: response.totalQuestions, isPassed: response.isPassed });
      const submission = response.submission as QuizSubmission;
      if (submission.quizId && submission.submittedAt && submission.score != null && submission.correctCount != null && typeof submission.passed === 'boolean') {
        setLearning(current => current?.id === entry.courseId ? { ...current,
          quizSubmissions: [submission, ...(current.quizSubmissions || []).filter(item => item.id !== submission.id)],
        } : current);
      }
      return true;
  };
  const sendQuizSubmission=async(entry:PendingQuizSubmission)=>{
    if(quizLock.current)return;
    const scope=selectedQuizScope.current,request=quizRequest.current;
    const current=()=>selectedQuizScope.current===scope&&quizRequest.current===request;
    quizLock.current=true;setQuizSubmitting(true);setActionError('');setNotice('');
    rememberPending(entry);
    try{
      const response=await apiClient.submitQuiz(entry.courseId,entry.answers,entry.quizId,entry.enrollmentId,entry.attemptId);
      if(!current())return;
      if(acceptQuizSubmission(response,entry))return;
      // A failed response does not prove the server rejected the submission.
      apiClient.invalidateReadPaths([`/courses/${encodeURIComponent(entry.courseId)}/learning`]);
      const canonical=await apiClient.getCourseLearning(entry.courseId,entry.enrollmentId);
      if(!current())return;
      const attempt=canonical?.course?.quizAttempts?.find((item:any)=>item.id===entry.attemptId&&item.quizId===entry.quizId);
      const saved=attempt?.submissionId&&canonical.course.quizSubmissions?.find((item:QuizSubmission)=>item.id===attempt.submissionId&&item.quizId===entry.quizId);
      if(saved&&saved.score!=null&&Array.isArray(saved.questions)&&acceptQuizSubmission({submission:saved,score:Number(saved.score)*10,correctCount:saved.correctCount,totalQuestions:saved.questions.length,isPassed:saved.passed},entry))return;
      if(response?.status===400||response?.code==='ATTEMPT_EXPIRED'){
        clearPending(entry);setActionError(response.error||'Lượt thi chưa được ghi nhận. Vui lòng kiểm tra lại.');
      }else setActionError('Chưa xác nhận được kết quả. Kiểm tra hoặc gửi lại bài nộp trước khi mở lượt thi mới.');
    }catch{if(current())setActionError('Chưa xác nhận được kết quả. Vui lòng kiểm tra lại bài nộp.');}
    finally{quizLock.current=false;if(current())setQuizSubmitting(false);}
  };
  const submitQuiz = async () => {
    if (!study?.quiz?.questions.length || quizLock.current || !attemptActive || !quizAttempt) return;
    if (study.quiz.questions.some(question => !answers[question.id])) { setActionError('Vui lòng trả lời tất cả câu hỏi.'); return; }
    await sendQuizSubmission({courseId:study.id,enrollmentId:activeEnrollmentId||'',quizId:study.quiz.id,attemptId:quizAttempt.id,answers:{...answers}});
  };
  const documents = (items: Lesson[]) => {
    const links = items.reduce<React.ReactNode[]>((all, item) => all.concat((item.attachments || []).map((attachment, index) => {
      const file = typeof attachment === 'string' ? { url: attachment } : attachment as { url?: string; fileUrl?: string; name?: string; title?: string } | null;
      const url = safeUrl(file?.url || file?.fileUrl);
      return url ? <a key={`${item.id}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-b py-3 text-xs underline"><FileTextIcon size={16} />{file?.name || file?.title || item.title}</a> : null;
    })), []).filter(Boolean);
    return links.length ? links : <Empty></Empty>;
  };
  const renderLesson = (item: Lesson) => <button key={item.id} data-lesson-id={item.id} className="academy-lesson-row" disabled={learningActionBusy} onClick={() => openLesson(item)}>
    {isReadingLesson(item) ? <FileTextIcon size={18} /> : <PlayCircleIcon size={18} />}<span className="min-w-0 break-words">{item.title}<small className="block font-normal">{item.duration}{item.isCompleted ? ' · Đã hoàn thành' : ''}</small></span>
  </button>;
  const renderQuizHistory = () => <section className="space-y-2 text-xs" aria-label="Lịch sử bài kiểm tra">
    <h3 className="text-sm font-bold">Lịch sử bài kiểm tra</h3>
    {study?.quizSubmissions === undefined ? <Empty></Empty>
      : study.quizSubmissions.length === 0 ? <Empty></Empty>
        : [...study.quizSubmissions].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)).map(submission => {
          const submitted = new Date(submission.submittedAt);
          return <div key={submission.id} className="space-y-1 border-b py-3">
            <p className="break-words font-semibold">{quizzes.find(quiz => quiz.id === submission.quizId)?.title}</p>
            <p>Điểm: {Number(submission.score).toLocaleString('vi-VN')}/10 · {submission.correctCount} câu đúng · {submission.passed ? 'Đạt' : 'Chưa đạt'}</p>
            <p>Ngày nộp: {Number.isNaN(submitted.getTime()) ? '' : submitted.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
            {submission.instructorFeedback && <p className="whitespace-pre-wrap">Nhận xét của giảng viên: {submission.instructorFeedback}</p>}
            {submission.submittedAnswers && <details><summary className="cursor-pointer py-2 font-semibold">Đáp án đã chọn</summary>{Object.entries(submission.submittedAnswers).map(([id,answer]) => {
              const question = submission.questions?.find(item=>item.id===id) || quizzes.find(quiz => quiz.id === submission.quizId)?.questions.find(item => item.id === id);
              const optionKey = typeof answer === 'number' ? String.fromCharCode(65+answer) : answer;
              const optionIndex = question?.optionKeys?.indexOf(optionKey) ?? -1;
              return <div key={id} className="space-y-1 py-2"><p>{question?.question || id}</p><p>{optionKey}{optionIndex >= 0 ? ` · ${question?.options[optionIndex]}` : ''}</p></div>;
            })}</details>}
          </div>;
        })}
  </section>;

  const openCatalog = (audience?:CourseAudience) => { setCatalogAudience(audience==='BEGINNER'||audience==='PRACTITIONER'?audience:'');setTab('catalog'); setCatalogView('catalog'); setInstructorId(''); setActionError(''); setNotice(''); };
  const openCertificates=()=>{if(!userId){onRequireLogin();return;}setLessonId(null);setTab('certificates');setActionError('');setNotice('');};
  const openMine = () => { if(attemptLock.current||quizLock.current||progressLock.current||registrationLock.current)return; if (!userId || enrollmentAuthRequired) { onRequireLogin(); return; } setTab('my_courses'); setLessonId(null); setNotice(''); setActionError(''); };
  const showCourse = (course: Course) => { setSelectedId(course.id); setCatalogView('course'); setBatchId(''); setPaymentEnrollmentId(''); setActionError(''); };
  const beginRegistration = () => {
    if (!userId || enrollmentAuthRequired) { onRequireLogin(); return; }
    const existing = enrollments.find(entry => entry.courseId === selected?.id && entry.status !== 'dropped');
    setPaymentEnrollmentId(existing?.id || '');
    setCatalogView(existing ? 'payment' : 'registration');
  };
  const openPayment = (entry: AcademyEnrollment) => { setSelectedId(entry.courseId); setPaymentEnrollmentId(entry.id); setTab('catalog'); setCatalogView('payment'); };
  const nextLesson = study?.lessons.find(item => !item.isCompleted);
  const paymentEnrollment = enrollments.find(entry => entry.id === paymentEnrollmentId);
  return <div className="academy-screen">
    {(loading || error) && <div className="academy-feedback">{loading && <p role="status">Đang tải dữ liệu...</p>}{error && <p role="alert" className="academy-error">{error} {onRefresh && <button onClick={onRefresh}>Thử lại</button>}</p>}</div>}
    {tab !== 'catalog'&&tab!=='certificates' && (!userId || enrollmentAuthRequired) && <div className="academy-feedback"><button className="academy-primary" onClick={onRequireLogin}>Đăng nhập với Zalo</button></div>}
    {tab!=='certificates'&&(notice || actionError || quizDraftError || enrollmentLoading || enrollmentError) && <div className="academy-feedback">
      {notice && <p role="status">{notice}</p>}
      {actionError && <p role="alert" className="academy-error">{actionError}</p>}
      {quizDraftError && <p role="alert" className="academy-error">{quizDraftError}</p>}
      {enrollmentLoading && <p role="status">Đang tải đăng ký học...</p>}
      {enrollmentError && <p role="alert" className="academy-error">{enrollmentError} <button onClick={() => setEnrollmentVersion(value => value+1)}>Thử lại</button></p>}
    </div>}
    {tab === 'catalog' && ['home','catalog'].includes(catalogView) && <><div className="academy-body academy-chips"><button type="button" className="academy-outline" onClick={openMine}>Khóa học của tôi</button><button type="button" className="academy-outline" onClick={openCertificates}>Giấy chứng nhận</button></div><AcademyCatalog key={catalogSearch?.id} initialQuery={catalogSearch?.query} initialAudience={catalogAudience} courses={courses} branches={branches} branchId={branchId} onBranch={setBranchId} instructorId={instructorId} onCourse={showCourse}/></>}
    {tab === 'catalog' && !['home','catalog'].includes(catalogView) && !selected && !(catalogView==='payment'&&paymentEnrollment) && <AcademyHeader title="Khóa học" onBack={openCatalog}/>}
    {tab === 'catalog' && catalogView === 'course' && selected && <AcademyCourseDetail course={selected} onBack={openCatalog} onInstructor={() => setCatalogView('instructor')} onRegister={beginRegistration} registered={enrollments.some(entry => entry.courseId === selected.id && entry.status !== 'dropped')} onPreview={openLesson}/>}
    {tab === 'catalog' && catalogView === 'instructor' && selected && <AcademyInstructor course={selected} onBack={() => setCatalogView('course')} onCourses={() => { openCatalog(); setInstructorId(selected.instructorProfile?.id || ''); }}/>}
    {tab === 'catalog' && catalogView === 'registration' && selected && <AcademyRegistration course={selected} user={user} batchId={batchId} onBatch={setBatchId} onBack={() => setCatalogView('course')} onContinue={() => setCatalogView('payment')}/>}
    {tab === 'catalog' && catalogView === 'payment' && (selected||paymentEnrollment) && <AcademyRegistrationStatus course={selected} batchId={batchId} enrollment={paymentEnrollment} onBack={() => selected?setCatalogView(paymentEnrollmentId ? 'course' : 'registration'):openMine()} onSubmit={register} onMine={openMine} busy={registering} error={actionError}/>}
    {tab === 'my_courses' && (!enrollmentLoading&&!enrollmentError&&!enrollmentAuthRequired&&userId ? <AcademyMyCourses enrollments={enrollments} onBack={() => { setTab('catalog'); setCatalogView('home'); }} onCertificates={openCertificates} onPayment={openPayment} onLearn={entry => { setStudyId(entry.id); setTab('content'); }}/> : <AcademyHeader title="Khóa học của tôi" onBack={() => {setTab('catalog');setCatalogView('home');}}/>)}

    {tab==='certificates'&&<AcademyCertificates key={userId} userId={userId} initialCertificateId={notificationTarget?.tab==='certificates'?notificationTarget.certificateId:undefined} onBack={()=>{setTab('catalog');setCatalogView('home');}} onRequireLogin={onRequireLogin}/>}
    {!['catalog', 'my_courses','certificates'].includes(tab) && <>
      <AcademyHeader title="Chi tiết lớp học" onBack={openMine} backDisabled={learningActionBusy}/>
      <main className="academy-body academy-learning">
      <AcademyClassSummary course={study} enrollment={studyEnrollment}/>
      <nav className="academy-tabs" aria-label="Nội dung lớp học">{([['content','Nội dung học'],['schedule','Lịch học'],['documents','Tài liệu'],['exam','Kiểm tra'],['results','Kết quả']] as [Tab,string][]).map(([id,label])=><button key={id} disabled={attemptBusy || quizSubmitting} aria-current={tab===id?'page':undefined} onClick={()=>{setTab(id);setLessonId(null);setNotice('');setActionError('');}}>{label}</button>)}</nav>
      {!enrollmentLoading && !enrollmentError && !eligible.length && <Empty></Empty>}
      {eligible.length > 1 && <select aria-label="Khóa học đang xem" value={activeEnrollmentId} disabled={quizSubmitting || progressSaving || attemptBusy} onChange={event => { setStudyId(event.target.value); setLessonId(null); setNotice(''); }} className={`${buttonClass} w-full min-w-0`}>
        {eligible.map(item => <option key={item.id} value={item.id}>{item.courseTitle}{item.batchCode?` · ${item.batchCode}`:''}</option>)}
      </select>}
      {learningLoading && <p role="status" className="text-xs">Đang tải nội dung học...</p>}
      {learningError && <div role="alert" className="text-xs text-red-700">{learningError} <button className={buttonClass} onClick={() => setLearningVersion(value => value + 1)}>Thử lại</button></div>}
      {study && !learningLoading && !learningError && <>
        {tab === 'content' && <div className="space-y-3">
          {study.chapters?.map((chapter,index) => <details key={chapter.id} className="academy-chapter" open={index===0}><summary>{chapter.title}</summary>{chapter.description && <p className="text-xs">{chapter.description}</p>}{study.lessons.filter(item => item.chapterId === chapter.id).map(renderLesson)}</details>)}
          {study.lessons.filter(item => !study.chapters?.some(chapter => chapter.id === item.chapterId)).map(renderLesson)}
          {!study.lessons.length && <Empty></Empty>}
        </div>}
        {tab === 'schedule' && (study.schedules?.length ? study.schedules.map(session => <div key={session.id} className="space-y-1 border-b py-3 text-xs"><h3 className="font-semibold">{session.topic}</h3><p>{date(session.sessionDate)} · {session.startTime} - {session.endTime}</p><p>{session.roomName || ''} · {session.instructorName || ''}</p><p>Điểm danh: {attendanceLabel(session.attendanceStatus)}</p></div>) : <Empty></Empty>)}
        {tab === 'documents' && documents(study.lessons)}
        {tab === 'exam' && quizzes.length > 0 && <select aria-label="Bài kiểm tra" value={study.quiz?.id || ''} disabled={quizSubmitting || attemptBusy} className={`${buttonClass} w-full min-w-0`} onChange={event => { setQuizId(event.target.value); setAnswers({}); setQuizResult(null); setActionError(''); }}>
          {quizzes.map(quiz => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
        </select>}
        {tab==='exam' && study.quiz && !attemptActive && !pendingForQuiz && <section className="space-y-2 text-xs"><h2 className="font-semibold">{study.quiz.title}</h2>{quizAttempt&&attemptExpired&&!quizResult&&<p role="status">Đã hết thời gian làm bài.</p>}<p>Giới hạn {study.quiz.maxAttempts??3} lượt mỗi bài kiểm tra.</p><button className={buttonClass} disabled={attemptBusy||quizSubmitting} onClick={()=>void beginQuiz()}>{attemptBusy?'Đang mở bài...':'Bắt đầu / tiếp tục làm bài'}</button></section>}
        {tab==='exam'&&pendingForQuiz&&<button className={buttonClass} disabled={quizSubmitting||attemptBusy} onClick={()=>void sendQuizSubmission(pendingForQuiz)}>{quizSubmitting?'Đang xác nhận bài nộp...':'Kiểm tra / gửi lại bài nộp'}</button>}
        {tab === 'exam' && attemptActive && (study.quiz?.questions.length ? <div className="space-y-4">
          <QuizTimer deadline={quizDeadline.current} onExpire={expireQuiz} />
          <h2 className="text-base font-bold">{study.quiz.title}</h2><p className="text-xs">Điểm đạt: {study.quiz.passingScore}%</p>
          {study.quiz.questions.map((question, index) => <fieldset key={question.id} disabled={quizSubmitting||Boolean(pendingForQuiz)} className="space-y-2"><legend className="mb-2 text-sm font-semibold">{index + 1}. {question.question}</legend>{question.options.map((option, optionIndex) => {
            const key = question.optionKeys?.[optionIndex] || String.fromCharCode(65 + optionIndex);
            return <label key={key} className="flex items-start gap-2 text-xs"><input type="radio" name={question.id} checked={answers[question.id] === key} onChange={() => chooseAnswer(question.id,key)} /><span>{option}</span></label>;
          })}</fieldset>)}
          {!pendingForQuiz&&<button className={buttonClass} disabled={quizSubmitting||!attemptActive} onClick={submitQuiz}>{quizSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}</button>}
          {quizResult?.courseId === study.id && <p role="status" className="text-xs">Điểm: {quizResult.score}% · {quizResult.correctCount}/{quizResult.totalQuestions} câu đúng · {quizResult.isPassed ? 'Đạt' : 'Chưa đạt'}</p>}
        </div> : <Empty></Empty>)}
        {tab==='exam'&&!attemptActive&&quizResult?.courseId===study.id&&<p role="status" className="text-xs">Điểm: {quizResult.score}% · {quizResult.correctCount}/{quizResult.totalQuestions} câu đúng · {quizResult.isPassed?'Đạt':'Chưa đạt'}</p>}
        {tab === 'exam' && renderQuizHistory()}
        {tab === 'results' && <div className="space-y-3 text-xs">
          <h2 className="text-base font-bold">Kết quả học tập</h2>
          {renderQuizHistory()}
          {study.academicRecord ? <><p>Lý thuyết: {study.academicRecord.theoryScore}/10</p><p>Thực hành: {study.academicRecord.practicalScore}/10</p><p>Chuyên cần: {study.academicRecord.attendedSessions}/{study.academicRecord.totalBatchSessions} buổi · {study.academicRecord.attendanceRate}%</p><p>{study.academicRecord.isGraduated ? 'Đã tốt nghiệp' : 'Chưa tốt nghiệp'}</p>{([['feedbackTheory','Nhận xét lý thuyết'],['feedbackPractical','Nhận xét thực hành'],['feedbackAttendance','Nhận xét chuyên cần'],['feedbackAttitude','Nhận xét thái độ']] as const).map(([field,label])=>study.academicRecord?.[field]&&<p key={field} className="whitespace-pre-wrap"><strong>{label}: </strong>{study.academicRecord[field]}</p>)}</> : <Empty></Empty>}
          <h3 className="text-sm font-bold">Giấy chứng nhận</h3>
          {study.certificate?.status === 'ISSUED' ? <><p>{study.certificate.certificateCode}</p><p>{study.certificate.studentName} · {study.certificate.courseTitle}</p>{study.certificate.studentDateOfBirth&&<p>Ngày sinh: {date(study.certificate.studentDateOfBirth)}</p>}<p>Ngày cấp: {date(study.certificate.issueDate)} · {study.certificate.finalGrade}</p><button type="button" className={buttonClass} onClick={openCertificates}>Xem giấy chứng nhận</button></> : <Empty></Empty>}
        </div>}
      </>}
      </main>
      {nextLesson && <AcademyFooter summary={nextLesson.title}><button className="academy-primary" disabled={learningLoading || Boolean(learningError) || learningActionBusy} onClick={()=>openLesson(nextLesson)}>Tiếp tục bài học</button></AcademyFooter>}
    </>}

    {lesson && <div role="dialog" aria-modal="true" aria-label={lesson.title} className="academy-lesson-dialog">
      <div className="space-y-4">
        <button className={buttonClass} disabled={progressSaving} onClick={() => void closeLesson()} aria-label="Đóng bài học"><ArrowLeftIcon size={16} /></button>
        <h2 className="text-lg font-bold break-words">{lesson.title}</h2>
        {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
        {lessonExitBlocked&&<div className="space-y-2"><button className={buttonClass} disabled={progressSaving} onClick={()=>leaveLessonWithDraft()}>Đóng và giữ bản nháp</button>{draftStorageFailed&&<button className={buttonClass} disabled={progressSaving} onClick={()=>leaveLessonWithDraft(true)}>Đóng và bỏ ghi chú chưa lưu</button>}</div>}
        {notice && <p role="status" className="text-xs">{notice}</p>}
        {lesson.mediaErrorCode&&<p role="alert">Video chưa được cho phép phát với cấu hình hiện tại.</p>}
        {activeLesson?.lessonType==='VIDEO'&&!lesson.mediaErrorCode&&!playbackReady&&!actionError&&<p role="status">Đang kiểm tra phiên xem...</p>}
        {lesson.youtubeVideoId?(!activeLesson||playbackReady)&&<YouTubeLessonPlayer key={`${study?.id||selected?.id}-${lesson.id}`} ref={videoRef} videoId={lesson.youtubeVideoId} title={lesson.title}
          onPlay={()=>{if(activeLesson&&(!playback.current||playback.current.lessonId!==activeLesson.id)){videoRef.current?.pause();return;}lastPlaybackTime.current=videoRef.current?.currentTime??null;}}
          onPause={()=>{if(activeLesson&&!closingLesson.current)void flushHeartbeat().then(async saved=>{if(saved)await saveProgress(false,notes);});}}
          onEnded={()=>{if(activeLesson)void flushHeartbeat().then(async saved=>{if(saved)await saveProgress(false,notes);});}}
          onTick={(position,playing)=>{const previous=lastPlaybackTime.current;if(playing&&previous!==null){const delta=position-previous;if(delta>0&&delta<2)watched.current+=delta;}lastPlaybackTime.current=playing?position:null;}}
        />:safeUrl(lesson.videoUrl) ? <div className="academy-video-wrap"><video ref={element=>{videoRef.current=element;}} key={`${study?.id || selected?.id}-${lesson.id}`} controls playsInline controlsList="nodownload noremoteplayback nofullscreen" disablePictureInPicture onContextMenu={event=>event.preventDefault()} src={activeLesson&&!playbackReady?undefined:safeUrl(lesson.videoUrl)} className="aspect-video w-full bg-black"
          onPlay={event => {if(activeLesson&&(!playback.current||playback.current.lessonId!==activeLesson.id)){event.currentTarget.pause();return;}lastPlaybackTime.current = event.currentTarget.currentTime; }}
          onSeeking={() => { lastPlaybackTime.current = null; }}
          onSeeked={event => { lastPlaybackTime.current = event.currentTarget.currentTime; }}
          onTimeUpdate={event => {
            const video = event.currentTarget, previous = lastPlaybackTime.current;
            // Count only continuous playback; seeking never grants watched time.
            if (!video.paused && !video.seeking && previous !== null) {
              const delta = video.currentTime - previous;
              if (delta > 0 && delta < 2) watched.current += delta;
            }
            lastPlaybackTime.current = video.currentTime;
          }}
          onPause={event => { if (activeLesson && !event.currentTarget.ended && !closingLesson.current) {void flushHeartbeat().then(async saved=>{if(saved)await saveProgress(false,notes);});} }}
          onEnded={event => {
            if (activeLesson) {void flushHeartbeat().then(async saved=>{if(saved)await saveProgress(false,notes);});}
          }}
          onError={() => setActionError('Không thể phát video bài học.')}
        />{userId&&<div className="academy-video-watermark" aria-hidden="true">{user?.name||userId}<br/>{userId.slice(-8)}</div>}</div> : !isReadingLesson(lesson) && <Empty></Empty>}
        {lesson.contentText && <p className="whitespace-pre-wrap text-sm">{lesson.contentText}</p>}
        {lesson.learningGoals?.map((goal, index) => <p key={index} className="text-xs">{displayText(goal)}</p>)}
        {documents([lesson])}
        {activeLesson && isReadingLesson(activeLesson) && <button className={buttonClass} disabled={progressSaving || activeLesson.isCompleted} onClick={() => void saveProgress(true, notes)}>
          {progressSaving ? 'Đang lưu...' : activeLesson.isCompleted ? 'Đã xác nhận đã đọc' : 'Đánh dấu đã đọc'}
        </button>}
        {activeLesson && <><label className="block text-xs font-semibold">Ghi chú<textarea aria-label="Ghi chú" maxLength={10000} value={notes} onChange={event => {
          const value=event.target.value;setNotes(value);
          if(study && activeEnrollmentId)try{localStorage.setItem(noteKey(study.id,activeEnrollmentId,activeLesson.id),JSON.stringify(value));}catch{}
        }} className="mt-2 min-h-28 w-full rounded-[8px] border p-3 text-sm" /></label><button className={buttonClass} disabled={progressSaving} onClick={() => void saveProgress(false, notes)}>{progressSaving ? 'Đang lưu...' : 'Lưu ghi chú'}</button></>}
      </div>
    </div>}
  </div>;
};
