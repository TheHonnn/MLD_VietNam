import React, { useEffect, useState } from 'react';
import { adminCommand, Row } from '../admin/api';

export function TreatmentPackageHistory({ id, revision }: { id: string; revision: number }) {
  const [data, setData] = useState<{ journals: Row[]; logs: Row[]; invoices: Row[]; bookings: Row[]; deliveries: Row[] }>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(undefined); setError('');
    adminCommand<{ journals: Row[]; logs: Row[]; invoices: Row[]; bookings: Row[]; deliveries: Row[] }>(`treatment/packages/${encodeURIComponent(id)}/detail`)
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, revision, retry]);
  if (error) return <div role="alert" className="tw-error">{error}<button onClick={() => setRetry(v => v + 1)}>Thử lại</button></div>;
  if (!data) return <p role="status">Đang tải lịch sử liệu trình…</p>;
  const statuses: Record<string, string> = { DRAFT: 'Bản nháp', SUBMITTED: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', REVIEW_REQUIRED: 'Chờ duyệt chuyên môn', PENDING: 'Chờ xử lý' };
  const actions: Record<string, string> = { PAUSE: 'Tạm dừng', RESUME: 'Tiếp tục', EXTEND_EXPIRY: 'Gia hạn', CANCEL: 'Hủy gói', TRANSFER: 'Chuyển nhượng', REFUND: 'Hoàn tiền' };
  return <div className="tw-history"><h3>Giao dịch kích hoạt</h3>{data.invoices.length ? data.invoices.map((row, i) => <p key={i}><strong>{row.invoice_code}</strong><br />{row.branch_name} · {Number(row.total_amount).toLocaleString('vi-VN')}đ</p>) : <p>Chưa liên kết hóa đơn kích hoạt.</p>}
    <h3>Lịch sắp tới</h3>{data.bookings.length ? data.bookings.map(row => <article key={row.id}><strong>{row.booking_code}</strong><p>{new Date(row.booking_date).toLocaleDateString('vi-VN')} · {String(row.start_time).slice(0,5)} · {row.branch_name}</p></article>) : <p>Chưa có lịch hẹn tiếp theo được liên kết với gói.</p>}
    <h3>Lịch sử buổi chăm sóc</h3>{data.journals.length ? data.journals.map(row => <article key={row.id}><strong>Buổi {row.session_number} · {new Date(row.session_date).toLocaleDateString('vi-VN')}</strong><p>{row.is_reversed ? 'Đã hoàn tác' : statuses[row.confirmation_status] || 'Chưa xác định trạng thái'}{row.booking_code ? ` · ${row.booking_code}` : ''}</p>{row.home_care_instructions && <details><summary>Hướng dẫn chăm sóc đã ghi nhận</summary><p>{row.home_care_instructions}</p></details>}</article>) : <p>Chưa có buổi chăm sóc nào được ghi nhận.</p>}
    <h3>Hướng dẫn đã giao</h3>{data.deliveries.length ? data.deliveries.map(row => <article key={row.id}><strong>{row.content_snapshot?.title} · v{row.guideline_version || '—'}</strong><p>Buổi {row.session_number} · {row.sender_name || 'Chưa xác định người giao'} · {new Date(row.sent_at).toLocaleString('vi-VN')}</p><details><summary>Nội dung tại thời điểm giao</summary><p>{row.content_snapshot?.content}</p></details></article>) : <p>Chưa có hướng dẫn được giao từ thư viện.</p>}<h3>Timeline vận hành</h3>{data.logs.length ? data.logs.map((row, i) => <article key={i}><strong>{actions[row.action] || row.action}</strong><p>{new Date(row.performed_at).toLocaleString('vi-VN')} · {row.actor_name || 'Chưa xác định người thực hiện'}</p><p>{row.reason}</p></article>) : <p>Chưa có thao tác vòng đời được ghi nhận.</p>}
  </div>;
}
