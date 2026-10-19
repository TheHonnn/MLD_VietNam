import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Clock,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  CheckCircle2,
} from 'lucide-react';
import { academyService } from '../services';
import { toast } from '../components/common';
import { CourseEnrollment, Course, CourseBatch } from '../types/shared_types';

interface CandidateRecord {
  id: string;
  name: string;
  code: string;
  phone: string;
  avatar?: string;
  initials?: string;
  program: string;
  classBatch: string;
  tuitionTotal: string;
  tuitionDeposit: string;
  stage: 'new' | 'consulting' | 'payment_pending' | 'class_pending';
  stageLabel: string;
  // Detail info for right panel
  experience: string;
  branch: string;
  expectedClass: string;
  startDate: string;
  schedule: string;
  timeSlot: string;
  instructor: string;
  contractTuition: string;
  requiredDeposit: string;
  remainingAmount: string;
  statusBadge: string;
  buttonLabel: string;
}

const candidatesData: CandidateRecord[] = [
  {
    id: 'c1',
    name: 'Bùi Khương Duy',
    code: 'HV-2026-002',
    phone: '0912 888 999',
    avatar: '/avatar_khuong_duy.png',
    program: 'Kỹ thuật Massage Trị Liệu & Dưỡng Sinh',
    classBatch: 'K08-DUONGSINH-Q3 · 23/10/2026',
    tuitionTotal: '12.000.000đ',
    tuitionDeposit: 'Cọc 5.000.000đ đã thu',
    stage: 'payment_pending',
    stageLabel: 'Chờ thanh toán',
    experience: 'Đã học cơ bản',
    branch: 'Quận 3',
    expectedClass: 'K08-DUONGSINH-Q3',
    startDate: '23/10/2026',
    schedule: 'Thứ 6–7–CN',
    timeSlot: '13:00–17:00',
    instructor: 'Lê Quỳnh Nga',
    contractTuition: '12.000.000đ',
    requiredDeposit: '5.000.000đ',
    remainingAmount: '7.000.000đ',
    statusBadge: 'Đã đóng cọc tuyển sinh',
    buttonLabel: 'Gửi thông tin lớp',
  },
  {
    id: 'c2',
    name: 'Xuân Trường',
    code: 'HV-2026-001',
    phone: '0978 999 000',
    avatar: '/avatar_truong.png',
    program: 'Kỹ thuật Spa Cơ bản',
    classBatch: 'K26-SPA-Q1 · Đang diễn ra',
    tuitionTotal: 'Đã thu 18.500.000đ',
    tuitionDeposit: 'TT-2026-001 · 16/10/2026',
    stage: 'class_pending',
    stageLabel: 'Đang học',
    experience: 'Chưa có kinh nghiệm',
    branch: 'Quận 3',
    expectedClass: 'K26-SPA-Q1',
    startDate: '01/10/2026',
    schedule: 'Tối 2–4–6',
    timeSlot: '18:00–21:00',
    instructor: 'Lê Quỳnh Nga',
    contractTuition: '18.500.000đ',
    requiredDeposit: 'Đã thu 18.500.000đ',
    remainingAmount: '0đ',
    statusBadge: 'Đã hoàn tất học phí',
    buttonLabel: 'Xem hồ sơ học viên',
  },
  {
    id: 'c3',
    name: 'Phạm Thanh Mai',
    code: 'HV-MH-003 · 09*** 503',
    phone: '0903 123 503',
    initials: 'TM',
    program: 'Chăm sóc da cơ bản',
    classBatch: 'Quan tâm lịch cuối tuần',
    tuitionTotal: 'Báo giá tham khảo',
    tuitionDeposit: 'Chưa có hợp đồng',
    stage: 'new',
    stageLabel: 'Hồ sơ mới',
    experience: 'Người mới bắt đầu',
    branch: 'Tất cả chi nhánh',
    expectedClass: 'Cuối tuần',
    startDate: 'Dự kiến tháng 11',
    schedule: 'Thứ 7 – CN',
    timeSlot: '09:00–12:00',
    instructor: 'Đang phân công',
    contractTuition: 'Báo giá tham khảo',
    requiredDeposit: 'Chưa có hợp đồng',
    remainingAmount: 'Chưa phát sinh',
    statusBadge: 'Hồ sơ mới nhận',
    buttonLabel: 'Tạo báo giá tư vấn',
  },
  {
    id: 'c4',
    name: 'Trần Ngọc Linh',
    code: 'HV-MH-004 · 09*** 214',
    phone: '0988 777 214',
    initials: 'NL',
    program: 'Kỹ thuật Spa Cơ bản',
    classBatch: 'Chờ tư vấn khung giờ',
    tuitionTotal: 'Chưa chốt học phí',
    tuitionDeposit: 'Chưa phát sinh khoản thu',
    stage: 'consulting',
    stageLabel: 'Chờ tư vấn',
    experience: 'Tự học tại nhà',
    branch: 'Quận 3',
    expectedClass: 'Khóa K25',
    startDate: 'Chờ sắp lịch',
    schedule: 'Linh hoạt',
    timeSlot: 'Chờ tư vấn khung giờ',
    instructor: 'Chưa chỉ định',
    contractTuition: 'Chưa chốt học phí',
    requiredDeposit: '0đ',
    remainingAmount: 'Chưa phát sinh',
    statusBadge: 'Chờ tư vấn lịch',
    buttonLabel: 'Liên hệ tư vấn',
  },
];

export const W08_Enrollment: React.FC = () => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('c1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  const [liveEnrollments, setLiveEnrollments] = useState<CourseEnrollment[]>([]);
  const [liveCourses, setLiveCourses] = useState<Course[]>([]);
  const [liveBatches, setLiveBatches] = useState<CourseBatch[]>([]);

  useEffect(() => {
    const fetchAcademyData = async () => {
      try {
        const [enrRes, crsRes, batRes] = await Promise.all([
          academyService.getEnrollments(),
          academyService.getCourses(),
          academyService.getCourseBatches(),
        ]);
        if (enrRes.success) setLiveEnrollments(enrRes.data);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
      } catch (err) {
        console.error('Failed to load academy data:', err);
      }
    };
    fetchAcademyData();
  }, []);

  // Currently selected candidate
  const selectedCandidate =
    candidatesData.find((c) => c.id === selectedCandidateId) || candidatesData[0];

  // Filter candidates
  const filteredCandidates = candidatesData.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);
    const matchStage = stageFilter === 'all' || c.stage === stageFilter;
    const matchProgram =
      programFilter === 'all' || c.program.toLowerCase().includes(programFilter.toLowerCase());
    return matchSearch && matchStage && matchProgram;
  });

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Tuyển sinh</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Theo dõi hồ sơ tư vấn, khoản cọc và kế hoạch xếp lớp · 4 hồ sơ mẫu.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Tạo hồ sơ tuyển sinh
        </button>
      </div>

      {/* 2. Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'new' ? 'all' : 'new')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'new' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Hồ sơ mới</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">1 hồ sơ mẫu</div>
          <div className="text-xs text-[#73675F] mt-3">Phạm Thanh Mai</div>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'consulting' ? 'all' : 'consulting')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'consulting' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Chờ tư vấn</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">1 hồ sơ</div>
          <div className="text-xs text-[#73675F] mt-3">Trần Ngọc Linh</div>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'payment_pending' ? 'all' : 'payment_pending')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'payment_pending' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Chờ thanh toán</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">1 hồ sơ</div>
          <div className="text-xs text-[#73675F] mt-3">Bùi Khương Duy · HV-2026-002</div>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'class_pending' ? 'all' : 'class_pending')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'class_pending' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Đang theo học</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">1 hồ sơ</div>
          <div className="text-xs text-[#73675F] mt-3">Xuân Trường · Spa K26</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap md:flex-nowrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, số điện thoại, mã hồ sơ..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Filter: Tất cả chương trình */}
        <div className="relative shrink-0">
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả chương trình</option>
            <option value="massage">Massage Chuyên Nghiệp</option>
            <option value="spa">Kỹ thuật Spa Cơ bản</option>
            <option value="da">Chăm sóc da cơ bản</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả giai đoạn */}
        <div className="relative shrink-0">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả giai đoạn</option>
            <option value="new">Hồ sơ mới</option>
            <option value="consulting">Chờ tư vấn</option>
            <option value="payment_pending">Chờ thanh toán</option>
            <option value="class_pending">Chờ xếp lớp</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả chi nhánh */}
        <div className="relative shrink-0">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018] whitespace-nowrap"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="q3">Quận 3</option>
            <option value="q1">Quận 1</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 4. Main 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols on xl): Table + Việc cần làm */}
        <div className="xl:col-span-8 space-y-5 min-w-0">
          {/* Top: Table Card */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            {/* Table Card Header */}
            <div className="p-5 pb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2C241E]">
                Danh sách hồ sơ tuyển sinh
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                {filteredCandidates.length} hồ sơ
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[580px]">
                <thead>
                  <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9]">
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[28%]">Ứng viên / mã hồ sơ</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[32%]">Chương trình / lớp</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[22%]">Học phí / khoản thu</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[18%]">Giai đoạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs">
                  {filteredCandidates.map((candidate) => {
                    const isSelected = candidate.id === selectedCandidateId;
                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#F8F1E8]' : 'bg-white hover:bg-[#FAF6F0]'
                        }`}
                      >
                        {/* 1. Ứng viên / Mã hồ sơ */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {candidate.avatar ? (
                              <img
                                src={candidate.avatar}
                                alt={candidate.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#F3E2CE] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0">
                                {candidate.initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-[#2C241E] whitespace-nowrap">
                                {candidate.name}
                              </div>
                              <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                                {candidate.code}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Chương trình / Lớp */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="text-xs text-[#2C241E] font-medium whitespace-nowrap">
                            {candidate.program}
                          </div>
                          <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                            {candidate.classBatch}
                          </div>
                        </td>

                        {/* 3. Học phí / Khoản thu */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-[#2C241E] whitespace-nowrap">
                            {candidate.tuitionTotal}
                          </div>
                          <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap">
                            {candidate.tuitionDeposit}
                          </div>
                        </td>

                        {/* 4. Giai đoạn */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {candidate.stage === 'payment_pending' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23] whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Chờ thanh toán</span>
                            </div>
                          )}
                          {candidate.stage === 'class_pending' && (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5E6D8] text-[#8A4F23] whitespace-nowrap">
                              Chờ xếp lớp
                            </span>
                          )}
                          {candidate.stage === 'new' && (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EFE8E0] text-[#73675F] whitespace-nowrap">
                              Hồ sơ mới
                            </span>
                          )}
                          {candidate.stage === 'consulting' && (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EFE8E0] text-[#73675F] whitespace-nowrap">
                              Chờ tư vấn
                            </span>
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
              <span>Hiển thị {filteredCandidates.length} / {candidatesData.length} hồ sơ học viên</span>
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

          {/* Bottom: Việc cần làm */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-base font-bold text-[#2C241E]">Việc cần làm</h2>

            {/* Task 1 */}
            <div className="bg-[#F3E2CE] rounded-2xl p-4 space-y-1">
              <div className="text-xs font-bold text-[#2C241E]">
                Thu học phí đợt 2 theo lộ trình đào tạo
              </div>
              <div className="text-xs text-[#73675F] leading-relaxed">
                Học viên Bùi Khương Duy (HV-2026-002): Còn 7.000.000đ học phí đợt 2 trước khi bắt đầu phần thực hành chuyên sâu.
              </div>
            </div>

            {/* Task 2 */}
            <div className="bg-[#F3E2CE] rounded-2xl p-4 space-y-1">
              <div className="text-xs font-bold text-[#2C241E]">
                Xếp lớp đào tạo khóa mới
              </div>
              <div className="text-xs text-[#73675F] leading-relaxed">
                Học viên Xuân Trường (HV-2026-001): Đã hoàn tất 100% học phí 18.500.000đ qua giao dịch TT-2026-001.
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-xs text-[#73675F] pt-1">
              Dữ liệu tuyển sinh được cập nhật theo thời gian thực.
            </div>
          </div>
        </div>

        {/* Right Column (4 cols on xl): Hồ sơ đang chọn */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5 min-w-0">
          <h2 className="text-base font-bold text-[#2C241E]">Hồ sơ đang chọn</h2>

          {/* Candidate Profile Summary */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              {selectedCandidate.avatar ? (
                <img
                  src={selectedCandidate.avatar}
                  alt={selectedCandidate.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F3E2CE] text-[#8A4F23] font-bold text-sm flex items-center justify-center shrink-0">
                  {selectedCandidate.initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs text-[#2C241E] truncate">
                  {selectedCandidate.name}
                </div>
                <div className="text-[11px] text-[#73675F] truncate">
                  {selectedCandidate.phone} · {selectedCandidate.code}
                </div>
              </div>
            </div>

            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                {selectedCandidate.statusBadge}
              </span>
            </div>
          </div>

          {/* Program Title */}
          <div className="text-xs font-bold text-[#2C241E] pt-1 border-t border-[#EFE4D9]">
            {selectedCandidate.program}
          </div>

          {/* Key-Value Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Kinh nghiệm trước đó</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.experience}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Chi nhánh</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.branch}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Lớp dự kiến</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.expectedClass}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Bắt đầu</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.startDate}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Lịch học</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.schedule}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Khung giờ</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.timeSlot}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Giảng viên</span>
              <span className="text-[#2C241E] font-medium text-right truncate">{selectedCandidate.instructor}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Học phí hợp đồng</span>
              <span className="text-[#2C241E] font-bold text-right shrink-0">{selectedCandidate.contractTuition}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Cọc cần thu</span>
              <span className="text-[#2C241E] font-bold text-right shrink-0">{selectedCandidate.requiredDeposit}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[#73675F] py-0.5">
              <span className="shrink-0 whitespace-nowrap">Còn lại trả sau</span>
              <span className="text-[#2C241E] font-bold text-right shrink-0">{selectedCandidate.remainingAmount}</span>
            </div>
          </div>

          {/* Status banner */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F3E2CE] text-[#8A4F23] text-xs font-semibold">
            <Clock className="w-4 h-4 stroke-[2]" />
            <span>{selectedCandidate.stageLabel}</span>
          </div>

          {/* Action button */}
          <button
            onClick={() => toast.success('Cập nhật trạng thái', `Đã cập nhật trạng thái hồ sơ học viên: ${selectedCandidate.buttonLabel}`)}
            className="w-full py-2.5 bg-white border border-[#985018] hover:bg-[#FAF5EF] text-[#985018] text-xs font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
          >
            {selectedCandidate.buttonLabel}
          </button>

          {/* Footnote */}
          <div className="text-[11px] text-[#73675F] leading-relaxed pt-1">
            Đồng bộ trạng thái hồ sơ học viên theo thời gian thực.
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#2C241E] text-white px-4 py-3 rounded-xl shadow-lg border border-[#D7BBA6] flex items-center gap-2.5 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#E29D62]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 5. Bottom Page Disclaimer */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>
          Hệ thống tuyển sinh & quản lý đào tạo học viện • MLD Vietnam Healthcare Admin.
        </span>
      </div>

      {/* MODAL: Tạo hồ sơ tuyển sinh mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Tạo hồ sơ tuyển sinh mới</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Nhập thông tin học viên đăng ký tư vấn & nhập học</p>
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
                showToast('Đã tạo hồ sơ tuyển sinh mới thành công!');
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Họ và tên học viên</label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Lê Thị Hồng Ánh"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Số điện thoại</label>
                  <input
                    required
                    type="tel"
                    placeholder="0912 888 999"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Chi nhánh đăng ký</label>
                  <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="q3">Quận 3</option>
                    <option value="q1">Quận 1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Chương trình quan tâm</label>
                <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                  <option value="massage">Kỹ thuật Massage Chuyên Nghiệp</option>
                  <option value="spa">Kỹ thuật Spa Cơ bản</option>
                  <option value="da">Chăm sóc da cơ bản</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Giai đoạn hồ sơ</label>
                  <select className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]">
                    <option value="new">Hồ sơ mới</option>
                    <option value="consulting">Chờ tư vấn</option>
                    <option value="payment_pending">Chờ thanh toán cọc</option>
                    <option value="class_pending">Chờ xếp lớp</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Học phí dự kiến</label>
                  <input
                    type="text"
                    defaultValue="9.000.000đ"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
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
                  Tạo hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
