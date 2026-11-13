import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminCommand, Listing, Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import './TreatmentPackagesWorkspace.css';
import { TreatmentPackageHistory } from './TreatmentPackageHistory';

const labels: Record<string, string> = { ACTIVE: 'Đang sử dụng', PAUSED: 'Tạm dừng', COMPLETED: 'Hoàn thành', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền', TRANSFERRED: 'Đã chuyển nhượng' };
const actionLabels: Record<string, string> = { pause: 'Tạm dừng', resume: 'Tiếp tục', extend: 'Gia hạn', cancel: 'Hủy gói', refund: 'Hoàn tiền', transfer: 'Chuyển nhượng' };
const date = (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
const remaining = (row: Row) => Math.max(0, Number(row.total_sessions) - Number(row.completed_sessions));
const expired = (row: Row) => row.expires_at && new Date(row.expires_at).getTime() <= Date.now();

export function TreatmentPackagesWorkspace() {
  const { user } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branch, setBranch] = useState('');
  const [packageType, setPackageType] = useState('');
  const [recipients, setRecipients] = useState<Row[]>([]);
  const [recipient, setRecipient] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [withoutBooking, setWithoutBooking] = useState(false);
  const [page, setPage] = useState(1);
  const [expiry, setExpiry] = useState(false);
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = rows.find(row => row.id === params.get('userPackageId') && (!branch || (row.package_branches || []).some((b: Row) => b.id === branch)));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    (async () => {
      const collected: Row[] = [];
      let page = 1;
      let total = 0;
      do {
        const result = await adminCommand<Listing>(`user_packages?limit=100&page=${page}`);
        if (controller.signal.aborted) return;
        if (!result.rows.length && collected.length < result.total) throw new Error('Danh sách thay đổi khi đang tải. Vui lòng thử lại.');
        collected.push(...result.rows); total = result.total; page++;
      } while (collected.length < total);
      setRows(collected);
    })().catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (action !== 'transfer') return;
    let active = true;
    const timer = setTimeout(() => {
      adminCommand<Listing>('users?limit=25&search=' + encodeURIComponent(recipientSearch))
        .then(data => { if (active) setRecipients(data.rows.filter(row => row.is_active && row.id !== selected?.customer_id)); })
        .catch(e => { if (active) setActionError(e.message); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [action, recipientSearch, selected?.customer_id]);
  const branchRows = rows.filter(row => !branch || (row.package_branches || []).some((b: Row) => b.id === branch));
  const branchOptions = Array.from(new Map(rows.flatMap(row => row.package_branches || []).map((b: Row) => [b.id, b])).values()) as Row[];
  const packageOptions = Array.from(new Map(rows.map(row => [row.package_id, row.package_name])).entries());
  const filtered = useMemo(() => rows.filter(row => {
    if (branch && !(row.package_branches || []).some((b: Row) => b.id === branch)) return false;
    if (withoutBooking && row.next_booking) return false;
    if (packageType && row.package_id !== packageType) return false;
    const text = `${row.customer_name || ''} ${row.customer_phone || ''} ${row.package_name || ''} ${row.id}`.toLocaleLowerCase('vi');
    return text.includes(search.toLocaleLowerCase('vi')) && (!status || (status === 'EXPIRED' ? expired(row) && row.status === 'ACTIVE' || row.status === status : row.status === status && !(status === 'ACTIVE' && expired(row))))
      && (!expiry || row.status === 'ACTIVE' && row.expires_at && !expired(row) && new Date(row.expires_at).getTime() <= Date.now() + 30 * 86400000);
  }), [rows, search, status, expiry, branch, packageType, withoutBooking]);
  useEffect(() => { setPage(1); }, [search, status, expiry, branch, packageType, withoutBooking]);
  useEffect(() => {
    if (!action) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.tw-dialog');
    const selector = 'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)';
    dialog?.querySelector<HTMLElement>(selector)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setAction('');
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(selector));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [action, saving]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const visibleRows = filtered.slice((Math.min(page, pageCount) - 1) * 20, Math.min(page, pageCount) * 20);
  const managers = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');
  const operator = managers || user?.role === 'RECEPTIONIST';
  const actions = selected ? [
    ...(operator && selected.status === 'ACTIVE' && !expired(selected) ? ['pause'] : []),
    ...(operator && selected.status === 'PAUSED' && !expired(selected) ? ['resume'] : []),
    ...(managers && !['CANCELLED', 'REFUNDED', 'TRANSFERRED'].includes(selected.status) ? ['extend', 'cancel'] : []),
    ...(managers && ['ACTIVE', 'PAUSED'].includes(selected.status) && !expired(selected) && remaining(selected) > 0 ? ['transfer'] : []),
    ...(['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && ['ACTIVE', 'PAUSED', 'EXPIRED'].includes(selected.status) ? ['refund'] : []),
  ] : [];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true); setActionError('');
    try {
      await adminCommand('user_packages/action', { key: { id: selected.id }, action, reason: reason.trim(), ...(action === 'transfer' ? { newCustomerId: recipient } : {}), ...(action === 'extend' ? { extensionMonths: months } : {}), ...(action === 'refund' ? { refundAmount: Number(amount) } : {}) });
      setNotice(`${actionLabels[action]} thành công. Đang cập nhật dữ liệu.`);
      setAction(''); setRevision(value => value + 1);
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Không thể thực hiện thao tác.'); }
    finally { setSaving(false); }
  }
  return <main className="treatment-workspace">
    <header><div><p className="tw-eyebrow">QUẢN LÝ LIỆU TRÌNH</p><h1>Liệu trình khách hàng</h1><p>Theo dõi gói đã mua, số buổi còn lại và lịch sử phục vụ.</p></div><Link className="tw-primary" to="/cashier-pos?tab=pos&source=package">Mở thu ngân để bán gói</Link></header>
    {notice && <p role="status" className="tw-notice">{notice}</p>}
    {error ? <div role="alert" className="tw-error">Không tải được liệu trình: {error} <button onClick={() => setRevision(value => value + 1)}>Thử lại</button></div> : loading ? <div className="tw-loading" role="status">Đang tải liệu trình và số buổi từ hệ thống…</div> : <>
      <section className="tw-metrics" aria-label="Tổng quan liệu trình">
        {[['Gói đang hoạt động', branchRows.filter(row => row.status === 'ACTIVE' && !expired(row)).length], ['Buổi còn sử dụng', branchRows.filter(row => row.status === 'ACTIVE' && !expired(row)).reduce((sum, row) => sum + remaining(row), 0)], ['Buổi đã xác nhận', branchRows.reduce((sum, row) => sum + Number(row.completed_sessions || 0), 0)], ['Lịch hẹn sắp tới', branchRows.filter(row => row.next_booking).length], ['Gói sắp hết hạn', branchRows.filter(row => row.status === 'ACTIVE' && !expired(row) && row.expires_at && new Date(row.expires_at).getTime() <= Date.now() + 30 * 86400000).length], ['Gói tạm dừng', branchRows.filter(row => row.status === 'PAUSED').length]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <section className="tw-filters"><select aria-label="Chi nhánh" value={branch} onChange={e => setBranch(e.target.value)}><option value="">Tất cả chi nhánh được phép</option>{branchOptions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><select aria-label="Loại gói" value={packageType} onChange={e => setPackageType(e.target.value)}><option value="">Tất cả loại gói</option>{packageOptions.map(([id, name]) => <option key={id} value={id}>{name || "Chưa có tên gói"}</option>)}</select><input aria-label="Tìm liệu trình" placeholder="Tìm tên khách, số điện thoại, tên gói hoặc mã liệu trình…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Trạng thái" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label><input type="checkbox" checked={expiry} onChange={e => setExpiry(e.target.checked)} /> Hết hạn trong 30 ngày</label><label><input type="checkbox" checked={withoutBooking} onChange={e => setWithoutBooking(e.target.checked)} /> Chưa có lịch tiếp theo</label><button onClick={() => setRevision(value => value + 1)}>Tải lại</button></section>
      <div className="tw-columns"><section className="tw-panel"><h2>Danh sách liệu trình <small>{filtered.length} / {rows.length} gói</small></h2><div className="tw-table"><table><thead><tr><th>Khách hàng / Gói</th><th>Tiến độ</th><th>Hết hạn</th><th>Trạng thái</th><th></th></tr></thead><tbody>{visibleRows.map(row => <tr key={row.id} aria-selected={selected?.id === row.id}><td><strong>{row.customer_name || 'Chưa có tên khách hàng'}</strong><span>{row.customer_phone || 'Chưa có số điện thoại'}</span><p>{row.package_name || 'Chưa xác định tên gói'}</p><span>{(row.package_branches || []).map((b: Row) => b.name).join(', ') || 'Chưa xác định chi nhánh'}</span><span>{row.next_booking ? `Lịch tiếp: ${date(row.next_booking.date)} · ${String(row.next_booking.time).slice(0,5)}` : 'Chưa có lịch tiếp theo'}</span></td><td><strong>{row.completed_sessions} / {row.total_sessions} buổi</strong><span>Còn {remaining(row)} buổi</span></td><td>{date(row.expires_at)}</td><td><span className="tw-badge">{row.status === 'ACTIVE' && expired(row) ? labels.EXPIRED : labels[row.status] || row.status}</span></td><td><button onClick={() => setParams({ userPackageId: row.id })}>Xem gói</button></td></tr>)}</tbody></table></div><nav className="tw-pagination" aria-label="Phân trang"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {Math.min(page, pageCount)} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Sau</button></nav>{!filtered.length && <div className="tw-empty">{rows.length ? 'Không có liệu trình khớp bộ lọc.' : 'Chưa có liệu trình. Gói được kích hoạt sau khi thanh toán tại thu ngân.'}</div>}</section>
      <aside className="tw-panel tw-detail">{selected ? <><h2>{selected.package_name || 'Chi tiết liệu trình'}</h2><h3>{selected.customer_name || 'Chưa có tên khách hàng'}</h3><p>{selected.customer_phone || 'Chưa có số điện thoại'}</p><dl><dt>Mã liệu trình</dt><dd>{selected.id}</dd><dt>Ngày mua</dt><dd>{date(selected.purchased_at)}</dd><dt>Ngày hết hạn</dt><dd>{date(selected.expires_at)}</dd><dt>Đã xác nhận</dt><dd>{selected.completed_sessions} / {selected.total_sessions} buổi</dd><dt>Còn lại</dt><dd>{remaining(selected)} buổi</dd></dl><p>Chỉ buổi đã được xác nhận mới được tính vào tiến độ.</p><div className="tw-actions"><Link className="tw-primary" to={`/medical-records?userPackageId=${selected.id}`}>Mở hồ sơ và lịch sử buổi</Link>{selected.status === 'ACTIVE' && !expired(selected) && remaining(selected) > 0 && <Link to={`/medical-records?userPackageId=${selected.id}&action=book-first-session`}>Đặt buổi tiếp theo</Link>}{actions.map(value => <button key={value} onClick={() => { setAction(value); setReason(''); setActionError(''); setAmount(''); setRecipient(''); setRecipients([]); setRecipientSearch(''); }}>{actionLabels[value]}</button>)}</div><TreatmentPackageHistory id={selected.id} revision={revision} /></> : <div className="tw-empty">Chọn một liệu trình để xem tiến độ và thao tác.</div>}</aside></div>
    </>}
    {action && selected && <div className="tw-overlay"><section role="dialog" aria-modal="true" aria-labelledby="tw-action-title" className="tw-dialog"><form onSubmit={submit}><h2 id="tw-action-title">{actionLabels[action]}</h2><p>{selected.customer_name} · {selected.package_name}</p>{action === 'refund' && <p>Thao tác ghi nhận hoàn tiền gói. Kiểm tra số tiền và điều kiện trước khi xác nhận.</p>}{action === 'cancel' && <p>Gói sẽ ngừng sử dụng. Lịch sử các buổi được giữ lại.</p>}<label>Lý do thực hiện<textarea required minLength={5} value={reason} onChange={e => setReason(e.target.value)} /></label>{action === 'extend' && <label>Số tháng gia hạn<input type="number" min="1" max="24" required value={months} onChange={e => setMonths(Number(e.target.value))} /></label>}{action === 'refund' && <label>Số tiền hoàn (đ)<input type="number" min="0" required value={amount} onChange={e => setAmount(e.target.value)} /></label>}{action === 'transfer' && <><p>Chuyển {remaining(selected)} buổi còn lại cho khách nhận. Gói hiện tại sẽ được lưu ở trạng thái đã chuyển nhượng.</p><label>Tìm khách nhận<input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Tên hoặc số điện thoại" /></label><label>Khách nhận<select required value={recipient} onChange={e => setRecipient(e.target.value)}><option value="">Chọn khách nhận</option>{recipients.map(row => <option key={row.id} value={row.id}>{row.full_name} · {row.phone || row.email}</option>)}</select></label></>}{actionError && <p role="alert" className="tw-error">{actionError}</p>}<footer><button type="button" disabled={saving} onClick={() => setAction('')}>Đóng</button><button className="tw-primary" disabled={saving}>{saving ? 'Đang xử lý…' : 'Xác nhận'}</button></footer></form></section></div>}
  </main>;
}




