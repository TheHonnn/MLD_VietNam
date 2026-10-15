import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { treatmentService } from '../services';
import {
  TreatmentPackage as SharedTreatmentPackage,
  UserPackage,
  Service,
  TreatmentJournal,
} from '../types/shared_types';

interface TreatmentPackageUI {
  id: string;
  name: string;
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

  useEffect(() => {
    const fetchTreatmentData = async () => {
      try {
        const [pkgRes, upkgRes, srvRes, jrnRes] = await Promise.all([
          treatmentService.getTreatmentPackages(),
          treatmentService.getUserPackagesByCustomer('u-minhanh'),
          treatmentService.getServices(),
          treatmentService.getTreatmentJournalsByCustomer('u-minhanh'),
        ]);
        if (pkgRes.success) setLivePackages(pkgRes.data);
        if (upkgRes.success) setLiveUserPackages(upkgRes.data);
        if (srvRes.success) setLiveServices(srvRes.data);
        if (jrnRes.success) setLiveJournals(jrnRes.data);
      } catch (err) {
        console.error('Failed to load treatment data:', err);
      }
    };
    fetchTreatmentData();
  }, []);
  // Packages dataset matching Figma design
  const packages: TreatmentPackageUI[] = [
    {
      id: 'pkg-massage',
      name: 'Massage thư giãn · 10 buổi',
      sessionsTotal: 10,
      price: '4.000.000đ',
      purchaseDate: '01/09/2026',
      expiryDate: '31/12/2026',
      usedSessions: 4,
      remainingSessions: 6,
      progressPercent: 40,
      progressLabel: '40% đã dùng',
      branch: 'Quận 3',
      status: 'Đang sử dụng',
      historySubtitle:
        'Số buổi mẫu, tách riêng dịch vụ massage thanh toán 450.000đ ngày 08/10/2026.',
      historyNote:
        'Buổi 05 chưa hoàn thành nên vẫn còn 6 buổi, chưa khấu trừ trước.',
      sessionsHistory: [
        { number: '01', date: '10/09/2026', serviceName: 'Massage thư giãn' },
        { number: '02', date: '20/09/2026', serviceName: 'Massage thư giãn' },
        { number: '03', date: '01/10/2026', serviceName: 'Massage thư giãn' },
        { number: '04', date: '08/10/2026', serviceName: 'Massage thư giãn' },
        {
          number: '05',
          date: '15/10/2026',
          serviceName: 'Lịch sắp tới',
          isUpcoming: true,
          bookingCode: 'SPA-DEMO-PKG-000129',
          time: '09:00–10:00',
          staff: 'Trần Minh Phương',
          room: 'Phòng 01, Quận 3.',
          statusBadge: 'Đã xác nhận (mô phỏng)',
        },
      ],
    },
    {
      id: 'pkg-skincare',
      name: 'Chăm sóc da · 8 buổi',
      sessionsTotal: 8,
      price: '3.600.000đ',
      purchaseDate: '05/10/2026',
      expiryDate: '31/12/2026',
      usedSessions: 3,
      remainingSessions: 5,
      progressPercent: 37.5,
      progressLabel: '37,5% đã dùng',
      branch: 'Quận 3',
      status: 'Đang sử dụng',
      historySubtitle:
        'Số buổi mẫu, cập nhật theo các lượt liệu trình chăm sóc da định kỳ.',
      historyNote:
        'Buổi tiếp theo dự kiến đặt sau khi hoàn thành đợt hồi phục da.',
      sessionsHistory: [
        { number: '01', date: '06/10/2026', serviceName: 'Chăm sóc da Hydrafacial' },
        { number: '02', date: '13/10/2026', serviceName: 'Chăm sóc da Hydrafacial' },
        { number: '03', date: '20/10/2026', serviceName: 'Điện di Vitamin C' },
      ],
    },
  ];

  // Default selected package is Massage 10 sessions (matches Figma mockup 100%)
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pkg-massage');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedPkg =
    packages.find((p) => p.id === selectedPkgId) || packages[0];

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Quản lý liệu trình
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Số buổi chăm sóc · Tài khoản mẫu Nguyễn Minh Anh / WM-000128
          </p>
        </div>
        <button
          onClick={() => alert('Chức năng Đặt buổi tiếp theo (minh họa)')}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
        >
          Đặt buổi tiếp theo
        </button>
      </div>

      {/* 2. Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Gói đang sử dụng</span>
            <Leaf className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[32px] font-extrabold text-[#2C241E] leading-none mt-2">
            2
          </div>
          <div className="text-[11px] text-[#73675F] mt-2">
            Chỉ tài khoản Nguyễn Minh Anh
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Buổi còn lại</span>
            <Calendar className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[32px] font-extrabold text-[#2C241E] leading-none mt-2">
            11
          </div>
          <div className="text-[11px] text-[#73675F] mt-2">
            6 massage + 5 chăm sóc da
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Buổi đã sử dụng</span>
            <SlidersHorizontal className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[32px] font-extrabold text-[#2C241E] leading-none mt-2">
            7
          </div>
          <div className="text-[11px] text-[#73675F] mt-2">
            4 massage + 3 chăm sóc da
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3">
        {/* Search input */}
        <div className="flex-1 min-w-[260px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách hàng, mã gói hoặc tên liệu trình..."
            className="w-full px-4 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Dropdown 1 */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Tất cả loại gói</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 2 */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Đang sử dụng</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 3 */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Hạn đến 31/12/2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 4. Packages Table Card */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Table Header Row */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EFE4D9]">
          <h2 className="text-base font-bold text-[#2C241E]">
            Gói liệu trình · Nguyễn Minh Anh
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F5E9DB] text-[#8A4F23]">
            2 bản ghi mẫu
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold">
                <th className="py-3 px-5">Gói / giá mua</th>
                <th className="py-3 px-5">Ngày mua / hết hạn</th>
                <th className="py-3 px-5">Tổng · đã dùng · còn</th>
                <th className="py-3 px-5 w-44">Tiến độ</th>
                <th className="py-3 px-5">Cơ sở / trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {packages.map((pkg) => {
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
                    <td className="py-4 px-5">
                      <div className="font-bold text-xs text-[#2C241E]">
                        {pkg.name}
                      </div>
                      <div className="text-[11px] text-[#73675F] mt-0.5">
                        {pkg.price}
                      </div>
                    </td>

                    {/* Col 2 */}
                    <td className="py-4 px-5">
                      <div className="text-xs text-[#2C241E] font-medium">
                        {pkg.purchaseDate}
                      </div>
                      <div className="text-[11px] text-[#73675F] mt-0.5">
                        {pkg.expiryDate}
                      </div>
                    </td>

                    {/* Col 3 */}
                    <td className="py-4 px-5">
                      <div className="text-xs text-[#2C241E] font-medium">
                        {pkg.sessionsTotal} · {pkg.usedSessions} · {pkg.remainingSessions} buổi
                      </div>
                    </td>

                    {/* Col 4 */}
                    <td className="py-4 px-5">
                      <div className="text-xs text-[#2C241E] font-medium mb-1.5">
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
                    <td className="py-4 px-5">
                      <div className="text-xs text-[#2C241E] font-medium">
                        {pkg.branch}
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#F5E9DB] text-[#8A4F23]">
                        {pkg.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
          <span>Hiển thị 2 / 2 bản ghi minh họa</span>
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
              {selectedPkg.id === 'pkg-massage'
                ? 'Lịch sử buổi chăm sóc · Gói massage'
                : 'Lịch sử buổi chăm sóc · Gói chăm sóc da'}
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
                    Hoàn thành mẫu
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
              {selectedPkg.id === 'pkg-massage'
                ? 'Gói massage đang chọn'
                : 'Gói chăm sóc da đang chọn'}
            </h2>

            {/* Customer Profile Snippet */}
            <div className="flex items-center gap-3 pt-0.5">
              <img
                src="/avatar_minh_anh.png"
                alt="Nguyễn Minh Anh"
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EFE4D9]"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2C241E] truncate">
                  Nguyễn Minh Anh
                </div>
                <div className="text-[11px] text-[#73675F] truncate mt-0.5">
                  WM-000128 · Hội viên Vàng
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
              onClick={() => alert('Ghi nhận buổi chăm sóc (minh họa)')}
              className="w-full py-2.5 bg-white border border-[#D7BBA6] text-[#8A4F23] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs mt-2"
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
                Lịch đã xác nhận trong tương lai không tự trừ buổi. Chính sách thời hạn, đổi lịch và phạm vi sử dụng đều là minh họa.
              </p>
            </div>
            <div className="text-[11px] text-[#8A4F23] font-medium pt-1">
              Không cập nhật dữ liệu thực tế
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#985018]" />
        <span>
          Dữ liệu minh họa · Các thao tác chỉ là giao diện tĩnh, không thay đổi dữ liệu hay thực hiện giao dịch.
        </span>
      </div>
    </div>
  );
};
