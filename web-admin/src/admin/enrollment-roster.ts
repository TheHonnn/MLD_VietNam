export type EnrollmentRow = Record<string, any>;

/** Read persisted financial and admission facts independently. Never infer a payment from a class. */
export function enrollmentSummary(row: EnrollmentRow) {
  const money = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const total = money(row.final_tuition ?? row.tuition_total);
  const paid = money(row.amount_paid);
  const remaining = total !== null && paid !== null ? Math.max(0, total - paid) : null;
  const status = String(row.status || '');
  const admission = String(row.student_status || '');
  const closed = ['DROPPED', 'CANCELLED'].includes(status);
  const completed = ['GRADUATED', 'COMPLETED'].includes(status) || ['GRADUATED', 'COMPLETED'].includes(admission);
  const suspended = row.access_status === 'SUSPENDED';
  const expired = row.access_status === 'EXPIRED';
  const approved = row.approval_status === 'APPROVED' || ['APPROVED', 'ENROLLED'].includes(admission);
  const label = closed ? 'Đã dừng học' : completed ? 'Đã hoàn thành' : suspended ? 'Đang bảo lưu' : expired ? 'Hết hạn học tập' : status === 'STUDYING' ? 'Đang học' : row.batch_id ? 'Đã xếp lớp' : approved ? 'Chờ xếp lớp' : 'Chờ xử lý tuyển sinh';
  const action = closed || completed ? 'Xem hồ sơ' : suspended || expired ? 'Xem yêu cầu học tập' : row.batch_id ? 'Xem hồ sơ học tập' : approved ? 'Xếp lớp' : 'Xử lý tuyển sinh';
  return { total, paid, remaining, label, action };
}
