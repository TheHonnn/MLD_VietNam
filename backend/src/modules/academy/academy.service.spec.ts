import { describe, expect, it, vi } from 'vitest';
import { AcademyService } from './academy.service';

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
    } as any);

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
