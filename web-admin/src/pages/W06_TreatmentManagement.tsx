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
} from '../types/shared_types';

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
  sessionsHistory: {
    number: string;
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
  }[];
  historySubtitle: string;
  historyNote: string;
}

export const W06_TreatmentManagement: React.FC = () => {
  const [livePackages, setLivePackages] = useState<SharedTreatmentPackage[]>([]);
  const [liveUserPackages, setLiveUserPackages] = useState<UserPackage[]>([]);
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [liveJournals, setLiveJournals] = useState<TreatmentJournal[]>([]);
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
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

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

  // Clinical Session Form
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [conditionBefore, setConditionBefore] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [conditionAfter, setConditionAfter] = useState('');
  const [specialistAdvice, setSpecialistAdvice] = useState('');

  // Assign Package Form
  const [assignCustomerId, setAssignCustomerId] = useState('');
  const [assignPackageId, setAssignPackageId] = useState('');
  const [assignValidityMonths, setAssignValidityMonths] = useState(6);
  const [assignNotes, setAssignNotes] = useState('');

  const fetchTreatmentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pkgRes, upkgRes, srvRes, jrnRes, custRes, brRes, techList] = await Promise.all([
        treatmentService.getTreatmentPackages(),
        treatmentService.getUserPackagesByCustomer(),
        treatmentService.getServices(),
        treatmentService.getTreatmentJournalsByCustomer(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        supabaseService.getTechnicians(),
      ]);

      if (pkgRes.success) setLivePackages(pkgRes.data);
      if (upkgRes.success) setLiveUserPackages(upkgRes.data);
      if (srvRes.success) setLiveServices(srvRes.data);
      if (jrnRes.success) setLiveJournals(jrnRes.data);
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
        .filter((j) => j.userPackageId === up.id || (!j.userPackageId && j.customerId === up.customerId))
        .sort((a, b) => a.sessionNumber - b.sessionNumber);

      const used = up.completedSessions ?? journals.length;
      const total = up.totalSessions || pkgDef?.totalSessions || 5;
      const remaining = Math.max(0, total - used);
      const progressPercent = Math.min(100, Math.round((used / total) * 100));

      const purchaseFormatted = up.purchasedAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(up.purchasedAt))
        : '01/09/2026';
      const expiryFormatted = up.expiresAt
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(up.expiresAt))
        : '31/12/2026';

      const srvName = pkgDef?.name || 'Liệu trình phục hồi da chuyên sâu';
      const rawPrice = pkgDef?.discountPrice || pkgDef?.price || 2290000;
      const priceText = `${rawPrice.toLocaleString('vi-VN')}đ`;

      const sessionsHistory: TreatmentPackageUI['sessionsHistory'] = journals.map((j) => ({
        number: String(j.sessionNumber).padStart(2, '0'),
        date: new Intl.DateTimeFormat('vi-VN').format(new Date(j.sessionDate)),
        serviceName: j.treatmentNotes || srvName,
        conditionBefore: j.conditionBefore || undefined,
        conditionAfter: j.conditionAfter || undefined,
        specialistAdvice: j.specialistAdvice || undefined,
      }));

      if (remaining > 0) {
        sessionsHistory.push({
          number: String(used + 1).padStart(2, '0'),
          date: 'Lịch sắp tới',
          serviceName: 'Buổi chăm sóc tiếp theo theo phác đồ',
          isUpcoming: true,
          bookingCode: `BK-${up.id.slice(0, 4).toUpperCase()}`,
          time: '09:00–10:30',
          staff: 'Kỹ thuật viên chuyên trách',
          room: 'Phòng VIP MLD',
          statusBadge: 'Chờ xếp lịch',
        });
      }

      // Branch determination
      const branchName = cust?.address?.includes('Hà Nội')
        ? 'Hà Nội'
        : cust?.address?.includes('Đà Nẵng')
          ? 'Đà Nẵng'
          : 'Quận 3';

      return {
        id: up.id,
        packageId: up.packageId,
        name: `${srvName} · ${total} buổi`,
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
        status: up.status === 'ACTIVE' ? 'Đang sử dụng' : 'Hoàn tất',
        rawStatus: up.status || 'ACTIVE',
        historySubtitle: `Hồ sơ liệu trình thực tế của ${cust?.fullName || 'khách hàng'}, đồng bộ trực tiếp từ Supabase Cloud.`,
        historyNote: `Đã hoàn thành ${used}/${total} buổi. Còn lại ${remaining} buổi hợp lệ đến ${expiryFormatted}.`,
        sessionsHistory,
      };
    });
  }, [liveUserPackages, livePackages, liveJournals, custMap]);

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
        if (!pkg.name.toLowerCase().includes(filterPackageType.toLowerCase())) {
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
      const res = await bookingService.createBooking({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        customerPhone: selectedCustomer.phone,
        branchId: selectedBranch?.id,
        technicianId: selectedTech?.id || null,
        technicianName: selectedTech?.fullName || 'KTV MLD',
        roomName: selectedTech?.title || 'Phòng Trị Liệu',
        bookingDate,
        startTime: `${bookingTime}:00`,
        endTime: `${bookingTime.slice(0, 2)}:50:00`,
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
    setSessionDate(new Date().toISOString().split('T')[0]);
    setConditionBefore('Da/Cơ thể cần chăm sóc chuyên sâu định kỳ.');
    setTreatmentNotes(`Thực hiện quy trình trị liệu chuẩn phác đồ ${selectedPkg.name}.`);
    setConditionAfter('Tình trạng cải thiện rõ rệt, da sáng hồng và cơ bắp thư giãn.');
    setSpecialistAdvice('Uống đủ 2L nước ấm, chống nắng và dưỡng ẩm đầy đủ tại nhà.');
    setIsLogSessionModalOpen(true);
  };

  const handleSubmitLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg.id) return;

    setIsSubmittingSession(true);
    try {
      const res = await treatmentService.completePackageSession(
        selectedPkg.id,
        selectedPkg.usedSessions,
        selectedPkg.sessionsTotal,
        {
          customerId: selectedPkg.customerId,
          sessionDate,
          conditionBefore,
          conditionAfter,
          treatmentNotes,
          specialistAdvice,
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
      setIsSubmittingSession(false);
    }
  };

  // --- ACTION: Đăng ký gói liệu trình mới ---
  const handleOpenAssignPackageModal = () => {
    if (customers.length > 0) setAssignCustomerId(customers[0].id);
    if (livePackages.length > 0) setAssignPackageId(livePackages[0].id);
    setAssignValidityMonths(6);
    setAssignNotes('Đăng ký gói liệu trình chăm sóc mới');
    setIsAssignPackageModalOpen(true);
  };

  const handleSubmitAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = livePackages.find((p) => p.id === assignPackageId) || livePackages[0];
    const cust = customers.find((c) => c.id === assignCustomerId) || customers[0];

    if (!pkg || !cust) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn khách hàng và gói hợp lệ.');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const res = await treatmentService.assignPackageToCustomer({
        customerId: cust.id,
        packageId: pkg.id,
        packageName: pkg.name,
        totalSessions: pkg.totalSessions || 5,
        price: pkg.discountPrice || pkg.price || 2290000,
        validityMonths: assignValidityMonths,
        notes: assignNotes,
      });

      if (res.success) {
        toast.success(
          'Đăng ký gói thành công',
          `Đã kích hoạt gói "${pkg.name}" (${pkg.totalSessions} buổi) cho khách hàng ${cust.fullName}.`
        );
        setIsAssignPackageModalOpen(false);
        await fetchTreatmentData();
      } else {
        toast.error('Lỗi kích hoạt', res.message || 'Không thể kích hoạt gói.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi hệ thống', err.message || 'Không thể đăng ký gói.');
    } finally {
      setIsSubmittingAssign(false);
    }
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
                <th className="py-3 px-5 whitespace-nowrap">Gói / giá mua</th>
                <th className="py-3 px-5 whitespace-nowrap">Khách hàng</th>
                <th className="py-3 px-5 whitespace-nowrap">Ngày mua / hết hạn</th>
                <th className="py-3 px-5 whitespace-nowrap">Tổng · đã dùng · còn</th>
                <th className="py-3 px-5 w-44 whitespace-nowrap">Tiến độ</th>
                <th className="py-3 px-5 whitespace-nowrap">Cơ sở / trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E6DC] whitespace-nowrap">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#73675F] whitespace-normal">
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
                      {/* Col 1: Gói / giá */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-xs text-[#2C241E] whitespace-nowrap">
                          {pkg.name}
                        </div>
                        <div className="text-[11px] font-semibold text-[#E11D48] mt-0.5 whitespace-nowrap">
                          {pkg.price}
                        </div>
                      </td>

                      {/* Col 2: Khách hàng */}
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

                      {/* Col 3: Ngày mua / Hết hạn */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                          {pkg.purchaseDate}
                        </div>
                        <div className="text-[11px] font-semibold text-[#E11D48] mt-0.5 whitespace-nowrap">
                          {pkg.expiryDate}
                        </div>
                      </td>

                      {/* Col 4: Số buổi */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                          {pkg.sessionsTotal} · {pkg.usedSessions} · {pkg.remainingSessions} buổi
                        </div>
                      </td>

                      {/* Col 5: Tiến độ */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium mb-1.5 whitespace-nowrap">
                          {pkg.progressLabel}
                        </div>
                        <div className="w-full bg-[#EFE4D9] h-1.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pkg.progressPercent}%` }}
                            className={`h-full rounded-full transition-all ${
                              pkg.rawStatus === 'COMPLETED' ? 'bg-[#059669]' : 'bg-[#985018]'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Col 6: Cơ sở / Trạng thái */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                          {pkg.branch}
                        </div>
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
                if (s.isUpcoming) {
                  // Upcoming Session Card (Highlighted box)
                  return (
                    <div
                      key={idx}
                      className="bg-[#FAF0E4] border border-[#E8DFD8] rounded-xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-[#2C241E]">
                          Buổi {s.number} · {s.serviceName}
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenBookModal}
                          className="px-2.5 py-1 bg-[#985018] hover:bg-[#854412] text-white text-[10.5px] font-bold rounded-lg cursor-pointer"
                        >
                          Đặt lịch ngay
                        </button>
                      </div>
                      <div className="text-[11px] text-[#73675F]">
                        {s.bookingCode} · {s.date} · {s.time} · {s.staff} · {s.room}
                      </div>
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-medium bg-[#EFE1D2] text-[#73675F]">
                          {s.statusBadge}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Standard Past Session Pill
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
                        <span className="text-xs font-bold text-[#2C241E]">
                          Buổi {s.number} · {s.date}
                        </span>
                      </div>
                      <span className="text-xs text-[#73675F] font-medium">
                        {s.serviceName}
                      </span>
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
                    <option value="08:30">08:30 - 09:30</option>
                    <option value="09:00">09:00 - 10:00</option>
                    <option value="09:30">09:30 - 10:30</option>
                    <option value="10:00">10:00 - 11:00</option>
                    <option value="10:30">10:30 - 11:30</option>
                    <option value="14:00">14:00 - 15:00</option>
                    <option value="14:30">14:30 - 15:30</option>
                    <option value="15:00">15:00 - 16:00</option>
                    <option value="15:30">15:30 - 16:30</option>
                    <option value="16:00">16:00 - 17:00</option>
                    <option value="17:00">17:00 - 18:00</option>
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
                  <h3 className="text-sm font-bold text-[#3E200C]">Ghi nhận buổi chăm sóc lâm sàng</h3>
                  <p className="text-[11px] text-[#73675F]">
                    Ghi chép buổi {selectedPkg.usedSessions + 1} / {selectedPkg.sessionsTotal} vào hồ sơ điện tử
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
                <div className="flex items-center justify-between">
                  <span className="text-[#73675F]">Buổi ghi nhận:</span>
                  <span className="font-bold text-[#985018]">
                    Buổi thứ {selectedPkg.usedSessions + 1} (Còn lại {selectedPkg.remainingSessions - 1} buổi sau ghi nhận)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Ngày thực hiện điều trị <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Tình trạng trước điều trị
                </label>
                <input
                  type="text"
                  value={conditionBefore}
                  onChange={(e) => setConditionBefore(e.target.value)}
                  placeholder="Ví dụ: Da thiếu ẩm, cơ vai căng nhức..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Quy trình & Ghi chú kỹ thuật trị liệu
                </label>
                <textarea
                  rows={2}
                  value={treatmentNotes}
                  onChange={(e) => setTreatmentNotes(e.target.value)}
                  placeholder="Ví dụ: Đẩy tinh chất dưỡng ẩm HA, chiếu đèn ánh sáng sinh học 20 phút..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Tình trạng sau điều trị
                </label>
                <input
                  type="text"
                  value={conditionAfter}
                  onChange={(e) => setConditionAfter(e.target.value)}
                  placeholder="Ví dụ: Da căng mịn, giảm tiết dầu, cơ thể sảng khoái..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Lời khuyên & Dặn dò của chuyên viên
                </label>
                <input
                  type="text"
                  value={specialistAdvice}
                  onChange={(e) => setSpecialistAdvice(e.target.value)}
                  placeholder="Ví dụ: Uống đủ 2 lít nước, chống nắng cẩn thận, ngủ đủ giấc..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
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
                  {isSubmittingSession ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Hoàn tất & Lưu buổi</span>
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
                  {livePackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.totalSessions} buổi ({((p.discountPrice || p.price) || 0).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Thời hạn hiệu lực (tháng)
                  </label>
                  <select
                    value={assignValidityMonths}
                    onChange={(e) => setAssignValidityMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                  >
                    <option value={3}>3 tháng</option>
                    <option value={6}>6 tháng</option>
                    <option value={12}>12 tháng (1 năm)</option>
                    <option value={24}>24 tháng (2 năm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Trạng thái ban đầu
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Đang sử dụng (ACTIVE)"
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs text-[#73675F] cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Ghi chú cấp phát
                </label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Ghi chú thêm về gói hoặc tư vấn viên phụ trách..."
                  className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssignPackageModalOpen(false)}
                  disabled={isSubmittingAssign}
                  className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-5 py-2 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingAssign ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Kích hoạt gói</span>
                    </>
                  )}
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
