import React, { useEffect, useState } from 'react';
import { adminCommand, Row } from '../admin/api';

export function TreatmentConfirmationPreview({ id, busy, onConfirm, onCancel }: {
  id: string; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const [preview, setPreview] = useState<Row>();
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setPreview(undefined); setError('');
    adminCommand<Row>(`treatment/journals/${encodeURIComponent(id)}/confirmation-preview`)
      .then(data => { if (active) setPreview(data); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, retry]);
  const money = (value: number) => Number(value).toLocaleString('vi-VN') + 'đ';
  return (
    <section className="tw-confirm rounded-2xl bg-[#FAF8F5] border border-[#E8DFD8] p-4 space-y-3" aria-label="Xem trước xác nhận buổi">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-[#3E200C]">Kiểm tra trước khi xác nhận</h3>
      </div>
      {error && (
        <div role="alert" className="flex items-center justify-between gap-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-xs font-semibold text-[#DC2626]">
          <span>{error}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRetry(v => v + 1)}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#FECACA] text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer shrink-0"
          >
            Tải lại
          </button>
        </div>
      )}
      {!preview && !error && <p role="status" className="text-xs text-[#73675F]">Đang kiểm tra gói, vật tư và hoa hồng…</p>}
      {preview && (
        <div className="space-y-3 text-xs">
          <div className="font-bold text-[#3E200C]">{preview.packageName || 'Chưa xác định gói'} · Buổi {preview.sessionNumber}/{preview.totalSessions}</div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl bg-white border border-[#EFE4D9] p-2.5">
              <dt className="text-[11px] text-[#73675F]">Buổi đã xác nhận</dt>
              <dd className="text-sm font-extrabold text-[#2C241E] mt-0.5">{preview.completedBefore}</dd>
            </div>
            <div className="rounded-xl bg-white border border-[#EFE4D9] p-2.5">
              <dt className="text-[11px] text-[#73675F]">Lượt còn lại trước xác nhận</dt>
              <dd className="text-sm font-extrabold text-[#2C241E] mt-0.5">{preview.remainingBefore}</dd>
            </div>
            <div className="rounded-xl bg-white border border-[#EFE4D9] p-2.5">
              <dt className="text-[11px] text-[#73675F]">Lượt còn lại sau xác nhận</dt>
              <dd className="text-sm font-extrabold text-[#985018] mt-0.5">{preview.remainingAfter}</dd>
            </div>
          </dl>
          <div className="rounded-xl bg-white border border-[#EFE4D9] p-3 space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8A4F23]">Vật tư tiêu hao</h4>
            {preview.consumables.length ? (
              <ul className="list-disc pl-4 space-y-0.5 text-[#2C241E]">
                {preview.consumables.map((item: Row, index: number) => (
                  <li key={index}>{item.name || item.material_name || 'Vật tư chưa có tên'}: {item.quantity ?? item.qty ?? 'Chưa nhập số lượng'} {item.unit || ''}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[#73675F]">Không có vật tư tiêu hao được ghi nhận cho buổi này.</p>
            )}
          </div>
          <div className="rounded-xl bg-white border border-[#EFE4D9] p-3 space-y-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8A4F23]">Hoa hồng dự kiến</h4>
            <p className="font-semibold text-[#2C241E]">{preview.commission.recipient || 'Chưa có người nhận hoa hồng'} · {money(preview.commission.amount)}</p>
            <p className="text-[#73675F]">Cơ sở tính: {money(preview.commission.baseAmount)} × {preview.commission.percentage}%.{preview.commission.alreadyRecorded ? ' Hoa hồng đã được ghi nhận trước đó, không tạo thêm.' : ''}</p>
          </div>
          {preview.hasAbnormalReaction && (
            <p className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 font-semibold text-[#DC2626]">
              Có phản ứng bất thường · {preview.clinicalApproved ? 'Đã duyệt chuyên môn' : 'Chưa duyệt chuyên môn'}
            </p>
          )}
          {preview.warnings.map((warning: string) => (
            <p className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 font-semibold text-[#DC2626]" key={warning}>{warning}</p>
          ))}
          <p className="text-[11px] text-[#73675F]">Vật tư được đưa vào hàng đợi xuất kho. Backend kiểm tra lại dữ liệu tại thời điểm xác nhận.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={busy || !preview || Boolean(preview.warnings?.length)}
          onClick={onConfirm}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#985018] hover:bg-[#854412] text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Xác nhận hoàn thành và trừ 1 lượt
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF0E4] text-[#73675F] border border-[#E8DFD8] cursor-pointer disabled:opacity-50"
        >
          Quay lại
        </button>
      </div>
    </section>
  );
}
