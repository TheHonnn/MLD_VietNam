export function canReviewEnrollmentChange(role: string | undefined, status: unknown): boolean {
  return status === 'PENDING' && ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(role || '');
}

export function enrollmentReviewPayload(role: string | undefined, status: unknown, approve: boolean, note: string) {
  if (!canReviewEnrollmentChange(role, status)) throw new Error('Yêu cầu đã xử lý hoặc bạn không có quyền duyệt.');
  if (note.trim().length < 5) throw new Error('Ghi chú xử lý cần ít nhất 5 ký tự.');
  return { approve, reviewNote: note.trim() };
}
