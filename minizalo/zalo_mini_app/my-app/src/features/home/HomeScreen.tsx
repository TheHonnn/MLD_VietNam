import React, { useState, useEffect } from 'react';
import { PortalBanner, SpaService, Specialist, Branch, UserProfile } from '@/core/types';
import {
  Bell,
  MapPin,
  ChevronRight,
  ChevronsUpDown,
  Calendar,
  BookOpen,
  Phone,
  Check,
  X,
  PhoneCall,
} from 'lucide-react';

interface HomeScreenProps {
  banners: PortalBanner[];
  services: SpaService[];
  specialists: Specialist[];
  activeBranch: Branch | null;
  currentUser?: UserProfile;
  branches?: Branch[];
  onSelectBranch?: (branch: Branch) => void;
  onNavigateTab: (tab: 'services' | 'academy' | 'documents' | 'profile' | 'booking') => void;
  onSelectService: (service: SpaService) => void;
  onSelectBanner: (banner: PortalBanner) => void;
  onOpenNotifications?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  banners,
  services,
  specialists,
  activeBranch,
  currentUser,
  branches = [],
  onSelectBranch,
  onNavigateTab,
  onSelectService,
  onSelectBanner,
  onOpenNotifications,
}) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedBannerDetail, setSelectedBannerDetail] = useState<PortalBanner | null>(null);

  // 5-second automatic sliding banner carousel
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Find core Vodder service or fallback to first
  const coreService =
    services.find((s) => s.name.toLowerCase().includes('lưu') || s.name.toLowerCase().includes('vodder')) ||
    services[0] || {
      id: 'core-service',
      name: 'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)',
      categoryName: 'Dẫn lưu bạch huyết MLD',
      shortDescription: 'Phương pháp chuẩn Y khoa Quốc tế kích hoạt hệ tuần hoàn bạch huyết, tiêu phù nề sau phẫu thuật.',
      fullDescription: '',
      durationMinutes: 60,
      price: 700000,
      vatRate: 0.08,
      imageUrl: 'https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/services/service_1792806886459_u8ho8.png',
    };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const getCategoryLabel = (category?: string) => {
    if (category === 'DAO_TAO') return 'ĐÀO TẠO';
    if (category === 'DICH_VU' || category === 'TRI_LIEU') return 'TRUNG TÂM Y KHOA BẠCH HUYẾT';
    if (category === 'KHUYEN_MAI') return 'ƯU ĐÃI ĐẶC QUYỀN';
    if (category === 'SU_KIEN') return 'SỰ KIỆN CHUYÊN NGÀNH';
    return category || 'TRUNG TÂM Y KHOA BẠCH HUYẾT';
  };

  return (
    <div className="pb-24 bg-[#F9FAFB] min-h-screen">
      <div className="px-5 pt-3 space-y-4">
        {/* ==========================================
            1. HEADER (Logo góc trái, Chuông & Avatar góc phải)
            Chuẩn Mobile B01: Height 48px, Logo left, Bell 42x42 & Profile 42x42 right
            ========================================== */}
        <div className="h-12 flex items-center justify-between">
          {/* Logo MLD VIETNAM */}
          <div className="flex items-center space-x-2">
            <div className="h-10 flex items-center">
              <span className="text-[19px] font-extrabold text-[#2860EB] tracking-wider">
                MLD VIETNAM
              </span>
            </div>
          </div>

          {/* Right: Notification Bell & Profile Avatar */}
          <div className="flex items-center space-x-2.5">
            {/* Nút Chuông thông báo */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="w-[42px] h-[42px] rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center relative hover:bg-gray-50 transition active:scale-95"
            >
              <Bell className="w-[22px] h-[22px] text-[#2860EB]" />
              <span className="w-2 h-2 rounded-full bg-[#EF4444] absolute top-2.5 right-2.5" />
            </button>

            {/* Avatar Trang cá nhân (Bấm vào chuyển sang Tab 4 Cá nhân) */}
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="w-[42px] h-[42px] rounded-full border-[1.5px] border-[#2860EB] overflow-hidden bg-gray-100 flex items-center justify-center hover:opacity-90 transition active:scale-95"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#EFF4FE] flex items-center justify-center text-[#2860EB] font-bold text-sm">
                  {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'M'}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Warning Banner nếu đăng nhập chưa có SĐT */}
        {currentUser && !currentUser.isPhoneVerified && currentUser.phone === '' && (
          <div className="p-3 bg-[#FFF7ED] border border-[#FDBA74] rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <Phone className="w-4 h-4 text-[#C2410C] shrink-0" />
              <p className="text-xs font-semibold text-[#9A3412] truncate">
                Cập nhật SĐT để xác nhận lịch hẹn chính xác
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('profile')}
              className="text-xs font-bold text-[#2860EB] px-2 py-1 shrink-0 hover:underline"
            >
              Cập nhật
            </button>
          </div>
        )}

        {/* ==========================================
            2. BANNER CAROUSEL ĐỘNG (160px height, rounded-2xl 16px, 5s interval)
            ========================================== */}
        {banners.length > 0 && (
          <div>
            <div className="relative w-full h-[160px] rounded-2xl overflow-hidden shadow-[0_5px_14px_rgba(40,96,235,0.22)] bg-[#002A6B]">
              {banners.map((b, idx) => {
                const isActive = idx === currentBannerIndex;
                return (
                  <div
                    key={b.id || idx}
                    onClick={() => {
                      if (b.target_link) {
                        onSelectBanner(b);
                      } else {
                        setSelectedBannerDetail(b);
                      }
                    }}
                    className={`absolute inset-0 transition-opacity duration-700 cursor-pointer ${
                      isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    {/* Background image */}
                    <img
                      src={b.image_url}
                      alt={b.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Gradient Overlay Y khoa */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to right, rgba(0, 42, 107, 0.90) 0%, rgba(0, 42, 107, 0.48) 70%, transparent 100%)',
                      }}
                    />

                    {/* Watermark logo chìm bên phải */}
                    <div className="absolute top-4 right-4 text-white/20 font-black text-sm tracking-widest pointer-events-none">
                      MLD
                    </div>

                    {/* Banner Content */}
                    <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                      {/* Category Label */}
                      <span className="self-start px-2 py-0.5 rounded-md bg-white/25 backdrop-blur-xs border border-white/35 text-[10.5px] font-bold text-white tracking-wide">
                        {getCategoryLabel(b.category)}
                      </span>

                      {/* Title & Summary (Không có nút "Xem" thừa) */}
                      <div>
                        <h3 className="text-base font-extrabold text-white leading-snug line-clamp-2">
                          {b.title}
                        </h3>
                        {b.summary && (
                          <p className="text-xs text-white/90 line-clamp-1 mt-0.5 font-normal">
                            {b.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dots Indicator: Height 4.5px, Active 20px, Inactive 6px */}
            {banners.length > 1 && (
              <div className="flex items-center justify-center space-x-1.5 mt-2">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentBannerIndex(i)}
                    className={`h-[4.5px] rounded-full transition-all duration-300 ${
                      i === currentBannerIndex ? 'w-5 bg-[#2860EB]' : 'w-1.5 bg-[#E5E7EB]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            3. THẺ CHI NHÁNH ĐANG CHỌN (Rounded-14, #E5E7EB, Icon trong #EFF4FE)
            ========================================== */}
        <div
          onClick={() => setShowBranchModal(true)}
          className="p-3.5 bg-white rounded-[14px] border border-[#E5E7EB] flex items-center justify-between cursor-pointer hover:border-[#2860EB]/40 transition active:scale-[0.99]"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EFF4FE] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-[#2860EB]" />
            </div>
            <div className="min-w-0">
              <span className="text-[12.5px] text-[#616161] block leading-tight">
                Chi nhánh trị liệu hiện tại
              </span>
              <p className="text-[15px] font-bold text-[#1F2937] truncate mt-0.5">
                {activeBranch ? activeBranch.name : 'Trụ sở MLD Việt Nam (5 Master LV3)'}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
        </div>

        {/* ==========================================
            4. DỊCH VỤ CỐT LÕI DUY NHẤT (Vodder MLD)
            Chuẩn VodderServiceCard: Ảnh 185px, Tên 17px bold, Giá #E11D48 đ gạch chân, Nút Đặt lịch
            ========================================== */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Ảnh minh họa 185px */}
          <div
            onClick={() => onSelectService(coreService)}
            className="w-full h-[185px] bg-[#EFF4FE] overflow-hidden cursor-pointer relative"
          >
            <img
              src={coreService.imageUrl}
              alt={coreService.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Nội dung */}
          <div className="p-3.5">
            <h3
              onClick={() => onSelectService(coreService)}
              className="text-[17px] font-bold text-[#0F172A] leading-snug cursor-pointer line-clamp-2"
            >
              {coreService.name}
            </h3>

            <div className="my-3 border-t border-[#F1F5F9]" />

            {/* Hàng Giá tiền và Nút Đặt lịch */}
            <div className="flex items-center justify-between">
              {/* Giá tiền dịch vụ: Màu #E11D48 (rgb(225, 29, 72)), chữ đ gạch chân */}
              <div className="flex items-baseline text-[#E11D48] font-bold text-[20px]">
                <span>{formatCurrency(coreService.price)} </span>
                <span className="underline ml-0.5">đ</span>
              </div>

              {/* Nút Đặt lịch (Chạm vào chuyển màu xanh #00693F) */}
              <button
                type="button"
                onClick={() => onSelectService(coreService)}
                className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#00693F] text-[#0F172A] hover:text-white border border-[#E2E8F0] hover:border-[#00693F] rounded-lg text-[13.5px] font-bold flex items-center space-x-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <span>Đặt lịch</span>
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            5. KHỐI CỘNG ĐỒNG Y KHOA MLD
            Gradient AppColors.primaryDark -> AppColors.primary
            ========================================== */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E4BB8] to-[#2860EB] text-white shadow-[0_3px_10px_rgba(40,96,235,0.18)] space-y-2.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              CỘNG ĐỒNG CHUYÊN GIA MLD
            </span>
          </div>

          <h4 className="text-base font-bold leading-snug">
            Chia sẻ ca lâm sàng & Hướng dẫn phục hồi Vodder
          </h4>

          <p className="text-[13.5px] text-white/80 leading-relaxed">
            Theo dõi các tài liệu trị liệu và bài viết chuyên môn do đội ngũ Bác sĩ, Giảng viên MLD trực tiếp biên soạn.
          </p>

          <button
            type="button"
            onClick={() => onNavigateTab('documents')}
            className="w-full py-2.5 mt-2 border border-white rounded-lg text-white text-[13.5px] font-bold hover:bg-white/10 transition"
          >
            Xem bài viết chuyên môn
          </button>
        </div>
      </div>

      {/* MODAL CHỌN CHI NHÁNH ĐIỀU TRỊ */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setShowBranchModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Chọn chi nhánh điều trị</h3>
              <button onClick={() => setShowBranchModal(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {(branches.length > 0 ? branches : [activeBranch]).filter(Boolean).map((b: any) => {
                const isSelected = b.id === activeBranch?.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelectBranch?.(b);
                      setShowBranchModal(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#EFF4FE] border-[#2860EB]'
                        : 'bg-white border-[#E5E7EB] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <MapPin
                        className={`w-5 h-5 shrink-0 ${
                          isSelected ? 'text-[#2860EB]' : 'text-gray-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-bold truncate ${
                            isSelected ? 'text-[#2860EB]' : 'text-gray-800'
                          }`}
                        >
                          {b.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{b.address}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-[#2860EB] shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT BANNER */}
      {selectedBannerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedBannerDetail(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl space-y-4">
            <div className="h-40 relative bg-gray-100">
              <img
                src={selectedBannerDetail.image_url}
                alt={selectedBannerDetail.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedBannerDetail(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                {selectedBannerDetail.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedBannerDetail.summary}
              </p>
              {selectedBannerDetail.content_text && (
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  {selectedBannerDetail.content_text}
                </p>
              )}
              <button
                onClick={() => setSelectedBannerDetail(null)}
                className="w-full mt-3 py-2.5 bg-[#2860EB] text-white text-xs font-bold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
