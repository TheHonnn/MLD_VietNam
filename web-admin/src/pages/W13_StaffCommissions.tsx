import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { adminCommand } from '../admin/api';
import { AdminPageShell, PageHeader, toast } from '../components/common';

type Commission = {
  id: string; staff_id: string; branch_id: string; staff_name: string; branch_name: string;
  status: string; notes?: string; commission_type: string; commission_amount: string | number;
  base_amount: string | number; percentage: string | number; invoice_code?: string; booking_code?: string;
  reversed_at?: string; reversal_of_id?: string;
};
type Workspace = { rows: Commission[]; actionBranches: string[] | null };
type Stage = 'pending' | 'approved' | 'paid' | 'review';
type Action = 'approve' | 'record-payment';
const stages: { id: Stage; label: string }[] = [
  { id: 'pending', label: 'Chờ duyệt' }, { id: 'approved', label: 'Chờ chi' },
  { id: 'paid', label: 'Đã chi' }, { id: 'review', label: 'Cần đối soát' },
];
const types: Record<string, string> = {
  SERVICE_DIRECT: 'Ca trị liệu', PACKAGE_UPSELL: 'Bán gói', CSAT_BONUS: 'Thưởng hài lòng',
  COURSE_ENROLLMENT: 'Ghi danh khóa học', TREATMENT_PATHWAY: 'Bán liệu trình', REVERSAL: 'Đảo hoa hồng',
};
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const currentMonth = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7);
const sum = (rows: Commission[]) => rows.reduce((total, row) => total + Number(row.commission_amount), 0);
function stageOf(row: Commission): Stage {
  if (row.reversed_at || row.reversal_of_id || !(Number(row.commission_amount) > 0)) return 'review';
  if (row.status === 'PENDING' || row.status === 'PENDING_APPROVAL') return 'pending';
  if (row.status === 'APPROVED') return 'approved';
  return row.status === 'PAID' ? 'paid' : 'review';
}

export function W13_StaffCommissions() {
  const [month, setMonth] = useState(currentMonth);
  const [branch, setBranch] = useState('');
  const [staff, setStaff] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<Stage>('pending');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<{ action: Action; rows: Commission[] }>();
  const [details, setDetails] = useState<Commission>();
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  function reload() {
    setWorkspace(undefined);
    setSelected([]);
    setError('');
    setRevision(value => value + 1);
  }

  useEffect(() => {
    let current = true;
    adminCommand<Workspace>('commissions/workspace?' + new URLSearchParams({ month }))
      .then(data => { if (current) setWorkspace(data); })
      .catch(error => { if (current) setError(error.message || 'Không tải được bảng kê.'); });
    return () => { current = false; };
  }, [month, revision]);

  useEffect(() => {
    if (confirmation || details) dialog.current?.showModal();
  }, [confirmation, details]);

  const rows = workspace?.rows ?? [];
  const branches = [...new Map(rows.map(row => [row.branch_id, row.branch_name]))];
  const staffOptions = [...new Map(rows.filter(row => !branch || row.branch_id === branch).map(row => [row.staff_id, row.staff_name]))];
  const scope = rows.filter(row => (!branch || row.branch_id === branch) && (!staff || row.staff_id === staff) &&
    [row.staff_name, row.branch_name, row.notes, row.invoice_code, row.booking_code].join(' ').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const byStage = (id: Stage) => scope.filter(row => stageOf(row) === id);
  const matches = byStage(stage);
  const pageIndex = Math.min(page, Math.max(0, Math.ceil(matches.length / 25) - 1));
  const visible = matches.slice(pageIndex * 25, (pageIndex + 1) * 25);
  const canAct = (row: Commission) => workspace?.actionBranches === null || workspace?.actionBranches.includes(row.branch_id);
  const checked = matches.filter(row => selected.includes(row.id) && canAct(row));
  const selectable = stage === 'pending' ? visible.filter(canAct) : [];
  const allChecked = selectable.length > 0 && selectable.every(row => selected.includes(row.id));
  function resetSelection() { setSelected([]); setPage(0); }
  function close() { if (!saving) { setConfirmation(undefined); setDetails(undefined); } }

  async function submit() {
    if (!confirmation || saving) return;
    setSaving(true);
    try {
      const result = await adminCommand<{ count: number }>('commissions/transition', {
        action: confirmation.action,
        entries: confirmation.rows.map(row => ({ id: row.id, amount: Number(row.commission_amount) })),
      });
      toast.success(confirmation.action === 'approve' ? 'Đã duyệt hoa hồng' : 'Đã ghi nhận chi trả', `${result.count} khoản đã được cập nhật.`);
    } catch (error) {
      toast.error('Không cập nhật được bảng kê', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setConfirmation(undefined);
      setSaving(false);
      reload();
    }
  }

  const field = 'w-full rounded-lg border border-[#E7DCCE] bg-white px-3 py-2 text-sm';
  return (
    <AdminPageShell>
      <PageHeader eyebrow="Nhân sự" title="Hoa hồng & thưởng"
        subtitle={<p className="text-sm text-[#73675F]">Đối soát, duyệt và ghi nhận các khoản đã chi theo kỳ.</p>}
        actions={<button type="button" onClick={reload} className="admin-secondary inline-flex items-center gap-2"><RefreshCw size={15} /> Tải lại</button>} />

      <div className="mb-4 grid gap-3 rounded-xl border border-[#EFE4D9] bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-semibold">Kỳ hoa hồng<input className={field} type="month" value={month} onChange={event => {
          if (!event.target.value) return;
          setMonth(event.target.value); setBranch(''); setStaff(''); resetSelection(); reload();
        }} /></label>
        <label className="grid gap-1 text-xs font-semibold">Chi nhánh<select className={field} value={branch} onChange={event => {
          setBranch(event.target.value); setStaff(''); resetSelection();
        }}><option value="">Tất cả chi nhánh</option>{branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Người hưởng<select className={field} value={staff} onChange={event => {
          setStaff(event.target.value); resetSelection();
        }}><option value="">Tất cả nhân viên</option>{staffOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Tìm khoản hoa hồng<span className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[#73675F]" />
          <input className={field + ' pl-9'} type="search" placeholder="Tên, mã chứng từ, ghi chú" value={search} onChange={event => {
            setSearch(event.target.value); resetSelection();
          }} /></span></label>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        : !workspace ? <p role="status" className="rounded-xl border bg-white p-5 text-sm">Đang tải bảng kê…</p> : <>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Trạng thái hoa hồng">
          {stages.map(item => {
            const items = byStage(item.id);
            return <button key={item.id} type="button" aria-pressed={stage === item.id} onClick={() => {
              setStage(item.id); resetSelection();
            }} className={`rounded-xl border px-3 py-3 text-left ${stage === item.id ? 'border-[#985018] bg-[#FAF0E4]' : 'border-[#EFE4D9] bg-white hover:bg-[#FAF8F5]'}`}>
              <span className="block text-xs text-[#73675F]">{item.label} · {items.length} khoản</span>
              {item.id !== 'review' && <strong className="mt-1 block break-words tabular-nums">{money(sum(items))}</strong>}
            </button>;
          })}
        </div>
        {stage === 'review' && <p className="mb-3 text-sm text-[#73675F]">Kiểm tra khoản gốc và khoản điều chỉnh trước khi xử lý ngoài luồng chi trả thông thường.</p>}
        <section className="overflow-hidden rounded-xl border border-[#EFE4D9] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE4D9] px-4 py-3">
            <h2 className="text-sm font-semibold">{stages.find(item => item.id === stage)?.label} · {matches.length} khoản</h2>
            {checked.length > 0 && <button type="button" className="admin-primary" onClick={() => setConfirmation({ action: 'approve', rows: checked })}>Duyệt {checked.length} khoản · {money(sum(checked))}</button>}
          </div>
          {!matches.length ? <p className="p-8 text-center text-sm text-[#73675F]">Không có khoản nào trong phạm vi đang xem.</p> :
            <div className="overflow-x-auto">
              <table className="admin-table min-w-[670px]">
                <thead><tr>
                  {stage === 'pending' && <th><input type="checkbox" aria-label="Chọn tất cả khoản có thể duyệt trên trang" checked={allChecked} disabled={!selectable.length}
                    onChange={() => setSelected(allChecked ? [] : selectable.map(row => row.id))} /></th>}
                  <th>Người hưởng</th><th>Nguồn hoa hồng</th><th className="text-right">Số tiền</th><th className="text-right">Thao tác</th>
                </tr></thead>
                <tbody>{visible.map(row => <tr key={row.id}>
                  {stage === 'pending' && <td><input type="checkbox" aria-label={`Chọn khoản của ${row.staff_name}`} checked={selected.includes(row.id)} disabled={!canAct(row)}
                    onChange={() => setSelected(ids => ids.includes(row.id) ? ids.filter(id => id !== row.id) : [...ids, row.id])} /></td>}
                  <td><button type="button" className="admin-record-link text-left" onClick={() => setDetails(row)}>{row.staff_name}</button><div className="text-xs text-[#73675F]">{row.branch_name}</div></td>
                  <td>{types[row.commission_type] || row.commission_type}<div className="break-all text-xs text-[#73675F]">{row.invoice_code || row.booking_code || '—'}</div></td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(Number(row.commission_amount))}</td>
                  <td className="whitespace-nowrap text-right">
                    {canAct(row) && (stage === 'pending' || stage === 'approved') ?
                      <button type="button" className="admin-secondary" onClick={() => setConfirmation({ action: stage === 'pending' ? 'approve' : 'record-payment', rows: [row] })}>{stage === 'pending' ? 'Duyệt' : 'Ghi nhận đã chi'}</button>
                      : <button type="button" className="admin-secondary" onClick={() => setDetails(row)}>Chi tiết</button>}
                  </td>
                </tr>)}</tbody>
              </table>
            </div>}
          {matches.length > 25 && <div className="flex items-center justify-end gap-3 border-t p-3 text-xs">
            <button className="admin-secondary" disabled={!pageIndex} onClick={() => { setPage(pageIndex - 1); setSelected([]); }}>Trang trước</button>
            <span>{pageIndex + 1}/{Math.ceil(matches.length / 25)}</span>
            <button className="admin-secondary" disabled={(pageIndex + 1) * 25 >= matches.length} onClick={() => { setPage(pageIndex + 1); setSelected([]); }}>Trang sau</button>
          </div>}
        </section>
      </>}

      {(confirmation || details) && <dialog ref={dialog} className="admin-dialog admin-confirm" aria-labelledby="commission-dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
        <header><h2 id="commission-dialog-title">{confirmation ? (confirmation.action === 'approve' ? 'Duyệt hoa hồng' : 'Ghi nhận đã chi') : 'Chi tiết hoa hồng'}</h2></header>
        {confirmation ? <>
          <p>{confirmation.rows.length} khoản · <strong>{money(sum(confirmation.rows))}</strong> · Kỳ {month}</p>
          <ul className="max-h-44 overflow-auto px-5 text-sm">{confirmation.rows.map(row => <li key={row.id}>{row.staff_name} · {row.branch_name} · {money(Number(row.commission_amount))}</li>)}</ul>
          {confirmation.action === 'record-payment' && <p>Chỉ xác nhận sau khi tiền đã được chi thực tế.</p>}
        </> : details && <>
          <p><strong>{details.staff_name}</strong> · {details.branch_name}</p>
          <p>{money(Number(details.base_amount))} × {Number(details.percentage)}% · <strong>{money(Number(details.commission_amount))}</strong></p>
          <p>{types[details.commission_type] || details.commission_type} · {details.invoice_code || details.booking_code || 'Chưa có mã chứng từ'}</p>
          {details.notes && <p className="whitespace-pre-wrap break-words">{details.notes}</p>}
        </>}
        <footer><button type="button" className="admin-secondary" disabled={saving} onClick={close}>Đóng</button>
          {confirmation && <button type="button" className="admin-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu…' : 'Xác nhận'}</button>}
        </footer>
      </dialog>}
    </AdminPageShell>
  );
}
