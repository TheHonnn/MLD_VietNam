import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminCommand, Listing, Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import './TreatmentPackagesWorkspace.css';
import { TreatmentConfirmationPreview } from './TreatmentConfirmationPreview';
import { AssignHomeCare } from './HomeCareWorkspace';

const statusLabels: Record<string, string> = { DRAFT: 'Bản nháp', SUBMITTED: 'Chờ xác nhận', REVIEW_REQUIRED: 'Chờ duyệt chuyên môn', CONFIRMED: 'Đã xác nhận', REVERSED: 'Đã hoàn tác', PENDING: 'Cần ghi nhận' };
const fields = [
  ['Đánh giá trước điều trị', [['condition_before', 'Tình trạng trước điều trị'], ['treatment_areas', 'Vùng chăm sóc']]],
  ['Nội dung thực hiện', [['treatment_notes', 'Nội dung và ghi chú chuyên môn'], ['treatment_protocol', 'Kỹ thuật / phác đồ']]],
  ['Đánh giá sau điều trị', [['condition_after', 'Tình trạng sau điều trị'], ['adverse_reactions', 'Phản ứng bất thường và cách xử lý']]],
  ['Kế hoạch sau buổi', [['home_care_instructions', 'Hướng dẫn chăm sóc tại nhà'], ['next_session_notes', 'Lưu ý cho buổi sau'], ['specialist_advice', 'Khuyến nghị chuyên môn']]],
] as const;
async function readAll(table: string) {
  const rows: Row[] = [];
  for (let page = 1; ; page++) {
    const result = await adminCommand<Listing>(`${table}?limit=100&page=${page}`);
    rows.push(...result.rows);
    if (rows.length >= result.total) return rows;
    if (!result.rows.length) throw new Error('Dữ liệu thay đổi trong khi tải. Hãy thử lại.');
  }
}

export function TreatmentJournalWorkspace() {
  const { user } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [abnormal, setAbnormal] = useState(false);
  const [from, setFrom] = useState('');
  const [selected, setSelected] = useState<Row>();
  const [values, setValues] = useState<Row>({});
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [command, setCommand] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    readAll('treatment_journal').then(data => { if (active) setRows(data); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>('.tw-journal-dialog');
    const selector = 'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]';
    dialog?.querySelector<HTMLElement>(selector)?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setSelected(undefined);
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(selector));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => { document.removeEventListener('keydown', handle); previous?.focus(); };
  }, [selected?.id, busy]);
  const state = (row: Row) => row.is_reversed ? 'REVERSED' : row.confirmation_status || 'PENDING';
  const visible = rows.filter(row => (tab === 'ALL' || state(row) === tab) && (!abnormal || row.has_abnormal_reaction) && (!from || String(row.session_date).slice(0,10) >= from) && `${row.customer_name || ''} ${row.customer_phone || ''} ${row.booking_code || ''} ${row.technician_name || ''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const writable = selected && ['DRAFT', 'PENDING'].includes(state(selected));
  const manager = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');
  async function act(action: string) {
    if (!selected || busy) return;
    setBusy(true); setDialogError('');
    try {
      // Persist the form before submitting; a failed submit leaves a recoverable draft.
      if (action === 'save-draft' || action === 'submit-session') {
        const draft = { ...values, treatment_areas: Array.isArray(values.treatment_areas) ? values.treatment_areas : String(values.treatment_areas || '').split(/[,\n]/).map(area => area.trim()).filter(Boolean) };
        await adminCommand('treatment_journal/action', { key: { id: selected.id }, action: 'save-draft', values: draft });
      }
      const result = action === 'save-draft' ? null : await adminCommand<Row>('treatment_journal/action', { key: { id: selected.id }, action, reason, idempotencyKey: `${action}:${selected.id}` });
      if (result) setSelected({ ...selected, ...result });
      else setSelected(undefined);
      setCommand(''); setRevision(v => v + 1);
      setNotice(action === 'save-draft' ? 'Đã lưu nháp. Số buổi chưa thay đổi.' : action === 'submit-session' ? 'Đã gửi hồ sơ. Chưa trừ buổi.' : action === 'confirm-session' ? 'Đã xác nhận buổi. Tiến độ được cập nhật bởi hệ thống.' : action === 'reverse' ? 'Đã hoàn tác buổi.' : 'Đã duyệt chuyên môn. Hồ sơ chờ xác nhận buổi.');
    } catch (e) { setDialogError(e instanceof Error ? e.message : 'Thao tác thất bại.'); }
    finally { setBusy(false); }
  }
  return <main className="treatment-workspace"><header><div><p className="tw-eyebrow">QUẢN LÝ LIỆU TRÌNH</p><h1>Nhật ký điều trị</h1><p>Lưu nháp → gửi hồ sơ → xác nhận buổi. Chỉ buổi đã xác nhận mới được trừ lượt.</p></div><Link className="tw-primary" to="/medical-records">Chọn ca đang phục vụ để ghi nhận</Link></header>
    <p><Link to="/treatment-inventory">Đối chiếu vật tư và xử lý hàng đợi kho →</Link></p>
    <nav className="tw-journal-tabs" aria-label="Trạng thái nhật ký">{[['ALL', 'Tất cả'], ...Object.entries(statusLabels)].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label} ({rows.filter(row => key === 'ALL' || state(row) === key).length})</button>)}</nav>
    <section className="tw-filters"><input aria-label="Tìm nhật ký" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên khách, số điện thoại, mã lịch hoặc chuyên viên…" /><label>Từ ngày <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label><input type="checkbox" checked={abnormal} onChange={e => setAbnormal(e.target.checked)} /> Có phản ứng bất thường</label><button onClick={() => setRevision(v => v + 1)}>Tải lại</button></section>
    {notice && <p className="tw-notice" role="status">{notice}</p>}{error ? <p role="alert" className="tw-error">{error}</p> : loading ? <p role="status">Đang tải nhật ký…</p> : <section className="tw-panel"><div className="tw-table"><table><thead><tr><th>Khách hàng / Lịch hẹn</th><th>Buổi / Ngày</th><th>Chuyên viên</th><th>Trạng thái</th><th></th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><strong>{row.customer_name || 'Chưa có tên khách'}</strong><span>{row.customer_phone || 'Chưa có số điện thoại'}</span><span>{row.booking_code || 'Chưa liên kết lịch hẹn'}</span></td><td>Buổi {row.session_number}<span>{new Date(row.session_date).toLocaleDateString('vi-VN')}</span></td><td>{row.technician_name || 'Chưa phân công'}</td><td>{statusLabels[state(row)] || 'Chưa xác định'}{row.has_abnormal_reaction && <span className="tw-error">Có phản ứng bất thường</span>}</td><td><button onClick={() => { setSelected(row); setValues({ ...row }); setDialogError(''); setCommand(''); setReason(''); }}>Mở hồ sơ</button></td></tr>)}</tbody></table></div>{!visible.length && <div className="tw-empty">Không có nhật ký khớp bộ lọc. Nhật ký mới được tạo từ ca phục vụ thực tế.</div>}</section>}
    {selected && <div className="tw-overlay"><section role="dialog" aria-modal="true" aria-labelledby="journal-title" className="tw-dialog tw-journal-dialog"><h2 id="journal-title">Nhật ký buổi {selected.session_number}</h2><p>{selected.customer_name} · {selected.booking_code || 'Chưa liên kết lịch'} · {statusLabels[state(selected)]}</p><fieldset disabled={!writable || busy}><legend>Thông tin buổi</legend><p>{new Date(selected.session_date).toLocaleDateString('vi-VN')} · {selected.technician_name || 'Chưa phân công'}</p>{fields.map(([title, inputs]) => <section key={title}><h3>{title}</h3>{inputs.map(([key, label]) => <label key={key}>{label}<textarea value={values[key] || ''} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} /></label>)}</section>)}<label><input type="checkbox" checked={Boolean(values.has_abnormal_reaction)} onChange={e => setValues(v => ({ ...v, has_abnormal_reaction: e.target.checked }))} /> Có phản ứng bất thường, cần duyệt chuyên môn</label></fieldset>
      {selected.user_package_id && <p><Link to={`/manage/user_packages?userPackageId=${selected.user_package_id}`}>Xem liệu trình liên quan</Link></p>}
      {state(selected) === 'CONFIRMED' && <AssignHomeCare journalId={selected.id} />}
      {command === 'confirm-session' && <TreatmentConfirmationPreview id={selected.id} busy={busy} onConfirm={() => act('confirm-session')} onCancel={() => setCommand('')} />}{command === 'reverse' && <div className="tw-confirm"><h3>{command === 'reverse' ? 'Hoàn tác buổi đã xác nhận' : 'Xác nhận hoàn thành buổi'}</h3><p>{command === 'reverse' ? 'Hệ thống hoàn tác lượt, vật tư và hoa hồng liên quan. Lịch sử được giữ lại.' : 'Hệ thống kiểm tra gói và tiêu thụ 1 lượt, đồng thời ghi nhận vật tư và hoa hồng theo buổi.'}</p>{command === 'reverse' && <label>Lý do hoàn tác<textarea value={reason} onChange={e => setReason(e.target.value)} /></label>}<button disabled={busy || command === 'reverse' && reason.trim().length < 5} onClick={() => act(command)}>Xác nhận thực hiện</button><button disabled={busy} onClick={() => setCommand('')}>Quay lại</button></div>}
      {dialogError && <p role="alert" className="tw-error">{dialogError}</p>}<footer><button disabled={busy} onClick={() => setSelected(undefined)}>Đóng</button>{writable && <><button disabled={busy} onClick={() => act('save-draft')}>Lưu nháp</button><button className="tw-primary" disabled={busy || !values.condition_before?.trim() || !values.condition_after?.trim() || !values.treatment_notes?.trim()} onClick={() => act('submit-session')}>Gửi xác nhận</button></>}{manager && state(selected) === 'REVIEW_REQUIRED' && <button disabled={busy} onClick={() => act('approve-clinical')}>Duyệt chuyên môn</button>}{state(selected) === 'SUBMITTED' && <button disabled={busy} onClick={() => setCommand('confirm-session')}>Xác nhận buổi</button>}{manager && state(selected) === 'CONFIRMED' && <button disabled={busy} onClick={() => setCommand('reverse')}>Hoàn tác buổi</button>}</footer>{busy && <p role="status">Đang xử lý…</p>}
    </section></div>}
  </main>;
}
