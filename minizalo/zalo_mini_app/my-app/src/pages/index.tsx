import React, { useState, useEffect } from 'react';
import { Page, Box, Text } from 'zmp-ui';
import { HeaderFigma } from '@/components/HeaderFigma';
import { GroupBHome } from '@/components/HomeDashboard';
import { GroupCBooking } from '@/components/GroupCBooking';
import { AppointmentsManager } from '@/components/AppointmentsManager';
import { ETicketGroupC } from '@/components/ETicketGroupC';
import { GroupEAcademy } from '@/components/GroupEAcademy';
import { GroupDTreatment } from '@/components/GroupDTreatment';
import { GroupDRecords } from '@/components/GroupDRecords';
import { GroupFProfile } from '@/components/GroupFProfile';
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
import { searchText } from '@/utils/catalog';
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
} from '@/components/Icons';

function MasterHomePage() {
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [showCareIntro, setShowCareIntro] = useState(true);
  // Navigation Tabs matching Figma Nhóm B & C: 'home' | 'services' | 'booking' | 'academy' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'booking' | 'academy' | 'profile'>('home');
  const [academyMode, setAcademyMode] = useState<'catalog' | 'learning'>('catalog');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Application Data States (synced with Backend API)
  const [services, setServices] = useState<MedicalService[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [homeBranchId, setHomeBranchId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [user, setUser] = useState<User>({ ...guestUser });
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [memberSummary, setMemberSummary] = useState({ upcomingBookings: 0, remainingTreatmentSessions: 0, activeCourses: 0 });
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [zaloAuthState, setZaloAuthState] = useState<'checking' | 'required' | 'connected' | 'web'>('checking');
  const [zaloAuthError, setZaloAuthError] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
  const [eTicketBooking, setETicketBooking] = useState<Booking | null>(null);
  const [isEMRModalOpen, setIsEMRModalOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
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
  const [loadVersion, setLoadVersion] = useState(0);
  const [registration, setRegistration] = useState<RegistrationChallenge | null>(null);
  const [appMetadata, setAppMetadata] = useState<any>({ serviceCategories: [], courseCategories: [], instructors: [], membershipTiers: [], loyaltySettings: null, faqs: [] });
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const refreshData = () => { apiClient.clearReadCache(); setLoadVersion(value => value + 1); };
  // Fetch real data from Backend on mount
  useEffect(() => {
    let cancelled = false;
    async function loadBackendData() {
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
      setMemberSummary({ upcomingBookings: 0, remainingTreatmentSessions: 0, activeCourses: 0 });
      setETicketBooking(null);
      setBookingService(null);
      const publicPreload = apiClient.preloadPublicData();
      const metadataRequest = apiClient.getAppMetadata();
      const catalogRequest = Promise.all([
        apiClient.getServices(), apiClient.getDoctors(), apiClient.getBranches(),
        apiClient.getCourses(), apiClient.getCareGuidelines(),
      ]);
      let authenticated = false;
      const isInsideZalo = /Zalo/i.test(navigator.userAgent) || Boolean((window as any).ZJSBridge);
      if (isInsideZalo) {
        const zaloSession = await apiClient.loginWithZalo(false);
        if (cancelled) return;
        if (zaloSession?.user && zaloSession.token) {
          authenticated = true;
          setUser((prev) => ({ ...prev, ...zaloSession.user }));
          setZaloAuthState('connected');
        } else {
          setZaloAuthError(zaloSession?.error || 'Không thể xác thực với Zalo.');
          setZaloAuthState('required');
        }
      } else {
        setZaloAuthState('web');
        const session = await apiClient.getCurrentUser();
        if (cancelled) return;
        if (session?.user) { setUser(session.user); authenticated = true; }
        else { apiClient.logout(); setUser({ ...guestUser }); }
      }
      const privatePreload = authenticated ? apiClient.preloadPrivateData() : Promise.resolve([]);
      const [metadata, [srvData, docData, brData, crsData, care], recData, membData, bkData, notifData, treatmentData] = await Promise.all([
        metadataRequest, catalogRequest,
        authenticated ? apiClient.getMedicalRecords() : Promise.resolve({}),
        authenticated ? apiClient.getMembership() : Promise.resolve({}),
        authenticated ? apiClient.getBookings() : Promise.resolve({}),
        authenticated ? apiClient.getNotifications() : Promise.resolve({}),
        authenticated ? apiClient.getTreatmentPlans() : Promise.resolve({}),
        publicPreload, privatePreload,
      ]);
      if (cancelled) return;
      if (!metadata?.error) setAppMetadata(metadata);
      if (care?.guidelines) setGuidelines(care.guidelines);

      const results = [srvData, docData, brData, crsData, care, ...(authenticated ? [recData, membData, bkData, notifData, treatmentData] : [])];
      if (metadata?.error || results.some(result => !result || result.error)) setDataError('Không thể tải một số dữ liệu. Vui lòng thử lại.');
      setDataLoading(false);
      if (srvData?.services) setServices(srvData.services);
      if (docData?.doctors) setDoctors(docData.doctors);
      if (brData?.branches) setBranches(brData.branches);
      if (crsData?.courses) setCourses(crsData.courses);
      if (recData?.records) setRecords(recData.records);
      if (membData?.vouchers) setVouchers(membData.vouchers);
      if (membData?.user) setUser((prev) => ({ ...prev, ...membData.user }));
      if (membData?.summary) setMemberSummary(membData.summary);
      if (bkData?.bookings) setBookings(bkData.bookings);
      if (notifData?.notifications) setNotifications(notifData.notifications);
      if (treatmentData?.treatmentPlans) setTreatmentPlans(treatmentData.treatmentPlans);
    }

    loadBackendData().catch(() => { if (!cancelled) { setDataError('Không thể tải dữ liệu. Vui lòng thử lại.'); setDataLoading(false); } });
    return () => { cancelled = true; };
  }, [loadVersion]);

  const connectZaloProfile = async () => {
    setZaloAuthError('');
    setZaloAuthState('checking');
    const result = await apiClient.loginWithZalo(true);
    if (result?.registrationRequired && result.registrationToken) {
      setRegistration({ registrationToken: result.registrationToken, phone: result.phone, suggestedName: result.suggestedName, suggestedAvatar: result.suggestedAvatar });
      setZaloAuthState('web');
      return;
    }
    if (result?.user && result.token) {
      setUser((prev) => ({ ...prev, ...result.user }));
      setZaloAuthState('connected');
      setLoadVersion(value => value + 1);
      const membership = await apiClient.getMembership();
      if (membership?.user) setUser((prev) => ({ ...prev, ...membership.user }));
      if (membership?.summary) setMemberSummary(membership.summary);
      return;
    }
    setZaloAuthError(result?.error || 'Bạn chưa cấp quyền thông tin tài khoản Zalo.');
    setZaloAuthState('required');
  };

  const refreshBookingRelatedData = () => {
    apiClient.getNotifications().then(response => response?.notifications && setNotifications(response.notifications));
    apiClient.getMembership().then(response => {
      if (response?.summary) setMemberSummary(response.summary);
      if (response?.vouchers) setVouchers(response.vouchers);
    });
  };
  const handleBookingSuccess = (newBooking: Booking) => {
    setBookingService(null);
    setBookingBranch(null);
    setBookingDoctor(null);
    setViewingService(null);
    setBookings((prev) => [newBooking, ...prev]);
    setETicketBooking(newBooking);
    refreshBookingRelatedData();
  };

  // Find latest upcoming confirmed booking
  const bookingStart = (booking: Booking) => Date.parse(`${booking.date.slice(0,10)}T${booking.timeSlot.split(' - ')[0]}+07:00`);
  const upcomingBooking = bookings.filter(booking => ['confirmed','pending'].includes(booking.status) && bookingStart(booking) > Date.now())
    .sort((a,b) => bookingStart(a)-bookingStart(b))[0] || null;

  const openBooking = (service?: MedicalService | null, branch?: Branch | null, doctor?: Doctor | null) => {
    if (!user.id) { setCanCloseAuth(true); setIsAuthOpen(true); return; }
    if (!services.length || !branches.length) return;
    setBookingBranch(branch || branches.find(item => item.id === homeBranchId) || branches[0] || null);
    setBookingDoctor(doctor || null);
    setBookingService(service || services[0] || null);
  };

  // Filtered services for Tab 'services'
  const catalogServices = services
    .filter((s) => {
      const matchSearch =
        searchText(`${s.title} ${s.category} ${s.description}`).includes(searchText(servicesSearch));
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
    <div className="min-h-screen bg-[#EDE7DE] flex justify-center items-start sm:items-center py-0 sm:py-4 text-stone-800 select-none">
      <div className={`mini-app-shell ${activeTab === 'home' ? 'mini-app-shell--home' : ''} ${activeTab === 'booking' || eTicketBooking ? 'mini-app-shell--appointments' : ''} ${bookingService ? 'mini-app-shell--booking' : ''} ${isSpecialistDirectoryOpen || viewingDoctor ? 'mini-app-shell--specialists' : ''} ${isBranchDirectoryOpen || viewingBranch || directionsBranch ? 'mini-app-shell--branches' : ''} ${showLaunchScreen || showCareIntro || registration ? 'mini-app-shell--launch' : ''} w-full max-w-[390px] sm:h-[844px] sm:max-h-[96vh] bg-[#FAF6F0] sm:rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col border sm:border-[#DCCFC0]`}>
        {showLaunchScreen && <LaunchScreen ready={!dataLoading} onComplete={() => setShowLaunchScreen(false)} />}
        {!showLaunchScreen && showCareIntro && <CareIntroScreen onContinue={() => setShowCareIntro(false)} onSkip={() => setShowCareIntro(false)} />}
        {(zaloAuthState === 'required' || zaloAuthState === 'checking') && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#FAF6F0] p-6">
            <div className="w-full rounded-[8px] border border-[#EADECF] bg-white p-5 text-center shadow-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5EBE1] text-xl font-black text-[#98501B]">Z</div>
              <h1 className="mt-4 text-lg font-bold text-[#40352F]">Kết nối tài khoản Zalo</h1>
              <p className="mt-2 text-xs leading-relaxed text-[#75685F]">Kết nối bằng số điện thoại Zalo. Tên và ảnh đại diện chỉ được sử dụng khi bạn đồng ý chia sẻ.</p>
              {zaloAuthError && <p className="mt-3 rounded-[8px] bg-red-50 p-2.5 text-left text-[11px] text-red-700">{zaloAuthError}</p>}
              <button disabled={zaloAuthState === 'checking'} onClick={connectZaloProfile} className="mt-5 h-11 w-full rounded-[8px] bg-[#98501B] text-sm font-bold text-white disabled:opacity-60">
                {zaloAuthState === 'checking' ? 'Đang kết nối...' : 'Tiếp tục với Zalo'}
              </button>
              <p className="mt-3 text-[10px] text-[#8A7D74]">Không cần nhập số điện thoại hoặc mã OTP.</p>
              <button type="button" disabled={zaloAuthState === 'checking'} onClick={() => setZaloAuthState('web')} className="mt-3 min-h-11 px-4 text-xs font-semibold text-[#75685F] disabled:opacity-60">Xem dịch vụ trước</button>
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
            branches={branches}
            upcomingBooking={upcomingBooking}
            onSelectService={(service) => openBooking(service)}
            onViewServiceDetail={(s) => setViewingService(s)}
            onSelectDoctor={(doc) => setViewingDoctor(doc)}
            onSelectBranch={(br) => setViewingBranch(br)}
            onOpenDirections={(br) => setDirectionsBranch(br)}
            onNavigateTab={(tabKey) => setActiveTab(tabKey as any)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={() => {
              apiClient.getNotifications().then((response) => {
                if (response?.notifications) setNotifications(response.notifications);
                setIsNotificationsOpen(true);
              });
            }}
            unreadNotifications={notifications.filter((item) => !item.isRead).length}
            onOpenBranches={() => { setDirectoryQuery(''); setActiveTab('services'); setIsBranchDirectoryOpen(true); }}
            onOpenSpecialists={() => { setDirectoryQuery(''); setActiveTab('services'); setIsSpecialistDirectoryOpen(true); }}
          />
        )}

        {/* TAB 2: DỊCH VỤ CHĂM SÓC (FIGMA GROUP B SCREEN 2) */}
        {activeTab === 'services' && (
          <Box className="space-y-3 px-3 pt-3 pb-20">
            <div>
              <h1 className="text-[18px] font-bold text-[#6F452C] leading-tight">Dịch vụ chăm sóc</h1>
              <p className="text-[10px] text-[#7A685D] mt-1">Khám phá dịch vụ phù hợp với nhu cầu của bạn.</p>
            </div>

            {/* Search */}
            <div className="w-full flex items-center gap-2 text-left">
              <button type="button" title="Tìm kiếm tất cả" onClick={() => setIsSearchOpen(true)} className="w-10 h-10 rounded-[7px] bg-white border border-[#DED2C5] flex items-center justify-center shrink-0">
                <SearchIcon size={17} color="#A65317" />
              </button>
              <input type="search" aria-label="Tìm dịch vụ chăm sóc" placeholder="Tìm dịch vụ chăm sóc..." value={servicesSearch} onChange={event => setServicesSearch(event.target.value)} className="h-10 min-w-0 flex-1 rounded-[7px] bg-white border border-[#DED2C5] px-3 text-xs text-[#40352F]" />
            </div>

            {/* Category Pills (Figma Screen 2) */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[{ id: 'all', label: 'Tất cả' }, ...appMetadata.serviceCategories.map((category: any) => ({ id: category.id, label: category.name }))].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setServicesCategory(c.id)}
                  className={`px-3 py-2 rounded-[7px] text-[10px] font-semibold whitespace-nowrap border transition active:scale-95 ${
                    servicesCategory === c.id
                      ? 'bg-[#A65317] text-white border-[#A65317]'
                      : 'bg-white text-[#6F625B] border-[#DED2C5] hover:bg-[#F8EEE5]'
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
                className="h-10 px-3 rounded-[7px] bg-white border border-[#D8C9BA] font-semibold text-[10px] text-[#A65317] flex items-center space-x-1.5"
              >
                <FilterIcon size={13} color="#98501B" />
                <span>Bộ lọc</span>
              </button>

              <div className="flex-1 max-w-[210px] space-y-1 text-[10px] text-[#6F625B]">
                <label htmlFor="service-sort" className="block">Sắp xếp theo</label>
                <select
                  id="service-sort"
                  value={servicesSort}
                  onChange={(e) => setServicesSort(e.target.value as any)}
                  className="w-full h-10 bg-white border border-[#D8C9BA] rounded-[7px] px-3 font-medium text-[10px] text-[#40352F] outline-none cursor-pointer"
                >
                  <option value="popular">Nổi bật</option>
                  <option value="priceAsc">Giá tăng dần</option>
                  <option value="priceDesc">Giá giảm dần</option>
                </select>
              </div>
            </div>

            {showServiceFilters && <fieldset id="service-filters" className="grid grid-cols-2 gap-3 border-y border-[#E8DDD2] py-3 text-xs text-[#6F625B]">
              <legend className="font-semibold">Lọc dịch vụ</legend>
              <label>Giá từ<input aria-label="Giá dịch vụ từ" type="number" min="0" value={minServicePrice} onChange={event => setMinServicePrice(event.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-[7px] border border-[#DED2C5] bg-white px-2" /></label>
              <label>Giá đến<input aria-label="Giá dịch vụ đến" type="number" min="0" value={maxServicePrice} onChange={event => setMaxServicePrice(event.target.value)} className="mt-1 h-10 w-full min-w-0 rounded-[7px] border border-[#DED2C5] bg-white px-2" /></label>
              <label className="col-span-2">Thời lượng tối đa<select aria-label="Thời lượng dịch vụ tối đa" value={maxServiceDuration} onChange={event => setMaxServiceDuration(event.target.value)} className="mt-1 h-10 w-full rounded-[7px] border border-[#DED2C5] bg-white px-2"><option value="">Tất cả</option>{Array.from(new Set(services.map(service => service.durationMinutes).filter(Number.isFinite))).sort((a,b) => a-b).map(minutes => <option key={minutes} value={minutes}>{minutes} phút</option>)}</select></label>
              {minServicePrice && maxServicePrice && Number(minServicePrice) > Number(maxServicePrice) && <p role="alert" className="col-span-2 text-red-700">Giá đến phải lớn hơn hoặc bằng giá từ.</p>}
              <button type="button" className="col-span-2 justify-self-start py-2 font-semibold text-[#A65317]" onClick={() => { setMinServicePrice(''); setMaxServicePrice(''); setMaxServiceDuration(''); setServicesCategory('all'); }}>Xóa bộ lọc</button>
            </fieldset>}

            <div className="text-[11px] font-bold text-[#40352F]">
              {catalogServices.length} dịch vụ phù hợp
            </div>
            <Box className="space-y-3">
              {catalogServices.map((service) => (
                <Box
                  key={service.id}
                  onClick={() => setViewingService(service)}
                  className="service-catalog-card bg-white rounded-[8px] border border-[#E3D7CB] overflow-hidden cursor-pointer hover:border-[#A65317] transition"
                >
                  <div className="relative w-full h-[190px]">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Box className="p-3 space-y-2.5">
                    <Box className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-[4px] bg-[#F8EBDD] text-[#98501B]">
                          {service.category}
                        </span>
                        <span className="text-[10px] text-stone-400 flex items-center space-x-1">
                          <ClockIcon size={11} color="#A89F91" />
                          <span>{service.durationMinutes} phút</span>
                        </span>
                      </div>
                      <Text className="text-[13px] font-bold text-[#40352F] line-clamp-2 leading-tight">
                        {service.title}
                      </Text>
                      <Text className="text-[11px] text-stone-500 line-clamp-2">
                        {service.description}
                      </Text>
                    </Box>

                  <Box className="flex items-center justify-between pt-2 border-t border-[#EADECF]">
                    <Box>
                      <Text className="text-[10px] text-stone-400">Chi phí gói</Text>
                      <Text className="text-sm font-extrabold text-[#98501B]">
                        {service.price.toLocaleString('vi-VN')}đ
                      </Text>
                    </Box>

                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingService(service);
                        }}
                        className="px-3 py-2 rounded-[7px] bg-white text-[#98501B] text-[10px] font-bold border border-[#D8C9BA]"
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBooking(service);
                        }}
                        className="px-3.5 py-2 rounded-[7px] bg-[#A65317] hover:bg-[#8F4513] text-white text-[10px] font-bold active:scale-95 transition flex items-center space-x-1"
                      >
                        <span>Đặt Lịch</span>
                        <ArrowRightIcon size={12} color="#FFFFFF" />
                      </button>
                    </div>
                  </Box>
                  </Box>
                </Box>
              ))}
            </Box>

            <section className="space-y-3 border-t border-[#E8DDD2] pt-4">
              <div className="flex items-center justify-between">
                <div><h2 className="text-[14px] font-bold text-[#6F452C]">Đội ngũ chuyên viên</h2><p className="mt-0.5 text-[9px] text-[#7A685D]">Chọn chuyên viên phù hợp với nhu cầu chăm sóc.</p></div>
                <button onClick={() => { setDirectoryQuery(''); setIsSpecialistDirectoryOpen(true); }} className="h-8 rounded-[7px] border border-[#D8C9BA] bg-white px-3 text-[9px] font-bold text-[#A65317]">Xem tất cả</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {doctors.slice(0, 2).map((doctor) => <button key={doctor.id} onClick={() => setViewingDoctor(doctor)} className="overflow-hidden rounded-[8px] border border-[#E3D7CB] bg-white text-left"><img src={doctor.avatar} alt={doctor.name} className="h-[105px] w-full object-cover" /><div className="p-2.5"><h3 className="line-clamp-1 text-[11px] font-bold text-[#40352F]">{doctor.name}</h3><p className="mt-1 line-clamp-1 text-[9px] text-[#7A685D]">{doctor.title}</p><p className="mt-2 text-[9px] font-semibold text-[#A65317]">{doctor.reviewsCount > 0 ? `★ ${doctor.rating}` : ''} · {doctor.experienceYears} năm</p></div></button>)}
              </div>
            </section>
          </Box>
        )}

        {/* TAB 3: ĐẶT LỊCH & QUẢN LÝ LỊCH HẸN (FIGMA GROUP C: C01 -> C10) */}
        {activeTab === 'booking' && (
          <AppointmentsManager
            bookings={bookings}
            branches={branches}
            loading={dataLoading}
            error={dataError}
            onRefresh={refreshData}
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
        {activeTab === 'academy' && <GroupEAcademy key={`${user.id}:${academyMode}`} courses={courses} userId={user.id} user={user} branches={branches}
          loading={dataLoading} error={dataError} onRefresh={refreshData}
          onOpenNotifications={() => { if (user.id) setIsNotificationsOpen(true); else { setCanCloseAuth(true); setIsAuthOpen(true); } }}
          onRequireLogin={() => { setCanCloseAuth(true); setIsAuthOpen(true); }}
          mode={academyMode} catalogSearch={catalogSearch} initialCourseId={academyMode === 'catalog' ? selectedCourseId || undefined : undefined} />}

        {/* TAB 5: HỘI VIÊN & CÁ NHÂN (FIGMA GROUP F VIP PASS) */}
        {activeTab === 'profile' && (
          <Box className="space-y-4">
            <GroupFProfile
              key={user.id}
              user={user}
              metadata={{ tierRules: appMetadata.membershipTiers, loyalty: appMetadata.loyaltySettings }}
              onLogout={async () => {
                apiClient.logout(); setUser({ ...guestUser }); setRegistration(null); setIsTreatmentOpen(false);
                setIsEMRModalOpen(false); setIsNotificationsOpen(false); setActiveTab('home');
                setBookings([]); setRecords([]); setVouchers([]); setNotifications([]); setTreatmentPlans([]);
                setLoadVersion(value => value + 1);
              }}
              onSelectVoucher={voucher => {
                try {
                  localStorage.setItem('mld_pending_voucher', JSON.stringify({ code: voucher.code, scope: 'service' }));
                  setActiveTab('services');
                } catch { setDataError('Không thể giữ lựa chọn voucher trên thiết bị. Bạn có thể nhập mã khi đặt lịch.'); }
              }}
              onUserUpdated={setUser}
              onOpenAppointments={() => setActiveTab('booking')}
              onOpenPackages={() => {
                setTreatmentInitialTab('packages');
                setIsTreatmentOpen(true);
              }}
              onOpenAcademy={() => {
                setAcademyMode('learning');
                setActiveTab('academy');
              }}
              onOpenCourseCatalog={() => {
                setSelectedCourseId(null);
                setAcademyMode('catalog');
                setActiveTab('academy');
              }}
              onOpenOnboarding={() => {
                setCanCloseAuth(true);
                setIsAuthOpen(true);
              }}
              vouchers={vouchers}
              onVouchersUpdated={setVouchers}
              summary={memberSummary}
            />
          </Box>
        )}
      </div>

      {/* ================= MODAL OVERLAYS & FLOWS ================= */}

      {isNotificationsOpen && (
        <NotificationCenter
          notifications={notifications}
          onChange={setNotifications}
          onClose={() => setIsNotificationsOpen(false)}
        />
      )}

      {/* 3. GROUP A: ONBOARDING & AUTH FLOW (A01 -> A06) */}
      <GroupAAuthModal
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
          service={viewingService}
          onClose={() => setViewingService(null)}
          onBookNow={(s) => {
            setViewingService(null);
            openBooking(s);
          }}
        />
      )}

      {/* 5. GROUP B EXTENSIONS: SPECIALIST DETAIL MODAL (B06) */}
      {viewingDoctor && (
        <SpecialistDetailModal
          doctor={viewingDoctor}
          branches={branches}
          onClose={() => setViewingDoctor(null)}
          onBookWithDoctor={(doctor) => {
            setViewingDoctor(null);
            setIsSpecialistDirectoryOpen(false);
            openBooking(services[0], branches.find(branch => branch.id === doctor.branchId), doctor);
          }}
        />
      )}

      {/* 6. GROUP B EXTENSIONS: BRANCH DETAIL MODAL (B04) */}
      {viewingBranch && (
        <BranchDetailModal
          branch={viewingBranch}
          onClose={() => setViewingBranch(null)}
          onSelectBranch={(br) => {
            setViewingBranch(null);
            setIsBranchDirectoryOpen(false);
            setHomeBranchId(br.id);
            openBooking(services[0], br);
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
          onClose={() => { setViewingBranch(directionsBranch); setDirectionsBranch(null); }}
          onBookAtBranch={(br) => {
            setDirectionsBranch(null);
            setViewingBranch(null);
            setIsBranchDirectoryOpen(false);
            openBooking(services[0], br);
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
        <GroupCBooking
          currentUser={user}
          initialService={bookingService}
          initialBranch={bookingBranch}
          initialDoctor={bookingDoctor}
          allServices={services}
          doctors={doctors}
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
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsEMRModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <h2 className="font-bold text-sm text-[#40352F]">Hồ sơ bệnh án điện tử (EMR)</h2>
            </div>
            <button
              onClick={() => setIsEMRModalOpen(false)}
              className="text-xs text-[#98501B] font-bold"
            >
              Đóng
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-20">
            <GroupDRecords records={records} />
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
        <div className="absolute inset-x-0 top-0 bottom-[68px] z-20 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in">
          <div className="flex-1 overflow-y-auto">
            <GroupDTreatment
              key={`${user.id}:${treatmentInitialTab}`}
              initialTab={treatmentInitialTab}
              treatmentPlans={treatmentPlans}
              records={records}
              bookings={bookings}
              onNotificationsChange={setNotifications}
              user={user}
              notifications={notifications}
              onClose={() => setIsTreatmentOpen(false)}
              onOpenBooking={() => {
                setIsTreatmentOpen(false);
                openBooking(services[0]);
              }}
            />
          </div>
        </div>
      )}

      {/* 13. BOTTOM NAVIGATION BAR (FIGMA DESIGN SYSTEM 02 — 5 TRẠNG THÁI) */}
      <div className="app-bottom-nav absolute bottom-0 left-0 right-0 bg-white border-t border-[#E8DDD2] z-30 shadow-[0_-2px_8px_rgba(64,53,47,0.05)]">
        <div className="grid grid-cols-5 h-[62px] px-1">
          {[
            { key: 'home', label: 'Trang chủ', IconComponent: NavHomeIcon },
            { key: 'services', label: 'Dịch vụ', IconComponent: NavServiceIcon },
            { key: 'booking', label: 'Đặt lịch', IconComponent: NavCalendarIcon },
            { key: 'academy', label: 'Học viện', IconComponent: NavAcademyIcon },
            { key: 'profile', label: 'Cá nhân', IconComponent: NavProfileIcon },
          ].map((tab) => {
            const isActive = (isSearchOpen ? 'services' : activeTab) === tab.key;
            const TabIcon = tab.IconComponent;
            return (
              <button
                key={tab.key}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setIsSearchOpen(false);
                  setIsSpecialistDirectoryOpen(false);
                  setIsBranchDirectoryOpen(false);
                  setIsTreatmentOpen(false);
                  if (tab.key === 'academy') setAcademyMode('catalog');
                  setActiveTab(tab.key as any);
                }}
                className={`w-full h-[58px] flex flex-col items-center justify-center gap-1 transition-colors rounded-[10px] active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#F3E4D3] text-[#98501B] font-semibold'
                    : 'text-[#7A706A] hover:text-[#98501B] font-normal'
                }`}
              >
                <TabIcon
                  size={22}
                  color={isActive ? '#98501B' : '#7A706A'}
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
