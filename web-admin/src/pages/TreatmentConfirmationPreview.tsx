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
  return <section className="tw-confirm" aria-label="Xem trước xác nhận buổi"><h3>Kiểm tra trước khi xác nhận</h3>
    {error && <p role="alert" className="tw-error">{error} <button disabled={busy} onClick={() => setRetry(v => v + 1)}>Tải lại</button></p>}
    {!preview && !error && <p role="status">Đang kiểm tra gói, vật tư và hoa hồng…</p>}
    {preview && <><strong>{preview.packageName || 'Chưa xác định gói'} · Buổi {preview.sessionNumber}/{preview.totalSessions}</strong>
      <dl className="tw-preview-facts"><dt>Buổi đã xác nhận</dt><dd>{preview.completedBefore}</dd><dt>Lượt còn lại trước xác nhận</dt><dd>{preview.remainingBefore}</dd><dt>Lượt còn lại sau xác nhận</dt><dd>{preview.remainingAfter}</dd></dl>
      <h4>Vật tư tiêu hao</h4>{preview.consumables.length ? <ul>{preview.consumables.map((item: Row, index: number) => <li key={index}>{item.name || item.material_name || 'Vật tư chưa có tên'}: {item.quantity ?? item.qty ?? 'Chưa nhập số lượng'} {item.unit || ''}</li>)}</ul> : <p>Không có vật tư tiêu hao được ghi nhận cho buổi này.</p>}
      <h4>Hoa hồng dự kiến</h4><p>{preview.commission.recipient || 'Chưa có người nhận hoa hồng'} · {money(preview.commission.amount)}</p><p>Cơ sở tính: {money(preview.commission.baseAmount)} × {preview.commission.percentage}%.{preview.commission.alreadyRecorded ? ' Hoa hồng đã được ghi nhận trước đó, không tạo thêm.' : ''}</p>
      {preview.hasAbnormalReaction && <p className="tw-error">Có phản ứng bất thường · {preview.clinicalApproved ? 'Đã duyệt chuyên môn' : 'Chưa duyệt chuyên môn'}</p>}
      {preview.warnings.map((warning: string) => <p className="tw-error" key={warning}>{warning}</p>)}
      <p>Vật tư được đưa vào hàng đợi xuất kho. Backend kiểm tra lại dữ liệu tại thời điểm xác nhận.</p></>}
    <button disabled={busy || !preview || Boolean(preview.warnings?.length)} onClick={onConfirm}>Xác nhận hoàn thành và trừ 1 lượt</button><button disabled={busy} onClick={onCancel}>Quay lại</button>
  </section>;
}
