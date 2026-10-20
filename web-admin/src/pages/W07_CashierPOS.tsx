import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Copy,
  Maximize2,
} from 'lucide-react';
import { posService, bookingService, customerService, notificationService, supabaseService } from '../services';
import { toast } from '../components/common';
import { Invoice, Booking, User, PaymentMethod, PaymentStatus, BookingStatus } from '../types/shared_types';

export const W07_CashierPOS: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMethod, setSelectedMethod] = useState<'onsite' | 'transfer' | 'online'>('transfer');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showQrZoomModal, setShowQrZoomModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    id: string;
    customerName: string;
    serviceName: string;
    method: string;
    amount: string;
    date: string;
    status?: string;
  } | null>(null);
  const [newReceipts, setNewReceipts] = useState<Array<{
    id: string;
    date: string;
    content: string;
    method: string;
    amount: string;
    status: string;
  }>>([]);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Đã sao chép!', `Đã sao chép ${label}: ${text}`);
    }
  };

  useEffect(() => {
    const fetchPosData = async () => {
      try {
        const [invRes, bkRes, custRes] = await Promise.all([
          posService.getInvoices(),
          bookingService.getBookings(),
          customerService.getCustomers(),
        ]);
        if (invRes.success) setInvoices(invRes.data);
        
        const bks = bkRes.success ? bkRes.data : [];
        setAllBookings(bks);
        // Mặc định ban đầu là chưa tìm ai, giữ ô tìm kiếm trống
      } catch (err) {
        console.error('Failed to load POS data:', err);
      }
    };
    fetchPosData();
  }, []);

  // Handle URL query parameters (e.g. ?booking=BK-20261016-003&receipt=true)
  useEffect(() => {
    const bookingParam = searchParams.get('booking');
    const receiptParam = searchParams.get('receipt');

    if (bookingParam) {
      const kw = bookingParam.toLowerCase().trim();
      const found = allBookings.find(
        (b) =>
          b.bookingCode.toLowerCase().includes(kw) ||
          b.id.toLowerCase() === kw
      );
      if (found) {
        setBooking(found);
        setIsPaid(found.paymentStatus === 'PAID');
        if (found.customer) {
          setCustomer(found.customer);
          setSearchTerm(`${found.customer.fullName} / ${found.bookingCode}`);
        } else {
          setSearchTerm(`${found.bookedForName || 'Khách hàng'} / ${found.bookingCode}`);
        }
      } else {
        if (bookingParam.includes('BK-20261016-003')) {
          setSearchTerm(`Xuân Trường / BK-20261016-003`);
          setIsPaid(true);
        }
      }
    }

    if (receiptParam === 'true') {
      setShowReceiptModal(true);
    }
  }, [searchParams, allBookings]);

  // Handle cross-page / in-page dispatch event from notification click
  useEffect(() => {
    const handleOpenReceipt = (e: any) => {
      const bCode = e.detail?.bookingCode;
      if (bCode) {
        const kw = bCode.toLowerCase().trim();
        const found = allBookings.find(
          (b) =>
            b.bookingCode.toLowerCase().includes(kw) ||
            b.id.toLowerCase() === kw
        );
        if (found) {
          setBooking(found);
          setIsPaid(found.paymentStatus === 'PAID');
          if (found.customer) {
            setCustomer(found.customer);
            setSearchTerm(`${found.customer.fullName} / ${found.bookingCode}`);
          } else {
            setSearchTerm(`${found.bookedForName || 'Khách hàng'} / ${found.bookingCode}`);
          }
        } else if (bCode.includes('BK-20261016-003')) {
          setSearchTerm(`Xuân Trường / BK-20261016-003`);
          setIsPaid(true);
        }
      }
      setShowReceiptModal(true);
    };

    window.addEventListener('mld_open_pos_receipt', handleOpenReceipt);
    return () => {
      window.removeEventListener('mld_open_pos_receipt', handleOpenReceipt);
    };
  }, [allBookings]);

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedReceiptData(null);
    if (searchParams.get('receipt')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('receipt');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSearchBooking = (queryStr: string) => {
    setSearchTerm(queryStr);
    if (!queryStr.trim()) {
      setBooking(undefined);
      setCustomer(undefined);
      setIsPaid(false);
      return;
    }
    const kw = queryStr.toLowerCase().trim();
    const found = allBookings.find(
      (b) =>
        b.bookingCode.toLowerCase().includes(kw) ||
        (b.customer?.fullName && b.customer.fullName.toLowerCase().includes(kw)) ||
        (b.customer?.phone && b.customer.phone.includes(kw)) ||
        (b.bookedForName && b.bookedForName.toLowerCase().includes(kw))
    );
    if (found) {
      setBooking(found);
      setIsPaid(found.paymentStatus === 'PAID');
      if (found.customer) {
        setCustomer(found.customer);
      }
    } else {
      setBooking(undefined);
      setCustomer(undefined);
      setIsPaid(false);
    }
  };

  const handleLookupClick = () => {
    if (!searchTerm.trim()) {
      setBooking(undefined);
      setCustomer(undefined);
      setIsPaid(false);
      toast.info('Tra cứu đơn dịch vụ', 'Vui lòng nhập mã đơn hoặc tên khách hàng để tìm kiếm.');
      return;
    }
    const kw = searchTerm.toLowerCase().trim();
    const found = allBookings.find(
      (b) =>
        b.bookingCode.toLowerCase().includes(kw) ||
        (b.customer?.fullName && b.customer.fullName.toLowerCase().includes(kw)) ||
        (b.customer?.phone && b.customer.phone.includes(kw)) ||
        (b.bookedForName && b.bookedForName.toLowerCase().includes(kw))
    );
    if (found) {
      setBooking(found);
      setIsPaid(found.paymentStatus === 'PAID');
      if (found.customer) {
        setCustomer(found.customer);
      }
      toast.success('Tìm thấy đơn dịch vụ', `Đã chuyển sang đơn ${found.bookingCode} - ${found.customer?.fullName || 'Khách hàng'}.`);
    } else {
      // Check fallback for demo booking code if searched
      if (kw.includes('bk-20261016-003') || kw.includes('xuân trường') || kw.includes('xuan truong')) {
        setSearchTerm('Xuân Trường / BK-20261016-003');
        setCustomer({
          id: '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
          fullName: 'Xuân Trường',
          phone: '0334750241',
        } as any);
        setBooking({
          id: 'bk-demo-003',
          bookingCode: 'BK-20261016-003',
          branchId: 'aaaaaaaa-0001-0001-0001-000000000001',
          customerId: '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
          technicianId: 'bbbbbbbb-0001-0001-0001-000000000002',
          bookingDate: '2026-10-16',
          startTime: '10:00:00',
          endTime: '11:15:00',
          status: BookingStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          baseTotal: 390000,
          discountAmount: 0,
          finalPrice: 390000,
          customer: {
            id: '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
            fullName: 'Xuân Trường',
            phone: '0334750241',
          } as any,
          items: [
            {
              id: 'item-1',
              serviceId: 'srv-1',
              service: {
                id: 'srv-1',
                name: 'Gội Đầu Dưỡng Sinh Thảo Dược Cổ Vai Gáy',
                durationMinutes: 60,
                price: 390000,
              } as any,
              quantity: 1,
              unitPrice: 390000,
            } as any,
          ],
        } as any);
        setIsPaid(true);
        toast.success('Tìm thấy đơn dịch vụ', 'Đã tải thông tin đơn BK-20261016-003 - Xuân Trường.');
        return;
      }
      toast.warning('Không tìm thấy', `Không tìm thấy đơn dịch vụ khớp với từ khóa "${searchTerm}".`);
    }
  };

  const primaryItem = booking?.items?.[0];
  const serviceName = primaryItem?.service?.name || (booking ? 'Dịch vụ trị liệu' : 'Chưa chọn dịch vụ');
  const serviceDuration = primaryItem?.service?.durationMinutes || primaryItem?.durationMinutes || 0;
  const serviceImage = primaryItem?.service?.imageUrl || '/spa_massage_banner.png';

  const branchName = booking?.branch?.name || 'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa';
  const branchAddress = booking?.branch?.address
    ? `${booking.branch.address}, ${booking.branch.district}, ${booking.branch.city}`
    : 'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh';
  const branchCode = booking?.branch?.code || 'MLD-Q3';

  const roomName = booking?.room?.name
    ? `${booking.room.name}${booking.assignedBedNumber ? ` (${booking.assignedBedNumber})` : ''}`
    : 'Phòng dịch vụ';

  const technicianName = booking?.technician?.fullName || 'Chưa phân công';
  const customerName = customer?.fullName || booking?.customer?.fullName || booking?.bookedForName || (booking ? 'Khách hàng' : 'Chưa chọn khách hàng');
  const customerPhone = customer?.phone || booking?.customer?.phone || booking?.bookedForPhone || (booking ? '--' : 'Chưa có SĐT');

  const handleProcessPayment = async () => {
    if (!booking) {
      toast.error('Lỗi', 'Không tìm thấy thông tin đơn đặt lịch để thanh toán.');
      return;
    }

    setIsProcessing(true);
    try {
      const paymentMethodEnum =
        selectedMethod === 'onsite'
          ? PaymentMethod.CASH_AT_SPA
          : selectedMethod === 'online'
          ? PaymentMethod.MOMO
          : PaymentMethod.BANK_TRANSFER;

      const bookingCode = booking.bookingCode || 'BK-20261016-003';
      const amount = booking.finalPrice || 390000;
      const formattedAmount = `${amount.toLocaleString('vi-VN')}đ`;
      const datePart = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const generatedInvoiceCode = `HD-${datePart}-${randPart}`;

      // 1. Lưu hóa đơn vào Supabase Cloud (bảng invoices)
      const resInvoice = await posService.createInvoice({
        invoiceCode: generatedInvoiceCode,
        branchId: booking.branchId || 'aaaaaaaa-0001-0001-0001-000000000001',
        customerId: customer?.id || booking.customerId || '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        cashierId: 'bbbbbbbb-0001-0001-0001-000000000002',
        bookingId: booking.id,
        subtotal: booking.baseTotal || amount,
        discountAmount: booking.discountAmount || 0,
        pointsRedeemedAmount: booking.pointsDiscount || 0,
        vatAmount: 0,
        totalAmount: amount,
        paymentMethod: paymentMethodEnum,
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date().toISOString(),
      });

      // 2. Cập nhật trạng thái Booking trên Supabase Cloud (bảng bookings)
      await bookingService.updateBookingStatus(
        booking.id,
        BookingStatus.COMPLETED,
        PaymentStatus.PAID,
        paymentMethodEnum
      );

      // 3. Tích điểm và cập nhật chi tiêu cho khách hàng (Supabase bảng users)
      const custId = customer?.id || booking.customerId;
      if (custId) {
        const curSpent = Number(customer?.totalSpent || 0);
        const curPoints = Number(customer?.rewardPoints || 0);
        const earnedPoints = Math.floor(amount / 10000);
        const newTotalSpent = curSpent + amount;
        const newTier = supabaseService.calculateTier(newTotalSpent);
        await supabaseService.updateUser(custId, {
          total_spent: newTotalSpent,
          reward_points: curPoints + earnedPoints,
          member_tier: newTier,
          updated_at: new Date().toISOString(),
        });
      }

      // 4. Đồng bộ State giao diện lập tức
      setIsPaid(true);
      setShowReceiptModal(true);

      if (resInvoice.success && resInvoice.data) {
        setInvoices((prev) => [resInvoice.data, ...prev]);
      }

      setBooking((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: PaymentStatus.PAID,
              status: BookingStatus.COMPLETED,
              paymentMethod: paymentMethodEnum,
            }
          : undefined
      );

      setAllBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                paymentStatus: PaymentStatus.PAID,
                status: BookingStatus.COMPLETED,
                paymentMethod: paymentMethodEnum,
              }
            : b
        )
      );

      const methodLabel =
        selectedMethod === 'onsite'
          ? 'Thanh toán tại cơ sở'
          : selectedMethod === 'online'
          ? 'Thanh toán trực tuyến (MoMo)'
          : 'Chuyển khoản VietQR (MB Bank · 0099999999678)';

      const newReceipt = {
        id: generatedInvoiceCode,
        date: new Intl.DateTimeFormat('vi-VN').format(new Date()),
        content: `${serviceName} (${serviceDuration} phút)`,
        method: methodLabel,
        amount: formattedAmount,
        status: 'Đã thanh toán',
      };
      setNewReceipts((prev) => [newReceipt, ...prev]);

      toast.success(
        'Ghi nhận thanh toán thành công!',
        `Đã thu ${formattedAmount} cho hóa đơn ${bookingCode} (${customerName}) và lưu tự động vào Supabase Cloud.`
      );

      notificationService.addNotification({
        title: 'Ghi nhận thanh toán thành công',
        message: `Thu ngân đã quyết toán ${formattedAmount} đơn ${bookingCode} cho khách hàng ${customerName}.`,
        type: 'PAYMENT',
        link: `/cashier-pos?booking=${bookingCode}&receipt=true`,
      });
    } catch (err: any) {
      console.error('Lỗi khi ghi nhận thanh toán:', err);
      toast.error('Lỗi lưu thanh toán', 'Không thể lưu hóa đơn vào CSDL Supabase. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForNewOrder = () => {
    setBooking(undefined);
    setCustomer(undefined);
    setSearchTerm('');
    setIsPaid(false);
    toast.info('Làm mới thu ngân', 'Đã chuyển về trạng thái chờ tiếp nhận đơn mới.');
  };

  // Past receipts dataset from service or fallback + newly paid receipts
  const rawPastReceipts = invoices.length > 0
    ? invoices.map((inv) => ({
        id: inv.invoiceCode,
        date: inv.paidAt ? inv.paidAt.split('T')[0] : '16/10/2026',
        content: inv.userPackageId ? 'Gói chăm sóc da chuyên sâu' : inv.bookingId ? 'Gội Đầu Dưỡng Sinh Thảo Dược Cổ Vai Gáy' : 'Học phí đào tạo Academy',
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
            {booking
              ? `Đơn dịch vụ ${booking.bookingCode} · Chờ quyết toán tại quầy`
              : 'Chưa chọn đơn dịch vụ · Vui lòng nhập mã đơn hoặc tên khách hàng để quyết toán'}
          </p>
        </div>
        <button
          onClick={handleLookupClick}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          Tra cứu đơn dịch vụ
        </button>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Customer / Booking code input */}
        <div className="flex-1 min-w-[200px] w-full sm:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchBooking(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookupClick();
            }}
            placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
            className="w-full px-4 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Dropdown 1: Service type */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none">
          <span>Dịch vụ lẻ</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 2: Status */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none">
          <span>Chờ thanh toán</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Dropdown 3: Date */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none">
          <span>{booking?.bookingDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(booking.bookingDate)) : new Intl.DateTimeFormat('vi-VN').format(new Date())}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 3. Middle Section: Two Columns (Service Details & Payment Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Đơn dịch vụ đang chọn */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          {!booking ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF6F0] border border-[#EFE4D9] flex items-center justify-center mx-auto text-[#8A4F23]">
                <Receipt className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Chưa chọn đơn dịch vụ nào
                </h3>
                <p className="text-xs text-[#73675F] max-w-sm mx-auto mt-1 leading-relaxed">
                  Vui lòng nhập mã đơn (ví dụ: BK-20261016-003) hoặc tên khách hàng tại thanh tìm kiếm phía trên để tra cứu và quyết toán.
                </p>
              </div>
              {allBookings.filter((b) => b.paymentStatus === 'UNPAID' || b.status === 'PENDING').length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-[#8A4F23] mb-2">
                    Hoặc chọn nhanh đơn đang chờ thanh toán:
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                    {allBookings
                      .filter((b) => b.paymentStatus === 'UNPAID' || b.status === 'PENDING')
                      .slice(0, 4)
                      .map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setBooking(b);
                            setIsPaid(b.paymentStatus === 'PAID');
                            if (b.customer) setCustomer(b.customer);
                            setSearchTerm(`${b.customer?.fullName || b.bookedForName || 'Khách'} / ${b.bookingCode}`);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF6F0] hover:bg-[#F3E2CE] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer"
                        >
                          {b.bookingCode} · {b.customer?.fullName || b.bookedForName || 'Khách'}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
                  src={serviceImage}
                  alt={serviceName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/spa_massage_banner.png';
                  }}
                />
              </div>

              {/* Service Title */}
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  {serviceName}
                </h3>
              </div>

              {/* Service Specs Details */}
              <div className="space-y-2 text-xs text-[#73675F]">
                <div className="flex items-center justify-between">
                  <span>Thời lượng chăm sóc</span>
                  <span className="font-semibold text-[#2C241E]">{serviceDuration} phút</span>
                </div>

                <div>
                  <div className="font-medium text-[#2C241E]">{branchName}</div>
                  <div className="text-[11px] text-[#73675F] mt-0.5">
                    {branchAddress}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span>Ngày hẹn</span>
                  <span className="font-semibold text-[#2C241E]">{booking.bookingDate || '2026-10-17'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Giờ chăm sóc</span>
                  <span className="font-semibold text-[#2C241E]">{`${booking.startTime.slice(0, 5)}–${booking.endTime.slice(0, 5)}`}</span>
                </div>

                <p className="text-[11px] text-[#73675F] leading-relaxed pt-0.5">
                  Chuẩn bị / vệ sinh sau buổi: 15 phút. Chiếm dụng nguồn lực phòng điều trị theo quy trình chuẩn.
                </p>

                <div className="pt-1">
                  <div className="text-xs text-[#2C241E]">
                    Chuyên viên: <span className="font-medium">{technicianName}</span>
                  </div>
                  <div className="text-xs text-[#2C241E] mt-1">
                    Khách hàng: <span className="font-bold">{customerName}</span>
                  </div>
                  <div className="text-xs text-[#73675F] mt-0.5">
                    {customerPhone}
                  </div>
                </div>
              </div>

              {/* Footnote */}
              <div className="text-[11px] text-[#73675F] pt-2 border-t border-[#F0E6DC]">
                {roomName} · {branchCode} · Kỹ thuật viên: {technicianName}
              </div>
            </>
          )}
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
              <span className="font-semibold text-[#2C241E]">{booking ? `${(booking.baseTotal || 0).toLocaleString('vi-VN')}đ` : '0đ'}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Ưu đãi</span>
              <span className="font-semibold text-[#2C241E]">{booking ? `${(booking.discountAmount || 0).toLocaleString('vi-VN')}đ` : '0đ'}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Đã sử dụng gói liệu trình</span>
              <span className="font-semibold text-[#2C241E]">0đ</span>
            </div>

            <div className="border-t border-[#EFE4D9] pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#2C241E]">Tổng thanh toán</span>
                <span className="font-extrabold text-[#2C241E]">{booking ? `${(booking.finalPrice || 0).toLocaleString('vi-VN')}đ` : '0đ'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Cọc cần thu ngay</span>
                <span className="font-semibold text-[#2C241E]">{booking ? `${(booking.finalPrice || 0).toLocaleString('vi-VN')}đ` : '0đ'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Còn lại trả sau</span>
                <span className="font-semibold text-[#2C241E]">0đ</span>
              </div>
            </div>
          </div>

          {/* Status banner */}
          {booking ? (
            isPaid ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#E8F6ED] text-[#0D6832] border border-[#C2E8D1] text-xs font-bold animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Đã thanh toán thành công</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F3E2CE] text-[#8A4F23] text-xs font-semibold">
                <Clock className="w-4 h-4 stroke-[2]" />
                <span>Chờ thanh toán</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] text-[#8C7A6B] border border-[#EFE4D9] text-xs font-medium">
              <Info className="w-4 h-4 stroke-[2]" />
              <span>Chưa chọn đơn dịch vụ</span>
            </div>
          )}

          {/* Secondary badge */}
          <div>
            {booking ? (
              isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#D1F4DE] text-[#0A5C2C]">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  Đã thu {(booking.finalPrice || 0).toLocaleString('vi-VN')}đ
                </span>
              ) : (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EBDCCE] text-[#73675F]">
                  Chưa thu tiền
                </span>
              )
            ) : null}
          </div>

          {/* Payment action buttons */}
          {!booking ? (
            <button
              type="button"
              disabled
              className="w-full py-3 bg-[#E8DFD8] text-[#8C7A6B] text-xs font-bold rounded-xl cursor-not-allowed text-center"
            >
              Vui lòng chọn đơn dịch vụ để thanh toán
            </button>
          ) : isPaid ? (
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
              disabled={isProcessing}
              onClick={handleProcessPayment}
              className={`w-full py-3 ${
                isProcessing
                  ? 'bg-[#A88874] cursor-wait'
                  : 'bg-[#985018] hover:bg-[#854412] cursor-pointer'
              } text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-2`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang ghi nhận vào Supabase...</span>
                </>
              ) : (
                'Ghi nhận thanh toán'
              )}
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
              {booking ? `${booking.bookingCode} · Tổng đơn ${(booking.finalPrice || 0).toLocaleString('vi-VN')}đ` : 'Chưa có đơn dịch vụ'}
            </div>
            <div className="text-[11px] text-[#73675F]">
              Phương thức: {selectedMethod === 'onsite' ? 'Thanh toán tại quầy cơ sở.' : selectedMethod === 'online' ? 'Thanh toán trực tuyến MoMo.' : 'Chuyển khoản VietQR (MB Bank · 0099999999678).'}
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
              <div className="w-11 h-11 bg-white rounded-xl border border-[#D7BBA6] p-0.5 flex items-center justify-center text-[#8A4F23] shrink-0 shadow-2xs overflow-hidden">
                <img
                  src="/vietqr-mbbank.png"
                  alt="QR MB"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="text-[11.5px] leading-snug space-y-0.5">
                <div className="font-bold text-[#2C241E]">MB Bank · 0099999999678</div>
                <div className="text-[10.5px] text-[#8A4F23] font-bold">LAM XUAN TRUONG</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFE4D9]/80 pl-8 flex items-center gap-1.5 flex-wrap text-[10.5px] text-[#8C7A6B]">
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              VietQR MB Bank
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Khớp đơn tự động
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/90 border border-[#EFE4D9] font-medium">
              Quét nhanh 24/7
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

      {/* 4.5. Dynamic QR Payment Banner (Shows when 'transfer' is selected) */}
      {selectedMethod === 'transfer' && (
        <div className="bg-white rounded-2xl border border-[#D7BBA6] p-5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Left: QR Image with quick zoom */}
            <div className="flex flex-col items-center gap-2.5 shrink-0">
              <div
                className="relative group cursor-pointer p-2 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] shadow-xs hover:border-[#8A4F23] transition-colors"
                onClick={() => setShowQrZoomModal(true)}
                title="Nhấn để phóng to mã QR"
              >
                <img
                  src="/vietqr-mbbank.png"
                  alt="Mã VietQR MB Bank - 0099999999678"
                  className="w-48 sm:w-56 h-auto object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/qr-payment.png';
                  }}
                />
                <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5 backdrop-blur-[1px]">
                  <Maximize2 className="w-4 h-4" />
                  <span>Phóng to</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrZoomModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-[#8A4F23] hover:text-[#6D4122] font-semibold transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Xem mã QR toàn màn hình</span>
              </button>
            </div>

            {/* Right: Bank Account Details with Copy Buttons */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFE4D9]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F6ED] text-[#0D6832]">
                      VietQR 24/7 · MB Bank
                    </span>
                    <span className="text-xs text-[#73675F] font-medium">Khớp lệnh tự động</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#2C241E] mt-1">
                    Quét mã QR để chuyển khoản trực tiếp
                  </h3>
                </div>
              </div>

              {/* Data rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Bank Name */}
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-0.5">
                  <div className="text-[11px] text-[#73675F]">Ngân hàng thụ hưởng</div>
                  <div className="font-bold text-[#2C241E]">MB Bank (Quân Đội)</div>
                </div>

                {/* Account Name */}
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-0.5">
                  <div className="text-[11px] text-[#73675F]">Chủ tài khoản</div>
                  <div className="font-bold text-[#8A4F23] uppercase">LAM XUAN TRUONG</div>
                </div>

                {/* Account Number */}
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#73675F]">Số tài khoản</div>
                    <div className="font-extrabold text-[#2C241E] font-mono text-sm tracking-wide">
                      0099999999678
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0099999999678', 'Số tài khoản')}
                    className="p-1.5 rounded-lg bg-white border border-[#D7BBA6] text-[#8A4F23] hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                    title="Sao chép số tài khoản"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Amount */}
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#73675F]">Số tiền cần thanh toán</div>
                    <div className="font-extrabold text-[#0D6832] text-sm">
                      {booking ? `${(booking.finalPrice || 0).toLocaleString('vi-VN')}đ` : '0đ'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!booking}
                    onClick={() => copyToClipboard(String(booking?.finalPrice || 0), 'Số tiền')}
                    className="p-1.5 rounded-lg bg-white border border-[#D7BBA6] text-[#8A4F23] hover:bg-[#F3E2CE] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Sao chép số tiền"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Transfer Message */}
                <div className="sm:col-span-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#73675F]">Nội dung chuyển khoản (Syntax)</div>
                    <div className="font-bold text-[#2C241E] font-mono text-xs">
                      {booking?.bookingCode || 'Vui lòng chọn đơn dịch vụ'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!booking}
                    onClick={() => copyToClipboard(booking?.bookingCode || '', 'Nội dung chuyển khoản')}
                    className="p-1.5 rounded-lg bg-white border border-[#D7BBA6] text-[#8A4F23] hover:bg-[#F3E2CE] transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Sao chép nội dung chuyển khoản"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
                💡 Khách hàng mở app ngân hàng (MB, Vietcombank, Techcombank, Momo...) quét mã để tự động điền đúng số tiền và nội dung.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Previous Receipts Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EFE4D9]">
          <h2 className="text-base font-bold text-[#2C241E]">
            Đối chiếu hóa đơn biên nhận đã thanh toán
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
                <th className="py-3 px-5 text-right">Thao tác</th>
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
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReceiptData({
                          id: r.id,
                          customerName: customerName,
                          serviceName: r.content,
                          method: r.method,
                          amount: r.amount,
                          date: r.date,
                          status: r.status,
                        });
                        setShowReceiptModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#8A4F23] bg-[#FAF3EC] hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                      title="Xem chi tiết biên lai"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Xem chi tiết</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-[#EFE4D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-[#73675F]">
          <span>
            {pastReceipts.length} biên nhận · Tổng đã thu: {invoices.filter((i) => i.paymentStatus === 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString('vi-VN')}đ
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
          onClick={handleCloseReceiptModal}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 text-center bg-gradient-to-b from-[#FAF6F0] to-white relative border-b border-[#F4ECE3]">
              <button
                type="button"
                onClick={handleCloseReceiptModal}
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
                  <span className="font-bold text-[#2C241E] font-mono">
                    {selectedReceiptData?.id || booking?.bookingCode || 'BK-20261016-003'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">
                    {selectedReceiptData?.customerName || customerName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Dịch vụ điều trị:</span>
                  <span className="font-semibold text-[#2C241E]">
                    {selectedReceiptData?.serviceName || `${serviceName} (${serviceDuration} phút)`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Hình thức thanh toán:</span>
                  <span className="font-semibold text-[#8A4F23]">
                    {selectedReceiptData?.method || (selectedMethod === 'onsite' ? 'Tiền mặt tại cơ sở' : selectedMethod === 'online' ? 'Cổng trực tuyến MoMo' : 'Chuyển khoản VietQR (MB Bank · LAM XUAN TRUONG)')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Thời gian ghi nhận:</span>
                  <span className="text-[#2C241E] font-medium">
                    {selectedReceiptData?.date || new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-dashed border-[#E0D4C7] flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2C241E]">Tổng đã quyết toán:</span>
                  <span className="text-base font-extrabold text-[#0D6832]">
                    {selectedReceiptData?.amount || `${(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ`}
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
                onClick={handleCloseReceiptModal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#8A4F23] hover:bg-[#723F1A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Hoàn tất & Đóng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Fullscreen / High-Res QR Zoom Modal */}
      {showQrZoomModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setShowQrZoomModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#F4ECE3] flex items-center justify-between bg-gradient-to-r from-[#FAF6F0] to-white">
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Mã QR Thanh Toán VietQR
                </h3>
                <p className="text-[11px] text-[#73675F]">
                  MB Bank · LAM XUAN TRUONG
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQrZoomModal(false)}
                className="p-1.5 text-[#A69788] hover:text-[#2C241E] rounded-xl hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-center space-y-3.5">
              <div className="p-2.5 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] inline-block shadow-inner">
                <img
                  src="/vietqr-mbbank.png"
                  alt="Mã VietQR MB Bank"
                  className="w-64 h-auto object-contain mx-auto rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/qr-payment.png';
                  }}
                />
              </div>

              <div className="space-y-1">
                <div className="text-base font-extrabold text-[#0D6832]">
                  {(booking?.finalPrice || 390000).toLocaleString('vi-VN')}đ
                </div>
                <div className="text-xs font-mono font-bold text-[#2C241E]">
                  STK: 0099999999678 · {booking?.bookingCode || 'BK-20261016-003'}
                </div>
                <div className="text-[11px] text-[#73675F]">
                  Chủ TK: LAM XUAN TRUONG (MB Bank)
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-1">
              <button
                type="button"
                onClick={() => setShowQrZoomModal(false)}
                className="w-full py-2.5 bg-[#8A4F23] hover:bg-[#723F1A] text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
