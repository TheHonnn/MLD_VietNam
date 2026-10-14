import React, { useState, useEffect } from 'react';
import { Box, Text } from 'zmp-ui';
import { MedicalService, Doctor, Branch, Booking } from '../../../../backend/src/data/database';
import {
  SearchIcon,
  CloseIcon,
  StarIcon,
  ClockIcon,
  ArrowRightIcon,
  NavServiceIcon,
  MassageIcon,
  SkinCareIcon,
  TherapyIcon,
  LymphIcon,
  NavAcademyIcon,
  FilterIcon,
  LocationIcon,
  MapIcon,
  PhoneIcon,
  HeartIcon,
  CheckIcon,
  ChevronDownIcon,
  CalendarIcon,
  BuildingIcon,
  ArrowLeftIcon,
} from '@/components/Icons';

interface GroupBHomeProps {
  services: MedicalService[];
  doctors: Doctor[];
  branches: Branch[];
  upcomingBooking?: Booking | null;
  onSelectService: (service: MedicalService) => void;
  onViewServiceDetail: (service: MedicalService) => void;
  onSelectDoctor: (doctor: Doctor) => void;
  onSelectBranch: (branch: Branch) => void;
  onOpenDirections: (branch: Branch) => void;
  onNavigateTab: (tabKey: string) => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  unreadNotifications?: number;
  onOpenBranches?: () => void;
  onOpenSpecialists?: () => void;
}

const specialties = [
  { id: 'all', title: 'Tất cả', IconComp: NavServiceIcon },
  { id: 'massage', title: 'Massage', IconComp: MassageIcon },
  { id: 'da', title: 'Chăm sóc da', IconComp: SkinCareIcon },
  { id: 'trilieu', title: 'Trị liệu', IconComp: TherapyIcon },
  { id: 'bachhuyet', title: 'Bạch huyết', IconComp: LymphIcon },
  { id: 'daotao', title: 'Đào tạo', IconComp: NavAcademyIcon },
];

export const GroupBHome: React.FC<GroupBHomeProps> = ({
  services,
  doctors,
  branches,
  upcomingBooking,
  onSelectService,
  onViewServiceDetail,
  onSelectDoctor,
  onSelectBranch,
  onOpenDirections,
  onNavigateTab,
  onOpenSearch,
  onOpenNotifications,
  unreadNotifications = 0,
  onOpenBranches,
  onOpenSpecialists,
}) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || 'br_01');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'priceAsc' | 'priceDesc' | 'duration'>('popular');
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>([]);

  // Filter state (Matching Figma B — Bộ lọc nâng cao & Mẫu tỉnh)
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriceRange, setFilterPriceRange] = useState('all');
  const [filterDuration, setFilterDuration] = useState('all');
  const [filterCity, setFilterCity] = useState('all');

  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Auto-rotating banners matching Figma
  const banners = [
    {
      title: 'Chăm sóc sức khỏe – Nâng tầm chất lượng sống',
      subtitle: 'Đặt lịch dễ dàng, tận hưởng dịch vụ chuyên nghiệp tại không gian tĩnh lặng.',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
      tag: 'Ưu đãi đặc quyền MLD',
      actionText: 'Đặt lịch ngay',
      action: () => services[0] && onSelectService(services[0]),
    },
    {
      title: 'Khởi đầu nghề nghiệp trong lĩnh vực chăm sóc sức khỏe & spa',
      subtitle: 'Đào tạo thực chiến 80%, chuyển giao kỹ thuật Dẫn lưu bạch huyết quốc tế.',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80',
      tag: 'Học viện MLD Academy',
      actionText: 'Khám phá khóa học',
      action: () => onNavigateTab('academy'),
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const toggleFavorite = (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  // Filter & Search Logic
  const filteredServices = services
    .filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSpecialty =
        selectedSpecialty === 'all'
          ? true
          : selectedSpecialty === 'massage'
          ? s.category.toLowerCase().includes('massage')
          : selectedSpecialty === 'da'
          ? s.category.toLowerCase().includes('da')
          : selectedSpecialty === 'trilieu'
          ? s.category.toLowerCase().includes('trị liệu')
          : selectedSpecialty === 'bachhuyet'
          ? s.category.toLowerCase().includes('bạch huyết')
          : true;

      const matchCategory =
        filterCategory === 'all' || s.category.toLowerCase().includes(filterCategory.toLowerCase());

      const matchPrice =
        filterPriceRange === 'all'
          ? true
          : filterPriceRange === 'under500'
          ? s.price < 500000
          : filterPriceRange === '500to800'
          ? s.price >= 500000 && s.price <= 800000
          : s.price > 800000;

      const matchDuration =
        filterDuration === 'all'
          ? true
          : filterDuration === '60'
          ? s.durationMinutes <= 60
          : s.durationMinutes > 60;

      return matchSearch && matchSpecialty && matchCategory && matchPrice && matchDuration;
    })
    .sort((a, b) => {
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
      return b.rating - a.rating;
    });

  const resetFilters = () => {
    setFilterCategory('all');
    setFilterPriceRange('all');
    setFilterDuration('all');
    setFilterCity('all');
    setSelectedSpecialty('all');
    setIsFilterModalOpen(false);
  };

  return (
    <Box className="space-y-2.5 px-3 pt-2 pb-16">
      {/* 1. Header Greeting (Exact Figma Image 2) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#FAF1E6] border border-[#EADECF] flex items-center justify-center text-[#98501B] shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] font-bold text-[#40352F] leading-tight">Xin chào, Minh Anh!</h1>
            <p className="text-[10px] text-[#7A685D] mt-0.5 truncate">Hôm nay bạn muốn chăm sóc bản thân như thế nào?</p>
          </div>
        </div>
        <button
          onClick={onOpenNotifications}
          className="relative p-1 text-[#98501B] hover:text-[#804215] transition active:scale-90"
          title="Thông báo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-red-500 px-1 text-[8px] font-bold text-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
        </button>
      </div>

      {/* 2. Branch Selection (Exact Figma Image 2) */}
      <div className="space-y-1">
        <label className="text-[10px] text-[#665A52]">Chi nhánh đang chọn · Dữ liệu minh họa</label>
        <div className="relative">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full h-10 bg-white rounded-[7px] px-3 border border-[#DED2C5] text-[11px] font-medium text-[#40352F] outline-none appearance-none cursor-pointer pr-9"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-3 pointer-events-none text-[#7A685D]">
            <ChevronDownIcon size={14} color="#7A685D" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar (Exact Figma Image 2) */}
      <div
        onClick={onOpenSearch}
        className="flex items-center space-x-2 cursor-pointer"
      >
        <div className="w-10 h-10 rounded-[7px] bg-white border border-[#DED2C5] flex items-center justify-center text-[#98501B] shrink-0">
          <SearchIcon size={18} color="#98501B" />
        </div>
        <div className="h-10 flex-1 bg-white rounded-[7px] px-3 border border-[#DED2C5] text-[10px] text-[#7A685D] flex items-center justify-between min-w-0">
          <span className="truncate">Tìm dịch vụ, khóa học, chuyên viên...</span>
        </div>
      </div>

      {/* 4. Hero Banner Card (Exact Figma Image 2) */}
      <div className="rounded-[8px] overflow-hidden bg-[#F8EBDD] border border-[#E8D8C8]">
        <img
          src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80"
          alt="Massage Spa"
          className="w-full h-[180px] object-cover"
        />
        <div className="px-3 py-3 space-y-2">
          <h2 className="text-[17px] font-bold text-[#6F452C] leading-[1.3]">
            Chăm sóc sức khỏe - Nâng tầm chất lượng sống
          </h2>
          <p className="text-[11px] text-[#665A52] leading-[1.45]">
            Đặt lịch dễ dàng, tận hưởng dịch vụ chuyên nghiệp.
          </p>
          <button
            onClick={() => services[0] && onSelectService(services[0])}
            className="w-full h-10 bg-[#A65317] hover:bg-[#8F4513] text-white text-[11px] font-bold rounded-[7px] transition active:scale-[0.99]"
          >
            Đặt lịch ngay
          </button>
          {/* 3 Dots Pagination */}
          <div className="flex justify-start items-center space-x-1.5 pt-0.5">
            <span className="w-5 h-1.5 rounded-full bg-[#A65317]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#D8C7B5]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#D8C7B5]" />
          </div>
        </div>
      </div>

      {/* 4. 6 Specialty Service Icons */}
      <Box className="space-y-2">
        <Text className="text-xs font-bold text-[#40352F] uppercase tracking-wider">
          Bạn muốn trải nghiệm gì?
        </Text>
        <Box className="grid grid-cols-3 gap-2">
          {specialties.map((spec) => {
            const isSelected = selectedSpecialty === spec.id;
            const IconComponent = spec.IconComp;
            return (
              <button
                key={spec.id}
                onClick={() => {
                  setSelectedSpecialty(spec.id);
                  onNavigateTab(spec.id === 'daotao' ? 'academy' : 'services');
                }}
                className={`p-3 rounded-2xl flex flex-col items-center space-y-2 border transition active:scale-95 ${
                  isSelected
                    ? 'bg-[#FAF6F0] border-[#98501B] shadow-sm'
                    : 'bg-white border-[#EADECF] hover:bg-stone-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-[#98501B] text-white' : 'bg-[#FAF6F0] text-[#98501B]'
                  }`}
                >
                  <IconComponent size={20} color={isSelected ? '#FFFFFF' : '#98501B'} />
                </div>
                <span className="text-[11px] font-bold text-stone-700">{spec.title}</span>
              </button>
            );
          })}
        </Box>
      </Box>

      {/* 5. GỢI Ý DÀNH CHO BẠN (FIGMA B01 - 2 THẺ DỊCH VỤ ĐẦY ĐỦ) */}
      <Box className="space-y-3">
        <Text className="text-xs font-bold text-[#40352F] uppercase tracking-wider">
          Gợi ý dành cho bạn
        </Text>
        <Box className="space-y-3">
          {services.slice(0, 2).map((service) => (
            <Box
              key={service.id}
              onClick={() => onViewServiceDetail(service)}
              className="bg-white rounded-2xl p-3.5 border border-[#EADECF] shadow-xs space-y-3 cursor-pointer hover:border-[#98501B] active:bg-[#FAF6F0]/50 transition"
            >
              <Box className="space-y-2">
                <Box className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-[#7A685D]">{service.durationMinutes} phút</span>
                    <span className="text-[10px] text-stone-400">•</span>
                    <span className="text-xs font-bold text-[#98501B]">{service.price.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <Text className="text-xs font-bold text-[#40352F] leading-snug">{service.title}</Text>
                </Box>
                <div className="relative h-[170px] w-full overflow-hidden rounded-[8px]">
                  <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                  <button
                    onClick={(e) => toggleFavorite(service.id, e)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-stone-700 shadow-xs"
                  >
                    <HeartIcon
                      size={12}
                      color={favoriteServiceIds.includes(service.id) ? '#D64545' : '#40352F'}
                      fill={favoriteServiceIds.includes(service.id) ? '#D64545' : 'none'}
                    />
                  </button>
                </div>

                <Text className="text-[11px] text-[#7A685D] line-clamp-2">{service.description}</Text>
              </Box>

              <Box className="flex items-center justify-between pt-2 border-t border-[#EADECF]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewServiceDetail(service);
                  }}
                  className="text-xs font-bold text-[#98501B] hover:underline"
                >
                  Xem chi tiết
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectService(service);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#98501B] hover:bg-[#804215] text-white text-xs font-bold shadow-xs active:scale-95 transition"
                >
                  Đặt lịch
                </button>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 6. LỊCH HẸN SẮP TỚI (FIGMA B01) */}
      <Box className="space-y-2">
        <Box className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADECF] space-y-2.5 shadow-xs">
          <div className="flex justify-between items-center text-[10px] text-[#7A685D]">
            <span>Bắt đầu: 12/10/2026</span>
            <span className="text-emerald-700 font-semibold flex items-center space-x-1">
              <span>✓</span>
              <span>Đã xác nhận</span>
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#40352F]">
              {upcomingBooking ? upcomingBooking.serviceTitle : 'Massage thư giãn toàn thân'}
            </h4>
            <p className="text-[11px] text-[#7A685D] mt-0.5">
              12/10/2026 · 10:00–11:00
            </p>
            <p className="text-[10px] text-[#7A685D]">
              Chi nhánh mẫu 01 — Quận 3 · Dữ liệu minh họa
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('booking')}
            className="w-full py-2 bg-white hover:bg-stone-50 border border-[#EADECF] text-[#40352F] text-xs font-bold rounded-xl transition"
          >
            Xem chi tiết
          </button>
        </Box>
      </Box>

      {/* 7. CHUYÊN VIÊN GỢI Ý (FIGMA B01) */}
      <Box className="space-y-2">
        <div className="flex items-center justify-between"><Text className="text-xs font-bold text-[#40352F] uppercase tracking-wider">Chuyên viên gợi ý</Text><button onClick={onOpenSpecialists} className="text-[10px] font-bold text-[#98501B]">Xem tất cả</button></div>
        <Box className="bg-white rounded-2xl p-3.5 border border-[#EADECF] shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&auto=format&fit=crop&q=80"
              alt="Trần Minh Phương"
              className="w-12 h-12 rounded-xl object-cover border border-[#EADECF]"
            />
            <div>
              <h4 className="text-xs font-bold text-[#40352F]">Trần Minh Phương</h4>
              <p className="text-[10px] text-[#98501B] font-medium">Kỹ thuật viên massage</p>
              <p className="text-[10px] text-[#7A685D]">Chi nhánh mẫu 01 — Quận 3</p>
            </div>
          </div>
          <button
            onClick={() => doctors[0] && onSelectDoctor(doctors[0])}
            className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#F3E2CE] text-[#98501B] text-xs font-bold rounded-xl border border-[#EADECF] transition"
          >
            Xem hồ sơ
          </button>
        </Box>
      </Box>

      {/* 8. HỌC VIỆN ĐÀO TẠO NGHỀ BANNER (FIGMA B01) */}
      <Box className="rounded-2xl overflow-hidden bg-[#FAF6F0] border border-[#EADECF] shadow-xs">
        <img
          src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80"
          alt="Học viện MLD"
          className="w-full h-36 object-cover"
        />
        <div className="p-3.5 space-y-1.5">
          <span className="text-[9px] font-extrabold uppercase text-[#98501B] tracking-wider">
            Học viện đào tạo nghề
          </span>
          <h4 className="text-xs font-bold text-[#40352F]">
            Khởi đầu nghề nghiệp trong lĩnh vực chăm sóc sức khỏe và spa.
          </h4>
          <button
            onClick={() => onNavigateTab('academy')}
            className="w-full py-2 bg-white hover:bg-stone-50 border border-[#EADECF] text-[#98501B] text-xs font-bold rounded-xl transition mt-1"
          >
            Khám phá khóa học
          </button>
        </div>
      </Box>

      {/* 8. Branches Section (Matching Figma B04 - Thẻ chi nhánh & Chỉ đường) */}
      <Box className="space-y-3">
        <Box className="flex justify-between items-center">
          <Text className="text-xs font-bold text-[#40352F] uppercase tracking-wider">
            Cơ sở & Không gian trị liệu MLD
          </Text>
          <button onClick={onOpenBranches} className="text-[10px] font-bold text-[#98501B]">Xem tất cả · {branches.length}</button>
        </Box>

        <Box className="space-y-3">
          {branches.map((branch) => (
            <Box
              key={branch.id}
              className="bg-white rounded-2xl p-3.5 border border-[#EADECF] shadow-sm space-y-2.5"
            >
              <div className="h-36 w-full rounded-xl overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80"
                  alt={branch.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-[#FAF6F0]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-[#98501B] border border-[#EADECF]">
                  09:00 - 20:00 (Cả tuần)
                </span>
              </div>

              <div>
                <Text className="text-sm font-bold text-[#40352F]">{branch.name}</Text>
                <Text className="text-xs text-stone-500 mt-0.5 flex items-center space-x-1">
                  <LocationIcon size={13} color="#98501B" className="shrink-0" />
                  <span>{branch.address}</span>
                </Text>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-[#EADECF]">
                <button
                  onClick={() => onSelectBranch(branch)}
                  className="flex-1 py-2 bg-[#FAF6F0] hover:bg-[#F3E2CE] text-[#98501B] font-bold rounded-xl text-xs border border-[#EADECF] transition"
                >
                  Xem chi tiết
                </button>
                <button
                  onClick={() => onOpenDirections(branch)}
                  className="flex-1 py-2 bg-white text-stone-700 font-bold rounded-xl text-xs border border-[#EADECF] hover:bg-stone-50 transition flex items-center justify-center space-x-1"
                >
                  <MapIcon size={13} color="#98501B" />
                  <span>Chỉ đường</span>
                </button>
              </div>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 9. Space Gallery Preview (Bộ ảnh không gian) */}
      <Box className="space-y-2">
        <Text className="text-xs font-bold text-[#40352F] uppercase tracking-wider">
          Bộ ảnh không gian trị liệu
        </Text>
        <Box className="grid grid-cols-2 gap-2.5">
          <div className="h-28 rounded-2xl overflow-hidden relative border border-[#EADECF]">
            <img
              src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=80"
              alt="Phòng chăm sóc"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Phòng chăm sóc
            </span>
          </div>
          <div className="h-28 rounded-2xl overflow-hidden relative border border-[#EADECF]">
            <img
              src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&auto=format&fit=crop&q=80"
              alt="Khu vực đón tiếp"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Khu vực đón tiếp
            </span>
          </div>
        </Box>
      </Box>

      {/* 10. Filter Full-Screen Page (Figma B — Bảng lọc đầy đủ) */}
      {isFilterModalOpen && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-[#EADECF] flex justify-between items-center bg-white shrink-0 shadow-xs">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <div className="flex items-center space-x-1.5">
                <FilterIcon size={16} color="#98501B" />
                <h3 className="font-bold text-sm text-[#40352F]">Bộ lọc tìm kiếm dịch vụ</h3>
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="text-xs text-[#98501B] font-bold hover:underline"
            >
              Đặt lại
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs text-stone-800 pb-20">
            {/* Category */}
            <div>
              <label className="font-bold text-[#40352F] block mb-1.5">Danh mục dịch vụ</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'massage', label: 'Massage thư giãn' },
                  { id: 'da', label: 'Chăm sóc da' },
                  { id: 'trilieu', label: 'Trị liệu cơ khớp' },
                  { id: 'bachhuyet', label: 'Dẫn lưu bạch huyết' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFilterCategory(c.id)}
                    className={`p-2.5 rounded-xl text-[11px] font-bold border text-left transition ${
                      filterCategory === c.id
                        ? 'bg-[#98501B] text-white border-[#98501B]'
                        : 'bg-white text-stone-700 border-[#EADECF] hover:bg-stone-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="font-bold text-[#40352F] block mb-1.5">Khoảng giá</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'under500', label: '< 500k' },
                  { id: '500to800', label: '500k - 800k' },
                  { id: 'over800', label: '> 800k' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFilterPriceRange(p.id)}
                    className={`p-2.5 rounded-xl text-[11px] font-bold border text-center transition ${
                      filterPriceRange === p.id
                        ? 'bg-[#98501B] text-white border-[#98501B]'
                        : 'bg-white text-stone-700 border-[#EADECF]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="font-bold text-[#40352F] block mb-1.5">Thời lượng</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: '60', label: '60 phút' },
                  { id: '90', label: '90 phút' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setFilterDuration(d.id)}
                    className={`p-2.5 rounded-xl text-[11px] font-bold border text-center transition ${
                      filterDuration === d.id
                        ? 'bg-[#98501B] text-white border-[#98501B]'
                        : 'bg-white text-stone-700 border-[#EADECF]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="font-bold text-[#40352F] block mb-1.5">Khu vực / Chi nhánh</label>
              <div className="space-y-1.5">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranchId(b.id)}
                    className={`w-full p-3 rounded-xl text-[11px] font-bold border text-left flex justify-between items-center transition ${
                      selectedBranchId === b.id
                        ? 'bg-[#FAF6F0] border-[#98501B] text-[#98501B]'
                        : 'bg-white border-[#EADECF] text-stone-700'
                    }`}
                  >
                    <span>{b.name}</span>
                    {selectedBranchId === b.id && <CheckIcon size={14} color="#98501B" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="p-4 bg-white border-t border-[#EADECF] flex space-x-3 shrink-0 shadow-lg">
            <button
              onClick={resetFilters}
              className="flex-1 py-3 bg-[#FAF6F0] text-stone-700 font-bold rounded-xl border border-[#EADECF] text-xs hover:bg-[#EADECF]"
            >
              Xóa bộ lọc
            </button>
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="flex-1 py-3 bg-[#98501B] text-white font-bold rounded-xl shadow-md text-xs hover:bg-[#804215]"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </Box>
  );
};
