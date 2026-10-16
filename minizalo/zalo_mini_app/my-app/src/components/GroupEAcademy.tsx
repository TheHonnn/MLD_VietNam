import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { Course, CourseEnrollment } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, FileTextIcon, PlayCircleIcon } from './Icons';
import { QRCode } from './QRCode';
import { EntityImage } from './GroupBExtensions';

interface GroupEAcademyProps {
  courses: Course[];
  onOpenBooking?: () => void;
  mode?: 'catalog' | 'learning';
  initialCourseId?: string;
}

type Lesson = Course['lessons'][number] & {
  chapterId?: string; lessonType?: string; contentText?: string; learningGoals?: string[];
  attachments?: unknown[]; watchedSeconds?: number; studentNotes?: string; isFreePreview?: boolean;
};
// These fields are returned by the shared learning endpoint and preserved by the adapter.
type QuizSubmission = { id: string; score: number; correctCount: number; passed: boolean; submittedAt: string; quizId: string };
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
const isReadingLesson = (lesson: Lesson) => ['TEXT', 'PDF', 'READING_DOC'].includes(lesson.lessonType?.toUpperCase() || '');
const statusLabel = (status: string) => ({ consulting: 'Chờ tư vấn', deposited: 'Đã đặt cọc', enrolled: 'Đã ghi danh', studying: 'Đang học', graduated: 'Đã tốt nghiệp', dropped: 'Đã ngừng học' }[status.toLowerCase()] || status);
const money = (value: number) => value != null && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('vi-VN')}đ` : 'Chưa có thông tin';
const date = (value?: string) => {
  if (!value) return 'Chưa có thông tin';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa có thông tin' : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
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
const Empty = ({ children }: { children: React.ReactNode }) => <p className="py-4 text-xs text-[#66736C]">{children}</p>;

export const GroupEAcademy: React.FC<GroupEAcademyProps> = ({ courses, mode = 'catalog', initialCourseId }) => {
  const [tab, setTab] = useState<Tab>(initialCourseId ? 'catalog' : mode === 'learning' ? 'my_courses' : 'catalog');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialCourseId || null);
  const [registering, setRegistering] = useState(false);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrollmentVersion, setEnrollmentVersion] = useState(0);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [studyId, setStudyId] = useState('');
  const [learning, setLearning] = useState<AcademyCourse | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningError, setLearningError] = useState('');
  const [learningVersion, setLearningVersion] = useState(0);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [progressSaving, setProgressSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const registrationLock = useRef(false);
  const quizLock = useRef(false);
  const progressLock = useRef(false);
  const watched = useRef(0);
  const lastPlaybackTime = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedId(initialCourseId);
      setTab('catalog');
      setLessonId(null);
      setActionError('');
      setNotice('');
    } else setTab(mode === 'learning' ? 'my_courses' : 'catalog');
  }, [mode, initialCourseId]);
  useEffect(() => {
    let cancelled = false;
    setEnrollmentLoading(true);
    setEnrollmentError('');
    apiClient.getCourseEnrollments().then(response => {
      if (cancelled) return;
      if (response?.error || !Array.isArray(response?.enrollments)) setEnrollmentError(response?.error || 'Không thể tải đăng ký học.');
      else setEnrollments(response.enrollments);
    }).catch(() => { if (!cancelled) setEnrollmentError('Không thể tải đăng ký học.'); })
      .then(() => { if (!cancelled) setEnrollmentLoading(false); });
    return () => { cancelled = true; };
  }, [enrollmentVersion]);

  const eligible = enrollments.filter(item => accessible(item.status));
  const studyEnrollment = eligible.find(item => item.courseId === studyId) || eligible[0];
  const activeCourseId = studyEnrollment?.courseId;
  const study = learning?.id === activeCourseId ? learning : null;
  const selected = courses.find(course => course.id === selectedId) as AcademyCourse | undefined;
  const activeLesson = study?.lessons.find(lesson => lesson.id === lessonId);
  const previewLesson = selected?.lessons.find(lesson => lesson.id === lessonId && lesson.isFreePreview === true);
  const lesson = activeLesson || previewLesson;
  const categories = Array.from(new Set(courses.map(course => course.category).filter(Boolean)));
  const levels = Array.from(new Set(courses.map(course => course.level).filter(Boolean)));
  const filtered = courses.filter(course => (!category || course.category === category) && (!level || course.level === level)
    && `${course.title} ${course.category} ${course.description} ${course.instructor}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));

  useEffect(() => {
    let cancelled = false;
    setLearning(null);
    setLearningError('');
    setLessonId(null);
    setAnswers({});
    setQuizResult(null);
    setActionError('');
    setLearningLoading(Boolean(activeCourseId));
    if (!activeCourseId) return;
    apiClient.getCourseLearning(activeCourseId).then(response => {
      if (cancelled) return;
      if (response?.error || response?.course?.id !== activeCourseId) setLearningError(response?.error || 'Không thể tải nội dung học.');
      else setLearning(response.course);
    }).catch(() => { if (!cancelled) setLearningError('Không thể tải nội dung học.'); })
      .then(() => { if (!cancelled) setLearningLoading(false); });
    return () => { cancelled = true; };
  }, [activeCourseId, learningVersion]);

  const openLesson = (item: Lesson) => {
    setActionError(''); setNotice('');
    watched.current = Number(item.watchedSeconds) || 0;
    lastPlaybackTime.current = null;
    setNotes(item.studentNotes || '');
    setLessonId(item.id);
  };
  const saveProgress = async (completed = false, studentNotes?: string) => {
    if (!study || !activeLesson || progressLock.current) return;
    const courseId = study.id, savedLessonId = activeLesson.id;
    progressLock.current = true; setProgressSaving(true); setActionError('');
    try {
      const response = await apiClient.saveLessonProgress(courseId, savedLessonId, {
        watchedSeconds: Math.floor(watched.current), ...(completed ? { isCompleted: true } : {}),
        ...(studentNotes !== undefined ? { studentNotes } : {}),
      });
      if (!response || response.error || !response.progress) throw new Error(response?.error || 'Không thể lưu tiến trình học.');
      const progress = response.progress;
      setLearning(current => current?.id === courseId ? { ...current, lessons: current.lessons.map(item => item.id === savedLessonId ? {
        ...item, watchedSeconds: progress.watchedSeconds, isCompleted: progress.isCompleted, studentNotes: progress.studentNotes,
      } : item) } : current);
      if (response.enrollment) setEnrollments(current => current.map(item => item.id === response.enrollment.id ? response.enrollment : item));
      else setEnrollmentVersion(value => value + 1);
      setNotice(completed && isReadingLesson(activeLesson) && progress.isCompleted ? 'Đã ghi nhận xác nhận đã đọc.' : 'Đã lưu tiến trình học.');
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Không thể lưu tiến trình học.'); }
    finally { progressLock.current = false; setProgressSaving(false); }
  };
  const register = async () => {
    if (!selected || registrationLock.current || enrollmentLoading || enrollmentError) return;
    registrationLock.current = true; setRegistering(true); setActionError(''); setNotice('');
    try {
      const response = await apiClient.enrollCourse({ courseId: selected.id });
      if (response?.error || !response?.enrollment?.id) throw new Error(response?.error || 'Không thể đăng ký khóa học.');
      setEnrollments(current => [response.enrollment, ...current.filter(item => item.id !== response.enrollment.id)]);
      setSelectedId(null); setTab('my_courses');
      setNotice(`Đã ghi nhận đăng ký: ${statusLabel(response.enrollment.status)}.`);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Không thể đăng ký khóa học.'); }
    finally { registrationLock.current = false; setRegistering(false); }
  };
  const submitQuiz = async () => {
    if (!study?.quiz?.questions.length || quizLock.current) return;
    if (study.quiz.questions.some(question => !answers[question.id])) { setActionError('Vui lòng trả lời tất cả câu hỏi.'); return; }
    const courseId = study.id;
    quizLock.current = true; setQuizSubmitting(true); setActionError('');
    try {
      const response = await apiClient.submitQuiz(courseId, answers);
      if (response?.error || !response?.submission?.id || response.score == null) throw new Error(response?.error || 'Không thể nộp bài kiểm tra.');
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
    return links.length ? links : <Empty>Chưa có tài liệu được cung cấp.</Empty>;
  };
  const renderLesson = (item: Lesson) => <button key={item.id} className={`${buttonClass} flex w-full items-center gap-2 text-left`} onClick={() => openLesson(item)}>
    {isReadingLesson(item) ? <FileTextIcon size={18} /> : <PlayCircleIcon size={18} />}<span className="min-w-0 break-words">{item.title}<small className="block font-normal">{item.duration}{item.isCompleted ? ' · Đã hoàn thành' : ''}</small></span>
  </button>;
  const renderQuizHistory = () => <section className="space-y-2 text-xs" aria-label="Lịch sử bài kiểm tra">
    <h3 className="text-sm font-bold">Lịch sử bài kiểm tra</h3>
    {study?.quizSubmissions === undefined ? <Empty>Chưa có dữ liệu lịch sử bài kiểm tra được cung cấp.</Empty>
      : study.quizSubmissions.length === 0 ? <Empty>Chưa có bài kiểm tra đã nộp.</Empty>
        : [...study.quizSubmissions].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)).map(submission => {
          const submitted = new Date(submission.submittedAt);
          return <div key={submission.id} className="space-y-1 border-b py-3">
            <p className="break-words font-semibold">{submission.quizId === study.quiz?.id ? study.quiz.title : submission.quizId}</p>
            <p>Điểm: {Number(submission.score).toLocaleString('vi-VN')}/10 · {submission.correctCount} câu đúng · {submission.passed ? 'Đạt' : 'Chưa đạt'}</p>
            <p>Ngày nộp: {Number.isNaN(submitted.getTime()) ? 'Chưa có thông tin' : submitted.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
          </div>;
        })}
  </section>;

  return <div className="space-y-4 px-3 pb-24 pt-3 text-[#263C32]">
    <h1 className="text-xl font-bold">Học viện đào tạo</h1>
    <nav className="flex gap-2 overflow-x-auto" aria-label="Học viện">
      {([['catalog', 'Khóa học'], ['my_courses', 'Khóa học của tôi'], ['content', 'Nội dung học'], ['schedule', 'Lịch học'], ['documents', 'Tài liệu'], ['exam', 'Kiểm tra'], ['results', 'Kết quả']] as [Tab, string][]).map(([id, label]) =>
        <button key={id} aria-current={tab === id ? 'page' : undefined} className={`${buttonClass} shrink-0 ${tab === id ? 'border-[#276749] text-[#276749]' : ''}`} onClick={() => { setTab(id); setSelectedId(null); setLessonId(null); setActionError(''); }}>{label}</button>)}
    </nav>
    {notice && <p role="status" className="text-xs text-[#276749]">{notice}</p>}
    {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}
    {enrollmentLoading && <p role="status" className="text-xs">Đang tải đăng ký học...</p>}
    {enrollmentError && <div role="alert" className="text-xs text-red-700">{enrollmentError} <button className={buttonClass} onClick={() => setEnrollmentVersion(value => value + 1)}>Thử lại</button></div>}

    {tab === 'catalog' && selectedId && !selected && <div>
      <button className={buttonClass} onClick={() => setSelectedId(null)} aria-label="Quay lại khóa học"><ArrowLeftIcon size={16} /></button>
      <Empty>Chưa có thông tin khóa học đã chọn.</Empty>
    </div>}
    {tab === 'catalog' && !selectedId && <>
      <input aria-label="Tìm khóa học" placeholder="Tìm khóa học" value={search} onChange={event => setSearch(event.target.value)} className="min-h-10 w-full rounded-[8px] border bg-white px-3 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Danh mục" value={category} onChange={event => setCategory(event.target.value)} className={`${buttonClass} min-w-0`}><option value="">Tất cả danh mục</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Trình độ" value={level} onChange={event => setLevel(event.target.value)} className={`${buttonClass} min-w-0`}><option value="">Tất cả trình độ</option>{levels.map(value => <option key={value}>{value}</option>)}</select>
      </div>
      {!filtered.length && <Empty>Chưa có khóa học phù hợp.</Empty>}
      {filtered.map(course => <button key={course.id} className="w-full space-y-2 border-b py-3 text-left" onClick={() => { setSelectedId(course.id); setActionError(''); setNotice(''); }}>
        <EntityImage src={safeUrl(course.image)} alt={course.title} className="aspect-[16/9] w-full" />
        <h2 className="text-base font-bold break-words">{course.title}</h2>
        <p className="text-xs">{course.category} · {course.duration}</p><p className="text-sm font-semibold">{money(course.price)}</p>
      </button>)}
    </>}

    {tab === 'catalog' && selected && <div className="space-y-4">
      <button aria-label="Quay lại khóa học" className={buttonClass} onClick={() => { setSelectedId(null); setLessonId(null); }}><ArrowLeftIcon size={16} /></button>
      <h2 className="text-lg font-bold break-words">{selected.title}</h2>
      <EntityImage src={safeUrl(selected.image)} alt={selected.title} className="aspect-[16/9] w-full" />
      <p className="whitespace-pre-wrap text-sm">{selected.description || 'Chưa có giới thiệu khóa học.'}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs"><dt>Mã khóa học</dt><dd>{selected.code}</dd><dt>Trình độ</dt><dd>{selected.level}</dd><dt>Tổng số giờ</dt><dd>{selected.totalHours}</dd><dt>Lý thuyết / thực hành</dt><dd>{selected.theoryHours} / {selected.practiceHours} giờ</dd><dt>Học phí</dt><dd>{money(selected.price)}</dd><dt>Mức đặt cọc</dt><dd>{money(selected.depositAmount)}</dd></dl>
      <h3 className="text-sm font-bold">Giảng viên</h3>
      {selected.instructorProfile ? <div className="space-y-2 text-xs">
        <EntityImage src={safeUrl(selected.instructorProfile.avatarUrl)} alt={selected.instructorProfile.fullName} className="h-20 w-20" />
        <p>{selected.instructorProfile.fullName} {selected.instructorProfile.title}</p>
        {selected.instructorProfile.experienceYears != null && <p>{selected.instructorProfile.experienceYears} năm kinh nghiệm</p>}
        <p className="whitespace-pre-wrap">{selected.instructorProfile.bio}</p>
        {selected.instructorProfile.achievements?.map((achievement, index) => <p key={index}>{displayText(achievement)}</p>)}
      </div> : <Empty>{selected.instructor || 'Chưa có thông tin giảng viên.'}</Empty>}
      <h3 className="text-sm font-bold">Lớp học</h3>
      {selected.batches?.length ? selected.batches.map(batch => <div key={batch.id} className="space-y-1 border-b py-2 text-xs"><p>{batch.batchCode} · {batch.status}</p><p>{batch.branchName} · {batch.instructorName}</p><p>{date(batch.startDate)} - {date(batch.endDate)}</p><p>{batch.scheduleText}</p></div>) : <Empty>Chưa có lớp học được công bố.</Empty>}
      <h3 className="text-sm font-bold">Bài học xem trước</h3>
      {selected.lessons.filter(item => item.isFreePreview === true).length ? selected.lessons.filter(item => item.isFreePreview === true).map(renderLesson) : <Empty>Chưa có bài học xem trước.</Empty>}
      <p className="text-xs">Thanh toán học phí và ưu đãi chưa khả dụng trong ứng dụng.</p>
      <button className={buttonClass} disabled={registering || enrollmentLoading || Boolean(enrollmentError) || enrollments.some(item => item.courseId === selected.id && item.status.toLowerCase() !== 'dropped')} onClick={register}>
        {registering ? 'Đang gửi đăng ký...' : enrollments.some(item => item.courseId === selected.id && item.status.toLowerCase() !== 'dropped') ? 'Đã đăng ký' : 'Đăng ký tư vấn khóa học'}
      </button>
    </div>}

    {tab === 'my_courses' && !enrollmentLoading && !enrollmentError && <>
      {!enrollments.length && <Empty>Bạn chưa đăng ký khóa học nào.</Empty>}
      {enrollments.map(item => <div key={item.id} className="space-y-2 border-b py-3 text-xs">
        <h2 className="text-base font-bold">{item.courseTitle}</h2><p>{statusLabel(item.status)}</p>
        <p>Học phí: {money(item.totalAmount)} · Đã thanh toán: {money(item.amountPaid)}</p>
        <p>Tiến trình: {item.progressPercent}%</p><progress value={item.progressPercent} max={100} className="h-2 w-full" />
        {accessible(item.status) && <button className={buttonClass} onClick={() => { setStudyId(item.courseId); setTab('content'); }}>Vào học</button>}
      </div>)}
    </>}

    {!['catalog', 'my_courses'].includes(tab) && <>
      {!enrollmentLoading && !enrollmentError && !eligible.length && <Empty>Chưa có khóa học được cấp quyền học tập.</Empty>}
      {eligible.length > 0 && <select aria-label="Khóa học đang xem" value={activeCourseId} disabled={quizSubmitting || progressSaving} onChange={event => { setStudyId(event.target.value); setLessonId(null); }} className={`${buttonClass} w-full min-w-0`}>
        {eligible.map(item => <option key={item.id} value={item.courseId}>{item.courseTitle}</option>)}
      </select>}
      {learningLoading && <p role="status" className="text-xs">Đang tải nội dung học...</p>}
      {learningError && <div role="alert" className="text-xs text-red-700">{learningError} <button className={buttonClass} onClick={() => setLearningVersion(value => value + 1)}>Thử lại</button></div>}
      {study && !learningLoading && !learningError && <>
        {tab === 'content' && <div className="space-y-3">
          <h2 className="text-base font-bold">{study.title}</h2>
          {study.chapters?.map(chapter => <div key={chapter.id} className="space-y-2"><h3 className="text-sm font-semibold">{chapter.title}</h3>{chapter.description && <p className="text-xs">{chapter.description}</p>}{study.lessons.filter(item => item.chapterId === chapter.id).map(renderLesson)}</div>)}
          {study.lessons.filter(item => !study.chapters?.some(chapter => chapter.id === item.chapterId)).map(renderLesson)}
          {!study.lessons.length && <Empty>Chưa có nội dung bài học.</Empty>}
        </div>}
        {tab === 'schedule' && (study.schedules?.length ? study.schedules.map(session => <div key={session.id} className="space-y-1 border-b py-3 text-xs"><h3 className="font-semibold">{session.topic}</h3><p>{date(session.sessionDate)} · {session.startTime} - {session.endTime}</p><p>{session.roomName || 'Chưa có phòng học'} · {session.instructorName || 'Chưa có thông tin giảng viên'}</p><p>Điểm danh: {session.attendanceStatus || 'Chưa ghi nhận'}</p></div>) : <Empty>Chưa có lịch học được cung cấp.</Empty>)}
        {tab === 'documents' && documents(study.lessons)}
        {tab === 'exam' && (study.quiz?.questions.length ? <div className="space-y-4">
          <h2 className="text-base font-bold">{study.quiz.title}</h2><p className="text-xs">Điểm đạt: {study.quiz.passingScore}%</p>
          {study.quiz.questions.map((question, index) => <fieldset key={question.id} disabled={quizSubmitting} className="space-y-2"><legend className="mb-2 text-sm font-semibold">{index + 1}. {question.question}</legend>{question.options.map((option, optionIndex) => {
            const key = question.optionKeys?.[optionIndex] || String.fromCharCode(65 + optionIndex);
            return <label key={key} className="flex items-start gap-2 text-xs"><input type="radio" name={question.id} checked={answers[question.id] === key} onChange={() => setAnswers(current => ({ ...current, [question.id]: key }))} /><span>{option}</span></label>;
          })}</fieldset>)}
          <button className={buttonClass} disabled={quizSubmitting} onClick={submitQuiz}>{quizSubmitting ? 'Đang nộp bài...' : 'Nộp bài'}</button>
          {quizResult?.courseId === study.id && <p role="status" className="text-xs">Điểm: {quizResult.score}% · {quizResult.correctCount}/{quizResult.totalQuestions} câu đúng · {quizResult.isPassed ? 'Đạt' : 'Chưa đạt'}</p>}
        </div> : <Empty>Chưa có bài kiểm tra được cung cấp.</Empty>)}
        {tab === 'exam' && renderQuizHistory()}
        {tab === 'results' && <div className="space-y-3 text-xs">
          <h2 className="text-base font-bold">Kết quả học tập</h2>
          {renderQuizHistory()}
          {study.academicRecord ? <><p>Lý thuyết: {study.academicRecord.theoryScore}/10</p><p>Thực hành: {study.academicRecord.practicalScore}/10</p><p>Chuyên cần: {study.academicRecord.attendedSessions}/{study.academicRecord.totalBatchSessions} buổi · {study.academicRecord.attendanceRate}%</p><p>{study.academicRecord.isGraduated ? 'Đã tốt nghiệp' : 'Chưa tốt nghiệp'}</p>{[study.academicRecord.feedbackTheory, study.academicRecord.feedbackPractical, study.academicRecord.feedbackAttendance, study.academicRecord.feedbackAttitude].filter(Boolean).map((feedback, index) => <p key={index}>{feedback}</p>)}</> : <Empty>Chưa có bảng điểm được cung cấp.</Empty>}
          <h3 className="text-sm font-bold">Chứng chỉ</h3>
          {study.certificate?.status === 'ISSUED' ? <><p>{study.certificate.certificateCode}</p><p>{study.certificate.studentName} · {study.certificate.courseTitle}</p><p>Ngày cấp: {date(study.certificate.issueDate)} · {study.certificate.finalGrade}</p>{safeUrl(study.certificate.certificatePdfUrl) ? <a href={safeUrl(study.certificate.certificatePdfUrl)} target="_blank" rel="noopener noreferrer" className="underline">Mở chứng chỉ PDF</a> : <Empty>Chưa có bản PDF chứng chỉ.</Empty>}</> : <Empty>Chưa có chứng chỉ được cấp.</Empty>}
          {study.certificate?.status === 'ISSUED' && typeof study.certificate.qrVerificationCode === 'string' && study.certificate.qrVerificationCode.trim() && <div className="space-y-2">
            <QRCode value={study.certificate.qrVerificationCode} />
            <p className="break-all">{study.certificate.qrVerificationCode}</p>
          </div>}
        </div>}
      </>}
    </>}

    {lesson && <div role="dialog" aria-modal="true" aria-label={lesson.title} className="fixed inset-0 z-50 overflow-y-auto bg-white px-4 pb-24 pt-4 text-[#263C32]">
      <div className="space-y-4">
        <button className={buttonClass} disabled={progressSaving} onClick={() => { videoRef.current?.pause(); setLessonId(null); }} aria-label="Đóng bài học"><ArrowLeftIcon size={16} /></button>
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
          onPause={event => { if (activeLesson && !event.currentTarget.ended) void saveProgress(); }}
          onEnded={event => {
            const duration = event.currentTarget.duration;
            if (activeLesson && Number.isFinite(duration) && duration > 0) void saveProgress(watched.current >= duration * 0.95);
          }}
          onError={() => setActionError('Không thể phát video bài học.')}
        /> : !isReadingLesson(lesson) && <Empty>Chưa có video cho bài học này.</Empty>}
        {lesson.contentText && <p className="whitespace-pre-wrap text-sm">{lesson.contentText}</p>}
        {lesson.learningGoals?.map((goal, index) => <p key={index} className="text-xs">{displayText(goal)}</p>)}
        {documents([lesson])}
        {activeLesson && isReadingLesson(activeLesson) && <button className={buttonClass} disabled={progressSaving || activeLesson.isCompleted} onClick={() => void saveProgress(true, notes)}>
          {progressSaving ? 'Đang lưu...' : activeLesson.isCompleted ? 'Đã xác nhận đã đọc' : 'Đánh dấu đã đọc'}
        </button>}
        {activeLesson && <><label className="block text-xs font-semibold">Ghi chú<textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 min-h-28 w-full rounded-[8px] border p-3 text-sm" /></label><button className={buttonClass} disabled={progressSaving} onClick={() => void saveProgress(false, notes)}>{progressSaving ? 'Đang lưu...' : 'Lưu ghi chú'}</button></>}
      </div>
    </div>}
  </div>;
};
