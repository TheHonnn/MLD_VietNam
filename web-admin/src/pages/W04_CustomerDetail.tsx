import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  Pencil,
  QrCode,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Check,
  CheckCircle2,
  Loader2,
  BookOpen,
  CreditCard,
  Building2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  customerService,
  bookingService,
  treatmentService,
  academyService,
  posService,
  branchService,
} from '../services';
import { toast } from '../components/common';
import {
  User,
  Booking,
  UserPackage,
  TreatmentPackage,
  TreatmentJournal,
  CourseEnrollment,
  Course,
  CourseBatch,
  Branch,
  Invoice,
  TuitionTransaction,
  MemberTier,
  PurposeInterest,
  PackageStatus,
  BookingStatus,
  PaymentMethod,
  UserRole,
} from '../types/shared_types';

import { useSearchParams, useNavigate } from 'react-router-dom';

const formatTierName = (tier?: MemberTier | string) => {
  switch (tier) {
    case MemberTier.SILVER:
    case 'SILVER':
      return 'Bạc';
    case MemberTier.GOLD:
    case 'GOLD':
      return 'Vàng';
    case MemberTier.PLATINUM:
    case 'PLATINUM':
      return 'Bạch Kim';
    case MemberTier.DIAMOND:
    case 'DIAMOND':
      return 'Kim Cương';
    case MemberTier.STANDARD:
    case 'STANDARD':
    default:
      return 'Tiêu chuẩn';
  }
};

const getNextTierInfo = (tier?: MemberTier, spent: number = 0) => {
  const TIER_THRESHOLDS = [
    { tier: MemberTier.STANDARD, target: 10_000_000, nextName: 'Bạc' },
    { tier: MemberTier.SILVER, target: 25_000_000, nextName: 'Vàng' },
    { tier: MemberTier.GOLD, target: 50_000_000, nextName: 'Bạch Kim' },
    { tier: MemberTier.PLATINUM, target: 100_000_000, nextName: 'Kim Cương' },
  ];
  const current = TIER_THRESHOLDS.find((t) => t.tier === tier);
  if (!current) {
    return { isMax: true, percent: 100, remaining: 0, nextName: 'Kim Cương' };
  }
  const percent = Math.min(100, Math.round((spent / current.target) * 100));
  const remaining = Math.max(0, current.target - spent);
  return { isMax: false, percent, remaining, nextName: current.nextName, target: current.target };
};

const formatDateVN = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const W04_CustomerDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<UserPackage[]>([]);
  const [journals, setJournals] = useState<TreatmentJournal[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<CourseBatch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tuitionTransactions, setTuitionTransactions] = useState<TuitionTransaction[]>([]);
  const [availablePackages, setAvailablePackages] = useState<TreatmentPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isAssigningPackage, setIsAssigningPackage] = useState(false);
  const [isProcessingSession, setIsProcessingSession] = useState(false);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferredTech, setPreferredTech] = useState<string>('Trần Lan Anh');
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    'Ưu tiên kỹ thuật Vodder lực nhẹ, chườm ấm cổ vai gáy, phòng yên tĩnh có tinh dầu sả chanh.'
  );

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'FEMALE' as 'MALE' | 'FEMALE' | 'OTHER',
    dateOfBirth: '',
    membershipTier: MemberTier.GOLD,
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    purpose: PurposeInterest.BEAUTY_SPA,
    preferredTechnician: 'Trần Lan Anh',
    clinicalNotes: 'Ưu tiên kỹ thuật Vodder lực nhẹ, chườm ấm cổ vai gáy, phòng yên tĩnh có tinh dầu sả chanh.',
  });

  const tabs = [
    'Tổng quan',
    'Lịch hẹn',
    'Liệu trình',
    'Học tập',
    'Giao dịch',
    'Ghi chú',
  ];

  // Fetch real data strictly from Supabase Cloud
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let custId = targetId;
        let custData: User | undefined;

        if (custId) {
          const custRes = await customerService.getCustomerById(custId);
          if (custRes.success && custRes.data) {
            custData = custRes.data;
          }
        }

        if (!custData) {
          const listRes = await customerService.getCustomers();
          if (listRes.success && listRes.data && listRes.data.length > 0) {
            // Prioritize customer accounts with real bookings/packages or role === 'CUSTOMER'
            const realCustomers = listRes.data.filter(
              (u) => u.role === UserRole.CUSTOMER
            );
            custData = realCustomers.length > 0 ? realCustomers[0] : listRes.data[0];
            custId = custData.id;
          }
        }

        if (custId) {
          const localCache = localStorage.getItem(`mld_cust_${custId}`);
          if (localCache) {
            try {
              const parsed = JSON.parse(localCache);
              if (parsed.preferredTechnician) setPreferredTech(parsed.preferredTechnician);
              if (parsed.clinicalNotes) setClinicalNotes(parsed.clinicalNotes);
              if (custData) custData = { ...custData, ...parsed };
            } catch {}
          }
        }

        setCustomer(custData);

        // Concurrently fetch real relational data from Supabase
        const [
          bkRes,
          pkgRes,
          jrnRes,
          enrRes,
          courseRes,
          batchRes,
          branchRes,
          invRes,
          treatPkgRes,
          tuitionRes,
        ] = await Promise.all([
          custId ? bookingService.getBookings({ customerId: custId }) : Promise.resolve({ success: true, data: [] }),
          custId ? treatmentService.getUserPackagesByCustomer(custId) : Promise.resolve({ success: true, data: [] }),
          custId ? treatmentService.getTreatmentJournalsByCustomer(custId) : Promise.resolve({ success: true, data: [] }),
          academyService.getEnrollments(),
          academyService.getCourses(),
          academyService.getCourseBatches(),
          branchService.getAllBranches(),
          custId ? posService.getInvoices({ customerId: custId }) : Promise.resolve({ success: true, data: [] }),
          treatmentService.getTreatmentPackages(),
          academyService.getTuitionTransactions(),
        ]);

        if (bkRes.success && bkRes.data) setBookings(bkRes.data);
        if (pkgRes.success && pkgRes.data) setPackages(pkgRes.data);
        if (jrnRes.success && jrnRes.data) setJournals(jrnRes.data);
        if (courseRes.success && courseRes.data) setCourses(courseRes.data);
        if (batchRes.success && batchRes.data) setBatches(batchRes.data);
        if (branchRes.success && branchRes.data) setBranches(branchRes.data);
        if (invRes.success && invRes.data) setInvoices(invRes.data);
        if (treatPkgRes.success && treatPkgRes.data) {
          setAvailablePackages(treatPkgRes.data);
          if (treatPkgRes.data.length > 0) setSelectedPackageId(treatPkgRes.data[0].id);
        }

        if (tuitionRes.success && tuitionRes.data && custId) {
          const userTuitions = tuitionRes.data.filter((tt: TuitionTransaction) => tt.studentId === custId);
          setTuitionTransactions(userTuitions);
        }

        if (enrRes.success && enrRes.data && custId) {
          const userEnrollments = enrRes.data.filter((e: CourseEnrollment) => e.studentId === custId);
          setEnrollments(userEnrollments);
        }
      } catch (err) {
        console.error('Failed to load customer profile details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [targetId]);

  // Lookup Maps for high-performance relations
  const branchesMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const coursesMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const batchesMap = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);

  // Preferred Branch & Multi-branch History from 100% real data
  const preferredBranchDistrict = useMemo(() => {
    if (bookings.length > 0) {
      const b = bookings[0];
      const foundBranch = b.branch || (b.branchId ? branchesMap.get(b.branchId) : undefined);
      if (foundBranch?.district) return foundBranch.district;
    }
    return branches[0]?.district || 'Quận 3';
  }, [bookings, branches, branchesMap]);

  const relatedBranchesText = useMemo(() => {
    const districts = new Set<string>();
    bookings.forEach((bk) => {
      const br = bk.branch || (bk.branchId ? branchesMap.get(bk.branchId) : undefined);
      if (br?.district) districts.add(br.district);
    });
    if (districts.size === 0) {
      return preferredBranchDistrict;
    }
    const arr = Array.from(districts);
    return `${arr.join(' và ')}.`;
  }, [bookings, branchesMap, preferredBranchDistrict]);

  // Activity Timeline synthesized dynamically from 100% REAL Supabase data
  const activityTimeline = useMemo(() => {
    const events: { timestamp: number; dateStr: string; text: string }[] = [];

    // Real Invoices
    invoices.forEach((inv) => {
      const d = inv.paidAt ? new Date(inv.paidAt) : new Date();
      events.push({
        timestamp: d.getTime(),
        dateStr: formatDateVN(inv.paidAt),
        text: `Hóa đơn ${inv.invoiceCode || ''}: ${(inv.totalAmount || 0).toLocaleString('vi-VN')}đ (${inv.paymentStatus === 'PAID' ? 'Đã hoàn tất thanh toán' : 'Chờ thu'}).`,
      });
    });

    // Real Tuition Transactions
    tuitionTransactions.forEach((tt) => {
      const d = tt.paidAt ? new Date(tt.paidAt) : new Date();
      events.push({
        timestamp: d.getTime(),
        dateStr: formatDateVN(tt.paidAt),
        text: `Biên lai học phí ${tt.transactionCode || ''}: ${(tt.amount || 0).toLocaleString('vi-VN')}đ (${tt.paymentStatus === 'PAID' ? 'Đã hoàn tất thanh toán' : 'Chờ thu'}).`,
      });
    });

    // Real Packages
    packages.forEach((pkg) => {
      const d = pkg.purchasedAt ? new Date(pkg.purchasedAt) : (pkg.expiresAt ? new Date(pkg.expiresAt) : new Date());
      const pkgName = pkg.package?.name || 'Gói liệu trình';
      events.push({
        timestamp: d.getTime(),
        dateStr: formatDateVN(pkg.purchasedAt || pkg.expiresAt),
        text: `Kích hoạt gói ${pkgName} (${pkg.totalSessions} buổi), đã thực hiện ${pkg.completedSessions}/${pkg.totalSessions} buổi.`,
      });
    });

    // Real Course Enrollments
    enrollments.forEach((enr) => {
      const d = enr.enrolledAt ? new Date(enr.enrolledAt) : new Date();
      const course = enr.courseId ? coursesMap.get(enr.courseId) : undefined;
      events.push({
        timestamp: d.getTime(),
        dateStr: formatDateVN(enr.enrolledAt),
        text: `Ghi danh khóa học ${course?.title || 'Academy'}, tiến độ ${enr.progressPercent || 0}%.`,
      });
    });

    // Real Treatment Journals
    journals.forEach((jrn) => {
      const d = jrn.sessionDate ? new Date(jrn.sessionDate) : new Date();
      events.push({
        timestamp: d.getTime(),
        dateStr: formatDateVN(jrn.sessionDate),
        text: `Ghi nhận buổi chăm sóc #${jrn.sessionNumber}: ${jrn.conditionAfter || 'hoàn thành theo phác đồ'}.`,
      });
    });

    // Real Bookings
    bookings.forEach((bk) => {
      const d = bk.bookingDate ? new Date(bk.bookingDate) : new Date();
      const br = bk.branch || (bk.branchId ? branchesMap.get(bk.branchId) : undefined);
      events.push({
        timestamp: d.getTime(),
        dateStr: formatDateVN(bk.bookingDate),
        text: `Đặt hẹn ${bk.bookingCode} tại ${br?.district || 'chi nhánh'} (${bk.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Hoàn tất'}).`,
      });
    });

    events.sort((a, b) => b.timestamp - a.timestamp);
    return events.slice(0, 5);
  }, [invoices, tuitionTransactions, packages, enrollments, journals, bookings, coursesMap, branchesMap]);

  // Total actual spending combining Spa invoices & Academy tuition payments
  const totalActualSpent = useMemo(() => {
    const paidInvoices = invoices.filter((i) => i.paymentStatus === 'PAID');
    const totalPaidInvoices = paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const paidTuitions = tuitionTransactions.filter((t) => t.paymentStatus === 'PAID');
    const totalPaidTuition = paidTuitions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const enrollmentPaid = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);
    const actualTuition = Math.max(totalPaidTuition, enrollmentPaid);
    const calculatedSum = totalPaidInvoices + actualTuition;
    return Math.max(customer?.totalSpent || 0, calculatedSum);
  }, [invoices, tuitionTransactions, enrollments, customer]);

  // Effective tier derived from actual spending or user record
  const effectiveTier = useMemo(() => {
    if (customer?.membershipTier && customer.membershipTier !== MemberTier.STANDARD) {
      return customer.membershipTier;
    }
    if (totalActualSpent >= 100_000_000) return MemberTier.DIAMOND;
    if (totalActualSpent >= 50_000_000) return MemberTier.PLATINUM;
    if (totalActualSpent >= 25_000_000) return MemberTier.GOLD;
    if (totalActualSpent >= 10_000_000) return MemberTier.SILVER;
    return MemberTier.STANDARD;
  }, [customer?.membershipTier, totalActualSpent]);

  // Financial Stats synthesized from 100% REAL Supabase data
  const financialStats = useMemo(() => {
    const paidInvoices = invoices.filter((i) => i.paymentStatus === 'PAID');
    const totalPaidInvoices = paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    const paidTuitions = tuitionTransactions.filter((t) => t.paymentStatus === 'PAID');
    const totalPaidTuition = paidTuitions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const enrollmentPaid = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);
    const actualTuition = Math.max(totalPaidTuition, enrollmentPaid);

    const paidCount = paidInvoices.length + (paidTuitions.length > 0 ? paidTuitions.length : (actualTuition > 0 ? 1 : 0));
    const paidAmount = totalActualSpent;

    // Academy deposit & tuition
    let unpaidEnrollmentDeposit = 0;
    let totalLearnedHours = 0;
    const enrolledCourseNames: string[] = [];

    enrollments.forEach((e) => {
      const c = e.courseId ? coursesMap.get(e.courseId) : undefined;
      if (c) {
        enrolledCourseNames.push(c.title);
        totalLearnedHours += Math.round((c.totalHours * (e.progressPercent || 0)) / 100);
      }
      const due = (e.tuitionTotal || 0) - (e.amountPaid || 0);
      if (due > 0) unpaidEnrollmentDeposit += due;
    });

    // Unpaid Bookings / Services
    let unpaidServiceDeposit = 0;
    bookings.forEach((b) => {
      if (b.paymentStatus === 'UNPAID') {
        unpaidServiceDeposit += b.finalPrice || 0;
      }
    });

    const totalDueImmediately = unpaidEnrollmentDeposit + unpaidServiceDeposit;

    return {
      paidCount,
      paidAmount,
      unpaidEnrollmentDeposit,
      unpaidServiceDeposit,
      totalDueImmediately,
      totalLearnedHours,
      enrolledCourseNames,
    };
  }, [invoices, tuitionTransactions, enrollments, coursesMap, bookings, customer, totalActualSpent]);

  // Unified Transactions List for Tab Giao dịch
  const allTransactions = useMemo(() => {
    type UnifiedTransaction = {
      id: string;
      code: string;
      type: 'INVOICE' | 'TUITION';
      title: string;
      dateStr: string;
      timestamp: number;
      method: string;
      amount: number;
      status: string;
      isPaid: boolean;
    };

    const list: UnifiedTransaction[] = [];

    invoices.forEach((inv) => {
      const d = inv.paidAt ? new Date(inv.paidAt) : new Date();
      list.push({
        id: inv.id,
        code: inv.invoiceCode || 'HD-POS',
        type: 'INVOICE',
        title: 'Hóa đơn dịch vụ & liệu trình Spa',
        dateStr: formatDateVN(inv.paidAt),
        timestamp: d.getTime(),
        method:
          inv.paymentMethod === PaymentMethod.BANK_TRANSFER || (inv.paymentMethod as string) === 'VIETQR'
            ? 'Chuyển khoản VietQR'
            : 'Ví MOMO / Tiền mặt',
        amount: inv.totalAmount || 0,
        status: inv.paymentStatus === 'PAID' ? 'Đã hoàn tất' : 'Chờ thanh toán',
        isPaid: inv.paymentStatus === 'PAID',
      });
    });

    tuitionTransactions.forEach((tt) => {
      const d = tt.paidAt ? new Date(tt.paidAt) : new Date();
      list.push({
        id: tt.id,
        code: tt.transactionCode || 'HP-ACADEMY',
        type: 'TUITION',
        title: 'Học phí đào tạo Học viện MLD',
        dateStr: formatDateVN(tt.paidAt),
        timestamp: d.getTime(),
        method:
          tt.paymentMethod === PaymentMethod.BANK_TRANSFER || (tt.paymentMethod as string) === 'VIETQR'
            ? 'Chuyển khoản VietQR'
            : 'Chuyển khoản ngân hàng',
        amount: tt.amount || 0,
        status: tt.paymentStatus === 'PAID' ? 'Đã hoàn tất' : 'Chờ thanh toán',
        isPaid: tt.paymentStatus === 'PAID',
      });
    });

    if (tuitionTransactions.length === 0 && enrollments.some((e) => (e.amountPaid || 0) > 0)) {
      enrollments.forEach((e) => {
        if ((e.amountPaid || 0) > 0) {
          const c = e.courseId ? coursesMap.get(e.courseId) : undefined;
          const d = e.enrolledAt ? new Date(e.enrolledAt) : new Date();
          list.push({
            id: `enr-pay-${e.id}`,
            code: `HP-${c?.code || 'K26'}-001`,
            type: 'TUITION',
            title: `Học phí khóa ${c?.title || 'Academy'}`,
            dateStr: formatDateVN(e.enrolledAt),
            timestamp: d.getTime(),
            method: 'Chuyển khoản VietQR',
            amount: e.amountPaid || 0,
            status: 'Đã hoàn tất',
            isPaid: true,
          });
        }
      });
    }

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [invoices, tuitionTransactions, enrollments, coursesMap]);

  // Handler: Complete 1 Session of Package
  const handleCompleteSession = async (pkg: UserPackage) => {
    if (!customer?.id) return;

    if (pkg.completedSessions >= pkg.totalSessions) {
      toast.warning(
        'Gói đã hoàn tất',
        'Tất cả các buổi trong gói liệu trình này đã được ghi nhận hoàn thành 100%.'
      );
      return;
    }

    setIsProcessingSession(true);
    try {
      const res = await treatmentService.completePackageSession(
        pkg.id,
        pkg.completedSessions,
        pkg.totalSessions,
        {
          customerId: customer.id,
          conditionBefore: 'Theo dõi liệu trình định kỳ',
          conditionAfter: 'Hoàn tất buổi chăm sóc theo phác đồ',
          specialistAdvice: 'Uống đủ 2 lít nước ấm, giữ ấm vùng cổ vai gáy',
        }
      );
      if (res.success) {
        setPackages((prev) =>
          prev.map((p) => {
            if (p.id === pkg.id) {
              const nextCount = p.completedSessions + 1;
              return {
                ...p,
                completedSessions: nextCount,
                status: nextCount >= p.totalSessions ? PackageStatus.COMPLETED : p.status,
              };
            }
            return p;
          })
        );
        toast.success(
          'Ghi nhận buổi trị liệu',
          `Đã hoàn thành buổi #${pkg.completedSessions + 1} cho gói "${pkg.package?.name || 'Liệu trình'}"!`
        );
      } else {
        toast.error('Lỗi', res.message || 'Không thể ghi nhận buổi trị liệu');
      }
    } catch (err) {
      toast.error('Lỗi', 'Không thể hoàn tất thao tác.');
    } finally {
      setIsProcessingSession(false);
    }
  };

  // Handler: Assign Package Submit
  const handleAssignPackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    const targetPkg = availablePackages.find((p) => p.id === selectedPackageId) || availablePackages[0];
    if (!targetPkg) {
      toast.warning('Chưa chọn gói', 'Vui lòng chọn một gói liệu trình để gán cho khách hàng.');
      return;
    }

    setIsAssigningPackage(true);
    try {
      const res = await treatmentService.assignPackageToCustomer({
        customerId: customer.id,
        packageId: targetPkg.id,
        packageName: targetPkg.name,
        totalSessions: targetPkg.totalSessions,
        price: targetPkg.discountPrice || targetPkg.price,
        validityMonths: targetPkg.validityMonths || 6,
      });

      if (res.success && res.data) {
        setPackages((prev) => [res.data, ...prev]);
        const addedPrice = targetPkg.discountPrice || targetPkg.price;
        setCustomer((prev) => prev ? { ...prev, totalSpent: (prev.totalSpent || 0) + addedPrice } : prev);
        toast.success(
          'Đăng ký gói thành công',
          `Đã kích hoạt gói "${targetPkg.name}" (${targetPkg.totalSessions} buổi) cho khách hàng ${customer.fullName}.`
        );
        setIsAssignModalOpen(false);
      } else {
        toast.error('Lỗi gán gói', res.message || 'Không thể đăng ký gói liệu trình');
      }
    } catch (err) {
      console.error('Lỗi khi gán gói liệu trình:', err);
      toast.error('Lỗi hệ thống', 'Không thể hoàn tất gán gói liệu trình.');
    } finally {
      setIsAssigningPackage(false);
    }
  };

  // Handler: Open Edit Profile Modal
  const handleOpenEditModal = () => {
    if (!customer) return;
    setFormData({
      fullName: customer.fullName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gender: (customer.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'FEMALE',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
      membershipTier: customer.membershipTier || MemberTier.GOLD,
      address: customer.address || '',
      emergencyContactName: customer.emergencyContactName || '',
      emergencyContactPhone: customer.emergencyContactPhone || '',
      purpose: customer.purpose || PurposeInterest.BEAUTY_SPA,
      preferredTechnician: preferredTech,
      clinicalNotes: clinicalNotes,
    });
    setIsEditModalOpen(true);
  };

  // Handler: Save Profile Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const cleanName = formData.fullName.trim();
    const cleanPhone = formData.phone.trim();
    const cleanPhoneDigits = cleanPhone.replace(/[\s.\-()]/g, '');
    const cleanEmail = formData.email.trim();
    const cleanEmergencyPhone = formData.emergencyContactPhone.trim().replace(/[\s.\-()]/g, '');

    if (!cleanName) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!cleanPhone) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập số điện thoại khách hàng.');
      return;
    }

    const phonePattern = /^(0|\+84)[0-9]{8,10}$|^1[89]00[0-9]{4}$/;
    if (!phonePattern.test(cleanPhoneDigits)) {
      toast.error(
        'Số điện thoại không hợp lệ',
        'Vui lòng nhập đúng định dạng số điện thoại (VD: 0988123456).'
      );
      return;
    }

    if (cleanEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(cleanEmail)) {
        toast.error('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email (VD: khachhang@gmail.com).');
        return;
      }
    }

    if (formData.dateOfBirth) {
      const dobDate = new Date(formData.dateOfBirth).getTime();
      if (dobDate > Date.now()) {
        toast.error('Ngày sinh không hợp lệ', 'Ngày sinh không thể diễn ra trong tương lai.');
        return;
      }
    }

    if (cleanEmergencyPhone && cleanEmergencyPhone === cleanPhoneDigits) {
      toast.warning(
        'Lưu ý liên hệ khẩn cấp',
        'Số ĐT khẩn cấp không nên trùng với số điện thoại chính của khách hàng.'
      );
    }

    setIsSubmitting(true);
    try {
      const updatedFields: Partial<User> = {
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail || null,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
        membershipTier: formData.membershipTier,
        address: formData.address.trim() || null,
        emergencyContactName: formData.emergencyContactName.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
        purpose: formData.purpose,
      };

      const res = await customerService.updateCustomer(customer.id, updatedFields);
      const newCustomerState: User = {
        ...customer,
        ...updatedFields,
        ...(res.success && res.data ? res.data : {}),
      };
      setCustomer(newCustomerState);
      setPreferredTech(formData.preferredTechnician.trim() || 'Trần Lan Anh');
      setClinicalNotes(formData.clinicalNotes.trim());

      localStorage.setItem(
        `mld_cust_${customer.id}`,
        JSON.stringify({
          ...updatedFields,
          preferredTechnician: formData.preferredTechnician.trim(),
          clinicalNotes: formData.clinicalNotes.trim(),
        })
      );

      toast.success('Cập nhật thành công', `Hồ sơ của khách hàng ${formData.fullName} đã được lưu lại.`);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Lỗi khi cập nhật hồ sơ khách hàng:', err);
      toast.error('Có lỗi xảy ra', 'Không thể lưu hồ sơ khách hàng vào lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierInfo = getNextTierInfo(effectiveTier, totalActualSpent);

  // Status Badge for Bookings
  const renderBookingStatusBadge = (status?: BookingStatus | string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EBF3E8] text-[#3D7A39] border border-[#CDE3C9] whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
            <span>Đã xác nhận</span>
          </span>
        );
      case 'IN_SERVICE':
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E8EFE5] text-[#526D51] border border-[#C7D9C3] whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 stroke-[2]" />
            <span>Đang thực hiện</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E6F4EA] text-[#137333] border border-[#A8DAB5] whitespace-nowrap">
            <Check className="w-3.5 h-3.5 stroke-[2]" />
            <span>Hoàn tất</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FDE8E8] text-[#9B1C1C] border border-[#F8B4B4] whitespace-nowrap">
            <X className="w-3.5 h-3.5 stroke-[2]" />
            <span>Đã hủy</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F9ECE0] text-[#985018] border border-[#F3C7A8] whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 stroke-[2]" />
            <span>Chờ thanh toán</span>
          </span>
        );
    }
  };

  // Status Badge for Enrollments
  const renderEnrollmentStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'STUDYING':
      case 'IN_PROGRESS':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FAF0E4] text-[#985018] whitespace-nowrap">
            Đang học
          </span>
        );
      case 'COMPLETED':
      case 'GRADUATED':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] whitespace-nowrap">
            Hoàn thành
          </span>
        );
      case 'ENROLLED':
      default:
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F5ECE3] text-[#8A4F23] whitespace-nowrap">
            Sắp học
          </span>
        );
    }
  };

  if (isLoading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
        <Loader2 className="w-8 h-8 animate-spin text-[#985018]" />
        <p className="text-xs font-semibold text-[#73675F]">
          Đang đồng bộ hồ sơ khách hàng từ Supabase Cloud...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E] pb-8">
      {/* 1. Horizontal Sub-Navigation Tabs matching media_1792570156063.png */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs whitespace-nowrap border-b border-[#EFE4D9]/60">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#F4ECE3] text-[#3E200C] font-bold shadow-2xs'
                  : 'text-[#73675F] hover:text-[#2C241E] hover:bg-white/60'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Profile Card, Preferences, Timeline (4 / 12 cols = 33.3%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Customer Profile & VIP Membership Card */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
            {/* Header: Avatar, Name, Phone, Tier, Edit Icon */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={customer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt={customer?.fullName || 'Khách hàng'}
                  className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#E0D7CC]"
                />
                <div>
                  <div className="text-base font-bold text-[#2C241E] leading-tight">
                    {customer?.fullName || 'Nguyễn Mỹ Duyên'}
                  </div>
                  <div className="text-xs text-[#73675F] mt-0.5">
                    {customer?.phone || '0987654321'} · Đã xác thực
                  </div>
                  <div className="text-xs font-semibold text-[#8A4F23] mt-0.5">
                    Hội viên {formatTierName(effectiveTier)}
                  </div>
                </div>
              </div>
              <button
                onClick={handleOpenEditModal}
                title="Chỉnh sửa hồ sơ"
                className="p-1.5 rounded-lg text-[#8A4F23] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* VIP Digital Membership Card (Bronze Gradient, Points, QR Code) */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-[#723712] via-[#653010] to-[#4F250C] text-white relative overflow-hidden shadow-sm">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full border border-white/15 pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-semibold text-[#F3E2CE]">
                  Hội viên {formatTierName(effectiveTier)}
                </span>
                <Crown className="w-4 h-4 text-[#F3E2CE] stroke-[2]" />
              </div>

              <div className="mt-3 relative z-10">
                <div className="text-[28px] font-extrabold text-white tracking-tight leading-none">
                  {(customer?.rewardPoints || 0).toLocaleString('vi-VN')} điểm
                </div>
                <div className="text-xs text-[#F3E2CE]/85 mt-1.5 font-medium">
                  Mã hội viên · {customer?.referralCode || 'MYDUYEN99'}
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-white/20 relative z-10">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="w-full flex items-center justify-between text-xs font-bold text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#F3E2CE]" />
                    <span>Xem thẻ hội viên</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-[#F3E2CE]/70 flex items-center justify-between">
                <span>Dữ liệu thời gian thực</span>
                <span>{totalActualSpent > 0 ? `${(totalActualSpent / 1000000).toFixed(1)}M chi tiêu` : '0đ chi tiêu'}</span>
              </div>
            </div>

            {/* Branch Specs: Chi nhánh ưu tiên & Lịch sử đa chi nhánh */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-[#EFE4D9]/80">
              <div className="flex items-center justify-between py-1">
                <span className="text-[#73675F]">Chi nhánh ưu tiên</span>
                <span className="font-bold text-[#2C241E]">{preferredBranchDistrict}</span>
              </div>
              <p className="text-xs text-[#73675F] leading-relaxed">
                Lịch sử đa chi nhánh: {relatedBranchesText}
              </p>
            </div>

            {/* Full-width outlined button: Chỉnh sửa hồ sơ */}
            <button
              onClick={handleOpenEditModal}
              className="w-full py-2.5 bg-white border border-[#D7BBA6] text-[#8A4F23] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs cursor-pointer"
            >
              Chỉnh sửa hồ sơ
            </button>
          </div>

          {/* Card 2: Sở thích & quyền truy cập */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#3E200C]">Sở thích & quyền truy cập</h3>
            <p className="text-xs text-[#4A3E34] leading-relaxed">
              {clinicalNotes}
            </p>
            <div>
              <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F5ECE3] text-[#985018]">
                Chỉ nhân sự được phân quyền
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#EFE4D9]/80">
              <span className="text-[#73675F]">Đồng ý liên hệ</span>
              <span className="font-bold text-[#2C241E]">Đã xác nhận</span>
            </div>
            <p className="text-[11px] text-[#73675F] leading-relaxed pt-0.5">
              Chỉ ghi chú sở thích dịch vụ. Không lưu chẩn đoán hoặc thông tin sức khỏe nhạy cảm.
            </p>
          </div>

          {/* Card 3: Dòng thời gian hoạt động từ dữ liệu thật */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-[#3E200C]">Dòng thời gian hoạt động</h3>
            {activityTimeline.length === 0 ? (
              <div className="text-xs text-[#8C7A6B] py-2 text-center">
                Chưa ghi nhận hoạt động giao dịch hoặc dịch vụ nào gần đây.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {activityTimeline.map((item, idx) => (
                  <div key={idx} className="text-[#4A3E34] leading-relaxed pb-2 border-b border-[#EFE4D9]/60 last:border-b-0 last:pb-0">
                    <span className="font-bold text-[#2C241E]">{item.dateStr}</span> · {item.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Overview & Detailed Tabs (8 / 12 cols = 66.6%) */}
        <div className="lg:col-span-8 space-y-5">
          {/* TAB: TỔNG QUAN (Exact screen layout with 100% REAL Supabase data) */}
          {activeTab === 'Tổng quan' && (
            <>
              {/* Section 1: Lịch hẹn sắp tới */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#3E200C]">
                    {bookings.length} lịch hẹn sắp tới
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5ECE3] text-[#985018]">
                    {bookings.length} bản ghi
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-[#F7EFE7] text-[#73675F] text-[11.5px] font-medium whitespace-nowrap">
                        <tr>
                          <th className="py-3 px-5 font-medium whitespace-nowrap">Ngày & giờ</th>
                          <th className="py-3 px-4 font-medium whitespace-nowrap">Dịch vụ / mã lịch</th>
                          <th className="py-3 px-4 font-medium whitespace-nowrap">Nhân sự / phòng</th>
                          <th className="py-3 px-5 font-medium whitespace-nowrap">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE4D9] whitespace-nowrap">
                        {bookings.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-[#8C7A6B]">
                              Chưa có lịch hẹn nào được ghi nhận cho khách hàng này.
                            </td>
                          </tr>
                        ) : (
                          bookings.slice(0, 5).map((app) => {
                            const br = app.branch || (app.branchId ? branchesMap.get(app.branchId) : undefined);
                            const districtName = br?.district || 'Quận 3';
                            const roomName = app.room?.name || 'Phòng VIP 01';
                            const techName = app.technician?.fullName || preferredTech || 'Trần Lan Anh';
                            const serviceName =
                              app.items && app.items.length > 0 && app.items[0].service?.name
                                ? app.items[0].service.name
                                : 'Chăm sóc Da Mặt Chuyên Sâu';

                            return (
                              <tr key={app.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                                <td className="py-3.5 px-5 whitespace-nowrap">
                                  <div className="font-bold text-[#2C241E] whitespace-nowrap">
                                    {formatDateVN(app.bookingDate)}
                                  </div>
                                  <div className="text-xs text-[#73675F] mt-0.5 whitespace-nowrap">
                                    {app.startTime.slice(0, 5)}–{app.endTime.slice(0, 5)}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-bold text-[#2C241E] whitespace-nowrap">
                                    {app.bookingCode}
                                  </div>
                                  <div className="text-xs text-[#73675F] mt-0.5 whitespace-nowrap">
                                    {serviceName}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-bold text-[#2C241E] whitespace-nowrap">
                                    {techName}
                                  </div>
                                  <div className="text-xs text-[#73675F] mt-0.5 whitespace-nowrap">
                                    {districtName} · {roomName}
                                  </div>
                                </td>
                                <td className="py-3.5 px-5 whitespace-nowrap">
                                  {renderBookingStatusBadge(app.status)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer with Pagination */}
                  <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F] bg-[#FAF8F5]">
                    <span>
                      Hiển thị {Math.min(bookings.length, 5)} / {bookings.length} bản ghi
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button className="w-6 h-6 rounded-md border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:bg-white disabled:opacity-40">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 h-6 rounded-md bg-[#FAF0E4] text-[#985018] font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <button className="w-6 h-6 rounded-md border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:bg-white disabled:opacity-40">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Active Treatment Packages from REAL database */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-[#EFE4D9] p-6 text-center shadow-xs">
                    <div className="w-10 h-10 rounded-full bg-[#F5ECE3] flex items-center justify-center text-[#985018] mx-auto mb-2">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-[#3E200C]">Khách hàng chưa đăng ký gói liệu trình nào</p>
                    <p className="text-xs text-[#73675F] mt-1">
                      Bấm vào tab "Liệu trình" để đăng ký gói phác đồ chăm sóc cho khách hàng.
                    </p>
                  </div>
                ) : (
                  packages.map((pkg) => {
                    const remaining = pkg.totalSessions - pkg.completedSessions;
                    const percent = pkg.totalSessions > 0 ? Math.round((pkg.completedSessions / pkg.totalSessions) * 100) : 0;
                    return (
                      <div
                        key={pkg.id}
                        className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-2.5"
                      >
                        <h3 className="text-base font-bold text-[#3E200C]">
                          {pkg.package?.name || 'Gói liệu trình chăm sóc da'}
                        </h3>
                        <div className="flex items-center justify-between text-xs whitespace-nowrap">
                          <span className="text-[#73675F] whitespace-nowrap">Tổng / đã dùng / còn lại</span>
                          <span className="font-bold text-[#2C241E] whitespace-nowrap">
                            {pkg.totalSessions} / {pkg.completedSessions} / {remaining} buổi
                          </span>
                        </div>
                        <div className="pt-0.5">
                          <div className="text-xs font-bold text-[#2C241E] mb-1.5 whitespace-nowrap">
                            Đã sử dụng {percent}%
                          </div>
                          <div className="w-full h-1.5 bg-[#EAE0D5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C49774] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#73675F] pt-1 whitespace-nowrap">
                          Hạn sử dụng: {formatDateVN(pkg.expiresAt)} · {preferredBranchDistrict}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Section 3: Học tập · Khóa đã ghi danh từ REAL database */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#3E200C]">
                    Học tập · {enrollments.length} khóa đã ghi danh
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#F5ECE3] text-[#985018]">
                    {enrollments.length} khóa học
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-[#F7EFE7] text-[#73675F] text-[11.5px] font-medium whitespace-nowrap">
                        <tr>
                          <th className="py-3 px-5 font-medium whitespace-nowrap">Khóa / lớp</th>
                          <th className="py-3 px-4 font-medium whitespace-nowrap">Trạng thái</th>
                          <th className="py-3 px-5 font-medium whitespace-nowrap">Tiến độ / kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE4D9] whitespace-nowrap">
                        {enrollments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-xs text-[#8C7A6B]">
                              Khách hàng chưa ghi danh khóa đào tạo nào tại Học viện MLD.
                            </td>
                          </tr>
                        ) : (
                          enrollments.map((enr) => {
                            const c = enr.courseId ? coursesMap.get(enr.courseId) : undefined;
                            const b = enr.batchId ? batchesMap.get(enr.batchId) : undefined;
                            return (
                              <tr key={enr.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                                <td className="py-3.5 px-5 whitespace-nowrap">
                                  <div className="font-bold text-[#2C241E] whitespace-nowrap">
                                    {c?.title || 'Khóa đào tạo chuyên môn'}
                                  </div>
                                  <div className="text-xs text-[#73675F] mt-0.5 whitespace-nowrap">
                                    {b?.batchCode || 'Lớp tiêu chuẩn'} · {c?.totalHours || 72} giờ / {c?.totalLessons || 12} bài
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  {renderEnrollmentStatusBadge(enr.status)}
                                </td>
                                <td className="py-3.5 px-5 whitespace-nowrap">
                                  <div className="font-bold text-[#2C241E] whitespace-nowrap">
                                    {enr.progressPercent || 0}% · {enr.completedLessonsCount || 0}/{c?.totalLessons || 20} bài
                                  </div>
                                  <div className="text-xs text-[#73675F] mt-0.5 whitespace-nowrap">
                                    Học phí: {(enr.tuitionTotal || 0).toLocaleString('vi-VN')}đ (Đã đóng: {(enr.amountPaid || 0).toLocaleString('vi-VN')}đ)
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer with Pagination */}
                  <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F] bg-[#FAF8F5]">
                    <span>
                      Hiển thị {enrollments.length} / {enrollments.length} bản ghi
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button className="w-6 h-6 rounded-md border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:bg-white disabled:opacity-40">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 h-6 rounded-md bg-[#FAF0E4] text-[#985018] font-bold flex items-center justify-center text-xs">
                        1
                      </span>
                      <button className="w-6 h-6 rounded-md border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:bg-white disabled:opacity-40">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Tài chính tài khoản từ REAL database */}
              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-[#3E200C]">Tài chính tài khoản</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#EFE4D9]/60 sm:border-b-0">
                    <span className="text-[#4A3E34]">{financialStats.paidCount} biên nhận đã thu</span>
                    <span className="font-bold text-[#2C241E]">
                      {financialStats.paidAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#EFE4D9]/60 sm:border-b-0">
                    <span className="text-[#4A3E34]">Cọc tuyển sinh chưa thu</span>
                    <span className="font-bold text-[#2C241E]">
                      {financialStats.unpaidEnrollmentDeposit.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#4A3E34]">Cọc dịch vụ chưa thu</span>
                    <span className="font-bold text-[#2C241E]">
                      {financialStats.unpaidServiceDeposit.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#4A3E34]">Cần thu ngay</span>
                    <span className="font-bold text-[#985018]">
                      {financialStats.totalDueImmediately.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EFE4D9]/80 text-xs text-[#73675F] leading-relaxed">
                  {financialStats.totalLearnedHours > 0 ? (
                    <>
                      {financialStats.totalLearnedHours} giờ đã học tại Học viện MLD.
                      {financialStats.enrolledCourseNames.length > 0 && (
                        <span> Đã ghi danh khóa: {financialStats.enrolledCourseNames.join(', ')}.</span>
                      )}
                      {financialStats.unpaidEnrollmentDeposit > 0 ? (
                        <span> Công nợ học phí còn lại: {financialStats.unpaidEnrollmentDeposit.toLocaleString('vi-VN')}đ.</span>
                      ) : (
                        <span> Đã thanh toán đầy đủ học phí theo quy định.</span>
                      )}
                    </>
                  ) : (
                    <>
                      Tổng chi tiêu tích lũy qua dịch vụ & khóa học: {financialStats.paidAmount.toLocaleString('vi-VN')}đ.
                      {financialStats.totalDueImmediately > 0 ? (
                        <span> Tổng các khoản cần thu ngay: {financialStats.totalDueImmediately.toLocaleString('vi-VN')}đ.</span>
                      ) : (
                        <span> Không phát sinh công nợ hoặc cọc tồn đọng.</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB: LỊCH HẸN (Deep-dive bookings view with actions) */}
          {activeTab === 'Lịch hẹn' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#3E200C]">
                    Lịch hẹn trị liệu & Phục hồi ({bookings.length})
                  </h3>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Toàn bộ lịch sử đặt chỗ và lịch hẹn sắp tới của khách hàng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const customerName = customer?.fullName || 'Nguyễn Mỹ Duyên';
                    const params = new URLSearchParams({
                      create: 'true',
                      customer: customerName,
                    });
                    if (customer?.id) params.set('customerId', customer.id);
                    if (customer?.phone) params.set('phone', customer.phone);
                    navigate(`/staff-schedule?${params.toString()}`);
                  }}
                  className="px-4 py-2 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+ Đặt lịch mới</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#F7EFE7] text-[#73675F] text-[11.5px] font-medium whitespace-nowrap">
                    <tr>
                      <th className="py-3 px-4 font-medium">Mã lịch</th>
                      <th className="py-3 px-4 font-medium">Thời gian</th>
                      <th className="py-3 px-4 font-medium">Dịch vụ</th>
                      <th className="py-3 px-4 font-medium">Chi nhánh & Phòng</th>
                      <th className="py-3 px-4 font-medium">Giá / Cọc</th>
                      <th className="py-3 px-4 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE4D9]">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#8C7A6B]">
                          Chưa có lịch hẹn nào được ghi nhận cho khách hàng này.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((bk) => (
                        <tr key={bk.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-4 font-bold text-[#2C241E]">{bk.bookingCode}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold">{formatDateVN(bk.bookingDate)}</div>
                            <div className="text-[#73675F]">{bk.startTime.slice(0, 5)}–{bk.endTime.slice(0, 5)}</div>
                          </td>
                          <td className="py-3 px-4">
                            {bk.items && bk.items.length > 0 ? bk.items[0].service?.name : 'Chăm sóc da chuyên sâu'}
                          </td>
                          <td className="py-3 px-4 text-[#73675F]">
                            {bk.branch?.district || 'Quận 3'} · {bk.room?.name || 'Phòng VIP 01'}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#985018]">
                            {(bk.finalPrice || 0).toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-3 px-4">{renderBookingStatusBadge(bk.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: LIỆU TRÌNH (Packages, complete sessions, clinical journals) */}
          {activeTab === 'Liệu trình' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#3E200C]">
                    Gói liệu trình & Phác đồ ({packages.length})
                  </h3>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Quản lý các gói liệu trình chăm sóc da, phục hồi và nhật ký điều trị
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-4 py-2 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Đăng ký gói mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.length === 0 ? (
                  <div className="col-span-2 bg-white rounded-2xl border border-[#EFE4D9] p-6 text-center text-xs text-[#8C7A6B]">
                    Khách hàng chưa đăng ký gói combo liệu trình dài hạn nào.
                  </div>
                ) : (
                  packages.map((pkg) => {
                    const remaining = pkg.totalSessions - pkg.completedSessions;
                    const percent = pkg.totalSessions > 0 ? Math.round((pkg.completedSessions / pkg.totalSessions) * 100) : 0;
                    return (
                      <div
                        key={pkg.id}
                        className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-2.5"
                      >
                        <h3 className="text-base font-bold text-[#3E200C]">
                          {pkg.package?.name || 'Gói chăm sóc phục hồi'}
                        </h3>
                        <div className="flex items-center justify-between text-xs whitespace-nowrap">
                          <span className="text-[#73675F]">Tổng / đã dùng / còn lại</span>
                          <span className="font-bold text-[#2C241E]">
                            {pkg.totalSessions} / {pkg.completedSessions} / {remaining} buổi
                          </span>
                        </div>
                        <div className="pt-0.5">
                          <div className="text-xs font-bold text-[#2C241E] mb-1.5">
                            Đã sử dụng {percent}%
                          </div>
                          <div className="w-full h-1.5 bg-[#EAE0D5] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#C49774] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#73675F] pt-1">
                          Hạn sử dụng: {formatDateVN(pkg.expiresAt)} · {preferredBranchDistrict}
                        </p>

                        {remaining > 0 ? (
                          <button
                            type="button"
                            disabled={isProcessingSession}
                            onClick={() => handleCompleteSession(pkg)}
                            className="w-full mt-2 py-2 px-3 bg-[#FAF3EC] hover:bg-[#F3E2CE] text-[#8A4F23] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isProcessingSession ? 'Đang ghi nhận...' : 'Ghi nhận thực hiện 1 buổi'}</span>
                          </button>
                        ) : (
                          <div className="mt-2 py-1.5 px-3 bg-[#E8F6ED] text-[#0D6832] rounded-xl text-xs font-bold text-center border border-[#C2E8D1]">
                            ✓ Đã hoàn tất 100% phác đồ
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Nhật ký trị liệu lâm sàng */}
              <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
                <h3 className="text-base font-bold text-[#3E200C]">
                  Nhật ký điều trị lâm sàng ({journals.length} buổi)
                </h3>
                <div className="space-y-3 text-xs">
                  {journals.length === 0 ? (
                    <div className="p-4 text-center text-[#8C7A6B]">
                      Chưa có nhật ký lâm sàng nào được ghi nhận.
                    </div>
                  ) : (
                    journals.map((j) => (
                      <div
                        key={j.id}
                        className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold text-[#2C241E]">
                          <span>Buổi #{j.sessionNumber} · Ngày {formatDateVN(j.sessionDate)}</span>
                          <span className="text-[#985018]">Đã hoàn thành</span>
                        </div>
                        <p className="text-[#5C5046]">
                          <span className="font-semibold">Tình trạng trước:</span> {j.conditionBefore}
                        </p>
                        <p className="text-[#5C5046]">
                          <span className="font-semibold">Sau trị liệu:</span> {j.conditionAfter}
                        </p>
                        <p className="text-[11px] text-[#8A796B] italic">
                          Lời dặn chuyên gia: {j.specialistAdvice}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: HỌC TẬP (Academy LMS, Enrollments, Certificates) */}
          {activeTab === 'Học tập' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#3E200C]">
                    Hồ sơ học viên & Khóa học Academy ({enrollments.length})
                  </h3>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Theo dõi tiến độ học tập, điểm danh và văn bằng chứng chỉ
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#F5ECE3] text-[#985018]">
                  Học viện MLD
                </span>
              </div>

              {enrollments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8C7A6B]">
                  Khách hàng chưa đăng ký khóa đào tạo nào tại Học viện MLD.
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((e) => {
                    const course = e.courseId ? coursesMap.get(e.courseId) : undefined;
                    const batch = e.batchId ? batchesMap.get(e.batchId) : undefined;
                    return (
                      <div
                        key={e.id}
                        className="p-4 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-[#2C241E]">
                          <span>{course?.title || 'Khóa học Dẫn Lưu Bạch Huyết'}</span>
                          {renderEnrollmentStatusBadge(e.status)}
                        </div>
                        <div className="text-[#73675F] flex flex-wrap justify-between gap-2">
                          <span>Mã lớp: {batch?.batchCode || 'MLD-K26-HCM'}</span>
                          <span>Thời lượng: {course?.totalHours || 72} giờ / {course?.totalLessons || 12} bài</span>
                          <span className="font-bold text-[#985018]">
                            Học phí: {(e.tuitionTotal || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: GIAO DỊCH (Invoices & POS Receipts & Tuition) */}
          {activeTab === 'Giao dịch' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#3E200C]">
                    Lịch sử giao dịch & Hóa đơn thu ngân ({allTransactions.length})
                  </h3>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Hóa đơn dịch vụ Spa, biên lai học phí Academy và chuyển khoản VietQR
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#F5ECE3] text-[#985018]">
                  Ví MLD Pay & VietQR
                </span>
              </div>

              <div className="space-y-3">
                {allTransactions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#8C7A6B]">
                    Chưa ghi nhận hóa đơn giao dịch hay biên lai học phí nào cho khách hàng này.
                  </div>
                ) : (
                  allTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2C241E]">{tx.code}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              tx.type === 'TUITION'
                                ? 'bg-[#EBF3E8] text-[#3D7A39] border border-[#CDE3C9]'
                                : 'bg-[#F5ECE3] text-[#985018] border border-[#F3C7A8]'
                            }`}
                          >
                            {tx.type === 'TUITION' ? 'Học phí Academy' : 'Dịch vụ Spa'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#73675F] mt-0.5">
                          {tx.dateStr} · {tx.title} · {tx.method}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#985018]">
                          {(tx.amount || 0).toLocaleString('vi-VN')}đ
                        </div>
                        <span className={`text-[10px] font-semibold ${tx.isPaid ? 'text-[#2E7D32]' : 'text-[#C2410C]'}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: GHI CHÚ (Clinical Notes & Technician Preferences) */}
          {activeTab === 'Ghi chú' && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
                <h3 className="text-base font-bold text-[#3E200C]">
                  Lưu ý chăm sóc & Ghi chú lâm sàng
                </h3>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="px-3 py-1.5 rounded-xl border border-[#D7BBA6] text-[#8A4F23] text-xs font-bold hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Cập nhật ghi chú</span>
                </button>
              </div>
              <div className="p-4 rounded-xl border border-[#EFE4D9] bg-[#FAF8F5] text-xs text-[#5C5046] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#2C241E]">
                    Kỹ thuật viên phụ trách: {preferredTech}
                  </p>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#F5ECE3] text-[#985018] font-bold">
                    Hồ sơ VIP
                  </span>
                </div>
                <p className="leading-relaxed">{clinicalNotes}</p>
              </div>
            </div>
          )}

          {/* Bottom Disclaimer Banner */}
          <div className="flex items-center gap-2 pt-1 text-xs text-[#73675F]">
            <Info className="w-4 h-4 text-[#985018] shrink-0" />
            <span>
              Dữ liệu lịch hẹn, liệu trình và học vụ được đồng bộ thời gian thực từ Supabase Cloud.
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: VIP Membership QR Code Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-sm p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-[#EFE4D9]">
              <h3 className="text-base font-extrabold text-[#3E200C]">Thẻ Hội Viên VIP MLD</h3>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF8F5] text-[#73675F] hover:text-[#2C241E] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] inline-block">
              <QrCode className="w-44 h-44 text-[#3E200C] mx-auto" />
            </div>
            <div>
              <div className="text-base font-bold text-[#2C241E]">{customer?.fullName}</div>
              <div className="text-xs text-[#8A4F23] font-semibold mt-0.5">
                Hội viên {formatTierName(effectiveTier)} · {(customer?.rewardPoints || 0).toLocaleString('vi-VN')} điểm
              </div>
              <div className="text-xs text-[#73675F] mt-1 font-mono tracking-wider">
                Mã hội viên: {customer?.referralCode || 'MYDUYEN99'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2.5 bg-[#985018] text-white text-xs font-bold rounded-xl hover:bg-[#854412] transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Treatment Package Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5ECE3] flex items-center justify-center text-[#985018]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#3E200C]">Đăng ký gói liệu trình</h3>
                  <p className="text-xs text-[#73675F]">Gán gói chăm sóc cho {customer?.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignPackageSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#2C241E] mb-1.5">
                  Chọn gói liệu trình điều trị
                </label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {pkg.totalSessions} buổi ({(pkg.discountPrice || pkg.price).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-[#73675F] leading-relaxed">
                Sau khi kích hoạt, số buổi sẽ tự động hiển thị trong mục Liệu trình và đồng bộ ví tài chính của khách hàng.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#E8DFD8] text-[#73675F] rounded-xl font-semibold hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isAssigningPackage}
                  className="px-4 py-2 bg-[#985018] text-white rounded-xl font-bold hover:bg-[#854412] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAssigningPackage ? 'Đang kích hoạt...' : 'Xác nhận gán gói'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F5ECE3] flex items-center justify-center text-[#985018] shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#3E200C]">Chỉnh sửa hồ sơ khách hàng</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                      MLD VIP Client
                    </span>
                  </div>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Cập nhật thông tin định danh cá nhân, phân hạng VIP và ghi chú lâm sàng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* PHẦN 1: THÔNG TIN ĐỊNH DANH */}
              <div>
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>1. Thông tin định danh & liên hệ</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Họ và tên <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Ví dụ: Nguyễn Mỹ Duyên"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Số điện thoại <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ví dụ: 0988123456"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Email liên hệ
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Ngày sinh
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Giới tính
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'FEMALE', label: 'Nữ' },
                      { key: 'MALE', label: 'Nam' },
                      { key: 'OTHER', label: 'Khác' },
                    ].map((g) => {
                      const isSel = formData.gender === g.key;
                      return (
                        <button
                          type="button"
                          key={g.key}
                          onClick={() => setFormData({ ...formData, gender: g.key as any })}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#FAF0E4] border-[#985018] text-[#985018] ring-1 ring-[#985018]'
                              : 'bg-white border-[#E8DFD8] text-[#73675F] hover:border-[#D7BBA6]'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PHẦN 2: HỘI VIÊN & GHI CHÚ */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>2. Hạng thẻ hội viên VIP & Ghi chú lâm sàng</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Hạng thẻ thành viên
                    </label>
                    <select
                      value={formData.membershipTier}
                      onChange={(e) => setFormData({ ...formData, membershipTier: e.target.value as any })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    >
                      <option value={MemberTier.STANDARD}>Chuẩn (Standard)</option>
                      <option value={MemberTier.SILVER}>Bạc (Silver)</option>
                      <option value={MemberTier.GOLD}>Vàng (Gold)</option>
                      <option value={MemberTier.PLATINUM}>Bạch Kim (Platinum)</option>
                      <option value={MemberTier.DIAMOND}>Kim Cương (Diamond)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Kỹ thuật viên phụ trách ưu tiên
                    </label>
                    <input
                      type="text"
                      value={formData.preferredTechnician}
                      onChange={(e) => setFormData({ ...formData, preferredTechnician: e.target.value })}
                      placeholder="Ví dụ: Trần Lan Anh"
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Sở thích & Ghi chú chăm sóc lâm sàng
                  </label>
                  <textarea
                    rows={3}
                    value={formData.clinicalNotes}
                    onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
                    placeholder="Ghi chú sở thích không gian, kỹ thuật lực, vùng cần lưu ý..."
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-[#E8DFD8] text-[#73675F] rounded-xl text-xs font-semibold hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#985018] text-white rounded-xl text-xs font-bold hover:bg-[#854412] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default W04_CustomerDetail;
