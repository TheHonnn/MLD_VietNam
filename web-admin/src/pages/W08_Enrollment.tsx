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
  User as UserIcon,
  Printer,
  RefreshCw,
  QrCode,
  FileText,
} from 'lucide-react';
import { academyService, customerService, supabaseService } from '../services';
import { toast } from '../components/common';
import { CourseEnrollment, Course, CourseBatch, User, EnrollmentStatus, UserRole, PurposeInterest, PaymentMethod, PaymentStatus } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';
import { EnrollmentBillModal, CandidateBillInfo } from '../components/enrollment/EnrollmentBillModal';

export type EnrollmentSubTab = 'PENDING_APPROVAL' | 'APPROVED_PAID' | 'ALL';

interface CandidateRecord {
  id: string;
  name: string;
  code: string;
  phone: string;
  email?: string;
  avatar?: string;
  initials?: string;
  program: string;
  classBatch: string;
  tuitionTotal: string;
  tuitionDeposit: string;
  rawTuitionTotal: number;
  rawAmountPaid: number;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rawStatus: EnrollmentStatus;
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
  const [activeSubTab, setActiveSubTab] = useState<EnrollmentSubTab>('PENDING_APPROVAL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billModalCandidate, setBillModalCandidate] = useState<CandidateBillInfo | null>(null);
  const [checkingCandidateId, setCheckingCandidateId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form add new candidate state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formBatchId, setFormBatchId] = useState('');
  const [formBranchId, setFormBranchId] = useState('q3');
  const [formStage, setFormStage] = useState<EnrollmentStatus>(EnrollmentStatus.CONSULTING);
  const [formTuition, setFormTuition] = useState('9.000.000đ');
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false);

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

      const custName = cust?.fullName || enr.studentName || `Học viên ${idx + 1}`;
      const custPhone = cust?.phone || enr.studentPhone || '—';
      const notesCode = enr.approvalNotes?.match(/Mã KH:\s*([A-Za-z0-9_-]+)/)?.[1];
      const custCode = notesCode || cust?.referralCode || `HV-${enr.id.slice(-5).toUpperCase()}`;
      const programTitle = crs?.title || 'Khóa học MLD';
      const batchCode = bat?.batchCode || 'Chưa xếp lớp';

      const total = enr.tuitionTotal || crs?.tuitionFee || 9000000;
      const paid = enr.amountPaid || 0;
      const remaining = Math.max(0, total - paid);

      const isFullyPaid = paid >= total && total > 0;
      const isGraduated = (enr.status as any) === 'GRADUATED' || (enr.status as any) === 'COMPLETED';
      const isNewlyCreated = enr.enrolledAt ? (Date.now() - new Date(enr.enrolledAt).getTime() < 48 * 3600 * 1000) : false;
      const stage: 'new' | 'consulting' | 'payment_pending' | 'class_pending' =
        enr.status === 'STUDYING' || isGraduated
          ? 'class_pending'
          : enr.status === 'ENROLLED' || (paid > 0 && !isFullyPaid)
          ? 'payment_pending'
          : isNewlyCreated && enr.status === 'CONSULTING' && paid === 0
          ? 'new'
          : enr.status === 'CONSULTING' || paid === 0
          ? 'consulting'
          : 'class_pending';

      const stageLabel =
        stage === 'class_pending'
          ? (isGraduated ? 'Tốt nghiệp' : bat ? 'Đang học' : 'Chờ xếp lớp')
          : enr.status === 'ENROLLED'
          ? 'Đã nhập học / Ghi danh'
          : stage === 'payment_pending'
          ? 'Chờ thanh toán'
          : stage === 'new'
          ? 'Hồ sơ mới'
          : 'Chờ tư vấn';

      const startDateFormatted = bat?.startDate
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(bat.startDate))
        : 'Chưa có lịch';

      const minDeposit = crs?.depositAmount || 0;
      const depositDisplay = paid > 0 ? `Đã thu ${paid.toLocaleString('vi-VN')}đ` : minDeposit > 0 ? `${minDeposit.toLocaleString('vi-VN')}đ` : 'Chưa thu cọc';

      const initials = custName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase();

      return {
        id: enr.id,
        name: custName,
        code: custCode,
        phone: custPhone,
        email: enr.studentEmail || cust?.email || undefined,
        avatar: cust?.avatarUrl || undefined,
        initials: initials || 'HV',
        program: programTitle,
        classBatch: bat ? `${batchCode} · ${bat?.scheduleText || 'Lịch chuẩn'}` : 'Chưa xếp lớp',
        tuitionTotal: `${total.toLocaleString('vi-VN')}đ`,
        tuitionDeposit: paid > 0 ? `Đã thu ${paid.toLocaleString('vi-VN')}đ` : 'Chưa thu cọc',
        rawTuitionTotal: total,
        rawAmountPaid: paid,
        approvalStatus: enr.approvalStatus,
        approvedBy: enr.approvedBy,
        approvedAt: enr.approvedAt,
        approvalNotes: enr.approvalNotes,
        rawStatus: enr.status,
        stage,
        stageLabel,
        experience: (enr as any).studentType === 'BEGINNER' ? 'Người mới bắt đầu' : (enr as any).studentType === 'ADVANCED' ? 'Đã có kinh nghiệm' : '—',
        branch: enr.selectedBranch || 'Chi nhánh Quận 3 - TP.HCM',
        expectedClass: bat ? batchCode : 'Chưa xếp lớp',
        startDate: startDateFormatted,
        schedule: bat?.scheduleText || 'Chưa có lịch',
        timeSlot: bat?.scheduleText?.includes('13:00') ? '13:00–17:00' : bat?.scheduleText ? '08:30–11:30' : '—',
        instructor: bat ? 'Theo lớp học' : 'Chưa phân công',
        contractTuition: `${total.toLocaleString('vi-VN')}đ`,
        requiredDeposit: depositDisplay,
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
      phone: '—',
      email: '',
      program: 'Chưa chọn khóa học',
      classBatch: 'Chưa xếp lớp',
      tuitionTotal: '0đ',
      tuitionDeposit: '0đ',
      rawTuitionTotal: 0,
      rawAmountPaid: 0,
      approvalStatus: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      approvalNotes: undefined,
      rawStatus: EnrollmentStatus.CONSULTING,
      stage: 'new',
      stageLabel: 'Hồ sơ mới',
      experience: '—',
      branch: '—',
      expectedClass: '—',
      startDate: '—',
      schedule: '—',
      timeSlot: '—',
      instructor: '—',
      contractTuition: '0đ',
      requiredDeposit: '0đ',
      remainingAmount: '0đ',
      statusBadge: 'Chưa có hồ sơ',
      buttonLabel: 'Tạo hồ sơ',
    };

  // Dynamic pending tasks strictly derived from real candidates
  const pendingTasks = useMemo(() => {
    const tasks: { title: string; desc: string }[] = [];

    // 1. Unpaid or partially paid students
    candidatesData
      .filter((c) => c.stage === 'payment_pending' || (c.stage === 'consulting' && c.remainingAmount !== '0đ'))
      .slice(0, 3)
      .forEach((c) => {
        tasks.push({
          title: 'Thu học phí còn lại theo lộ trình',
          desc: `Học viên ${c.name} (${c.code}): Còn ${c.remainingAmount} cần hoàn tất cho khóa ${c.program}.`,
        });
      });

    // 2. Students not yet assigned to class
    candidatesData
      .filter((c) => c.expectedClass === 'Chưa xếp lớp' && (c.stage === 'class_pending' || c.stage === 'payment_pending'))
      .slice(0, 3)
      .forEach((c) => {
        tasks.push({
          title: 'Xếp lớp đào tạo cho học viên',
          desc: `Học viên ${c.name} (${c.code}): Đã đăng ký ${c.program} nhưng chưa được phân lớp học.`,
        });
      });

    // 3. New leads needing consultation
    candidatesData
      .filter((c) => c.stage === 'new')
      .slice(0, 2)
      .forEach((c) => {
        tasks.push({
          title: 'Tư vấn tuyển sinh hồ sơ mới',
          desc: `Học viên ${c.name} (SĐT: ${c.phone}): Vừa gửi thông tin quan tâm khóa học ${c.program}.`,
        });
      });

    return tasks;
  }, [candidatesData]);

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanPhone = formPhone.trim();
    if (!cleanName || !cleanPhone) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ tên và số điện thoại học viên.');
      return;
    }
    setIsCreatingCandidate(true);
    try {
      const cleanDigits = cleanPhone.replace(/\D/g, '');
      let student = customers.find(
        (c) => (c.phone || '').replace(/\D/g, '') === cleanDigits
      );
      if (!student) {
        const createRes = await customerService.createCustomer({
          fullName: cleanName,
          phone: cleanPhone,
          role: UserRole.STUDENT,
          purpose: PurposeInterest.ACADEMY,
        });
        if (createRes.data) {
          student = createRes.data;
          setCustomers((prev) => [student!, ...prev]);
        }
      }

      const targetCourseId = formCourseId || liveCourses[0]?.id || 'cccccccc-0001-0001-0001-000000000001';
      const cleanTuition = Number(formTuition.replace(/\D/g, '')) || 9000000;

      const enrRes = await academyService.createEnrollment({
        studentId: student?.id || '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        courseId: targetCourseId,
        batchId: formBatchId || null,
        status: formStage,
        tuitionTotal: cleanTuition,
        amountPaid: formStage === EnrollmentStatus.ENROLLED || formStage === EnrollmentStatus.STUDYING ? cleanTuition : 0,
      });

      if (enrRes.success && enrRes.data) {
        setLiveEnrollments((prev) => [enrRes.data!, ...prev]);
        setSelectedCandidateId(enrRes.data.id);
      }

      toast.success(
        'Tạo hồ sơ thành công',
        `Đã tạo hồ sơ tuyển sinh cho học viên ${cleanName} trên Supabase Cloud.`
      );
      showToast(`Đã tạo hồ sơ học viên ${cleanName} thành công!`);

      setIsAddModalOpen(false);
      setFormName('');
      setFormPhone('');
    } catch (err) {
      console.error('Failed to create candidate enrollment:', err);
      toast.error('Lỗi tạo hồ sơ', 'Không thể lưu hồ sơ học viên. Vui lòng kiểm tra lại.');
    } finally {
      setIsCreatingCandidate(false);
    }
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const handleUpdateEnrollmentStatus = async (enrollmentId: string, nextStatus: EnrollmentStatus) => {
    setIsUpdatingStatus(true);
    try {
      const targetEnrollment = liveEnrollments.find((e) => e.id === enrollmentId);
      const isDepositAction = nextStatus === EnrollmentStatus.ENROLLED && (!targetEnrollment?.amountPaid || targetEnrollment.amountPaid === 0);
      const depositVal = isDepositAction ? (targetEnrollment?.course?.depositAmount || 2000000) : undefined;

      const res = await academyService.updateEnrollmentStatus(
        enrollmentId,
        nextStatus,
        depositVal ? { amountPaid: depositVal } : undefined
      );

      if (res.success) {
        setLiveEnrollments((prev) =>
          prev.map((e) =>
            e.id === enrollmentId
              ? { ...e, status: nextStatus, ...(depositVal ? { amountPaid: depositVal } : {}) }
              : e
          )
        );

        if (isDepositAction && targetEnrollment) {
          try {
            await supabaseService.recordTuitionPayment({
              transactionCode: `HP-COC-${Date.now().toString().slice(-6)}`,
              enrollmentId,
              studentId: targetEnrollment.studentId,
              courseId: targetEnrollment.courseId,
              branchId: targetEnrollment.batch?.branchId || 'aaaaaaaa-0001-0001-0001-000000000001',
              amount: depositVal || 2000000,
              paymentMethod: PaymentMethod.BANK_TRANSFER,
              paymentStatus: PaymentStatus.PAID,
              notes: `Ghi nhận tiền cọc nhập học khóa đào tạo (${depositVal?.toLocaleString('vi-VN')}đ)`,
            });
          } catch (tErr) {
            console.warn('Lỗi ghi nhận giao dịch cọc học phí:', tErr);
          }
        }

        const statusMap: Record<string, string> = {
          [EnrollmentStatus.ENROLLED]: 'Đã ghi nhận đóng cọc & Nhập học thành công',
          [EnrollmentStatus.STUDYING]: 'Đã xếp lớp & Bắt đầu học',
          [EnrollmentStatus.GRADUATED]: 'Đã tốt nghiệp & Cấp chứng chỉ',
        };
        toast.success(
          'Thao tác thành công',
          statusMap[nextStatus] || 'Đã cập nhật trạng thái hồ sơ học viên'
        );
      } else {
        toast.error('Lỗi', res.message || 'Không thể cập nhật trạng thái hồ sơ');
      }
    } catch (err: any) {
      console.error('Lỗi cập nhật hồ sơ học viên:', err);
      toast.error('Lỗi hệ thống', err?.message || 'Vui lòng thử lại sau.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Mở modal in bill & QR chuyển khoản
  const handleOpenBillModal = (candidate: CandidateRecord) => {
    setBillModalCandidate({
      id: candidate.id,
      name: candidate.name,
      code: candidate.code,
      phone: candidate.phone,
      email: candidate.email,
      program: candidate.program,
      classBatch: candidate.classBatch,
      tuitionTotal: candidate.rawTuitionTotal,
      amountPaid: candidate.rawAmountPaid,
      branch: candidate.branch,
      schedule: candidate.schedule,
      startDate: candidate.startDate,
      approvalStatus: candidate.approvalStatus,
    });
    setIsBillModalOpen(true);
  };

  // Tự động kiểm tra đối soát tiền về qua ngân hàng theo mã khách hàng
  const handleCheckPayment = async (enrollmentId: string) => {
    setCheckingCandidateId(enrollmentId);
    try {
      const res = await academyService.checkEnrollmentPayment(enrollmentId);
      if (res.data?.approved || res.data?.isPaid) {
        setLiveEnrollments((prev) =>
          prev.map((e) =>
            e.id === enrollmentId
              ? {
                  ...e,
                  status: EnrollmentStatus.ENROLLED,
                  approvalStatus: 'APPROVED',
                  amountPaid: res.data?.amountPaid || e.tuitionTotal || 9000000,
                  approvalNotes: `Đã tự động duyệt: Khớp mã KH ${res.data?.customerCode || ''}`,
                }
              : e
          )
        );
        toast.success(
          'Đối soát thành công!',
          res.message || 'Hệ thống đã xác nhận tiền về và tự động duyệt học viên vào khóa học.'
        );
        showToast('🎉 Nhận tiền thành công - Đã tự động duyệt học viên!');
        return { isPaid: true, message: res.message || 'Thanh toán thành công' };
      } else {
        toast.info('Chưa có giao dịch', res.message || 'Hệ thống chưa nhận được khoản tiền khớp với mã khách hàng.');
        return { isPaid: false, message: res.message || 'Chưa nhận được thanh toán' };
      }
    } catch (err: any) {
      toast.error('Lỗi kiểm tra tiền', err?.message || 'Không thể kiểm tra giao dịch.');
      return { isPaid: false, message: err?.message || 'Lỗi kết nối' };
    } finally {
      setCheckingCandidateId(null);
    }
  };

  // Admin duyệt học viên tại quầy
  const handleApproveAtDesk = async (enrollmentId: string) => {
    const target = candidatesData.find((c) => c.id === enrollmentId);
    try {
      const res = await academyService.approveEnrollment(enrollmentId, {
        adminUser: 'Admin Tuyển Sinh',
        amountPaid: target?.rawTuitionTotal || 9000000,
        notes: `Admin duyệt trực tiếp tại quầy cho học viên ${target?.name} (${target?.code})`,
      });
      if (res.success) {
        setLiveEnrollments((prev) =>
          prev.map((e) =>
            e.id === enrollmentId
              ? {
                  ...e,
                  status: EnrollmentStatus.ENROLLED,
                  approvalStatus: 'APPROVED',
                  amountPaid: target?.rawTuitionTotal || 9000000,
                }
              : e
          )
        );
        toast.success('Duyệt thành công', `Đã duyệt học viên ${target?.name} vào khóa học!`);
        showToast(`Đã duyệt học viên ${target?.name} thành công!`);
        setIsBillModalOpen(false);
      } else {
        toast.error('Lỗi duyệt', res.message || 'Không thể duyệt hồ sơ');
      }
    } catch (err: any) {
      toast.error('Lỗi hệ thống', err?.message || 'Vui lòng thử lại');
    }
  };

  // Sub-tab counts
  const countPendingApproval = useMemo(() => {
    return candidatesData.filter(
      (c) =>
        c.approvalStatus === 'PENDING_APPROVAL' ||
        (c.approvalStatus !== 'APPROVED' && c.rawAmountPaid === 0) ||
        (c.rawAmountPaid < c.rawTuitionTotal && c.approvalStatus !== 'APPROVED')
    ).length;
  }, [candidatesData]);

  const countApprovedPaid = useMemo(() => {
    return candidatesData.filter(
      (c) =>
        c.approvalStatus === 'APPROVED' ||
        (c.rawAmountPaid > 0 && c.rawAmountPaid >= c.rawTuitionTotal)
    ).length;
  }, [candidatesData]);

  // Filter candidates
  const filteredCandidates = candidatesData.filter((c) => {
    const isSearchMatch = matchSearch([c.name, c.code, c.phone, c.program, c.branch], searchTerm);
    const matchStage = stageFilter === 'all' || c.stage === stageFilter;
    const matchProgram =
      programFilter === 'all' || c.program.toLowerCase().includes(programFilter.toLowerCase());

    let matchSubTab = true;
    if (activeSubTab === 'PENDING_APPROVAL') {
      matchSubTab =
        c.approvalStatus === 'PENDING_APPROVAL' ||
        (c.approvalStatus !== 'APPROVED' && c.rawAmountPaid === 0) ||
        (c.rawAmountPaid < c.rawTuitionTotal && c.approvalStatus !== 'APPROVED');
    } else if (activeSubTab === 'APPROVED_PAID') {
      matchSubTab =
        c.approvalStatus === 'APPROVED' ||
        (c.rawAmountPaid > 0 && c.rawAmountPaid >= c.rawTuitionTotal);
    }

    return isSearchMatch && matchStage && matchProgram && matchSubTab;
  });

  const countNew = candidatesData.filter((c) => c.stage === 'new').length;
  const countConsulting = candidatesData.filter((c) => c.stage === 'consulting').length;
  const countPending = candidatesData.filter((c) => c.stage === 'payment_pending').length;
  const countStudying = candidatesData.filter((c) => c.stage === 'class_pending').length;

  const hasActiveFilter = Boolean(
    searchTerm.trim() ||
      programFilter !== 'all' ||
      stageFilter !== 'all' ||
      branchFilter !== 'all' ||
      activeSubTab !== 'PENDING_APPROVAL'
  );

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Title & Top CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Tuyển sinh</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Theo dõi hồ sơ tư vấn, in bill học phí, đối soát tài khoản ngân hàng và tự động duyệt học viên.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Tạo hồ sơ tuyển sinh
        </button>
      </div>

      {/* SUB-TABS: Mục con của Tuyển sinh */}
      <div className="flex border-b border-[#EFE4D9] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('PENDING_APPROVAL')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'PENDING_APPROVAL'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>⏳ Chờ duyệt & Chưa thanh toán</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeSubTab === 'PENDING_APPROVAL'
                ? 'bg-[#8D4B1A] text-white'
                : 'bg-[#FAF0E4] text-[#8D4B1A]'
            }`}
          >
            {countPendingApproval}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('APPROVED_PAID')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'APPROVED_PAID'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>✅ Đã thanh toán & Đã duyệt</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeSubTab === 'APPROVED_PAID'
                ? 'bg-[#8D4B1A] text-white'
                : 'bg-[#E8F6ED] text-emerald-800'
            }`}
          >
            {countApprovedPaid}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ALL')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ALL'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>📋 Tất cả hồ sơ tuyển sinh</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#FAF5EF] text-[#73675F]">
            {candidatesData.length}
          </span>
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
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, số điện thoại, mã hồ sơ..."
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

        {/* Reset filter button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setProgramFilter('all');
              setStageFilter('all');
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
              <table className="w-full text-left border-collapse min-w-[640px] whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F3E2CE] text-[#73675F] text-[11px] font-semibold border-y border-[#EFE4D9] whitespace-nowrap">
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[24%]">Ứng viên / mã hồ sơ</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[26%]">Chương trình / lớp</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[18%]">Học phí / khoản thu</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[16%]">Giai đoạn</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap w-[16%] text-right">Thao tác / In bill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs whitespace-nowrap">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#73675F]">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy hồ sơ học viên</p>
                          <p className="text-xs text-[#8C7A6B]">
                            {searchTerm.trim()
                              ? `Không có ứng viên nào khớp với từ khóa "${searchTerm}".`
                              : 'Không có hồ sơ nào với bộ lọc đã chọn.'}
                          </p>
                          {hasActiveFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm('');
                                setProgramFilter('all');
                                setStageFilter('all');
                                setBranchFilter('all');
                                setActiveSubTab('PENDING_APPROVAL');
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
                    filteredCandidates.map((candidate) => {
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
                              <div className="text-[11px] text-[#73675F] mt-0.5 whitespace-nowrap flex items-center gap-1">
                                <span className="font-mono font-bold text-[#8D4B1A] bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                  {candidate.code}
                                </span>
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
                          {candidate.approvalStatus === 'APPROVED' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8F6ED] text-[#0D6832] whitespace-nowrap border border-[#C2E8D1]">
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Đã duyệt & Đã đóng</span>
                            </div>
                          ) : candidate.stage === 'payment_pending' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23] whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Chờ thanh toán</span>
                            </div>
                          ) : candidate.stage === 'class_pending' ? (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F5E6D8] text-[#8A4F23] whitespace-nowrap">
                              Chờ xếp lớp
                            </span>
                          ) : candidate.stage === 'new' ? (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EFE8E0] text-[#73675F] whitespace-nowrap">
                              Hồ sơ mới
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EFE8E0] text-[#73675F] whitespace-nowrap">
                              Chờ tư vấn
                            </span>
                          )}
                        </td>

                        {/* 5. Thao tác / In bill & check tiền */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenBillModal(candidate)}
                              className="px-2.5 py-1.5 bg-[#FAF5EF] hover:bg-[#F3E2CE] text-[#8D4B1A] border border-[#BA7E4C]/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title="In bill nộp học phí & QR chuyển khoản"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In Bill</span>
                            </button>

                            {candidate.approvalStatus !== 'APPROVED' && candidate.rawAmountPaid < candidate.rawTuitionTotal && (
                              <button
                                type="button"
                                disabled={checkingCandidateId === candidate.id}
                                onClick={() => handleCheckPayment(candidate.id)}
                                className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Kiểm tra tiền về theo mã khách hàng"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${checkingCandidateId === candidate.id ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{checkingCandidateId === candidate.id ? 'Đang check...' : 'Check tiền'}</span>
                              </button>
                            )}

                            {candidate.approvalStatus === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã duyệt</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
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

            {pendingTasks.length === 0 ? (
              <div className="bg-[#FAF7F2] rounded-xl p-4 text-center text-xs text-[#73675F] border border-[#EFE4D9]">
                Hiện tại không có việc tồn đọng cần xử lý.
              </div>
            ) : (
              pendingTasks.map((task, idx) => (
                <div key={idx} className="bg-[#F3E2CE] rounded-2xl p-4 space-y-1">
                  <div className="text-xs font-bold text-[#2C241E]">
                    {task.title}
                  </div>
                  <div className="text-xs text-[#73675F] leading-relaxed">
                    {task.desc}
                  </div>
                </div>
              ))
            )}

            {/* Footer Note */}
            <div className="text-xs text-[#73675F] pt-1">
              Dữ liệu tuyển sinh được cập nhật theo thời gian thực.
            </div>
          </div>
        </div>

        {/* Right Column (4 cols on xl): Hồ sơ đang chọn */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5 min-w-0">
          <h2 className="text-base font-bold text-[#2C241E]">Hồ sơ đang chọn</h2>

          {!selectedCandidate.id ? (
            <div className="py-12 text-center text-[#73675F]">
              <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018] mx-auto mb-2.5">
                <UserIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#2C241E]">Chưa có hồ sơ học viên nào</p>
              <p className="text-[11px] text-[#8C7A6B] mt-1">
                Tạo hồ sơ tuyển sinh mới hoặc chọn hồ sơ từ danh sách để xem chi tiết.
              </p>
            </div>
          ) : (
            <>
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

              {/* Status banner with dynamic colors */}
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  selectedCandidate.approvalStatus === 'APPROVED' || selectedCandidate.rawStatus === EnrollmentStatus.GRADUATED
                    ? 'bg-[#E8F6ED] text-[#0D6832]'
                    : selectedCandidate.rawStatus === EnrollmentStatus.STUDYING
                    ? 'bg-[#EBF5FB] text-[#1B4F72]'
                    : selectedCandidate.rawStatus === EnrollmentStatus.ENROLLED
                    ? 'bg-[#FEF9E7] text-[#7D6608]'
                    : 'bg-[#F3E2CE] text-[#8A4F23]'
                }`}
              >
                <Clock className="w-4 h-4 stroke-[2]" />
                <span>
                  Trạng thái:{' '}
                  {selectedCandidate.approvalStatus === 'APPROVED'
                    ? 'Đã duyệt & Đã thanh toán'
                    : selectedCandidate.stageLabel}
                </span>
              </div>

              {/* Bill & Payment Actions */}
              {selectedCandidate.id && (
                <div className="space-y-2 pt-2 border-t border-[#EFE4D9]">
                  <button
                    type="button"
                    onClick={() => handleOpenBillModal(selectedCandidate)}
                    className="w-full py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Bill & Mã QR Chuyển Khoản</span>
                  </button>

                  {selectedCandidate.approvalStatus !== 'APPROVED' && selectedCandidate.rawAmountPaid < selectedCandidate.rawTuitionTotal && (
                    <button
                      type="button"
                      disabled={checkingCandidateId === selectedCandidate.id}
                      onClick={() => handleCheckPayment(selectedCandidate.id)}
                      className="w-full py-2.5 bg-white border border-[#BA7E4C] text-[#8D4B1A] hover:bg-[#FAF5EF] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${checkingCandidateId === selectedCandidate.id ? 'animate-spin' : ''}`} />
                      <span>{checkingCandidateId === selectedCandidate.id ? 'Đang kiểm tra đối soát...' : 'Kiểm tra tiền về (Đối soát tự động)'}</span>
                    </button>
                  )}

                  {selectedCandidate.approvalStatus !== 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleApproveAtDesk(selectedCandidate.id)}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Duyệt & Thu tiền tại quầy</span>
                    </button>
                  )}
                </div>
              )}

              {/* Interactive FSM Action buttons */}
              {selectedCandidate.id && (
                <div className="space-y-2 pt-1 border-t border-[#EFE4D9]">
                  {selectedCandidate.rawStatus === EnrollmentStatus.ENROLLED && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateEnrollmentStatus(selectedCandidate.id, EnrollmentStatus.STUDYING)}
                      className="w-full py-2.5 bg-[#1B4F72] hover:bg-[#153e5b] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isUpdatingStatus ? 'Đang cập nhật...' : 'Xếp lớp & Bắt đầu học'}</span>
                    </button>
                  )}

                  {selectedCandidate.rawStatus === EnrollmentStatus.STUDYING && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateEnrollmentStatus(selectedCandidate.id, EnrollmentStatus.GRADUATED)}
                      className="w-full py-2.5 bg-[#0D6832] hover:bg-[#0A5428] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isUpdatingStatus ? 'Đang cập nhật...' : 'Xét tốt nghiệp & Cấp chứng chỉ'}</span>
                    </button>
                  )}

                  {selectedCandidate.rawStatus === EnrollmentStatus.GRADUATED && (
                    <div className="p-2.5 rounded-xl bg-[#E8F6ED] text-[#0D6832] text-xs font-bold text-center border border-[#C2E8D1]">
                      🎓 Học viên đã tốt nghiệp xuất sắc
                    </div>
                  )}
                </div>
              )}
            </>
          )}

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
              onSubmit={handleCreateCandidate}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Họ và tên học viên <span className="text-[#8D4B1A]">*</span></label>
                <input
                  required
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Lê Thị Hồng Ánh"
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Số điện thoại <span className="text-[#8D4B1A]">*</span></label>
                  <input
                    required
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0912 888 999"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Chi nhánh đăng ký</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="q3">Quận 3</option>
                    <option value="q1">Quận 1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Chương trình quan tâm</label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  {liveCourses.length > 0 ? (
                    liveCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.code})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="cccccccc-0001-0001-0001-000000000001">Đào tạo Dẫn lưu Bạch huyết MLD Vodder Chuyên sâu</option>
                      <option value="cccccccc-0001-0001-0001-000000000002">Dẫn lưu Bạch huyết Phù nề Sau Phẫu Thuật</option>
                      <option value="cccccccc-0001-0001-0001-000000000003">Chăm sóc Phục hồi Hệ Bạch Huyết Chuẩn Y Khoa</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Giai đoạn hồ sơ</label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value as EnrollmentStatus)}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value={EnrollmentStatus.CONSULTING}>Chờ tư vấn (CONSULTING)</option>
                    <option value={EnrollmentStatus.ENROLLED}>Đã nhập học (ENROLLED)</option>
                    <option value={EnrollmentStatus.STUDYING}>Đang theo học (STUDYING)</option>
                    <option value={EnrollmentStatus.GRADUATED}>Đã tốt nghiệp (GRADUATED)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Học phí dự kiến</label>
                  <input
                    type="text"
                    value={formTuition}
                    onChange={(e) => setFormTuition(e.target.value)}
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
                  disabled={isCreatingCandidate}
                  className="px-5 py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isCreatingCandidate ? 'Đang lưu vào Supabase...' : 'Tạo hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: In Bill & Thông tin nộp học phí VietQR */}
      <EnrollmentBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        candidate={billModalCandidate}
        onCheckPayment={handleCheckPayment}
        onApproveAtDesk={handleApproveAtDesk}
      />
    </div>
  );
};

