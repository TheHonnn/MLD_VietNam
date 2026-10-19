import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ChevronDown,
  Info,
} from 'lucide-react';
import { staffService, bookingService, branchService, StaffWithProfile } from '../services';
import { toast } from '../components/common';
import { Booking, Branch } from '../types/shared_types';

interface ScheduleAppointment {
  id: string;
  technicianId: 'tech-1' | 'tech-2' | 'tech-3';
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

export const W05_StaffSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers] = useState<StaffWithProfile[]>([]);
  const [liveBookings, setLiveBookings] = useState<Booking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        const [stfRes, bkRes, brRes] = await Promise.all([
          staffService.getStaffList(),
          bookingService.getBookings(),
          branchService.getAllBranches(),
        ]);
        if (stfRes.success) setStaffMembers(stfRes.data);
        if (bkRes.success) setLiveBookings(bkRes.data);
        if (brRes.success) setBranches(brRes.data);
      } catch (err) {
        console.error('Failed to load schedule data:', err);
      }
    };
    fetchScheduleData();
  }, []);
  // Appointments list matching the Figma mockup 100%
  const appointments: ScheduleAppointment[] = [
    {
      id: 'app-huy',
      technicianId: 'tech-1',
      title: 'Massage · Đặng Quốc Huy',
      subtitle: '09:30–10:30 · Lịch chuẩn',
      customer: 'Đặng Quốc Huy',
      customerCode: 'WM-000104 · BK-20261016-001',
      service: 'Massage trị liệu cổ vai gáy',
      timeRange: '09:30–10:30',
      date: '12/10/2026',
      technicianName: 'Trần Lan Anh',
      resource: 'Phòng 01 · Quận 3',
      durationText: 'Dịch vụ 60 phút',
      price: '450.000đ',
      deposit: '150.000đ',
      remaining: '300.000đ',
      status: 'Lịch chuẩn',
      statusType: 'independent',
      bufferTitle: 'Giữ nguồn lực đến 10:45',
      bufferDesc: 'Vùng đệm vệ sinh: 10:30–10:45. Khoản cọc chưa thu, đang theo dõi thực hiện.',
      startHour: 9.5,
      durationHours: 1.0,
    },
    {
      id: 'app-minh-anh',
      technicianId: 'tech-1',
      title: 'Massage · Nguyễn Mỹ Duyên',
      subtitle: '14:00–15:00 · Chờ thanh toán',
      customer: 'Nguyễn Mỹ Duyên',
      customerCode: 'MLD-VIP-01 · BK-20261016-003',
      avatar: '/avatar_minh_anh.png',
      service: 'Massage thư giãn toàn thân',
      timeRange: '14:00–15:00',
      date: '12/10/2026',
      technicianName: 'Trần Lan Anh',
      resource: 'Phòng 01 · Quận 3',
      durationText: 'Dịch vụ 60 phút',
      price: '450.000đ',
      deposit: '150.000đ',
      remaining: '300.000đ',
      status: 'Chờ thanh toán',
      statusType: 'waiting_payment',
      bufferTitle: 'Giữ nguồn lực đến 15:15',
      bufferDesc: 'Vùng đệm vệ sinh: 15:00–15:15. Khoản cọc chưa thu, đang theo dõi thực hiện.',
      startHour: 14.0,
      durationHours: 1.0,
      hasCleaningBuffer: true,
      cleaningText: '15:00–15:15 · Vệ sinh / giữ phòng',
    },
    {
      id: 'app-linh',
      technicianId: 'tech-2',
      title: 'Chăm sóc da · Trần Ngọc Linh',
      subtitle: '10:00–11:00 · Lịch chuẩn',
      customer: 'Trần Ngọc Linh',
      customerCode: 'WM-000115 · BK-20261016-002',
      service: 'Chăm sóc da chuyên sâu Hydrafacial',
      timeRange: '10:00–11:00',
      date: '12/10/2026',
      technicianName: 'Nguyễn Thu Hà',
      resource: 'Phòng 02 · Quận 3',
      durationText: 'Dịch vụ 60 phút',
      price: '500.000đ',
      deposit: '150.000đ',
      remaining: '350.000đ',
      status: 'Lịch chuẩn',
      statusType: 'independent',
      bufferTitle: 'Giữ nguồn lực đến 11:15',
      bufferDesc: 'Vùng đệm vệ sinh: 11:00–11:15. Khoản cọc chưa thu, đang theo dõi thực hiện.',
      startHour: 10.0,
      durationHours: 1.0,
    },
    {
      id: 'app-ngoc',
      technicianId: 'tech-2',
      title: 'Chăm sóc da · Lê Bảo Ngọc',
      subtitle: '13:30–14:30 · Lịch chuẩn',
      customer: 'Lê Bảo Ngọc',
      customerCode: 'WM-000130 · BK-20261016-005',
      service: 'Trẻ hóa da điện di Vitamin C',
      timeRange: '13:30–14:30',
      date: '12/10/2026',
      technicianName: 'Nguyễn Thu Hà',
      resource: 'Phòng 02 · Quận 3',
      durationText: 'Dịch vụ 60 phút',
      price: '480.000đ',
      deposit: '150.000đ',
      remaining: '330.000đ',
      status: 'Lịch chuẩn',
      statusType: 'independent',
      bufferTitle: 'Giữ nguồn lực đến 14:45',
      bufferDesc: 'Vùng đệm vệ sinh: 14:30–14:45 (gồm 15 phút vệ sinh sau liệu trình).',
      startHour: 13.5,
      durationHours: 1.0,
    },
    {
      id: 'app-yen',
      technicianId: 'tech-3',
      title: 'Chăm sóc cơ thể · Võ Hải Yến',
      subtitle: '11:00–12:00 · Lịch chuẩn',
      customer: 'Võ Hải Yến',
      customerCode: 'WM-000122 · BK-20261016-006',
      service: 'Chăm sóc cơ thể thảo dược ấm',
      timeRange: '11:00–12:00',
      date: '12/10/2026',
      technicianName: 'Lê Hoài An',
      resource: 'Phòng 03 · Quận 3',
      durationText: 'Dịch vụ 60 phút',
      price: '520.000đ',
      deposit: '150.000đ',
      remaining: '370.000đ',
      status: 'Lịch chuẩn',
      statusType: 'independent',
      bufferTitle: 'Giữ nguồn lực đến 12:15',
      bufferDesc: 'Vùng đệm vệ sinh: 12:00–12:15. Khoản cọc chưa thu, đang theo dõi thực hiện.',
      startHour: 11.0,
      durationHours: 1.0,
    },
  ];

  // Default active appointment is "Nguyễn Mỹ Duyên"
  const [selectedAppId, setSelectedAppId] = useState<string>('app-minh-anh');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedApp =
    appointments.find((a) => a.id === selectedAppId) || appointments[1];

  // Technicians config
  const technicians = [
    {
      id: 'tech-1' as const,
      name: 'Trần Lan Anh',
      room: 'Massage · Phòng 01',
    },
    {
      id: 'tech-2' as const,
      name: 'Nguyễn Thu Hà',
      room: 'Chăm sóc da · Phòng 02',
    },
    {
      id: 'tech-3' as const,
      name: 'Lê Hoài An',
      room: 'Cơ thể · Phòng 03',
    },
  ];

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
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Lịch kỹ thuật viên
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Thứ hai, 12/10/2026 · Quận 3 · Mở cửa 09:00–20:00
          </p>
        </div>
        <button
          onClick={() => toast.info('Tạo lịch hẹn', 'Đang mở bảng phân công ca trực và điều phối kỹ thuật viên.')}
          className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          Tạo lịch hẹn
        </button>
      </div>

      {/* 2. Filter Toolbar (White Card with 4 Controls) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3">
        {/* Search input */}
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm khách hàng hoặc mã lịch hẹn..."
            className="w-full px-4 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#8C7A6B] focus:outline-none focus:border-[#985018]"
          />
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
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
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
                const colAppointments = appointments.filter(
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

            {/* Status Banner */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F3E2CE] text-[#8A4F23] text-xs font-semibold">
              <Clock className="w-4 h-4 stroke-[2]" />
              <span>{selectedApp.status}</span>
            </div>

            {/* Resource Hold Alert Box */}
            <div className="bg-[#F3E2CE] rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-[#2C241E]">{selectedApp.bufferTitle}</div>
              <p className="text-xs text-[#50443D] leading-relaxed">
                {selectedApp.bufferDesc}
              </p>
            </div>

            {/* Cashier Invoice Action Button */}
            <button
              onClick={() => {
                toast.info('Chuyển hướng thu ngân', 'Đang mở màn hình thu ngân chi tiết...');
                navigate('/cashier-pos');
              }}
              className="w-full py-3 bg-white border border-[#D8BDA7] text-[#904206] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors text-center shadow-2xs cursor-pointer"
            >
              Xem đơn thu ngân
            </button>
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
    </div>
  );
};
