import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { Branch, SpaService, Specialist, PortalBanner, UserProfile } from '@/core/types';
import { AppHeader } from './AppHeader';
import { BottomNav, NavTabId } from './BottomNav';
import { HomeScreen } from '@/features/home/HomeScreen';
import { ServicesScreen } from '@/features/services/ServicesScreen';
import { BookingScreen } from '@/features/booking/BookingScreen';
import { AppointmentsScreen } from '@/features/booking/AppointmentsScreen';
import { AcademyScreen } from '@/features/academy/AcademyScreen';
import { TreatmentScreen } from '@/features/treatment/TreatmentScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { CommunityScreen } from '@/features/community/CommunityScreen';
import { Bell, X, PhoneCall, Sparkles } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [activeSubView, setActiveSubView] = useState<'booking' | 'appointments' | 'community' | null>(null);

  // Core Data
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
      console.error('Failed to load initial data:', err);
    }
  };

  const handleBookService = (service: SpaService) => {
    setBookingService(service);
    setActiveSubView('booking');
  };

  const handleSelectBanner = (banner: PortalBanner) => {
    const link = banner.target_link || '';
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
      return;
    }
    if (link.includes('appointment')) {
      setActiveSubView('appointments');
    } else if (link.includes('booking') || link.includes('dat-lich')) {
      setActiveSubView('booking');
    } else if (link.includes('community') || link.includes('cong-dong')) {
      setActiveSubView('community');
    } else if (link.includes('academy') || link.includes('dao-tao')) {
      setActiveSubView(null);
      setActiveTab('academy');
    } else if (link.includes('treatment') || link.includes('tri-lieu')) {
      setActiveSubView(null);
      setActiveTab('treatment');
    } else if (link.includes('profile') || link.includes('tai-khoan')) {
      setActiveSubView(null);
      setActiveTab('profile');
    } else {
      setActiveSubView(null);
      setActiveTab('services');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl relative font-sans text-slate-800">
      {/* 1. Global App Header */}
      <AppHeader
        branches={branches}
        activeBranch={activeBranch}
        onSelectBranch={(branch) => setActiveBranch(branch)}
        onOpenNotifications={() => setShowNotificationModal(true)}
      />

      {/* 2. Main Content Views */}
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
              />
            )}

            {activeTab === 'services' && (
              <ServicesScreen
                services={services}
                branches={branches}
                activeBranch={activeBranch}
                onBookService={handleBookService}
              />
            )}

            {activeTab === 'academy' && <AcademyScreen />}

            {activeTab === 'treatment' && (
              <TreatmentScreen
                onBookAppointment={() => {
                  setBookingService(null);
                  setActiveSubView('booking');
                }}
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

      {/* 3. Global Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveSubView(null);
          setActiveTab(tab);
        }}
      />

      {/* 4. Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600" />
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                  Nhắc lịch
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  Phiên trị liệu MLD Vodder tiếp theo
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Lịch hẹn ngày mai lúc 09:00 tại MLD Center Quận 3. Chuyên viên: Master Trần Minh Phương.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-xs">
                  Học viện
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  Bài giảng thực hành mới đã cập nhật
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Chương 3: Kỹ thuật dẫn lưu cổ mặt nâng cao đã sẵn sàng trên ứng dụng.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationModal(false)}
              className="w-full py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

