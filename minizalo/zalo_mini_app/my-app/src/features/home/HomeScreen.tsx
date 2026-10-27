import React, { useState, useEffect } from 'react';
import { PortalBanner, SpaService, Specialist, Branch } from '@/core/types';
import { Sparkles, Calendar, BookOpen, FileText, ChevronRight, Award, ShieldCheck, HeartHandshake } from 'lucide-react';

interface HomeScreenProps {
  banners: PortalBanner[];
  services: SpaService[];
  specialists: Specialist[];
  activeBranch: Branch | null;
  onNavigateTab: (tab: 'services' | 'academy' | 'treatment' | 'booking') => void;
  onSelectService: (service: SpaService) => void;
  onSelectBanner: (banner: PortalBanner) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  banners,
  services,
  specialists,
  activeBranch,
  onNavigateTab,
  onSelectService,
  onSelectBanner,
}) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // 5-second automatic sliding banner carousel
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <div className="pb-24 space-y-5 animate-in fade-in duration-300">
      {/* 1. DYNAMIC BANNER SLIDER (5s Auto Carousel) */}
      <div className="px-4 pt-3">
        <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-md bg-gradient-to-r from-blue-900 to-blue-700 text-white">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              onClick={() => onSelectBanner(banner)}
              className={`absolute inset-0 transition-opacity duration-700 cursor-pointer flex flex-col justify-between p-4.5 ${
                idx === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background with subtle overlay */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${banner.image_url})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

              {/* Tag / Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-blue-100 border border-white/20">
                  Chuẩn Y Khoa Vodder
                </span>
                <span className="text-[11px] text-white/80 font-medium">MLD Việt Nam</span>
              </div>

              {/* Content */}
              <div className="relative z-10 space-y-1">
                <h3 className="text-base font-extrabold line-clamp-1 leading-snug text-white">
                  {banner.title}
                </h3>
                <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                  {banner.summary}
                </p>
                <div className="pt-1 flex items-center text-[11px] font-bold text-blue-300">
                  <span>Xem chi tiết chuyên khảo</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Dots Indicator */}
          {banners.length > 1 && (
            <div className="absolute bottom-2.5 right-4 z-20 flex space-x-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentBannerIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentBannerIndex ? 'bg-white w-4' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. QUICK ACTION BUTTONS */}
      <div className="px-4">
        <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
          <button
            type="button"
            onClick={() => onNavigateTab('booking')}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 mt-1.5">Đặt lịch</span>
            <span className="text-[9px] text-gray-400">Trị liệu MLD</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('services')}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 mt-1.5">Dịch vụ</span>
            <span className="text-[9px] text-gray-400">Vodder 60p</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('academy')}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 mt-1.5">Đào tạo</span>
            <span className="text-[9px] text-gray-400">Academy K26</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('treatment')}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-gray-800 mt-1.5">Hồ sơ</span>
            <span className="text-[9px] text-gray-400">Lâm sàng</span>
          </button>
        </div>
      </div>

      {/* 3. CORE VODDER SERVICE HIGHLIGHT */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Dịch Vụ Lâm Sàng Nổi Bật</h3>
            <p className="text-[11px] text-gray-500">Kích hoạt lưu thông bạch huyết & tiêu phù nề</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('services')}
            className="text-xs font-bold text-blue-600 flex items-center"
          >
            Tất cả
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {services.slice(0, 2).map((srv) => (
          <div
            key={srv.id}
            onClick={() => onSelectService(srv)}
            className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex space-x-3.5 cursor-pointer hover:border-blue-200 transition-all mb-2.5"
          >
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              <img src={srv.imageUrl} alt={srv.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {srv.categoryName}
                </span>
                <h4 className="text-xs font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">
                  {srv.name}
                </h4>
                <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                  {srv.shortDescription}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <span className="text-xs font-extrabold text-emerald-700">
                  {srv.price.toLocaleString('vi-VN')}đ{' '}
                  <span className="text-[10px] font-normal text-gray-400">/ {srv.durationMinutes} phút</span>
                </span>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  Đặt ngay
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. MASTER VODDER SPECIALISTS */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Chuyên Gia Trị Liệu Vodder</h3>
            <p className="text-[11px] text-gray-500">Đội ngũ kỹ thuật viên chứng chỉ quốc tế</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {specialists.slice(0, 2).map((spec) => (
            <div
              key={spec.id}
              className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-50 border-2 border-blue-100 mb-2">
                <img src={spec.avatarUrl} alt={spec.name} className="w-full h-full object-cover" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{spec.name}</h4>
              <span className="text-[10.5px] text-blue-600 font-semibold">{spec.title}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">{spec.experienceYears} năm kinh nghiệm</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. QUALITY GUARANTEES */}
      <div className="px-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-blue-800">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wide">Tiêu Chuẩn Y Khoa MLD Việt Nam</h4>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-gray-700">
            <div className="bg-white/80 p-2 rounded-xl">
              <Award className="w-4 h-4 mx-auto text-blue-600 mb-1" />
              <div className="text-[10px] font-bold">Chuẩn Vodder</div>
              <div className="text-[8.5px] text-gray-400">Dưới 30 mmHg</div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl">
              <HeartHandshake className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              <div className="text-[10px] font-bold">1:1 Riêng Tư</div>
              <div className="text-[8.5px] text-gray-400">Phòng VIP chuẩn</div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 mx-auto text-purple-600 mb-1" />
              <div className="text-[10px] font-bold">Không Xâm Lấn</div>
              <div className="text-[8.5px] text-gray-400">Phục hồi tự nhiên</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

