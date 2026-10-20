import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  ChevronDown,
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
} from 'lucide-react';
import { staffService, bookingService, branchService, notificationService, customerService, supabaseService, StaffWithProfile } from '../services';
import { toast } from '../components/common';
import { Booking, Branch, User, Technician, BookingStatus } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

interface ScheduleAppointment {
  id: string;
  technicianId: string;
  title: string;
  subtitle: string;
  customer: string;
  customerCode: string;
  avatar?: string;
  service: string;
  timeRange: string;
  date: string;
  technicianName: string;
  resource: string;
  durationText: string;
  price: string;
  deposit: string;
  remaining: string;
  status: string;
  statusType: 'waiting_payment' | 'independent';
  bufferTitle: string;
  bufferDesc: string;
  startHour: number;     // e.g. 9.5 for 09:30
  durationHours: number; // e.g. 1.0 for 60 mins
  hasCleaningBuffer?: boolean;
  cleaningText?: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  shortName: string;
  category: string;
  defaultTech: string;
  durationMinutes: number;
  durationHours: number;
  price: number;
  deposit: number;
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'srv-1',
    name: 'Massage trị liệu cổ vai gáy',
    shortName: 'Massage Cổ Vai Gáy',
    category: 'Massage',
    defaultTech: 'tech-1',
    durationMinutes: 60,
    durationHours: 1.0,
    price: 450000,
    deposit: 150000,
  },
  {
    id: 'srv-2',
    name: 'Massage thư giãn toàn thân',
    shortName: 'Massage Body',
    category: 'Massage',
    defaultTech: 'tech-1',
    durationMinutes: 60,
    durationHours: 1.0,
    price: 450000,
    deposit: 150000,
  },
  {
    id: 'srv-3',
    name: 'Chăm sóc da chuyên sâu Hydrafacial',
    shortName: 'Hydrafacial Da',
    category: 'Chăm sóc da',
    defaultTech: 'tech-2',
    durationMinutes: 60,
    durationHours: 1.0,
    price: 500000,
    deposit: 150000,
  },
  {
    id: 'srv-4',
    name: 'Trẻ hóa da điện di Vitamin C',
    shortName: 'Điện Di Vitamin C',
    category: 'Chăm sóc da',
    defaultTech: 'tech-2',
    durationMinutes: 60,
    durationHours: 1.0,
    price: 480000,
    deposit: 150000,
  },
  {
    id: 'srv-5',
    name: 'Chăm sóc cơ thể thảo dược ấm',
    shortName: 'Body Thảo Dược',
    category: 'Cơ thể',
    defaultTech: 'tech-3',
    durationMinutes: 60,
    durationHours: 1.0,
    price: 520000,
    deposit: 150000,
  },
  {
    id: 'srv-6',
    name: 'Gội đầu dưỡng sinh thảo dược Trung Hoa',
    shortName: 'Gội Đầu Dưỡng Sinh',
    category: 'Massage',
    defaultTech: 'tech-1',
    durationMinutes: 60,
    durationHours: 1.0,
    price: 350000,
    deposit: 100000,
  },
  {
    id: 'srv-7',
    name: 'Liệu trình phục hồi da Bio-Light',
    shortName: 'Phục Hồi Bio-Light',
    category: 'Chăm sóc da',
    defaultTech: 'tech-2',
    durationMinutes: 90,
    durationHours: 1.5,
    price: 750000,
    deposit: 200000,
  },
];

export const TIME_SLOT_OPTIONS = [
  { label: '09:30–10:30', startHour: 9.5, durationHours: 1.0, bufferTimeRange: '10:30–10:45', bufferEndTime: '10:45' },
  { label: '10:00–11:00', startHour: 10.0, durationHours: 1.0, bufferTimeRange: '11:00–11:15', bufferEndTime: '11:15' },
  { label: '11:00–12:00', startHour: 11.0, durationHours: 1.0, bufferTimeRange: '12:00–12:15', bufferEndTime: '12:15' },
  { label: '13:30–14:30', startHour: 13.5, durationHours: 1.0, bufferTimeRange: '14:30–14:45', bufferEndTime: '14:45' },
  { label: '14:00–15:00', startHour: 14.0, durationHours: 1.0, bufferTimeRange: '15:00–15:15', bufferEndTime: '15:15' },
  { label: '15:00–16:00', startHour: 15.0, durationHours: 1.0, bufferTimeRange: '16:00–16:15', bufferEndTime: '16:15' },
  { label: '15:30–16:30', startHour: 15.5, durationHours: 1.0, bufferTimeRange: '16:30–16:45', bufferEndTime: '16:45' },
  { label: '16:00–17:00', startHour: 16.0, durationHours: 1.0, bufferTimeRange: '17:00–17:15', bufferEndTime: '17:15' },
  { label: '16:30–17:30', startHour: 16.5, durationHours: 1.0, bufferTimeRange: '17:30–17:45', bufferEndTime: '17:45' },
  { label: '17:00–18:00', startHour: 17.0, durationHours: 1.0, bufferTimeRange: '18:00–18:15', bufferEndTime: '18:15' },
  { label: '17:30–18:30', startHour: 17.5, durationHours: 1.0, bufferTimeRange: '18:30–18:45', bufferEndTime: '18:45' },
  { label: '18:00–19:00', startHour: 18.0, durationHours: 1.0, bufferTimeRange: '19:00–19:15', bufferEndTime: '19:15' },
];

export const W05_StaffSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [liveTechnicians, setLiveTechnicians] = useState<Technician[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return searchParams.get('branchId') || localStorage.getItem('mld_selected_branch_id') || 'ALL';
  });

  // Listen to searchParams and global branch changes
  useEffect(() => {
    const p = searchParams.get('branchId');
    if (p) setSelectedBranchId(p);
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

  const activeBranch = branches.find((b) => b.id === selectedBranchId);

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const [bkRes, techRes, custRes, brRes] = await Promise.all([
          bookingService.getBookings(),
          supabaseService.getTechnicians(),
          customerService.getCustomers(),
          branchService.getAllBranches(),
        ]);
        if (bkRes.success) setLiveBookings(bkRes.data);
        if (techRes) setLiveTechnicians(techRes);
        if (custRes.success) setCustomers(custRes.data);
        if (brRes.success) setBranches(brRes.data);
      } catch (err) {
        console.error('Failed to load schedule data:', err);
      }
    };
    fetchScheduleData();
  }, []);

  const technicians = useMemo(() => {
    if (liveTechnicians && liveTechnicians.length > 0) {
      return liveTechnicians.slice(0, 4).map((t, idx) => ({
        id: t.id,
        name: t.fullName,
        room: `${t.title?.split('&')[0]?.trim() || 'Trị liệu'} · Phòng 0${idx + 1}`,
        role: t.title,
      }));
    }
    return [];
  }, [liveTechnicians]);

  // Appointments mapped directly from live Supabase bookings
  const appointments: ScheduleAppointment[] = useMemo(() => {
    if (!liveBookings || liveBookings.length === 0) return [];

    const custMap = new Map(customers.map((c) => [c.id, c]));
    const techMap = new Map((liveTechnicians || []).map((t) => [t.id, t]));

    const filteredLive =
      selectedBranchId !== 'ALL'
        ? liveBookings.filter((b) => !b.branchId || b.branchId === selectedBranchId)
        : liveBookings;

    return filteredLive.map((b) => {
      const cust = custMap.get(b.customerId);
      const tech = techMap.get(b.technicianId || '');

      const [sH, sM] = (b.startTime || '09:00').split(':').map(Number);
      const [eH, eM] = (b.endTime || '10:00').split(':').map(Number);
      const startHour = (isNaN(sH) ? 9 : sH) + (isNaN(sM) ? 0 : sM) / 60;
      const endHour = (isNaN(eH) ? 10 : eH) + (isNaN(eM) ? 0 : eM) / 60;
      const durationHours = Math.max(0.75, endHour - startHour);

      const customerName = cust?.fullName || b.bookedForName || 'Khách hàng';
      const techName = tech?.fullName || 'Kỹ thuật viên';
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

      const statusType: 'waiting_payment' | 'independent' =
        b.paymentStatus === 'UNPAID' ? 'waiting_payment' : 'independent';

      const srvName = b.specialNotes || 'Chăm sóc da & Trị liệu';
      const dateParts = b.bookingDate ? b.bookingDate.split('-') : [];
      const dateDisplay = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : '12/10/2026';
      const timeRange = `${(b.startTime || '').slice(0, 5)}–${(b.endTime || '').slice(0, 5)}`;

      return {
        id: b.id,
        technicianId: b.technicianId || '',
        title: `${srvName.split(' ')[0]} · ${customerName}`,
        subtitle: `${timeRange} · ${statusLabel}`,
        customer: customerName,
        customerCode: `${cust?.referralCode || 'KH'} · ${b.bookingCode}`,
        avatar: cust?.avatarUrl || undefined,
        service: srvName,
        timeRange,
        date: dateDisplay,
        technicianName: techName,
        resource: b.assignedBedNumber || 'Phòng VIP · Quận 3',
        durationText: `Dịch vụ ${Math.round(durationHours * 60)} phút`,
        price: `${(b.finalPrice || b.baseTotal || 500000).toLocaleString('vi-VN')}đ`,
        deposit: `${(b.discountAmount || 150000).toLocaleString('vi-VN')}đ`,
        remaining: `${Math.max(0, (b.finalPrice || 0) - (b.discountAmount || 0)).toLocaleString('vi-VN')}đ`,
        status: statusLabel,
        statusType,
        bufferTitle: `Giữ nguồn lực đến ${(b.endTime || '').slice(0, 5)}`,
        bufferDesc: `Vùng đệm vệ sinh 15 phút sau liệu trình. ${
          statusType === 'waiting_payment'
            ? 'Khoản phí chưa thu, đang theo dõi thực hiện.'
            : 'Đã thanh toán đầy đủ.'
        }`,
        startHour,
        durationHours,
        hasCleaningBuffer: true,
        cleaningText: `${(b.endTime || '').slice(0, 5)} · Vệ sinh / giữ phòng`,
      };
    });
  }, [liveBookings, customers, liveTechnicians, selectedBranchId]);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Custom appointments stored in localStorage
  const [customAppointments, setCustomAppointments] = useState<ScheduleAppointment[]>(() => {
    try {
      const saved = localStorage.getItem('mld_staff_appointments');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to parse saved appointments', err);
    }
    return [];
  });

  // Modal Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(SERVICE_OPTIONS[0].id);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [appDate] = useState('12/10/2026');
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(5); // default 15:00–16:00
  const [statusType, setStatusType] = useState<'waiting_payment' | 'independent'>('waiting_payment');
  const [notes, setNotes] = useState('');

  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (technicians.length > 0 && (!selectedTechId || !technicians.some((t) => t.id === selectedTechId))) {
      setSelectedTechId(technicians[0].id);
    }
  }, [technicians, selectedTechId]);

  // Auto trigger modal if navigated with query params ?create=true&customer=...
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
      const c = searchParams.get('customer');
      if (c) {
        setCustName(c);
      }
    }
  }, [searchParams]);

  const allAppointments = [...customAppointments, ...appointments];

  // Handle ?booking=... query parameter from notification navigation
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
        if (found.technicianId) {
          setSelectedTechId(found.technicianId);
        }
      }
    }
  }, [searchParams, allAppointments]);

  const displayedAppointments = allAppointments.filter((app) => {
    if (!searchTerm.trim()) return true;
    return matchSearch(
      [app.customer, app.customerCode, app.service, app.technicianName, app.resource, app.status],
      searchTerm
    );
  });

  useEffect(() => {
    if (allAppointments.length > 0 && (!selectedAppId || !allAppointments.some((a) => a.id === selectedAppId))) {
      setSelectedAppId(allAppointments[0].id);
    }
  }, [allAppointments, selectedAppId]);

  const selectedApp: ScheduleAppointment =
    allAppointments.find((a) => a.id === selectedAppId) ||
    allAppointments[0] || {
      id: '',
      technicianId: '',
      title: 'Chưa chọn lịch hẹn',
      subtitle: 'Chọn lịch hẹn từ bảng để xem chi tiết',
      customer: 'Khách hàng',
      customerCode: 'Mã lịch hẹn',
      avatar: '/avatar_minh_anh.png',
      service: 'Dịch vụ trị liệu',
      timeRange: '--:--',
      date: 'Hôm nay',
      technicianName: 'Kỹ thuật viên',
      resource: 'Phòng VIP',
      durationText: 'Thời lượng --',
      price: '0đ',
      deposit: '0đ',
      remaining: '0đ',
      status: 'Chờ phân công',
      statusType: 'waiting_payment',
      bufferTitle: 'Vùng đệm bảo lưu',
      bufferDesc: 'Thông tin vùng đệm vệ sinh phòng.',
      startHour: 9,
      durationHours: 1,
    };

  // Auto select default technician when service changed
  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id);
    const found = SERVICE_OPTIONS.find((s) => s.id === id);
    if (found) {
      setSelectedTechId(found.defaultTech);
    }
  };

  // Create new appointment
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ và tên khách hàng.');
      return;
    }

    const srv = SERVICE_OPTIONS.find((s) => s.id === selectedServiceId) || SERVICE_OPTIONS[0];
    const tech = technicians.find((t) => t.id === selectedTechId) || technicians[0];
    const slot = TIME_SLOT_OPTIONS[selectedSlotIndex] || TIME_SLOT_OPTIONS[0];
    const remainingNum = srv.price - srv.deposit;

    const newApp: ScheduleAppointment = {
      id: `app-custom-${Date.now()}`,
      technicianId: tech.id,
      title: `${srv.category} · ${custName.trim()}`,
      subtitle: `${slot.label} · ${statusType === 'waiting_payment' ? 'Chờ thanh toán' : 'Lịch chuẩn'}`,
      customer: custName.trim(),
      customerCode: `WM-${Math.floor(100000 + Math.random() * 900000)} · BK-${Date.now().toString().slice(-6)}`,
      avatar: '/avatar_minh_anh.png',
      service: srv.name,
      timeRange: slot.label,
      date: appDate,
      technicianName: tech.name,
      resource: `${tech.room.split('·')[1]?.trim() || tech.room} · Quận 3`,
      durationText: `Dịch vụ ${srv.durationMinutes} phút`,
      price: `${srv.price.toLocaleString('vi-VN')}đ`,
      deposit: `${srv.deposit.toLocaleString('vi-VN')}đ`,
      remaining: `${remainingNum.toLocaleString('vi-VN')}đ`,
      status: statusType === 'waiting_payment' ? 'Chờ thanh toán' : 'Lịch chuẩn',
      statusType: statusType,
      bufferTitle: `Giữ nguồn lực đến ${slot.bufferEndTime}`,
      bufferDesc: `Vùng đệm vệ sinh: ${slot.bufferTimeRange}. ${
        statusType === 'waiting_payment'
          ? 'Khoản cọc chưa thu, đang theo dõi thực hiện.'
          : 'Đã thanh toán cọc giữ chỗ.'
      } ${notes ? `Ghi chú: ${notes}` : ''}`,
      startHour: slot.startHour,
      durationHours: slot.durationHours,
      hasCleaningBuffer: true,
      cleaningText: `${slot.bufferTimeRange} · Vệ sinh / giữ phòng`,
    };

    const updated = [newApp, ...customAppointments];
    setCustomAppointments(updated);
    try {
      localStorage.setItem('mld_staff_appointments', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save appointment to localStorage:', err);
    }

    setSelectedAppId(newApp.id);
    setShowCreateModal(false);

    // Send system notification
    notificationService.addNotification({
      title: 'Lịch hẹn mới được tạo',
      message: `Khách hàng ${newApp.customer} đã đặt lịch "${newApp.service}" lúc ${newApp.timeRange} với KTV ${newApp.technicianName}.`,
      type: 'BOOKING',
      link: '/staff-schedule',
    });

    toast.success(
      'Tạo lịch hẹn thành công',
      `Đã lên lịch hẹn cho khách hàng ${newApp.customer} lúc ${newApp.timeRange} (${newApp.technicianName}).`
    );

    if (searchParams.get('create')) {
      setSearchParams({});
    }
  };

  // Delete custom appointment
  const handleDeleteCustomAppointment = (id: string) => {
    const updated = customAppointments.filter((a) => a.id !== id);
    setCustomAppointments(updated);
    try {
      localStorage.setItem('mld_staff_appointments', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update localStorage', err);
    }
    setSelectedAppId('app-minh-anh');
    toast.success('Đã hủy lịch hẹn', 'Lịch hẹn đã được gỡ bỏ khỏi bảng phân công ca trực.');
  };

  // Update real Supabase booking status according to FSM workflow
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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

  // Exactly calibrated row height: 58px per hour
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
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Thứ hai, 12/10/2026 · {activeBranch ? `${activeBranch.name} · ${activeBranch.district}, ${activeBranch.city}` : 'Toàn hệ thống chi nhánh'} · Mở cửa {activeBranch?.openingTime ? activeBranch.openingTime.slice(0, 5) : '08:30'}–{activeBranch?.closingTime ? activeBranch.closingTime.slice(0, 5) : '20:30'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Tạo lịch hẹn
        </button>
      </div>

      {/* 2. Filter Toolbar (White Card with 5 Controls) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3">
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

        {/* Date dropdown */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>12/10/2026 · Ngày</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Technician / Room dropdown */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Kỹ thuật viên / Phòng</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Status dropdown */}
        <button className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white text-xs font-medium text-[#2C241E] hover:bg-[#FAF8F5] transition-colors shrink-0">
          <span>Tất cả trạng thái</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>
      </div>

      {/* 3. Main Content: Schedule Timetable Matrix (Left) + Detail Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Matrix + Legend) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-x-auto shadow-xs">
            <div className="min-w-[620px] sm:min-w-[680px]">
              {/* Timetable Header Row */}
              <div className="flex border-b border-[#EFE4D9] bg-[#F3E2CE]">
                {/* Corner spacer */}
                <div className="w-16 sm:w-20 shrink-0 border-r border-[#EFE4D9]" />

              {/* Technician Headers */}
              {technicians.map((t, idx) => (
                <div
                  key={t.id}
                  className={`flex-1 px-4 py-3 ${
                    idx < technicians.length - 1 ? 'border-r border-[#EFE4D9]' : ''
                  }`}
                >
                  <div className="text-[13px] font-bold text-[#2C241E]">{t.name}</div>
                  <div className="text-[11px] text-[#73675F] mt-0.5">{t.room}</div>
                </div>
              ))}
            </div>

            {/* Timetable Body (Rows + Absolute Appointment Layers) */}
            <div className="relative flex">
              {/* Left Column: Time Labels */}
              <div className="w-16 sm:w-20 shrink-0 border-r border-[#EFE4D9] select-none bg-white">
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

              {/* Technician Columns */}
              {technicians.map((t, colIdx) => {
                const colAppointments = displayedAppointments.filter(
                  (a) => a.technicianId === t.id
                );

                return (
                  <div
                    key={t.id}
                    className={`flex-1 relative ${
                      colIdx < technicians.length - 1 ? 'border-r border-[#EFE4D9]' : ''
                    }`}
                  >
                    {/* Background Grid Lines */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: `${ROW_HEIGHT}px` }}
                        className="border-b border-[#F0E6DC]"
                      />
                    ))}

                    {/* Shared Lunch Break Block: 12:00 to 13:00 */}
                    <div
                      style={{
                        top: `${(12 - 9) * ROW_HEIGHT + 3}px`,
                        height: `${ROW_HEIGHT - 6}px`,
                      }}
                      className="absolute inset-x-2 rounded-xl bg-[#F6EFE8] flex items-center justify-center text-center p-1 select-none pointer-events-none"
                    >
                      <span className="text-[11px] text-[#73675F]">
                        12:00–13:00 · Nghỉ trưa
                      </span>
                    </div>

                    {/* Dynamic Appointment Cards for this column */}
                    {colAppointments.map((app) => {
                      const topOffset = (app.startHour - 9) * ROW_HEIGHT;
                      const blockHeight = app.durationHours * ROW_HEIGHT;
                      const isSelected = selectedAppId === app.id;

                      return (
                        <div key={app.id}>
                          {/* Main Appointment Card */}
                          <div
                            onClick={() => setSelectedAppId(app.id)}
                            style={{
                              top: `${topOffset}px`,
                              height: `${blockHeight}px`,
                            }}
                            className={`absolute inset-x-2 p-2.5 text-left cursor-pointer transition-all duration-150 z-10 flex flex-col justify-center ${
                              app.hasCleaningBuffer ? 'rounded-t-xl' : 'rounded-xl'
                            } ${
                              isSelected
                                ? 'bg-[#FAF0E4] border-2 border-[#985018] shadow-xs'
                                : 'bg-[#FDF6EE] border border-[#D7BBA6] hover:border-[#985018] hover:shadow-2xs'
                            }`}
                          >
                            <div className="text-[11.5px] font-bold text-[#2C241E] truncate leading-tight">
                              {app.title}
                            </div>
                            <div className="text-[10.5px] text-[#73675F] truncate mt-1">
                              {app.subtitle}
                            </div>
                          </div>

                          {/* Attached buffer cleaning strip if applicable */}
                          {app.hasCleaningBuffer && (
                            <div
                              style={{
                                top: `${topOffset + blockHeight}px`,
                                height: '20px',
                              }}
                              className="absolute inset-x-2 rounded-b-md bg-[#DEC6B0] border-x border-b border-[#CDB59E] px-2.5 flex items-center text-[10px] font-medium text-[#4A3E34] truncate z-10"
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

          {/* Legend Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="px-3 py-1 bg-[#FDF6EE] border border-[#D7BBA6] rounded-lg text-xs font-medium text-[#8A4F23]">
              Lịch tiêu chuẩn
            </span>
            <span className="px-3 py-1 bg-[#F5E9DB] rounded-lg text-xs font-medium text-[#8A4F23]">
              Giữ chỗ tạm thời
            </span>
            <span className="px-3 py-1 bg-[#EBDCCE] rounded-lg text-xs font-medium text-[#73675F]">
              Nghỉ / vệ sinh
            </span>
          </div>
        </div>

        {/* Right Column (Sidebar Cards) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Selected Appointment Details */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <div>
              <div className="text-[17px] font-extrabold text-[#3E200C]">Lịch đang chọn</div>
              <div className="mt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F5E9DB] text-[#8A4F23]">
                  Giữ chỗ tạm thời
                </span>
              </div>
            </div>

            {/* Customer profile snippet */}
            <div className="flex items-center gap-3 pt-0.5">
              <img
                src={selectedApp.avatar || '/avatar_minh_anh.png'}
                alt={selectedApp.customer}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EFE4D9]"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#2C241E] truncate">
                  {selectedApp.customer}
                </div>
                <div className="text-[11px] text-[#73675F] truncate mt-0.5">
                  {selectedApp.customerCode}
                </div>
              </div>
            </div>

            {/* Service Title */}
            <div className="text-[13.5px] font-bold text-[#2C241E] pt-1">
              {selectedApp.service}
            </div>

            {/* Details Table */}
            <div className="space-y-2 text-xs text-[#73675F] pt-1">
              <div className="flex items-center justify-between">
                <span>Thời gian</span>
                <span className="font-semibold text-[#2C241E]">{selectedApp.timeRange}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ngày</span>
                <span className="font-semibold text-[#2C241E]">{selectedApp.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kỹ thuật viên</span>
                <span className="font-semibold text-[#2C241E]">{selectedApp.technicianName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Nguồn lực</span>
                <span className="font-semibold text-[#2C241E]">{selectedApp.resource}</span>
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
                <span>Thanh toán sau</span>
                <span className="font-semibold text-[#2C241E]">{selectedApp.remaining}</span>
              </div>
            </div>

            {/* Status Banner with Dynamic Colors */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                selectedApp.status === 'Hoàn thành' || selectedApp.status === 'Đang thực hiện'
                  ? 'bg-[#E8F6ED] text-[#0D6832]'
                  : selectedApp.status === 'Đã hủy'
                  ? 'bg-[#FDF2F2] text-[#B02A37]'
                  : selectedApp.status === 'Đã xác nhận'
                  ? 'bg-[#EBF5FB] text-[#1B4F72]'
                  : 'bg-[#F3E2CE] text-[#8A4F23]'
              }`}
            >
              <Clock className="w-4 h-4 stroke-[2]" />
              <span>Trạng thái: {selectedApp.status}</span>
            </div>

            {/* Resource Hold Alert Box */}
            <div className="bg-[#F3E2CE] rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-[#2C241E]">{selectedApp.bufferTitle}</div>
              <p className="text-xs text-[#50443D] leading-relaxed">
                {selectedApp.bufferDesc}
              </p>
            </div>

            {/* Interactive FSM Booking Actions for Real Bookings */}
            {!selectedApp.id.startsWith('app-custom-') && selectedApp.id && (
              <div className="space-y-2 pt-1">
                {selectedApp.status === 'Chờ thanh toán' && (
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

                {selectedApp.status === 'Đã xác nhận' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateBookingStatus(selectedApp.id, BookingStatus.IN_SERVICE)}
                    className="w-full py-2.5 bg-[#0D6832] hover:bg-[#0A5428] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isUpdatingStatus ? 'Đang cập nhật...' : 'Khách đã đến & Bắt đầu'}</span>
                  </button>
                )}

                {selectedApp.status !== 'Hoàn thành' && selectedApp.status !== 'Đã hủy' && (
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
              </div>
            )}

            {/* Cashier Invoice Action Button */}
            <button
              onClick={() => {
                toast.info('Chuyển hướng thu ngân', 'Đang mở màn hình thu ngân chi tiết...');
                const bCode = selectedApp.customerCode?.split('·')[1]?.trim() || selectedApp.id;
                navigate(`/cashier-pos?booking=${encodeURIComponent(bCode)}`);
              }}
              className="w-full py-3 bg-white border border-[#D8BDA7] text-[#904206] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs cursor-pointer"
            >
              Xem đơn thu ngân POS
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

          {/* Card 2: Empty Slot Suggestions */}
          <div className="bg-[#F3E2CE] rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-[#5A280C]">Gợi ý khung trống</h3>
            <div className="space-y-2.5 text-xs text-[#50443D] leading-relaxed">
              <div>Lan Anh · Phòng 01: từ 15:15.</div>
              <div>Thu Hà · Phòng 02: từ 14:45 (gồm 15 phút vệ sinh sau liệu trình).</div>
              <div>Hoài An · Phòng 03: từ 13:00.</div>
            </div>
            <div className="text-xs text-[#73675F] pt-0.5">
              Khung giờ tự động tính theo thời lượng dịch vụ và vùng đệm.
            </div>
          </div>

          {/* Card 3: Scheduling Rules Note */}
          <div className="bg-[#F3E2CE] rounded-2xl p-5 space-y-2">
            <h3 className="text-base font-bold text-[#5A280C]">Quy tắc xếp lịch vận hành</h3>
            <p className="text-xs text-[#50443D] leading-relaxed">
              Không trùng kỹ thuật viên hoặc phòng; đúng chuyên môn, đủ thời lượng và vùng đệm chuẩn y khoa, không vượt quá giờ đóng cửa chi nhánh.
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
                onClick={() => {
                  setShowCreateModal(false);
                  if (searchParams.get('create')) setSearchParams({});
                }}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateAppointment} className="overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Row 1: Khách hàng & Số điện thoại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Họ và tên khách hàng <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Mỹ Duyên"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>
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

              {/* Row 2: Dịch vụ & Gói chăm sóc */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Chọn dịch vụ trị liệu <span className="text-[#985018]">*</span>
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceSelect(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] font-medium focus:outline-none focus:border-[#985018] appearance-none cursor-pointer"
                  >
                    {SERVICE_OPTIONS.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} — {srv.durationMinutes} phút ({srv.price.toLocaleString('vi-VN')}đ)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Row 3: Chọn Kỹ thuật viên & Phòng trị liệu */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Kỹ thuật viên & Phòng phân bổ <span className="text-[#985018]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {technicians.map((tech) => {
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
                        <div className="text-[10px] text-[#985018] font-medium mt-0.5">{tech.role}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Ngày & Khung giờ phục vụ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#2C241E]">
                    Khung giờ hẹn <span className="text-[#985018]">*</span>
                  </label>
                  <span className="text-[11px] text-[#73675F]">Ngày: {appDate}</span>
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
                      <div className="text-[10px] text-[#73675F]">Đã xác nhận ca trực</div>
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
                const srv = SERVICE_OPTIONS.find((s) => s.id === selectedServiceId) || SERVICE_OPTIONS[0];
                const tech = technicians.find((t) => t.id === selectedTechId) || technicians[0];
                const slot = TIME_SLOT_OPTIONS[selectedSlotIndex] || TIME_SLOT_OPTIONS[0];
                const rem = srv.price - srv.deposit;

                return (
                  <div className="bg-[#FAF0E4] border border-[#E8DFD8] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#3E200C] border-b border-[#E8DFD8]/80 pb-2">
                      <span>{srv.name}</span>
                      <span className="text-[#985018]">{srv.price.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#73675F] pt-1">
                      <div>
                        Chuyên viên: <span className="font-semibold text-[#2C241E]">{tech.name}</span>
                      </div>
                      <div>
                        Phòng: <span className="font-semibold text-[#2C241E]">{tech.room.split('·')[1]?.trim() || tech.room}</span>
                      </div>
                      <div>
                        Thời gian: <span className="font-semibold text-[#2C241E]">{slot.label}</span>
                      </div>
                      <div>
                        Tiền cọc giữ chỗ: <span className="font-bold text-[#8A4F23]">{srv.deposit.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div>
                        Còn lại thanh toán: <span className="font-semibold text-[#2C241E]">{rem.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div>
                        Vùng đệm vô trùng: <span className="font-semibold text-[#2C241E]">15 phút ({slot.bufferTimeRange})</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    if (searchParams.get('create')) setSearchParams({});
                  }}
                  className="px-5 py-2.5 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Xác nhận tạo lịch hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
