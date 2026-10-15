import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Receipt,
  RotateCcw,
  Wallet,
  Clock,
  CheckCircle2,
  X,
  Download,
} from 'lucide-react';
import { posService, academyService } from '../services';
import { Invoice, TuitionTransaction, StudentCertificate } from '../types/shared_types';

interface CompletedInvoice {
  id: string;
  code: string;
  date: string;
  description: string;
  method: string;
  methodType: 'pos' | 'online' | 'bank';
  category: 'service' | 'package' | 'course';
  amountNumber: number;
  amount: string;
  statusText: string;
}

interface ReceivableItem {
  id: string;
  code: string;
  description: string;
  totalContract: string;
  dueNow: string;
  remainingAfter: string;
  statusText: string;
}

const completedInvoicesData: CompletedInvoice[] = [
  {
    id: 'inv-1',
    code: 'MH-DV-1008',
    date: '08/10/2026',
    description: 'Massage thư giãn toàn thân',
    method: 'Thanh toán tại cơ sở',
    methodType: 'pos',
    category: 'service',
    amountNumber: 450000,
    amount: '450.000đ',
    statusText: 'Đã thanh toán (minh họa)',
  },
  {
    id: 'inv-2',
    code: 'MH-LT-1005',
    date: '05/10/2026',
    description: 'Gói chăm sóc da 8 buổi',
    method: 'Thanh toán trực tuyến',
    methodType: 'online',
    category: 'package',
    amountNumber: 3600000,
    amount: '3.600.000đ',
    statusText: 'Đã thanh toán (minh họa)',
  },
  {
    id: 'inv-3',
    code: 'MH-HP-1001',
    date: '01/10/2026',
    description: 'Học phí khóa Kỹ thuật Spa Cơ bản',
    method: 'Chuyển khoản',
    methodType: 'bank',
    category: 'course',
    amountNumber: 4500000,
    amount: '4.500.000đ',
    statusText: 'Đã thanh toán (minh họa)',
  },
];

const receivableItemsData: ReceivableItem[] = [
  {
    id: 'rec-1',
    code: 'SPA-DEMO-000128',
    description: 'Massage · 12/10/2026 · Giữ chỗ minh họa',
    totalContract: '450.000đ',
    dueNow: '150.000đ',
    remainingAfter: '300.000đ',
    statusText: 'Chờ thanh toán',
  },
  {
    id: 'rec-2',
    code: 'HV-DEMO-000256',
    description: 'Kỹ thuật Massage Chuyên Nghiệp · MCN-1026',
    totalContract: '9.000.000đ',
    dueNow: '2.000.000đ',
    remainingAfter: '7.000.000đ',
    statusText: 'Chờ thanh toán',
  },
];

// Daily revenue chart bars
const dailyChartBars = [
  { date: '01/10/2026', amountText: '4.500.000đ', heightPx: 96, barColor: 'bg-[#8D4B1A]' },
  { date: '02/10/2026', amountText: '0đ', heightPx: 4, barColor: 'bg-[#D7BBA6]' },
  { date: '03/10/2026', amountText: '0đ', heightPx: 4, barColor: 'bg-[#D7BBA6]' },
  { date: '04/10/2026', amountText: '0đ', heightPx: 4, barColor: 'bg-[#D7BBA6]' },
  { date: '05/10/2026', amountText: '3.600.000đ', heightPx: 76, barColor: 'bg-[#BA7E4C]' },
  { date: '06/10/2026', amountText: '0đ', heightPx: 4, barColor: 'bg-[#D7BBA6]' },
  { date: '07/10/2026', amountText: '0đ', heightPx: 4, barColor: 'bg-[#D7BBA6]' },
  { date: '08/10/2026', amountText: '450.000đ', heightPx: 18, barColor: 'bg-[#EBD8C6]' },
];

export const W12_FinancialReports: React.FC = () => {
  const [dateRange, setDateRange] = useState('01/10/2026 – 08/10/2026');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [liveInvoices, setLiveInvoices] = useState<Invoice[]>([]);
  const [liveTuitionTrans, setLiveTuitionTrans] = useState<TuitionTransaction[]>([]);
  const [liveCertificates, setLiveCertificates] = useState<StudentCertificate[]>([]);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [invRes, ttRes, certRes] = await Promise.all([
          posService.getInvoices(),
          academyService.getTuitionTransactions(),
          academyService.getCertificates(),
        ]);
        if (invRes.success) setLiveInvoices(invRes.data);
        if (ttRes.success) setLiveTuitionTrans(ttRes.data);
        if (certRes.success) setLiveCertificates(certRes.data);
      } catch (err) {
        console.error('Failed to load financial reports data:', err);
      }
    };
    fetchReportsData();
  }, []);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Filter invoices
  const filteredInvoices = completedInvoicesData.filter((inv) => {
    const matchCategory =
      categoryFilter === 'all' || inv.category === categoryFilter;
    const matchMethod =
      methodFilter === 'all' || inv.methodType === methodFilter;
    return matchCategory && matchMethod;
  });

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#2C241E] text-white px-4 py-3 rounded-xl shadow-lg border border-[#D7BBA6] flex items-center gap-2.5 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#E29D62]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Header Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Báo cáo doanh thu</h1>
          <p className="text-xs text-[#73675F] mt-1">
            01/10/2026 – 08/10/2026 · Tất cả chi nhánh · Chỉ tính biên nhận hoàn tất
          </p>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Xuất báo cáo
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap md:flex-nowrap items-center gap-3">
        {/* Date Range Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Filter: Dịch vụ / gói / học phí */}
        <div className="relative shrink-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Dịch vụ / gói / học phí</option>
            <option value="service">Dịch vụ lẻ</option>
            <option value="package">Gói liệu trình</option>
            <option value="course">Học phí đào tạo</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả phương thức */}
        <div className="relative shrink-0">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả phương thức</option>
            <option value="pos">Tại cơ sở / tiền mặt</option>
            <option value="online">Cổng trực tuyến</option>
            <option value="bank">Chuyển khoản</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả chi nhánh */}
        <div className="relative shrink-0">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="quận 3">Quận 3</option>
            <option value="cầu giấy">Cầu Giấy</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 3. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Đã thu */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-medium text-[12.5px]">Đã thu</span>
            <Receipt className="w-4 h-4 text-[#8D4B1A] stroke-[1.8]" />
          </div>
          <div className="text-[26px] font-bold text-[#8D4B1A] tracking-tight mt-3">
            8.550.000đ
          </div>
          <div className="text-xs text-[#73675F] mt-3">
            3 biên nhận minh họa
          </div>
        </div>

        {/* KPI 2: Hoàn tiền */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-medium text-[12.5px]">Hoàn tiền</span>
            <RotateCcw className="w-4 h-4 text-[#8D4B1A] stroke-[1.8]" />
          </div>
          <div className="text-[26px] font-bold text-[#8D4B1A] tracking-tight mt-3">
            0đ
          </div>
          <div className="text-xs text-[#73675F] mt-3">
            Không có khoản hoàn trong kỳ
          </div>
        </div>

        {/* KPI 3: Thực thu */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-medium text-[12.5px]">Thực thu</span>
            <Wallet className="w-4 h-4 text-[#8D4B1A] stroke-[1.8]" />
          </div>
          <div className="text-[26px] font-bold text-[#8D4B1A] tracking-tight mt-3">
            8.550.000đ
          </div>
          <div className="text-xs text-[#73675F] mt-3">
            Đã trừ hoàn tiền
          </div>
        </div>

        {/* KPI 4: Cần thu ngay */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-medium text-[12.5px]">Cần thu ngay</span>
            <Clock className="w-4 h-4 text-[#8D4B1A] stroke-[1.8]" />
          </div>
          <div className="text-[26px] font-bold text-[#8D4B1A] tracking-tight mt-3">
            2.150.000đ
          </div>
          <div className="text-xs text-[#73675F] mt-3">
            Cọc chưa thu · Không là doanh thu
          </div>
        </div>
      </div>

      {/* 4. HÀNG 1: Thực thu từng ngày (8 cols) + Cơ cấu khoản đã thu (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card: Thực thu từng ngày (Bar Chart) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#2C241E]">
              Thực thu từng ngày
            </h2>
            <div className="text-xs text-[#73675F] mt-0.5">
              Đơn vị: VNĐ · Đã thu theo ngày, không gồm khoản chờ thanh toán
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="pt-6 pb-1">
            <div className="h-32 flex items-end justify-between gap-2 border-b border-[#EFE4D9] px-2 sm:px-6">
              {dailyChartBars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Amount label on top */}
                  <span className="text-[10px] text-[#73675F] font-semibold mb-1 group-hover:text-[#2C241E] transition-colors whitespace-nowrap">
                    {bar.amountText}
                  </span>
                  {/* Bar */}
                  <div
                    style={{ height: `${bar.heightPx}px` }}
                    className={`w-full max-w-[42px] ${bar.barColor} rounded-t-md transition-all duration-300 group-hover:opacity-90`}
                  />
                </div>
              ))}
            </div>

            {/* Date labels below bars */}
            <div className="flex justify-between gap-2 px-2 sm:px-6 pt-2">
              {dailyChartBars.map((bar, idx) => (
                <div key={idx} className="flex-1 text-center text-[10px] text-[#73675F]">
                  {bar.date}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card: Cơ cấu khoản đã thu */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-base font-bold text-[#2C241E]">
            Cơ cấu khoản đã thu
          </h2>

          <div className="space-y-4 text-xs my-auto py-2">
            {/* Dịch vụ */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Dịch vụ</span>
                <span className="text-[#2C241E] font-semibold">450.000đ · 5,26%</span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div className="bg-[#DEC6B0] h-full rounded-full" style={{ width: '5.26%' }} />
              </div>
            </div>

            {/* Liệu trình */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Liệu trình</span>
                <span className="text-[#2C241E] font-semibold">3.600.000đ · 42,11%</span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div className="bg-[#8D4B1A] h-full rounded-full" style={{ width: '42.11%' }} />
              </div>
            </div>

            {/* Học phí */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Học phí</span>
                <span className="text-[#2C241E] font-semibold">4.500.000đ · 52,63%</span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div className="bg-[#BA7E4C] h-full rounded-full" style={{ width: '52.63%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. HÀNG 2: Đối chiếu phương thức (8 cols) + So sánh chi nhánh (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card: Đối chiếu phương thức */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-base font-bold text-[#2C241E]">
            Đối chiếu phương thức
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs pt-3">
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tại cơ sở / tiền mặt mẫu</span>
              <span className="text-[#2C241E] font-semibold">450.000đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Chuyển khoản mẫu</span>
              <span className="text-[#2C241E] font-semibold">4.500.000đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Cổng trực tuyến mẫu</span>
              <span className="text-[#2C241E] font-semibold">3.600.000đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tổng</span>
              <span className="text-[#2C241E] font-bold">8.550.000đ</span>
            </div>
          </div>
        </div>

        {/* Card: So sánh chi nhánh */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <h2 className="text-base font-bold text-[#2C241E]">
            So sánh chi nhánh
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#73675F]">Quận 3 · 3 biên nhận</span>
              <span className="text-[#2C241E] font-semibold">8.550.000đ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#73675F]">Cầu Giấy · 0 biên nhận</span>
              <span className="text-[#2C241E] font-semibold">0đ</span>
            </div>
          </div>

          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Cầu Giấy chưa có biên nhận đã ghi trong tập mẫu, không phải đánh giá hiệu quả kinh doanh.
          </div>
        </div>
      </div>

      {/* 6. Card: 3 biên nhận đã hoàn tất · Nguyễn Minh Anh · Quận 3 */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-5 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2C241E]">
            3 biên nhận đã hoàn tất · Nguyễn Minh Anh · Quận 3
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
            {filteredInvoices.length} bản ghi mẫu
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                <th className="py-2.5 px-4 font-semibold">Biên nhận / ngày</th>
                <th className="py-2.5 px-4 font-semibold">Nội dung khoản thu</th>
                <th className="py-2.5 px-4 font-semibold">Phương thức</th>
                <th className="py-2.5 px-4 font-semibold">Số tiền</th>
                <th className="py-2.5 px-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9] text-xs">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                  {/* 1. Biên nhận / ngày */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-xs text-[#2C241E]">{inv.code}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">{inv.date}</div>
                  </td>

                  {/* 2. Nội dung khoản thu */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-[#2C241E]">{inv.description}</div>
                  </td>

                  {/* 3. Phương thức */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-[#2C241E]">{inv.method}</div>
                  </td>

                  {/* 4. Số tiền */}
                  <td className="py-3.5 px-4 font-semibold text-xs text-[#2C241E]">
                    {inv.amount}
                  </td>

                  {/* 5. Trạng thái */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#E8F5E9] text-[#2E7D32]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{inv.statusText}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
          <span>
            Hiển thị 3 / 3 biên nhận · Tổng: 8.550.000đ · Hoàn tiền: 0đ · Thực thu: 8.550.000đ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="w-6 h-6 rounded-md border border-[#EFE4D9] flex items-center justify-center text-[#A69788] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-semibold flex items-center justify-center text-xs">
              1
            </button>
            <button
              disabled
              className="w-6 h-6 rounded-md border border-[#EFE4D9] flex items-center justify-center text-[#A69788] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Card: Khoản phải thu · Tách khỏi doanh thu đã thu */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-5 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2C241E]">
            Khoản phải thu · Tách khỏi doanh thu đã thu
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
            {receivableItemsData.length} bản ghi mẫu
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                <th className="py-2.5 px-4 font-semibold">Hồ sơ / nội dung</th>
                <th className="py-2.5 px-4 font-semibold">Tổng hợp đồng</th>
                <th className="py-2.5 px-4 font-semibold">Cần thu ngay</th>
                <th className="py-2.5 px-4 font-semibold">Còn lại trả sau</th>
                <th className="py-2.5 px-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9] text-xs">
              {receivableItemsData.map((rec) => (
                <tr key={rec.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                  {/* Hồ sơ / nội dung */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-xs text-[#2C241E]">{rec.code}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">{rec.description}</div>
                  </td>

                  {/* Tổng hợp đồng */}
                  <td className="py-3.5 px-4 font-semibold text-xs text-[#2C241E]">
                    {rec.totalContract}
                  </td>

                  {/* Cần thu ngay */}
                  <td className="py-3.5 px-4 font-semibold text-xs text-[#2C241E]">
                    {rec.dueNow}
                  </td>

                  {/* Còn lại trả sau */}
                  <td className="py-3.5 px-4 font-semibold text-xs text-[#2C241E]">
                    {rec.remainingAfter}
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F5EADF] text-[#8A4F23]">
                      <Clock className="w-3.5 h-3.5 stroke-[2]" />
                      <span>{rec.statusText}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
          <span>
            2 / 2 khoản phải thu · Tổng hợp đồng mở: 9.450.000đ = cần thu ngay 2.150.000đ + trả sau 7.300.000đ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="w-6 h-6 rounded-md border border-[#EFE4D9] flex items-center justify-center text-[#A69788] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-semibold flex items-center justify-center text-xs">
              1
            </button>
            <button
              disabled
              className="w-6 h-6 rounded-md border border-[#EFE4D9] flex items-center justify-center text-[#A69788] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 8. Explanatory Note Above Footer */}
      <div className="text-[11px] text-[#73675F] leading-relaxed">
        Dữ liệu minh họa — không phải sổ sách thực tế. Không có giao dịch ngân hàng trực tiếp. Học phí Kỹ thuật Spa Cơ bản đã thu đang chờ xếp lớp; khác với khóa Massage Cơ Bản đã hoàn thành. Báo giá khách tư vấn chưa có hợp đồng không được tính vào công nợ.
      </div>

      {/* 9. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>
          Dữ liệu minh họa · Các thao tác chỉ là giao diện tĩnh, không thay đổi dữ liệu hay thực hiện giao dịch.
        </span>
      </div>

      {/* MODAL: Xuất báo cáo */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Xuất báo cáo doanh thu</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Trích xuất dữ liệu tài chính định dạng Excel / PDF</p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsExportModalOpen(false);
                showToast('Đã xuất báo cáo doanh thu thành công!');
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Khoảng thời gian báo cáo</label>
                <input
                  type="text"
                  defaultValue={dateRange}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Định dạng tệp xuất</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="p-3 border-2 border-[#8D4B1A] bg-[#FAF5EF] rounded-xl flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="format" defaultChecked className="accent-[#8D4B1A]" />
                    <span className="font-semibold text-[#2C241E]">Bảng tính Excel (.xlsx)</span>
                  </label>
                  <label className="p-3 border border-[#EFE4D9] hover:bg-[#FAF8F5] rounded-xl flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="format" className="accent-[#8D4B1A]" />
                    <span className="font-semibold text-[#2C241E]">Bản in PDF (.pdf)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Phạm vi dữ liệu</label>
                <div className="p-3 bg-[#FAF5EF] rounded-xl border border-[#EFE4D9] space-y-1 text-[#73675F]">
                  <div>• Tổng thực thu trong kỳ: 8.550.000đ (3 biên nhận)</div>
                  <div>• Tổng công nợ cần thu ngay: 2.150.000đ</div>
                  <div>• Chi nhánh: Quận 3 và Cầu Giấy</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải báo cáo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
