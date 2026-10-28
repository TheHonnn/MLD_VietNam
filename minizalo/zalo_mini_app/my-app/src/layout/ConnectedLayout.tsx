import React,{useCallback,useEffect,useRef,useState} from 'react';
import {apiClient} from '@/api/client';
import type {User,MedicalService,Branch,Doctor,Course,Booking,AppNotification} from '../../../../backend/src/data/database';
import {useLocale} from '@/i18n';
import {useNavigationHistory} from '@/hooks/useNavigationHistory';
import {BottomNav,NavTabId} from './BottomNav';
import {HomeScreen} from '@/features/home/HomeScreen';
import {ProfileScreen} from '@/features/profile/ProfileScreen';
import {ServicesScreen} from '@/features/services/ServicesScreen';
import {GroupAAuthModal} from '@/components/GroupAAuthModal';
import {GroupBSearch} from '@/components/GroupBSearch';
import {deferredScreen} from '@/components/deferred-screen';
import type {PortalBanner} from '@/components/PortalBanners';
import {canUseStaffTools} from '@/utils/staff';
import {ExaminationServicePicker,LYMPH_BOOKING_NOTE} from '@/components/ExaminationServicePicker';
import '@/css/mobile-connected.scss';

const Academy=deferredScreen(()=>import('@/components/GroupEAcademy').then(m=>({default:m.GroupEAcademy})));
const BookingForm=deferredScreen(()=>import('@/components/CustomerBooking').then(m=>({default:m.CustomerBooking})));
const Appointments=deferredScreen(()=>import('@/components/AppointmentsManager').then(m=>({default:m.AppointmentsManager})));
const Treatment=deferredScreen(()=>import('@/components/GroupDTreatment').then(m=>({default:m.GroupDTreatment})));
const Documents=deferredScreen(()=>import('@/components/SharedRecords').then(m=>({default:m.DocumentLibrary})));
const Community=deferredScreen(()=>import('@/components/SharedRecords').then(m=>({default:m.Community})));
const Certificates=deferredScreen(()=>import('@/components/AcademyCertificates').then(m=>({default:m.AcademyCertificates})));
const Schedule=deferredScreen(()=>import('@/features/academy/MySchedule').then(m=>({default:m.MySchedule})));
const Branches=deferredScreen(()=>import('@/components/GroupBExtensions').then(m=>({default:m.BranchDirectoryModal})));
const Specialists=deferredScreen(()=>import('@/components/GroupBExtensions').then(m=>({default:m.SpecialistDirectoryModal})));
const ServiceDetail=deferredScreen(()=>import('@/components/GroupBExtensions').then(m=>({default:m.ServiceDetailModal})));
const BranchDetail=deferredScreen(()=>import('@/components/GroupBExtensions').then(m=>({default:m.BranchDetailModal})));
const SpecialistDetail=deferredScreen(()=>import('@/components/GroupBExtensions').then(m=>({default:m.SpecialistDetailModal})));
const Inbox=deferredScreen(()=>import('@/features/notifications/Inbox').then(m=>({default:m.Inbox})));
const Sessions=deferredScreen(()=>import('@/components/AccountControls').then(m=>({default:m.AccountSessions})));
const StaffWork=deferredScreen(()=>import('@/features/staff/StaffWork').then(m=>({default:m.StaffWork})));
type View='care_guide'|'consultation'|'review'|'examination'|'booking'|'appointments'|'packages'|'journal'|'support'|'community'|'my-courses'|'schedule'|'certificates'|'branches'|'specialists'|'service-detail'|'branch-detail'|'specialist-detail'|'notifications'|'sessions'|'staff-work';
const protectedViews=new Set<View>(['booking','appointments','packages','journal','support','my-courses','schedule','certificates','notifications','sessions','staff-work','care_guide','consultation','review']);

export function MainLayout(){
  useLocale();
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(()=>{const media=window.matchMedia('(prefers-color-scheme: dark)');const change=()=>setSystemDark(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  const [tab,setTab]=useState<NavTabId>('home'),[view,setView]=useState<View|null>(null),[auth,setAuth]=useState(false),[pending,setPending]=useState<View|null>(null);
  const [user,setUser]=useState<User|null>(null),[services,setServices]=useState<MedicalService[]>([]),[branches,setBranches]=useState<Branch[]>([]),[doctors,setDoctors]=useState<Doctor[]>([]),[courses,setCourses]=useState<Course[]>([]),[banners,setBanners]=useState<PortalBanner[]>([]);
  const [branchId,setBranchId]=useState(''),[service,setService]=useState<MedicalService|null>(null),[selectedBranch,setSelectedBranch]=useState<Branch|null>(null),[doctor,setDoctor]=useState<Doctor|null>(null);
  const [courseId,setCourseId]=useState<string|undefined>(),[academyTarget,setAcademyTarget]=useState<any>(),[packageId,setPackageId]=useState<string|undefined>(),[bookingId,setBookingId]=useState<string|undefined>();
  const [metadata,setMetadata]=useState<any>({}),[bookings,setBookings]=useState<Booking[]>([]),[summary,setSummary]=useState<any>(null),[unread,setUnread]=useState(0);
  const [plans,setPlans]=useState<any[]|null>(null),[records,setRecords]=useState<any[]|null>(null),[sourceErrors,setSourceErrors]=useState<{plans?:string;records?:string;bookings?:string}>({});
  const [loading,setLoading]=useState(true),[privateLoading,setPrivateLoading]=useState(false),[error,setError]=useState(''),[privateError,setPrivateError]=useState(''),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[search,setSearch]=useState(false);
  const [busy,setBusy]=useState(false),[bookingNotes,setBookingNotes]=useState(''),[treatmentEntityId,setTreatmentEntityId]=useState<string|undefined>();
  const [workAppointments,setWorkAppointments]=useState(false),[profilePanel,setProfilePanel]=useState<'edit'|'settings'|undefined>();
  const generation=useRef(0),owner=useRef('');owner.current=user?.id||'';
  useEffect(()=>{if(user?.preferredBranch&&branches.some(b=>b.id===user.preferredBranch))setBranchId(user.preferredBranch);},[user?.id,user?.preferredBranch,branches.map(b=>b.id).join(',')]);
  const activeBranch=branches.find(b=>b.id===branchId)||null;
  const close=()=>{setView(null);setPackageId(undefined);setBookingId(undefined);setTreatmentEntityId(undefined);};
  const visit=(target:View)=>{if(target==='appointments')setWorkAppointments(false);if(target==='my-courses')setAcademyTarget(undefined);if(protectedViews.has(target)&&!user){setPending(target);setAuth(true);return;}setView(target);};
  useNavigationHistory(JSON.stringify([tab,view,service?.id,selectedBranch?.id,doctor?.id,courseId,academyTarget?.id,packageId,bookingId,search]),{tab,view,service,selectedBranch,doctor,courseId,academyTarget,packageId,bookingId,search},state=>{setTab(state.tab);setView(state.view);setService(state.service);setSelectedBranch(state.selectedBranch);setDoctor(state.doctor);setCourseId(state.courseId);setAcademyTarget(state.academyTarget);setPackageId(state.packageId);setBookingId(state.bookingId);setSearch(state.search);},user?.id||'',!busy);
  const refresh=()=>{apiClient.clearReadCache();setRevision(v=>v+1);};
  useEffect(()=>{
    let current=true;setLoading(true);setError('');
    void Promise.all([apiClient.getServices(),apiClient.getBranches(),apiClient.getDoctors(),apiClient.getCourses(),apiClient.getPortalBanners(),apiClient.getAppMetadata()]).then(([s,b,d,c,p,m])=>{
      if(!current)return;
      setServices(Array.isArray(s?.services)?s.services:[]);setBranches(Array.isArray(b?.branches)?b.branches:[]);setDoctors(Array.isArray(d?.doctors)?d.doctors:[]);setCourses(Array.isArray(c?.courses)?c.courses:[]);setBanners(Array.isArray(p?.banners)?p.banners:[]);setMetadata(m&&!m.error?m:{});
      setBranchId(id=>b?.branches?.some((item:Branch)=>item.id===id)?id:b?.branches?.[0]?.id||'');
      const failed=[s,b,d,c,p,m].some(result=>!result||result.error);setError(failed?([s,b,d,c,p,m].find(result=>result?.error)?.error||'Không thể tải một số dữ liệu. Vui lòng thử lại.'):'');
    }).catch(()=>{if(current)setError('Không thể tải dữ liệu. Vui lòng thử lại.');}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[revision,user?.id,user?.role]);
  useEffect(()=>{
    let active=true;void apiClient.loginWithZalo(false).then(result=>{if(!active)return;if(result.user)onLoggedIn(result.user);else if(result.needsConsent)apiClient.clearUnverifiedSession();});
    const expired=(event:Event)=>{owner.current='';generation.current++;setUser(null);setBanners([]);setBookings([]);setPlans(null);setRecords(null);setSummary(null);setUnread(0);setView(null);setPrivateError('');if(event.type==='mld:session-expired')setNotice('Vui lòng đăng nhập lại để tiếp tục.');};
    window.addEventListener('mld:session-expired',expired);window.addEventListener('mld:session-cleared',expired);
    return()=>{active=false;window.removeEventListener('mld:session-expired',expired);window.removeEventListener('mld:session-cleared',expired);};
  },[]);
  const loadPrivate=useCallback(async()=>{
    if(!user?.id)return;const current=++generation.current,epoch=apiClient.sessionVersion(),id=user.id;setPrivateLoading(true);
    apiClient.invalidateReadPaths(['/bookings','/membership','/course-enrollments','/treatment-plans','/records']);
    const [appointments,membership,inbox,_settings,enrollments,planData,recordData]=await Promise.all([apiClient.getBookings(workAppointments?'work':'personal'),apiClient.getMembership(),apiClient.getNotifications(true),apiClient.getSettings(),apiClient.getCourseEnrollments(),apiClient.getTreatmentPlans(),apiClient.getMedicalRecords()]);
    if(current!==generation.current||owner.current!==id||apiClient.sessionVersion()!==epoch)return;
    if(Array.isArray(appointments?.bookings))setBookings(appointments.bookings);
    if(Array.isArray(planData?.treatmentPlans))setPlans(planData.treatmentPlans);if(Array.isArray(recordData?.records))setRecords(recordData.records);
    setSourceErrors({plans:Array.isArray(planData?.treatmentPlans)?undefined:planData?.error||'Không thể tải gói liệu trình.',records:Array.isArray(recordData?.records)?undefined:recordData?.error||'Không thể tải nhật ký chăm sóc.',bookings:Array.isArray(appointments?.bookings)?undefined:appointments?.error||'Không thể tải lịch hẹn.'});
    if(membership?.summary)setSummary({...membership.summary,registeredCourses:Array.isArray(enrollments?.enrollments)?enrollments.enrollments.filter((e:any)=>e.status!=='dropped').length:undefined});setUnread(Number.isInteger(inbox?.unreadCount)?inbox.unreadCount:0);setPrivateError(!appointments||!membership||!enrollments?'Không thể tải dữ liệu. Vui lòng thử lại.':appointments.error||membership.error||enrollments.error||'');setPrivateLoading(false);
  },[user?.id,workAppointments]);
  useEffect(()=>{if(!user){setBookings([]);setSummary(null);setUnread(0);return;}void loadPrivate();void apiClient.preloadPrivateData(false);const refreshPrivate=()=>{if(!document.hidden)void loadPrivate();};window.addEventListener('mld:activity',refreshPrivate);window.addEventListener('focus',refreshPrivate);const timer=window.setInterval(refreshPrivate,30000);return()=>{generation.current++;clearInterval(timer);window.removeEventListener('mld:activity',refreshPrivate);window.removeEventListener('focus',refreshPrivate);};},[user?.id,revision,loadPrivate]);
  const book=(item?:MedicalService)=>{const selected=item||services[0];if(!selected)return;setService(selected);setBookingNotes('');visit('booking');};
  const onLoggedIn=(account:User)=>{if(owner.current!==account.id){generation.current++;setBanners([]);setBookings([]);setPlans(null);setRecords(null);setSummary(null);setUnread(0);}owner.current=account.id;setUser(account);if(pending)setView(pending);setPending(null);const epoch=apiClient.sessionVersion();void apiClient.syncZaloProfile().then(result=>{if(owner.current!==account.id||apiClient.sessionVersion()!==epoch)return;if('user' in result&&result.user)setUser(result.user);if('error' in result&&result.error)setNotice(result.error);});};
  const navigate=(destination:string)=>{
    if(['home','services','academy','documents','profile'].includes(destination)){setTab(destination as NavTabId);close();return;}
    if(destination==='examination'){visit('examination');return;}if(destination==='learning'){visit('my-courses');return;}if(destination==='new-booking'){book();return;}if(destination==='booking'){visit('appointments');setWorkAppointments(canUseStaffTools(user||{}));return;}if(destination==='search'){setSearch(true);return;}if(destination==='profile-edit'||destination==='profile-settings'){setProfilePanel(destination==='profile-edit'?'edit':'settings');setTab('profile');close();return;}if(destination==='results'){setAcademyTarget({id:String(Date.now()),enrollmentId:'',tab:'results'});visit('my-courses');return;}
    if(destination==='vouchers'){setTab('profile');close();return;}
    if(['packages','journal','community','branches','specialists','notifications','support','schedule','certificates','care_guide','consultation','review'].includes(destination))visit(destination as View);
  };
  const openNotification=async(item:AppNotification)=>{const target=item.data?.target;if(!target){setNotice(item.message);return;}if(target.screen==='booking'){setBookingId(target.bookingId||target.entityId);visit('appointments');}else if(target.screen==='academy'){setAcademyTarget({id:item.id,enrollmentId:target.enrollmentId||'',tab:target.tab||'content',quizId:target.quizId,certificateId:target.entityId});setView('my-courses');}else if(target.screen==='treatment'){setTreatmentEntityId(target.entityId);visit(target.tab==='support'?'support':target.tab==='journal'?'journal':'packages');}else{setTab('profile');close();}};
  const showCourse=(item:Course)=>{setCourseId(item.id);setTab('academy');setView(null);};
  const openBranch=(item:Branch)=>{setSelectedBranch(item);setView('branch-detail');};
  const openSpecialist=(item:Doctor)=>{setDoctor(item);setView('specialist-detail');};
  const content=()=>{
    if(view==='examination')return <ExaminationServicePicker services={services} onClose={close} onSelect={item=>{setService(item);setBookingNotes(LYMPH_BOOKING_NOTE);visit('booking');}}/>;
    if(view==='booking'&&user&&service)return <BookingForm key={user.id+service.id+(packageId||'')} currentUser={user} initialService={service} initialBranch={activeBranch} initialPackageId={packageId} initialNotes={bookingNotes} allServices={services} branches={branches} onClose={close} onCatalogUpdate={setServices} onBookingSuccess={saved=>{setNotice('Đặt lịch thành công!');setWorkAppointments(false);setBookings(list=>[saved,...list.filter(b=>b.id!==saved.id)]);setBookingId(saved.id);setView('appointments');void loadPrivate();}}/>;
    if(view==='appointments')return <Appointments key={user?.id||'guest'} canManageSessions={workAppointments&&canUseStaffTools(user||{})} initialBookingId={bookingId} bookings={workAppointments?bookings:bookings.filter(b=>b.userId===user?.id)} branches={branches} authenticated={Boolean(user)} onRequireLogin={()=>setAuth(true)} onClose={close} loading={privateLoading} error={privateError} onRefresh={()=>void loadPrivate()} onUpdateBookings={setBookings} onBookNewService={()=>workAppointments?visit('staff-work'):book()} onBusyChange={setBusy} onRebookService={id=>{const item=services.find(s=>s.id===id);if(item){if(workAppointments){setNotice('Chọn khách hàng để đặt lại dịch vụ.');setView('staff-work');}else book(item);}else setNotice('Dịch vụ hiện không khả dụng.');}}/>;
    if((view==='packages'||view==='journal'||view==='support'||view==='care_guide'||view==='consultation'||view==='review')&&user)return <Treatment key={user.id+view} user={user} initialTab={view==='consultation'||view==='review'?'journal':view} initialForm={view==='consultation'?'survey':undefined} initialEntityId={treatmentEntityId} treatmentPlans={plans} records={records} bookings={bookings} sourceLoading={privateLoading} sourceErrors={sourceErrors} onRetrySource={()=>void loadPrivate()} onBusyChange={setBusy} onClose={close} onOpenBooking={()=>book()} onOpenPlanBooking={(id,serviceId)=>{const item=services.find(s=>s.id===serviceId);if(!item){setNotice('Dịch vụ của liệu trình hiện không khả dụng.');return;}setPackageId(id);book(item);}} onOpenInbox={()=>visit('notifications')}/>;
    if(view==='my-courses')return <Academy key={'mine:'+user?.id} courses={courses} branches={branches} user={user||undefined} userId={user?.id||''} mode="learning" notificationTarget={academyTarget} onRequireLogin={()=>setAuth(true)} onRefresh={refresh} onExit={close} onBusyChange={setBusy}/>;
    if(view==='schedule')return <Schedule userId={user?.id||''} onBack={close} onOpen={(enrollmentId)=>{setAcademyTarget({id:String(Date.now()),enrollmentId,tab:'schedule'});setView('my-courses');}}/>;
    if(view==='certificates')return <Certificates userId={user?.id||''} onBack={close} onRequireLogin={()=>setAuth(true)}/>;
    if(view==='notifications')return <Inbox onBack={close} onOpen={openNotification} onUnread={setUnread}/>;
    if(view==='community')return <Community onBack={close} onExamination={()=>visit('examination')}/>;
    if(view==='sessions')return <Sessions userId={user?.id||''} userName={user?.name||''} phone={user?.phone} onClose={close} onLogout={async()=>{await apiClient.logout();setUser(null);close();}}/>;
    if(view==='staff-work'&&user)return <StaffWork user={user} services={services} branches={branches} onBack={close} onAppointment={id=>{setWorkAppointments(true);setBookingId(id);setView('appointments');}} onNavigate={navigate} onBooked={saved=>{setWorkAppointments(true);setBookingId(saved.id);setView('appointments');void loadPrivate();}}/>;
    if(view==='branches')return <Branches branches={branches} services={services} onClose={close} onSelectBranch={openBranch}/>;
    if(view==='specialists')return <Specialists doctors={doctors} services={services} onClose={close} onSelectDoctor={openSpecialist}/>;
    if(view==='service-detail'&&service)return <ServiceDetail userId={user?.id} service={service} doctors={doctors.filter(d=>d.serviceIds?.includes(service.id))} onSpecialist={openSpecialist} onClose={close} onRequireLogin={()=>setAuth(true)} onBookNow={book}/>;
    if(view==='branch-detail'&&selectedBranch)return <BranchDetail branch={selectedBranch} onClose={close} onSelectBranch={item=>{setBranchId(item.id);book();}}/>;
    if(view==='specialist-detail'&&doctor)return <SpecialistDetail doctor={doctor} branches={branches} onClose={close} onBookWithDoctor={item=>{const selected=services.find(s=>item.serviceIds?.includes(s.id));if(!selected){setNotice('Cơ sở chưa được phân công chuyên viên cho dịch vụ này.');return;}if(item.branchId)setBranchId(item.branchId);book(selected);}}/>;
    if(tab==='home')return <HomeScreen user={user} services={services} branches={branches} doctors={doctors} courses={courses} banners={banners} activeBranchId={branchId} onBranch={setBranchId} onNavigate={navigate} onSearch={()=>setSearch(true)} onService={item=>{setService(item);setView('service-detail');}} onCourse={showCourse} onSpecialist={openSpecialist} onBook={book} unread={unread}/>;
    if(tab==='services')return <ServicesScreen services={services} branches={branches} doctors={doctors} activeBranchId={branchId} onBranch={setBranchId} onSelect={item=>{setService(item);setView('service-detail');}} onBook={book} onSearch={()=>setSearch(true)} onAppointments={()=>visit('appointments')} onBranches={()=>visit('branches')}/>;
    if(tab==='academy')return <Academy key={user?.id||'guest'} courses={courses} branches={branches} user={user||undefined} userId={user?.id||''} initialCourseId={courseId} mode="catalog" loading={loading} error={error} onRefresh={refresh} onRequireLogin={()=>setAuth(true)} onBusyChange={setBusy}/>;
    if(tab==='documents')return <Documents key={user?.id||'guest'} onBack={()=>setTab('home')}/>;
    return <ProfileScreen key={user?.id||'guest'} user={user} branches={branches} initialPanel={profilePanel} onPanelHandled={()=>setProfilePanel(undefined)} summary={summary} error={privateError} onLogin={()=>setAuth(true)} onUserUpdated={setUser} onNavigate={visit} onRefresh={()=>void loadPrivate()} onLogout={async()=>{const result=await apiClient.logout();setUser(null);close();if('error' in result&&result.error)setNotice(result.error);}}/>;
  };
  return <div className="mini-app-shell mobile-connected-shell" data-theme={user?.theme==='DARK'||(user?.theme==='SYSTEM'&&systemDark)?'dark':'light'}><main className="mobile-connected-content">{loading&&<p role="status" className="p-3">Đang tải dữ liệu...</p>}{error&&<div role="alert" className="p-3 text-sm text-red-700">{error}<button onClick={refresh}>Thử lại</button></div>}{content()}</main>{!view&&<BottomNav activeTab={tab} disabled={busy} onChangeTab={next=>{setTab(next);setCourseId(undefined);close();}}/>}{notice&&<div role="status" className="mobile-notice"><p>{notice}</p><button onClick={()=>setNotice('')}>Đóng</button></div>}<GroupAAuthModal isOpen={auth} canClose onClose={()=>setAuth(false)} onLoginSuccess={onLoggedIn}/><GroupBSearch isOpen={search} onClose={()=>setSearch(false)} services={services} courses={courses} branches={branches} doctors={doctors} userId={user?.id||''} onRequireLogin={()=>setAuth(true)} onSelectService={item=>{setSearch(false);setService(item);setView('service-detail');}} onSelectCourse={item=>{setSearch(false);showCourse(item);}} onSelectBranch={item=>{setSearch(false);openBranch(item);}} onSelectSpecialist={item=>{setSearch(false);openSpecialist(item);}} onNavigateCategory={category=>{setSearch(false);if(category==='branch')visit('branches');else if(category==='specialist')visit('specialists');else{setTab(category==='course'?'academy':'services');close();}}}/></div>;
}
