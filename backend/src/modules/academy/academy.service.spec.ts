import { describe, expect, it, vi } from 'vitest';
import { AcademyService } from './academy.service';

describe('Academy change request acknowledgment', () => {
  it('throws an HTTP error when the database refuses a decision instead of returning false success through the global interceptor', async () => {
    const service = new AcademyService({ adminClient: { rpc: vi.fn().mockResolvedValue({data:null,error:{message:'Yêu cầu đã được xử lý'}}) } } as any, {} as any);
    await expect(service.resolveEnrollmentChangeRequest('request','admin',true,'Review reason')).rejects.toMatchObject({status:400});
  });
});

describe('AcademyService.getMyResults', () => {
  it('filters academic records by the authenticated student and returns no demo record', async () => {
    const query: any = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [
            {
              id: 'record-1',
              theory_score: 8,
              practical_score: 9,
              attended_sessions: 8,
              total_batch_sessions: 10,
              attendance_rate: 80,
              feedback_theory: 'Tốt',
              feedback_practical: 'Đạt',
              course_enrollments: { courses: { title: 'Khóa thử nghiệm' } },
            },
          ],
          error: null,
        }).then(resolve),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);

    const service = new AcademyService({
      adminClient: { from: vi.fn().mockReturnValue(query) },
    } as any, {} as any);

    const result = await service.getMyResults('student-123');

    expect(query.eq).toHaveBeenCalledWith('course_enrollments.student_id', 'student-123');
    expect(result).toEqual({
      success: true,
      data: [
        expect.objectContaining({
          id: 'record-1',
          courseTitle: 'Khóa thử nghiệm',
          theoryScore: 8,
          practicalScore: 9,
        }),
      ],
    });
  });
});
describe('Academy payment reconciliation', () => {
  it('reads recorded payments without depending on the Supabase API key', async () => {
    const from = vi.fn().mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        error: { message: 'Invalid API key' },
      }) }) }),
    });
    const query = vi.fn().mockResolvedValue({ rows: [{
      id: 'enrollment', tuition_total: 1000000, required_deposit: 200000,
      amount_paid: 0, invoice_amount: 0, transaction_amount: 0,
    }] });
    const service = new AcademyService({ adminClient: { from } } as any, { connection: { query } } as any);

    const result = await service.checkEnrollmentPayment('enrollment', 'admin');

    expect(result).toMatchObject({ success: true, data: { isPaid: false } });
    expect(from).not.toHaveBeenCalled();
  });
});
