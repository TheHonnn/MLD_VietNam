import { tuitionBalance } from "../admin/tuition-balance";
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
import { toast, AdminTabs } from '../components/common';
import { MLDInvoiceDocument, MLDInvoiceLine, MLDInvoicePackageInfo } from '../components/invoices/MLDInvoiceDocument';
import { settingsService, DEFAULT_SETTINGS_STATE, PosSettings, CompanySettings } from '../services/settings.service';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { CashierCustomerBenefits } from '../services/pos.service';
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
import {
  bookingItemsToCart,
  calculatePosTotals,
  cartCompositionError,
  classifyPosSource,
  getBookingEffectiveDiscount,
  isBookingWaitingPayment,
  isCompletedServiceBooking,
  hasCashierShiftSnapshotChanged,
  maxRedeemablePoints,
  SYSTEM_GUEST_CUSTOMER_ID,
  findMatchingCommissionStaffId,
  findTargetBookingForPos,
  findTuitionEnrollment,
} from './cashier-pos.rules';

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

const parseVnd = (value?: string) => Number(String(value || '').replace(/[^0-9-]/g, '')) || 0;

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
  id: SYSTEM_GUEST_CUSTOMER_ID,
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
  const [tuitionLedgerError, setTuitionLedgerError] = useState(false);
  const [tuitionLedgerRevision, setTuitionLedgerRevision] = useState(0);
  useEffect(() => {
    if (activeTab !== 'tuition') return;
    let active = true;
    academyService.getTuitionTransactions().then(result => {
      if (!active) return;
      setTuitionLedgerError(!result.success);
      if (result.success) setTuitionLedger(result.data);
    });
    return () => { active = false; };
  }, [activeTab, tuitionLedgerRevision]);

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
      if (searchParams.get('source') === 'package') setCatalogCategory('PACKAGE');
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

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [selectedUserVoucherId, setSelectedUserVoucherId] = useState<string>('');
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [customerBenefits, setCustomerBenefits] = useState<CashierCustomerBenefits | null>(null);
  const [benefitsLoading, setBenefitsLoading] = useState<boolean>(false);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [vatRate, setVatRate] = useState<number>(8);
  const [selectedMethod, setSelectedMethod] = useState<'onsite' | 'transfer' | 'online'>('onsite');
  const [tuitionMethod, setTuitionMethod] = useState<'onsite' | 'transfer'>(() =>
    searchParams.get('tuitionOrder') ? 'transfer' : 'onsite');
  const [tuitionBankReference, setTuitionBankReference] = useState('');
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const couponInputRef = useRef<HTMLInputElement | null>(null);

  // Tuition State
  const [allEnrollments, setAllEnrollments] = useState<CourseEnrollment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CourseEnrollment | undefined>(undefined);
  const [tuitionPaymentAmount, setTuitionPaymentAmount] = useState<number>(0);
  const tuitionOrder = searchParams.get('tuitionOrder') || '';
  const tuitionEnrollmentId = searchParams.get('tuitionEnrollment') || '';
  const tuitionReference = tuitionEnrollmentId || tuitionOrder;
  const handledTuitionReference = useRef('');
  const handledBookingKey = useRef('');
  const fetchedMissingBookingKey = useRef('');
  const [posBookingsLoaded, setPosBookingsLoaded] = useState(false);
  const [enrollmentLoad, setEnrollmentLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tuitionSearchTerm, setTuitionSearchTerm] = useState(tuitionOrder);

  useEffect(() => {
    if (!tuitionReference) {
      handledTuitionReference.current = '';
      return;
    }
    if (enrollmentLoad !== 'ready' || handledTuitionReference.current === tuitionReference) return;
    handledTuitionReference.current = tuitionReference;
    const enrollment = findTuitionEnrollment(allEnrollments, tuitionReference);
    setSelectedEnrollment(enrollment);
    setTuitionSearchTerm(enrollment ? '' : tuitionOrder || tuitionReference);
    setTuitionMethod('transfer');
    setTuitionPaymentAmount(0);
  }, [allEnrollments, enrollmentLoad, tuitionOrder, tuitionReference]);

  useEffect(() => {
    setTuitionBankReference('');
    setTuitionCommissionStaffId(selectedEnrollment?.assignedStaffId || '');
  }, [selectedEnrollment?.id]);
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
  const [commissionStaff, setCommissionStaff] = useState<Array<StaffWithProfile & { role?: string; technicianId?: string | null }>>([]);
  const [commissionStaffLoading, setCommissionStaffLoading] = useState(false);
  const [commissionStaffLoadError, setCommissionStaffLoadError] = useState(false);
  const commissionStaffManuallySet = useRef(false);
  const [workspaceInvoices, setWorkspaceInvoices] = useState<any[]>([]);
  const [posSettings, setPosSettings] = useState(DEFAULT_SETTINGS_STATE.pos);
  const [generalSettings, setGeneralSettings] = useState(DEFAULT_SETTINGS_STATE.general);
  const [receiptPrintMode, setReceiptPrintMode] = useState<'thermal80' | 'a5'>('thermal80');
  const [tuitionCommissionStaffId, setTuitionCommissionStaffId] = useState('');
  const [isCreatingPendingQr, setIsCreatingPendingQr] = useState(false);
  const [pendingPosQr, setPendingPosQr] = useState<{
    kind: 'BOOKING' | 'PACKAGE' | 'CART' | 'TUITION';
    invoiceId?: string;
    invoiceCode?: string;
    enrollmentId?: string;
    baselinePaid?: number;
    orderCode: number;
    amount: number;
    transferContent: string;
    qrUrl: string;
    bankAccountNo: string;
    bankAccountName: string;
    checkoutUrl?: string;
    isPaid?: boolean;
  } | null>(null);
  const [booking, setBooking] = useState<Booking | undefined>(undefined);

  // Cashier Shift states
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [isOpeningShift, setIsOpeningShift] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
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
  const [walkInModalMode, setWalkInModalMode] = useState<'DIRECT_SALE' | 'SCHEDULE'>('DIRECT_SALE');
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
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState(() => searchParams.get('search') || searchParams.get('invoice') || '');
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');

  useEffect(() => {
    if (activeTab !== 'receipts') return;
    const requestedInvoice = searchParams.get('search') || searchParams.get('invoice') || '';
    setInvoiceSearchTerm(requestedInvoice);
  }, [activeTab, searchParams]);

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
    sourceKind?: 'BOOKING' | 'PACKAGE' | 'WALK_IN' | 'TUITION' | 'CART';
    customerId?: string;
    serviceId?: string;
    customerEmail?: string;
    branchPhone?: string;
    lineItems?: MLDInvoiceLine[];
    packageInfo?: MLDInvoicePackageInfo | null;
    subtotalValue?: number;
    discountValue?: number;
    pointsRedeemedValue?: number;
    vatRateValue?: number;
    vatAmountValue?: number;
    totalValue?: number;
  } | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
      toast.success('Đã sao chép!', `${label}: ${text}`);
    }
  };

  const loadTuitionEnrollments = async () => {
    setEnrollmentLoad('loading');
    try {
      const result = await academyService.getEnrollments();
      if (!result.success || !result.data) {
        setEnrollmentLoad('error');
        return;
      }
      setAllEnrollments(result.data);
      setEnrollmentLoad('ready');
    } catch {
      setEnrollmentLoad('error');
    }
  };

  useEffect(() => {
    void loadTuitionEnrollments();
  }, []);

  const fetchPosData = async () => {
    try {
      if (searchParams.get('bookingId') || searchParams.get('booking')) {
        supabaseService.invalidateCache('bookings');
      }
      const [invRes, bkRes, custRes, brRes, pkgRes, shiftRes, srvRes, techRes, courseRes] = await Promise.allSettled([
        posService.getInvoices(),
        bookingService.getBookings(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        treatmentService.getTreatmentPackages(),
        posService.getActiveShift(selectedBranchId !== 'ALL' ? selectedBranchId : undefined),
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
      if (shiftRes.status === 'fulfilled' && shiftRes.value.success) {
        setCurrentShift(shiftRes.value.data || null);
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
        const productRows = await supabaseService.query<any[]>('home_products?is_active=eq.true&order=sort_order.asc');
        setHomeProducts((productRows || []).filter((p: any) => p.is_active !== false));
      } catch (prodErr) {
        console.warn('Không tải được danh mục sản phẩm bổ trợ:', prodErr);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setPosBookingsLoaded(true);
    }
  };

  useEffect(() => {
    Promise.all([
      settingsService.getSettingsByCategory<PosSettings>('pos'),
      settingsService.getSettingsByCategory<CompanySettings>('general'),
    ])
      .then(([posCfg, genCfg]) => {
        if (posCfg) setPosSettings({ ...DEFAULT_SETTINGS_STATE.pos, ...posCfg });
        if (genCfg) setGeneralSettings({ ...DEFAULT_SETTINGS_STATE.general, ...genCfg });
      })
      .catch(() => {});
  }, []);

  const triggerAutoPrintIfConfigured = () => {
    if (
      posSettings.auto_print_receipt_on_payment &&
      typeof navigator !== 'undefined' &&
      !navigator.webdriver
    ) {
      window.setTimeout(() => {
        window.print();
      }, 350);
    }
  };

  const buildPackageInfoFromRecord = (
    pkg?: {
      packageName?: string | null;
      totalSessions?: number;
      completedSessions?: number;
      remainingSessions?: number;
      expiresAt?: string | null;
    } | null,
    wsInv?: any,
  ): MLDInvoicePackageInfo | null => {
    const total = Number(pkg?.totalSessions ?? wsInv?.packageTotalSessions ?? 0);
    if (!Number.isFinite(total) || total <= 0) return null;
    const completed = Number(pkg?.completedSessions ?? wsInv?.packageCompletedSessions ?? 0);
    const remaining = Math.max(0, Number(pkg?.remainingSessions ?? total - completed));
    return {
      packageName: pkg?.packageName || wsInv?.packageName || null,
      totalSessions: total,
      completedSessions: completed,
      remainingSessions: remaining,
      expiresAt: pkg?.expiresAt || wsInv?.packageExpiresAt || null,
    };
  };

  const loadCommissionWorkspace = async (branchScope?: string) => {
    setCommissionStaffLoading(true);
    setCommissionStaffLoadError(false);
    try {
      const wsRes = await posService.getWorkspace(branchScope);
      const mergedMap = new Map<string, StaffWithProfile & { role?: string; technicianId?: string | null }>();
      if (wsRes.success && wsRes.data) {
        if (Array.isArray(wsRes.data.invoices)) {
          setWorkspaceInvoices(wsRes.data.invoices);
        }
        if (Array.isArray(wsRes.data.staff)) {
          for (const item of wsRes.data.staff) {
            const sp = item.staffProfile || {};
            mergedMap.set(item.id, {
              id: item.id,
              fullName: item.fullName || 'Nhân viên',
              phone: item.phone || '',
              role: (item.role || UserRole.CASHIER) as UserRole,
              technicianId: item.technicianId || null,
              isActive: true,
              staffProfile: {
                id: sp.id || '',
                userId: item.id,
                branchId: sp.branchId || '',
                employeeCode: sp.employeeCode || '',
                position: sp.position || item.role || 'Nhân viên',
                commissionRate: Number(sp.commissionRate ?? 0),
                packageCommissionRate: Number(sp.packageCommissionRate ?? 0),
                productCommissionRate: Number(sp.productCommissionRate ?? 0),
                isActive: true,
              },
            } as any);
          }
        }
      }
      if (mergedMap.size === 0) {
        let stRes = await staffService.getStaffList({ branchId: branchScope }).catch(() => null);
        if (!stRes?.success || !stRes.data?.length) {
          stRes = await staffService.getStaffList().catch(() => null);
        }
        if (stRes?.success && stRes.data) {
          for (const staff of stRes.data) {
            mergedMap.set(staff.id, { ...staff, role: staff.role });
          }
        }
      }
      if (mergedMap.size === 0 && allTechnicians.length > 0) {
        for (const tech of allTechnicians) {
          if (tech.isActive === false || !tech.userId || mergedMap.has(tech.userId)) continue;
          mergedMap.set(tech.userId, {
            id: tech.userId,
            fullName: tech.fullName || 'KTV',
            phone: '',
            role: UserRole.TECHNICIAN,
            technicianId: tech.id,
            isActive: true,
            staffProfile: {
              id: '',
              userId: tech.userId,
              branchId: tech.branchId || '',
              employeeCode: '',
              position: tech.title || 'Kỹ thuật viên',
              commissionRate: 0,
              packageCommissionRate: 0,
              productCommissionRate: 0,
              isActive: true,
            },
          } as any);
        }
      }
      setCommissionStaffLoadError(!wsRes.success && mergedMap.size === 0);
      setCommissionStaff(
        Array.from(mergedMap.values()).sort((a, b) =>
          String(a.fullName || '').localeCompare(String(b.fullName || ''), 'vi'),
        ),
      );
    } finally {
      setCommissionStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchPosData();
    const bParam = selectedBranchId !== 'ALL' ? selectedBranchId : undefined;
    void loadCommissionWorkspace(bParam);
  }, [selectedBranchId]);

  useEffect(() => {
    if (!booking || selectedCommissionStaffId || commissionStaffManuallySet.current) return;
    const matchedId = findMatchingCommissionStaffId(commissionStaff, booking);
    if (matchedId) {
      setSelectedCommissionStaffId(matchedId);
    }
  }, [booking?.id, booking?.technicianId, booking?.technician?.userId, commissionStaff, selectedCommissionStaffId]);

  const renderCommissionStaffHint = () => {
    if (commissionStaffLoading) {
      return <p className="mt-1 text-[11px] text-[#8C7A6B]">Đang tải danh sách nhân viên hưởng hoa hồng...</p>;
    }
    if (commissionStaff.length === 0) {
      return (
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-amber-800">
          <span>
            {commissionStaffLoadError
              ? 'Không tải được danh sách nhân viên.'
              : 'Chưa có nhân viên hoạt động để chọn hoa hồng.'}
          </span>
          <button
            type="button"
            onClick={() => void loadCommissionWorkspace(selectedBranchId !== 'ALL' ? selectedBranchId : undefined)}
            className="font-bold text-[#985018] underline hover:text-[#7F4115] cursor-pointer"
          >
            Tải lại
          </button>
        </div>
      );
    }
    return null;
  };

  // The active shift is branch-scoped. Keep it synchronized whenever the URL,
  // global branch selector, or the local selector changes branch. The initial
  // bulk fetch alone is not sufficient because it closes over the first branch.
  useEffect(() => {
    let active = true;
    const branchId = selectedBranchId !== 'ALL' ? selectedBranchId : undefined;
    posService.getActiveShift(branchId).then((result) => {
      if (!active || !result.success) return;
      setCurrentShift(result.data || null);
      if (result.data) setShowOpenShiftModal(false);
    });
    return () => { active = false; };
  }, [selectedBranchId]);

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

  useEffect(() => {
    const bookingIdParam = (searchParams.get('bookingId') || '').trim();
    const bookingCodeParam = (searchParams.get('booking') || '').trim();
    const requestKey = [bookingIdParam, bookingCodeParam].filter(Boolean).join('|');
    if (!requestKey) {
      handledBookingKey.current = '';
      fetchedMissingBookingKey.current = '';
      return;
    }
    if (handledBookingKey.current === requestKey) return;

    const targetBooking = findTargetBookingForPos(allBookings, bookingIdParam, bookingCodeParam);
    if (!targetBooking) {
      if (!posBookingsLoaded || fetchedMissingBookingKey.current === requestKey) return;
      fetchedMissingBookingKey.current = requestKey;
      supabaseService.invalidateCache('bookings');
      bookingService.getBookingById(bookingIdParam || bookingCodeParam).then((res) => {
        if (res.success && res.data) {
          const found = res.data;
          setAllBookings((prev) =>
            prev.some((b) => b.id === found.id)
              ? prev.map((b) => (b.id === found.id ? found : b))
              : [found, ...prev],
          );
        }
      });
      return;
    }

    handledBookingKey.current = requestKey;

    if (targetBooking.paymentStatus === PaymentStatus.PAID) {
      const paidInvoice = invoices.find(
        (inv) =>
          inv.bookingId === targetBooking.id ||
          Boolean(targetBooking.bookingCode && (inv as any).bookingCode === targetBooking.bookingCode),
      );
      setActiveTab('receipts');
      if (paidInvoice?.invoiceCode || targetBooking.bookingCode) {
        setInvoiceSearchTerm(paidInvoice?.invoiceCode || targetBooking.bookingCode || '');
      }
      if (paidInvoice?.invoiceCode) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'receipts');
          next.set('invoice', paidInvoice.invoiceCode);
          return next;
        });
      }
      return;
    }

    loadBookingIntoCart(targetBooking);
  }, [searchParams, allBookings, invoices, posBookingsLoaded]);

  // Load receipt if ?invoice= or ?receipt= param present
  useEffect(() => {
    const invoiceParam = searchParams.get('invoice') || searchParams.get('receipt') || searchParams.get('code');
    if (invoiceParam && invoices.length > 0) {
      const found = invoices.find(
        (i) => i.invoiceCode.toLowerCase() === invoiceParam.trim().toLowerCase() || i.id === invoiceParam.trim()
      );
      if (found) {
        const detail = resolveReceiptDetail(found);
        const wsInv = workspaceInvoices.find((w) => w.id === found.id || w.invoiceCode === found.invoiceCode);
        const packageInfo = buildPackageInfoFromRecord(found.userPackage || null, wsInv);
        setSelectedReceiptData({
          id: detail.id,
          customerName: detail.customerName,
          customerPhone: detail.customerPhone,
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
          technicianName: detail.technicianName,
          packageInfo,
          customerEmail: found.customer?.email || undefined,
          branchAddress: found.branch ? `${found.branch.address}, ${found.branch.district}, ${found.branch.city}` : undefined,
          branchPhone: found.branch?.phone,
          lineItems: found.items?.map((item) => ({
            description: item.itemName,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            amount: Number(item.amount || 0),
          })),
          subtotalValue: Number(found.subtotal || 0),
          discountValue: Number(found.discountAmount || 0),
          pointsRedeemedValue: Number(found.pointsRedeemedAmount || 0),
          vatRateValue: Number(found.vatRate || 0),
          vatAmountValue: Number(found.vatAmount || 0),
          totalValue: Number(found.totalAmount || 0) - Number(found.refundAmount || 0),
        });
        setShowReceiptModal(true);
      }
    }
  }, [searchParams, invoices]);

  useEffect(() => {
    if (activeTab !== 'pos') return;
    let cancelled = false;
    setSelectedUserVoucherId('');
    setRedeemPoints(0);
    setBenefitsLoading(true);
    const custId = isUuid(selectedCustomer.id) ? selectedCustomer.id : GUEST_CUSTOMER.id;
    posService.getCustomerBenefits(custId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setCustomerBenefits(res.data);
      } else {
        setCustomerBenefits(null);
      }
      setBenefitsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedCustomer.id]);

  // Tự động tải danh sách 10 ca 1 tiếng DRC khi mở modal Đặt lịch tại quầy
  useEffect(() => {
    if (!showWalkInModal || walkInModalMode !== 'SCHEDULE') return;
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
  }, [showWalkInModal, walkInModalMode, walkInDate, selectedBranchId]);

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
    if (booking) {
      toast.warning(
        'Đơn đang khóa theo lịch hẹn',
        'Vui lòng bấm "Thoát lịch hẹn" nếu bạn muốn tạo đơn bán lẻ tự do.'
      );
      return;
    }
    const compositionError = cartCompositionError(posCart, item.type);
    if (compositionError) {
      toast.warning('Tách riêng phiếu bán gói', compositionError);
      return;
    }
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
    if (booking) return;
    setPosCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            if (item.type === 'PACKAGE' && delta > 0) {
              toast.warning('Mỗi phiếu chỉ bán một gói', 'Muốn mua thêm gói, hãy hoàn tất phiếu hiện tại rồi tạo phiếu mới.');
              return item;
            }
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const removeFromCart = (id: string) => {
    if (booking) return;
    setPosCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setPosCart([]);
    setBooking(undefined);
    setPendingPosQr(null);
    setSelectedCustomer(allCustomers.find((c) => c.id === GUEST_CUSTOMER.id) || GUEST_CUSTOMER);
    setDiscountAmount(0);
    setCouponInput('');
    setAppliedCouponCode('');
    setSelectedUserVoucherId('');
    setRedeemPoints(0);
    setDiscountReason('');
    commissionStaffManuallySet.current = false;
    setSelectedCommissionStaffId('');
  };

  const isPosMethodEnabled = (method: 'onsite' | 'transfer' | 'online') => {
    if (method === 'onsite') return posSettings.enable_cash !== false;
    if (method === 'transfer') return posSettings.enable_vietqr !== false;
    return posSettings.enable_card_pos !== false;
  };

  useEffect(() => {
    if (!isPosMethodEnabled(selectedMethod)) {
      if (posSettings.enable_cash !== false) setSelectedMethod('onsite');
      else if (posSettings.enable_vietqr !== false) setSelectedMethod('transfer');
      else if (posSettings.enable_card_pos !== false) setSelectedMethod('online');
    }
    if (tuitionMethod === 'onsite' && posSettings.enable_cash === false && posSettings.enable_vietqr !== false) {
      setTuitionMethod('transfer');
    } else if (tuitionMethod === 'transfer' && posSettings.enable_vietqr === false && posSettings.enable_cash !== false) {
      setTuitionMethod('onsite');
    }
  }, [posSettings, selectedMethod, tuitionMethod]);

  const applyCouponCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setAppliedCouponCode('');
      return;
    }
    try {
      const rows = await supabaseService.query<any[]>(`coupons?code=eq.${encodeURIComponent(code)}`);
      const c = rows?.[0];
      if (!c || c.is_active === false) {
        setAppliedCouponCode('');
        setDiscountAmount(0);
        toast.warning('Mã không hợp lệ', 'Không tìm thấy mã giảm giá đang hoạt động.');
        return;
      }
      const now = Date.now();
      if (c.valid_from && new Date(c.valid_from).getTime() > now) {
        setAppliedCouponCode('');
        setDiscountAmount(0);
        toast.warning('Mã chưa đến hạn', `Mã ${code} chưa có hiệu lực.`);
        return;
      }
      if (c.valid_to && new Date(c.valid_to).getTime() < now) {
        setAppliedCouponCode('');
        setDiscountAmount(0);
        toast.error('Mã đã hết hạn', `Mã giảm giá ${code} đã hết hạn sử dụng.`);
        return;
      }
      if (c.usage_limit != null && Number(c.usage_limit) > 0 && Number(c.used_count || 0) >= Number(c.usage_limit)) {
        setAppliedCouponCode('');
        setDiscountAmount(0);
        toast.error('Hết lượt sử dụng', `Mã ${code} đã đạt giới hạn lượt sử dụng.`);
        return;
      }
      const sub = Number(cartSubtotal || 0);
      const minOrder = Number(c.min_order_amount || 0);
      if (minOrder > 0 && sub < minOrder) {
        setAppliedCouponCode('');
        setDiscountAmount(0);
        toast.warning('Chưa đạt giá trị tối thiểu', `Đơn tối thiểu để áp dụng ${code} là ${minOrder.toLocaleString('vi-VN')}đ.`);
        return;
      }
      const pct = Number(c.discount_percent || 0);
      const flat = Number(c.discount_amount || 0);
      let computed = pct > 0 ? Math.round((sub * pct) / 100) : flat;
      const maxCap = Number(c.max_discount ?? c.max_discount_amount ?? 0);
      if (maxCap > 0 && computed > maxCap) {
        computed = maxCap;
      }
      const finalDiscount = Math.min(sub, Math.max(0, computed));
      if (finalDiscount <= 0) {
        setAppliedCouponCode('');
        toast.warning('Không đủ điều kiện', `Mã ${code} không tạo ra mức giảm hợp lệ cho giỏ hàng này.`);
        return;
      }
      setSelectedUserVoucherId('');
      setAppliedCouponCode(code);
      setDiscountAmount(finalDiscount);
      setDiscountReason(c.title ? `Áp dụng mã ${code} (${c.title})` : `Áp dụng mã ${code}`);
      toast.success('Đã áp dụng mã giảm giá', `${c.title || code}: -${finalDiscount.toLocaleString('vi-VN')}đ`);
    } catch {
      toast.error('Lỗi kiểm tra mã', 'Không thể xác thực mã giảm giá lúc này.');
    }
  };

  const applyBenefitCoupon = (benefit: {
    code: string;
    title?: string;
    discountPercent: number;
    discountAmount: number;
    maxDiscountAmount: number | null;
    minOrderAmount: number;
    userVoucherId?: string;
  }) => {
    const sub = Number(cartSubtotal || 0);
    if (sub <= 0) {
      toast.warning('Đơn hàng trống', 'Vui lòng chọn dịch vụ hoặc sản phẩm trước khi áp dụng ưu đãi.');
      return;
    }
    if (benefit.minOrderAmount > 0 && sub < benefit.minOrderAmount) {
      toast.warning('Chưa đạt giá trị tối thiểu', `Đơn tối thiểu để dùng ${benefit.code} là ${benefit.minOrderAmount.toLocaleString('vi-VN')}đ.`);
      return;
    }
    let computed =
      benefit.discountPercent > 0
        ? Math.round((sub * benefit.discountPercent) / 100)
        : benefit.discountAmount;
    if (benefit.maxDiscountAmount && benefit.maxDiscountAmount > 0) {
      computed = Math.min(computed, benefit.maxDiscountAmount);
    }
    const finalDiscount = Math.min(sub, Math.max(0, computed));
    if (finalDiscount <= 0) {
      toast.warning('Không đủ điều kiện', `Ưu đãi ${benefit.code} không áp dụng được cho giỏ hàng này.`);
      return;
    }
    setCouponInput(benefit.code);
    setAppliedCouponCode(benefit.code);
    setSelectedUserVoucherId(benefit.userVoucherId || '');
    setDiscountAmount(finalDiscount);
    setDiscountReason(
      benefit.userVoucherId
        ? `Voucher khách hàng ${benefit.code}`
        : benefit.title
          ? `Áp dụng mã ${benefit.code} (${benefit.title})`
          : `Áp dụng mã ${benefit.code}`,
    );
    toast.success('Đã áp dụng ưu đãi', `${benefit.code}: -${finalDiscount.toLocaleString('vi-VN')}đ`);
  };

  // -------------------------------------------------------------
  // FINANCIAL TOTALS & PACKAGE GUARDS
  // -------------------------------------------------------------
  const cartHasPackage = useMemo(() => {
    return posCart.some((i) => i.type === 'PACKAGE');
  }, [posCart]);

  const cartPackageItem = useMemo(() => {
    return posCart.find((i) => i.type === 'PACKAGE');
  }, [posCart]);

  const matchingPackageDef = useMemo(() => {
    if (!cartPackageItem) return undefined;
    const pId = cartPackageItem.packageId || cartPackageItem.id;
    return treatmentPackages.find((p) => p.id === pId);
  }, [cartPackageItem, treatmentPackages]);

  const packageHasPreconfiguredDiscount = useMemo(() => {
    if (!matchingPackageDef) return false;
    const disc = Number(matchingPackageDef.discountPrice || 0);
    const regular = Number(matchingPackageDef.price || 0);
    return disc > 0 && regular > disc;
  }, [matchingPackageDef]);

  useEffect(() => {
    if (packageHasPreconfiguredDiscount && discountAmount > 0) {
      setDiscountAmount(0);
    }
  }, [packageHasPreconfiguredDiscount, discountAmount]);

  const cartSubtotal = useMemo(() => {
    return posCart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  }, [posCart]);

  const maxRedeemablePts = useMemo(() => {
    if (
      !customerBenefits ||
      !customerBenefits.loyaltySettings.isActive ||
      selectedCustomer.id === GUEST_CUSTOMER.id ||
      isTreatmentRegistration ||
      cartHasPackage ||
      Boolean(booking?.id)
    ) {
      return 0;
    }
    return maxRedeemablePoints(
      Math.max(0, cartSubtotal - discountAmount),
      customerBenefits.rewardPoints,
      customerBenefits.loyaltySettings.redeemValuePerPoint,
      customerBenefits.loyaltySettings.maxRedeemPercentPerOrder,
    );
  }, [customerBenefits, selectedCustomer.id, isTreatmentRegistration, cartHasPackage, booking?.id, cartSubtotal, discountAmount]);

  const effectiveRedeemPoints = useMemo(() => {
    return Math.min(Math.max(0, Math.floor(redeemPoints)), maxRedeemablePts);
  }, [redeemPoints, maxRedeemablePts]);

  useEffect(() => {
    if (redeemPoints !== effectiveRedeemPoints) {
      setRedeemPoints(effectiveRedeemPoints);
    }
  }, [redeemPoints, effectiveRedeemPoints]);

  const pointsDiscountValue = useMemo(() => {
    const valuePerPt = Number(customerBenefits?.loyaltySettings.redeemValuePerPoint || 0);
    return effectiveRedeemPoints > 0 && valuePerPt > 0 ? effectiveRedeemPoints * valuePerPt : 0;
  }, [effectiveRedeemPoints, customerBenefits?.loyaltySettings.redeemValuePerPoint]);

  const posTotals = useMemo(() => {
    return calculatePosTotals(cartSubtotal, discountAmount, vatRate, pointsDiscountValue);
  }, [cartSubtotal, discountAmount, vatRate, pointsDiscountValue]);

  const cartPreTax = posTotals.preTax;
  const cartVat = posTotals.vat;
  const cartTotal = posTotals.total;

  // -------------------------------------------------------------
  // PENDING BOOKINGS QUEUE
  // -------------------------------------------------------------
  const pendingBookings = useMemo(() => {
    const paidBookingIds = new Set(
      invoices
        .filter((invoice) => invoice.paymentStatus === PaymentStatus.PAID && invoice.bookingId)
        .map((invoice) => String(invoice.bookingId))
    );
    return allBookings.filter((b) => {
      if (!isBookingWaitingPayment(b, paidBookingIds)) return false;
      if (selectedBranchId !== 'ALL' && b.branchId && b.branchId !== selectedBranchId) {
        return false;
      }
      return true;
    });
  }, [allBookings, invoices, selectedBranchId]);

  const completedQueueCount = useMemo(() => {
    return pendingBookings.filter(isCompletedServiceBooking).length;
  }, [pendingBookings]);

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

  const sortedPendingBookings = useMemo(() => {
    return [...filteredPendingBookings].sort((a, b) => {
      const aDone = isCompletedServiceBooking(a) ? 1 : 0;
      const bDone = isCompletedServiceBooking(b) ? 1 : 0;
      return bDone - aDone;
    });
  }, [filteredPendingBookings]);

  const loadBookingIntoCart = (bk: Booking) => {
    if (bk.branchId && bk.branchId !== selectedBranchId) {
      handleBranchSelect(bk.branchId);
    }

    const matchedCustomer =
      (bk.customerId ? allCustomers.find((c) => c.id === bk.customerId) : undefined) ||
      bk.customer;

    if (matchedCustomer) {
      setSelectedCustomer(matchedCustomer);
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

    const bookingLines = bookingItemsToCart(bk);
    if (!bookingLines.length) {
      if (bk.bookingCode) {
        setQueueSearchTerm(bk.bookingCode);
      }
      toast.error('Lịch hẹn chưa có dịch vụ', 'Không thể thu tiền trước khi lịch hẹn có đầy đủ chi tiết dịch vụ.');
      return;
    }

    commissionStaffManuallySet.current = false;
    const matchedStaffId = findMatchingCommissionStaffId(commissionStaff, bk);
    setSelectedCommissionStaffId(matchedStaffId);

    setPosCart(bookingLines);

    // Nạp đúng số tiền chiết khấu / ưu đãi theo lịch hẹn đã xác nhận
    setDiscountAmount(getBookingEffectiveDiscount(bk));

    setBooking(bk);
    setActiveTab('pos');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'pos');
      return next;
    });
    toast.success('Đã nạp đơn vào quầy', `${bookingLines.length} dịch vụ · ${bk.bookingCode}`);
  };

  // -------------------------------------------------------------
  // POS CHECKOUT & PAYMENT PROCESSING
  // -------------------------------------------------------------
  const handleProcessPosPayment = async () => {
    if (paymentLock.current) return;
    if (selectedBranchId === 'ALL') {
      toast.warning('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở chi nhánh cụ thể trước khi thanh toán.');
      return;
    }
    if (!currentShift) {
      toast.warning('Chưa mở ca thu ngân', 'Vui lòng mở ca thu ngân trước khi ghi nhận thanh toán.');
      setShowOpenShiftModal(true);
      return;
    }
    if (posCart.length === 0) {
      toast.warning('Đơn hàng trống', 'Vui lòng chọn ít nhất 1 dịch vụ, gói hoặc sản phẩm từ menu bên trái.');
      return;
    }

    const hasPackage = posCart.some((i) => i.type === 'PACKAGE') || isTreatmentRegistration;
    if (hasPackage && selectedCustomer.id === GUEST_CUSTOMER.id) {
      toast.error(
        'Yêu cầu khách hàng định danh',
        'Gói liệu trình bắt buộc đăng ký cho khách hàng có hồ sơ định danh, không áp dụng cho khách vãng lai.'
      );
      return;
    }

    if (!isPosMethodEnabled(selectedMethod)) {
      toast.error('Kênh thanh toán đang tắt', 'Cấu hình POS hiện không cho phép phương thức thanh toán này.');
      return;
    }
    if (posSettings.require_discount_reason && discountAmount > 0 && !appliedCouponCode && !booking?.id && !discountReason.trim()) {
      toast.warning('Thiếu lý do giảm giá', 'Cấu hình POS yêu cầu nhập lý do khi giảm giá thủ công.');
      return;
    }

    paymentLock.current = true;
    setIsProcessing(true);
    try {
      const activeBranch = branches.find((b) => b.id === currentShift.branchId);
      if (!activeBranch) throw new Error('Không tìm thấy chi nhánh của ca thu ngân. Vui lòng tải lại dữ liệu.');
      const targetCustomerId = isUuid(selectedCustomer.id) ? selectedCustomer.id : GUEST_CUSTOMER.id;

      const paymentMethodEnum =
        selectedMethod === 'onsite'
          ? PaymentMethod.CASH_AT_SPA
          : selectedMethod === 'transfer'
          ? PaymentMethod.BANK_TRANSFER
          : PaymentMethod.VNPAY;

      const isSinglePackage =
        !booking?.id &&
        posCart.length === 1 &&
        posCart[0].type === 'PACKAGE' &&
        posCart[0].quantity === 1;

      const registrationPackage = isSinglePackage;

      const collection = await posService.collectPayment({
        kind: booking?.id ? 'BOOKING' : registrationPackage ? 'PACKAGE' : 'CART',
        ...(booking?.id
          ? { bookingId: booking.id }
          : registrationPackage
            ? { packageId: posCart[0].packageId || posCart[0].id }
            : { items: posCart.map(item => ({ id: item.id, type: item.type, quantity: item.quantity, serviceId: item.serviceId, packageId: item.packageId })) }),
        customerId: targetCustomerId, branchId: currentShift.branchId,
        shiftId: currentShift.id, paymentMethod: paymentMethodEnum,
        vatRate, discountAmount, expectedTotal: cartTotal, commissionStaffId: selectedCommissionStaffId || undefined,
        couponCode: appliedCouponCode || undefined,
        userVoucherId: selectedUserVoucherId || undefined,
        redeemPoints: effectiveRedeemPoints > 0 ? effectiveRedeemPoints : undefined,
        discountReason: discountReason.trim() || undefined,
      });
      if (!collection.success || !collection.data?.invoice?.id) throw new Error(collection.message);
      if (registrationPackage) {
        supabaseService.invalidateCache('user_packages');
        supabaseService.invalidateCache('invoices');
      }
      const receiptCode = collection.data.invoice.invoice_code;
      const shift = await posService.getActiveShift(currentShift.branchId);
      if (shift.success) setCurrentShift(shift.data);

      const isPkg = Boolean(registrationPackage);
      const sourceKind = classifyPosSource(booking?.id, posCart);
      const firstServiceItem = posCart.find((i) => i.type === 'SERVICE');

      const techName = commissionStaff.find((s) => s.id === selectedCommissionStaffId)?.fullName;
      const pkgData = collection.data.userPackage;
      const packageInfo = buildPackageInfoFromRecord(
        pkgData
          ? {
              packageName: pkgData.packageName || pkgData.package_name || matchingPackageDef?.name || posCart.find((i) => i.type === 'PACKAGE')?.name,
              totalSessions: Number(pkgData.totalSessions ?? pkgData.total_sessions ?? matchingPackageDef?.totalSessions ?? 0),
              completedSessions: Number(pkgData.completedSessions ?? pkgData.completed_sessions ?? 0),
              remainingSessions: pkgData.remainingSessions,
              expiresAt: pkgData.expiresAt || pkgData.expires_at || null,
            }
          : null,
      );
      setSelectedReceiptData({
        id: receiptCode,
        customerName: selectedCustomer.fullName || 'Khách hàng',
        customerPhone: selectedCustomer.phone || '--',
        customerEmail: selectedCustomer.email || undefined,
        branchName: activeBranch?.name || 'Trụ sở MLD Việt Nam',
        branchAddress: activeBranch ? `${activeBranch.address}, ${activeBranch.district}, ${activeBranch.city}` : undefined,
        branchPhone: activeBranch?.phone,
        serviceName: posCart.map((i) => `${i.name} (x${i.quantity})`).join(', '),
        category: isPkg ? 'PACKAGE' : 'SERVICE',
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
        packageInfo,
        znsSent: false,
        materialsText: 'Chưa xác nhận xuất kho vật tư',
        sourceKind,
        customerId: targetCustomerId !== GUEST_CUSTOMER.id ? targetCustomerId : undefined,
        serviceId: firstServiceItem?.serviceId || firstServiceItem?.id,
        lineItems: posCart.map((item) => ({ description: item.name, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.unitPrice * item.quantity })),
        subtotalValue: cartSubtotal,
        discountValue: discountAmount,
        pointsRedeemedValue: Number(collection.data.invoice.points_redeemed_amount ?? pointsDiscountValue),
        vatRateValue: vatRate,
        vatAmountValue: cartVat,
        totalValue: Number(collection.data.amount ?? cartTotal),
      });

      setPendingPosQr(null);
      setShowReceiptModal(true);
      triggerAutoPrintIfConfigured();
      toast.success(
        registrationPackage ? 'Đã kích hoạt liệu trình' : 'Thanh toán thành công',
        registrationPackage
          ? `Hồ sơ liệu trình đã được tạo và liên kết hóa đơn ${receiptCode}.`
          : `Đã ghi nhận hóa đơn ${receiptCode} · ${cartTotal.toLocaleString('vi-VN')}đ`
      );

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

  const shortcutsStateRef = useRef({
    activeTab,
    booking,
    hasOpenModal: false,
    canQuickPay: false,
    onQuickPay: handleProcessPosPayment,
  });
  shortcutsStateRef.current = {
    activeTab,
    booking,
    hasOpenModal: Boolean(
      showReceiptModal ||
        showOpenShiftModal ||
        showCloseShiftModal ||
        showWalkInModal ||
        isAddingCustomer ||
        editingReceipt,
    ),
    canQuickPay: Boolean(
      currentShift &&
        selectedBranchId !== 'ALL' &&
        posCart.length > 0 &&
        !(cartHasPackage && selectedCustomer.id === GUEST_CUSTOMER.id) &&
        !isProcessing,
    ),
    onQuickPay: handleProcessPosPayment,
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = shortcutsStateRef.current;
      if (state.activeTab !== 'pos' || state.hasOpenModal) return;
      if (event.key === 'F2') {
        event.preventDefault();
        if (!state.booking) setShowCustomerDropdown(true);
        customerSearchInputRef.current?.focus();
      } else if (event.key === 'F4') {
        event.preventDefault();
        couponInputRef.current?.focus();
      } else if (event.key === 'F9') {
        event.preventDefault();
        if (state.canQuickPay) {
          void state.onQuickPay();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStartAutoPayQr = async (targetKind: 'POS' | 'TUITION') => {
    if (isCreatingPendingQr) return;
    if (selectedBranchId === 'ALL') {
      toast.warning('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở chi nhánh cụ thể trước khi tạo mã QR tự động.');
      return;
    }
    if (!currentShift || currentShift.branchId !== selectedBranchId) {
      toast.warning('Chưa mở ca thu ngân', 'Vui lòng mở ca thu ngân trước khi tạo QR tự động.');
      setShowOpenShiftModal(true);
      return;
    }

    if (posSettings.enable_vietqr === false) {
      toast.error('Kênh VietQR đang tắt', 'Cấu hình POS hiện đang tắt thanh toán VietQR.');
      return;
    }

    setIsCreatingPendingQr(true);
    try {
      if (targetKind === 'TUITION') {
        if (!selectedEnrollment) {
          toast.error('Thiếu hồ sơ', 'Vui lòng chọn học viên để tạo mã QR học phí.');
          return;
        }
        if (tuitionPaymentAmount <= 0) {
          toast.error('Số tiền không hợp lệ', 'Vui lòng nhập số tiền cần thu lớn hơn 0.');
          return;
        }
        const pendingRes = await posService.createPendingQr({
          kind: 'TUITION',
          enrollmentId: selectedEnrollment.id,
          amount: tuitionPaymentAmount,
          shiftId: currentShift.id,
          branchId: currentShift.branchId,
          commissionStaffId: tuitionCommissionStaffId || selectedEnrollment.assignedStaffId || undefined,
        });
        if (!pendingRes.success || !pendingRes.data) throw new Error(pendingRes.message);
        const payosRes = await paymentGatewayService.createPayosPaymentLink({
          amount: pendingRes.data.amount,
          description: pendingRes.data.transferContent,
          orderCode: pendingRes.data.orderCode,
          enrollmentId: selectedEnrollment.id,
          customerName: getEnrollmentStudentName(selectedEnrollment),
          customerPhone: getEnrollmentStudentPhone(selectedEnrollment),
        });
        setPendingPosQr({
          kind: 'TUITION',
          enrollmentId: selectedEnrollment.id,
          baselinePaid: Number(selectedEnrollment.amountPaid || 0),
          orderCode: pendingRes.data.orderCode,
          amount: pendingRes.data.amount,
          transferContent: pendingRes.data.transferContent,
          qrUrl: pendingRes.data.qrUrl,
          bankAccountNo: pendingRes.data.bankAccountNo,
          bankAccountName: pendingRes.data.bankAccountName,
          checkoutUrl: payosRes.data?.checkoutUrl,
          isPaid: false,
        });
        toast.success('Đã tạo QR học phí tự động', `Chờ khách quét mã với nội dung ${pendingRes.data.transferContent}`);
        return;
      }

      if (posCart.length === 0) {
        toast.warning('Đơn hàng trống', 'Vui lòng chọn ít nhất 1 dịch vụ, gói hoặc sản phẩm.');
        return;
      }
      const hasPackage = posCart.some((i) => i.type === 'PACKAGE') || isTreatmentRegistration;
      if (hasPackage && selectedCustomer.id === GUEST_CUSTOMER.id) {
        toast.error('Yêu cầu khách hàng định danh', 'Gói liệu trình bắt buộc gắn với hồ sơ khách hàng.');
        return;
      }
      if (posSettings.require_discount_reason && discountAmount > 0 && !appliedCouponCode && !booking?.id && !discountReason.trim()) {
        toast.warning('Thiếu lý do giảm giá', 'Cấu hình POS yêu cầu nhập lý do khi giảm giá thủ công.');
        return;
      }
      const targetCustomerId = isUuid(selectedCustomer.id) ? selectedCustomer.id : GUEST_CUSTOMER.id;
      const isSinglePackage = !booking?.id && posCart.length === 1 && posCart[0].type === 'PACKAGE' && posCart[0].quantity === 1;
      const qrKind: 'BOOKING' | 'PACKAGE' | 'CART' = booking?.id ? 'BOOKING' : isSinglePackage ? 'PACKAGE' : 'CART';
      const pendingRes = await posService.createPendingQr({
        kind: qrKind,
        ...(booking?.id
          ? { bookingId: booking.id }
          : isSinglePackage
            ? { packageId: posCart[0].packageId || posCart[0].id }
            : { items: posCart.map((item) => ({ id: item.id, type: item.type, quantity: item.quantity, serviceId: item.serviceId, packageId: item.packageId })) }),
        customerId: targetCustomerId,
        branchId: currentShift.branchId,
        shiftId: currentShift.id,
        vatRate,
        discountAmount,
        expectedTotal: cartTotal,
        commissionStaffId: selectedCommissionStaffId || undefined,
        couponCode: appliedCouponCode || undefined,
        userVoucherId: selectedUserVoucherId || undefined,
        redeemPoints: effectiveRedeemPoints > 0 ? effectiveRedeemPoints : undefined,
        discountReason: discountReason.trim() || undefined,
      });
      if (!pendingRes.success || !pendingRes.data) throw new Error(pendingRes.message);
      const payosRes = await paymentGatewayService.createPayosPaymentLink({
        amount: pendingRes.data.amount,
        description: pendingRes.data.transferContent,
        orderCode: pendingRes.data.orderCode,
        invoiceId: pendingRes.data.invoiceId,
        invoiceCode: pendingRes.data.invoiceCode,
        bookingId: booking?.id,
        customerName: selectedCustomer.fullName,
        customerPhone: selectedCustomer.phone,
      });
      setPendingPosQr({
        kind: qrKind,
        invoiceId: pendingRes.data.invoiceId,
        invoiceCode: pendingRes.data.invoiceCode,
        orderCode: pendingRes.data.orderCode,
        amount: pendingRes.data.amount,
        transferContent: pendingRes.data.transferContent,
        qrUrl: pendingRes.data.qrUrl,
        bankAccountNo: pendingRes.data.bankAccountNo,
        bankAccountName: pendingRes.data.bankAccountName,
        checkoutUrl: payosRes.data?.checkoutUrl,
        isPaid: false,
      });
      toast.success('Đã tạo QR đối soát tự động', `Mã hóa đơn chờ: ${pendingRes.data.invoiceCode}`);
    } catch (err: any) {
      toast.error('Không thể tạo QR tự động', err?.message || 'Vui lòng thử lại.');
    } finally {
      setIsCreatingPendingQr(false);
    }
  };

  useEffect(() => {
    if (!pendingPosQr || pendingPosQr.isPaid) return;
    let active = true;
    const interval = window.setInterval(async () => {
      if (!active) return;
      try {
        await paymentGatewayService.checkPayosStatus(pendingPosQr.orderCode);
        if (pendingPosQr.kind !== 'TUITION' && pendingPosQr.invoiceId) {
          const statusRes = await posService.getPendingQrStatus(pendingPosQr.invoiceId);
          if (active && statusRes.success && statusRes.data?.isPaid) {
            const inv = statusRes.data.invoice;
            const pkg = statusRes.data.userPackage;
            const activeBranch = branches.find((b) => b.id === (inv?.branch_id || currentShift?.branchId));
            const techName =
              statusRes.data.commissionStaffName ||
              commissionStaff.find((s) => s.id === (inv?.commission_staff_id || selectedCommissionStaffId))?.fullName;
            const packageInfo = buildPackageInfoFromRecord(pkg || null);
            const totalAmt = Number(inv?.total_amount || pendingPosQr.amount || 0);
            const subAmt = Number(inv?.subtotal || totalAmt);
            const discAmt = Number(inv?.discount_amount || 0);
            const vatAmt = Number(inv?.vat_amount || 0);
            const vatR = Number(inv?.vat_rate || 0);

            setSelectedReceiptData({
              id: statusRes.data.invoiceCode || pendingPosQr.invoiceCode || '',
              customerName: selectedCustomer.fullName || 'Khách hàng',
              customerPhone: selectedCustomer.phone || '--',
              customerEmail: selectedCustomer.email || undefined,
              branchName: activeBranch?.name || 'Trụ sở MLD Việt Nam',
              branchAddress: activeBranch ? `${activeBranch.address}, ${activeBranch.district}, ${activeBranch.city}` : undefined,
              branchPhone: activeBranch?.phone,
              serviceName: posCart.map((i) => `${i.name} (x${i.quantity})`).join(', ') || statusRes.data.invoiceCode,
              category: pendingPosQr.kind === 'PACKAGE' ? 'PACKAGE' : 'SERVICE',
              method: 'Chuyển khoản tự động (VietQR / PayOS)',
              amount: `${totalAmt.toLocaleString('vi-VN')}đ`,
              subtotal: `${subAmt.toLocaleString('vi-VN')}đ`,
              discount: discAmt > 0 ? `${discAmt.toLocaleString('vi-VN')}đ` : '0đ',
              vatRateText: `${vatR}%`,
              vatAmountText: `${vatAmt.toLocaleString('vi-VN')}đ`,
              shiftCode: currentShift?.shiftCode,
              date: new Intl.DateTimeFormat('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }).format(new Date()),
              status: 'Đã thanh toán tự động 100%',
              technicianName: techName,
              userPackageId: pkg?.id,
              packageDefinitionId: pkg?.package_id,
              packageInfo,
              sourceKind: classifyPosSource(booking?.id, posCart),
              lineItems: posCart.map((item) => ({ description: item.name, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.unitPrice * item.quantity })),
              subtotalValue: subAmt,
              discountValue: discAmt,
              pointsRedeemedValue: Number(inv?.points_redeemed_amount || 0),
              vatRateValue: vatR,
              vatAmountValue: vatAmt,
              totalValue: totalAmt,
            });
            setPendingPosQr(null);
            supabaseService.invalidateCache('user_packages');
            supabaseService.invalidateCache('invoices');
            clearCart();
            setShowReceiptModal(true);
            triggerAutoPrintIfConfigured();
            toast.success('Nhận tiền tự động thành công!', `Hóa đơn ${statusRes.data.invoiceCode} đã được chốt tự động.`);
            await fetchPosData();
          }
        } else if (pendingPosQr.kind === 'TUITION' && pendingPosQr.enrollmentId) {
          supabaseService.invalidateCache('course_enrollments');
          supabaseService.invalidateCache('tuition_transactions');
          const enrRes = await academyService.getEnrollments({ fresh: true });
          if (!active || !enrRes.success || !enrRes.data) return;
          const updated = enrRes.data.find((e) => e.id === pendingPosQr.enrollmentId);
          if (!updated) return;
          const newPaid = Number(updated.amountPaid || 0);
          if (newPaid > Number(pendingPosQr.baselinePaid || 0)) {
            const received = newPaid - Number(pendingPosQr.baselinePaid || 0);
            const activeBranch = selectedBranchId !== 'ALL' ? branches.find((b) => b.id === selectedBranchId) : branches[0];
            const totalT = updated.finalTuition ?? updated.tuitionTotal ?? 0;
            const remainingTuition = Math.max(0, totalT - newPaid);
            setAllEnrollments(enrRes.data);
            if (currentShift?.branchId) {
              const shiftRes = await posService.getActiveShift(currentShift.branchId);
              if (shiftRes.success) setCurrentShift(shiftRes.data || null);
            }
            setSelectedEnrollment(updated);
            setTuitionPaymentAmount(remainingTuition);
            setTuitionLedgerRevision((rev) => rev + 1);
            setPendingPosQr(null);
            setSelectedReceiptData({
              id: updated.orderCode || pendingPosQr.transferContent,
              customerName: getEnrollmentStudentName(updated),
              customerPhone: getEnrollmentStudentPhone(updated),
              branchName: activeBranch?.name || 'Trụ sở MLD Việt Nam',
              branchAddress: activeBranch ? `${activeBranch.address}, ${activeBranch.district}, ${activeBranch.city}` : undefined,
              branchPhone: activeBranch?.phone,
              serviceName: getEnrollmentCourseTitle(updated),
              category: 'ACADEMY',
              method: 'Chuyển khoản tự động (VietQR / PayOS)',
              amount: `${received.toLocaleString('vi-VN')}đ`,
              subtotal: `${received.toLocaleString('vi-VN')}đ`,
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
              status: remainingTuition === 0 ? 'Đã tất toán toàn khóa' : `Đã nhận tự động (còn nợ ${remainingTuition.toLocaleString('vi-VN')}đ)`,
              technicianName: commissionStaff.find((s) => s.id === (tuitionCommissionStaffId || updated.assignedStaffId))?.fullName,
              sourceKind: 'TUITION',
              lineItems: [{ description: getEnrollmentCourseTitle(updated), quantity: 1, unitPrice: received, amount: received }],
              subtotalValue: received,
              discountValue: 0,
              vatRateValue: 0,
              vatAmountValue: 0,
              totalValue: received,
            });
            setShowReceiptModal(true);
            triggerAutoPrintIfConfigured();
            toast.success('Nhận học phí tự động thành công!', `Đã đối soát ${received.toLocaleString('vi-VN')}đ cho hồ sơ ${updated.orderCode || ''}.`);
            await fetchPosData();
          }
        }
      } catch {
      }
    }, 3500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pendingPosQr]);

  useEffect(() => {
    setPendingPosQr((prev) => {
      if (!prev) return null;
      if (prev.kind === 'TUITION') {
        if (tuitionMethod !== 'transfer') return null;
        if (prev.enrollmentId !== selectedEnrollment?.id) return null;
        if (prev.amount !== tuitionPaymentAmount) return null;
        return prev;
      }
      if (selectedMethod !== 'transfer') return null;
      if (prev.amount !== cartTotal) return null;
      return prev;
    });
  }, [cartTotal, selectedMethod, tuitionMethod, selectedEnrollment?.id, tuitionPaymentAmount]);

  // -------------------------------------------------------------
  // WALK-IN QUICK BOOKING MODAL HANDLER
  // -------------------------------------------------------------
  const handleCreateWalkInBooking = async () => {
    const chosenService = allServices.find((s) => s.id === walkInServiceId) || allServices[0];
    if (!chosenService) {
      toast.error('Thiếu dịch vụ', 'Không có dịch vụ đang hoạt động để tiếp nhận khách.');
      return;
    }
    if (walkInModalMode === 'DIRECT_SALE') {
      const customer = allCustomers.find((candidate) => candidate.id === walkInCustomerId) || GUEST_CUSTOMER;
      setSelectedCustomer(customer);
      setSelectedCommissionStaffId(walkInTechId || '');
      addToCart({
        id: chosenService.id,
        name: chosenService.name,
        type: 'SERVICE',
        unitPrice: Number(chosenService.price || 0),
        durationMinutes: chosenService.durationMinutes,
        serviceId: chosenService.id,
      });
      setShowWalkInModal(false);
      setActiveTab('pos');
      toast.success('Đã tiếp nhận khách walk-in', 'Dịch vụ đã được đưa thẳng vào phiếu thu, không tạo lịch hẹn trung gian.');
      return;
    }
    if (!isUuid(walkInCustomerId) || walkInCustomerId === GUEST_CUSTOMER.id || !walkInCustomerName.trim()) {
      toast.warning('Chọn hồ sơ khách hàng', 'Walk-in cần gắn với hồ sơ khách hàng có sẵn. Hãy tạo hồ sơ trước nếu khách mới.');
      return;
    }
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
    if (selectedBranchId === 'ALL') {
      toast.warning('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở chi nhánh cụ thể trước khi thu học phí.');
      return;
    }
    if (!selectedEnrollment) {
      toast.error('Lỗi', 'Chưa chọn hồ sơ học viên để thanh toán học phí.');
      return;
    }
    if (!currentShift || currentShift.branchId !== selectedBranchId) {
      toast.warning('Chưa mở ca', 'Vui lòng mở ca thu ngân trước khi thu học phí.');
      setShowOpenShiftModal(true);
      return;
    }

    const totalTuition = selectedEnrollment.finalTuition ?? selectedEnrollment.tuitionTotal;
    const paidTuition = selectedEnrollment.amountPaid;
    const due = tuitionBalance(totalTuition, paidTuition);
    if (due === null) {
      toast.error('Thiếu dữ liệu học phí', 'Vui lòng kiểm tra học phí đã chốt và số tiền đã thu trong hồ sơ tuyển sinh.');
      return;
    }
    if (due === 0) { toast.warning('Đã thu đủ học phí', 'Hồ sơ này không còn khoản phải thu.'); return; }
    if ((tuitionMethod === 'onsite' && posSettings.enable_cash === false) || (tuitionMethod === 'transfer' && posSettings.enable_vietqr === false)) {
      toast.error('Kênh thanh toán đang tắt', 'Cấu hình POS hiện không cho phép phương thức thu này.');
      return;
    }
    const amount = tuitionPaymentAmount;
    if (tuitionMethod === 'transfer' && !tuitionBankReference.trim()) {
      toast.error('Thiếu mã giao dịch', 'Nhập mã giao dịch chuyển khoản trên sao kê.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Số tiền không hợp lệ', 'Số thu phải lớn hơn 0.');
      return;
    }
    if (due > 0 && amount > due) {
      toast.error(
        'Vượt quá số nợ',
        `Số tiền thu (${amount.toLocaleString('vi-VN')}đ) không được vượt quá số còn nợ (${due.toLocaleString('vi-VN')}đ).`
      );
      return;
    }

    if (tuitionMethod === 'transfer' &&
        !window.confirm(`Xác nhận đã đối chiếu sao kê và thực nhận ${amount.toLocaleString('vi-VN')}đ cho hồ sơ ${selectedEnrollment.orderCode || selectedEnrollment.id}?\nMã giao dịch: ${tuitionBankReference.trim()}`)) return;

    paymentLock.current = true;
    setIsProcessing(true);
    try {
      const paymentMethodEnum =
        tuitionMethod === 'onsite'
          ? PaymentMethod.CASH_AT_SPA
          : PaymentMethod.BANK_TRANSFER;

      const activeBranch = selectedBranchId !== 'ALL' ? branches.find((b) => b.id === selectedBranchId) : branches[0];
      const validBranchId = isUuid(selectedEnrollment.batch?.branchId)
        ? selectedEnrollment.batch!.branchId
        : activeBranch?.id || 'aaaaaaaa-0001-0001-0001-000000000001';
      const validCustomerId = isUuid(selectedEnrollment.studentId) ? selectedEnrollment.studentId : GUEST_CUSTOMER.id;

      const collection = await posService.collectPayment({ kind: 'TUITION', enrollmentId: selectedEnrollment.id, amount,
        shiftId: currentShift.id, branchId: currentShift.branchId,
        commissionStaffId: tuitionCommissionStaffId || undefined,
        bankReference: tuitionMethod === 'transfer' ? tuitionBankReference.trim() : undefined,
        paymentMethod: paymentMethodEnum });
      if (!collection.success || !collection.data?.transactionCode) throw new Error(collection.message);
      setTuitionBankReference('');
      setPendingPosQr(null);
      const generatedInvoiceCode = collection.data.transactionCode;
      const newPaidTotal = collection.data.paidTotal;
      supabaseService.invalidateCache('tuition_transactions');
      setTuitionLedgerRevision(revision => revision + 1);
      const remainingTuition = Math.max(0, collection.data.tuitionTotal - newPaidTotal);
      const isFull = remainingTuition === 0;
      const updatedEnrollment = { ...selectedEnrollment, amountPaid: newPaidTotal };
      setAllEnrollments(rows => rows.map(row => row.id === updatedEnrollment.id ? updatedEnrollment : row));
      setSelectedEnrollment(current => current?.id === updatedEnrollment.id ? updatedEnrollment : current);
      setTuitionPaymentAmount(0);
      const shift = await posService.getActiveShift(currentShift.branchId);
      if (shift.success) setCurrentShift(shift.data);

      const tuitionSellerName = commissionStaff.find(
        (s) => s.id === (tuitionCommissionStaffId || selectedEnrollment.assignedStaffId),
      )?.fullName;
      setSelectedReceiptData({
        id: generatedInvoiceCode,
        customerName: getEnrollmentStudentName(selectedEnrollment),
        customerPhone: getEnrollmentStudentPhone(selectedEnrollment),
        branchName: activeBranch?.name || 'MLD Academy Nam Kỳ Khởi Nghĩa',
        branchAddress: activeBranch ? `${activeBranch.address}, ${activeBranch.district}, ${activeBranch.city}` : undefined,
        branchPhone: activeBranch?.phone,
        serviceName: getEnrollmentCourseTitle(selectedEnrollment),
        category: 'ACADEMY',
        method: tuitionMethod === 'onsite' ? 'Tiền mặt tại cơ sở' : 'Chuyển khoản VietQR',
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
        status: isFull ? 'Đã tất toán toàn khóa' : `Đã đóng đợt (còn nợ ${remainingTuition.toLocaleString('vi-VN')}đ)`,
        technicianName: tuitionSellerName,
        sourceKind: 'TUITION',
        customerId: validCustomerId !== GUEST_CUSTOMER.id ? validCustomerId : undefined,
        lineItems: [{ description: getEnrollmentCourseTitle(selectedEnrollment), quantity: 1, unitPrice: amount, amount }],
        subtotalValue: amount,
        discountValue: 0,
        vatRateValue: 0,
        vatAmountValue: 0,
        totalValue: amount,
      });

      setShowReceiptModal(true);
      triggerAutoPrintIfConfigured();
      toast.success('Đã thu học phí', `${amount.toLocaleString('vi-VN')}đ · ${generatedInvoiceCode}`);
      await Promise.all([fetchPosData(), loadTuitionEnrollments()]);
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
    const wsInv = workspaceInvoices.find((w) => w.id === inv.id || w.invoiceCode === inv.invoiceCode);
    const packageInfo = buildPackageInfoFromRecord(inv.userPackage || null, wsInv);
    const technicianName =
      inv.commissionStaffName ||
      wsInv?.commissionStaffName ||
      (inv.commissionStaffId ? commissionStaff.find((s) => s.id === inv.commissionStaffId)?.fullName : undefined);

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
        : inv.paymentMethod === PaymentMethod.VNPAY || (inv.paymentMethod as string) === 'CREDIT_CARD'
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
      technicianName,
      packageInfo,
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
  }, [invoices, allCustomers, branches, allEnrollments, allCourses, allBookings, treatmentPackages, workspaceInvoices, commissionStaff]);

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
      const pdfFormat: 'a5' | [number, number] =
        receiptPrintMode === 'thermal80'
          ? [80, Math.max(110, Math.round((el.scrollHeight / Math.max(1, el.scrollWidth)) * 80) + 6)]
          : 'a5';
      await exportElementToPdf(el, {
        fileName: `HoaDon_MLD_${code}`,
        orientation: 'portrait',
        format: pdfFormat,
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
      return matchSearch([c.fullName, c.phone, c.email], q);
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
              setWalkInModalMode('DIRECT_SALE');
              setWalkInCustomerId(GUEST_CUSTOMER.id);
              setWalkInCustomerName(GUEST_CUSTOMER.fullName);
              setWalkInCustomerPhone(GUEST_CUSTOMER.phone || '');
              setShowWalkInModal(true);
            }}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Tiếp nhận khách chưa có lịch và đưa dịch vụ thẳng vào phiếu thu"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Tiếp nhận khách Walk-in</span>
          </button>
        </div>
      </div>

      {/* Warning banner when 'ALL' branches is selected */}
      {selectedBranchId === 'ALL' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Đang ở chế độ xem tất cả cơ sở:</span> Thu ngân bắt buộc phải chọn một chi nhánh cụ thể để mở ca và ghi nhận thanh toán hóa đơn / học phí.
            </div>
          </div>
          {branches.length > 0 && (
            <button
              type="button"
              onClick={() => handleBranchSelect(branches[0].id)}
              className="px-3 py-1.5 bg-[#985018] hover:bg-[#854412] text-white rounded-xl font-bold whitespace-nowrap cursor-pointer shadow-xs self-start sm:self-center"
            >
              Chọn {branches[0].name}
            </button>
          )}
        </div>
      )}

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
              onClick={async () => {
                const latest = await posService.getActiveShift(currentShift.branchId);
                if (!latest.success || !latest.data) {
                  toast.error('Không thể đối soát ca', latest.message || 'Không tải được số liệu ca mới nhất.');
                  return;
                }
                setCurrentShift(latest.data);
                setShiftClosingCash(latest.data.systemCash ?? latest.data.openingCash);
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
      <AdminTabs
        ariaLabel="Nguồn giao dịch và chế độ POS"
        variant="pill"
        activeTab={
          activeTab === 'pos'
            ? catalogCategory === 'PACKAGE'
              ? 'package'
              : 'pos'
            : activeTab
        }
        onChange={(tabId) => {
          if (tabId === 'pos') {
            setActiveTab('pos');
            setCatalogCategory('ALL');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'pos');
              next.delete('source');
              return next;
            });
          } else if (tabId === 'package') {
            setActiveTab('pos');
            setCatalogCategory('PACKAGE');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'pos');
              next.set('source', 'package');
              return next;
            });
          } else if (tabId === 'queue') {
            setActiveTab('queue');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'queue');
              return next;
            });
          } else if (tabId === 'tuition') {
            setActiveTab('tuition');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'tuition');
              return next;
            });
          } else if (tabId === 'receipts') {
            setActiveTab('receipts');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'receipts');
              return next;
            });
          }
        }}
        tabs={[
          {
            id: 'pos',
            label: 'Walk-in / Bán lẻ',
            icon: CreditCard,
            count: posCart.length > 0 ? posCart.length : undefined,
          },
          {
            id: 'queue',
            label: 'Lịch hẹn cần thu',
            icon: Clock,
            count: pendingBookings.length,
            badge: completedQueueCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                ★ {completedQueueCount} xong
              </span>
            ) : undefined,
          },
          {
            id: 'package',
            label: 'Đăng ký gói liệu trình',
            icon: Sparkles,
          },
          {
            id: 'tuition',
            label: `Thu học phí (${tuitionReceiptsList.length || allEnrollments.length})`,
            icon: GraduationCap,
          },
          {
            id: 'receipts',
            label: 'Hóa đơn & Đối soát',
            icon: Receipt,
            count: pastReceipts.length,
          },
        ]}
      />

      {/* ========================================================================= */}
      {/* TAB 1: BÁN HÀNG TẠI QUẦY (POS WORKSTATION - MENU + CART + CHECKOUT)       */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {/* 3-Step Guidance Bar */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                  selectedCustomer.id !== GUEST_CUSTOMER.id
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                    : 'border-[#E8DFD8] bg-[#FAF8F5] text-[#2C241E]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    selectedCustomer.id !== GUEST_CUSTOMER.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#EFE4D9] text-[#8A4F23]'
                  }`}
                >
                  1
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold">1. Khách hàng</div>
                  <div className="text-[10px] text-[#73675F] truncate">
                    {selectedCustomer.id !== GUEST_CUSTOMER.id ? `✓ ${selectedCustomer.fullName}` : 'Khách vãng lai'}
                  </div>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                  posCart.length > 0
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                    : 'border-[#E8DFD8] bg-[#FAF8F5] text-[#2C241E]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    posCart.length > 0 ? 'bg-emerald-600 text-white' : 'bg-[#EFE4D9] text-[#8A4F23]'
                  }`}
                >
                  2
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold">2. Dịch vụ / Gói</div>
                  <div className="text-[10px] text-[#73675F] truncate">
                    {posCart.length > 0
                      ? `✓ ${posCart.length} mục (${cartTotal.toLocaleString('vi-VN')}đ)`
                      : 'Chưa chọn mục nào'}
                  </div>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                  currentShift && posCart.length > 0 && selectedBranchId !== 'ALL'
                    ? 'border-sky-200 bg-sky-50 text-sky-950'
                    : 'border-[#E8DFD8] bg-[#FAF8F5] text-[#2C241E]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    currentShift && posCart.length > 0 && selectedBranchId !== 'ALL'
                      ? 'bg-sky-600 text-white'
                      : 'bg-[#EFE4D9] text-[#8A4F23]'
                  }`}
                >
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold">3. Kiểm tra & Thu tiền</div>
                  <div className="text-[10px] text-[#73675F] truncate">
                    {!currentShift
                      ? 'Cần mở ca thu ngân'
                      : selectedBranchId === 'ALL'
                      ? 'Cần chọn chi nhánh'
                      : posCart.length === 0
                      ? 'Chờ nạp món'
                      : `Sẵn sàng thu (${selectedMethod === 'onsite' ? 'Tiền mặt' : selectedMethod === 'transfer' ? 'VietQR' : 'Thẻ POS'})`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Locked Booking Active Banner */}
          {booking && (
            <div className="rounded-2xl border border-sky-300 bg-sky-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold shrink-0">
                  🔒
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sky-950 text-sm">
                      Đang quyết toán cho Lịch hẹn #{booking.bookingCode}
                    </span>
                    {booking.sessionStatus === 'COMPLETED' || (booking as any).session_status === 'COMPLETED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Chuyên môn đã hoàn tất · Sẽ tự động kết thúc lịch hẹn
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        ⏳ Chuyên môn đang thực hiện · Lịch hẹn sẽ giữ trạng thái đang phục vụ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-sky-800 mt-1">
                    Khách hàng: <strong>{selectedCustomer.fullName}</strong> ({selectedCustomer.phone || 'Không có SĐT'}) ·
                    Kỹ thuật viên: <strong>{commissionStaff.find(s => s.id === selectedCommissionStaffId)?.fullName || 'Chưa gán'}</strong> ·
                    Dịch vụ & giá được cố định bảo vệ theo lịch hẹn.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="px-3.5 py-2 rounded-xl border border-sky-300 bg-white hover:bg-sky-100 text-sky-900 font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-center shadow-2xs"
              >
                ✕ Thoát lịch hẹn (Đơn tự do)
              </button>
            </div>
          )}

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
                        disabled={Boolean(booking)}
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
                        title={booking ? 'Đang quyết toán theo lịch hẹn. Bấm "Thoát lịch hẹn" nếu muốn bán đơn tự do.' : undefined}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          booking
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : inCartItem
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-[#985018] hover:bg-[#854412] text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{booking ? 'Khóa theo lịch' : inCartItem ? `Thêm (${inCartItem.quantity})` : 'Chọn'}</span>
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
                  {booking && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                      🔒 Khóa theo lịch
                    </span>
                  )}
                </label>
                {!booking && (
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
                )}
              </div>

              {/* Searchable Customer Input & Combobox Dropdown */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={customerSearchInputRef}
                    type="text"
                    disabled={Boolean(booking)}
                    value={customerSearchKeyword}
                    onFocus={() => { if (!booking) setShowCustomerDropdown(true); }}
                    onChange={(e) => {
                      setCustomerSearchKeyword(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    placeholder={booking ? `Đang khóa theo lịch #${booking.bookingCode}` : 'Gõ tìm tên, SĐT khách (vd: Hoàng, 091...)'}
                    className="w-full h-10 pl-9 pr-8 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-semibold text-[#2C241E] focus:bg-white focus:outline-none focus:border-[#985018] transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                  {!booking && (customerSearchKeyword ? (
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
                  ))}
                </div>

                {/* Dropdown Results */}
                {showCustomerDropdown && !booking && (
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
                      </button>

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
                    <div className="font-bold text-[#2C241E] flex items-center gap-1.5 flex-wrap">
                      <span>{selectedCustomer.fullName}</span>
                      {selectedCustomer.id === GUEST_CUSTOMER.id ? (
                        <span className="text-[10px] px-1 py-0.2 bg-[#EFE4D9] text-[#73675F] rounded font-medium">Vãng lai</span>
                      ) : customerBenefits?.loyaltySettings.isActive ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold border border-amber-200">
                          {customerBenefits.rewardPoints.toLocaleString('vi-VN')} điểm
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-[#73675F]">{selectedCustomer.phone || 'Không có SĐT'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCustomer.id !== GUEST_CUSTOMER.id && !booking && (
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
                  booking ? (
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                      Đơn lịch hẹn
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Xóa hết
                    </button>
                  )
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
                      {booking ? (
                        <span className="font-bold text-slate-700 text-xs px-2 py-1 bg-white rounded-lg border border-[#E8DFD8]">
                          x{item.quantity}
                        </span>
                      ) : (
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
                      )}

                      {/* Line Subtotal */}
                      <div className="text-right">
                        <div className="font-bold text-[#2C241E]">
                          {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                        </div>
                        {!booking && (
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-[10px] text-rose-500 hover:text-rose-700 cursor-pointer mt-0.5 inline-block"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C241E] mb-1">
                Nhân viên bán hàng / KTV hưởng hoa hồng:
              </label>
              <div className="relative">
                <select
                  value={selectedCommissionStaffId}
                  onChange={(e) => {
                    commissionStaffManuallySet.current = true;
                    setSelectedCommissionStaffId(e.target.value);
                  }}
                  className="w-full h-9 px-3 pr-8 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer appearance-none"
                >
                  <option value="">-- Tùy chọn: Chọn nhân viên bán hàng --</option>
                  {commissionStaff.map((st) => (
                    <option key={st.id} value={st.id}>
                      👤 {st.fullName} (DV {st.staffProfile.commissionRate ?? 0}% · Gói {st.staffProfile.packageCommissionRate ?? 0}% · SP {st.staffProfile.productCommissionRate ?? 0}%)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {renderCommissionStaffHint()}
            </div>

            {/* Pricing Breakdown & VAT */}
            <div className="border border-[#EFE4D9] rounded-2xl p-3.5 space-y-2 text-xs bg-[#FAF8F5]">
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Tạm tính</span>
                <span className="font-semibold text-[#2C241E]">{cartSubtotal.toLocaleString('vi-VN')}đ</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[#73675F] gap-2">
                  <div>
                    <span>Chiết khấu / Ưu đãi</span>
                    {packageHasPreconfiguredDiscount && (
                      <div className="text-[10px] text-amber-700 font-medium">Gói đã áp dụng giá ưu đãi niêm yết</div>
                    )}
                    {booking?.id && (
                      <div className="text-[10px] text-sky-800 font-medium">Chiết khấu theo lịch hẹn đã xác nhận</div>
                    )}
                    {appliedCouponCode && (
                      <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                        <span>Đang áp dụng mã {appliedCouponCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedCouponCode('');
                            setSelectedUserVoucherId('');
                            setCouponInput('');
                            setDiscountAmount(0);
                            setDiscountReason('');
                          }}
                          className="text-rose-600 hover:underline cursor-pointer"
                        >
                          Bỏ mã
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    <div className="flex items-center gap-1">
                      <input
                        ref={couponInputRef}
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setSelectedUserVoucherId('');
                          setCouponInput(e.target.value.toUpperCase());
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            applyCouponCode(couponInput);
                          }
                        }}
                        onBlur={(e) => {
                          if (!selectedUserVoucherId && e.target.value.trim() && e.target.value.trim().toUpperCase() !== appliedCouponCode) {
                            applyCouponCode(e.target.value);
                          }
                        }}
                        placeholder="Mã giảm giá / voucher"
                        disabled={isTreatmentRegistration || packageHasPreconfiguredDiscount || Boolean(booking?.id)}
                        className="w-28 py-0.5 px-1.5 border border-[#E8DFD8] bg-white rounded text-[11px] text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:bg-[#F1ECE7]"
                      />
                      <button
                        type="button"
                        disabled={isTreatmentRegistration || packageHasPreconfiguredDiscount || Boolean(booking?.id) || !couponInput.trim()}
                        onClick={() => applyCouponCode(couponInput)}
                        className="px-2 py-0.5 rounded border border-[#985018]/30 bg-[#FAF0E4] text-[10px] font-bold text-[#8A4F23] hover:bg-[#F3E2CE] disabled:opacity-40 cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={discountAmount || ''}
                      onChange={(e) => {
                        setAppliedCouponCode('');
                        setSelectedUserVoucherId('');
                        setDiscountAmount(Math.max(0, Number(e.target.value) || 0));
                      }}
                      placeholder="0"
                      disabled={isTreatmentRegistration || packageHasPreconfiguredDiscount || Boolean(booking?.id)}
                      title={
                        booking?.id
                          ? 'Chiết khấu và ưu đãi được áp dụng theo lịch hẹn đã đặt.'
                          : isTreatmentRegistration || packageHasPreconfiguredDiscount
                          ? 'Gói liệu trình sử dụng đúng giá ưu đãi đã cấu hình của gói.'
                          : undefined
                      }
                      className="w-20 text-right py-0.5 px-1.5 border border-[#E8DFD8] bg-white rounded text-xs font-semibold text-emerald-700 focus:outline-none focus:border-[#985018] disabled:bg-[#F1ECE7] disabled:text-[#9A8E84] disabled:cursor-not-allowed"
                    />
                    <span className="font-bold text-emerald-700">đ</span>
                  </div>
                </div>
                {!isTreatmentRegistration &&
                  !packageHasPreconfiguredDiscount &&
                  !booking?.id &&
                  !benefitsLoading &&
                  ((customerBenefits?.userVouchers?.length || 0) > 0 || (customerBenefits?.publicCoupons?.length || 0) > 0) && (
                    <div className="space-y-1 pt-0.5">
                      <div className="text-[10px] font-semibold text-[#8C7A6B]">Chọn nhanh ưu đãi khả dụng:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {customerBenefits?.userVouchers.map((uv) => {
                          const active = selectedUserVoucherId === uv.id;
                          return (
                            <button
                              key={`uv-${uv.id}`}
                              type="button"
                              onClick={() =>
                                applyBenefitCoupon({
                                  code: uv.code,
                                  title: uv.title,
                                  discountPercent: uv.discountPercent,
                                  discountAmount: uv.discountAmount,
                                  maxDiscountAmount: uv.maxDiscountAmount,
                                  minOrderAmount: uv.minOrderAmount,
                                  userVoucherId: uv.id,
                                })
                              }
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#985018] text-white border-[#985018]'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              Ví khách · {uv.code} ({uv.discountPercent > 0 ? `-${uv.discountPercent}%` : `-${uv.discountAmount.toLocaleString('vi-VN')}đ`})
                            </button>
                          );
                        })}
                        {customerBenefits?.publicCoupons.map((cp) => {
                          const active = !selectedUserVoucherId && appliedCouponCode === cp.code;
                          return (
                            <button
                              key={`cp-${cp.id}`}
                              type="button"
                              onClick={() => applyBenefitCoupon(cp)}
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#985018] text-white border-[#985018]'
                                  : 'bg-white text-[#8A4F23] border-[#E8DFD8] hover:bg-[#FAF0E4]'
                              }`}
                            >
                              {cp.code} ({cp.discountPercent > 0 ? `-${cp.discountPercent}%` : `-${cp.discountAmount.toLocaleString('vi-VN')}đ`})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                {selectedCustomer.id !== GUEST_CUSTOMER.id &&
                  !isTreatmentRegistration &&
                  !cartHasPackage &&
                  !booking?.id &&
                  customerBenefits?.loyaltySettings.isActive &&
                  customerBenefits.rewardPoints > 0 && (
                    <div className="pt-2 border-t border-dashed border-[#E8DFD8] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[#73675F]">
                          <span className="font-semibold text-[#2C241E]">Đổi điểm thưởng</span>
                          <span className="block text-[10px] text-[#8C7A6B]">
                            Có {customerBenefits.rewardPoints.toLocaleString('vi-VN')} điểm · 1 điểm = {customerBenefits.loyaltySettings.redeemValuePerPoint.toLocaleString('vi-VN')}đ (tối đa {customerBenefits.loyaltySettings.maxRedeemPercentPerOrder}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={maxRedeemablePts}
                            value={effectiveRedeemPoints || ''}
                            onChange={(e) => setRedeemPoints(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            placeholder="0 điểm"
                            className="w-16 text-right py-0.5 px-1.5 border border-[#E8DFD8] bg-white rounded text-[11px] font-semibold text-[#985018] focus:outline-none focus:border-[#985018]"
                          />
                          <button
                            type="button"
                            disabled={maxRedeemablePts <= 0}
                            onClick={() => setRedeemPoints(maxRedeemablePts)}
                            className="px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-[10px] font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                          >
                            Dùng tối đa ({maxRedeemablePts})
                          </button>
                        </div>
                      </div>
                      {pointsDiscountValue > 0 && (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800">
                          <span>Giảm trừ từ {effectiveRedeemPoints.toLocaleString('vi-VN')} điểm</span>
                          <span>-{pointsDiscountValue.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                    </div>
                  )}
                {posSettings.require_discount_reason && discountAmount > 0 && !appliedCouponCode && !booking?.id && (
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="Nhập lý do giảm giá thủ công (bắt buộc theo cấu hình POS)..."
                    className="w-full py-1 px-2 border border-amber-300 bg-amber-50/40 rounded text-[11px] text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                )}
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
                  disabled={posSettings.enable_cash === false}
                  onClick={() => setSelectedMethod('onsite')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  disabled={posSettings.enable_vietqr === false}
                  onClick={() => setSelectedMethod('transfer')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  disabled={posSettings.enable_card_pos === false}
                  onClick={() => setSelectedMethod('online')}
                  className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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

            {selectedMethod === 'transfer' && cartTotal > 0 && (() => {
              const activeQr = pendingPosQr && pendingPosQr.kind !== 'TUITION' ? pendingPosQr : null;
              return (
                <div className="p-3 bg-white rounded-2xl border border-sky-200 shadow-xs space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-sky-800 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{activeQr ? 'QR đang chờ tiền tự động' : 'Thanh toán VietQR tự động'}</span>
                    </span>
                    {activeQr ? (
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded flex items-center gap-1 border border-sky-200">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Đang chờ webhook
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Chưa kích hoạt QR
                      </span>
                    )}
                  </div>

                  {activeQr ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={activeQr.qrUrl}
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
                              onClick={() => copyToClipboard(activeQr.bankAccountNo, 'STK')}
                              className="font-mono font-bold text-sky-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {activeQr.bankAccountNo} <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div>
                            <span className="text-slate-500">Chủ TK:</span> <strong>{activeQr.bankAccountName}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Số tiền:</span>
                            <strong className="text-emerald-700 font-bold">{cartTotal.toLocaleString('vi-VN')}đ</strong>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-500">Nội dung CK:</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(activeQr.transferContent, 'Nội dung')}
                              className="font-mono text-[10px] font-bold text-slate-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              {activeQr.transferContent} <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={isCreatingPendingQr}
                          onClick={() => handleStartAutoPayQr('POS')}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isCreatingPendingQr ? 'animate-spin' : ''}`} />
                          <span>Tạo lại QR tự động</span>
                        </button>
                        {activeQr.checkoutUrl && (
                          <a
                            href={activeQr.checkoutUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <span>Cổng PayOS</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 text-[11px] text-slate-600">
                      <p>Nhấn nút bên dưới để phát hành hóa đơn chờ <code>HD-POS-...</code> và tạo mã QR đối soát tự động qua SePay / PayOS.</p>
                      <button
                        type="button"
                        disabled={isCreatingPendingQr}
                        onClick={() => handleStartAutoPayQr('POS')}
                        className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <QrCode className={`w-3.5 h-3.5 ${isCreatingPendingQr ? 'animate-spin' : ''}`} />
                        <span>Tạo QR đối soát tự động ({cartTotal.toLocaleString('vi-VN')}đ)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Primary Action Button */}
            {(() => {
              if (!currentShift) {
                return (
                  <button
                    type="button"
                    onClick={() => setShowOpenShiftModal(true)}
                    className="w-full py-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Mở ca thu ngân để thanh toán</span>
                  </button>
                );
              }

              if (selectedBranchId === 'ALL') {
                return (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Chọn chi nhánh cụ thể trước khi thanh toán</span>
                  </button>
                );
              }

              if (posCart.length === 0) {
                return (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-400 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Chọn dịch vụ / gói để thanh toán</span>
                  </button>
                );
              }

              if (cartHasPackage && selectedCustomer.id === GUEST_CUSTOMER.id) {
                return (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed flex items-center justify-center gap-2"
                    title="Gói liệu trình bắt buộc gắn với khách hàng có định danh."
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Cần chọn khách hàng định danh cho gói liệu trình</span>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessPosPayment}
                  className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                    isProcessing
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
                      <span>
                        {booking ? 'Quyết toán lịch hẹn' : 'Xác nhận thanh toán & In hóa đơn'} ({cartTotal.toLocaleString('vi-VN')}đ)
                      </span>
                    </>
                  )}
                </button>
              );
            })()}
            <div className="text-[10px] text-center text-[#8C7A6B]">
              Phím tắt nhanh: <kbd className="px-1 py-0.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded font-mono">F2</kbd> Tìm khách ·{' '}
              <kbd className="px-1 py-0.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded font-mono">F4</kbd> Nhập mã ·{' '}
              <kbd className="px-1 py-0.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded font-mono">F9</kbd> Thu tiền
            </div>
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
              {sortedPendingBookings.map((bk) => {
                const srv = bk.items?.[0]?.service;
                const effectiveDiscount = getBookingEffectiveDiscount(bk);
                const srvPrice = Number(bk.finalPrice ?? (srv?.price !== undefined ? Math.max(0, srv.price - effectiveDiscount) : undefined) ?? bk.baseTotal ?? 500000);
                const srvName = srv?.name || (bk as any).serviceName || 'Trị liệu Dẫn lưu MLD';
                const custName = bk.customer?.fullName || bk.bookedForName || 'Khách hàng';
                const custPhone = bk.customer?.phone || bk.bookedForPhone || '--';
                const isSessionDone = bk.sessionStatus === 'COMPLETED' || (bk as any).session_status === 'COMPLETED';

                return (
                  <div
                    key={bk.id}
                    className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      isSessionDone
                        ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-500 shadow-2xs'
                        : 'border-[#EFE4D9] hover:border-[#985018] bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-bold text-[#8A4F23] bg-white px-2 py-0.5 rounded border border-[#E8DFD8]">
                        {bk.bookingCode}
                      </span>
                      {isSessionDone ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ★ CHUYÊN MÔN HOÀN TẤT
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          ⏳ Đang thực hiện
                        </span>
                      )}
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
                      <div>
                        <div className="text-sm font-black text-[#985018]">
                          {srvPrice.toLocaleString('vi-VN')}đ
                        </div>
                        {effectiveDiscount > 0 && (
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            Đã trừ ưu đãi {effectiveDiscount.toLocaleString('vi-VN')}đ
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => loadBookingIntoCart(bk)}
                        className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                          isSessionDone
                            ? 'bg-emerald-700 hover:bg-emerald-800'
                            : 'bg-[#985018] hover:bg-[#854412]'
                        }`}
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
            Học phí thực thu: <span data-testid="tuition-net-total" className="text-[#985018]">{tuitionLedgerError ? <button type="button" className="underline" onClick={() => { setTuitionLedgerError(false); setTuitionLedgerRevision(revision => revision + 1); }}>Tải lại số thực thu</button> : tuitionLedger === null ? 'Đang tải…' : `${tuitionLedger.filter(row => row.paymentStatus === PaymentStatus.PAID && (selectedBranchId === 'ALL' || row.branchId === selectedBranchId)).reduce((sum, row) => sum + (row.transactionType === 'REFUND' ? -Math.abs(row.amount) : row.amount), 0).toLocaleString('vi-VN')}đ`}</span>
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

              {enrollmentLoad === 'error' ? (
                <p role="alert" className="text-sm text-rose-700">
                  Không tải được hồ sơ học viên.{' '}
                  <button type="button" className="underline" onClick={() => { handledTuitionReference.current = ''; void loadTuitionEnrollments(); }}>Tải lại</button>
                </p>
              ) : tuitionReference && !selectedEnrollment && tuitionSearchTerm === (tuitionOrder || tuitionReference) ? (
                <p role="status" className="text-xs text-[#73675F]">
                  {enrollmentLoad === 'loading' ? 'Đang mở hồ sơ học viên…' : 'Không tìm được hồ sơ khớp duy nhất. Kiểm tra mã hoặc chọn hồ sơ bằng ô tìm kiếm.'}
                </p>
              ) : null}
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
                            enr.id,
                            getEnrollmentCourseTitle(enr),
                          ],
                          tuitionSearchTerm
                        );
                      })
                      .map((enr) => {
                        const sName = getEnrollmentStudentName(enr);
                        const sPhone = getEnrollmentStudentPhone(enr);
                        const cTitle = getEnrollmentCourseTitle(enr);
                        const total = (enr.finalTuition ?? enr.tuitionTotal ?? 0);
                        const paid = enr.amountPaid || 0;
                        const due = Math.max(0, total - paid);
                        const isSelected = selectedEnrollment?.id === enr.id;

                        return (
                          <div
                            key={enr.id}
                            onClick={() => {
                              setSelectedEnrollment(enr);
                              setTuitionCommissionStaffId(enr.assignedStaffId || '');
                              setTuitionPaymentAmount(due);
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
                              setTuitionCommissionStaffId(enr.assignedStaffId || '');
                              const total = (enr.finalTuition ?? enr.tuitionTotal ?? 0);
                              const paid = enr.amountPaid || 0;
                              setTuitionPaymentAmount(Math.max(0, total - paid));
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
                        {(selectedEnrollment.finalTuition ?? selectedEnrollment.tuitionTotal ?? 0).toLocaleString('vi-VN')}đ
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
                          (selectedEnrollment.finalTuition ?? selectedEnrollment.tuitionTotal ?? 0) - (selectedEnrollment.amountPaid || 0)
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

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">
                  Nhân viên tư vấn / bán khóa học hưởng hoa hồng:
                </label>
                <div className="relative">
                  <select
                    value={tuitionCommissionStaffId}
                    onChange={(e) => setTuitionCommissionStaffId(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-xl border border-[#E8DFD8] bg-[#FAF8F5] text-xs font-medium text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer appearance-none"
                  >
                    <option value="">-- Giữ theo người phụ trách hồ sơ / Không chọn --</option>
                    {commissionStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        👤 {st.fullName} ({st.staffProfile.commissionRate ?? 0}%)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {renderCommissionStaffHint()}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Hình thức nộp phí:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={posSettings.enable_cash === false}
                    onClick={() => setTuitionMethod('onsite')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      tuitionMethod === 'onsite'
                        ? 'bg-[#985018] text-white border-[#985018]'
                        : 'bg-white text-[#73675F] border-[#E8DFD8]'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Tiền mặt tại cơ sở</span>
                  </button>
                  <button
                    type="button"
                    disabled={posSettings.enable_vietqr === false}
                    onClick={() => setTuitionMethod('transfer')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      tuitionMethod === 'transfer'
                        ? 'bg-[#985018] text-white border-[#985018]'
                        : 'bg-white text-[#73675F] border-[#E8DFD8]'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Chuyển khoản đã nhận</span>
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
                        const total = selectedEnrollment.finalTuition ?? selectedEnrollment.tuitionTotal ?? 0;
                        const paid = selectedEnrollment.amountPaid || 0;
                        const due = Math.max(0, total - paid);
                        setTuitionPaymentAmount(due);
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
                  disabled={!selectedEnrollment || isProcessing}
                  value={tuitionPaymentAmount || ''}
                  onChange={(e) => setTuitionPaymentAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Nhập số tiền học phí..."
                  className="w-full px-3 py-2.5 border border-[#E8DFD8] rounded-xl text-base font-bold text-[#985018] focus:outline-none focus:border-[#985018] shadow-2xs"
                />

                {/* Quick Amount Suggestion Chips */}
                {selectedEnrollment && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {(() => {
                      const total = selectedEnrollment.finalTuition ?? selectedEnrollment.tuitionTotal ?? 0;
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

              {(() => {
                if (!selectedEnrollment) {
                  return <p className="text-xs text-[#73675F]">Chọn hồ sơ học viên để tiếp tục.</p>;
                }

                if (!currentShift || currentShift.branchId !== selectedBranchId) {
                  return (
                    <button
                      type="button"
                      onClick={() => setShowOpenShiftModal(true)}
                      className="w-full py-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Mở ca thu ngân để thu học phí</span>
                    </button>
                  );
                }

                if (selectedBranchId === 'ALL') {
                  return (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>Chọn chi nhánh cụ thể trước khi thu học phí</span>
                    </button>
                  );
                }

                const due = selectedEnrollment
                  ? Math.max(0, (selectedEnrollment.finalTuition ?? selectedEnrollment.tuitionTotal ?? 0) - (selectedEnrollment.amountPaid || 0))
                  : 0;
                if (due === 0) return <p className="text-xs text-[#73675F]">Hồ sơ không có số dư học phí để thu.</p>;
                const isOverdue = tuitionPaymentAmount > due;

                if (isOverdue) {
                  return (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Vượt quá số còn nợ ({due.toLocaleString('vi-VN')}đ)</span>
                    </button>
                  );
                }

                return (
                  <>
                  {tuitionMethod === 'transfer' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-sky-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-sky-900 flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Chuyển khoản tự động (PayOS / SePay)</span>
                          </span>
                          {pendingPosQr?.kind === 'TUITION' && pendingPosQr.enrollmentId === selectedEnrollment.id && (
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              Đang chờ tự động
                            </span>
                          )}
                        </div>
                        {pendingPosQr?.kind === 'TUITION' && pendingPosQr.enrollmentId === selectedEnrollment.id && (
                          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-[#EFE4D9]">
                            <img src={pendingPosQr.qrUrl} alt="VietQR Học phí" className="w-20 h-20 object-contain rounded" />
                            <div className="text-[11px] space-y-0.5 flex-1">
                              <div><strong>MBBank · {pendingPosQr.bankAccountNo}</strong></div>
                              <div>Số tiền: <strong className="text-emerald-700">{pendingPosQr.amount.toLocaleString('vi-VN')}đ</strong></div>
                              <div>Nội dung: <code className="font-mono font-bold text-[#985018]">{pendingPosQr.transferContent}</code></div>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={isCreatingPendingQr || tuitionPaymentAmount <= 0}
                          onClick={() => handleStartAutoPayQr('TUITION')}
                          className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{pendingPosQr?.kind === 'TUITION' && pendingPosQr.enrollmentId === selectedEnrollment.id ? 'Cập nhật lại QR học phí tự động' : 'Tạo QR học phí tự động đối soát'}</span>
                        </button>
                      </div>
                      <label className="block space-y-1 text-xs font-semibold">
                        Hoặc nhập mã giao dịch ngân hàng trên sao kê (ghi nhận tay)
                        <input
                          className="block w-full rounded-xl border border-[#E8DFD8] px-3 py-2"
                          value={tuitionBankReference}
                          onChange={event => setTuitionBankReference(event.target.value)}
                          maxLength={128}
                          autoComplete="off"
                        />
                      </label>
                    </div>
                  )}
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
                  </>
                );
              })()}
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
                                      branchName: r.branchName,
                                      serviceName: r.courseTitle,
                                      category: r.category,
                                      method: r.method,
                                      amount: r.amount,
                                      subtotal: `${r.subtotal.toLocaleString('vi-VN')}đ`,
                                      discount: `${r.discountAmount.toLocaleString('vi-VN')}đ`,
                                      date: r.date,
                                      status: r.status,
                                      technicianName: r.technicianName,
                                      lineItems: [{ description: r.courseTitle, quantity: 1, unitPrice: r.subtotal, amount: r.subtotal }],
                                      subtotalValue: r.subtotal,
                                      discountValue: r.discountAmount,
                                      vatRateValue: 0,
                                      vatAmountValue: 0,
                                      totalValue: r.rawAmount,
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
                          const total = (enr.finalTuition ?? enr.tuitionTotal ?? 0);
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
                                    setTuitionPaymentAmount(due);
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
              <option value={PaymentMethod.VNPAY}>Quẹt thẻ POS</option>
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
                            const invoice = invoices.find((item) => item.id === r.rawId);
                            const branch = branches.find((item) => item.id === r.branchId);
                            setSelectedReceiptData({
                              id: r.id,
                              customerName: r.customerName,
                              customerPhone: r.customerPhone,
                              branchName: r.branchName,
                              serviceName: r.content,
                              category: r.category,
                              method: r.method,
                              amount: `${r.netAmount.toLocaleString('vi-VN')}đ`,
                              subtotal: `${r.subtotal.toLocaleString('vi-VN')}đ`,
                              discount: `${r.discountAmount.toLocaleString('vi-VN')}đ`,
                              date: r.date,
                              status: r.status,
                              technicianName: r.technicianName,
                              userPackageId: invoice?.userPackageId || undefined,
                              packageInfo: r.packageInfo || null,
                              branchAddress: branch ? `${branch.address}, ${branch.district}, ${branch.city}` : undefined,
                              branchPhone: branch?.phone,
                              lineItems: invoice?.items?.map((item) => ({ description: item.itemName, quantity: Number(item.quantity || 1), unitPrice: Number(item.unitPrice || 0), amount: Number(item.amount || 0) })) || [{ description: r.content, quantity: 1, unitPrice: r.subtotal, amount: r.subtotal }],
                              subtotalValue: r.subtotal,
                              discountValue: r.discountAmount,
                              pointsRedeemedValue: Number(invoice?.pointsRedeemedAmount || 0),
                              vatRateValue: Number(invoice?.vatRate || 0),
                              vatAmountValue: Number(invoice?.vatAmount || 0),
                              totalValue: r.netAmount,
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
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#DDE5DD] bg-white text-xs shadow-2xl">
            <div className="no-print relative border-b border-[#DDE5DD] bg-white px-6 py-4 text-left flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#153F3E]">
                  {selectedReceiptData.userPackageId ? 'Liệu trình đã được kích hoạt!' : 'Thanh toán thành công!'}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#5F7473]">
                  {selectedReceiptData.userPackageId ? 'Hóa đơn và hồ sơ liệu trình đã liên kết thành công' : 'Biên lai điện tử MLD Healthcare & Spa'}
                </p>
              </div>
              <div className="flex items-center gap-2 pr-8">
                <button
                  type="button"
                  onClick={() => setReceiptPrintMode('thermal80')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    receiptPrintMode === 'thermal80'
                      ? 'bg-[#176F6C] text-white border-[#176F6C]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Máy in POS 80mm
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPrintMode('a5')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    receiptPrintMode === 'a5'
                      ? 'bg-[#176F6C] text-white border-[#176F6C]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Khổ A5
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto bg-[#DCE4DE] p-3 sm:p-6">
              <MLDInvoiceDocument mode={receiptPrintMode} data={{
                id: selectedReceiptData.id,
                issuedAt: selectedReceiptData.date,
                customerName: selectedReceiptData.customerName,
                customerPhone: selectedReceiptData.customerPhone,
                customerEmail: selectedReceiptData.customerEmail,
                branchName: selectedReceiptData.branchName,
                branchAddress: selectedReceiptData.branchAddress,
                branchPhone: selectedReceiptData.branchPhone,
                headerText: posSettings.receipt_header_text,
                footerNote: posSettings.receipt_footer_note,
                hotline: generalSettings.hotline,
                packageInfo: selectedReceiptData.packageInfo || null,
                paymentMethod: selectedReceiptData.method,
                status: selectedReceiptData.status,
                shiftCode: selectedReceiptData.shiftCode,
                technicianName: selectedReceiptData.technicianName,
                lines: selectedReceiptData.lineItems?.length ? selectedReceiptData.lineItems : [{
                  description: selectedReceiptData.serviceName,
                  quantity: 1,
                  unitPrice: selectedReceiptData.subtotalValue ?? (parseVnd(selectedReceiptData.subtotal) || parseVnd(selectedReceiptData.amount)),
                  amount: selectedReceiptData.subtotalValue ?? (parseVnd(selectedReceiptData.subtotal) || parseVnd(selectedReceiptData.amount)),
                }],
                subtotal: selectedReceiptData.subtotalValue ?? (parseVnd(selectedReceiptData.subtotal) || parseVnd(selectedReceiptData.amount)),
                discount: selectedReceiptData.discountValue ?? parseVnd(selectedReceiptData.discount),
                pointsRedeemed: selectedReceiptData.pointsRedeemedValue ?? 0,
                vatRate: selectedReceiptData.vatRateValue ?? parseVnd(selectedReceiptData.vatRateText),
                vatAmount: selectedReceiptData.vatAmountValue ?? parseVnd(selectedReceiptData.vatAmountText),
                total: selectedReceiptData.totalValue ?? parseVnd(selectedReceiptData.amount),
              }} />
            </div>

            {/* Modal Actions */}
            <div className="no-print space-y-2 border-t border-[#DDE5DD] bg-white p-4">
              {/* Branch 1: Package Registration */}
              {(selectedReceiptData.userPackageId || selectedReceiptData.sourceKind === 'PACKAGE') && (
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
                  className="w-full py-2.5 rounded-xl bg-[#985018] hover:bg-[#854412] font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt buổi đầu tiên</span>
                </button>
              )}

              {/* Branch 2: Walk-in Direct Sale */}
              {selectedReceiptData.sourceKind === 'WALK_IN' && !selectedReceiptData.userPackageId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    if (selectedReceiptData.customerId && selectedReceiptData.customerId !== GUEST_CUSTOMER.id) {
                      setWalkInCustomerId(selectedReceiptData.customerId);
                      setWalkInCustomerName(selectedReceiptData.customerName);
                      setWalkInCustomerPhone(selectedReceiptData.customerPhone || '');
                    }
                    if (selectedReceiptData.serviceId) {
                      setWalkInServiceId(selectedReceiptData.serviceId);
                    }
                    setWalkInModalMode('SCHEDULE');
                    setShowWalkInModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt lịch sử dụng dịch vụ ngay (DRC)</span>
                </button>
              )}

              {/* Branch 3: Booking Checkout */}
              {selectedReceiptData.sourceKind === 'BOOKING' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    if (selectedReceiptData.customerId && selectedReceiptData.customerId !== GUEST_CUSTOMER.id) {
                      setWalkInCustomerId(selectedReceiptData.customerId);
                      setWalkInCustomerName(selectedReceiptData.customerName);
                      setWalkInCustomerPhone(selectedReceiptData.customerPhone || '');
                    }
                    setWalkInModalMode('SCHEDULE');
                    setShowWalkInModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#985018] hover:bg-[#854412] font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt lịch hẹn tiếp theo cho khách</span>
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
                  className={`flex-1 py-2 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedReceiptData.userPackageId || selectedReceiptData.sourceKind === 'PACKAGE'
                      ? 'border border-[#D7BBA6] bg-white text-[#8A4F23] hover:bg-[#FAF0E4]'
                      : 'bg-[#985018] hover:bg-[#854412] text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedReceiptData.userPackageId || selectedReceiptData.sourceKind === 'PACKAGE' ? 'Để sau' : 'Hoàn tất'}</span>
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
                  value={selectedBranchId !== 'ALL' ? selectedBranchId : branches.find((b) => b.id !== 'ALL')?.id || ''}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBranchId(bId);
                    handleBranchSelect(bId);
                  }}
                  className="w-full h-9 px-3 border border-[#E8DFD8] rounded-xl text-xs font-medium"
                >
                  {branches
                    .filter((b) => b.id !== 'ALL')
                    .map((b) => (
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
                  if (isOpeningShift) return;
                  const validBranches = branches.filter((b) => b.id !== 'ALL');
                  const bId = (selectedBranchId !== 'ALL' ? selectedBranchId : validBranches[0]?.id) || '';
                  if (!bId) {
                    toast.error('Lỗi', 'Chưa chọn chi nhánh cụ thể để mở ca.');
                    return;
                  }
                  setIsOpeningShift(true);
                  try {
                    // Recover an existing server-side shift before attempting a
                    // create. This covers refreshes, branch switches and another
                    // browser tab that opened the same cashier shift.
                    const existing = await posService.getActiveShift(bId);
                    if (existing.success && existing.data) {
                      setCurrentShift(existing.data);
                      setShowOpenShiftModal(false);
                      toast.info('Đã khôi phục ca đang mở', `Mã ca: ${existing.data.shiftCode}`);
                      return;
                    }
                    const res = await posService.openShift({
                      branchId: bId,
                      openingCash: shiftOpeningCash,
                      notes: shiftNotes,
                    });
                    if (res.success && res.data) {
                      setCurrentShift(res.data);
                      if (selectedBranchId !== bId) {
                        handleBranchSelect(bId);
                      }
                      setShowOpenShiftModal(false);
                      toast.success('Đã mở ca thu ngân', `Mã ca: ${res.data.shiftCode}`);
                    } else {
                      // A concurrent click/tab may win between the pre-check and
                      // create. Resolve a 409 by loading the winning shift.
                      if (res.statusCode === 409) {
                        const recovered = await posService.getActiveShift(bId);
                        if (recovered.success && recovered.data) {
                          setCurrentShift(recovered.data);
                          setShowOpenShiftModal(false);
                          toast.info('Đã khôi phục ca đang mở', `Mã ca: ${recovered.data.shiftCode}`);
                          return;
                        }
                      }
                      toast.error('Lỗi mở ca', res.message || 'Không thể mở ca thu ngân.');
                    }
                  } catch (e: any) {
                    toast.error('Lỗi mở ca', e?.message || 'Không thể mở ca thu ngân.');
                  } finally {
                    setIsOpeningShift(false);
                  }
                }}
                disabled={isOpeningShift}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs"
              >
                {isOpeningShift ? 'Đang kiểm tra ca...' : 'Xác nhận mở ca'}
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
                  if (isClosingShift) return;
                  const expectedCash = currentShift.systemCash ?? currentShift.openingCash;
                  if (shiftClosingCash !== expectedCash && shiftVarianceReason.trim().length < 5) {
                    toast.error('Thiếu lý do chênh lệch', 'Vui lòng nhập lý do ít nhất 5 ký tự.');
                    return;
                  }
                  setIsClosingShift(true);
                  try {
                    // Re-read immediately before closing. Payments can arrive while
                    // the reconciliation dialog is open, so the modal snapshot is
                    // not authoritative.
                    const latest = await posService.getActiveShift(currentShift.branchId);
                    if (!latest.success || !latest.data) {
                      toast.error('Không thể kết ca', latest.message || 'Ca hiện tại đã thay đổi. Vui lòng tải lại trang.');
                      return;
                    }
                    const latestExpectedCash = latest.data.systemCash ?? latest.data.openingCash;
                    if (hasCashierShiftSnapshotChanged(currentShift, latest.data)) {
                      setCurrentShift(latest.data);
                      setShiftClosingCash(latestExpectedCash);
                      setShiftVarianceReason('');
                      toast.warning(
                        'Số liệu ca vừa thay đổi',
                        'Có giao dịch mới trong lúc đối soát. Hệ thống đã cập nhật tiền mặt; vui lòng kiểm đếm và xác nhận lại.'
                      );
                      return;
                    }
                    const result = await posService.closeShift(currentShift.id, {
                      closingCash: shiftClosingCash,
                      notes: [shiftNotes.trim(), shiftVarianceReason.trim() ? `Chênh lệch tiền mặt: ${shiftVarianceReason.trim()}` : ''].filter(Boolean).join('\n'),
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
                  } finally {
                    setIsClosingShift(false);
                  }
                }}
                disabled={isClosingShift || (shiftClosingCash !== (currentShift.systemCash ?? currentShift.openingCash) && shiftVarianceReason.trim().length < 5)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosingShift ? 'Đang kết ca...' : 'Xác nhận kết ca'}
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
                  <h3 className="text-sm font-bold">{walkInModalMode === 'DIRECT_SALE' ? 'Tiếp nhận khách Walk-in' : 'Đặt lịch sử dụng dịch vụ'}</h3>
                  <p className="text-[11px] text-emerald-200">
                    {walkInModalMode === 'DIRECT_SALE'
                      ? 'Đưa dịch vụ thẳng vào phiếu thu · Không tạo lịch hẹn trung gian'
                      : 'Cơ chế DRC: 6 Giường × 6 KTV · Tự động điều phối và khóa ca'}
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
                    <option value="">-- Chọn khách hàng --</option>
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
                {walkInModalMode === 'SCHEDULE' && <div>
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
                </div>}
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
              {walkInModalMode === 'SCHEDULE' && <div>
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
              </div>}
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
                    <span>{walkInModalMode === 'DIRECT_SALE' ? 'Đưa vào phiếu thu' : 'Xác nhận đặt lịch'}</span>
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
