import { describe, expect, it } from 'vitest';
import { decideEnrollmentAction, paymentState, type EnrollmentWorkflowSnapshot } from './enrollment-workflow';

const base: EnrollmentWorkflowSnapshot = {
  consultationStatus: 'CONFIRMED',
  paymentStatus: 'PARTIALLY_PAID',
  admissionStatus: 'NOT_APPROVED',
  enrollmentStatus: 'CONSULTING',
  amountPaid: 2_000_000,
  tuitionTotal: 35_000_000,
  requiredDeposit: 2_000_000,
};

describe('enrollment workflow', () => {
  it('separates partial payment from fully paid', () => {
    expect(paymentState(0, 35_000_000)).toBe('UNPAID');
    expect(paymentState(2_000_000, 35_000_000)).toBe('PARTIALLY_PAID');
    expect(paymentState(35_000_000, 35_000_000)).toBe('PAID');
  });

  it('requires consultation and the configured deposit before approval', () => {
    expect(decideEnrollmentAction('APPROVE_ADMISSION', base).allowed).toBe(true);
    expect(decideEnrollmentAction('APPROVE_ADMISSION', { ...base, amountPaid: 1_999_999 })).toEqual({
      allowed: false,
      reasons: ['Chưa đủ mức cọc bắt buộc'],
    });
  });

  it('does not allow paid-but-unapproved students to be assigned to a batch', () => {
    expect(decideEnrollmentAction('ASSIGN_BATCH', { ...base, amountPaid: 35_000_000 }).allowed).toBe(false);
  });

  it('reports every missing graduation requirement at once', () => {
    const result = decideEnrollmentAction('GRADUATE', {
      ...base,
      admissionStatus: 'ENROLLED',
      enrollmentStatus: 'STUDYING',
      batchId: 'batch-1',
      amountPaid: 34_000_000,
      progressPercent: 95,
      completedLessons: 19,
      requiredLessons: 20,
      attendanceRate: 79,
      theoryScore: 7.9,
      practicalScore: 7.5,
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons).toHaveLength(6);
  });
});
