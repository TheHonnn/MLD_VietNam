export type ConsultationState =
  | 'PENDING_CONSULTATION'
  | 'CONSULTING'
  | 'CONFIRMED'
  | 'CANCELLED';

export type PaymentState =
  | 'UNPAID'
  | 'PENDING_VERIFICATION'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'REFUNDED';

export type AdmissionState = 'NOT_APPROVED' | 'APPROVED' | 'ENROLLED' | 'GRADUATED';

export type EnrollmentAction =
  | 'START_CONSULTATION'
  | 'CONFIRM_CONSULTATION'
  | 'RECONCILE_PAYMENT'
  | 'APPROVE_ADMISSION'
  | 'ASSIGN_BATCH'
  | 'START_STUDYING'
  | 'GRADUATE'
  | 'CANCEL';

export interface EnrollmentWorkflowSnapshot {
  consultationStatus: ConsultationState;
  paymentStatus: PaymentState;
  admissionStatus: AdmissionState;
  enrollmentStatus: string;
  amountPaid: number;
  tuitionTotal: number;
  requiredDeposit: number;
  batchId?: string | null;
  batchStarted?: boolean;
  progressPercent?: number;
  completedLessons?: number;
  requiredLessons?: number;
  attendanceRate?: number;
  theoryScore?: number;
  practicalScore?: number;
}

export interface WorkflowDecision {
  allowed: boolean;
  reasons: string[];
}

export function paymentState(amountPaid: number, tuitionTotal: number): PaymentState {
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid >= tuitionTotal && tuitionTotal > 0) return 'PAID';
  return 'PARTIALLY_PAID';
}

/** Interface duy nhất để mọi caller hỏi một chuyển trạng thái có hợp lệ hay không. */
export function decideEnrollmentAction(
  action: EnrollmentAction,
  state: EnrollmentWorkflowSnapshot,
): WorkflowDecision {
  const reasons: string[] = [];
  const require = (condition: boolean, reason: string) => {
    if (!condition) reasons.push(reason);
  };

  switch (action) {
    case 'START_CONSULTATION':
      require(state.consultationStatus === 'PENDING_CONSULTATION', 'Hồ sơ không ở trạng thái chờ tư vấn');
      break;
    case 'CONFIRM_CONSULTATION':
      require(['PENDING_CONSULTATION', 'CONSULTING'].includes(state.consultationStatus), 'Tư vấn đã được chốt hoặc đã hủy');
      break;
    case 'RECONCILE_PAYMENT':
      require(state.consultationStatus === 'CONFIRMED', 'Phải chốt tư vấn và học phí trước khi đối soát');
      break;
    case 'APPROVE_ADMISSION':
      require(state.consultationStatus === 'CONFIRMED', 'Phải chốt tư vấn trước khi duyệt');
      require(state.amountPaid >= state.requiredDeposit, 'Chưa đủ mức cọc bắt buộc');
      require(state.admissionStatus === 'NOT_APPROVED', 'Hồ sơ đã được duyệt hoặc ghi danh');
      break;
    case 'ASSIGN_BATCH':
      require(state.admissionStatus === 'APPROVED', 'Hồ sơ chưa được duyệt nhập học');
      require(!state.batchId, 'Học viên đã được xếp lớp');
      break;
    case 'START_STUDYING':
      require(state.admissionStatus === 'ENROLLED', 'Học viên chưa được ghi danh vào lớp');
      require(Boolean(state.batchId), 'Học viên chưa có lớp');
      require(Boolean(state.batchStarted), 'Lớp chưa khai giảng');
      break;
    case 'GRADUATE':
      require(Boolean(state.batchId), 'Học viên chưa có lớp');
      require(state.amountPaid >= state.tuitionTotal, 'Học viên còn công nợ học phí');
      require((state.progressPercent ?? 0) >= 100, 'Tiến độ bài học chưa đạt 100%');
      require((state.completedLessons ?? 0) >= (state.requiredLessons ?? Number.MAX_SAFE_INTEGER), 'Chưa hoàn thành toàn bộ bài bắt buộc');
      require((state.attendanceRate ?? 0) >= 80, 'Tỷ lệ điểm danh chưa đạt 80%');
      require((state.theoryScore ?? 0) >= 8, 'Điểm lý thuyết chưa đạt 8/10');
      require((state.practicalScore ?? 0) >= 8, 'Điểm thực hành chưa đạt 8/10');
      break;
    case 'CANCEL':
      require(!['GRADUATED', 'DROPPED'].includes(state.enrollmentStatus), 'Hồ sơ đã kết thúc');
      break;
  }

  return { allowed: reasons.length === 0, reasons };
}
