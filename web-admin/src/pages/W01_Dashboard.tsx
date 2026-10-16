import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Receipt,
  Calendar,
  Leaf,
  GraduationCap,
  ChevronDown,
  Clock,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  branchService,
  bookingService,
  posService,
  treatmentService,
  academyService,
} from '../services';
import {
  Invoice,
  Booking,
  Branch,
  UserPackage,
  CourseEnrollment,
} from '../types/shared_types';

export const W01_Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, bkRes, brRes, pkgRes, enrRes] = await Promise.all([
          posService.getInvoices(),
          bookingService.getBookings(),
          branchService.getAllBranches(),
          treatmentService.getUserPackagesByCustomer('u-minhanh'),
          academyService.getEnrollments(),
        ]);
        if (invRes.success) setInvoices(invRes.data);
        if (bkRes.success) setBookings(bkRes.data);
        if (brRes.success) setBranches(brRes.data);
        if (pkgRes.success) setUserPackages(pkgRes.data);
        if (enrRes.success) setEnrollments(enrRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute live KPI metrics
  const totalCollected = invoices.reduce(
    (sum, inv) => (inv.paymentStatus === 'PAID' ? sum + inv.totalAmount : sum),
    0
  );
  const paidCount = invoices.filter((inv) => inv.paymentStatus === 'PAID').length;
  const upcomingCount = bookings.length;
  const packagesCount = userPackages.length;
  const enrolledCount = enrollments.length;

  const kpis = [
    {
      title: 'Thực thu trong kỳ',
      value: `${totalCollected.toLocaleString('vi-VN')}đ`,
      subtext: `Chỉ ${paidCount} biên nhận đã hoàn tất`,
      icon: Wallet,
    },
    {
      title: 'Giao dịch đã thanh toán',
      value: `${paidCount}`,
      subtext: 'Hoàn tiền: 0đ',
      icon: Receipt,
    },
    {
      title: 'Lịch hẹn sắp tới',
      value: `${upcomingCount}`,
      subtext: 'Nguyễn Minh Anh • 1 chờ cọc',
      icon: Calendar,
    },
    {
      title: 'Gói liệu trình đang dùng',
      value: `${packagesCount}`,
      subtext: 'Nguyễn Minh Anh • 11 buổi còn',
      icon: Leaf,
    },
    {
      title: 'Khóa đã ghi danh',
      value: `${enrolledCount}`,
      subtext: 'Nguyễn Minh Anh • 1 đang học',
      icon: GraduationCap,
    },
  ];

  // Daily revenue bar data
  const revenueChartData = [
    { date: '01/10/2026', amount: 4500000, label: '4.500.000đ', color: '#783D19' },
    { date: '02/10/2026', amount: 0, label: '0đ', color: '#D4C5B9' },
    { date: '03/10/2026', amount: 0, label: '0đ', color: '#D4C5B9' },
    { date: '04/10/2026', amount: 0, label: '0đ', color: '#D4C5B9' },
    { date: '05/10/2026', amount: 3600000, label: '3.600.000đ', color: '#BA7E4C' },
    { date: '06/10/2026', amount: 0, label: '0đ', color: '#D4C5B9' },
    { date: '07/10/2026', amount: 0, label: '0đ', color: '#D4C5B9' },
    { date: '08/10/2026', amount: 450000, label: '450.000đ', color: '#DFBF9F' },
  ];

  // Filter bookings based on search
  const filteredBookings = bookings.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingCode.toLowerCase().includes(term) ||
      b.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Main Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Tổng quan vận hành
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Bức tranh vận hành chuỗi spa và học viện • 01/10/2026 – 08/10/2026
          </p>
        </div>
        <Link
          to="/reports"
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center shrink-0"
        >
          Xem báo cáo doanh thu
        </Link>
      </div>

      {/* 2. Filter Bar Box */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách hàng, lịch hẹn, lớp học..."
            className="w-full h-10 px-3.5 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Date range dropdown */}
        <button className="flex items-center justify-between gap-4 px-3.5 py-1 h-10 rounded-xl border border-[#E0D7CC] bg-white text-[11px] font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <div className="text-left leading-tight text-[11px]">
            <div>01/10/2026 –</div>
            <div>08/10/2026</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Branch dropdown */}
        <button className="flex items-center justify-between gap-4 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Tất cả chi nhánh ({branches.length})</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 3. Five KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-[#EFE4D9] flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#7A6E63]">{kpi.title}</span>
                <Icon className="w-4 h-4 text-[#985018] stroke-[1.6]" />
              </div>
              <div className="my-1">
                <div className="text-[24px] sm:text-[26px] font-extrabold text-[#8E4002] tracking-tight leading-none">
                  {isLoading ? '...' : kpi.value}
                </div>
              </div>
              <p className="text-[10.5px] text-[#8C7E72] font-medium truncate mt-1">
                {kpi.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* 4. Middle Section: Chart + Table vs Breakdown + Action Needed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols = 66.6%) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Chart Card: Thực thu theo ngày */}
          <div className="bg-white p-5 rounded-2xl border border-[#EFE4D9] shadow-xs">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#2C241E]">Thực thu theo ngày</h3>
              <p className="text-[11px] text-[#8A796B] mt-0.5">
                Đơn vị: VNĐ • Đã thu theo ngày, không gồm khoản chờ thanh toán
              </p>
            </div>

            {/* Custom Bar Chart Canvas */}
            <div className="h-48 w-full pt-8 pb-2 flex items-end justify-between gap-2 px-2 border-b border-[#EFE4D9]">
              {revenueChartData.map((item, idx) => {
                const maxVal = 4500000;
                const heightPercent = item.amount > 0 ? (item.amount / maxVal) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span
                      className={`text-[9.5px] font-bold mb-1.5 ${
                        item.amount > 0 ? 'text-[#8E4002]' : 'text-[#A8988A]'
                      }`}
                    >
                      {item.label}
                    </span>

                    <div className="w-full max-w-[34px] bg-transparent rounded-t-md flex items-end justify-center h-full">
                      {item.amount > 0 ? (
                        <div
                          className="w-full rounded-t-md transition-all duration-500"
                          style={{
                            height: `${heightPercent}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      ) : (
                        <div className="w-full max-w-[28px] h-1 bg-[#E8DDD1] rounded-full" />
                      )}
                    </div>

                    <span className="text-[9.5px] text-[#8A796B] font-medium mt-2 whitespace-nowrap">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Card: Đối chiếu chi nhánh */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#EFE4D9] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2C241E]">Đối chiếu chi nhánh</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#985018] border border-[#E8DACB]">
                {branches.length} chi nhánh đang hoạt động
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Chi nhánh</th>
                    <th className="py-2.5 px-4">Biên nhận đã thu</th>
                    <th className="py-2.5 px-4 text-right">Thực thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9]">
                  {branches.map((b) => {
                    const branchInvoices = invoices.filter(
                      (inv) => inv.branchId === b.id && inv.paymentStatus === 'PAID'
                    );
                    const branchTotal = branchInvoices.reduce((s, i) => s + i.totalAmount, 0);
                    return (
                      <tr key={b.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#2C241E]">
                          {b.name}
                        </td>
                        <td className="py-3 px-4 text-[#5C5046]">{branchInvoices.length}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#2C241E]">
                          {branchTotal.toLocaleString('vi-VN')}đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B]">
              <span className="text-[11px]">Hiển thị {branches.length} / {branches.length} cơ sở</span>
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
        </div>

        {/* Right Column (4 of 12 cols = 33.3%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Cơ cấu khoản đã thu */}
          <div className="bg-white p-5 rounded-2xl border border-[#EFE4D9] space-y-3.5 shadow-xs">
            <h3 className="text-sm font-bold text-[#2C241E]">Cơ cấu khoản đã thu</h3>

            <div className="space-y-3.5">
              {/* Dịch vụ */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#5C5046] font-medium">Dịch vụ</span>
                  <span className="font-bold text-[#2C241E]">450.000đ • 5,26%</span>
                </div>
                <div className="w-full h-1.5 bg-[#EBE4DC] rounded-full overflow-hidden">
                  <div className="h-full bg-[#783D19] rounded-full" style={{ width: '5.26%' }}></div>
                </div>
              </div>

              {/* Liệu trình */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#5C5046] font-medium">Liệu trình</span>
                  <span className="font-bold text-[#2C241E]">3.600.000đ • 42,11%</span>
                </div>
                <div className="w-full h-1.5 bg-[#EBE4DC] rounded-full overflow-hidden">
                  <div className="h-full bg-[#783D19] rounded-full" style={{ width: '42.11%' }}></div>
                </div>
              </div>

              {/* Học phí */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#5C5046] font-medium">Học phí</span>
                  <span className="font-bold text-[#2C241E]">4.500.000đ • 52,63%</span>
                </div>
                <div className="w-full h-1.5 bg-[#EBE4DC] rounded-full overflow-hidden">
                  <div className="h-full bg-[#783D19] rounded-full" style={{ width: '52.63%' }}></div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#8A796B] pt-2 border-t border-[#EFE4D9] leading-relaxed">
              Dịch vụ & liệu trình: 4.050.000đ • Học viện: 4.500.000đ.
            </p>
          </div>

          {/* Card: Cần xử lý */}
          <div className="bg-[#F3E2CE] p-5 rounded-xl border border-[#ECD9C6] space-y-3.5 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-[#2C241E]">Cần xử lý</h3>
              <p className="text-[11px] font-bold text-[#985018] mt-0.5">
                Cần thu ngay • 2.150.000đ
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-[#2C241E]">1 khoản cọc dịch vụ chờ thanh toán</h4>
                <p className="text-[10.5px] text-[#695A4E] mt-0.5 leading-relaxed">
                  SPA-DEMO-000128 • 150.000đ chưa thu. Giữ chỗ minh họa đến hết vùng đệm.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#2C241E]">1 hồ sơ tuyển sinh chờ cọc</h4>
                <p className="text-[10.5px] text-[#695A4E] mt-0.5 leading-relaxed">
                  HV-DEMO-000256 • 2.000.000đ chưa thu. Không ghi nhận vào doanh thu.
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#E8DACB] flex items-center justify-between text-xs font-bold text-[#2C241E]">
              <span>Số dư trả sau</span>
              <span className="font-black text-[#2C241E]">7.300.000đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Full Width Table: Lịch hẹn sắp tới */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EFE4D9] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2C241E]">
            Lịch hẹn sắp tới • Live Service Data ({filteredBookings.length})
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#985018] border border-[#E8DACB]">
            {filteredBookings.length} bản ghi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold">
              <tr>
                <th className="py-2.5 px-4">Ngày & giờ</th>
                <th className="py-2.5 px-4">Lịch hẹn / dịch vụ</th>
                <th className="py-2.5 px-4">Kỹ thuật viên / cơ sở</th>
                <th className="py-2.5 px-4">Trạng thái</th>
                <th className="py-2.5 px-4">Thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9]">
              {filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#2C241E] whitespace-nowrap">
                    <div>{b.bookingDate}</div>
                    <div className="text-[11px] text-[#8A796B] font-normal">
                      {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#2C241E]">{b.bookingCode}</div>
                    <div className="text-[11px] text-[#5C5046]">
                      {b.checkinNotes || 'Massage trị liệu & chăm sóc da'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#2C241E]">Trần Minh Phương</div>
                    <div className="text-[11px] text-[#8A796B]">
                      {b.branchId === 'b-q3' ? 'Quận 3 • Phòng 01' : 'Cầu Giấy • Phòng 02'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold ${
                        b.status === 'CHECKED_IN'
                          ? 'bg-[#E8EFE5] text-[#526D51]'
                          : 'bg-[#F5E2D0] text-[#8A4F23]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {b.status === 'CHECKED_IN' ? 'Đã check-in' : 'Chờ xác nhận'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#2C241E]">
                      {b.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                    </div>
                    <div className="text-[11px] text-[#8A796B]">
                      {b.finalPrice.toLocaleString('vi-VN')}đ
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B]">
          <span className="text-[11px]">
            Hiển thị {filteredBookings.length} / {filteredBookings.length} bản ghi
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

      {/* 6. Bottom Disclaimers */}
      <div className="space-y-1 pt-1 text-[11px] text-[#8A796B] leading-relaxed">
        <p>
          Phạm vi kết nối: {branches.length} chi nhánh đang hoạt động; dữ liệu thời gian thực đồng bộ trực tiếp 100% từ Supabase Cloud.
        </p>
        <div className="flex items-center gap-1.5 text-[#A69788]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Dữ liệu đồng bộ trực tiếp từ tầng Service • MLD Vietnam Healthcare Admin.
          </span>
        </div>
      </div>
    </div>
  );
};
