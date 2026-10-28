import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { Branch, SpaService, Specialist, PortalBanner, UserProfile } from '@/core/types';
import { BottomNav, NavTabId } from './BottomNav';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ServicesScreen } from '@/features/services/ServicesScreen';
import { BookingScreen } from '@/features/booking/BookingScreen';
import { AppointmentsScreen } from '@/features/booking/AppointmentsScreen';
import { AcademyScreen } from '@/features/academy/AcademyScreen';
import { DocumentsScreen } from '@/features/documents/DocumentsScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { CommunityScreen } from '@/features/community/CommunityScreen';
import { Bell, X } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [activeSubView, setActiveSubView] = useState<'booking' | 'appointments' | 'community' | null>(null);

  // Core Data directly from Supabase
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<SpaService[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [banners, setBanners] = useState<PortalBanner[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(supabaseApi.getUserProfile());

  // Booking selected service
  const [bookingService, setBookingService] = useState<SpaService | null>(null);

  // Notification Center Modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    loadData();

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setUserProfile(e.detail);
      } else {
        setUserProfile(supabaseApi.getUserProfile());
      }
    };

    window.addEventListener('mld:profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('mld:profile-updated', handleProfileUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      const bList = await supabaseApi.getBranches();
      setBranches(bList);
      if (bList.length > 0) setActiveBranch(bList[0]);

      const sList = await supabaseApi.getServices();
      setServices(sList);

      const spList = await supabaseApi.getSpecialists();
      setSpecialists(spList);

      const bnList = await supabaseApi.getBanners();
      setBanners(bnList);

      setUserProfile(supabaseApi.getUserProfile());
    } catch (err) {
      console.warn('Failed to load initial data:', err);
    }
  };

  const handleBookService = (service: SpaService) => {
    setBookingService(service);
    setActiveSubView('booking');
  };

  const handleSelectBanner = (banner: PortalBanner) => {
    const link = (banner.target_link || '').trim();
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
      return;
    }
    if (link.includes('appointment') || link.includes('lich-hen')) {
      setActiveSubView('appointments');
    } else if (link.includes('booking') || link.includes('dat-lich')) {
      setActiveSubView('booking');
    } else if (link.includes('community') || link.includes('cong-dong')) {
      setActiveSubView('community');
    } else if (link.includes('academy') || link.includes('dao-tao') || link.includes('khoa-hoc')) {
      setActiveSubView(null);
      setActiveTab('academy');
    } else if (link.includes('document') || link.includes('tai-lieu') || link.includes('cam-nang')) {
      setActiveSubView(null);
      setActiveTab('documents');
    } else if (link.includes('profile') || link.includes('tai-khoan') || link.includes('ca-nhan')) {
      setActiveSubView(null);
      setActiveTab('profile');
    } else {
      setActiveSubView(null);
      setActiveTab('services');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col max-w-md mx-auto shadow-2xl relative font-sans text-slate-800">
      {/* Main Content Views matching Flutter Mobile main_layout_screen.dart */}
      <main className="flex-1 overflow-y-auto">
        {activeSubView === 'booking' ? (
          <BookingScreen
            branches={branches}
            activeBranch={activeBranch}
            services={services}
            preSelectedService={bookingService}
            currentUser={userProfile}
            onViewAppointments={() => setActiveSubView('appointments')}
            onBackToHome={() => setActiveSubView(null)}
          />
        ) : activeSubView === 'appointments' ? (
          <AppointmentsScreen
            onBack={() => setActiveSubView(null)}
            onBookNew={() => {
              setBookingService(null);
              setActiveSubView('booking');
            }}
          />
        ) : activeSubView === 'community' ? (
          <CommunityScreen />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                banners={banners}
                services={services}
                specialists={specialists}
                activeBranch={activeBranch}
                currentUser={userProfile}
                branches={branches}
                onSelectBranch={(b) => setActiveBranch(b)}
                onNavigateTab={(t) => {
                  if (t === 'booking') {
                    setBookingService(null);
                    setActiveSubView('booking');
                  } else {
                    setActiveTab(t as NavTabId);
                  }
                }}
                onSelectService={handleBookService}
                onSelectBanner={handleSelectBanner}
                onOpenNotifications={() => setShowNotificationModal(true)}
              />
            )}

            {activeTab === 'services' && (
              <ServicesScreen
                services={services}
                branches={branches}
                activeBranch={activeBranch}
                onBookService={handleBookService}
                onBackToHome={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'academy' && (
              <AcademyScreen onBackToHome={() => setActiveTab('home')} />
            )}

            {activeTab === 'documents' && (
              <DocumentsScreen
                onBackToHome={() => setActiveTab('home')}
                onOpenCommunity={() => setActiveSubView('community')}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                currentUser={userProfile}
                onProfileUpdated={(updated) => setUserProfile(updated)}
                onNavigateTab={(t) => {
                  setActiveSubView(null);
                  setActiveTab(t as NavTabId);
                }}
                onOpenAppointments={() => setActiveSubView('appointments')}
              />
            )}
          </>
        )}
      </main>

      {/* Global Bottom Navigation: 5 Tabs matching Mobile 100% */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveSubView(null);
          setActiveTab(tab);
        }}
      />

      {/* Notification Modal (D08) */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-[#2860EB]" />
                <h3 className="text-sm font-bold text-slate-900">Thông báo MLD Vietnam</h3>
              </div>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#EFF4FE] border border-[#2860EB]/20 rounded-xl">
                <span className="text-[10px] font-bold text-[#2860EB] bg-white px-1.5 py-0.5 rounded shadow-xs">
                  Nhắc lịch
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  Phiên trị liệu MLD Vodder tiếp theo
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Trụ sở MLD Việt Nam: Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội. Hotline: 096.7786.399.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                  Đào tạo
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  11 khóa học chuyên khoa MLD đã sẵn sàng
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Các bài giảng lý thuyết và thực hành tiêu chuẩn Quốc tế Vodder đã cập nhật trên hệ thống.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationModal(false)}
              className="w-full py-2.5 bg-[#2860EB] text-white text-xs font-bold rounded-xl hover:bg-[#1E4BB8] transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
