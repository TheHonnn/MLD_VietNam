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
  if (error) return (
    <div role="alert" className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded-xl p-3 text-xs font-semibold flex items-center justify-between gap-2">
      <span>{error}</span>
      <button type="button" onClick={() => setRetry(v => v + 1)} className="px-2.5 py-1 rounded-lg bg-white border border-[#FECACA] text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer shrink-0">Thử lại</button>
    </div>
  );
  if (!data) return <p role="status" className="text-xs text-[#73675F] py-4">Đang tải lịch sử liệu trình…</p>;
  const statuses: Record<string, string> = { DRAFT: 'Bản nháp', SUBMITTED: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', REVIEW_REQUIRED: 'Chờ duyệt chuyên môn', PENDING: 'Chờ xử lý' };
  const actions: Record<string, string> = { PAUSE: 'Tạm dừng', RESUME: 'Tiếp tục', EXTEND_EXPIRY: 'Gia hạn', CANCEL: 'Hủy gói', TRANSFER: 'Chuyển nhượng', REFUND: 'Hoàn tiền' };
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] mb-2">Giao dịch kích hoạt</h3>
        {data.invoices.length ? (
          <div className="space-y-2">
            {data.invoices.map((row, i) => (
              <div key={i} className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3 text-xs">
                <p className="font-bold text-[#2C241E]">{row.invoice_code}</p>
                <p className="text-[#73675F] mt-0.5">{row.branch_name} · {Number(row.total_amount).toLocaleString('vi-VN')}đ</p>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-[#73675F]">Chưa liên kết hóa đơn kích hoạt.</p>}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] mb-2">Lịch sắp tới</h3>
        {data.bookings.length ? (
          <div className="space-y-2">
            {data.bookings.map(row => (
              <article key={row.id} className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3 text-xs">
                <strong className="text-[#2C241E]">{row.booking_code}</strong>
                <p className="text-[#73675F] mt-0.5">{new Date(row.booking_date).toLocaleDateString('vi-VN')} · {String(row.start_time).slice(0, 5)} · {row.branch_name}</p>
              </article>
            ))}
          </div>
        ) : <p className="text-xs text-[#73675F]">Chưa có lịch hẹn tiếp theo được liên kết với gói.</p>}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] mb-2">Lịch sử buổi chăm sóc</h3>
        {data.journals.length ? (
          <div className="space-y-2">
            {data.journals.map(row => (
              <article key={row.id} className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3 text-xs space-y-1">
                <strong className="text-[#2C241E]">Buổi {row.session_number} · {new Date(row.session_date).toLocaleDateString('vi-VN')}</strong>
                <p className="text-[#73675F]">{row.is_reversed ? 'Đã hoàn tác' : statuses[row.confirmation_status] || 'Chưa xác định trạng thái'}{row.booking_code ? ` · ${row.booking_code}` : ''}</p>
                {row.home_care_instructions && (
                  <details className="pt-1">
                    <summary className="cursor-pointer font-semibold text-[#8A4F23]">Hướng dẫn chăm sóc đã ghi nhận</summary>
                    <p className="mt-1 text-[#2C241E] whitespace-pre-line">{row.home_care_instructions}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
        ) : <p className="text-xs text-[#73675F]">Chưa có buổi chăm sóc nào được ghi nhận.</p>}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] mb-2">Hướng dẫn đã giao</h3>
        {data.deliveries.length ? (
          <div className="space-y-2">
            {data.deliveries.map(row => (
              <article key={row.id} className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3 text-xs space-y-1">
                <strong className="text-[#2C241E]">{row.content_snapshot?.title} · v{row.guideline_version || '—'}</strong>
                <p className="text-[#73675F]">Buổi {row.session_number} · {row.sender_name || 'Chưa xác định người giao'} · {new Date(row.sent_at).toLocaleString('vi-VN')}</p>
                <details className="pt-1">
                  <summary className="cursor-pointer font-semibold text-[#8A4F23]">Nội dung tại thời điểm giao</summary>
                  <p className="mt-1 text-[#2C241E] whitespace-pre-line">{row.content_snapshot?.content}</p>
                </details>
              </article>
            ))}
          </div>
        ) : <p className="text-xs text-[#73675F]">Chưa có hướng dẫn được giao từ thư viện.</p>}
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23] mb-2">Timeline vận hành</h3>
        {data.logs.length ? (
          <div className="space-y-2">
            {data.logs.map((row, i) => (
              <article key={i} className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3 text-xs space-y-0.5">
                <strong className="text-[#2C241E]">{actions[row.action] || row.action}</strong>
                <p className="text-[#73675F]">{new Date(row.performed_at).toLocaleString('vi-VN')} · {row.actor_name || 'Chưa xác định người thực hiện'}</p>
                <p className="text-[#2C241E]">{row.reason}</p>
              </article>
            ))}
          </div>
        ) : <p className="text-xs text-[#73675F]">Chưa có thao tác vòng đời được ghi nhận.</p>}
      </div>
    </div>
  );
}
