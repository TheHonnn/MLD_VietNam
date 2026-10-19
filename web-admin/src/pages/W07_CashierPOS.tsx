import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Receipt,
  Printer,
  X,
  Sparkles,
  Banknote,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { posService, bookingService, customerService, notificationService } from '../services';
import { toast } from '../components/common';
import { Invoice, Booking, User } from '../types/shared_types';

export const W07_CashierPOS: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'onsite' | 'transfer' | 'online'>('transfer');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  const [isPaid, setIsPaid] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [newReceipts, setNewReceipts] = useState<Array<{
    id: string;
    date: string;
    content: string;
    method: string;
    amount: string;
    status: string;
  }>>([]);

  useEffect(() => {
    const fetchPosData = async () => {
      try {
        const [invRes, bkRes, custRes] = await Promise.all([
          posService.getInvoices(),
          bookingService.getBookingById('44440001-0001-0001-0001-000000000001'),
          customerService.getCustomerById('00000000-0000-0000-0000-000000000001'),
        ]);
        if (invRes.success) setInvoices(invRes.data);
        if (bkRes.success) setBooking(bkRes.data);
        if (custRes.success) setCustomer(custRes.data);
      } catch (err) {
        console.error('Failed to load POS data:', err);
      }
    };
    fetchPosData();
  }, []);

  const handleProcessPayment = () => {
    setIsPaid(true);
    setShowReceiptModal(true);

    const bookingCode = booking?.bookingCode || 'BK-20261016-003';
    const customerName = customer?.fullName || 'Nguyễn Mỹ Duyên';
    const amount = booking?.finalPrice || 390000;
    const formattedAmount = `${amount.toLocaleString('vi-VN')}đ`;

    toast.success(
      'Ghi nhận thanh toán thành công!',
      `Đã thu ${formattedAmount} cho hóa đơn ${bookingCode} (${customerName}).`
    );

    notificationService.addNotification({
      title: 'Ghi nhận thanh toán thành công',
      message: `Thu ngân đã quyết toán ${formattedAmount} đơn ${bookingCode} cho khách hàng ${customerName}.`,
      type: 'PAYMENT',
      link: '/cashier-pos',
    });

    const newReceipt = {
      id: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Intl.DateTimeFormat('vi-VN').format(new Date()),
      content: 'Massage trị liệu dưỡng sinh (90 phút)',
      method:
        selectedMethod === 'onsite'
          ? 'Thanh toán tại cơ sở'
          : selectedMethod === 'online'
          ? 'Thanh toán trực tuyến (MoMo)'
          : 'Chuyển khoản (VietQR / Techcombank)',
      amount: formattedAmount,
      status: 'Đã thanh toán',
    };
    setNewReceipts((prev) => [newReceipt, ...prev]);
  };

  const handleResetForNewOrder = () => {
    setIsPaid(false);
    toast.info('Đơn thu ngân mới', 'Đã làm mới thông tin để tiếp nhận đơn thu ngân tiếp theo.');
  };

  // Past receipts dataset from service or fallback + newly paid receipts
  const rawPastReceipts = invoices.length > 0
    ? invoices.map((inv) => ({
        id: inv.invoiceCode,
        date: inv.paidAt ? inv.paidAt.split('T')[0] : '16/10/2026',
        content: inv.userPackageId ? 'Gói chăm sóc da chuyên sâu' : inv.bookingId ? 'Massage trị liệu dưỡng sinh' : 'Học phí đào tạo Academy',
        method: inv.paymentMethod === 'CASH_AT_SPA' ? 'Thanh toán tại cơ sở' : inv.paymentMethod === 'MOMO' ? 'Thanh toán trực tuyến (MoMo)' : 'Chuyển khoản',
        amount: `${inv.totalAmount.toLocaleString('vi-VN')}đ`,
        status: inv.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán',
      }))
    : [];

  const pastReceipts = [...newReceipts, ...rawPastReceipts];

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Thu ngân
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Đơn dịch vụ {booking?.bookingCode || 'BK-20261016-003'} · Chờ quyết toán tại quầy
          </p>
        </div>
        <button
          onClick={() => toast.info('Tra cứu đơn dịch vụ', `Đang áp dụng bộ lọc đơn dịch vụ theo mã ${booking?.bookingCode || 'BK-20261016-003'}.`)}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          Tra cứu đơn dịch vụ
        </button>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3">
        {/* Customer / Booking code input */}
        <div className="flex-1 min-w-[260px]">
          <input
            type="text"
            defaultValue={`${customer?.fullName || 'Nguyễn Mỹ Duyên'} / ${booking?.bookingCode || 'BK-20261016-003'}`}
            className="w-full px-4 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Dropdown 1: Service type */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Dịch vụ lẻ</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 2: Status */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Chờ thanh toán</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 3: Date */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>16/10/2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 3. Middle Section: Two Columns (Service Details & Payment Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Đơn dịch vụ đang chọn */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <div>
            <h2 className="text-base font-bold text-[#2C241E]">
              Đơn dịch vụ đang chọn
            </h2>
            <div className="mt-1">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F5E9DB] text-[#8A4F23]">
                Giữ chỗ đặt lịch
              </span>
            </div>
          </div>

          {/* Spa Service Banner Photo */}
          <div className="w-full h-24 rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#EFE4D9]">
            <img
              src="/spa_massage_banner.png"
              alt="Massage thư giãn toàn thân"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Service Title */}
          <div>
            <h3 className="text-sm font-bold text-[#2C241E]">
              Massage thư giãn toàn thân
            </h3>
          </div>

          {/* Service Specs Details */}
          <div className="space-y-2 text-xs text-[#73675F]">
            <div className="flex items-center justify-between">
              <span>Thời lượng chăm sóc</span>
              <span className="font-semibold text-[#2C241E]">60 phút</span>
            </div>

            <div>
              <div className="font-medium text-[#2C241E]">MLD Beauty & Spa — Cơ sở Nguyễn Thị Minh Khai</div>
              <div className="text-[11px] text-[#73675F] mt-0.5">
                68 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 3, TP. Hồ Chí Minh
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span>Ngày hẹn</span>
              <span className="font-semibold text-[#2C241E]">{booking?.bookingDate || '16/10/2026'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Giờ chăm sóc</span>
              <span className="font-semibold text-[#2C241E]">{booking ? `${booking.startTime.slice(0, 5)}–${booking.endTime.slice(0, 5)}` : '10:00–11:15'}</span>
            </div>

            <p className="text-[11px] text-[#73675F] leading-relaxed pt-0.5">
              Chuẩn bị / vệ sinh sau buổi: 15 phút. Chiếm dụng nguồn lực phòng điều trị theo quy trình chuẩn.
            </p>

            <div className="pt-1">
              <div className="text-xs text-[#2C241E]">
                Chuyên viên: <span className="font-medium">Trần Lan Anh</span>
              </div>
              <div className="text-xs text-[#2C241E] mt-1">
                Khách hàng: <span className="font-bold">{customer?.fullName || 'Nguyễn Mỹ Duyên'}</span>
              </div>
              <div className="text-xs text-[#73675F] mt-0.5">
                {customer?.phone || '0908123456'}
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-[11px] text-[#73675F] pt-2 border-t border-[#F0E6DC]">
            Phòng 01 · Cơ sở Quận 3 · Kỹ thuật viên chính: Trần Lan Anh
          </div>
        </div>

        {/* Right Column: Tổng hợp thanh toán */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <h2 className="text-base font-bold text-[#2C241E]">
            Tổng hợp thanh toán
          </h2>

          {/* Pricing breakdown box */}
          <div className="border border-[#EFE4D9] rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs">
            <div className="font-bold text-xs text-[#2C241E] mb-2">
              Chi phí dịch vụ
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tạm tính</span>
              <span className="font-semibold text-[#2C241E]">{(booking?.baseTotal || 390000).toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Ưu đãi</span>
              <span className="font-semibold text-[#2C241E]">{(booking?.discountAmount || 0).toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Đã sử dụng gói liệu trình</span>
              <span className="font-semibold text-[#2C241E]">0đ</span>
            </div>

            <div className="border-t border-[#EFE4D9] pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#2C241E]">Tổng thanh toán</span>
                <span className="font-extrabold text-[#2C241E]">{(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Cọc cần thu ngay</span>
                <span className="font-semibold text-[#2C241E]">{(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Còn lại trả sau</span>
                <span className="font-semibold text-[#2C241E]">0đ</span>
              </div>
            </div>
          </div>

          {/* Status banner */}
          {isPaid ? (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#E8F6ED] text-[#0D6832] border border-[#C2E8D1] text-xs font-bold animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Đã thanh toán thành công</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F3E2CE] text-[#8A4F23] text-xs font-semibold">
              <Clock className="w-4 h-4 stroke-[2]" />
              <span>Chờ thanh toán</span>
            </div>
          )}

          {/* Secondary badge */}
          <div>
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#D1F4DE] text-[#0A5C2C]">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                Đã thu {(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ
              </span>
            ) : (
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EBDCCE] text-[#73675F]">
                Chưa thu tiền
              </span>
            )}
          </div>

          {/* Payment action buttons */}
          {isPaid ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="w-full py-3 bg-[#0D6832] hover:bg-[#0A5C2C] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Xem biên lai thanh toán</span>
              </button>
              <button
                type="button"
                onClick={handleResetForNewOrder}
                className="w-full py-2 bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] text-[#73675F] hover:text-[#2C241E] text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
              >
                Tiếp nhận đơn thanh toán mới
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleProcessPayment}
              className="w-full py-3 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
            >
              Ghi nhận thanh toán
            </button>
          )}

          {/* Draft Receipt Box */}
          <div className="bg-[#F6EFE8] rounded-xl p-3.5 space-y-1 text-xs">
            <div className="font-bold text-xs text-[#2C241E] flex items-center justify-between">
              <span>Hóa đơn dịch vụ</span>
              {isPaid && (
                <span className="text-[10px] font-extrabold text-[#0D6832] bg-[#E8F6ED] px-2 py-0.5 rounded-md border border-[#C2E8D1]">
                  ĐÃ TẤT TOÁN
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#73675F]">
              {booking?.bookingCode || 'BK-20261016-003'} · Tổng đơn {(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ
            </div>
            <div className="text-[11px] text-[#73675F]">
              Phương thức: {selectedMethod === 'onsite' ? 'Thanh toán tại quầy cơ sở.' : selectedMethod === 'online' ? 'Thanh toán trực tuyến MoMo.' : 'Chuyển khoản (VietQR / Techcombank).'}
            </div>
          </div>

          {/* Explanatory Note */}
          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Hệ thống tự động đồng bộ biên lai thanh toán theo thời gian thực.
          </div>
        </div>
      </div>

      {/* 4. Payment Methods Selector (Row of 3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Column 1: On-site payment */}
        <div
          onClick={() => setSelectedMethod('onsite')}
          className={`rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            selectedMethod === 'onsite'
              ? 'bg-[#F3E2CE] border-[#D7BBA6] shadow-xs'
              : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6] hover:bg-[#FAF8F5]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    selectedMethod === 'onsite'
                      ? 'bg-[#8A4F23] text-white ring-2 ring-[#8A4F23]/20'
                      : 'border-2 border-[#D7BBA6] bg-white'
                  }`}
                >
                  {selectedMethod === 'onsite' && (
                    <CheckCircle2 className="w-5 h-5 text-[#8A4F23] fill-white" />
                  )}
                </div>
                <span className="text-xs font-bold text-[#2C241E]">
                  Thanh toán tại cơ sở
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/70 border border-[#EFE4D9] flex items-center justify-center text-[#8A4F23]">
                <Banknote className="w-4 h-4 stroke-[1.8]" />
              </div>
            </div>

            <div className="mt-3 pl-8">
              <p className="text-[11.5px] text-[#73675F] leading-relaxed font-medium">
                Thu tiền mặt hoặc quẹt thẻ POS trực tiếp tại quầy tiếp đón của cơ sở spa.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFE4D9]/80 pl-8 flex items-center gap-1.5 flex-wrap text-[10.5px] text-[#8C7A6B]">
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Tiền mặt
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Thẻ POS
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Tại quầy lễ tân
            </span>
          </div>
        </div>

        {/* Column 2: Bank Transfer / QR */}
        <div
          onClick={() => setSelectedMethod('transfer')}
          className={`rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            selectedMethod === 'transfer'
              ? 'bg-[#F3E2CE] border-[#D7BBA6] shadow-xs'
              : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6] hover:bg-[#FAF8F5]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    selectedMethod === 'transfer'
                      ? 'bg-[#8A4F23] text-white ring-2 ring-[#8A4F23]/20'
                      : 'border-2 border-[#D7BBA6] bg-white'
                  }`}
                >
                  {selectedMethod === 'transfer' && (
                    <CheckCircle2 className="w-5 h-5 text-[#8A4F23] fill-white" />
                  )}
                </div>
                <span className="text-xs font-bold text-[#2C241E]">
                  Chuyển khoản ngân hàng / QR
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/70 border border-[#EFE4D9] flex items-center justify-center text-[#8A4F23]">
                <QrCode className="w-4 h-4 stroke-[1.8]" />
              </div>
            </div>

            <div className="mt-3 pl-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl border border-[#D7BBA6] flex items-center justify-center text-[#8A4F23] shrink-0 shadow-2xs">
                <QrCode className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="text-[11.5px] leading-snug space-y-0.5">
                <div className="font-bold text-[#2C241E]">Techcombank · 1903688889999</div>
                <div className="text-[10.5px] text-[#73675F] font-medium">MLD HEALTHCARE & SPA</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFE4D9]/80 pl-8 flex items-center gap-1.5 flex-wrap text-[10.5px] text-[#8C7A6B]">
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              VietQR 24/7
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Khớp đơn tự động
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Miễn phí giao dịch
            </span>
          </div>
        </div>

        {/* Column 3: Online Gateway */}
        <div
          onClick={() => setSelectedMethod('online')}
          className={`rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
            selectedMethod === 'online'
              ? 'bg-[#F3E2CE] border-[#D7BBA6] shadow-xs'
              : 'bg-white border-[#EFE4D9] hover:border-[#D7BBA6] hover:bg-[#FAF8F5]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    selectedMethod === 'online'
                      ? 'bg-[#8A4F23] text-white ring-2 ring-[#8A4F23]/20'
                      : 'border-2 border-[#D7BBA6] bg-white'
                  }`}
                >
                  {selectedMethod === 'online' && (
                    <CheckCircle2 className="w-5 h-5 text-[#8A4F23] fill-white" />
                  )}
                </div>
                <span className="text-xs font-bold text-[#2C241E]">
                  Thanh toán trực tuyến
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/70 border border-[#EFE4D9] flex items-center justify-center text-[#8A4F23]">
                <CreditCard className="w-4 h-4 stroke-[1.8]" />
              </div>
            </div>

            <div className="mt-3 pl-8">
              <p className="text-[11.5px] text-[#73675F] leading-relaxed font-medium">
                Cổng liên kết thanh toán qua các ví điện tử hoặc cổng thanh toán số.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFE4D9]/80 pl-8 flex items-center gap-1.5 flex-wrap text-[10.5px] text-[#8C7A6B]">
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Ví MoMo
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              ZaloPay
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              VNPay QR
            </span>
          </div>
        </div>
      </div>

      {/* 5. Previous Receipts Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EFE4D9]">
          <h2 className="text-base font-bold text-[#2C241E]">
            Đối chiếu biên nhận trước đó · 01/10/2026 – 08/10/2026
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F5E9DB] text-[#8A4F23]">
            {pastReceipts.length} biên nhận đã lưu
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold">
                <th className="py-3 px-5">Biên nhận / ngày</th>
                <th className="py-3 px-5">Nội dung</th>
                <th className="py-3 px-5">Phương thức</th>
                <th className="py-3 px-5">Đã thu</th>
                <th className="py-3 px-5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC]">
              {pastReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="py-4 px-5">
                    <div className="font-bold text-xs text-[#2C241E]">
                      {r.id}
                    </div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">
                      {r.date}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-xs text-[#2C241E] font-medium">
                    {r.content}
                  </td>
                  <td className="py-4 px-5 text-xs text-[#2C241E]">
                    {r.method}
                  </td>
                  <td className="py-4 px-5 text-xs font-semibold text-[#2C241E]">
                    {r.amount}
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#EAF5EC] text-[#2D7A4D]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2D7A4D]" />
                      <span>{r.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
          <span>
            3 / 3 biên nhận · Tổng đã thu: 8.550.000đ · Cọc 150.000đ của đơn đang chọn chưa tính
          </span>
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

      {/* 6. Policy Note below Table */}
      <div className="text-xs text-[#73675F] leading-relaxed">
        Chính sách cơ sở: Thanh toán dịch vụ tại quầy hoặc trực tuyến qua mã QR Code. Hệ thống tự động xuất biên nhận điện tử theo thời gian thực.
      </div>

      {/* 7. Footer Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#985018]" />
        <span>
          Hệ thống thu ngân POS & biên lai điện tử • MLD Vietnam Healthcare Admin.
        </span>
      </div>

      {/* 8. Luxury Electronic Receipt Modal */}
      {showReceiptModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setShowReceiptModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 text-center bg-gradient-to-b from-[#FAF6F0] to-white relative border-b border-[#F4ECE3]">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 p-1.5 text-[#A69788] hover:text-[#2C241E] rounded-xl hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-[#E8F6ED] text-[#0D6832] border border-[#C2E8D1] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-extrabold text-[#2C241E] tracking-tight">
                Ghi nhận thanh toán thành công!
              </h3>
              <p className="text-xs text-[#73675F] mt-1 font-medium">
                Biên lai điện tử MLD Healthcare & Spa
              </p>
            </div>

            {/* Receipt Card Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EFE4D9] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E0D4C7]">
                  <span className="text-[#73675F]">Mã hóa đơn / Phiếu thu:</span>
                  <span className="font-bold text-[#2C241E] font-mono">{booking?.bookingCode || 'BK-20261016-003'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">{customer?.fullName || 'Nguyễn Mỹ Duyên'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Dịch vụ điều trị:</span>
                  <span className="font-semibold text-[#2C241E]">Massage trị liệu dưỡng sinh (90 phút)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Hình thức thanh toán:</span>
                  <span className="font-semibold text-[#8A4F23]">
                    {selectedMethod === 'onsite' ? 'Tiền mặt tại cơ sở' : selectedMethod === 'online' ? 'Cổng trực tuyến MoMo' : 'Chuyển khoản VietQR (Techcombank)'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Thời gian ghi nhận:</span>
                  <span className="text-[#2C241E] font-medium">
                    {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-dashed border-[#E0D4C7] flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2C241E]">Tổng đã quyết toán:</span>
                  <span className="text-base font-extrabold text-[#0D6832]">
                    {(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E8F6ED] text-[#0D6832] text-xs font-semibold">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Trạng thái: Đã quyết toán 100% · Đồng bộ dữ liệu kế toán</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 pb-6 pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  toast.info('In biên lai', 'Đang kết nối lệnh in biên lai nhiệt POS...');
                  window.print();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#D7BBA6] hover:bg-[#FAF8F5] text-[#8A4F23] text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In biên lai</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#8A4F23] hover:bg-[#723F1A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Hoàn tất & Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
