import React, { useState } from 'react';
import { SpaService, Branch } from '@/core/types';
import { ChevronDown, Clock, ShieldCheck, CheckCircle2, Phone, MapPin } from 'lucide-react';

interface ServicesScreenProps {
  services: SpaService[];
  branches: Branch[];
  activeBranch: Branch | null;
  onBookService: (service: SpaService) => void;
}

export const ServicesScreen: React.FC<ServicesScreenProps> = ({
  services,
  branches,
  activeBranch,
  onBookService,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranch?.id || 'all');
  const [detailService, setDetailService] = useState<SpaService | null>(null);

  const categories = ['Tất cả', 'Dẫn lưu bạch huyết MLD', 'Trị liệu phù nề', 'Phục hồi hậu phẫu'];

  // Filter logic
  const filteredServices = services.filter((s) => {
    const matchCat = selectedCategory === 'Tất cả' || s.categoryName === selectedCategory;
    return matchCat;
  });

  return (
    <div className="pb-24 space-y-4 animate-in fade-in duration-300">
      {/* 1. HEADER & CLEAN FILTER BUTTONS (Chuẩn Mobile B02: [Dịch vụ ▼] & [Cơ sở ▼]) */}
      <div className="bg-white border-b border-gray-100 p-4 sticky top-14 z-30 shadow-xs">
        <h2 className="text-base font-extrabold text-gray-900">Danh Mục Dịch Vụ MLD</h2>
        <p className="text-[11.5px] text-gray-500 mt-0.5">
          Liệu trình dẫn lưu tuần hoàn bạch huyết chuẩn kỹ thuật Vodder châu Âu
        </p>

        {/* Clean Filter Text Buttons */}
        <div className="flex items-center space-x-2 mt-3 overflow-x-auto no-scrollbar">
          {/* Bộ lọc Dịch vụ */}
          <div className="relative shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Dịch vụ: {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-blue-700 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Bộ lọc Cơ sở */}
          <div className="relative shrink-0">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl focus:outline-none"
            >
              <option value="all">Cơ sở: Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Cơ sở: {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-700 absolute right-2 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. SERVICE LIST */}
      <div className="px-4 space-y-3">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
          >
            <div className="flex space-x-3.5">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <img src={srv.imageUrl} alt={srv.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {srv.categoryName}
                </span>
                <h3 className="text-xs font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">
                  {srv.name}
                </h3>
                <div className="flex items-center text-[11px] text-gray-400 mt-1 space-x-2">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-gray-400" />
                    {srv.durationMinutes} phút
                  </span>
                  <span>•</span>
                  <span>Chuẩn Vodder</span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                  {srv.shortDescription}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
              <div>
                <span className="text-xs text-gray-400 block text-[10px]">Chi phí niêm yết</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {srv.price.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDetailService(srv)}
                  className="text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => onBookService(srv)}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors"
                >
                  Đặt lịch ngay
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. SERVICE DETAIL MODAL (B03) */}
      {detailService && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setDetailService(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />

            <div className="relative h-44 rounded-2xl overflow-hidden">
              <img
                src={detailService.imageUrl}
                alt={detailService.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
                {detailService.categoryName}
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                {detailService.name}
              </h3>
              <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-500">
                <span className="flex items-center text-blue-600 font-semibold">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {detailService.durationMinutes} phút / ca
                </span>
                <span>•</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {detailService.price.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 space-y-2">
              <div className="text-xs font-bold text-blue-900 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                Chỉ định & Tác dụng Lâm sàng
              </div>
              <ul className="text-xs text-gray-700 space-y-1.5 pl-1">
                <li className="flex items-start">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600 shrink-0 mt-0.5" />
                  Giải tỏa ứ đọng dịch kẽ mô, giảm sưng nề nhanh gấp 3 lần sau phẫu thuật.
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600 shrink-0 mt-0.5" />
                  Tăng cường tuần hoàn mao mạch bạch huyết, làm dịu đau nhức và bầm tím.
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600 shrink-0 mt-0.5" />
                  Phương pháp không dùng lực mạnh, hoàn toàn thư giãn và không đau.
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-900">Mô tả quy trình</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {detailService.fullDescription}
              </p>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setDetailService(null)}
                className="w-1/3 py-3 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = detailService;
                  setDetailService(null);
                  onBookService(s);
                }}
                className="w-2/3 py-3 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors"
              >
                Đặt lịch dịch vụ này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

