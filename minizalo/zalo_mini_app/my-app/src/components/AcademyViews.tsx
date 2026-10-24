import React, { useState } from 'react';
import type { Branch, Course, CourseAudience, CourseEnrollment, User } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, BellIcon, NavProfileIcon, SearchIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import { searchText } from '@/utils/catalog';

export const academyMoney = (value?: number) => value != null && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('vi-VN')}đ` : '';
export const academyDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : '';
export const enrollmentLabel = (status: string) => ({consulting:'Chờ tư vấn',deposited:'Đã đặt cọc',enrolled:'Đã ghi danh',studying:'Đang học',graduated:'Đã hoàn thành',dropped:'Đã ngừng học'}[status.toLowerCase()] || status);
export const canStudy = (status: string) => ['enrolled','studying','graduated'].includes(status.toLowerCase());
export type AcademyEnrollment = CourseEnrollment & {accessExpiresAt?:string|null;accessExpired?:boolean;batchCode?:string;branchName?:string;instructorName?:string;startDate?:string;endDate?:string;scheduleText?:string;totalLessons?:number;completedLessonsCount?:number;remainingMinutes?:number;nextLessonTitle?:string;tuitionTransactions?:{id:string;transactionCode:string;amount:number;paymentStatus:string;paidAt:string;receiptPdfUrl?:string}[]};

export function AcademyHeader({title,subtitle,onBack,eyebrow=false,backDisabled=false}:{title:string;subtitle?:string;onBack?:()=>void;eyebrow?:boolean;backDisabled?:boolean}) {
  return <header className="academy-header">{onBack ? <button className="academy-back" type="button" title="Quay lại" disabled={backDisabled} onClick={onBack}><ArrowLeftIcon size={19}/></button> : eyebrow && <span className="academy-eyebrow">HỌC VIỆN ĐÀO TẠO</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>;
}
export function AcademyFooter({children,summary}:{children:React.ReactNode;summary?:React.ReactNode}) {
  return <footer className="academy-footer">{summary && <p>{summary}</p>}{children}</footer>;
}
export function AcademyHome({courses,user,branches,branchId,onBranch,onCatalog,onMine,onCertificates,onNotifications}:{courses:Course[];user?:User;branches:Branch[];branchId:string;onBranch:(id:string)=>void;onCatalog:(audience?:CourseAudience)=>void;onMine:()=>void;onCertificates:()=>void;onNotifications:()=>void}) {
  const scoped=branchId?courses.filter(course=>course.batches?.some(batch=>batch.branchId===branchId)):courses;
  const featured=scoped.find(course=>course.isFeatured)||scoped[0];
  return <><AcademyHeader title="Học viện đào tạo" subtitle="Kiến tạo kỹ năng – Phát triển nghề nghiệp" eyebrow/>
    <main className="academy-body academy-home">
      <div className="academy-greeting"><span className="academy-avatar">{user?.avatar?<EntityImage src={user.avatar} alt={user.name} className="academy-avatar-image"/>:<NavProfileIcon size={22}/>}</span><div><strong>{user?.name?`Xin chào, ${user.name}!`:'Xin chào!'}</strong><p>Sẵn sàng nâng cao kỹ năng hôm nay?</p></div><button type="button" title="Thông báo" onClick={onNotifications}><BellIcon size={20}/></button></div>
      <select aria-label="Chi nhánh học viện" value={branchId} onChange={event=>onBranch(event.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
      <section className="academy-feature"><EntityImage src={featured?.image} alt={featured?.title||''} className="academy-feature-photo"/><div><span className="academy-eyebrow">HỌC VIỆN ĐÀO TẠO NGHỀ</span><h2>{featured?.title}</h2><p>{featured?.description}</p><button type="button" className="academy-outline" onClick={()=>onCatalog()}>Khám phá khóa học</button></div></section>
      <div className="academy-chips" role="group" aria-label="Nhóm đào tạo"><button type="button" onClick={()=>onCatalog('BEGINNER')}>Mới bắt đầu</button><button type="button" onClick={()=>onCatalog('PRACTITIONER')}>Đang làm nghề</button></div>
      <button type="button" className="academy-outline" onClick={onMine}>Khóa học của tôi</button>
      <button type="button" className="academy-outline" onClick={onCertificates}>Giấy chứng nhận</button>
    </main></>;
}

export function AcademyCatalog({courses,branches,branchId,onBranch,onBack,onCourse,instructorId,initialQuery='',initialAudience=''}:{courses:Course[];branches:Branch[];branchId:string;onBranch:(id:string)=>void;onBack:()=>void;onCourse:(course:Course)=>void;instructorId?:string;initialQuery?:string;initialAudience?:CourseAudience|''}) {
  const [audience,setAudience]=useState<CourseAudience|''>(initialAudience);
  const [search,setSearch]=useState(initialQuery),[category,setCategory]=useState(''),[level,setLevel]=useState(''),[hours,setHours]=useState(''),[price,setPrice]=useState(''),[format,setFormat]=useState('');
  const formats=Array.from(new Set(courses.map(course=>course.deliveryFormat).filter(Boolean)));
  const categories=Array.from(new Set(courses.map(course=>course.category).filter(Boolean)));
  const levels=Array.from(new Set(courses.map(course=>course.level).filter(Boolean)));
  const durations=Array.from(new Set(courses.map(course=>course.totalHours).filter(value=>value!=null))).sort((a,b)=>a-b);
  const prices=Array.from(new Set(courses.map(course=>course.price).filter(Number.isFinite))).sort((a,b)=>a-b);
  const filtered=courses.filter(course=>(!audience||course.trainingAudience===audience)&&(!instructorId||course.instructorProfile?.id===instructorId)&&(!branchId||course.batches?.some(batch=>batch.branchId===branchId))&&(!category||course.category===category)&&(!level||course.level===level)&&(!hours||course.totalHours===Number(hours))&&(!price||course.price===Number(price))&&(!format||course.deliveryFormat===format)&&searchText(`${course.title} ${course.category} ${course.instructor} ${course.description}`).includes(searchText(search)));
  return <><AcademyHeader title="Khám phá khóa học" subtitle="Chọn chương trình đào tạo phù hợp với mục tiêu nghề nghiệp của bạn." onBack={onBack}/><main className="academy-body">
    <label className="academy-search"><SearchIcon size={19}/><input aria-label="Tìm khóa học" placeholder="Tìm khóa học, kỹ năng hoặc chuyên ngành..." value={search} onChange={event=>setSearch(event.target.value)}/></label>
    <div className="academy-chips" role="group" aria-label="Nhóm đào tạo">{([['','Tất cả'],['BEGINNER','Mới bắt đầu'],['PRACTITIONER','Đang làm nghề']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={audience===value} onClick={()=>setAudience(value)}>{label}</button>)}</div>
    <h2 className="academy-filter-title">Tinh chỉnh chương trình</h2><div className="academy-filters">
      <label>Chuyên ngành<select aria-label="Chuyên ngành" value={category} onChange={event=>setCategory(event.target.value)}><option value="">Tất cả</option>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Trình độ<select aria-label="Trình độ" value={level} onChange={event=>setLevel(event.target.value)}><option value="">Tất cả</option>{levels.map(value=><option key={value} value={value}>{({BEGINNER:'Cơ bản',INTERMEDIATE:'Trung cấp',ADVANCED:'Nâng cao',MASTER:'Chuyên sâu'} as Record<string,string>)[value]||value}</option>)}</select></label>
      <label>Thời lượng<select value={hours} onChange={event=>setHours(event.target.value)}><option value="">Tất cả</option>{durations.map(value=><option key={value} value={value}>{value} giờ</option>)}</select></label>
      <label>Học phí<select value={price} onChange={event=>setPrice(event.target.value)}><option value="">Tất cả</option>{prices.map(value=><option key={value} value={value}>{academyMoney(value)}</option>)}</select></label>
      <label>Hình thức<select aria-label="Hình thức" value={format} onChange={event=>setFormat(event.target.value)}><option value="">Tất cả</option>{formats.map(value=><option key={value} value={value!}>{({ONLINE:'Trực tuyến',ONSITE:'Trực tiếp',HYBRID:'Kết hợp'})[value!]}</option>)}</select></label>
    </div><label className="academy-field">Chi nhánh<select value={branchId} onChange={event=>onBranch(event.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
    <h2 className="academy-count">{filtered.length} chương trình đào tạo</h2>
    {filtered.map(course=><button type="button" key={course.id} className="academy-course-card" onClick={()=>onCourse(course)}><EntityImage src={course.image} alt={course.title} className="academy-course-photo"/><span><strong>{course.title}</strong><small>{[course.category,course.duration].filter(Boolean).join(' · ')}</small><b>{academyMoney(course.price)}</b></span></button>)}
  </main></>;
}

export function AcademyCourseDetail({course,onBack,onInstructor,onRegister,registered,onPreview}:{course:Course;onBack:()=>void;onInstructor:()=>void;onRegister:()=>void;registered:boolean;onPreview:(lesson:Course['lessons'][number])=>void}) {
  return <><AcademyHeader title={course.title} onBack={onBack}/><main className="academy-body">
    <EntityImage src={course.image} alt={course.title} className="academy-cover"/>
    <section className="academy-summary"><span>{course.category}</span><div className="academy-metrics"><div><strong>{course.totalHours}</strong><small>giờ đào tạo</small></div><div><strong>{course.lessonsCount}</strong><small>bài học</small></div></div><p>{course.theoryHours} giờ lý thuyết · {course.practiceHours} giờ thực hành</p><p>{academyMoney(course.price)}</p></section>
    <h2>Giới thiệu khóa học</h2><p className="academy-description">{course.description}</p>
    {course.learningOutcomes?.length? <><h2>Kết quả đầu ra</h2><ul>{course.learningOutcomes.map((outcome,index)=><li key={index}>{typeof outcome==='string'?outcome:outcome.title||outcome.description}</li>)}</ul></>:null}
    {!!course.chapters?.length && <section aria-label="Chương trình khóa học"><h2>Chương trình khóa học</h2>{course.chapters.map(chapter => <details key={chapter.id} className="academy-chapter"><summary>{chapter.title}</summary>{chapter.description && <p>{chapter.description}</p>}{course.lessons.filter(lesson => lesson.chapterId === chapter.id).map(lesson => <div key={lesson.id} className="academy-list-row"><strong>{lesson.title}</strong><p>{lesson.duration}</p></div>)}</details>)}</section>}
    {!!course.quizzes?.length && <section><h2>Bài kiểm tra</h2>{course.quizzes.map(quiz => <p key={quiz.id}>{quiz.title}</p>)}</section>}
    <h2>Giảng viên</h2>{course.instructorProfile && <button className="academy-instructor-link" type="button" onClick={onInstructor}><EntityImage src={course.instructorProfile.avatarUrl} alt={course.instructorProfile.fullName} className="academy-instructor-thumb"/><span><strong>{course.instructorProfile.fullName}</strong><small>{course.instructorProfile.title}</small></span></button>}
    <h2>Lớp khai giảng</h2>{course.batches?.map(batch=><div className="academy-list-row" key={batch.id}><strong>{batch.batchCode}</strong><p>{batch.branchName}</p><p>{[academyDate(batch.startDate),academyDate(batch.endDate)].filter(Boolean).join(' – ')}</p><p>{batch.scheduleText}</p></div>)}
    {course.lessons.some(lesson=>lesson.isFreePreview)&&<><h2>Bài học xem trước</h2>{course.lessons.filter(lesson=>lesson.isFreePreview).map(lesson=><button className="academy-lesson-row" key={lesson.id} onClick={()=>onPreview(lesson)}>{lesson.title}<small>{lesson.duration}</small></button>)}</>}
  </main><AcademyFooter summary={`Học phí · ${academyMoney(course.price)}`}><button className="academy-primary" onClick={onRegister}>{registered?'Xem đăng ký':'Đăng ký khóa học'}</button></AcademyFooter></>;
}

export function AcademyInstructor({course,onBack,onCourses}:{course:Course;onBack:()=>void;onCourses:()=>void}) {
  const instructor=course.instructorProfile;
  return <><AcademyHeader title="Thông tin giảng viên" onBack={onBack}/><main className="academy-body"><EntityImage src={instructor?.avatarUrl} alt={instructor?.fullName||''} className="academy-cover"/><section className="academy-instructor-bio"><h2>{instructor?.fullName}</h2><strong>{instructor?.title}</strong></section><h2>Giới thiệu</h2><p className="academy-description">{instructor?.bio}</p>{instructor?.experienceYears!=null&&<p>{instructor.experienceYears} năm kinh nghiệm</p>}{instructor?.achievements?.map((item:unknown,index:number)=><p key={index}>{typeof item==='string'?item:''}</p>)}</main><AcademyFooter><button className="academy-primary" onClick={onCourses}>Xem khóa học của giảng viên</button></AcademyFooter></>;
}

export function AcademyRegistration({course,user,batchId,onBatch,onBack,onContinue}:{course:Course;user?:User;batchId:string;onBatch:(id:string)=>void;onBack:()=>void;onContinue:()=>void}) {
  return <><AcademyHeader title="Đăng ký tư vấn khóa học" subtitle="Thông tin học viên và chương trình quan tâm." onBack={onBack}/><main className="academy-body"><section className="academy-summary"><EntityImage src={course.image} alt={course.title} className="academy-registration-photo"/><h2>{course.title}</h2><p>{course.duration}</p><strong>{academyMoney(course.price)}</strong></section><h2>Thông tin học viên</h2><label className="academy-field">Họ và tên<input value={user?.name||''} readOnly/></label><label className="academy-field">Số điện thoại<input type="tel" value={user?.phone||''} readOnly/></label><label className="academy-field">Email<input type="email" value={user?.email||''} readOnly/></label><label className="academy-field">Lớp khai giảng<select aria-label="Lớp khai giảng" value={batchId} onChange={event=>onBatch(event.target.value)}><option value="">Chọn lớp</option>{course.batches?.map(batch=><option key={batch.id} value={batch.id}>{[batch.batchCode,batch.branchName,academyDate(batch.startDate)].filter(Boolean).join(' · ')}</option>)}</select></label></main><AcademyFooter><button className="academy-primary" onClick={onContinue}>Tiếp tục đăng ký</button></AcademyFooter></>;
}

export function AcademyRegistrationStatus({course,enrollment,batchId,onBack,onSubmit,onMine,busy,error}:{course?:Course;enrollment?:AcademyEnrollment;batchId:string;onBack:()=>void;onSubmit:()=>void;onMine:()=>void;busy:boolean;error:string}) {
  const batch=course?.batches?.find(item=>item.id===batchId);
  return <><AcademyHeader title={enrollment?'Thông tin đăng ký':'Xác nhận đăng ký tư vấn'} onBack={onBack}/><main className="academy-body">
    {enrollment&&<section className="academy-summary"><strong>{enrollmentLabel(enrollment.status)}</strong>{enrollment.accessExpiresAt&&<p>Hạn truy cập: {academyDate(enrollment.accessExpiresAt)}</p>}{enrollment.accessExpired&&<p>Quyền truy cập đã hết hạn hoặc tạm dừng.</p>}</section>}
    <section className="academy-summary"><h2>{course?.title||enrollment?.courseTitle}</h2><p>{enrollment?.studentName}</p><p>{enrollment?.batchCode||batch?.batchCode}</p><p>{enrollment?.branchName||batch?.branchName}</p><p>{enrollment?.scheduleText||batch?.scheduleText}</p></section>
    {error&&<p className="academy-error" role="alert">{error}</p>}
  </main><AcademyFooter><button className="academy-primary" disabled={busy} onClick={enrollment?onMine:onSubmit}>{busy?'Đang gửi đăng ký...':enrollment?'Khóa học của tôi':'Gửi đăng ký tư vấn'}</button></AcademyFooter></>;
}

export function AcademyMyCourses({enrollments,onBack,onLearn,onPayment,onCertificates}:{enrollments:AcademyEnrollment[];onBack:()=>void;onLearn:(entry:AcademyEnrollment)=>void;onPayment:(entry:AcademyEnrollment)=>void;onCertificates:()=>void}) {
  const [filter,setFilter]=useState('auto');
  const current=enrollments.filter(entry=>entry.status!=='dropped');
  const active=current.filter(entry=>['enrolled','studying'].includes(entry.status)),upcoming=current.filter(entry=>['consulting','deposited'].includes(entry.status)),completed=current.filter(entry=>entry.status==='graduated');
  const selectedFilter=filter==='auto'?(active.length?'active':upcoming.length?'upcoming':completed.length?'completed':'active'):filter;
  const visible=selectedFilter==='active'?active:selectedFilter==='upcoming'?upcoming:completed;
  return <><AcademyHeader title="Khóa học của tôi" subtitle="Theo dõi quá trình học tập và phát triển kỹ năng." onBack={onBack}/><main className="academy-body"><section className="academy-summary"><div className="academy-metrics"><div><strong>{current.length}</strong><small>đã đăng ký</small></div><div><strong>{active.length}</strong><small>đang học</small></div><div><strong>{completed.length}</strong><small>hoàn thành</small></div></div>{current.some(entry=>entry.remainingMinutes!=null)&&<p>{(current.reduce((sum,entry)=>sum+(Number(entry.remainingMinutes)||0),0)/60).toLocaleString('vi-VN',{maximumFractionDigits:1})} giờ học còn lại</p>}</section>
    <div className="academy-tabs" role="tablist" aria-label="Trạng thái khóa học">{[['active','Đang học'],['upcoming','Sắp học'],['completed','Đã hoàn thành']].map(([key,label])=><button type="button" key={key} role="tab" aria-selected={selectedFilter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
    <button type="button" className="academy-outline" onClick={onCertificates}>Giấy chứng nhận</button>
    {visible.map(entry=><article key={entry.id} className="academy-enrollment"><span className="academy-status">{enrollmentLabel(entry.status)}{entry.batchCode?` · ${entry.batchCode}`:''}</span><h2>{entry.courseTitle}</h2><p>{[entry.instructorName,academyDate(entry.startDate)].filter(Boolean).join(' · ')}</p><p>{entry.branchName}</p><p>{entry.scheduleText}</p>{entry.accessExpiresAt&&<p>Hạn truy cập: {academyDate(entry.accessExpiresAt)}</p>}{entry.accessExpired&&<p>Quyền học đã hết hạn hoặc tạm dừng.</p>}{canStudy(entry.status)&&<><p>{entry.completedLessonsCount}{entry.totalLessons!=null?` / ${entry.totalLessons}`:''} bài học đã hoàn thành <strong>{entry.progressPercent}%</strong></p><progress value={entry.progressPercent} max={100}/><p>{entry.nextLessonTitle}</p></>}<button className="academy-primary" onClick={()=>canStudy(entry.status)&&!entry.accessExpired?onLearn(entry):onPayment(entry)}>{canStudy(entry.status)&&!entry.accessExpired?'Tiếp tục học':'Xem đăng ký'}</button></article>)}
  </main></>;
}

export function AcademyClassSummary({course,enrollment}:{course?:Course|null;enrollment?:AcademyEnrollment}) {
  return <section className="academy-summary"><span>{enrollmentLabel(enrollment?.status||'')}{enrollment?.batchCode?` · ${enrollment.batchCode}`:''}</span><h2>{course?.title||enrollment?.courseTitle}</h2><p>{enrollment?.instructorName}</p><p>{enrollment?.branchName}</p><p>{enrollment?.scheduleText}</p>{enrollment&&<><p>{enrollment.completedLessonsCount}{enrollment.totalLessons!=null?` / ${enrollment.totalLessons}`:''} bài học đã hoàn thành <strong>{enrollment.progressPercent}%</strong></p><progress value={enrollment.progressPercent} max={100}/></>}</section>;
}
