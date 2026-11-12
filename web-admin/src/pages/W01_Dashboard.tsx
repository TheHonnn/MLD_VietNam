import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Wallet,
  Receipt,
  Calendar,
  Leaf,
  GraduationCap,
  ChevronDown,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Building2,
  CalendarDays,
  Check,
  User,
  Phone,
  Radio,
  ArrowUpRight,
  Award,
  BookOpen,
  UserCheck,
  Users,
  Plus,
  UserPlus,
  ClipboardCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  branchService,
  bookingService,
  posService,
  treatmentService,
  academyService,
  supabaseService,
  customerService,
} from '../services';
import {
  Invoice,
  Booking,
  Branch,
  UserPackage,
  CourseEnrollment,
  TuitionTransaction,
  TuitionTransType,
  Technician,
  User as CustomerUser,
  Instructor,
  EnrollmentStatus,
  PackageStatus,
} from '../types/shared_types';
import {
  MultiColorLineChart,
  DailyRevenueItem,
} from '../components/dashboard/MultiColorLineChart';
import {
  RevenueBreakdownChart,
  RevenueBreakdownData,
} from '../components/dashboard/RevenueBreakdownChart';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { matchSearch } from '../utils/searchUtils';
import { isBookingWaitingPayment } from './cashier-pos.rules';

type DateRangePreset = '7D' | 'TODAY' | '30D' | 'THIS_MONTH' | 'ALL' | 'CUSTOM';

const formatKpiMoney = (amount: number) => {
  const absolute = Math.abs(amount);
  const format = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (absolute >= 1_000_000_000) return `${format(amount / 1_000_000_000)} tỷ đ`;
  if (absolute >= 1_000_000) return `${format(amount / 1_000_000)} triệu đ`;
  if (absolute >= 1_000) return `${format(amount / 1_000)} nghìn đ`;
  return `${amount.toLocaleString('vi-VN')}đ`;
};

export const W01_Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return localStorage.getItem('mld_selected_branch_id') || 'ALL';
  });
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const [datePreset, setDatePreset] = useState<DateRangePreset>('7D');
  const [customStartDate, setCustomStartDate] = useState('2026-10-09');
  const [customEndDate, setCustomEndDate] = useState('2026-10-16');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Entities Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [tuitions, setTuitions] = useState<TuitionTransaction[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Global Branch Changes and Branch List Updates from other modules
  useEffect(() => {
    const handleGlobalBranchChange = (e: any) => {
      const newBranchId = e?.detail?.branchId;
      if (newBranchId) {
        setSelectedBranchId(newBranchId);
      }
    };

    const handleBranchesUpdated = async () => {
      try {
        const res = await branchService.getAllBranches();
        if (res.success && res.data) {
          setBranches(res.data);
          const currentId = localStorage.getItem('mld_selected_branch_id') || 'ALL';
          if (currentId !== 'ALL' && !res.data.some((b) => b.id === currentId)) {
            setSelectedBranchId('ALL');
            localStorage.setItem('mld_selected_branch_id', 'ALL');
          }
        }
      } catch (err) {
        console.error('Failed to sync branches in dashboard:', err);
      }
    };

    window.addEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
    window.addEventListener('mld_branches_updated' as any, handleBranchesUpdated);
    return () => {
      window.removeEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
      window.removeEventListener('mld_branches_updated' as any, handleBranchesUpdated);
    };
  }, []);

  // Sync selectedBranchId to localStorage and notify other components
  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem('mld_selected_branch_id', branchId);
    window.dispatchEvent(new CustomEvent('mld_branch_changed', { detail: { branchId } }));
    setIsBranchDropdownOpen(false);
  };

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(target)) {
        setIsBranchDropdownOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(target)) {
        setIsDateDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchFocused(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBranchDropdownOpen(false);
        setIsDateDropdownOpen(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dynamic Real-time Calendar Helper
  const realDates = useMemo(() => {
    const now = new Date();
    const toIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const toDisplay = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${m}/${d.getFullYear()}`;
    };
    const toShort = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${m}`;
    };

    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);

    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);

    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      todayIso: toIso(now),
      todayDisplay: toDisplay(now),
      d7Iso: toIso(d7),
      d7Display: toDisplay(d7),
      d7Short: toShort(d7),
      d30Iso: toIso(d30),
      d30Short: toShort(d30),
      mStartIso: toIso(mStart),
      mEndIso: toIso(mEnd),
      monthDisplay: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
      toIso,
      toDisplay,
      toShort,
    };
  }, []);

  // Fetch all operational data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [invRes, bkRes, brRes, pkgRes, enrRes, tuiRes, liveTechs, custRes, insRes] = await Promise.all([
        posService.getInvoices(),
        bookingService.getBookings(),
        branchService.getAllBranches(),
        treatmentService.getUserPackagesByCustomer(),
        academyService.getEnrollments(),
        academyService.getTuitionTransactions(),
        supabaseService.getTechnicians(),
        customerService.getCustomers(),
        academyService.getInstructors(),
      ]);
      if (invRes.success) setInvoices(invRes.data);
      if (bkRes.success) setBookings(bkRes.data);
      if (brRes.success) setBranches(brRes.data);
      if (pkgRes.success) setUserPackages(pkgRes.data);
      if (enrRes.success) setEnrollments(enrRes.data);
      if (tuiRes.success) setTuitions(tuiRes.data);
      if (liveTechs) setTechnicians(liveTechs);
      if (custRes.success) setCustomers(custRes.data);
      if (insRes && insRes.success && insRes.data) setInstructors(insRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Realtime WebSocket synchronization
  const [realtimeToast, setRealtimeToast] = useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  const { isLive, lastSyncTime, forceSync } = useRealtimeSync({
    onDataChange: (event) => {
      fetchData(false);
      const actionLabel =
        event.table === 'bookings'
          ? 'Lịch hẹn mới'
          : event.table === 'invoices'
          ? 'Hóa đơn thanh toán'
          : event.table === 'tuition_transactions'
          ? 'Giao dịch học phí'
          : event.table === 'course_enrollments'
          ? 'Hồ sơ tuyển sinh'
          : (event.table as string) === 'instructors'
          ? 'Hồ sơ giảng viên'
          : 'Dữ liệu vận hành';

      setRealtimeToast({
        message: `⚡ Realtime: ${actionLabel} vừa được đồng bộ tự động từ Supabase`,
        type: 'success',
      });

      setTimeout(() => {
        setRealtimeToast(null);
      }, 4500);
    },
  });

  // Quick lookup maps
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const techMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  // Active Branch Display Label
  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const selectedBranchLabel =
    selectedBranchId === 'ALL'
      ? `Tất cả chi nhánh (${branches.length || 2})`
      : selectedBranch?.name?.replace('MLD Luxury Spa & Academy - ', '') ||
        selectedBranch?.name ||
        'Chi nhánh đã chọn';

  // Compute Active Date Bounds & Display Labels with Dynamic Real-time Values
  const { startDateStr, endDateStr, labelLine1, labelLine2 } = useMemo(() => {
    switch (datePreset) {
      case '7D':
        return {
          startDateStr: realDates.d7Iso,
          endDateStr: realDates.todayIso,
          labelLine1: `${realDates.d7Display} –`,
          labelLine2: realDates.todayDisplay,
        };
      case 'TODAY':
        return {
          startDateStr: realDates.todayIso,
          endDateStr: realDates.todayIso,
          labelLine1: 'Hôm nay –',
          labelLine2: realDates.todayDisplay,
        };
      case '30D':
        return {
          startDateStr: realDates.d30Iso,
          endDateStr: realDates.todayIso,
          labelLine1: '30 ngày qua –',
          labelLine2: `${realDates.d30Short} – ${realDates.toShort(new Date())}`,
        };
      case 'THIS_MONTH':
        return {
          startDateStr: realDates.mStartIso,
          endDateStr: realDates.mEndIso,
          labelLine1: 'Tháng này –',
          labelLine2: realDates.monthDisplay,
        };
      case 'ALL':
        return {
          startDateStr: '',
          endDateStr: '',
          labelLine1: 'Toàn thời –',
          labelLine2: 'gian (Tất cả)',
        };
      case 'CUSTOM':
        return {
          startDateStr: customStartDate,
          endDateStr: customEndDate,
          labelLine1: `${customStartDate.split('-').reverse().slice(0, 2).join('/')} –`,
          labelLine2: `${customEndDate.split('-').reverse().slice(0, 2).join('/')}`,
        };
      default:
        return {
          startDateStr: realDates.d7Iso,
          endDateStr: realDates.todayIso,
          labelLine1: `${realDates.d7Display} –`,
          labelLine2: realDates.todayDisplay,
        };
    }
  }, [datePreset, customStartDate, customEndDate, realDates]);

  // Date In Range Checker
  const isDateInRange = (dateStr?: string | null) => {
    if (!startDateStr || !endDateStr) return true;
    if (!dateStr) return false;
    const iso = dateStr.slice(0, 10);
    return iso >= startDateStr && iso <= endDateStr;
  };

  // 1. FILTERED ENTITIES (By Branch and Date Range)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Loại trừ các hóa đơn tạo từ kịch bản kiểm thử tự động (TEST/UAT/E2E/SEC/EXPIRY)
      const code = (inv.invoiceCode || '').toUpperCase();
      if (
        code.includes('TEST') ||
        code.includes('UAT') ||
        code.includes('E2E') ||
        code.includes('SEC') ||
        code.includes('EXPIRY')
      ) {
        return false;
      }
      const matchBranch = selectedBranchId === 'ALL' || inv.branchId === selectedBranchId;
      if (!matchBranch) return false;
      if (datePreset === 'ALL') return true;
      return isDateInRange(inv.paidAt);
    });
  }, [invoices, selectedBranchId, datePreset, startDateStr, endDateStr]);

  const filteredTuitions = useMemo(() => {
    // 0. Tập hợp các enrollmentId và mã chứng từ đã được ghi nhận hóa đơn trong filteredInvoices (tránh tính trùng x2)
    const invoicedEnrollmentIds = new Set<string>();
    const invoicedCodes = new Set<string>();
    filteredInvoices
      .filter((inv) => inv.paymentStatus === 'PAID')
      .forEach((inv) => {
        if (inv.enrollmentId) invoicedEnrollmentIds.add(inv.enrollmentId);
        if (inv.invoiceCode) invoicedCodes.add(inv.invoiceCode);
      });

    // 1. Các giao dịch từ bảng tuition_transactions (bỏ qua nếu đã được ghi nhận trong bảng invoices)
    const explicitTxs = tuitions.filter((t) => {
      if (t.enrollmentId && invoicedEnrollmentIds.has(t.enrollmentId)) return false;
      if (t.transactionCode && invoicedCodes.has(t.transactionCode)) return false;
      const matchBranch = selectedBranchId === 'ALL' || t.branchId === selectedBranchId;
      if (!matchBranch) return false;
      if (datePreset === 'ALL') return true;
      return isDateInRange(t.paidAt);
    });

    // 2. Dự phòng: Các hồ sơ học viên đã thu tiền (amountPaid > 0)
    // nhưng chưa có bản ghi trong tuition_transactions VÀ chưa có trong invoices
    const existingEnrollmentIds = new Set([
      ...invoicedEnrollmentIds,
      ...explicitTxs.map((t) => t.enrollmentId),
    ]);
    const implicitTxs: TuitionTransaction[] = [];

    enrollments.forEach((e) => {
      if (e.amountPaid > 0 && !existingEnrollmentIds.has(e.id)) {
        const matchBranch =
          selectedBranchId === 'ALL' ||
          !e.batch?.branchId ||
          e.batch?.branchId === selectedBranchId;
        if (!matchBranch) return;
        if (datePreset !== 'ALL' && !isDateInRange(e.approvedAt || e.enrolledAt)) return;

        implicitTxs.push({
          id: `tx-${e.id}`,
          transactionCode: `TT-${e.id.slice(-6).toUpperCase()}`,
          enrollmentId: e.id,
          studentId: e.studentId,
          courseId: e.courseId,
          branchId: e.batch?.branchId || selectedBranchId || 'aaaaaaaa-0001-0001-0001-000000000001',
          transactionType: e.amountPaid >= e.tuitionTotal ? TuitionTransType.FULL_PAYMENT : TuitionTransType.DEPOSIT,
          amount: e.amountPaid,
          paymentMethod: 'BANK_TRANSFER' as any,
          paymentStatus: 'PAID' as any,
          receiptNumber: `REC-${e.id.slice(-6).toUpperCase()}`,
          paidAt: e.approvedAt || e.enrolledAt || new Date().toISOString(),
          notes: e.approvalNotes || `Học phí đã thu của học viên ${e.studentName || ''}`,
        });
      }
    });

    return [...explicitTxs, ...implicitTxs];
  }, [tuitions, enrollments, filteredInvoices, selectedBranchId, datePreset, startDateStr, endDateStr]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchBranch = selectedBranchId === 'ALL' || b.branchId === selectedBranchId;
      if (!matchBranch) return false;
      if (datePreset === 'ALL') return true;
      return isDateInRange(b.bookingDate);
    });
  }, [bookings, selectedBranchId, datePreset, startDateStr, endDateStr]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      if (selectedBranchId === 'ALL') return true;
      return !e.batch?.branchId || e.batch?.branchId === selectedBranchId;
    });
  }, [enrollments, selectedBranchId]);

  // 2. LIVE KPI METRICS (Dynamically computed from filtered dataset)
  const totalInvoiceCollected = filteredInvoices.reduce((sum, inv) => {
    if (inv.paymentStatus !== 'PAID') return sum;
    return sum + Math.max(0, Number(inv.totalAmount || 0) - Number(inv.refundAmount || 0));
  }, 0);
  const totalTuitionCollected = filteredTuitions.reduce((sum, transaction) => {
    if (transaction.paymentStatus !== 'PAID') return sum;
    const amount = Number(transaction.amount || 0);
    return sum + (transaction.transactionType === TuitionTransType.REFUND ? -amount : amount);
  }, 0);
  const totalCollected = totalInvoiceCollected + totalTuitionCollected;

  const refundedAmount = useMemo(() => {
    const invoiceRefunds = filteredInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.refundAmount || 0),
      0
    );
    const tuitionRefunds = filteredTuitions.reduce(
      (sum, transaction) =>
        sum + (transaction.transactionType === TuitionTransType.REFUND ? Number(transaction.amount || 0) : 0),
      0
    );
    return invoiceRefunds + tuitionRefunds;
  }, [filteredInvoices, filteredTuitions]);

  const paidCount =
    filteredInvoices.filter((inv) => inv.paymentStatus === 'PAID').length +
    filteredTuitions.filter((t) => t.paymentStatus === 'PAID').length;

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((booking) => {
      if (selectedBranchId !== 'ALL' && booking.branchId !== selectedBranchId) return false;
      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(String(booking.status))) return false;
      const appointment = new Date(`${booking.bookingDate}T${booking.startTime || '00:00:00'}`);
      return !Number.isNaN(appointment.getTime()) && appointment.getTime() >= now.getTime();
    });
  }, [bookings, selectedBranchId]);

  const activePackages = useMemo(() => {
    const today = realDates.todayIso;
    return userPackages.filter((userPackage) => {
      const remainingSessions = Number(userPackage.totalSessions || 0) - Number(userPackage.completedSessions || 0);
      const hasNotExpired = !userPackage.expiresAt || userPackage.expiresAt.slice(0, 10) >= today;
      return userPackage.status === PackageStatus.ACTIVE && remainingSessions > 0 && hasNotExpired;
    });
  }, [userPackages, realDates.todayIso]);

  const activeEnrollments = useMemo(
    () => filteredEnrollments.filter(
      (enrollment) => enrollment.status === EnrollmentStatus.ENROLLED || enrollment.status === EnrollmentStatus.STUDYING
    ),
    [filteredEnrollments]
  );
  const activeCourseCount = useMemo(
    () => new Set(activeEnrollments.map((enrollment) => enrollment.courseId).filter(Boolean)).size,
    [activeEnrollments]
  );

  // Thống kê Học viên học viện (Student Metrics)
  const admittedEnrollments = useMemo(
    () => filteredEnrollments.filter((enrollment) =>
      [EnrollmentStatus.ENROLLED, EnrollmentStatus.STUDYING, EnrollmentStatus.GRADUATED].includes(enrollment.status)
    ),
    [filteredEnrollments]
  );
  const distinctStudentIds = useMemo(() => {
    return new Set(admittedEnrollments.map((e) => e.studentId || e.id));
  }, [admittedEnrollments]);
  const studentsCount = distinctStudentIds.size;
  const studyingStudentsCount = useMemo(
    () => new Set(activeEnrollments.map((enrollment) => enrollment.studentId || enrollment.id)).size,
    [activeEnrollments]
  );
  const consultingStudentsCount = useMemo(
    () => new Set(
      filteredEnrollments
        .filter((e) => e.status === EnrollmentStatus.CONSULTING || e.status === EnrollmentStatus.DEPOSITED)
        .map((enrollment) => enrollment.studentId || enrollment.id)
    ).size,
    [filteredEnrollments]
  );

  // Thống kê Giảng viên đào tạo (Instructor Metrics)
  const activeInstructorsCount = instructors.filter((i) => i.isActive !== false).length;

  // Keep the dashboard KPI identical to the cashier queue. A booking that was
  // cancelled/no-show, or already has a paid invoice, must not be presented as
  // money the cashier still needs to collect.
  const paidBookingIds = useMemo(
    () => new Set(
      invoices
        .filter((invoice) => invoice.paymentStatus === 'PAID' && invoice.bookingId)
        .map((invoice) => String(invoice.bookingId))
    ),
    [invoices]
  );
  const pendingBookings = filteredBookings.filter((booking) =>
    isBookingWaitingPayment(booking, paidBookingIds)
  );
  const pendingBookingAmount = pendingBookings.reduce((s, b) => s + b.finalPrice, 0);

  const pendingEnrollments = filteredEnrollments.filter(
    (e) => e.status === 'CONSULTING' || e.amountPaid < e.tuitionTotal
  );
  const pendingTuitionAmount = pendingEnrollments.reduce(
    (s, e) => s + (e.tuitionTotal - e.amountPaid),
    0
  );
  const totalNeedToCollect = pendingBookingAmount + pendingTuitionAmount;

  const todayBookingsCount = useMemo(() => {
    return bookings.filter((booking) => {
      const sameBranch = selectedBranchId === 'ALL' || booking.branchId === selectedBranchId;
      return sameBranch && booking.bookingDate === realDates.todayIso && booking.status !== 'CANCELLED';
    }).length;
  }, [bookings, realDates.todayIso, selectedBranchId]);

  const actionItems = [
    {
      label: 'Lịch hẹn hôm nay',
      detail: todayBookingsCount > 0 ? `${todayBookingsCount} lịch cần theo dõi` : 'Không có lịch cần xử lý',
      count: todayBookingsCount,
      icon: Calendar,
      route: '/staff-schedule',
      tone: 'blue',
    },
    {
      label: 'Chờ thu tiền dịch vụ',
      detail: pendingBookings.length > 0 ? `${pendingBookingAmount.toLocaleString('vi-VN')}đ cần thu` : 'Đã thu đủ',
      count: pendingBookings.length,
      icon: Receipt,
      route: '/cashier-pos?tab=queue',
      tone: 'amber',
    },
    {
      label: 'Học phí còn thiếu',
      detail: pendingEnrollments.length > 0 ? `${pendingTuitionAmount.toLocaleString('vi-VN')}đ còn thiếu` : 'Không có khoản còn thiếu',
      count: pendingEnrollments.length,
      icon: GraduationCap,
      route: '/academy-enrollment',
      tone: 'violet',
    },
    {
      label: 'Khách hàng cần chăm sóc',
      detail: 'Mở hồ sơ để xem lịch sử và ghi chú',
      count: 0,
      icon: ClipboardCheck,
      route: '/customers',
      tone: 'green',
    },
  ] as const;

  // 3-Pillar Revenue Structure (1 Đào tạo, 2 Dịch vụ trị liệu, 3 Sản phẩm mang về)
  const trainingRevenue = useMemo(() => {
    const invTraining = filteredInvoices
      .filter(
        (inv) =>
          inv.paymentStatus === 'PAID' &&
          (Boolean(inv.enrollmentId) || inv.serviceCategory === 'ACADEMY')
      )
      .reduce((s, i) => s + i.totalAmount, 0);
    return invTraining + totalTuitionCollected;
  }, [filteredInvoices, totalTuitionCollected]);

  const treatmentRevenue = useMemo(() => {
    return filteredInvoices
      .filter(
        (inv) =>
          inv.paymentStatus === 'PAID' &&
          (Boolean(inv.bookingId) ||
            Boolean(inv.userPackageId) ||
            inv.serviceCategory === 'SERVICE' ||
            inv.serviceCategory === 'PACKAGE')
      )
      .reduce((s, i) => s + i.totalAmount, 0);
  }, [filteredInvoices]);

  const productRevenue = useMemo(() => {
    return filteredInvoices
      .filter((inv) => {
        if (inv.paymentStatus !== 'PAID') return false;
        if (inv.serviceCategory === 'OTHER') return true;
        // Retail POS invoices: no bookingId, no userPackageId, no enrollmentId
        return (
          !inv.bookingId &&
          !inv.userPackageId &&
          !inv.enrollmentId &&
          inv.serviceCategory !== 'ACADEMY' &&
          inv.serviceCategory !== 'SERVICE' &&
          inv.serviceCategory !== 'PACKAGE'
        );
      })
      .reduce((s, i) => s + i.totalAmount, 0);
  }, [filteredInvoices]);

  const revenueBreakdown: RevenueBreakdownData = useMemo(
    () => ({
      training: trainingRevenue,
      treatment: treatmentRevenue,
      product: productRevenue,
    }),
    [trainingRevenue, treatmentRevenue, productRevenue]
  );

  const handleKpiClick = useCallback((route?: string) => {
    if (!route) return;
    if (route.includes('#')) {
      const [baseWithQuery, hash] = route.split('#');
      const sep = baseWithQuery.includes('?') ? '&' : '?';
      const branchParam = selectedBranchId && selectedBranchId !== 'ALL' ? `${sep}branchId=${selectedBranchId}` : '';
      navigate(`${baseWithQuery}${branchParam}#${hash}`);
    } else {
      const sep = route.includes('?') ? '&' : '?';
      const branchParam = selectedBranchId && selectedBranchId !== 'ALL' ? `${sep}branchId=${selectedBranchId}` : '';
      navigate(`${route}${branchParam}`);
    }
  }, [navigate, selectedBranchId]);

  const kpis = [
    {
      title: 'Thực thu trong kỳ',
      value: formatKpiMoney(totalCollected),
      subtext: `${paidCount} biên nhận đã hoàn tất`,
      icon: Wallet,
      route: '/cashier-pos?tab=receipts',
      actionLabel: 'Xem hóa đơn',
    },
    {
      title: 'Giao dịch đã thanh toán',
      value: `${paidCount}`,
      subtext: `Hoàn tiền: ${refundedAmount.toLocaleString('vi-VN')}đ`,
      icon: Receipt,
      route: '/cashier-pos?tab=receipts',
      actionLabel: 'Xem hóa đơn',
    },
    {
      title: 'Lịch hẹn sắp tới',
      value: `${upcomingBookings.length}`,
      subtext: upcomingBookings.length > 0 ? 'Chưa hoàn tất, từ thời điểm hiện tại' : 'Không có lịch sắp tới',
      icon: Calendar,
      route: '/staff-schedule',
      actionLabel: 'Xem lịch hẹn',
    },
    {
      title: 'Gói liệu trình đang dùng',
      value: `${activePackages.length}`,
      subtext: `${activePackages.reduce((s, p) => s + Math.max(0, p.totalSessions - p.completedSessions), 0)} buổi còn lại`,
      icon: Leaf,
      route: '/treatment-management',
      actionLabel: 'Xem liệu trình',
    },
    {
      title: 'Khóa đang có học viên',
      value: `${activeCourseCount}`,
      subtext: `${activeEnrollments.length} hồ sơ đang học`,
      icon: BookOpen,
      route: '/academy-enrollment',
      actionLabel: 'Xem ghi danh',
    },
    {
      title: 'Giảng viên hoạt động',
      value: `${activeInstructorsCount}`,
      subtext: `${instructors.length} hồ sơ giảng viên`,
      icon: Award,
      route: '/instructors',
      actionLabel: 'Xem giảng viên',
    },
    {
      title: 'Học viên học viện',
      value: `${studentsCount}`,
      subtext: `${studyingStudentsCount} đang học • ${consultingStudentsCount} chờ xếp lớp`,
      icon: GraduationCap,
      route: '/academy-enrollment',
      actionLabel: 'Xem học viên',
    },
  ];

  // 3. DYNAMIC MULTI-STREAM REVENUE DATA FOR LINE CHART
  const revenueChartData: DailyRevenueItem[] = useMemo(() => {
    let dateStrings: string[] = [];

    if (startDateStr && endDateStr) {
      const cur = new Date(startDateStr);
      const end = new Date(endDateStr);
      let count = 0;
      while (cur <= end && count <= 45) {
        dateStrings.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    }

    // A date axis is presentation state only; all amounts remain derived from Supabase records.
    if (dateStrings.length === 0) {
      const anchor = new Date();
      const daysCount = 8;
      dateStrings = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(d.getDate() - (daysCount - 1 - i));
        return d.toISOString().split('T')[0];
      });
    }

    const dayOfWeekNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return dateStrings.map((isoDate) => {
      const d = new Date(`${isoDate}T00:00:00`);
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const displayDate = `${dayNum}/${monthNum}/${d.getFullYear()}`;
      const shortDate = `${dayNum}/${monthNum}`;
      const dayOfWeek = dayOfWeekNames[d.getDay()];

      // Invoices matching date
      const dayInvoices = filteredInvoices.filter(
        (inv) => inv.paymentStatus === 'PAID' && inv.paidAt && inv.paidAt.startsWith(isoDate)
      );

      // Tuition transactions matching date
      const dayTuitions = filteredTuitions.filter(
        (t) => t.paymentStatus === 'PAID' && t.paidAt && t.paidAt.startsWith(isoDate)
      );

      // 1. Học phí Đào tạo (Stream 1)
      const tuitionInvoiceAmount = dayInvoices
        .filter((inv) => Boolean(inv.enrollmentId) || inv.serviceCategory === 'ACADEMY')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      const tuitionTxAmount = dayTuitions.reduce((sum, t) => sum + t.amount, 0);
      const tuitionAmount = tuitionInvoiceAmount + tuitionTxAmount;

      // 2. Dịch vụ trị liệu (Stream 2)
      const serviceAmount = dayInvoices
        .filter(
          (inv) =>
            Boolean(inv.bookingId) ||
            Boolean(inv.userPackageId) ||
            inv.serviceCategory === 'SERVICE' ||
            inv.serviceCategory === 'PACKAGE'
        )
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      // 3. Sản phẩm mang về (Stream 3)
      const packageAmount = dayInvoices
        .filter(
          (inv) =>
            inv.serviceCategory === 'OTHER' ||
            (!inv.bookingId &&
              !inv.userPackageId &&
              !inv.enrollmentId &&
              inv.serviceCategory !== 'ACADEMY' &&
              inv.serviceCategory !== 'SERVICE' &&
              inv.serviceCategory !== 'PACKAGE')
        )
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      // Total
      const totalAmount = tuitionAmount + serviceAmount + packageAmount;

      return {
        date: displayDate,
        shortDate,
        isoDate,
        dayOfWeek,
        total: totalAmount,
        service: serviceAmount,
        package: packageAmount,
        tuition: tuitionAmount,
        invoicesCount: dayInvoices.length,
        tuitionsCount: dayTuitions.length,
      };
    });
  }, [startDateStr, endDateStr, filteredInvoices, filteredTuitions]);

  // 4. MULTI-FIELD SEARCH LOGIC (BOOKINGS TABLE)
  const displayBookings = useMemo(() => {
    return filteredBookings.filter((b) => {
      if (!searchTerm.trim()) return true;
      const cust = b.customerId ? customerMap.get(b.customerId) : undefined;
      const tech = b.technicianId ? techMap.get(b.technicianId) : undefined;
      const br = branchMap.get(b.branchId);

      return matchSearch(
        [
          b.bookingCode,
          b.id,
          b.bookedForName,
          b.bookedForPhone,
          cust?.fullName,
          cust?.phone,
          b.checkinNotes,
          b.specialNotes,
          tech?.fullName,
          br?.name,
        ],
        searchTerm
      );
    });
  }, [filteredBookings, searchTerm, customerMap, techMap, branchMap]);

  // 5. QUICK SEARCH AUTOCOMPLETE SUGGESTIONS
  const quickResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return { bookings: [], customers: [], enrollments: [], invoices: [], instructors: [] };
    }

    const matchedBookings = bookings
      .filter((b) => {
        const cust = b.customerId ? customerMap.get(b.customerId) : undefined;
        const tech = b.technicianId ? techMap.get(b.technicianId) : undefined;
        return matchSearch(
          [
            b.bookingCode,
            b.bookedForName,
            b.bookedForPhone,
            cust?.fullName,
            cust?.phone,
            b.checkinNotes,
            tech?.fullName,
          ],
          searchTerm
        );
      })
      .slice(0, 3);

    const matchedCustomers = customers
      .filter((c) => {
        return matchSearch([c.fullName, c.phone, c.email, c.address], searchTerm);
      })
      .slice(0, 3);

    const matchedEnrollments = enrollments
      .filter((e) => {
        return matchSearch(
          [e.student?.fullName, e.student?.phone, e.course?.title, e.course?.code],
          searchTerm
        );
      })
      .slice(0, 3);

    const matchedInvoices = invoices
      .filter((inv) => {
        return matchSearch([inv.invoiceCode, inv.totalAmount], searchTerm);
      })
      .slice(0, 3);

    const matchedInstructors = instructors
      .filter((ins) => {
        return matchSearch(
          [ins.fullName, ins.title, ins.bio, ins.user?.phone, ins.user?.email],
          searchTerm
        );
      })
      .slice(0, 3);

    return {
      bookings: matchedBookings,
      customers: matchedCustomers,
      enrollments: matchedEnrollments,
      invoices: matchedInvoices,
      instructors: matchedInstructors,
    };
  }, [searchTerm, bookings, customers, enrollments, invoices, instructors, customerMap, techMap]);

  const totalQuickMatches =
    quickResults.bookings.length +
    quickResults.customers.length +
    quickResults.enrollments.length +
    quickResults.invoices.length +
    quickResults.instructors.length;

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* Floating Realtime Toast Notification */}
      {realtimeToast && (
        <div className="fixed top-20 right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#2C241E]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#985018]/40 flex items-center gap-3 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping" />
            <span className="font-semibold text-[#F5EBE1]">{realtimeToast.message}</span>
            <button
              type="button"
              onClick={() => setRealtimeToast(null)}
              className="ml-2 text-[#A8988A] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Page Header Title & Main Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Tổng quan vận hành
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Bức tranh vận hành chuỗi spa và học viện
          </p>
        </div>
        <Link
          to="/reports"
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center shrink-0"
        >
          Xem báo cáo doanh thu
        </Link>
      </div>

      {/* 2. Interactive Filter Bar Box */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shadow-xs relative z-20">
        {/* Search input with live autocomplete */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#A69788] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm khách hàng, lịch hẹn, lớp học..."
              className="w-full h-10 pl-9 pr-9 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 rounded-full text-[#A69788] hover:text-[#5C5046] hover:bg-[#FAF8F5] transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete / Instant Search Results Dropdown */}
          {isSearchFocused && searchTerm.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-50 max-h-[380px] overflow-y-auto p-3 space-y-3 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFE4D9] text-[11px] text-[#73675F]">
                <span>
                  Kết quả cho từ khóa: <strong className="text-[#985018]">"{searchTerm}"</strong>
                </span>
                <span className="text-[10px] bg-[#F5EBE1] text-[#985018] px-2 py-0.5 rounded-full font-bold">
                  {totalQuickMatches} mục liên quan
                </span>
              </div>

              {totalQuickMatches === 0 ? (
                <div className="py-6 text-center text-[#8C7E72] text-xs">
                  <Search className="w-8 h-8 mx-auto text-[#D5C2B1] mb-2 stroke-1" />
                  <p className="font-semibold text-[#4A3E34]">Không tìm thấy kết quả phù hợp</p>
                  <p className="text-[11px] text-[#8C7E72] mt-0.5">
                    Thử tìm theo tên khách hàng, số điện thoại hoặc mã lịch hẹn
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Bookings Matches */}
                  {quickResults.bookings.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-[#8E4002] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Lịch hẹn ({quickResults.bookings.length})
                      </div>
                      <div className="space-y-1">
                        {quickResults.bookings.map((b) => {
                          const cust = b.customerId ? customerMap.get(b.customerId) : undefined;
                          const custName = b.bookedForName || cust?.fullName || 'Khách hàng';
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSearchTerm(b.bookingCode);
                                setIsSearchFocused(false);
                              }}
                              className="p-2 rounded-xl hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-[#EFE4D9]"
                            >
                              <div>
                                <div className="font-bold text-[#2C241E] flex items-center gap-1.5">
                                  <span>{b.bookingCode}</span>
                                  <span className="text-[11px] font-medium text-[#73675F]">
                                    • {custName}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#8C7E72]">
                                  {b.bookingDate} ({b.startTime.slice(0, 5)}) •{' '}
                                  {b.checkinNotes || 'Massage trị liệu'}
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-[#985018]">
                                {b.finalPrice.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Customers Matches */}
                  {quickResults.customers.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-[#8E4002] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Khách hàng ({quickResults.customers.length})
                      </div>
                      <div className="space-y-1">
                        {quickResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              navigate(`/customer-detail?id=${c.id}`);
                              setIsSearchFocused(false);
                            }}
                            className="p-2 rounded-xl hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-[#EFE4D9]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#F5EBE1] text-[#985018] flex items-center justify-center font-bold text-xs">
                                {c.fullName.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-[#2C241E]">{c.fullName}</div>
                                <div className="text-[11px] text-[#8C7E72] flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {c.phone}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF0E6] text-[#8A4F23]">
                              {c.membershipTier}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enrollments Matches */}
                  {quickResults.enrollments.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-[#8E4002] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" /> Tuyển sinh & Khóa học (
                        {quickResults.enrollments.length})
                      </div>
                      <div className="space-y-1">
                        {quickResults.enrollments.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              navigate('/academy-enrollment');
                              setIsSearchFocused(false);
                            }}
                            className="p-2 rounded-xl hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-[#EFE4D9]"
                          >
                            <div>
                              <div className="font-bold text-[#2C241E]">
                                {e.student?.fullName || 'Học viên'}
                              </div>
                              <div className="text-[11px] text-[#8C7E72]">
                                {e.course?.title || e.course?.code || 'Khóa đào tạo Spa chuyên nghiệp'}
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EDE7F6] text-[#5E35B1]">
                              {e.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices Matches */}
                  {quickResults.invoices.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-[#8E4002] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5" /> Hóa đơn ({quickResults.invoices.length})
                      </div>
                      <div className="space-y-1">
                        {quickResults.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            onClick={() => {
                              navigate('/cashier-pos');
                              setIsSearchFocused(false);
                            }}
                            className="p-2 rounded-xl hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-[#EFE4D9]"
                          >
                            <div>
                              <div className="font-bold text-[#2C241E]">{inv.invoiceCode}</div>
                              <div className="text-[11px] text-[#8C7E72]">{inv.paidAt || 'Vừa xong'}</div>
                            </div>
                            <span className="text-[11px] font-bold text-[#2E7D32]">
                              {inv.totalAmount.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instructors Matches */}
                  {quickResults.instructors.length > 0 && (
                    <div>
                      <div className="text-[10.5px] font-bold text-[#8E4002] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Giảng viên đào tạo ({quickResults.instructors.length})
                      </div>
                      <div className="space-y-1">
                        {quickResults.instructors.map((ins) => (
                          <div
                            key={ins.id}
                            onClick={() => {
                              navigate('/instructors');
                              setIsSearchFocused(false);
                            }}
                            className="p-2 rounded-xl hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-[#EFE4D9]"
                          >
                            <div className="flex items-center gap-2.5">
                              {ins.avatarUrl ? (
                                <img
                                  src={ins.avatarUrl}
                                  alt={ins.fullName}
                                  className="w-7 h-7 rounded-full object-cover border border-[#EFE4D9]"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#FAF0E4] text-[#985018] flex items-center justify-center font-bold text-xs">
                                  {ins.fullName.slice(0, 1)}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-[#2C241E]">{ins.fullName}</div>
                                <div className="text-[11px] text-[#8C7E72]">{ins.title}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F5EBE1] text-[#985018]">
                              {ins.experienceYears ? `${ins.experienceYears} năm KN` : 'Chuyên gia'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date range interactive dropdown */}
        <div className="relative" ref={dateDropdownRef}>
          <button
            type="button"
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className={`flex items-center justify-between gap-4 px-3.5 py-1 h-10 rounded-xl border bg-white text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
              isDateDropdownOpen
                ? 'border-[#985018] ring-2 ring-[#985018]/10 text-[#2C241E]'
                : 'border-[#E0D7CC] text-[#4A3E34] hover:bg-[#FAF8F5]'
            }`}
          >
            <div className="text-left leading-tight text-[11px]">
              <div>{labelLine1}</div>
              <div>{labelLine2}</div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#8C7A6B] transition-transform duration-200 ${
                isDateDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Date Range Options Modal / Dropdown */}
          {isDateDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-50 p-3 space-y-2 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFE4D9]">
                <span className="text-xs font-bold text-[#3E200C] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#985018]" />
                  Khoảng thời gian thống kê
                </span>
              </div>

              {/* Presets */}
              <div className="space-y-1">
                {[
                  {
                    key: '7D',
                    label: `7 ngày qua (${realDates.d7Short} – ${realDates.toShort(new Date())})`,
                    desc: 'Mặc định tuần vận hành',
                  },
                  {
                    key: 'TODAY',
                    label: `Hôm nay (${realDates.todayDisplay})`,
                    desc: 'Thời gian thực trong ngày',
                  },
                  {
                    key: '30D',
                    label: `30 ngày qua (${realDates.d30Short} – ${realDates.toShort(new Date())})`,
                    desc: 'Thống kê 1 tháng gần nhất',
                  },
                  {
                    key: 'THIS_MONTH',
                    label: `Tháng này (${realDates.monthDisplay})`,
                    desc: 'Toàn bộ chu kỳ tháng',
                  },
                  {
                    key: 'ALL',
                    label: 'Toàn thời gian (Tất cả)',
                    desc: 'Không giới hạn ngày',
                  },
                ].map((item) => {
                  const isActive = datePreset === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setDatePreset(item.key as DateRangePreset);
                        setIsDateDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-[#F5EBE1] text-[#985018] font-bold'
                          : 'text-[#4A3E34] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div>
                        <div>{item.label}</div>
                        <div className="text-[10px] text-[#8C7E72] font-normal">{item.desc}</div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-[#985018] stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Inputs */}
              <div className="pt-2 border-t border-[#EFE4D9] space-y-2">
                <span className="text-[11px] font-semibold text-[#695A4E]">Tùy chọn ngày:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-[10px] text-[#8C7E72] block mb-0.5">Từ ngày</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-[#E0D7CC] rounded-lg text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C7E72] block mb-0.5">Đến ngày</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-[#E0D7CC] rounded-lg text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDatePreset('CUSTOM');
                    setIsDateDropdownOpen(false);
                  }}
                  className="w-full py-1.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  Áp dụng khoảng ngày
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branch dropdown */}
        <div className="relative" ref={branchDropdownRef}>
          <button
            type="button"
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className={`flex items-center justify-between gap-4 px-3.5 h-10 rounded-xl border bg-white text-xs font-medium transition-all shrink-0 cursor-pointer ${
              isBranchDropdownOpen
                ? 'border-[#985018] ring-2 ring-[#985018]/10 text-[#2C241E]'
                : 'border-[#E0D7CC] text-[#4A3E34] hover:bg-[#FAF8F5]'
            }`}
          >
            <span className="truncate max-w-[170px]">{selectedBranchLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#8C7A6B] transition-transform duration-200 ${
                isBranchDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Branch Select Menu */}
          {isBranchDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-50 p-2 space-y-1 animate-in fade-in-50 zoom-in-95">
              <div className="px-3 py-1.5 border-b border-[#EFE4D9] text-xs font-bold text-[#3E200C] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#985018]" />
                Chọn chi nhánh vận hành
              </div>

              {/* All Branches option */}
              <button
                type="button"
                onClick={() => handleSelectBranch('ALL')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  selectedBranchId === 'ALL'
                    ? 'bg-[#F5EBE1] text-[#985018] font-bold'
                    : 'text-[#4A3E34] hover:bg-[#FAF8F5]'
                }`}
              >
                <div>
                  <div>Tất cả chi nhánh ({branches.length || 2})</div>
                  <div className="text-[10px] text-[#8C7E72] font-normal">
                    Tổng hợp toàn bộ chuỗi cơ sở
                  </div>
                </div>
                {selectedBranchId === 'ALL' && <Check className="w-4 h-4 text-[#985018] stroke-[2.5]" />}
              </button>

              {/* Individual branches */}
              {branches.map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBranch(b.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#F5EBE1] text-[#985018] font-bold'
                        : 'text-[#4A3E34] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="truncate">{b.name}</div>
                      <div className="text-[10px] text-[#8C7E72] font-normal truncate">
                        {b.address}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#985018] shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Notice & Reset Banner */}
      {selectedBranchId !== 'ALL' && (
        <div className="bg-[#FAF4EE] border border-[#ECD9C9] px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#4A3E34]">
            <Building2 className="w-4 h-4 text-[#985018] shrink-0" />
            <span>
              Đang lọc số liệu riêng cho: <strong className="text-[#3E200C] font-bold">{selectedBranchLabel}</strong> (Thực thu chi nhánh này: <strong className="text-[#985018]">{totalCollected.toLocaleString('vi-VN')}đ</strong>)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectBranch('ALL')}
            className="px-3 py-1 bg-white border border-[#D7BBA6] hover:bg-[#F5EBE1] text-[#985018] font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer text-[11px]"
          >
            <span>Xem toàn bộ chuỗi (Tất cả chi nhánh)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <section aria-labelledby="dashboard-actions-title" className="space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="dashboard-actions-title" className="text-sm font-extrabold text-[#3E200C]">Việc cần xử lý</h2>
            <p className="mt-0.5 text-[11px] font-medium text-[#73675F]">Các mục đang cần nhân viên kiểm tra hoặc hoàn tất</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/customers?action=create')} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#D7BBA6] bg-white px-2.5 text-[11px] font-bold text-[#985018] hover:bg-[#FAF4EE]">
              <UserPlus className="h-3.5 w-3.5" /> Thêm khách hàng
            </button>
            <button type="button" onClick={() => navigate('/staff-schedule?action=create')} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#985018] px-2.5 text-[11px] font-bold text-white hover:bg-[#854412]">
              <Plus className="h-3.5 w-3.5" /> Tạo lịch hẹn
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {actionItems.map((item) => {
            const Icon = item.icon;
            const tone = item.tone === 'blue'
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : item.tone === 'amber'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : item.tone === 'violet'
                  ? 'bg-violet-50 text-violet-700 border-violet-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100';
            return (
              <button key={item.label} type="button" onClick={() => navigate(item.route)} className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-[#EFE4D9] bg-white p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#D7BBA6] hover:shadow-md">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone}`}><Icon className="h-4.5 w-4.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-extrabold text-[#2C241E]">{item.label}</span>
                    {item.count > 0 && <span className="rounded-full bg-[#FFF1E5] px-2 py-0.5 text-[10px] font-extrabold text-[#985018]">{item.count}</span>}
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] font-medium text-[#8C7E72]">{item.detail}</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#B49C89] transition group-hover:text-[#985018]" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Seven KPI Cards Row - Responsive: 1-2 on mobile, 3 on tablet, 4 on small laptop, 7 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 sm:gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => handleKpiClick(kpi.route)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleKpiClick(kpi.route);
                }
              }}
              className="group bg-white p-3.5 2xl:p-4 rounded-2xl border border-[#EFE4D9] hover:border-[#985018] flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer text-left select-none relative overflow-hidden"
              title={`Nhấp để mở ${kpi.title.toLowerCase()} (${kpi.actionLabel})`}
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[11px] font-semibold text-[#7A6E63] group-hover:text-[#985018] transition-colors truncate pr-1">
                  {kpi.title}
                </span>
                <div className="w-6 h-6 rounded-lg bg-[#FAF4EE] group-hover:bg-[#985018] flex items-center justify-center transition-colors shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#985018] group-hover:text-white stroke-[1.8] transition-colors" />
                </div>
              </div>
              <div className="my-1">
                <div className="text-[18px] sm:text-[20px] xl:text-[19px] 2xl:text-[23px] font-extrabold text-[#8E4002] tracking-tight leading-none truncate">
                  {isLoading ? '...' : kpi.value}
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[#F5EBE1]/70">
                <p className="text-[10px] 2xl:text-[10.5px] text-[#8C7E72] font-medium truncate" title={kpi.subtext}>
                  {kpi.subtext}
                </p>
                <span className="text-[10px] font-bold text-[#985018] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                  <span className="hidden 2xl:inline">{kpi.actionLabel}</span>
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Middle Section: Chart + Table vs Breakdown + Action Needed - Stacks cleanly on tablet and mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols on desktop) */}
        <div className="xl:col-span-8 space-y-4">
          {/* Multi-Color Line Chart: Thực thu theo ngày */}
          <MultiColorLineChart
            data={revenueChartData}
            branchName={selectedBranchLabel}
            dateRangeLabel={`${labelLine1} ${labelLine2}`}
            isLoading={isLoading}
          />

          {/* Table Card: Đối chiếu chi nhánh */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#EFE4D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">Đối chiếu chi nhánh</h3>
                <p className="text-[11px] text-[#8A796B]">
                  Nhấp vào chi nhánh để lọc nhanh toàn bộ bảng điều khiển
                </p>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#985018] border border-[#E8DACB]">
                {branches.length} chi nhánh đang hoạt động
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-4 whitespace-nowrap">Chi nhánh</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Biên nhận đã thu</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Thực thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] whitespace-nowrap">
                  {branches.map((b) => {
                    const branchInvs = invoices.filter(
                      (inv) => inv.branchId === b.id && inv.paymentStatus === 'PAID'
                    );
                    const branchInvoicedEnrollmentIds = new Set<string>();
                    const branchInvoicedCodes = new Set<string>();
                    branchInvs.forEach((inv) => {
                      if (inv.enrollmentId) branchInvoicedEnrollmentIds.add(inv.enrollmentId);
                      if (inv.invoiceCode) branchInvoicedCodes.add(inv.invoiceCode);
                    });
                    const branchTuis = tuitions.filter(
                      (t) =>
                        t.branchId === b.id &&
                        t.paymentStatus === 'PAID' &&
                        (!t.enrollmentId || !branchInvoicedEnrollmentIds.has(t.enrollmentId)) &&
                        (!t.transactionCode || !branchInvoicedCodes.has(t.transactionCode))
                    );
                    const branchTotal =
                      branchInvs.reduce((s, i) => s + i.totalAmount, 0) +
                      branchTuis.reduce((s, t) => s + t.amount, 0);
                    const branchReceiptCount = branchInvs.length + branchTuis.length;
                    const isRowSelected = selectedBranchId === b.id;

                    return (
                      <tr
                        key={b.id}
                        onClick={() => handleSelectBranch(isRowSelected ? 'ALL' : b.id)}
                        className={`transition-colors cursor-pointer ${
                          isRowSelected
                            ? 'bg-[#FDF8F3] font-semibold text-[#8E4002]'
                            : 'hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <td className="py-3 px-4 text-[#2C241E] whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-semibold whitespace-nowrap">{b.name}</span>
                            {isRowSelected && (
                              <span className="text-[9.5px] px-1.5 py-0.5 bg-[#985018] text-white rounded font-bold whitespace-nowrap">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-[#8C7E72] font-normal truncate max-w-sm whitespace-nowrap">
                            {b.address}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#5C5046] whitespace-nowrap">{branchReceiptCount}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#2C241E] whitespace-nowrap">
                          {branchTotal.toLocaleString('vi-VN')}đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B] whitespace-nowrap">
              <span className="text-[11px] whitespace-nowrap">
                Hiển thị {branches.length} / {branches.length} cơ sở
              </span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
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

        {/* Right Column (4 of 12 cols on desktop) */}
        <div className="xl:col-span-4 space-y-4">
          {/* Biểu đồ cơ cấu doanh thu 3 phần: 1 Đào tạo, 2 Dịch vụ trị liệu, 3 Sản phẩm mang về */}
          <RevenueBreakdownChart
            data={revenueBreakdown}
            branchName={selectedBranchLabel}
            dateRangeLabel={`${labelLine1} ${labelLine2}`}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 5. Bottom Full Width Table: Lịch hẹn sắp tới */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EFE4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#2C241E]">
              Lịch hẹn sắp tới • Live Service Data ({displayBookings.length})
            </h3>
            {searchTerm && (
              <p className="text-[11px] text-[#985018] mt-0.5 font-medium">
                Đang lọc theo: "{searchTerm}" (Tìm thấy {displayBookings.length} bản ghi)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-[10.5px] text-[#8C7E72] hover:text-[#2C241E] underline cursor-pointer"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#985018] border border-[#E8DACB]">
              {displayBookings.length} bản ghi
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold whitespace-nowrap">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Ngày & giờ</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Lịch hẹn / Khách hàng / Dịch vụ</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Kỹ thuật viên / cơ sở</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9] whitespace-nowrap">
              {displayBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8C7E72] whitespace-normal">
                    <Calendar className="w-10 h-10 mx-auto text-[#D5C2B1] stroke-1 mb-2" />
                    <p className="text-sm font-semibold text-[#4A3E34]">
                      Không tìm thấy lịch hẹn phù hợp
                    </p>
                    <p className="text-xs text-[#8C7E72] mt-0.5">
                      Thử thay đổi từ khóa tìm kiếm, khoảng thời gian hoặc chọn "Tất cả chi nhánh"
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        handleSelectBranch('ALL');
                        setDatePreset('ALL');
                      }}
                      className="mt-3 px-3.5 py-1.5 text-xs font-bold text-[#985018] bg-[#F5EBE1] hover:bg-[#ECD9C6] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Đặt lại toàn bộ bộ lọc
                    </button>
                  </td>
                </tr>
              ) : (
                displayBookings.map((b) => {
                  const branch = branchMap.get(b.branchId);
                  const branchShort = branch?.name?.includes('Nguyễn Thị Minh Khai')
                    ? 'Quận 3'
                    : branch?.name?.includes('Nam Kỳ')
                    ? 'Quận 1'
                    : branch?.name || 'Chi nhánh MLD';

                  const tech = b.technicianId ? techMap.get(b.technicianId) : undefined;
                  const techName =
                    tech?.fullName || (b.technicianId?.includes('1') ? 'Trần Lan Anh' : 'Lê Quỳnh Nga');

                  const cust = b.customerId ? customerMap.get(b.customerId) : undefined;
                  const customerName = b.bookedForName || cust?.fullName || 'Khách hàng VIP';
                  const customerPhone = b.bookedForPhone || cust?.phone || '';

                  return (
                    <tr key={b.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#2C241E] whitespace-nowrap">
                        <div className="whitespace-nowrap">{b.bookingDate}</div>
                        <div className="text-[11px] text-[#8A796B] font-normal whitespace-nowrap">
                          {b.startTime.slice(0, 5)}–{b.endTime.slice(0, 5)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-bold text-[#2C241E] whitespace-nowrap">{b.bookingCode}</span>
                          <span className="text-[10px] font-semibold text-[#8E4002] bg-[#FAF0E6] px-1.5 py-0.5 rounded whitespace-nowrap">
                            {customerName}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5C5046] mt-0.5 whitespace-nowrap">
                          {b.checkinNotes || b.specialNotes || 'Massage trị liệu & chăm sóc da'}
                          {customerPhone ? ` • ${customerPhone}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#2C241E] whitespace-nowrap">{techName}</div>
                        <div className="text-[11px] text-[#8A796B] whitespace-nowrap">
                          {branchShort} • Phòng {b.assignedBedNumber || '01'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                            b.status === 'CHECKED_IN'
                              ? 'bg-[#E8EFE5] text-[#526D51]'
                              : 'bg-[#F5E2D0] text-[#8A4F23]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span className="whitespace-nowrap">{b.status === 'CHECKED_IN' ? 'Đã check-in' : 'Chờ xác nhận'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#2C241E] whitespace-nowrap">
                          {b.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                        </div>
                        <div className="text-[11px] text-[#8A796B] whitespace-nowrap">
                          {b.finalPrice.toLocaleString('vi-VN')}đ
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B] whitespace-nowrap">
          <span className="text-[11px] whitespace-nowrap">
            Hiển thị {displayBookings.length} / {displayBookings.length} bản ghi
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
    </div>
  );
};
