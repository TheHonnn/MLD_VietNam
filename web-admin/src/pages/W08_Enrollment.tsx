import React, { useState, useEffect, useMemo } from 'react';
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
import { academyService, customerService } from '../services';
import { toast } from '../components/common';
import { CourseEnrollment, Course, CourseBatch, User } from '../types/shared_types';

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

export const W08_Enrollment: React.FC = () => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
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
  const [customers, setCustomers] = useState<User[]>([]);

  useEffect(() => {
    const fetchAcademyData = async () => {
      try {
        const [enrRes, crsRes, batRes, custRes] = await Promise.all([
          academyService.getEnrollments(),
          academyService.getCourses(),
          academyService.getCourseBatches(),
          customerService.getCustomers(),
        ]);
        if (enrRes.success) setLiveEnrollments(enrRes.data);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
        if (custRes.success) setCustomers(custRes.data);
      } catch (err) {
        console.error('Failed to load academy data:', err);
      }
    };
    fetchAcademyData();
  }, []);

  const candidatesData: CandidateRecord[] = useMemo(() => {
    if (!liveEnrollments || liveEnrollments.length === 0) return [];

    const custMap = new Map(customers.map((c) => [c.id, c]));
    const crsMap = new Map(liveCourses.map((c) => [c.id, c]));
    const batMap = new Map(liveBatches.map((b) => [b.id, b]));

    return liveEnrollments.map((enr, idx) => {
      const cust = custMap.get(enr.studentId);
      const crs = crsMap.get(enr.courseId);
      const bat = batMap.get(enr.batchId || '');

      const custName = cust?.fullName || `Học viên ${idx + 1}`;
      const custPhone = cust?.phone || '0900000000';
      const custCode = cust?.referralCode || `HV-2026-${String(idx + 1).padStart(3, '0')}`;
      const programTitle = crs?.title || 'Khóa Đào Tạo Kỹ Thuật Viên';
      const batchCode = bat?.batchCode || 'K26-SPA-Q1';

      const total = enr.tuitionTotal || 15000000;
      const paid = enr.amountPaid || 0;
      const remaining = Math.max(0, total - paid);

      const isFullyPaid = paid >= total && total > 0;
      const isGraduated = (enr.status as any) === 'GRADUATED' || (enr.status as any) === 'COMPLETED';
      const stage: 'new' | 'consulting' | 'payment_pending' | 'class_pending' =
        enr.status === 'STUDYING' || isGraduated
          ? 'class_pending'
          : paid > 0 && !isFullyPaid
          ? 'payment_pending'
          : paid === 0
          ? 'consulting'
          : 'class_pending';

      const stageLabel =
        stage === 'class_pending'
          ? (isGraduated ? 'Tốt nghiệp' : 'Đang học')
          : stage === 'payment_pending'
          ? 'Chờ thanh toán'
          : 'Chờ tư vấn';

      const startDateFormatted = bat?.startDate
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(bat.startDate))
        : '01/10/2026';

      return {
        id: enr.id,
        name: custName,
        code: custCode,
        phone: custPhone,
        avatar: cust?.avatarUrl || undefined,
        program: programTitle,
        classBatch: `${batchCode} · ${bat?.scheduleText || 'Lịch chuẩn'}`,
        tuitionTotal: `${total.toLocaleString('vi-VN')}đ`,
        tuitionDeposit: paid > 0 ? `Đã thu ${paid.toLocaleString('vi-VN')}đ` : 'Chưa thu cọc',
        stage,
        stageLabel,
        experience: 'Đào tạo chuẩn nghề MLD',
        branch: 'Quận 3',
        expectedClass: batchCode,
        startDate: startDateFormatted,
        schedule: bat?.scheduleText || 'Thứ 2 - 4 - 6',
        timeSlot: '08:30–11:30',
        instructor: 'Master Trainer Nguyễn Thảo Ngọc',
        contractTuition: `${total.toLocaleString('vi-VN')}đ`,
        requiredDeposit: `${paid.toLocaleString('vi-VN')}đ`,
        remainingAmount: `${remaining.toLocaleString('vi-VN')}đ`,
        statusBadge: isFullyPaid ? 'Đã hoàn tất học phí' : paid > 0 ? 'Đã đóng cọc tuyển sinh' : 'Chờ tư vấn học phí',
        buttonLabel: isFullyPaid ? 'Xem hồ sơ học viên' : 'Gửi thông tin lớp',
      };
    });
  }, [liveEnrollments, liveCourses, liveBatches, customers]);

  useEffect(() => {
    if (candidatesData.length > 0 && (!selectedCandidateId || !candidatesData.some((c) => c.id === selectedCandidateId))) {
      setSelectedCandidateId(candidatesData[0].id);
    }
  }, [candidatesData, selectedCandidateId]);

  // Currently selected candidate
  const selectedCandidate: CandidateRecord =
    candidatesData.find((c) => c.id === selectedCandidateId) ||
    candidatesData[0] || {
      id: '',
      name: 'Chưa có hồ sơ',
      code: 'HV-000',
      phone: '',
      program: 'Chưa chọn khóa học',
      classBatch: 'Chưa xếp lớp',
      tuitionTotal: '0đ',
      tuitionDeposit: '0đ',
      stage: 'new',
      stageLabel: 'Hồ sơ mới',
      experience: '',
      branch: 'Quận 3',
      expectedClass: '',
      startDate: '',
      schedule: '',
      timeSlot: '',
      instructor: '',
      contractTuition: '0đ',
      requiredDeposit: '0đ',
      remainingAmount: '0đ',
      statusBadge: 'Chưa có hồ sơ',
      buttonLabel: 'Tạo hồ sơ',
    };

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

  const countNew = candidatesData.filter((c) => c.stage === 'new').length;
  const countConsulting = candidatesData.filter((c) => c.stage === 'consulting').length;
  const countPending = candidatesData.filter((c) => c.stage === 'payment_pending').length;
  const countStudying = candidatesData.filter((c) => c.stage === 'class_pending').length;

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Tuyển sinh</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Theo dõi hồ sơ tư vấn, khoản cọc và kế hoạch xếp lớp trực tiếp từ Supabase Cloud.
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
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">{countNew} hồ sơ</div>
          <div className="text-xs text-[#73675F] mt-3">
            {candidatesData.find((c) => c.stage === 'new')?.name || 'Chưa phát sinh mới'}
          </div>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'consulting' ? 'all' : 'consulting')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'consulting' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Chờ tư vấn</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">{countConsulting} hồ sơ</div>
          <div className="text-xs text-[#73675F] mt-3">
            {candidatesData.find((c) => c.stage === 'consulting')?.name || 'Đã liên hệ hết'}
          </div>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'payment_pending' ? 'all' : 'payment_pending')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'payment_pending' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Chờ thanh toán</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">{countPending} hồ sơ</div>
          <div className="text-xs text-[#73675F] mt-3">
            {candidatesData.find((c) => c.stage === 'payment_pending')?.name || 'Không có khoản nợ đọng'}
          </div>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => setStageFilter(stageFilter === 'class_pending' ? 'all' : 'class_pending')}
          className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            stageFilter === 'class_pending' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="text-[13.5px] font-bold text-[#2C241E]">Đang theo học</div>
          <div className="text-[13.5px] font-bold text-[#2C241E] mt-2">{countStudying} học viên</div>
          <div className="text-xs text-[#73675F] mt-3">
            {candidatesData.find((c) => c.stage === 'class_pending')?.name || 'Lớp chưa khởi động'}
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, số điện thoại, mã hồ sơ..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Filter: Tất cả chương trình */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả chương trình</option>
            <option value="massage">Massage Chuyên Nghiệp</option>
            <option value="spa">Kỹ thuật Spa Cơ bản</option>
            <option value="da">Chăm sóc da cơ bản</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Filter: Tất cả giai đoạn */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
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
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018] whitespace-nowrap"
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
