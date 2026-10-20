import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  PlayCircle,
  X,
  CheckCircle2,
  Calendar,
  Search,
} from 'lucide-react';
import { academyService, staffService, StaffWithProfile } from '../services';
import { Course, CourseBatch, BatchStatus } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

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

const defaultSession: PracticalSession = {
  id: 'ps-default',
  room: 'Phòng thực hành 01',
  dateKey: '2026-10-16',
  dateLabel: '16/10/2026',
  subject: 'Kỹ thuật Massage Trị Liệu',
  timeRange: '13:00–17:00',
  instructorName: 'Nguyễn Thảo Ngọc',
  className: 'K26-SPA-Q1 · Phòng 01',
  status: 'Sắp diễn ra',
  videoTopic: 'Thực hành kỹ thuật bấm huyệt và massage cơ bản',
  videoDuration: '20 phút',
  practiceDuration: '150 phút',
  prepTime: '12:45–13:00',
  note: 'Nhân sự đào tạo và giảng viên đối chiếu chuyên cần sau buổi học theo quy chế học viện MLD.',
};

export const W11_Curriculum: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('week-12-18');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);
  const [instructors, setInstructors] = useState<StaffWithProfile[]>([]);

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const [crsRes, batRes, instRes] = await Promise.all([
          academyService.getCourses(),
          academyService.getCourseBatches(),
          staffService.getInstructors(),
        ]);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
        if (instRes.success) setInstructors(instRes.data);
      } catch (err) {
        console.error('Failed to load curriculum data:', err);
      }
    };
    fetchCurriculum();
  }, []);

  const trainingClasses: TrainingClassRecord[] = useMemo(() => {
    if (!liveBatches || liveBatches.length === 0) return [];
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));
    const instMap = new Map(instructors.map((i) => [i.id, i]));

    return liveBatches.map((bat, idx) => {
      const crs = crsMap.get(bat.courseId);
      const inst = instMap.get(bat.instructorId || '');
      const branchName = bat.branchId?.includes('0002') ? 'Quận 1' : 'Quận 3';
      const status: 'active' | 'waiting' | 'upcoming' =
        (bat.status as any) === 'OPEN' || (bat.status as any) === 'OPEN_FOR_ENROLLMENT' || bat.status === BatchStatus.IN_PROGRESS
          ? 'active'
          : bat.status === BatchStatus.UPCOMING
          ? 'upcoming'
          : 'waiting';
      const statusLabel =
        status === 'active' ? 'Đang học' : status === 'upcoming' ? 'Sắp mở' : 'Chờ hồ sơ / cọc';

      return {
        id: bat.id,
        courseTitle: crs?.title || 'Khóa Đào Tạo Kỹ Thuật Viên',
        classBatch: `${bat.batchCode} · ${crs?.code || 'Academy'}`,
        instructor: inst?.fullName || 'Nguyễn Thảo Ngọc',
        instructorRole: (inst as any)?.title || 'Giảng viên chính',
        branch: branchName,
        room: idx % 2 === 0 ? 'Phòng thực hành 01' : 'Phòng thực hành 02',
        scheduleDays: bat.scheduleText || 'Thứ 2 – 4 – 6 · 08:30–11:30',
        timeSlot: 'Đang triển khai',
        startDateStatus: bat.startDate ? `Khai giảng: ${new Date(bat.startDate).toLocaleDateString('vi-VN')}` : 'Đang triển khai',
        studentCount: `${bat.enrolledCount}/${bat.maxStudents}`,
        status,
        statusLabel,
      };
    });
  }, [liveBatches, liveCourses, instructors]);

  const practicalSessionsData: PracticalSession[] = useMemo(() => {
    if (!liveBatches || liveBatches.length === 0) return [defaultSession];
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));
    const instMap = new Map(instructors.map((i) => [i.id, i]));

    const sessions: PracticalSession[] = [];
    liveBatches.forEach((bat, idx) => {
      const crs = crsMap.get(bat.courseId);
      const inst = instMap.get(bat.instructorId || '');
      const room = idx === 0 ? 'Phòng thực hành 01' : 'Phòng thực hành 02';
      const dateKey = idx === 0 ? '2026-10-14' : '2026-10-16';
      const dateLabel = idx === 0 ? '14/10/2026' : '16/10/2026';
      const timeRange = idx === 0 ? '09:00–12:00' : '13:00–17:00';

      sessions.push({
        id: `ps-${bat.id}`,
        room,
        dateKey,
        dateLabel,
        subject: crs?.title || 'Chăm sóc trị liệu',
        timeRange,
        instructorName: inst?.fullName || 'Nguyễn Thảo Ngọc',
        className: `${bat.batchCode} · ${room}`,
        status: 'Chưa diễn ra',
        videoTopic: `Thực hành kỹ thuật chuyên sâu - ${bat.batchCode}`,
        videoDuration: '18 phút',
        practiceDuration: '140 phút',
        prepTime: '08:45–09:00',
        note: 'Nhân sự được phân quyền đối chiếu chuyên cần sau buổi học theo chuẩn học viện MLD.',
      });
    });

    return sessions.length > 0 ? sessions : [defaultSession];
  }, [liveBatches, liveCourses, instructors]);

  // Modals state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedSession =
    practicalSessionsData.find((ps) => ps.id === selectedSessionId) || practicalSessionsData[0] || defaultSession;

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Filter classes
  const hasActiveFilter =
    searchTerm.trim().length > 0 ||
    branchFilter !== 'all' ||
    statusFilter !== 'all';

  const filteredClasses = trainingClasses.filter((c) => {
    const isMatched = matchSearch(
      [c.courseTitle, c.classBatch, c.instructor, c.room, c.branch],
      searchTerm
    );
    const matchBranch = branchFilter === 'all' || matchSearch(c.branch, branchFilter);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;

    return isMatched && matchBranch && matchStatus;
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
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm lớp, giảng viên hoặc phòng..."
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
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

        {/* Filter: Tuần học */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="week-12-18">12/10/2026 – 18/10/2026</option>
            <option value="week-19-25">19/10/2026 – 25/10/2026</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Chi nhánh */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="quận 3">Quận 3</option>
            <option value="quận 1">Quận 1</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Trạng thái */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang học</option>
            <option value="waiting">Chờ hồ sơ / cọc</option>
            <option value="upcoming">Sắp mở</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset filter button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setBranchFilter('all');
              setStatusFilter('all');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Đặt lại bộ lọc"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}
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
              {practicalSessionsData.length} buổi thực hành đã lập
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
            Lịch thực hành được phân bổ dựa trên thời khóa biểu và phòng lab thực tế của các lớp học viện MLD.
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
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#73675F]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy lớp học</p>
                      <p className="text-xs text-[#8C7A6B]">
                        {searchTerm.trim()
                          ? `Không có lớp học nào khớp với từ khóa "${searchTerm}".`
                          : 'Không có lớp học nào với bộ lọc đã chọn.'}
                      </p>
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setBranchFilter('all');
                            setStatusFilter('all');
                          }}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
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

                  {/* Sĩ số */}
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
              )))}
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

      {/* 5. TẦNG 3: Chương trình đào tạo & Theo dõi học tập */}
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
                  {liveCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                  {liveCourses.length === 0 && (
                    <option value="default">Khóa Đào Tạo Kỹ Thuật Viên Spa</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Mã lớp đào tạo</label>
                  <input
                    type="text"
                    defaultValue="K27-SPA"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Sĩ số tối đa</label>
                  <input
                    type="number"
                    defaultValue={15}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Giảng viên chủ nhiệm</label>
                  <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>{i.fullName} (Giảng viên)</option>
                    ))}
                    {instructors.length === 0 && (
                      <option value="default">Nguyễn Thảo Ngọc</option>
                    )}
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
