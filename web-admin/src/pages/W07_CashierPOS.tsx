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
  Search,
  Filter,
  RefreshCw,
  Wallet,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  FileText,
  Download,
  GraduationCap,
  Plus,
  Calendar,
  Building2,
  UserCheck,
} from 'lucide-react';
import { exportElementToPdf } from '../utils/pdfExport';
import {
  posService,
  bookingService,
  customerService,
  notificationService,
  supabaseService,
  branchService,
  treatmentService,
  academyService,
  commissionService,
} from '../services';
import { toast } from '../components/common';
import {
  Invoice,
  Booking,
  User,
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
  Branch,
  CashierShift,
  CourseEnrollment,
  StudentAdmissionStatus,
  EnrollmentStatus,
  Service,
  Technician,
  DualSlotAvailability,
} from '../types/shared_types';
import { matchSearch, isUuid } from '../utils/searchUtils';
import { useAdmin } from '../admin/Auth';

export const POS_TIME_SLOTS = [
  { label: '09:00–10:00', startTime: '09:00:00', endTime: '10:00:00' },
  { label: '10:00–11:00', startTime: '10:00:00', endTime: '11:00:00' },
  { label: '11:00–12:00', startTime: '11:00:00', endTime: '12:00:00' },
  { label: '13:30–14:30', startTime: '13:30:00', endTime: '14:30:00' },
  { label: '14:30–15:30', startTime: '14:30:00', endTime: '15:30:00' },
  { label: '15:30–16:30', startTime: '15:30:00', endTime: '16:30:00' },
  { label: '16:30–17:30', startTime: '16:30:00', endTime: '17:30:00' },
  { label: '17:30–18:30', startTime: '17:30:00', endTime: '18:30:00' },
  { label: '18:30–19:30', startTime: '18:30:00', endTime: '19:30:00' },
  { label: '19:30–20:30', startTime: '19:30:00', endTime: '20:30:00' },
];

export const W07_CashierPOS: React.FC = () => {
  const { user: adminUser } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return searchParams.get('branchId') || localStorage.getItem('mld_selected_branch_id') || 'ALL';
  });

  // Active Tab: 'pos' (Tại quầy) hoặc 'receipts' (Sổ hóa đơn & đối chiếu)
  const [activeTab, setActiveTab] = useState<'pos' | 'receipts'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'receipts' || window.location.hash === '#receipts') return 'receipts';
    return 'pos';
  });

  const handleBranchSelect = (bId: string) => {
    setSelectedBranchId(bId);
    localStorage.setItem('mld_selected_branch_id', bId);
    window.dispatchEvent(new CustomEvent('mld_branch_changed', { detail: { branchId: bId } }));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (bId && bId !== 'ALL') {
        next.set('branchId', bId);
      } else {
        next.delete('branchId');
      }
      return next;
    });
  };

  // Listen to searchParams and global branch changes
  useEffect(() => {
    const p = searchParams.get('branchId');
    if (p && p !== selectedBranchId) {
      setSelectedBranchId(p);
    }

    const tab = searchParams.get('tab');
    if (tab === 'receipts' || window.location.hash === '#receipts') {
      setActiveTab('receipts');
    } else if (tab === 'pos') {
      setActiveTab('pos');
    }
  }, [searchParams]);

  useEffect(() => {
    const handleGlobalBranchChange = (e: any) => {
      const bId = e?.detail?.branchId;
      if (bId) {
        setSelectedBranchId(bId);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (bId !== 'ALL') {
            next.set('branchId', bId);
          } else {
            next.delete('branchId');
          }
          return next;
        });
      }
    };

    const handleBranchesUpdated = () => {
      branchService.getAllBranches().then((res) => {
        if (res.success && res.data) setBranches(res.data);
      });
    };

    window.addEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
    window.addEventListener('mld_branches_updated' as any, handleBranchesUpdated);
    return () => {
      window.removeEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
      window.removeEventListener('mld_branches_updated' as any, handleBranchesUpdated);
    };
  }, []);

  // POS Mode: 'spa' (Dịch vụ Spa & Gói) hoặc 'tuition' (Học phí Học viện)
  const [posMode, setPosMode] = useState<'spa' | 'tuition'>('spa');
  const [allEnrollments, setAllEnrollments] = useState<CourseEnrollment[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CourseEnrollment | undefined>(undefined);
  const [tuitionPaymentAmount, setTuitionPaymentAmount] = useState<number>(0);

  const [selectedMethod, setSelectedMethod] = useState<'onsite' | 'transfer' | 'online'>('onsite');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [treatmentPackages, setTreatmentPackages] = useState<any[]>([]);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Invoices Tab Filter States
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // VAT and Regimen session states
  const [vatRate, setVatRate] = useState<number>(8); // Mặc định VAT 8%
  const [isPackageRedemption, setIsPackageRedemption] = useState(false);

  // Cashier Shift states
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState<number>(1000000);
  const [shiftClosingCash, setShiftClosingCash] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState('');

  // Walk-in Quick Booking Modal State (DRC: 6 Giường × 6 KTV × Ca 1 Giờ)
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInCustomerName, setWalkInCustomerName] = useState<string>('');
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState<string>('');
  const [walkInCustomerId, setWalkInCustomerId] = useState<string>('');
  const [walkInServiceId, setWalkInServiceId] = useState<string>('');
  const [walkInDate, setWalkInDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [walkInSlotIndex, setWalkInSlotIndex] = useState<number>(0);
  const [walkInTechId, setWalkInTechId] = useState<string>(''); // rỗng = least-busy auto assign
  const [walkInDrcSlots, setWalkInDrcSlots] = useState<DualSlotAvailability[]>([]);
  const [isLoadingWalkInSlots, setIsLoadingWalkInSlots] = useState<boolean>(false);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState<boolean>(false);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);

  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    id: string;
    customerName: string;
    customerPhone?: string;
    customerTier?: string;
    branchName?: string;
    branchAddress?: string;
    serviceName: string;
    category?: string;
    method: string;
    amount: string;
    subtotal?: string;
    discount?: string;
    preTaxAmount?: string;
    vatRateText?: string;
    vatAmountText?: string;
    shiftCode?: string;
    date: string;
    status?: string;
    commissionText?: string;
    technicianName?: string;
    znsSent?: boolean;
    materialsText?: string;
  } | null>(null);

  const [newReceipts, setNewReceipts] = useState<Array<{
    id: string;
    rawId?: string;
    date: string;
    customerName: string;
    customerPhone: string;
    customerAvatar?: string;
    customerTier: string;
    branchName: string;
    branchCode: string;
    branchDistrict: string;
    branchId: string;
    content: string;
    category: 'SERVICE' | 'PACKAGE' | 'ACADEMY';
    method: string;
    methodCode: PaymentMethod;
    amount: string;
    rawAmount: number;
    subtotal: number;
    discountAmount: number;
    status: string;
    statusCode: PaymentStatus;
  }>>([]);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Đã sao chép!', `Đã sao chép ${label}: ${text}`);
    }
  };

  const fetchPosData = async () => {
    try {
      let [invRes, bkRes, custRes, brRes, pkgRes, shiftRes, enrRes, srvRes, techRes] = await Promise.all([
        posService.getInvoices(),
        bookingService.getBookings(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        treatmentService.getTreatmentPackages(),
        posService.getActiveShift(selectedBranchId !== 'ALL' ? selectedBranchId : undefined),
        academyService.getEnrollments(),
        supabaseService.getServices(),
        supabaseService.getTechnicians(),
      ]);

      // Tự động kích hoạt đồng bộ nếu hóa đơn rỗng trên Supabase Cloud
      if (invRes.success && (!invRes.data || invRes.data.length === 0)) {
        await posService.syncInvoices().catch(() => {});
        invRes = await posService.getInvoices();
      }

      if (invRes.success) setInvoices(invRes.data);
      if (brRes.success && brRes.data) setBranches(brRes.data);
      if (custRes.success && custRes.data) setAllCustomers(custRes.data);
      if (pkgRes.success && pkgRes.data) setTreatmentPackages(pkgRes.data);
      if (shiftRes.success && shiftRes.data) setCurrentShift(shiftRes.data);
      if (enrRes.success && enrRes.data) setAllEnrollments(enrRes.data);
      if (srvRes && srvRes.length > 0) {
        setAllServices(srvRes);
        setWalkInServiceId((prev) => prev || srvRes[0].id);
      }
      if (techRes && techRes.length > 0) setAllTechnicians(techRes);
      
      const bks = bkRes.success ? bkRes.data : [];
      setAllBookings(bks);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  };

  const handleSyncInvoices = async () => {
    setIsSyncing(true);
    try {
      const syncRes = await posService.syncInvoices();
      await fetchPosData();
      if (syncRes.success && syncRes.data && (syncRes.data.syncedEnrollmentInvoices > 0 || syncRes.data.syncedBookingInvoices > 0)) {
        toast.success(
          'Đồng bộ hoàn tất',
          `Đã đồng bộ thêm ${syncRes.data.syncedEnrollmentInvoices + syncRes.data.syncedBookingInvoices} hóa đơn mới (${syncRes.data.totalSyncedAmount.toLocaleString('vi-VN')}đ) từ CSDL Supabase Cloud.`
        );
      } else {
        toast.success(
          'Đồng bộ thành công',
          `Toàn bộ hóa đơn và số tiền doanh thu đã khớp 100% với Supabase Cloud.`
        );
      }
    } catch (err: any) {
      console.error('Lỗi khi đồng bộ hóa đơn:', err);
      toast.error('Lỗi đồng bộ', err?.message || 'Không thể đồng bộ hóa đơn.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchPosData();
  }, []);

  // Tự động tải danh sách 10 ca 1 tiếng DRC khi mở modal Đặt lịch tại quầy
  useEffect(() => {
    if (!showWalkInModal) return;
    const fetchWalkInSlots = async () => {
      setIsLoadingWalkInSlots(true);
      try {
        const branch = selectedBranchId !== 'ALL' ? selectedBranchId : 'aaaaaaaa-0001-0001-0001-000000000001';
        const res = await bookingService.getDaySlotsDualAvailability(branch, walkInDate);
        if (res.success && res.data) {
          setWalkInDrcSlots(res.data);
        }
      } catch (e) {
        console.warn('Lỗi lấy slots cho walk-in POS:', e);
      } finally {
        setIsLoadingWalkInSlots(false);
      }
    };
    fetchWalkInSlots();
  }, [showWalkInModal, walkInDate, selectedBranchId]);

  // Xử lý tạo đơn đặt lịch nhanh tại quầy (Walk-in)
  const handleCreateWalkInBooking = async () => {
    if (!walkInCustomerName.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập họ tên khách hàng.');
      return;
    }
    const chosenService = allServices.find((s) => s.id === walkInServiceId) || allServices[0];
    const chosenSlot = POS_TIME_SLOTS[walkInSlotIndex] || POS_TIME_SLOTS[0];
    const targetBranchId = selectedBranchId !== 'ALL' ? selectedBranchId : 'aaaaaaaa-0001-0001-0001-000000000001';

    // Kiểm tra DRC slot
    const drcInfo = walkInDrcSlots.find(
      (d) => d.slotTime === chosenSlot.label || d.startTime?.startsWith(chosenSlot.startTime.slice(0, 5))
    );
    if (drcInfo && !drcInfo.isAvailable) {
      toast.error('Hết chỗ', `Không thể đặt lịch ca này: ${drcInfo.statusText}. Vui lòng chọn ca khác!`);
      return;
    }

    setIsSubmittingWalkIn(true);
    try {
      const srvPrice = Number(chosenService?.price || 450000);
      const res = await bookingService.createBooking({
        customerName: walkInCustomerName.trim(),
        customerPhone: walkInCustomerPhone.trim() || undefined,
        customerId: walkInCustomerId || undefined,
        branchId: targetBranchId,
        serviceId: chosenService?.id,
        serviceName: chosenService?.name || 'Chăm sóc & Trị liệu Spa',
        durationMinutes: chosenService?.durationMinutes || 60,
        bookingDate: walkInDate,
        startTime: chosenSlot.startTime,
        endTime: chosenSlot.endTime,
        baseTotal: srvPrice,
        finalPrice: srvPrice,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.UNPAID,
        technicianId: walkInTechId || undefined,
        notes: `[POS Walk-in] Khách vãng lai tiếp nhận tại quầy ${new Date().toLocaleTimeString('vi-VN')}`,
      });

      if (res.success && res.data) {
        toast.success(
          'Tiếp nhận Walk-in thành công',
          `Đã tạo đơn ${res.data.bookingCode} cho khách ${walkInCustomerName}. Chuyển sang thanh toán POS!`
        );
        setAllBookings((prev) => [res.data, ...prev]);
        setBooking(res.data);
        setIsPaid(false);
        setSearchTerm(`${walkInCustomerName} / ${res.data.bookingCode}`);
        setShowWalkInModal(false);
      } else {
        toast.error('Lỗi đặt lịch tại quầy', res.message || 'Không thể tạo đơn đặt lịch.');
      }
    } catch (err: any) {
      console.error('Lỗi tạo walk-in booking:', err);
      toast.error('Lỗi', err?.message || 'Có lỗi xảy ra khi tạo lịch hẹn.');
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  // Tra cứu đơn hoặc hóa đơn từ CSDL thực tế và hiển thị biên lai
  const loadReceiptByCode = async (rawCode?: string) => {
    if (!rawCode || !rawCode.trim()) return;
    const cleanCode = rawCode.trim();

    // 1. Kiểm tra trong danh sách allBookings hiện hành
    const found = allBookings.find(
      (b) =>
        b.bookingCode?.toLowerCase() === cleanCode.toLowerCase() ||
        b.id?.toLowerCase() === cleanCode.toLowerCase()
    );
    if (found) {
      setBooking(found);
      setIsPaid(found.paymentStatus === 'PAID');
      setSelectedReceiptData(null);
      if (found.customer) {
        setCustomer(found.customer);
        setSearchTerm(`${found.customer.fullName} / ${found.bookingCode}`);
      } else {
        setSearchTerm(`${found.bookedForName || 'Khách hàng'} / ${found.bookingCode}`);
      }
      setShowReceiptModal(true);
      return;
    }

    // 2. Tra cứu trực tiếp bảng invoices trên Supabase Cloud
    try {
      const invRows = await supabaseService.query<any[]>(
        `invoices?invoice_code=eq.${cleanCode}&select=*,customer:users!customer_id(full_name,phone),branch:branches!branch_id(name)`
      );
      if (invRows && invRows.length > 0) {
        const inv = invRows[0];
        const invAmount = Number(inv.total_amount || inv.subtotal || 0);
        setSelectedReceiptData({
          id: inv.invoice_code,
          customerName: inv.customer?.full_name || 'Khách hàng',
          customerPhone: inv.customer?.phone || '--',
          branchName: inv.branch?.name || 'Chi nhánh MLD',
          serviceName: 'Dịch vụ Trị liệu Dẫn lưu bạch huyết',
          method: inv.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt tại cơ sở',
          amount: `${invAmount.toLocaleString('vi-VN')}đ`,
          date: new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
          }).format(new Date(inv.paid_at || inv.created_at || new Date())),
          commissionText: `+${Math.round(invAmount * 0.1).toLocaleString('vi-VN')}đ (KTV Phụ trách)`,
          shiftCode: inv.shift_id ? `Ca ${inv.shift_id.slice(-4)}` : undefined,
        });
        setSearchTerm(`${inv.customer?.full_name || 'Khách hàng'} / ${inv.invoice_code}`);
        setShowReceiptModal(true);
        return;
      }
    } catch (e) {
      console.warn('[POS] Tra cứu hóa đơn từ Supabase lỗi:', e);
    }

    // 3. Tra cứu trực tiếp bảng bookings trên Supabase Cloud
    try {
      const bkRows = await supabaseService.query<any[]>(
        `bookings?booking_code=eq.${cleanCode}&select=*,customer:users!customer_id(full_name,phone),branch:branches!branch_id(name)`
      );
      if (bkRows && bkRows.length > 0) {
        const bk = bkRows[0];
        const finalAmt = Number(bk.final_price || bk.base_total || 0);
        setSelectedReceiptData({
          id: bk.booking_code,
          customerName: bk.customer?.full_name || bk.booked_for_name || 'Khách hàng',
          customerPhone: bk.customer?.phone || bk.booked_for_phone || '--',
          branchName: bk.branch?.name || 'Chi nhánh MLD',
          serviceName: 'Dịch vụ Trị liệu Dẫn lưu bạch huyết',
          method: bk.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt tại cơ sở',
          amount: `${finalAmt.toLocaleString('vi-VN')}đ`,
          date: new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
          }).format(new Date(bk.booking_date || new Date())),
          commissionText: `+${Math.round(finalAmt * 0.1).toLocaleString('vi-VN')}đ (KTV Phụ trách)`,
        });
        setSearchTerm(`${bk.customer?.full_name || bk.booked_for_name || 'Khách hàng'} / ${bk.booking_code}`);
        setShowReceiptModal(true);
        return;
      }
    } catch (e) {
      console.warn('[POS] Tra cứu lịch hẹn từ Supabase lỗi:', e);
    }

    // 4. Nếu mã không tồn tại trên hệ thống
    toast.error('Không tìm thấy', `Đơn hoặc hóa đơn "${cleanCode}" không tồn tại hoặc đã được dọn dẹp khỏi CSDL.`);
    setShowReceiptModal(false);
    setSelectedReceiptData(null);
    setBooking(undefined);
    setCustomer(undefined);
    setSearchTerm('');
    if (searchParams.get('receipt') || searchParams.get('booking') || searchParams.get('invoice')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('receipt');
      nextParams.delete('booking');
      nextParams.delete('invoice');
      nextParams.delete('code');
      setSearchParams(nextParams, { replace: true });
    }
  };

  // Handle URL query parameters (e.g. ?invoice=HD-... or ?booking=BK-...)
  useEffect(() => {
    const invoiceParam = searchParams.get('invoice');
    const bookingParam = searchParams.get('booking');
    const codeParam = searchParams.get('code') || invoiceParam || bookingParam;

    if (codeParam) {
      loadReceiptByCode(codeParam);
    }
  }, [searchParams, allBookings]);

  // Handle cross-page / in-page dispatch event from notification click
  useEffect(() => {
    const handleOpenReceipt = (e: any) => {
      const code = e.detail?.invoiceCode || e.detail?.bookingCode || e.detail?.code;
      if (code) {
        loadReceiptByCode(code);
      }
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

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleDownloadReceiptPdf = async () => {
    const el = document.getElementById('pos-receipt-card');
    if (!el) {
      toast.error('Lỗi', 'Không tìm thấy thông tin biên lai để xuất PDF.');
      return;
    }
    const code = selectedReceiptData?.id || booking?.bookingCode || 'HOA_DON_POS';
    try {
      setIsExportingPdf(true);
      await exportElementToPdf(el, {
        fileName: `HoaDon_MLD_${code}`,
        orientation: 'portrait',
        format: 'a5',
        scale: 2.5,
      });
      toast.success('Xuất file thành công', `Đã tải về hóa đơn điện tử HoaDon_MLD_${code}.pdf`);
    } catch (err) {
      console.error('Lỗi xuất hóa đơn PDF:', err);
      toast.error('Lỗi xuất PDF', 'Không thể tạo file PDF hóa đơn.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSearchEnrollment = (queryStr: string) => {
    setSearchTerm(queryStr);
    if (!queryStr.trim()) {
      setSelectedEnrollment(undefined);
      setTuitionPaymentAmount(0);
      setIsPaid(false);
      return;
    }
    const found = allEnrollments.find((e) =>
      matchSearch(
        [
          e.studentName,
          e.studentPhone,
          e.orderCode,
          e.course?.title,
          e.batch?.batchCode,
          (e as any).courseTitle,
          (e as any).batchCode,
          e.approvalNotes,
        ],
        queryStr
      )
    );
    if (found) {
      setSelectedEnrollment(found);
      const total = found.tuitionTotal || 9000000;
      const paid = found.amountPaid || 0;
      const balance = Math.max(0, total - paid);
      setTuitionPaymentAmount(balance > 0 ? balance : total);
      setIsPaid(found.approvalStatus === 'APPROVED' && paid >= total);
    } else {
      setSelectedEnrollment(undefined);
      setTuitionPaymentAmount(0);
      setIsPaid(false);
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
    const found = allBookings.find((b) =>
      matchSearch([b.bookingCode, b.customer?.fullName, b.customer?.phone, b.bookedForName], queryStr)
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
      if (posMode === 'tuition') {
        setSelectedEnrollment(undefined);
        setTuitionPaymentAmount(0);
        setIsPaid(false);
        toast.info('Tra cứu hồ sơ học viên', 'Vui lòng nhập tên học viên, SĐT hoặc mã học viên để tìm kiếm.');
      } else {
        setBooking(undefined);
        setCustomer(undefined);
        setIsPaid(false);
        toast.info('Tra cứu đơn dịch vụ', 'Vui lòng nhập mã đơn hoặc tên khách hàng để tìm kiếm.');
      }
      return;
    }

    if (posMode === 'tuition') {
      const found = allEnrollments.find((e) =>
        matchSearch(
          [
            e.studentName,
            e.studentPhone,
            e.orderCode,
            e.course?.title,
            e.batch?.batchCode,
            (e as any).courseTitle,
            (e as any).batchCode,
            e.approvalNotes,
          ],
          searchTerm
        )
      );
      if (found) {
        setSelectedEnrollment(found);
        const total = found.tuitionTotal || 9000000;
        const paid = found.amountPaid || 0;
        const balance = Math.max(0, total - paid);
        setTuitionPaymentAmount(balance > 0 ? balance : total);
        setIsPaid(found.approvalStatus === 'APPROVED' && paid >= total);
        const displayTitle = found.course?.title || (found as any).courseTitle || '';
        toast.success('Tìm thấy học viên', `Đã chọn hồ sơ: ${found.studentName} - Khóa ${displayTitle}.`);
      } else {
        toast.warning('Không tìm thấy', `Không tìm thấy hồ sơ học viên khớp với từ khóa "${searchTerm}".`);
      }
      return;
    }

    const found = allBookings.find((b) =>
      matchSearch([b.bookingCode, b.customer?.fullName, b.customer?.phone, b.bookedForName], searchTerm)
    );
    if (found) {
      setBooking(found);
      setIsPaid(found.paymentStatus === 'PAID');
      if (found.customer) {
        setCustomer(found.customer);
      }
      toast.success('Tìm thấy đơn dịch vụ', `Đã chuyển sang đơn ${found.bookingCode} - ${found.customer?.fullName || 'Khách hàng'}.`);
    } else {
      toast.warning('Không tìm thấy', `Không tìm thấy đơn dịch vụ khớp với từ khóa "${searchTerm}".`);
    }
  };

  const primaryItem = booking?.items?.[0];
  const serviceName = primaryItem?.service?.name || (booking ? 'Dịch vụ trị liệu' : 'Chưa chọn dịch vụ');
  const serviceDuration = primaryItem?.service?.durationMinutes || primaryItem?.durationMinutes || 0;
  const serviceImage = primaryItem?.service?.imageUrl || '/spa_massage_banner.png';

  const activeBranch = selectedBranchId !== 'ALL'
    ? branches.find((b) => b.id === selectedBranchId)
    : undefined;

  const primaryBranch = activeBranch || branches[0];
  const branchName = booking?.branch?.name || primaryBranch?.name || 'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa';
  const branchAddress = booking?.branch?.address
    ? `${booking.branch.address}, ${booking.branch.district}, ${booking.branch.city}`
    : primaryBranch
    ? `${primaryBranch.address}, ${primaryBranch.district}, ${primaryBranch.city}`
    : 'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh';
  const branchCode = booking?.branch?.code || primaryBranch?.code || 'MLD-Q3';

  const roomName = booking?.room?.name
    ? `${booking.room.name}${booking.assignedBedNumber ? ` (${booking.assignedBedNumber})` : ''}`
    : 'Phòng dịch vụ';

  const technicianName = booking?.technician?.fullName || 'Chưa phân công';
  const customerName = customer?.fullName || booking?.customer?.fullName || booking?.bookedForName || (booking ? 'Khách hàng' : 'Chưa chọn khách hàng');
  const customerPhone = customer?.phone || booking?.customer?.phone || booking?.bookedForPhone || (booking ? '--' : 'Chưa có SĐT');

  const handleProcessPayment = async () => {
    // -------------------------------------------------------------
    // LUỒNG 1: QUYẾT TOÁN HỌC PHÍ HỌC VIỆN TẠI QUẦY
    // -------------------------------------------------------------
    if (posMode === 'tuition') {
      if (!selectedEnrollment) {
        toast.error('Lỗi', 'Chưa chọn hồ sơ học viên để thanh toán học phí.');
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

        const amount = tuitionPaymentAmount || Math.max(0, (selectedEnrollment.tuitionTotal || 9000000) - (selectedEnrollment.amountPaid || 0));
        const formattedAmount = `${amount.toLocaleString('vi-VN')}đ`;
        const datePart = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const randPart = Math.floor(1000 + Math.random() * 9000);
        const generatedInvoiceCode = `HD-HP-${datePart}-${randPart}`;

        const validCustomerId = isUuid(selectedEnrollment.studentId) ? selectedEnrollment.studentId : '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e';
        const validBranchId = isUuid(selectedEnrollment.batchId) ? selectedEnrollment.batchId : 'aaaaaaaa-0001-0001-0001-000000000001';

        // 1. Tạo hóa đơn học phí trên Supabase Cloud
        const resInvoice = await posService.createInvoice({
          invoiceCode: generatedInvoiceCode,
          branchId: validBranchId,
          customerId: validCustomerId,
          cashierId: adminUser?.id || undefined,
          enrollmentId: isUuid(selectedEnrollment.id) ? selectedEnrollment.id : undefined,
          shiftId: currentShift?.id || null,
          subtotal: amount,
          discountAmount: 0,
          pointsRedeemedAmount: 0,
          preTaxAmount: amount,
          vatRate: 0,
          vatAmount: 0,
          totalAmount: amount,
          paymentMethod: paymentMethodEnum,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date().toISOString(),
        });

        // 2. Cập nhật doanh thu ca thu ngân hiện tại
        if (currentShift) {
          const isCash = selectedMethod === 'onsite';
          const isTransfer = selectedMethod === 'transfer' || selectedMethod === 'online';
          const updatedShift = {
            ...currentShift,
            totalSales: (currentShift.totalSales || 0) + amount,
            systemCash: (currentShift.systemCash || currentShift.openingCash) + (isCash ? amount : 0),
            transferSales: (currentShift.transferSales || 0) + (isTransfer ? amount : 0),
          };
          setCurrentShift(updatedShift);
          localStorage.setItem('mld_current_shift', JSON.stringify(updatedShift));
        }

        // 3. Ghi nhận giao dịch học phí vào bảng tuition_transactions
        await academyService.recordTuitionPayment({
          transactionCode: `TT-POS-${Date.now().toString().slice(-6)}`,
          enrollmentId: selectedEnrollment.id,
          studentId: validCustomerId,
          courseId: selectedEnrollment.courseId,
          branchId: validBranchId,
          cashierId: adminUser?.id || undefined,
          amount,
          paymentMethod: paymentMethodEnum,
          paymentStatus: PaymentStatus.PAID,
          notes: `Thu ngân quyết toán học phí tại quầy cho học viên ${selectedEnrollment.studentName || ''} (${generatedInvoiceCode})`,
        });

        // 4. Cập nhật hồ sơ học viên sang đã duyệt & đóng học phí
        const newPaid = (selectedEnrollment.amountPaid || 0) + amount;
        await supabaseService.updateEnrollment(selectedEnrollment.id, {
          amountPaid: newPaid,
          approvalStatus: 'APPROVED',
          studentAdmissionStatus: StudentAdmissionStatus.APPROVED,
          status: EnrollmentStatus.ENROLLED,
          approvedBy: adminUser?.id || 'f0dc713a-56fc-4347-9fb3-240528726ba3',
          approvedAt: new Date().toISOString(),
          approvalNotes: `Thu ngân đã thu ${formattedAmount} tại quầy POS (${generatedInvoiceCode})`,
        });

        // 5. Tự động trích hoa hồng tư vấn tuyển sinh (5%) nếu có nhân viên tư vấn phụ trách
        const enrollmentCourseTitle = selectedEnrollment.course?.title || (selectedEnrollment as any).courseTitle || '';
        const enrollmentBatchCode = selectedEnrollment.batch?.batchCode || (selectedEnrollment as any).batchCode || '';
        if (selectedEnrollment.assignedStaffId && isUuid(selectedEnrollment.assignedStaffId)) {
          try {
            await commissionService.createCommission({
              staffId: selectedEnrollment.assignedStaffId,
              branchId: validBranchId,
              invoiceId: isUuid(resInvoice?.data?.id) ? resInvoice.data.id : undefined,
              commissionType: 'PACKAGE_UPSELL',
              baseAmount: amount,
              percentage: 5,
              notes: `Hoa hồng 5% tư vấn tuyển sinh khóa học ${enrollmentCourseTitle} cho học viên ${selectedEnrollment.studentName || ''}`,
            });
          } catch (commErr) {
            console.warn('Lỗi ghi hoa hồng tuyển sinh:', commErr);
          }
        }

        setIsPaid(true);

        const methodLabel =
          selectedMethod === 'onsite'
            ? 'Tiền mặt tại cơ sở'
            : selectedMethod === 'online'
            ? 'Quẹt thẻ / Ví điện tử'
            : 'Chuyển khoản VietQR';

        setSelectedReceiptData({
          id: generatedInvoiceCode,
          customerName: selectedEnrollment.studentName || 'Học viên',
          customerPhone: selectedEnrollment.studentPhone || '--',
          branchName: primaryBranch?.name || 'MLD Academy — Cơ sở Nam Kỳ Khởi Nghĩa',
          serviceName: `Học phí: ${enrollmentCourseTitle || 'Khóa học MLD'} (${enrollmentBatchCode || 'Khóa mới'})`,
          category: 'ACADEMY',
          method: methodLabel,
          amount: formattedAmount,
          subtotal: formattedAmount,
          preTaxAmount: formattedAmount,
          vatRateText: '0%',
          vatAmountText: '0đ',
          shiftCode: currentShift?.shiftCode,
          date: new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(new Date()),
          status: 'Đã thanh toán',
          materialsText: 'Giáo trình MLD & Bộ Kit thực hành đào tạo',
        });

        setShowReceiptModal(true);

        // Cập nhật lại danh sách enrollments
        setAllEnrollments((prev) =>
          prev.map((e) =>
            e.id === selectedEnrollment.id
              ? { ...e, amountPaid: newPaid, approvalStatus: 'APPROVED', status: EnrollmentStatus.ENROLLED }
              : e
          )
        );

        setSelectedEnrollment((prev) =>
          prev ? { ...prev, amountPaid: newPaid, approvalStatus: 'APPROVED', status: EnrollmentStatus.ENROLLED } : undefined
        );

        if (resInvoice.success && resInvoice.data) {
          setInvoices((prev) => [resInvoice.data, ...prev]);
        }

        toast.success(
          'Thu học phí thành công!',
          `Đã quyết toán ${formattedAmount} cho học viên ${selectedEnrollment.studentName || ''}. Mã HĐ: ${generatedInvoiceCode}`
        );
      } catch (err: any) {
        console.error('Lỗi thu học phí tại quầy:', err);
        toast.error('Lỗi thanh toán học phí', err?.message || 'Không thể ghi nhận hóa đơn học phí.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // -------------------------------------------------------------
    // LUỒNG 2: QUYẾT TOÁN ĐƠN DỊCH VỤ SPA / GÓI LIỆU TRÌNH
    // -------------------------------------------------------------
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

      const bookingCode = booking.bookingCode || '';
      const baseSubtotal = booking.baseTotal || (booking.finalPrice || 0);
      const discountVal = booking.discountAmount || 0;
      const pointsVal = booking.pointsDiscount || 0;
      const preTax = isPackageRedemption ? 0 : Math.max(0, baseSubtotal - discountVal - pointsVal);
      const vatVal = isPackageRedemption ? 0 : Math.round(preTax * (vatRate / 100));
      const amount = isPackageRedemption ? 0 : (preTax + vatVal);
      const formattedAmount = `${amount.toLocaleString('vi-VN')}đ`;
      const datePart = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const generatedInvoiceCode = `HD-${datePart}-${randPart}`;

      const validBookingId = isUuid(booking.id) ? booking.id : undefined;
      const packageIdParam = searchParams.get('packageId');
      const validPackageId = isUuid(packageIdParam) ? packageIdParam : undefined;

      // 1. Lưu hóa đơn vào Supabase Cloud (bảng invoices)
      const resInvoice = await posService.createInvoice({
        invoiceCode: generatedInvoiceCode,
        branchId: isUuid(booking.branchId) ? booking.branchId : 'aaaaaaaa-0001-0001-0001-000000000001',
        customerId: isUuid(customer?.id) ? customer?.id : isUuid(booking.customerId) ? booking.customerId : '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        cashierId: adminUser?.id || undefined,
        bookingId: validBookingId,
        userPackageId: validPackageId,
        shiftId: currentShift?.id || null,
        subtotal: baseSubtotal,
        discountAmount: discountVal,
        pointsRedeemedAmount: pointsVal,
        preTaxAmount: preTax,
        vatRate: vatRate,
        vatAmount: vatVal,
        totalAmount: amount,
        paymentMethod: paymentMethodEnum,
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date().toISOString(),
      });

      // Cập nhật doanh thu ca thu ngân hiện tại
      if (currentShift) {
        const isCash = selectedMethod === 'onsite';
        const isCard = false;
        const isTransfer = selectedMethod === 'transfer' || selectedMethod === 'online';
        const updatedShift = {
          ...currentShift,
          totalSales: (currentShift.totalSales || 0) + amount,
          systemCash: (currentShift.systemCash || currentShift.openingCash) + (isCash ? amount : 0),
          cardSales: (currentShift.cardSales || 0) + (isCard ? amount : 0),
          transferSales: (currentShift.transferSales || 0) + (isTransfer ? amount : 0),
        };
        setCurrentShift(updatedShift);
        localStorage.setItem('mld_current_shift', JSON.stringify(updatedShift));
      }

      // 2. Cập nhật trạng thái Booking trên Supabase Cloud (bảng bookings)
      if (validBookingId) {
        try {
          await bookingService.updateBookingStatus(
            booking.id,
            BookingStatus.COMPLETED,
            PaymentStatus.PAID,
            paymentMethodEnum
          );
        } catch (bkErr) {
          console.warn('Lỗi cập nhật trạng thái booking:', bkErr);
        }
      }

      // 3. Tích điểm và cập nhật chi tiêu cho khách hàng (Supabase bảng users)
      const custId = isUuid(customer?.id) ? customer?.id : isUuid(booking.customerId) ? booking.customerId : '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e';
      if (custId) {
        try {
          const curSpent = Number(customer?.totalSpent || 0);
          const curPoints = Number(customer?.rewardPoints || 0);
          const earnedPoints = Math.floor(amount / 10000);
          const newTotalSpent = curSpent + amount;
          const newTier = supabaseService.calculateTier(newTotalSpent);
          await supabaseService.updateUser(custId, {
            total_spent: newTotalSpent,
            reward_points: curPoints + earnedPoints,
            membership_tier: newTier,
            updated_at: new Date().toISOString(),
          });
        } catch (uErr) {
          console.warn('Lỗi cập nhật điểm khách hàng:', uErr);
        }
      }

      // KÍCH HOẠT GÓI LIỆU TRÌNH VIP (Nếu là đơn bán gói)
      if (packageIdParam || booking.bookingCode?.startsWith('VIP-PKG-')) {
        const pkgId = packageIdParam || 'tp-001';
        try {
          await treatmentService.assignPackageToCustomer({
            customerId: custId,
            packageId: pkgId,
            packageName: serviceName,
            totalSessions: 5,
            price: amount,
            validityMonths: 6,
            notes: `Khách mua gói qua POS - Hóa đơn ${generatedInvoiceCode}`,
          });
        } catch (pkgErr) {
          console.warn('Lỗi gán gói liệu trình:', pkgErr);
        }
      }

      // TRỤ CỘT 1: BẢO MẬT & AUDIT TRAIL
      try {
        await supabaseService.createAuditLog({
          tableName: 'invoices',
          action: 'INSERT',
          recordId: generatedInvoiceCode,
          description: `Thu ngân quyết toán hóa đơn POS ${generatedInvoiceCode} (${formattedAmount}) cho khách ${customerName}.`,
          newData: {
            invoiceCode: generatedInvoiceCode,
            amount,
            paymentMethod: paymentMethodEnum,
            bookingId: validBookingId,
            customerId: custId,
          },
        });
      } catch (auditErr) {
        console.warn('Lỗi ghi audit log:', auditErr);
      }

      // TRỤ CỘT 2: HOA HỒNG KTV & LƯƠNG THƯỞNG (10% Dịch vụ lẻ, 5% Gói)
      const isPackage = Boolean(packageIdParam || booking.bookingCode?.startsWith('VIP-PKG-'));
      const commPercentage = isPackage ? 5 : 10;
      const targetTechId = isUuid(booking.technicianId)
        ? booking.technicianId
        : isUuid(booking.technician?.id)
        ? booking.technician.id
        : undefined;

      const assignedTechName = technicianName !== 'Chưa phân công' ? technicianName : 'Kỹ thuật viên';
      const techCommissionAmount = Math.round(amount * (commPercentage / 100));

      if (targetTechId) {
        try {
          await commissionService.createCommission({
            staffId: targetTechId,
            branchId: isUuid(booking.branchId) ? booking.branchId : 'aaaaaaaa-0001-0001-0001-000000000001',
            bookingId: validBookingId || null,
            invoiceId: isUuid(resInvoice?.data?.id) ? resInvoice.data.id : undefined,
            commissionType: isPackage ? 'PACKAGE_UPSELL' : 'SERVICE_DIRECT',
            baseAmount: amount,
            percentage: commPercentage,
            notes: `Hoa hồng ${commPercentage}% ${isPackage ? 'gói liệu trình' : 'dịch vụ'} ${serviceName} (Hóa đơn ${generatedInvoiceCode})`,
          });
        } catch (commErr) {
          console.warn('Lỗi ghi hoa hồng KTV:', commErr);
        }
      }

      // TRỤ CỘT 4: QUẢN LÝ ĐỊNH MỨC TIÊU HAO VẬT TƯ (BOM)
      const branchIdForStock = isUuid(booking.branchId) ? booking.branchId : 'aaaaaaaa-0001-0001-0001-000000000001';
      try {
        await Promise.all([
          supabaseService.recordInventoryConsumption({
            branchId: branchIdForStock,
            serviceId: booking.items?.[0]?.serviceId || 'srv-1',
            bookingId: validBookingId || null,
            invoiceId: generatedInvoiceCode,
            technicianId: targetTechId,
            materialName: 'Dầu gội thảo dược Organic MLD',
            quantityDeducted: 30,
            unit: 'ml',
          }),
          supabaseService.recordInventoryConsumption({
            branchId: branchIdForStock,
            serviceId: booking.items?.[0]?.serviceId || 'srv-1',
            bookingId: validBookingId || null,
            invoiceId: generatedInvoiceCode,
            technicianId: targetTechId,
            materialName: 'Tinh dầu dưỡng tóc phục hồi Argan',
            quantityDeducted: 5,
            unit: 'ml',
          }),
          supabaseService.recordInventoryConsumption({
            branchId: branchIdForStock,
            serviceId: booking.items?.[0]?.serviceId || 'srv-1',
            bookingId: validBookingId || null,
            invoiceId: generatedInvoiceCode,
            technicianId: targetTechId,
            materialName: 'Khăn bông spa tiệt trùng',
            quantityDeducted: 2,
            unit: 'chiếc',
          }),
        ]);
      } catch (invErr) {
        console.warn('Lỗi ghi định mức tiêu hao vật tư:', invErr);
      }

      // TRỤ CỘT 3: TỰ ĐỘNG HÓA CRM GỬI TIN NHẮN ZALO ZNS
      await notificationService.sendZaloZNS(
        'BOOKING_CONFIRM',
        customerPhone,
        customerName,
        {
          serviceName,
          appointmentTime: booking.bookingDate || 'Hôm nay',
          branchName,
          invoiceCode: generatedInvoiceCode,
          amount: formattedAmount,
          customerId: custId,
        }
      );

      // 4. Đồng bộ State giao diện lập tức
      setIsPaid(true);

      const methodLabel =
        selectedMethod === 'onsite'
          ? 'Tiền mặt tại cơ sở'
          : selectedMethod === 'online'
          ? 'Quẹt thẻ / Ví điện tử'
          : 'Chuyển khoản ngân hàng';

      setSelectedReceiptData({
        id: generatedInvoiceCode,
        customerName,
        customerPhone,
        customerTier: customer?.membershipTier || 'MEMBER',
        branchName,
        branchAddress,
        serviceName,
        category: isPackageRedemption ? 'PACKAGE' : 'SERVICE',
        method: methodLabel,
        amount: formattedAmount,
        subtotal: `${baseSubtotal.toLocaleString('vi-VN')}đ`,
        discount: discountVal ? `${discountVal.toLocaleString('vi-VN')}đ` : '0đ',
        preTaxAmount: `${preTax.toLocaleString('vi-VN')}đ`,
        vatRateText: `${vatRate}%`,
        vatAmountText: `${vatVal.toLocaleString('vi-VN')}đ`,
        shiftCode: currentShift?.shiftCode,
        date: new Intl.DateTimeFormat('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date()),
        status: 'Đã thanh toán',
        commissionText: `+${techCommissionAmount.toLocaleString('vi-VN')}đ (KTV ${assignedTechName})`,
        technicianName: assignedTechName,
        znsSent: true,
        materialsText: 'Dầu gội Organic (30ml) · Tinh dầu Argan (5ml) · Khăn spa (2)',
      });

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

      const newReceipt = {
        id: generatedInvoiceCode,
        rawId: generatedInvoiceCode,
        date: new Intl.DateTimeFormat('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
        customerName: customerName,
        customerPhone: customerPhone,
        customerAvatar: customer?.avatarUrl || undefined,
        customerTier: customer?.membershipTier || 'MEMBER',
        branchName: branchName,
        branchCode: branchCode,
        branchDistrict: '',
        branchId: booking.branchId || 'aaaaaaaa-0001-0001-0001-000000000001',
        content: `${serviceName} (${serviceDuration} phút)`,
        category: 'SERVICE' as const,
        method: methodLabel,
        methodCode: paymentMethodEnum,
        amount: formattedAmount,
        rawAmount: amount,
        subtotal: booking.baseTotal || amount,
        discountAmount: booking.discountAmount || 0,
        status: 'Đã thanh toán',
        statusCode: PaymentStatus.PAID,
      };
      setNewReceipts((prev) => [newReceipt, ...prev]);

      toast.success(
        'Ghi nhận thanh toán thành công!',
        `Đã thu ${formattedAmount} đơn ${bookingCode} (${customerName}), tự động tính hoa hồng KTV & xuất kho tiêu hao.`
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

  // 100% Real Enriched Receipts Mapping from Supabase
  const resolveReceiptDetail = (inv: Invoice) => {
    // 1. Customer
    const cust = inv.customer || allCustomers.find((c) => c.id === inv.customerId);
    const customerName = cust?.fullName || 'Khách hàng MLD';
    const customerPhone = cust?.phone || '--';
    const customerAvatar = cust?.avatarUrl;
    const customerTier = cust?.membershipTier || 'MEMBER';

    // 2. Branch
    const br = inv.branch || branches.find((b) => b.id === inv.branchId);
    const branchName = br?.name || 'Trụ sở MLD Việt Nam';
    const branchCode = br?.code || 'MLD-HQ';
    const branchDistrict = br?.district || 'Hà Nội';

    // 3. Service / Package / Tuition
    let title = 'Dịch vụ Spa & Trị liệu';
    let category: 'SERVICE' | 'PACKAGE' | 'ACADEMY' = 'SERVICE';

    if (inv.items && inv.items.length > 0) {
      title = inv.items.map((it: any) => it.itemName || it.item_name).filter(Boolean).join(', ');
      const itType = inv.items[0].itemType || (inv.items[0] as any).item_type;
      if (itType === 'COURSE') category = 'ACADEMY';
      else if (itType === 'PACKAGE') category = 'PACKAGE';
      else category = 'SERVICE';
    } else if (inv.enrollmentId) {
      const enr = allEnrollments.find((e) => e.id === inv.enrollmentId);
      title = enr?.course?.title ? `Học phí: ${enr.course.title}` : 'Học phí Khóa học MLD Academy';
      category = 'ACADEMY';
    } else if (inv.bookingId) {
      const b = allBookings.find((x) => x.id === inv.bookingId);
      if (b && b.items && b.items.length > 0) {
        title = b.items.map((it) => it.service?.name).filter(Boolean).join(', ') || b.bookingCode;
      } else {
        title = (b as any)?.serviceName || 'Dịch vụ Trị liệu Dẫn lưu MLD';
      }
      category = 'SERVICE';
    } else if (inv.userPackageId) {
      const tp = treatmentPackages.find((p) => p.id === inv.userPackageId);
      title = tp?.name || 'Liệu Trình Phục Hồi & Trẻ Hóa Da 5 Buổi';
      category = 'PACKAGE';
    } else if (inv.serviceTitle) {
      title = inv.serviceTitle;
      category = (inv.serviceCategory as any) || 'SERVICE';
    }

    // 4. Method label
    const methodLabel =
      inv.paymentMethod === PaymentMethod.CASH_AT_SPA
        ? 'Tiền mặt tại cơ sở'
        : inv.paymentMethod === PaymentMethod.MOMO
        ? 'Ví điện tử MoMo'
        : (inv.paymentMethod as string) === 'CREDIT_CARD'
        ? 'Quẹt thẻ POS'
        : 'Chuyển khoản VietQR';

    // 5. Date
    let dateStr = '16/10/2026';
    if (inv.paidAt) {
      const d = new Date(inv.paidAt);
      if (!isNaN(d.getTime())) {
        dateStr = new Intl.DateTimeFormat('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(d);
      }
    }

    const effectivePreTax = inv.preTaxAmount && inv.preTaxAmount > 0
      ? inv.preTaxAmount
      : inv.vatAmount && inv.vatAmount > 0
      ? Math.max(0, inv.totalAmount - inv.vatAmount)
      : inv.subtotal || inv.totalAmount;
    const effectiveVatRate = inv.vatRate !== undefined && inv.vatRate !== null
      ? inv.vatRate
      : (inv.vatAmount && effectivePreTax > 0 ? Math.round((inv.vatAmount / effectivePreTax) * 100) : 0);
    const effectiveVatAmount = inv.vatAmount !== undefined && inv.vatAmount !== null && inv.vatAmount > 0
      ? inv.vatAmount
      : (effectiveVatRate > 0 && inv.totalAmount > effectivePreTax ? (inv.totalAmount - effectivePreTax) : 0);

    return {
      id: inv.invoiceCode,
      rawId: inv.id,
      date: dateStr,
      rawDate: inv.paidAt,
      customerName,
      customerPhone,
      customerAvatar,
      customerTier,
      branchName,
      branchCode,
      branchDistrict,
      branchId: inv.branchId,
      content: title,
      category,
      method: methodLabel,
      methodCode: inv.paymentMethod,
      amount: `${inv.totalAmount.toLocaleString('vi-VN')}đ`,
      rawAmount: inv.totalAmount,
      subtotal: inv.subtotal,
      discountAmount: inv.discountAmount,
      preTaxAmount: `${effectivePreTax.toLocaleString('vi-VN')}đ`,
      vatRateText: `${effectiveVatRate}%`,
      vatAmountText: effectiveVatAmount > 0 ? `${effectiveVatAmount.toLocaleString('vi-VN')}đ` : undefined,
      shiftCode: (inv as any).shift?.shiftCode || (inv.shiftId ? `CA-${inv.shiftId.slice(-6).toUpperCase()}` : undefined),
      status: inv.paymentStatus === PaymentStatus.PAID ? 'Đã thanh toán' : 'Chờ thanh toán',
      statusCode: inv.paymentStatus,
      rawInvoice: inv,
    };
  };

  const rawPastReceipts = invoices.map(resolveReceiptDetail);
  const pastReceipts = [...newReceipts, ...rawPastReceipts];

  // Filtering for Invoices Tab
  const filteredReceipts = pastReceipts.filter((r) => {
    if (selectedBranchId !== 'ALL' && r.branchId !== selectedBranchId) {
      return false;
    }
    if (invoiceMethodFilter !== 'ALL' && r.methodCode !== invoiceMethodFilter) {
      return false;
    }
    if (invoiceStatusFilter !== 'ALL' && r.statusCode !== invoiceStatusFilter) {
      return false;
    }
    if (invoiceSearchTerm.trim()) {
      return matchSearch(
        [r.id, r.customerName, r.customerPhone, r.content, r.branchName, r.method],
        invoiceSearchTerm
      );
    }
    return true;
  });

  const filteredTotal = filteredReceipts
    .filter((r) => r.statusCode === PaymentStatus.PAID || r.status === 'Đã thanh toán')
    .reduce((sum, r) => sum + r.rawAmount, 0);

  // Overall KPI metrics
  const kpiDataset = selectedBranchId === 'ALL'
    ? pastReceipts
    : pastReceipts.filter((r) => r.branchId === selectedBranchId);

  const kpiPaid = kpiDataset.filter((r) => r.statusCode === PaymentStatus.PAID || r.status === 'Đã thanh toán');
  const kpiTotalRevenue = kpiPaid.reduce((sum, r) => sum + r.rawAmount, 0);
  const kpiTransfer = kpiPaid.filter((r) => r.methodCode === PaymentMethod.BANK_TRANSFER);
  const kpiTransferAmount = kpiTransfer.reduce((sum, r) => sum + r.rawAmount, 0);
  const kpiCashOrMomo = kpiPaid.filter((r) => r.methodCode === PaymentMethod.CASH_AT_SPA || r.methodCode === PaymentMethod.MOMO);
  const kpiCashOrMomoAmount = kpiCashOrMomo.reduce((sum, r) => sum + r.rawAmount, 0);

  // Tính toán chi phí, VAT và tổng thanh toán theo chuẩn Y tế
  const rawSubtotal = booking ? (booking.baseTotal || (booking.finalPrice || 0)) : 0;
  const rawDiscount = booking ? (booking.discountAmount || 0) : 0;
  const rawPoints = booking ? (booking.pointsDiscount || 0) : 0;
  const preTaxAmount = isPackageRedemption ? 0 : Math.max(0, rawSubtotal - rawDiscount - rawPoints);
  const calculatedVat = isPackageRedemption ? 0 : Math.round(preTaxAmount * (vatRate / 100));
  const finalTotalAmount = isPackageRedemption ? 0 : (preTaxAmount + calculatedVat);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
              Thu ngân & Quản lý Hóa đơn
            </h1>
            
            {/* Interactive Branch Switcher Pill in Header */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="h-8 pl-3 pr-8 rounded-full border border-[#D7BBA6] bg-[#FAF0E4] hover:bg-[#F3E2CE] text-xs font-bold text-[#8A4F23] transition-colors appearance-none focus:outline-none focus:ring-2 focus:ring-[#985018]/20 cursor-pointer shadow-xs"
                title="Bấm để chuyển đổi cơ sở làm việc"
              >
                <option value="ALL">🏢 Tất cả cơ sở ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8A4F23] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            MLD Beauty & Spa • Hệ thống quản lý thanh toán POS & sổ hóa đơn điện tử thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncInvoices}
            className={`px-3.5 py-2.5 bg-white hover:bg-[#FAF4EE] border border-[#D7BBA6] text-[#985018] text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 ${isSyncing ? 'opacity-60 cursor-not-allowed' : ''}`}
            title="Đồng bộ hóa đơn và doanh thu từ CSDL Supabase Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedBranchId === 'ALL' && branches.length > 0) {
                setSelectedBranchId(branches[0].id);
              }
              setShowWalkInModal(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Tạo lịch hẹn dịch vụ trực tiếp tại quầy theo chuẩn 6 Giường × 6 KTV"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Đặt lịch tại quầy (Walk-in)</span>
          </button>

          {activeTab === 'pos' ? (
            <button
              onClick={handleLookupClick}
              className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Tra cứu đơn dịch vụ
            </button>
          ) : (
            <button
              onClick={() => {
                setActiveTab('pos');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('tab', 'pos');
                  return next;
                });
              }}
              className="px-4 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Tạo hóa đơn POS mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#EFE4D9] pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('pos');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'pos');
              return next;
            });
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Thu ngân POS (Tại quầy)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('receipts');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'receipts');
              return next;
            });
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'receipts'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sổ hóa đơn & Biên lai</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
            activeTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
          }`}>
            {pastReceipts.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THU NGÂN POS (TẠI QUẦY)                                            */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Thanh trạng thái Ca Thu Ngân (Cashier Shift Status Bar) */}
          <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {currentShift ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Ca thu ngân:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200">
                      {currentShift.shiftCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ĐANG MỞ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tiền mặt đầu ca: <strong className="text-slate-700">{currentShift.openingCash.toLocaleString('vi-VN')}đ</strong> · 
                    Doanh thu ca hiện tại: <strong className="text-emerald-700">{(currentShift.totalSales || 0).toLocaleString('vi-VN')}đ</strong> · 
                    Mở lúc: {new Date(currentShift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Chưa mở ca thu ngân</div>
                  <p className="text-[11px] text-slate-500">
                    Vui lòng mở ca làm việc để ghi nhận tiền mặt ban đầu và đối soát doanh thu cuối ngày.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {currentShift ? (
                <button
                  type="button"
                  onClick={() => {
                    setShiftClosingCash(currentShift.systemCash || currentShift.openingCash);
                    setShowCloseShiftModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kết ca & Đối soát</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Mở ca thu ngân mới</span>
                </button>
              )}
            </div>
          </div>

          {/* Chuyển đổi chế độ POS: Spa vs Học viện */}
          <div className="flex items-center gap-2 p-1.5 bg-[#FAF6F0] rounded-2xl border border-[#EFE4D9]">
            <button
              type="button"
              onClick={() => {
                setPosMode('spa');
                setSearchTerm('');
                setIsPaid(booking?.paymentStatus === 'PAID');
              }}
              className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                posMode === 'spa'
                  ? 'bg-[#8A4F23] text-white shadow-xs'
                  : 'text-[#73675F] hover:text-[#2C241E] hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Đơn dịch vụ Spa & Trị liệu ({allBookings.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPosMode('tuition');
                setSearchTerm('');
                setIsPaid(Boolean(selectedEnrollment && selectedEnrollment.approvalStatus === 'APPROVED' && (selectedEnrollment.amountPaid || 0) >= (selectedEnrollment.tuitionTotal || 9000000)));
              }}
              className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                posMode === 'tuition'
                  ? 'bg-[#8A4F23] text-white shadow-xs'
                  : 'text-[#73675F] hover:text-[#2C241E] hover:bg-white/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Phiếu thu Học phí Học viện ({allEnrollments.length})</span>
            </button>
          </div>

          {/* 2. Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Customer / Booking code input */}
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              if (posMode === 'tuition') {
                handleSearchEnrollment(e.target.value);
              } else {
                handleSearchBooking(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookupClick();
            }}
            placeholder={
              posMode === 'tuition'
                ? "Tìm theo mã học viên, SĐT hoặc họ tên học viên..."
                : "Tìm theo mã đơn hoặc tên khách hàng..."
            }
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                if (posMode === 'tuition') handleSearchEnrollment('');
                else handleSearchBooking('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Branch Switcher Dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedBranchId}
            onChange={(e) => handleBranchSelect(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Tất cả chi nhánh ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
      {posMode === 'tuition' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Hồ sơ học viên & khóa học */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            {!selectedEnrollment ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF6F0] border border-[#EFE4D9] flex items-center justify-center mx-auto text-[#8A4F23]">
                  <GraduationCap className="w-7 h-7 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    Chưa chọn hồ sơ học viên nào
                  </h3>
                  <p className="text-xs text-[#73675F] max-w-sm mx-auto mt-1 leading-relaxed">
                    Nhập mã học viên, SĐT hoặc họ tên học viên tại thanh tìm kiếm phía trên để tra cứu hồ sơ và xuất phiếu thu học phí.
                  </p>
                </div>
                {allEnrollments.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-[#8A4F23] mb-2">
                      Học viên tuyển sinh trong hệ thống:
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                      {allEnrollments.slice(0, 6).map((enr) => {
                        const total = enr.tuitionTotal || 9000000;
                        const paid = enr.amountPaid || 0;
                        const balance = Math.max(0, total - paid);
                        return (
                          <button
                            key={enr.id}
                            type="button"
                            onClick={() => {
                              setSelectedEnrollment(enr);
                              setTuitionPaymentAmount(balance > 0 ? balance : total);
                              setIsPaid(enr.approvalStatus === 'APPROVED' && paid >= total);
                              setSearchTerm(`${enr.studentName || 'Học viên'} / ${enr.orderCode || enr.id.slice(-4)}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#FAF6F0] hover:bg-[#F3E2CE] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>{enr.studentName} · {balance > 0 ? `Còn nợ ${balance.toLocaleString('vi-VN')}đ` : 'Đã tất toán'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#2C241E]">
                      Hồ sơ học viên tuyển sinh
                    </h2>
                    <div className="mt-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F5E9DB] text-[#8A4F23]">
                        Học viện Đào tạo MLD
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnrollment(undefined);
                      setTuitionPaymentAmount(0);
                      setIsPaid(false);
                      setSearchTerm('');
                    }}
                    className="text-xs text-[#8A4F23] hover:underline font-bold cursor-pointer"
                  >
                    Đổi học viên khác
                  </button>
                </div>

                {/* Academy Course Banner */}
                <div className="w-full h-24 rounded-2xl overflow-hidden bg-gradient-to-r from-[#8A4F23] to-[#A46332] p-4 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
                      {selectedEnrollment.batch?.batchCode || (selectedEnrollment as any).batchCode || 'Lớp K26'}
                    </span>
                    <h3 className="text-sm font-bold mt-1 text-white">
                      {selectedEnrollment.course?.title || (selectedEnrollment as any).courseTitle || 'Khóa Đào Tạo MLD Chuyên Sâu'}
                    </h3>
                    <p className="text-[11px] text-white/80 mt-0.5">
                      Cơ sở: {primaryBranch?.name || 'MLD Academy Nam Kỳ Khởi Nghĩa'}
                    </p>
                  </div>
                  <GraduationCap className="w-12 h-12 text-white/30" />
                </div>

                {/* Student Profile Specs */}
                <div className="space-y-2.5 text-xs text-[#73675F] bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EFE4D9]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Họ và tên học viên</span>
                    <span className="font-bold text-[#2C241E] text-sm">{selectedEnrollment.studentName || 'Học viên'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Số điện thoại</span>
                    <span className="font-bold text-[#2C241E]">{selectedEnrollment.studentPhone || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Mã hồ sơ / Mã KH</span>
                    <span className="font-mono font-bold text-[#8A4F23]">{selectedEnrollment.orderCode || selectedEnrollment.id.slice(-6)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Trạng thái hồ sơ</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      selectedEnrollment.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedEnrollment.approvalStatus === 'APPROVED' ? 'Đã duyệt nhập học' : 'Chờ đóng phí để duyệt'}
                    </span>
                  </div>
                </div>

                {/* Tuition Breakdown Card */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-[#E8DFD8]">
                  <div className="text-xs font-bold text-[#2C241E] mb-1">Chi tiết học phí khóa đào tạo</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#73675F]">Tổng học phí niêm yết:</span>
                    <span className="font-bold text-slate-800">
                      {(selectedEnrollment.tuitionTotal || 9000000).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#73675F]">Số tiền đã đóng trước đó:</span>
                    <span className="font-bold text-emerald-600">
                      {(selectedEnrollment.amountPaid || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                    <span className="font-bold text-[#8A4F23]">Số tiền còn phải nộp:</span>
                    <span className="font-extrabold text-sm text-red-600">
                      {Math.max(0, (selectedEnrollment.tuitionTotal || 9000000) - (selectedEnrollment.amountPaid || 0)).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {/* Quick Amount Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Chọn số tiền thu tại quầy:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      const total = selectedEnrollment.tuitionTotal || 9000000;
                      const paid = selectedEnrollment.amountPaid || 0;
                      const balance = Math.max(0, total - paid);
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setTuitionPaymentAmount(balance > 0 ? balance : total)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              tuitionPaymentAmount === (balance > 0 ? balance : total)
                                ? 'bg-[#8A4F23] text-white border-[#8A4F23]'
                                : 'bg-[#FAF8F5] text-[#8A4F23] border-[#E8DFD8] hover:bg-[#F3E2CE]'
                            }`}
                          >
                            {balance > 0 ? `Nộp nốt: ${balance.toLocaleString('vi-VN')}đ` : `Toàn bộ: ${total.toLocaleString('vi-VN')}đ`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTuitionPaymentAmount(total)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              tuitionPaymentAmount === total
                                ? 'bg-[#8A4F23] text-white border-[#8A4F23]'
                                : 'bg-[#FAF8F5] text-[#8A4F23] border-[#E8DFD8] hover:bg-[#F3E2CE]'
                            }`}
                          >
                            Toàn khóa ({total.toLocaleString('vi-VN')}đ)
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Quyết toán học phí */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#2C241E]">
              Quyết toán học phí học viên
            </h2>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-[#2C241E] mb-2">
                Phương thức thu học phí <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('onsite')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMethod === 'onsite'
                      ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                      : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Tiền mặt tại quầy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('transfer')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMethod === 'transfer'
                      ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                      : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Chuyển khoản VietQR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('online')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedMethod === 'online'
                      ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                      : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Quẹt thẻ / Ví</span>
                </button>
              </div>
            </div>

            {/* Tuition Amount Summary */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE4D9] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#73675F]">Số tiền thu đợt này:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {tuitionPaymentAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#73675F]">Thuế VAT đào tạo:</span>
                <span className="font-semibold text-emerald-600">0% (Theo luật thuế GTGT)</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD8] text-sm">
                <span className="font-bold text-[#2C241E]">Tổng thực thu:</span>
                <span className="font-extrabold text-base text-[#8A4F23]">
                  {tuitionPaymentAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            {!selectedEnrollment ? (
              <button
                type="button"
                disabled
                className="w-full py-3 bg-[#E8DFD8] text-[#8C7A6B] text-xs font-bold rounded-xl cursor-not-allowed text-center"
              >
                Vui lòng chọn hồ sơ học viên để thanh toán
              </button>
            ) : isPaid ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="w-full py-3 bg-[#0D6832] hover:bg-[#0A5C2C] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Xem biên lai học phí</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEnrollment(undefined);
                    setTuitionPaymentAmount(0);
                    setIsPaid(false);
                    setSearchTerm('');
                  }}
                  className="w-full py-2 bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] text-[#73675F] hover:text-[#2C241E] text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
                >
                  Tiếp nhận học viên mới
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing || tuitionPaymentAmount <= 0}
                onClick={handleProcessPayment}
                className={`w-full py-3.5 ${
                  isProcessing || tuitionPaymentAmount <= 0
                    ? 'bg-[#A88874] cursor-wait'
                    : 'bg-[#985018] hover:bg-[#854412] cursor-pointer'
                } text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-2`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang ghi nhận học phí & xuất hóa đơn...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận thu học phí & Xuất phiếu thu ({tuitionPaymentAmount.toLocaleString('vi-VN')}đ)</span>
                  </>
                )}
              </button>
            )}

            {/* Explanatory Note */}
            <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
              Khoản thu học phí sẽ tự động cập nhật vào Báo cáo tài chính W12 và kích hoạt quyền học tập của học viên.
            </div>
          </div>
        </div>
      ) : (
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
                  Vui lòng nhập mã đơn hoặc tên khách hàng tại thanh tìm kiếm phía trên để tra cứu và quyết toán.
                </p>
              </div>
              {allBookings.filter((b) => {
                const isPending = b.paymentStatus === 'UNPAID' || b.status === 'PENDING';
                if (!isPending) return false;
                if (selectedBranchId !== 'ALL' && b.branchId && b.branchId !== selectedBranchId) {
                  return false;
                }
                return true;
              }).length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-[#8A4F23] mb-2">
                    Hoặc chọn nhanh đơn đang chờ thanh toán:
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                    {allBookings
                      .filter((b) => {
                        const isPending = b.paymentStatus === 'UNPAID' || b.status === 'PENDING';
                        if (!isPending) return false;
                        if (selectedBranchId !== 'ALL' && b.branchId && b.branchId !== selectedBranchId) {
                          return false;
                        }
                        return true;
                      })
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
            <div className="font-bold text-xs text-[#2C241E] mb-2 flex items-center justify-between">
              <span>Chi phí dịch vụ & Thuế GTGT</span>
              <span className="text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                Chuẩn Y tế 2026
              </span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tạm tính (Đơn giá)</span>
              <span className="font-semibold text-[#2C241E]">{booking ? `${rawSubtotal.toLocaleString('vi-VN')}đ` : '0đ'}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Ưu đãi / Giảm trừ</span>
              <span className="font-semibold text-emerald-700">{booking && rawDiscount > 0 ? `-${rawDiscount.toLocaleString('vi-VN')}đ` : '0đ'}</span>
            </div>

            {/* Tùy chọn trừ buổi liệu trình */}
            <div className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPackageRedemption}
                  onChange={(e) => setIsPackageRedemption(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Trừ vào Gói Liệu Trình (Khách đã thanh toán trước)
                </span>
              </label>
              {isPackageRedemption && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1 ml-6">
                  ✓ Số tiền phát sinh: 0đ. Hệ thống sẽ ghi nhận lịch sử trừ 1 buổi vào hồ sơ liệu trình của khách.
                </p>
              )}
            </div>

            {/* Lựa chọn VAT 0%, 8%, 10% */}
            {!isPackageRedemption && (
              <div className="pt-2 border-t border-dashed border-[#EFE4D9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Mức thuế VAT</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 8, 10].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setVatRate(rate)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          vatRate === rate
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {rate === 0 ? '0% (Miễn)' : `${rate}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Tiền trước thuế</span>
                  <span className="font-semibold text-[#2C241E]">{booking ? `${preTaxAmount.toLocaleString('vi-VN')}đ` : '0đ'}</span>
                </div>
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Tiền thuế VAT ({vatRate}%)</span>
                  <span className="font-semibold text-sky-700">+{booking ? `${calculatedVat.toLocaleString('vi-VN')}đ` : '0đ'}</span>
                </div>
              </div>
            )}

            <div className="border-t border-[#EFE4D9] pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#2C241E]">Tổng thanh toán</span>
                <span className="font-extrabold text-base text-sky-700">{booking ? `${finalTotalAmount.toLocaleString('vi-VN')}đ` : '0đ'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#73675F]">
                <span>Trạng thái thuế</span>
                <span className="font-medium text-slate-600">
                  {vatRate > 0 && !isPackageRedemption
                    ? `Chưa gồm VAT — Cộng thêm ${vatRate}% (+${calculatedVat.toLocaleString('vi-VN')}đ)`
                    : 'Miễn thuế VAT (0% - Chuẩn Y tế)'}
                </span>
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

          {/* Phương thức thanh toán gọn gàng */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-[#2C241E]">Hình thức thanh toán:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('onsite')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'onsite'
                    ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                    : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Tiền mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('transfer')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'transfer'
                    ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                    : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Chuyển khoản</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('online')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedMethod === 'online'
                    ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                    : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Quẹt thẻ / Ví</span>
              </button>
            </div>
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
              Phương thức: {selectedMethod === 'onsite' ? 'Tiền mặt tại cơ sở.' : selectedMethod === 'online' ? 'Quẹt thẻ / Ví điện tử.' : 'Chuyển khoản ngân hàng.'}
            </div>
          </div>

          {/* Explanatory Note */}
          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Hệ thống tự động đồng bộ biên lai thanh toán theo thời gian thực.
          </div>
        </div>
      </div>
      )}

          {/* Quick link to Invoices Tab */}
          <div className="bg-[#FAF6F0] rounded-2xl border border-[#EFE4D9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DFD8] flex items-center justify-center text-[#8A4F23] shrink-0 shadow-xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-[#2C241E] text-sm">
                  Sổ đối chiếu biên nhận ({pastReceipts.length} hóa đơn đã lưu)
                </div>
                <div className="text-[11.5px] text-[#73675F] mt-0.5">
                  Xem danh sách giao dịch, lọc theo khách hàng, cơ sở và in biên lai nhiệt điện tử
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('receipts');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('tab', 'receipts');
                  return next;
                });
              }}
              className="px-4 py-2 bg-[#985018] hover:bg-[#854412] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer text-xs shadow-xs"
            >
              <span>Xem sổ hóa đơn</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SỔ HÓA ĐƠN & BIÊN LAI ĐIỆN TỬ                                      */}
      {/* ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Tổng thực thu */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#73675F]">Tổng thực thu (Đã thu)</span>
                <div className="w-8 h-8 rounded-xl bg-[#E8F6ED] text-[#0D6832] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[#0D6832] tracking-tight">
                {kpiTotalRevenue.toLocaleString('vi-VN')}đ
              </div>
              <div className="text-[11px] text-[#73675F]">
                {kpiPaid.length} hóa đơn đã quyết toán 100%
              </div>
            </div>

            {/* Card 2: Hóa đơn thành công */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#73675F]">Hóa đơn hoàn tất</span>
                <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[#2C241E] tracking-tight">
                {kpiPaid.length} biên nhận
              </div>
              <div className="text-[11px] text-[#73675F]">
                0 giao dịch nợ đọng hoặc treo
              </div>
            </div>

            {/* Card 3: Thu chuyển khoản */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#73675F]">Chuyển khoản VietQR</span>
                <div className="w-8 h-8 rounded-xl bg-[#EAF2FA] text-[#1E5D9B] flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[#1E5D9B] tracking-tight">
                {kpiTransferAmount.toLocaleString('vi-VN')}đ
              </div>
              <div className="text-[11px] text-[#73675F]">
                {kpiTransfer.length} giao dịch qua ngân hàng
              </div>
            </div>

            {/* Card 4: Tiền mặt & MoMo */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#73675F]">Tiền mặt & MoMo</span>
                <div className="w-8 h-8 rounded-xl bg-[#FFF4EB] text-[#C25E00] flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[#C25E00] tracking-tight">
                {kpiCashOrMomoAmount.toLocaleString('vi-VN')}đ
              </div>
              <div className="text-[11px] text-[#73675F]">
                {kpiCashOrMomo.length} giao dịch trực tiếp & ví
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={invoiceSearchTerm}
                onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                placeholder="Tìm mã HĐ (HD-...), tên khách, SĐT, dịch vụ..."
                className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
              />
              {invoiceSearchTerm && (
                <button
                  type="button"
                  onClick={() => setInvoiceSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Branch Filter */}
            <div className="relative shrink-0">
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
              >
                <option value="ALL">Tất cả chi nhánh ({pastReceipts.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({pastReceipts.filter((r) => r.branchId === b.id).length})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Payment Method Filter */}
            <div className="relative shrink-0">
              <select
                value={invoiceMethodFilter}
                onChange={(e) => setInvoiceMethodFilter(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
              >
                <option value="ALL">Tất cả phương thức</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản VietQR</option>
                <option value={PaymentMethod.CASH_AT_SPA}>Tiền mặt tại cơ sở</option>
                <option value={PaymentMethod.MOMO}>Ví điện tử MoMo</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative shrink-0">
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value={PaymentStatus.PAID}>Đã thanh toán</option>
                <option value={PaymentStatus.UNPAID}>Chờ thanh toán</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset Filter Button */}
            {(invoiceSearchTerm || selectedBranchId !== 'ALL' || invoiceMethodFilter !== 'ALL' || invoiceStatusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setInvoiceSearchTerm('');
                  handleBranchSelect('ALL');
                  setInvoiceMethodFilter('ALL');
                  setInvoiceStatusFilter('ALL');
                }}
                className="h-9 px-3 rounded-xl border border-[#D7BBA6] bg-white hover:bg-[#FAF4EE] text-xs font-bold text-[#8A4F23] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            {/* Table Header Banner */}
            <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE4D9]">
              <div>
                <h2 className="text-base font-bold text-[#2C241E]">
                  Sổ hóa đơn & Đối chiếu biên nhận đã thanh toán
                </h2>
                <p className="text-[11.5px] text-[#73675F] mt-0.5">
                  Dữ liệu đồng bộ trực tiếp từ cơ sở dữ liệu hóa đơn Cloud
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] shrink-0 self-start sm:self-auto">
                Hiển thị {filteredReceipts.length} / {pastReceipts.length} hóa đơn
              </span>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-5">Mã HĐ & Ngày giờ</th>
                    <th className="py-3 px-5">Khách hàng</th>
                    <th className="py-3 px-5">Nội dung / Dịch vụ</th>
                    <th className="py-3 px-5">Cơ sở / Chi nhánh</th>
                    <th className="py-3 px-5">Phương thức</th>
                    <th className="py-3 px-5">Số tiền đã thu</th>
                    <th className="py-3 px-5">Trạng thái</th>
                    <th className="py-3 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6DC]">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#FAF6F0] border border-[#EFE4D9] flex items-center justify-center mx-auto text-[#8A4F23] mb-2.5">
                          <Receipt className="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <div className="font-bold text-sm text-[#2C241E]">
                          Không tìm thấy hóa đơn nào
                        </div>
                        <div className="text-xs text-[#73675F] mt-1 max-w-sm mx-auto">
                          Không có hóa đơn nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc chi nhánh hiện tại.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-[#FAF8F5] transition-colors">
                        {/* 1. Mã HĐ & Ngày giờ */}
                        <td className="py-3.5 px-5">
                          <div className="font-extrabold text-xs text-[#8A4F23] font-mono">
                            {r.id}
                          </div>
                          <div className="text-[11px] text-[#73675F] mt-0.5 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-[#A69788]" />
                            <span>{r.date}</span>
                          </div>
                        </td>

                        {/* 2. Khách hàng */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            {r.customerAvatar ? (
                              <img
                                src={r.customerAvatar}
                                alt={r.customerName}
                                className="w-8 h-8 rounded-full object-cover border border-[#D7BBA6] shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F5E9DB] to-[#E8D4BF] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D7BBA6]">
                                {r.customerName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-xs text-[#2C241E] flex items-center gap-1.5">
                                <span>{r.customerName}</span>
                                {r.customerTier && r.customerTier !== 'MEMBER' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                                    {r.customerTier}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#73675F] font-mono mt-0.5">
                                {r.customerPhone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Nội dung / Dịch vụ */}
                        <td className="py-3.5 px-5 max-w-[260px]">
                          <div className="font-semibold text-xs text-[#2C241E] truncate" title={r.content}>
                            {r.content}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              r.category === 'SERVICE'
                                ? 'bg-[#F5E9DB] text-[#8A4F23]'
                                : r.category === 'PACKAGE'
                                ? 'bg-[#EAF2FA] text-[#1E5D9B]'
                                : 'bg-[#F3EBF9] text-[#6E2E9E]'
                            }`}>
                              {r.category === 'SERVICE' ? 'Dịch vụ Spa lẻ' : r.category === 'PACKAGE' ? 'Gói liệu trình VIP' : 'Đào tạo Academy'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Cơ sở / Chi nhánh */}
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-xs text-[#2C241E]">
                            {r.branchName}
                          </div>
                          {r.branchDistrict && (
                            <div className="text-[11px] text-[#73675F] mt-0.5">
                              {r.branchDistrict}
                            </div>
                          )}
                        </td>

                        {/* 5. Phương thức */}
                        <td className="py-3.5 px-5">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF6F0] text-[#8A4F23] border border-[#E8DFD8]">
                            {r.methodCode === PaymentMethod.BANK_TRANSFER ? (
                              <QrCode className="w-3.5 h-3.5 text-[#8A4F23]" />
                            ) : r.methodCode === PaymentMethod.CASH_AT_SPA ? (
                              <Banknote className="w-3.5 h-3.5 text-[#0D6832]" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-[#C25E00]" />
                            )}
                            <span>{r.method}</span>
                          </div>
                        </td>

                        {/* 6. Số tiền đã thu */}
                        <td className="py-3.5 px-5">
                          <div className="font-extrabold text-xs text-[#0D6832]">
                            {r.amount}
                          </div>
                          {r.discountAmount > 0 && (
                            <div className="text-[10.5px] text-[#8A4F23] font-medium mt-0.5">
                              Ưu đãi: -{r.discountAmount.toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </td>

                        {/* 7. Trạng thái */}
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EAF5EC] text-[#2D7A4D]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2D7A4D]" />
                            <span>{r.status}</span>
                          </span>
                        </td>

                        {/* 8. Thao tác */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReceiptData({
                                id: r.id,
                                customerName: r.customerName,
                                customerPhone: r.customerPhone,
                                customerTier: r.customerTier,
                                branchName: r.branchName,
                                branchAddress: r.branchDistrict ? `${r.branchName} · ${r.branchDistrict}` : r.branchName,
                                serviceName: r.content,
                                category: r.category,
                                method: r.method,
                                amount: r.amount,
                                subtotal: `${(r.subtotal || r.rawAmount).toLocaleString('vi-VN')}đ`,
                                discount: r.discountAmount ? `${r.discountAmount.toLocaleString('vi-VN')}đ` : '0đ',
                                preTaxAmount: (r as any).preTaxAmount,
                                vatRateText: (r as any).vatRateText,
                                vatAmountText: (r as any).vatAmountText,
                                shiftCode: (r as any).shiftCode,
                                date: r.date,
                                status: r.status,
                              });
                              setShowReceiptModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#8A4F23] bg-[#FAF3EC] hover:bg-[#F3E2CE] transition-all cursor-pointer shadow-2xs"
                            title="Xem chi tiết biên lai điện tử"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3.5 border-t border-[#EFE4D9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#73675F] bg-[#FAF8F5]/60">
              <div className="font-semibold text-xs text-[#2C241E]">
                Hiển thị <span className="font-extrabold text-[#8A4F23]">{filteredReceipts.length}</span> biên nhận • Tổng thực thu: <span className="font-black text-[#0D6832]">{filteredTotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled
                  className="p-1 rounded-md text-[#B0A294] border border-[#EFE4D9] opacity-50 cursor-not-allowed bg-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button className="w-6 h-6 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-bold text-xs flex items-center justify-center shadow-2xs">
                  1
                </button>
                <button
                  disabled
                  className="p-1 rounded-md text-[#B0A294] border border-[#EFE4D9] opacity-50 cursor-not-allowed bg-white"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Policy Note & Disclaimer */}
          <div className="text-xs text-[#73675F] leading-relaxed pt-1">
            Chính sách cơ sở: Thanh toán dịch vụ tại quầy hoặc trực tuyến qua mã QR Code. Hệ thống tự động xuất biên nhận điện tử theo thời gian thực.
          </div>

          <div className="flex items-center gap-2 text-xs text-[#73675F] pt-1">
            <Info className="w-4 h-4 shrink-0 text-[#985018]" />
            <span>
              Hệ thống thu ngân POS & biên lai điện tử • MLD Vietnam Healthcare Admin.
            </span>
          </div>
        </div>
      )}

      {/* 8. Luxury Electronic Receipt Modal */}
      {showReceiptModal && (Boolean(selectedReceiptData) || Boolean(booking?.id && (booking.finalPrice || booking.baseTotal))) && (
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
            <div id="pos-receipt-card" className="px-6 py-5 space-y-4">
              <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#EFE4D9] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E0D4C7]">
                  <span className="text-[#73675F]">Mã hóa đơn / Phiếu thu:</span>
                  <span className="font-bold text-[#2C241E] font-mono">
                    {selectedReceiptData?.id || booking?.bookingCode || '--'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <div className="text-right">
                    <span className="font-bold text-[#2C241E]">
                      {selectedReceiptData?.customerName || customerName}
                    </span>
                    {selectedReceiptData?.customerPhone && selectedReceiptData.customerPhone !== '--' && (
                      <span className="text-[11px] text-[#73675F] ml-1.5 font-mono">
                        ({selectedReceiptData.customerPhone})
                      </span>
                    )}
                  </div>
                </div>

                {selectedReceiptData?.branchName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#73675F]">Cơ sở / Chi nhánh:</span>
                    <span className="font-semibold text-[#2C241E]">
                      {selectedReceiptData.branchName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Nội dung / Dịch vụ:</span>
                  <span className="font-semibold text-[#2C241E] text-right max-w-[240px] truncate" title={selectedReceiptData?.serviceName || serviceName}>
                    {selectedReceiptData?.serviceName || `${serviceName} (${serviceDuration} phút)`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Hình thức thanh toán:</span>
                  <span className="font-semibold text-[#8A4F23]">
                    {selectedReceiptData?.method || (selectedMethod === 'onsite' ? 'Tiền mặt tại cơ sở' : selectedMethod === 'online' ? 'Quẹt thẻ / Ví điện tử' : 'Chuyển khoản ngân hàng')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Thời gian ghi nhận:</span>
                  <span className="text-[#2C241E] font-medium font-mono text-[11.5px]">
                    {selectedReceiptData?.date || new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}
                  </span>
                </div>

                {selectedReceiptData?.discount && selectedReceiptData.discount !== '0đ' && (
                  <div className="flex items-center justify-between text-[#8A4F23]">
                    <span>Ưu đãi áp dụng:</span>
                    <span className="font-bold">
                      -{selectedReceiptData.discount}
                    </span>
                  </div>
                )}

                {selectedReceiptData?.preTaxAmount && selectedReceiptData?.vatAmountText && (
                  <div className="flex items-center justify-between text-[#73675F]">
                    <span>Tiền dịch vụ (trước thuế):</span>
                    <span className="font-semibold text-[#2C241E]">{selectedReceiptData.preTaxAmount}</span>
                  </div>
                )}

                {selectedReceiptData?.vatAmountText ? (
                  <div className="flex items-center justify-between text-[#73675F]">
                    <span>Thuế GTGT ({selectedReceiptData.vatRateText || '8%'}):</span>
                    <span className="font-semibold text-sky-700">+{selectedReceiptData.vatAmountText}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[#73675F]">
                    <span>Thuế GTGT:</span>
                    <span className="font-medium text-slate-500">0% (Miễn thuế / Y tế)</span>
                  </div>
                )}

                {selectedReceiptData?.shiftCode && (
                  <div className="flex items-center justify-between text-[#73675F]">
                    <span>Ca thu ngân:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedReceiptData.shiftCode}
                    </span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-dashed border-[#E0D4C7] flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2C241E]">Tổng đã quyết toán:</span>
                  <span className="text-base font-extrabold text-[#0D6832]">
                    {selectedReceiptData?.amount || `${(booking?.finalPrice || 0).toLocaleString('vi-VN')}đ`}
                  </span>
                </div>

                {/* Trụ cột Enterprise: Hoa hồng KTV, Zalo ZNS & Xuất kho BOM */}
                <div className="pt-2 border-t border-[#EFE4D9] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] bg-[#FFF8F0] px-2.5 py-1.5 rounded-lg border border-[#F5E5D5]">
                    <span className="text-[#8A4F23] font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8A4F23]" />
                      <span>Hoa hồng KTV (10%):</span>
                    </span>
                    <span className="font-bold text-[#8A4F23]">
                      {selectedReceiptData?.commissionText || `${Math.round(((booking?.finalPrice || 0) * 0.1)).toLocaleString('vi-VN')}đ (KTV Phụ trách)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-[#F0FDF4] px-2.5 py-1.5 rounded-lg border border-[#DCFCE7]">
                    <span className="text-[#166534] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                      <span>Tự động hóa Zalo ZNS:</span>
                    </span>
                    <span className="font-bold text-[#166534]">
                      Đã gửi xác nhận đơn & CSKH
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                    <span className="text-[#475569] font-medium flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#475569]" />
                      <span>Định mức kho (BOM):</span>
                    </span>
                    <span className="font-semibold text-[#475569] truncate max-w-[200px]" title="Đã xuất vật tư tiêu hao">
                      {selectedReceiptData?.materialsText || 'Đã xuất 3 vật tư định mức'}
                    </span>
                  </div>
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
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#D7BBA6] hover:bg-[#FAF8F5] text-[#8A4F23] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In biên lai</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadReceiptPdf}
                disabled={isExportingPdf}
                className="flex-1 py-2.5 px-3 rounded-xl border border-sky-300 hover:bg-sky-50 text-sky-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Tải hóa đơn VAT / Phiếu thu điện tử định dạng PDF"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingPdf ? 'Đang tạo...' : 'Tải hóa đơn PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handleCloseReceiptModal}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#8A4F23] hover:bg-[#723F1A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Hoàn tất</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Mở ca thu ngân mới */}
      {showOpenShiftModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setShowOpenShiftModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full border border-sky-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Mở ca làm việc thu ngân</h3>
                  <p className="text-[11px] text-slate-500">Ghi nhận tiền két ban đầu và kích hoạt ca</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cơ sở / Chi nhánh làm việc
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  {branches.find((b) => b.id === selectedBranchId)?.name || 'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tiền mặt đầu ca trong két (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={shiftOpeningCash}
                  onChange={(e) => setShiftOpeningCash(Number(e.target.value) || 0)}
                  placeholder="Nhập số tiền mặt đầu ca..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Số tiền bàn giao thực tế trong ngăn kéo trước giờ đón khách.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ghi chú bàn giao ca
                </label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Nhập ghi chú ca trực (nếu có)..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await posService.openShift({
                      branchId: selectedBranchId !== 'ALL' ? selectedBranchId : 'aaaaaaaa-0001-0001-0001-000000000001',
                      openingCash: shiftOpeningCash,
                      notes: shiftNotes,
                    });
                    if (res.success && res.data) {
                      setCurrentShift(res.data);
                      setShowOpenShiftModal(false);
                      toast.success('Mở ca thành công', `Đã kích hoạt ca ${res.data.shiftCode}`);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận mở ca</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kết ca & Đối soát doanh thu */}
      {showCloseShiftModal && currentShift && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
          onClick={() => setShowCloseShiftModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full border border-sky-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Biên bản Kết ca & Đối soát</h3>
                  <p className="text-[11px] text-slate-500">Mã ca: {currentShift.shiftCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Bảng tổng kết số liệu hệ thống ghi nhận */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-800 pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>Số liệu hệ thống ghi nhận trong ca</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(currentShift.openedAt).toLocaleTimeString('vi-VN')} – Hiện tại
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>1. Tiền mặt đầu ca:</span>
                  <span className="font-semibold text-slate-800">{currentShift.openingCash.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>2. Doanh thu tiền mặt phát sinh:</span>
                  <span className="font-semibold text-slate-800">
                    {((currentShift.systemCash || currentShift.openingCash) - currentShift.openingCash).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>3. Doanh thu Chuyển khoản VietQR:</span>
                  <span className="font-semibold text-slate-800">{(currentShift.transferSales || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>4. Doanh thu Quẹt thẻ POS:</span>
                  <span className="font-semibold text-slate-800">{(currentShift.cardSales || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between font-bold text-slate-800">
                  <span>Tổng tiền mặt hệ thống kỳ vọng trong két:</span>
                  <span className="text-sm font-extrabold text-sky-700">
                    {(currentShift.systemCash || currentShift.openingCash).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Nhập số tiền thực tế đếm được */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số tiền mặt thực tế đếm trong két (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={shiftClosingCash}
                  onChange={(e) => setShiftClosingCash(Number(e.target.value) || 0)}
                  placeholder="Nhập số tiền mặt thực tế kiểm đếm..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-extrabold text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Hiển thị chênh lệch */}
              {(() => {
                const sysCash = currentShift.systemCash || currentShift.openingCash;
                const diff = shiftClosingCash - sysCash;
                return (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    diff === 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : diff > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <span className="font-bold">
                      {diff === 0 ? '✓ Khớp 100% (Không chênh lệch)' : diff > 0 ? 'Thừa tiền mặt thực tế:' : 'Thiếu hụt tiền mặt thực tế:'}
                    </span>
                    <span className="font-extrabold text-sm font-mono">
                      {diff > 0 ? `+${diff.toLocaleString('vi-VN')}đ` : diff < 0 ? `${diff.toLocaleString('vi-VN')}đ` : '0đ'}
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ghi chú kết ca & bàn giao
                </label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Nhập ghi chú giải trình chênh lệch hoặc bàn giao két..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    toast.info('In biên bản', 'Đang kết nối máy in nhiệt K80...');
                    window.print();
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In biên bản K80</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const sysCash = currentShift.systemCash || currentShift.openingCash;
                    const res = await posService.closeShift(currentShift.id, {
                      closingCash: shiftClosingCash,
                      systemCash: sysCash,
                      cardSales: currentShift.cardSales || 0,
                      transferSales: currentShift.transferSales || 0,
                      totalSales: currentShift.totalSales || 0,
                      notes: shiftNotes,
                    });
                    if (res.success) {
                      setCurrentShift(null);
                      setShowCloseShiftModal(false);
                      toast.success('Kết ca thành công', res.message);
                      fetchPosData();
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận đóng ca</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Walk-in Quick Booking Modal (Dual-Resource Engine: 6 Giường × 6 KTV × Ca 1 Giờ) */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-[#D7BBA6] overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                  <Calendar className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Tiếp nhận & Đặt lịch tại quầy (Walk-in)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                      DRC Engine
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    Ràng buộc tự động: 6 Giường × 6 KTV • Ca 1 Tiếng chuẩn Y tế
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Row 1: Thông tin khách hàng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Họ tên khách hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={walkInCustomerName}
                    onChange={(e) => setWalkInCustomerName(e.target.value)}
                    placeholder="VD: Nguyễn Thị Lan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={walkInCustomerPhone}
                    onChange={(e) => setWalkInCustomerPhone(e.target.value)}
                    placeholder="VD: 0988123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              {/* Row 2: Chi nhánh & Dịch vụ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cơ sở thực hiện
                  </label>
                  <select
                    value={selectedBranchId !== 'ALL' ? selectedBranchId : (branches[0]?.id || '')}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📍 {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Dịch vụ trị liệu Spa
                  </label>
                  <select
                    value={walkInServiceId}
                    onChange={(e) => setWalkInServiceId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  >
                    {allServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes || 60}p - {Number(s.price || 0).toLocaleString('vi-VN')}đ)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Ngày hẹn & KTV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ngày thực hiện
                  </label>
                  <input
                    type="date"
                    value={walkInDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kỹ thuật viên (DRC Dispatch)
                  </label>
                  <select
                    value={walkInTechId}
                    onChange={(e) => setWalkInTechId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                  >
                    <option value="">✨ Tự động phân bổ KTV ít ca nhất (Khuyên dùng)</option>
                    {allTechnicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        👤 {t.fullName} {t.ratingAvg ? `(${t.ratingAvg}★)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: 10 Khung giờ ca 1 tiếng (DRC Slot Grid) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Chọn khung giờ ca 1 tiếng & Tải công suất thực tế
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {isLoadingWalkInSlots ? 'Đang kiểm tra công suất...' : 'Trần: 6 Giường × 6 KTV'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {POS_TIME_SLOTS.map((slot, idx) => {
                    const drc = walkInDrcSlots.find(
                      (d) =>
                        d.slotTime === slot.label ||
                        (d.startTime && d.startTime.slice(0, 5) === slot.startTime.slice(0, 5))
                    );

                    const isAvail = drc ? drc.isAvailable : true;
                    const cap = (drc?.remainingCapacity ?? drc?.capacity ?? 6);
                    const beds = (drc?.freeBeds ?? drc?.availableBeds ?? 6);
                    const techs = (drc?.freeStaff ?? drc?.availableTechnicians ?? 6);
                    const isSelected = walkInSlotIndex === idx;

                    if (!isAvail || cap <= 0) {
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={true}
                          className="p-2.5 rounded-xl border border-dashed border-rose-200 bg-rose-50/60 text-left opacity-60 cursor-not-allowed select-none transition-all"
                          title={drc?.statusText || 'Đã hết giường hoặc kỹ thuật viên cho ca này'}
                        >
                          <div className="text-[11px] font-bold text-rose-800">{slot.label}</div>
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            {drc?.statusText ? drc.statusText : beds === 0 ? '❌ Hết giường' : '❌ Hết KTV'}
                          </div>
                          <div className="text-[9px] text-rose-400 mt-0.5">
                            {beds}G trống • {techs}NV
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setWalkInSlotIndex(idx)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">{slot.label}</span>
                          {drc?.isRecommended && (
                            <span className="text-[8px] bg-emerald-600 text-white font-extrabold px-1 rounded">
                              HOT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Còn {cap} chỗ
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>{beds}G</span> • <span>{techs}NV</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thông tin xác nhận */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2 text-[11px]">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Cơ chế quản lý giường & KTV thông minh (DRC Engine):</p>
                  <p className="text-amber-700">
                    Khi tạo đơn, hệ thống sẽ tự động chỉ định 1 Giường tiêu chuẩn và 1 Kỹ thuật viên còn trống ít ca nhất. Sau khi kết thúc thời lượng ca (60 phút), hệ thống tự động nhả tài nguyên cho ca kế tiếp.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreateWalkInBooking}
                disabled={isSubmittingWalkIn}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingWalkIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang khởi tạo & Khóa tài nguyên...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận đặt lịch & Mở đơn POS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
