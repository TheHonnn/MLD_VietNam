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
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  Send,
  Check,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { academyService, customerService, staffService, supabaseService, StaffWithProfile } from '../services';
import { toast } from '../components/common';
import {
  CourseEnrollment,
  Course,
  CourseBatch,
  User,
  EnrollmentStatus,
  UserRole,
  PurposeInterest,
  PaymentMethod,
  PaymentStatus,
  ConsultationStatus,
  PaymentVerificationStatus,
  StudentAdmissionStatus,
  ConsultationNote,
} from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';
import { EnrollmentBillModal, CandidateBillInfo } from '../components/enrollment/EnrollmentBillModal';
import { AssignBatchModal, AssignCandidateInfo } from '../components/enrollment/AssignBatchModal';

export type EnrollmentWorkflowTab =
  | 'ALL'
  | 'PENDING_CONSULTATION'
  | 'CONFIRMED_PENDING_PAY'
  | 'PAID_WAITING_CLASS'
  | 'ENROLLED_STUDYING';

export interface CandidateRecord {
  id: string;
  orderCode: string;
  name: string;
  code: string;
  phone: string;
  email?: string;
  avatar?: string;
  initials?: string;
  program: string;
  courseId: string;
  classBatch: string;
  batchId?: string | null;
  tuitionTotal: string;
  tuitionDeposit: string;
  rawTuitionTotal: number;
  rawAmountPaid: number;
  finalTuition: number;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rawStatus: EnrollmentStatus;

  // 3 Distinct Status Groups from Specification
  consultationStatus: ConsultationStatus;
  paymentVerificationStatus: PaymentVerificationStatus;
  studentAdmissionStatus: StudentAdmissionStatus;

  // Staff & Consultation Timeline
  assignedStaffId?: string | null;
  assignedStaffName?: string;
  consultationHistory: ConsultationNote[];
  qrCreatedAt?: string | null;

  // Detail Info for Right Panel
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
}

export const W08_Enrollment: React.FC = () => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<EnrollmentWorkflowTab>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billModalCandidate, setBillModalCandidate] = useState<CandidateBillInfo | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignCandidate, setAssignCandidate] = useState<AssignCandidateInfo | null>(null);
  const [checkingCandidateId, setCheckingCandidateId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form add new candidate state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formBranchId, setFormBranchId] = useState('Chi nhánh Quận 3 - TP.HCM');
  const [formTuition, setFormTuition] = useState('35.000.000đ');
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false);

  // Detail Panel Interactive State
  const [consultationNoteInput, setConsultationNoteInput] = useState('');
  const [consultationStatusInput, setConsultationStatusInput] = useState<ConsultationStatus>(ConsultationStatus.CONSULTING);
  const [finalTuitionInput, setFinalTuitionInput] = useState<number>(0);
  const [finalBranchInput, setFinalBranchInput] = useState<string>('Chi nhánh Quận 3 - TP.HCM');
  const [isUpdatingConsultation, setIsUpdatingConsultation] = useState(false);
  const [isFinalizingConsultation, setIsFinalizingConsultation] = useState(false);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [isManualConfirmingPay, setIsManualConfirmingPay] = useState(false);

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
  const [instructors, setInstructors] = useState<StaffWithProfile[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffWithProfile[]>([]);

  useEffect(() => {
    const fetchAcademyData = async () => {
      try {
        const [enrRes, crsRes, batRes, custRes, instRes, staffRes] = await Promise.all([
          academyService.getEnrollments(),
          academyService.getCourses(),
          academyService.getCourseBatches(),
          customerService.getCustomers(),
          staffService.getInstructors(),
          staffService.getStaffList(),
        ]);
        if (enrRes.success) setLiveEnrollments(enrRes.data);
        if (crsRes.success) setLiveCourses(crsRes.data);
        if (batRes.success) setLiveBatches(batRes.data);
        if (custRes.success) setCustomers(custRes.data);
        if (instRes.success) setInstructors(instRes.data);
        if (staffRes.success) setStaffMembers(staffRes.data);
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
    const staffMap = new Map(staffMembers.map((s) => [s.id, s.fullName]));

    return liveEnrollments.map((enr, idx) => {
      const cust = custMap.get(enr.studentId);
      const crs = crsMap.get(enr.courseId);
      const bat = batMap.get(enr.batchId || '') || liveBatches.find((b) => b.courseId === enr.courseId);

      const custName = cust?.fullName || enr.studentName || `Học viên ${idx + 1}`;
      const custPhone = cust?.phone || enr.studentPhone || '—';
      const notesCode = enr.approvalNotes?.match(/Mã KH:\s*([A-Za-z0-9_-]+)/)?.[1];
      const custCode = notesCode || `HV26${String(idx + 1).padStart(3, '0')}`;
      const orderCode = enr.orderCode || `KH-${new Date(enr.enrolledAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`;
      const programTitle = crs?.title || 'Khóa học MLD';
      const batchCode = bat?.batchCode || (enr.batchId ? `K26-${crs?.code || 'MLD'}` : 'Chưa xếp lớp');

      const total = Number(enr.finalTuition || enr.tuitionTotal || crs?.tuitionFee || 35000000);
      let paid = Number(enr.amountPaid || 0);

      const isStudying = enr.status === EnrollmentStatus.STUDYING;
      const isGraduated = (enr.status as any) === 'GRADUATED' || (enr.status as any) === 'COMPLETED';
      const isDirectlyApproved =
        enr.approvalStatus === 'APPROVED' ||
        (enr.studentAdmissionStatus as any) === 'APPROVED' ||
        (enr as any).student_status === 'APPROVED';

      const isFullyPaid = (paid >= total && total > 0) || isDirectlyApproved || isStudying || isGraduated;
      if (isFullyPaid && paid === 0) {
        paid = total;
      }
      const remaining = Math.max(0, total - paid);

      // 3 Distinct Status Groups strictly evaluated from Supabase
      const isConsultationDone =
        isFullyPaid ||
        isStudying ||
        isGraduated ||
        isDirectlyApproved ||
        enr.consultationStatus === ConsultationStatus.CONFIRMED;

      const consultationStatus: ConsultationStatus = isConsultationDone
        ? ConsultationStatus.CONFIRMED
        : (enr.consultationStatus as ConsultationStatus) || ConsultationStatus.PENDING_CONSULTATION;

      const paymentVerificationStatus: PaymentVerificationStatus =
        (isFullyPaid || paid > 0 || isDirectlyApproved)
          ? PaymentVerificationStatus.PAID
          : (enr.paymentVerificationStatus as PaymentVerificationStatus) || PaymentVerificationStatus.UNPAID;

      const studentAdmissionStatus: StudentAdmissionStatus =
        (isStudying || isGraduated || enr.batchId)
          ? StudentAdmissionStatus.ENROLLED
          : (isDirectlyApproved || isFullyPaid)
          ? StudentAdmissionStatus.APPROVED
          : (enr.studentAdmissionStatus as StudentAdmissionStatus) || StudentAdmissionStatus.NOT_APPROVED;

      const assignedStaffName = enr.assignedStaffId ? staffMap.get(enr.assignedStaffId) || 'Nhân viên tư vấn' : undefined;

      const startDateFormatted = bat?.startDate
        ? new Intl.DateTimeFormat('vi-VN').format(new Date(bat.startDate))
        : '05/11/2026 (Đợt gần nhất)';

      const initials = custName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase();

      const studentType = (enr as any).studentType || (enr as any).student_type;
      const experienceLabel =
        studentType === 'PRO'
          ? 'Học viên Chuyên nghiệp / KTV Spa'
          : studentType === 'ADVANCED'
          ? 'Đã có kinh nghiệm y khoa'
          : 'Người mới bắt đầu';

      const scheduleDisplay = bat?.scheduleText || 'Thứ 6 – Thứ 7 – Chủ nhật (13:00 – 17:00)';
      const timeSlotDisplay = scheduleDisplay.includes('13:00')
        ? '13:00 – 17:00 (Ca chiều)'
        : scheduleDisplay.includes('18:00')
        ? '18:00 – 21:00 (Ca tối)'
        : scheduleDisplay.includes('08:30')
        ? '08:30 – 16:30 (Cả ngày)'
        : '13:00 – 17:00';

      const instructorDisplay = bat?.instructorId ? 'Lâm Xuân Trường (Master Trainer)' : 'Master Trainer MLD Academy';

      const statusBadge =
        isGraduated
          ? '🎓 Đã tốt nghiệp xuất sắc'
          : studentAdmissionStatus === StudentAdmissionStatus.ENROLLED || isStudying
          ? '🎓 Đã xếp lớp & Đang học'
          : paymentVerificationStatus === PaymentVerificationStatus.PAID
          ? '✅ Đã thanh toán & Đã duyệt'
          : consultationStatus === ConsultationStatus.CONFIRMED
          ? '📋 Đã chốt tư vấn (Chờ thanh toán)'
          : consultationStatus === ConsultationStatus.CONSULTING
          ? '📞 Đang tư vấn'
          : '⏳ Chờ liên hệ tư vấn';

      return {
        id: enr.id,
        orderCode,
        name: custName,
        code: custCode,
        phone: custPhone,
        email: enr.studentEmail || cust?.email || undefined,
        avatar: cust?.avatarUrl || undefined,
        initials: initials || 'HV',
        program: programTitle,
        courseId: enr.courseId,
        classBatch: enr.batchId ? `${batchCode} · ${scheduleDisplay}` : 'Chưa xếp lớp',
        batchId: enr.batchId,
        tuitionTotal: `${total.toLocaleString('vi-VN')}đ`,
        tuitionDeposit: paid > 0 ? `Đã thu ${paid.toLocaleString('vi-VN')}đ` : 'Chưa thu tiền',
        rawTuitionTotal: total,
        rawAmountPaid: paid,
        finalTuition: total,
        approvalStatus: enr.approvalStatus,
        approvedBy: enr.approvedBy,
        approvedAt: enr.approvedAt,
        approvalNotes: enr.approvalNotes,
        rawStatus: enr.status,

        consultationStatus,
        paymentVerificationStatus,
        studentAdmissionStatus,

        assignedStaffId: enr.assignedStaffId,
        assignedStaffName,
        consultationHistory: enr.consultationHistory || [],
        qrCreatedAt: enr.qrCreatedAt,

        experience: experienceLabel,
        branch: enr.selectedBranch || 'Chi nhánh Quận 3 - TP.HCM',
        expectedClass: batchCode,
        startDate: startDateFormatted,
        schedule: scheduleDisplay,
        timeSlot: timeSlotDisplay,
        instructor: instructorDisplay,
        contractTuition: `${total.toLocaleString('vi-VN')}đ`,
        requiredDeposit: `${(crs?.depositAmount || 2000000).toLocaleString('vi-VN')}đ`,
        remainingAmount: `${remaining.toLocaleString('vi-VN')}đ`,
        statusBadge,
      };
    });
  }, [liveEnrollments, liveCourses, liveBatches, customers, staffMembers]);



  // Tab Filtering counts strictly aligned with Section 3 & 4
  const countAll = candidatesData.length;
  const countPendingConsultation = useMemo(() => {
    return candidatesData.filter(
      (c) =>
        (c.consultationStatus === ConsultationStatus.PENDING_CONSULTATION || c.consultationStatus === ConsultationStatus.CONSULTING) &&
        c.paymentVerificationStatus !== PaymentVerificationStatus.PAID
    ).length;
  }, [candidatesData]);

  const countConfirmedPendingPay = useMemo(() => {
    return candidatesData.filter(
      (c) =>
        c.consultationStatus === ConsultationStatus.CONFIRMED &&
        c.paymentVerificationStatus !== PaymentVerificationStatus.PAID
    ).length;
  }, [candidatesData]);

  const countPaidWaitingClass = useMemo(() => {
    return candidatesData.filter(
      (c) =>
        c.paymentVerificationStatus === PaymentVerificationStatus.PAID &&
        c.studentAdmissionStatus !== StudentAdmissionStatus.ENROLLED &&
        c.rawStatus !== EnrollmentStatus.STUDYING
    ).length;
  }, [candidatesData]);

  const countEnrolledStudying = useMemo(() => {
    return candidatesData.filter(
      (c) =>
        c.studentAdmissionStatus === StudentAdmissionStatus.ENROLLED ||
        c.rawStatus === EnrollmentStatus.STUDYING ||
        (c.rawStatus as any) === 'GRADUATED'
    ).length;
  }, [candidatesData]);

  // Filter candidates based on active workflow subtab and filters
  const filteredCandidates = useMemo(() => {
    return candidatesData.filter((c) => {
      const isSearchMatch = matchSearch([c.name, c.orderCode, c.code, c.phone, c.program, c.branch], searchTerm);
      const matchProgram = programFilter === 'all' || c.program.toLowerCase().includes(programFilter.toLowerCase());
      const matchBranch = branchFilter === 'all' || c.branch.toLowerCase().includes(branchFilter.toLowerCase());

      let matchTab = true;
      if (activeWorkflowTab === 'PENDING_CONSULTATION') {
        matchTab =
          (c.consultationStatus === ConsultationStatus.PENDING_CONSULTATION || c.consultationStatus === ConsultationStatus.CONSULTING) &&
          c.paymentVerificationStatus !== PaymentVerificationStatus.PAID;
      } else if (activeWorkflowTab === 'CONFIRMED_PENDING_PAY') {
        matchTab =
          c.consultationStatus === ConsultationStatus.CONFIRMED &&
          c.paymentVerificationStatus !== PaymentVerificationStatus.PAID;
      } else if (activeWorkflowTab === 'PAID_WAITING_CLASS') {
        matchTab =
          c.paymentVerificationStatus === PaymentVerificationStatus.PAID &&
          c.studentAdmissionStatus !== StudentAdmissionStatus.ENROLLED &&
          c.rawStatus !== EnrollmentStatus.STUDYING;
      } else if (activeWorkflowTab === 'ENROLLED_STUDYING') {
        matchTab =
          c.studentAdmissionStatus === StudentAdmissionStatus.ENROLLED ||
          c.rawStatus === EnrollmentStatus.STUDYING ||
          (c.rawStatus as any) === 'GRADUATED';
      }

      return isSearchMatch && matchProgram && matchBranch && matchTab;
    });
  }, [candidatesData, searchTerm, programFilter, branchFilter, activeWorkflowTab]);

  // Auto-select candidate when filteredCandidates or active tab changes
  useEffect(() => {
    if (filteredCandidates.length > 0) {
      if (!selectedCandidateId || !filteredCandidates.some((c) => c.id === selectedCandidateId)) {
        setSelectedCandidateId(filteredCandidates[0].id);
      }
    } else {
      setSelectedCandidateId('');
    }
  }, [filteredCandidates, selectedCandidateId]);

  // Selected candidate object (always prioritizing filtered list)
  const selectedCandidate: CandidateRecord | undefined = useMemo(() => {
    if (!selectedCandidateId) return filteredCandidates[0];
    return filteredCandidates.find((c) => c.id === selectedCandidateId) || filteredCandidates[0];
  }, [filteredCandidates, selectedCandidateId]);

  const isWaitingForClass = Boolean(
    selectedCandidate && (
      selectedCandidate.studentAdmissionStatus === StudentAdmissionStatus.APPROVED ||
      (selectedCandidate.paymentVerificationStatus === PaymentVerificationStatus.PAID && !selectedCandidate.batchId)
    )
  );

  const isEnrolledOrStudying = Boolean(
    selectedCandidate && (
      selectedCandidate.studentAdmissionStatus === StudentAdmissionStatus.ENROLLED ||
      selectedCandidate.rawStatus === EnrollmentStatus.STUDYING ||
      (selectedCandidate.rawStatus as any) === 'GRADUATED' ||
      Boolean(selectedCandidate.batchId)
    )
  );

  // Synchronize form inputs when selectedCandidate changes
  useEffect(() => {
    if (selectedCandidate) {
      const initialStatus =
        isWaitingForClass || isEnrolledOrStudying || selectedCandidate.paymentVerificationStatus === PaymentVerificationStatus.PAID
          ? ConsultationStatus.CONFIRMED
          : selectedCandidate.consultationStatus;
      setConsultationStatusInput(initialStatus);
      setFinalTuitionInput(selectedCandidate.finalTuition || selectedCandidate.rawTuitionTotal || 35000000);
      setFinalBranchInput(selectedCandidate.branch || 'Chi nhánh Quận 3 - TP.HCM');
    }
  }, [selectedCandidate?.id, isWaitingForClass, isEnrolledOrStudying]);

  // Dynamic Pending Tasks derived directly from real live candidates
  const pendingTasks = useMemo(() => {
    const tasks: { title: string; desc: string; type: string }[] = [];

    candidatesData
      .filter((c) => c.consultationStatus === ConsultationStatus.PENDING_CONSULTATION)
      .slice(0, 2)
      .forEach((c) => {
        tasks.push({
          title: 'Liên hệ tư vấn khách hàng mới',
          desc: `Đơn ${c.orderCode} (${c.name} - SĐT: ${c.phone}): Khách vừa đăng ký quan tâm khóa ${c.program}.`,
          type: 'consultation',
        });
      });

    candidatesData
      .filter((c) => c.consultationStatus === ConsultationStatus.CONFIRMED && c.paymentVerificationStatus !== PaymentVerificationStatus.PAID)
      .slice(0, 2)
      .forEach((c) => {
        tasks.push({
          title: 'Theo dõi thanh toán học phí đã chốt',
          desc: `Đơn ${c.orderCode} (${c.name}): Đã chốt ${c.contractTuition}, đang chờ khách chuyển khoản VietQR.`,
          type: 'payment',
        });
      });

    candidatesData
      .filter((c) => c.paymentVerificationStatus === PaymentVerificationStatus.PAID && c.studentAdmissionStatus !== StudentAdmissionStatus.ENROLLED)
      .slice(0, 2)
      .forEach((c) => {
        tasks.push({
          title: 'Xếp lớp cho học viên đã đóng học phí',
          desc: `Học viên ${c.name} (${c.orderCode}): Đã thanh toán ${c.tuitionDeposit}, cần xếp vào đợt khai giảng ${c.branch}.`,
          type: 'admission',
        });
      });

    return tasks;
  }, [candidatesData]);

  // Create new consultation request / order
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanPhone = formPhone.trim();
    if (!cleanName || !cleanPhone) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập họ tên và số điện thoại khách hàng.');
      return;
    }
    setIsCreatingCandidate(true);
    try {
      const cleanDigits = cleanPhone.replace(/\D/g, '');
      let student = customers.find((c) => (c.phone || '').replace(/\D/g, '') === cleanDigits);
      if (!student) {
        const createRes = await customerService.createCustomer({
          fullName: cleanName,
          phone: cleanPhone,
          email: formEmail.trim() || undefined,
          role: UserRole.STUDENT,
          purpose: PurposeInterest.ACADEMY,
        });
        if (createRes.data) {
          student = createRes.data;
          setCustomers((prev) => [student!, ...prev]);
        }
      }

      const targetCourseId = formCourseId || liveCourses[0]?.id || 'cccccccc-0001-0001-0001-000000000001';
      const cleanTuition = Number(formTuition.replace(/\D/g, '')) || 35000000;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const newOrderCode = `KH-${todayStr}-${String(liveEnrollments.length + 1).padStart(3, '0')}`;

      const enrRes = await academyService.createEnrollment({
        studentId: student?.id || '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        courseId: targetCourseId,
        status: EnrollmentStatus.CONSULTING,
        tuitionTotal: cleanTuition,
        amountPaid: 0,
      });

      if (enrRes.success && enrRes.data) {
        // Update the new workflow fields on Supabase Cloud
        await supabaseService.updateEnrollment(enrRes.data.id, {
          orderCode: newOrderCode,
          consultationStatus: ConsultationStatus.PENDING_CONSULTATION,
          paymentVerificationStatus: PaymentVerificationStatus.UNPAID,
          studentAdmissionStatus: StudentAdmissionStatus.NOT_APPROVED,
          finalTuition: cleanTuition,
          selectedBranch: formBranchId,
          consultationHistory: [
            {
              timestamp: new Date().toISOString(),
              author: 'Hệ thống tuyển sinh',
              note: `Khách hàng đăng ký tư vấn khóa học qua hệ thống. Mã đơn: ${newOrderCode}`,
            },
          ],
        });

        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) {
          setLiveEnrollments(refreshed);
        }
        setSelectedCandidateId(enrRes.data.id);
      }

      toast.success('Tạo đơn tư vấn thành công', `Đơn hàng ${newOrderCode} đã được lưu vào Supabase Cloud.`);
      showToast(`Đã tạo đơn ${newOrderCode} cho ${cleanName}!`);
      setIsAddModalOpen(false);
      setFormName('');
      setFormPhone('');
      setFormEmail('');
    } catch (err: any) {
      console.error('Failed to create candidate enrollment:', err);
      toast.error('Lỗi tạo đơn', err?.message || 'Không thể lưu đơn đăng ký tư vấn.');
    } finally {
      setIsCreatingCandidate(false);
    }
  };

  // Staff assignment (Section 4.1)
  const handleAssignStaff = async (staffId: string) => {
    if (!selectedCandidate) return;
    setIsAssigningStaff(true);
    try {
      const chosenStaff = staffMembers.find((s) => s.id === staffId);
      const res = await academyService.assignStaffToEnrollment(selectedCandidate.id, staffId || null);
      if (res.success) {
        setLiveEnrollments((prev) =>
          prev.map((e) => (e.id === selectedCandidate.id ? { ...e, assignedStaffId: staffId || null } : e))
        );
        toast.success(
          'Phân công thành công',
          staffId
            ? `Đã phân công nhân viên ${chosenStaff?.fullName || 'tư vấn'} phụ trách đơn ${selectedCandidate.orderCode}`
            : `Đã hủy phân công cho đơn ${selectedCandidate.orderCode}`
        );
      } else {
        toast.error('Lỗi phân công', res.message);
      }
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể cập nhật nhân viên phụ trách');
    } finally {
      setIsAssigningStaff(false);
    }
  };

  // Update consultation status & notes (Section 4.1 & 4.2)
  const handleSaveConsultationNote = async () => {
    if (!selectedCandidate) return;
    if (!consultationNoteInput.trim()) {
      toast.error('Thiếu ghi chú', 'Vui lòng nhập nội dung trao đổi hoặc tư vấn.');
      return;
    }
    setIsUpdatingConsultation(true);
    try {
      const authorName = 'Admin Tuyển Sinh';
      const res = await academyService.updateConsultationStatus(
        selectedCandidate.id,
        consultationStatusInput,
        consultationNoteInput,
        authorName
      );
      if (res.success) {
        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) setLiveEnrollments(refreshed);
        setConsultationNoteInput('');
        toast.success('Đã lưu tư vấn', `Cập nhật trạng thái tư vấn: ${consultationStatusInput}`);
        showToast('Đã lưu lịch sử tư vấn thành công!');
      } else {
        toast.error('Lỗi', res.message);
      }
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể lưu ghi chú tư vấn');
    } finally {
      setIsUpdatingConsultation(false);
    }
  };

  // Finalize consultation & lock tuition/branch (Section 4.2 & 4.3)
  const handleFinalizeConsultation = async () => {
    if (!selectedCandidate) return;
    if (!finalTuitionInput || finalTuitionInput <= 0) {
      toast.error('Học phí không hợp lệ', 'Vui lòng nhập mức học phí đã chốt với khách hàng.');
      return;
    }
    setIsFinalizingConsultation(true);
    try {
      const res = await academyService.finalizeConsultation(selectedCandidate.id, {
        finalTuition: finalTuitionInput,
        branchName: finalBranchInput,
        note: `Đã chốt học phí: ${finalTuitionInput.toLocaleString('vi-VN')}đ tại ${finalBranchInput}`,
        authorName: 'Admin Tuyển Sinh',
      });
      if (res.success) {
        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) setLiveEnrollments(refreshed);
        toast.success(
          'Đã chốt tư vấn thành công!',
          `Học phí chốt ${finalTuitionInput.toLocaleString('vi-VN')}đ. Đang mở mã QR thanh toán...`
        );
        // Automatically open the VietQR bill modal
        handleOpenBillModal({
          ...selectedCandidate,
          rawTuitionTotal: finalTuitionInput,
          branch: finalBranchInput,
        });
      } else {
        toast.error('Lỗi chốt tư vấn', res.message);
      }
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể chốt tư vấn');
    } finally {
      setIsFinalizingConsultation(false);
    }
  };

  // Open Bill & QR modal
  const handleOpenBillModal = (candidate: CandidateRecord) => {
    setBillModalCandidate({
      id: candidate.id,
      name: candidate.name,
      code: candidate.code,
      orderCode: candidate.orderCode,
      phone: candidate.phone,
      email: candidate.email,
      program: candidate.program,
      classBatch: candidate.classBatch,
      tuitionTotal: candidate.finalTuition || candidate.rawTuitionTotal,
      amountPaid: candidate.rawAmountPaid,
      branch: candidate.branch,
      schedule: candidate.schedule,
      startDate: candidate.startDate,
      approvalStatus: candidate.approvalStatus,
    });
    setIsBillModalOpen(true);
  };

  // Auto reconciliation check via bank API (Section 6.1)
  const handleCheckPayment = async (enrollmentId: string) => {
    setCheckingCandidateId(enrollmentId);
    try {
      const res = await academyService.checkEnrollmentPayment(enrollmentId);
      if (res.data?.approved || res.data?.isPaid) {
        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) setLiveEnrollments(refreshed);
        toast.success('Đối soát thành công!', res.message || 'Xác nhận tiền về và tự động duyệt học viên.');
        showToast('🎉 Nhận tiền thành công - Đã tự động duyệt học viên!');
        return { isPaid: true, message: res.message || 'Thanh toán thành công' };
      } else {
        toast.info('Chưa có giao dịch', res.message || 'Hệ thống chưa nhận được khoản tiền khớp với mã đơn hàng.');
        return { isPaid: false, message: res.message || 'Chưa nhận được thanh toán' };
      }
    } catch (err: any) {
      toast.error('Lỗi kiểm tra tiền', err?.message || 'Không thể kiểm tra giao dịch.');
      return { isPaid: false, message: err?.message || 'Lỗi kết nối' };
    } finally {
      setCheckingCandidateId(null);
    }
  };

  // Manual payment reconciliation by Admin / Accountant (Section 6.2)
  const handleManualConfirmPayment = async () => {
    if (!selectedCandidate) return;
    const amount = selectedCandidate.finalTuition || selectedCandidate.rawTuitionTotal;
    if (!window.confirm(`Xác nhận đối soát thủ công đơn hàng ${selectedCandidate.orderCode}?\nKhách hàng: ${selectedCandidate.name}\nSố tiền xác nhận đã nhận: ${amount.toLocaleString('vi-VN')}đ`)) {
      return;
    }
    setIsManualConfirmingPay(true);
    try {
      const res = await academyService.confirmPayment(selectedCandidate.id, amount, {
        authorName: 'Kế toán / Admin',
        notes: `Xác nhận nhận đủ tiền chuyển khoản cho đơn hàng ${selectedCandidate.orderCode}`,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });
      if (res.success) {
        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) setLiveEnrollments(refreshed);
        toast.success('Xác nhận thành công!', `Đơn hàng ${selectedCandidate.orderCode} đã chuyển sang ĐÃ THANH TOÁN & ĐƯỢC DUYỆT.`);
        showToast('✅ Đã xác nhận thanh toán & Duyệt học viên thành công!');
        setIsBillModalOpen(false);
      } else {
        toast.error('Lỗi đối soát', res.message);
      }
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể xác nhận thanh toán');
    } finally {
      setIsManualConfirmingPay(false);
    }
  };

  // Open class batch assignment modal (Section 4.4)
  const handleOpenAssignModal = (candidate: CandidateRecord) => {
    setAssignCandidate({
      id: candidate.id,
      name: candidate.name,
      code: candidate.code,
      phone: candidate.phone,
      program: candidate.program,
      courseId: candidate.courseId,
      currentBatchId: candidate.batchId || null,
      currentBatchCode: candidate.classBatch,
      amountPaid: candidate.rawAmountPaid,
      tuitionTotal: candidate.rawTuitionTotal,
    });
    setIsAssignModalOpen(true);
  };

  // Confirm batch assignment into Supabase Cloud (Section 4.4 & 7.2)
  const handleConfirmAssignBatch = async (enrollmentId: string, batchId: string) => {
    try {
      const res = await academyService.assignBatchToStudent(enrollmentId, batchId, 'Admin Tuyển Sinh');
      if (res.data?.success) {
        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) setLiveEnrollments(refreshed);
        const chosenBatch = liveBatches.find((b) => b.id === batchId);
        toast.success('Xếp lớp thành công!', `Học viên đã được xếp vào lớp ${chosenBatch?.batchCode || ''} và sẵn sàng học.`);
        showToast(`Đã xếp lớp ${chosenBatch?.batchCode || ''} thành công!`);
        return true;
      } else {
        toast.error('Lỗi xếp lớp', res.message || 'Không thể xếp lớp.');
        return false;
      }
    } catch (err: any) {
      toast.error('Lỗi hệ thống', err?.message || 'Vui lòng thử lại sau.');
      return false;
    }
  };

  // Graduation status handler
  const handleGraduateStudent = async (enrollmentId: string) => {
    if (!window.confirm('Xác nhận xét tốt nghiệp và cấp chứng chỉ đào tạo cho học viên này?')) return;
    try {
      const res = await academyService.updateEnrollmentStatus(enrollmentId, EnrollmentStatus.GRADUATED, {
        approvalNotes: 'Đã hoàn thành xuất sắc khóa học và được cấp chứng chỉ MLD',
      });
      if (res.success) {
        const refreshed = await supabaseService.getEnrollments();
        if (refreshed) setLiveEnrollments(refreshed);
        toast.success('Tốt nghiệp thành công', 'Học viên đã tốt nghiệp và hoàn tất khóa đào tạo.');
      }
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể xét tốt nghiệp');
    }
  };

  // Render 3 Distinct Badges (Section 3)
  const renderConsultationBadge = (status: ConsultationStatus) => {
    switch (status) {
      case ConsultationStatus.PENDING_CONSULTATION:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Chờ liên hệ</span>
          </span>
        );
      case ConsultationStatus.CONSULTING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Phone className="w-3 h-3" />
            <span>Đang tư vấn</span>
          </span>
        );
      case ConsultationStatus.CONFIRMED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Đã chốt tư vấn</span>
          </span>
        );
      case ConsultationStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <X className="w-3 h-3" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return <span className="text-gray-500 text-[11px]">Chờ tư vấn</span>;
    }
  };

  const renderPaymentBadge = (status: PaymentVerificationStatus) => {
    switch (status) {
      case PaymentVerificationStatus.UNPAID:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span>Chưa thanh toán</span>
          </span>
        );
      case PaymentVerificationStatus.PENDING_VERIFICATION:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Chờ đối soát</span>
          </span>
        );
      case PaymentVerificationStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>Đã thanh toán</span>
          </span>
        );
      case PaymentVerificationStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
            <span>Thất bại</span>
          </span>
        );
      case PaymentVerificationStatus.EXPIRED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <span>Hết hạn</span>
          </span>
        );
      case PaymentVerificationStatus.REFUNDED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span>Đã hoàn tiền</span>
          </span>
        );
      default:
        return <span className="text-gray-500 text-[11px]">Chưa thanh toán</span>;
    }
  };

  const renderStudentBadge = (status: StudentAdmissionStatus, rawStatus?: EnrollmentStatus) => {
    if (rawStatus === EnrollmentStatus.GRADUATED) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <GraduationCap className="w-3 h-3" />
          <span>Đã tốt nghiệp</span>
        </span>
      );
    }
    switch (status) {
      case StudentAdmissionStatus.NOT_APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <span>Chưa duyệt</span>
          </span>
        );
      case StudentAdmissionStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
            <UserCheck className="w-3 h-3" />
            <span>Đã duyệt (Chờ xếp lớp)</span>
          </span>
        );
      case StudentAdmissionStatus.ENROLLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300">
            <GraduationCap className="w-3 h-3" />
            <span>Đã xếp lớp</span>
          </span>
        );
      default:
        return <span className="text-gray-500 text-[11px]">Chưa duyệt</span>;
    }
  };

  const hasActiveFilter = Boolean(searchTerm.trim() || programFilter !== 'all' || branchFilter !== 'all' || activeWorkflowTab !== 'ALL');

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2C241E]">Quản lý Tuyển sinh & Nhập học</h1>
          <p className="text-xs text-[#73675F] mt-1">
            Quy trình chuẩn: Tiếp nhận tư vấn → Chốt học phí & cơ sở → Tạo mã VietQR → Đối soát ngân hàng → Duyệt học viên & Xếp lớp.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
        >
          Tạo yêu cầu tư vấn mới
        </button>
      </div>

      {/* 2. Top 4 KPI Workflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveWorkflowTab('PENDING_CONSULTATION')}
          className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
            activeWorkflowTab === 'PENDING_CONSULTATION' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">1. Chờ liên hệ tư vấn</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-[#2C241E] mt-2">{countPendingConsultation} đơn</div>
          <div className="text-[11px] text-[#8C7A6B] mt-1">Cần phân công nhân viên liên hệ</div>
        </div>

        <div
          onClick={() => setActiveWorkflowTab('CONFIRMED_PENDING_PAY')}
          className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
            activeWorkflowTab === 'CONFIRMED_PENDING_PAY' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">2. Đã chốt & Chờ thanh toán</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-[#2C241E] mt-2">{countConfirmedPendingPay} đơn</div>
          <div className="text-[11px] text-[#8C7A6B] mt-1">Đã có mã QR, chờ chuyển khoản</div>
        </div>

        <div
          onClick={() => setActiveWorkflowTab('PAID_WAITING_CLASS')}
          className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
            activeWorkflowTab === 'PAID_WAITING_CLASS' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">3. Đã thanh toán & Chờ xếp lớp</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-[#2C241E] mt-2">{countPaidWaitingClass} học viên</div>
          <div className="text-[11px] text-[#8C7A6B] mt-1">Đã xác nhận tiền, chờ phân đợt lớp</div>
        </div>

        <div
          onClick={() => setActiveWorkflowTab('ENROLLED_STUDYING')}
          className={`bg-white rounded-2xl border p-4 shadow-xs transition-all cursor-pointer ${
            activeWorkflowTab === 'ENROLLED_STUDYING' ? 'border-[#8D4B1A] ring-1 ring-[#8D4B1A]' : 'border-[#EFE4D9] hover:border-[#BA7E4C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#73675F]">4. Đã xếp lớp & Đang học</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-xl font-extrabold text-[#2C241E] mt-2">{countEnrolledStudying} học viên</div>
          <div className="text-[11px] text-[#8C7A6B] mt-1">Theo dõi thời khóa biểu & điểm danh</div>
        </div>
      </div>

      {/* 3. Sub-tabs Navigation */}
      <div className="flex border-b border-[#EFE4D9] gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveWorkflowTab('ALL')}
          className={`pb-3 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeWorkflowTab === 'ALL'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>📋 Tất cả yêu cầu</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#FAF5EF] text-[#73675F]">{countAll}</span>
        </button>

        <button
          onClick={() => setActiveWorkflowTab('PENDING_CONSULTATION')}
          className={`pb-3 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeWorkflowTab === 'PENDING_CONSULTATION'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>⏳ Chờ tư vấn & Chưa thanh toán</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#8D4B1A]">
            {countPendingConsultation}
          </span>
        </button>

        <button
          onClick={() => setActiveWorkflowTab('CONFIRMED_PENDING_PAY')}
          className={`pb-3 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeWorkflowTab === 'CONFIRMED_PENDING_PAY'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>📋 Đã chốt tư vấn & Chờ thanh toán</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800">
            {countConfirmedPendingPay}
          </span>
        </button>

        <button
          onClick={() => setActiveWorkflowTab('PAID_WAITING_CLASS')}
          className={`pb-3 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeWorkflowTab === 'PAID_WAITING_CLASS'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>✅ Đã thanh toán & Chờ xếp lớp</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F6ED] text-emerald-800">
            {countPaidWaitingClass}
          </span>
        </button>

        <button
          onClick={() => setActiveWorkflowTab('ENROLLED_STUDYING')}
          className={`pb-3 px-3.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeWorkflowTab === 'ENROLLED_STUDYING'
              ? 'text-[#8D4B1A] border-b-2 border-[#8D4B1A]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <span>🎓 Đã xếp lớp & Đang học</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800">
            {countEnrolledStudying}
          </span>
        </button>
      </div>

      {/* 4. Search and Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã đơn hàng, tên khách hàng, số điện thoại..."
            className="w-full pl-10 pr-9 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả khóa học</option>
            {liveCourses.map((c) => (
              <option key={c.id} value={c.title}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative shrink-0">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-white border border-[#EFE4D9] rounded-xl pl-3.5 pr-8 py-2 text-xs text-[#2C241E] cursor-pointer focus:outline-none focus:border-[#985018]"
          >
            <option value="all">Tất cả cơ sở đào tạo</option>
            <option value="Quận 3">Cơ sở Quận 3</option>
            <option value="Quận 1">Cơ sở Quận 1</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setProgramFilter('all');
              setBranchFilter('all');
              setActiveWorkflowTab('ALL');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* 5. Main 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Table + Việc cần làm */}
        <div className="xl:col-span-8 space-y-5 min-w-0">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#EFE4D9] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#2C241E]">Danh sách yêu cầu & Đơn đăng ký tuyển sinh</h2>
                <p className="text-[11px] text-[#73675F] mt-0.5">Hiển thị độc lập 3 nhóm trạng thái: Tư vấn, Thanh toán và Nhập học</p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#F3E2CE] text-[#8A4F23]">
                {filteredCandidates.length} hồ sơ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px] whitespace-nowrap">
                <thead>
                  <tr className="bg-[#FAF5EF] text-[#73675F] text-[11px] font-bold border-b border-[#EFE4D9]">
                    <th className="py-3 px-3.5 w-[22%]">MÃ ĐƠN & KHÁCH HÀNG</th>
                    <th className="py-3 px-3.5 w-[24%]">KHÓA HỌC & CƠ SỞ</th>
                    <th className="py-3 px-3.5 w-[16%]">HỌC PHÍ ĐÃ CHỐT</th>
                    <th className="py-3 px-3.5 w-[22%]">3 TRẠNG THÁI QUY TRÌNH</th>
                    <th className="py-3 px-3.5 w-[16%] text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE4D9] text-xs">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#73675F]">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy hồ sơ nào</p>
                          <p className="text-xs text-[#8C7A6B]">
                            Không có yêu cầu đăng ký nào khớp với bộ lọc hoặc từ khóa tìm kiếm.
                          </p>
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
                          {/* 1. Mã đơn & Khách hàng */}
                          <td className="py-3 px-3.5">
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
                                <div className="font-bold text-xs text-[#2C241E] flex items-center gap-1.5">
                                  <span>{candidate.name}</span>
                                </div>
                                <div className="text-[11px] text-[#73675F] flex items-center gap-1 mt-0.5">
                                  <span className="font-mono font-bold text-[#8D4B1A] bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    {candidate.orderCode}
                                  </span>
                                  <span>· {candidate.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Khóa học & Cơ sở */}
                          <td className="py-3 px-3.5">
                            <div className="font-medium text-xs text-[#2C241E] truncate max-w-[200px]" title={candidate.program}>
                              {candidate.program}
                            </div>
                            <div className="text-[11px] text-[#73675F] mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#8D4B1A] shrink-0" />
                              <span className="truncate">{candidate.branch}</span>
                            </div>
                          </td>

                          {/* 3. Học phí */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-xs text-[#2C241E]">
                              {candidate.tuitionTotal}
                            </div>
                            <div className="text-[11px] text-[#73675F] mt-0.5">
                              {candidate.tuitionDeposit}
                            </div>
                          </td>

                          {/* 4. 3 Nhóm trạng thái (Tư vấn, Thanh toán, Học viên) */}
                          <td className="py-3 px-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#73675F] w-12 shrink-0">Tư vấn:</span>
                                {renderConsultationBadge(candidate.consultationStatus)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#73675F] w-12 shrink-0">Thanh toán:</span>
                                {renderPaymentBadge(candidate.paymentVerificationStatus)}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#73675F] w-12 shrink-0">Học viên:</span>
                                {renderStudentBadge(candidate.studentAdmissionStatus, candidate.rawStatus)}
                              </div>
                            </div>
                          </td>

                          {/* 5. Thao tác nhanh */}
                          <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenBillModal(candidate)}
                                className="px-2.5 py-1.5 bg-[#FAF5EF] hover:bg-[#F3E2CE] text-[#8D4B1A] border border-[#BA7E4C]/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title="In Bill & Xem mã VietQR"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>In Bill / QR</span>
                              </button>

                              {candidate.paymentVerificationStatus !== PaymentVerificationStatus.PAID && (
                                <button
                                  type="button"
                                  disabled={checkingCandidateId === candidate.id}
                                  onClick={() => handleCheckPayment(candidate.id)}
                                  className="px-2 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Kiểm tra tiền về tài khoản MB Bank"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${checkingCandidateId === candidate.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}

                              {candidate.paymentVerificationStatus === PaymentVerificationStatus.PAID && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(candidate)}
                                  className="px-2.5 py-1.5 bg-[#EBF5FB] hover:bg-[#D4E6F1] text-[#1B4F72] border border-[#A9CCE3] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                  title="Xếp lớp học viên vào đợt khai giảng"
                                >
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  <span>{candidate.batchId ? 'Đổi lớp' : 'Xếp lớp'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#73675F]">
              <span>Hiển thị {filteredCandidates.length} / {candidatesData.length} yêu cầu</span>
              <div className="flex items-center gap-1">
                <span>Dữ liệu thực tế từ Supabase Cloud PostgreSQL</span>
              </div>
            </div>
          </div>

          {/* Việc cần làm (Dynamic Tasks) */}
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <h2 className="text-sm font-bold text-[#2C241E]">Việc cần làm theo quy trình</h2>
            {pendingTasks.length === 0 ? (
              <div className="bg-[#FAF7F2] rounded-xl p-4 text-center text-xs text-[#73675F] border border-[#EFE4D9]">
                Hiện tại không có việc tồn đọng cần xử lý.
              </div>
            ) : (
              pendingTasks.map((task, idx) => (
                <div key={idx} className="bg-[#FAF5EF] rounded-xl p-3.5 border border-[#EFE4D9] space-y-1">
                  <div className="text-xs font-bold text-[#2C241E] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#8D4B1A]" />
                    <span>{task.title}</span>
                  </div>
                  <div className="text-xs text-[#73675F] leading-relaxed pl-3.5">
                    {task.desc}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Detailed Action Panel strictly implementing Section 4 & 5 */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4 min-w-0">
          <div className="border-b border-[#EFE4D9] pb-3">
            <h2 className="text-base font-bold text-[#2C241E]">Chi tiết đơn & Thao tác quy trình</h2>
            <p className="text-[11px] text-[#73675F] mt-0.5">Cập nhật tư vấn, chốt học phí, QR thanh toán và xếp lớp</p>
          </div>

          {!selectedCandidate ? (
            <div className="py-12 text-center text-[#73675F]">
              <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018] mx-auto mb-2.5">
                <UserIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#2C241E]">Chưa chọn hồ sơ nào</p>
              <p className="text-[11px] text-[#8C7A6B] mt-1">Chọn một hồ sơ bên trái để thao tác.</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Customer & Order Header */}
              <div className="p-3.5 rounded-xl bg-[#FAF5EF] border border-[#EFE4D9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-[#8D4B1A] text-sm bg-amber-100/60 px-2 py-0.5 rounded border border-amber-300">
                    {selectedCandidate.orderCode}
                  </span>
                  <span className="text-[11px] text-[#73675F]">Mã KH: {selectedCandidate.code}</span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="w-9 h-9 rounded-full bg-[#F3E2CE] text-[#8A4F23] font-bold text-xs flex items-center justify-center shrink-0">
                    {selectedCandidate.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#2C241E] text-xs truncate">{selectedCandidate.name}</div>
                    <div className="text-[11px] text-[#73675F] truncate">{selectedCandidate.phone}</div>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-[#EFE4D9] space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#73675F]">Khóa học:</span>
                    <span className="font-semibold text-[#2C241E] text-right truncate max-w-[180px]">
                      {selectedCandidate.program}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73675F]">Cơ sở đào tạo:</span>
                    <span className="font-semibold text-[#2C241E] text-right">{selectedCandidate.branch}</span>
                  </div>
                </div>
              </div>

              {/* 3 Status Summary */}
              <div className="p-3 rounded-xl bg-white border border-[#EFE4D9] space-y-2">
                <div className="text-[11px] font-bold text-[#73675F] uppercase tracking-wider">
                  Trạng thái quy trình hiện tại
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#73675F]">1. Trạng thái tư vấn:</span>
                    {renderConsultationBadge(selectedCandidate.consultationStatus)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#73675F]">2. Trạng thái thanh toán:</span>
                    {renderPaymentBadge(selectedCandidate.paymentVerificationStatus)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#73675F]">3. Trạng thái học viên:</span>
                    {renderStudentBadge(selectedCandidate.studentAdmissionStatus, selectedCandidate.rawStatus)}
                  </div>
                </div>
              </div>

              {/* STEP 1: Phân công nhân viên phụ trách tư vấn (Spec 4.1) */}
              <div className="p-3.5 rounded-xl bg-white border border-[#EFE4D9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#2C241E] text-xs flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#8D4B1A]" />
                    <span>Phân công nhân viên phụ trách</span>
                  </label>
                  {isAssigningStaff && <span className="text-[10px] text-amber-700 font-semibold animate-pulse">Đang lưu...</span>}
                </div>
                <select
                  value={selectedCandidate.assignedStaffId || ''}
                  onChange={(e) => handleAssignStaff(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  <option value="">-- Chưa phân công nhân viên --</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} ({staff.role})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-[#73675F]">
                  Nhân viên được phân công chịu trách nhiệm liên hệ và chốt học phí với khách hàng.
                </div>
              </div>

              {/* STEP 2: Lịch sử & Ghi chú tư vấn (Spec 4.1 & 4.2) */}
              <div className="p-3.5 rounded-xl bg-white border border-[#EFE4D9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#2C241E] text-xs flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#8D4B1A]" />
                    <span>Ghi chú & Lịch sử tư vấn</span>
                  </label>
                  <span className="text-[10px] text-[#73675F]">
                    {selectedCandidate.consultationHistory.length} ghi chú
                  </span>
                </div>

                {/* Consultation timeline */}
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedCandidate.consultationHistory.length === 0 ? (
                    <div className="p-2.5 text-center text-[11px] text-[#73675F] bg-[#FAF5EF] rounded-lg border border-dashed border-[#EFE4D9]">
                      Chưa có ghi chú liên hệ nào.
                    </div>
                  ) : (
                    selectedCandidate.consultationHistory.map((note, idx) => (
                      <div key={idx} className="p-2 bg-[#FAF7F2] rounded-lg border border-[#EFE4D9] text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between text-[#8D4B1A] font-semibold text-[10px]">
                          <span>{note.author || 'Nhân viên tư vấn'}</span>
                          <span>{note.timestamp ? new Date(note.timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                        </div>
                        <div className="text-[#2C241E]">{note.note}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add note & status update form */}
                <div className="space-y-2 pt-1 border-t border-[#EFE4D9]">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={consultationStatusInput}
                      onChange={(e) => setConsultationStatusInput(e.target.value as ConsultationStatus)}
                      className="px-2.5 py-1.5 bg-white border border-[#EFE4D9] rounded-lg text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    >
                      <option value={ConsultationStatus.PENDING_CONSULTATION}>Chờ liên hệ</option>
                      <option value={ConsultationStatus.CONSULTING}>Đang tư vấn</option>
                      <option value={ConsultationStatus.CONFIRMED}>Đã chốt tư vấn</option>
                      <option value={ConsultationStatus.CANCELLED}>Hủy đăng ký</option>
                    </select>
                    <button
                      type="button"
                      disabled={isUpdatingConsultation || !consultationNoteInput.trim()}
                      onClick={handleSaveConsultationNote}
                      className="px-3 py-1.5 bg-[#FAF5EF] hover:bg-[#F3E2CE] text-[#8D4B1A] border border-[#BA7E4C] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isUpdatingConsultation ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={consultationNoteInput}
                    onChange={(e) => setConsultationNoteInput(e.target.value)}
                    placeholder="Nhập nội dung trao đổi với khách..."
                    className="w-full px-3 py-1.5 border border-[#EFE4D9] rounded-lg text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveConsultationNote();
                      }
                    }}
                  />
                </div>
              </div>

              {/* STEP 3: Chốt tư vấn & Tạo yêu cầu thanh toán VietQR (Spec 4.2 & 4.3) */}
              {isWaitingForClass || isEnrolledOrStudying || selectedCandidate.paymentVerificationStatus === PaymentVerificationStatus.PAID ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chốt học phí & Cơ sở đào tạo</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ✅ Đã hoàn tất
                    </span>
                  </div>
                  <div className="text-[11px] text-[#2C241E] flex items-center justify-between pt-1 border-t border-emerald-100">
                    <span>Học phí chốt: <strong className="text-[#8D4B1A] font-bold">{selectedCandidate.tuitionTotal}</strong></span>
                    <span>Cơ sở: <strong className="font-semibold text-[#2C241E]">{selectedCandidate.branch}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#FAF5EF] border border-[#EFE4D9] space-y-2.5">
                  <div className="font-bold text-[#8D4B1A] text-xs flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Chốt học phí & Cơ sở đào tạo (Bước quan trọng)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-[#73675F] block mb-1">Học phí chốt (VNĐ):</label>
                      <input
                        type="number"
                        step={500000}
                        value={finalTuitionInput}
                        onChange={(e) => setFinalTuitionInput(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#EFE4D9] rounded-lg text-xs font-bold text-[#8D4B1A] focus:outline-none focus:border-[#985018]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#73675F] block mb-1">Cơ sở đào tạo:</label>
                      <select
                        value={finalBranchInput}
                        onChange={(e) => setFinalBranchInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#EFE4D9] rounded-lg text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                      >
                        <option value="Chi nhánh Quận 3 - TP.HCM">Chi nhánh Quận 3</option>
                        <option value="Chi nhánh Quận 1 - TP.HCM">Chi nhánh Quận 1</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isFinalizingConsultation}
                    onClick={handleFinalizeConsultation}
                    className="w-full py-2 bg-[#8D4B1A] hover:bg-[#783E15] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isFinalizingConsultation ? 'Đang lưu vào Supabase...' : 'Chốt tư vấn & Tạo mã VietQR'}</span>
                  </button>
                </div>
              )}

              {/* STEP 4: Quản lý thanh toán & Đối soát ngân hàng (Spec 4.3, 5, 6) */}
              <div className="p-3.5 rounded-xl bg-white border border-[#EFE4D9] space-y-2">
                <div className="font-bold text-[#2C241E] text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#8D4B1A]" />
                    <span>Thanh toán & Đối soát VietQR</span>
                  </span>
                  <span className="font-bold text-[#8D4B1A]">{selectedCandidate.tuitionTotal}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-[#FAF7F2] p-2 rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#73675F] block">Đã thực nhận:</span>
                    <strong className="text-emerald-700 text-xs">
                      {isWaitingForClass || isEnrolledOrStudying || selectedCandidate.paymentVerificationStatus === PaymentVerificationStatus.PAID
                        ? `Đã thu ${selectedCandidate.tuitionTotal}`
                        : selectedCandidate.tuitionDeposit}
                    </strong>
                  </div>
                  <div className="bg-[#FAF7F2] p-2 rounded-lg border border-[#EFE4D9]">
                    <span className="text-[#73675F] block">Còn lại cần thu:</span>
                    <strong className={`${isWaitingForClass || isEnrolledOrStudying || selectedCandidate.paymentVerificationStatus === PaymentVerificationStatus.PAID ? 'text-emerald-700' : 'text-rose-700'} text-xs`}>
                      {isWaitingForClass || isEnrolledOrStudying || selectedCandidate.paymentVerificationStatus === PaymentVerificationStatus.PAID
                        ? '0đ'
                        : selectedCandidate.remainingAmount}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBillModal(selectedCandidate)}
                  className="w-full py-2 bg-white border border-[#BA7E4C] text-[#8D4B1A] hover:bg-[#FAF5EF] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Bill / Tải ảnh QR gửi cho khách (Zalo)</span>
                </button>

                {selectedCandidate.paymentVerificationStatus !== PaymentVerificationStatus.PAID && !isWaitingForClass && !isEnrolledOrStudying ? (
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      disabled={checkingCandidateId === selectedCandidate.id}
                      onClick={() => handleCheckPayment(selectedCandidate.id)}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingCandidateId === selectedCandidate.id ? 'animate-spin' : ''}`} />
                      <span>{checkingCandidateId === selectedCandidate.id ? 'Đang kiểm tra MB Bank...' : 'Kiểm tra đối soát tự động (API MB Bank)'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isManualConfirmingPay}
                      onClick={handleManualConfirmPayment}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isManualConfirmingPay ? 'Đang xác nhận...' : 'Xác nhận đối soát thủ công (Admin/Kế toán)'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Học phí đã được đối soát & thanh toán thành công</span>
                  </div>
                )}
              </div>

              {/* STEP 5: Duyệt học viên & Xếp lớp (Spec 4.4) */}
              <div className="p-3.5 rounded-xl bg-white border border-[#EFE4D9] space-y-2.5">
                <div className="font-bold text-[#2C241E] text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#1B4F72]" />
                    <span>Duyệt học viên & Xếp lớp khai giảng</span>
                  </span>
                  {selectedCandidate.batchId ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF5FB] text-[#1B4F72]">
                      Đã có lớp
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">
                      Chưa xếp lớp
                    </span>
                  )}
                </div>

                {selectedCandidate.paymentVerificationStatus !== PaymentVerificationStatus.PAID && !isWaitingForClass && !isEnrolledOrStudying ? (
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[#73675F] text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Cần xác nhận thanh toán trước khi xếp lớp học chính thức.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-[#EBF5FB] text-[11px] text-[#1B4F72] border border-[#A9CCE3] space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>Lớp: {selectedCandidate.expectedClass}</span>
                        <span>{selectedCandidate.startDate}</span>
                      </div>
                      <div className="text-[10px] text-[#5D6D7E]">Lịch học: {selectedCandidate.schedule}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(selectedCandidate)}
                      className="w-full py-2 bg-[#1B4F72] hover:bg-[#153e5b] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>{selectedCandidate.batchId ? 'Đổi sang đợt khai giảng khác' : 'Xếp lớp vào đợt khai giảng'}</span>
                    </button>

                    {selectedCandidate.rawStatus === EnrollmentStatus.STUDYING && (
                      <button
                        type="button"
                        onClick={() => handleGraduateStudent(selectedCandidate.id)}
                        className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xét tốt nghiệp & Cấp chứng chỉ</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#2C241E] text-white px-4 py-3 rounded-xl shadow-lg border border-[#D7BBA6] flex items-center gap-2.5 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#E29D62]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Disclaimer / System Info */}
      <div className="flex items-center gap-2 text-xs text-[#73675F] pt-2">
        <Info className="w-4 h-4 shrink-0 text-[#8A4F23]" />
        <span>Hệ thống quản lý tuyển sinh, thanh toán VietQR & nhập học MLD Việt Nam • Dữ liệu thật lưu tại Supabase Cloud.</span>
      </div>

      {/* MODAL: Tạo yêu cầu tư vấn mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#EFE4D9] flex items-center justify-between bg-[#FAF5EF]">
              <div>
                <h3 className="text-base font-bold text-[#2C241E]">Tạo yêu cầu đăng ký tư vấn mới</h3>
                <p className="text-xs text-[#73675F] mt-0.5">Hồ sơ sẽ bắt đầu ở trạng thái: Chờ liên hệ & Chưa thanh toán</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">
                  Họ và tên khách hàng <span className="text-[#8D4B1A]">*</span>
                </label>
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
                  <label className="block font-semibold text-[#2C241E] mb-1.5">
                    Số điện thoại <span className="text-[#8D4B1A]">*</span>
                  </label>
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
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Email liên hệ</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="honganh@gmail.com"
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#2C241E] mb-1.5">Cơ sở mong muốn</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="Chi nhánh Quận 3 - TP.HCM">Quận 3 - TP.HCM</option>
                    <option value="Chi nhánh Quận 1 - TP.HCM">Quận 1 - TP.HCM</option>
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

              <div>
                <label className="block font-semibold text-[#2C241E] mb-1.5">Khóa đào tạo quan tâm</label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EFE4D9] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                >
                  {liveCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.code}) - {c.tuitionFee?.toLocaleString('vi-VN')}đ
                    </option>
                  ))}
                </select>
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
                  {isCreatingCandidate ? 'Đang lưu vào Supabase...' : 'Tạo đơn tư vấn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: In Bill & Thông tin nộp học phí VietQR Napas 247 */}
      <EnrollmentBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
        candidate={billModalCandidate}
        onCheckPayment={handleCheckPayment}
        onApproveAtDesk={handleManualConfirmPayment}
      />

      {/* MODAL: Xếp lớp & Phân đợt khai giảng */}
      <AssignBatchModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        candidate={assignCandidate}
        batches={liveBatches}
        courses={liveCourses}
        instructors={instructors}
        onAssignBatch={handleConfirmAssignBatch}
      />
    </div>
  );
};
