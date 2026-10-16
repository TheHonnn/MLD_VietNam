import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  PlayCircle,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { academyService } from '../services';
import { Course, CourseBatch } from '../types/shared_types';

interface PracticalSession {
  id: string;
  room: string;
  dateKey: string; // e.g. '2026-10-16'
  dateLabel: string; // '16/10/2026'
  subject: string;
  timeRange: string;
  instructorName: string;
  className: string;
  status: string;
  videoTopic: string;
  videoDuration: string;
  practiceDuration: string;
  prepTime: string;
  note: string;
}

interface TrainingClassRecord {
  id: string;
  courseTitle: string;
  classBatch: string;
  instructor: string;
  instructorRole?: string;
  branch: string;
  room: string;
  scheduleDays: string;
  timeSlot: string;
  startDateStatus: string;
  studentCount: string;
  status: 'active' | 'waiting' | 'upcoming';
  statusLabel: string;
}

const practicalSessionsData: PracticalSession[] = [
  {
    id: 'ps-mc',
    room: 'Phòng thực hành 01',
    dateKey: '2026-10-14',
    dateLabel: '14/10/2026',
    subject: 'Chăm sóc da',
    timeRange: '09:00–12:00',
    instructorName: 'Trần Minh Châu',
    className: 'CSD-0926 · Phòng 01',
    status: 'Chưa diễn ra',
    videoTopic: 'Thực hành kỹ thuật làm sạch & dưỡng da chuyên sâu',
    videoDuration: '15 phút',
    practiceDuration: '150 phút',
    prepTime: '08:45–09:00',
    note: 'Nhân sự được phân quyền đối chiếu chuyên cần sau buổi học; không có điểm danh QR thực tế.',
  },
  {
    id: 'ps-qb',
    room: 'Phòng thực hành 03',
    dateKey: '2026-10-15',
    dateLabel: '15/10/2026',
    subject: 'Chăm sóc cơ thể',
    timeRange: '09:00–12:00',
    instructorName: 'Lê Quốc Bảo',
    className: 'CTC-0926 · Phòng 03',
    status: 'Chưa diễn ra',
    videoTopic: 'Thực hành kỹ thuật bấm huyệt & đắp thảo dược ấm',
    videoDuration: '20 phút',
    practiceDuration: '145 phút',
    prepTime: '08:45–09:00',
    note: 'Nhân sự được phân quyền đối chiếu chuyên cần sau buổi học; không có điểm danh QR thực tế.',
  },
  {
    id: 'ps-th',
    room: 'Phòng thực hành 02',
    dateKey: '2026-10-16',
    dateLabel: '16/10/2026',
    subject: 'MCN-0926',
    timeRange: '13:00–17:00',
    instructorName: 'Nguyễn Thanh Hương',
    className: 'MCN-0926 · Phòng 02',
    status: 'Chưa diễn ra',
    videoTopic: 'Thực hành kỹ thuật massage cơ bản',
    videoDuration: '18 phút',
    practiceDuration: '120 phút',
    prepTime: '12:45–13:00',
    note: 'Nhân sự được phân quyền đối chiếu chuyên cần sau buổi học; không có điểm danh QR thực tế.',
  },
];

const trainingClasses: TrainingClassRecord[] = [
  {
    id: 'cls-1',
    courseTitle: 'Kỹ thuật Massage Chuyên Nghiệp',
    classBatch: 'MCN-0926 · Khóa hiện tại',
    instructor: 'Nguyễn Thanh Hương',
    branch: 'Quận 3',
    room: 'Thực hành 02',
    scheduleDays: 'Thứ 6 – 7 – CN · 13:00–17:00',
    timeSlot: 'Đang triển khai',
    startDateStatus: 'Đang triển khai',
    studentCount: '16/20',
    status: 'active',
    statusLabel: 'Đang học',
  },
  {
    id: 'cls-2',
    courseTitle: 'Kỹ thuật Massage Chuyên Nghiệp',
    classBatch: 'MCN-1026 · Đợt tuyển sinh mới',
    instructor: 'Nguyễn Thanh Hương',
    branch: 'Quận 3',
    room: 'Thực hành 02 · Dự kiến',
    scheduleDays: 'Thứ 6 – 7 – CN · 13:00–17:00',
    timeSlot: 'Bắt đầu 23/10/2026',
    startDateStatus: 'Bắt đầu 23/10/2026',
    studentCount: '0/20',
    status: 'waiting',
    statusLabel: 'Chờ hồ sơ / cọc',
  },
  {
    id: 'cls-3',
    courseTitle: 'Chăm sóc da',
    classBatch: 'CSD-1026 · Khóa sắp học',
    instructor: 'Trần Minh Châu',
    instructorRole: 'Phân công mẫu',
    branch: 'Quận 3',
    room: 'Thực hành 01 · Dự kiến',
    scheduleDays: 'Bắt đầu 30/10/2026',
    timeSlot: 'Khung giờ chưa chốt',
    startDateStatus: 'Khung giờ chưa chốt',
    studentCount: '1/16',
    status: 'upcoming',
    statusLabel: 'Sắp mở',
  },
];

const weekDays = [
  { label: 'Thứ hai', date: '12/10/2026', key: '2026-10-12' },
  { label: 'Thứ ba', date: '13/10/2026', key: '2026-10-13' },
  { label: 'Thứ tư', date: '14/10/2026', key: '2026-10-14' },
  { label: 'Thứ năm', date: '15/10/2026', key: '2026-10-15' },
  { label: 'Thứ sáu', date: '16/10/2026', key: '2026-10-16' },
  { label: 'Thứ bảy', date: '17/10/2026', key: '2026-10-17' },
  { label: 'Chủ nhật', date: '18/10/2026', key: '2026-10-18' },
];

const roomsList = [
  'Phòng thực hành 01',
  'Phòng thực hành 02',
  'Phòng thực hành 03',
];

export const W11_Curriculum: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ps-th');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('week-12-18');
  const [branchFilter, setBranchFilter] = useState<string>('quận 3');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const [crsRes, batRes] = await Promise.all([
          academyService.getCourses(),
          academyService.getCourseBatches(),
        ]);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
      } catch (err) {
        console.error('Failed to load curriculum data:', err);
      }
    };
    fetchCurriculum();
  }, []);

  // Modals state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedSession =
    practicalSessionsData.find((ps) => ps.id === selectedSessionId) || practicalSessionsData[2];

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Filter classes
  const filteredClasses = trainingClasses.filter((c) => {
    const matchSearch =
      c.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.classBatch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = branchFilter === 'all' || c.branch.toLowerCase().includes(branchFilter.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchSearch && matchBranch && matchStatus;
  });

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#2C241E] text-white px-4 py-3 rounded-xl shadow-lg border border-[#D7BBA6] flex items-center gap-2.5 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#E29D62]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Header Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Vận hành đào tạo</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Lớp học, phòng thực hành và chương trình · Tuần 12/10/2026 – 18/10/2026
          </p>
        </div>

        <button
          onClick={() => setIsAddClassModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Tạo lớp học
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap md:flex-nowrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm lớp, giảng viên hoặc phòng..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Filter: Tuần học */}
        <div className="relative shrink-0">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="week-12-18">12/10/2026 – 18/10/2026</option>
            <option value="week-19-25">19/10/2026 – 25/10/2026</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Chi nhánh */}
        <div className="relative shrink-0">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="quận 3">Quận 3</option>
            <option value="quận 1">Quận 1</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Trạng thái */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang học</option>
            <option value="waiting">Chờ hồ sơ / cọc</option>
            <option value="upcoming">Sắp mở</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 3. TẦNG 1: Lịch phòng thực hành tuần (8 cols) + Buổi đang chọn (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Lịch phòng thực hành tuần */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-[#2C241E]">
              Lịch phòng thực hành tuần
            </h2>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
              3 buổi mẫu đã lập
            </span>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-[#EFE4D9] rounded-xl">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-[#FAF5EF] text-[#73675F] text-[11px] font-semibold divide-x divide-[#EFE4D9] border-b border-[#EFE4D9]">
                  <th className="py-2.5 px-3 w-28 text-left font-semibold"></th>
                  {weekDays.map((day) => (
                    <th key={day.key} className="py-2.5 px-2 min-w-[85px] font-semibold">
                      <div>{day.label}</div>
                      <div className="text-[10px] text-[#A69788] font-normal">{day.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE4D9] text-xs">
                {roomsList.map((roomName) => (
                  <tr key={roomName} className="divide-x divide-[#EFE4D9]">
                    {/* Room title */}
                    <td className="py-3 px-3 text-left font-semibold text-[11px] text-[#2C241E] bg-[#FAF5EF]/50">
                      {roomName}
                    </td>

                    {/* Day cells */}
                    {weekDays.map((day) => {
                      const session = practicalSessionsData.find(
                        (ps) => ps.room === roomName && ps.dateKey === day.key
                      );

                      if (session) {
                        const isSelected = session.id === selectedSessionId;
                        return (
                          <td key={day.key} className="p-1.5 align-middle">
                            <div
                              onClick={() => setSelectedSessionId(session.id)}
                              className={`p-2 rounded-xl text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#EBD8C6] border border-[#985018] shadow-xs'
                                  : 'bg-[#F5EADF] hover:bg-[#EFE0D2] border border-[#E8DFD8]'
                              }`}
                            >
                              <div className="font-bold text-[11px] text-[#2C241E] leading-tight">
                                {session.subject}
                              </div>
                              <div className="text-[10px] text-[#73675F] mt-0.5">
                                {session.timeRange}
                              </div>
                              <div className="text-[10px] text-[#8A4F23] font-medium mt-0.5 truncate">
                                {session.instructorName.split(' ').slice(-2).join(' ')}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={day.key} className="p-2 h-16 bg-white hover:bg-[#FAF8F5] transition-colors" />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnote below schedule grid */}
          <div className="text-xs text-[#73675F] pt-1">
            MCN-0926 có lịch định kỳ thứ 6–7–Chủ nhật, 13:00–17:00. Tuần chọn chỉ hiển thị buổi 16/10/2026 đã có nội dung mẫu; các buổi khác chưa lập chi tiết.
          </div>
        </div>

        {/* Right Column: Buổi đang chọn */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2C241E]">
              Buổi đang chọn · {selectedSession.dateLabel}
            </h2>
          </div>

          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
              {selectedSession.status}
            </span>
          </div>

          {/* Topic title */}
          <div className="text-xs font-bold text-[#2C241E] pt-1">
            {selectedSession.videoTopic}
          </div>

          {/* Key-values */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Lớp / phòng</span>
              <span className="text-[#2C241E] font-medium">{selectedSession.className}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Giảng viên</span>
              <span className="text-[#2C241E] font-medium">{selectedSession.instructorName}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Khung buổi học</span>
              <span className="text-[#2C241E] font-medium">{selectedSession.timeRange}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Video Bài 05</span>
              <span className="text-[#2C241E] font-medium">{selectedSession.videoDuration}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Thực hành</span>
              <span className="text-[#2C241E] font-medium">{selectedSession.practiceDuration}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Chuẩn bị phòng</span>
              <span className="text-[#2C241E] font-medium">{selectedSession.prepTime}</span>
            </div>
          </div>

          {/* Warning badge */}
          <div>
            <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
              Điểm danh chờ xác nhận
            </span>
          </div>

          <div className="text-[11px] text-[#73675F] leading-relaxed">
            {selectedSession.note}
          </div>

          {/* Action button */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="w-full py-2.5 bg-white border border-[#985018] hover:bg-[#FAF5EF] text-[#985018] text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
          >
            Lập lịch thực hành
          </button>
        </div>
      </div>

      {/* 4. TẦNG 2: Danh sách lớp đào tạo (Full width card) */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-5 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2C241E]">
            Danh sách lớp đào tạo
          </h2>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
            {filteredClasses.length} lớp đào tạo
          </span>
        </div>

        {/* Table of classes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                <th className="py-2.5 px-4 font-semibold">Khóa / lớp</th>
                <th className="py-2.5 px-4 font-semibold">Giảng viên</th>
                <th className="py-2.5 px-4 font-semibold">Cơ sở / phòng</th>
                <th className="py-2.5 px-4 font-semibold">Lịch học / bắt đầu</th>
                <th className="py-2.5 px-4 font-semibold">Sĩ số lớp</th>
                <th className="py-2.5 px-4 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9] text-xs">
              {filteredClasses.map((cls) => (
                <tr key={cls.id} className="bg-white hover:bg-[#FAF6F0] transition-colors">
                  {/* Khóa / lớp */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-xs text-[#2C241E]">{cls.courseTitle}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">{cls.classBatch}</div>
                  </td>

                  {/* Giảng viên */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-[#2C241E]">{cls.instructor}</div>
                    {cls.instructorRole && (
                      <div className="text-[11px] text-[#73675F] mt-0.5">{cls.instructorRole}</div>
                    )}
                  </td>

                  {/* Cơ sở / phòng */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-[#2C241E]">{cls.branch}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">{cls.room}</div>
                  </td>

                  {/* Lịch học / bắt đầu */}
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-[#2C241E]">{cls.scheduleDays}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5">{cls.startDateStatus}</div>
                  </td>

                  {/* Sĩ số mẫu */}
                  <td className="py-3.5 px-4 font-medium text-xs text-[#2C241E]">
                    {cls.studentCount}
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        cls.status === 'active'
                          ? 'bg-[#F3E2CE] text-[#8A4F23]'
                          : cls.status === 'waiting'
                          ? 'bg-[#F5EADF] text-[#8A4F23]'
                          : 'bg-[#EFE4D9] text-[#73675F]'
                      }`}
                    >
                      {cls.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
          <span>Hiển thị {filteredClasses.length} / {trainingClasses.length} lớp học</span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="w-6 h-6 rounded-md border border-[#EFE4D9] flex items-center justify-center text-[#A69788] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md bg-[#F3E2CE] text-[#8A4F23] font-semibold flex items-center justify-center text-xs">
              1
            </button>
            <button
              disabled
              className="w-6 h-6 rounded-md border border-[#EFE4D9] flex items-center justify-center text-[#A69788] hover:bg-[#FAF7F2] disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. TẦNG 3: Chương trình đào tạo & Theo dõi học tập mẫu */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Chương trình · 20 bài / 5 chương */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <h2 className="text-base font-bold text-[#2C241E]">
            Chương trình · 20 bài / 5 chương
          </h2>

          <div className="space-y-3 text-xs leading-relaxed">
            <div>
              <div className="font-bold text-[#2C241E]">Chương 1 · Giới thiệu nghề Spa</div>
              <div className="text-[#73675F] mt-1">
                ✓ Bài 1: Tổng quan ngành Spa · ✓ Bài 2: Quy trình phục vụ khách hàng · ✓ Bài 3: An toàn và vệ sinh trong Spa.
              </div>
            </div>

            <div>
              <div className="font-bold text-[#2C241E]">Chương 2 · Kỹ thuật cơ bản</div>
              <div className="text-[#73675F] mt-1">
                ✓ Bài 4: Kiến thức chăm sóc cơ thể · Bài 5: Kỹ thuật Massage cơ bản · Bài 6: Thực hành kỹ thuật. 120 phút.
              </div>
            </div>
          </div>

          <div className="text-xs text-[#73675F] pt-2 border-t border-[#EFE4D9]">
            MCN-0926: 12 tuần, 144 giờ · 48 giờ lý thuyết + 96 giờ thực hành.
          </div>
        </div>

        {/* Right: Theo dõi học tập */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
          <h2 className="text-base font-bold text-[#2C241E]">
            Theo dõi tiến độ học tập
          </h2>

          {/* Lesson box */}
          <div
            onClick={() => showToast('Mở video bài học: Kỹ thuật Massage cơ bản')}
            className="bg-[#F5EADF] rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#EFE0D2] transition-colors"
          >
            <div className="flex items-center gap-3">
              <PlayCircle className="w-5 h-5 text-[#8D4B1A] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#2C241E]">
                  Bài 05: Kỹ thuật Massage cơ bản
                </div>
                <div className="text-[11px] text-[#73675F] mt-0.5">
                  Video · 18 phút · Tiếp theo
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C7A6B] shrink-0" />
          </div>

          {/* Stats */}
          <div className="space-y-2 text-xs pt-0.5">
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Xuân Trường đã hoàn thành</span>
              <span className="text-[#2C241E] font-medium">4/20 bài · 20%</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Chuyên cần</span>
              <span className="text-[#2C241E] font-medium">8/9 · 88,9%</span>
            </div>
          </div>

          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Đánh giá kiến thức và thực hành theo dõi trên hệ thống quản lý học tập MLD Academy.
          </div>
        </div>
      </div>

      {/* 6. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>
          Hệ thống khung chương trình đào tạo & lộ trình học viện • MLD Vietnam Healthcare Admin.
        </span>
      </div>

      {/* MODAL 1: Tạo lớp học mới */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Tạo lớp đào tạo mới</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Khởi tạo khóa đào tạo học viện MLD</p>
              </div>
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsAddClassModalOpen(false);
                showToast('Đã khởi tạo lớp học mới thành công!');
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Tên chương trình đào tạo</label>
                <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                  <option value="mcn">Kỹ thuật Massage Chuyên Nghiệp</option>
                  <option value="csd">Chăm sóc da chuyên sâu</option>
                  <option value="ctc">Chăm sóc cơ thể dưỡng sinh</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Mã lớp đào tạo</label>
                  <input
                    type="text"
                    defaultValue="MCN-1126"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Sĩ số tối đa</label>
                  <input
                    type="number"
                    defaultValue={20}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Giảng viên chủ nhiệm</label>
                  <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="th">Nguyễn Thanh Hương</option>
                    <option value="mc">Trần Minh Châu</option>
                    <option value="qb">Lê Quốc Bảo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Phòng thực hành cố định</label>
                  <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="p2">Phòng thực hành 02</option>
                    <option value="p1">Phòng thực hành 01</option>
                    <option value="p3">Phòng thực hành 03</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Lịch học trong tuần</label>
                <input
                  type="text"
                  defaultValue="Thứ 6 – 7 – CN · 13:00–17:00"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Khởi tạo lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Lập lịch thực hành */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Lập lịch thực hành phòng lab</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Xếp lịch thực hành cho buổi học</p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsScheduleModalOpen(false);
                showToast(`Đã lưu lịch thực hành cho ${selectedSession.className}!`);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Lớp & Giảng viên</label>
                <div className="px-3.5 py-2.5 bg-[#FAF5EF] rounded-xl font-medium text-[#2C241E] border border-[#EFE4D9]">
                  {selectedSession.className} ({selectedSession.instructorName})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Ngày thực hành</label>
                  <input
                    type="date"
                    defaultValue="2026-10-16"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Khung giờ</label>
                  <input
                    type="text"
                    defaultValue={selectedSession.timeRange}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Chủ đề bài giảng thực hành</label>
                <input
                  type="text"
                  defaultValue={selectedSession.videoTopic}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Thời lượng thực hành</label>
                  <input
                    type="text"
                    defaultValue={selectedSession.practiceDuration}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Chuẩn bị phòng</label>
                  <input
                    type="text"
                    defaultValue={selectedSession.prepTime}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Lưu lịch thực hành
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
