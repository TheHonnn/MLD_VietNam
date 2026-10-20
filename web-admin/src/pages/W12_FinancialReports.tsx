import React, { useState, useEffect, useMemo } from 'react';
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
import { posService, academyService, bookingService, branchService } from '../services';
import {
  Invoice,
  TuitionTransaction,
  StudentCertificate,
  Booking,
  Branch,
} from '../types/shared_types';

interface CompletedInvoice {
  id: string;
  code: string;
  date: string;
  dateKey: string;
  description: string;
  method: string;
  methodType: 'pos' | 'online' | 'bank';
  category: 'service' | 'package' | 'course';
  amountNumber: number;
  amount: string;
  statusText: string;
  branchId: string;
}

interface ReceivableItem {
  id: string;
  code: string;
  description: string;
  totalContractNumber: number;
  totalContract: string;
  dueNowNumber: number;
  dueNow: string;
  remainingAfter: string;
  statusText: string;
}

interface DailyRevenueBar {
  date: string;
  amountNumber: number;
  amountText: string;
  heightPx: number;
  barColor: string;
}

export const W12_FinancialReports: React.FC = () => {
  const [dateRange, setDateRange] = useState('Tháng 10/2026');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [liveInvoices, setLiveInvoices] = useState<Invoice[]>([]);
  const [liveTuitionTrans, setLiveTuitionTrans] = useState<TuitionTransaction[]>([]);
  const [liveCertificates, setLiveCertificates] = useState<StudentCertificate[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [liveBranches, setLiveBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [invRes, ttRes, certRes, bkRes, brRes] = await Promise.all([
          posService.getInvoices(),
          academyService.getTuitionTransactions(),
          academyService.getCertificates(),
          bookingService.getBookings(),
          branchService.getAllBranches(),
        ]);
        if (invRes.success) setLiveInvoices(invRes.data);
        if (ttRes.success) setLiveTuitionTrans(ttRes.data);
        if (certRes.success) setLiveCertificates(certRes.data);
        if (bkRes.success) setLiveBookings(bkRes.data);
        if (brRes.success) setLiveBranches(brRes.data);
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

  // 1. Dynamic Completed Invoices
  const completedInvoicesData: CompletedInvoice[] = useMemo(() => {
    const list: CompletedInvoice[] = [];

    // From Invoices
    liveInvoices
      .filter((inv) => inv.paymentStatus === 'PAID')
      .forEach((inv) => {
        const d = inv.paidAt ? new Date(inv.paidAt) : new Date();
        const dateStr = d.toLocaleDateString('vi-VN');
        const dateKey = d.toISOString().split('T')[0];

        const isPackage = inv.userPackageId || inv.subtotal >= 2000000;
        const category: 'service' | 'package' | 'course' = isPackage ? 'package' : 'service';
        const methodType: 'pos' | 'online' | 'bank' =
          inv.paymentMethod === 'MOMO'
            ? 'online'
            : inv.paymentMethod === 'BANK_TRANSFER'
            ? 'bank'
            : 'pos';
        const method =
          inv.paymentMethod === 'MOMO'
            ? 'Ví điện tử MoMo'
            : inv.paymentMethod === 'BANK_TRANSFER'
            ? 'Chuyển khoản QR'
            : 'Thanh toán tại cơ sở';

        list.push({
          id: inv.id,
          code: inv.invoiceCode,
          date: dateStr,
          dateKey,
          description: isPackage
            ? 'Gói liệu trình chăm sóc da 8 buổi'
            : 'Dịch vụ Massage trị liệu & chăm sóc da',
          method,
          methodType,
          category,
          amountNumber: inv.totalAmount,
          amount: `${inv.totalAmount.toLocaleString('vi-VN')}đ`,
          statusText: 'Đã thanh toán',
          branchId: inv.branchId,
        });
      });

    // From Tuition Transactions
    liveTuitionTrans
      .filter((tt) => tt.paymentStatus === 'PAID')
      .forEach((tt) => {
        const d = tt.paidAt ? new Date(tt.paidAt) : tt.dueDate ? new Date(tt.dueDate) : new Date();
        const dateStr = d.toLocaleDateString('vi-VN');
        const dateKey = d.toISOString().split('T')[0];

        const methodType: 'pos' | 'online' | 'bank' =
          tt.paymentMethod === 'MOMO'
            ? 'online'
            : tt.paymentMethod === 'BANK_TRANSFER'
            ? 'bank'
            : 'pos';
        const method =
          tt.paymentMethod === 'MOMO'
            ? 'Ví điện tử MoMo'
            : tt.paymentMethod === 'BANK_TRANSFER'
            ? 'Chuyển khoản QR'
            : 'Thanh toán tại cơ sở';

        list.push({
          id: tt.id,
          code: tt.transactionCode,
          date: dateStr,
          dateKey,
          description: tt.notes || 'Học phí đào tạo kỹ thuật viên',
          method,
          methodType,
          category: 'course',
          amountNumber: tt.amount,
          amount: `${tt.amount.toLocaleString('vi-VN')}đ`,
          statusText: 'Đã thanh toán',
          branchId: tt.branchId,
        });
      });

    return list;
  }, [liveInvoices, liveTuitionTrans]);

  // 2. Dynamic Receivable Items
  const receivableItemsData: ReceivableItem[] = useMemo(() => {
    const list: ReceivableItem[] = [];

    // Pending/Unpaid Bookings
    liveBookings
      .filter((b) => b.paymentStatus === 'UNPAID' || b.status === 'PENDING')
      .forEach((b) => {
        const price = b.finalPrice || 390000;
        list.push({
          id: b.id,
          code: b.bookingCode,
          description: `Massage trị liệu · ${b.bookingDate || '16/10/2026'} · Chờ quyết toán tại quầy`,
          totalContractNumber: price,
          totalContract: `${price.toLocaleString('vi-VN')}đ`,
          dueNowNumber: price,
          dueNow: `${price.toLocaleString('vi-VN')}đ`,
          remainingAfter: '0đ',
          statusText: 'Chờ thanh toán',
        });
      });

    // Unpaid Tuitions
    liveTuitionTrans
      .filter((tt) => tt.paymentStatus !== 'PAID')
      .forEach((tt) => {
        list.push({
          id: tt.id,
          code: tt.transactionCode,
          description: tt.notes || 'Học phí đào tạo kỹ thuật viên · Đợt nộp tiếp theo',
          totalContractNumber: tt.amount,
          totalContract: `${tt.amount.toLocaleString('vi-VN')}đ`,
          dueNowNumber: tt.amount,
          dueNow: `${tt.amount.toLocaleString('vi-VN')}đ`,
          remainingAfter: '0đ',
          statusText: 'Chờ thanh toán',
        });
      });

    return list;
  }, [liveBookings, liveTuitionTrans]);

  // 3. Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return completedInvoicesData.filter((inv) => {
      const matchCategory =
        categoryFilter === 'all' || inv.category === categoryFilter;
      const matchMethod =
        methodFilter === 'all' || inv.methodType === methodFilter;

      let matchBranch = true;
      if (branchFilter === 'quận 3') {
        matchBranch = inv.branchId.includes('0001');
      } else if (branchFilter === 'quận 1') {
        matchBranch = inv.branchId.includes('0002');
      }

      return matchCategory && matchMethod && matchBranch;
    });
  }, [completedInvoicesData, categoryFilter, methodFilter, branchFilter]);

  // 4. Financial KPI Aggregates
  const totalCollected = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.amountNumber, 0);
  }, [filteredInvoices]);

  const totalRefund = 0;
  const netRevenue = totalCollected - totalRefund;

  const totalReceivables = useMemo(() => {
    return receivableItemsData.reduce((sum, rec) => sum + rec.dueNowNumber, 0);
  }, [receivableItemsData]);

  const totalContractOpen = useMemo(() => {
    return receivableItemsData.reduce((sum, rec) => sum + rec.totalContractNumber, 0);
  }, [receivableItemsData]);

  // 5. Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const serviceTotal = filteredInvoices
      .filter((i) => i.category === 'service')
      .reduce((sum, i) => sum + i.amountNumber, 0);
    const packageTotal = filteredInvoices
      .filter((i) => i.category === 'package')
      .reduce((sum, i) => sum + i.amountNumber, 0);
    const courseTotal = filteredInvoices
      .filter((i) => i.category === 'course')
      .reduce((sum, i) => sum + i.amountNumber, 0);

    const sPct = totalCollected > 0 ? ((serviceTotal / totalCollected) * 100).toFixed(1) : '0';
    const pPct = totalCollected > 0 ? ((packageTotal / totalCollected) * 100).toFixed(1) : '0';
    const cPct = totalCollected > 0 ? ((courseTotal / totalCollected) * 100).toFixed(1) : '0';

    return {
      serviceTotal,
      packageTotal,
      courseTotal,
      sPct,
      pPct,
      cPct,
    };
  }, [filteredInvoices, totalCollected]);

  // 6. Payment Method Breakdown
  const methodBreakdown = useMemo(() => {
    const posTotal = filteredInvoices
      .filter((i) => i.methodType === 'pos')
      .reduce((sum, i) => sum + i.amountNumber, 0);
    const bankTotal = filteredInvoices
      .filter((i) => i.methodType === 'bank')
      .reduce((sum, i) => sum + i.amountNumber, 0);
    const onlineTotal = filteredInvoices
      .filter((i) => i.methodType === 'online')
      .reduce((sum, i) => sum + i.amountNumber, 0);

    return {
      posTotal,
      bankTotal,
      onlineTotal,
    };
  }, [filteredInvoices]);

  // 7. Branch Comparison
  const branchComparison = useMemo(() => {
    const q3Invoices = completedInvoicesData.filter((i) => i.branchId.includes('0001'));
    const q1Invoices = completedInvoicesData.filter((i) => i.branchId.includes('0002'));

    const q3Total = q3Invoices.reduce((sum, i) => sum + i.amountNumber, 0);
    const q1Total = q1Invoices.reduce((sum, i) => sum + i.amountNumber, 0);

    return {
      q3Count: q3Invoices.length,
      q3Total,
      q1Count: q1Invoices.length,
      q1Total,
    };
  }, [completedInvoicesData]);

  // 8. Daily Revenue Chart Bars
  const dailyChartBars: DailyRevenueBar[] = useMemo(() => {
    const days = [
      '10/10/2026',
      '11/10/2026',
      '12/10/2026',
      '13/10/2026',
      '14/10/2026',
      '15/10/2026',
      '16/10/2026',
    ];

    const dayTotals: Record<string, number> = {};
    days.forEach((d) => (dayTotals[d] = 0));

    completedInvoicesData.forEach((inv) => {
      if (dayTotals[inv.date] !== undefined) {
        dayTotals[inv.date] += inv.amountNumber;
      } else {
        // Fallback default to 16/10 if outside array
        dayTotals['16/10/2026'] = (dayTotals['16/10/2026'] || 0) + inv.amountNumber;
      }
    });

    const maxAmount = Math.max(...Object.values(dayTotals), 1);

    return days.map((date, idx) => {
      const amount = dayTotals[date] || 0;
      const height = amount > 0 ? Math.max(16, Math.round((amount / maxAmount) * 100)) : 4;
      const color =
        amount > 10000000
          ? 'bg-[#8D4B1A]'
          : amount > 2000000
          ? 'bg-[#BA7E4C]'
          : amount > 0
          ? 'bg-[#DEC6B0]'
          : 'bg-[#D7BBA6]';

      return {
        date,
        amountNumber: amount,
        amountText: amount > 0 ? `${(amount / 1000000).toFixed(1)}Tr` : '0đ',
        heightPx: height,
        barColor: color,
      };
    });
  }, [completedInvoicesData]);

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
            Tổng hợp dữ liệu đối soát trực tiếp · Toàn bộ hệ thống MLD Vietnam
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
            <option value="pos">Tại cơ sở / Tiền mặt</option>
            <option value="online">Cổng trực tuyến (MoMo)</option>
            <option value="bank">Chuyển khoản QR</option>
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
            <option value="quận 1">Quận 1</option>
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
            {totalCollected.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-xs text-[#73675F] mt-3">
            {filteredInvoices.length} biên nhận hoàn tất
          </div>
        </div>

        {/* KPI 2: Hoàn tiền */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span className="font-medium text-[12.5px]">Hoàn tiền</span>
            <RotateCcw className="w-4 h-4 text-[#8D4B1A] stroke-[1.8]" />
          </div>
          <div className="text-[26px] font-bold text-[#8D4B1A] tracking-tight mt-3">
            {totalRefund.toLocaleString('vi-VN')}đ
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
            {netRevenue.toLocaleString('vi-VN')}đ
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
            {totalReceivables.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-xs text-[#73675F] mt-3">
            {receivableItemsData.length} khoản công nợ / chờ quyết toán
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
                <span className="text-[#2C241E] font-semibold">
                  {categoryBreakdown.serviceTotal.toLocaleString('vi-VN')}đ · {categoryBreakdown.sPct}%
                </span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#DEC6B0] h-full rounded-full transition-all duration-300"
                  style={{ width: `${categoryBreakdown.sPct}%` }}
                />
              </div>
            </div>

            {/* Liệu trình */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Liệu trình</span>
                <span className="text-[#2C241E] font-semibold">
                  {categoryBreakdown.packageTotal.toLocaleString('vi-VN')}đ · {categoryBreakdown.pPct}%
                </span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#8D4B1A] h-full rounded-full transition-all duration-300"
                  style={{ width: `${categoryBreakdown.pPct}%` }}
                />
              </div>
            </div>

            {/* Học phí */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#73675F]">Học phí</span>
                <span className="text-[#2C241E] font-semibold">
                  {categoryBreakdown.courseTotal.toLocaleString('vi-VN')}đ · {categoryBreakdown.cPct}%
                </span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#BA7E4C] h-full rounded-full transition-all duration-300"
                  style={{ width: `${categoryBreakdown.cPct}%` }}
                />
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
            Đối chiếu phương thức thanh toán
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs pt-3">
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tại cơ sở / Tiền mặt</span>
              <span className="text-[#2C241E] font-semibold">
                {methodBreakdown.posTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Chuyển khoản QR</span>
              <span className="text-[#2C241E] font-semibold">
                {methodBreakdown.bankTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Cổng trực tuyến (MoMo)</span>
              <span className="text-[#2C241E] font-semibold">
                {methodBreakdown.onlineTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tổng cộng</span>
              <span className="text-[#2C241E] font-bold">
                {totalCollected.toLocaleString('vi-VN')}đ
              </span>
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
              <span className="text-[#73675F]">Quận 3 · {branchComparison.q3Count} biên nhận</span>
              <span className="text-[#2C241E] font-semibold">
                {branchComparison.q3Total.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#73675F]">Quận 1 · {branchComparison.q1Count} biên nhận</span>
              <span className="text-[#2C241E] font-semibold">
                {branchComparison.q1Total.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Dữ liệu tài chính đối soát trực tiếp theo từng cơ sở trực thuộc chuỗi MLD Vietnam.
          </div>
        </div>
      </div>

      {/* 6. Card: Biên nhận đã hoàn tất */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-5 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2C241E]">
            Biên nhận thanh toán đã hoàn tất · Hệ thống chuỗi MLD
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
            {filteredInvoices.length} biên nhận hoàn tất
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
            Hiển thị {filteredInvoices.length} / {completedInvoicesData.length} biên nhận · Tổng: {totalCollected.toLocaleString('vi-VN')}đ · Hoàn tiền: {totalRefund.toLocaleString('vi-VN')}đ · Thực thu: {netRevenue.toLocaleString('vi-VN')}đ
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
            {receivableItemsData.length} khoản phải thu
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
            {receivableItemsData.length} khoản phải thu · Tổng hợp đồng mở: {totalContractOpen.toLocaleString('vi-VN')}đ = cần thu ngay {totalReceivables.toLocaleString('vi-VN')}đ
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
        Dữ liệu tài chính được tổng hợp và đối soát thời gian thực của chuỗi thương hiệu MLD Vietnam.
      </div>

      {/* 9. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8D4B1A]" />
        <span>
          Hệ thống kế toán & báo cáo doanh thu tài chính • MLD Vietnam Healthcare Admin.
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
                  <div>• Tổng thực thu trong kỳ: {netRevenue.toLocaleString('vi-VN')}đ ({filteredInvoices.length} biên nhận)</div>
                  <div>• Tổng công nợ cần thu ngay: {totalReceivables.toLocaleString('vi-VN')}đ</div>
                  <div>• Chi nhánh: Quận 3 và Quận 1</div>
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
