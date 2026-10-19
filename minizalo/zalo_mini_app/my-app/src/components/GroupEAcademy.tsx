import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QuizTimer } from './QuizTimer';
import { useBackAction } from '@/hooks/useNavigationHistory';
import { events, EventName } from 'zmp-sdk';
import { apiClient } from '@/api/client';
import type { Branch, Course, User } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, FileTextIcon, PlayCircleIcon } from './Icons';
import { QRCode } from './QRCode';
import { EntityImage } from './GroupBExtensions';
import { AcademyHome, AcademyCatalog, AcademyCourseDetail, AcademyInstructor, AcademyRegistration, AcademyPayment, AcademyMyCourses, AcademyClassSummary, AcademyHeader, AcademyFooter } from './AcademyViews';
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
  notificationTarget?: {id:string; enrollmentId:string; tab:string; quizId?:string};
}

type Lesson = Course['lessons'][number] & {
  chapterId?: string; lessonType?: string; contentText?: string; learningGoals?: string[];
  attachments?: unknown[]; watchedSeconds?: number; studentNotes?: string; isFreePreview?: boolean;
  quizId?:string|null;
};
// These fields are returned by the shared learning endpoint and preserved by the adapter.
type QuizSubmission = { id: string; score: number; correctCount: number; passed: boolean; submittedAt: string; quizId: string; submittedAnswers?: Record<string,string|number>; instructorFeedback?: string | null; questions?: NonNullable<Course['quiz']>['questions'] };
type AcademyCourse = Omit<Course, 'lessons' | 'quizSubmissions'> & {
  lessons: Lesson[];
  quizSubmissions?: QuizSubmission[];
  chapters?: { id: string; title: string; description?: string }[];
  instructorProfile?: { fullName: string; title?: string; avatarUrl?: string; bio?: string; experienceYears?: number; achievements?: string[] };
  batches?: { id: string; batchCode: string; branchName?: string; instructorName?: string; startDate: string; endDate: string; scheduleText: string; status: string }[];
  schedules?: { id: string; sessionDate: string; startTime: string; endTime: string; topic: string; roomName?: string; instructorName?: string; attendanceStatus?: string }[];
  academicRecord?: { theoryScore: number; practicalScore: number; attendanceRate: number; attendedSessions: number; totalBatchSessions: number; isGraduated: boolean; feedbackTheory?: string; feedbackPractical?: string; feedbackAttendance?: string; feedbackAttitude?: string };
  certificate?: { status: string; certificateCode: string; studentName: string; courseTitle: string; issueDate: string; finalGrade: string; certificatePdfUrl?: string; qrVerificationCode?: string };
};
type Tab = 'catalog' | 'my_courses' | 'content' | 'schedule' | 'documents' | 'exam' | 'results';
type QuizResult = { courseId: string; score: number; correctCount: number; totalQuestions: number; isPassed: boolean };
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

export const GroupEAcademy: React.FC<GroupEAcademyProps> = ({ courses, userId, user, branches = [], onOpenNotifications, loading, error, onRefresh, onRequireLogin, mode = 'catalog', initialCourseId, catalogSearch, notificationTarget }) => {
  const [tab, setTab] = useState<Tab>(initialCourseId ? 'catalog' : mode === 'learning' ? 'my_courses' : 'catalog');
  const [selectedId, setSelectedId] = useState<string | null>(initialCourseId || null);
  const [catalogView, setCatalogView] = useState<'home'|'catalog'|'course'|'instructor'|'registration'|'payment'>(initialCourseId?'course':'home');
  const [branchId, setBranchId] = useState('');
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
  const [notes, setNotes] = useState('');
  const noteKey = (courseId:string,enrollmentId:string,lessonId:string) => `mld_lesson_notes:${userId}:${courseId}:${enrollmentId}:${lessonId}`;
  const pendingNoteSave = useRef<() => Promise<boolean>>(async () => true);
  const [progressSaving, setProgressSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizId, setQuizId] = useState('');
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizAttempt,setQuizAttempt]=useState<{id:string;quizId:string;enrollmentId:string;expiresAt:string}|null>(null);
  const [attemptBusy,setAttemptBusy]=useState(false);
  const [quizExpired,setQuizExpired]=useState(false);
  const expireQuiz = useCallback(() => setQuizExpired(true), []);
  const quizRequest = useRef(0);
  const attemptLock = useRef(false);
  const selectedQuizScope = useRef('');
  const quizDeadline=useRef(0);
  const draftQueue=useRef(Promise.resolve());
  const submittedAttempts=useRef(new Set<string>());
  const draftKey=(attemptId:string)=>`mld_quiz_draft:${userId}:${attemptId}`;
  const chooseAnswer=(questionId:string,value:string)=>{
    if(!quizAttempt||!activeCourseId||quizSubmitting||performance.now()>=quizDeadline.current)return;
    const next={...answers,[questionId]:value},attemptId=quizAttempt.id,courseId=activeCourseId,enrollmentId=activeEnrollmentId,scope=activeScope.current;
    try{localStorage.setItem(draftKey(attemptId),JSON.stringify(next));}catch{/* The server save still runs with restricted storage. */}
    setAnswers(next);
    draftQueue.current=draftQueue.current.then(async()=>{
      if(submittedAttempts.current.has(attemptId))return;
      const result=await apiClient.saveQuizDraft(courseId,attemptId,enrollmentId,next);
      if(result?.error&&activeScope.current===scope&&!submittedAttempts.current.has(attemptId))setActionError(result.error);
      if(!result?.error)try{if(localStorage.getItem(draftKey(attemptId))===JSON.stringify(next))localStorage.removeItem(draftKey(attemptId));}catch{}
    }).catch(()=>{if(activeScope.current===scope)setActionError('Chưa đồng bộ đáp án. Bản nháp được giữ trên thiết bị.');});
  };
  const playback=useRef<{id:string;lessonId:string;enrollmentId:string;courseId:string}|null>(null);
  const heartbeatPending=useRef<Promise<boolean>|null>(null);
  const lastHeartbeat=useRef(0);
  const playbackGeneration=useRef(0);
  const registrationLock = useRef(false);
  const quizLock = useRef(false);
  const progressLock = useRef(false);
  const watched = useRef(0);
  const lastPlaybackTime = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const activeLesson = study?.lessons.find(lesson => lesson.id === lessonId);
  const previewLesson = selected?.lessons.find(lesson => lesson.id === lessonId && lesson.isFreePreview === true);
  const lesson = activeLesson || previewLesson;
  selectedQuizScope.current = `${activeScope.current}/${study?.quiz?.id || ''}`;
  const attemptExpired=quizExpired||Boolean(quizAttempt&&performance.now()>=quizDeadline.current);
  const attemptActive=Boolean(quizAttempt&&quizAttempt.quizId===study?.quiz?.id&&quizAttempt.enrollmentId===activeEnrollmentId&&!attemptExpired&&!quizResult);
  useEffect(() => () => { quizRequest.current++; }, []);
  const beginQuiz=async()=>{
    if(!study?.quiz||attemptLock.current) return;
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
        if(activeScope.current!==`${session.courseId}/${session.enrollmentId}`)return false;
        if(result?.error){setActionError(result.error);return false;}
        if(result?.progress)setLearning(current=>current?{...current,lessons:current.lessons.map(item=>item.id===session.lessonId?{...item,...result.progress}:item)}:current);
        return true;
      }catch{setActionError('Không thể lưu tiến độ video. Vui lòng thử lại.');return false;}
    })();
    heartbeatPending.current=pending;
    try{return await pending;}finally{if(heartbeatPending.current===pending)heartbeatPending.current=null;}
  };
  useEffect(()=>{const timer=window.setInterval(()=>{if(videoRef.current&&!videoRef.current.paused)void flushHeartbeat();},10000);return()=>clearInterval(timer);},[]);

  useEffect(() => {
    let cancelled = false;
    const cached = activeCourseId && activeEnrollmentId ? apiClient.peek(`/courses/${encodeURIComponent(activeCourseId)}/learning?enrollmentId=${encodeURIComponent(activeEnrollmentId)}`) : null;
    setLearning(cached?.course || null);
    setLearningEnrollmentId(cached ? activeEnrollmentId || '' : '');
    setLearningError('');
    setLessonId(null);
    setActionError('');
    setLearningLoading(Boolean(activeCourseId && !cached));
    if (!activeCourseId) return;
    apiClient.getCourseLearning(activeCourseId, activeEnrollmentId).then(response => {
      if (cancelled) return;
      if (response?.status === 401) { setEnrollmentAuthRequired(true); setEnrollments([]); }
      else if (response?.error || response?.course?.id !== activeCourseId) setLearningError(response?.error || 'Không thể tải nội dung học.');
      else { setLearning(response.course); setLearningEnrollmentId(activeEnrollmentId || ''); }
    }).catch(() => { if (!cancelled) setLearningError('Không thể tải nội dung học.'); })
      .then(() => { if (!cancelled) setLearningLoading(false); });
    return () => { cancelled = true; };
  }, [activeCourseId, activeEnrollmentId, learningVersion]);
  useEffect(()=>{setQuizAttempt(null);setQuizResult(null);setAnswers({});},[activeCourseId,activeEnrollmentId,quizId]);

  const openLesson = (item: Lesson) => {
    if (item.lessonType === 'QUIZ' && study?.lessons.some(lesson => lesson.id === item.id)) {
      if(!item.quizId){setActionError('Bài học chưa được liên kết với bài kiểm tra. Vui lòng liên hệ giảng viên.');return;}
      setQuizId(item.quizId);setQuizAttempt(null);setQuizResult(null);setAnswers({});setTab('exam');setLessonId(null);setActionError('');setNotice('');return;
    }
    setActionError(''); setNotice('');
    watched.current = Number(item.watchedSeconds) || 0;
    lastPlaybackTime.current = null;
    let savedNotes = item.studentNotes || '';
    if(study && activeEnrollmentId)try {
      const draft=JSON.parse(localStorage.getItem(noteKey(study.id,activeEnrollmentId,item.id)) || 'null');
      if(typeof draft==='string')savedNotes=draft;
    }catch{/* Server notes remain available with restricted storage. */}
    setNotes(savedNotes);
    setLessonId(item.id);
    playback.current=null;
    const generation=++playbackGeneration.current;
    if(item.lessonType==='VIDEO'&&study&&activeEnrollmentId) {
      const scope=activeScope.current;
      void apiClient.startPlayback(study.id,item.id,activeEnrollmentId).then(result=>{
        if(activeScope.current!==scope||playbackGeneration.current!==generation)return;
        if(result?.error||!result?.playback){setActionError(result?.error||'Không thể lưu phiên xem video.');return;}
        playback.current={id:result.playback.id,lessonId:item.id,enrollmentId:activeEnrollmentId,courseId:study.id};lastHeartbeat.current=performance.now();
      });
    }
  };
  const saveProgress = async (completed = false, studentNotes?: string) => {
    if (!study || !activeLesson || progressLock.current) return false;
    const courseId = study.id, savedLessonId = activeLesson.id;
    const scope = activeScope.current;
    progressLock.current = true; setProgressSaving(true); setActionError('');
    try {
      const response = await apiClient.saveLessonProgress(courseId, savedLessonId, {
        enrollmentId: activeEnrollmentId,
        watchedSeconds: Math.floor(watched.current), ...(completed ? { isCompleted: true } : {}),
        ...(studentNotes !== undefined ? { studentNotes } : {}),
      });
      if (!response || response.error || !response.progress) throw new Error(response?.error || 'Không thể lưu tiến trình học.');
      const progress = response.progress;
      if (activeScope.current !== scope) return false;
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
      return true;
    } catch (error) { if (activeScope.current === scope) setActionError(error instanceof Error ? error.message : 'Không thể lưu tiến trình học.'); return false; }
    finally { progressLock.current = false; setProgressSaving(false); }
  };
  pendingNoteSave.current=()=>saveProgress(false,notes);
  useEffect(() => {
    if(!activeLesson || notes===(activeLesson.studentNotes || ''))return;
    let cancelled=false,timer:number;
    const save=async()=>{
      const saved=await pendingNoteSave.current();
      if(!saved&&!cancelled)timer=window.setTimeout(()=>void save(),3000);
    };
    timer=window.setTimeout(()=>void save(),800);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[notes,activeLesson?.id,activeCourseId,activeEnrollmentId]);
  const closeLesson = async () => {
    if (closingLesson.current || progressLock.current) return;
    closingLesson.current=true;
    videoRef.current?.pause();
    try {
      if (!await flushHeartbeat()) return;
      if (!activeLesson || await saveProgress(false,notes)) {
        playbackGeneration.current++; playback.current=null; setLessonId(null);
      }
    } finally { closingLesson.current=false; }
  };
  useBackAction(Boolean(lesson) || tab !== 'catalog' || catalogView !== 'home', () => {
    if (lesson) { void closeLesson(); return; }
    if (registering || quizSubmitting || attemptBusy || progressSaving) return;
    if (tab !== 'catalog') { setTab(tab==='my_courses'?'catalog':'my_courses'); return; }
    if (catalogView === 'registration' || catalogView === 'instructor' || catalogView === 'payment') { setCatalogView('course'); return; }
    if (catalogView === 'course') { setCatalogView('catalog');setSelectedId(null); return; }
    setCatalogView('home');
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
  const submitQuiz = async () => {
    if (!study?.quiz?.questions.length || quizLock.current || !attemptActive || !quizAttempt) return;
    if (study.quiz.questions.some(question => !answers[question.id])) { setActionError('Vui lòng trả lời tất cả câu hỏi.'); return; }
    const courseId = study.id;
    const scope = activeScope.current;
    quizLock.current = true; setQuizSubmitting(true); setActionError(''); setNotice('');
    try {
      const response = await apiClient.submitQuiz(courseId, answers, study.quiz.id, activeEnrollmentId,quizAttempt.id);
      if (response?.error || !response?.submission?.id || response.score == null) throw new Error(response?.error || 'Không thể nộp bài kiểm tra.');
      if (activeScope.current !== scope) return;
      submittedAttempts.current.add(quizAttempt.id);
      try{localStorage.removeItem(draftKey(quizAttempt.id));}catch{}
      setLearningVersion(value=>value+1);setEnrollmentVersion(value=>value+1);
      setQuizResult({ courseId, score: Number(response.score), correctCount: response.correctCount, totalQuestions: response.totalQuestions, isPassed: response.isPassed });
      const submission = response.submission as QuizSubmission;
      if (submission.quizId && submission.submittedAt && submission.score != null && submission.correctCount != null && typeof submission.passed === 'boolean') {
        setLearning(current => current?.id === courseId ? { ...current,
          quizSubmissions: [submission, ...(current.quizSubmissions || []).filter(item => item.id !== submission.id)],
        } : current);
      }
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Không thể nộp bài kiểm tra.'); }
    finally { quizLock.current = false; setQuizSubmitting(false); }
  };
  const documents = (items: Lesson[]) => {
    const links = items.reduce<React.ReactNode[]>((all, item) => all.concat((item.attachments || []).map((attachment, index) => {
      const file = typeof attachment === 'string' ? { url: attachment } : attachment as { url?: string; fileUrl?: string; name?: string; title?: string } | null;
      const url = safeUrl(file?.url || file?.fileUrl);
      return url ? <a key={`${item.id}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-b py-3 text-xs underline"><FileTextIcon size={16} />{file?.name || file?.title || item.title}</a> : null;
    })), []).filter(Boolean);
    return links.length ? links : <Empty></Empty>;
  };
  const renderLesson = (item: Lesson) => <button key={item.id} className="academy-lesson-row" onClick={() => openLesson(item)}>
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

  const openCatalog = () => { setTab('catalog'); setCatalogView('catalog'); setInstructorId(''); setActionError(''); setNotice(''); };
  const openMine = () => { if (!userId || enrollmentAuthRequired) { onRequireLogin(); return; } setTab('my_courses'); setLessonId(null); setNotice(''); setActionError(''); };
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
    {tab !== 'catalog' && (!userId || enrollmentAuthRequired) && <div className="academy-feedback"><button className="academy-primary" onClick={onRequireLogin}>Đăng nhập với Zalo</button></div>}
    {(notice || actionError || enrollmentLoading || enrollmentError) && <div className="academy-feedback">
      {notice && <p role="status">{notice}</p>}
      {actionError && <p role="alert" className="academy-error">{actionError}</p>}
      {enrollmentLoading && <p role="status">Đang tải đăng ký học...</p>}
      {enrollmentError && <p role="alert" className="academy-error">{enrollmentError} <button onClick={() => setEnrollmentVersion(value => value+1)}>Thử lại</button></p>}
    </div>}
    {tab === 'catalog' && catalogView === 'home' && <AcademyHome courses={courses} user={user} branches={branches} branchId={branchId} onBranch={setBranchId} onCatalog={openCatalog} onMine={openMine} onNotifications={onOpenNotifications || onRequireLogin}/>}
    {tab === 'catalog' && catalogView === 'catalog' && <AcademyCatalog key={catalogSearch?.id} initialQuery={catalogSearch?.query} courses={courses} branches={branches} branchId={branchId} onBranch={setBranchId} instructorId={instructorId} onBack={() => setCatalogView('home')} onCourse={showCourse}/>}
    {tab === 'catalog' && !['home','catalog'].includes(catalogView) && !selected && !(catalogView==='payment'&&paymentEnrollment) && <AcademyHeader title="Khóa học" onBack={openCatalog}/>}
    {tab === 'catalog' && catalogView === 'course' && selected && <AcademyCourseDetail course={selected} onBack={openCatalog} onInstructor={() => setCatalogView('instructor')} onRegister={beginRegistration} registered={enrollments.some(entry => entry.courseId === selected.id && entry.status !== 'dropped')} onPreview={openLesson}/>}
    {tab === 'catalog' && catalogView === 'instructor' && selected && <AcademyInstructor course={selected} onBack={() => setCatalogView('course')} onCourses={() => { openCatalog(); setInstructorId(selected.instructorProfile?.id || ''); }}/>}
    {tab === 'catalog' && catalogView === 'registration' && selected && <AcademyRegistration course={selected} user={user} batchId={batchId} onBatch={setBatchId} onBack={() => setCatalogView('course')} onContinue={() => setCatalogView('payment')}/>}
    {tab === 'catalog' && catalogView === 'payment' && (selected||paymentEnrollment) && <AcademyPayment course={selected} batchId={batchId} enrollment={paymentEnrollment} onBack={() => selected?setCatalogView(paymentEnrollmentId ? 'course' : 'registration'):openMine()} onSubmit={register} onMine={openMine} busy={registering} error={actionError}/>}
    {tab === 'my_courses' && (!enrollmentLoading&&!enrollmentError&&!enrollmentAuthRequired&&userId ? <AcademyMyCourses enrollments={enrollments} onBack={() => { setTab('catalog'); setCatalogView('home'); }} onPayment={openPayment} onLearn={entry => { setStudyId(entry.id); setTab('content'); }}/> : <AcademyHeader title="Khóa học của tôi" onBack={() => {setTab('catalog');setCatalogView('home');}}/>)}

    {!['catalog', 'my_courses'].includes(tab) && <>
      <AcademyHeader title="Chi tiết lớp học" onBack={openMine}/>
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
        {tab==='exam' && study.quiz && !attemptActive && <section className="space-y-2 text-xs"><h2 className="font-semibold">{study.quiz.title}</h2>{quizAttempt&&attemptExpired&&!quizResult&&<p role="status">Đã hết thời gian làm bài.</p>}<p>Giới hạn {study.quiz.maxAttempts??3} lượt mỗi bài kiểm tra.</p><button className={buttonClass} disabled={attemptBusy} onClick={()=>void beginQuiz()}>{attemptBusy?'Đang mở bài...':'Bắt đầu / tiếp tục làm bài'}</button></section>}
        {tab === 'exam' && attemptActive && (study.quiz?.questions.length ? <div className="space-y-4">
          <QuizTimer deadline={quizDeadline.current} onExpire={expireQuiz} />
          <h2 className="text-base font-bold">{study.quiz.title}</h2><p className="text-xs">Điểm đạt: {study.quiz.passingScore}%</p>
          {study.quiz.questions.map((question, index) => <fieldset key={question.id} disabled={quizSubmitting} className="space-y-2"><legend className="mb-2 text-sm font-semibold">{index + 1}. {question.question}</legend>{question.options.map((option, optionIndex) => {
            const key = question.optionKeys?.[optionIndex] || String.fromCharCode(65 + optionIndex);
            return <label key={key} className="flex items-start gap-2 text-xs"><input type="radio" name={question.id} checked={answers[question.id] === key} onChange={() => chooseAnswer(question.id,key)} /><span>{option}</span></label>;
          })}</fieldset>)}
          <button className={buttonClass} disabled={quizSubmitting||!attemptActive} onClick={submitQuiz}>{quizSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}</button>
          {quizResult?.courseId === study.id && <p role="status" className="text-xs">Điểm: {quizResult.score}% · {quizResult.correctCount}/{quizResult.totalQuestions} câu đúng · {quizResult.isPassed ? 'Đạt' : 'Chưa đạt'}</p>}
        </div> : <Empty></Empty>)}
        {tab==='exam'&&!attemptActive&&quizResult?.courseId===study.id&&<p role="status" className="text-xs">Điểm: {quizResult.score}% · {quizResult.correctCount}/{quizResult.totalQuestions} câu đúng · {quizResult.isPassed?'Đạt':'Chưa đạt'}</p>}
        {tab === 'exam' && renderQuizHistory()}
        {tab === 'results' && <div className="space-y-3 text-xs">
          <h2 className="text-base font-bold">Kết quả học tập</h2>
          {renderQuizHistory()}
          {study.academicRecord ? <><p>Lý thuyết: {study.academicRecord.theoryScore}/10</p><p>Thực hành: {study.academicRecord.practicalScore}/10</p><p>Chuyên cần: {study.academicRecord.attendedSessions}/{study.academicRecord.totalBatchSessions} buổi · {study.academicRecord.attendanceRate}%</p><p>{study.academicRecord.isGraduated ? 'Đã tốt nghiệp' : 'Chưa tốt nghiệp'}</p>{([['feedbackTheory','Nhận xét lý thuyết'],['feedbackPractical','Nhận xét thực hành'],['feedbackAttendance','Nhận xét chuyên cần'],['feedbackAttitude','Nhận xét thái độ']] as const).map(([field,label])=>study.academicRecord?.[field]&&<p key={field} className="whitespace-pre-wrap"><strong>{label}: </strong>{study.academicRecord[field]}</p>)}</> : <Empty></Empty>}
          <h3 className="text-sm font-bold">Chứng chỉ</h3>
          {study.certificate?.status === 'ISSUED' ? <><p>{study.certificate.certificateCode}</p><p>{study.certificate.studentName} · {study.certificate.courseTitle}</p><p>Ngày cấp: {date(study.certificate.issueDate)} · {study.certificate.finalGrade}</p>{safeUrl(study.certificate.certificatePdfUrl) ? <a href={safeUrl(study.certificate.certificatePdfUrl)} target="_blank" rel="noopener noreferrer" className="underline">Mở chứng chỉ PDF</a> : <Empty></Empty>}</> : <Empty></Empty>}
          {study.certificate?.status === 'ISSUED' && typeof study.certificate.qrVerificationCode === 'string' && study.certificate.qrVerificationCode.trim() && <div className="space-y-2">
            <QRCode value={study.certificate.qrVerificationCode} />
            <p className="break-all">{study.certificate.qrVerificationCode}</p>
          </div>}
        </div>}
      </>}
      </main>
      {nextLesson && <AcademyFooter summary={nextLesson.title}><button className="academy-primary" disabled={learningLoading || Boolean(learningError)} onClick={()=>openLesson(nextLesson)}>Tiếp tục bài học</button></AcademyFooter>}
    </>}

    {lesson && <div role="dialog" aria-modal="true" aria-label={lesson.title} className="academy-lesson-dialog">
      <div className="space-y-4">
        <button className={buttonClass} disabled={progressSaving} onClick={() => void closeLesson()} aria-label="Đóng bài học"><ArrowLeftIcon size={16} /></button>
        <h2 className="text-lg font-bold break-words">{lesson.title}</h2>
        {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
        {notice && <p role="status" className="text-xs">{notice}</p>}
        {safeUrl(lesson.videoUrl) ? <video ref={videoRef} key={`${study?.id || selected?.id}-${lesson.id}`} controls playsInline src={safeUrl(lesson.videoUrl)} className="aspect-video w-full bg-black"
          onPlay={event => { lastPlaybackTime.current = event.currentTarget.currentTime; }}
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
          onPause={event => { if (activeLesson && !event.currentTarget.ended && !closingLesson.current) {void flushHeartbeat().then(saved=>saved?saveProgress(false, notes):false);} }}
          onEnded={event => {
            if (activeLesson) {void flushHeartbeat().then(saved=>saved?saveProgress(false,notes):false);}
          }}
          onError={() => setActionError('Không thể phát video bài học.')}
        /> : !isReadingLesson(lesson) && <Empty></Empty>}
        {lesson.contentText && <p className="whitespace-pre-wrap text-sm">{lesson.contentText}</p>}
        {lesson.learningGoals?.map((goal, index) => <p key={index} className="text-xs">{displayText(goal)}</p>)}
        {documents([lesson])}
        {activeLesson && isReadingLesson(activeLesson) && <button className={buttonClass} disabled={progressSaving || activeLesson.isCompleted} onClick={() => void saveProgress(true, notes)}>
          {progressSaving ? 'Đang lưu...' : activeLesson.isCompleted ? 'Đã xác nhận đã đọc' : 'Đánh dấu đã đọc'}
        </button>}
        {activeLesson && <><label className="block text-xs font-semibold">Ghi chú<textarea aria-label="Ghi chú" value={notes} onChange={event => {
          const value=event.target.value;setNotes(value);
          if(study && activeEnrollmentId)try{localStorage.setItem(noteKey(study.id,activeEnrollmentId,activeLesson.id),JSON.stringify(value));}catch{}
        }} className="mt-2 min-h-28 w-full rounded-[8px] border p-3 text-sm" /></label><button className={buttonClass} disabled={progressSaving} onClick={() => void saveProgress(false, notes)}>{progressSaving ? 'Đang lưu...' : 'Lưu ghi chú'}</button></>}
      </div>
    </div>}
  </div>;
};
