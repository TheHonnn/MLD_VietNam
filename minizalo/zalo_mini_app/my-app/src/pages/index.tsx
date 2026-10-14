import React, { useState, useEffect } from 'react';
import { Page, Box, Text } from 'zmp-ui';
import { HeaderFigma } from '@/components/HeaderFigma';
import { GroupBHome } from '@/components/GroupBHome';
import { GroupCBooking } from '@/components/GroupCBooking';
import { AppointmentsManager } from '@/components/AppointmentsManager';
import { ETicketGroupC } from '@/components/ETicketGroupC';
import { GroupEAcademy } from '@/components/GroupEAcademy';
import { GroupDTreatment } from '@/components/GroupDTreatment';
import { GroupDRecords } from '@/components/GroupDRecords';
import { GroupFProfile } from '@/components/GroupFProfile';
import { GroupAAuthModal } from '@/components/GroupAAuthModal';
import { GroupBSearch } from '@/components/GroupBSearch';
import { GroupWAdmin } from '@/components/GroupWAdmin';
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
import {
  database,
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
  // App Mode: 'miniapp' (Zalo Mini App) | 'admin' (Figma Group W Web Admin)
  const [appMode, setAppMode] = useState<'miniapp' | 'admin'>(() =>
    new URLSearchParams(window.location.search).get('admin') === '1' ? 'admin' : 'miniapp'
  );

  // Navigation Tabs matching Figma Nhóm B & C: 'home' | 'services' | 'booking' | 'academy' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'booking' | 'academy' | 'profile'>('home');
  const [academyMode, setAcademyMode] = useState<'catalog' | 'learning'>('catalog');

  // Application Data States (synced with Backend API)
  const [services, setServices] = useState<MedicalService[]>(database.services);
  const [doctors, setDoctors] = useState<Doctor[]>(database.doctors);
  const [branches, setBranches] = useState<Branch[]>(database.branches);
  const [bookings, setBookings] = useState<Booking[]>(database.bookings);
  const [courses, setCourses] = useState<Course[]>(database.courses);
  const [records, setRecords] = useState<MedicalRecord[]>(database.medicalRecords);
  const [user, setUser] = useState<User>(database.users[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>(database.vouchers);
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
  const [servicesSort, setServicesSort] = useState<'popular' | 'priceAsc' | 'priceDesc'>('popular');

  // Fetch real data from Backend on mount
  useEffect(() => {
    async function loadBackendData() {
      const isInsideZalo = /Zalo/i.test(navigator.userAgent) || Boolean((window as any).ZJSBridge);
      if (isInsideZalo) {
        const zaloSession = await apiClient.loginWithZalo(false);
        if (zaloSession?.user) {
          setUser((prev) => ({ ...prev, ...zaloSession.user }));
          setZaloAuthState(zaloSession.user.name === 'Khách hàng Zalo' ? 'required' : 'connected');
        } else {
          setZaloAuthError(zaloSession?.error || 'Không thể xác thực với Zalo.');
          setZaloAuthState('required');
        }
      } else {
        setZaloAuthState('web');
      }
      const [srvData, docData, brData, crsData, recData, membData, bkData, notifData, treatmentData] = await Promise.all([
        apiClient.getServices(),
        apiClient.getDoctors(),
        apiClient.getBranches(),
        apiClient.getCourses(),
        apiClient.getMedicalRecords(),
        apiClient.getMembership(),
        apiClient.getBookings(),
        apiClient.getNotifications(),
        apiClient.getTreatmentPlans(),
      ]);

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

    loadBackendData();
  }, []);

  const connectZaloProfile = async () => {
    setZaloAuthError('');
    setZaloAuthState('checking');
    const result = await apiClient.loginWithZalo(true);
    if (result?.user) {
      setUser((prev) => ({ ...prev, ...result.user }));
      setZaloAuthState('connected');
      const membership = await apiClient.getMembership();
      if (membership?.user) setUser((prev) => ({ ...prev, ...membership.user }));
      if (membership?.summary) setMemberSummary(membership.summary);
      return;
    }
    setZaloAuthError(result?.error || 'Bạn chưa cấp quyền thông tin tài khoản Zalo.');
    setZaloAuthState('required');
  };

  const handleBookingSuccess = (newBooking: Booking) => {
    setBookingService(null);
    setBookingBranch(null);
    setBookingDoctor(null);
    setViewingService(null);
    setBookings((prev) => [newBooking, ...prev]);
    setETicketBooking(newBooking);
    apiClient.getNotifications().then((response) => response?.notifications && setNotifications(response.notifications));
    apiClient.getMembership().then((response) => response?.summary && setMemberSummary(response.summary));
  };

  // Find latest upcoming confirmed booking
  const upcomingBooking = bookings.find((b) => b.status === 'confirmed') || null;

  const openBooking = (service?: MedicalService | null, branch?: Branch | null, doctor?: Doctor | null) => {
    setBookingBranch(branch || null);
    setBookingDoctor(doctor || null);
    setBookingService(service || services[0] || null);
  };

  // Filtered services for Tab 'services'
  const catalogServices = services
    .filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(servicesSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(servicesSearch.toLowerCase());
      const matchCat =
        servicesCategory === 'all' || s.category.toLowerCase().includes(servicesCategory.toLowerCase());
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (servicesSort === 'priceAsc') return a.price - b.price;
      if (servicesSort === 'priceDesc') return b.price - a.price;
      return b.rating - a.rating;
    });

  // IF ADMIN MODE: Render Group W Web Admin Dashboard
  if (appMode === 'admin') {
    return <GroupWAdmin onBackToMiniApp={() => setAppMode('miniapp')} />;
  }

  return (
    <div className="min-h-screen bg-[#EDE7DE] flex justify-center items-start sm:items-center py-0 sm:py-4 text-stone-800 select-none">
      <div className="mini-app-shell w-full max-w-[390px] sm:h-[844px] sm:max-h-[96vh] bg-[#FAF6F0] sm:rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col border sm:border-[#DCCFC0]">
        {(zaloAuthState === 'required' || zaloAuthState === 'checking') && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#FAF6F0] p-6">
            <div className="w-full rounded-[8px] border border-[#EADECF] bg-white p-5 text-center shadow-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5EBE1] text-xl font-black text-[#98501B]">Z</div>
              <h1 className="mt-4 text-lg font-bold text-[#40352F]">Kết nối tài khoản Zalo</h1>
              <p className="mt-2 text-xs leading-relaxed text-[#75685F]">Cho phép MLD Việt Nam sử dụng tên và ảnh đại diện để tạo hồ sơ riêng cho bạn.</p>
              {zaloAuthError && <p className="mt-3 rounded-[8px] bg-red-50 p-2.5 text-left text-[11px] text-red-700">{zaloAuthError}</p>}
              <button disabled={zaloAuthState === 'checking'} onClick={connectZaloProfile} className="mt-5 h-11 w-full rounded-[8px] bg-[#98501B] text-sm font-bold text-white disabled:opacity-60">
                {zaloAuthState === 'checking' ? 'Đang kết nối...' : 'Tiếp tục với Zalo'}
              </button>
              <p className="mt-3 text-[10px] text-[#8A7D74]">Ứng dụng không yêu cầu OTP và không lấy số điện thoại ở bước này.</p>
            </div>
          </div>
        )}
        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        {/* TAB 1: TRANG CHỦ (FIGMA GROUP B HOME) */}
        {activeTab === 'home' && (
          <GroupBHome
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
            onOpenBranches={() => setIsBranchDirectoryOpen(true)}
            onOpenSpecialists={() => setIsSpecialistDirectoryOpen(true)}
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
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className="w-10 h-10 rounded-[7px] bg-white border border-[#DED2C5] flex items-center justify-center shrink-0">
                <SearchIcon size={17} color="#A65317" />
              </span>
              <span className="h-10 flex-1 rounded-[7px] bg-white border border-[#DED2C5] px-3 flex items-center text-[10px] text-[#8A7D74]">
                Tìm dịch vụ chăm sóc...
              </span>
            </button>

            {/* Category Pills (Figma Screen 2) */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'massage', label: 'Massage' },
                { id: 'da', label: 'Chăm sóc da' },
                { id: 'cothe', label: 'Chăm sóc cơ thể' },
                { id: 'thugian', label: 'Thư giãn' },
                { id: 'goilieutrinh', label: 'Gói liệu trình' },
              ].map((c) => (
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
                onClick={() => setServicesCategory('all')}
                className="h-10 px-3 rounded-[7px] bg-white border border-[#D8C9BA] font-semibold text-[10px] text-[#A65317] flex items-center space-x-1.5"
              >
                <FilterIcon size={13} color="#98501B" />
                <span>Bộ lọc</span>
              </button>

              <div className="flex-1 max-w-[210px] space-y-1 text-[10px] text-[#6F625B]">
                <span className="block">Sắp xếp theo</span>
                <select
                  value={servicesSort}
                  onChange={(e) => setServicesSort(e.target.value as any)}
                  className="w-full h-10 bg-white border border-[#D8C9BA] rounded-[7px] px-3 font-medium text-[10px] text-[#40352F] outline-none cursor-pointer"
                >
                  <option value="popular">Phổ biến (minh họa)</option>
                  <option value="priceAsc">Giá tăng dần</option>
                  <option value="priceDesc">Giá giảm dần</option>
                </select>
              </div>
            </div>

            <div className="text-[11px] font-bold text-[#40352F]">
              {catalogServices.length} dịch vụ phù hợp
            </div>
            <Box className="space-y-3">
              {catalogServices.map((service) => (
                <Box
                  key={service.id}
                  onClick={() => setViewingService(service)}
                  className="bg-white rounded-[8px] border border-[#E3D7CB] overflow-hidden cursor-pointer hover:border-[#A65317] transition"
                >
                  <div className="relative w-full h-[190px]">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="absolute top-3 right-3 w-9 h-9 rounded-[8px] bg-white border border-[#E3D7CB] flex items-center justify-center shadow-sm"
                      aria-label="Yêu thích"
                    >
                      <HeartIcon size={18} color="#A65317" />
                    </button>
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
                <button onClick={() => setIsSpecialistDirectoryOpen(true)} className="h-8 rounded-[7px] border border-[#D8C9BA] bg-white px-3 text-[9px] font-bold text-[#A65317]">Xem tất cả</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {doctors.slice(0, 2).map((doctor) => <button key={doctor.id} onClick={() => setViewingDoctor(doctor)} className="overflow-hidden rounded-[8px] border border-[#E3D7CB] bg-white text-left"><img src={doctor.avatar} alt={doctor.name} className="h-[105px] w-full object-cover" /><div className="p-2.5"><h3 className="line-clamp-1 text-[11px] font-bold text-[#40352F]">{doctor.name}</h3><p className="mt-1 line-clamp-1 text-[9px] text-[#7A685D]">{doctor.title}</p><p className="mt-2 text-[9px] font-semibold text-[#A65317]">★ {doctor.rating} · {doctor.experienceYears} năm</p></div></button>)}
              </div>
            </section>
          </Box>
        )}

        {/* TAB 3: ĐẶT LỊCH & QUẢN LÝ LỊCH HẸN (FIGMA GROUP C: C01 -> C10) */}
        {activeTab === 'booking' && (
          <AppointmentsManager
            bookings={bookings}
            onUpdateBookings={(updated) => setBookings(updated)}
            onBookNewService={() => openBooking(services[0])}
            onRebookService={(title) => {
              const matched = services.find((s) => s.title === title) || services[0];
              openBooking(matched);
            }}
          />
        )}

        {/* TAB 4: HỌC VIỆN & ĐÀO TẠO NGHỀ (FIGMA GROUP E) */}
        {activeTab === 'academy' && <GroupEAcademy key={academyMode} courses={courses} mode={academyMode} />}

        {/* TAB 5: HỘI VIÊN & CÁ NHÂN (FIGMA GROUP F VIP PASS) */}
        {activeTab === 'profile' && (
          <Box className="space-y-4">
            <GroupFProfile
              user={user}
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
          setIsAuthOpen(false);
          setActiveTab('home');
        }}
        initialStep="splash"
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
          onClose={() => setViewingDoctor(null)}
          onBookWithDoctor={(doctor) => {
            setViewingDoctor(null);
            openBooking(services[0], null, doctor);
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
          onClose={() => setDirectionsBranch(null)}
          onBookAtBranch={(br) => {
            setDirectionsBranch(null);
            openBooking(services[0], br);
          }}
        />
      )}

      {isBranchDirectoryOpen && (
        <BranchDirectoryModal
          branches={branches}
          onClose={() => setIsBranchDirectoryOpen(false)}
          onSelectBranch={(branch) => {
            setIsBranchDirectoryOpen(false);
            setViewingBranch(branch);
          }}
        />
      )}

      {isSpecialistDirectoryOpen && (
        <SpecialistDirectoryModal
          doctors={doctors}
          onClose={() => setIsSpecialistDirectoryOpen(false)}
          onSelectDoctor={(doctor) => {
            setIsSpecialistDirectoryOpen(false);
            setViewingDoctor(doctor);
          }}
        />
      )}

      {/* 8. GROUP C: 4-STEP BOOKING FLOW MODAL (C01 -> C07) */}
      {bookingService && (
        <GroupCBooking
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
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectService={(s) => {
          setIsSearchOpen(false);
          const found = services.find((x) => x.id === s.id) || services[0];
          setViewingService(found);
        }}
        onSelectCourse={() => {
          setIsSearchOpen(false);
          setAcademyMode('catalog');
          setActiveTab('academy');
        }}
        onSelectBranch={(br) => {
          setIsSearchOpen(false);
          const found = branches.find((x) => x.id === br.id) || branches[0];
          setViewingBranch(found);
        }}
        onSelectSpecialist={(sp) => {
          setIsSearchOpen(false);
          const found = doctors.find((x) => x.name.includes(sp.title)) || doctors[0];
          setViewingDoctor(found);
        }}
      />

      {/* 12. GROUP D: TREATMENT & CUSTOMER CARE MODAL (FIGMA D01 - D08) */}
      {isTreatmentOpen && (
        <div className="absolute inset-x-0 top-0 bottom-[68px] z-20 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in">
          <div className="flex-1 overflow-y-auto">
            <GroupDTreatment
              key={treatmentInitialTab}
              initialTab={treatmentInitialTab}
              treatmentPlans={treatmentPlans}
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
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E8DDD2] z-30 shadow-[0_-2px_8px_rgba(64,53,47,0.05)]">
        <div className="grid grid-cols-5 h-[62px] px-1">
          {[
            { key: 'home', label: 'Trang chủ', IconComponent: NavHomeIcon },
            { key: 'services', label: 'Dịch vụ', IconComponent: NavServiceIcon },
            { key: 'booking', label: 'Đặt lịch', IconComponent: NavCalendarIcon },
            { key: 'academy', label: 'Học viện', IconComponent: NavAcademyIcon },
            { key: 'profile', label: 'Cá nhân', IconComponent: NavProfileIcon },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.IconComponent;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setIsTreatmentOpen(false);
                  if (tab.key === 'booking') {
                    openBooking(services[0]);
                  }
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
        <div className="w-[104px] h-1 bg-[#1F1B18] rounded-full mx-auto mt-1 mb-1.5" />
      </div>
    </div>
  </div>
  );
}

export default MasterHomePage;
