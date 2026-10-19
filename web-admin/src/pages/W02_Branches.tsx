import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { branchService, treatmentService } from '../services';
import { toast } from '../components/common';
import { Branch, BranchRoom, Service } from '../types/shared_types';

export const W02_Branches: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('b-q3');
  const [rooms, setRooms] = useState<BranchRoom[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brRes, srvRes] = await Promise.all([
          branchService.getAllBranches(),
          treatmentService.getServices(),
        ]);
        if (brRes.success && brRes.data.length > 0) {
          setBranches(brRes.data);
          setSelectedBranchId(brRes.data[0].id);
          const roomRes = await branchService.getRoomsByBranch(brRes.data[0].id);
          if (roomRes.success) setRooms(roomRes.data);
        }
        if (srvRes.success) setServices(srvRes.data);
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectBranch = async (branchId: string) => {
    setSelectedBranchId(branchId);
    try {
      const roomRes = await branchService.getRoomsByBranch(branchId);
      if (roomRes.success) setRooms(roomRes.data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const filteredBranches = branches.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.address.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Quản lý chi nhánh
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Danh mục cơ sở, dịch vụ và cấu hình vận hành trực tuyến từ Service Layer.
          </p>
        </div>
        <button
          onClick={() => toast.info('Thêm chi nhánh mới', 'Đang kết nối hệ thống khởi tạo cơ sở chi nhánh.')}
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          Thêm chi nhánh
        </button>
      </div>

      {/* 2. Filter Bar Box */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên hoặc địa chỉ chi nhánh..."
            className="w-full h-10 px-3.5 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* City dropdown */}
        <button className="flex items-center justify-between gap-4 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Tỉnh / thành phố ({branches.length})</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Status dropdown */}
        <button className="flex items-center justify-between gap-4 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Tất cả trạng thái</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Service dropdown */}
        <button className="flex items-center justify-between gap-4 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Dịch vụ ({services.length})</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 3. Table Card: Danh sách chi nhánh */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2C241E]">Danh sách chi nhánh</h3>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3E2CE] text-[#8A4F23]">
            {filteredBranches.length} cơ sở
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3E2CE] text-[#73675F] text-[11.5px] font-medium">
              <tr>
                <th className="py-3 px-5 font-medium">Cơ sở & địa chỉ</th>
                <th className="py-3 px-4 font-medium">Giờ mở cửa</th>
                <th className="py-3 px-4 font-medium">Tiện ích / dịch vụ</th>
                <th className="py-3 px-4 font-medium">Số điện thoại</th>
                <th className="py-3 px-6 font-medium text-right sm:text-center">Trạng thái / thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9]">
              {filteredBranches.map((branch) => {
                const isSelected = branch.id === selectedBranchId;
                return (
                  <tr
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch.id)}
                    className={`cursor-pointer ${
                      isSelected ? 'bg-[#F8F1E8]' : 'bg-white'
                    } hover:bg-[#FAF6F0] transition-colors`}
                  >
                    {/* Name & Address */}
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-[#2C241E]">{branch.name}</div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">{branch.address}</div>
                    </td>

                    {/* Open Hours */}
                    <td className="py-3.5 px-4 font-semibold text-[#2C241E] whitespace-nowrap">
                      {branch.openingTime.slice(0, 5)}–{branch.closingTime.slice(0, 5)}
                    </td>

                    {/* Amenities / Services */}
                    <td className="py-3.5 px-4">
                      {branch.amenities.map((a, aIdx) => (
                        <div key={aIdx} className="text-xs text-[#2C241E] leading-relaxed">
                          • {a}
                        </div>
                      ))}
                    </td>

                    {/* Resources */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#2C241E]">{branch.phone}</div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">{branch.district}, {branch.city}</div>
                    </td>

                    {/* Status & Action */}
                    <td className="py-3.5 px-6 text-right sm:text-center">
                      <div className="flex flex-col items-end sm:items-center justify-center gap-1.5">
                        <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                          {branch.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                        </span>
                        <button className="text-xs font-bold text-[#8A4F23] hover:underline">
                          Quản lý cơ sở
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B]">
          <span className="text-[11px]">
            Hiển thị {filteredBranches.length} / {branches.length} cơ sở
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="w-6 h-6 rounded-md flex items-center justify-center bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md flex items-center justify-center bg-[#E6D4C3] text-[#783D19] font-bold text-[11px]">
              1
            </button>
            <button
              disabled
              className="w-6 h-6 rounded-md flex items-center justify-center bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Selected Branch Details & Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols = 66.6%) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedBranch && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Cơ sở đang chọn · {selectedBranch.district}
                </h3>
                <div className="mt-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                    {selectedBranch.name}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#2C241E] mt-2">
                  {selectedBranch.address}
                </div>
                <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                  Hotline: {selectedBranch.phone} • Giờ hoạt động: {selectedBranch.openingTime.slice(0, 5)} - {selectedBranch.closingTime.slice(0, 5)}
                </div>
              </div>

              {/* Specifications Key-Value 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-xs pt-1">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Số lượng phòng</span>
                  <span className="font-semibold text-[#2C241E]">{rooms.length} phòng dịch vụ</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Kỹ thuật viên trưởng</span>
                  <span className="font-semibold text-[#2C241E]">Trần Lan Anh</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Khung giờ tiếp khách</span>
                  <span className="font-semibold text-[#2C241E]">
                    {selectedBranch.openingTime.slice(0, 5)}–{selectedBranch.closingTime.slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Danh sách phòng</span>
                  <span className="font-semibold text-[#2C241E]">
                    {rooms.map((r) => r.name).join(', ') || 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 of 12 cols = 33.3%) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-[#2C241E]">Phân bổ phòng ốc cơ sở</h3>
            <div className="space-y-2">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#2C241E]">{r.name}</div>
                    <div className="text-[10px] text-[#8C7A6B]">{r.roomType} • {r.bedCapacity} giường</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.isAvailable
                        ? 'bg-[#E8EFE5] text-[#526D51]'
                        : 'bg-[#FBEBEB] text-[#B83E3E]'
                    }`}
                  >
                    {r.isAvailable ? 'Sẵn sàng' : 'Đang bận'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
