import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  X,
  User as UserIcon,
  Phone,
  Sparkles,
  CheckCircle2,
  Building2,
  MapPin,
  Check,
  Plus,
  Search,
  ArrowUpRight,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  Trash2,
  AlertOctagon,
  XCircle,
  FileText,
  Send,
} from 'lucide-react';
import {
  bookingService,
  branchService,
  notificationService,
  customerService,
  supabaseService,
} from '../services';
import { toast } from '../components/common';
import {
  Booking,
  Branch,
  User,
  Technician,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  Service,
  BranchRoom,
} from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wstvwushpwcdsmhpunvh.supabase.co';

interface ScheduleAppointment {
  id: string;
  technicianId: string;
  branchId?: string;
  title: string;
  subtitle: string;
  customer: string;
  customerPhone?: string;
  customerCode: string;
  avatar?: string;
  service: string;
  timeRange: string;
  date: string;
  dateRaw: string;
  technicianName: string;
  resource: string;
  durationText: string;
  price: string;
  deposit: string;
  remaining: string;
  status: string;
  statusRaw: BookingStatus | string;
  statusType: 'waiting_payment' | 'independent';
  bufferTitle: string;
  bufferDesc: string;
  startHour: number;     // e.g. 9.5 for 09:30
  durationHours: number; // e.g. 1.0 for 60 mins
  hasCleaningBuffer?: boolean;
  cleaningText?: string;
  bookingSource?: 'AUTO_OPTIMIZED' | 'MANUAL' | 'TREATMENT_PACKAGE';
  guestCount?: number;
  bedCode?: string;
  roomName?: string;
}

export const TIME_SLOT_OPTIONS = [
  { label: '09:00–10:15', startHour: 9.0, durationHours: 1.25, bufferTimeRange: '10:15–10:30', bufferEndTime: '10:30' },
  { label: '09:30–10:45', startHour: 9.5, durationHours: 1.25, bufferTimeRange: '10:45–11:00', bufferEndTime: '11:00' },
  { label: '10:00–11:15', startHour: 10.0, durationHours: 1.25, bufferTimeRange: '11:15–11:30', bufferEndTime: '11:30' },
  { label: '11:00–12:00', startHour: 11.0, durationHours: 1.0, bufferTimeRange: '12:00–12:15', bufferEndTime: '12:15' },
  { label: '13:30–14:45', startHour: 13.5, durationHours: 1.25, bufferTimeRange: '14:45–15:00', bufferEndTime: '15:00' },
  { label: '14:00–15:30', startHour: 14.0, durationHours: 1.5, bufferTimeRange: '15:30–15:45', bufferEndTime: '15:45' },
  { label: '15:00–16:15', startHour: 15.0, durationHours: 1.25, bufferTimeRange: '16:15–16:30', bufferEndTime: '16:30' },
  { label: '15:30–17:00', startHour: 15.5, durationHours: 1.5, bufferTimeRange: '17:00–17:15', bufferEndTime: '17:15' },
  { label: '16:30–17:45', startHour: 16.5, durationHours: 1.25, bufferTimeRange: '17:45–18:00', bufferEndTime: '18:00' },
  { label: '17:00–18:15', startHour: 17.0, durationHours: 1.25, bufferTimeRange: '18:15–18:30', bufferEndTime: '18:30' },
  { label: '18:00–19:15', startHour: 18.0, durationHours: 1.25, bufferTimeRange: '19:15–19:30', bufferEndTime: '19:30' },
];

export interface ScheduleTechnician {
  id: string;
  name: string;
  room: string;
  role: string;
  avatar?: string;
  branchId?: string;
}

export const TECHNICIAN_ROOM_MAP: Record<string, string> = {
  'cccccccc-0001-0001-0001-000000000001': 'Phòng VIP 01 - Hoa Sen',
  'cccccccc-0001-0001-0001-000000000002': 'Phòng Massage Body 02',
  'cccccccc-0001-0001-0001-000000000003': 'Phòng Gội Đầu Dưỡng Sinh 03',
  'cccccccc-0001-0001-0001-000000000004': 'Phòng Trị Liệu Đông Y 04',
  'cccccccc-0001-0001-0001-000000000005': 'Phòng Massage Thư Giãn',
  'cccccccc-0001-0001-0001-000000000006': 'Phòng Thực Hành Lab 01',
  'cccccccc-0001-0001-0001-000000000007': 'Phòng Thải Độc Thảo Dược',
};

export const DEFAULT_FALLBACK_TECHNICIANS: ScheduleTechnician[] = [
  { id: 'cccccccc-0001-0001-0001-000000000001', name: 'Trần Lan Anh', room: 'Phòng VIP 01 - Hoa Sen', role: 'Chuyên viên Trị liệu Cấp cao', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956' },
  { id: 'cccccccc-0001-0001-0001-000000000002', name: 'Lê Quỳnh Nga', room: 'Phòng Massage Body 02', role: 'Chuyên viên Chăm sóc da & Dưỡng sinh', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2' },
  { id: 'cccccccc-0001-0001-0001-000000000003', name: 'Nguyễn Thu Hà', room: 'Phòng Gội Đầu Dưỡng Sinh 03', role: 'Chuyên viên Chăm sóc Da & Phục hồi', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2' },
  { id: 'cccccccc-0001-0001-0001-000000000004', name: 'Trần Minh Phương', room: 'Phòng Trị Liệu 04', role: 'Kỹ thuật viên Trị liệu & Bấm huyệt', avatar: 'https://images.unsplash.com/photo-1594824813515-5e6fe7a5e848' },
];

export interface ScheduleValidationResult {
  isOverdue: boolean;
  isEarlyDate: boolean;
  isEarlyTime: boolean;
  isValid: boolean;
  reason: string;
  detail: string;
  scheduledTimeStr: string;
}

export const isBookingOverdue = (b: Booking): boolean => {
  if (b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CANCELLED) return false;
  const now = new Date();
  const nowY = now.getFullYear();
  const nowM = String(now.getMonth() + 1).padStart(2, '0');
  const nowD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${nowY}-${nowM}-${nowD}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const bDate = (b.bookingDate || '').split('T')[0];
  if (!bDate) return false;

  if (bDate < todayStr) return true;

  if (bDate === todayStr && b.endTime) {
    const [h, m] = b.endTime.split(':').map(Number);
    const endMinutes = (h || 0) * 60 + (m || 0);
    if (currentMinutes > endMinutes + 15) return true;
  }

  return false;
};

export const validateAppointmentSchedule = (app: ScheduleAppointment): ScheduleValidationResult => {
  const now = new Date();
  const nowY = now.getFullYear();
  const nowM = String(now.getMonth() + 1).padStart(2, '0');
  const nowD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${nowY}-${nowM}-${nowD}`;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const appDateStr = (app.dateRaw || '2026-10-16').split('T')[0];
  const times = app.timeRange.split(/[–-]/);
  const startTimeStr = times[0]?.trim() || '09:00';
  const endTimeStr = times[1]?.trim() || '10:00';

  const [startH, startM] = startTimeStr.split(':').map(Number);
  const [endH, endM] = endTimeStr.split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  // 1. Quá ngày hẹn trong quá khứ
  if (appDateStr < todayStr) {
    return {
      isOverdue: true,
      isEarlyDate: false,
      isEarlyTime: false,
      isValid: false,
      reason: 'Đã quá ngày hẹn',
      detail: `Lịch hẹn được đặt vào ngày ${app.date} (hôm nay là ${nowD}/${nowM}/${nowY}). Khách hàng đã không đến đúng ngày hẹn.`,
      scheduledTimeStr: `${startTimeStr}–${endTimeStr} ngày ${app.date}`,
    };
  }

  // 2. Trong ngày hôm nay
  if (appDateStr === todayStr) {
    // Quá giờ hẹn kết thúc + 15 phút đệm
    if (currentMinutes > endMinutes + 15) {
      return {
        isOverdue: true,
        isEarlyDate: false,
        isEarlyTime: false,
        isValid: false,
        reason: 'Đã quá giờ hẹn hôm nay',
        detail: `Khung giờ hẹn đã kết thúc lúc ${endTimeStr}. Khách hàng vắng mặt không đến ca dịch vụ.`,
        scheduledTimeStr: `${startTimeStr}–${endTimeStr} hôm nay`,
      };
    }

    // Khách đến quá sớm (> 45 phút)
    if (currentMinutes < startMinutes - 45) {
      return {
        isOverdue: false,
        isEarlyDate: false,
        isEarlyTime: true,
        isValid: false,
        reason: 'Khách đến sớm hơn giờ hẹn',
        detail: `Khách đến sớm trước giờ hẹn (Giờ hẹn lúc ${startTimeStr}, hiện tại là ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}).`,
        scheduledTimeStr: `${startTimeStr}–${endTimeStr} hôm nay`,
      };
    }

    // Đúng khung giờ
    return {
      isOverdue: false,
      isEarlyDate: false,
      isEarlyTime: false,
      isValid: true,
      reason: 'Đúng lịch hẹn',
      detail: `Đúng lịch hẹn lúc ${startTimeStr}–${endTimeStr}. Sẵn sàng tiếp nhận phục vụ!`,
      scheduledTimeStr: `${startTimeStr}–${endTimeStr} hôm nay`,
    };
  }

  // 3. Ngày trong tương lai (Chưa đến ngày hẹn)
  return {
    isOverdue: false,
    isEarlyDate: true,
    isEarlyTime: false,
    isValid: false,
    reason: 'Chưa đến ngày hẹn',
    detail: `Lịch hẹn được đặt vào ngày ${app.date} (chưa đến ngày hẹn). Hôm nay là ngày ${nowD}/${nowM}/${nowY}.`,
    scheduledTimeStr: `${startTimeStr}–${endTimeStr} ngày ${app.date}`,
  };
};

export const W05_StaffSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Core Data State
  const [liveTechnicians, setLiveTechnicians] = useState<Technician[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [rooms, setRooms] = useState<BranchRoom[]>([]);
  const [consultationSurveys, setConsultationSurveys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return searchParams.get('branchId') || localStorage.getItem('mld_selected_branch_id') || 'ALL';
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return searchParams.get('date') || localStorage.getItem('mld_schedule_date') || '2026-10-16';
  });

  const [selectedTechFilter, setSelectedTechFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  // Fetch all primary live data
  const fetchScheduleData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bkRes, techRes, custRes, brRes, srvRes, roomRes, surveysRes] = await Promise.all([
        bookingService.getBookings(),
        supabaseService.getTechnicians(),
        customerService.getCustomers(),
        branchService.getAllBranches(),
        supabaseService.getServices(),
        supabaseService.getRooms(),
        supabaseService.getConsultationSurveys(),
      ]);

      if (bkRes.success && bkRes.data) setLiveBookings(bkRes.data);
      if (techRes && techRes.length > 0) setLiveTechnicians(techRes);
      if (custRes.success && custRes.data) setCustomers(custRes.data);
      if (brRes.success && brRes.data) setBranches(brRes.data);
      if (srvRes && srvRes.length > 0) setServices(srvRes);
      if (roomRes && roomRes.length > 0) setRooms(roomRes);
      if (Array.isArray(surveysRes)) setConsultationSurveys(surveysRes);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
      toast.error('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Synchronize with URL searchParams & global branch changes
  useEffect(() => {
    const b = searchParams.get('branchId');
    if (b) setSelectedBranchId(b);

    const d = searchParams.get('date');
    if (d) setSelectedDate(d);
  }, [searchParams]);

  useEffect(() => {
    const handleGlobalBranchChange = (e: any) => {
      const bId = e?.detail?.branchId;
      if (bId) setSelectedBranchId(bId);
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

  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId);
  }, [branches, selectedBranchId]);

  // Formatted header subtitle date
  const formattedDateHeader = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      const weekday = dObj.toLocaleDateString('vi-VN', { weekday: 'long' });
      const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      return `${capWeekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Dynamic quick-switch dates based on bookings currently in system
  const availableBookingDates = useMemo(() => {
    const dateMap = new Map<string, number>();
    liveBookings.forEach((b) => {
      if (b.bookingDate) {
        dateMap.set(b.bookingDate, (dateMap.get(b.bookingDate) || 0) + 1);
      }
    });

    // Make sure 2026-10-16 and 2026-10-17 are present as prime demos
    if (!dateMap.has('2026-10-16')) dateMap.set('2026-10-16', 2);
    if (!dateMap.has('2026-10-17')) dateMap.set('2026-10-17', 1);

    const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([dt, count]) => {
      const [y, m, d] = dt.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      const wd = dObj.toLocaleDateString('vi-VN', { weekday: 'short' });
      return {
        date: dt,
        count,
        label: `${wd}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
      };
    });
  }, [liveBookings]);

  // Technicians matching active branch
  const branchTechnicians = useMemo(() => {
    let list = liveTechnicians;
    if (selectedBranchId !== 'ALL') {
      const branchOnly = list.filter((t) => t.branchId === selectedBranchId);
      if (branchOnly.length > 0) list = branchOnly;
    }

    if (list.length === 0) {
      return DEFAULT_FALLBACK_TECHNICIANS;
    }

    const validRooms = rooms.filter(
      (r) =>
        r.isAvailable &&
        !r.name?.toLowerCase().startsWith('test') &&
        !r.name?.startsWith('[') &&
        (!selectedBranchId || selectedBranchId === 'ALL' || r.branchId === selectedBranchId)
    );

    return list.map((t, idx) => {
      const matchedRoom =
        TECHNICIAN_ROOM_MAP[t.id] ||
        validRooms[idx % Math.max(1, validRooms.length)]?.name ||
        `Phòng Trị Liệu 0${idx + 1}`;
      return {
        id: t.id,
        name: t.fullName,
        room: matchedRoom,
        role: t.title || 'Chuyên viên chăm sóc & trị liệu',
        avatar: t.avatarUrl,
        branchId: t.branchId,
      };
    });
  }, [liveTechnicians, selectedBranchId, rooms]);

  // Filtered technician columns for the matrix
  const visibleTechnicians = useMemo(() => {
    if (selectedTechFilter !== 'ALL') {
      const filtered = branchTechnicians.filter((t) => t.id === selectedTechFilter);
      if (filtered.length > 0) return filtered;
    }
    return branchTechnicians;
  }, [branchTechnicians, selectedTechFilter]);

  // Appointments mapped directly from real Supabase bookings
  const appointments: ScheduleAppointment[] = useMemo(() => {
    const custMap = new Map(customers.map((c) => [c.id, c]));
    const techMap = new Map(branchTechnicians.map((t) => [t.id, t]));
    const srvMap = new Map(services.map((s) => [s.id, s]));

    return liveBookings.map((b) => {
      const cust = custMap.get(b.customerId);
      const tech = techMap.get(b.technicianId || '');
      const itemSrv = b.items?.[0]?.serviceId ? srvMap.get(b.items[0].serviceId) : undefined;
      const srvName = b.items?.[0]?.service?.name || itemSrv?.name || b.specialNotes || 'Chăm sóc da & Trị liệu';

      const [sH, sM] = (b.startTime || '09:00').split(':').map(Number);
      const [eH, eM] = (b.endTime || '10:00').split(':').map(Number);
      const startHour = (isNaN(sH) ? 9 : sH) + (isNaN(sM) ? 0 : sM) / 60;
      const endHour = (isNaN(eH) ? 10 : eH) + (isNaN(eM) ? 0 : eM) / 60;
      const durationHours = Math.max(0.75, endHour - startHour);

      const customerName = cust?.fullName || b.bookedForName || 'Khách hàng';
      const customerPhone = cust?.phone || b.bookedForPhone || '';
      const techName = tech?.name || b.technician?.fullName || 'Kỹ thuật viên';

      const statusLabel =
        b.status === 'CONFIRMED'
          ? 'Đã xác nhận'
          : b.status === 'IN_SERVICE'
          ? 'Đang thực hiện'
          : b.status === 'COMPLETED'
          ? 'Hoàn thành'
          : b.status === 'CANCELLED'
          ? 'Đã hủy'
          : 'Chờ thanh toán';

      const isPaid = b.paymentStatus === 'PAID';
      const priceVal = b.finalPrice || b.baseTotal || 500000;
      const depositVal = isPaid
        ? '0đ (Đã tất toán)'
        : b.discountAmount
        ? `${b.discountAmount.toLocaleString('vi-VN')}đ`
        : 'Chưa thu cọc';

      const remainingVal = isPaid
        ? '0đ (Đã thanh toán đủ)'
        : `${Math.max(0, priceVal - (b.discountAmount || 0)).toLocaleString('vi-VN')}đ`;

      const dateRaw = b.bookingDate || '2026-10-16';
      const dateParts = dateRaw.split('-');
      const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : dateRaw;
      const timeRange = `${(b.startTime || '').slice(0, 5)}–${(b.endTime || '').slice(0, 5)}`;

      const roomDesc = b.room?.name
        ? `${b.room.name} · ${b.assignedBedNumber || 'Giường 01'}`
        : b.assignedBedNumber || 'Phòng Trị Liệu';

      return {
        id: b.id,
        technicianId: b.technicianId || '',
        branchId: b.branchId,
        title: `${srvName.split(' ')[0]} · ${customerName}`,
        subtitle: `${timeRange} · ${statusLabel}`,
        customer: customerName,
        customerPhone,
        customerCode: `${cust?.referralCode || 'KH'} · ${b.bookingCode}`,
        avatar: cust?.avatarUrl || tech?.avatar || undefined,
        service: srvName,
        timeRange,
        date: dateDisplay,
        dateRaw,
        technicianName: techName,
        resource: roomDesc,
        durationText: `Dịch vụ ${Math.round(durationHours * 60)} phút`,
        price: `${priceVal.toLocaleString('vi-VN')}đ`,
        deposit: depositVal,
        remaining: remainingVal,
        status: statusLabel,
        statusRaw: b.status,
        statusType: isPaid ? 'independent' : 'waiting_payment',
        bufferTitle: `Giữ nguồn lực đến ${(b.endTime || '').slice(0, 5)}`,
        bufferDesc: isPaid
          ? 'Liệu trình đã hoàn thành hoặc thanh toán đầy đủ. Vùng đệm vệ sinh khử khuẩn 15 phút sau phục vụ.'
          : 'Vùng đệm vệ sinh 15 phút sau liệu trình. Khoản phí đang chờ quyết toán tại quầy thu ngân.',
        startHour,
        durationHours,
        hasCleaningBuffer: true,
        cleaningText: `${(b.endTime || '').slice(0, 5)} · Vệ sinh / giữ phòng (15p)`,
        bookingSource: (b.bookingSource as any) || (b.specialNotes?.includes('[Gói') ? 'TREATMENT_PACKAGE' : 'AUTO_OPTIMIZED'),
        guestCount: b.guestCount || 1,
        bedCode: b.assignedBedNumber || 'G01',
        roomName: b.room?.name || 'Phòng Trị Liệu',
      };
    });
  }, [liveBookings, customers, branchTechnicians, services]);

  // Local Custom Appointments resilience
  const [customAppointments, setCustomAppointments] = useState<ScheduleAppointment[]>(() => {
    try {
      const saved = localStorage.getItem('mld_staff_appointments');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to parse saved appointments', err);
    }
    return [];
  });

  const allAppointments = useMemo(() => {
    return [...customAppointments, ...appointments];
  }, [customAppointments, appointments]);

  // Filtered appointments displayed on current date's schedule
  const displayedAppointments = useMemo(() => {
    return allAppointments.filter((app) => {
      // 1. Date Filter
      if (app.dateRaw !== selectedDate) return false;

      // 2. Branch Filter
      if (selectedBranchId !== 'ALL' && app.branchId && app.branchId !== selectedBranchId) {
        return false;
      }

      // 3. Technician Filter
      if (selectedTechFilter !== 'ALL' && app.technicianId !== selectedTechFilter) {
        return false;
      }

      // 4. Status Filter
      if (selectedStatusFilter !== 'ALL' && app.statusRaw !== selectedStatusFilter) {
        return false;
      }

      // 4.1 Booking Group Filter
      if (selectedGroupFilter !== 'ALL' && app.bookingSource !== selectedGroupFilter) {
        return false;
      }

      // 5. Search Filter
      if (searchTerm.trim()) {
        return matchSearch(
          [
            app.customer,
            app.customerCode,
            app.customerPhone || '',
            app.service,
            app.technicianName,
            app.resource,
            app.status,
          ],
          searchTerm
        );
      }

      return true;
    });
  }, [
    allAppointments,
    selectedDate,
    selectedBranchId,
    selectedTechFilter,
    selectedStatusFilter,
    selectedGroupFilter,
    searchTerm,
  ]);

  // Auto select active appointment when day or search changes
  useEffect(() => {
    if (displayedAppointments.length > 0) {
      if (!selectedAppId || !displayedAppointments.some((a) => a.id === selectedAppId)) {
        setSelectedAppId(displayedAppointments[0].id);
      }
    } else if (allAppointments.length > 0) {
      if (!selectedAppId || !allAppointments.some((a) => a.id === selectedAppId)) {
        setSelectedAppId(allAppointments[0].id);
      }
    }
  }, [displayedAppointments, allAppointments, selectedAppId]);

  // Currently selected appointment for the right sidebar
  const selectedApp: ScheduleAppointment | undefined = useMemo(() => {
    return (
      allAppointments.find((a) => a.id === selectedAppId) ||
      displayedAppointments[0] ||
      allAppointments[0]
    );
  }, [allAppointments, displayedAppointments, selectedAppId]);

  // Consultation survey for the currently selected appointment
  const surveyForSelectedApp = useMemo(() => {
    if (!selectedApp) return null;
    return consultationSurveys.find(
      (s) =>
        s.booking_id === selectedApp.id ||
        (s.customer_id &&
          s.customer_id ===
            customers.find(
              (c) =>
                c.fullName === selectedApp.customer ||
                c.phone === selectedApp.customerPhone
            )?.id)
    );
  }, [consultationSurveys, selectedApp, customers]);

  // Handle URL navigation with booking code or id
  useEffect(() => {
    const bookingParam = searchParams.get('booking') || searchParams.get('appId');
    if (bookingParam && allAppointments.length > 0) {
      const kw = bookingParam.toLowerCase().trim();
      const found = allAppointments.find(
        (a) =>
          a.id.toLowerCase() === kw ||
          a.customerCode.toLowerCase().includes(kw) ||
          a.customer.toLowerCase().includes(kw)
      );
      if (found) {
        setSelectedAppId(found.id);
        if (found.dateRaw && found.dateRaw !== selectedDate) {
          setSelectedDate(found.dateRaw);
        }
      }
    }
  }, [searchParams, allAppointments, selectedDate]);

  // Date Navigator Helpers
  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate);
    localStorage.setItem('mld_schedule_date', newDate);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date', newDate);
      return next;
    });
  };

  const handleStepDay = (step: number) => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const cur = new Date(y, m - 1, d);
      cur.setDate(cur.getDate() + step);
      const nextDateStr = cur.toISOString().split('T')[0];
      handleSelectDate(nextDateStr);
    } catch {
      handleSelectDate('2026-10-16');
    }
  };

  // Update Booking Status directly on Supabase Cloud
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: BookingStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await bookingService.updateBookingStatus(bookingId, nextStatus);
      if (res.success) {
        setLiveBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: nextStatus } : b))
        );
        const statusMap: Record<string, string> = {
          [BookingStatus.CONFIRMED]: 'Đã xác nhận',
          [BookingStatus.IN_SERVICE]: 'Đang thực hiện',
          [BookingStatus.COMPLETED]: 'Hoàn thành',
          [BookingStatus.CANCELLED]: 'Đã hủy',
        };
        toast.success(
          'Cập nhật thành công',
          `Trạng thái lịch hẹn đã chuyển thành: ${statusMap[nextStatus] || nextStatus}`
        );
      } else {
        toast.error('Lỗi cập nhật', res.message || 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống', 'Vui lòng thử lại sau.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Custom Appointment
  const handleDeleteCustomAppointment = (id: string) => {
    const updated = customAppointments.filter((a) => a.id !== id);
    setCustomAppointments(updated);
    try {
      localStorage.setItem('mld_staff_appointments', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update localStorage', err);
    }
    toast.success('Đã hủy lịch hẹn', 'Lịch hẹn đã được gỡ bỏ khỏi bảng phân công ca trực.');
  };

  // Validation status of currently selected appointment
  const scheduleCheck = useMemo(() => {
    if (!selectedApp) return null;
    return validateAppointmentSchedule(selectedApp);
  }, [selectedApp]);

  const isOverdue = Boolean(
    selectedApp &&
    (selectedApp.statusRaw === 'CONFIRMED' || selectedApp.statusRaw === 'PENDING') &&
    scheduleCheck?.isOverdue
  );

  // Overdue bookings that need to be dropped/freed
  const overdueBookings = useMemo(() => {
    return liveBookings.filter((b) => {
      if (selectedBranchId !== 'ALL' && b.branchId && b.branchId !== selectedBranchId) return false;
      return isBookingOverdue(b);
    });
  }, [liveBookings, selectedBranchId]);

  // Modal State for Schedule Check / Validation
  const [validationModalApp, setValidationModalApp] = useState<{
    app: ScheduleAppointment;
    checkResult: ScheduleValidationResult;
  } | null>(null);

  // Check-in and start service workflow
  const handleCheckInAndStart = (app: ScheduleAppointment) => {
    const checkResult = validateAppointmentSchedule(app);
    if (checkResult.isOverdue) {
      setValidationModalApp({ app, checkResult });
      return;
    }
    if (checkResult.isEarlyDate) {
      setValidationModalApp({ app, checkResult });
      return;
    }
    handleUpdateBookingStatus(app.id, BookingStatus.IN_SERVICE);
  };

  // Drop an overdue booking immediately and release resources
  const handleDropOverdueBooking = async (bookingId: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await bookingService.updateBookingStatus(bookingId, BookingStatus.CANCELLED);
      if (res.success) {
        setLiveBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: BookingStatus.CANCELLED } : b))
        );
        toast.success(
          'Đã bỏ lịch hẹn quá hạn',
          'Lịch hẹn đã được hủy bỏ và giải phóng kỹ thuật viên, phòng/giường thành công.'
        );
        setValidationModalApp(null);
      } else {
        toast.error('Lỗi thao tác', res.message || 'Không thể hủy lịch hẹn.');
      }
    } catch (err) {
      toast.error('Lỗi hệ thống', 'Vui lòng thử lại sau.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Drop ALL overdue bookings in bulk
  const handleDropAllOverdueBookings = async () => {
    if (overdueBookings.length === 0) {
      toast.info('Thông báo', 'Không có lịch hẹn nào bị quá hạn.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await Promise.all(
        overdueBookings.map((b) => bookingService.updateBookingStatus(b.id, BookingStatus.CANCELLED))
      );
      setLiveBookings((prev) =>
        prev.map((b) => (isBookingOverdue(b) ? { ...b, status: BookingStatus.CANCELLED } : b))
      );
      toast.success(
        'Đã dọn dẹp lịch quá hạn',
        `Đã hủy và giải phóng thành công ${overdueBookings.length} lịch hẹn quá hạn.`
      );
    } catch (err) {
      toast.error('Lỗi dọn dẹp', 'Không thể hoàn tất hủy các lịch quá hạn.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Dynamic Empty Slot Suggestions based on the day's schedule
  const emptySlotSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    visibleTechnicians.slice(0, 3).forEach((tech) => {
      const techApps = displayedAppointments.filter((a) => a.technicianId === tech.id);
      if (techApps.length === 0) {
        suggestions.push(`${tech.name} · ${tech.room}: Trống lịch phục vụ cả ngày (từ 09:00 đến 20:00).`);
      } else {
        const sorted = [...techApps].sort((a, b) => a.startHour - b.startHour);
        const lastApp = sorted[sorted.length - 1];
        const endHourVal = lastApp.startHour + lastApp.durationHours + 0.25; // add 15m cleaning
        const endH = Math.floor(endHourVal);
        const endM = Math.round((endHourVal - endH) * 60);
        const freeTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        suggestions.push(
          `${tech.name} · ${tech.room}: Sẵn sàng nhận khách mới từ ${freeTimeStr} (sau 15p khử khuẩn).`
        );
      }
    });

    if (suggestions.length === 0) {
      return [
        'Trần Lan Anh · Phòng VIP 01: từ 11:15 (gồm 15 phút vệ sinh sau liệu trình).',
        'Lê Quỳnh Nga · Phòng Massage Body 02: từ 15:45.',
        'Nguyễn Thu Hà · Phòng Gội Dưỡng Sinh 03: trống ca chiều từ 13:30.',
      ];
    }
    return suggestions;
  }, [visibleTechnicians, displayedAppointments]);

  // Modal Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [appDate, setAppDate] = useState<string>(selectedDate);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(1); // default 09:30–10:45
  const [modalBranchId, setModalBranchId] = useState<string>('');
  const [statusType, setStatusType] = useState<'waiting_payment' | 'independent'>('independent');
  const [notes, setNotes] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Set defaults for Create Modal
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (branchTechnicians.length > 0 && !selectedTechId) {
      setSelectedTechId(branchTechnicians[0].id);
    }
  }, [branchTechnicians, selectedTechId]);

  useEffect(() => {
    if (!modalBranchId) {
      setModalBranchId(selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id || '');
    }
  }, [selectedBranchId, branches, modalBranchId]);

  // Create new appointment handler
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ và tên khách hàng.');
      return;
    }

    setIsCreating(true);
    try {
      const srv = services.find((s) => s.id === selectedServiceId) || services[0] || {
        id: 'eeeeeeee-0001-0001-0001-000000000001',
        name: 'Chăm sóc Da Mặt Chuyên Sâu Hydro-Care',
        price: 650000,
        durationMinutes: 75,
      };

      const tech = branchTechnicians.find((t) => t.id === selectedTechId) || branchTechnicians[0];
      const slot = TIME_SLOT_OPTIONS[selectedSlotIndex] || TIME_SLOT_OPTIONS[0];

      const startH = Math.floor(slot.startHour);
      const startM = Math.round((slot.startHour - startH) * 60);
      const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`;

      const endHourNum = slot.startHour + slot.durationHours;
      const endH = Math.floor(endHourNum);
      const endM = Math.round((endHourNum - endH) * 60);
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

      const targetBranchId = modalBranchId || (selectedBranchId !== 'ALL' ? selectedBranchId : branches[0]?.id || 'aaaaaaaa-0001-0001-0001-000000000001');
      const depositNum = statusType === 'waiting_payment' ? 0 : 150000;

      const res = await bookingService.createBooking({
        customerId: selectedCustomerId || undefined,
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
        branchId: targetBranchId,
        serviceId: srv.id,
        serviceName: srv.name,
        technicianId: tech?.id,
        technicianName: tech?.name,
        roomName: tech?.room,
        bookingDate: appDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: statusType === 'waiting_payment' ? BookingStatus.PENDING : BookingStatus.CONFIRMED,
        paymentStatus: statusType === 'waiting_payment' ? PaymentStatus.UNPAID : PaymentStatus.PAID,
        baseTotal: srv.price,
        depositAmount: depositNum,
        finalPrice: srv.price,
        notes: notes.trim(),
        durationMinutes: srv.durationMinutes || 75,
      });

      if (res.data) {
        setLiveBookings((prev) => [res.data!, ...prev]);
        setSelectedAppId(res.data.id);
        if (appDate !== selectedDate) {
          handleSelectDate(appDate);
        }
      }

      toast.success(
        'Tạo lịch hẹn thành công',
        `Đã lên lịch "${srv.name}" cho khách hàng ${custName.trim()} lúc ${slot.label} ngày ${appDate}.`
      );

      // Gửi thông báo hệ thống
      notificationService.addNotification({
        title: 'Lịch hẹn mới được tạo',
        message: `Khách hàng ${custName.trim()} đã đặt lịch "${srv.name}" lúc ${slot.label} ngày ${appDate}.`,
        type: 'BOOKING',
        link: `/staff-schedule?date=${appDate}&booking=${res.data?.bookingCode || ''}`,
      });

      setShowCreateModal(false);
      setCustName('');
      setCustPhone('');
      setSelectedCustomerId('');
      setNotes('');
    } catch (err) {
      console.error('Failed to create appointment:', err);
      toast.error('Lỗi tạo lịch hẹn', 'Không thể hoàn tất tạo lịch hẹn. Vui lòng thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  // Time hours from 09:00 to 20:00 (12 intervals)
  const hours = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
  ];

  const ROW_HEIGHT = 58;

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
              Lịch kỹ thuật viên
            </h1>
            {activeBranch && (
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                {activeBranch.name} ({activeBranch.code})
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#FAF8F5] text-[#985018] border border-[#EFE4D9]">
              {displayedAppointments.length} lịch hẹn trong ngày
            </span>
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            <strong className="text-[#3E200C] font-bold">{formattedDateHeader}</strong> · {activeBranch ? `${activeBranch.name} · ${activeBranch.district}` : 'Toàn hệ thống chi nhánh'} · Mở cửa {activeBranch?.openingTime ? activeBranch.openingTime.slice(0, 5) : '08:30'}–{activeBranch?.closingTime ? activeBranch.closingTime.slice(0, 5) : '20:30'}
          </p>
        </div>

        <button
          onClick={() => {
            setAppDate(selectedDate);
            setShowCreateModal(true);
          }}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo lịch hẹn</span>
        </button>
      </div>

      {/* 2. Interactive Filter Toolbar (All Controls Fully Functional) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách hàng hoặc mã lịch hẹn..."
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

        {/* Branch dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedBranchId}
            onChange={(e) => {
              const bId = e.target.value;
              setSelectedBranchId(bId);
              localStorage.setItem('mld_selected_branch_id', bId);
              window.dispatchEvent(new CustomEvent('mld_branch_changed', { detail: { branchId: bId } }));
              if (bId !== 'ALL') {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('branchId', bId);
                  return next;
                });
              } else {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('branchId');
                  return next;
                });
              }
            }}
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

        {/* Interactive Date Selector with Steppers */}
        <div className="flex items-center gap-1 shrink-0 bg-white border border-[#E8DFD8] rounded-xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => handleStepDay(-1)}
            title="Lùi 1 ngày"
            className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <label className="relative flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-[#2C241E] cursor-pointer hover:bg-[#FAF8F5] rounded-lg transition-colors">
            <Calendar className="w-3.5 h-3.5 text-[#985018]" />
            <span>
              {(() => {
                const parts = selectedDate.split('-');
                return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : selectedDate;
              })()}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) handleSelectDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Nhấp để chọn ngày bất kỳ"
            />
          </label>

          <button
            type="button"
            onClick={() => handleStepDay(1)}
            title="Tiến 1 ngày"
            className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Technician / Room dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedTechFilter}
            onChange={(e) => setSelectedTechFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Tất cả kỹ thuật viên & phòng ({branchTechnicians.length})</option>
            {branchTechnicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.room}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="IN_SERVICE">Đang thực hiện</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="PENDING">Chờ thanh toán / Giữ chỗ</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Booking Group dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-sky-200 bg-sky-50/50 text-xs font-bold text-sky-800 hover:bg-sky-50 transition-colors appearance-none focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">📋 Tất cả nhóm đặt lịch</option>
            <option value="AUTO_OPTIMIZED">⚡ Tự động tối ưu</option>
            <option value="MANUAL">✍️ Xếp lịch thủ công</option>
            <option value="TREATMENT_PACKAGE">💆 Gói liệu trình</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-sky-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Overdue Bookings Alert Banner */}
      {overdueBookings.length > 0 && (
        <div className="bg-[#FFF5F5] border border-[#F5C2C7] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#DC2626] shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-bold text-[#991B1B] text-xs sm:text-sm flex items-center gap-2">
                <span>Phát hiện {overdueBookings.length} lịch hẹn đã quá hạn chưa xử lý</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEE2E2] text-[#B91C1C]">
                  Cần giải phóng
                </span>
              </div>
              <div className="text-[11.5px] text-[#7F1D1D] mt-0.5">
                Các lịch hẹn cũ (ví dụ: {overdueBookings[0].bookingCode} - {overdueBookings[0].customer?.fullName || overdueBookings[0].bookedForName || 'Khách'}) đã qua ngày/giờ hẹn mà khách không đến. Hãy bỏ ngay để giải phóng chuyên viên và phòng.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const targetApp = allAppointments.find((a) => a.id === overdueBookings[0].id);
                if (targetApp) {
                  setSelectedAppId(targetApp.id);
                  if (targetApp.dateRaw && targetApp.dateRaw !== selectedDate) {
                    handleSelectDate(targetApp.dateRaw);
                  }
                }
              }}
              className="px-3 py-1.5 bg-white hover:bg-[#FAF4EE] border border-[#E8DFD8] text-[#8A4F23] font-bold rounded-xl transition-all cursor-pointer shadow-2xs text-xs"
            >
              Xem chi tiết
            </button>
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={handleDropAllOverdueBookings}
              className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isUpdatingStatus ? 'Đang bỏ lịch...' : 'Bỏ tất cả lịch quá hạn'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Date Switcher Chips (Jump immediately between days with real bookings) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-[#73675F] shrink-0">Chọn nhanh ngày có lịch:</span>
        {availableBookingDates.map((item) => (
          <button
            key={item.date}
            type="button"
            onClick={() => handleSelectDate(item.date)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedDate === item.date
                ? 'bg-[#985018] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{item.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                selectedDate === item.date ? 'bg-white/20 text-white' : 'bg-[#FAF0E4] text-[#985018]'
              }`}
            >
              {item.count}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => handleSelectDate(new Date().toISOString().split('T')[0])}
          className="px-3 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF8F5] text-[#5C5046] border border-[#E8DFD8] shrink-0 cursor-pointer"
        >
          Hôm nay
        </button>
      </div>

      {/* 3. Main Content: Schedule Timetable Matrix (Left) + Detail Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Matrix + Legend) - min-w-0 prevents grid blowout */}
        <div className="lg:col-span-8 space-y-3 min-w-0">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-x-auto shadow-xs">
            <div className="w-max min-w-full inline-block align-top">
              {/* Timetable Header Row */}
              <div className="flex border-b border-[#EFE4D9] bg-[#F3E2CE] w-max min-w-full">
                {/* Corner spacer - Sticky on horizontal scroll */}
                <div className="w-16 sm:w-20 shrink-0 sticky left-0 z-30 bg-[#F3E2CE] border-r border-[#EFE4D9] flex items-center justify-center p-2 text-[10.5px] font-bold text-[#73675F] shadow-[1px_0_0_#EFE4D9]">
                  Giờ
                </div>

                {/* Technician Headers - Uniform fixed column width */}
                {visibleTechnicians.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`w-[200px] min-w-[200px] shrink-0 px-4 py-3 border-r border-[#EFE4D9] ${
                      idx === visibleTechnicians.length - 1 ? 'border-r-0' : ''
                    }`}
                  >
                    <div className="text-[13px] font-bold text-[#2C241E] truncate" title={t.name}>
                      {t.name}
                    </div>
                    <div className="text-[11px] text-[#73675F] mt-0.5 truncate" title={t.room}>
                      {t.room}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timetable Body (Rows + Absolute Appointment Layers) */}
              <div className="relative flex w-max min-w-full">
                {/* Left Column: Time Labels - Sticky on horizontal scroll */}
                <div className="w-16 sm:w-20 shrink-0 sticky left-0 z-20 bg-white border-r border-[#EFE4D9] select-none shadow-[1px_0_0_#EFE4D9]">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="border-b border-[#F0E6DC] text-center pt-2 text-[11px] sm:text-xs text-[#73675F] font-medium"
                    >
                      {hour}
                    </div>
                  ))}
                </div>

                {/* Technician Columns - Exact same fixed width as header */}
                {visibleTechnicians.map((t, colIdx) => {
                  const colAppointments = displayedAppointments.filter(
                    (a) => a.technicianId === t.id
                  );

                  return (
                    <div
                      key={t.id}
                      className={`w-[200px] min-w-[200px] shrink-0 relative border-r border-[#EFE4D9] ${
                        colIdx === visibleTechnicians.length - 1 ? 'border-r-0' : ''
                      }`}
                    >
                      {/* Background Grid Lines extending full width of column */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          className="border-b border-[#F0E6DC] w-full"
                        />
                      ))}

                      {/* Shared Lunch Break Block: 12:00 to 13:00 */}
                      <div
                        style={{
                          top: `${(12 - 9) * ROW_HEIGHT + 3}px`,
                          height: `${ROW_HEIGHT - 6}px`,
                        }}
                        className="absolute inset-x-2 rounded-xl bg-[#F6EFE8] flex items-center justify-center text-center p-1 select-none pointer-events-none z-5"
                      >
                        <span className="text-[11px] text-[#73675F] font-medium">
                          12:00–13:00 · Nghỉ trưa
                        </span>
                      </div>

                      {/* Dynamic Appointment Cards for this column */}
                      {colAppointments.map((app) => {
                        const topOffset = (app.startHour - 9) * ROW_HEIGHT;
                        const blockHeight = app.durationHours * ROW_HEIGHT;
                        const isSelected = selectedApp?.id === app.id;

                        const isCompleted = app.statusRaw === 'COMPLETED';
                        const isInService = app.statusRaw === 'IN_SERVICE';
                        const isConfirmed = app.statusRaw === 'CONFIRMED';

                        return (
                          <div key={app.id}>
                            {/* Main Appointment Card */}
                            <div
                              onClick={() => setSelectedAppId(app.id)}
                              style={{
                                top: `${topOffset}px`,
                                height: `${blockHeight}px`,
                              }}
                              className={`absolute inset-x-2 p-2.5 text-left cursor-pointer transition-all duration-150 z-10 flex flex-col justify-between ${
                                app.hasCleaningBuffer ? 'rounded-t-xl' : 'rounded-xl'
                              } ${
                                isSelected
                                  ? 'bg-[#FAF0E4] border-2 border-[#985018] shadow-md scale-[1.01]'
                                  : isCompleted
                                  ? 'bg-[#EBF7EE] border border-[#BDE5C8] hover:border-[#2D7A4D]'
                                  : isInService
                                  ? 'bg-[#EFF8FF] border border-[#BFDBFE] hover:border-[#1D4ED8]'
                                  : 'bg-[#FDF6EE] border border-[#D7BBA6] hover:border-[#985018]'
                              }`}
                            >
                              <div>
                                <div className="text-[11.5px] font-bold text-[#2C241E] truncate leading-tight">
                                  {app.title}
                                </div>
                                <div className="text-[10.5px] text-[#73675F] truncate mt-0.5">
                                  {app.timeRange}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1 mt-1">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold ${
                                    isCompleted
                                      ? 'bg-[#D1F2D9] text-[#0D6832]'
                                      : isInService
                                      ? 'bg-[#DBEAFE] text-[#1E40AF]'
                                      : isConfirmed
                                      ? 'bg-[#E5E7EB] text-[#374151]'
                                      : 'bg-[#FEF3C7] text-[#92400E]'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                            </div>

                            {/* Attached buffer cleaning strip */}
                            {app.hasCleaningBuffer && (
                              <div
                                style={{
                                  top: `${topOffset + blockHeight}px`,
                                  height: '20px',
                                }}
                                className="absolute inset-x-2 rounded-b-md bg-[#DEC6B0] border-x border-b border-[#CDB59E] px-2 flex items-center text-[9.5px] font-medium text-[#4A3E34] truncate z-10"
                              >
                                {app.cleaningText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Empty Notice if zero appointments on selected date */}
          {displayedAppointments.length === 0 && (
            <div className="p-6 bg-white border border-[#EFE4D9] rounded-2xl text-center space-y-2 shadow-xs">
              <Calendar className="w-8 h-8 text-[#985018] mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-[#2C241E]">
                Không có lịch hẹn nào vào ngày {formattedDateHeader}
              </h3>
              <p className="text-xs text-[#73675F] max-w-md mx-auto">
                Hiện tại các chuyên viên đang trống toàn bộ khung giờ. Bạn có thể bấm tạo lịch hẹn mới hoặc chuyển sang ngày có lịch hẹn ở thanh chọn nhanh bên trên.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAppDate(selectedDate);
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 bg-[#985018] text-white text-xs font-bold rounded-xl hover:bg-[#854412] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Xếp lịch hẹn mới cho ngày này</span>
                </button>
              </div>
            </div>
          )}

          {/* Legend Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <span className="px-3 py-1 bg-[#D1F2D9] text-[#0D6832] rounded-lg font-bold">
              ● Đã hoàn thành
            </span>
            <span className="px-3 py-1 bg-[#DBEAFE] text-[#1E40AF] rounded-lg font-bold">
              ● Đang thực hiện
            </span>
            <span className="px-3 py-1 bg-[#FDF6EE] border border-[#D7BBA6] rounded-lg font-medium text-[#8A4F23]">
              Lịch chuẩn đã xác nhận
            </span>
            <span className="px-3 py-1 bg-[#FEF3C7] text-[#92400E] rounded-lg font-medium">
              Giữ chỗ tạm thời
            </span>
            <span className="px-3 py-1 bg-[#F6EFE8] text-[#73675F] rounded-lg font-medium">
              Nghỉ trưa / Khử khuẩn phòng (15p)
            </span>
          </div>
        </div>

        {/* Right Column (Sidebar Cards) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedApp ? (
            /* Card 1: Selected Appointment Details */
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[17px] font-extrabold text-[#3E200C]">Lịch đang chọn</div>
                  <div className="text-[11px] text-[#73675F]">Mã đơn: {selectedApp.customerCode}</div>
                </div>

                {/* Status Badge */}
                <div>
                  {isOverdue ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>Đã quá lịch · Vắng mặt</span>
                    </span>
                  ) : selectedApp.statusRaw === 'COMPLETED' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F6ED] text-[#0D6832] border border-[#C5ECD0]">
                      Đã hoàn thành
                    </span>
                  ) : selectedApp.statusRaw === 'IN_SERVICE' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                      Đang thực hiện
                    </span>
                  ) : selectedApp.statusRaw === 'CONFIRMED' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                      Lịch chuẩn · Đã xác nhận
                    </span>
                  ) : selectedApp.statusRaw === 'CANCELLED' ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      Đã hủy
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      Giữ chỗ tạm thời
                    </span>
                  )}
                </div>
              </div>

              {/* Customer profile snippet */}
              <div className="flex items-center gap-3 pt-0.5">
                <img
                  src={selectedApp.avatar || '/avatar_minh_anh.png'}
                  alt={selectedApp.customer}
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EFE4D9]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatar_minh_anh.png';
                  }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#2C241E] truncate">
                    {selectedApp.customer}
                  </div>
                  <div className="text-[11px] text-[#73675F] truncate mt-0.5">
                    {selectedApp.customerPhone ? `SĐT: ${selectedApp.customerPhone} · ` : ''}
                    {selectedApp.customerCode}
                  </div>
                </div>
              </div>

              {/* Service Title */}
              <div className="text-[13.5px] font-bold text-[#2C241E] pt-1 border-t border-[#F5EBE1]">
                {selectedApp.service}
              </div>

              {/* Details Table */}
              <div className="space-y-2 text-xs text-[#73675F] pt-1">
                <div className="flex items-center justify-between">
                  <span>Nhóm đặt lịch</span>
                  <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-sky-50 text-sky-800 border border-sky-200">
                    {selectedApp.bookingSource === 'MANUAL' ? '✍️ Xếp lịch thủ công' : selectedApp.bookingSource === 'TREATMENT_PACKAGE' ? '💆 Gói liệu trình' : '⚡ Tự động tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Số lượng khách</span>
                  <span className="font-bold text-slate-800">{selectedApp.guestCount || 1} người</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thời gian</span>
                  <span className="font-semibold text-[#2C241E]">{selectedApp.timeRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ngày hẹn</span>
                  <span className="font-semibold text-[#2C241E]">{selectedApp.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Kỹ thuật viên</span>
                  <span className="font-semibold text-[#2C241E]">{selectedApp.technicianName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nguồn lực phòng / giường</span>
                  <span className="font-semibold text-sky-700">{selectedApp.resource}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{selectedApp.durationText}</span>
                  <span className="font-semibold text-[#2C241E]">{selectedApp.price}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cọc cần thu</span>
                  <span className="font-semibold text-[#2C241E]">{selectedApp.deposit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Còn lại thanh toán</span>
                  <span className="font-bold text-[#0D6832]">{selectedApp.remaining}</span>
                </div>
              </div>

              {/* Enterprise Trụ cột 2 & 3: Hoa hồng KTV & Zalo ZNS */}
              <div className="bg-[#FAF8F5] border border-[#E8DFD8] rounded-2xl p-3 space-y-2.5 text-xs animate-in fade-in">
                <div className="flex items-center justify-between text-[#8A4F23] bg-[#FFF8F0] px-2.5 py-1.5 rounded-lg border border-[#F5E5D5]">
                  <span className="font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8A4F23]" />
                    <span>Hoa hồng KTV (10% ca):</span>
                  </span>
                  <span className="font-bold text-[#8A4F23]">
                    +{Math.round((parseInt(selectedApp.price.replace(/\D/g, ''), 10) || 390000) * 0.1).toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#166534] flex items-center gap-1.5">
                      <Send className="w-3 h-3 text-[#166534]" />
                      <span>Zalo ZNS tự động</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">
                      Sẵn sàng
                    </span>
                  </div>
                  <div className="text-[11px] text-[#15803D] leading-snug">
                    Tự động gửi thông báo xác nhận và tin nhắn ZNS nhắc hẹn trước 2 giờ tới {selectedApp.customerPhone || 'SĐT khách hàng'}.
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await notificationService.sendZaloZNS(
                        'PRE_REMINDER_2H',
                        selectedApp.customerPhone || '0334750241',
                        selectedApp.customer,
                        {
                          serviceName: selectedApp.service,
                          appointmentTime: selectedApp.timeRange,
                          branchName: 'MLD Clinic',
                        }
                      );
                      toast.success(
                        'Gửi Zalo ZNS thành công!',
                        `Đã gửi tin nhắn nhắc hẹn 2h tới ${selectedApp.customer} (${selectedApp.customerPhone || '0334750241'}).`
                      );
                    }}
                    className="w-full py-1.5 bg-white border border-[#86EFAC] text-[#15803D] hover:bg-[#F0FDF4] rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Gửi thử Zalo ZNS nhắc hẹn 2h</span>
                  </button>
                </div>
              </div>

              {/* Consultation Survey / Customer Intake Card */}
              {surveyForSelectedApp && (
                <div className="bg-[#FAF8F5] border border-[#E8DFD8] rounded-2xl p-3.5 space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#3E200C] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#985018]" />
                      <span>Khảo sát trước dịch vụ của khách</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/manage/consultation_surveys?search=${encodeURIComponent(selectedApp.customer)}`
                        )
                      }
                      className="text-[11px] font-bold text-[#985018] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Xem phiếu</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Safety Alert Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {surveyForSelectedApp.has_sensitive_skin && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
                        ⚠️ Da nhạy cảm
                      </span>
                    )}
                    {surveyForSelectedApp.has_oil_allergy && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                        ⛔ Dị ứng: {surveyForSelectedApp.allergy_details || 'Tinh dầu'}
                      </span>
                    )}
                    {surveyForSelectedApp.pressure_pref && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                        Lực:{' '}
                        {surveyForSelectedApp.pressure_pref === 'STRONG'
                          ? 'Lực mạnh'
                          : surveyForSelectedApp.pressure_pref === 'LIGHT'
                          ? 'Nhẹ nhàng'
                          : 'Vừa phải'}
                      </span>
                    )}
                  </div>

                  {/* Focus areas */}
                  {surveyForSelectedApp.focus_areas && (
                    <div className="text-[11px] text-[#73675F]">
                      <span className="font-semibold text-[#2C241E]">Vùng tập trung: </span>
                      <span>
                        {Array.isArray(surveyForSelectedApp.focus_areas)
                          ? surveyForSelectedApp.focus_areas.join(', ')
                          : String(surveyForSelectedApp.focus_areas)}
                      </span>
                    </div>
                  )}

                  {/* Special requests */}
                  {surveyForSelectedApp.special_requests && (
                    <div className="text-[11px] text-[#2C241E] bg-[#FAF0E4]/60 p-2 rounded-lg italic">
                      "{surveyForSelectedApp.special_requests}"
                    </div>
                  )}
                </div>
              )}

              {/* Status Banner with Dynamic Colors */}
              {isOverdue ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] animate-in fade-in">
                  <AlertOctagon className="w-4 h-4 stroke-[2.5] text-[#DC2626] shrink-0" />
                  <span>Trạng thái: ĐÃ QUÁ LỊCH HẸN ({selectedApp.timeRange.split('–')[1]} · {selectedApp.date})</span>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                    selectedApp.statusRaw === 'COMPLETED'
                      ? 'bg-[#E8F6ED] text-[#0D6832]'
                      : selectedApp.statusRaw === 'IN_SERVICE'
                      ? 'bg-[#E0F2FE] text-[#0369A1]'
                      : selectedApp.statusRaw === 'CANCELLED'
                      ? 'bg-[#FDF2F2] text-[#B02A37]'
                      : selectedApp.statusRaw === 'CONFIRMED'
                      ? 'bg-[#FAF0E4] text-[#8A4F23]'
                      : 'bg-[#FEF3C7] text-[#92400E]'
                  }`}
                >
                  <Clock className="w-4 h-4 stroke-[2]" />
                  <span>Trạng thái: {selectedApp.status}</span>
                </div>
              )}

              {/* Resource Hold Alert Box or Overdue Warning */}
              {isOverdue ? (
                <div className="bg-[#FFF5F5] border border-[#F5C2C7] rounded-2xl p-3.5 space-y-1.5 text-xs text-[#7A1D28]">
                  <div className="font-bold flex items-center gap-1.5 text-[#B02A37]">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> Cảnh báo chiếm dụng phòng & kỹ thuật viên
                  </div>
                  <p className="text-[11.5px] leading-relaxed">
                    Lịch hẹn này đã quá thời gian phục vụ mà khách không đến. Theo quy định, cần hủy bỏ lịch hẹn này ngay để giải phóng kỹ thuật viên <strong>{selectedApp.technicianName}</strong> và phòng <strong>{selectedApp.resource}</strong>.
                  </p>
                </div>
              ) : (
                <div className="bg-[#FAF4EE] border border-[#ECD9C9] rounded-2xl p-3.5 space-y-1">
                  <div className="text-xs font-bold text-[#3E200C]">{selectedApp.bufferTitle}</div>
                  <p className="text-[11.5px] text-[#50443D] leading-relaxed">
                    {selectedApp.bufferDesc}
                  </p>
                </div>
              )}

              {/* Interactive FSM Booking Actions for Real Bookings */}
              {!selectedApp.id.startsWith('app-custom-') && selectedApp.id && (
                <div className="space-y-2 pt-1">
                  {/* Nếu lịch đã quá hạn: Nút hành động ưu tiên là BỎ LỊCH QUÁ HẠN NGAY */}
                  {isOverdue ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleDropOverdueBooking(selectedApp.id)}
                        className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.2]" />
                        <span>{isUpdatingStatus ? 'Đang giải phóng...' : 'Bỏ lịch hẹn quá hạn ngay'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCheckInAndStart(selectedApp)}
                        className="w-full py-2 bg-[#FAF4EE] hover:bg-[#F3E2CE] text-[#8A4F23] border border-[#E8DFD8] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Kiểm tra khách đến & Bắt đầu</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {selectedApp.statusRaw === 'PENDING' && (
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleUpdateBookingStatus(selectedApp.id, BookingStatus.CONFIRMED)}
                          className="w-full py-2.5 bg-[#8A4F23] hover:bg-[#723F1A] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isUpdatingStatus ? 'Đang cập nhật...' : 'Xác nhận lịch hẹn'}</span>
                        </button>
                      )}

                      {selectedApp.statusRaw === 'CONFIRMED' && (
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleCheckInAndStart(selectedApp)}
                          className="w-full py-2.5 bg-[#0D6832] hover:bg-[#0A5428] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isUpdatingStatus ? 'Đang cập nhật...' : 'Khách đã đến & Bắt đầu'}</span>
                        </button>
                      )}

                      {selectedApp.statusRaw === 'IN_SERVICE' && (
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => {
                            handleUpdateBookingStatus(selectedApp.id, BookingStatus.COMPLETED);
                            toast.success(
                              'Kết ca trị liệu thành công!',
                              `Ca của khách ${selectedApp.customer} đã hoàn tất. Giường và KTV ${selectedApp.technicianName} đã sẵn sàng tiếp nhận lượt tiếp theo.`
                            );
                          }}
                          className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isUpdatingStatus ? 'Đang cập nhật...' : 'Kết ca trị liệu (Giải phóng Giường & KTV)'}</span>
                        </button>
                      )}

                      {selectedApp.statusRaw !== 'COMPLETED' && selectedApp.statusRaw !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleUpdateBookingStatus(selectedApp.id, BookingStatus.CANCELLED)}
                          className="w-full py-2 bg-[#FDF2F2] hover:bg-[#FDE8E8] text-[#B02A37] border border-[#F5C2C7] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Hủy lịch hẹn này</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Cashier Invoice Action Button */}
              <button
                type="button"
                onClick={() => {
                  const bCode = selectedApp.customerCode?.split('·')[1]?.trim() || selectedApp.id;
                  navigate(`/cashier-pos?booking=${encodeURIComponent(bCode)}${selectedApp.branchId ? `&branchId=${selectedApp.branchId}` : ''}`);
                }}
                className="w-full py-2.5 bg-white border border-[#D8BDA7] text-[#904206] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Xem đơn thu ngân POS</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              {selectedApp.id.startsWith('app-custom-') && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomAppointment(selectedApp.id)}
                  className="w-full py-2.5 bg-[#FDF2F2] hover:bg-[#FDE8E8] text-[#B02A37] border border-[#F5C2C7] rounded-xl text-xs font-bold transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Hủy lịch hẹn này
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-6 text-center space-y-3">
              <Calendar className="w-10 h-10 text-[#985018] mx-auto opacity-50" />
              <h3 className="text-sm font-bold text-[#2C241E]">Chưa chọn lịch hẹn</h3>
              <p className="text-xs text-[#73675F]">
                Nhấp vào bất kỳ khung lịch hẹn nào trên bảng để xem chi tiết khách hàng và quản lý tiến trình.
              </p>
            </div>
          )}

          {/* Card 2: Empty Slot Suggestions (Dynamically Calculated) */}
          <div className="bg-[#F3E2CE] rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-[#5A280C]">Gợi ý khung trống trong ngày</h3>
            <div className="space-y-2.5 text-xs text-[#50443D] leading-relaxed">
              {emptySlotSuggestions.map((sug, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#985018] font-bold">●</span>
                  <span>{sug}</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[#73675F] pt-1 border-t border-[#E8DACB]">
              Khung giờ tự động tính theo thời lượng dịch vụ và 15 phút vùng đệm khử khuẩn.
            </div>
          </div>

          {/* Card 3: Scheduling Rules Note */}
          <div className="bg-[#F3E2CE] rounded-2xl p-5 space-y-2">
            <h3 className="text-base font-bold text-[#5A280C]">Quy tắc xếp lịch vận hành</h3>
            <p className="text-xs text-[#50443D] leading-relaxed">
              Không trùng chuyên viên hoặc giường phòng; đảm bảo đúng chuyên môn, đủ thời lượng liệu trình và 15 phút vùng đệm khử khuẩn chuẩn y khoa, không vượt quá giờ đóng cửa chi nhánh.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Footer Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#985018]" />
        <span>
          Hệ thống điều phối lịch làm việc kỹ thuật viên & phòng trị liệu · MLD Beauty & Academy.
        </span>
      </div>

      {/* 5. Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3E2CE] flex items-center justify-center text-[#985018] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#3E200C]">Tạo lịch hẹn mới</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E4] text-[#985018] border border-[#E8DFD8]">
                      MLD Spa & Clinic
                    </span>
                  </div>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Phân công chuyên viên, ấn định phòng trị liệu & vùng đệm chuẩn y khoa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateAppointment} className="overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Row 1: Khách hàng & Số điện thoại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#2C241E]">
                      Họ và tên khách hàng <span className="text-[#985018]">*</span>
                    </label>
                    {selectedCustomerId && (
                      <span className="text-[10px] text-[#1B6E44] bg-[#E7F4EE] px-2 py-0.5 rounded-full font-bold">
                        Đã khớp hồ sơ
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={custName}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onChange={(e) => {
                        setCustName(e.target.value);
                        setSelectedCustomerId('');
                        setShowCustomerDropdown(true);
                      }}
                      placeholder="Nhập tên hoặc tìm khách hàng..."
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>

                  {/* Customer Autocomplete Dropdown */}
                  {showCustomerDropdown && custName.trim().length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-[#E8DFD8] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {customers
                        .filter((c) =>
                          matchSearch([c.fullName, c.phone, c.referralCode || ''], custName)
                        )
                        .slice(0, 5)
                        .map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCustName(c.fullName);
                              setCustPhone(c.phone || '');
                              setSelectedCustomerId(c.id);
                              setShowCustomerDropdown(false);
                            }}
                            className="p-2.5 hover:bg-[#FAF0E4] cursor-pointer flex items-center justify-between border-b border-[#F4ECE3] last:border-b-0 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#F3E2CE] text-[#985018] font-bold text-xs flex items-center justify-center shrink-0">
                                {c.fullName.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-[#2C241E]">{c.fullName}</div>
                                <div className="text-[10px] text-[#73675F]">{c.phone}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#985018] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8DFD8]">
                              {c.membershipTier || 'STANDARD'}
                            </span>
                          </div>
                        ))}
                      <div
                        onClick={() => setShowCustomerDropdown(false)}
                        className="p-2 text-center text-[11px] text-[#73675F] hover:bg-[#F8F5F2] cursor-pointer font-medium bg-[#FAF8F5]"
                      >
                        Đóng gợi ý (Dùng tên vừa nhập)
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Số điện thoại liên hệ
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="Ví dụ: 0908 123 456"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Chi nhánh & Dịch vụ trị liệu thực tế */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Chi nhánh cơ sở <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={modalBranchId}
                      onChange={(e) => setModalBranchId(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] font-medium focus:outline-none focus:border-[#985018] appearance-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Chọn dịch vụ trị liệu <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <Sparkles className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] font-medium focus:outline-none focus:border-[#985018] appearance-none cursor-pointer"
                    >
                      {services.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} — {srv.durationMinutes} phút ({srv.price.toLocaleString('vi-VN')}đ)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Row 3: Chọn Chuyên viên kỹ thuật */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Kỹ thuật viên & Phòng phân bổ <span className="text-[#985018]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {branchTechnicians.map((tech) => {
                    const isSelected = selectedTechId === tech.id;
                    return (
                      <div
                        key={tech.id}
                        onClick={() => setSelectedTechId(tech.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#FAF0E4] border-[#985018] ring-1 ring-[#985018]'
                            : 'bg-white border-[#E8DFD8] hover:border-[#D7BBA6]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2C241E]">{tech.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#985018]" />}
                        </div>
                        <div className="text-[11px] text-[#73675F] mt-1">{tech.room}</div>
                        <div className="text-[10px] text-[#985018] font-medium mt-0.5 truncate">{tech.role}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Ngày hẹn & Khung giờ phục vụ */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#2C241E]">
                    Ngày hẹn & Khung giờ phục vụ <span className="text-[#985018]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={appDate}
                      onChange={(e) => setAppDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] font-medium focus:outline-none focus:border-[#985018]"
                    />
                    <button
                      type="button"
                      onClick={() => setAppDate(new Date().toISOString().split('T')[0])}
                      className="px-2.5 py-1.5 bg-[#FAF0E4] text-[#985018] rounded-lg text-[11px] font-bold hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppDate('2026-10-16')}
                      className="px-2.5 py-1.5 bg-[#FAF0E4] text-[#985018] rounded-lg text-[11px] font-bold hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                    >
                      16/10
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppDate('2026-10-17')}
                      className="px-2.5 py-1.5 bg-[#FAF0E4] text-[#985018] rounded-lg text-[11px] font-bold hover:bg-[#F3E2CE] transition-colors cursor-pointer"
                    >
                      17/10
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1.5 border border-[#E8DFD8] rounded-xl bg-[#FAF8F5]">
                  {TIME_SLOT_OPTIONS.map((slot, idx) => {
                    const isSelected = selectedSlotIndex === idx;
                    return (
                      <button
                        type="button"
                        key={slot.label}
                        onClick={() => setSelectedSlotIndex(idx)}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#985018] text-white shadow-xs'
                            : 'bg-white text-[#2C241E] border border-[#E8DFD8] hover:border-[#985018]'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Trạng thái & Tiền cọc */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Trạng thái lịch hẹn
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setStatusType('independent')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      statusType === 'independent'
                        ? 'bg-[#E7F4EE] border-[#1B6E44] ring-1 ring-[#1B6E44]'
                        : 'bg-white border-[#E8DFD8]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#1B6E44]" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-[#2C241E]">Lịch chuẩn</div>
                      <div className="text-[10px] text-[#73675F]">Đã xác nhận & thanh toán cọc</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setStatusType('waiting_payment')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      statusType === 'waiting_payment'
                        ? 'bg-[#FAF0E4] border-[#985018] ring-1 ring-[#985018]'
                        : 'bg-white border-[#E8DFD8]'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-[#8A4F23]" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-[#2C241E]">Chờ thanh toán cọc</div>
                      <div className="text-[10px] text-[#73675F]">Giữ chỗ tạm thời 15p</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Ghi chú điều phối & Yêu cầu của khách
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Khách da nhạy cảm, lần đầu làm dịch vụ, cần chuẩn bị tinh dầu sả chanh..."
                  className="w-full p-3 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] resize-none"
                />
              </div>

              {/* Summary Card Box */}
              {(() => {
                const srv = services.find((s) => s.id === selectedServiceId) || services[0] || {
                  name: 'Chăm sóc Da Mặt Chuyên Sâu Hydro-Care',
                  price: 650000,
                  durationMinutes: 75,
                };
                const tech = branchTechnicians.find((t) => t.id === selectedTechId) || branchTechnicians[0];
                const slot = TIME_SLOT_OPTIONS[selectedSlotIndex] || TIME_SLOT_OPTIONS[0];
                const depositAmount = statusType === 'waiting_payment' ? 0 : 150000;
                const rem = Math.max(0, srv.price - depositAmount);
                const br = branches.find((b) => b.id === modalBranchId) || branches[0];

                return (
                  <div className="bg-[#FAF0E4] border border-[#E8DFD8] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#3E200C] border-b border-[#E8DFD8]/80 pb-2">
                      <span>{srv.name}</span>
                      <span className="text-[#985018]">{srv.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#73675F] pt-1">
                      <div>
                        Chuyên viên: <span className="font-semibold text-[#2C241E]">{tech?.name || 'KTV'}</span>
                      </div>
                      <div>
                        Phòng: <span className="font-semibold text-[#2C241E]">{tech?.room || 'Phòng VIP'}</span>
                      </div>
                      <div>
                        Cơ sở: <span className="font-semibold text-[#2C241E]">{br?.name || 'MLD Spa'}</span>
                      </div>
                      <div>
                        Thời gian: <span className="font-semibold text-[#2C241E]">{slot.label} ({appDate})</span>
                      </div>
                      <div>
                        Tiền cọc giữ chỗ: <span className="font-bold text-[#8A4F23]">{depositAmount.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div>
                        Còn lại thanh toán: <span className="font-semibold text-[#2C241E]">{rem.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl bg-[#985018] hover:bg-[#854412] disabled:opacity-60 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu lịch hẹn...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác nhận tạo lịch hẹn</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Check-in Validation & Overdue Resolution Modal */}
      {validationModalApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#EFE4D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE4D9] pb-3">
              <div className="flex items-center gap-2 text-base font-extrabold text-[#3E200C]">
                {validationModalApp.checkResult.isOverdue ? (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span>Kiểm tra: Lịch hẹn đã quá hạn</span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <span>Kiểm tra thời gian khách đến</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setValidationModalApp(null)}
                className="p-1.5 rounded-full text-[#8C7A6B] hover:text-[#2C241E] hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-xs">
              {/* Customer Box */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] flex items-center gap-3">
                <img
                  src={validationModalApp.app.avatar || '/avatar_minh_anh.png'}
                  alt={validationModalApp.app.customer}
                  className="w-10 h-10 rounded-full object-cover border border-[#E0D7CC] shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatar_minh_anh.png';
                  }}
                />
                <div className="min-w-0">
                  <div className="font-bold text-[#2C241E] text-sm truncate">{validationModalApp.app.customer}</div>
                  <div className="text-[11px] text-[#73675F] truncate">
                    {validationModalApp.app.customerPhone} · {validationModalApp.app.customerCode}
                  </div>
                  <div className="text-[11px] font-semibold text-[#8A4F23] mt-0.5 truncate">
                    {validationModalApp.app.service}
                  </div>
                </div>
              </div>

              {/* Time Comparison Box */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${
                validationModalApp.checkResult.isOverdue
                  ? 'bg-[#FFF5F5] border-[#F5C2C7] text-[#991B1B]'
                  : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1]'
              }`}>
                <div className="flex items-center justify-between font-semibold">
                  <span>Thời gian đặt hẹn:</span>
                  <span className="font-extrabold">{validationModalApp.checkResult.scheduledTimeStr}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Thời điểm hiện tại:</span>
                  <span className="font-extrabold">
                    {new Intl.DateTimeFormat('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(new Date())}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-current/15 text-[11.5px] leading-relaxed">
                  {validationModalApp.checkResult.detail}
                </div>
              </div>

              {validationModalApp.checkResult.isOverdue && (
                <div className="text-[11px] text-[#73675F] leading-relaxed bg-[#FAF8F5] p-3 rounded-xl border border-[#EFE4D9]">
                  💡 <strong>Quy định vận hành:</strong> Không thể tiếp nhận ca dịch vụ cho lịch hẹn đã quá hạn. Vui lòng bấm <strong>Bỏ lịch hẹn</strong> để giải phóng kỹ thuật viên <strong>{validationModalApp.app.technicianName}</strong> và phòng <strong>{validationModalApp.app.resource}</strong>.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {validationModalApp.checkResult.isOverdue ? (
                <>
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleDropOverdueBooking(validationModalApp.app.id)}
                    className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isUpdatingStatus ? 'Đang bỏ lịch...' : 'Bỏ lịch hẹn quá hạn ngay (Hủy & Giải phóng)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cust = customers.find(
                        (c) => c.fullName === validationModalApp.app.customer || c.phone === validationModalApp.app.customerPhone
                      );
                      const appToSave = validationModalApp.app;
                      setValidationModalApp(null);
                      if (cust) {
                        setSelectedCustomerId(cust.id);
                        setCustName(cust.fullName);
                        setCustPhone(cust.phone || '');
                      } else {
                        setCustName(appToSave.customer);
                        setCustPhone(appToSave.customerPhone || '');
                      }
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      setAppDate(todayStr);
                      setShowCreateModal(true);
                    }}
                    className="w-full py-2 bg-white hover:bg-[#FAF8F5] border border-[#D7BBA6] text-[#8A4F23] font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Đặt lịch hẹn mới hôm nay cho khách</span>
                  </button>
                </>
              ) : validationModalApp.checkResult.isEarlyDate ? (
                <>
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => {
                      handleUpdateBookingStatus(validationModalApp.app.id, BookingStatus.IN_SERVICE);
                      setValidationModalApp(null);
                    }}
                    className="w-full py-2.5 bg-[#0D6832] hover:bg-[#0A5428] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Xác nhận tiếp nhận phục vụ sớm hôm nay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationModalApp(null)}
                    className="w-full py-2 bg-white hover:bg-[#FAF8F5] border border-[#E8DFD8] text-[#73675F] font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Giữ nguyên ngày hẹn ({validationModalApp.app.date})
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
