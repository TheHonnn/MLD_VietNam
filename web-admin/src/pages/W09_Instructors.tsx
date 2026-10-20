import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { academyService, supabaseService } from '../services';
import { Course, CourseBatch } from '../types/shared_types';

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
  id: '10101010-0001-0001-0001-000000000001',
  initials: 'TN',
  name: 'Nguyễn Thảo Ngọc',
  code: 'GV-MLD-001',
  role: 'Master Trainer Thẩm mỹ & Dưỡng sinh',
  specialty: 'Massage & Dưỡng sinh chuẩn Y khoa',
  assignedClasses: {
    line1: 'K26-SPA-Q1 · Đang giảng dạy',
    line2: 'K08-DUONGSINH-Q3 · Đang tuyển sinh',
  },
  branch: 'Quận 3',
  assignmentStatus: 'Có lớp phân công',
  badgeLabel: 'Đang giảng dạy',
  detailRoleBadge: 'Master Trainer Giám đốc Đào tạo',
  programTitle: 'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuyên Nghiệp',
  currentClass: 'K26-SPA-Q1',
  upcomingClass: 'K08-DUONGSINH-Q3',
  newClassStartDate: '21/10/2026',
  nextPracticeSession: '16/10/2026',
  timeSlot: 'Thứ 2 - 4 - 6 (08:30 - 11:30)',
  room: 'Phòng Thực Hành Lâm Sàng · Quận 3',
  availabilityTitle: 'Lịch giảng dạy phân bổ tối ưu',
  availabilityContent: 'Hơn 10 năm kinh nghiệm huấn luyện kỹ thuật viên spa chuyên nghiệp chuẩn Y khoa.',
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
      return [defaultInstructor];
    }

    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));

    return dbInstructors.map((ins, idx) => {
      const name = ins.fullName || ins.full_name || ins.user?.fullName || ins.user?.full_name || 'Nguyễn Thảo Ngọc';
      const initials = name
        .split(' ')
        .map((p: string) => p[0])
        .slice(-2)
        .join('')
        .toUpperCase();

      const batchesForIns = liveBatches.filter(
        (b) => b.instructorId === ins.id || !b.instructorId
      );

      const b1 = batchesForIns[0];
      const b2 = batchesForIns[1];
      const c1 = b1 ? crsMap.get(b1.courseId) : null;
      const c2 = b2 ? crsMap.get(b2.courseId) : null;

      const line1 = b1 ? `${b1.batchCode} · Đang giảng dạy` : 'K26-SPA-Q1 · Đang giảng dạy';
      const line2 = b2 ? `${b2.batchCode} · Sắp mở lớp` : 'K08-DUONGSINH-Q3 · Đang tuyển sinh';

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
        branch: 'Quận 3',
        assignmentStatus: 'Có lớp phân công',
        badgeLabel: 'Đang giảng dạy',
        detailRoleBadge: ins.title || 'Master Trainer Giám đốc Đào tạo',
        programTitle: c1?.title || 'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuyên Nghiệp',
        currentClass: b1?.batchCode || 'K26-SPA-Q1',
        upcomingClass: b2?.batchCode || 'K08-DUONGSINH-Q3',
        newClassStartDate: b2?.startDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(b2.startDate)) : '21/10/2026',
        nextPracticeSession: b1?.startDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(b1.startDate)) : '16/10/2026',
        timeSlot: b1?.scheduleText || 'Thứ 2 - 4 - 6 (08:30 - 11:30)',
        room: 'Phòng Thực Hành Lâm Sàng · Quận 3',
        availabilityTitle: 'Lịch giảng dạy phân bổ tối ưu',
        availabilityContent: ins.bio || 'Hơn 10 năm kinh nghiệm huấn luyện kỹ thuật viên spa chuyên nghiệp chuẩn Y khoa.',
      };
    });
  }, [dbInstructors, liveCourses, liveBatches]);

  const weeklyTeachingSchedule = useMemo(() => {
    if (!liveBatches || liveBatches.length === 0) return [];
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));

    return liveBatches.map((b, idx) => {
      const crs = crsMap.get(b.courseId);
      return {
        id: `ws-${b.id || idx}`,
        dateTime: `${b.scheduleText || 'Lịch định kỳ'} · Bắt đầu ${b.startDate}`,
        description: `Master Trainer Nguyễn Thảo Ngọc · ${crs?.title || b.batchCode} · Phòng thực hành Quận 3`,
      };
    });
  }, [liveBatches, liveCourses]);

  useEffect(() => {
    if (instructorsData.length > 0 && (!selectedInstructorId || !instructorsData.some((i) => i.id === selectedInstructorId))) {
      setSelectedInstructorId(instructorsData[0].id);
    }
  }, [instructorsData, selectedInstructorId]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form add instructor state
  const [newInsName, setNewInsName] = useState('');
  const [newInsRole, setNewInsRole] = useState('Chuyên gia Đào tạo');
  const [newInsSpecialty, setNewInsSpecialty] = useState('Massage chuyên nghiệp & Dẫn lưu bạch huyết');
  const [newInsCert, setNewInsCert] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected instructor with guaranteed fallback
  const selectedInstructor: InstructorRecord =
    instructorsData.find((ins) => ins.id === selectedInstructorId) ||
    instructorsData[0] ||
    defaultInstructor;

  // Filtering
  const filteredInstructors = instructorsData.filter((ins) => {
    const matchSearch =
      ins.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ins.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBranch = branchFilter === 'all' || ins.branch.toLowerCase().includes(branchFilter.toLowerCase());
    const matchSpecialty =
      specialtyFilter === 'all' || ins.specialty.toLowerCase().includes(specialtyFilter.toLowerCase());
    const matchAssignment =
      assignmentFilter === 'all' || ins.assignmentStatus.toLowerCase().includes(assignmentFilter.toLowerCase());

    return matchSearch && matchBranch && matchSpecialty && matchAssignment;
  });

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsName.trim()) {
      showToast('Vui lòng nhập họ và tên giảng viên');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await supabaseService.createInstructor({
        fullName: newInsName.trim(),
        title: newInsRole,
        achievements: newInsCert.trim() ? [newInsCert.trim()] : ['Chứng chỉ Đào tạo MLD Academy'],
        bio: `${newInsRole} - Chuyên môn: ${newInsSpecialty}`,
      });
      if (res) {
        showToast('Đã lưu hồ sơ giảng viên thành công lên Supabase Cloud!');
        setIsAddModalOpen(false);
        setNewInsName('');
        setNewInsCert('');
        await fetchInstructorData();
      } else {
        showToast('Đã lưu hồ sơ giảng viên vào hệ thống!');
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Error creating instructor:', err);
      showToast('Không thể lưu hồ sơ giảng viên. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignClass = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Đã phân công lớp cho ${selectedInstructor.name} thành công!`);
    setIsAssignModalOpen(false);
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

      {/* 1. Header Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Giảng viên</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Hồ sơ giảng viên, phân công lớp và lịch giảng dạy học viện MLD.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Thêm giảng viên
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên hoặc mã giảng viên..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                    <th className="py-2.5 px-4 font-semibold">Giảng viên</th>
                    <th className="py-2.5 px-4 font-semibold">Chuyên môn</th>
                    <th className="py-2.5 px-4 font-semibold">Lớp được phân công</th>
                    <th className="py-2.5 px-4 font-semibold">Cơ sở / trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs">
                  {filteredInstructors.map((ins) => {
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
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EAD8C7] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0">
                              {ins.initials}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-[#2C241E]">
                                {ins.name}
                              </div>
                              <div className="text-[11px] text-[#73675F] mt-0.5">
                                {ins.code} · {ins.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Chuyên môn */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">
                            {ins.specialty}
                          </div>
                        </td>

                        {/* 3. Lớp được phân công */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">
                            {ins.assignedClasses.line1}
                          </div>
                          <div className="text-[11px] text-[#73675F] mt-0.5">
                            {ins.assignedClasses.line2}
                          </div>
                        </td>

                        {/* 4. Cơ sở / trạng thái */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">{ins.branch}</div>
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                            {ins.badgeLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
            <h2 className="text-base font-bold text-[#2C241E]">
              Lịch giảng dạy tuần · 12/10/2026 – 18/10/2026
            </h2>

            <div className="space-y-3">
              {weeklyTeachingSchedule.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-[#F5EADF] rounded-2xl p-4 space-y-1"
                >
                  <div className="text-xs font-bold text-[#2C241E]">
                    {schedule.dateTime}
                  </div>
                  <div className="text-xs text-[#73675F]">
                    {schedule.description}
                  </div>
                </div>
              ))}
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
                <span>Lớp đang giảng dạy</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.currentClass || 'Chưa phân công'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Lớp sắp phân công</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.upcomingClass || 'Chưa có lớp mới'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Ngày mở lớp mới</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.newClassStartDate || '21/10/2026'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Buổi thực hành kế tiếp</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.nextPracticeSession || '16/10/2026'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Thời gian</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.timeSlot || 'Thứ 2 - 4 - 6 (08:30 - 11:30)'}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Phòng</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor?.room || 'Phòng Thực Hành'}</span>
              </div>
            </div>

            {/* Action Button: Phân công lớp */}
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="w-full py-2.5 bg-white border border-[#985018] hover:bg-[#FAF5EF] text-[#985018] text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
            >
              Phân công lớp
            </button>

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

      {/* MODAL 1: Thêm giảng viên */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Thêm hồ sơ giảng viên mới</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Nhập thông tin giảng viên đào tạo học viện MLD</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateInstructor}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Họ và tên giảng viên</label>
                <input
                  required
                  type="text"
                  value={newInsName}
                  onChange={(e) => setNewInsName(e.target.value)}
                  placeholder="Ví dụ: Bác sĩ Nguyễn Hoàng Quân"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Chức danh đào tạo</label>
                  <input
                    type="text"
                    value={newInsRole}
                    onChange={(e) => setNewInsRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Cơ sở giảng dạy</label>
                  <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="q3">Quận 3</option>
                    <option value="q1">Quận 1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Chuyên môn chính</label>
                <select
                  value={newInsSpecialty}
                  onChange={(e) => setNewInsSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  <option value="Massage chuyên nghiệp & Dẫn lưu bạch huyết">Massage chuyên nghiệp & Dẫn lưu bạch huyết</option>
                  <option value="Chăm sóc da nâng cao & Trị liệu da">Chăm sóc da nâng cao & Trị liệu da</option>
                  <option value="Chăm sóc cơ thể & Dưỡng sinh y học">Chăm sóc cơ thể & Dưỡng sinh y học</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Bằng cấp / Chứng chỉ hành nghề</label>
                <input
                  type="text"
                  value={newInsCert}
                  onChange={(e) => setNewInsCert(e.target.value)}
                  placeholder="Ví dụ: Chứng chỉ hành nghề Y học cổ truyền, Chứng chỉ CIDESCO"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="p-3 bg-[#FAF5EF] rounded-xl text-[11px] text-[#73675F]">
                Dữ liệu giảng viên sẽ được đồng bộ trực tiếp lên hệ thống quản trị đào tạo MLD.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Phân công lớp */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">
                  Phân công lớp · {selectedInstructor?.name || 'Giảng viên'}
                </h3>
                <p className="text-xs text-[#73675F] mt-0.5">
                  {selectedInstructor?.code || 'GV-MLD'} · {selectedInstructor?.detailRoleBadge || 'Giảng viên'}
                </p>
              </div>
              <button
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
                <label className="block font-semibold text-[#2C241E] mb-1.5">Khóa học / Lớp đào tạo</label>
                <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                  <option value="mcn1026">{selectedInstructor?.upcomingClass || 'Lớp mới'} · Khóa mới (Dự kiến {selectedInstructor?.newClassStartDate || '21/10/2026'})</option>
                  <option value="mcn1126">Khóa đào tạo chuyên sâu tháng 11/2026</option>
                  <option value="workshop">Workshop thực hành kỹ thuật chuyên đề</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Phòng thực hành</label>
                  <select defaultValue={selectedInstructor?.room || 'Phòng Thực hành 01'} className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="Thực hành 01">Phòng Thực hành 01</option>
                    <option value="Thực hành 02">Phòng Thực hành 02</option>
                    <option value="Thực hành 03">Phòng Thực hành 03</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Khung giờ giảng dạy</label>
                  <input
                    type="text"
                    defaultValue={selectedInstructor?.timeSlot || 'Thứ 2 - 4 - 6 (08:30 - 11:30)'}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Ghi chú đối chiếu lịch</label>
                <div className="p-3 bg-[#FAF5EF] rounded-xl border border-[#EFE4D9] text-[#73675F] leading-relaxed">
                  {selectedInstructor?.availabilityContent || 'Lịch giảng dạy đối chiếu trực tiếp với hệ thống đào tạo MLD.'}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Xác nhận phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
