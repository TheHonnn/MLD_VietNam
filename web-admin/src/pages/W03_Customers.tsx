import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Crown,
  Leaf,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { customerService, treatmentService } from '../services';
import { toast } from '../components/common';
import { User, MemberTier, UserPackage, PurposeInterest } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

export const W03_Customers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPackages, setSelectedPackages] = useState<UserPackage[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('ALL');
  const [selectedSort, setSelectedSort] = useState<string>('NEWEST');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all customers on load
  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await customerService.getCustomers();
      if (res.success && res.data) {
        setAllCustomers(res.data);
        if (res.data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter & Sort Logic
  const filteredCustomers = useMemo(() => {
    let result = [...allCustomers];

    // 1. Search (tên, số điện thoại, email, mã giới thiệu, địa chỉ)
    if (searchTerm.trim()) {
      result = result.filter((c) =>
        matchSearch(
          [c.fullName, c.phone, c.email, c.referralCode, c.address],
          searchTerm
        )
      );
    }

    // 2. Member Tier filter
    if (selectedTier !== 'ALL') {
      result = result.filter((c) => c.membershipTier === selectedTier);
    }

    // 3. Status filter
    if (selectedStatus === 'ACTIVE') {
      result = result.filter((c) => c.isActive !== false);
    } else if (selectedStatus === 'INACTIVE') {
      result = result.filter((c) => c.isActive === false);
    }

    // 4. Purpose filter
    if (selectedPurpose !== 'ALL') {
      result = result.filter((c) => c.purpose === selectedPurpose);
    }

    // 5. Sorting
    switch (selectedSort) {
      case 'SPENT_DESC':
        result.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
        break;
      case 'POINTS_DESC':
        result.sort((a, b) => (b.rewardPoints || 0) - (a.rewardPoints || 0));
        break;
      case 'NAME_ASC':
        result.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
        break;
      case 'NEWEST':
      default:
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [allCustomers, searchTerm, selectedTier, selectedStatus, selectedPurpose, selectedSort]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));

  // Reset page when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTier, selectedStatus, selectedPurpose, selectedSort]);

  // Sync selected customer when list updates
  useEffect(() => {
    if (filteredCustomers.length > 0) {
      const exists = filteredCustomers.some((c) => c.id === selectedCustomerId);
      if (!exists) {
        setSelectedCustomerId(filteredCustomers[0].id);
      }
    }
  }, [filteredCustomers, selectedCustomerId]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const hasActiveFilter =
    searchTerm.trim() !== '' ||
    selectedTier !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedPurpose !== 'ALL' ||
    selectedSort !== 'NEWEST';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTier('ALL');
    setSelectedStatus('ALL');
    setSelectedPurpose('ALL');
    setSelectedSort('NEWEST');
  };

  // Load packages for selected customer
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedPackages([]);
      return;
    }
    const fetchPackages = async () => {
      try {
        const res = await treatmentService.getUserPackagesByCustomer(selectedCustomerId);
        if (res.success) {
          setSelectedPackages(res.data);
        }
      } catch (err) {
        console.error('Failed to load user packages:', err);
      }
    };
    fetchPackages();
  }, [selectedCustomerId]);

  const selectedCustomer =
    allCustomers.find((c) => c.id === selectedCustomerId) ||
    filteredCustomers[0] ||
    allCustomers[0];

  const getTierBadgeStyle = (tier?: MemberTier) => {
    switch (tier) {
      case MemberTier.DIAMOND:
        return 'bg-[#E5D8F6] text-[#6A39AF]';
      case MemberTier.PLATINUM:
        return 'bg-[#DEEAF6] text-[#2968A8]';
      case MemberTier.GOLD:
        return 'bg-[#F9EED4] text-[#A67812]';
      case MemberTier.SILVER:
        return 'bg-[#E8EDF2] text-[#4A5E73]';
      default:
        return 'bg-[#F4ECE3] text-[#78695E]';
    }
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Khách hàng CRM
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Tra cứu đa chi nhánh · Kết nối trực tuyến qua customerService.
          </p>
        </div>
        <button
          onClick={() => toast.info('Thêm khách hàng', 'Mở biểu mẫu tiếp nhận hồ sơ khách hàng mới.')}
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          Thêm khách hàng
        </button>
      </div>

      {/* 2. Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Tổng khách hàng */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[#73675F]">
              Khách hàng trong hệ thống
            </span>
            <Users className="w-4 h-4 text-[#8A4F23] stroke-[1.8]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#8E4002] tracking-tight mt-1">
            {isLoading ? '...' : allCustomers.length}
          </div>
          <div className="text-[11px] text-[#73675F] font-medium mt-1">
            {hasActiveFilter
              ? `Lọc được ${filteredCustomers.length} / ${allCustomers.length} hồ sơ`
              : 'Khách hàng & học viên đang hoạt động'}
          </div>
        </div>

        {/* Card 2: Tài khoản đang chọn */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[#73675F]">
              Điểm thưởng tích lũy
            </span>
            <Crown className="w-4 h-4 text-[#8A4F23] stroke-[1.8]" />
          </div>
          <div className="text-[24px] font-bold text-[#8E4002] tracking-tight mt-1">
            {selectedCustomer ? `${selectedCustomer.rewardPoints.toLocaleString('vi-VN')} điểm` : '0 điểm'}
          </div>
          <div className="text-[11px] text-[#73675F] font-medium mt-1">
            {selectedCustomer?.fullName} · Hạng {selectedCustomer?.membershipTier}
          </div>
        </div>

        {/* Card 3: Liệu trình của khách hàng đang chọn */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-[#73675F]">
              Liệu trình của {selectedCustomer?.fullName?.split(' ').slice(-2).join(' ') || 'khách hàng'}
            </span>
            <Leaf className="w-4 h-4 text-[#8A4F23] stroke-[1.8]" />
          </div>
          <div className="text-[24px] font-bold text-[#8E4002] tracking-tight mt-1">
            {selectedPackages.length > 0
              ? `${selectedPackages.reduce((s, p) => s + (p.totalSessions - p.completedSessions), 0)} buổi còn`
              : 'Chưa có gói'}
          </div>
          <div className="text-[11px] text-[#73675F] font-medium mt-1">
            {selectedPackages.length} gói đang sở hữu · Tổng chi tiêu: {selectedCustomer?.totalSpent?.toLocaleString('vi-VN')}đ
          </div>
        </div>
      </div>

      {/* 3. Filter Bar Box */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-wrap items-center gap-2.5 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã giới thiệu, số điện thoại hoặc email..."
            className="w-full h-10 pl-10 pr-9 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Membership Tier Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Hạng hội viên</option>
            <option value={MemberTier.STANDARD}>Hạng Standard</option>
            <option value={MemberTier.SILVER}>Hạng Silver (Bạc)</option>
            <option value={MemberTier.GOLD}>Hạng Gold (Vàng)</option>
            <option value={MemberTier.PLATINUM}>Hạng Platinum (Bạch Kim)</option>
            <option value={MemberTier.DIAMOND}>Hạng Diamond (Kim Cương)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng / Đã khóa</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Purpose / Interest Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedPurpose}
            onChange={(e) => setSelectedPurpose(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Nhu cầu quan tâm</option>
            <option value={PurposeInterest.BEAUTY_SPA}>Beauty Spa</option>
            <option value={PurposeInterest.ACADEMY}>Học viện Academy</option>
            <option value={PurposeInterest.BOTH}>Cả Spa & Học viện</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort Dropdown */}
        <div className="relative shrink-0 whitespace-nowrap">
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer whitespace-nowrap"
          >
            <option value="NEWEST">Mới nhất</option>
            <option value="SPENT_DESC">Chi tiêu cao nhất</option>
            <option value="POINTS_DESC">Điểm thưởng nhiều nhất</option>
            <option value="NAME_ASC">Tên A → Z</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset filter button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* 4. Main 2-Column Content: Customer Table (Left 8/12) vs Customer Profile Detail (Right 4/12) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols on desktop) */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2C241E]">Danh sách khách hàng</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3E2CE] text-[#8A4F23]">
              {filteredCustomers.length} hồ sơ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F3E2CE] text-[#73675F] text-[11.5px] font-medium">
                <tr>
                  <th className="py-3 px-5 font-medium">Khách hàng</th>
                  <th className="py-3 px-4 font-medium">Số điện thoại</th>
                  <th className="py-3 px-4 font-medium">Hạng & Điểm</th>
                  <th className="py-3 px-4 font-medium">Tổng chi tiêu</th>
                  <th className="py-3 px-6 font-medium text-right sm:text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D9]">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#73675F]">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy khách hàng phù hợp</p>
                        <p className="text-xs text-[#8C7A6B]">
                          {searchTerm.trim()
                            ? `Không có hồ sơ nào khớp với từ khóa "${searchTerm}".`
                            : 'Không có khách hàng nào khớp với các tiêu chí bộ lọc đã chọn.'}
                        </p>
                        {hasActiveFilter && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer"
                          >
                            Xóa bộ lọc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => {
                    const isSelected = c.id === selectedCustomerId;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`cursor-pointer ${
                          isSelected ? 'bg-[#F8F1E8]' : 'bg-white'
                        } hover:bg-[#FAF6F0] transition-colors`}
                      >
                      {/* Name & Avatar */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                            alt={c.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-[#E0D7CC]"
                          />
                          <div>
                            <div className="font-bold text-[#2C241E]">{c.fullName}</div>
                            <div className="text-[11px] text-[#8C7A6B]">
                              Mã: {c.referralCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-[#4A3E34] whitespace-nowrap">
                        {c.phone}
                      </td>

                      {/* Tier & Points */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${getTierBadgeStyle(
                            c.membershipTier
                          )}`}
                        >
                          {c.membershipTier} • {c.rewardPoints} đ
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-4 font-bold text-[#8E4002] whitespace-nowrap">
                        {c.totalSpent.toLocaleString('vi-VN')}đ
                      </td>

                      {/* Action */}
                      <td className="py-3 px-6 text-right sm:text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer-detail?id=${c.id}`);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-[#8A4F23] hover:bg-[#F3E2CE] transition-colors"
                        >
                          Xem hồ sơ
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B]">
            <span className="text-[11px]">
              Hiển thị {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} trong{' '}
              {filteredCustomers.length} khách hàng
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  currentPage <= 1
                    ? 'bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed'
                    : 'bg-white border border-[#E0D7CC] text-[#783D19] hover:bg-[#FAF0E4] cursor-pointer'
                }`}
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - currentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return (
                      <span key={pageNum} className="px-1 text-[#A69788]">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#985018] text-white shadow-2xs'
                        : 'bg-white border border-[#E0D7CC] text-[#73675F] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  currentPage >= totalPages
                    ? 'bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed'
                    : 'bg-white border border-[#E0D7CC] text-[#783D19] hover:bg-[#FAF0E4] cursor-pointer'
                }`}
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 of 12 cols on desktop) */}
        {selectedCustomer && (
          <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
            <div className="text-center pb-4 border-b border-[#EFE4D9]">
              <img
                src={selectedCustomer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt={selectedCustomer.fullName}
                className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[#985018] shadow-sm"
              />
              <h3 className="text-base font-extrabold text-[#2C241E] mt-3">
                {selectedCustomer.fullName}
              </h3>
              <p className="text-xs text-[#73675F] mt-0.5">{selectedCustomer.phone}</p>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getTierBadgeStyle(
                  selectedCustomer.membershipTier
                )}`}
              >
                Hạng {selectedCustomer.membershipTier} · {selectedCustomer.rewardPoints} điểm
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Địa chỉ:</span>
                <span className="font-semibold text-[#2C241E] text-right max-w-[200px]">
                  {selectedCustomer.address || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Liên hệ khẩn cấp:</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedCustomer.emergencyContactName || 'Chưa có'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Tổng chi tiêu:</span>
                <span className="font-bold text-[#8E4002]">
                  {selectedCustomer.totalSpent.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F0]">
                <span className="text-[#73675F]">Mục đích quan tâm:</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedCustomer.purpose}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/customer-detail?id=${selectedCustomer.id}`)}
              className="w-full py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              Xem bệnh án & hồ sơ chi tiết
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
