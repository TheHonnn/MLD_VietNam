import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import {
  treatmentService,
  customerService,
  branchService,
  bookingService,
  portalService,
} from '../services';
import { toast } from '../components/common';
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
  }[];
  historySubtitle: string;
  historyNote: string;
}

export const W06_TreatmentManagement: React.FC = () => {
  const [livePackages, setLivePackages] = useState<SharedTreatmentPackage[]>([]);
  const [liveUserPackages, setLiveUserPackages] = useState<UserPackage[]>([]);
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [liveJournals, setLiveJournals] = useState<TreatmentJournal[]>([]);
  const [liveBookings, setLiveBookings] = useState<import('../types/shared_types').Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [searchParams] = useSearchParams();
  const packageIdParam = searchParams.get('packageId') || '';

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

  // Form States
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
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
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  // Assign Package Form
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [assignPackageId, setAssignPackageId] = useState('');

  const fetchTreatmentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pkgRes, upkgRes, srvRes, jrnRes, custRes, brRes, techList, bookings] = await Promise.all([
        treatmentService.getTreatmentPackages(),
        treatmentService.getUserPackagesByCustomer(),
        treatmentService.getServices(),
        treatmentService.getTreatmentJournalsByCustomer(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        supabaseService.getTechnicians(),
        bookingService.getBookings(),
      ]);

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

      const used = up.completedSessions ?? journals.length;
      const total = up.totalSessions || pkgDef?.totalSessions || 0;
      const remaining = Math.max(0, total - used);
      const progressPercent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
      const expired = Boolean(up.expiresAt && new Date(up.expiresAt).getTime() <= Date.now());
      const effectiveStatus = expired && up.status === 'ACTIVE'
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
      };
      const basePrice = Number(pkgDef?.price || 0);
      const discount = Number(pkgDef?.discountPrice || 0);
      const rawPrice = discount > 0 && discount < basePrice ? discount : basePrice;
      const priceText = `${rawPrice.toLocaleString('vi-VN')}đ`;

      const sessionsHistory: TreatmentPackageUI['sessionsHistory'] = journals.map((j) => {
        const booking = j.bookingId ? bookingMap.get(j.bookingId) : undefined;
        const timeFromBooking = booking?.startTime
          ? `${booking.startTime.slice(0, 5)}${booking.endTime ? `–${booking.endTime.slice(0, 5)}` : ''}`
          : undefined;
        return {
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
          statusBadge: 'Đã hoàn thành',
        };
      });

      // Branch determination
      const branchName = '—';

      return {
        id: up.id,
        packageId: up.packageId,
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
  }, [liveUserPackages, livePackages, liveJournals, custMap, serviceMap, bookingMap]);

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
      const res = await bookingService.createBooking({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        customerPhone: selectedCustomer.phone,
        branchId: selectedBranch?.id,
        technicianId: selectedTech?.id || null,
        technicianName: selectedTech?.fullName || 'KTV MLD',
        roomName: selectedTech?.title || 'Phòng Trị Liệu',
        bookingDate,
        startTime: selectedSlotObj.startTime,
        endTime: selectedSlotObj.endTime,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.MEMBERSHIP_WALLET,
        baseTotal: 0,
        finalPrice: 0,
        notes: `[Gói ${selectedPkg.name}] ${bookingNotes}`,
        serviceName: selectedPkg.name,
        durationMinutes: 60,
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
    const now = new Date();
    setSessionDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setSessionNumberInput(selectedPkg.usedSessions + 1);
    setTreatmentNotes('');
    setTreatmentStartTime('');
    setTreatmentEndTime('');
    setEvidenceFiles([]);
    setIsLogSessionModalOpen(true);
  };

  const handleSubmitLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg.id) return;

    setIsSubmittingSession(true);
    try {
      setIsUploadingEvidence(evidenceFiles.length > 0);
      const uploadedEvidence = await Promise.all(
        evidenceFiles.map((file) => portalService.uploadFileToStorage(file, file.name))
      );
      const res = await treatmentService.completePackageSession(
        selectedPkg.id,
        selectedPkg.usedSessions,
        selectedPkg.sessionsTotal,
        {
          customerId: selectedPkg.customerId,
          sessionNumber: sessionNumberInput,
          sessionDate,
          treatmentNotes,
          treatmentStartTime: treatmentStartTime || null,
          treatmentEndTime: treatmentEndTime || null,
          afterPhotos: uploadedEvidence,
        }
      );

      if (res.success) {
        const nextUsed = selectedPkg.usedSessions + 1;
        toast.success(
          'Đã ghi nhận buổi chăm sóc',
          `Hoàn tất buổi ${nextUsed}/${selectedPkg.sessionsTotal}. Hồ sơ điện tử đã được đồng bộ lên Supabase Cloud.`
        );
        setIsLogSessionModalOpen(false);
        await fetchTreatmentData();
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

  // --- ACTION: Đăng ký gói liệu trình mới ---
  const handleOpenAssignPackageModal = () => {
    setAssignCustomerId('');
    setAssignPackageId('');
    setIsAssignPackageModalOpen(true);
  };

  const handleSubmitAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = livePackages.find((p) => p.id === assignPackageId && p.isActive);
    const cust = customers.find((c) => c.id === assignCustomerId);

    if (!pkg || !cust) {
      toast.error('Thiếu thông tin', 'Chọn khách hàng và gói đang mở bán.');
      return;
    }
    window.location.href = `/cashier-pos?packageId=${encodeURIComponent(pkg.id)}&packageName=${encodeURIComponent(pkg.name)}&customerId=${encodeURIComponent(cust.id)}`;
  };

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

      {/* 2. Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
            <span>Gói đang sử dụng</span>
            <Leaf className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#2C241E] leading-none mt-2 whitespace-nowrap">
            {totalActivePackages}
          </div>
          <div className="text-[11px] text-[#73675F] mt-2 whitespace-nowrap">
            Gói đang lưu hành trên hệ thống
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
            <span>Buổi còn lại</span>
            <Calendar className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#2C241E] leading-none mt-2 whitespace-nowrap">
            {totalRemainingSessions}
          </div>
          <div className="text-[11px] text-[#73675F] mt-2 whitespace-nowrap">
            Buổi khả dụng chờ xếp lịch
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#73675F] whitespace-nowrap">
            <span>Buổi đã sử dụng</span>
            <SlidersHorizontal className="w-4 h-4 text-[#8A4F23] stroke-[2]" />
          </div>
          <div className="text-[28px] sm:text-[32px] font-extrabold text-[#2C241E] leading-none mt-2 whitespace-nowrap">
            {totalUsedSessions}
          </div>
          <div className="text-[11px] text-[#73675F] mt-2 whitespace-nowrap">
            Buổi đã trị liệu thực tế
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
        <div className="relative min-w-[140px] flex-1 sm:flex-none">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] focus:outline-none focus:border-[#985018] transition-colors cursor-pointer truncate"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang sử dụng</option>
            <option value="COMPLETED">Hoàn tất</option>
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
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                        </span>
                        <span className="text-xs font-bold text-[#2C241E]">Buổi {s.number} · {s.date}</span>
                      </div>
                      <span className="text-xs text-[#73675F] font-medium">{s.treatmentNotes || '—'}</span>
                    </div>

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

            {/* Action Button: Ghi nhận buổi chăm sóc */}
            <button
              type="button"
              onClick={handleOpenLogSessionModal}
              disabled={selectedPkg.remainingSessions <= 0}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all text-center shadow-2xs mt-2 flex items-center justify-center gap-1.5 ${
                selectedPkg.remainingSessions > 0
                  ? 'bg-white border border-[#D7BBA6] text-[#8A4F23] hover:bg-[#FAF8F5] cursor-pointer'
                  : 'bg-[#F5F2EB] text-[#A69788] border border-[#E8DFD8] cursor-not-allowed'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>
                {selectedPkg.remainingSessions > 0
                  ? 'Ghi nhận buổi chăm sóc'
                  : 'Liệu trình đã hoàn tất'}
              </span>
            </button>
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
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden">
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
            <form onSubmit={handleSubmitLogSession} className="p-5 space-y-3.5">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Khách hàng:</span>
                  <span className="font-bold text-[#2C241E]">{selectedCustomer?.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Liệu trình:</span>
                  <span className="font-semibold text-[#8A4F23]">{selectedPkg.name}</span>
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
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Giờ bắt đầu điều trị</label>
                  <input type="time" value={treatmentStartTime} onChange={(e) => setTreatmentStartTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]" />
                  <p className="mt-1 text-[10px] text-[#8C7A6B]">Tự điền nếu không có lịch hẹn liên kết.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Giờ kết thúc điều trị</label>
                  <input type="time" value={treatmentEndTime} onChange={(e) => setTreatmentEndTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]" />
                </div>
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
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Hình ảnh minh chứng</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))} className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E]" />
                <p className="mt-1 text-[10px] text-[#8C7A6B]">Admin tự tải ảnh lên; ảnh sẽ lưu vào nhật ký điều trị.</p>
                {evidenceFiles.length > 0 && <p className="mt-1 text-[10px] text-[#2E7D32]">Đã chọn {evidenceFiles.length} ảnh.</p>}
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
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3E200C]">Kích hoạt gói liệu trình mới</h3>
                  <p className="text-[11px] text-[#73675F]">Cấp phát hồ sơ gói trị liệu chuyên sâu cho khách hàng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignPackageModalOpen(false)}
                className="p-1.5 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#EFE4D9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitAssignPackage} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Khách hàng <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={assignCustomerId}
                  onChange={(e) => setAssignCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} - {c.phone} ({c.membershipTier || 'Thành viên'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Gói liệu trình dịch vụ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={assignPackageId}
                  onChange={(e) => setAssignPackageId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                >
                  {livePackages.filter((p) => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.totalSessions} buổi ({(p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-[#73675F]">Giá, số buổi và hạn dùng được lấy từ cấu hình gói. Gói chỉ được kích hoạt sau khi thu ngân hoàn tất thanh toán.</p>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssignPackageModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tiếp tục thanh toán</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default W06_TreatmentManagement;
