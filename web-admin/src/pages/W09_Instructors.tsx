import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  CheckCircle2,
  Search,
  Settings2,
  CalendarX,
} from 'lucide-react';
import { academyService, supabaseService } from '../services';
import { Course, CourseBatch } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

export interface ScheduleItem {
  id: string;
  batchId: string;
  instructorId?: string | null;
  batchCode: string;
  courseTitle: string;
  instructorName: string;
  dateTime: string;
  description: string;
}

interface InstructorRecord {
  id: string;
  initials: string;
  name: string;
  code: string;
  role: string;
  specialty: string;
  assignedClasses: {
    line1: string;
    line2: string;
  };
  hasAssignedClasses: boolean;
  assignedBatchesCount: number;
  branch: string;
  assignmentStatus: string;
  badgeLabel: string;

  // Detail panel info
  detailRoleBadge: string;
  programTitle: string;
  currentClass: string;
  upcomingClass: string;
  newClassStartDate: string;
  nextPracticeSession: string;
  timeSlot: string;
  room: string;

  // Availability & Notes
  availabilityTitle: string;
  availabilityContent: string;
}

const defaultInstructor: InstructorRecord = {
  id: '',
  initials: 'GV',
  name: 'Chưa có thông tin giảng viên',
  code: 'GV-MLD',
  role: 'Giảng viên chuyên môn',
  specialty: 'Đào tạo trị liệu MLD',
  assignedClasses: {
    line1: 'Chưa phân công',
    line2: 'Chưa có lịch',
  },
  hasAssignedClasses: false,
  assignedBatchesCount: 0,
  branch: 'Quận 3',
  assignmentStatus: 'chưa phân công',
  badgeLabel: 'Chưa phân công',
  detailRoleBadge: 'Giảng viên chuyên môn',
  programTitle: 'Khóa Đào Tạo Kỹ Thuật Viên Spa',
  currentClass: 'Chưa phân công',
  upcomingClass: 'Chưa có lớp mới',
  newClassStartDate: '-',
  nextPracticeSession: '-',
  timeSlot: 'Chưa có lịch',
  room: 'Phòng Thực Hành Lâm Sàng',
  availabilityTitle: 'Lịch giảng dạy phân bổ',
  availabilityContent: 'Hồ sơ giảng viên đang được cập nhật trên hệ thống.',
};

export const W09_Instructors: React.FC = () => {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [dbInstructors, setDbInstructors] = useState<any[]>([]);
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);

  const fetchInstructorData = async () => {
    try {
      const [instRes, crsRes, batRes] = await Promise.all([
        supabaseService.getInstructors(),
        academyService.getCourses(),
        academyService.getCourseBatches(),
      ]);
      if (instRes && instRes.length > 0) {
        setDbInstructors(instRes);
      }
      if (crsRes.success) setLiveCourses(crsRes.data);
      if (batRes.success) setLiveBatches(batRes.data);
    } catch (err) {
      console.error('Failed to load instructor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const instructorsData: InstructorRecord[] = useMemo(() => {
    if (!dbInstructors || dbInstructors.length === 0) {
      return [];
    }

    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));

    return dbInstructors.map((ins, idx) => {
      const name = ins.fullName || ins.full_name || ins.user?.fullName || ins.user?.full_name || 'Giảng viên MLD';
      const initials = name
        .split(' ')
        .filter(Boolean)
        .map((p: string) => p[0])
        .slice(-2)
        .join('')
        .toUpperCase() || 'GV';

      // Chỉ lấy các lớp THỰC SỰ được phân công cho giảng viên này
      const batchesForIns = liveBatches.filter(
        (b) => b.instructorId === ins.id
      );

      const hasAssigned = batchesForIns.length > 0;
      const b1 = batchesForIns[0];
      const b2 = batchesForIns[1];
      const c1 = b1 ? crsMap.get(b1.courseId) : null;
      const c2 = b2 ? crsMap.get(b2.courseId) : null;

      const line1 = b1
        ? `${b1.batchCode} · ${b1.status === 'UPCOMING' ? 'Đang tuyển sinh' : 'Đang giảng dạy'}`
        : 'Chưa phân công';
      const line2 = b2
        ? `${b2.batchCode} · Sắp mở lớp`
        : (hasAssigned ? 'Chưa có lớp mới' : 'Chưa có lịch');

      const assignmentStatus = hasAssigned ? 'có lớp phân công' : 'chưa phân công';
      const badgeLabel = hasAssigned ? 'Đang giảng dạy' : 'Chưa phân công';

      const currentClass = b1 ? `${b1.batchCode}${c1?.title ? ` - ${c1.title}` : ''}` : 'Chưa phân công';
      const upcomingClass = b2 ? `${b2.batchCode}${c2?.title ? ` - ${c2.title}` : ''}` : (hasAssigned ? 'Chưa có lớp mới' : 'Chưa có');

      const newClassStartDate = b2?.startDate
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(b2.startDate))
        : (b1?.startDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(b1.startDate)) : '-');

      const nextPracticeSession = b1?.startDate
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(b1.startDate))
        : '-';

      const timeSlot = b1?.scheduleText || (hasAssigned ? 'Theo thời khóa biểu' : 'Chưa có lịch');
      const programTitle = c1?.title || ins.achievements?.[0] || 'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuyên Nghiệp';

      return {
        id: ins.id,
        initials,
        name,
        code: `GV-MLD-00${idx + 1}`,
        role: ins.title || 'Master Trainer Thẩm mỹ & Dưỡng sinh',
        specialty: ins.achievements?.[0] || 'Massage & Dưỡng sinh chuẩn Y khoa',
        assignedClasses: {
          line1,
          line2,
        },
        hasAssignedClasses: hasAssigned,
        assignedBatchesCount: batchesForIns.length,
        branch: 'Quận 3',
        assignmentStatus,
        badgeLabel,
        detailRoleBadge: ins.title || 'Master Trainer Giám đốc Đào tạo',
        programTitle,
        currentClass,
        upcomingClass,
        newClassStartDate,
        nextPracticeSession,
        timeSlot,
        room: 'Phòng Thực Hành Lâm Sàng · Quận 3',
        availabilityTitle: 'Lịch giảng dạy phân bổ tối ưu',
        availabilityContent: ins.bio || 'Hơn 10 năm kinh nghiệm huấn luyện kỹ thuật viên spa chuyên nghiệp chuẩn Y khoa.',
      };
    });
  }, [dbInstructors, liveCourses, liveBatches]);

  const weeklyTeachingSchedule: ScheduleItem[] = useMemo(() => {
    if (!liveBatches || liveBatches.length === 0) return [];
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));
    const insMap = new Map(dbInstructors.map((i) => [i.id, i.fullName || i.full_name || 'Giảng viên']));

    // Filter only batches that have an assigned instructor and schedule text
    const activeBatches = liveBatches.filter(
      (b) => Boolean(b.instructorId && b.scheduleText && b.scheduleText.trim().length > 0)
    );

    return activeBatches.map((b, idx) => {
      const crs = crsMap.get(b.courseId);
      const insName = b.instructorId ? (insMap.get(b.instructorId) || 'Giảng viên') : 'Chưa phân công GV';
      const dateStr = b.startDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(b.startDate)) : 'Sắp xếp';
      return {
        id: `ws-${b.id || idx}`,
        batchId: b.id,
        instructorId: b.instructorId,
        batchCode: b.batchCode,
        courseTitle: crs?.title || b.batchCode,
        instructorName: insName,
        dateTime: `${b.scheduleText || 'Lịch định kỳ'} · Bắt đầu ${dateStr}`,
        description: `${insName} · ${crs?.title || b.batchCode} · Phòng thực hành Quận 3`,
      };
    });
  }, [liveBatches, liveCourses, dbInstructors]);

  useEffect(() => {
    if (instructorsData.length > 0 && (!selectedInstructorId || !instructorsData.some((i) => i.id === selectedInstructorId))) {
      setSelectedInstructorId(instructorsData[0].id);
    }
  }, [instructorsData, selectedInstructorId]);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [cancelTargetSchedule, setCancelTargetSchedule] = useState<ScheduleItem | null>(null);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Assignment modal states
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [assignRoom, setAssignRoom] = useState<string>('Phòng Thực Hành Lâm Sàng · Quận 3');
  const [assignScheduleText, setAssignScheduleText] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Selected instructor with guaranteed fallback
  const selectedInstructor: InstructorRecord =
    instructorsData.find((ins) => ins.id === selectedInstructorId) ||
    instructorsData[0] ||
    defaultInstructor;

  // Filtering
  const hasActiveFilter =
    searchTerm.trim().length > 0 ||
    branchFilter !== 'all' ||
    specialtyFilter !== 'all' ||
    assignmentFilter !== 'all';

  const filteredInstructors = instructorsData.filter((ins) => {
    const matchSearchQuery = matchSearch(
      [ins.name, ins.code, ins.role, ins.specialty, ins.branch, ins.programTitle],
      searchTerm
    );
    const matchBranch = branchFilter === 'all' || matchSearch(ins.branch, branchFilter);
    const matchSpecialty =
      specialtyFilter === 'all' || matchSearch(ins.specialty, specialtyFilter);
    const matchAssignment =
      assignmentFilter === 'all' || matchSearch(ins.assignmentStatus, assignmentFilter);

    return matchSearchQuery && matchBranch && matchSpecialty && matchAssignment;
  });

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  const handleOpenAssignModal = () => {
    // Nếu giảng viên đã có lớp phân công, chọn lớp đó trước
    const assigned = liveBatches.filter((b) => b.instructorId === selectedInstructor.id);
    if (assigned.length > 0) {
      setSelectedBatchId(assigned[0].id);
      setAssignScheduleText(assigned[0].scheduleText || '');
    } else {
      // Ưu tiên chọn lớp chưa có giảng viên
      const unassigned = liveBatches.find((b) => !b.instructorId);
      const target = unassigned || liveBatches[0];
      setSelectedBatchId(target ? target.id : '');
      setAssignScheduleText(target ? (target.scheduleText || '') : '');
    }
    setAssignRoom('Phòng Thực Hành Lâm Sàng · Quận 3');
    setIsAssignModalOpen(true);
  };

  const handleAssignClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) {
      showToast('Vui lòng chọn lớp học cần phân công');
      return;
    }
    setIsAssigning(true);
    try {
      if (selectedBatchId === '__unassign__') {
        const currentBatches = liveBatches.filter((b) => b.instructorId === selectedInstructor.id);
        for (const b of currentBatches) {
          await supabaseService.updateCourseBatch(b.id, { instructorId: null });
        }
        showToast(`Đã gỡ phân công lớp cho ${selectedInstructor.name}`);
      } else {
        const batch = liveBatches.find((b) => b.id === selectedBatchId);
        const ok = await supabaseService.updateCourseBatch(selectedBatchId, {
          instructorId: selectedInstructor.id,
          scheduleText: assignScheduleText.trim() || batch?.scheduleText || undefined,
        });
        if (ok) {
          showToast(`Đã phân công lớp ${batch?.batchCode || ''} cho ${selectedInstructor.name} thành công!`);
        } else {
          showToast('Không thể cập nhật phân công. Vui lòng thử lại.');
        }
      }
      setIsAssignModalOpen(false);
      await fetchInstructorData();
    } catch (err) {
      console.error('Error assigning class:', err);
      showToast('Có lỗi xảy ra khi phân công lớp.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRequestCancelSchedule = (schedule: ScheduleItem) => {
    setCancelTargetSchedule(schedule);
  };

  const handleConfirmCancelSchedule = async () => {
    if (!cancelTargetSchedule) return;
    setIsCanceling(true);
    try {
      const ok = await supabaseService.updateCourseBatch(cancelTargetSchedule.batchId, {
        instructorId: null,
        scheduleText: null,
      });

      if (ok) {
        showToast(`Đã hủy lịch giảng dạy lớp ${cancelTargetSchedule.batchCode} thành công!`);
        setCancelTargetSchedule(null);
        await fetchInstructorData();
      } else {
        showToast('Không thể hủy lịch giảng dạy. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Error canceling schedule:', err);
      showToast('Có lỗi xảy ra khi hủy lịch giảng dạy.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCancelSelectedInstructorSchedule = () => {
    const assignedBatches = liveBatches.filter((b) => b.instructorId === selectedInstructor.id);
    if (assignedBatches.length === 0) {
      showToast('Giảng viên này hiện chưa được phân công lớp nào.');
      return;
    }
    const targetBatch = assignedBatches[0];
    const crs = liveCourses.find((c) => c.id === targetBatch.courseId);
    const dateStr = targetBatch.startDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(targetBatch.startDate)) : 'Sắp xếp';
    setCancelTargetSchedule({
      id: `ws-${targetBatch.id}`,
      batchId: targetBatch.id,
      instructorId: targetBatch.instructorId,
      batchCode: targetBatch.batchCode,
      courseTitle: crs?.title || targetBatch.batchCode,
      instructorName: selectedInstructor.name,
      dateTime: `${targetBatch.scheduleText || 'Lịch định kỳ'} · Bắt đầu ${dateStr}`,
      description: `${selectedInstructor.name} · ${crs?.title || targetBatch.batchCode} · Phòng thực hành Quận 3`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-3 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-9 h-9 border-3 border-[#D8C4B2] border-t-[#8A4F23] rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#8A4F23]">Đang nạp hồ sơ giảng viên MLD từ Supabase Cloud...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#2C241E] text-white px-4 py-3 rounded-xl shadow-lg border border-[#D7BBA6] flex items-center gap-2.5 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#E29D62]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Giảng viên</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Hồ sơ giảng viên, phân công lớp và lịch giảng dạy học viện MLD.
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
            placeholder="Tìm tên hoặc mã giảng viên..."
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

        {/* Filter: Tất cả cơ sở */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả cơ sở</option>
            <option value="quận 3">Quận 3</option>
            <option value="quận 1">Quận 1</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Chuyên môn */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Chuyên môn</option>
            <option value="massage">Massage chuyên nghiệp</option>
            <option value="chăm sóc da">Chăm sóc da</option>
            <option value="chăm sóc cơ thể">Chăm sóc cơ thể</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Trạng thái phân công */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Trạng thái phân công</option>
            <option value="có lớp phân công">Đang giảng dạy</option>
            <option value="chưa phân công">Chưa phân công</option>
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
              setSpecialtyFilter('all');
              setAssignmentFilter('all');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Đặt lại bộ lọc"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* 3. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Giảng viên table + Lịch giảng dạy tuần */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Giảng viên trong hệ thống đào tạo */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            {/* Header of Table Card */}
            <div className="p-5 pb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2C241E]">
                Danh sách đội ngũ giảng viên
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                {filteredInstructors.length} giảng viên
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9] whitespace-nowrap">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Giảng viên</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Chuyên môn</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Lớp được phân công</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Cơ sở / trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs whitespace-nowrap">
                  {filteredInstructors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#73675F]">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy giảng viên</p>
                          <p className="text-xs text-[#8C7A6B]">
                            {searchTerm.trim()
                              ? `Không có giảng viên nào khớp với từ khóa "${searchTerm}".`
                              : 'Không có giảng viên nào phù hợp với bộ lọc.'}
                          </p>
                          {hasActiveFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm('');
                                setBranchFilter('all');
                                setSpecialtyFilter('all');
                                setAssignmentFilter('all');
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
                    filteredInstructors.map((ins) => {
                      const isSelected = ins.id === selectedInstructorId;
                      return (
                        <tr
                          key={ins.id}
                          onClick={() => setSelectedInstructorId(ins.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#FBF6F0]' : 'bg-white hover:bg-[#FAF6F0]'
                          }`}
                        >
                        {/* 1. Giảng viên */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            <div className="w-8 h-8 rounded-full bg-[#EAD8C7] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0">
                              {ins.initials}
                            </div>
                            <div className="whitespace-nowrap">
                              <div className="font-semibold text-xs text-[#2C241E] whitespace-nowrap">
                                {ins.name}
                              </div>
                              <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                                {ins.code} · {ins.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Chuyên môn */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] whitespace-nowrap">
                            {ins.specialty}
                          </div>
                        </td>

                        {/* 3. Lớp được phân công */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className={`text-xs whitespace-nowrap ${ins.hasAssignedClasses ? 'font-semibold text-[#2C241E]' : 'text-[#8C7A6B] italic'}`}>
                            {ins.assignedClasses.line1}
                          </div>
                          {ins.assignedClasses.line2 && ins.assignedClasses.line2 !== 'Chưa có lớp mới' && ins.assignedClasses.line2 !== 'Chưa có lịch' && (
                            <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                              {ins.assignedClasses.line2}
                            </div>
                          )}
                        </td>

                        {/* 4. Cơ sở / trạng thái */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] whitespace-nowrap">{ins.branch}</div>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                            ins.hasAssignedClasses
                              ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                              : 'bg-[#FAF3EC] text-[#8A4F23] border border-[#EFE4D9]'
                          }`}>
                            {ins.badgeLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Pagination */}
            <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
              <span>Hiển thị {filteredInstructors.length} / {instructorsData.length} giảng viên</span>
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

          {/* Card 2: Lịch giảng dạy tuần · 12/10/2026 – 18/10/2026 */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2C241E]">
                Lịch giảng dạy tuần · 12/10/2026 – 18/10/2026
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF3EC] text-[#8A4F23] border border-[#EFE4D9]">
                {weeklyTeachingSchedule.length} lịch giảng dạy
              </span>
            </div>

            <div className="space-y-3">
              {weeklyTeachingSchedule.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF5EF] rounded-2xl border border-dashed border-[#D7BBA6] space-y-2">
                  <CalendarX className="w-8 h-8 text-[#A69788] mx-auto stroke-[1.5]" />
                  <p className="text-xs font-bold text-[#2C241E]">Chưa có lịch giảng dạy nào trong tuần</p>
                  <p className="text-[11px] text-[#73675F]">
                    Tất cả các lớp đào tạo hiện tại chưa phân công giảng viên hoặc đã hoàn tất.
                  </p>
                </div>
              ) : (
                weeklyTeachingSchedule.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-[#F5EADF] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group border border-transparent hover:border-[#D7BBA6] transition-all"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[#2C241E] flex flex-wrap items-center gap-2">
                        <span>{schedule.dateTime}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EAD8C7] text-[#8A4F23]">
                          {schedule.batchCode}
                        </span>
                      </div>
                      <div className="text-xs text-[#73675F]">
                        {schedule.description}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRequestCancelSchedule(schedule)}
                      className="shrink-0 self-start sm:self-auto px-3 py-1.5 rounded-xl border border-[#D7BBA6] bg-white text-[#8A4F23] hover:bg-[#FAF5EF] hover:text-[#DC2626] hover:border-[#FECACA] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title={`Hủy lịch giảng dạy lớp ${schedule.batchCode}`}
                    >
                      <CalendarX className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>Hủy lịch dạy</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footnote below schedule cards */}
            <div className="text-xs text-[#73675F] pt-1">
              Lịch giảng dạy thực hành được đối chiếu trực tiếp theo các lớp học đang diễn ra tại cơ sở.
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Giảng viên đang chọn + Khả dụng & lưu ý */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Giảng viên đang chọn */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-base font-bold text-[#2C241E]">
              Giảng viên đang chọn
            </h2>

            {/* Profile Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAD8C7] text-[#8A4F23] font-bold text-sm flex items-center justify-center shrink-0">
                  {selectedInstructor?.initials || 'GV'}
                </div>
                <div>
                  <div className="font-bold text-xs text-[#2C241E]">
                    {selectedInstructor?.name || 'Giảng viên'}
                  </div>
                  <div className="text-[11px] text-[#73675F] mt-0.5">
                    {selectedInstructor?.code || 'GV-MLD'} · {selectedInstructor?.branch || 'Quận 3'}
                  </div>
                </div>
              </div>

              <div>
                <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                  {selectedInstructor?.detailRoleBadge || 'Chuyên gia Đào tạo'}
                </span>
              </div>
            </div>

            {/* Program Title */}
            <div className="text-xs font-bold text-[#2C241E] pt-1 border-t border-[#EFE4D9]">
              {selectedInstructor?.programTitle || 'Khóa Đào Tạo Kỹ Thuật Viên Spa'}
            </div>

            {/* Detail key-values */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Trạng thái phân công</span>
                {selectedInstructor.hasAssignedClasses ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                    <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
                    Đã phân công ({selectedInstructor.assignedBatchesCount} lớp)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF3EC] text-[#8A4F23] border border-[#EFE4D9]">
                    Chưa phân công lớp
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Lớp đang giảng dạy</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.currentClass || 'Chưa phân công'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Lớp sắp phân công</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.upcomingClass || 'Chưa có lớp mới'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Ngày mở lớp mới</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.newClassStartDate || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Buổi thực hành kế tiếp</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.nextPracticeSession || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Thời gian</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.timeSlot || 'Chưa có lịch'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Phòng</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.room || 'Phòng Thực Hành'}</span>
              </div>
            </div>

            {/* Action Button: Phân công lớp / Điều chỉnh phân công */}
            {selectedInstructor.hasAssignedClasses ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[11px] text-[#166534]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Lớp phụ trách: {selectedInstructor.currentClass}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAssignModal}
                    className="w-full py-2.5 px-2 bg-[#FAF5EF] hover:bg-[#F3E7D8] text-[#8D4B1A] border border-[#D7BBA6] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Điều chỉnh lớp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSelectedInstructorSchedule}
                    className="w-full py-2.5 px-2 bg-white hover:bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Hủy lịch giảng dạy của giảng viên này"
                  >
                    <CalendarX className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Hủy lịch dạy</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenAssignModal}
                className="w-full py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
              >
                Phân công lớp
              </button>
            )}

            {/* Disclaimer note under button */}
            <div className="text-[11px] text-[#73675F] leading-relaxed pt-0.5 text-center sm:text-left">
              Hồ sơ giảng viên & chuyên gia đào tạo thuộc chuỗi học viện MLD Vietnam.
            </div>
          </div>

          {/* Card 2: Khả dụng & lưu ý */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-base font-bold text-[#2C241E]">
              Khả dụng & lưu ý
            </h2>

            {/* Alert box */}
            <div className="bg-[#F5EADF] rounded-2xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-[#2C241E]">
                {selectedInstructor?.availabilityTitle || 'Lịch giảng dạy phân bổ tối ưu'}
              </div>
              <div className="text-xs text-[#73675F] leading-relaxed">
                {selectedInstructor?.availabilityContent || 'Các khung giờ ngoài lịch hiển thị cần xác nhận trước với phòng Đào tạo.'}
              </div>
            </div>

            {/* Note below box */}
            <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
              Các khung giờ ngoài lịch hiển thị cần xác nhận trước với phòng Đào tạo trước khi xếp lớp bổ sung.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>
          Hệ thống quản lý giảng viên & phân công lớp học • MLD Vietnam Healthcare Admin.
        </span>
      </div>

      {/* MODAL: Xác nhận hủy lịch dạy */}
      {cancelTargetSchedule && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-md shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0">
                <CalendarX className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">
                  Xác nhận hủy lịch giảng dạy?
                </h3>
                <p className="text-xs text-[#73675F] mt-0.5">
                  Gỡ phân công và xóa lịch giảng dạy của lớp học
                </p>
              </div>
            </div>

            <div className="bg-[#FAF5EF] rounded-xl p-3.5 border border-[#EFE4D9] space-y-2 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[#73675F] shrink-0">Lớp / Khóa học:</span>
                <span className="font-bold text-[#2C241E] text-right">
                  {cancelTargetSchedule.courseTitle} ({cancelTargetSchedule.batchCode})
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[#73675F] shrink-0">Giảng viên:</span>
                <span className="font-bold text-[#8A4F23]">
                  {cancelTargetSchedule.instructorName}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[#73675F] shrink-0">Thời gian:</span>
                <span className="font-medium text-[#2C241E]">
                  {cancelTargetSchedule.dateTime}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#73675F] leading-relaxed">
              Lịch giảng dạy này sẽ được gỡ khỏi giảng viên <strong>{cancelTargetSchedule.instructorName}</strong> và xóa khỏi thời khóa biểu tuần. Lớp học sẽ chuyển về trạng thái chờ phân công lại.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EFE4D9]">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setCancelTargetSchedule(null)}
                className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={handleConfirmCancelSchedule}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCanceling ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <>
                    <CalendarX className="w-3.5 h-3.5" />
                    <span>Xác nhận hủy lịch dạy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Phân công lớp */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">
                  {selectedInstructor.hasAssignedClasses ? 'Điều chỉnh phân công lớp' : 'Phân công lớp giảng dạy'} · {selectedInstructor.name}
                </h3>
                <p className="text-xs text-[#73675F] mt-0.5">
                  {selectedInstructor.code} · {selectedInstructor.detailRoleBadge || 'Giảng viên'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAssignClass}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Khóa học / Lớp đào tạo cần phân công</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setSelectedBatchId(bId);
                    const found = liveBatches.find((b) => b.id === bId);
                    if (found && found.scheduleText) {
                      setAssignScheduleText(found.scheduleText);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  {liveBatches.length === 0 ? (
                    <option value="" disabled>Chưa có lớp đào tạo nào trong hệ thống</option>
                  ) : (
                    liveBatches.map((b) => {
                      const crs = liveCourses.find((c) => c.id === b.courseId);
                      const isCurrent = b.instructorId === selectedInstructor.id;
                      const otherIns = b.instructorId && !isCurrent
                        ? dbInstructors.find((i) => i.id === b.instructorId)?.fullName || 'Giảng viên khác'
                        : null;
                      return (
                        <option key={b.id} value={b.id}>
                          {b.batchCode} · {crs?.title || 'Khóa học'} {isCurrent ? '★ (Đang phân cho GV này)' : otherIns ? `(Đang phân cho: ${otherIns})` : '(Chưa có GV)'}
                        </option>
                      );
                    })
                  )}
                  {selectedInstructor.hasAssignedClasses && (
                    <option value="__unassign__">-- Hủy phân công (Gỡ lớp hiện tại khỏi giảng viên này) --</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Phòng thực hành</label>
                  <select
                    value={assignRoom}
                    onChange={(e) => setAssignRoom(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="Phòng Thực Hành Lâm Sàng · Quận 3">Phòng Thực Hành Lâm Sàng · Quận 3</option>
                    <option value="Phòng Thực Hành 01">Phòng Thực Hành 01</option>
                    <option value="Phòng Thực Hành 02">Phòng Thực Hành 02</option>
                    <option value="Phòng Thực Hành Quận 1">Phòng Thực Hành Quận 1</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Khung giờ giảng dạy</label>
                  <input
                    type="text"
                    value={assignScheduleText}
                    onChange={(e) => setAssignScheduleText(e.target.value)}
                    placeholder="Ví dụ: Thứ 2 - Thứ 6 (Chiều 13:30 - 16:30)"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Ghi chú đối chiếu lịch</label>
                <div className="p-3 bg-[#FAF5EF] rounded-xl border border-[#EFE4D9] text-[#73675F] leading-relaxed text-[11px]">
                  Hệ thống tự động đồng bộ phân công lớp và thời khóa biểu của giảng viên lên Supabase Cloud để các bộ phận Đào tạo, Tuyển sinh và Học viên cùng theo dõi.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2.5">
                {selectedInstructor.hasAssignedClasses ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAssignModalOpen(false);
                      handleCancelSelectedInstructorSchedule();
                    }}
                    className="text-[#DC2626] hover:text-[#B91C1C] flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <CalendarX className="w-3.5 h-3.5" />
                    <span>Hủy lịch dạy lớp này</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isAssigning ? 'Đang lưu...' : selectedBatchId === '__unassign__' ? 'Xác nhận gỡ phân công' : 'Xác nhận phân công'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
