import React, { useState } from 'react';
import { Box, Text } from 'zmp-ui';
import {
  SearchIcon,
  ArrowLeftIcon,
  ClockIcon,
  CloseIcon,
  TagIcon,
  StarIcon,
  LocationIcon,
  NavAcademyIcon,
  HeartIcon,
} from './Icons';

interface GroupBSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: any) => void;
  onSelectCourse: (course: any) => void;
  onSelectBranch: (branch: any) => void;
  onSelectSpecialist: (specialist: any) => void;
}

export const GroupBSearch: React.FC<GroupBSearchProps> = ({
  isOpen,
  onClose,
  onSelectService,
  onSelectCourse,
  onSelectBranch,
  onSelectSpecialist,
}) => {
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'service' | 'course' | 'branch' | 'specialist'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Massage thư giãn',
    'Chăm sóc da',
    'Khóa học nghề spa',
    'Chi nhánh Quận 3',
  ]);

  if (!isOpen) return null;

  // Mock catalog data for instant search
  const services = [
    {
      id: 'srv_1',
      title: 'Massage Thư Giãn Toàn Thân',
      type: 'service',
      duration: '60 phút',
      price: '450.000đ',
      category: 'Massage',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'srv_2',
      title: 'Dẫn Lưu Bạch Huyết MLD Chuyên Sâu',
      type: 'service',
      duration: '90 phút',
      price: '850.000đ',
      category: 'MLD',
      image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'srv_3',
      title: 'Chăm Sóc Da & Phục Hồi Chuyên Sâu',
      type: 'service',
      duration: '75 phút',
      price: '650.000đ',
      category: 'Chăm sóc da',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&auto=format&fit=crop&q=80',
    },
  ];

  const courses = [
    {
      id: 'crs_1',
      title: 'Kỹ Thuật Massage Chuyên Nghiệp',
      type: 'course',
      duration: '12 tuần',
      tuition: '9.000.000đ',
      category: 'Đào tạo',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'crs_2',
      title: 'Chuyên Viên Dẫn Lưu Bạch Huyết MLD',
      type: 'course',
      duration: '8 tuần',
      tuition: '12.000.000đ',
      category: 'Đào tạo',
      image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&auto=format&fit=crop&q=80',
    },
  ];

  const branches = [
    {
      id: 'br_1',
      title: 'Chi Nhánh Mẫu 01 - Quận 3',
      type: 'branch',
      address: '123 Đường Mẫu, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
      distance: '3.2 km',
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'br_2',
      title: 'Chi Nhánh Mẫu 02 - Thảo Điền Quận 2',
      type: 'branch',
      address: '45 Đường Quốc Hương, Phường Thảo Điền, TP. Thủ Đức',
      distance: '6.8 km',
      image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&auto=format&fit=crop&q=80',
    },
  ];

  const specialists = [
    {
      id: 'sp_1',
      title: 'Trần Minh Phương',
      type: 'specialist',
      role: 'Kỹ thuật viên Massage & MLD',
      branch: 'Chi nhánh Quận 3',
      rating: '4.9/5',
      image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'sp_2',
      title: 'Nguyễn Thu Hà',
      type: 'specialist',
      role: 'Chuyên viên chăm sóc da cao cấp',
      branch: 'Chi nhánh Quận 3',
      rating: '5.0/5',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    },
  ];

  // Filtering
  const cleanKeyword = keyword.trim().toLowerCase();
  const allItems = [...services, ...courses, ...branches, ...specialists];

  const filteredItems = allItems.filter((item) => {
    const matchesKeyword = cleanKeyword === '' || item.title.toLowerCase().includes(cleanKeyword);
    if (!matchesKeyword) return false;
    if (activeCategory === 'all') return true;
    if (activeCategory === 'service') return item.type === 'service';
    if (activeCategory === 'course') return item.type === 'course';
    if (activeCategory === 'branch') return item.type === 'branch';
    if (activeCategory === 'specialist') return item.type === 'specialist';
    return true;
  });

  const handleSelectTag = (query: string) => {
    setKeyword(query);
  };

  const handleRemoveRecent = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => prev.filter((item) => item !== itemToRemove));
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in">
      {/* Top Search Bar (Figma B02) */}
      <div className="bg-white border-b border-[#EADECF] px-4 pt-4 pb-3 shadow-sm">
        <div className="flex items-center space-x-3 mb-3">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#40352F] hover:bg-[#F3E8DB] transition active:scale-95"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-[#40352F]">Bạn đang tìm kiếm điều gì?</h1>
            <p className="text-[11px] text-[#7A685D]">Khám phá dịch vụ, khóa học và chuyên viên MLD</p>
          </div>
        </div>

        {/* Input box */}
        <div className="relative flex items-center">
          <SearchIcon size={16} className="absolute left-3.5 text-[#98501B]" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm dịch vụ, khóa học, chuyên viên..."
            autoFocus
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADECF] text-xs font-medium text-[#40352F] placeholder-[#A09085] focus:outline-none focus:border-[#98501B] focus:bg-white transition"
          />
          {keyword && (
            <button
              onClick={() => setKeyword('')}
              className="absolute right-3 w-5 h-5 rounded-full bg-[#EADECF] text-[#7A685D] flex items-center justify-center hover:bg-[#98501B] hover:text-white transition"
            >
              <CloseIcon size={10} />
            </button>
          )}
        </div>

        {/* Filter Categories Chips (Figma 02 Group B) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-3">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'service', label: 'Dịch vụ' },
            { id: 'course', label: 'Khóa học' },
            { id: 'branch', label: 'Chi nhánh' },
            { id: 'specialist', label: 'Chuyên viên' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-[#98501B] text-white shadow-sm shadow-[#98501B]/20'
                  : 'bg-[#FAF6F0] text-[#7A685D] hover:bg-[#F3E8DB]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* If no keyword entered, show Recent Searches & Popular Tags */}
        {!keyword.trim() && (
          <div className="space-y-4">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-white rounded-2xl p-3.5 border border-[#EADECF] shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[#40352F]">
                    <ClockIcon size={14} className="text-[#98501B]" />
                    <span>Tìm kiếm gần đây</span>
                  </div>
                  <button
                    onClick={() => setRecentSearches([])}
                    className="text-[11px] text-[#98501B] hover:underline font-medium"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="space-y-1">
                  {recentSearches.map((item) => (
                    <div
                      key={item}
                      onClick={() => handleSelectTag(item)}
                      className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[#FAF6F0] cursor-pointer transition text-xs text-[#40352F]"
                    >
                      <div className="flex items-center space-x-2">
                        <ClockIcon size={12} className="text-[#A09085]" />
                        <span>{item}</span>
                      </div>
                      <button
                        onClick={(e) => handleRemoveRecent(item, e)}
                        className="p-1 text-[#A09085] hover:text-[#98501B]"
                      >
                        <CloseIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div className="bg-white rounded-2xl p-3.5 border border-[#EADECF] shadow-sm space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#40352F]">
                <TagIcon size={14} className="text-[#98501B]" />
                <span>Tìm kiếm phổ biến</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  'Massage thư giãn',
                  'Chăm sóc da',
                  'Dẫn lưu bạch huyết',
                  'Khóa học nghề spa',
                  'Trần Minh Phương',
                  'Chi nhánh Quận 3',
                  'Trị liệu đau mỏi vai gáy',
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSelectTag(tag)}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F3E8DB] border border-[#EADECF] text-xs text-[#40352F] font-medium transition active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results list */}
        {keyword.trim() && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#7A685D] px-1">
              <span>Kết quả cho "{keyword}"</span>
              <span className="font-semibold text-[#98501B]">{filteredItems.length} kết quả</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#EADECF] shadow-sm space-y-2">
                <SearchIcon size={32} className="mx-auto text-[#A09085]" />
                <p className="text-xs font-bold text-[#40352F]">Không tìm thấy kết quả phù hợp</p>
                <p className="text-[11px] text-[#7A685D]">
                  Hãy thử tìm kiếm với từ khóa khác như "Massage", "Khóa học", "Quận 3"...
                </p>
              </div>
            ) : (
              filteredItems.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'service') onSelectService(item);
                    else if (item.type === 'course') onSelectCourse(item);
                    else if (item.type === 'branch') onSelectBranch(item);
                    else if (item.type === 'specialist') onSelectSpecialist(item);
                    onClose();
                  }}
                  className="bg-white rounded-2xl p-3 border border-[#EADECF] shadow-sm flex items-center space-x-3 cursor-pointer hover:border-[#98501B] active:bg-[#FAF6F0] transition"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 rounded-xl object-cover border border-[#EADECF] shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#FBF1E8] text-[#98501B] border border-[#EADECF]">
                        {item.type === 'service'
                          ? 'Dịch vụ'
                          : item.type === 'course'
                          ? 'Khóa học'
                          : item.type === 'branch'
                          ? 'Chi nhánh'
                          : 'Chuyên viên'}
                      </span>
                      {item.duration && (
                        <span className="text-[10px] text-[#7A685D]">{item.duration}</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#40352F] truncate">{item.title}</p>
                    <p className="text-[11px] text-[#7A685D] truncate">
                      {item.price || item.tuition || item.address || item.role}
                    </p>
                  </div>
                  <button className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] hover:bg-[#98501B] text-[#98501B] hover:text-white text-[11px] font-bold transition">
                    Xem
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
