import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  PlayCircle,
  X,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { academyService } from '../services';
import { CourseEnrollment, CourseBatch } from '../types/shared_types';

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

const studentsData: StudentRecord[] = [
  {
    id: 'hv-1',
    name: 'Xuân Trường',
    code: 'HV-2026-001 · K26-SPA-Q1',
    avatar: '/avatar_truong.png',
    courseName: 'Massage Chuyên Nghiệp',
    batchAndBranch: 'K26-SPA-Q1 · Quận 3',
    progressPercent: 20,
    progressText: '20% · 4/20 bài',
    attendanceSessions: '8/9 buổi',
    attendancePercent: '88,9%',
    tuitionProfile: {
      line1: 'Theo hồ sơ lớp hiện tại',
      line2: 'Đã hoàn tất 100% học phí',
    },
    status: 'studying',
    statusLabel: 'Đang học',
    branch: 'Quận 3',

    instructorName: 'Lê Quỳnh Nga',
    enrolledCoursesCount: '3 khóa',
    statusBreakdown: '1 / 1 / 1',
    totalStudyHours: '120 giờ',
    currentAttendanceSummary: '8/9 · 88,9%',
    nextLesson: {
      title: 'Bài 05: Kỹ thuật Massage cơ bản',
      typeAndDuration: 'Video · 18 phút · Tiếp theo',
    },
    nextLessonNote:
      'Bài thực hành tiếp theo: kỹ thuật massage cơ bản. Bài nộp gần nhất: ôn quy trình phục vụ theo giáo trình chuẩn.',

    completedCourses: [
      {
        courseName: 'Massage Cơ Bản',
        courseCode: 'MCB-0726',
        completionDate: '28/08/2026',
        completionRate: '100% · 20/20',
        theoryScore: '8,5 / 10',
        practiceScore: '9 / 10',
        attendanceRate: '90%',
      },
    ],
  },
  {
    id: 'hv-2',
    name: 'Bùi Thảo Vy',
    code: 'HV-MH-201 · 09*** 215',
    initials: 'TV',
    courseName: 'Chăm sóc da · Mẫu',
    batchAndBranch: 'Lớp thực hành · Quận 3',
    progressPercent: 30,
    progressText: '30% · 6/20 bài',
    attendanceSessions: '5/6 buổi',
    attendancePercent: '83,3%',
    tuitionProfile: {
      line1: 'Chưa đối chiếu mẫu',
    },
    status: 'studying',
    statusLabel: 'Đang học',
    branch: 'Quận 3',

    instructorName: 'Trần Minh Châu',
    enrolledCoursesCount: '2 khóa',
    statusBreakdown: '1 / 1 / 0',
    totalStudyHours: '64 giờ',
    currentAttendanceSummary: '5/6 · 83,3%',
    nextLesson: {
      title: 'Bài 07: Kỹ thuật làm sạch sâu Hydrafacial',
      typeAndDuration: 'Thực hành · 45 phút · Tiếp theo',
    },
    nextLessonNote:
      'Bài thực hành tiếp theo: chuẩn bị da và làm sạch sâu. Đã hoàn thành phần lý thuyết cấu trúc biểu bì.',

    completedCourses: [
      {
        courseName: 'Chăm Sóc Da Căn Bản',
        courseCode: 'CSD-0626',
        completionDate: '15/07/2026',
        completionRate: '100% · 16/16',
        theoryScore: '9,0 / 10',
        practiceScore: '8,5 / 10',
        attendanceRate: '92%',
      },
    ],
  },
  {
    id: 'hv-3',
    name: 'Hoàng Gia Hân',
    code: 'HV-MH-202 · 08*** 439',
    initials: 'GH',
    courseName: 'Spa cơ bản · Mẫu',
    batchAndBranch: 'Lớp thực hành · Quận 3',
    progressPercent: 60,
    progressText: '60% · 12/20 bài',
    attendanceSessions: '6/6 buổi',
    attendancePercent: '100%',
    tuitionProfile: {
      line1: 'Chưa đối chiếu mẫu',
    },
    status: 'studying',
    statusLabel: 'Đang học',
    branch: 'Quận 3',

    instructorName: 'Lê Quốc Bảo',
    enrolledCoursesCount: '1 khóa',
    statusBreakdown: '1 / 0 / 0',
    totalStudyHours: '72 giờ',
    currentAttendanceSummary: '6/6 · 100%',
    nextLesson: {
      title: 'Bài 13: Quy trình massage thảo dược ấm',
      typeAndDuration: 'Thực hành phòng lab · 60 phút',
    },
    nextLessonNote:
      'Thao tác thuần thục, đạt tỷ lệ chuyên cần 100%. Chuẩn bị kiểm tra giữa kỳ lý thuyết & thực hành lâm sàng.',

    completedCourses: [],
  },
  {
    id: 'hv-4',
    name: 'Trịnh Tuấn Kiệt',
    code: 'HV-MH-203 · 09*** 527',
    initials: 'TK',
    courseName: 'Massage cơ bản · Mẫu',
    batchAndBranch: 'Khóa sắp mở · Quận 3',
    progressPercent: 0,
    progressText: '0% · Chưa bắt đầu',
    attendanceSessions: 'Chưa có buổi',
    attendancePercent: '',
    tuitionProfile: {
      line1: 'Chưa đối chiếu mẫu',
    },
    status: 'upcoming',
    statusLabel: 'Sắp học',
    branch: 'Quận 3',

    instructorName: 'Nguyễn Thanh Hương',
    enrolledCoursesCount: '1 khóa',
    statusBreakdown: '0 / 0 / 1',
    totalStudyHours: '0 giờ',
    currentAttendanceSummary: 'Chưa bắt đầu khóa',
    nextLesson: {
      title: 'Bài 01: Nhập môn giải phẫu học cơ thể',
      typeAndDuration: 'Lý thuyết · Khai giảng 23/10',
    },
    nextLessonNote:
      'Hồ sơ đã ghi danh và hoàn tất xếp lớp. Chờ khai giảng chính thức vào ngày 23/10/2026.',

    completedCourses: [],
  },
  {
    id: 'hv-5',
    name: 'Nguyễn Khánh Ly',
    code: 'HV-MH-204 · 09*** 814',
    initials: 'KL',
    courseName: 'Spa cơ bản · Mẫu',
    batchAndBranch: 'Khóa đã kết thúc · Quận 3',
    progressPercent: 100,
    progressText: '100% · 20/20 bài',
    attendanceSessions: '9/10 buổi',
    attendancePercent: '90%',
    tuitionProfile: {
      line1: 'Chưa đối chiếu mẫu',
    },
    status: 'completed',
    statusLabel: 'Hoàn thành mẫu',
    branch: 'Quận 3',

    instructorName: 'Nguyễn Thu Hà',
    enrolledCoursesCount: '2 khóa',
    statusBreakdown: '0 / 2 / 0',
    totalStudyHours: '160 giờ',
    currentAttendanceSummary: '9/10 · 90%',
    nextLesson: {
      title: 'Đã hoàn thành toàn bộ chương trình',
      typeAndDuration: 'Chứng nhận hoàn thành nội bộ',
    },
    nextLessonNote:
      'Học viên đã hoàn thành tất cả các bài kiểm tra thực hành lâm sàng và đủ điều kiện cấp chứng nhận hoàn thành nội bộ.',

    completedCourses: [
      {
        courseName: 'Spa Cơ Bản',
        courseCode: 'SCB-0826',
        completionDate: '30/09/2026',
        completionRate: '100% · 20/20',
        theoryScore: '9,2 / 10',
        practiceScore: '9,5 / 10',
        attendanceRate: '90%',
      },
    ],
  },
];

export const W10_Attendance: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('hv-1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const [liveEnrollments, setLiveEnrollments] = useState<CourseEnrollment[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const [enrRes, batRes] = await Promise.all([
          academyService.getEnrollments(),
          academyService.getCourseBatches(),
        ]);
        if (enrRes.success) setLiveEnrollments(enrRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
      } catch (err) {
        console.error('Failed to load attendance data:', err);
      }
    };
    fetchAttendanceData();
  }, []);

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedStudent =
    studentsData.find((s) => s.id === selectedStudentId) || studentsData[0];

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  // Filtering
  const filteredStudents = studentsData.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.batchAndBranch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCourse =
      courseFilter === 'all' || s.courseName.toLowerCase().includes(courseFilter.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchBranch = branchFilter === 'all' || s.branch.toLowerCase().includes(branchFilter.toLowerCase());

    return matchSearch && matchCourse && matchStatus && matchBranch;
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
            Quản lý tiến độ học tập, chuyên cần và kết quả · 5 học viên mẫu.
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
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap md:flex-nowrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm học viên, mã hồ sơ hoặc lớp..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Filter: Tất cả khóa / lớp */}
        <div className="relative shrink-0">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả khóa / lớp</option>
            <option value="massage">Massage Chuyên Nghiệp</option>
            <option value="chăm sóc da">Chăm sóc da</option>
            <option value="spa cơ bản">Spa cơ bản</option>
            <option value="massage cơ bản">Massage cơ bản</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Trạng thái học tập */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Trạng thái học tập</option>
            <option value="studying">Đang học</option>
            <option value="upcoming">Sắp học</option>
            <option value="completed">Hoàn thành mẫu</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả chi nhánh */}
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                    <th className="py-2.5 px-4 font-semibold">Học viên</th>
                    <th className="py-2.5 px-4 font-semibold">Khóa / lớp</th>
                    <th className="py-2.5 px-4 font-semibold">Tiến độ</th>
                    <th className="py-2.5 px-4 font-semibold">Chuyên cần</th>
                    <th className="py-2.5 px-4 font-semibold">Hồ sơ học phí</th>
                    <th className="py-2.5 px-4 font-semibold">Trạng thái / thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs">
                  {filteredStudents.map((student) => {
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
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
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
                            <div>
                              <div className="font-semibold text-xs text-[#2C241E]">
                                {student.name}
                              </div>
                              <div className="text-[11px] text-[#73675F] mt-0.5">
                                {student.code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Khóa / lớp */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">{student.courseName}</div>
                          <div className="text-[11px] text-[#73675F] mt-0.5">
                            {student.batchAndBranch}
                          </div>
                        </td>

                        {/* 3. Tiến độ */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">{student.progressText}</div>
                        </td>

                        {/* 4. Chuyên cần */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">{student.attendanceSessions}</div>
                          {student.attendancePercent && (
                            <div className="text-[11px] text-[#73675F] mt-0.5">
                              {student.attendancePercent}
                            </div>
                          )}
                        </td>

                        {/* 5. Hồ sơ học phí */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-[#2C241E]">{student.tuitionProfile.line1}</div>
                          {student.tuitionProfile.line2 && (
                            <div className="text-[11px] text-[#73675F] mt-0.5">
                              {student.tuitionProfile.line2}
                            </div>
                          )}
                        </td>

                        {/* 6. Trạng thái / thao tác */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
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
                              className="text-xs font-bold text-[#8D4B1A] hover:underline cursor-pointer mt-1.5"
                            >
                              Xem hồ sơ
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5EADF] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                    <th className="py-2.5 px-4 font-semibold">Khóa học / thời điểm</th>
                    <th className="py-2.5 px-4 font-semibold">Hoàn thành</th>
                    <th className="py-2.5 px-4 font-semibold">Lý thuyết</th>
                    <th className="py-2.5 px-4 font-semibold">Thực hành</th>
                    <th className="py-2.5 px-4 font-semibold">Chuyên cần</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs">
                  {selectedStudent.completedCourses.length > 0 ? (
                    selectedStudent.completedCourses.map((c, idx) => (
                      <tr key={idx} className="bg-white hover:bg-[#FAF6F0]">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-xs text-[#2C241E]">
                            {c.courseName} · {c.courseCode}
                          </div>
                          <div className="text-[11px] text-[#73675F] mt-0.5">
                            {c.completionDate}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#2C241E]">{c.completionRate}</td>
                        <td className="py-3.5 px-4 text-[#2C241E]">{c.theoryScore}</td>
                        <td className="py-3.5 px-4 text-[#2C241E]">{c.practiceScore}</td>
                        <td className="py-3.5 px-4 text-[#2C241E]">{c.attendanceRate}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-5 text-center text-[#73675F] text-xs">
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
                  K26-SPA-Q1 · 12 tuần / 144 giờ: 48 giờ lý thuyết và 96 giờ thực hành. Học viên theo học đúng lộ trình đào tạo tiêu chuẩn của học viện MLD.
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
