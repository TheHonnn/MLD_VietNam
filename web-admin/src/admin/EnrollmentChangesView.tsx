import { canReviewEnrollmentChange, enrollmentReviewPayload } from "./enrollment-change-review";
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Row } from './api';
import { apiClient } from '../services/apiClient';

const types: Record<string, string> = { HOLD: 'Bảo lưu', RESUME: 'Tiếp tục học', TRANSFER: 'Chuyển lớp', WITHDRAWAL: 'Nghỉ học', REFUND: 'Hoàn học phí', EXTENSION: 'Gia hạn', RETEST: 'Thi lại' };
const statuses: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
const effects: Record<string, string> = { HOLD: 'Tạm dừng quyền học của hồ sơ.', RESUME: 'Khôi phục tình trạng học theo lớp và hạn sử dụng hiện có.', TRANSFER: 'Chuyển sang lớp được đề nghị. Máy chủ kiểm tra quyền chi nhánh, chỗ trống và lịch học.', WITHDRAWAL: 'Kết thúc việc học và giải phóng chỗ trong lớp.', REFUND: 'Chỉ phê duyệt yêu cầu. Việc hoàn tiền phải được xác nhận riêng qua luồng thu ngân.', EXTENSION: 'Điều chỉnh hạn học theo số tháng trong yêu cầu.', RETEST: 'Chuyển hồ sơ sang trạng thái chờ thi lại.' };
const date = (value: unknown) => { const parsed = value ? new Date(String(value)) : null; return parsed && Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('vi-VN') : '—'; };

export function EnrollmentChangesView({ rows, role, onRefresh }: { rows: Row[]; role?: string; onRefresh: () => void }) {
  const [decision, setDecision] = useState<{ row: Row; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (decision && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [decision]);
  const canReview = canReviewEnrollmentChange(role, 'PENDING');
  const submit = async () => {
    if (!decision || lock.current || note.trim().length < 5) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await apiClient.post<{ status: string }>(`/academy/enrollment-change-requests/${encodeURIComponent(String(decision.row.id))}/resolve`, enrollmentReviewPayload(role, decision.row.status, decision.approve, note));
      if (!result.success) throw new Error(result.message || 'Không thể xử lý yêu cầu.');
      setDecision(null); setNote(''); setNotice('Máy chủ đã xác nhận xử lý yêu cầu. Danh sách đang được tải lại.'); onRefresh();
    } catch (err) {
      setError((err instanceof Error ? err.message : 'Không thể xác nhận kết quả.') + ' Hãy tải lại danh sách để đối chiếu trạng thái trước khi thử lại.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <>
    <div className="mb-4 rounded-xl border border-[#EAD8C7] bg-white p-4 text-sm text-[#73675F]">Kiểm tra hồ sơ và lý do trước khi quyết định. Lịch sử yêu cầu đã xử lý được giữ lại để đối chiếu.</div>
    {notice && <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Yêu cầu / thời gian</th><th>Hồ sơ liên quan</th><th>Lý do đề nghị</th><th>Trạng thái / kết quả</th><th>Thao tác</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <td><div className="font-semibold">{types[row.request_type] || row.request_type}</div><div className="text-xs mt-1 text-[#73675F]">{date(row.requested_at)}</div></td>
      <td>{row.enrollment_id ? <Link className="text-[#985018] underline" to={`/academy-enrollment?enrollmentId=${encodeURIComponent(String(row.enrollment_id))}`}>Mở hồ sơ tuyển sinh</Link> : 'Thiếu liên kết hồ sơ'}</td>
      <td><p className="whitespace-pre-wrap max-w-sm">{row.reason || 'Chưa có lý do'}</p>{row.request_type === 'EXTENSION' && <p className="text-xs mt-1">Số tháng đề nghị: {row.request_data?.months ?? 'Chưa cung cấp'}</p>}</td>
      <td><div className="font-medium">{statuses[row.status] || row.status}</div>{row.request_type === 'REFUND' && row.status === 'APPROVED' && <p className="text-xs mt-1 text-amber-700">Duyệt yêu cầu không xác nhận việc chi tiền</p>}{row.review_note && <p className="text-xs mt-1 whitespace-pre-wrap max-w-xs">{row.review_note}</p>}{row.reviewed_at && <p className="text-xs mt-1 text-[#73675F]">{date(row.reviewed_at)}</p>}</td>
      <td>{row.status === 'PENDING' && canReview ? <div className="flex flex-wrap gap-2"><button className="admin-primary" disabled={busy} onClick={() => { setDecision({ row, approve: true }); setNote(''); setError(''); }}>Xem &amp; duyệt</button><button className="admin-secondary" disabled={busy} onClick={() => { setDecision({ row, approve: false }); setNote(''); setError(''); }}>Từ chối</button></div> : <span className="text-xs text-[#73675F]">{row.status === 'PENDING' ? 'Chờ người có quyền duyệt' : 'Đã kết thúc xử lý'}</span>}</td>
    </tr>)}</tbody></table>{!rows.length && <div className="admin-empty py-10 text-center">Không có yêu cầu phù hợp với bộ lọc hiện tại.</div>}</div>
    {decision && <dialog ref={dialogRef} onCancel={event => { event.preventDefault(); if (!busy) setDecision(null); }} aria-labelledby="enrollment-decision-title" className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-black/40">
      <h2 id="enrollment-decision-title" className="text-lg font-bold">{decision.approve ? 'Phê duyệt' : 'Từ chối'} yêu cầu {types[decision.row.request_type] || decision.row.request_type}</h2>
      <p className="mt-3 text-sm whitespace-pre-wrap">Lý do: {decision.row.reason}</p>
      {decision.approve && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">{effects[decision.row.request_type] || 'Kiểm tra nội dung yêu cầu trước khi duyệt.'}</p>}
      {decision.row.request_type === 'TRANSFER' && <p className="mt-3 text-sm break-all">Mã lớp đề nghị: {decision.row.request_data?.targetBatchId || 'Chưa cung cấp'}</p>}
      <label className="block mt-4 text-sm font-medium" htmlFor="enrollment-review-note">Ghi chú xử lý (ít nhất 5 ký tự)</label><textarea id="enrollment-review-note" className="mt-2 w-full rounded-lg border p-3" rows={3} disabled={busy} value={note} onChange={e => setNote(e.target.value)} />
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="admin-secondary" disabled={busy} onClick={() => setDecision(null)}>Đóng</button><button className="admin-primary" disabled={busy || note.trim().length < 5 || Boolean(error)} onClick={submit}>{busy ? 'Đang xử lý…' : 'Xác nhận quyết định'}</button></div>
    </dialog>}
  </>;
}
