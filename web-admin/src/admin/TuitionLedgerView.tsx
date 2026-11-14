import React from 'react';
import { Link } from 'react-router-dom';
import type { Row } from './api';

const labels: Record<string, string> = { DEPOSIT: 'Đặt cọc', INSTALLMENT: 'Thu từng đợt', INSTALLMENT_1: 'Thu đợt 1', INSTALLMENT_2: 'Thu đợt 2', REMAINING_BALANCE: 'Thu phần còn lại', FULL_PAYMENT: 'Thu học phí', REFUND: 'Hoàn học phí', PAID: 'Đã xác nhận', UNPAID: 'Chưa thanh toán', PENDING: 'Chờ xác nhận', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn tiền', CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CARD: 'Thẻ' };
export function TuitionLedgerView({ rows, onOpen }: { rows: Row[]; onOpen: (row: Row) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table">
    <caption className="p-4 text-left text-sm text-[#73675F]">Sổ giao dịch học phí. Chỉ giao dịch đã xác nhận mới được tính là đã thu; <Link to="/manage/course_enrollments" className="text-[#985018] underline">Xem số còn thu theo từng hồ sơ ghi danh</Link>.</caption>
    <thead><tr><th>Chứng từ</th><th>Học viên &amp; khóa học</th><th>Loại giao dịch</th><th>Số tiền</th><th>Thanh toán</th><th>Đối chiếu</th></tr></thead>
    <tbody>{rows.map(row => {
      const amount = row.amount == null || row.amount === '' ? NaN : Number(row.amount);
      const date = row.paid_at ? new Date(row.paid_at) : null;
      return <tr key={row.id}>
        <td><button className="font-semibold text-[#985018] text-left" onClick={() => onOpen(row)}>{row.transaction_code || row.receipt_number || 'Xem chứng từ'}</button><div className="text-xs mt-1 text-[#73675F]">{date && Number.isFinite(date.getTime()) ? date.toLocaleString('vi-VN') : 'Chưa có thời gian giao dịch'}</div></td>
        <td><div className="font-medium">{row.student_name || row.student?.full_name || 'Chưa có tên học viên'}</div><div className="text-xs mt-1 whitespace-normal max-w-xs">{row.course_title || row.courses?.title || 'Chưa có tên khóa học'}</div></td>
        <td>{labels[row.transaction_type] || row.transaction_type || 'Chưa xác định'}</td>
        <td className={row.transaction_type === 'REFUND' ? 'font-semibold text-rose-700' : 'font-semibold'}>{Number.isFinite(amount) ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount) : 'Chưa xác định'}</td>
        <td><div>{labels[row.payment_status] || row.payment_status || 'Chưa xác định'}</div><div className="text-xs mt-1 text-[#73675F]">{labels[row.payment_method] || row.payment_method || 'Chưa có phương thức'}</div></td>
        <td>{row.enrollment_id ? <Link className="admin-secondary" to={`/academy-enrollment?enrollmentId=${encodeURIComponent(String(row.enrollment_id))}`}>Mở hồ sơ</Link> : <span>Thiếu liên kết hồ sơ</span>}</td>
      </tr>;
    })}</tbody></table>{!rows.length && <div className="admin-empty py-10 text-center">Không có giao dịch phù hợp. Thử thay đổi bộ lọc hoặc từ khóa.</div>}</div>;
}
