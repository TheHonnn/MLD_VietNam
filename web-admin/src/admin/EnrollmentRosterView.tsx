import React from 'react';
import { Link } from 'react-router-dom';
import { enrollmentSummary, type EnrollmentRow } from './enrollment-roster';

const currency = (value: number | null) => value === null ? 'Chưa xác định' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export function EnrollmentRosterView({ rows, onOpen }: { rows: EnrollmentRow[]; onOpen: (row: EnrollmentRow) => void }) {
  return <div className="admin-table-wrap">
    <table className="admin-table">
      <caption className="text-left p-4 text-sm text-[#73675F]">Mỗi dòng là một hồ sơ ghi danh. Học phí và tình trạng học tập được theo dõi riêng.</caption>
      <thead><tr><th>Học viên / liên hệ</th><th>Khóa học &amp; lớp</th><th>Học phí</th><th>Tình trạng học tập</th><th>Việc tiếp theo</th></tr></thead>
      <tbody>{rows.map(row => {
        const info = enrollmentSummary(row);
        return <tr key={row.id}>
          <td><button className="text-left font-semibold text-[#985018]" onClick={() => onOpen(row)}>{row.student_name || row.student?.full_name || 'Chưa có tên học viên'}</button><div className="text-xs text-[#73675F] mt-1">{row.student_phone || row.student?.phone || 'Chưa có số điện thoại'}</div>{row.order_code && <div className="text-xs mt-1">{row.order_code}</div>}</td>
          <td><div className="font-medium whitespace-normal max-w-xs">{row.course_title || row.courses?.title || 'Chưa có tên khóa học'}</div><div className="text-xs text-[#73675F] mt-1">{row.batch_code || row.course_batches?.batch_code || (row.batch_id ? 'Chưa tải được tên lớp' : 'Chưa xếp lớp')}</div></td>
          <td><div className="font-semibold whitespace-nowrap">{currency(info.total)}</div><div className="text-xs mt-1">Đã thu: {currency(info.paid)}</div><div className={`text-xs mt-1 ${info.remaining ? 'text-amber-700' : 'text-[#73675F]'}`}>Còn thu: {currency(info.remaining)}</div></td>
          <td><span className="inline-block rounded-lg bg-[#FAF0E4] px-2 py-1 text-xs font-medium">{info.label}</span></td>
          <td><Link className="admin-secondary" to={`/academy-enrollment?enrollmentId=${encodeURIComponent(String(row.id))}`}>{info.action}</Link></td>
        </tr>;
      })}</tbody>
    </table>
    {!rows.length && <div className="admin-empty py-10 text-center"><p>Không có hồ sơ phù hợp.</p><p className="text-xs mt-2">Thử đổi lớp, trạng thái hoặc từ khóa tìm kiếm.</p></div>}
  </div>;
}
