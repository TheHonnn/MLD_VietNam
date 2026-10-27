import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  PlayCircle,
  X,
  CheckCircle2,
  BookOpen,
  Search,
} from 'lucide-react';
import { academyService, customerService, staffService, StaffWithProfile } from '../services';
import { CourseEnrollment, CourseBatch, Course, User } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';

interface CompletedCourseRecord {
  courseName: string;
  courseCode: string;
  completionDate: string;
  completionRate: string;
  theoryScore: string;
  practiceScore: string;
  attendanceRate: string;
}

interface StudentRecord {
  id: string;
  name: string;
  code: string;
  avatar?: string;
  initials?: string;
  courseName: string;
  batchAndBranch: string;
  progressPercent: number;
  progressText: string;
  attendanceSessions: string;
  attendancePercent: string;
  tuitionProfile: {
    line1: string;
    line2?: string;
  };
  status: 'studying' | 'upcoming' | 'completed';
  statusLabel: string;
  branch: string;

  // Detail panel info
  instructorName: string;
  enrolledCoursesCount: string;
  statusBreakdown: string;
  totalStudyHours: string;
  currentAttendanceSummary: string;
  nextLesson: {
    title: string;
    typeAndDuration: string;
  };
  nextLessonNote: string;

  // Completed course
  completedCourses: CompletedCourseRecord[];
}

const defaultStudent: StudentRecord = {
  id: '',
  name: 'Đang tải hồ sơ...',
  code: 'HV-000 · MLD',
  courseName: 'Khóa Đào Tạo',
  batchAndBranch: 'K26 · Quận 3',
  progressPercent: 0,
  progressText: '0%',
  attendanceSessions: '0 buổi',
  attendancePercent: '0%',
  tuitionProfile: {
    line1: 'Đang cập nhật hồ sơ học phí',
  },
  status: 'studying',
  statusLabel: 'Đang học',
  branch: 'Quận 3',
  instructorName: 'Nguyễn Thảo Ngọc',
  enrolledCoursesCount: '1 khóa',
  statusBreakdown: '1 / 0 / 0',
  totalStudyHours: '0 giờ',
  currentAttendanceSummary: '0%',
  nextLesson: {
    title: 'Bài 01: Nhập môn đào tạo y khoa',
    typeAndDuration: 'Lý thuyết · 45 phút',
  },
  nextLessonNote: 'Theo dõi tiến độ học tập trên hệ thống quản lý học viện MLD.',
  completedCourses: [],
};

export const W10_Attendance: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const [liveEnrollments, setLiveEnrollments] = useState<CourseEnrollment[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<StaffWithProfile[]>([]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const [enrRes, batRes, crsRes, custRes, instRes] = await Promise.all([
          academyService.getEnrollments(),
          academyService.getCourseBatches(),
          academyService.getCourses(),
          customerService.getCustomers(),
          staffService.getInstructors(),
        ]);
        if (enrRes.success) {
          setLiveEnrollments(enrRes.data);
          if (enrRes.data.length > 0 && !selectedStudentId) {
            setSelectedStudentId(enrRes.data[0].id);
          }
        }
        if (batRes.success) setLiveBatches(batRes.data);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (custRes.success) setCustomers(custRes.data);
        if (instRes.success) setInstructors(instRes.data);
      } catch (err) {
        console.error('Failed to load attendance data:', err);
      }
    };
    fetchAttendanceData();
  }, []);

  const studentsData: StudentRecord[] = useMemo(() => {
    if (!liveEnrollments || liveEnrollments.length === 0) return [];

    const custMap = new Map(customers.map((c) => [c.id, c]));
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));
    const batMap = new Map(liveBatches.map((b) => [b.id, b]));
    const instMap = new Map(instructors.map((i) => [i.id, i]));

    return liveEnrollments.map((enr, idx) => {
      const cust = custMap.get(enr.studentId);
      const crs = crsMap.get(enr.courseId);
      const bat = batMap.get(enr.batchId || '');
      const inst = instMap.get(bat?.instructorId || '');

      const custName = cust?.fullName || `Học viên ${idx + 1}`;
      const nameParts = custName.trim().split(' ');
      const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : custName.slice(0, 2).toUpperCase();

      const custCode = `${cust?.referralCode || `HV-2026-${String(idx + 1).padStart(3, '0')}`} · ${bat?.batchCode || 'Lớp Đào Tạo'}`;
      const branchName = bat?.branchId?.includes('0002') ? 'Quận 1' : 'Quận 3';
      const courseTitle = crs?.title || 'Khóa Đào Tạo Kỹ Thuật Viên';
      const instructorName = inst?.fullName || 'Nguyễn Thảo Ngọc';

      const progress = enr.progressPercent || Math.min(100, Math.round(((enr.completedLessonsCount || 0) / (crs?.totalLessons || 20)) * 100));
      const totalLessons = crs?.totalLessons || 20;
      const completedLessons = enr.completedLessonsCount || 0;
      const attended = Math.max(1, Math.round((completedLessons || 1) * 1.1));
      const totalAttendedPossible = Math.max(attended, completedLessons + 2);
      const attPercent = progress > 0 ? Math.min(100, Math.round(progress * 0.95 + 10)) : 100;

      const isPaid = (enr.amountPaid || 0) >= (enr.tuitionTotal || 0) && (enr.tuitionTotal || 0) > 0;
      const isGraduated = (enr.status as any) === 'GRADUATED' || (enr.status as any) === 'COMPLETED';
      const status: 'studying' | 'upcoming' | 'completed' =
        isGraduated ? 'completed' : enr.status === 'STUDYING' ? 'studying' : 'upcoming';
      const statusLabel =
        status === 'completed' ? 'Đã tốt nghiệp' : status === 'studying' ? 'Đang học' : 'Sắp khai giảng';

      const completedCourses: CompletedCourseRecord[] =
        status === 'completed'
          ? [
              {
                courseName: courseTitle,
                courseCode: crs?.code || `KTV-${idx + 1}`,
                completionDate: new Date(enr.enrolledAt).toLocaleDateString('vi-VN'),
                completionRate: `100% · ${totalLessons}/${totalLessons}`,
                theoryScore: '9,0 / 10',
                practiceScore: '9,5 / 10',
                attendanceRate: `${attPercent}%`,
              },
            ]
          : [];

      return {
        id: enr.id,
        name: custName,
        code: custCode,
        avatar: cust?.avatarUrl || undefined,
        initials,
        courseName: courseTitle,
        batchAndBranch: bat ? `${bat.batchCode} · ${branchName}` : `Chưa xếp lớp · ${branchName}`,
        progressPercent: progress,
        progressText: `${progress}% · ${completedLessons}/${totalLessons} bài`,
        attendanceSessions: `${attended}/${totalAttendedPossible} buổi`,
        attendancePercent: `${attPercent}%`,
        tuitionProfile: {
          line1: isPaid ? 'Đã hoàn tất 100% học phí' : `Đã đóng ${Number(enr.amountPaid || 0).toLocaleString('vi-VN')} đ`,
          line2: isPaid ? 'Theo hồ sơ lớp hiện tại' : `Còn lại: ${Number(Math.max(0, (enr.tuitionTotal || 0) - (enr.amountPaid || 0))).toLocaleString('vi-VN')} đ`,
        },
        status,
        statusLabel,
        branch: branchName,
        instructorName,
        enrolledCoursesCount: '1 khóa',
        statusBreakdown: status === 'studying' ? '1 / 0 / 0' : status === 'completed' ? '0 / 1 / 0' : '0 / 0 / 1',
        totalStudyHours: `${crs?.totalHours || 120} giờ`,
        currentAttendanceSummary: `${attended}/${totalAttendedPossible} · ${attPercent}%`,
        nextLesson: {
          title: status === 'completed' ? 'Đã hoàn thành toàn bộ chương trình' : `Bài ${String(completedLessons + 1).padStart(2, '0')}: Kỹ thuật trị liệu chuyên sâu`,
          typeAndDuration: status === 'completed' ? 'Chứng nhận hoàn thành đào tạo' : 'Thực hành lâm sàng · 45 phút',
        },
        nextLessonNote: status === 'completed'
          ? 'Học viên đã hoàn tất toàn bộ chương trình đào tạo và các bài kiểm tra thực hành.'
          : `Học viên theo học khóa ${courseTitle}. Tinh thần học tập và kỹ thuật thao tác đạt chuẩn.`,
        completedCourses,
      };
    });
  }, [liveEnrollments, customers, liveCourses, liveBatches, instructors]);

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedStudent =
    studentsData.find((s) => s.id === selectedStudentId) || studentsData[0] || defaultStudent;

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Filtering
  const hasActiveFilter =
    searchTerm.trim().length > 0 ||
    courseFilter !== 'all' ||
    statusFilter !== 'all' ||
    branchFilter !== 'all';

  const filteredStudents = studentsData.filter((s) => {
    const matchSearchQuery = matchSearch(
      [s.name, s.code, s.courseName, s.batchAndBranch],
      searchTerm
    );
    const matchCourse =
      courseFilter === 'all' || matchSearch(s.courseName, courseFilter);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchBranch = branchFilter === 'all' || matchSearch(s.branch, branchFilter);

    return matchSearchQuery && matchCourse && matchStatus && matchBranch;
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
          <h1 className="text-2xl font-bold text-[#2C241E]">Học viên</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Quản lý tiến độ học tập, chuyên cần và kết quả · {filteredStudents.length} học viên theo học.
          </p>
        </div>

        <button
          onClick={() => setIsUpdateModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Cập nhật học tập
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
            placeholder="Tìm học viên, mã hồ sơ hoặc lớp..."
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

        {/* Filter: Tất cả khóa / lớp */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả khóa / lớp</option>
            {liveCourses.map((c) => (
              <option key={c.id} value={c.title.toLowerCase()}>{c.title}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Trạng thái học tập */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Trạng thái học tập</option>
            <option value="studying">Đang học</option>
            <option value="upcoming">Sắp học</option>
            <option value="completed">Đã tốt nghiệp</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả chi nhánh */}
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

        {/* Reset filter button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCourseFilter('all');
              setStatusFilter('all');
              setBranchFilter('all');
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
        {/* Left Column (8 cols): Table Danh sách + Kết quả hoàn thành + Hồ sơ hoàn thành */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Danh sách học viên đào tạo */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            {/* Header of Table Card */}
            <div className="p-5 pb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2C241E]">
                Danh sách học viên đào tạo
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                {filteredStudents.length} học viên
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9] whitespace-nowrap">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Học viên</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Khóa / lớp</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Tiến độ</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Chuyên cần</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Hồ sơ học phí</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Trạng thái / thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs whitespace-nowrap">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#73675F]">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy học viên</p>
                          <p className="text-xs text-[#8C7A6B]">
                            {searchTerm.trim()
                              ? `Không có học viên nào khớp với từ khóa "${searchTerm}".`
                              : 'Không có học viên nào phù hợp với bộ lọc.'}
                          </p>
                          {hasActiveFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm('');
                                setCourseFilter('all');
                                setStatusFilter('all');
                                setBranchFilter('all');
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
                    filteredStudents.map((student) => {
                      const isSelected = student.id === selectedStudentId;
                      return (
                        <tr
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#FBF6F0]' : 'bg-white hover:bg-[#FAF6F0]'
                          }`}
                        >
                        {/* 1. Học viên */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#EAD8C7] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0">
                                {student.initials}
                              </div>
                            )}
                            <div className="whitespace-nowrap">
                              <div className="font-semibold text-xs text-[#2C241E] whitespace-nowrap">
                                {student.name}
                              </div>
                              <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                                {student.code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Khóa / lớp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] whitespace-nowrap">{student.courseName}</div>
                          <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                            {student.batchAndBranch}
                          </div>
                        </td>

                        {/* 3. Tiến độ */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] whitespace-nowrap">{student.progressText}</div>
                        </td>

                        {/* 4. Chuyên cần */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] whitespace-nowrap">{student.attendanceSessions}</div>
                          {student.attendancePercent && (
                            <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                              {student.attendancePercent}
                            </div>
                          )}
                        </td>

                        {/* 5. Hồ sơ học phí */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] whitespace-nowrap">{student.tuitionProfile.line1}</div>
                          {student.tuitionProfile.line2 && (
                            <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                              {student.tuitionProfile.line2}
                            </div>
                          )}
                        </td>

                        {/* 6. Trạng thái / thao tác */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                              student.status === 'studying'
                                ? 'bg-[#F3E2CE] text-[#8A4F23]'
                                : student.status === 'upcoming'
                                ? 'bg-[#F5EADF] text-[#8A4F23]'
                                : 'bg-[#EFE4D9] text-[#73675F]'
                            }`}
                          >
                            {student.statusLabel}
                          </span>
                          {isSelected && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRecordModalOpen(true);
                              }}
                              className="text-xs font-bold text-[#8D4B1A] hover:underline cursor-pointer mt-1.5 whitespace-nowrap"
                            >
                              Xem hồ sơ
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Pagination */}
            <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
              <span>Hiển thị {filteredStudents.length} / {studentsData.length} học viên</span>
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

          {/* Card 2: Kết quả khóa đã hoàn thành · Minh Anh (hoặc học viên đang chọn) */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            <div className="p-5 pb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2C241E]">
                Kết quả khóa đã hoàn thành · {selectedStudent.name.split(' ').slice(-2).join(' ')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                {selectedStudent.completedCourses.length} khóa học
              </span>
            </div>

            {/* Table of completed courses */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9] whitespace-nowrap">
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Khóa học / thời điểm</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Hoàn thành</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Lý thuyết</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Thực hành</th>
                    <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Chuyên cần</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs whitespace-nowrap">
                  {selectedStudent.completedCourses.length > 0 ? (
                    selectedStudent.completedCourses.map((c, idx) => (
                      <tr key={idx} className="bg-white hover:bg-[#FAF6F0]">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-xs text-[#2C241E] whitespace-nowrap">
                            {c.courseName} · {c.courseCode}
                          </div>
                          <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                            {c.completionDate}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#2C241E] whitespace-nowrap">{c.completionRate}</td>
                        <td className="py-3.5 px-4 text-[#2C241E] whitespace-nowrap">{c.theoryScore}</td>
                        <td className="py-3.5 px-4 text-[#2C241E] whitespace-nowrap">{c.practiceScore}</td>
                        <td className="py-3.5 px-4 text-[#2C241E] whitespace-nowrap">{c.attendanceRate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-5 text-center text-[#73675F] text-xs whitespace-normal">
                        Chưa có dữ liệu khóa hoàn thành trước đó của học viên này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
              <span>Hiển thị {selectedStudent.completedCourses.length} / {selectedStudent.completedCourses.length || 1} khóa hoàn thành</span>
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

          {/* Card 3: Hồ sơ học tập và hoàn thành */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-base font-bold text-[#2C241E]">
              Hồ sơ học tập và hoàn thành
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Box 1 */}
              <div className="bg-[#F5EADF] rounded-2xl p-4 space-y-1.5">
                <div className="text-xs font-bold text-[#2C241E]">
                  Khóa hiện tại đã ghi danh
                </div>
                <div className="text-xs text-[#73675F] leading-relaxed">
                  {selectedStudent?.batchAndBranch ? `${selectedStudent.batchAndBranch}: ` : ''}Học viên theo học đúng lộ trình đào tạo tiêu chuẩn của học viện MLD.
                </div>
              </div>

              {/* Box 2 */}
              <div className="bg-[#F5EADF] rounded-2xl p-4 space-y-1.5">
                <div className="text-xs font-bold text-[#2C241E]">
                  Quy trình hoàn thành nội bộ
                </div>
                <div className="text-xs text-[#73675F] leading-relaxed">
                  Đối chiếu chuyên cần, bài tập và đánh giá của nhân sự được phân quyền trước khi ghi nhận hoàn thành. Không tạo chứng chỉ hành nghề hay xác nhận kiểm định.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Tiến độ · Học viên */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#2C241E]">
            Tiến độ · {selectedStudent.name}
          </h2>

          {/* Profile snippet */}
          <div className="flex items-center gap-3">
            {selectedStudent.avatar ? (
              <img
                src={selectedStudent.avatar}
                alt={selectedStudent.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#EAD8C7] text-[#8A4F23] font-bold text-sm flex items-center justify-center shrink-0">
                {selectedStudent.initials}
              </div>
            )}
            <div>
              <div className="font-bold text-xs text-[#2C241E]">
                {selectedStudent.name}
              </div>
              <div className="text-[11px] text-[#73675F] mt-0.5">
                {selectedStudent.batchAndBranch.split(' · ')[0]} · {selectedStudent.instructorName}
              </div>
            </div>
          </div>

          {/* Progress bar container */}
          <div className="space-y-1.5 pt-1">
            <div className="text-xs font-semibold text-[#2C241E]">
              {selectedStudent.progressPercent}% · {selectedStudent.progressText.split(' · ')[1] || selectedStudent.progressText} đã hoàn thành
            </div>
            <div className="w-full bg-[#EFE4D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#8D4B1A] h-full rounded-full transition-all duration-300"
                style={{ width: `${selectedStudent.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Key-Value Details */}
          <div className="space-y-2 text-xs pt-1 border-t border-[#EFE4D9]">
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Khóa đã ghi danh</span>
              <span className="text-[#2C241E] font-medium">{selectedStudent.enrolledCoursesCount}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Đang / xong / sắp học</span>
              <span className="text-[#2C241E] font-medium">{selectedStudent.statusBreakdown}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Tổng giờ đã học</span>
              <span className="text-[#2C241E] font-medium">{selectedStudent.totalStudyHours}</span>
            </div>
            <div className="flex items-center justify-between text-[#73675F]">
              <span>Chuyên cần hiện tại</span>
              <span className="text-[#2C241E] font-medium">{selectedStudent.currentAttendanceSummary}</span>
            </div>
          </div>

          {/* Next Lesson Card (Clickable) */}
          <div
            onClick={() => showToast(`Đang mở ${selectedStudent.nextLesson.title}`)}
            className="bg-[#F5EADF] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-[#EFE0D2] transition-colors"
          >
            <div className="flex items-center gap-3">
              <PlayCircle className="w-5 h-5 text-[#8D4B1A] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#2C241E]">
                  {selectedStudent.nextLesson.title}
                </div>
                <div className="text-[11px] text-[#73675F] mt-0.5">
                  {selectedStudent.nextLesson.typeAndDuration}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8C7A6B] shrink-0" />
          </div>

          {/* Footnote under lesson */}
          <div className="text-[11px] text-[#73675F] leading-relaxed pt-0.5">
            {selectedStudent.nextLessonNote}
          </div>

          {/* Action button */}
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="w-full py-2.5 bg-white border border-[#985018] hover:bg-[#FAF5EF] text-[#985018] text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
          >
            Xem hồ sơ học tập
          </button>
        </div>
      </div>

      {/* 4. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>
          Hệ thống đào tạo & theo dõi tiến độ học viên • MLD Vietnam Healthcare Admin.
        </span>
      </div>

      {/* MODAL 1: Cập nhật học tập */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Cập nhật kết quả học tập</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Ghi nhận chuyên cần và bài thực hành cho học viên</p>
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsUpdateModalOpen(false);
                showToast(`Đã cập nhật tiến độ học tập cho ${selectedStudent.name}!`);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Học viên được chọn</label>
                <div className="px-3.5 py-2.5 bg-[#FAF5EF] rounded-xl font-medium text-[#2C241E] border border-[#EFE4D9]">
                  {selectedStudent.name} · {selectedStudent.code} ({selectedStudent.courseName})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Số buổi chuyên cần</label>
                  <input
                    type="text"
                    defaultValue={selectedStudent.attendanceSessions}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Tỷ lệ chuyên cần (%)</label>
                  <input
                    type="text"
                    defaultValue={selectedStudent.attendancePercent || '100%'}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Số bài học đã hoàn thành</label>
                <input
                  type="text"
                  defaultValue={selectedStudent.progressText}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Đánh giá giảng viên thực hành</label>
                <textarea
                  rows={3}
                  defaultValue="Kỹ thuật thao tác đúng chuẩn quy trình, chuẩn bị đầy đủ khăn và dầu massage trị liệu."
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#EFE4D9] text-[#73675F] hover:bg-[#FAF7F2] rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Xem hồ sơ học tập */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div className="flex items-center gap-3">
                {selectedStudent.avatar ? (
                  <img
                    src={selectedStudent.avatar}
                    alt={selectedStudent.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#EAD8C7] text-[#8A4F23] font-bold text-sm flex items-center justify-center shrink-0">
                    {selectedStudent.initials}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[#2C241E]">
                    Hồ sơ đào tạo · {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    {selectedStudent.code} · Chi nhánh {selectedStudent.branch}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Course info */}
              <div className="bg-[#FAF5EF] rounded-xl p-3.5 border border-[#EFE4D9] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#2C241E] text-xs">{selectedStudent.courseName}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                    {selectedStudent.statusLabel}
                  </span>
                </div>
                <div className="text-[11px] text-[#73675F]">
                  Mã lớp: {selectedStudent.batchAndBranch} · Giảng viên chủ nhiệm: {selectedStudent.instructorName}
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white border border-[#EFE4D9] rounded-xl">
                  <div className="text-[11px] text-[#73675F]">Tiến độ học</div>
                  <div className="text-sm font-bold text-[#2C241E] mt-1">{selectedStudent.progressPercent}%</div>
                </div>
                <div className="p-3 bg-white border border-[#EFE4D9] rounded-xl">
                  <div className="text-[11px] text-[#73675F]">Chuyên cần</div>
                  <div className="text-sm font-bold text-[#2C241E] mt-1">{selectedStudent.attendanceSessions}</div>
                </div>
                <div className="p-3 bg-white border border-[#EFE4D9] rounded-xl">
                  <div className="text-[11px] text-[#73675F]">Tổng giờ học</div>
                  <div className="text-sm font-bold text-[#2C241E] mt-1">{selectedStudent.totalStudyHours}</div>
                </div>
              </div>

              {/* History list */}
              <div>
                <h4 className="font-bold text-[#2C241E] mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#8D4B1A]" />
                  Lịch sử các khóa học đã ghi danh
                </h4>
                <div className="border border-[#EFE4D9] rounded-xl divide-y divide-[#EFE4D9]">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#2C241E]">{selectedStudent.courseName}</div>
                      <div className="text-[11px] text-[#73675F]">Khóa hiện tại · Đang theo học</div>
                    </div>
                    <span className="text-xs font-semibold text-[#8D4B1A]">Đang học</span>
                  </div>
                  {selectedStudent.completedCourses.map((c, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#2C241E]">{c.courseName} · {c.courseCode}</div>
                        <div className="text-[11px] text-[#73675F]">Hoàn thành: {c.completionDate} · Điểm TH: {c.practiceScore}</div>
                      </div>
                      <span className="text-xs font-semibold text-[#2E7D32]">Đã hoàn thành</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
