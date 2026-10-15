import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { staffService, academyService, StaffWithProfile } from '../services';
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

const instructorsData: InstructorRecord[] = [
  {
    id: 'gv-1',
    initials: 'TH',
    name: 'Nguyễn Thanh Hương',
    code: 'GV-MH-001',
    role: 'Giảng viên kỹ thuật Spa',
    specialty: 'Massage chuyên nghiệp',
    assignedClasses: {
      line1: 'MCN-0926 · Đang học',
      line2: 'MCN-1026 · Dự kiến',
    },
    branch: 'Quận 3',
    assignmentStatus: 'Có phân công mẫu',
    badgeLabel: 'Có phân công mẫu',

    detailRoleBadge: 'Giảng viên kỹ thuật Spa',
    programTitle: 'Kỹ thuật Massage Chuyên Nghiệp',
    currentClass: 'MCN-0926',
    upcomingClass: 'MCN-1026',
    newClassStartDate: '23/10/2026',
    nextPracticeSession: '16/10/2026',
    timeSlot: '13:00–17:00',
    room: 'Thực hành 02',

    availabilityTitle: 'Đối chiếu lịch trước khi phân công',
    availabilityContent:
      'Trong tuần chọn, Hương có buổi 16/10/2026, 13:00–17:00. MCN-1026 chỉ bắt đầu từ 23/10/2026.',
  },
  {
    id: 'gv-2',
    initials: 'MC',
    name: 'Trần Minh Châu',
    code: 'GV-MH-002',
    role: 'Hồ sơ giả định',
    specialty: 'Chăm sóc da',
    assignedClasses: {
      line1: 'Chuyên đề mẫu',
      line2: '14/10/2026',
    },
    branch: 'Quận 3',
    assignmentStatus: 'Có phân công mẫu',
    badgeLabel: 'Có phân công mẫu',

    detailRoleBadge: 'Giảng viên Chăm sóc da',
    programTitle: 'Kỹ thuật Chăm Sóc Da Chuyên Sâu',
    currentClass: 'CSD-0926',
    upcomingClass: 'CSD-1026',
    newClassStartDate: '25/10/2026',
    nextPracticeSession: '14/10/2026',
    timeSlot: '09:00–12:00',
    room: 'Thực hành 01',

    availabilityTitle: 'Đối chiếu lịch trước khi phân công',
    availabilityContent:
      'Trong tuần chọn, Châu có buổi 14/10/2026, 09:00–12:00. CSD-1026 chỉ bắt đầu từ 25/10/2026.',
  },
  {
    id: 'gv-3',
    initials: 'QB',
    name: 'Lê Quốc Bảo',
    code: 'GV-MH-003',
    role: 'Hồ sơ giả định',
    specialty: 'Chăm sóc cơ thể',
    assignedClasses: {
      line1: 'Chuyên đề mẫu',
      line2: '15/10/2026',
    },
    branch: 'Quận 3',
    assignmentStatus: 'Có phân công mẫu',
    badgeLabel: 'Có phân công mẫu',

    detailRoleBadge: 'Giảng viên Kỹ thuật Cơ thể',
    programTitle: 'Kỹ thuật Chăm Sóc Cơ Thể Thảo Dược',
    currentClass: 'CTC-0926',
    upcomingClass: 'CTC-1026',
    newClassStartDate: '27/10/2026',
    nextPracticeSession: '15/10/2026',
    timeSlot: '09:00–12:00',
    room: 'Thực hành 03',

    availabilityTitle: 'Đối chiếu lịch trước khi phân công',
    availabilityContent:
      'Trong tuần chọn, Bảo có buổi 15/10/2026, 09:00–12:00. CTC-1026 chỉ bắt đầu từ 27/10/2026.',
  },
];

const weeklyTeachingSchedule = [
  {
    id: 'ws-1',
    dateTime: '14/10/2026 · 09:00–12:00',
    description: 'Trần Minh Châu · Chuyên đề chăm sóc da · Phòng thực hành 01',
  },
  {
    id: 'ws-2',
    dateTime: '15/10/2026 · 09:00–12:00',
    description: 'Lê Quốc Bảo · Chuyên đề cơ thể · Phòng thực hành 03',
  },
  {
    id: 'ws-3',
    dateTime: '16/10/2026 · 13:00–17:00',
    description: 'Nguyễn Thanh Hương · MCN-0926 · Phòng thực hành 02',
  },
];

export const W09_Instructors: React.FC = () => {
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('gv-1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');

  const [liveInstructors, setLiveInstructors] = useState<StaffWithProfile[]>([]);
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);

  useEffect(() => {
    const fetchInstructorData = async () => {
      try {
        const [instRes, crsRes, batRes] = await Promise.all([
          staffService.getInstructors(),
          academyService.getCourses(),
          academyService.getCourseBatches(),
        ]);
        if (instRes.success) setLiveInstructors(instRes.data);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
      } catch (err) {
        console.error('Failed to load instructor data:', err);
      }
    };
    fetchInstructorData();
  }, []);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Selected instructor
  const selectedInstructor =
    instructorsData.find((ins) => ins.id === selectedInstructorId) || instructorsData[0];

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
            Hồ sơ giảng viên, phân công lớp và lịch giảng dạy minh họa.
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
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap md:flex-nowrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên hoặc mã giảng viên..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Filter: Tất cả cơ sở */}
        <div className="relative shrink-0">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả cơ sở</option>
            <option value="quận 3">Quận 3</option>
            <option value="quận 1">Quận 1</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Chuyên môn */}
        <div className="relative shrink-0">
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Chuyên môn</option>
            <option value="massage">Massage chuyên nghiệp</option>
            <option value="chăm sóc da">Chăm sóc da</option>
            <option value="chăm sóc cơ thể">Chăm sóc cơ thể</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Trạng thái phân công */}
        <div className="relative shrink-0">
          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Trạng thái phân công</option>
            <option value="có phân công mẫu">Có phân công mẫu</option>
            <option value="chưa phân công">Chưa phân công</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 3. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Giảng viên table + Lịch giảng dạy tuần */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Giảng viên trong danh sách mẫu */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            {/* Header of Table Card */}
            <div className="p-5 pb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2C241E]">
                Giảng viên trong danh sách mẫu
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                {filteredInstructors.length} bản ghi mẫu
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
              <span>Hiển thị {filteredInstructors.length} / {instructorsData.length} bản ghi minh họa</span>
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
              Chuyên đề của Minh Châu và Quốc Bảo là dữ liệu mới giả định; không trùng giảng viên hoặc phòng với MCN-0926.
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
                  {selectedInstructor.initials}
                </div>
                <div>
                  <div className="font-bold text-xs text-[#2C241E]">
                    {selectedInstructor.name}
                  </div>
                  <div className="text-[11px] text-[#73675F] mt-0.5">
                    {selectedInstructor.code} · {selectedInstructor.branch}
                  </div>
                </div>
              </div>

              <div>
                <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                  {selectedInstructor.detailRoleBadge}
                </span>
              </div>
            </div>

            {/* Program Title */}
            <div className="text-xs font-bold text-[#2C241E] pt-1 border-t border-[#EFE4D9]">
              {selectedInstructor.programTitle}
            </div>

            {/* Detail key-values */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Lớp đang giảng dạy</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor.currentClass}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Lớp sắp phân công</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor.upcomingClass}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Ngày mở lớp mới</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor.newClassStartDate}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Buổi thực hành kế tiếp</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor.nextPracticeSession}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Thời gian</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor.timeSlot}</span>
              </div>
              <div className="flex items-center justify-between text-[#73675F]">
                <span>Phòng</span>
                <span className="text-[#2C241E] font-medium">{selectedInstructor.room}</span>
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
              Hồ sơ, vai trò và phân công đều là minh họa, không xác nhận bằng cấp hoặc chứng chỉ nghề.
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
                {selectedInstructor.availabilityTitle}
              </div>
              <div className="text-xs text-[#73675F] leading-relaxed">
                {selectedInstructor.availabilityContent}
              </div>
            </div>

            {/* Note below box */}
            <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
              Các khung giờ ngoài lịch hiển thị chưa được xác nhận là khả dụng. Không có thực hiện phân công tự động.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>
          Dữ liệu minh họa · Các thao tác chỉ là giao diện tĩnh, không thay đổi dữ liệu hay thực hiện giao dịch.
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
              onSubmit={(e) => {
                e.preventDefault();
                setIsAddModalOpen(false);
                showToast('Đã thêm hồ sơ giảng viên minh họa thành công!');
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Họ và tên giảng viên</label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Bác sĩ Nguyễn Hoàng Quân"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Mã giảng viên</label>
                  <input
                    type="text"
                    defaultValue="GV-MH-004"
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
                <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                  <option value="massage">Massage chuyên nghiệp & Dẫn lưu bạch huyết</option>
                  <option value="skincare">Chăm sóc da nâng cao & Trị liệu da</option>
                  <option value="body">Chăm sóc cơ thể & Dưỡng sinh y học</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Bằng cấp / Chứng chỉ hành nghề</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chứng chỉ hành nghề Y học cổ truyền, Chứng chỉ CIDESCO"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="p-3 bg-[#FAF5EF] rounded-xl text-[11px] text-[#73675F]">
                Dữ liệu giảng viên sẽ được đồng bộ vào danh sách mẫu và phân bổ phòng thực hành phù hợp.
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
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Lưu hồ sơ
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
                  Phân công lớp · {selectedInstructor.name}
                </h3>
                <p className="text-xs text-[#73675F] mt-0.5">
                  {selectedInstructor.code} · {selectedInstructor.detailRoleBadge}
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
              onSubmit={(e) => {
                e.preventDefault();
                setIsAssignModalOpen(false);
                showToast(`Đã phân công lớp cho ${selectedInstructor.name} thành công!`);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Khóa học / Lớp đào tạo</label>
                <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                  <option value="mcn1026">{selectedInstructor.upcomingClass} · Khóa mới (Dự kiến {selectedInstructor.newClassStartDate})</option>
                  <option value="mcn1126">Khóa đào tạo chuyên sâu tháng 11/2026</option>
                  <option value="workshop">Workshop thực hành kỹ thuật chuyên đề</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Phòng thực hành</label>
                  <select defaultValue={selectedInstructor.room} className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="Thực hành 01">Phòng Thực hành 01</option>
                    <option value="Thực hành 02">Phòng Thực hành 02</option>
                    <option value="Thực hành 03">Phòng Thực hành 03</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Khung giờ giảng dạy</label>
                  <input
                    type="text"
                    defaultValue={selectedInstructor.timeSlot}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Ghi chú đối chiếu lịch</label>
                <div className="p-3 bg-[#FAF5EF] rounded-xl border border-[#EFE4D9] text-[#73675F] leading-relaxed">
                  {selectedInstructor.availabilityContent}
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
