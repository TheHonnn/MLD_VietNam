import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { consumedSessions, belongsToPackage } from '../services/treatment-display.mjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Leaf,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  LoaderCircle,
  Phone,
  Crown,
  Share2,
  RotateCcw,
  Pause,
  Play,
  ArrowRightLeft,
  DollarSign,
  Ban,
  History,
  ShieldAlert,
  Award,
  AlertTriangle,
} from 'lucide-react';
import {
  treatmentService,
  customerService,
  branchService,
  bookingService,
  portalService,
} from '../services';
import { toast } from '../components/common';
import { ShareJournalModal, ShareJournalItem } from '../components/treatment/ShareJournalModal';
import { matchSearch } from '../utils/searchUtils';
import { supabaseService } from '../services/supabaseService';
import {
  TreatmentPackage as SharedTreatmentPackage,
  UserPackage,
  Service,
  TreatmentJournal,
  User,
  Branch,
  Technician,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  PackageStatus,
  DualSlotAvailability,
  Booking,
} from '../types/shared_types';

export const STANDARD_SPA_SLOTS = [
  { label: '09:00 – 10:00', startTime: '09:00:00', endTime: '10:00:00', startHour: '09:00' },
  { label: '10:00 – 11:00', startTime: '10:00:00', endTime: '11:00:00', startHour: '10:00' },
  { label: '11:00 – 12:00', startTime: '11:00:00', endTime: '12:00:00', startHour: '11:00' },
  { label: '13:30 – 14:30', startTime: '13:30:00', endTime: '14:30:00', startHour: '13:30' },
  { label: '14:30 – 15:30', startTime: '14:30:00', endTime: '15:30:00', startHour: '14:30' },
  { label: '15:30 – 16:30', startTime: '15:30:00', endTime: '16:30:00', startHour: '15:30' },
  { label: '16:30 – 17:30', startTime: '16:30:00', endTime: '17:30:00', startHour: '16:30' },
  { label: '17:30 – 18:30', startTime: '17:30:00', endTime: '18:30:00', startHour: '17:30' },
  { label: '18:30 – 19:30', startTime: '18:30:00', endTime: '19:30:00', startHour: '18:30' },
  { label: '19:30 – 20:30', startTime: '19:30:00', endTime: '20:30:00', startHour: '19:30' },
];

interface TreatmentPackageUI {
  id: string;
  packageId: string;
  serviceId?: string | null;
  name: string;
  customerId: string;
  sessionsTotal: number;
  price: string;
  rawPrice: number;
  purchaseDate: string;
  expiryDate: string;
  rawExpiryDate: string;
  usedSessions: number;
  remainingSessions: number;
  progressPercent: number;
  progressLabel: string;
  branch: string;
  status: string;
  rawStatus: string;
  treatmentName: string;
  serviceName: string;
  sessionsHistory: {
    id?: string;
    number: string;
    totalSessions: number;
    date: string;
    serviceName: string;
    conditionBefore?: string | null;
    conditionAfter?: string | null;
    specialistAdvice?: string | null;
    isUpcoming?: boolean;
    bookingCode?: string;
    time?: string;
    staff?: string;
    room?: string;
    statusBadge?: string;
    treatmentStartTime?: string | null;
    treatmentEndTime?: string | null;
    beforePhotos?: string[];
    afterPhotos?: string[];
    treatmentNotes?: string | null;
    isReversed?: boolean;
    reversedAt?: string | null;
    reversalReason?: string | null;
    clinicalApprovedAt?: string | null;
    clinicalApprovedBy?: string | null;
    hasAbnormalReaction?: boolean;
    adverseReactions?: string | null;
    treatmentAreas?: string[] | null;
    treatmentProtocol?: string | null;
    consumablesUsed?: any[];
  }[];
  historySubtitle: string;
  historyNote: string;
}

export const W06_TreatmentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [livePackages, setLivePackages] = useState<SharedTreatmentPackage[]>([]);
  const [liveUserPackages, setLiveUserPackages] = useState<UserPackage[]>([]);
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [liveJournals, setLiveJournals] = useState<TreatmentJournal[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [searchParams] = useSearchParams();
  const packageIdParam = searchParams.get('packageId') || '';
  const userPackageIdParam = searchParams.get('userPackageId') || '';
  const registrationAction = searchParams.get('action') || '';

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPackageType, setFilterPackageType] = useState(() => packageIdParam);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterExpiry, setFilterExpiry] = useState('');

  useEffect(() => {
    if (packageIdParam) {
      setFilterPackageType(packageIdParam);
    }
  }, [packageIdParam]);

  // Selection & Pagination
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Modals
  const [isBookNextModalOpen, setIsBookNextModalOpen] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  const [isAssignPackageModalOpen, setIsAssignPackageModalOpen] = useState(false);
  const [handledRegistrationAction, setHandledRegistrationAction] = useState(false);
  const [shareModalJournal, setShareModalJournal] = useState<ShareJournalItem | null>(null);

  // Form States
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingRequestId, setBookingRequestId] = useState(() => crypto.randomUUID());
  useEffect(() => { if (isBookNextModalOpen) setBookingRequestId(crypto.randomUUID()); }, [isBookNextModalOpen]);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  // Booking Form
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingBranchId, setBookingBranchId] = useState('');
  const [bookingTechnicianId, setBookingTechnicianId] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [drcSlots, setDrcSlots] = useState<DualSlotAvailability[]>([]);

  // Clinical Session Form
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionNumberInput, setSessionNumberInput] = useState(1);
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [treatmentStartTime, setTreatmentStartTime] = useState('');
  const [treatmentEndTime, setTreatmentEndTime] = useState('');
  const [conditionBefore, setConditionBefore] = useState('');
  const [conditionAfter, setConditionAfter] = useState('');
  const [specialistAdvice, setSpecialistAdvice] = useState('');
  const [selectedSessionBookingId, setSelectedSessionBookingId] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  // Assign Package Form
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [assignPackageId, setAssignPackageId] = useState('');
  const [assignStep, setAssignStep] = useState<1 | 2 | 3>(1);
  const [assignCustomerSearch, setAssignCustomerSearch] = useState('');

  // Extended Clinical Session Form State
  const [treatmentAreas, setTreatmentAreas] = useState('');
  const [treatmentProtocol, setTreatmentProtocol] = useState('');
  const [hasAbnormalReaction, setHasAbnormalReaction] = useState(false);
  const [adverseReactions, setAdverseReactions] = useState('');
  const [photoConsentGranted, setPhotoConsentGranted] = useState(true);
  const [consumablesList, setConsumablesList] = useState<Array<{ name: string; quantity: number; unit: string }>>([]);
  const [consumableNameInput, setConsumableNameInput] = useState('');
  const [consumableQtyInput, setConsumableQtyInput] = useState(1);
  const [consumableUnitInput, setConsumableUnitInput] = useState('ống');

  // Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Reversal Modal State
  const [reversalTargetJournal, setReversalTargetJournal] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  // Package Lifecycle Actions State
  const [actionModalType, setActionModalType] = useState<'pause' | 'resume' | 'extend' | 'cancel' | 'transfer' | 'refund' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionExtensionMonths, setActionExtensionMonths] = useState(3);
  const [actionTransferCustomerId, setActionTransferCustomerId] = useState('');
  const [actionTransferCustomerSearch, setActionTransferCustomerSearch] = useState('');
  const [actionRefundAmount, setActionRefundAmount] = useState(0);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Timeline / Audit Log State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  const fetchTreatmentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pkgRes, upkgRes, srvRes, jrnRes, custRes, brRes, techList, bookings, statsRes] = await Promise.all([
        treatmentService.getTreatmentPackages(),
        treatmentService.getUserPackagesByCustomer(),
        treatmentService.getServices(),
        treatmentService.getTreatmentJournalsByCustomer(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        supabaseService.getTechnicians(),
        bookingService.getBookings(),
        treatmentService.getTreatmentDashboardStats(),
      ]);

      if (statsRes.success) setDashboardStats(statsRes.data);

      if (pkgRes.success) setLivePackages(pkgRes.data);
      if (upkgRes.success) setLiveUserPackages(upkgRes.data);
      if (srvRes.success) setLiveServices(srvRes.data);
      if (jrnRes.success) setLiveJournals(jrnRes.data);
      if (bookings.success) setLiveBookings(bookings.data);
      if (custRes.success) setCustomers(custRes.data);
      if (brRes.success && brRes.data.length > 0) {
        setBranches(brRes.data);
        setBookingBranchId(brRes.data[0].id);
      }
      if (techList && techList.length > 0) {
        setTechnicians(techList);
      }
    } catch (err) {
      console.error('Failed to load treatment data:', err);
      toast.error('Lỗi nạp dữ liệu', 'Không thể kết nối đến máy chủ Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreatmentData();
  }, [fetchTreatmentData]);

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);
  const serviceMap = useMemo(() => new Map(liveServices.map((service) => [service.id, service])), [liveServices]);
  const bookingMap = useMemo(() => new Map(liveBookings.map((booking) => [booking.id, booking])), [liveBookings]);

  const availableBranchTechnicians = useMemo(() => {
    const list = technicians.filter((t) => !bookingBranchId || t.branchId === bookingBranchId);
    return list.length > 0 ? list : technicians;
  }, [technicians, bookingBranchId]);

  const packages: TreatmentPackageUI[] = useMemo(() => {
    if (!liveUserPackages || liveUserPackages.length === 0) return [];

    return liveUserPackages.map((up) => {
      const cust = custMap.get(up.customerId);
      const pkgDef = up.package || livePackages.find((p) => p.id === up.packageId);
      const journals = liveJournals
        .filter((j) => j.userPackageId === up.id)
        .sort((a, b) => a.sessionNumber - b.sessionNumber);

      // Only the backend confirmed ledger determines consumed entitlements.
      const used = consumedSessions(up.completedSessions);
      const total = up.totalSessions || pkgDef?.totalSessions || 0;
      const remaining = Math.max(0, total - used);
      const progressPercent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
      const expired = Boolean(up.expiresAt && new Date(up.expiresAt).getTime() <= Date.now());
      const effectiveStatus = up.status === 'PAUSED'
        ? 'PAUSED'
        : up.status === 'CANCELLED'
        ? 'CANCELLED'
        : up.status === 'TRANSFERRED'
        ? 'TRANSFERRED'
        : up.status === 'REFUNDED'
        ? 'REFUNDED'
        : up.status === 'PENDING_PAYMENT'
        ? 'PENDING_PAYMENT'
        : expired && up.status === 'ACTIVE'
        ? 'EXPIRED'
        : total > 0 && used >= total
        ? 'COMPLETED'
        : up.status;

      const purchaseFormatted = up.purchasedAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(up.purchasedAt))
        : '—';
      const expiryFormatted = up.expiresAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(up.expiresAt))
        : '—';

      const treatmentName = pkgDef?.name || '—';
      const serviceName = (pkgDef?.serviceId && serviceMap.get(pkgDef.serviceId)?.name) || '—';
      const statusLabels: Record<string, string> = {
        ACTIVE: 'Đang sử dụng',
        COMPLETED: 'Hoàn tất',
        EXPIRED: 'Hết hạn',
        CANCELLED: 'Đã hủy',
        PAUSED: 'Tạm dừng',
        PENDING_PAYMENT: 'Chờ thanh toán',
        TRANSFERRED: 'Đã chuyển nhượng',
        REFUNDED: 'Đã hoàn tiền',
      };
      const basePrice = Number(pkgDef?.price || 0);
      const discount = Number(pkgDef?.discountPrice || 0);
      const rawPrice = discount > 0 && discount < basePrice ? discount : basePrice;
      const priceText = `${rawPrice.toLocaleString('vi-VN')}đ`;

      const completedBookingIds = new Set(journals.map((journal) => journal.bookingId).filter(Boolean));
      const relatedBookings = liveBookings
        .filter((booking) => {
          if (booking.customerId !== up.customerId || completedBookingIds.has(booking.id)) return false;
          return belongsToPackage(booking,up.customerId,up.id);
        })
        .sort((a, b) => {
          const aTime = new Date(`${a.bookingDate}T${a.startTime || '00:00:00'}`).getTime();
          const bTime = new Date(`${b.bookingDate}T${b.startTime || '00:00:00'}`).getTime();
          return aTime - bTime;
        });

      const sessionsHistory: TreatmentPackageUI['sessionsHistory'] = journals.map((j) => {
        const booking = j.bookingId ? bookingMap.get(j.bookingId) : undefined;
        const timeFromBooking = booking?.startTime
          ? `${booking.startTime.slice(0, 5)}${booking.endTime ? `–${booking.endTime.slice(0, 5)}` : ''}`
          : undefined;
        return {
          id: j.id,
          number: String(j.sessionNumber).padStart(2, '0'),
          totalSessions: total,
          date: j.sessionDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(j.sessionDate)) : '—',
          serviceName,
          treatmentNotes: j.treatmentNotes || '',
          conditionBefore: j.conditionBefore || undefined,
          conditionAfter: j.conditionAfter || undefined,
          specialistAdvice: j.specialistAdvice || undefined,
          treatmentStartTime: j.treatmentStartTime || booking?.startTime || null,
          treatmentEndTime: j.treatmentEndTime || booking?.endTime || null,
          beforePhotos: j.beforePhotos || [],
          afterPhotos: j.afterPhotos || [],
          bookingCode: booking?.bookingCode,
          time: timeFromBooking,
          staff: booking?.technician?.fullName,
          room: booking?.room?.name,
          statusBadge: j.isReversed ? 'Đã hoàn tác' : j.confirmationStatus === 'CONFIRMED' ? 'Đã xác nhận' : j.confirmationStatus === 'DRAFT' ? 'Bản nháp' : 'Chờ xác nhận',
          isReversed: Boolean(j.isReversed),
          reversedAt: j.reversedAt,
          reversalReason: j.reversalReason,
          clinicalApprovedAt: j.clinicalApprovedAt,
          clinicalApprovedBy: j.clinicalApprovedBy,
          hasAbnormalReaction: Boolean(j.hasAbnormalReaction),
          adverseReactions: j.adverseReactions,
          treatmentAreas: j.treatmentAreas,
          treatmentProtocol: j.treatmentProtocol,
          consumablesUsed: j.consumablesUsed || [],
        };
      });

      relatedBookings.forEach((booking, index) => {
        const statusLabels: Record<string, string> = {
          PENDING: 'Chờ xác nhận',
          CONFIRMED: 'Đã xếp lịch',
          CHECKED_IN: 'Đã check-in',
          IN_SERVICE: 'Đang phục vụ',
          CANCELLED: 'Đã hủy',
          NO_SHOW: 'Không đến',
        };
        sessionsHistory.push({
          id: booking.id,
          number: String(Math.min(total, used + index + 1)).padStart(2, '0'),
          totalSessions: total,
          date: booking.bookingDate
            ? new Intl.DateTimeFormat('vi-VN').format(new Date(booking.bookingDate))
            : '—',
          serviceName,
          isUpcoming: true,
          bookingCode: booking.bookingCode,
          time: `${booking.startTime?.slice(0, 5) || '—'}–${booking.endTime?.slice(0, 5) || '—'}`,
          staff: booking.technician?.fullName,
          room: booking.room?.name || booking.assignedBedNumber || undefined,
          statusBadge: statusLabels[String(booking.status)] || String(booking.status),
        });
      });

      // Branch determination
      const latestRelatedBooking = [...relatedBookings].sort((a, b) =>
        new Date(`${b.bookingDate}T${b.startTime || '00:00:00'}`).getTime() -
        new Date(`${a.bookingDate}T${a.startTime || '00:00:00'}`).getTime()
      )[0];
      const branchName = latestRelatedBooking?.branch?.name ||
        (latestRelatedBooking?.branchId ? branchMap.get(latestRelatedBooking.branchId)?.name : undefined) ||
        'Chưa xếp cơ sở';

      return {
        id: up.id,
        packageId: up.packageId,
        serviceId: pkgDef?.serviceId,
        name: treatmentName,
        treatmentName,
        serviceName,
        customerId: up.customerId,
        sessionsTotal: total,
        price: priceText,
        rawPrice,
        purchaseDate: purchaseFormatted,
        expiryDate: expiryFormatted,
        rawExpiryDate: up.expiresAt || '',
        usedSessions: used,
        remainingSessions: remaining,
        progressPercent,
        progressLabel: `${progressPercent}% đã dùng`,
        branch: branchName,
        status: statusLabels[effectiveStatus] || '—',
        rawStatus: effectiveStatus || '',
        historySubtitle: `Hồ sơ liệu trình thực tế của ${cust?.fullName || 'khách hàng'}, đồng bộ trực tiếp từ Supabase Cloud.`,
        historyNote: `Đã hoàn thành ${used}/${total} buổi. Còn lại ${remaining} buổi hợp lệ đến ${expiryFormatted}.`,
        sessionsHistory,
      };
    });
  }, [liveUserPackages, livePackages, liveJournals, liveBookings, custMap, serviceMap, bookingMap, branchMap]);

  // Filter Logic
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // 1. Search text filter
      if (searchTerm.trim()) {
        const cust = custMap.get(pkg.customerId);
        const match = matchSearch(
          [pkg.name, pkg.price, cust?.fullName, cust?.phone, pkg.branch, pkg.status],
          searchTerm
        );
        if (!match) return false;
      }

      // 2. Package Type filter
      if (filterPackageType) {
        if (pkg.packageId !== filterPackageType && !pkg.name.toLowerCase().includes(filterPackageType.toLowerCase())) {
          return false;
        }
      }

      // 3. Status filter
      if (filterStatus) {
        if (filterStatus === 'ACTIVE' && pkg.rawStatus !== 'ACTIVE') return false;
        if (filterStatus === 'COMPLETED' && pkg.rawStatus !== 'COMPLETED') return false;
        if (filterStatus === 'PAUSED' && pkg.rawStatus !== 'PAUSED') return false;
        if (filterStatus === 'CANCELLED' && pkg.rawStatus !== 'CANCELLED') return false;
        if (filterStatus === 'REFUNDED' && pkg.rawStatus !== 'REFUNDED') return false;
        if (filterStatus === 'TRANSFERRED' && pkg.rawStatus !== 'TRANSFERRED') return false;
        if (filterStatus === 'PENDING_PAYMENT' && pkg.rawStatus !== 'PENDING_PAYMENT') return false;
        if (filterStatus === 'REVERSED' && !pkg.sessionsHistory.some((s) => s.isReversed)) return false;
        if (filterStatus === 'ABNORMAL_REACTION' && !pkg.sessionsHistory.some((s) => s.hasAbnormalReaction)) return false;
      }

      // 4. Expiry filter
      if (filterExpiry && pkg.rawExpiryDate) {
        const expDate = new Date(pkg.rawExpiryDate).getTime();
        const now = Date.now();
        const daysLeft = (expDate - now) / (1000 * 3600 * 24);

        if (filterExpiry === 'VALID' && expDate <= now) return false;
        if (filterExpiry === 'EXPIRED' && expDate > now) return false;
        if (filterExpiry === 'EXPIRING_SOON' && (daysLeft < 0 || daysLeft > 60)) return false;
      }

      return true;
    });
  }, [packages, searchTerm, filterPackageType, filterStatus, filterExpiry, custMap]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPackageType, filterStatus, filterExpiry]);

  // Auto select first package
  useEffect(() => {
    if (filteredPackages.length > 0 && (!selectedPkgId || !filteredPackages.some((p) => p.id === selectedPkgId))) {
      setSelectedPkgId(filteredPackages[0].id);
    }
  }, [filteredPackages, selectedPkgId]);

  useEffect(() => {
    if (userPackageIdParam && packages.some((pkg) => pkg.id === userPackageIdParam)) {
      setSelectedPkgId(userPackageIdParam);
    }
  }, [packages, userPackageIdParam]);

  // Fetch DRC slot availability when booking modal is opened
  useEffect(() => {
    if (isBookNextModalOpen && bookingDate) {
      const branchId = bookingBranchId || branches[0]?.id || 'aaaaaaaa-0001-0001-0001-000000000001';
      bookingService.getDaySlotsDualAvailability(branchId, bookingDate).then((res) => {
        if (res.success && res.data) {
          setDrcSlots(res.data);
        }
      }).catch(console.error);
    }
  }, [isBookNextModalOpen, bookingDate, bookingBranchId, branches]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const paginatedPackages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPackages.slice(start, start + pageSize);
  }, [filteredPackages, currentPage, pageSize]);

  const selectedPkg =
    filteredPackages.find((p) => p.id === selectedPkgId) ||
    filteredPackages[0] ||
    packages[0] || {
      id: '',
      packageId: '',
      serviceId: null,
      name: 'Chưa có gói liệu trình',
      customerId: '',
      sessionsTotal: 0,
      price: '0đ',
      rawPrice: 0,
      purchaseDate: '',
      expiryDate: '',
      rawExpiryDate: '',
      usedSessions: 0,
      remainingSessions: 0,
      progressPercent: 0,
      progressLabel: '0%',
      branch: 'Quận 3',
      status: 'Đang tải',
      rawStatus: 'ACTIVE',
      historySubtitle: 'Đang đồng bộ dữ liệu từ Supabase Cloud...',
      historyNote: '',
      sessionsHistory: [],
    };

  const selectedCustomer = custMap.get(selectedPkg.customerId);
  const selectedPackageBookings = useMemo(() => {
    const journalBookingIds = new Set(liveJournals.map((journal) => journal.bookingId).filter(Boolean));
    return liveBookings
      .filter((booking) => {
        if (booking.customerId !== selectedPkg.customerId || journalBookingIds.has(booking.id)) return false;
        if (!selectedPkg.serviceId) return true;
        return (booking.items || []).some((item) => item.serviceId === selectedPkg.serviceId);
      })
      .sort((a, b) => {
        const aTime = new Date(`${a.bookingDate}T${a.startTime || '00:00:00'}`).getTime();
        const bTime = new Date(`${b.bookingDate}T${b.startTime || '00:00:00'}`).getTime();
        return bTime - aTime;
      });
  }, [liveBookings, liveJournals, selectedPkg.customerId, selectedPkg.serviceId]);

  const selectedSessionBooking = selectedPackageBookings.find((booking) => booking.id === selectedSessionBookingId);

  const totalActivePackages = packages.filter((p) => p.rawStatus === 'ACTIVE').length;
  const totalRemainingSessions = packages.reduce((acc, p) => acc + p.remainingSessions, 0);
  const totalUsedSessions = packages.reduce((acc, p) => acc + p.usedSessions, 0);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || filterPackageType || filterStatus || filterExpiry
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterPackageType('');
    setFilterStatus('');
    setFilterExpiry('');
  };

  // --- ACTION: Đặt lịch hẹn buổi tiếp theo ---
  const handleOpenBookModal = () => {
    if (selectedPkg.rawStatus !== 'ACTIVE') {
      toast.warning(
        'Gói không thể đặt lịch',
        selectedPkg.rawStatus === 'EXPIRED'
          ? 'Gói đã hết hạn. Hãy gia hạn hoặc đăng ký gói mới trước khi xếp lịch.'
          : 'Chỉ gói đang hoạt động mới được sử dụng để đặt buổi.'
      );
      return;
    }
    if (!selectedPkg.id || selectedPkg.remainingSessions <= 0) {
      toast.warning('Gói đã hoàn tất', 'Gói liệu trình này đã hoàn thành đầy đủ các buổi.');
      return;
    }
    const tomorrow = new Date(Date.now() + 86400000);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    setBookingTime('09:00');
    const targetBranchId = bookingBranchId || branches[0]?.id || '';
    const branchTechs = technicians.filter((t) => !targetBranchId || t.branchId === targetBranchId);
    setBookingTechnicianId(branchTechs[0]?.id || technicians[0]?.id || '');
    setBookingNotes(`Buổi ${selectedPkg.usedSessions + 1}/${selectedPkg.sessionsTotal} - ${selectedPkg.name}`);
    setIsBookNextModalOpen(true);
  };

  useEffect(() => {
    if (
      !handledRegistrationAction
      && registrationAction === 'book-first-session'
      && userPackageIdParam
      && selectedPkg.id === userPackageIdParam
    ) {
      handleOpenBookModal();
      setHandledRegistrationAction(true);
    }
  }, [handledRegistrationAction, registrationAction, selectedPkg.id, userPackageIdParam]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn khách hàng hợp lệ.');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const selectedBranch = branchMap.get(bookingBranchId) || branches[0];
      const selectedTech = technicians.find((t) => t.id === bookingTechnicianId) || availableBranchTechnicians[0];
      const selectedSlotObj = STANDARD_SPA_SLOTS.find((s) => s.startHour === bookingTime) || STANDARD_SPA_SLOTS[0];
      const res = await treatmentService.bookPackageSession(selectedPkg.id, {
        branchId: selectedBranch?.id || '',
        technicianId: selectedTech?.id || null,
        bookingDate,
        startTime: selectedSlotObj.startTime,
        notes: bookingNotes,
        requestId: bookingRequestId,
      });

      if (res.success) {
        toast.success(
          'Đặt lịch thành công',
          `Đã tạo lịch hẹn ${res.data.bookingCode} cho khách hàng ${selectedCustomer.fullName} vào ngày ${bookingDate} (KTV: ${selectedTech?.fullName || 'MLD Clinic'}).`
        );
        setIsBookNextModalOpen(false);
      } else {
        toast.error('Lỗi tạo lịch hẹn', res.message || 'Không thể tạo lịch hẹn.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi hệ thống', err.message || 'Không thể kết nối máy chủ.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // --- ACTION: Ghi nhận buổi chăm sóc lâm sàng ---
  const handleOpenLogSessionModal = () => {
    if (!selectedPkg.id) return;
    if (selectedPkg.remainingSessions <= 0) {
      toast.warning(
        'Đã hoàn tất phác đồ',
        'Gói này đã hoàn thành đủ số buổi ban đầu. Bạn có thể đăng ký gói mới cho khách.'
      );
      return;
    }
    const inServiceBooking = selectedPackageBookings.find(
      (booking) => String(booking.status) === 'IN_SERVICE' && booking.sessionStatus !== 'COMPLETED'
    );
    if (!inServiceBooking) {
      const pendingWorkflowBooking = selectedPackageBookings.find((booking) =>
        ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(String(booking.status))
      );
      if (pendingWorkflowBooking) {
        toast.warning(
          'Chưa thể ghi nhật ký',
          'Lịch phải được check-in và bắt đầu phục vụ trước khi ghi nhận buổi chăm sóc.'
        );
        navigate(`/staff-schedule?booking=${encodeURIComponent(pendingWorkflowBooking.bookingCode || pendingWorkflowBooking.id)}`);
      } else {
        toast.warning(
          'Chưa có ca đang phục vụ',
          'Hãy đặt lịch, check-in và bắt đầu phục vụ trước. Hệ thống không trừ buổi bằng ghi nhận thủ công.'
        );
        handleOpenBookModal();
      }
      return;
    }
    setSelectedSessionBookingId(inServiceBooking.id);
    setSessionDate(inServiceBooking.bookingDate);
    setSessionNumberInput(selectedPkg.usedSessions + 1);
    setTreatmentNotes('');
    setTreatmentStartTime(
      inServiceBooking.serviceStartedAt
        ? new Date(inServiceBooking.serviceStartedAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : (inServiceBooking.startTime || '').slice(0, 5)
    );
    setTreatmentEndTime('');
    setConditionBefore('');
    setConditionAfter('');
    setSpecialistAdvice('');
    setTreatmentAreas('');
    setTreatmentProtocol('');
    setHasAbnormalReaction(false);
    setAdverseReactions('');
    setPhotoConsentGranted(true);
    setConsumablesList([]);
    setEvidenceFiles([]);
    setIsLogSessionModalOpen(true);
  };

  const handleSubmitLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg.id || !selectedSessionBooking) {
      toast.error('Thiếu ca phục vụ', 'Không tìm thấy lịch đang thực hiện để liên kết nhật ký.');
      return;
    }
    if (String(selectedSessionBooking.status) !== 'IN_SERVICE' || selectedSessionBooking.sessionStatus === 'COMPLETED') {
      toast.error('Ca không hợp lệ', 'Chỉ ca đang phục vụ mới được ghi nhật ký và trừ buổi.');
      return;
    }
    if (!conditionBefore.trim() || !conditionAfter.trim() || !treatmentNotes.trim() || !specialistAdvice.trim()) {
      toast.error('Thiếu hồ sơ chuyên môn', 'Nhập tình trạng trước/sau, nội dung thực hiện và lời dặn chăm sóc.');
      return;
    }

    setIsSubmittingSession(true);
    try {
      setIsUploadingEvidence(evidenceFiles.length > 0);
      const uploadedEvidence = await Promise.all(
        evidenceFiles.map((file) => portalService.uploadFileToStorage(file, file.name))
      );
      const res = await treatmentService.saveSessionDraftFromBooking(
        selectedPkg.id,
        {
          customerId: selectedPkg.customerId,
          bookingId: selectedSessionBooking.id,
          technicianId: selectedSessionBooking.technicianId || null,
          assignedRoomId: selectedSessionBooking.assignedRoomId || null,
          sessionNumber: sessionNumberInput,
          sessionDate: selectedSessionBooking.bookingDate,
          conditionBefore: conditionBefore.trim(),
          conditionAfter: conditionAfter.trim(),
          treatmentNotes,
          specialistAdvice: specialistAdvice.trim(),
          treatmentStartTime: treatmentStartTime || null,
          treatmentEndTime: treatmentEndTime || null,
          afterPhotos: uploadedEvidence,
          treatmentAreas: treatmentAreas
            .split(',')
            .map((area) => area.trim())
            .filter(Boolean),
          treatmentProtocol: treatmentProtocol.trim() || null,
          hasAbnormalReaction,
          adverseReactions: hasAbnormalReaction ? adverseReactions.trim() : null,
          consumablesUsed: consumablesList.length > 0 ? consumablesList : null,
          photosMetadata: {
            consentGranted: photoConsentGranted,
            uploadedCount: uploadedEvidence.length,
            photoType: 'AFTER',
            capturedAt: new Date().toISOString(),
          },
        }
      );

      if (res.success) {
        toast.success('Đã lưu hồ sơ nháp', 'Số buổi chưa thay đổi. Gửi hồ sơ và xác nhận buổi tại Nhật ký điều trị.');
        setIsLogSessionModalOpen(false);
        await fetchTreatmentData();
        navigate('/manage/treatment_journal');
      } else {
        toast.error('Không thể ghi nhận', res.message || 'Lỗi khi cập nhật buổi.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi hệ thống', err.message || 'Không thể ghi nhận buổi.');
    } finally {
      setIsUploadingEvidence(false);
      setIsSubmittingSession(false);
    }
  };

  // --- ACTION: Hoàn tác buổi điều trị an toàn ---
  const handleOpenReversalModal = (journal: any) => {
    setReversalTargetJournal(journal);
    setReversalReason('');
    setIsSubmittingReversal(false);
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTargetJournal?.id) {
      toast.error('Thiếu thông tin', 'Không tìm thấy buổi điều trị cần hoàn tác.');
      return;
    }
    if (!reversalReason.trim() || reversalReason.trim().length < 5) {
      toast.error('Lý do không hợp lệ', 'Vui lòng nhập lý do hoàn tác chi tiết (tối thiểu 5 ký tự).');
      return;
    }

    setIsSubmittingReversal(true);
    try {
      const res = await treatmentService.reverseSession(reversalTargetJournal.id, reversalReason.trim());
      if (res.success) {
        toast.success(
          'Hoàn tác buổi thành công',
          `Đã hoàn lại 1 buổi cho gói liệu trình, ghi sổ cái hoàn tác và điều chỉnh đối soát.`
        );
        setReversalTargetJournal(null);
        await fetchTreatmentData();
      } else {
        toast.error('Lỗi hoàn tác buổi', res.message || 'Không thể hoàn tác buổi điều trị.');
      }
    } catch (err: any) {
      toast.error('Lỗi hệ thống', err.message || 'Không thể kết nối máy chủ.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  // --- ACTION: Duyệt chuyên môn buổi điều trị ---
  const handleApproveClinical = async (journalId: string) => {
    try {
      const res = await treatmentService.approveClinicalSession(journalId);
      if (res.success) {
        toast.success('Duyệt chuyên môn thành công', 'Buổi điều trị đã được ghi nhận phê duyệt chuyên môn.');
        await fetchTreatmentData();
      } else {
        toast.error('Lỗi duyệt chuyên môn', res.message || 'Không thể duyệt buổi điều trị.');
      }
    } catch (err: any) {
      toast.error('Lỗi hệ thống', err.message || 'Không thể kết nối máy chủ.');
    }
  };

  // --- ACTION: Vận hành vòng đời gói (Pause, Resume, Extend, Cancel, Transfer, Refund) ---
  const handleExecutePackageAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg.id || !actionModalType) return;

    if (['pause', 'extend', 'cancel', 'transfer', 'refund'].includes(actionModalType) && (!actionReason.trim() || actionReason.trim().length < 3)) {
      toast.error('Thiếu lý do', 'Vui lòng nhập lý do thực hiện thao tác.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      let res: any;
      if (actionModalType === 'pause') {
        res = await treatmentService.pausePackage(selectedPkg.id, actionReason.trim());
      } else if (actionModalType === 'resume') {
        res = await treatmentService.resumePackage(selectedPkg.id);
      } else if (actionModalType === 'extend') {
        res = await treatmentService.extendPackage(selectedPkg.id, Number(actionExtensionMonths) || 3, actionReason.trim());
      } else if (actionModalType === 'cancel') {
        res = await treatmentService.cancelPackage(selectedPkg.id, actionReason.trim());
      } else if (actionModalType === 'transfer') {
        if (!actionTransferCustomerId) {
          toast.error('Thiếu khách hàng nhận', 'Vui lòng chọn khách hàng nhận chuyển nhượng.');
          setIsSubmittingAction(false);
          return;
        }
        res = await treatmentService.transferPackage(selectedPkg.id, actionTransferCustomerId, actionReason.trim());
      } else if (actionModalType === 'refund') {
        if (!actionRefundAmount || actionRefundAmount <= 0) {
          toast.error('Số tiền không hợp lệ', 'Vui lòng nhập số tiền hoàn hợp lệ lớn hơn 0đ.');
          setIsSubmittingAction(false);
          return;
        }
        res = await treatmentService.refundPackage(selectedPkg.id, actionRefundAmount, actionReason.trim());
      }

      if (res?.success) {
        toast.success('Thao tác thành công', res.message || 'Cập nhật vòng đời gói thành công.');
        setActionModalType(null);
        setActionReason('');
        setActionTransferCustomerId('');
        setActionRefundAmount(0);
        await fetchTreatmentData();
      } else {
        toast.error('Lỗi thực hiện', res?.message || 'Không thể thực hiện thao tác.');
      }
    } catch (err: any) {
      toast.error('Lỗi hệ thống', err.message || 'Không thể kết nối máy chủ.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // --- ACTION: Xem Timeline kiểm toán gói ---
  const handleOpenTimeline = async () => {
    if (!selectedPkg.id) return;
    setIsTimelineOpen(true);
    setIsLoadingTimeline(true);
    try {
      const res = await treatmentService.getPackageLifecycleLogs(selectedPkg.id);
      if (res.success) {
        setTimelineLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // --- ACTION: Đăng ký gói liệu trình mới ---
  const handleOpenAssignPackageModal = () => {
    setAssignCustomerId('');
    setAssignPackageId('');
    setAssignStep(1);
    setAssignCustomerSearch('');
    setIsAssignPackageModalOpen(true);
  };

  const handleSubmitAssignPackage = () => {
    const pkg = livePackages.find((p) => p.id === assignPackageId && p.isActive);
    const cust = customers.find((c) => c.id === assignCustomerId);

    if (!pkg || !cust) {
      toast.error('Thiếu thông tin', 'Thông tin khách hàng hoặc liệu trình không còn hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    window.location.href = `/cashier-pos?flow=treatment-registration&packageId=${encodeURIComponent(pkg.id)}&packageName=${encodeURIComponent(pkg.name)}&customerId=${encodeURIComponent(cust.id)}`;
  };

  const selectedAssignCustomer = customers.find((customer) => customer.id === assignCustomerId);
  const selectedAssignPackage = livePackages.find((pkg) => pkg.id === assignPackageId && pkg.isActive);
  const assignPackagePrice = selectedAssignPackage
    ? Number(selectedAssignPackage.discountPrice) > 0 && Number(selectedAssignPackage.discountPrice) < Number(selectedAssignPackage.price)
      ? Number(selectedAssignPackage.discountPrice)
      : Number(selectedAssignPackage.price)
    : 0;
  const assignPackageSavings = selectedAssignPackage
    ? Math.max(0, Number(selectedAssignPackage.price) - assignPackagePrice)
    : 0;
  const filteredAssignCustomers = customers.filter((customer) =>
    matchSearch([customer.fullName, customer.phone, customer.email], assignCustomerSearch)
  );

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
              Quản lý liệu trình
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
              Dữ liệu thực Supabase
            </span>
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Hồ sơ liệu trình spa & phân bổ buổi chăm sóc chuyên sâu thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenAssignPackageModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#8A4F23] border border-[#D7BBA6] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Đăng ký gói mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenBookModal}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Đặt buổi tiếp theo</span>
          </button>
        </div>
      </div>

      {/* 2. Operational KPI Summary Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Vòng đời gói */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Gói đang lưu hành</span>
            <Leaf className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">
            {dashboardStats?.activePackages ?? totalActivePackages}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#73675F] mt-2 flex-wrap">
            <span className="text-[#B45309] font-medium">Tạm dừng: {dashboardStats?.pausedPackages ?? 0}</span>
            <span>•</span>
            <span className="text-[#DC2626] font-medium">Hết hạn: {dashboardStats?.expiredPackages ?? 0}</span>
          </div>
        </div>

        {/* KPI 2: Buổi liệu trình & Sổ cái */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Buổi khả dụng / Đã dùng</span>
            <Calendar className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">
            {dashboardStats?.remainingSessions ?? totalRemainingSessions}
            <span className="text-sm font-normal text-[#73675F] ml-1.5">
              / {dashboardStats?.usedSessions ?? totalUsedSessions} đã dùng
            </span>
          </div>
          <div className="text-[11px] text-[#73675F] mt-2">
            Tổng phác đồ: {(dashboardStats?.remainingSessions ?? totalRemainingSessions) + (dashboardStats?.usedSessions ?? totalUsedSessions)} buổi
          </div>
        </div>

        {/* KPI 3: Vận hành & Hoàn tác */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Lịch hẹn & Đối soát</span>
            <SlidersHorizontal className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">
            {dashboardStats?.upcomingBookings ?? 0}
            <span className="text-xs font-normal text-[#73675F] ml-1.5">lịch sắp tới</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#73675F] mt-2">
            <RotateCcw className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Đã hoàn tác: <strong className="text-[#B45309]">{dashboardStats?.reversalsCount ?? 0}</strong> ca</span>
          </div>
        </div>

        {/* KPI 4: Lâm sàng & Đồng bộ Outbox */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F]">
            <span>Giám sát chuyên môn</span>
            <ShieldAlert className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">
            {dashboardStats?.abnormalReactionsCount ?? 0}
            <span className="text-xs font-normal text-[#DC2626] ml-1.5">phản ứng bất thường</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#73675F] mt-2 flex-wrap">
            <span>Kho chờ sync: <strong>{dashboardStats?.pendingInventorySync ?? 0}</strong></span>
            <span>•</span>
            <span>Hoa hồng chờ: <strong>{dashboardStats?.pendingCommissionsCount ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar (Active Dropdowns & Search) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách hàng, mã gói hoặc tên liệu trình..."
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown 1: Loại gói */}
        <div className="relative min-w-[170px] flex-1 sm:flex-none">
          <select
            value={filterPackageType}
            onChange={(e) => setFilterPackageType(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] focus:outline-none focus:border-[#985018] transition-colors cursor-pointer truncate"
          >
            <option value="">Tất cả loại gói</option>
            <option value="Phục Hồi & Trẻ Hóa Da">Gói Phục Hồi & Trẻ Hóa Da</option>
            <option value="Dưỡng Sinh Đả Thông Kinh Lạc">Gói Dưỡng Sinh Kinh Lạc</option>
            {livePackages.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 2: Trạng thái */}
        <div className="relative min-w-[160px] flex-1 sm:flex-none">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] focus:outline-none focus:border-[#985018] transition-colors cursor-pointer truncate"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang sử dụng</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="EXPIRED">Hết hạn</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="TRANSFERRED">Đã chuyển nhượng</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
            <option value="REVERSED">Có buổi đã hoàn tác</option>
            <option value="ABNORMAL_REACTION">Có phản ứng bất thường</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 3: Hạn sử dụng */}
        <div className="relative min-w-[155px] flex-1 sm:flex-none">
          <select
            value={filterExpiry}
            onChange={(e) => setFilterExpiry(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] focus:outline-none focus:border-[#985018] transition-colors cursor-pointer truncate"
          >
            <option value="">Tất cả thời hạn</option>
            <option value="VALID">Còn hạn sử dụng</option>
            <option value="EXPIRING_SOON">Sắp hết hạn (≤ 60 ngày)</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset filter button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <X className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Đặt lại</span>
          </button>
        )}
      </div>

      {/* 4. Packages Table Card */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        {/* Table Header Row */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#EFE4D9] whitespace-nowrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#2C241E] whitespace-nowrap">
              Gói liệu trình dịch vụ MLD
            </h2>
            {isLoading && <LoaderCircle className="w-4 h-4 text-[#985018] animate-spin" />}
          </div>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F5E9DB] text-[#8A4F23] whitespace-nowrap shrink-0">
            {filteredPackages.length} gói hoạt động
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-5 whitespace-nowrap">Mã liệu trình</th>
                <th className="py-3 px-5 whitespace-nowrap">Tên liệu trình</th>
                <th className="py-3 px-5 whitespace-nowrap">Tên dịch vụ</th>
                <th className="py-3 px-5 whitespace-nowrap">Tên khách hàng</th>
                <th className="py-3 px-5 whitespace-nowrap">Số buổi</th>
                <th className="py-3 px-5 whitespace-nowrap">Tổng số buổi cần điều trị</th>
                <th className="py-3 px-5 whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC] whitespace-nowrap">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#73675F] whitespace-normal">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy gói liệu trình</p>
                      <p className="text-xs text-[#8C7A6B]">
                        {hasActiveFilters
                          ? 'Không có gói liệu trình nào phù hợp với bộ lọc hiện tại.'
                          : 'Chưa có gói liệu trình nào được đăng ký trên Supabase Cloud.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((pkg) => {
                  const isSelected = selectedPkgId === pkg.id;
                  const cust = custMap.get(pkg.customerId);

                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#F8F1E8] border-l-4 border-[#985018]' : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
      <td className="py-4 px-5 font-mono text-[11px] text-[#73675F]" title={pkg.id}>LT-{pkg.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-4 px-5 font-semibold text-[#2C241E]">{pkg.treatmentName}</td>
                      <td className="py-4 px-5 text-[#554A41]">{pkg.serviceName}</td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={cust?.avatarUrl || '/avatar_minh_anh.png'}
                            alt={cust?.fullName || 'Khách'}
                            className="w-6 h-6 rounded-full object-cover border border-[#EFE4D9]"
                          />
                          <div>
                            <div className="text-xs font-bold text-[#2C241E]">
                              {cust?.fullName || 'Khách hàng'}
                            </div>
                            <div className="text-[10.5px] text-[#8C7A6B]">
                              {cust?.phone || ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-semibold">{pkg.usedSessions}</span> buổi
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        {pkg.sessionsTotal} buổi
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold whitespace-nowrap ${
                            pkg.rawStatus === 'COMPLETED'
                              ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                              : pkg.rawStatus === 'PAUSED'
                              ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                              : pkg.rawStatus === 'EXPIRED'
                              ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                              : pkg.rawStatus === 'CANCELLED' || pkg.rawStatus === 'REFUNDED'
                              ? 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]'
                              : pkg.rawStatus === 'TRANSFERRED'
                              ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]'
                              : 'bg-[#F5E9DB] text-[#8A4F23] border border-[#E8DFD8]'
                          }`}
                        >
                          {pkg.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
          <span className="whitespace-nowrap">
            Hiển thị {filteredPackages.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, filteredPackages.length)} / {filteredPackages.length} gói liệu trình
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1 rounded-md text-[#73675F] border border-[#EFE4D9] transition-colors ${
                currentPage <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#FAF8F5] cursor-pointer'
              }`}
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                onClick={() => setCurrentPage(pg)}
                className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center cursor-pointer transition-colors ${
                  currentPage === pg
                    ? 'bg-[#985018] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#8A4F23] hover:bg-[#F3E2CE]'
                }`}
              >
                {pg}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1 rounded-md text-[#73675F] border border-[#EFE4D9] transition-colors ${
                currentPage >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#FAF8F5] cursor-pointer'
              }`}
              title="Trang sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Two Columns: Sessions History (Left) + Detail & Policy (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Sessions History */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2C241E]">
                Lịch sử buổi chăm sóc · {selectedPkg.name}
              </h2>
              <p className="text-xs text-[#73675F] mt-1">
                {selectedPkg.historySubtitle}
              </p>
            </div>
            {selectedPkg.remainingSessions > 0 && (
              <button
                type="button"
                onClick={handleOpenBookModal}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Xếp lịch buổi {selectedPkg.usedSessions + 1}</span>
              </button>
            )}
          </div>

          {/* Session Cards List */}
          <div className="space-y-2.5 pt-1">
            {selectedPkg.sessionsHistory.length === 0 ? (
              <div className="p-8 text-center text-[#8C7A6B] bg-[#FAF8F5] rounded-xl border border-dashed border-[#E8DFD8]">
                Chưa có buổi chăm sóc nào được ghi chép cho gói này.
              </div>
            ) : (
              selectedPkg.sessionsHistory.map((s, idx) => {
                return (
                  <div
                    key={idx}
                    className="bg-[#F8F5F0] border border-[#EFE4D9] rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.isReversed ? (
                          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Đã hoàn tác
                          </span>
                        ) : s.isUpcoming ? (
                          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {s.statusBadge}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#2C241E]">Buổi {s.number} · {s.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#73675F] font-medium">{s.treatmentNotes || '—'}</span>
                        {s.id && !s.isReversed && !s.isUpcoming && (
                          <>
                            {s.clinicalApprovedAt ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                                <Award className="w-3 h-3" /> Đã duyệt
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApproveClinical(s.id!)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#1E40AF] bg-white hover:bg-[#EFF6FF] border border-[#93C5FD] rounded-lg transition-all shadow-xs cursor-pointer"
                                title="Xác nhận duyệt chuyên môn cho buổi điều trị này"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Duyệt</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenReversalModal(s)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#DC2626] bg-white hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-all shadow-xs cursor-pointer"
                              title="Hoàn tác buổi này và hoàn trả lại 1 buổi vào gói liệu trình"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Hoàn tác</span>
                            </button>
                          </>
                        )}
                        {s.id && (
                          <button
                            type="button"
                            onClick={() => setShareModalJournal({
                              id: s.id!,
                              sessionNumber: s.number,
                              sessionDate: s.date,
                              customerName: selectedCustomer?.fullName || 'Khách hàng',
                              customerPhone: selectedCustomer?.phone,
                              customerEmail: selectedCustomer?.email,
                              serviceName: selectedPkg.serviceName || s.serviceName,
                              branchName: selectedPkg.branch,
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#8A4F23] bg-white hover:bg-[#8A4F23] hover:text-white border border-[#D5A26F] rounded-lg transition-all shadow-xs cursor-pointer"
                            title="Chia sẻ link & In/Xuất PDF nhật ký điều trị"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Chia sẻ & PDF</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {s.isReversed && (
                      <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-2.5 text-xs text-[#991B1B] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Buổi này đã được hoàn tác an toàn và hoàn trả lại vào gói</span>
                        </div>
                        <div><strong>Lý do hoàn tác:</strong> {s.reversalReason || '—'}</div>
                        <div className="text-[10.5px] text-[#B91C1C]">
                          Thời điểm: {s.reversedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(s.reversedAt)) : '—'}
                        </div>
                      </div>
                    )}

                    {s.hasAbnormalReaction && (
                      <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                        <div>
                          <span className="font-bold">Cảnh báo phản ứng bất thường: </span>
                          <span>{s.adverseReactions || 'Có ghi nhận phản ứng bất thường cần theo dõi lâm sàng.'}</span>
                        </div>
                      </div>
                    )}

                    {s.consumablesUsed && s.consumablesUsed.length > 0 && (
                      <div className="text-[11px] text-[#554A41] bg-white p-2.5 rounded-lg border border-[#EFE4D9]">
                        <span className="font-semibold text-[#8A4F23]">Vật tư tiêu hao ghi nhận: </span>
                        <span>{s.consumablesUsed.map((c: any) => `${c.name} (${c.quantity} ${c.unit || ''})`).join(' • ')}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#554A41]">
                      <div><span className="font-semibold text-[#8A4F23]">Giờ điều trị:</span> {s.treatmentStartTime?.slice(0, 5) || '—'}{s.treatmentEndTime ? `–${s.treatmentEndTime.slice(0, 5)}` : ''}</div>
                      <div><span className="font-semibold text-[#8A4F23]">Số buổi:</span> {s.number}/{s.totalSessions || '—'}</div>
                      <div><span className="font-semibold text-[#8A4F23]">Dịch vụ:</span> {selectedPkg.serviceName}</div>
                      <div><span className="font-semibold text-[#8A4F23]">Trạng thái:</span> {s.statusBadge || 'Đã hoàn thành'}</div>
                    </div>

                    {(s.conditionBefore || s.conditionAfter || s.specialistAdvice) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-[#EFE4D9]">
                        {s.conditionBefore && (
                          <div>
                            <span className="font-semibold text-[#8A4F23]">Trước trị liệu: </span>
                            <span className="text-[#554A41]">{s.conditionBefore}</span>
                          </div>
                        )}
                        {s.conditionAfter && (
                          <div>
                            <span className="font-semibold text-[#8A4F23]">Sau trị liệu: </span>
                            <span className="text-[#554A41]">{s.conditionAfter}</span>
                          </div>
                        )}
                        {s.specialistAdvice && (
                          <div className="sm:col-span-2 pt-1 border-t border-[#F5EDE5]">
                            <span className="font-semibold text-[#2E7D32]">Lời khuyên chuyên viên: </span>
                            <span className="text-[#554A41]">{s.specialistAdvice}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-[#554A41]">
                      <span className="font-semibold text-[#8A4F23]">Nội dung:</span> {s.treatmentNotes || s.conditionAfter || s.conditionBefore || '—'}
                    </div>
                    {(s.beforePhotos?.length || s.afterPhotos?.length) ? (
                      <div className="flex flex-wrap gap-2">
                        {[...(s.beforePhotos || []), ...(s.afterPhotos || [])].map((photo, photoIndex) => (
                          <img key={`${photo}-${photoIndex}`} src={photo} alt={`Minh chứng ${photoIndex + 1}`} className="w-16 h-16 rounded-lg object-cover border border-[#E8DFD8]" />
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#8C7A6B]">Hình ảnh minh chứng: Chưa có</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footnote below sessions */}
          <div className="text-xs text-[#73675F] pt-1">
            {selectedPkg.historyNote}
          </div>
        </div>

        {/* Right Column: Active Package Summary & Policy */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Selected Package Details */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-base font-bold text-[#2C241E]">
              Chi tiết gói liệu trình đang chọn
            </h2>

            {/* Customer Profile Snippet */}
            <div className="flex items-center gap-3 pt-0.5">
              <img
                src={selectedCustomer?.avatarUrl || '/avatar_minh_anh.png'}
                alt={selectedCustomer?.fullName || 'Khách hàng'}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EFE4D9]"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2C241E] truncate">
                  {selectedCustomer?.fullName || 'Khách hàng'}
                </div>
                <div className="text-[11px] text-[#73675F] truncate mt-0.5">
                  {selectedCustomer?.phone || ''} · Hội viên {selectedCustomer?.membershipTier || 'Thành viên'}
                </div>
              </div>
            </div>

            {/* Specs Breakdown */}
            <div className="space-y-2 text-xs text-[#73675F] pt-1">
              <div className="flex items-center justify-between">
                <span>Số buổi ban đầu</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedPkg.sessionsTotal} buổi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Đã hoàn thành</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedPkg.usedSessions} buổi
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Còn sử dụng</span>
                <span className="font-semibold text-[#2C241E]">
                  {selectedPkg.remainingSessions} buổi
                </span>
              </div>
            </div>

            {/* Progress Section */}
            <div className="pt-1">
              <div className="text-xs font-semibold text-[#2C241E] mb-1.5 flex items-center justify-between">
                <span>Tiến độ thực hiện</span>
                <span>{selectedPkg.progressPercent}%</span>
              </div>
              <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${selectedPkg.progressPercent}%` }}
                  className={`h-full rounded-full transition-all ${
                    selectedPkg.rawStatus === 'COMPLETED' ? 'bg-[#059669]' : 'bg-[#985018]'
                  }`}
                />
              </div>
            </div>

            {/* Expiry */}
            <div className="flex items-center justify-between text-xs text-[#73675F] pt-1">
              <span>Ngày hết hạn</span>
              <span className="font-semibold text-[#2C241E]">
                {selectedPkg.expiryDate}
              </span>
            </div>

            {/* Contextual Status Banner & Việc tiếp theo */}
            {selectedPkg.rawStatus === 'PAUSED' && (
              <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Pause className="w-4 h-4 text-[#D97706]" />
                  <span>Gói đang tạm dừng</span>
                </div>
                <p className="text-[11px] leading-relaxed">Khách hàng tạm thời không thể đặt lịch mới. Mở lại gói để tiếp tục phác đồ.</p>
                <button
                  type="button"
                  onClick={() => setActionModalType('resume')}
                  className="w-full py-2 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Mở lại gói ngay</span>
                </button>
              </div>
            )}

            {selectedPkg.rawStatus === 'EXPIRED' && (
              <div className="p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                  <span>Gói đã hết hạn ({selectedPkg.expiryDate})</span>
                </div>
                <p className="text-[11px] leading-relaxed">Vui lòng gia hạn thêm thời hạn hoặc tư vấn khách đăng ký gói mới.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActionModalType('extend');
                    setActionReason('');
                    setActionExtensionMonths(3);
                  }}
                  className="w-full py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Gia hạn thời hạn gói</span>
                </button>
              </div>
            )}

            {selectedPkg.rawStatus === 'ACTIVE' && selectedPkg.remainingSessions > 0 && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenBookModal}
                  className="w-full py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Đặt buổi tiếp theo ({selectedPkg.usedSessions + 1}/{selectedPkg.sessionsTotal})</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenLogSessionModal}
                  className="w-full py-2 bg-white border border-[#D7BBA6] text-[#8A4F23] hover:bg-[#FAF8F5] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ghi nhận ca đang phục vụ</span>
                </button>
              </div>
            )}

            {selectedPkg.rawStatus === 'COMPLETED' && (
              <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>Đã hoàn thành toàn bộ phác đồ</span>
                </div>
                <p className="text-[11px] leading-relaxed">Đã thực hiện đủ {selectedPkg.sessionsTotal} buổi. Đăng ký liệu trình mới nếu khách cần duy trì.</p>
                <button
                  type="button"
                  onClick={handleOpenAssignPackageModal}
                  className="w-full py-2 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Đăng ký gói mới</span>
                </button>
              </div>
            )}

            {['CANCELLED', 'REFUNDED', 'TRANSFERRED'].includes(selectedPkg.rawStatus) && (
              <div className="p-3 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-xs text-[#4B5563] space-y-1">
                <div className="font-bold">Gói ở trạng thái: {selectedPkg.status}</div>
                <p className="text-[11px]">Hồ sơ lưu trữ bất biến. Không thể thực hiện đặt buổi mới.</p>
              </div>
            )}

            {/* Vận hành vòng đời gói (Admin Controls) */}
            <div className="pt-2 border-t border-[#EFE4D9] space-y-2">
              <div className="text-[11px] font-bold text-[#73675F] uppercase tracking-wide">
                Vận hành gói (Chỉ Admin)
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {selectedPkg.rawStatus === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType('pause');
                      setActionReason('');
                    }}
                    className="p-2 border border-[#E8DFD8] rounded-xl hover:bg-[#FAF8F5] text-[#73675F] flex items-center justify-center gap-1 cursor-pointer font-medium"
                  >
                    <Pause className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Tạm dừng</span>
                  </button>
                )}
                {selectedPkg.rawStatus === 'PAUSED' && (
                  <button
                    type="button"
                    onClick={() => setActionModalType('resume')}
                    className="p-2 border border-[#E8DFD8] rounded-xl hover:bg-[#FAF8F5] text-[#73675F] flex items-center justify-center gap-1 cursor-pointer font-medium"
                  >
                    <Play className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Mở lại</span>
                  </button>
                )}
                {['ACTIVE', 'PAUSED', 'EXPIRED'].includes(selectedPkg.rawStatus) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType('extend');
                      setActionReason('');
                      setActionExtensionMonths(3);
                    }}
                    className="p-2 border border-[#E8DFD8] rounded-xl hover:bg-[#FAF8F5] text-[#73675F] flex items-center justify-center gap-1 cursor-pointer font-medium"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#8A4F23]" />
                    <span>Gia hạn</span>
                  </button>
                )}
                {['ACTIVE', 'PAUSED'].includes(selectedPkg.rawStatus) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType('transfer');
                      setActionReason('');
                      setActionTransferCustomerId('');
                    }}
                    className="p-2 border border-[#E8DFD8] rounded-xl hover:bg-[#FAF8F5] text-[#73675F] flex items-center justify-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#4F46E5]" />
                    <span>Chuyển nhượng</span>
                  </button>
                )}
                {['ACTIVE', 'PAUSED'].includes(selectedPkg.rawStatus) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType('refund');
                      setActionReason('');
                      setActionRefundAmount(selectedPkg.rawPrice);
                    }}
                    className="p-2 border border-[#E8DFD8] rounded-xl hover:bg-[#FAF8F5] text-[#73675F] flex items-center justify-center gap-1 cursor-pointer font-medium"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Hoàn tiền</span>
                  </button>
                )}
                {['ACTIVE', 'PAUSED'].includes(selectedPkg.rawStatus) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModalType('cancel');
                      setActionReason('');
                    }}
                    className="p-2 border border-[#E8DFD8] rounded-xl hover:bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center gap-1 cursor-pointer font-medium"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Hủy gói</span>
                  </button>
                )}
              </div>

              {/* Xem Timeline bất biến */}
              <button
                type="button"
                onClick={handleOpenTimeline}
                className="w-full py-2 bg-[#FAF8F5] hover:bg-[#F3EBE1] border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#8A4F23] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Xem Timeline kiểm toán vòng đời</span>
              </button>
            </div>
          </div>

          {/* Card 2: Session Ledger Policy */}
          <div className="bg-[#FAF0E4] rounded-2xl p-5 space-y-3 border border-[#EFE4D9]">
            <h3 className="text-base font-bold text-[#5A280C]">
              Chính sách sổ buổi
            </h3>
            <div className="space-y-2.5 text-xs text-[#50443D] leading-relaxed">
              <p>
                Chỉ cập nhật sau khi có xác nhận giao dịch phù hợp và ghi nhận hoàn thành của nhân sự được phân quyền.
              </p>
              <p>
                Lịch đã xác nhận trong tương lai không tự trừ buổi cho đến khi kỹ thuật viên hoàn tất check-out và ký xác nhận lâm sàng.
              </p>
            </div>
            <div className="text-[11px] text-[#8A4F23] font-medium pt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đồng bộ dữ liệu thời gian thực Supabase</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#985018]" />
        <span>
          Hệ thống quản lý liệu trình & sổ buổi trị liệu chuyên sâu • MLD Vietnam Healthcare Admin.
        </span>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ĐẶT BUỔI TIẾP THEO (BOOK NEXT SESSION) */}
      {/* ======================================================== */}
      {isBookNextModalOpen && (
        <div className="fixed inset-0 bg-[#2D2825]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] border border-[#EFE4D9] shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3E200C]">Đặt lịch buổi chăm sóc tiếp theo</h3>
                  <p className="text-[11px] text-[#73675F]">Lên kế hoạch hẹn buổi {selectedPkg.usedSessions + 1} cho khách</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBookNextModalOpen(false)}
                className="p-1.5 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#EFE4D9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitBooking} className="p-5 space-y-4">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">{selectedCustomer?.fullName} ({selectedCustomer?.phone})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Gói liệu trình:</span>
                  <span className="font-semibold text-[#8A4F23]">{selectedPkg.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Số buổi còn lại:</span>
                  <span className="font-bold text-[#2E7D32]">{selectedPkg.remainingSessions} buổi</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Ngày hẹn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Khung giờ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                  >
                    {STANDARD_SPA_SLOTS.map((slot) => {
                      const drc = drcSlots.find((d) => d.slotTime === slot.label || d.startTime?.startsWith(slot.startHour));
                      const isAvail = drc ? drc.isAvailable : true;
                      const capText = drc ? (isAvail ? `(Còn ${drc.remainingCapacity} chỗ)` : '(Hết chỗ)') : '';
                      return (
                        <option key={slot.startHour} value={slot.startHour} disabled={drc ? !isAvail : false}>
                          {slot.label} {capText}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Cơ sở / Chi nhánh <span className="text-red-500">*</span>
                </label>
                <select
                  value={bookingBranchId}
                  onChange={(e) => {
                    const nextBId = e.target.value;
                    setBookingBranchId(nextBId);
                    const matchingTechs = technicians.filter((t) => t.branchId === nextBId);
                    if (matchingTechs.length > 0) {
                      setBookingTechnicianId(matchingTechs[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} - {b.district}, {b.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Kỹ thuật viên phụ trách <span className="text-red-500">*</span>
                </label>
                <select
                  value={bookingTechnicianId}
                  onChange={(e) => setBookingTechnicianId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                >
                  {availableBranchTechnicians.length === 0 ? (
                    <option value="">-- Kỹ thuật viên mặc định chi nhánh --</option>
                  ) : (
                    availableBranchTechnicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} {t.title ? `(${t.title})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Ghi chú điều trị / Yêu cầu đặc biệt
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Ví dụ: Chăm sóc chuyên sâu phục hồi, lưu ý da nhạy cảm..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBookNextModalOpen(false)}
                  disabled={isSubmittingBooking}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingBooking ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Xác nhận đặt lịch hẹn</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GHI NHẬN BUỔI CHĂM SÓC (LOG CLINICAL SESSION) */}
      {/* ======================================================== */}
      {isLogSessionModalOpen && (
        <div className="fixed inset-0 bg-[#2D2825]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3E200C]">Cập nhật thông tin điều trị</h3>
                  <p className="text-[11px] text-[#73675F]">
                    {selectedPkg.name} · {selectedCustomer?.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogSessionModalOpen(false)}
                className="p-1.5 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#EFE4D9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitLogSession} className="p-5 space-y-3.5 overflow-y-auto">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">{selectedCustomer?.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Liệu trình:</span>
                  <span className="font-semibold text-[#8A4F23]">{selectedPkg.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Ca phục vụ:</span>
                  <span className="font-semibold text-[#2C241E]">
                    {selectedSessionBooking?.bookingCode} · {selectedSessionBooking?.startTime?.slice(0, 5)}–{selectedSessionBooking?.endTime?.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Buổi điều trị <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  readOnly
                  min={1}
                  max={selectedPkg.sessionsTotal}
                  value={sessionNumberInput}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Ngày điều trị <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  readOnly
                  value={sessionDate}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E]"
                />
                <p className="mt-1 text-[10px] text-[#8C7A6B]">Ngày được khóa theo lịch hẹn đang phục vụ.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Giờ bắt đầu điều trị</label>
                  <input type="time" value={treatmentStartTime} onChange={(e) => setTreatmentStartTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]" />
                  <p className="mt-1 text-[10px] text-[#8C7A6B]">Lấy từ thời điểm bắt đầu phục vụ; có thể hiệu chỉnh theo thực tế.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Giờ kết thúc điều trị</label>
                  <input type="time" value={treatmentEndTime} onChange={(e) => setTreatmentEndTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Tình trạng trước buổi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={conditionBefore}
                    onChange={(e) => setConditionBefore(e.target.value)}
                    placeholder="Ghi nhận tình trạng, vùng cần can thiệp, chống chỉ định..."
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Tình trạng sau buổi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={conditionAfter}
                    onChange={(e) => setConditionAfter(e.target.value)}
                    placeholder="Phản ứng sau chăm sóc, mức cải thiện và lưu ý theo dõi..."
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Vùng điều trị / Mục tiêu
                  </label>
                  <input
                    type="text"
                    value={treatmentAreas}
                    onChange={(e) => setTreatmentAreas(e.target.value)}
                    placeholder="Ví dụ: Vùng mặt, cổ, vai gáy..."
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Phác đồ / Protocol áp dụng
                  </label>
                  <input
                    type="text"
                    value={treatmentProtocol}
                    onChange={(e) => setTreatmentProtocol(e.target.value)}
                    placeholder="Ví dụ: MLD-FACIAL-STANDARD-01..."
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              {/* Vật tư tiêu hao trong buổi */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-2">
                <label className="block text-xs font-bold text-[#2C241E]">
                  Khai báo vật tư tiêu hao (Kho tự động đồng bộ)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên vật tư (vd: Tinh chất B5)"
                    value={consumableNameInput}
                    onChange={(e) => setConsumableNameInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={consumableQtyInput}
                    onChange={(e) => setConsumableQtyInput(Number(e.target.value) || 1)}
                    className="w-16 px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs text-center"
                  />
                  <input
                    type="text"
                    placeholder="ĐVT"
                    value={consumableUnitInput}
                    onChange={(e) => setConsumableUnitInput(e.target.value)}
                    className="w-16 px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!consumableNameInput.trim()) return;
                      setConsumablesList((prev) => [
                        ...prev,
                        { name: consumableNameInput.trim(), quantity: consumableQtyInput, unit: consumableUnitInput.trim() || 'ống' },
                      ]);
                      setConsumableNameInput('');
                      setConsumableQtyInput(1);
                    }}
                    className="px-3 py-1.5 bg-[#8A4F23] hover:bg-[#6D3D1A] text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                  >
                    + Thêm
                  </button>
                </div>
                {consumablesList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {consumablesList.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white border border-[#E8DFD8] text-[#554A41]"
                      >
                        <span>{item.name}: <strong>{item.quantity} {item.unit}</strong></span>
                        <button
                          type="button"
                          onClick={() => setConsumablesList((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#991B1B] hover:text-red-700 font-bold ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Phản ứng bất thường */}
              <div className="space-y-2 p-3 rounded-xl border border-[#E8DFD8]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#2C241E]">
                  <input
                    type="checkbox"
                    checked={hasAbnormalReaction}
                    onChange={(e) => setHasAbnormalReaction(e.target.checked)}
                    className="w-4 h-4 rounded text-[#985018] focus:ring-[#985018]"
                  />
                  <span>Ghi nhận phản ứng bất thường / Chống chỉ định lâm sàng</span>
                </label>
                {hasAbnormalReaction && (
                  <textarea
                    rows={2}
                    value={adverseReactions}
                    onChange={(e) => setAdverseReactions(e.target.value)}
                    placeholder="Mô tả cụ thể phản ứng (ví dụ: đỏ rát kéo dài, ngứa, kích ứng nhẹ vùng má)..."
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs text-red-900 focus:outline-none focus:border-red-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Thông tin điều trị trong ngày <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={treatmentNotes}
                  onChange={(e) => setTreatmentNotes(e.target.value)}
                  placeholder="Nhập dịch vụ đã thực hiện và kết quả điều trị trong ngày..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Lời dặn chăm sóc sau buổi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={specialistAdvice}
                  onChange={(e) => setSpecialistAdvice(e.target.value)}
                  placeholder="Hướng dẫn tại nhà, điều cần tránh và thời điểm nên đặt buổi tiếp theo..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Hình ảnh minh chứng</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))} className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E]" />
                <p className="mt-1 text-[10px] text-[#8C7A6B]">Admin tự tải ảnh lên; ảnh sẽ lưu vào nhật ký điều trị (storage reference).</p>
                {evidenceFiles.length > 0 && <p className="mt-1 text-[10px] text-[#2E7D32]">Đã chọn {evidenceFiles.length} ảnh.</p>}
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9]">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#554A41]">
                  <input
                    type="checkbox"
                    checked={photoConsentGranted}
                    onChange={(e) => setPhotoConsentGranted(e.target.checked)}
                    className="w-4 h-4 rounded text-[#985018] focus:ring-[#985018]"
                  />
                  <span>Khách hàng đã ký cam kết đồng ý lưu trữ / theo dõi hình ảnh chuyên môn</span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLogSessionModalOpen(false)}
                  disabled={isSubmittingSession}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSession}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingSession || isUploadingEvidence ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cập nhật</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ĐĂNG KÝ GÓI LIỆU TRÌNH MỚI (ASSIGN PACKAGE) */}
      {/* ======================================================== */}
      {isAssignPackageModalOpen && (
        <div className="fixed inset-0 bg-[#2D2825]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] border border-[#EFE4D9] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#3E200C]">Đăng ký liệu trình cho khách hàng</h3>
                  <p className="text-xs text-[#73675F] mt-1">Chọn đúng khách, kiểm tra gói và chuyển sang thu ngân để kích hoạt hồ sơ.</p>
                </div>
              <button
                type="button"
                onClick={() => setIsAssignPackageModalOpen(false)}
                  aria-label="Đóng quy trình đăng ký"
                  className="p-2 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#EFE4D9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              </div>
              <ol className="grid grid-cols-3 gap-2 mt-5" aria-label="Tiến trình đăng ký liệu trình">
                {[
                  { step: 1, label: 'Chọn khách hàng' },
                  { step: 2, label: 'Chọn gói liệu trình' },
                  { step: 3, label: 'Kiểm tra & thanh toán' },
                ].map((item) => {
                  const active = assignStep === item.step;
                  const completed = assignStep > item.step;
                  return (
                    <li key={item.step} className="min-w-0">
                      <div className={`h-1 rounded-full ${active || completed ? 'bg-[#985018]' : 'bg-[#E8DFD8]'}`} />
                      <div className={`mt-2 flex items-center gap-2 text-[11px] font-semibold ${active ? 'text-[#8A4F23]' : completed ? 'text-[#2C241E]' : 'text-[#8C7A6B]'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active || completed ? 'bg-[#985018] text-white' : 'bg-[#EFE4D9]'}`}>
                          {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.step}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <form onSubmit={(event) => event.preventDefault()} className="min-h-0 flex flex-1 flex-col">
              <div className="p-6 overflow-y-auto flex-1">
                {assignStep === 1 && (
                  <section aria-labelledby="assign-customer-heading">
                    <div className="mb-4">
                      <h4 id="assign-customer-heading" className="text-sm font-bold text-[#2C241E]">Khách hàng nào đăng ký liệu trình?</h4>
                      <p className="text-xs text-[#73675F] mt-1">Tìm theo tên, số điện thoại hoặc email. Hồ sơ này sẽ đứng tên gói và hóa đơn.</p>
                    </div>
                    <label className="relative block mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7A6B]" />
                      <input
                        autoFocus
                        value={assignCustomerSearch}
                        onChange={(event) => setAssignCustomerSearch(event.target.value)}
                        placeholder="Tìm tên, số điện thoại hoặc email..."
                        className="w-full pl-10 pr-3 py-2.5 border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#985018]"
                      />
                    </label>
                    <div className="border border-[#EFE4D9] rounded-xl divide-y divide-[#EFE4D9] max-h-[340px] overflow-y-auto">
                      {filteredAssignCustomers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-[#73675F]">Không tìm thấy khách hàng phù hợp.</div>
                      ) : filteredAssignCustomers.map((customer) => {
                        const selected = assignCustomerId === customer.id;
                        return (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => setAssignCustomerId(customer.id)}
                            className={`w-full p-3.5 text-left flex items-center gap-3 transition-colors ${selected ? 'bg-[#FAF0E4]' : 'bg-white hover:bg-[#FAF8F5]'}`}
                          >
                            <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${selected ? 'bg-[#985018] text-white' : 'bg-[#EFE4D9] text-[#73675F]'}`}>
                              {(customer.fullName || 'K').split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-[#2C241E] truncate">{customer.fullName || 'Chưa có tên'}</span>
                              <span className="block text-[11px] text-[#73675F] mt-0.5 truncate">{customer.phone || 'Chưa có SĐT'}{customer.email ? ` · ${customer.email}` : ''}</span>
                            </span>
                            <span className="text-[10px] font-semibold text-[#8A4F23]">{customer.membershipTier || 'STANDARD'}</span>
                            {selected && <CheckCircle2 className="w-5 h-5 text-[#985018] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {assignStep === 2 && (
                  <section aria-labelledby="assign-package-heading">
                    <div className="mb-4">
                      <h4 id="assign-package-heading" className="text-sm font-bold text-[#2C241E]">Chọn gói phù hợp với nhu cầu tư vấn</h4>
                      <p className="text-xs text-[#73675F] mt-1">Giá, số buổi và hạn dùng lấy trực tiếp từ bảng giá đang mở bán.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                      {livePackages.filter((pkg) => pkg.isActive).map((pkg) => {
                        const effectivePrice = Number(pkg.discountPrice) > 0 && Number(pkg.discountPrice) < Number(pkg.price) ? Number(pkg.discountPrice) : Number(pkg.price);
                        const selected = assignPackageId === pkg.id;
                        return (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => setAssignPackageId(pkg.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${selected ? 'border-[#985018] bg-[#FAF0E4] shadow-sm' : 'border-[#E8DFD8] bg-white hover:border-[#D7BBA6]'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h5 className="text-xs font-extrabold text-[#2C241E] line-clamp-2">{pkg.name}</h5>
                                <p className="text-[11px] text-[#73675F] mt-1 line-clamp-2">{pkg.description || 'Liệu trình chăm sóc theo phác đồ MLD.'}</p>
                              </div>
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selected ? 'border-[#985018] bg-[#985018] text-white' : 'border-[#D7BBA6]'}`}>
                                {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
                              <span className="flex items-center gap-1.5 text-[#73675F]"><Sparkles className="w-3.5 h-3.5" />{pkg.totalSessions} buổi</span>
                              <span className="flex items-center gap-1.5 text-[#73675F]"><Clock className="w-3.5 h-3.5" />Hiệu lực {pkg.validityMonths} tháng</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-[#E8DFD8] flex items-end justify-between gap-3">
                              <span className="text-[11px] text-[#73675F]">Giá niêm yết</span>
                              <span className="text-sm font-black text-[#8A4F23]">{effectivePrice.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {assignStep === 3 && selectedAssignCustomer && selectedAssignPackage && (
                  <section aria-labelledby="assign-review-heading">
                    <div className="mb-4">
                      <h4 id="assign-review-heading" className="text-sm font-bold text-[#2C241E]">Kiểm tra trước khi chuyển sang thu ngân</h4>
                      <p className="text-xs text-[#73675F] mt-1">Hồ sơ liệu trình chỉ được tạo sau khi thanh toán thành công.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-4">
                      <div className="space-y-3">
                        <div className="rounded-xl border border-[#EFE4D9] p-4">
                          <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wide">Khách hàng</span>
                          <p className="text-sm font-extrabold text-[#2C241E] mt-1">{selectedAssignCustomer.fullName}</p>
                          <p className="text-xs text-[#73675F] mt-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{selectedAssignCustomer.phone || 'Chưa có số điện thoại'}</p>
                        </div>
                        <div className="rounded-xl border border-[#EFE4D9] p-4">
                          <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wide">Gói đã chọn</span>
                          <p className="text-sm font-extrabold text-[#2C241E] mt-1">{selectedAssignPackage.name}</p>
                          <div className="mt-3 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-[#73675F]">Số buổi</span><strong>{selectedAssignPackage.totalSessions} buổi</strong></div>
                            <div className="flex justify-between"><span className="text-[#73675F]">Hạn sử dụng</span><strong>{selectedAssignPackage.validityMonths} tháng từ ngày mua</strong></div>
                            {assignPackageSavings > 0 && <div className="flex justify-between"><span className="text-[#73675F]">Tiết kiệm</span><strong className="text-[#0D6832]">{assignPackageSavings.toLocaleString('vi-VN')}đ</strong></div>}
                            <div className="flex justify-between pt-2 border-t border-[#EFE4D9]"><span className="font-semibold">Tạm tính trước VAT</span><strong className="text-base text-[#8A4F23]">{assignPackagePrice.toLocaleString('vi-VN')}đ</strong></div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#D7BBA6] bg-[#FAF8F5] p-4">
                        <h5 className="text-xs font-bold text-[#2C241E]">Điều gì xảy ra tiếp theo?</h5>
                        <ol className="mt-4 space-y-4">
                          {[
                            ['1', 'Thu ngân xác nhận', 'Kiểm tra khách hàng, gói, chi nhánh, nhân viên tư vấn và phương thức thanh toán.'],
                            ['2', 'Thanh toán & kích hoạt', 'Hệ thống tạo hóa đơn và hồ sơ liệu trình trong cùng một giao dịch, tránh kích hoạt khi thu tiền thất bại.'],
                            ['3', 'Đặt buổi đầu tiên', 'Sau thanh toán, mở hồ sơ liệu trình để chọn cơ sở, ngày giờ, kỹ thuật viên và phòng phù hợp.'],
                            ['4', 'Theo dõi từng buổi', 'Mỗi buổi có nhật ký, ảnh trước sau, tư vấn chăm sóc và số buổi còn lại.'],
                          ].map(([number, title, description]) => (
                            <li key={number} className="flex gap-3">
                              <span className="w-6 h-6 rounded-full bg-[#985018] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{number}</span>
                              <span><strong className="block text-xs text-[#2C241E]">{title}</strong><span className="block text-[11px] text-[#73675F] mt-0.5 leading-relaxed">{description}</span></span>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-4 p-3 rounded-lg bg-white border border-[#EFE4D9] text-[11px] text-[#73675F] flex gap-2">
                          <AlertCircle className="w-4 h-4 text-[#985018] shrink-0" />
                          <span>Thu ngân cần mở ca. Tổng cuối cùng có thể gồm VAT; giá sẽ được kiểm tra lại từ máy chủ trước khi ghi nhận.</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="px-6 py-4 border-t border-[#EFE4D9] bg-[#FAF8F5] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => assignStep === 1 ? setIsAssignPackageModalOpen(false) : setAssignStep((assignStep - 1) as 1 | 2)}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  {assignStep === 1 ? 'Hủy' : 'Quay lại'}
                </button>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-[11px] text-[#73675F]">Bước {assignStep}/3</span>
                  {assignStep < 3 ? (
                    <button
                      type="button"
                      disabled={assignStep === 1 ? !selectedAssignCustomer : !selectedAssignPackage}
                      onClick={() => setAssignStep((assignStep + 1) as 2 | 3)}
                      className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Tiếp tục
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitAssignPackage}
                      className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Chuyển sang thu ngân</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL 4: HOÀN TÁC BUỔI ĐIỀU TRỊ AN TOÀN (SESSION REVERSAL) */}
      {/* ======================================================== */}
      {reversalTargetJournal && (
        <div className="fixed inset-0 bg-[#2D2825]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FEF2F2]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-900">Hoàn tác buổi điều trị #{reversalTargetJournal.number}</h3>
                  <p className="text-[11px] text-red-700">Khôi phục 1 buổi vào gói và điều chỉnh đối soát</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReversalTargetJournal(null)}
                className="p-1.5 text-red-500 hover:text-red-800 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReversal} className="p-5 space-y-4">
              <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FECACA] text-xs text-red-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#991B1B]">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>CẢNH BÁO QUY TRÌNH KIỂM TOÁN VÀ ĐỐI SOÁT:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-red-800">
                  <li>Nhật ký gốc không bị xóa; hệ thống đánh dấu đã hoàn tác và lưu ID kiểm toán bất biến.</li>
                  <li>Hoàn lại đúng 1 buổi vào gói liệu trình (tự động kích hoạt lại ACTIVE nếu gói đã hoàn tất).</li>
                  <li>Tự động tạo bút toán đảo ngược hoa hồng KTV và vật tư tiêu hao (PENDING_SYNC).</li>
                  <li>Không thể hoàn tác 2 lần cho cùng một buổi điều trị.</li>
                </ul>
              </div>

              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">{selectedCustomer?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#73675F]">Gói liệu trình:</span>
                  <span className="font-semibold text-[#8A4F23]">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#73675F]">Ngày thực hiện:</span>
                  <span className="font-medium text-[#2C241E]">{reversalTargetJournal.date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Lý do hoàn tác buổi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Bắt buộc nhập lý do chi tiết (ví dụ: KTV chọn nhầm khách hàng / Khách dừng buổi giữa chừng do kích ứng / Yêu cầu bảo lưu buổi)..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-red-500"
                />
                <p className="mt-1 text-[10px] text-[#8C7A6B]">Lý do sẽ được ghi vào sổ cái hoàn tác và không thể chỉnh sửa sau khi lưu.</p>
              </div>

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReversalTargetJournal(null)}
                  disabled={isSubmittingReversal}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversal}
                  className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingReversal ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xử lý hoàn tác...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Xác nhận hoàn tác</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: VẬN HÀNH VÒNG ĐỜI GÓI (PACKAGE LIFECYCLE ACTION) */}
      {/* ======================================================== */}
      {actionModalType && (
        <div className="fixed inset-0 bg-[#2D2825]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  {actionModalType === 'pause' && <Pause className="w-5 h-5 text-[#D97706]" />}
                  {actionModalType === 'resume' && <Play className="w-5 h-5 text-[#059669]" />}
                  {actionModalType === 'extend' && <Clock className="w-5 h-5 text-[#8A4F23]" />}
                  {actionModalType === 'transfer' && <ArrowRightLeft className="w-5 h-5 text-[#4F46E5]" />}
                  {actionModalType === 'refund' && <DollarSign className="w-5 h-5 text-[#059669]" />}
                  {actionModalType === 'cancel' && <Ban className="w-5 h-5 text-[#DC2626]" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3E200C]">
                    {actionModalType === 'pause' && 'Tạm dừng gói liệu trình'}
                    {actionModalType === 'resume' && 'Mở lại gói liệu trình'}
                    {actionModalType === 'extend' && 'Gia hạn thời hạn gói liệu trình'}
                    {actionModalType === 'transfer' && 'Chuyển nhượng gói sang khách hàng khác'}
                    {actionModalType === 'refund' && 'Hoàn tiền / Đóng gói liệu trình'}
                    {actionModalType === 'cancel' && 'Hủy gói liệu trình'}
                  </h3>
                  <p className="text-[11px] text-[#73675F]">{selectedPkg.name} · {selectedCustomer?.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModalType(null)}
                className="p-1.5 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#EFE4D9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePackageAction} className="p-5 space-y-4">
              {actionModalType === 'extend' && (
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Số tháng gia hạn thêm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={actionExtensionMonths}
                    onChange={(e) => setActionExtensionMonths(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                  <p className="mt-1 text-[10px] text-[#8C7A6B]">Thời hạn mới sẽ được cộng dồn từ ngày hết hạn hiện tại.</p>
                </div>
              )}

              {actionModalType === 'transfer' && (
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Chọn khách hàng nhận chuyển nhượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={actionTransferCustomerSearch}
                    onChange={(e) => setActionTransferCustomerSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc số điện thoại khách hàng mới..."
                    className="w-full px-3 py-2 mb-2 bg-white border border-[#E8DFD8] rounded-xl text-xs"
                  />
                  <div className="max-h-40 overflow-y-auto border border-[#EFE4D9] rounded-xl divide-y divide-[#EFE4D9]">
                    {customers
                      .filter((c) => c.id !== selectedPkg.customerId && matchSearch([c.fullName, c.phone], actionTransferCustomerSearch))
                      .slice(0, 10)
                      .map((c) => {
                        const isChosen = actionTransferCustomerId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setActionTransferCustomerId(c.id)}
                            className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                              isChosen ? 'bg-[#FAF0E4]' : 'hover:bg-[#FAF8F5]'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-[#2C241E]">{c.fullName}</div>
                              <div className="text-[10px] text-[#73675F]">{c.phone || 'Chưa có SĐT'}</div>
                            </div>
                            {isChosen && <CheckCircle2 className="w-4 h-4 text-[#985018]" />}
                          </button>
                        );
                      })}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8C7A6B]">Số buổi còn lại sẽ được chuyển giao, lịch sử cũ được bảo lưu vĩnh viễn.</p>
                </div>
              )}

              {actionModalType === 'refund' && (
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Số tiền hoàn lại (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedPkg.rawPrice}
                    required
                    value={actionRefundAmount}
                    onChange={(e) => setActionRefundAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                  <p className="mt-1 text-[10px] text-[#8C7A6B]">Tối đa {selectedPkg.rawPrice.toLocaleString('vi-VN')}đ. Hoa hồng bán gói sẽ được đánh dấu đảo ngược.</p>
                </div>
              )}

              {['pause', 'extend', 'cancel', 'transfer', 'refund'].includes(actionModalType) && (
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Lý do thực hiện <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Bắt buộc nhập lý do để ghi vết kiểm toán..."
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              )}

              {actionModalType === 'resume' && (
                <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] text-xs text-[#065F46]">
                  Mở lại gói sẽ cho phép khách hàng tiếp tục đặt lịch hẹn các buổi còn lại theo phác đồ.
                </div>
              )}

              {actionModalType === 'cancel' && (
                <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FECACA] text-xs text-[#991B1B]">
                  <strong>CẢNH BÁO:</strong> Hủy gói sẽ vô hiệu hóa tất cả các buổi còn lại. Hành động này không thể hoàn tác.
                </div>
              )}

              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionModalType(null)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingAction ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang thực hiện...</span>
                    </>
                  ) : (
                    <span>Xác nhận thực hiện</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: TIMELINE KIỂM TOÁN VÒNG ĐỜI (AUDIT TIMELINE) */}
      {/* ======================================================== */}
      {isTimelineOpen && (
        <div className="fixed inset-0 bg-[#2D2825]/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] border border-[#EFE4D9] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3E200C]">Nhật ký kiểm toán vòng đời liệu trình</h3>
                  <p className="text-[11px] text-[#73675F]">{selectedPkg.name} · Sổ cái bất biến</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimelineOpen(false)}
                className="p-1.5 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#EFE4D9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {isLoadingTimeline ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#73675F]">
                  <LoaderCircle className="w-6 h-6 text-[#985018] animate-spin" />
                  <span>Đang tải lịch sử kiểm toán...</span>
                </div>
              ) : timelineLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#73675F] bg-[#FAF8F5] rounded-xl border border-dashed border-[#E8DFD8]">
                  Chưa có sự kiện kiểm toán vòng đời nào được ghi nhận cho gói này.
                </div>
              ) : (
                <div className="relative border-l-2 border-[#E8DFD8] ml-4 pl-4 space-y-6">
                  {timelineLogs.map((log: any, idx: number) => {
                    const actionLabels: Record<string, { label: string; color: string }> = {
                      CREATED: { label: 'Tạo mới gói', color: 'bg-green-100 text-green-800 border-green-200' },
                      PAUSED: { label: 'Tạm dừng gói', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                      RESUMED: { label: 'Mở lại gói', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                      EXTENDED: { label: 'Gia hạn thời hạn', color: 'bg-purple-100 text-purple-800 border-purple-200' },
                      CANCELLED: { label: 'Hủy gói', color: 'bg-red-100 text-red-800 border-red-200' },
                      TRANSFERRED: { label: 'Chuyển nhượng', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
                      REFUNDED: { label: 'Hoàn tiền', color: 'bg-slate-100 text-slate-800 border-slate-200' },
                      REVERSED_SESSION: { label: 'Hoàn tác buổi', color: 'bg-rose-100 text-rose-800 border-rose-200' },
                    };
                    const badge = actionLabels[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-800 border-gray-200' };

                    return (
                      <div key={log.id || idx} className="relative">
                        <span className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-[#985018] border-2 border-white" />
                        <div className="bg-white p-3.5 rounded-xl border border-[#EFE4D9] shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="text-[10.5px] text-[#8C7A6B]">
                              {log.performed_at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.performed_at)) : '—'}
                            </span>
                          </div>
                          {log.reason && (
                            <div className="text-xs text-[#2C241E]">
                              <strong>Lý do:</strong> {log.reason}
                            </div>
                          )}
                          <div className="text-[11px] text-[#73675F] flex items-center justify-between pt-1 border-t border-[#F5EDE5]">
                            <span>Trạng thái: <code>{log.previous_status || '—'}</code> ➔ <code>{log.new_status || '—'}</code></span>
                            <span>Người thực hiện: {log.performed_by || 'Admin'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#EFE4D9] bg-[#FAF8F5] flex justify-end">
              <button
                type="button"
                onClick={() => setIsTimelineOpen(false)}
                className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Chia sẻ & Xuất PDF nhật ký điều trị */}
      <ShareJournalModal
        isOpen={Boolean(shareModalJournal)}
        onClose={() => setShareModalJournal(null)}
        journal={shareModalJournal}
      />
    </div>
  );
};
export default W06_TreatmentManagement;
