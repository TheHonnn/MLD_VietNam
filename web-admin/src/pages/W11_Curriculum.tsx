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
  ShieldCheck,
  Award,
  HelpCircle,
  Lock,
  Layers,
  Sparkles,
  Eye,
  FileText,
  User,
  Check,
  Clock,
  Plus,
} from 'lucide-react';
import { academyService, staffService, StaffWithProfile } from '../services';
import { Course, CourseBatch, BatchStatus, CourseLesson } from '../types/shared_types';
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

interface TimetableRoom {
  id: string;
  name: string;
  instructorName: string;
  capacity: string;
  branch: string;
}

const ROW_HEIGHT = 72;
const BASE_HOUR = 8;
const TIMETABLE_HOURS = [
  '08:00',
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
];

const timetableRooms: TimetableRoom[] = [
  {
    id: 'p1',
    name: 'Phòng thực hành 01',
    instructorName: 'Nguyễn Thảo Ngọc',
    capacity: '15 học viên',
    branch: 'Cơ sở Quận 3',
  },
  {
    id: 'p2',
    name: 'Phòng thực hành 02',
    instructorName: 'Trần Quỳnh Nga',
    capacity: '15 học viên',
    branch: 'Cơ sở Quận 3',
  },
  {
    id: 'p3',
    name: 'Phòng thực hành 03',
    instructorName: 'Lê Thu Hà',
    capacity: '12 học viên',
    branch: 'Cơ sở Quận 1',
  },
];


const parseTimeRange = (timeRange: string) => {
  const parts = timeRange.split(/[–-]/);
  const startTimeStr = parts[0]?.trim() || '08:00';
  const endTimeStr = parts[1]?.trim() || '11:00';

  const [sH, sM] = startTimeStr.split(':').map(Number);
  const [eH, eM] = endTimeStr.split(':').map(Number);

  const startHour = (isNaN(sH) ? 8 : sH) + (isNaN(sM) ? 0 : sM) / 60;
  const endHour = (isNaN(eH) ? 11 : eH) + (isNaN(eM) ? 0 : eM) / 60;
  const durationHours = Math.max(0.75, endHour - startHour);

  return { startHour, endHour, durationHours, startTimeStr, endTimeStr };
};

export const W11_Curriculum: React.FC = () => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('week-12-18');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseGroupFilter, setCourseGroupFilter] = useState<'all' | 'new_learner' | 'advanced_ktv'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [isVideoSecurityModalOpen, setIsVideoSecurityModalOpen] = useState<boolean>(false);
  const [isWatermarkActive, setIsWatermarkActive] = useState<boolean>(true);
  const [watermarkText, setWatermarkText] = useState<string>('Học viên: Nguyễn Thị Mai · SĐT: 0912345678 · MLD#8892');
  const [watermarkPos, setWatermarkPos] = useState<number>(0);

  useEffect(() => {
    if (isVideoSecurityModalOpen) {
      const interval = setInterval(() => {
        setWatermarkPos((prev) => (prev + 1) % 4);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isVideoSecurityModalOpen]);

  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);
  const [instructors, setInstructors] = useState<StaffWithProfile[]>([]);
  const [liveLessons, setLiveLessons] = useState<CourseLesson[]>([]);

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const [crsRes, batRes, instRes, lesRes] = await Promise.all([
          academyService.getCourses(),
          academyService.getCourseBatches(),
          staffService.getInstructors(),
          academyService.getCourseLessons(),
        ]);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
        if (instRes.success) setInstructors(instRes.data);
        if (lesRes.success) setLiveLessons(lesRes.data);
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
    if (!liveBatches || liveBatches.length === 0) return [];
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));
    const instMap = new Map(instructors.map((i) => [i.id, i]));

    return liveBatches.map((bat, idx) => {
      const crs = crsMap.get(bat.courseId);
      const inst = instMap.get(bat.instructorId || '');
      const room = idx % 2 === 0 ? 'Phòng thực hành 01' : 'Phòng thực hành 02';
      const dateKey = bat.startDate ? bat.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
      const dateParts = dateKey.split('-');
      const dateLabel = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : dateKey;
      const timeRange = bat.scheduleText?.includes('13:00') ? '13:00–17:00' : '08:30–11:30';

      const matchedLesson =
        liveLessons.find((l) => (l as any).chapter?.courseId === bat.courseId) ||
        liveLessons[idx % (liveLessons.length || 1)];

      const videoTopic = matchedLesson?.title || `Thực hành kỹ thuật chuyên sâu - ${bat.batchCode}`;
      const videoDuration = matchedLesson?.durationMinutes ? `${matchedLesson.durationMinutes} phút` : '25 phút';

      return {
        id: `ps-${bat.id}`,
        room,
        dateKey,
        dateLabel,
        subject: crs?.title || 'Khóa Đào Tạo Kỹ Thuật Viên',
        timeRange,
        instructorName: inst?.fullName || 'Nguyễn Thảo Ngọc',
        className: `${bat.batchCode} · ${room}`,
        status: (bat.status as any) === 'IN_PROGRESS' ? 'Đang diễn ra' : (bat.status as any) === 'UPCOMING' ? 'Sắp diễn ra' : 'Chưa diễn ra',
        videoTopic,
        videoDuration,
        practiceDuration: '150 phút',
        prepTime: timeRange.startsWith('13:00') ? '12:45–13:00' : '08:15–08:30',
        note: 'Nhân sự được phân quyền đối chiếu chuyên cần sau buổi học theo chuẩn học viện MLD.',
      };
    });
  }, [liveBatches, liveCourses, instructors, liveLessons]);

  // Timetable State & Filters
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [selectedSessionStatusFilter, setSelectedSessionStatusFilter] = useState<string>('ALL');

  // Date selection & navigation helpers
  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleStepDay = (step: number) => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const cur = new Date(y, m - 1, d);
      cur.setDate(cur.getDate() + step);
      const nextDateStr = cur.toISOString().split('T')[0];
      handleSelectDate(nextDateStr);
    } catch {
      handleSelectDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Formatted header date
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

  // Dynamic quick-switch dates based on sessions in system
  const availableBookingDates = useMemo(() => {
    const dateMap = new Map<string, number>();
    practicalSessionsData.forEach((s) => {
      if (s.dateKey) {
        dateMap.set(s.dateKey, (dateMap.get(s.dateKey) || 0) + 1);
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    if (!dateMap.has(todayStr)) {
      dateMap.set(todayStr, 0);
    }

    const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([dt, count]) => {
      const [y, m, d] = dt.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      const wd = dObj.toLocaleDateString('vi-VN', { weekday: 'short' });
      const capWd = wd.charAt(0).toUpperCase() + wd.slice(1);
      return {
        date: dt,
        count,
        label: `${capWd}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
      };
    });
  }, [practicalSessionsData]);

  // Displayed sessions filtered by selectedDate, room, and status
  const displayedSessions = useMemo(() => {
    return practicalSessionsData.filter((s) => {
      if (s.dateKey !== selectedDate) return false;
      if (selectedRoomFilter !== 'ALL' && s.room !== selectedRoomFilter) return false;
      if (selectedSessionStatusFilter !== 'ALL' && s.status !== selectedSessionStatusFilter) return false;
      return true;
    });
  }, [practicalSessionsData, selectedDate, selectedRoomFilter, selectedSessionStatusFilter]);

  // Visible room columns
  const visibleRooms = useMemo(() => {
    if (selectedRoomFilter !== 'ALL') {
      const filtered = timetableRooms.filter((r) => r.name === selectedRoomFilter);
      if (filtered.length > 0) return filtered;
    }
    return timetableRooms;
  }, [selectedRoomFilter]);

  // Modals state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto select active session when displayedSessions or selectedDate changes
  useEffect(() => {
    if (displayedSessions.length > 0) {
      if (!selectedSessionId || !displayedSessions.some((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(displayedSessions[0].id);
      }
    } else if (practicalSessionsData.length > 0) {
      if (!selectedSessionId || !practicalSessionsData.some((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(practicalSessionsData[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [displayedSessions, practicalSessionsData, selectedSessionId]);

  const selectedSession: PracticalSession | null =
    practicalSessionsData.find((ps) => ps.id === selectedSessionId) ||
    displayedSessions[0] ||
    practicalSessionsData[0] ||
    null;

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
    statusFilter !== 'all' ||
    courseGroupFilter !== 'all' ||
    courseFilter !== 'all';

  const filteredClasses = trainingClasses.filter((c) => {
    const isMatched = matchSearch(
      [c.courseTitle, c.classBatch, c.instructor, c.room, c.branch],
      searchTerm
    );
    const matchBranch = branchFilter === 'all' || matchSearch(c.branch, branchFilter);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;

    const matchGroup =
      courseGroupFilter === 'all' ||
      (courseGroupFilter === 'new_learner' &&
        (c.courseTitle.toLowerCase().includes('cơ bản') ||
          c.courseTitle.toLowerCase().includes('massage') ||
          c.courseTitle.toLowerCase().includes('nhập môn'))) ||
      (courseGroupFilter === 'advanced_ktv' &&
        (!c.courseTitle.toLowerCase().includes('cơ bản') &&
          !c.courseTitle.toLowerCase().includes('nhập môn')));

    const matchCourse =
      courseFilter === 'all' ||
      c.courseTitle.toLowerCase() === courseFilter.toLowerCase();

    return isMatched && matchBranch && matchStatus && matchGroup && matchCourse;
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

      {/* 1. Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Vận hành đào tạo</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Lớp học, phòng thực hành, bài thi Quiz & bản quyền video · Tuần 12/10/2026 – 18/10/2026
          </p>
        </div>
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

        {/* Filter: Phân nhóm 2 khóa học */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={courseGroupFilter}
            onChange={(e) => setCourseGroupFilter(e.target.value as any)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả nhóm khóa học</option>
            <option value="new_learner">Khóa cho người mới bắt đầu làm nghề</option>
            <option value="advanced_ktv">Khóa chuyên sâu cho KTV đang làm nghề</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Khóa học cụ thể */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Khóa học · Tất cả ({liveCourses.length})</option>
            {liveCourses.map((c) => (
              <option key={c.id} value={c.title}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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

      {/* Quick Date Switcher Chips (Jump immediately between days with practical sessions) */}
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
          onClick={() => handleSelectDate('2026-10-16')}
          className="px-3 py-1 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF8F5] text-[#5C5046] border border-[#E8DFD8] shrink-0 cursor-pointer"
        >
          Hôm nay
        </button>
      </div>

      {/* Timetable Sub-bar: Date Stepper & Filter Controls */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-2.5 px-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Room filter dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
            >
              <option value="ALL">Tất cả phòng thực hành ({timetableRooms.length})</option>
              {timetableRooms.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} · {r.instructorName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status filter dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedSessionStatusFilter}
              onChange={(e) => setSelectedSessionStatusFilter(e.target.value)}
              className="h-9 pl-3 pr-8 rounded-xl border border-[#E8DFD8] bg-white text-xs font-semibold text-[#2C241E] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái buổi học</option>
              <option value="Đang diễn ra">Đang diễn ra</option>
              <option value="Sắp diễn ra">Sắp diễn ra</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Chưa diễn ra">Chưa diễn ra</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#73675F]">
            {formattedDateHeader} · <strong>{displayedSessions.length}</strong> buổi thực hành
          </span>
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="h-9 px-3.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lập lịch thực hành</span>
          </button>
        </div>
      </div>

      {/* 3. Main Timetable Matrix (Left: 8 cols) + Detail Sidebar (Right: 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Timetable Matrix + Empty State + Legend */}
        <div className="lg:col-span-8 space-y-3 min-w-0">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-x-auto shadow-xs">
            <div className="w-max min-w-full inline-block align-top">
              {/* Header Row */}
              <div className="flex border-b border-[#EFE4D9] bg-[#F3E2CE] w-max min-w-full">
                {/* Corner spacer - Sticky on horizontal scroll */}
                <div className="w-16 sm:w-20 shrink-0 sticky left-0 z-30 bg-[#F3E2CE] border-r border-[#EFE4D9] flex items-center justify-center p-2 text-[10.5px] font-bold text-[#73675F] shadow-[1px_0_0_#EFE4D9]">
                  Giờ
                </div>

                {/* Room Headers */}
                {visibleRooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className={`w-[220px] min-w-[220px] shrink-0 px-4 py-3 border-r border-[#EFE4D9] ${
                      idx === visibleRooms.length - 1 ? 'border-r-0' : ''
                    }`}
                  >
                    <div className="text-[13px] font-bold text-[#2C241E] truncate" title={room.name}>
                      {room.name}
                    </div>
                    <div className="text-[11px] text-[#73675F] mt-0.5 truncate" title={`GV: ${room.instructorName} · ${room.capacity}`}>
                      GV: {room.instructorName} · {room.capacity}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timetable Body (Rows + Absolute Session Cards) */}
              <div className="relative flex w-max min-w-full">
                {/* Left Column: Time Labels - Sticky on horizontal scroll */}
                <div className="w-16 sm:w-20 shrink-0 sticky left-0 z-20 bg-white border-r border-[#EFE4D9] select-none shadow-[1px_0_0_#EFE4D9]">
                  {TIMETABLE_HOURS.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="border-b border-[#F0E6DC] text-center pt-2 text-[11px] sm:text-xs text-[#73675F] font-medium"
                    >
                      {hour}
                    </div>
                  ))}
                </div>

                {/* Room Columns */}
                {visibleRooms.map((room, colIdx) => {
                  const roomSessions = displayedSessions.filter((s) => s.room === room.name);
                  return (
                    <div
                      key={room.id}
                      className={`w-[220px] min-w-[220px] shrink-0 relative border-r border-[#EFE4D9] ${
                        colIdx === visibleRooms.length - 1 ? 'border-r-0' : ''
                      }`}
                    >
                      {/* Background Grid Lines extending full width of column */}
                      {TIMETABLE_HOURS.map((hour) => (
                        <div
                          key={hour}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          className="border-b border-[#F0E6DC] w-full"
                        />
                      ))}

                      {/* Shared Lunch Break Block: 12:00 to 13:00 */}
                      <div
                        style={{
                          top: `${(12 - BASE_HOUR) * ROW_HEIGHT + 3}px`,
                          height: `${ROW_HEIGHT - 6}px`,
                        }}
                        className="absolute inset-x-2 rounded-xl bg-[#F6EFE8] flex items-center justify-center text-center p-1 select-none pointer-events-none z-5"
                      >
                        <span className="text-[11px] text-[#73675F] font-medium">
                          12:00–13:00 · Nghỉ trưa & Chuẩn bị giáo cụ
                        </span>
                      </div>

                      {/* Dynamic Practical Session Cards for this room */}
                      {roomSessions.map((session) => {
                        const { startHour, durationHours } = parseTimeRange(session.timeRange);
                        const topOffset = Math.max(0, (startHour - BASE_HOUR) * ROW_HEIGHT);
                        const blockHeight = Math.max(48, durationHours * ROW_HEIGHT);
                        const isSelected = selectedSession?.id === session.id;

                        const isCompleted = session.status === 'Đã hoàn thành';
                        const isInProgress = session.status === 'Đang diễn ra';
                        const isUpcoming = session.status === 'Sắp diễn ra';

                        return (
                          <div key={session.id}>
                            {/* Attached prep time strip if applicable */}
                            {session.prepTime && (
                              <div
                                style={{
                                  top: `${Math.max(0, topOffset - 19)}px`,
                                  height: '19px',
                                }}
                                className="absolute inset-x-2 rounded-t-lg bg-[#DEC6B0] border-x border-t border-[#CDB59E] px-2 flex items-center text-[9.5px] font-medium text-[#4A3E34] truncate z-10"
                              >
                                <Clock className="w-2.5 h-2.5 mr-1 inline shrink-0" />
                                <span>Chuẩn bị: {session.prepTime}</span>
                              </div>
                            )}

                            {/* Main Practical Session Card */}
                            <div
                              onClick={() => setSelectedSessionId(session.id)}
                              style={{
                                top: `${topOffset}px`,
                                height: `${blockHeight}px`,
                              }}
                              className={`absolute inset-x-2 p-2.5 text-left cursor-pointer transition-all duration-150 z-10 flex flex-col justify-between ${
                                session.prepTime ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'
                              } ${
                                isSelected
                                  ? 'bg-[#FAF0E4] border-2 border-[#985018] shadow-md scale-[1.01]'
                                  : isCompleted
                                  ? 'bg-[#EBF7EE] border border-[#BDE5C8] hover:border-[#2D7A4D]'
                                  : isInProgress
                                  ? 'bg-[#EFF8FF] border border-[#BFDBFE] hover:border-[#1D4ED8]'
                                  : isUpcoming
                                  ? 'bg-[#FDF6EE] border border-[#D7BBA6] hover:border-[#985018]'
                                  : 'bg-[#FFFDF7] border border-[#E8DFD8] hover:border-[#985018]'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#EFE4D9] text-[#783E15] shrink-0">
                                    {session.className.split(' · ')[0]}
                                  </span>
                                  <span className="text-[10px] text-[#73675F] truncate">
                                    {session.timeRange}
                                  </span>
                                </div>
                                <div className="text-[11.5px] font-bold text-[#2C241E] line-clamp-2 leading-snug">
                                  {session.subject}
                                </div>
                                <div className="text-[10.5px] text-[#8A4F23] font-medium mt-1 truncate">
                                  GV: {session.instructorName}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-black/5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold ${
                                    isCompleted
                                      ? 'bg-[#D1F2D9] text-[#0D6832]'
                                      : isInProgress
                                      ? 'bg-[#DBEAFE] text-[#1E40AF]'
                                      : isUpcoming
                                      ? 'bg-[#FAF0E4] text-[#8A4F23]'
                                      : 'bg-[#FEF3C7] text-[#92400E]'
                                  }`}
                                >
                                  {session.status}
                                </span>
                                <span className="text-[9.5px] text-[#73675F] truncate">
                                  {session.practiceDuration}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Empty Notice if zero sessions on selected date */}
          {displayedSessions.length === 0 && (
            <div className="p-6 bg-white border border-[#EFE4D9] rounded-2xl text-center space-y-2 shadow-xs">
              <Calendar className="w-8 h-8 text-[#985018] mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-[#2C241E]">
                Không có buổi học thực hành nào vào ngày {formattedDateHeader}
              </h3>
              <p className="text-xs text-[#73675F] max-w-md mx-auto">
                Hiện tại các phòng thực hành đang trống toàn bộ khung giờ. Bạn có thể bấm xếp lịch thực hành mới hoặc chuyển sang ngày có lịch ở thanh chọn nhanh bên trên.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-4 py-2 bg-[#985018] text-white text-xs font-bold rounded-xl hover:bg-[#854412] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Xếp lịch thực hành cho ngày này</span>
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
              ● Đang diễn ra
            </span>
            <span className="px-3 py-1 bg-[#FDF6EE] border border-[#D7BBA6] rounded-lg font-medium text-[#8A4F23]">
              Lịch chuẩn đã lập
            </span>
            <span className="px-3 py-1 bg-[#FEF3C7] text-[#92400E] rounded-lg font-medium">
              Chưa diễn ra
            </span>
            <span className="px-3 py-1 bg-[#F6EFE8] text-[#73675F] rounded-lg font-medium">
              12:00–13:00 · Nghỉ trưa & Chuẩn bị giáo cụ
            </span>
          </div>
        </div>

        {/* Right Column: Buổi đang chọn Details Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {selectedSession ? (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[17px] font-extrabold text-[#3E200C]">Buổi đang chọn</div>
                  <div className="text-[11px] text-[#73675F]">Lớp: {selectedSession.className}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    selectedSession.status === 'Đã hoàn thành'
                      ? 'bg-[#E8F6ED] text-[#0D6832] border border-[#C5ECD0]'
                      : selectedSession.status === 'Đang diễn ra'
                      ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                      : selectedSession.status === 'Sắp diễn ra'
                      ? 'bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]'
                      : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                  }`}
                >
                  {selectedSession.status}
                </span>
              </div>

              {/* Instructor Profile snippet */}
              <div className="flex items-center gap-3 pt-0.5">
                <div className="w-10 h-10 rounded-full bg-[#FAF0E4] border border-[#EFE4D9] flex items-center justify-center text-[#8D4B1A] font-bold shrink-0">
                  <User className="w-5 h-5 text-[#8D4B1A]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#2C241E] truncate">
                    {selectedSession.instructorName}
                  </div>
                  <div className="text-[11px] text-[#73675F] truncate mt-0.5">
                    Giảng viên chuyên môn · Viện Đào Tạo MLD
                  </div>
                </div>
              </div>

              {/* Subject Title */}
              <div className="text-[13.5px] font-bold text-[#2C241E] pt-1 border-t border-[#F5EBE1]">
                {selectedSession.subject}
              </div>

              {/* Topic box */}
              <div className="text-xs text-[#73675F] bg-[#FAF5EF] p-2.5 rounded-xl border border-[#EFE4D9]">
                <div className="font-semibold text-[#2C241E] mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8D4B1A]" />
                  <span>Nội dung bài học thực hành:</span>
                </div>
                <div>{selectedSession.videoTopic}</div>
              </div>

              {/* Key-values breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Phòng thực hành</span>
                  <span className="text-[#2C241E] font-semibold">{selectedSession.room}</span>
                </div>
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Khung buổi học</span>
                  <span className="text-[#2C241E] font-semibold">{selectedSession.timeRange}</span>
                </div>
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Thời lượng video bài giảng</span>
                  <span className="text-[#2C241E] font-semibold">{selectedSession.videoDuration}</span>
                </div>
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Thời lượng thực hành</span>
                  <span className="text-[#2C241E] font-semibold">{selectedSession.practiceDuration}</span>
                </div>
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Chuẩn bị phòng</span>
                  <span className="text-[#2C241E] font-semibold">{selectedSession.prepTime}</span>
                </div>
                <div className="flex items-center justify-between text-[#73675F]">
                  <span>Ngày diễn ra</span>
                  <span className="text-[#2C241E] font-semibold">{selectedSession.dateLabel}</span>
                </div>
              </div>

              {/* Attendance & note box */}
              <div className="p-3 rounded-xl bg-[#FAF0E4]/60 border border-[#E8DFD8] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A4F23]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Điểm danh học viên & Chuẩn bị giáo cụ</span>
                </div>
                <div className="text-[11px] text-[#73675F] leading-relaxed">
                  {selectedSession.note}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => showToast(`Đã ghi nhận điểm danh chuyên cần cho lớp ${selectedSession.className}!`)}
                  className="w-full py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Điểm danh buổi thực hành</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full py-2 bg-white border border-[#985018] hover:bg-[#FAF5EF] text-[#985018] text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
                >
                  Xếp lịch / Điều chỉnh ca
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-6 shadow-xs text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018] mx-auto">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-[#2C241E]">Chưa chọn buổi học</div>
              <p className="text-xs text-[#73675F]">
                Hiện tại chưa có buổi học nào trên lịch hoặc chưa có buổi học nào được chọn. Nhấp vào một ca học trên bảng hoặc bấm "Lập lịch thực hành" để xếp buổi mới.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-4 py-2 bg-[#985018] text-white text-xs font-bold rounded-xl hover:bg-[#854412] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lập lịch thực hành</span>
                </button>
              </div>
            </div>
          )}
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
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9] whitespace-nowrap">
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Khóa / lớp</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Giảng viên</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Cơ sở / phòng</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Lịch học / bắt đầu</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Sĩ số lớp</th>
                <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9] text-xs whitespace-nowrap">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#73675F] whitespace-normal">
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
                            setCourseGroupFilter('all');
                            setCourseFilter('all');
                          }}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
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
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-xs text-[#2C241E] whitespace-nowrap">{cls.courseTitle}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">{cls.classBatch}</div>
                  </td>

                  {/* Giảng viên */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-xs text-[#2C241E] whitespace-nowrap">{cls.instructor}</div>
                    {cls.instructorRole && (
                      <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">{cls.instructorRole}</div>
                    )}
                  </td>

                  {/* Cơ sở / phòng */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-xs text-[#2C241E] whitespace-nowrap">{cls.branch}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">{cls.room}</div>
                  </td>

                  {/* Lịch học / bắt đầu */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-xs text-[#2C241E] whitespace-nowrap">{cls.scheduleDays}</div>
                    <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">{cls.startDateStatus}</div>
                  </td>

                  {/* Sĩ số */}
                  <td className="py-3.5 px-4 font-medium text-xs text-[#2C241E] whitespace-nowrap">
                    {cls.studentCount}
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
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
                showToast(`Đã lưu lịch thực hành cho ${selectedSession?.className || 'lớp học'}!`);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Lớp & Giảng viên</label>
                <div className="px-3.5 py-2.5 bg-[#FAF5EF] rounded-xl font-medium text-[#2C241E] border border-[#EFE4D9]">
                  {selectedSession ? `${selectedSession.className} (${selectedSession.instructorName})` : 'Lớp thực hành chung'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Ngày thực hành</label>
                  <input
                    type="date"
                    defaultValue={selectedSession?.dateKey || selectedDate}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Khung giờ</label>
                  <input
                    type="text"
                    defaultValue={selectedSession?.timeRange || '13:00 - 17:00'}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Chủ đề bài giảng thực hành</label>
                <input
                  type="text"
                  defaultValue={selectedSession?.videoTopic || ''}
                  placeholder="Nhập chủ đề bài giảng..."
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Thời lượng thực hành</label>
                  <input
                    type="text"
                    defaultValue={selectedSession?.practiceDuration || '4 giờ'}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Chuẩn bị phòng</label>
                  <input
                    type="text"
                    defaultValue={selectedSession?.prepTime || '15 phút'}
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

      {/* ========================================================================= */}
      {/* MODAL 1: NGÂN HÀNG CÂU HỎI & BẢNG ĐIỂM THI QUIZZES                        */}
      {/* ========================================================================= */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Ngân Hàng Câu Hỏi & Đánh Giá Bài Thi Quizzes
                  </h3>
                  <p className="text-xs text-gray-500">
                    Bộ đề kiểm tra lý thuyết MLD · Yêu cầu đạt ≥ 80% để thi thực hành lâm sàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Content Tabs / Split */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Thống kê bài thi */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="text-gray-500 font-medium">Tổng số câu hỏi đề thi</div>
                  <div className="text-xl font-bold text-gray-900 mt-0.5">25 câu trắc nghiệm</div>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="text-gray-500 font-medium">Học viên đã đạt chuẩn lý thuyết</div>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">42 / 48 (87.5%)</div>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="text-gray-500 font-medium">Điểm trung bình toàn viện</div>
                  <div className="text-xl font-bold text-blue-700 mt-0.5">8.8 / 10</div>
                </div>
              </div>

              {/* Ngân hàng câu hỏi mẫu chuẩn y tế */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wide">
                    1. Đề thi trắc nghiệm mẫu (Module 1 - Giải phẫu & Kỹ thuật Vodder)
                  </h4>
                  <span className="text-[11px] text-amber-800 font-semibold px-2 py-0.5 bg-amber-100 rounded">
                    Thời gian làm bài: 30 phút
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Câu 1 */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <p className="font-bold text-gray-900">
                      Câu 1: Lực tác động tối ưu khi thực hiện động tác vuốt dẫn lưu bạch huyết theo kỹ thuật Vodder là bao nhiêu?
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 font-semibold text-emerald-800 flex items-center justify-between">
                        <span>A. Rất nhẹ, khoảng 30 - 40 mmHg (chỉ làm căng nhẹ lớp da bì)</span>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                        <span>B. Lực mạnh từ 80 - 100 mmHg tác động sâu vào khối cơ</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                        <span>C. Ấn day điểm huyệt liên tục với lực tăng dần</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                        <span>D. Tùy thuộc vào ngưỡng chịu đau của bệnh nhân</span>
                      </div>
                    </div>
                  </div>

                  {/* Câu 2 */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <p className="font-bold text-gray-900">
                      Câu 2: Trường hợp nào sau đây là CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI của liệu trình dẫn lưu bạch huyết MLD?
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                        <span>A. Phù nề nhẹ sau phẫu thuật hút mỡ 3 tuần</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 font-semibold text-emerald-800 flex items-center justify-between">
                        <span>B. Viêm tĩnh mạch huyết khối cấp tính (DVT) & suy tim mất bù</span>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                        <span>C. Mệt mỏi căng thẳng sau ngày làm việc</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-gray-200">
                        <span>D. Phù nề chân lành sau phẫu thuật thay khớp</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng điểm học viên mẫu */}
              <div className="pt-2">
                <h4 className="font-bold text-gray-800 uppercase tracking-wide mb-2">
                  2. Bảng tổng hợp điểm thi lý thuyết lớp K26-MLD-HANOI
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 font-semibold">
                        <th className="py-2 px-3">Học viên</th>
                        <th className="py-2 px-3 text-center">Số câu đúng</th>
                        <th className="py-2 px-3 text-center">Điểm số</th>
                        <th className="py-2 px-3 text-center">Kết quả</th>
                        <th className="py-2 px-3 text-right">Điều kiện thi thực hành</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-gray-900">Nguyễn Thị Mai</td>
                        <td className="py-2 px-3 text-center font-mono">24 / 25</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-sky-700">9.6 / 10</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">XUẤT SẮC</span>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">✓ Đủ điều kiện</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-gray-900">Trần Thu Trang</td>
                        <td className="py-2 px-3 text-center font-mono">22 / 25</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-sky-700">8.8 / 10</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">GIỎI</span>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">✓ Đủ điều kiện</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-gray-900">Phạm Hoàng Oanh</td>
                        <td className="py-2 px-3 text-center font-mono">23 / 25</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-sky-700">9.2 / 10</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">XUẤT SẮC</span>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">✓ Đủ điều kiện</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: BẢO MẬT VIDEO & DYNAMIC WATERMARK SIMULATOR                      */}
      {/* ========================================================================= */}
      {isVideoSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Bảo Mật Bản Quyền Video & Watermark Động
                  </h3>
                  <p className="text-xs text-gray-500">
                    Ngăn chặn quay lén màn hình & chống leak video bài giảng độc quyền Viện MLD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoSecurityModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Configuration Settings */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 block">Kích hoạt Watermark động cá nhân hóa</span>
                    <span className="text-gray-500 text-[11px]">Tự động chèn thông tin học viên di chuyển ngẫu nhiên trên khung hình video</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isWatermarkActive}
                    onChange={(e) => setIsWatermarkActive(e.target.checked)}
                    className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Mẫu cấu trúc Watermark:</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-xl bg-white font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-gray-700">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-sky-600" />
                    <span>Khóa chuột phải & chặn tải video: <strong>BẬT</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>Tần suất nhảy vị trí: <strong>15 giây / lần</strong></span>
                  </div>
                </div>
              </div>

              {/* LIVE VIDEO PLAYER SIMULATOR */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-gray-900">Mô phỏng trình phát video bài giảng:</span>
                  <span className="text-sky-700 font-mono text-[11px] animate-pulse">
                    ● Watermark đang tự động đổi vị trí...
                  </span>
                </div>

                <div className="relative w-full aspect-video bg-gray-950 rounded-2xl overflow-hidden border-2 border-gray-800 shadow-inner flex items-center justify-center">
                  {/* Fake Video Screen */}
                  <div className="text-center text-gray-600 select-none">
                    <PlayCircle className="w-16 h-16 mx-auto mb-2 text-gray-700 opacity-60" />
                    <p className="text-xs font-semibold text-gray-400">MLD VIDEO PLAYER ENGINE · BẢN QUYỀN VIỆN MLD VIỆT NAM</p>
                    <p className="text-[10px] text-gray-600">Bài 04: Kỹ thuật miết xoay tròn & dẫn lưu hạch nách sau phẫu thuật</p>
                  </div>

                  {/* FLOATING WATERMARK SIMULATOR */}
                  {isWatermarkActive && (
                    <div
                      className={`absolute transition-all duration-700 ease-in-out pointer-events-none ${
                        watermarkPos === 0
                          ? 'top-4 left-4'
                          : watermarkPos === 1
                          ? 'top-4 right-4'
                          : watermarkPos === 2
                          ? 'bottom-8 right-4'
                          : 'bottom-8 left-4'
                      }`}
                    >
                      <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-xs text-white/70 font-mono text-[11px] border border-white/20 shadow-md">
                        {watermarkText}
                      </div>
                    </div>
                  )}

                  {/* Player bottom bar */}
                  <div className="absolute bottom-0 inset-x-0 h-6 bg-gray-900/90 flex items-center px-3 justify-between text-[10px] text-gray-400">
                    <span>14:20 / 45:00</span>
                    <span className="text-emerald-400 font-mono">1080p HD · DRM Protected</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsVideoSecurityModalOpen(false);
                  showToast('Đã lưu cấu hình bảo mật video bản quyền thành công!');
                }}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                Lưu cấu hình bảo mật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
