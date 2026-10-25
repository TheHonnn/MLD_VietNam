import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'zmp-ui';
import { HeaderFigma } from '@/components/HeaderFigma';
import { GroupBHome } from '@/components/HomeDashboard';
import { deferredScreen } from '@/components/deferred-screen';
import { GroupAAuthModal } from '@/components/GroupAAuthModal';
import { RegistrationChallenge } from '@/components/ZaloProfileForm';
import { NewCustomerOnboarding } from '@/components/NewCustomerOnboarding';
import { LaunchScreen } from '@/components/LaunchScreen';
import { CareIntroScreen } from '@/components/CareIntroScreen';
import { GroupBSearch } from '@/components/GroupBSearch';
import { NotificationCenter } from '@/components/NotificationCenter';
import {
  ServiceDetailModal,
  SpecialistDetailModal,
  BranchDetailModal,
  LocationDirectionsModal,
  BranchDirectoryModal,
  SpecialistDirectoryModal,
} from '@/components/GroupBExtensions';
import { apiClient } from '@/api/client';
import { searchText,serviceSearchText } from '@/utils/catalog';
import {isStaffRole} from '@/utils/staff';
import type {CustomerSection,StaffDashboard} from '@/types/staff';
import type {StaffRecordCustomer} from '@/components/SharedRecords';
import {AccountSessions,ZaloAccountOptions} from '@/components/AccountControls';
import {ZaloAuthFeedback} from '@/components/ZaloAuthFeedback';
import {launchServiceId} from '@/utils/service-links';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { LegalLinks } from '@/components/LegalLinks';
import {
  guestUser,
  MedicalService,
  Doctor,
  Booking,
  Course,
  MedicalRecord,
  User,
  Voucher,
  Branch,
  AppNotification,
} from '../../../../backend/src/data/database';
import {
  NavHomeIcon,
  NavServiceIcon,
  NavCalendarIcon,
  NavAcademyIcon,
  NavProfileIcon,
  ArrowRightIcon,
  FilterIcon,
  SearchIcon,
  CloseIcon,
  ClockIcon,
  HeartIcon,
  ArrowLeftIcon,
  FileTextIcon,
} from '@/components/Icons';

const StaffBooking = deferredScreen(() => import('@/components/StaffBooking').then(module => ({default:module.StaffBooking})));
const AppointmentsManager = deferredScreen(() => import('@/components/AppointmentsManager').then(module => ({default:module.AppointmentsManager})));
const ETicketGroupC = deferredScreen(() => import('@/components/ETicketGroupC').then(module => ({default:module.ETicketGroupC})));
const GroupEAcademy = deferredScreen(() => import('@/components/GroupEAcademy').then(module => ({default:module.GroupEAcademy})));
const GroupDTreatment = deferredScreen(() => import('@/components/GroupDTreatment').then(module => ({default:module.GroupDTreatment})));
const GroupDRecords = deferredScreen(() => import('@/components/GroupDRecords').then(module => ({default:module.GroupDRecords})));
const GroupFProfile = deferredScreen(() => import('@/components/GroupFProfile').then(module => ({default:module.GroupFProfile})));
const DocumentLibrary = deferredScreen(() => import('@/components/SharedRecords').then(module => ({default:module.DocumentLibrary})));
const StaffCustomers = deferredScreen(() => import('@/components/SharedRecords').then(module => ({default:module.StaffCustomers})));
const Community = deferredScreen(() => import('@/components/SharedRecords').then(module => ({default:module.Community})));

function MasterHomePage() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [showCareIntro, setShowCareIntro] = useState(true);
  const [sharedServiceId]=useState(launchServiceId);
  const sharedLinkOpened=useRef(false);
  // Navigation Tabs matching Figma Nhóm B & C: 'home' | 'services' | 'booking' | 'academy' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'booking' | 'academy' | 'documents' | 'community' | 'customers' | 'profile'>('home');
  const [customerSection,setCustomerSection]=useState<CustomerSection>('appointments');
  const [customerReturnTab,setCustomerReturnTab]=useState<'home'|'profile'>('home');
  const [utilityReturnTab,setUtilityReturnTab]=useState<'home'|'profile'>('home');
  const [staffDashboard,setStaffDashboard]=useState<StaffDashboard|null>(null);
  const [academyMode, setAcademyMode] = useState<'catalog' | 'learning'>('catalog');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [academyVisit, setAcademyVisit] = useState(0);
  const [navigationBusy,setNavigationBusy]=useState(false);
  const [accountSessionsOpen,setAccountSessionsOpen]=useState(false);

  // Application Data States (synced with Backend API)
  const [services, setServices] = useState<MedicalService[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [homeBranchId, setHomeBranchId] = useState('');
  const [homeNow,setHomeNow]=useState(Date.now);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [user, setUser] = useState<User>({ ...guestUser });
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationUnreadCount,setNotificationUnreadCount]=useState(0);
  const [notificationTotalCount,setNotificationTotalCount]=useState(0);
  const [notificationCursor,setNotificationCursor]=useState<string|null>(null);
  const [notificationLoadingMore,setNotificationLoadingMore]=useState(false);
  const [notificationFilter,setNotificationFilter]=useState<'all'|'unread'>('all');
  const notificationFilterRef=useRef<'all'|'unread'>('all');
  const notificationPageEpoch=useRef(0);
  const notificationMoreLock=useRef(false);
  const notificationPaged=useRef(false);
  const notificationReadRevision=useRef(0);
  const notificationNavigation=useRef(0);
  const relatedReadRevision=useRef(0);
  const resetInbox=()=>{
    notificationNavigation.current++;relatedReadRevision.current++;
    notificationPageEpoch.current++;notificationMoreLock.current=false;
    notificationFilterRef.current='all';setNotificationFilter('all');
    setNotifications([]);setNotificationUnreadCount(0);setNotificationTotalCount(0);
    setNotificationCursor(null);setNotificationLoadingMore(false);notificationPaged.current=false;
  };
  const applyNotificationPage=(response:any,more=false,readRevision=notificationReadRevision.current,filter:'all'|'unread'='all')=>{
    if(notificationFilterRef.current!==filter)return;
    if(readRevision!==notificationReadRevision.current)return;
    if(!Array.isArray(response?.notifications))return;
    const preserveOlder=notificationPaged.current;
    if(readRevision===notificationReadRevision.current)setNotificationUnreadCount(Number(response.unreadCount)||0);
    setNotificationTotalCount(Number(response.totalCount)||0);
    setNotifications(current=>{
      if(more)return [...current,...response.notifications.filter((item:AppNotification)=>!current.some(old=>old.id===item.id))];
      const fresh=response.notifications.map((item:AppNotification)=>current.some(old=>old.id===item.id&&old.isRead)?{...item,isRead:true}:item);
      const next=preserveOlder?[...fresh,...current.filter(old=>!fresh.some((item:AppNotification)=>item.id===old.id))]:fresh;
      return JSON.stringify(next)===JSON.stringify(current)?current:next;
    });
    if(more||!notificationPaged.current)setNotificationCursor(response.nextCursor||null);
  };
  const [memberSummary, setMemberSummary] = useState<{upcomingBookings:number;remainingTreatmentSessions:number;activeCourses:number}|null>(null);
  const [membershipError,setMembershipError]=useState('');
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [zaloAuthState, setZaloAuthState] = useState<'checking' | 'required' | 'connected' | 'web'>('checking');
  const [zaloAuthError, setZaloAuthError] = useState('');
  const [zaloAuthIssue,setZaloAuthIssue]=useState<string|undefined>();
  const authAttempt = useRef(0);
  const authBusy = useRef(false);
  useEffect(() => () => { authAttempt.current++; apiClient.cancelZaloLogin(); }, []);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  useEffect(()=>{if(!isNotificationsOpen)notificationNavigation.current++;},[isNotificationsOpen]);
  const [notificationError, setNotificationError] = useState('');
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [bookingTarget, setBookingTarget] = useState<{id:string; bookingId:string} | undefined>();
  const [academyTarget, setAcademyTarget] = useState<{id:string; enrollmentId:string; tab:string; quizId?:string;certificateId?:string} | undefined>();
  const [profileTarget, setProfileTarget] = useState<{id:string; tab:'payments'|'points'|'vouchers'; entityId?:string} | undefined>();
  const [treatmentEntityId, setTreatmentEntityId] = useState<string | undefined>();
  const currentUserId = useRef(user.id);
  currentUserId.current = user.id;
  const currentUserRole=useRef(user.role);currentUserRole.current=user.role;
  useEffect(()=>{if(staffDashboard?.scope.branchId)setHomeBranchId(staffDashboard.scope.branchId);},[staffDashboard?.scope.branchId]);

  useEffect(() => {
    if (!user.id) return;
    let cancelled = false, busy = false;
    const refresh = async (event?:Event) => {
      if(event instanceof CustomEvent&&event.detail?.path==='/auth/settings')notificationPaged.current=false;
      if (document.hidden || busy || cancelled) return;
      busy = true;
      const readRevision=notificationReadRevision.current,epoch=notificationPageEpoch.current;
      try {
        const response = await apiClient.getNotifications(true,undefined,notificationFilter);
        if (cancelled||epoch!==notificationPageEpoch.current) return;
        if (!Array.isArray(response?.notifications)) setNotificationError(response?.error || 'Không thể tải thông báo. Vui lòng thử lại.');
        else { applyNotificationPage(response,false,readRevision,notificationFilter); setNotificationError(''); }
      } catch { if (!cancelled) setNotificationError('Không thể tải thông báo. Vui lòng thử lại.'); }
      finally { busy = false; }
    };
    if (isNotificationsOpen) {notificationPaged.current=false;void refresh();}
    const timer = window.setInterval(() => void refresh(), 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('mld:activity', refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('mld:activity', refresh); };
  }, [user.id, isNotificationsOpen, notificationRefresh,notificationFilter]);

  useEffect(() => {
    if (activeTab !== 'academy') setAcademyTarget(undefined);
    if (activeTab !== 'profile') setProfileTarget(undefined);
    if (activeTab !== 'booking') setBookingTarget(undefined);
  }, [activeTab]);

  // Active Flow Modals (Starts at Group A Onboarding on initial launch)
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [canCloseAuth, setCanCloseAuth] = useState(false);
  const [viewingService, setViewingService] = useState<MedicalService | null>(null);
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
  const [viewingBranch, setViewingBranch] = useState<Branch | null>(null);
  const [directionsBranch, setDirectionsBranch] = useState<Branch | null>(null);
  const [isBranchDirectoryOpen, setIsBranchDirectoryOpen] = useState(false);
  const [isSpecialistDirectoryOpen, setIsSpecialistDirectoryOpen] = useState(false);
  const [bookingService, setBookingService] = useState<MedicalService | null>(null);
  const [bookingBranch, setBookingBranch] = useState<Branch | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [specialistBookingError,setSpecialistBookingError]=useState('');
  const [bookingActionError,setBookingActionError]=useState('');
  useEffect(()=>setSpecialistBookingError(''),[viewingDoctor?.id]);
  const [bookingPackage,setBookingPackage]=useState<{id:string;name:string}|null>(null);
  const [bookingCustomer,setBookingCustomer]=useState<StaffRecordCustomer|null>(null);
  const [eTicketBooking, setETicketBooking] = useState<Booking | null>(null);
  const [isEMRModalOpen, setIsEMRModalOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  useEffect(()=>setBookingActionError(''),[activeTab,viewingService?.id,viewingBranch?.id,directionsBranch?.id,isTreatmentOpen]);
  const [treatmentInitialTab, setTreatmentInitialTab] = useState<'packages' | 'journal' | 'care_guide' | 'support' | 'notifications'>('packages');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Services Tab Filter State
  const [servicesSearch, setServicesSearch] = useState('');
  const [servicesCategory, setServicesCategory] = useState('all');
  const [showServiceFilters, setShowServiceFilters] = useState(false);
  const [minServicePrice, setMinServicePrice] = useState('');
  const [maxServicePrice, setMaxServicePrice] = useState('');
  const [maxServiceDuration, setMaxServiceDuration] = useState('');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState<{query: string; id: number} | undefined>();
  const [servicesSort, setServicesSort] = useState<'popular' | 'priceAsc' | 'priceDesc'>('popular');

  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [privateLoading, setPrivateLoading] = useState(true);
  const [privateErrors, setPrivateErrors] = useState<{bookings?:string;records?:string;plans?:string}>({});
  const [loadVersion, setLoadVersion] = useState(0);
  const [registration, setRegistration] = useState<RegistrationChallenge | null>(null);
  useEffect(() => { if (!isTreatmentOpen) setTreatmentEntityId(undefined); }, [isTreatmentOpen]);
  const [appMetadata, setAppMetadata] = useState<any>({ serviceCategories: [], courseCategories: [], instructors: [], membershipTiers: [], loyaltySettings: null, faqs: [] });
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const navigateTab = (tab: typeof activeTab) => {
    if(navigationBusy)return;
    if(!user.id&&['profile','customers','documents','community'].includes(tab)){setCanCloseAuth(true);setIsAuthOpen(true);return;}
    if(['documents','community'].includes(tab)&&!['documents','community'].includes(activeTab))setUtilityReturnTab(activeTab==='profile'?'profile':'home');
    if(tab==='booking')setBookingTarget(undefined);
    setIsSearchOpen(false);setIsSpecialistDirectoryOpen(false);setIsBranchDirectoryOpen(false);setIsTreatmentOpen(false);
    if(tab==='academy') {
      setSelectedCourseId(null);setCatalogSearch(undefined);setAcademyTarget(undefined);
      setAcademyMode('catalog');setAcademyVisit(value=>value+1);
    }
    setActiveTab(tab);
  };
  const openCustomers=(section:CustomerSection='appointments')=>{setCustomerReturnTab(activeTab==='profile'?'profile':'home');navigateTab('customers');setCustomerSection(section);};
  const openInbox = () => {
    if(user.id)setIsNotificationsOpen(true);
    else {setCanCloseAuth(true);setIsAuthOpen(true);}
  };
  const navigation = {activeTab,customerSection,customerReturnTab,utilityReturnTab,academyMode,academyVisit,selectedCourseId,isSearchOpen,isNotificationsOpen,viewingService,viewingDoctor,viewingBranch,directionsBranch,isBranchDirectoryOpen,isSpecialistDirectoryOpen,bookingService,bookingBranch,bookingDoctor,bookingPackage,bookingCustomer,eTicketBooking,isEMRModalOpen,isTreatmentOpen,treatmentInitialTab};
  const navigationKey = JSON.stringify(Object.values(navigation).map(value => value && typeof value === 'object' ? value.id : value));
  useNavigationHistory(navigationKey,navigation,view => {
    setActiveTab(view.activeTab);setCustomerSection(view.customerSection);setCustomerReturnTab(view.customerReturnTab);setUtilityReturnTab(view.utilityReturnTab);setAcademyMode(view.academyMode);setAcademyVisit(view.academyVisit);setSelectedCourseId(view.selectedCourseId);
    setIsSearchOpen(view.isSearchOpen);setIsNotificationsOpen(view.isNotificationsOpen);
    setViewingService(view.viewingService);setViewingDoctor(view.viewingDoctor);setViewingBranch(view.viewingBranch);setDirectionsBranch(view.directionsBranch);
    setIsBranchDirectoryOpen(view.isBranchDirectoryOpen);setIsSpecialistDirectoryOpen(view.isSpecialistDirectoryOpen);
    setBookingService(view.bookingService);setBookingBranch(view.bookingBranch);setBookingDoctor(view.bookingDoctor);setBookingPackage(view.bookingPackage);
    setBookingCustomer(view.bookingCustomer);
    setETicketBooking(view.eTicketBooking);setIsEMRModalOpen(view.isEMRModalOpen);setIsTreatmentOpen(view.isTreatmentOpen);setTreatmentInitialTab(view.treatmentInitialTab);
  },user.id,!viewingService&&!viewingDoctor&&!viewingBranch&&!directionsBranch&&!isSearchOpen&&!isNotificationsOpen&&!bookingService&&!eTicketBooking&&!isTreatmentOpen&&!isEMRModalOpen&&!isBranchDirectoryOpen&&!isSpecialistDirectoryOpen);
  useEffect(()=>{
    if(!sharedServiceId||sharedLinkOpened.current||dataLoading||showLaunchScreen||showCareIntro||registration||zaloAuthState==='required'||zaloAuthState==='checking')return;
    sharedLinkOpened.current=true;
    const service=services.find(item=>item.id===sharedServiceId);
    if(service)setViewingService(service);else setDataError('Dịch vụ trong liên kết không còn khả dụng.');
  },[sharedServiceId,dataLoading,services,showLaunchScreen,showCareIntro,registration,zaloAuthState]);
  const refreshData = () => { apiClient.clearReadCache(); setLoadVersion(value => value + 1); };
  const loadPrivateData = async (cancelled:()=>boolean=()=>false,role=currentUserRole.current) => {
    const staffMode=isStaffRole(role);
    const request=++relatedReadRevision.current,epoch=apiClient.sessionVersion(),inboxEpoch=notificationPageEpoch.current,readRevision=notificationReadRevision.current,filter=notificationFilterRef.current;
    setPrivateLoading(true);setPrivateErrors({});
    const [recData,membData,bkData,notifData,treatmentData]=await Promise.all([
      staffMode?Promise.resolve({records:[]}):apiClient.getMedicalRecords(),staffMode?apiClient.getStaffDashboard():apiClient.getMembership(),apiClient.getBookings(),apiClient.getNotifications(false,undefined,filter),staffMode?Promise.resolve({treatmentPlans:[]}):apiClient.getTreatmentPlans(),
    ]);
    if(cancelled()||apiClient.sessionVersion()!==epoch||request!==relatedReadRevision.current)return;
    setPrivateLoading(false);
    setPrivateErrors({
      bookings:Array.isArray(bkData?.bookings)?undefined:bkData?.error||'Không thể tải lịch hẹn.',
      records:Array.isArray(recData?.records)?undefined:recData?.error||'Không thể tải nhật ký chăm sóc.',
      plans:Array.isArray(treatmentData?.treatmentPlans)?undefined:treatmentData?.error||'Không thể tải gói liệu trình.',
    });
    if(Array.isArray(recData?.records))setRecords(recData.records);
    if(Array.isArray(bkData?.bookings))setBookings(bkData.bookings);
    else if([401,403].includes(bkData?.status))setBookings([]);
    if(Array.isArray(treatmentData?.treatmentPlans))setTreatmentPlans(treatmentData.treatmentPlans);
    if(membData?.vouchers)setVouchers(membData.vouchers);
    if(membData?.user)setUser(prev=>({...prev,...membData.user}));
    const dashboardReady=Boolean(membData?.scope&&['todayBookings','pendingBookings','inServiceBookings','upcomingBookings','customers','activePackages'].every(key=>typeof membData?.summary?.[key]==='number'&&Number.isFinite(membData.summary[key])&&membData.summary[key]>=0));
    if(staffMode){
      if(dashboardReady)setStaffDashboard(membData);
      else if([401,403].includes(membData?.status))setStaffDashboard(null);
      setMemberSummary(null);setVouchers([]);
    }else if(membData?.summary)setMemberSummary(membData.summary);
    setMembershipError((staffMode?dashboardReady:Boolean(membData?.summary))?'':membData?.error||(staffMode?'Không thể tải thông tin công tác. Vui lòng thử lại.':'Không thể tải số liệu hội viên. Vui lòng thử lại.'));
    if(inboxEpoch===notificationPageEpoch.current) {
      if(Array.isArray(notifData?.notifications))applyNotificationPage(notifData,false,readRevision,filter);
      else {
        if([401,403].includes(notifData?.status)){setNotifications([]);setNotificationUnreadCount(0);setNotificationTotalCount(0);setNotificationCursor(null);}
        setNotificationError(notifData?.error||'Không thể tải thông báo.');
      }
    }
  };
  const retryPrivateData = () => {
    if(!user.id||privateLoading)return;
    apiClient.invalidateReadPaths(['/bookings','/records','/treatment-plans','/membership']);
    void loadPrivateData();
  };
  useEffect(() => {
    const expire = (event:Event) => {
      authAttempt.current++;authBusy.current=false;
      resetInbox();setBookingPackage(null);setBookingCustomer(null);
      setUser({...guestUser}); setBookings([]); setRecords([]); setVouchers([]); setNotifications([]); setTreatmentPlans([]);
      setMemberSummary(null);setMembershipError('');setStaffDashboard(null);
      setPrivateLoading(false);setPrivateErrors({});
      setIsNotificationsOpen(false); setIsTreatmentOpen(false); setIsEMRModalOpen(false); setETicketBooking(null); setBookingService(null);
      setAcademyTarget(undefined); setProfileTarget(undefined); setBookingTarget(undefined); setActiveTab('home');
      setAccountSessionsOpen(false);setRegistration(null);setIsAuthOpen(false);setBookingBranch(null);setBookingDoctor(null);
      setViewingService(null);setViewingDoctor(null);setViewingBranch(null);setDirectionsBranch(null);
      setZaloAuthIssue(undefined);setZaloAuthError(event.type==='mld:session-expired'?'Phiên đăng nhập đã hết hạn hoặc đã được đăng xuất. Vui lòng kết nối lại với Zalo.':''); setZaloAuthState('required');
    };
    const notice=(event:Event)=>{const message=(event as CustomEvent).detail?.message;if(typeof message==='string'){setZaloAuthIssue(undefined);setZaloAuthError(message);}};
    window.addEventListener('mld:session-expired',expire);
    window.addEventListener('mld:session-cleared',expire);window.addEventListener('mld:auth-notice',notice);
    return () => {window.removeEventListener('mld:session-expired',expire);window.removeEventListener('mld:session-cleared',expire);window.removeEventListener('mld:auth-notice',notice);};
  }, []);
  // Fetch real data from Backend on mount
  useEffect(() => {
    let cancelled = false;
    const images = new AbortController();
    async function loadBackendData() {
      resetInbox();setBookingPackage(null);setBookingCustomer(null);
      setPrivateLoading(true);setPrivateErrors({});
      setDataLoading(true);
      setDataError('');
      setServices([]);
      setDoctors([]);
      setBranches([]);
      setCourses([]);
      setGuidelines([]);
      setAppMetadata({ serviceCategories: [], courseCategories: [], instructors: [], membershipTiers: [], loyaltySettings: null, faqs: [] });
      setUser({ ...guestUser });
      setBookings([]);
      setRecords([]);
      setVouchers([]);
      setNotifications([]);
      setTreatmentPlans([]);
      setMemberSummary(null);setMembershipError('');
      setETicketBooking(null);
      setBookingService(null);
      void apiClient.preloadPublicData(images.signal).catch(() => {});
      const publish = async (request: Promise<any>, apply: (value: any) => void) => {
        const result = await request;
        if (!cancelled && result && !result.error) apply(result);
        return result;
      };
      const metadataRequest = publish(apiClient.getAppMetadata(),setAppMetadata);
      const serviceRequest = publish(apiClient.getServices(),value => setServices(value.services || []));
      const catalogRequest = Promise.all([
        serviceRequest, publish(apiClient.getDoctors(),value => setDoctors(value.doctors || [])), publish(apiClient.getBranches(),value => setBranches(value.branches || [])),
        publish(apiClient.getCourses(),value => setCourses(value.courses || [])), publish(apiClient.getCareGuidelines(),value => setGuidelines(value.guidelines || [])),
      ]);
      const publicReady = Promise.all([metadataRequest,catalogRequest]).then(([metadata,[srvData,docData,brData,crsData,care]]) => {
        if (cancelled) return;
        if ([metadata,srvData,docData,brData,crsData,care].some(result=>!result||result.error)) setDataError('Không thể tải một số dữ liệu. Vui lòng thử lại.');
        setDataLoading(false);
      });
      let authenticated = false;
      let accountRole=user.role;
      const authRequestEpoch = apiClient.sessionVersion();
      const isInsideZalo = /Zalo/i.test(navigator.userAgent) || Boolean((window as any).ZJSBridge);
      if (isInsideZalo) {
        const zaloSession = await apiClient.loginWithZalo(false);
        if (cancelled || apiClient.sessionVersion() !== authRequestEpoch) return;
        if (zaloSession?.user && zaloSession.token) {
          authenticated = true;
          accountRole=zaloSession.user.role;
          setUser((prev) => ({ ...prev, ...zaloSession.user }));
          setZaloAuthState('connected');
        } else {
          setZaloAuthError(zaloSession?.error || 'Không thể xác thực với Zalo.');
          setZaloAuthIssue(zaloSession?.authIssue);
          setZaloAuthState('required');
        }
      } else {
        setZaloAuthState('web');
        const session = await apiClient.getCurrentUser();
        if (cancelled || apiClient.sessionVersion() !== authRequestEpoch) return;
        if (session?.user&&isStaffRole(session.user.role)) { setUser(session.user); authenticated = true;accountRole=session.user.role; }
        else {
          setUser({ ...guestUser });
          if(session?.user)setDataError('Ứng dụng đặt lịch dành cho nhân viên. Tài khoản hiện tại chưa được cấp quyền.');
          if(!session || (session.error && session.status!==401))setDataError('Không thể xác minh phiên đăng nhập. Kiểm tra kết nối và thử lại.');
        }
      }
      if (authenticated) void apiClient.preloadPrivateData(isStaffRole(accountRole)).catch(() => {});
      if(authenticated)await loadPrivateData(()=>cancelled,accountRole);
      else if(!cancelled)setPrivateLoading(false);
      await publicReady;
    }

    loadBackendData().catch(() => { if (!cancelled) { setDataError('Không thể tải dữ liệu. Vui lòng thử lại.'); setDataLoading(false); } });
    return () => { cancelled = true; images.abort(); };
  }, [loadVersion]);

  const connectZaloProfile = async (manageDevices=false) => {
    if (authBusy.current) return;
    authBusy.current = true;
    const attempt = ++authAttempt.current;
    setZaloAuthError('');
    setZaloAuthIssue(undefined);
    setZaloAuthState('checking');
    const result = await apiClient.loginWithZalo(true);
    if (attempt !== authAttempt.current) return;
    authBusy.current = false;
    if (result?.registrationRequired && result.registrationToken) {
      setRegistration({ registrationToken: result.registrationToken, phone: result.phone, suggestedName: result.suggestedName, suggestedAvatar: result.suggestedAvatar });
      setZaloAuthState('web');
      return;
    }
    if (result?.user && result.token) {
      setUser((prev) => ({ ...prev, ...result.user }));
      setZaloAuthState('connected');
      if(manageDevices)setAccountSessionsOpen(true);
      setLoadVersion(value => value + 1);
      if(isStaffRole(result.user.role)){setStaffDashboard(null);return;}
      const membershipEpoch=apiClient.sessionVersion();
      const membership = await apiClient.getMembership();
      if(apiClient.sessionVersion()!==membershipEpoch)return;
      if (membership?.user) setUser((prev) => ({ ...prev, ...membership.user }));
      if (membership?.summary) setMemberSummary(membership.summary);
      setMembershipError(membership?.summary?'':membership?.error||'Không thể tải số liệu hội viên. Vui lòng thử lại.');
      return;
    }
    setZaloAuthError(result?.error || 'Bạn chưa cấp quyền thông tin tài khoản Zalo.');
    setZaloAuthIssue(result?.authIssue);
    setZaloAuthState('required');
  };

  const refreshBookingRelatedData = () => {
    if(!currentUserId.current)return;
    apiClient.invalidateReadPaths(['/membership','/treatment-plans','/records','/notifications']);
    void loadPrivateData();
  };
  const disconnectAccount=async()=>{
    const pending=apiClient.logout(),epoch=apiClient.sessionVersion();
    const result=await pending;
    if(epoch===apiClient.sessionVersion()&&'error' in result&&typeof result.error==='string')setZaloAuthError(result.error);
  };
  useEffect(()=>{
    if(!user.id)return;
    const refresh=(event:Event)=>{
      const path=(event as CustomEvent<{path:string}>).detail?.path;
      if(['/course-enrollments','/vouchers/claim','/reviews'].includes(path))refreshBookingRelatedData();
    };
    window.addEventListener('mld:activity',refresh);
    return()=>window.removeEventListener('mld:activity',refresh);
  },[user.id]);
  const handleBookingSuccess = (newBooking: Booking) => {
    setBookingService(null);
    setBookingBranch(null);
    setBookingDoctor(null);
    setViewingService(null);
    setBookings((prev) => [newBooking, ...prev.filter(booking=>booking.id!==newBooking.id)]);
    setETicketBooking(newBooking);
    refreshBookingRelatedData();
  };

  // Find latest upcoming confirmed booking
  const bookingStart = (booking: Booking) => Date.parse(`${booking.date.slice(0,10)}T${booking.timeSlot.split(' - ')[0]}+07:00`);
  const upcomingBooking = bookings.filter(booking => ['confirmed','pending'].includes(booking.status) && bookingStart(booking) > homeNow)
    .sort((a,b) => bookingStart(a)-bookingStart(b))[0] || null;
  useEffect(()=>{
    if(activeTab!=='home')return;
    const update=()=>setHomeNow(Date.now());
    update();const timer=window.setInterval(update,30000);
    window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
    return()=>{clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
  },[activeTab,bookings]);

  const openBooking = (service?: MedicalService | null, branch?: Branch | null, doctor?: Doctor | null, ownedPackage?:{id:string;name:string},customer?:StaffRecordCustomer) => {
    setBookingActionError('');
    if (!user.id) { setCanCloseAuth(true); setIsAuthOpen(true); return false; }
    if(!isStaffRole(user.role)){setBookingActionError('Vui lòng dùng tài khoản nhân viên được cấp quyền đặt lịch.');return false;}
    if(ownedPackage&&!customer){setBookingActionError('Vui lòng chọn liệu trình trong hồ sơ của khách hàng để đặt bằng gói.');return false;}
    if (!services.length || !branches.length) {setBookingActionError('Không thể mở đặt lịch. Vui lòng cập nhật dữ liệu và thử lại.');return false;}
    setBookingPackage(ownedPackage||null);
    setBookingCustomer(customer||null);
    setBookingBranch(branch || branches.find(item => item.id === homeBranchId) || branches[0] || null);
    setBookingDoctor(null);
    setBookingService(service || services[0] || null);
    return true;
  };

  const openNotification = async (notification: AppNotification) => {
    const owner = user.id;
    const request=++notificationNavigation.current,sessionEpoch=apiClient.sessionVersion();
    if (!owner) throw new Error('Vui lòng đăng nhập lại.');
    const target = notification.data?.target || (notification.type.toUpperCase() === 'BOOKING' && notification.entityId ? {screen:'booking' as const,entityId:notification.entityId} : undefined);
    if (!target) return;
    const requireCurrent = () => {
      if(currentUserId.current!==owner||apiClient.sessionVersion()!==sessionEpoch)throw new Error('Phiên đăng nhập đã thay đổi.');
      if(request!==notificationNavigation.current)throw new Error('Đã hủy mở nội dung thông báo.');
    };
    const unavailable = () => new Error('Nội dung này không còn khả dụng hoặc bạn không có quyền truy cập.');
    if (target.screen === 'booking') {
      apiClient.invalidateReadPaths(['/bookings']);
      const response = await apiClient.getBookings(); requireCurrent();
      if (response?.error) throw new Error(response.error);
      const booking = response?.bookings?.find((item: Booking) => item.id === target.entityId);
      if (!booking) throw unavailable();
      setBookings(response.bookings); setBookingTarget({id:notification.id,bookingId:booking.id}); setActiveTab('booking');
    } else if (target.screen === 'academy') {
      if(target.tab==='certificates'||notification.data?.sourceKey?.startsWith('certificate:')){
        const id=target.entityId||notification.entityId;
        if(!id)throw unavailable();
        const response=await apiClient.getCertificate(id);requireCurrent();
        if(response?.error||response?.certificate?.id!==id)throw unavailable();
        setAcademyTarget({id:notification.id,enrollmentId:response.certificate.enrollmentId,tab:'certificates',certificateId:id});
      }else{
      apiClient.invalidateReadPaths(['/course-enrollments',`/courses/${target.courseId}/learning`]);
      const response = await apiClient.getCourseEnrollments(); requireCurrent();
      if (response?.error) throw new Error(response.error);
      const entry = response?.enrollments?.find((item: any) => item.id === target.enrollmentId && item.courseId === target.courseId);
      if (!entry) throw unavailable();
      setAcademyTarget({id:notification.id,enrollmentId:entry.id,tab:target.tab || 'content',quizId:target.quizId});
      }
      setSelectedCourseId(null); setAcademyMode('learning'); setActiveTab('academy');
    } else if (target.screen === 'profile') {
      if(isStaffRole(user.role))throw unavailable();
      if (!['payments','points','vouchers'].includes(target.tab || '')) throw unavailable();
      apiClient.invalidateReadPaths(['/transactions','/membership']);
      if (target.tab === 'vouchers') {
        const response = await apiClient.getMembership(); requireCurrent();
        if (response?.error) throw new Error(response.error);
        if (!response?.vouchers?.some((item: any) => item.id === target.entityId)) throw unavailable();
        setVouchers(response.vouchers);
      } else {
        const response = await apiClient.getTransactions(); requireCurrent();
        if (response?.error) throw new Error(response.error);
        const entries = target.tab === 'payments' ? response?.invoices : response?.pointTransactions;
        if (!entries?.some((item: any) => item.id === target.entityId)) throw unavailable();
      }
      setProfileTarget({id:notification.id,tab:target.tab as 'payments'|'points'|'vouchers',entityId:target.entityId}); setActiveTab('profile');
    } else if (target.screen === 'treatment') {
      const tab = target.tab;
      if (!['packages','journal','support'].includes(tab || '')) throw unavailable();
      apiClient.invalidateReadPaths(['/treatment-plans','/records','/reviews/mine','/support-tickets']);
      if (tab === 'packages') {
        const response = await apiClient.getTreatmentPlans(); requireCurrent();
        if (response?.error) throw new Error(response.error);
        if (!response?.treatmentPlans?.some((item: any) => item.id === target.entityId)) throw unavailable();
        setTreatmentPlans(response.treatmentPlans);
      } else if (tab === 'journal') {
        const response = await apiClient.getMedicalRecords(); requireCurrent();
        if (response?.error) throw new Error(response.error);
        if (!response?.records?.some((item: any) => item.id === target.entityId)) {
          const reviews = await apiClient.getMyReviews(); requireCurrent();
          if (reviews?.error) throw new Error(reviews.error);
          if (!reviews?.reviews?.some((item: any) => item.id === target.entityId)) throw unavailable();
        }
        setRecords(response?.records || []);
      } else if (tab === 'support') {
        const response = await apiClient.getSupportTickets(); requireCurrent();
        if (response?.error) throw new Error(response.error);
        if (!response?.tickets?.some((item: any) => item.id === target.entityId)) throw unavailable();
      }
      setTreatmentEntityId(target.entityId); setTreatmentInitialTab(tab as 'packages'|'journal'|'support'); setIsTreatmentOpen(true);
    }
    if (target.screen !== 'treatment') setIsTreatmentOpen(false);
    setIsNotificationsOpen(false);
  };

  // Filtered services for Tab 'services'
  const catalogServices = services
    .filter((s) => {
      const matchSearch =
        serviceSearchText(s).includes(searchText(servicesSearch));
      const matchCat =
        servicesCategory === 'all' || s.categoryId === servicesCategory;
      return matchSearch && matchCat
        && (!minServicePrice || s.price >= Number(minServicePrice))
        && (!maxServicePrice || s.price <= Number(maxServicePrice))
        && (!maxServiceDuration || s.durationMinutes <= Number(maxServiceDuration));
    })
    .sort((a, b) => {
      if (servicesSort === 'priceAsc') return a.price - b.price;
      if (servicesSort === 'priceDesc') return b.price - a.price;
      return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || (b.rating ?? 0) - (a.rating ?? 0);
    });

  return (
    <div className="app-viewport min-h-screen bg-[#f1f8fa] flex justify-center items-start sm:items-center py-0 sm:py-4 text-[#183b47] select-none">
      <div className={`mini-app-shell ${activeTab === 'home' ? 'mini-app-shell--home' : ''} ${activeTab === 'booking' || eTicketBooking ? 'mini-app-shell--appointments' : ''} ${bookingService ? 'mini-app-shell--booking' : ''} ${isSpecialistDirectoryOpen || viewingDoctor ? 'mini-app-shell--specialists' : ''} ${isBranchDirectoryOpen || viewingBranch || directionsBranch ? 'mini-app-shell--branches' : ''} ${showLaunchScreen || showCareIntro || registration ? 'mini-app-shell--launch' : ''} w-full max-w-[390px] sm:h-[844px] sm:max-h-[96vh] bg-[#ffffff] sm:rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col border sm:border-[#c8dde3]`}>
        {showLaunchScreen && <LaunchScreen ready={!dataLoading} onComplete={() => setShowLaunchScreen(false)} />}
        {!showLaunchScreen && showCareIntro && <CareIntroScreen onContinue={() => setShowCareIntro(false)} onSkip={() => setShowCareIntro(false)} />}
        {(zaloAuthState === 'required' || zaloAuthState === 'checking') && (
          <div className="zalo-consent-screen absolute inset-0 z-[100] flex flex-col overflow-y-auto bg-[#ffffff] p-5">
            <div className="my-auto w-full shrink-0 rounded-[8px] border border-[#c8dde3] bg-white p-5 text-center shadow-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5EBE1] text-xl font-black text-[#087e9c]">Z</div>
              <h1 className="mt-4 text-lg font-bold text-[#183b47]">Kết nối tài khoản Zalo</h1>
              <p className="mt-2 text-xs leading-relaxed text-[#526a73]">Kết nối bằng số điện thoại Zalo. Tên và ảnh đại diện chỉ được sử dụng khi bạn đồng ý chia sẻ.</p>
              <ZaloAuthFeedback error={zaloAuthError} issue={zaloAuthIssue} className="mt-3 rounded-[8px] bg-red-50 p-2.5 text-left text-[11px] text-red-700"/>
              <button disabled={zaloAuthState === 'checking'} onClick={()=>void connectZaloProfile()} className="mt-5 h-11 w-full rounded-[8px] bg-[#087e9c] text-sm font-bold text-white disabled:opacity-60">
                {zaloAuthState === 'checking' ? 'Đang kết nối...' : 'Tiếp tục với Zalo'}
              </button>
              <ZaloAccountOptions busy={zaloAuthState==='checking'} onLogin={manage=>void connectZaloProfile(manage)} onCancel={()=>{authAttempt.current++;authBusy.current=false;apiClient.cancelZaloLogin();setZaloAuthIssue(undefined);setZaloAuthError('');setZaloAuthState('required');}}/>
              <p className="mt-3 text-[10px] text-[#526a73]">Không cần nhập số điện thoại hoặc mã OTP.</p>
              <LegalLinks />
              <button type="button" onClick={() => { authAttempt.current++; authBusy.current=false; apiClient.cancelZaloLogin(); setZaloAuthState('web'); }} className="mt-3 min-h-11 px-4 text-xs font-semibold text-[#526a73]">Xem dịch vụ trước</button>
            </div>
          </div>
        )}
        {registration && <NewCustomerOnboarding challenge={registration} initialStep="growth"
          onBack={() => { setRegistration(null); setZaloAuthState('required'); }}
          onComplete={account => { setRegistration(null); setUser(account); setActiveTab('home'); setZaloAuthState('connected'); setLoadVersion(value => value + 1); }} />}
        {/* Scrollable Body Content */}
        <div className={`app-main-content ${activeTab === 'home' ? 'app-main-content--home' : ''} min-h-0 flex-1 overflow-y-auto pb-28 overscroll-contain`}>
        {activeTab !== 'home' && activeTab !== 'booking' && <>
          <div className="flex justify-end px-3 pt-2"><button type="button" disabled={dataLoading} onClick={refreshData} className="min-h-9 rounded-lg border bg-white px-3 text-xs disabled:opacity-50">{dataLoading ? 'Đang cập nhật...' : 'Cập nhật dữ liệu'}</button></div>
          {dataLoading && <p role="status" className="p-3 text-xs">Đang tải dữ liệu...</p>}
          {dataError && <div role="alert" className="p-3 text-xs text-red-700">{dataError} <button onClick={refreshData} className="underline">Thử lại</button></div>}
        </>}
        {/* TAB 1: TRANG CHỦ (FIGMA GROUP B HOME) */}
        {activeTab === 'home' && (
          <GroupBHome
            carouselPaused={showLaunchScreen || showCareIntro || Boolean(registration) || zaloAuthState === 'checking' || zaloAuthState === 'required' || isAuthOpen || isNotificationsOpen || isSearchOpen || Boolean(viewingService || viewingDoctor || viewingBranch || directionsBranch) || isBranchDirectoryOpen || isSpecialistDirectoryOpen || isTreatmentOpen || isEMRModalOpen}
            userName={user.name}
            userAvatar={user.avatar}
            selectedBranchId={homeBranchId}
            onChangeBranch={setHomeBranchId}
            loading={dataLoading}
            error={dataError}
            onRefresh={refreshData}
            metadata={appMetadata}
            courses={courses}
            onSelectCourse={course => { setSelectedCourseId(course.id); setAcademyMode('catalog'); setActiveTab('academy'); }}
            guidelines={guidelines}
            services={services}
            doctors={doctors}
            branches={isStaffRole(user.role)&&staffDashboard?.scope.branchId?branches.filter(branch=>branch.id===staffDashboard.scope.branchId):branches}
            upcomingBooking={upcomingBooking}
            onOpenBooking={booking=>{setBookingTarget({id:`home:${booking.id}`,bookingId:booking.id});setActiveTab('booking');}}
            onSelectService={(service) => openBooking(service)}
            onViewServiceDetail={(s) => setViewingService(s)}
            onSelectDoctor={(doc) => setViewingDoctor(doc)}
            onSelectBranch={(br) => setViewingBranch(br)}
            onOpenDirections={(br) => setDirectionsBranch(br)}
            onNavigateTab={(tabKey) => {
              if(tabKey==='profile'&&!user.id){setCanCloseAuth(true);setIsAuthOpen(true);return;}
              if(tabKey==='customers')openCustomers();else navigateTab(tabKey as typeof activeTab);
            }}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={openInbox}
            unreadNotifications={notificationUnreadCount}
            onOpenBranches={() => { setDirectoryQuery(''); setActiveTab('services'); setIsBranchDirectoryOpen(true); }}
            onOpenSpecialists={() => { setDirectoryQuery(''); setActiveTab('services'); setIsSpecialistDirectoryOpen(true); }}
          />
        )}

        {activeTab === 'documents' && <DocumentLibrary key={user.id} onBack={()=>navigateTab(utilityReturnTab)}/>}
        {activeTab === 'community' && <Community key={user.id} onBack={()=>navigateTab(utilityReturnTab)}/>}
        {activeTab === 'customers' && <><StaffCustomers key={`${user.id}:${customerSection}`} initialSection={customerSection} onBack={()=>navigateTab(customerReturnTab)} onAppointment={id=>{setBookingTarget({id:`customer:${id}`,bookingId:id});setActiveTab('booking');}} onBookPackage={(customer,serviceId,ownedPackage)=>{const service=services.find(item=>item.id===serviceId);if(service)openBooking(service,null,null,ownedPackage,customer);else setBookingActionError('Dịch vụ của liệu trình hiện không khả dụng.');}}/>{bookingActionError&&<p role="alert" className="px-4 text-sm text-red-700">{bookingActionError}</p>}</>}

        {/* TAB 2: DỊCH VỤ CHĂM SÓC (FIGMA GROUP B SCREEN 2) */}
        {activeTab === 'services' && (
          <Box className="space-y-3 px-3 pt-3 pb-20">
            <div>
              <h1 className="text-[18px] font-bold text-[#164e63] leading-tight">Dịch vụ chăm sóc</h1>
              <p className="text-[10px] text-[#526a73] mt-1">Tra cứu dịch vụ và đặt lịch cho khách hàng.</p>
            </div>
            {services.filter(service=>/phu (?:bach|mach) huyet/.test(searchText(service.title))).map(service=><button key={service.id} type="button" onClick={()=>openBooking(service)} className="w-full rounded-[8px] border border-[#c8dde3] bg-white px-3 py-3 text-left text-sm font-semibold text-[#087e9c]">Đặt lịch {service.title}</button>)}
            {!services.some(service=>/phu (?:bach|mach) huyet/.test(searchText(service.title)))&&<button type="button" disabled title="Dịch vụ đang chờ cấu hình thời lượng và lịch nhận khách" className="w-full rounded-[8px] border border-[#c8dde3] bg-white px-3 py-3 text-left text-sm font-semibold text-[#087e9c] opacity-60">Đặt lịch kiểm tra phù bạch huyết</button>}

            {/* Search */}
            <div className="w-full flex items-center gap-2 text-left">
              <button type="button" title="Tìm kiếm tất cả" onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-[7px] bg-white border border-[#c8dde3] flex items-center justify-center shrink-0">
                <SearchIcon size={17} color="#087e9c" />
              </button>
              <input type="search" aria-label="Tìm dịch vụ chăm sóc" placeholder="Tìm dịch vụ chăm sóc..." value={servicesSearch} onChange={event => setServicesSearch(event.target.value)} className="h-10 min-w-0 flex-1 rounded-[7px] bg-white border border-[#c8dde3] px-3 text-xs text-[#183b47]" />
            </div>

            {/* Category Pills (Figma Screen 2) */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[{ id: 'all', label: 'Tất cả' }, ...appMetadata.serviceCategories.map((category: any) => ({ id: category.id, label: category.name }))].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setServicesCategory(c.id)}
                  className={`px-3 py-2 rounded-[7px] text-[10px] font-semibold whitespace-nowrap border transition active:scale-95 ${
                    servicesCategory === c.id
                      ? 'bg-[#087e9c] text-white border-[#087e9c]'
                      : 'bg-white text-[#526a73] border-[#c8dde3] hover:bg-[#F8EEE5]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Filter & Sort Bar */}
            <div className="flex items-end justify-between gap-3 pt-1">
              <button
                type="button"
                aria-expanded={showServiceFilters}
                aria-controls="service-filters"
                onClick={() => setShowServiceFilters(value => !value)}
                className="h-10 px-3 rounded-[7px] bg-white border border-[#c8dde3] font-semibold text-[10px] text-[#087e9c] flex items-center space-x-1.5"
              >
                <FilterIcon size={13} color="#087e9c" />
                <span>Bộ lọc</span>
              </button>

              <div className="flex-1 max-w-[210px] space-y-1 text-[10px] text-[#526a73]">
                <label htmlFor="service-sort" className="block">Sắp xếp theo</label>
                <select
                  id="service-sort"
                  value={servicesSort}
                  onChange={(e) => setServicesSort(e.target.value as any)}
                  className="w-full h-10 bg-white border border-[#c8dde3] rounded-[7px] px-3 font-medium text-[10px] text-[#183b47] outline-none cursor-pointer"
                >
                  <option value="popular">Nổi bật</option>
                  <option value="priceAsc">Giá tăng dần</option>
                  <option value="priceDesc">Giá giảm dần</option>
                </select>
              </div>
            </div>

            {showServiceFilters && <fieldset id="service-filters" className="grid grid-cols-2 gap-3 border-y border-[#dbe8eb] py-3 text-xs text-[#526a73]">
              <legend className="font-semibold">Lọc dịch vụ</legend>
              <label>Giá từ<input aria-label="Giá dịch vụ từ" type="number" min="0" value={minServicePrice} onChange={event => setMinServicePrice(event.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-[7px] border border-[#c8dde3] bg-white px-2" /></label>
              <label>Giá đến<input aria-label="Giá dịch vụ đến" type="number" min="0" value={maxServicePrice} onChange={event => setMaxServicePrice(event.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-[7px] border border-[#c8dde3] bg-white px-2" /></label>
              <label className="col-span-2">Thời lượng tối đa<select aria-label="Thời lượng dịch vụ tối đa" value={maxServiceDuration} onChange={event => setMaxServiceDuration(event.target.value)} className="mt-1 h-10 w-full rounded-[7px] border border-[#c8dde3] bg-white px-2"><option value="">Tất cả</option>{Array.from(new Set(services.map(service => service.durationMinutes).filter(Number.isFinite))).sort((a,b) => a-b).map(minutes => <option key={minutes} value={minutes}>{minutes} phút</option>)}</select></label>
              {minServicePrice && maxServicePrice && Number(minServicePrice) > Number(maxServicePrice) && <p role="alert" className="col-span-2 text-red-700">Giá đến phải lớn hơn hoặc bằng giá từ.</p>}
              <button type="button" className="col-span-2 justify-self-start py-2 font-semibold text-[#087e9c]" onClick={() => { setMinServicePrice(''); setMaxServicePrice(''); setMaxServiceDuration(''); setServicesCategory('all'); }}>Xóa bộ lọc</button>
            </fieldset>}

            <div className="text-[11px] font-bold text-[#183b47]">
              {catalogServices.length} dịch vụ phù hợp
            </div>
            <Box className="space-y-3">
              {catalogServices.map((service) => (
                <Box
                  key={service.id}
                  className="service-catalog-card bg-white rounded-[8px] border border-[#dbe8eb] overflow-hidden"
                >
                  <Box className="p-3 space-y-2.5">
                    <Box className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-[#F8EBDD] text-[#087e9c]">
                          {service.category}
                        </span>
                        <span className="text-[10px] text-stone-400 flex items-center space-x-1">
                          <ClockIcon size={11} color="#A89F91" />
                          <span>{service.durationMinutes} phút</span>
                        </span>
                      </div>
                      <Text className="text-[13px] font-bold text-[#183b47] line-clamp-2 leading-tight">
                        {service.title}
                      </Text>
                    </Box>

                  <Box className="flex items-center justify-between pt-2 border-t border-[#c8dde3]">
                    <Box>
                      <Text className="text-[10px] text-stone-400">Giá dịch vụ</Text>
                      <Text className="text-sm font-extrabold text-[#087e9c]">
                        {service.price.toLocaleString('vi-VN')}đ
                      </Text>
                    </Box>

                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingService(service);
                        }}
                        className="px-3 py-2 rounded-[7px] bg-white text-[#087e9c] text-[10px] font-bold border border-[#c8dde3]"
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBooking(service);
                        }}
                        className="px-3.5 py-2 rounded-[7px] bg-[#087e9c] hover:bg-[#8F4513] text-white text-[10px] font-bold active:scale-95 transition flex items-center space-x-1"
                      >
                        <span>Đặt lịch</span>
                        <ArrowRightIcon size={12} color="#FFFFFF" />
                      </button>
                    </div>
                  </Box>
                  </Box>
                </Box>
              ))}
            </Box>

          </Box>
        )}

        {/* TAB 3: ĐẶT LỊCH & QUẢN LÝ LỊCH HẸN (FIGMA GROUP C: C01 -> C10) */}
        {activeTab === 'booking' && (
          <AppointmentsManager
            onBusyChange={setNavigationBusy}
            key={`${user.id}:${bookingTarget?.id || ''}`}
            initialBookingId={bookingTarget?.bookingId}
            bookings={bookings}
            branches={branches}
            authenticated={Boolean(user.id)}
            onRequireLogin={()=>{setCanCloseAuth(true);setIsAuthOpen(true);}}
            loading={privateLoading}
            error={privateErrors.bookings||bookingActionError}
            onRefresh={bookingActionError?refreshData:retryPrivateData}
            onClose={() => setActiveTab('home')}
            onUpdateBookings={(updated) => { setBookings(updated); refreshBookingRelatedData(); }}
            onBookNewService={() => openBooking(services[0])}
            onRebookService={(id) => {
              const matched = services.find((s) => s.id === id);
              if (matched) openBooking(matched);
              else { setDataError('Dịch vụ này không còn nhận đặt lịch. Vui lòng chọn dịch vụ khác.'); setActiveTab('services'); }
            }}
          />
        )}

        {/* TAB 4: HỌC VIỆN & ĐÀO TẠO NGHỀ (FIGMA GROUP E) */}
        {activeTab === 'academy' && <GroupEAcademy key={`${user.id}:${academyMode}:${academyVisit}:${academyTarget?.id || ''}`} courses={courses} userId={user.id} user={user} branches={branches}
          onBusyChange={setNavigationBusy}
          notificationTarget={academyTarget}
          loading={dataLoading} error={dataError} onRefresh={refreshData}
          onOpenNotifications={openInbox}
          onRequireLogin={() => { setCanCloseAuth(true); setIsAuthOpen(true); }}
          mode={academyMode} catalogSearch={catalogSearch} initialCourseId={academyMode === 'catalog' ? selectedCourseId || undefined : undefined} />}

        {/* TAB 5: HỘI VIÊN & CÁ NHÂN (FIGMA GROUP F VIP PASS) */}
        {activeTab === 'profile' && (
          <Box className="space-y-4">
            <GroupFProfile
              staffDashboard={staffDashboard}
              onOpenCustomers={openCustomers}
              onOpenDocuments={()=>navigateTab('documents')}
              onOpenCommunity={()=>navigateTab('community')}
              branches={branches}
              onRefreshData={refreshData}
              onManageSessions={()=>setAccountSessionsOpen(true)}
              key={`${user.id}:${profileTarget?.id || ''}`}
              notificationTarget={profileTarget}
              user={user}
              metadata={{ tierRules: appMetadata.membershipTiers, loyalty: appMetadata.loyaltySettings,phoneVerified:Boolean(user.id) }}
              onLogout={disconnectAccount}
              onSelectVoucher={voucher => {
                try {
                  localStorage.setItem('mld_pending_voucher', JSON.stringify({ code: voucher.code, scope: 'service' }));
                  setActiveTab('services');
                } catch { setDataError('Không thể giữ lựa chọn voucher trên thiết bị. Bạn có thể nhập mã khi đặt lịch.'); }
              }}
              onUserUpdated={account=>{setUser(account);refreshBookingRelatedData();}}
              onOpenAppointments={() => navigateTab('booking')}
              onOpenPackages={() => {
                if(isStaffRole(user.role)){openCustomers('packages');return;}
                setTreatmentInitialTab('packages');
                setIsTreatmentOpen(true);
              }}
              onOpenAcademy={() => {
                setAcademyTarget(undefined);setSelectedCourseId(null);
                setAcademyMode('learning');
                setActiveTab('academy');
              }}
              onOpenCourseCatalog={() => {
                navigateTab('academy');
              }}
              onOpenOnboarding={() => {
                setCanCloseAuth(true);
                setIsAuthOpen(true);
              }}
              vouchers={vouchers}
              onVouchersUpdated={setVouchers}
              summary={memberSummary}
              summaryError={membershipError}
            />
          </Box>
        )}
      </div>

      {/* ================= MODAL OVERLAYS & FLOWS ================= */}

      {isNotificationsOpen && (
        <NotificationCenter
          key={user.id}
          notifications={notifications}
          filter={notificationFilter}
          onFilter={filter=>{
            if(notificationFilterRef.current===filter)return;
            notificationFilterRef.current=filter;notificationPageEpoch.current++;
            notificationMoreLock.current=false;notificationPaged.current=false;
            setNotificationLoadingMore(false);setNotifications([]);setNotificationCursor(null);
            setNotificationError('');setNotificationFilter(filter);
          }}
          onChange={setNotifications}
          unreadCount={notificationUnreadCount}
          totalCount={notificationTotalCount}
          onUnreadCount={value=>{notificationReadRevision.current++;setNotificationUnreadCount(value);setNotificationRefresh(current=>current+1);}}
          hasMore={Boolean(notificationCursor)}
          loadingMore={notificationLoadingMore}
          onLoadMore={()=>{
            if(notificationMoreLock.current||!notificationCursor)return;
            notificationMoreLock.current=true;
            const owner=user.id,readRevision=notificationReadRevision.current,epoch=notificationPageEpoch.current;setNotificationLoadingMore(true);
            void apiClient.getNotifications(false,notificationCursor,notificationFilter).then(response=>{
              if(currentUserId.current!==owner||epoch!==notificationPageEpoch.current)return;
              if(response?.error||!Array.isArray(response?.notifications)){setNotificationError(response?.error||'Không thể tải thông báo.');return;}
              notificationPaged.current=true;applyNotificationPage(response,true,readRevision,notificationFilter);
            }).catch(()=>{if(epoch===notificationPageEpoch.current)setNotificationError('Không thể tải thông báo.');}).finally(()=>{if(epoch===notificationPageEpoch.current){notificationMoreLock.current=false;setNotificationLoadingMore(false);}});
          }}
          onOpen={openNotification}
          loadError={notificationError}
          onRefresh={() => setNotificationRefresh(value => value + 1)}
          onClose={() => {notificationNavigation.current++;setIsNotificationsOpen(false);}}
        />
      )}

      {/* 3. GROUP A: ONBOARDING & AUTH FLOW (A01 -> A06) */}
      {accountSessionsOpen&&user.id&&<AccountSessions key={user.id} userId={user.id} userName={user.name} phone={user.phone} onClose={()=>setAccountSessionsOpen(false)} onLogout={disconnectAccount}/>}
      <GroupAAuthModal
        onManageSessions={()=>setAccountSessionsOpen(true)}
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          setLoadVersion(value => value + 1);
          setIsAuthOpen(false);
          setActiveTab('home');
        }}
        canClose={canCloseAuth}
      />

      {/* 4. GROUP B EXTENSIONS: SERVICE DETAIL MODAL (B03) */}
      {viewingService && (
        <ServiceDetailModal
          bookingError={bookingActionError}
          userId={user.id}
          onRequireLogin={()=>{setCanCloseAuth(true);setIsAuthOpen(true);}}
          service={viewingService}
          onClose={() => setViewingService(null)}
          onBookNow={(s) => {
            if(openBooking(s))setViewingService(null);
          }}
        />
      )}

      {/* 5. GROUP B EXTENSIONS: SPECIALIST DETAIL MODAL (B06) */}
      {viewingDoctor && (
        <SpecialistDetailModal
          doctor={viewingDoctor}
          branches={branches}
          bookingError={specialistBookingError}
          onClose={() => setViewingDoctor(null)}
          onBookWithDoctor={(doctor) => {
            const branch=branches.find(item=>item.id===doctor.branchId);
            if(!branch){setSpecialistBookingError('Cơ sở không còn khả dụng. Vui lòng cập nhật dữ liệu.');return;}
            if(openBooking(services[0],branch)){
              setViewingDoctor(null);setIsSpecialistDirectoryOpen(false);
            }
          }}
        />
      )}

      {/* 6. GROUP B EXTENSIONS: BRANCH DETAIL MODAL (B04) */}
      {viewingBranch && (
        <BranchDetailModal
          branch={viewingBranch}
          bookingError={bookingActionError}
          onClose={() => setViewingBranch(null)}
          onSelectBranch={(br) => {
            setHomeBranchId(br.id);
            if(openBooking(services[0], br)){setViewingBranch(null);setIsBranchDirectoryOpen(false);}
          }}
          onOpenDirections={(br) => {
            setViewingBranch(null);
            setDirectionsBranch(br);
          }}
        />
      )}

      {/* 7. GROUP B EXTENSIONS: LOCATION & DIRECTIONS MODAL */}
      {directionsBranch && (
        <LocationDirectionsModal
          branch={directionsBranch}
          bookingError={bookingActionError}
          onClose={() => { setViewingBranch(directionsBranch); setDirectionsBranch(null); }}
          onBookAtBranch={(br) => {
            if(openBooking(services[0], br)){setDirectionsBranch(null);setViewingBranch(null);setIsBranchDirectoryOpen(false);}
          }}
        />
      )}

      {isBranchDirectoryOpen && (
        <div hidden={Boolean(viewingBranch || directionsBranch)}>
        <BranchDirectoryModal
          branches={branches}
          services={services}
          initialQuery={directoryQuery}
          onClose={() => setIsBranchDirectoryOpen(false)}
          onSelectBranch={(branch) => {
            setViewingBranch(branch);
          }}
        />
        </div>
      )}

      {isSpecialistDirectoryOpen && (
        <SpecialistDirectoryModal
          doctors={doctors}
          services={services}
          initialQuery={directoryQuery}
          onClose={() => setIsSpecialistDirectoryOpen(false)}
          onSelectDoctor={(doctor) => {
            setViewingDoctor(doctor);
          }}
        />
      )}

      {/* 8. GROUP C: 4-STEP BOOKING FLOW MODAL (C01 -> C07) */}
      {bookingService && (
        <StaffBooking
          onCatalogUpdate={setServices}
          currentUser={user}
          initialService={bookingService}
          initialBranch={bookingBranch}
          initialCustomer={bookingCustomer}
          initialPackageId={bookingPackage?.id}
          allServices={services}
          branches={branches}
          onClose={() => {
            setBookingService(null);
            setBookingBranch(null);
            setBookingDoctor(null);
          }}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* 9. GROUP C: E-TICKET QR PASS MODAL (C08) */}
      {eTicketBooking && (
        <ETicketGroupC
          booking={eTicketBooking}
          branches={branches}
          onClose={() => setETicketBooking(null)}
          onGoToAppointments={() => {
            setActiveTab('booking');
            setETicketBooking(null);
          }}
        />
      )}

      {/* 10. GROUP D: EMR RECORDS & TELEHEALTH DEDICATED FULL PAGE */}
      {isEMRModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-white border-b border-[#c8dde3] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsEMRModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#ffffff] flex items-center justify-center text-[#183b47] hover:bg-[#c8dde3] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#183b47" />
              </button>
              <h2 className="font-bold text-sm text-[#183b47]">Hồ sơ bệnh án điện tử (EMR)</h2>
            </div>
            <button
              onClick={() => setIsEMRModalOpen(false)}
              className="text-xs text-[#087e9c] font-bold"
            >
              Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-20">
              <GroupDRecords records={records} loading={privateLoading} error={privateErrors.records} />
              {privateErrors.records&&<button type="button" disabled={privateLoading} onClick={retryPrivateData}>Thử lại</button>}
          </div>
        </div>
      )}

      {/* 11. ZOOM SEARCH MODAL (FIGMA B02) */}
      <GroupBSearch
        onNavigateCategory={(category, query) => {
          setIsSearchOpen(false);
          if (category === 'course') {
            setSelectedCourseId(null); setAcademyMode('catalog');
            setCatalogSearch({query, id: Date.now()}); setActiveTab('academy');
          } else {
            setActiveTab('services');
            if (category === 'service') {
              setServicesSearch(query); setServicesCategory('all'); setMinServicePrice(''); setMaxServicePrice(''); setMaxServiceDuration('');
            } else {
              setDirectoryQuery(query);
              if (category === 'branch') setIsBranchDirectoryOpen(true);
              else setIsSpecialistDirectoryOpen(true);
            }
          }
        }}
        userId={user.id}
        onRequireLogin={() => { setCanCloseAuth(true); setIsAuthOpen(true); }}
        services={services}
        courses={courses}
        branches={branches}
        doctors={doctors}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectService={(s) => {
          setIsSearchOpen(false);
          const found = services.find((x) => x.id === s.id);
          if (found) setViewingService(found);
        }}
        onSelectCourse={course => {
          setIsSearchOpen(false);
          setSelectedCourseId(course.id);
          setAcademyMode('catalog');
          setActiveTab('academy');
        }}
        onSelectBranch={(br) => {
          setIsSearchOpen(false);
          const found = branches.find((x) => x.id === br.id);
          if (found) setViewingBranch(found);
        }}
        onSelectSpecialist={(sp) => {
          setIsSearchOpen(false);
          const found = doctors.find((x) => x.id === sp.id);
          if (found) setViewingDoctor(found);
        }}
      />

      {/* 12. GROUP D: TREATMENT & CUSTOMER CARE MODAL (FIGMA D01 - D08) */}
      {isTreatmentOpen && (
        <div className="absolute inset-x-0 top-0 bottom-[68px] z-20 bg-[#ffffff] flex flex-col overflow-hidden animate-fade-in">
          <div className="flex-1 overflow-y-auto">
            <GroupDTreatment
              onBusyChange={setNavigationBusy}
              key={`${user.id}:${treatmentInitialTab}:${treatmentEntityId || ''}`}
              initialEntityId={treatmentEntityId}
              initialTab={treatmentInitialTab}
              treatmentPlans={treatmentPlans}
              sourceLoading={privateLoading}
              sourceErrors={privateErrors}
              bookingError={bookingActionError}
              onRetrySource={retryPrivateData}
              records={records}
              bookings={bookings}
              onNotificationsChange={setNotifications}
              onOpenNotification={openNotification}
              onOpenInbox={()=>setIsNotificationsOpen(true)}
              onOpenPlanBooking={(id,serviceId)=>{
                const service=services.find(item=>item.id===serviceId),plan=treatmentPlans.find(item=>item.id===id);
                if(!service||!plan) { setBookingActionError('Dịch vụ của gói không còn khả dụng.'); return; }
                if(openBooking(service,null,null,{id,name:plan.name||plan.package?.name||''}))setIsTreatmentOpen(false);
              }}
              user={user}
              notifications={notifications}
              onClose={() => setIsTreatmentOpen(false)}
              onOpenBooking={() => {
                if(openBooking(services[0]))setIsTreatmentOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 13. BOTTOM NAVIGATION BAR (FIGMA DESIGN SYSTEM 02 — 5 TRẠNG THÁI) */}
      <div className="app-bottom-nav absolute bottom-0 left-0 right-0 bg-white border-t border-[#dbe8eb] z-30 shadow-[0_-2px_8px_rgba(64,53,47,0.05)]">
        <div className="grid grid-cols-5 h-[62px] px-1">
          {[
            { key: 'home', label: 'Trang chủ', IconComponent: NavHomeIcon },
            { key: 'services', label: 'Dịch vụ', IconComponent: NavServiceIcon },
            { key: 'academy', label: 'Đào tạo', IconComponent: NavAcademyIcon },
            { key: 'documents', label: 'Tài liệu', IconComponent: FileTextIcon },
            { key: 'profile', label: 'Cá nhân', IconComponent: NavProfileIcon },
          ].map((tab) => {
            const isActive = (isSearchOpen ? 'services' : activeTab) === tab.key;
            const TabIcon = tab.IconComponent;
            return (
              <button
                key={tab.key}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                disabled={navigationBusy}
                title={navigationBusy?'Đang lưu dữ liệu':undefined}
                onClick={() => {
                  navigateTab(tab.key as typeof activeTab);
                }}
                className={`w-full h-[58px] flex flex-col items-center justify-center gap-1 transition-colors rounded-[10px] active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#e8f4f7] text-[#087e9c] font-semibold'
                    : 'text-[#526a73] hover:text-[#087e9c] font-normal'
                }`}
              >
                <TabIcon
                  size={22}
                  color={isActive ? '#087e9c' : '#526a73'}
                  fill="none"
                />
                <span className="text-[10px] leading-none whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* iOS Home Indicator Bar */}
        <div className="app-home-indicator w-[104px] h-1 bg-[#1F1B18] rounded-full mx-auto mt-1 mb-1.5" />
      </div>
    </div>
  </div>
  );
}

export default MasterHomePage;
