import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ShoppingCart,
  Trash2,
  UserPlus,
  Percent,
  Tag,
  Copy,
  Check,
  Pencil,
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
  staffService,
  StaffWithProfile,
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
  Course,
  CourseEnrollment,
  TuitionTransaction,
  StudentAdmissionStatus,
  EnrollmentStatus,
  Service,
  Technician,
  DualSlotAvailability,
  TreatmentPackage,
  MemberTier,
  UserRole,
  PurposeInterest,
} from '../types/shared_types';
import { matchSearch, isUuid } from '../utils/searchUtils';
import { useAdmin } from '../admin/Auth';
import { supabase } from '../services/supabaseClient';

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

export interface PosCartItem {
  id: string;
  name: string;
  type: 'SERVICE' | 'PACKAGE' | 'PRODUCT';
  unitPrice: number;
  quantity: number;
  durationMinutes?: number;
  totalSessions?: number;
  imageUrl?: string;
  serviceId?: string;
  packageId?: string;
}

const GUEST_CUSTOMER: User = {
  id: 'bbbbbbbb-0001-0001-0001-000000000001',
  fullName: 'Khách hàng Vãng lai (Guest)',
  phone: '0900000000',
  role: UserRole.CUSTOMER,
  membershipTier: MemberTier.STANDARD,
  gender: 'OTHER',
  rewardPoints: 0,
  totalSpent: 0,
  purpose: PurposeInterest.BEAUTY_SPA,
  referralCode: '',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const W07_CashierPOS: React.FC = () => {
  const { user: adminUser } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTreatmentRegistration = searchParams.get('flow') === 'treatment-registration';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return searchParams.get('branchId') || localStorage.getItem('mld_selected_branch_id') || 'ALL';
  });

  // Active Sub-Tab: 'pos' (Quầy bán hàng & tính tiền) | 'queue' (Hàng chờ thanh toán) | 'tuition' (Học phí Học viện) | 'receipts' (Sổ hóa đơn & đối chiếu)
  const [activeTab, setActiveTab] = useState<'pos' | 'queue' | 'tuition' | 'receipts'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'receipts' || window.location.hash === '#receipts') return 'receipts';
    if (tab === 'queue') return 'queue';
    if (tab === 'tuition') return 'tuition';
    return 'pos';
  });
  const [tuitionLedger, setTuitionLedger] = useState<TuitionTransaction[] | null>(null);
  useEffect(() => {
    if (activeTab !== 'tuition') return;
    let active = true;
    academyService.getTuitionTransactions().then(result => {
      if (active) setTuitionLedger(result.success ? result.data : null);
    });
    return () => { active = false; };
  }, [activeTab]);

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

  useEffect(() => {
    const p = searchParams.get('branchId');
    if (p && p !== selectedBranchId) {
      setSelectedBranchId(p);
    }

    const tab = searchParams.get('tab');
    if (tab === 'receipts' || window.location.hash === '#receipts') {
      setActiveTab('receipts');
    } else if (tab === 'queue') {
      setActiveTab('queue');
    } else if (tab === 'tuition') {
      setActiveTab('tuition');
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

  // POS Workstation States
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User>(GUEST_CUSTOMER);
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCommissionStaffId, setSelectedCommissionStaffId] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    phone: '',
    gender: 'FEMALE' as 'MALE' | 'FEMALE' | 'OTHER',
    address: '',
  });
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [queueSearchTerm, setQueueSearchTerm] = useState('');

  // Catalog Menu Filter & Search
  const [catalogCategory, setCatalogCategory] = useState<'ALL' | 'SERVICE' | 'PACKAGE' | 'PRODUCT'>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Discount & VAT states
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(8); // Mặc định VAT 8% (Chuẩn Y tế Nghị định 72/2024)
  const [selectedMethod, setSelectedMethod] = useState<'onsite' | 'transfer' | 'online'>('onsite');
  const [draftInvoiceCode, setDraftInvoiceCode] = useState<string>(() => {
    const d = new Date();
    const dateStr = `${d.getFullYear().toString().slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `HD-POS-${dateStr}-${rand}`;
  });

  // Tuition State
  const [allEnrollments, setAllEnrollments] = useState<CourseEnrollment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CourseEnrollment | undefined>(undefined);
  const [tuitionPaymentAmount, setTuitionPaymentAmount] = useState<number>(0);
  const [tuitionSearchTerm, setTuitionSearchTerm] = useState('');
  const [tuitionReceiptSearchTerm, setTuitionReceiptSearchTerm] = useState('');
  const [tuitionReceiptBranchFilter, setTuitionReceiptBranchFilter] = useState('ALL');
  const [tuitionReceiptMethodFilter, setTuitionReceiptMethodFilter] = useState('ALL');
  const [tuitionSubTab, setTuitionSubTab] = useState<'receipts' | 'enrollments'>('receipts');
  const [isTuitionStudentDropdownOpen, setIsTuitionStudentDropdownOpen] = useState(false);
  const [copiedReceiptId, setCopiedReceiptId] = useState<string | null>(null);

  // General App Data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [treatmentPackages, setTreatmentPackages] = useState<TreatmentPackage[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [homeProducts, setHomeProducts] = useState<any[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [commissionStaff, setCommissionStaff] = useState<StaffWithProfile[]>([]);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);

  // Cashier Shift states
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [shiftOpeningCash, setShiftOpeningCash] = useState<number>(1000000);
  const [shiftClosingCash, setShiftClosingCash] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftVarianceReason, setShiftVarianceReason] = useState('');

  // UI Processing & Modals
  const [isProcessing, setIsProcessing] = useState(false);
  const paymentLock = useRef(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Invoice | null>(null);
  const [receiptCustomerName, setReceiptCustomerName] = useState('');
  const [receiptDescription, setReceiptDescription] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptItems, setReceiptItems] = useState<Array<{id:string;itemName:string;quantity:number;unitPrice:number;amount:number}>>([]);
  const [receiptEditReason, setReceiptEditReason] = useState('');
  const [receiptEditHistory, setReceiptEditHistory] = useState<any[]>([]);
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Walk-in Quick Booking Modal State (DRC: 6 Giường × 6 KTV × Ca 1 Giờ)
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInCustomerName, setWalkInCustomerName] = useState<string>('');
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState<string>('');
  const [walkInCustomerId, setWalkInCustomerId] = useState<string>('');
  const [walkInServiceId, setWalkInServiceId] = useState<string>('');
  const [walkInDate, setWalkInDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [walkInSlotIndex, setWalkInSlotIndex] = useState<number>(0);
  const [walkInTechId, setWalkInTechId] = useState<string>('');
  const [walkInDrcSlots, setWalkInDrcSlots] = useState<DualSlotAvailability[]>([]);
  const [isLoadingWalkInSlots, setIsLoadingWalkInSlots] = useState<boolean>(false);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState<boolean>(false);

  // Invoices Tab Filter States
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');

  // Receipt Modal Data
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
    userPackageId?: string;
    packageDefinitionId?: string;
    znsSent?: boolean;
    materialsText?: string;
  } | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success('Đã sao chép!', `${label}: ${text}`);
    }
  };

  const fetchPosData = async () => {
    try {
      const [invRes, bkRes, custRes, brRes, pkgRes, shiftRes, enrRes, srvRes, techRes, courseRes] = await Promise.allSettled([
        posService.getInvoices(),
        bookingService.getBookings(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        treatmentService.getTreatmentPackages(),
        posService.getActiveShift(selectedBranchId !== 'ALL' ? selectedBranchId : undefined),
        academyService.getEnrollments(),
        supabaseService.getServices(),
        supabaseService.getTechnicians(),
        academyService.getCourses(),
      ]);

      if (brRes.status === 'fulfilled' && brRes.value.success && brRes.value.data) {
        setBranches(brRes.value.data);
      }
      if (bkRes.status === 'fulfilled' && bkRes.value.success && bkRes.value.data) {
        setAllBookings(bkRes.value.data);
      }
      if (invRes.status === 'fulfilled' && invRes.value.success && invRes.value.data) {
        setInvoices(invRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value.success && custRes.value.data) {
        setAllCustomers(custRes.value.data);
        const guest = custRes.value.data.find((c) => c.id === GUEST_CUSTOMER.id);
        if (guest) setSelectedCustomer((prev) => (prev.id === GUEST_CUSTOMER.id ? guest : prev));
      }
      if (pkgRes.status === 'fulfilled' && pkgRes.value.success && pkgRes.value.data) {
        setTreatmentPackages(pkgRes.value.data);
      }
      if (shiftRes.status === 'fulfilled' && shiftRes.value.success && shiftRes.value.data) {
        setCurrentShift(shiftRes.value.data);
      }
      if (enrRes.status === 'fulfilled' && enrRes.value.success && enrRes.value.data) {
        setAllEnrollments(enrRes.value.data);
      }
      if (courseRes.status === 'fulfilled' && courseRes.value.success && courseRes.value.data) {
        setAllCourses(courseRes.value.data);
      }
      if (srvRes.status === 'fulfilled' && srvRes.value && srvRes.value.length > 0) {
        const servicesList = srvRes.value;
        setAllServices(servicesList);
        const firstServiceId = servicesList[0]?.id;
        if (firstServiceId) {
          setWalkInServiceId((prev) => prev || firstServiceId);
        }
      }
      if (techRes.status === 'fulfilled' && techRes.value && techRes.value.length > 0) {
        setAllTechnicians(techRes.value);
      }

      try {
        const productRows = await supabaseService.query<any[]>('home_products?order=sort_order.asc');
        setHomeProducts(productRows || []);
      } catch (prodErr) {
        console.warn('Không tải được danh mục sản phẩm bổ trợ:', prodErr);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  };

  useEffect(() => {
    fetchPosData();
    staffService.getStaffList().then((res) => {
      if (res.success && res.data) setCommissionStaff(res.data.filter((staff) => staff.staffProfile.isActive));
    });
  }, []);

  // Handle URL query parameter pre-selection
  useEffect(() => {
    const packageIdParam = searchParams.get('packageId');
    if (packageIdParam && treatmentPackages.length > 0) {
      const pkg = treatmentPackages.find((p) => p.id === packageIdParam);
      if (pkg) {
        setPosCart([
          {
            id: pkg.id,
            name: pkg.name,
            type: 'PACKAGE',
            unitPrice: Number(pkg.discountPrice) > 0 && Number(pkg.discountPrice) < Number(pkg.price)
              ? Number(pkg.discountPrice)
              : Number(pkg.price),
            quantity: 1,
            totalSessions: Number(pkg.totalSessions),
            packageId: pkg.id,
          },
        ]);
        setActiveTab('pos');
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'pos');
          return next;
        });
      }
    }
  }, [searchParams, treatmentPackages]);

  useEffect(() => {
    const productIdParam = searchParams.get('productId');
    if (productIdParam && homeProducts.length > 0) {
      const prod = homeProducts.find((p) => p.id === productIdParam);
      if (prod) {
        setPosCart((prev) => {
          if (prev.some((item) => item.id === prod.id)) return prev;
          return [
            ...prev,
            {
              id: prod.id,
              name: prod.name,
              type: 'PRODUCT',
              unitPrice: Number(prod.price_min),
              quantity: 1,
              imageUrl: prod.image_url || prod.image_urls?.[0],
            },
          ];
        });
        setActiveTab('pos');
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'pos');
          return next;
        });
      }
    }
  }, [searchParams, homeProducts]);

  useEffect(() => {
    const customerIdParam = searchParams.get('customerId');
    if (customerIdParam && allCustomers.length > 0) {
      const cust = allCustomers.find((c) => c.id === customerIdParam);
      if (cust) setSelectedCustomer(cust);
    }
  }, [searchParams, allCustomers]);

  // Load receipt if ?invoice= or ?receipt= param present
  useEffect(() => {
    const invoiceParam = searchParams.get('invoice') || searchParams.get('receipt') || searchParams.get('code');
    if (invoiceParam && invoices.length > 0) {
      const found = invoices.find(
        (i) => i.invoiceCode.toLowerCase() === invoiceParam.trim().toLowerCase() || i.id === invoiceParam.trim()
      );
      if (found) {
        const detail = resolveReceiptDetail(found);
        setSelectedReceiptData({
          id: detail.id,
          customerName: detail.customerName,
          customerPhone: detail.customerPhone,
          customerTier: detail.customerTier,
          branchName: detail.branchName,
          serviceName: detail.content,
          category: detail.category,
          method: detail.method,
          amount: detail.amount,
          subtotal: `${detail.subtotal.toLocaleString('vi-VN')}đ`,
          discount: `${detail.discountAmount.toLocaleString('vi-VN')}đ`,
          date: detail.date,
          status: detail.status,
          shiftCode: (found as any).shiftCode || (found as any).shift_code,
        });
        setShowReceiptModal(true);
      }
    }
  }, [searchParams, invoices]);

  // Tự động tải danh sách 10 ca 1 tiếng DRC khi mở modal Đặt lịch tại quầy
  useEffect(() => {
    if (!showWalkInModal) return;
    const fetchWalkInSlots = async () => {
      setIsLoadingWalkInSlots(true);
      try {
        const branch = selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id;
        if (!isUuid(branch)) throw new Error('Chọn chi nhánh hợp lệ để kiểm tra chỗ trống.');
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

  // -------------------------------------------------------------
  // CART OPERATIONS
  // -------------------------------------------------------------
  const addToCart = (item: {
    id: string;
    name: string;
    type: 'SERVICE' | 'PACKAGE' | 'PRODUCT';
    unitPrice: number;
    durationMinutes?: number;
    totalSessions?: number;
    imageUrl?: string;
    serviceId?: string;
    packageId?: string;
  }) => {
    setPosCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          type: item.type,
          unitPrice: item.unitPrice,
          quantity: 1,
          durationMinutes: item.durationMinutes,
          totalSessions: item.totalSessions,
          imageUrl: item.imageUrl,
          serviceId: item.serviceId || (item.type === 'SERVICE' ? item.id : undefined),
          packageId: item.packageId || (item.type === 'PACKAGE' ? item.id : undefined),
        },
      ];
    });
    toast.success('Đã thêm vào đơn', `${item.name}`);
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setPosCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const removeFromCart = (id: string) => {
    setPosCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setPosCart([]);
    setBooking(undefined);
    setSelectedCustomer(allCustomers.find((c) => c.id === GUEST_CUSTOMER.id) || GUEST_CUSTOMER);
    setDiscountAmount(0);
    setSelectedCommissionStaffId('');
    setDraftInvoiceCode(() => {
      const d = new Date();
      const dateStr = `${d.getFullYear().toString().slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `HD-POS-${dateStr}-${rand}`;
    });
  };

  // -------------------------------------------------------------
  // FINANCIAL TOTALS
  // -------------------------------------------------------------
  const cartSubtotal = useMemo(() => {
    return posCart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }, [posCart]);

  const cartPreTax = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  const cartVat = useMemo(() => {
    return Math.round(cartPreTax * (vatRate / 100));
  }, [cartPreTax, vatRate]);

  const cartTotal = useMemo(() => {
    return cartPreTax + cartVat;
  }, [cartPreTax, cartVat]);

  // VietQR URL (MBBank 0394316963 BUI THE HOANG)
  const vietQrTransferMemo = `HD POS ${draftInvoiceCode.slice(-9)}`;
  const dynamicVietQrUrl = `https://api.vietqr.io/image/970422-0394316963-compact2.jpg?amount=${cartTotal}&addInfo=${encodeURIComponent(vietQrTransferMemo)}&accountName=BUI%20THE%20HOANG`;

  // -------------------------------------------------------------
  // PENDING BOOKINGS QUEUE
  // -------------------------------------------------------------
  const pendingBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const isUnpaid = b.paymentStatus === PaymentStatus.UNPAID;
      const isNotCancelled = ![BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(b.status);
      if (!isUnpaid || !isNotCancelled) return false;
      if (selectedBranchId !== 'ALL' && b.branchId && b.branchId !== selectedBranchId) {
        return false;
      }
      return true;
    });
  }, [allBookings, selectedBranchId]);

  const filteredPendingBookings = useMemo(() => {
    if (!queueSearchTerm.trim()) return pendingBookings;
    return pendingBookings.filter((bk) => {
      const srv = bk.items?.[0]?.service;
      const srvName = srv?.name || (bk as any).serviceName || '';
      const custName = bk.customer?.fullName || bk.bookedForName || '';
      const custPhone = bk.customer?.phone || bk.bookedForPhone || '';
      return matchSearch([bk.bookingCode, custName, custPhone, srvName], queueSearchTerm);
    });
  }, [pendingBookings, queueSearchTerm]);

  const loadBookingIntoCart = (bk: Booking) => {
    const srv = bk.items?.[0]?.service;
    const srvPrice = Number(srv?.price || bk.baseTotal || bk.finalPrice || 500000);
    const srvName = srv?.name || (bk as any).serviceName || 'Chăm sóc Dẫn lưu bạch huyết';

    if (bk.customer) {
      setSelectedCustomer(bk.customer);
    } else if (bk.bookedForName) {
      setSelectedCustomer({
        id: bk.customerId || GUEST_CUSTOMER.id,
        fullName: bk.bookedForName,
        phone: bk.bookedForPhone || '--',
        role: UserRole.CUSTOMER,
        membershipTier: MemberTier.STANDARD,
        gender: 'OTHER',
        rewardPoints: 0,
        totalSpent: 0,
        purpose: PurposeInterest.BEAUTY_SPA,
        referralCode: '',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    }

    if (bk.technicianId) {
      setSelectedCommissionStaffId(bk.technicianId);
    }

    setPosCart([
      {
        id: srv?.id || bk.id,
        name: srvName,
        type: 'SERVICE',
        unitPrice: srvPrice,
        quantity: 1,
        durationMinutes: srv?.durationMinutes || 60,
        serviceId: srv?.id,
      },
    ]);

    setBooking(bk);
    setActiveTab('pos');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'pos');
      return next;
    });
    toast.success('Đã nạp đơn vào quầy', `${srvName} · ${bk.bookingCode}`);
  };

  // -------------------------------------------------------------
  // POS CHECKOUT & PAYMENT PROCESSING
  // -------------------------------------------------------------
  const handleProcessPosPayment = async () => {
    if (paymentLock.current) return;
    if (posCart.length === 0) {
      toast.warning('Đơn hàng trống', 'Vui lòng chọn ít nhất 1 dịch vụ, gói hoặc sản phẩm từ menu bên trái.');
      return;
    }
    if (!currentShift) {
      toast.warning('Chưa mở ca thu ngân', 'Vui lòng mở ca thu ngân trước khi ghi nhận thanh toán.');
      setShowOpenShiftModal(true);
      return;
    }

    paymentLock.current = true;
    setIsProcessing(true);
    try {
      const activeBranch = selectedBranchId !== 'ALL' ? branches.find((b) => b.id === selectedBranchId) : branches[0];
      const targetBranchId = activeBranch?.id || 'aaaaaaaa-0001-0001-0001-000000000001';
      const targetCustomerId = isUuid(selectedCustomer.id) ? selectedCustomer.id : GUEST_CUSTOMER.id;

      const paymentMethodEnum =
        selectedMethod === 'onsite'
          ? PaymentMethod.CASH_AT_SPA
          : selectedMethod === 'transfer'
          ? PaymentMethod.BANK_TRANSFER
          : PaymentMethod.MOMO;

      const registrationPackage = isTreatmentRegistration
        && !booking?.id
        && discountAmount === 0
        && posCart.length === 1
        && posCart[0].type === 'PACKAGE'
        && posCart[0].quantity === 1;

      const collection = await posService.collectPayment({
        kind: booking?.id ? 'BOOKING' : registrationPackage ? 'PACKAGE' : 'CART',
        ...(booking?.id
          ? { bookingId: booking.id }
          : registrationPackage
            ? { packageId: posCart[0].packageId || posCart[0].id }
            : { items: posCart.map(item => ({ id: item.id, type: item.type, quantity: item.quantity, serviceId: item.serviceId, packageId: item.packageId })) }),
        customerId: targetCustomerId, branchId: currentShift.branchId,
        shiftId: currentShift.id, paymentMethod: paymentMethodEnum as PaymentMethod.CASH_AT_SPA | PaymentMethod.BANK_TRANSFER,
        vatRate, discountAmount, expectedTotal: cartTotal, commissionStaffId: selectedCommissionStaffId || undefined,
      });
      if (!collection.success || !collection.data?.invoice?.id) throw new Error(collection.message);
      if (registrationPackage) {
        // POS writes through the workflow API, not SupabaseService.query(). Clear the
        // operational cache so the treatment screen sees the newly activated package
        // immediately when the cashier hands off to first-session scheduling.
        supabaseService.invalidateCache('user_packages');
        supabaseService.invalidateCache('invoices');
      }
      const receiptCode = collection.data.invoice.invoice_code;
      const shift = await posService.getActiveShift(currentShift.branchId);
      if (shift.success) setCurrentShift(shift.data);

      // 6. Hiển thị biên lai điện tử
      const techName = commissionStaff.find((s) => s.id === selectedCommissionStaffId)?.fullName;
      setSelectedReceiptData({
        id: receiptCode,
        customerName: selectedCustomer.fullName || 'Khách hàng',
        customerPhone: selectedCustomer.phone || '--',
        customerTier: selectedCustomer.membershipTier || 'STANDARD',
        branchName: activeBranch?.name || 'Trụ sở MLD Việt Nam',
        branchAddress: activeBranch ? `${activeBranch.address}, ${activeBranch.district}, ${activeBranch.city}` : undefined,
        serviceName: posCart.map((i) => `${i.name} (x${i.quantity})`).join(', '),
        category: posCart.some((i) => i.type === 'PACKAGE') ? 'PACKAGE' : 'SERVICE',
        method: selectedMethod === 'onsite' ? 'Tiền mặt tại cơ sở' : selectedMethod === 'transfer' ? 'Chuyển khoản VietQR' : 'Quẹt thẻ POS',
        amount: `${Number(collection.data.amount ?? cartTotal).toLocaleString('vi-VN')}đ`,
        subtotal: `${cartSubtotal.toLocaleString('vi-VN')}đ`,
        discount: discountAmount > 0 ? `${discountAmount.toLocaleString('vi-VN')}đ` : '0đ',
        preTaxAmount: `${cartPreTax.toLocaleString('vi-VN')}đ`,
        vatRateText: `${vatRate}%`,
        vatAmountText: `${cartVat.toLocaleString('vi-VN')}đ`,
        shiftCode: currentShift.shiftCode,
        date: new Intl.DateTimeFormat('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date()),
        status: 'Đã thanh toán 100%',
        commissionText: undefined,
        technicianName: techName,
        userPackageId: collection.data.userPackage?.id,
        packageDefinitionId: collection.data.userPackage?.package_id,
        znsSent: false,
        materialsText: 'Chưa xác nhận xuất kho vật tư',
      });

      setShowReceiptModal(true);
      toast.success(
        registrationPackage ? 'Đã kích hoạt liệu trình' : 'Thanh toán thành công',
        registrationPackage
          ? `Hồ sơ liệu trình đã được tạo và liên kết hóa đơn ${receiptCode}.`
          : `Đã ghi nhận hóa đơn ${receiptCode} · ${cartTotal.toLocaleString('vi-VN')}đ`
      );

      // Reset cart và tạo mã mới cho đơn kế tiếp
      clearCart();
      await fetchPosData();
    } catch (err: any) {
      console.error('Lỗi quyết toán POS:', err);
      toast.error('Lỗi thanh toán', err?.message || 'Không thể ghi nhận hóa đơn.');
    } finally {
      paymentLock.current = false;
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // WALK-IN QUICK BOOKING MODAL HANDLER
  // -------------------------------------------------------------
  const handleCreateWalkInBooking = async () => {
    if (!isUuid(walkInCustomerId) || !walkInCustomerName.trim()) {
      toast.warning('Chọn hồ sơ khách hàng', 'Walk-in cần gắn với hồ sơ khách hàng có sẵn. Hãy tạo hồ sơ trước nếu khách mới.');
      return;
    }
    const chosenService = allServices.find((s) => s.id === walkInServiceId) || allServices[0];
    const chosenSlot = POS_TIME_SLOTS[walkInSlotIndex] || POS_TIME_SLOTS[0];
    const targetBranchId = selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id;
    if (!isUuid(targetBranchId) || !isUuid(chosenService?.id)) {
      toast.error('Thiếu dữ liệu', 'Cần chọn chi nhánh và dịch vụ đang hoạt động trước khi tạo lịch.');
      return;
    }

    const drcInfo = walkInDrcSlots.find(
      (d) => d.slotTime === chosenSlot.label || d.startTime?.startsWith(chosenSlot.startTime.slice(0, 5))
    );
    if (drcInfo && !drcInfo.isAvailable) {
      toast.error('Hết chỗ', `Không thể đặt lịch ca này: ${drcInfo.statusText}. Vui lòng chọn ca khác!`);
      return;
    }

    setIsSubmittingWalkIn(true);
    try {
      const srvPrice = Number(chosenService?.price || 500000);
      const res = await bookingService.createBooking({
        customerName: walkInCustomerName.trim(),
        customerPhone: walkInCustomerPhone.trim() || undefined,
        customerId: walkInCustomerId,
        branchId: targetBranchId,
        serviceId: chosenService?.id,
        serviceName: chosenService?.name || 'Chăm sóc & Trị liệu Dẫn lưu MLD',
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
          `Đã tạo đơn ${res.data.bookingCode} cho khách ${walkInCustomerName}. Nạp trực tiếp vào quầy POS!`
        );
        setAllBookings((prev) => [res.data, ...prev]);
        loadBookingIntoCart(res.data);
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

  // -------------------------------------------------------------
  // TUITION SETTLEMENT HANDLER
  // -------------------------------------------------------------
  const handleProcessTuitionPayment = async () => {
    if (paymentLock.current) return;
    if (!selectedEnrollment) {
      toast.error('Lỗi', 'Chưa chọn hồ sơ học viên để thanh toán học phí.');
      return;
    }
    if (!currentShift) {
      toast.warning('Chưa mở ca', 'Vui lòng mở ca thu ngân trước khi thu học phí.');
      setShowOpenShiftModal(true);
      return;
    }

    paymentLock.current = true;
    setIsProcessing(true);
    try {
      const paymentMethodEnum =
        selectedMethod === 'onsite'
          ? PaymentMethod.CASH_AT_SPA
          : selectedMethod === 'transfer'
          ? PaymentMethod.BANK_TRANSFER
          : PaymentMethod.MOMO;

      const due = Math.max(0, (selectedEnrollment.tuitionTotal || 9000000) - (selectedEnrollment.amountPaid || 0));
      const amount = tuitionPaymentAmount || due;
      if (amount <= 0) {
        toast.error('Số tiền không hợp lệ', 'Số thu phải lớn hơn 0.');
        return;
      }

      const activeBranch = selectedBranchId !== 'ALL' ? branches.find((b) => b.id === selectedBranchId) : branches[0];
      const validBranchId = isUuid(selectedEnrollment.batch?.branchId)
        ? selectedEnrollment.batch!.branchId
        : activeBranch?.id || 'aaaaaaaa-0001-0001-0001-000000000001';
      const validCustomerId = isUuid(selectedEnrollment.studentId) ? selectedEnrollment.studentId : GUEST_CUSTOMER.id;

      const collection = await posService.collectPayment({ kind: 'TUITION', enrollmentId: selectedEnrollment.id, amount,
        shiftId: currentShift.id, branchId: currentShift.branchId,
        paymentMethod: paymentMethodEnum as PaymentMethod.CASH_AT_SPA | PaymentMethod.BANK_TRANSFER });
      if (!collection.success || !collection.data?.transactionCode) throw new Error(collection.message);
      const generatedInvoiceCode = collection.data.transactionCode;
      const newPaidTotal = collection.data.paidTotal;
      const isFull = newPaidTotal >= collection.data.tuitionTotal;
      const shift = await posService.getActiveShift(currentShift.branchId);
      if (shift.success) setCurrentShift(shift.data);

      setSelectedReceiptData({
        id: generatedInvoiceCode,
        customerName: getEnrollmentStudentName(selectedEnrollment),
        customerPhone: getEnrollmentStudentPhone(selectedEnrollment),
        branchName: activeBranch?.name || 'MLD Academy Nam Kỳ Khởi Nghĩa',
        serviceName: getEnrollmentCourseTitle(selectedEnrollment),
        category: 'ACADEMY',
        method: selectedMethod === 'onsite' ? 'Tiền mặt tại cơ sở' : 'Chuyển khoản VietQR',
        amount: `${amount.toLocaleString('vi-VN')}đ`,
        subtotal: `${amount.toLocaleString('vi-VN')}đ`,
        vatRateText: '0%',
        vatAmountText: '0đ',
        shiftCode: currentShift.shiftCode,
        date: new Intl.DateTimeFormat('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date()),
        status: isFull ? 'Đã tất toán toàn khóa' : `Đã đóng đợt (còn nợ ${(selectedEnrollment.tuitionTotal! - newPaidTotal).toLocaleString('vi-VN')}đ)`,
      });

      setShowReceiptModal(true);
      toast.success('Đã thu học phí', `${amount.toLocaleString('vi-VN')}đ · ${generatedInvoiceCode}`);
      await fetchPosData();
    } catch (err: any) {
      console.error('Lỗi thu học phí:', err);
      toast.error('Lỗi thu học phí', err?.message || 'Không thể ghi nhận thanh toán.');
    } finally {
      paymentLock.current = false;
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // TUITION & ENROLLMENT HELPERS
  // -------------------------------------------------------------
  const getEnrollmentStudentName = (enr?: CourseEnrollment) => {
    if (!enr) return 'Học viên';
    if (enr.studentName?.trim()) return enr.studentName;
    const user = allCustomers.find((c) => c.id === enr.studentId);
    return user?.fullName || 'Học viên MLD';
  };

  const getEnrollmentStudentPhone = (enr?: CourseEnrollment) => {
    if (!enr) return '--';
    if (enr.studentPhone?.trim()) return enr.studentPhone;
    const user = allCustomers.find((c) => c.id === enr.studentId);
    return user?.phone || '--';
  };

  const getEnrollmentCourseTitle = (enr?: CourseEnrollment) => {
    if (!enr) return 'Khóa Đào Tạo MLD Chuyên Sâu';
    const fromCourse = allCourses.find((c) => c.id === enr.courseId);
    if (fromCourse?.title) return fromCourse.title;
    if (enr.course?.title) return enr.course.title;
    return (enr as any).courseTitle || 'Khóa Đào Tạo MLD Chuyên Sâu';
  };

  const handleCopyReceiptId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedReceiptId(id);
    toast.success('Đã sao chép mã', id);
    setTimeout(() => setCopiedReceiptId(null), 2000);
  };

  // -------------------------------------------------------------
  // RECEIPT LEDGER RESOLVER
  // -------------------------------------------------------------
  const resolveReceiptDetail = (inv: Invoice) => {
    const enr = allEnrollments.find((e) => e.id === inv.enrollmentId);
    const enrStudentName = enr ? getEnrollmentStudentName(enr) : undefined;
    const enrStudentPhone = enr ? getEnrollmentStudentPhone(enr) : undefined;

    const cust = inv.customer || allCustomers.find((c) => c.id === inv.customerId);
    const customerName = inv.receiptCustomerName || enrStudentName || cust?.fullName || 'Khách hàng MLD';
    const customerPhone = enrStudentPhone || cust?.phone || '--';
    const customerTier = cust?.membershipTier || 'STANDARD';

    const br = inv.branch || branches.find((b) => b.id === inv.branchId);
    const branchName = br?.name || 'Trụ sở MLD Việt Nam';
    const branchCode = br?.code || 'MLD-HQ';
    const branchDistrict = br?.district || 'Hà Nội';

    let title = inv.receiptDescription || 'Dịch vụ Spa & Trị liệu';
    let category: 'SERVICE' | 'PACKAGE' | 'ACADEMY' = 'SERVICE';

    if (inv.items && inv.items.length > 0) {
      title = inv.receiptDescription || inv.items.map((it: any) => it.itemName || it.item_name).filter(Boolean).join(', ');
      const itType = inv.items[0].itemType || (inv.items[0] as any).item_type;
      if (itType === 'COURSE') category = 'ACADEMY';
      else if (itType === 'PACKAGE') category = 'PACKAGE';
      else category = 'SERVICE';
    } else if (inv.enrollmentId || (inv.invoiceCode && inv.invoiceCode.startsWith('HD-HP'))) {
      const courseTitle = enr ? getEnrollmentCourseTitle(enr) : 'Khóa Đào Tạo MLD Chuyên Sâu';
      title = `Học phí: ${courseTitle}`;
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
      title = tp?.name || 'Gói Trị Liệu Dẫn Lưu Hệ Bạch Huyết';
      category = 'PACKAGE';
    }

    const methodLabel =
      inv.paymentMethod === PaymentMethod.CASH_AT_SPA
        ? 'Tiền mặt tại cơ sở'
        : inv.paymentMethod === PaymentMethod.MOMO
        ? 'Ví điện tử MoMo'
        : (inv.paymentMethod as string) === 'CREDIT_CARD'
        ? 'Quẹt thẻ POS'
        : 'Chuyển khoản VietQR';

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

    const refundAmount = Number(inv.refundAmount || 0);
    const netAmount = Math.max(0, Number(inv.totalAmount || 0) - refundAmount);
    const status = inv.paymentStatus === PaymentStatus.REFUNDED || refundAmount >= Number(inv.totalAmount || 0)
      ? 'Đã hoàn tiền'
      : refundAmount > 0
        ? 'Hoàn tiền một phần'
        : inv.paymentStatus === PaymentStatus.PAID
          ? 'Đã thanh toán'
          : inv.paymentStatus === PaymentStatus.PARTIAL
            ? 'Thanh toán một phần'
            : inv.paymentStatus === PaymentStatus.PENDING
              ? 'Đang chờ thanh toán'
              : 'Chờ thanh toán';

    return {
      id: inv.invoiceCode || inv.id,
      rawId: inv.id,
      date: dateStr,
      customerName,
      customerPhone,
      customerAvatar: cust?.avatarUrl,
      customerTier,
      branchName,
      branchCode,
      branchDistrict,
      branchId: inv.branchId,
      content: title,
      category,
      method: methodLabel,
      methodCode: inv.paymentMethod,
      amount: `${netAmount.toLocaleString('vi-VN')}đ`,
      rawAmount: Number(inv.totalAmount || 0),
      netAmount,
      refundAmount,
      subtotal: Number(inv.subtotal || inv.totalAmount || 0),
      discountAmount: Number(inv.discountAmount || 0),
      status,
      statusCode: refundAmount > 0 ? (refundAmount >= Number(inv.totalAmount || 0) ? PaymentStatus.REFUNDED : 'PARTIAL_REFUND') : (inv.paymentStatus || PaymentStatus.UNPAID),
    };
  };

  const pastReceipts = useMemo(() => {
    return invoices.map(resolveReceiptDetail);
  }, [invoices, allCustomers, branches, allEnrollments, allCourses, allBookings, treatmentPackages]);

  const openReceiptEditor = (receipt: (typeof pastReceipts)[number]) => {
    const invoice = invoices.find((item) => item.id === receipt.rawId);
    if (!invoice) {
      toast.error('Không tìm thấy hóa đơn gốc', 'Tải lại sổ hóa đơn rồi thử lại.');
      return;
    }
    setEditingReceipt(invoice);
    setReceiptCustomerName(invoice.receiptCustomerName || receipt.customerName);
    setReceiptDescription(invoice.receiptDescription || receipt.content);
    setReceiptNotes(invoice.receiptNotes || '');
    setReceiptItems(invoice.items || []);
    setReceiptEditReason('');
    void supabaseService.getInvoiceEditHistory(invoice.id).then(setReceiptEditHistory);
  };

  const saveReceiptEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingReceipt || receiptEditReason.trim().length < 3) return;
    setIsSavingReceipt(true);
    try {
      const saved = await supabaseService.editInvoiceReceipt({
        invoiceId: editingReceipt.id,
        customerName: receiptCustomerName,
        description: receiptDescription,
        notes: receiptNotes,
        reason: receiptEditReason.trim(),
        items: receiptItems.map(({id,itemName})=>({id,itemName})),
      });
      if (!saved) throw new Error('Database từ chối cập nhật biên lai.');
      toast.success('Đã cập nhật thông tin biên lai', 'Lịch sử sửa đã được lưu.');
      setEditingReceipt(null);
      await fetchPosData();
    } catch (error: any) {
      toast.error('Không thể sửa biên lai', error?.message || 'Vui lòng thử lại.');
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const filteredPastReceipts = useMemo(() => {
    return pastReceipts.filter((r) => {
      if (selectedBranchId !== 'ALL' && r.branchId !== selectedBranchId) return false;
      if (invoiceMethodFilter !== 'ALL' && r.methodCode !== invoiceMethodFilter) return false;
      if (invoiceStatusFilter !== 'ALL' && r.statusCode !== invoiceStatusFilter) return false;
      if (invoiceSearchTerm.trim()) {
        return matchSearch([r.id, r.customerName, r.customerPhone, r.content, r.branchName], invoiceSearchTerm);
      }
      return true;
    });
  }, [pastReceipts, selectedBranchId, invoiceMethodFilter, invoiceStatusFilter, invoiceSearchTerm]);

  // Tuition Receipts Memo
  const tuitionReceiptsList = useMemo(() => {
    return pastReceipts
      .filter((r) => r.category === 'ACADEMY' || r.id.startsWith('HD-HP'))
      .map((r) => {
        const inv = invoices.find((i) => i.invoiceCode === r.id || i.id === r.rawId);
        const enr = allEnrollments.find((e) => e.id === inv?.enrollmentId);
        const studentName = enr ? getEnrollmentStudentName(enr) : r.customerName;
        const studentPhone = enr ? getEnrollmentStudentPhone(enr) : r.customerPhone;
        const courseTitle = enr ? getEnrollmentCourseTitle(enr) : r.content;
        const tuitionTotal = enr?.tuitionTotal || r.subtotal || 0;
        const amountPaid = enr?.amountPaid || r.rawAmount || 0;
        const remaining = Math.max(0, tuitionTotal - amountPaid);
        const isFullyPaid = remaining <= 0;

        return {
          ...r,
          studentName,
          studentPhone,
          courseTitle,
          enrollmentOrderCode: enr?.orderCode,
          enrollmentId: enr?.id,
          tuitionTotal,
          amountPaid,
          remaining,
          isFullyPaid,
          enrollment: enr,
        };
      });
  }, [pastReceipts, allEnrollments, allCourses, invoices, allCustomers]);

  const filteredTuitionReceipts = useMemo(() => {
    return tuitionReceiptsList.filter((r) => {
      if (tuitionReceiptBranchFilter !== 'ALL' && r.branchId !== tuitionReceiptBranchFilter) return false;
      if (tuitionReceiptMethodFilter !== 'ALL' && r.methodCode !== tuitionReceiptMethodFilter) return false;
      if (tuitionReceiptSearchTerm.trim()) {
        return matchSearch(
          [r.id, r.studentName, r.studentPhone, r.courseTitle, r.branchName, r.enrollmentOrderCode],
          tuitionReceiptSearchTerm
        );
      }
      return true;
    });
  }, [tuitionReceiptsList, tuitionReceiptBranchFilter, tuitionReceiptMethodFilter, tuitionReceiptSearchTerm]);

  // Tuition KPIs
  const tuitionKpiTotal = useMemo(() => {
    return tuitionReceiptsList.reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [tuitionReceiptsList]);

  const tuitionKpiTransfer = useMemo(() => {
    return tuitionReceiptsList.filter((r) => r.methodCode === PaymentMethod.BANK_TRANSFER);
  }, [tuitionReceiptsList]);

  const tuitionKpiTransferTotal = useMemo(() => {
    return tuitionKpiTransfer.reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [tuitionKpiTransfer]);

  const tuitionKpiCash = useMemo(() => {
    return tuitionReceiptsList.filter((r) => r.methodCode === PaymentMethod.CASH_AT_SPA);
  }, [tuitionReceiptsList]);

  const tuitionKpiCashTotal = useMemo(() => {
    return tuitionKpiCash.reduce((acc, curr) => acc + curr.rawAmount, 0);
  }, [tuitionKpiCash]);

  // KPI Calculations
  const kpiPaid = pastReceipts.filter((r) => r.statusCode === PaymentStatus.PAID || r.statusCode === 'PARTIAL_REFUND');
  const kpiTotalRevenue = kpiPaid.reduce((acc, r) => acc + r.netAmount, 0);
  const kpiTransfer = kpiPaid.filter((r) => r.methodCode === PaymentMethod.BANK_TRANSFER);
  const kpiTransferAmount = kpiTransfer.reduce((acc, r) => acc + r.netAmount, 0);
  const kpiCash = kpiPaid.filter((r) => r.methodCode === PaymentMethod.CASH_AT_SPA);
  const kpiCashAmount = kpiCash.reduce((acc, r) => acc + r.netAmount, 0);

  // PDF Export
  const handleDownloadReceiptPdf = async () => {
    const el = document.getElementById('pos-receipt-card');
    if (!el) {
      toast.error('Lỗi', 'Không tìm thấy thông tin biên lai để xuất PDF.');
      return;
    }
    const code = selectedReceiptData?.id || 'HOA_DON_POS';
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

  // 1. Toàn bộ thực đơn danh mục (Dịch vụ lẻ, Gói combo, Sản phẩm bổ trợ)
  const allCatalogItems = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      type: 'SERVICE' | 'PACKAGE' | 'PRODUCT';
      price: number;
      durationMinutes?: number;
      totalSessions?: number;
      description?: string;
      badgeText: string;
      imageUrl?: string;
      serviceId?: string;
      packageId?: string;
      searchTokens: string;
    }> = [];

    // Dịch vụ cốt lõi (Buổi lẻ)
    allServices.forEach((s) => {
      const duration = s.durationMinutes || 60;
      const price = Number(s.discountPrice) > 0 && Number(s.discountPrice) < Number(s.price)
        ? Number(s.discountPrice) : Number(s.price);
      items.push({
        id: s.id,
        name: s.name,
        type: 'SERVICE',
        price,
        durationMinutes: duration,
        description: s.shortDescription || s.fullDescription || 'Chăm sóc Dẫn lưu bạch huyết chuẩn Y khoa Vodder',
        badgeText: `${duration} phút`,
        imageUrl: s.imageUrl || '/spa_massage_banner.png',
        serviceId: s.id,
        searchTokens: `${s.name} dich vu le buoi le cham soc ${duration} phut ${duration}p ${duration}' ${duration}phut ${price} ${Math.round(price / 1000)}k ${price >= 1000000 ? (price / 1000000).toFixed(1) + 'tr' : ''} ${s.shortDescription || ''}`,
      });
    });

    // Gói liệu trình (Combo 10, 20, 30 buổi)
    treatmentPackages.forEach((p) => {
      const sessions = Number(p.totalSessions || 10);
      const price = Number(p.price || 4800000);
      items.push({
        id: p.id,
        name: p.name,
        type: 'PACKAGE',
        price,
        totalSessions: sessions,
        description: p.description || `Lộ trình ${sessions} buổi chuyên sâu điều hòa hệ bạch huyết`,
        badgeText: `${sessions} buổi`,
        imageUrl: p.imageUrl || '/spa_massage_banner.png',
        packageId: p.id,
        searchTokens: `${p.name} goi lieu trinh combo ${sessions} buoi ${sessions}b ${sessions}buoi ${price} ${Math.round(price / 1000)}k ${price >= 1000000 ? (price / 1000000).toFixed(1) + 'tr' : ''} ${p.description || ''}`,
      });
    });

    // Sản phẩm bổ trợ Homecare
    homeProducts.forEach((pr) => {
      items.push({
        id: pr.id,
        name: pr.name,
        type: 'PRODUCT',
        price: Number(pr.price_min || 0),
        description: 'Sản phẩm bổ trợ chăm sóc phục hồi mô tế bào tại nhà',
        badgeText: pr.unit || pr.category || 'Sản phẩm bổ trợ',
        imageUrl: pr.image_url || pr.image_urls?.[0],
        searchTokens: `${pr.name} ${pr.category || ''} san pham my pham homecare ${pr.price_min} ${Math.round(Number(pr.price_min || 0) / 1000)}k`,
      });
    });

    return items;
  }, [allServices, treatmentPackages, homeProducts]);

  // 2. Thống kê số lượng kết quả tìm kiếm theo từng tab
  const catalogCounts = useMemo(() => {
    const q = catalogSearch.trim();
    const filterItem = (it: typeof allCatalogItems[0]) => {
      if (!q) return true;
      return matchSearch([it.name, it.description, it.badgeText, it.searchTokens], q);
    };

    const allMatches = allCatalogItems.filter(filterItem);
    return {
      all: allMatches.length,
      service: allMatches.filter((it) => it.type === 'SERVICE').length,
      package: allMatches.filter((it) => it.type === 'PACKAGE').length,
      product: allMatches.filter((it) => it.type === 'PRODUCT').length,
    };
  }, [allCatalogItems, catalogSearch]);

  // 3. Danh sách mục hiển thị kết hợp tìm kiếm và chuyển đổi tab thông minh
  const displayedCatalogItems = useMemo(() => {
    const q = catalogSearch.trim();
    const matchesSearch = (it: typeof allCatalogItems[0]) => {
      if (!q) return true;
      return matchSearch([it.name, it.description, it.badgeText, it.searchTokens], q);
    };

    const inCategory = allCatalogItems.filter((it) => {
      if (catalogCategory === 'SERVICE') return it.type === 'SERVICE';
      if (catalogCategory === 'PACKAGE') return it.type === 'PACKAGE';
      if (catalogCategory === 'PRODUCT') return it.type === 'PRODUCT';
      return true;
    });

    const filtered = inCategory.filter(matchesSearch);

    // Cross-category fallback:
    // Nếu thu ngân đang đứng ở tab cụ thể mà từ khóa tìm kiếm không có trong tab đó,
    // nhưng lại có trong danh mục khác -> tự động hiển thị kết quả từ toàn bộ thực đơn
    if (q && filtered.length === 0 && catalogCategory !== 'ALL') {
      const allMatches = allCatalogItems.filter(matchesSearch);
      if (allMatches.length > 0) return allMatches;
    }

    return filtered;
  }, [allCatalogItems, catalogCategory, catalogSearch]);

  // 4. Danh sách khách hàng gợi ý khi tìm kiếm tại quầy
  const filteredCustomers = useMemo(() => {
    const q = customerSearchKeyword.trim();
    if (!q) {
      return allCustomers.filter((c) => isUuid(c.id) && c.id !== GUEST_CUSTOMER.id).slice(0, 8);
    }
    return allCustomers.filter((c) => {
      if (!isUuid(c.id) || c.id === GUEST_CUSTOMER.id) return false;
      return matchSearch([c.fullName, c.phone, c.email, c.membershipTier], q);
    }).slice(0, 15);
  }, [allCustomers, customerSearchKeyword]);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] pb-12 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & WORKSTATION BAR                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EFE4D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-[#2C241E] tracking-tight">
              Thu ngân & Quản lý Hóa đơn
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F6ED] text-[#0D6832] border border-[#C2E8D1]">
              MLD Smart POS 2026
            </span>
          </div>
          <p className="text-xs text-[#73675F] mt-0.5">
            Trạm bán hàng tại quầy, quyết toán đơn dịch vụ, xuất hóa đơn VAT 8% Y tế và thu học phí học viện.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Branch Selector */}
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-bold text-[#2C241E] hover:bg-white transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
            >
              <option value="ALL">📍 Tất cả cơ sở ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} ({b.code})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Walk-in Booking Quick Button */}
          <button
            type="button"
            onClick={() => {
              const activeBranch = selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id;
              if (activeBranch) setSelectedBranchId(activeBranch);
              setShowWalkInModal(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Đặt lịch tại quầy và tự động khóa giường & KTV theo chuẩn DRC"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Đặt lịch tại quầy (Walk-in)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CASHIER SHIFT STATUS BAR                                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-sky-100 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {currentShift ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
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
              <p className="text-[11.5px] text-slate-600 mt-0.5">
                Tiền mặt đầu ca: <strong className="text-slate-800">{currentShift.openingCash.toLocaleString('vi-VN')}đ</strong> · 
                Doanh thu ca hiện tại: <strong className="text-emerald-700">{(currentShift.totalSales || 0).toLocaleString('vi-VN')}đ</strong> · 
                Mở lúc: {new Date(currentShift.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Chưa mở ca thu ngân</div>
              <p className="text-[11.5px] text-slate-500">
                Mở ca làm việc để ghi nhận tiền mặt ban đầu và đối soát doanh thu cuối ngày.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {currentShift ? (
            <button
              type="button"
              onClick={() => {
                setShiftClosingCash(currentShift.systemCash ?? currentShift.openingCash);
                setShiftVarianceReason('');
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

      {/* ========================================================================= */}
      {/* 2. PRIMARY WORKSTATION NAVIGATION TABS                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EFE4D9] pb-2">
        {/* Tab 1: Bán hàng tại quầy */}
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bán hàng tại quầy (POS)</span>
          {posCart.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-white text-[#985018]">
              {posCart.length}
            </span>
          )}
        </button>

        {/* Tab 2: Hàng chờ thanh toán */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('queue');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'queue');
              return next;
            });
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Hàng chờ thanh toán</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
          }`}>
            {pendingBookings.length}
          </span>
        </button>

        {/* Tab 3: Phiếu thu Học viện */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('tuition');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'tuition');
              return next;
            });
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'tuition'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Phiếu thu Học phí ({tuitionReceiptsList.length || allEnrollments.length})</span>
        </button>

        {/* Tab 4: Sổ hóa đơn & Đối chiếu */}
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
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'receipts'
              ? 'bg-[#985018] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-[#FAF6F0] hover:text-[#985018] border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sổ hóa đơn & Biên lai</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
          }`}>
            {pastReceipts.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BÁN HÀNG TẠI QUẦY (POS WORKSTATION - MENU + CART + CHECKOUT)       */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {isTreatmentRegistration && (
            <div className="rounded-2xl border border-[#D7BBA6] bg-[#FAF8F5] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#985018] text-white flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5" /></span>
                <div>
                  <p className="text-xs font-extrabold text-[#2C241E]">Đăng ký liệu trình · Bước thanh toán</p>
                  <p className="text-[11px] text-[#73675F] mt-1">Khách hàng và gói đã được chọn. Kiểm tra chi nhánh, nhân viên tư vấn, giá và phương thức thanh toán trước khi kích hoạt.</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#8A4F23] whitespace-nowrap">Hồ sơ chỉ tạo khi thanh toán thành công</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ------------------------------------------------------------- */}
          {/* LEFT 65%: INTERACTIVE MENU & SERVICE / PACKAGE CATALOG        */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Quick alert if bookings are waiting in queue */}
            {pendingBookings.length > 0 && (
              <div className="bg-[#FAF6F0] border border-[#E8DFD8] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2C241E]">
                      Có {pendingBookings.length} khách có lịch hẹn hoàn tất đang chờ thanh toán!
                    </span>
                    <p className="text-[11px] text-[#73675F]">
                      Bấm để xem danh sách hoặc nạp trực tiếp vào quầy thanh toán.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('queue');
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('tab', 'queue');
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem hàng chờ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Menu Filter Toolbar & Search */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Category Pills with dynamic counts */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatalogCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      catalogCategory === 'ALL'
                        ? 'bg-[#985018] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#73675F] hover:bg-[#F3E2CE] hover:text-[#2C241E]'
                    }`}
                  >
                    Tất cả thực đơn ({catalogCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogCategory('SERVICE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      catalogCategory === 'SERVICE'
                        ? 'bg-[#985018] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#73675F] hover:bg-[#F3E2CE] hover:text-[#2C241E]'
                    }`}
                  >
                    Dịch vụ cốt lõi (45' · 60' · 90') ({catalogCounts.service})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogCategory('PACKAGE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      catalogCategory === 'PACKAGE'
                        ? 'bg-[#985018] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#73675F] hover:bg-[#F3E2CE] hover:text-[#2C241E]'
                    }`}
                  >
                    Gói liệu trình (10 · 20 · 30 buổi) ({catalogCounts.package})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogCategory('PRODUCT')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      catalogCategory === 'PRODUCT'
                        ? 'bg-[#985018] text-white shadow-xs'
                        : 'bg-[#FAF8F5] text-[#73675F] hover:bg-[#F3E2CE] hover:text-[#2C241E]'
                    }`}
                  >
                    Sản phẩm bổ trợ ({catalogCounts.product})
                  </button>
                </div>

                {/* Counter */}
                <span className="text-[11px] font-semibold text-[#8C7A6B]">
                  {displayedCatalogItems.length} mục hiển thị
                </span>
              </div>

              {/* Live Search Input with Diacritics Support */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setCatalogSearch('');
                  }}
                  placeholder="Gõ tìm nhanh: khu trú, mở rộng, 20 buổi, 90 phút, 500k, sản phẩm..."
                  className="w-full pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:bg-white focus:outline-none focus:border-[#985018] transition-all"
                />
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearch('')}
                    title="Xóa tìm kiếm (Esc)"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-none">
                <span className="text-[#8C7A6B] shrink-0 font-medium">Gợi ý tìm nhanh:</span>
                {[
                  { label: 'Khu trú (45\')', val: 'khu trú' },
                  { label: 'Mở rộng (60\')', val: 'mở rộng' },
                  { label: 'Toàn diện (90\')', val: 'toàn diện' },
                  { label: 'Gói 10 buổi', val: '10 buổi' },
                  { label: 'Gói 20 buổi', val: '20 buổi' },
                  { label: 'Gói 30 buổi', val: '30 buổi' },
                  { label: 'Sản phẩm', val: 'sản phẩm' },
                ].map((chip) => {
                  const isSelected = catalogSearch.toLowerCase().trim() === chip.val.toLowerCase();
                  return (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setCatalogSearch('');
                        } else {
                          setCatalogSearch(chip.val);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#985018] text-white shadow-2xs font-bold'
                          : 'bg-[#FAF8F5] border border-[#E8DFD8] text-[#73675F] hover:bg-[#FAF0E4] hover:text-[#985018]'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
                {catalogSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogCategory('ALL');
                    }}
                    className="text-[#8A4F23] hover:underline shrink-0 font-bold ml-1 cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {displayedCatalogItems.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-[#E8DFD8] p-6 space-y-3">
                  <Search className="w-8 h-8 text-[#A69788] mx-auto opacity-50" />
                  <div className="text-sm font-bold text-[#2C241E]">
                    Không tìm thấy mục nào phù hợp với "{catalogSearch}"
                  </div>
                  <p className="text-xs text-[#73675F] max-w-md mx-auto">
                    Bạn có thể thử tìm bằng từ không dấu như: <code>khu tru</code>, <code>mo rong</code>, <code>toan dien</code>, <code>20 buoi</code>, <code>45 phut</code>, <code>500k</code> hoặc bấm nút bên dưới để xem lại toàn bộ.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogCategory('ALL');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Xem lại tất cả thực đơn</span>
                  </button>
                </div>
              )}
              {displayedCatalogItems.map((item) => {
                const inCartItem = posCart.find((c) => c.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018]/40 p-4 shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Top Tag & Type */}
                    <div>
                      {item.type === 'PRODUCT' && item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="mb-3 h-36 w-full rounded-lg object-cover bg-[#F8F5F0]" />
                      )}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            item.type === 'SERVICE'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : item.type === 'PACKAGE'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {item.type === 'SERVICE' ? 'Dịch vụ' : item.type === 'PACKAGE' ? 'Gói liệu trình' : 'Sản phẩm'}
                        </span>
                        <span className="text-[11px] font-bold text-[#8A4F23] bg-[#FAF6F0] px-2 py-0.5 rounded-md">
                          {item.badgeText}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#2C241E] group-hover:text-[#985018] transition-colors leading-snug">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-[#73675F] line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Price & Add Action */}
                    <div className="mt-3.5 pt-3 border-t border-[#F2ECE6] flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-[#985018]">
                          {item.price.toLocaleString('vi-VN')}đ
                        </div>
                        <span className="text-[10px] text-[#8C7A6B]">
                          {item.type === 'SERVICE' ? 'Đã gồm VAT 8%' : 'Giá niêm yết'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                            unitPrice: item.price,
                            durationMinutes: item.durationMinutes,
                            totalSessions: item.totalSessions,
                            imageUrl: item.imageUrl,
                            serviceId: item.serviceId,
                            packageId: item.packageId,
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          inCartItem
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-[#985018] hover:bg-[#854412] text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{inCartItem ? `Thêm (${inCartItem.quantity})` : 'Chọn'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* RIGHT 35%: ORDER SLIP & LIVE CHECKOUT PANEL                   */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs space-y-4 sticky top-4">
            {/* Header: Customer Profile Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#985018]" />
                  <span>Khách hàng thanh toán</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerForm({ fullName: '', phone: '', gender: 'FEMALE', address: '' });
                      setIsAddingCustomer(true);
                    }}
                    className="text-[11px] font-bold text-[#985018] hover:text-[#854412] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Khách mới</span>
                  </button>
                  {selectedCustomer.id !== GUEST_CUSTOMER.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const guest = allCustomers.find((c) => c.id === GUEST_CUSTOMER.id) || GUEST_CUSTOMER;
                        setSelectedCustomer(guest);
                        setCustomerSearchKeyword('');
                        setShowCustomerDropdown(false);
                      }}
                      className="text-[11px] font-bold text-[#8A4F23] hover:underline cursor-pointer"
                    >
                      Về vãng lai
                    </button>
                  )}
                </div>
              </div>

              {/* Searchable Customer Input & Combobox Dropdown */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearchKeyword}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onChange={(e) => {
                      setCustomerSearchKeyword(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder="Gõ tìm tên, SĐT khách (vd: Hoàng, 091...)"
                    className="w-full h-10 pl-9 pr-8 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-semibold text-[#2C241E] focus:bg-white focus:outline-none focus:border-[#985018] transition-all"
                  />
                  {customerSearchKeyword ? (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchKeyword('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E]"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {showCustomerDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowCustomerDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-xl border border-[#EFE4D9] shadow-xl max-h-72 overflow-y-auto divide-y divide-[#F2ECE6]">
                      {/* Guest Customer Option */}
                      <button
                        type="button"
                        onClick={() => {
                          const guest = allCustomers.find((c) => c.id === GUEST_CUSTOMER.id) || GUEST_CUSTOMER;
                          setSelectedCustomer(guest);
                          setShowCustomerDropdown(false);
                          setCustomerSearchKeyword('');
                        }}
                        className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                          selectedCustomer.id === GUEST_CUSTOMER.id ? 'bg-[#FAF0E4]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#EFE4D9] text-[#8A4F23] flex items-center justify-center text-xs font-bold">
                            ⚡
                          </span>
                          <div>
                            <div className="font-bold text-[#2C241E]">Khách hàng Vãng lai (Guest)</div>
                            <div className="text-[11px] text-[#73675F]">0900000000 · Thanh toán nhanh tại quầy</div>
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23]">
                          STANDARD
                        </span>
                      </button>

                      {/* Filtered Customer List */}
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((cust) => {
                          const isSelected = selectedCustomer.id === cust.id;
                          return (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setShowCustomerDropdown(false);
                                setCustomerSearchKeyword('');
                              }}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer ${
                                isSelected ? 'bg-[#FAF0E4]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#F3E2CE] text-[#985018] flex items-center justify-center text-[10px] font-bold">
                                  {cust.fullName ? cust.fullName.charAt(0).toUpperCase() : 'K'}
                                </div>
                                <div>
                                  <div className="font-bold text-[#2C241E]">{cust.fullName}</div>
                                  <div className="text-[11px] text-[#73675F]">{cust.phone || 'Chưa có SĐT'}</div>
                                </div>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  cust.membershipTier === 'DIAMOND'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : cust.membershipTier === 'GOLD'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : cust.membershipTier === 'SILVER'
                                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                    : 'bg-[#FAF0E4] text-[#8A4F23]'
                                }`}
                              >
                                {cust.membershipTier || 'STANDARD'}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-[#73675F] space-y-2">
                          <p>Không tìm thấy khách hàng nào khớp với "{customerSearchKeyword}"</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomerDropdown(false);
                              setNewCustomerForm((p) => ({
                                ...p,
                                fullName: /^\d+$/.test(customerSearchKeyword) ? '' : customerSearchKeyword.trim(),
                                phone: /^\d+$/.test(customerSearchKeyword) ? customerSearchKeyword.trim() : '',
                              }));
                              setIsAddingCustomer(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#985018] text-white text-xs font-bold hover:bg-[#854412] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Tạo khách hàng mới</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Selected Customer Card */}
              <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EFE4D9] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold text-xs border border-[#E8DFD8]">
                    {selectedCustomer.id === GUEST_CUSTOMER.id ? '👤' : (selectedCustomer.fullName?.charAt(0).toUpperCase() || 'K')}
                  </div>
                  <div>
                    <div className="font-bold text-[#2C241E] flex items-center gap-1.5">
                      <span>{selectedCustomer.fullName}</span>
                      {selectedCustomer.id === GUEST_CUSTOMER.id && (
                        <span className="text-[10px] px-1 py-0.2 bg-[#EFE4D9] text-[#73675F] rounded font-medium">Vãng lai</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#73675F]">{selectedCustomer.phone || 'Không có SĐT'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedCustomer.membershipTier === 'DIAMOND'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : selectedCustomer.membershipTier === 'GOLD'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : selectedCustomer.membershipTier === 'SILVER'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]'
                    }`}
                  >
                    {selectedCustomer.membershipTier || 'STANDARD'}
                  </span>
                  {selectedCustomer.id !== GUEST_CUSTOMER.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const guest = allCustomers.find((c) => c.id === GUEST_CUSTOMER.id) || GUEST_CUSTOMER;
                        setSelectedCustomer(guest);
                      }}
                      title="Trở về khách vãng lai"
                      className="p-1 text-[#8C7A6B] hover:text-rose-600 rounded-md hover:bg-white transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-[#F2ECE6]">
                <span className="font-bold text-[#2C241E] flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-[#985018]" />
                  <span>Chi tiết phiếu thu ({posCart.length})</span>
                </span>
                {posCart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Xóa hết
                  </button>
                )}
              </div>

              {posCart.length === 0 ? (
                <div className="py-8 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E8DFD8] p-3 space-y-1.5">
                  <ShoppingCart className="w-8 h-8 text-[#A69788] mx-auto opacity-40" />
                  <div className="text-xs font-bold text-[#2C241E]">Chưa có dịch vụ nào trong đơn</div>
                  <p className="text-[11px] text-[#73675F] max-w-[220px] mx-auto">
                    Bấm <strong>"+ Chọn"</strong> tại bảng thực đơn bên trái hoặc chọn từ hàng chờ.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {posCart.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] flex items-center justify-between gap-2 text-xs"
                    >
                      {item.type === 'PRODUCT' && item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#2C241E] truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[#73675F] mt-0.5">
                          {item.unitPrice.toLocaleString('vi-VN')}đ / cái
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-white px-1.5 py-1 rounded-lg border border-[#E8DFD8]">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 hover:text-rose-600 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-slate-800 text-[11px]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="w-5 h-5 flex items-center justify-center font-bold text-slate-600 hover:text-emerald-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right">
                        <div className="font-bold text-[#2C241E]">
                          {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-[10px] text-rose-500 hover:text-rose-700 cursor-pointer mt-0.5 inline-block"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff / Technician Attribution */}
            <div>
              <label className="block text-xs font-bold text-[#2C241E] mb-1">
                KTV / Chuyên viên hưởng hoa hồng:
              </label>
              <div className="relative">
                <select
                  value={selectedCommissionStaffId}
                  onChange={(e) => setSelectedCommissionStaffId(e.target.value)}
                  className="w-full h-9 px-3 pr-8 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer appearance-none"
                >
                  <option value="">-- Tùy chọn: Chọn người thực hiện --</option>
                  {commissionStaff.map((st) => (
                    <option key={st.id} value={st.id}>
                      👤 {st.fullName} ({st.staffProfile.commissionRate || 10}%)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Pricing Breakdown & VAT */}
            <div className="border border-[#EFE4D9] rounded-2xl p-3.5 space-y-2 text-xs bg-[#FAF8F5]">
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Tạm tính</span>
                <span className="font-semibold text-[#2C241E]">{cartSubtotal.toLocaleString('vi-VN')}đ</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Chiết khấu / Ưu đãi</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    disabled={isTreatmentRegistration}
                    title={isTreatmentRegistration ? 'Luồng đăng ký liệu trình sử dụng đúng giá ưu đãi đã cấu hình của gói.' : undefined}
                    className="w-20 text-right py-0.5 px-1.5 border border-[#E8DFD8] bg-white rounded text-xs font-semibold text-emerald-700 focus:outline-none focus:border-[#985018] disabled:bg-[#F1ECE7] disabled:text-[#9A8E84] disabled:cursor-not-allowed"
                  />
                  <span className="font-bold text-emerald-700">đ</span>
                </div>
              </div>

              {/* VAT Switcher (8% Chuẩn Y tế) */}
              <div className="pt-2 border-t border-dashed border-[#E8DFD8] flex items-center justify-between">
                <span className="text-[#73675F]">Thuế VAT ({vatRate}%)</span>
                <div className="flex items-center gap-1">
                  {[0, 8, 10].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setVatRate(rate)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        vatRate === rate
                          ? 'bg-[#985018] text-white shadow-xs'
                          : 'bg-white border border-[#E8DFD8] text-slate-600 hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {rate === 0 ? '0%' : `${rate}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[#73675F]">
                <span>Tiền thuế VAT</span>
                <span className="font-semibold text-sky-700">+{cartVat.toLocaleString('vi-VN')}đ</span>
              </div>

              {/* Grand Total */}
              <div className="border-t border-[#E8DFD8] pt-2 flex items-center justify-between">
                <span className="font-bold text-sm text-[#2C241E]">Tổng thanh toán:</span>
                <span className="text-lg font-black text-[#985018] tracking-tight">
                  {cartTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2C241E]">Phương thức thanh toán:</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('onsite')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    selectedMethod === 'onsite'
                      ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                      : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Tiền mặt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('transfer')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    selectedMethod === 'transfer'
                      ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                      : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>VietQR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('online')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    selectedMethod === 'online'
                      ? 'bg-[#985018] text-white border-[#985018] shadow-xs'
                      : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Quẹt thẻ POS</span>
                </button>
              </div>
            </div>

            {/* Dynamic VietQR Preview Card (If Transfer Selected) */}
            {selectedMethod === 'transfer' && cartTotal > 0 && (
              <div className="p-3 bg-white rounded-2xl border border-sky-200 shadow-xs space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-800 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Mã thanh toán VietQR động</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Khớp tiền tự động
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                    <img
                      src={dynamicVietQrUrl}
                      alt="VietQR MLD"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] space-y-1 flex-1">
                    <div>
                      <span className="text-slate-500">Ngân hàng:</span> <strong>MBBank</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số tài khoản:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('0394316963', 'STK')}
                        className="font-mono font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        0394316963 <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <span className="text-slate-500">Chủ TK:</span> <strong>BUI THE HOANG</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số tiền:</span>
                      <strong className="text-emerald-700 font-bold">{cartTotal.toLocaleString('vi-VN')}đ</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-slate-500">Nội dung CK:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(vietQrTransferMemo, 'Nội dung')}
                        className="font-mono text-[10px] font-bold text-slate-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {vietQrTransferMemo} <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isProcessing || posCart.length === 0}
              onClick={handleProcessPosPayment}
              className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                isProcessing || posCart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#985018] hover:bg-[#854412] text-white shadow-[#985018]/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang ghi nhận hóa đơn & xuất biên lai...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận thanh toán & In hóa đơn ({cartTotal.toLocaleString('vi-VN')}đ)</span>
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HÀNG CHỜ THANH TOÁN (PENDING QUEUE)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2C241E]">
                Khách hàng chờ quyết toán tại cơ sở ({pendingBookings.length})
              </h2>
              <p className="text-xs text-[#73675F] mt-0.5">
                Danh sách các ca trị liệu hoàn tất hoặc lịch hẹn hôm nay chưa thanh toán. Nhấn "Nạp vào quầy" để quyết toán ngay.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPosData}
              className="px-3 py-1.5 rounded-xl border border-[#E8DFD8] text-xs font-bold text-[#73675F] hover:bg-[#FAF8F5] flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại</span>
            </button>
          </div>

          {/* Queue Search Toolbar */}
          {pendingBookings.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={queueSearchTerm}
                onChange={(e) => setQueueSearchTerm(e.target.value)}
                placeholder="Tìm nhanh theo tên khách, SĐT, mã lịch hẹn BK-... hoặc dịch vụ..."
                className="w-full pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:bg-white focus:outline-none focus:border-[#985018] transition-all"
              />
              {queueSearchTerm && (
                <button
                  type="button"
                  onClick={() => setQueueSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {pendingBookings.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-[#2C241E]">Không có đơn nào chờ thanh toán</h3>
              <p className="text-xs text-[#73675F] max-w-sm mx-auto">
                Tất cả khách hàng đã được thanh toán hoặc chưa có lịch hẹn mới. Bạn có thể bán gói hoặc dịch vụ mới tại Tab "Bán hàng tại quầy".
              </p>
            </div>
          ) : filteredPendingBookings.length === 0 ? (
            <div className="py-12 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E8DFD8] p-4 space-y-2">
              <Search className="w-8 h-8 text-[#A69788] mx-auto opacity-50" />
              <div className="text-xs font-bold text-[#2C241E]">
                Không tìm thấy lịch hẹn nào khớp với "{queueSearchTerm}"
              </div>
              <button
                type="button"
                onClick={() => setQueueSearchTerm('')}
                className="text-xs text-[#985018] hover:underline font-bold cursor-pointer"
              >
                Xóa từ khóa tìm kiếm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPendingBookings.map((bk) => {
                const srv = bk.items?.[0]?.service;
                const srvPrice = Number(srv?.price || bk.finalPrice || bk.baseTotal || 500000);
                const srvName = srv?.name || (bk as any).serviceName || 'Trị liệu Dẫn lưu MLD';
                const custName = bk.customer?.fullName || bk.bookedForName || 'Khách hàng';
                const custPhone = bk.customer?.phone || bk.bookedForPhone || '--';

                return (
                  <div
                    key={bk.id}
                    className="p-4 rounded-2xl border border-[#EFE4D9] hover:border-[#985018] bg-[#FAF8F5] space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-[#8A4F23] bg-[#FAF0E4] px-2 py-0.5 rounded">
                        {bk.bookingCode}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Chờ thanh toán
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#2C241E]">{custName}</h4>
                      <p className="text-xs text-[#73675F]">{custPhone}</p>
                    </div>

                    <div className="text-xs text-[#73675F] space-y-1 pt-1 border-t border-[#E8DFD8]">
                      <div>
                        Dịch vụ: <strong className="text-[#2C241E]">{srvName}</strong>
                      </div>
                      <div>
                        Kỹ thuật viên: <strong className="text-[#2C241E]">{bk.technician?.fullName || 'Chưa gán'}</strong>
                      </div>
                      <div>
                        Giờ ca: <strong className="text-[#2C241E]">{bk.startTime?.slice(0, 5)} - {bk.endTime?.slice(0, 5)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD8]">
                      <div className="text-sm font-black text-[#985018]">
                        {srvPrice.toLocaleString('vi-VN')}đ
                      </div>
                      <button
                        type="button"
                        onClick={() => loadBookingIntoCart(bk)}
                        className="px-3 py-1.5 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span>Nạp vào quầy ➜</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PHIẾU THU HỌC PHÍ HỌC VIỆN                                         */}
      {/* ========================================================================= */}
      {activeTab === 'tuition' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-[#EFE4D9] bg-white px-5 py-3 text-sm font-semibold text-[#2C241E]">
            Học phí thực thu: <span data-testid="tuition-net-total" className="text-[#985018]">{tuitionLedger === null ? 'Đang tải…' : `${tuitionLedger.filter(row => row.paymentStatus === PaymentStatus.PAID && (selectedBranchId === 'ALL' || row.branchId === selectedBranchId)).reduce((sum, row) => sum + (row.transactionType === 'REFUND' ? -Math.abs(row.amount) : row.amount), 0).toLocaleString('vi-VN')}đ`}</span>
          </div>
          {/* PHẦN 1: GHI NHẬN PHIẾU THU HỌC PHÍ MỚI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Tìm kiếm & Chọn hồ sơ học viên */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#2C241E] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#8A4F23]" />
                  <span>Tìm kiếm hồ sơ học viên tuyển sinh</span>
                </h2>
                {selectedEnrollment && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnrollment(undefined);
                      setTuitionPaymentAmount(0);
                      setTuitionSearchTerm('');
                    }}
                    className="text-[11px] font-bold text-[#8A4F23] hover:text-[#5C3214] hover:underline cursor-pointer"
                  >
                    Chọn học viên khác
                  </button>
                )}
              </div>

              {/* Search Combobox Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tuitionSearchTerm}
                  onFocus={() => setIsTuitionStudentDropdownOpen(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTuitionSearchTerm(val);
                    setIsTuitionStudentDropdownOpen(true);
                  }}
                  placeholder="Nhập họ tên học viên, SĐT hoặc mã tuyển sinh..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] shadow-2xs"
                />
                {tuitionSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setTuitionSearchTerm('');
                      setIsTuitionStudentDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Autocomplete Dropdown List */}
                {isTuitionStudentDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-[#F4ECE3]">
                    <div className="p-2 bg-[#FAF8F5] text-[11px] font-bold text-[#8A4F23] flex items-center justify-between">
                      <span>Chọn học viên ({allEnrollments.length} hồ sơ)</span>
                      <button
                        type="button"
                        onClick={() => setIsTuitionStudentDropdownOpen(false)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {allEnrollments
                      .filter((enr) => {
                        if (!tuitionSearchTerm.trim()) return true;
                        return matchSearch(
                          [
                            getEnrollmentStudentName(enr),
                            getEnrollmentStudentPhone(enr),
                            enr.orderCode,
                            getEnrollmentCourseTitle(enr),
                          ],
                          tuitionSearchTerm
                        );
                      })
                      .map((enr) => {
                        const sName = getEnrollmentStudentName(enr);
                        const sPhone = getEnrollmentStudentPhone(enr);
                        const cTitle = getEnrollmentCourseTitle(enr);
                        const total = enr.tuitionTotal || 9000000;
                        const paid = enr.amountPaid || 0;
                        const due = Math.max(0, total - paid);
                        const isSelected = selectedEnrollment?.id === enr.id;

                        return (
                          <div
                            key={enr.id}
                            onClick={() => {
                              setSelectedEnrollment(enr);
                              setTuitionPaymentAmount(due > 0 ? due : total);
                              setIsTuitionStudentDropdownOpen(false);
                              setTuitionSearchTerm('');
                            }}
                            className={`p-3 hover:bg-[#FAF6F0] cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                              isSelected ? 'bg-[#FAF0E4]' : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#2C241E]">{sName}</span>
                                {enr.orderCode && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                    {enr.orderCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#73675F] truncate">{cTitle}</div>
                              <div className="text-[10px] text-[#8C7A6B]">SĐT: {sPhone}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-[#8A4F23]">
                                {total.toLocaleString('vi-VN')}đ
                              </div>
                              <div className="text-[10px]">
                                {due === 0 ? (
                                  <span className="text-emerald-700 font-bold">Đã đóng đủ</span>
                                ) : (
                                  <span className="text-amber-700 font-bold">
                                    Còn nợ: {due.toLocaleString('vi-VN')}đ
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Enrollment Profile Card or Empty State */}
              {!selectedEnrollment ? (
                <div className="py-8 text-center space-y-2.5 bg-[#FCFAF7] rounded-xl border border-dashed border-[#E8DFD8]">
                  <GraduationCap className="w-9 h-9 text-[#8A4F23] mx-auto opacity-60" />
                  <div className="text-xs font-bold text-[#2C241E]">Chưa chọn học viên nào</div>
                  <p className="text-[11px] text-[#73675F] max-w-sm mx-auto px-4">
                    Vui lòng tìm kiếm học viên hoặc bấm chọn nhanh một trong các học viên bên dưới:
                  </p>

                  {allEnrollments.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 justify-center px-4">
                      {allEnrollments.map((enr) => {
                        const sName = getEnrollmentStudentName(enr);
                        const sPhone = getEnrollmentStudentPhone(enr);
                        return (
                          <button
                            key={enr.id}
                            type="button"
                            onClick={() => {
                              setSelectedEnrollment(enr);
                              const total = enr.tuitionTotal || 9000000;
                              const paid = enr.amountPaid || 0;
                              setTuitionPaymentAmount(Math.max(0, total - paid) || total);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <span>🎓 {sName}</span>
                            {sPhone !== '--' && <span className="text-[10px] text-[#A69788]">({sPhone})</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8DFD8]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center font-bold text-xs">
                        🎓
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#2C241E]">
                          {getEnrollmentStudentName(selectedEnrollment)}
                        </div>
                        <div className="text-[11px] text-[#73675F]">
                          {getEnrollmentStudentPhone(selectedEnrollment)}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-50 text-[#8A4F23] font-bold border border-amber-200">
                      {selectedEnrollment.orderCode || selectedEnrollment.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[#73675F]">Khóa học đào tạo:</span>{' '}
                      <strong className="text-[#2C241E]">{getEnrollmentCourseTitle(selectedEnrollment)}</strong>
                    </div>
                    {selectedEnrollment.selectedBranch && (
                      <div>
                        <span className="text-[#73675F]">Cơ sở đào tạo:</span>{' '}
                        <strong className="text-[#2C241E]">{selectedEnrollment.selectedBranch}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E8DFD8] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#73675F]">Học phí toàn khóa:</span>
                      <strong className="text-sm text-[#2C241E]">
                        {(selectedEnrollment.tuitionTotal || 9000000).toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#73675F]">Đã thanh toán trước:</span>
                      <strong className="text-emerald-700">
                        {(selectedEnrollment.amountPaid || 0).toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-dashed border-[#E8DFD8] font-bold text-sm text-[#985018]">
                      <span>Còn lại cần thu:</span>
                      <span>
                        {Math.max(
                          0,
                          (selectedEnrollment.tuitionTotal || 9000000) - (selectedEnrollment.amountPaid || 0)
                        ).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Quyết toán nộp học phí */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#2C241E] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#8A4F23]" />
                <span>Quyết toán học phí học viên</span>
              </h2>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Hình thức nộp phí:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('onsite')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedMethod === 'onsite'
                        ? 'bg-[#985018] text-white border-[#985018]'
                        : 'bg-white text-[#73675F] border-[#E8DFD8]'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Tiền mặt tại cơ sở</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('transfer')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedMethod === 'transfer'
                        ? 'bg-[#985018] text-white border-[#985018]'
                        : 'bg-white text-[#73675F] border-[#E8DFD8]'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Chuyển khoản VietQR</span>
                  </button>
                </div>
              </div>

              {/* Tuition Amount to Pay */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#2C241E]">
                    Số tiền thu đợt này (VNĐ):
                  </label>
                  {selectedEnrollment && (
                    <button
                      type="button"
                      onClick={() => {
                        const total = selectedEnrollment.tuitionTotal || 9000000;
                        const paid = selectedEnrollment.amountPaid || 0;
                        const due = Math.max(0, total - paid);
                        setTuitionPaymentAmount(due > 0 ? due : total);
                      }}
                      className="text-[11px] font-bold text-[#8A4F23] hover:underline cursor-pointer"
                    >
                      Điền đủ số còn nợ
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="100000"
                  value={tuitionPaymentAmount || ''}
                  onChange={(e) => setTuitionPaymentAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Nhập số tiền học phí..."
                  className="w-full px-3 py-2.5 border border-[#E8DFD8] rounded-xl text-base font-bold text-[#985018] focus:outline-none focus:border-[#985018] shadow-2xs"
                />

                {/* Quick Amount Suggestion Chips */}
                {selectedEnrollment && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {(() => {
                      const total = selectedEnrollment.tuitionTotal || 9000000;
                      const paid = selectedEnrollment.amountPaid || 0;
                      const due = Math.max(0, total - paid);
                      const presets = [due, 5000000, 10000000, 20000000].filter(
                        (v, i, a) => v > 0 && a.indexOf(v) === i
                      );
                      return presets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTuitionPaymentAmount(val)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                            tuitionPaymentAmount === val
                              ? 'bg-[#985018] text-white border-[#985018]'
                              : 'bg-white text-[#73675F] border-[#E8DFD8] hover:bg-[#FAF6F0]'
                          }`}
                        >
                          {val === due ? `Còn nợ: ${val.toLocaleString('vi-VN')}đ` : `${(val / 1000000).toFixed(0)} triệu`}
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isProcessing || !selectedEnrollment || tuitionPaymentAmount <= 0}
                onClick={handleProcessTuitionPayment}
                className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  isProcessing || !selectedEnrollment || tuitionPaymentAmount <= 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#985018] hover:bg-[#854412] text-white'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang ghi nhận phiếu thu học phí...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận thu học phí ({tuitionPaymentAmount.toLocaleString('vi-VN')}đ)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PHẦN 2: DANH SÁCH PHIẾU THU HỌC PHÍ & SỔ QUỸ ĐÀO TẠO */}
          <div className="space-y-4 pt-3 border-t border-[#EFE4D9]">
            {/* Section Header with Navigation Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EFE4D9] shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E] flex items-center gap-2">
                    <span>Danh sách phiếu thu học phí Học viện</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#8A4F23]">
                      {tuitionReceiptsList.length} phiếu thu
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#73675F]">
                    Theo dõi lịch sử thu học phí, biên nhận điện tử và công nợ đào tạo MLD Academy
                  </p>
                </div>
              </div>

              {/* Sub-Tab Navigation Toggle */}
              <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#EFE4D9]">
                <button
                  type="button"
                  onClick={() => setTuitionSubTab('receipts')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tuitionSubTab === 'receipts'
                      ? 'bg-white text-[#8A4F23] shadow-xs'
                      : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Phiếu thu đã lập ({tuitionReceiptsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTuitionSubTab('enrollments')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    tuitionSubTab === 'enrollments'
                      ? 'bg-white text-[#8A4F23] shadow-xs'
                      : 'text-[#73675F] hover:text-[#2C241E]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Hồ sơ tuyển sinh & Công nợ ({allEnrollments.length})</span>
                </button>
              </div>
            </div>

            {/* Tuition KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#73675F]">Tổng học phí đã thu</span>
                  <div className="w-8 h-8 rounded-xl bg-[#E8F6ED] text-[#0D6832] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#0D6832] tracking-tight">
                  {tuitionKpiTotal.toLocaleString('vi-VN')}đ
                </div>
                <div className="text-[11px] text-[#73675F]">
                  {tuitionReceiptsList.length} phiếu thu đã quyết toán
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#73675F]">Số phiếu thu học phí</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#2C241E] tracking-tight">
                  {tuitionReceiptsList.length} biên nhận
                </div>
                <div className="text-[11px] text-[#73675F]">Dữ liệu đồng bộ với Supabase Cloud</div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#73675F]">Chuyển khoản VietQR</span>
                  <div className="w-8 h-8 rounded-xl bg-[#EAF2FA] text-[#1E5D9B] flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#1E5D9B] tracking-tight">
                  {tuitionKpiTransferTotal.toLocaleString('vi-VN')}đ
                </div>
                <div className="text-[11px] text-[#73675F]">
                  {tuitionKpiTransfer.length} giao dịch qua ngân hàng
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#73675F]">Tiền mặt tại cơ sở</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FFF4EB] text-[#C25E00] flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#C25E00] tracking-tight">
                  {tuitionKpiCashTotal.toLocaleString('vi-VN')}đ
                </div>
                <div className="text-[11px] text-[#73675F]">
                  {tuitionKpiCash.length} giao dịch trực tiếp
                </div>
              </div>
            </div>

            {/* Filter Toolbar for Tuition Receipts */}
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tuitionReceiptSearchTerm}
                  onChange={(e) => setTuitionReceiptSearchTerm(e.target.value)}
                  placeholder="Tìm mã phiếu (HD-HP-...), tên học viên, SĐT, khóa học..."
                  className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
                {tuitionReceiptSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setTuitionReceiptSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Branch Filter */}
              <select
                value={tuitionReceiptBranchFilter}
                onChange={(e) => setTuitionReceiptBranchFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
              >
                <option value="ALL">Tất cả chi nhánh ({tuitionReceiptsList.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({tuitionReceiptsList.filter((r) => r.branchId === b.id).length})
                  </option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={tuitionReceiptMethodFilter}
                onChange={(e) => setTuitionReceiptMethodFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
              >
                <option value="ALL">Tất cả phương thức</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản VietQR</option>
                <option value={PaymentMethod.CASH_AT_SPA}>Tiền mặt tại cơ sở</option>
              </select>
            </div>

            {/* SUB-TAB 1: BẢNG DANH SÁCH PHIẾU THU ĐÃ LẬP */}
            {tuitionSubTab === 'receipts' && (
              <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#EFE4D9] text-[#73675F] font-bold">
                        <th className="py-3 px-4">Mã phiếu thu</th>
                        <th className="py-3 px-4">Học viên</th>
                        <th className="py-3 px-4">Khóa đào tạo</th>
                        <th className="py-3 px-4">Thời gian thu</th>
                        <th className="py-3 px-4">Hình thức</th>
                        <th className="py-3 px-4 text-right">Số tiền thu</th>
                        <th className="py-3 px-4 text-center">Tiến độ học phí</th>
                        <th className="py-3 px-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE6]">
                      {filteredTuitionReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-[#73675F]">
                            <GraduationCap className="w-8 h-8 text-[#8A4F23] mx-auto opacity-40 mb-2" />
                            <div className="font-bold text-xs text-[#2C241E]">
                              Không tìm thấy phiếu thu học phí nào
                            </div>
                            <p className="text-[11px] mt-1">
                              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredTuitionReceipts.map((r) => (
                          <tr key={r.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#8A4F23] whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{r.id}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyReceiptId(r.id)}
                                  className="text-[#A69788] hover:text-[#2C241E] p-0.5"
                                  title="Sao chép mã phiếu thu"
                                >
                                  {copiedReceiptId === r.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#2C241E]">{r.studentName}</div>
                              <div className="text-[11px] text-[#73675F]">{r.studentPhone}</div>
                              {r.enrollmentOrderCode && (
                                <span className="text-[10px] text-amber-800 font-mono">
                                  Hồ sơ: {r.enrollmentOrderCode}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#2C241E] max-w-[260px] truncate" title={r.courseTitle}>
                                {r.courseTitle}
                              </div>
                              <span className="text-[10px] text-[#8C7A6B]">{r.branchName}</span>
                            </td>
                            <td className="py-3 px-4 text-[#73675F] whitespace-nowrap">{r.date}</td>
                            <td className="py-3 px-4 text-[#73675F] whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                {r.methodCode === PaymentMethod.BANK_TRANSFER ? (
                                  <QrCode className="w-3.5 h-3.5 text-sky-600" />
                                ) : (
                                  <Banknote className="w-3.5 h-3.5 text-amber-600" />
                                )}
                                <span>{r.method}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black text-[#0D6832] whitespace-nowrap text-sm">
                              {r.amount}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.isFullyPaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F6ED] text-[#0D6832]">
                                  Đã tất toán 100%
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  Còn nợ: {r.remaining.toLocaleString('vi-VN')}đ
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedReceiptData({
                                      id: r.id,
                                      customerName: r.studentName,
                                      customerPhone: r.studentPhone,
                                      customerTier: r.customerTier,
                                      branchName: r.branchName,
                                      serviceName: r.courseTitle,
                                      category: r.category,
                                      method: r.method,
                                      amount: r.amount,
                                      subtotal: `${r.subtotal.toLocaleString('vi-VN')}đ`,
                                      discount: `${r.discountAmount.toLocaleString('vi-VN')}đ`,
                                      date: r.date,
                                      status: r.status,
                                    });
                                    setShowReceiptModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Biên lai</span>
                                </button>

                                {!r.isFullyPaid && r.enrollment && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEnrollment(r.enrollment);
                                      setTuitionPaymentAmount(r.remaining);
                                      window.scrollTo({ top: 120, behavior: 'smooth' });
                                      toast.info(
                                        'Thu học phí đợt tiếp',
                                        `Đã chọn học viên ${r.studentName} (còn nợ ${r.remaining.toLocaleString('vi-VN')}đ)`
                                      );
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#985018] font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Thu thêm</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: BẢNG HỒ SƠ TUYỂN SINH & CÔNG NỢ */}
            {tuitionSubTab === 'enrollments' && (
              <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#EFE4D9] text-[#73675F] font-bold">
                        <th className="py-3 px-4">Mã hồ sơ</th>
                        <th className="py-3 px-4">Học viên</th>
                        <th className="py-3 px-4">Khóa học đăng ký</th>
                        <th className="py-3 px-4 text-right">Học phí toàn khóa</th>
                        <th className="py-3 px-4 text-right">Đã thanh toán</th>
                        <th className="py-3 px-4 text-right">Còn lại cần thu</th>
                        <th className="py-3 px-4 text-center">Trạng thái</th>
                        <th className="py-3 px-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2ECE6]">
                      {allEnrollments
                        .filter((enr) => {
                          if (!tuitionReceiptSearchTerm.trim()) return true;
                          return matchSearch(
                            [
                              getEnrollmentStudentName(enr),
                              getEnrollmentStudentPhone(enr),
                              enr.orderCode,
                              getEnrollmentCourseTitle(enr),
                            ],
                            tuitionReceiptSearchTerm
                          );
                        })
                        .map((enr) => {
                          const sName = getEnrollmentStudentName(enr);
                          const sPhone = getEnrollmentStudentPhone(enr);
                          const cTitle = getEnrollmentCourseTitle(enr);
                          const total = enr.tuitionTotal || 9000000;
                          const paid = enr.amountPaid || 0;
                          const due = Math.max(0, total - paid);

                          return (
                            <tr key={enr.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-[#8A4F23] whitespace-nowrap">
                                {enr.orderCode || enr.id.slice(0, 8)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#2C241E]">{sName}</div>
                                <div className="text-[11px] text-[#73675F]">{sPhone}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-[#2C241E] max-w-[260px] truncate" title={cTitle}>
                                  {cTitle}
                                </div>
                                <span className="text-[10px] text-[#8C7A6B]">
                                  {enr.selectedBranch || 'Cơ sở đào tạo MLD'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-[#2C241E] whitespace-nowrap">
                                {total.toLocaleString('vi-VN')}đ
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                                {paid.toLocaleString('vi-VN')}đ
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-[#985018] whitespace-nowrap">
                                {due.toLocaleString('vi-VN')}đ
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                {due === 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F6ED] text-[#0D6832]">
                                    Đã tất toán
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Còn nợ học phí
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEnrollment(enr);
                                    setTuitionPaymentAmount(due > 0 ? due : total);
                                    window.scrollTo({ top: 120, behavior: 'smooth' });
                                    toast.info(
                                      'Đã chọn hồ sơ học viên',
                                      `${sName} · Số cần thu: ${(due > 0 ? due : total).toLocaleString('vi-VN')}đ`
                                    );
                                  }}
                                  className="px-3 py-1 rounded-lg bg-[#985018] hover:bg-[#854412] text-white font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>{due > 0 ? 'Thu nốt học phí' : 'Thu học phí'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SỔ HÓA ĐƠN & BIÊN LAI (INVOICES LEDGER & AUDIT)                     */}
      {/* ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
              <div className="text-[11px] text-[#73675F]">{kpiPaid.length} hóa đơn đã quyết toán 100%</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#73675F]">Hóa đơn hoàn tất</span>
                <div className="w-8 h-8 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[#2C241E] tracking-tight">{kpiPaid.length} biên nhận</div>
              <div className="text-[11px] text-[#73675F]">Dữ liệu đồng bộ với Supabase Cloud</div>
            </div>

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
              <div className="text-[11px] text-[#73675F]">{kpiTransfer.length} giao dịch qua ngân hàng</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#73675F]">Tiền mặt tại cơ sở</span>
                <div className="w-8 h-8 rounded-xl bg-[#FFF4EB] text-[#C25E00] flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-[#C25E00] tracking-tight">
                {kpiCashAmount.toLocaleString('vi-VN')}đ
              </div>
              <div className="text-[11px] text-[#73675F]">{kpiCash.length} giao dịch trực tiếp</div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={invoiceSearchTerm}
                onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                placeholder="Tìm mã HĐ (HD-...), tên khách, SĐT, dịch vụ..."
                className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018]"
              />
              {invoiceSearchTerm && (
                <button
                  type="button"
                  onClick={() => setInvoiceSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
            >
              <option value="ALL">Tất cả chi nhánh ({pastReceipts.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({pastReceipts.filter((r) => r.branchId === b.id).length})
                </option>
              ))}
            </select>

            {/* Payment Method Filter */}
            <select
              value={invoiceMethodFilter}
              onChange={(e) => setInvoiceMethodFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value={PaymentMethod.BANK_TRANSFER}>Chuyển khoản VietQR</option>
              <option value={PaymentMethod.CASH_AT_SPA}>Tiền mặt tại cơ sở</option>
              <option value={PaymentMethod.MOMO}>Ví điện tử MoMo</option>
            </select>

            {/* Status Filter */}
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value={PaymentStatus.PAID}>Đã thanh toán</option>
              <option value="PARTIAL_REFUND">Hoàn tiền một phần</option>
              <option value={PaymentStatus.REFUNDED}>Đã hoàn tiền</option>
              <option value={PaymentStatus.UNPAID}>Chờ thanh toán</option>
            </select>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EFE4D9] text-[#73675F] font-bold">
                    <th className="py-3 px-4">Mã hóa đơn</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Dịch vụ / Hàng hóa</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Phương thức</th>
                    <th className="py-3 px-4 text-right">Tổng tiền</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE6]">
                  {filteredPastReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#8A4F23]">
                        {r.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2C241E]">{r.customerName}</div>
                        <div className="text-[11px] text-[#73675F]">{r.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#2C241E] max-w-[240px] truncate" title={r.content}>
                          {r.content}
                        </div>
                        <span className="text-[10px] text-[#8C7A6B]">{r.branchName}</span>
                      </td>
                      <td className="py-3 px-4 text-[#73675F] whitespace-nowrap">{r.date}</td>
                      <td className="py-3 px-4 text-[#73675F] whitespace-nowrap">{r.method}</td>
                      <td className="py-3 px-4 text-right font-black text-[#2C241E] whitespace-nowrap">
                        {r.amount}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.statusCode === PaymentStatus.REFUNDED ? 'bg-[#FEF3F2] text-[#B42318]' : r.statusCode === 'PARTIAL_REFUND' ? 'bg-[#FFF4E5] text-[#B54708]' : r.statusCode === PaymentStatus.PAID ? 'bg-[#E8F6ED] text-[#0D6832]' : 'bg-[#EFF6FF] text-[#1D4ED8]'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceiptData({
                              id: r.id,
                              customerName: r.customerName,
                              customerPhone: r.customerPhone,
                              customerTier: r.customerTier,
                              branchName: r.branchName,
                              serviceName: r.content,
                              category: r.category,
                              method: r.method,
                              amount: `${r.netAmount.toLocaleString('vi-VN')}đ`,
                              subtotal: `${r.subtotal.toLocaleString('vi-VN')}đ`,
                              discount: `${r.discountAmount.toLocaleString('vi-VN')}đ`,
                              date: r.date,
                              status: r.status,
                            });
                            setShowReceiptModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Biên lai</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openReceiptEditor(r)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Sửa tên hiển thị, nội dung hoặc ghi chú"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT MODAL DIALOG (A5 PRINT & PDF EXPORT)                               */}
      {/* ========================================================================= */}
      {showReceiptModal && selectedReceiptData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-6 bg-[#FAF8F5] border-b border-[#EFE4D9] relative text-center">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-extrabold text-[#2C241E]">
                {selectedReceiptData.userPackageId ? 'Liệu trình đã được kích hoạt!' : 'Thanh toán thành công!'}
              </h3>
              <p className="text-[11px] text-[#73675F] mt-0.5">
                {selectedReceiptData.userPackageId ? 'Hóa đơn và hồ sơ liệu trình đã liên kết thành công' : 'Biên lai điện tử MLD Healthcare & Spa'}
              </p>
            </div>

            {/* Receipt Content Body */}
            <div id="pos-receipt-card" className="p-6 space-y-3.5 bg-white">
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EFE4D9] space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E8DFD8]">
                  <span className="text-[#73675F]">Mã hóa đơn:</span>
                  <span className="font-mono font-bold text-[#8A4F23]">{selectedReceiptData.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">{selectedReceiptData.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Số điện thoại:</span>
                  <span className="font-medium text-[#2C241E]">{selectedReceiptData.customerPhone || '--'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Dịch vụ / Hàng hóa:</span>
                  <span className="font-bold text-[#2C241E] text-right max-w-[220px] truncate" title={selectedReceiptData.serviceName}>
                    {selectedReceiptData.serviceName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Hình thức:</span>
                  <span className="font-semibold text-[#8A4F23]">{selectedReceiptData.method}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Thời gian:</span>
                  <span className="text-[#2C241E]">{selectedReceiptData.date}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#E8DFD8] text-sm font-bold text-[#2C241E]">
                  <span>Tổng thanh toán:</span>
                  <span className="text-base font-black text-[#0D6832]">{selectedReceiptData.amount}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F6ED] text-[#0D6832] text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Trạng thái: {selectedReceiptData.status || 'Đã thanh toán'}{selectedReceiptData.status?.includes('hoàn tiền') ? ` · Giá trị thực thu: ${selectedReceiptData.amount}` : ' · Dữ liệu đã đồng bộ kế toán'}</span>
              </div>
              {selectedReceiptData.userPackageId && (
                <div className="rounded-xl border border-[#D7BBA6] bg-[#FAF8F5] p-3">
                  <p className="text-xs font-bold text-[#2C241E]">Bước tiếp theo: đặt buổi chăm sóc đầu tiên</p>
                  <p className="text-[11px] text-[#73675F] mt-1 leading-relaxed">Mở hồ sơ vừa kích hoạt để chọn cơ sở, ngày giờ và kỹ thuật viên. Khách có thể đặt sau nếu chưa chốt lịch.</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#FAF8F5] border-t border-[#EFE4D9] space-y-2">
              {selectedReceiptData.userPackageId && (
                <button
                  type="button"
                  onClick={() => {
                    const query = new URLSearchParams({
                      action: 'book-first-session',
                      userPackageId: selectedReceiptData.userPackageId || '',
                    });
                    if (selectedReceiptData.packageDefinitionId) query.set('packageId', selectedReceiptData.packageDefinitionId);
                    window.location.href = `/medical-records?${query.toString()}`;
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#985018] hover:bg-[#854412] font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt buổi đầu tiên</span>
                </button>
              )}
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.info('In biên lai', 'Đang kết nối lệnh in nhiệt POS...');
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl border border-[#E8DFD8] bg-white hover:bg-slate-50 font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In biên lai</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadReceiptPdf}
                disabled={isExportingPdf}
                className="flex-1 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 font-bold text-sky-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? 'Đang tạo...' : 'Tải PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className={`flex-1 py-2 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${selectedReceiptData.userPackageId ? 'border border-[#D7BBA6] bg-white text-[#8A4F23] hover:bg-[#FAF0E4]' : 'bg-[#985018] hover:bg-[#854412] text-white'}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{selectedReceiptData.userPackageId ? 'Để sau' : 'Hoàn tất'}</span>
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingReceipt && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={saveReceiptEdit} className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-[#EFE4D9] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#2C241E]">Sửa thông tin biên lai</h3>
                <p className="text-xs text-[#73675F] mt-1">{editingReceipt.invoiceCode} · Chỉ sửa tên dòng hàng; giá, số lượng và thanh toán được giữ nguyên</p>
              </div>
              <button type="button" onClick={() => setEditingReceipt(null)} className="p-2 hover:bg-slate-100 rounded" aria-label="Đóng"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              {receiptEditHistory.length > 0 && (
                <section className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
                  <h4 className="font-semibold text-sky-950">Lịch sử chỉnh sửa gần đây</h4>
                  {receiptEditHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="text-xs bg-white rounded-lg p-2">
                      <div className="font-semibold">{entry.actor?.full_name || 'Nhân viên'} · {new Date(entry.created_at).toLocaleString('vi-VN')}</div>
                      <div className="text-[#73675F]">Lý do: {entry.reason}</div>
                      {['receipt_customer_name', 'receipt_description', 'receipt_notes'].map((field) => {
                        const before = entry.before_data?.[field] || '(trống)';
                        const after = entry.after_data?.[field] || '(trống)';
                        return before === after ? null : <div key={field} className="mt-1"><span className="font-medium">{field === 'receipt_customer_name' ? 'Tên khách' : field === 'receipt_description' ? 'Diễn giải' : 'Ghi chú'}:</span> <span className="text-red-700">{before}</span> <span aria-hidden="true">→</span> <span className="text-green-800">{after}</span></div>;
                      })}
                    </div>
                  ))}
                </section>
              )}
              <label className="block space-y-1">
                <span className="font-semibold text-[#4A3E31]">Tên khách trên biên lai</span>
                <input value={receiptCustomerName} onChange={(e) => setReceiptCustomerName(e.target.value)} maxLength={150} required className="w-full border border-[#D8D0C7] rounded-md px-3 py-2" />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-[#4A3E31]">Nội dung dịch vụ / hàng hóa</span>
                <textarea value={receiptDescription} onChange={(e) => setReceiptDescription(e.target.value)} maxLength={2000} rows={2} required className="w-full border border-[#D8D0C7] rounded-md px-3 py-2 resize-y" />
              </label>
              {receiptItems.length > 0 && <fieldset className="space-y-2"><legend className="font-semibold text-[#4A3E31]">Tên dịch vụ / hàng hóa trên hóa đơn</legend>{receiptItems.map((item,index)=><label key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3"><input aria-label={`Tên dòng hàng ${index+1}`} value={item.itemName} maxLength={250} required onChange={(event)=>setReceiptItems(current=>current.map(row=>row.id===item.id?{...row,itemName:event.target.value}:row))} className="w-full border border-[#D8D0C7] rounded-md px-3 py-2"/><span className="whitespace-nowrap text-xs text-[#73675F]">{item.quantity} × {Number(item.unitPrice).toLocaleString('vi-VN')} đ</span></label>)}</fieldset>}
              <label className="block space-y-1">
                <span className="font-semibold text-[#4A3E31]">Ghi chú</span>
                <textarea value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} maxLength={2000} rows={2} className="w-full border border-[#D8D0C7] rounded-md px-3 py-2 resize-y" />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-[#4A3E31]">Lý do sửa <span className="text-red-600">*</span></span>
                <input value={receiptEditReason} onChange={(e) => setReceiptEditReason(e.target.value)} minLength={3} maxLength={500} required className="w-full border border-[#D8D0C7] rounded-md px-3 py-2" placeholder="Ví dụ: Sửa tên khách theo yêu cầu" />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-[#EFE4D9] flex justify-end gap-2">
              <button type="button" onClick={() => setEditingReceipt(null)} className="px-4 py-2 border rounded-md">Hủy</button>
              <button type="submit" disabled={isSavingReceipt || receiptEditReason.trim().length < 3} className="px-4 py-2 rounded-md bg-[#985018] text-white font-semibold disabled:opacity-50">{isSavingReceipt ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASHIER SHIFT MODALS (OPEN & CLOSE)                                       */}
      {/* ========================================================================= */}
      {showOpenShiftModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#2C241E]">Mở ca thu ngân mới</h3>
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Cơ sở ca làm việc:</label>
                <select
                  value={selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E8DFD8] rounded-xl text-xs font-medium"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tiền mặt đầu ca (VNĐ):</label>
                <input
                  type="number"
                  step="50000"
                  value={shiftOpeningCash}
                  onChange={(e) => setShiftOpeningCash(Number(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-[#E8DFD8] rounded-xl text-xs font-bold text-[#985018]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Ghi chú ca:</label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú phân công ca sáng / chiều..."
                  className="w-full p-2 border border-[#E8DFD8] rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="p-4 bg-[#FAF8F5] border-t border-[#EFE4D9] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(false)}
                className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const bId = selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id;
                  if (!bId) {
                    toast.error('Lỗi', 'Chưa chọn chi nhánh.');
                    return;
                  }
                  try {
                    const res = await posService.openShift({
                      branchId: bId,
                      openingCash: shiftOpeningCash,
                      notes: shiftNotes,
                    });
                    if (res.success && res.data) {
                      setCurrentShift(res.data);
                      setShowOpenShiftModal(false);
                      toast.success('Đã mở ca', `Mã ca: ${res.data.shiftCode}`);
                    } else {
                      // Fallback tạo shift qua Supabase trực tiếp
                      const shiftCode = `CA-${new Date().getHours() < 13 ? 'SANG' : 'CHIEU'}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
                      const { data: createdShift, error: shiftErr } = await supabase
                        .from('cashier_shifts')
                        .insert({
                          branch_id: bId,
                          cashier_id: adminUser?.id || 'f0dc713a-56fc-4347-9fb3-240528726ba3',
                          shift_code: shiftCode,
                          opening_cash: shiftOpeningCash,
                          system_cash: shiftOpeningCash,
                          notes: shiftNotes || null,
                          status: 'OPEN',
                        })
                        .select()
                        .maybeSingle();

                      if (createdShift && !shiftErr) {
                        setCurrentShift({
                          id: createdShift.id,
                          shiftCode: createdShift.shift_code,
                          branchId: createdShift.branch_id,
                          cashierId: createdShift.cashier_id,
                          openedAt: createdShift.opened_at,
                          openingCash: Number(createdShift.opening_cash),
                          status: createdShift.status,
                          totalSales: 0,
                          systemCash: Number(createdShift.system_cash),
                          transferSales: 0,
                          cardSales: 0,
                        });
                        setShowOpenShiftModal(false);
                        toast.success('Đã mở ca thu ngân', `Mã ca: ${createdShift.shift_code}`);
                      } else {
                        throw new Error(shiftErr?.message || res.message || 'Không thể tạo ca thu ngân.');
                      }
                    }
                  } catch (e: any) {
                    toast.error('Lỗi mở ca', e?.message || 'Không thể mở ca thu ngân.');
                  }
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs"
              >
                Xác nhận mở ca
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseShiftModal && currentShift && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#2C241E]">Kết ca & Đối soát doanh thu</h3>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {(() => {
                const expectedCash = currentShift.systemCash ?? currentShift.openingCash;
                const cashDifference = shiftClosingCash - expectedCash;
                return (
                  <>
              <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EFE4D9] space-y-1.5">
                <div className="flex justify-between">
                  <span>Mã ca:</span> <strong>{currentShift.shiftCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tiền mặt đầu ca:</span> <strong>{currentShift.openingCash.toLocaleString('vi-VN')}đ</strong>
                </div>
                <div className="flex justify-between">
                  <span>Doanh thu ca:</span> <strong className="text-emerald-700">{(currentShift.totalSales || 0).toLocaleString('vi-VN')}đ</strong>
                </div>
                <div className="flex justify-between">
                  <span>Doanh thu VietQR:</span> <strong className="text-sky-700">{(currentShift.transferSales || 0).toLocaleString('vi-VN')}đ</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tiền mặt hệ thống tính:</span> <strong className="text-slate-800">{expectedCash.toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tiền mặt thực tế kiểm đếm (VNĐ):</label>
                <input
                  type="number"
                  value={shiftClosingCash}
                  onChange={(e) => setShiftClosingCash(Number(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-[#E8DFD8] rounded-xl text-xs font-bold text-[#985018]"
                />
              </div>
              <div className="flex justify-between rounded-xl border border-slate-200 px-3 py-2 font-semibold">
                <span>Chênh lệch tiền mặt:</span>
                <strong className={cashDifference === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {cashDifference > 0 ? '+' : ''}{cashDifference.toLocaleString('vi-VN')}đ
                </strong>
              </div>
              {cashDifference !== 0 && (
                <label className="block space-y-1 text-amber-900">
                  <span className="font-bold">Lý do chênh lệch <span className="text-rose-600">*</span></span>
                  <textarea value={shiftVarianceReason} onChange={(event) => setShiftVarianceReason(event.target.value)} minLength={5} maxLength={500} rows={2} required className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-800" placeholder="Nhập nguyên nhân chênh lệch để lưu vào ghi chú ca" />
                </label>
              )}
                  </>
                );
              })()}
            </div>
            <div className="p-4 bg-[#FAF8F5] border-t border-[#EFE4D9] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="px-4 py-2 border border-[#E8DFD8] bg-white rounded-xl font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const expectedCash = currentShift.systemCash ?? currentShift.openingCash;
                  if (shiftClosingCash !== expectedCash && shiftVarianceReason.trim().length < 5) {
                    toast.error('Thiếu lý do chênh lệch', 'Vui lòng nhập lý do ít nhất 5 ký tự.');
                    return;
                  }
                  try {
                    const result = await posService.closeShift(currentShift.id, {
                      closingCash: shiftClosingCash,
                      notes: [shiftNotes.trim(), shiftVarianceReason.trim() ? `Chênh lệch tiền mặt: ${shiftVarianceReason.trim()}` : ''].filter(Boolean).join('\n'),
                      systemCash: currentShift.systemCash,
                      totalSales: currentShift.totalSales,
                      transferSales: currentShift.transferSales,
                      cardSales: currentShift.cardSales,
                    });
                    if (!result.success) {
                      toast.error('Không thể kết ca', result.message || 'Máy chủ chưa ghi nhận kết ca.');
                      return;
                    }
                    setCurrentShift(null);
                    setShowCloseShiftModal(false);
                    toast.success('Đã đóng ca', 'Đã kết ca và hoàn tất đối soát doanh thu.');
                  } catch (e: any) {
                    toast.error('Không thể kết ca', e?.message || 'Đã xảy ra lỗi khi lưu kết ca.');
                  }
                }}
                disabled={shiftClosingCash !== (currentShift.systemCash ?? currentShift.openingCash) && shiftVarianceReason.trim().length < 5}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận kết ca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WALK-IN QUICK BOOKING MODAL (DRC 6-BED × 6-TECH CA 1 TIẾNG)               */}
      {/* ========================================================================= */}
      {showWalkInModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Đặt lịch tại quầy (Walk-in)</h3>
                  <p className="text-[11px] text-emerald-200">
                    Cơ chế DRC: 6 Giường × 6 KTV · Tự động điều phối và khóa ca
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Chọn khách hàng
                  </label>
                  <select
                    value={walkInCustomerId}
                    onChange={(e) => {
                      setWalkInCustomerId(e.target.value);
                      const selected = allCustomers.find((c) => c.id === e.target.value);
                      setWalkInCustomerName(selected?.fullName || '');
                      setWalkInCustomerPhone(selected?.phone || '');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="">-- Chọn khách hàng có sẵn --</option>
                    {allCustomers
                      .filter((c) => isUuid(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} · {c.phone || 'Chưa có SĐT'}
                        </option>
                      ))}
                  </select>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cơ sở thực hiện
                  </label>
                  <select
                    value={selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id || ''}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    {allServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes || 60}p - {Number(s.price || 0).toLocaleString('vi-VN')}đ)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ngày thực hiện
                  </label>
                  <input
                    type="date"
                    value={walkInDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kỹ thuật viên (DRC Dispatch)
                  </label>
                  <select
                    value={walkInTechId}
                    onChange={(e) => setWalkInTechId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="">✨ Tự động phân bổ KTV ít ca nhất</option>
                    {allTechnicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        👤 {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 10 Khung giờ ca 1 tiếng */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Chọn ca giờ trị liệu (Trần 6 Giường × 6 KTV):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {POS_TIME_SLOTS.map((slot, idx) => {
                    const isSelected = walkInSlotIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setWalkInSlotIndex(idx)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 bg-white hover:border-emerald-300'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{slot.label}</div>
                        <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">Sẵn sàng</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreateWalkInBooking}
                disabled={isSubmittingWalkIn}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingWalkIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận & Nạp quầy POS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isAddingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#F2ECE6] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FAF0E4] text-[#985018] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#2C241E]">Thêm nhanh khách hàng mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(false)}
                className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2C241E] hover:bg-[#F4ECE3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCustomerForm.fullName.trim()) {
                  toast.error('Thiếu thông tin', 'Vui lòng nhập họ và tên khách hàng.');
                  return;
                }
                if (!newCustomerForm.phone.trim()) {
                  toast.error('Thiếu thông tin', 'Vui lòng nhập số điện thoại.');
                  return;
                }
                setIsSubmittingCustomer(true);
                try {
                  const res = await customerService.createCustomer({
                    fullName: newCustomerForm.fullName.trim(),
                    phone: newCustomerForm.phone.trim(),
                    gender: newCustomerForm.gender,
                    address: newCustomerForm.address.trim() || undefined,
                  });
                  if (res.success && res.data) {
                    setAllCustomers((prev) => [res.data, ...prev]);
                    setSelectedCustomer(res.data);
                    setIsAddingCustomer(false);
                    setNewCustomerForm({ fullName: '', phone: '', gender: 'FEMALE', address: '' });
                    toast.success('Thành công', `Đã tạo khách hàng "${res.data.fullName}" và áp dụng vào đơn.`);
                  } else {
                    toast.error('Lỗi', res.message || 'Không thể tạo khách hàng.');
                  }
                } catch (err: any) {
                  toast.error('Lỗi', err.message || 'Không thể kết nối máy chủ.');
                } finally {
                  setIsSubmittingCustomer(false);
                }
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-[#2C241E] block mb-1">
                  Họ và tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.fullName}
                  onChange={(e) => setNewCustomerForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#2C241E] block mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Ví dụ: 0912345678"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2C241E] block mb-1">Giới tính</label>
                  <select
                    value={newCustomerForm.gender}
                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, gender: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018] cursor-pointer"
                  >
                    <option value="FEMALE">Nữ</option>
                    <option value="MALE">Nam</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#2C241E] block mb-1">Địa chỉ (tùy chọn)</label>
                  <input
                    type="text"
                    value={newCustomerForm.address}
                    onChange={(e) => setNewCustomerForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Quận/Huyện..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F2ECE6]">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E8DFD8] text-[#73675F] font-bold hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="px-4 py-2 rounded-xl bg-[#985018] hover:bg-[#854412] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustomer ? 'Đang lưu...' : 'Lưu & Chọn ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
