import React, { useState, useEffect, useMemo } from 'react';
import {
  Leaf,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
} from 'lucide-react';
import { treatmentService, customerService } from '../services';
import { toast } from '../components/common';
import { matchSearch } from '../utils/searchUtils';
import {
  TreatmentPackage as SharedTreatmentPackage,
  UserPackage,
  Service,
  TreatmentJournal,
  User,
} from '../types/shared_types';

interface TreatmentPackageUI {
  id: string;
  name: string;
  customerId: string;
  sessionsTotal: number;
  price: string;
  purchaseDate: string;
  expiryDate: string;
  usedSessions: number;
  remainingSessions: number;
  progressPercent: number;
  progressLabel: string;
  branch: string;
  status: string;
  sessionsHistory: {
    number: string;
    date: string;
    serviceName: string;
    isUpcoming?: boolean;
    bookingCode?: string;
    time?: string;
    staff?: string;
    room?: string;
    statusBadge?: string;
  }[];
  historySubtitle: string;
  historyNote: string;
}

export const W06_TreatmentManagement: React.FC = () => {
  const [livePackages, setLivePackages] = useState<SharedTreatmentPackage[]>([]);
  const [liveUserPackages, setLiveUserPackages] = useState<UserPackage[]>([]);
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [liveJournals, setLiveJournals] = useState<TreatmentJournal[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);

  useEffect(() => {
    const fetchTreatmentData = async () => {
      try {
        const [pkgRes, upkgRes, srvRes, jrnRes, custRes] = await Promise.all([
          treatmentService.getTreatmentPackages(),
          treatmentService.getUserPackagesByCustomer(),
          treatmentService.getServices(),
          treatmentService.getTreatmentJournalsByCustomer(),
          customerService.getCustomers(),
        ]);
        if (pkgRes.success) setLivePackages(pkgRes.data);
        if (upkgRes.success) setLiveUserPackages(upkgRes.data);
        if (srvRes.success) setLiveServices(srvRes.data);
        if (jrnRes.success) setLiveJournals(jrnRes.data);
        if (custRes.success) setCustomers(custRes.data);
      } catch (err) {
        console.error('Failed to load treatment data:', err);
      }
    };
    fetchTreatmentData();
  }, []);

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const packages: TreatmentPackageUI[] = useMemo(() => {
    if (!liveUserPackages || liveUserPackages.length === 0) return [];

    return liveUserPackages.map((up) => {
      const cust = custMap.get(up.customerId);
      const pkgDef = up.package || livePackages.find((p) => p.id === up.packageId);
      const journals = liveJournals
        .filter((j) => j.userPackageId === up.id || (!j.userPackageId && j.customerId === up.customerId))
        .sort((a, b) => a.sessionNumber - b.sessionNumber);

      const used = up.completedSessions || journals.length;
      const total = up.totalSessions || 5;
      const remaining = Math.max(0, total - used);
      const progressPercent = Math.min(100, Math.round((used / total) * 100));

      const purchaseFormatted = up.purchasedAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(up.purchasedAt))
        : '01/09/2026';
      const expiryFormatted = up.expiresAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(up.expiresAt))
        : '31/12/2026';

      const srvName = pkgDef?.name || 'Liệu trình phục hồi da chuyên sâu';
      const priceText = `${(pkgDef?.discountPrice || pkgDef?.price || 3250000).toLocaleString('vi-VN')}đ`;

      const sessionsHistory: TreatmentPackageUI['sessionsHistory'] = journals.map((j) => ({
        number: String(j.sessionNumber).padStart(2, '0'),
        date: new Intl.DateTimeFormat('vi-VN').format(new Date(j.sessionDate)),
        serviceName: j.treatmentNotes || srvName,
      }));

      if (remaining > 0) {
        sessionsHistory.push({
          number: String(used + 1).padStart(2, '0'),
          date: 'Lịch sắp tới',
          serviceName: 'Buổi chăm sóc tiếp theo',
          isUpcoming: true,
          bookingCode: 'BK-NEXT-01',
          time: '09:00–10:30',
          staff: 'Kỹ thuật viên chuyên trách',
          room: 'Phòng VIP · Quận 3',
          statusBadge: 'Chờ xếp lịch',
        });
      }

      return {
        id: up.id,
        name: `${srvName} · ${total} buổi`,
        customerId: up.customerId,
        sessionsTotal: total,
        price: priceText,
        purchaseDate: purchaseFormatted,
        expiryDate: expiryFormatted,
        usedSessions: used,
        remainingSessions: remaining,
        progressPercent,
        progressLabel: `${progressPercent}% đã dùng`,
        branch: 'Quận 3',
        status: up.status === 'ACTIVE' ? 'Đang sử dụng' : 'Hoàn tất',
        historySubtitle: `Hồ sơ liệu trình thực tế của ${cust?.fullName || 'khách hàng'}, đồng bộ trực tiếp từ Supabase Cloud.`,
        historyNote: `Đã hoàn thành ${used}/${total} buổi. Còn lại ${remaining} buổi hợp lệ đến ${expiryFormatted}.`,
        sessionsHistory,
      };
    });
  }, [liveUserPackages, livePackages, liveJournals, liveServices, custMap]);

  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (!searchTerm.trim()) return true;
      const cust = custMap.get(pkg.customerId);
      return matchSearch(
        [pkg.name, pkg.price, cust?.fullName, cust?.phone, pkg.branch, pkg.status],
        searchTerm
      );
    });
  }, [packages, searchTerm, custMap]);

  useEffect(() => {
    if (filteredPackages.length > 0 && (!selectedPkgId || !filteredPackages.some((p) => p.id === selectedPkgId))) {
      setSelectedPkgId(filteredPackages[0].id);
    }
  }, [filteredPackages, selectedPkgId]);

  const selectedPkg =
    filteredPackages.find((p) => p.id === selectedPkgId) ||
    filteredPackages[0] ||
    packages[0] || {
    id: '',
    name: 'Chưa có gói liệu trình',
    customerId: '',
    sessionsTotal: 0,
    price: '0đ',
    purchaseDate: '',
    expiryDate: '',
    usedSessions: 0,
    remainingSessions: 0,
    progressPercent: 0,
    progressLabel: '0%',
    branch: 'Quận 3',
    status: 'Đang tải',
    historySubtitle: 'Đang đồng bộ dữ liệu từ Supabase Cloud...',
    historyNote: '',
    sessionsHistory: [],
  };

  const selectedCustomer = custMap.get(selectedPkg.customerId);

  const totalActivePackages = packages.filter((p) => p.status === 'Đang sử dụng').length;
  const totalRemainingSessions = packages.reduce((acc, p) => acc + p.remainingSessions, 0);
  const totalUsedSessions = packages.reduce((acc, p) => acc + p.usedSessions, 0);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Quản lý liệu trình
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Hồ sơ liệu trình spa & phân bổ buổi chăm sóc chuyên sâu
          </p>
        </div>
        <button
          onClick={() => toast.success('Đặt lịch tiếp theo', 'Đã lưu kế hoạch và mở biểu mẫu xếp lịch buổi chăm sóc tiếp theo.')}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap"
        >
          Đặt buổi tiếp theo
        </button>
      </div>

      {/* 2. Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
            <span>Gói đang sử dụng</span>
            <Leaf className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#2C241E] leading-none mt-2 whitespace-nowrap">
            {totalActivePackages}
          </div>
          <div className="text-[11px] text-[#73675F] mt-2 whitespace-nowrap">
            Gói đang lưu hành
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
            <span>Buổi còn lại</span>
            <Calendar className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#2C241E] leading-none mt-2 whitespace-nowrap">
            {totalRemainingSessions}
          </div>
          <div className="text-[11px] text-[#73675F] mt-2 whitespace-nowrap">
            Buổi khả dụng trên hệ thống
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
            <span>Buổi đã sử dụng</span>
            <SlidersHorizontal className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#2C241E] leading-none mt-2 whitespace-nowrap">
            {totalUsedSessions}
          </div>
          <div className="text-[11px] text-[#73675F] mt-2 whitespace-nowrap">
            Buổi đã trị liệu thực tế
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách hàng, mã gói hoặc tên liệu trình..."
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
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

        {/* Dropdown 1 */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none whitespace-nowrap cursor-pointer">
          <span className="whitespace-nowrap">Tất cả loại gói</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 2 */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none whitespace-nowrap cursor-pointer">
          <span className="whitespace-nowrap">Đang sử dụng</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 3 */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none whitespace-nowrap cursor-pointer">
          <span className="whitespace-nowrap">Hạn đến 31/12/2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Reset filter button */}
        {searchTerm.trim() && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            title="Đặt lại tìm kiếm"
          >
            <X className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Đặt lại</span>
          </button>
        )}
      </div>

      {/* 4. Packages Table Card */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Table Header Row */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EFE4D9] whitespace-nowrap">
          <h2 className="text-base font-bold text-[#2C241E] whitespace-nowrap">
            Gói liệu trình dịch vụ MLD
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F5E9DB] text-[#8A4F23] whitespace-nowrap shrink-0">
            {filteredPackages.length} gói hoạt động
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-5 whitespace-nowrap">Gói / giá mua</th>
                <th className="py-3 px-5 whitespace-nowrap">Ngày mua / hết hạn</th>
                <th className="py-3 px-5 whitespace-nowrap">Tổng · đã dùng · còn</th>
                <th className="py-3 px-5 w-44 whitespace-nowrap">Tiến độ</th>
                <th className="py-3 px-5 whitespace-nowrap">Cơ sở / trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC] whitespace-nowrap">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#73675F] whitespace-normal">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy gói liệu trình</p>
                      <p className="text-xs text-[#8C7A6B]">
                        {searchTerm.trim()
                          ? `Không có liệu trình nào khớp với từ khóa "${searchTerm}".`
                          : 'Chưa có gói liệu trình nào được đăng ký.'}
                      </p>
                      {searchTerm.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Xóa tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;

                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#F8F1E8]' : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {/* Col 1 */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-xs text-[#2C241E] whitespace-nowrap">
                          {pkg.name}
                        </div>
                        <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                          {pkg.price}
                        </div>
                      </td>

                      {/* Col 2 */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                          {pkg.purchaseDate}
                        </div>
                        <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                          {pkg.expiryDate}
                        </div>
                      </td>

                      {/* Col 3 */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                          {pkg.sessionsTotal} · {pkg.usedSessions} · {pkg.remainingSessions} buổi
                        </div>
                      </td>

                      {/* Col 4 */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium mb-1.5 whitespace-nowrap">
                          {pkg.progressLabel}
                        </div>
                        <div className="w-full bg-[#EFE4D9] h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pkg.progressPercent}%` }}
                            className="bg-[#985018] h-full rounded-full"
                          />
                        </div>
                      </td>

                      {/* Col 5 */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                          {pkg.branch}
                        </div>
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5E9DB] text-[#8A4F23] whitespace-nowrap">
                          {pkg.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
          <span className="whitespace-nowrap">Hiển thị {filteredPackages.length} / {packages.length} gói liệu trình</span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="p-1 rounded-md text-[#B0A294] border border-[#EFE4D9] opacity-50 cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-bold text-xs flex items-center justify-center">
              1
            </button>
            <button
              disabled
              className="p-1 rounded-md text-[#B0A294] border border-[#EFE4D9] opacity-50 cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Two Columns: Sessions History (Left) + Detail & Policy (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Sessions History */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <div>
            <h2 className="text-base font-bold text-[#2C241E]">
              Lịch sử buổi chăm sóc · {selectedPkg.name}
            </h2>
            <p className="text-xs text-[#73675F] mt-1">
              {selectedPkg.historySubtitle}
            </p>
          </div>

          {/* Session Cards List */}
          <div className="space-y-2.5 pt-1">
            {selectedPkg.sessionsHistory.map((s, idx) => {
              if (s.isUpcoming) {
                // Upcoming Session Card (Highlighted box)
                return (
                  <div
                    key={idx}
                    className="bg-[#F3E2CE] rounded-xl p-3.5 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#2C241E]">
                      Buổi {s.number} · {s.serviceName}
                    </div>
                    <div className="text-[11px] text-[#73675F]">
                      {s.bookingCode} · {s.date} · {s.time} · {s.staff} · {s.room}
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[#EFE1D2] text-[#73675F]">
                        {s.statusBadge}
                      </span>
                    </div>
                  </div>
                );
              }

              // Standard Past Session Pill
              return (
                <div
                  key={idx}
                  className="bg-[#F3E2CE] rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#EFE1D2] text-[#73675F]">
                    Đã hoàn thành
                  </span>
                  <span className="text-xs font-semibold text-[#2C241E]">
                    Buổi {s.number} · {s.date} · {s.serviceName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footnote below sessions */}
          <div className="text-xs text-[#73675F] pt-1">
            {selectedPkg.historyNote}
          </div>
        </div>

        {/* Right Column: Active Package Summary & Policy */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Selected Package Details */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-base font-bold text-[#2C241E]">
              Chi tiết gói liệu trình đang chọn
            </h2>

            {/* Customer Profile Snippet */}
            <div className="flex items-center gap-3 pt-0.5">
              <img
                src={selectedCustomer?.avatarUrl || "/avatar_minh_anh.png"}
                alt={selectedCustomer?.fullName || "Khách hàng"}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EFE4D9]"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2C241E] truncate">
                  {selectedCustomer?.fullName || 'Khách hàng'}
                </div>
                <div className="text-[11px] text-[#73675F] truncate mt-0.5">
                  {selectedCustomer?.phone || ''} · Hội viên {selectedCustomer?.membershipTier || 'Thành viên'}
                </div>
              </div>
            </div>

            {/* Specs Breakdown */}
            <div className="space-y-2 text-xs text-[#73675F] pt-1">
              <div className="flex items-center justify-between">
                <span>Số buổi ban đầu</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedPkg.sessionsTotal} buổi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Đã hoàn thành</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedPkg.usedSessions} buổi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Còn sử dụng</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedPkg.remainingSessions} buổi
                </span>
              </div>
            </div>

            {/* Progress Section */}
            <div className="pt-1">
              <div className="text-xs font-semibold text-[#2C241E] mb-1.5">
                Tiến độ {selectedPkg.progressPercent}%
              </div>
              <div className="w-full bg-[#EFE4D9] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${selectedPkg.progressPercent}%` }}
                  className="bg-[#985018] h-full rounded-full"
                />
              </div>
            </div>

            {/* Expiry */}
            <div className="flex items-center justify-between text-xs text-[#73675F] pt-1">
              <span>Ngày hết hạn</span>
              <span className="font-semibold text-[#2C241E]">
                {selectedPkg.expiryDate}
              </span>
            </div>

            {/* Action Button */}
            <button
              onClick={() => toast.success('Hồ sơ điều trị', 'Đã ghi nhận buổi chăm sóc vào hồ sơ điều trị điện tử của khách hàng.')}
              className="w-full py-2.5 bg-white border border-[#D7BBA6] text-[#8A4F23] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs mt-2 cursor-pointer"
            >
              Ghi nhận buổi chăm sóc
            </button>
          </div>

          {/* Card 2: Session Ledger Policy */}
          <div className="bg-[#F3E2CE] rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-[#5A280C]">
              Chính sách sổ buổi
            </h3>
            <div className="space-y-2.5 text-xs text-[#50443D] leading-relaxed">
              <p>
                Chỉ cập nhật sau khi có xác nhận giao dịch phù hợp và ghi nhận hoàn thành của nhân sự được phân quyền.
              </p>
              <p>
                Lịch đã xác nhận trong tương lai không tự trừ buổi cho đến khi kỹ thuật viên hoàn tất check-out và ký xác nhận lâm sàng.
              </p>
            </div>
            <div className="text-[11px] text-[#8A4F23] font-medium pt-1">
              Đồng bộ dữ liệu thời gian thực
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#985018]" />
        <span>
          Hệ thống quản lý liệu trình & sổ buổi trị liệu chuyên sâu • MLD Vietnam Healthcare Admin.
        </span>
      </div>
    </div>
  );
};
