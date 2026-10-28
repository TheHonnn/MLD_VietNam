import React, { useState } from 'react';
import { SpaService, Branch } from '@/core/types';
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

interface ServicesScreenProps {
  services: SpaService[];
  branches: Branch[];
  activeBranch: Branch | null;
  onBookService: (service: SpaService) => void;
  onBackToHome?: () => void;
}

export const ServicesScreen: React.FC<ServicesScreenProps> = ({
  services,
  branches,
  activeBranch,
  onBookService,
  onBackToHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFilter, setExpandedFilter] = useState<'service' | 'branch' | null>(null);

  const serviceCategories = [
    'Tất cả dịch vụ',
    'Dẫn lưu Bạch huyết Giảm phù',
    'Dẫn lưu ngực',
    'Dẫn lưu đầu',
    'Dẫn lưu cổ vai gáy lưng',
    'Dẫn lưu chân',
    'Dẫn lưu bụng',
  ];
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('Tất cả dịch vụ');
  const [selectedBranch, setSelectedBranch] = useState(
    activeBranch ? activeBranch.name : 'Tất cả cơ sở'
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN');
  };

  const filteredServices = services.filter((srv) => {
    // 1. Filter by category
    if (selectedServiceCategory !== 'Tất cả dịch vụ' && selectedServiceCategory !== 'Tất cả') {
      const sName = (srv.name || '').toLowerCase();
      const sCat = (srv.categoryName || '').toLowerCase();
      const filterText = selectedServiceCategory.toLowerCase();
      const match =
        sName.includes(filterText) ||
        sCat.includes(filterText) ||
        'bạch huyết'.includes(filterText) ||
        'vodder'.includes(filterText) ||
        'phù'.includes(filterText);
      if (!match) return false;
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sName = (srv.name || '').toLowerCase();
      const sCat = (srv.categoryName || '').toLowerCase();
      const sDesc = (srv.shortDescription || '').toLowerCase();
      return (
        sName.includes(q) ||
        sCat.includes(q) ||
        sDesc.includes(q) ||
        'bạch huyết'.includes(q) ||
        'vodder'.includes(q) ||
        'phù'.includes(q)
      );
    }

    return true;
  });

  return (
    <div className="pb-24 bg-[#F9FAFB] min-h-screen">
      {/* 1. APPBAR: Chuẩn Mobile B02 (22px bold Montserrat) */}
      <div className="bg-white px-4 py-3 border-b border-[#E5E7EB] sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">
            Dịch vụ trị liệu
          </h1>
        </div>
      </div>

      {/* 2. Ô TÌM KIẾM DỊCH VỤ */}
      <div className="bg-white px-4 pt-2.5 pb-2.5">
        <div className="relative flex items-center bg-[#F1F5F9] rounded-lg border border-[#E5E7EB] px-3 py-2">
          <Search className="w-4 h-4 text-[#2860EB] shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm dịch vụ dẫn lưu bạch huyết..."
            className="w-full bg-transparent text-[13.5px] text-[#1F2937] placeholder-gray-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. HAI NÚT BỘ LỌC: [ Dịch vụ ▼ ] và [ Cơ sở ▼ ] */}
      <div className="bg-white px-4 pb-3 flex items-center space-x-2.5 border-b border-[#E5E7EB]">
        {/* Nút Dịch vụ */}
        <button
          type="button"
          onClick={() =>
            setExpandedFilter(expandedFilter === 'service' ? null : 'service')
          }
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition ${
            expandedFilter === 'service' ||
            (selectedServiceCategory !== 'Tất cả dịch vụ' && selectedServiceCategory !== 'Tất cả')
              ? 'bg-[#EFF4FE] border-[#2860EB] text-[#2860EB]'
              : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#1F2937]'
          }`}
        >
          <span className="truncate">
            {selectedServiceCategory === 'Tất cả dịch vụ'
              ? 'Dịch vụ'
              : selectedServiceCategory}
          </span>
          {expandedFilter === 'service' ? (
            <ChevronUp className="w-4 h-4 text-[#2860EB] shrink-0 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          )}
        </button>

        {/* Nút Cơ sở */}
        <button
          type="button"
          onClick={() =>
            setExpandedFilter(expandedFilter === 'branch' ? null : 'branch')
          }
          className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition ${
            expandedFilter === 'branch' ||
            (selectedBranch !== 'Tất cả cơ sở' && selectedBranch !== 'Tất cả')
              ? 'bg-[#EFF4FE] border-[#2860EB] text-[#2860EB]'
              : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#1F2937]'
          }`}
        >
          <span className="truncate">
            {selectedBranch === 'Tất cả cơ sở' ? 'Cơ sở' : selectedBranch}
          </span>
          {expandedFilter === 'branch' ? (
            <ChevronUp className="w-4 h-4 text-[#2860EB] shrink-0 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          )}
        </button>
      </div>

      {/* 4. KHUNG SỔ XUỐNG CÁC TÙY CHỌN BỘ LỌC (Khi click vào nút Dịch vụ hoặc Cơ sở) */}
      {expandedFilter && (
        <div className="bg-[#F8FAFC] px-4 py-3 border-b border-[#E5E7EB] space-y-2 animate-in fade-in duration-200">
          <p className="text-xs font-semibold text-[#616161]">
            {expandedFilter === 'service'
              ? 'Chọn loại dịch vụ:'
              : 'Chọn cơ sở / chi nhánh:'}
          </p>

          <div className="flex flex-wrap gap-2">
            {expandedFilter === 'service' ? (
              serviceCategories.map((cat) => {
                const isSelected = cat === selectedServiceCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedServiceCategory(cat);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition ${
                      isSelected
                        ? 'bg-[#2860EB] text-white font-bold'
                        : 'bg-white text-gray-700 border border-[#E5E7EB] hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedBranch('Tất cả cơ sở')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${
                    selectedBranch === 'Tất cả cơ sở'
                      ? 'bg-[#2860EB] text-white font-bold'
                      : 'bg-white text-gray-700 border border-[#E5E7EB] hover:bg-gray-50'
                  }`}
                >
                  Tất cả cơ sở
                </button>
                {branches.map((b) => {
                  const isSelected = selectedBranch === b.name;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBranch(b.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition ${
                        isSelected
                          ? 'bg-[#2860EB] text-white font-bold'
                          : 'bg-white text-gray-700 border border-[#E5E7EB] hover:bg-gray-50'
                      }`}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. DANH SÁCH DỊCH VỤ KHẢ DỤNG (Chuẩn Mobile B02: Ảnh 185px, Tên 17px bold, Giá #E11D48 đ gạch chân, Nút Đặt lịch) */}
      <div className="p-4 space-y-4">
        {filteredServices.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-700">
              Không tìm thấy dịch vụ phù hợp
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Vui lòng thử từ khóa khác hoặc chọn danh mục khác
            </p>
            <button
              onClick={() => {
                setSelectedServiceCategory('Tất cả dịch vụ');
                setSelectedBranch('Tất cả cơ sở');
                setExpandedFilter(null);
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-[#2860EB] text-white text-xs font-bold rounded-lg"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-lg border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              {/* Ảnh dịch vụ 185px */}
              <div
                onClick={() => onBookService(srv)}
                className="w-full h-[185px] bg-[#EFF4FE] overflow-hidden cursor-pointer relative"
              >
                <img
                  src={srv.imageUrl}
                  alt={srv.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Nội dung: Tên, Giá, Nút Đặt lịch */}
              <div className="p-3.5">
                <h3
                  onClick={() => onBookService(srv)}
                  className="text-[17px] font-bold text-[#0F172A] leading-snug cursor-pointer line-clamp-2"
                >
                  {srv.name}
                </h3>

                <div className="my-3 border-t border-[#F1F5F9]" />

                <div className="flex items-center justify-between">
                  {/* Giá tiền dịch vụ: Màu #E11D48, chữ đ gạch chân */}
                  <div className="flex items-baseline text-[#E11D48] font-bold text-[20px]">
                    <span>{formatCurrency(srv.price)} </span>
                    <span className="underline ml-0.5">đ</span>
                  </div>

                  {/* Nút Đặt lịch (Chuyển xanh #00693F khi chạm) */}
                  <button
                    type="button"
                    onClick={() => onBookService(srv)}
                    className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#00693F] text-[#0F172A] hover:text-white border border-[#E2E8F0] hover:border-[#00693F] rounded-lg text-[13.5px] font-bold flex items-center space-x-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <span>Đặt lịch</span>
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
