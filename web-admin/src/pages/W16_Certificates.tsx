import { useEffect, useState, type FormEvent } from 'react';
import { Award, Download, Eye, Plus, RotateCcw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { adminCommand, type Listing, type Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import { AdminTabs, toast } from '../components/common';
import CertificateTemplateEditor, { readCertificateTemplateSettings } from '../components/certificates/CertificateTemplateEditor';
import CertificateDocumentPreview from '../components/certificates/CertificateDocumentPreview';
import { useCanvaCertificates } from '../components/certificates/CanvaCertificatePanel';
import { CertificateStatus, type StudentCertificate } from '../types/shared_types';

const pageSize = 25;
const statusLabels = { DRAFT: 'Bản nháp', ISSUED: 'Đã phát hành', REVOKED: 'Đã thu hồi' };
const sample: StudentCertificate = {
  id: 'preview', certificateCode: 'BẢN MẪU', qrVerificationCode: '',
  studentName: 'HỌ VÀ TÊN HỌC VIÊN', courseTitle: 'Tên chương trình đào tạo',
  issueDate: '', finalGrade: '', status: CertificateStatus.DRAFT,
};

function listPath(table: string, params: Record<string, string>, filters: Record<string, string> = {}) {
  const query = new URLSearchParams(params);
  if (Object.keys(filters).length) query.set('filter', JSON.stringify(filters));
  return table + '?' + query;
}

function certificate(row: Row): StudentCertificate {
  return {
    id: row.id, enrollmentId: row.enrollment_id, certificateCode: row.certificate_code,
    qrVerificationCode: row.qr_verification_code, studentName: row.student_name,
    dateOfBirth: row.date_of_birth, courseTitle: row.course_title, issueDate: row.issue_date,
    theoryScore: row.theory_score, practicalScore: row.practical_score, finalGrade: row.final_grade,
    signerName: row.signer_name, signerTitle: row.signer_title, status: row.status,
  };
}

function dateLabel(value?: string) {
  return value?.slice(0, 10).split('-').reverse().join('/') || '—';
}

export function W16_Certificates() {
  const { user } = useAdmin();
  const canManage = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');
  const canUseCanva = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');
  const canva = useCanvaCertificates(canUseCanva);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'template' ? 'template' : params.get('tab') === 'issue' && canManage ? 'issue' : 'list';
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<StudentCertificate>();
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<{ row: Row; action: 'issue' | 'revoke' }>();
  const [reason, setReason] = useState('');
  const [lookup, setLookup] = useState('');
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [lookupStatus, setLookupStatus] = useState('');
  const [selected, setSelected] = useState<Row>();
  const [record, setRecord] = useState<Row>();
  const [checking, setChecking] = useState(false);
  const [eligibilityError, setEligibilityError] = useState('');
  const [signer, setSigner] = useState('');
  const [signerTitle, setSignerTitle] = useState('');

  function openTab(next: string) {
    setParams(current => {
      const updated = new URLSearchParams(current);
      updated.set('tab', next);
      return updated;
    });
  }

  useEffect(() => {
    if (tab !== 'list') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = window.setTimeout(async () => {
      try {
        const result = await adminCommand<Listing>(listPath('student_certificates', {
          limit: String(pageSize), page: String(page), search: search.trim(), sort: 'created_at',
        }, status ? { status } : {}), undefined, controller.signal);
        if (controller.signal.aborted) return;
        setRows(result.rows);
        setTotal(result.total);
      } catch (err) {
        if (!controller.signal.aborted) setError((err as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [tab, page, search, status, refresh, user?.id]);

  useEffect(() => {
    if (tab !== 'issue' || lookup.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await adminCommand<Listing>(listPath('course_enrollments', {
          limit: '20', search: lookup.trim(),
        }), undefined, controller.signal);
        if (controller.signal.aborted) return;
        setCandidates(result.rows);
        setLookupStatus(result.rows.length ? '' : 'Không tìm thấy hồ sơ ghi danh.');
      } catch (err) {
        if (!controller.signal.aborted) setLookupStatus((err as Error).message);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [tab, lookup]);

  useEffect(() => {
    if (!selected || tab !== 'issue') return;
    const controller = new AbortController();
    setChecking(true);
    setEligibilityError('');
    Promise.all([
      adminCommand<Listing>(listPath('student_academic_records', { limit: '1' }, { enrollment_id: selected.id }), undefined, controller.signal),
      adminCommand<Listing>(listPath('student_certificates', { limit: '20' }, { enrollment_id: selected.id }), undefined, controller.signal),
    ]).then(([records, certificates]) => {
      if (controller.signal.aborted) return;
      setRecord(records.rows[0]);
      const existing = certificates.rows.find(row => row.status === 'DRAFT' || row.status === 'ISSUED');
      if (existing) setEligibilityError('Hồ sơ đã có giấy chứng nhận ' + existing.certificate_code + '. Mở danh sách để tiếp tục.');
    }).catch(err => {
      if (!controller.signal.aborted) setEligibilityError(err.message);
    }).finally(() => {
      if (!controller.signal.aborted) setChecking(false);
    });
    return () => controller.abort();
  }, [selected, tab]);

  const eligible = Boolean(selected?.course_title || selected?.id);

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!eligible || !selected?.student_name?.trim() || !signer.trim() || !signerTitle.trim() || checking || eligibilityError || busy) return;
    setBusy(true);
    try {
      const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
      const theoryScore = record?.theory_score != null ? Number(record.theory_score) : 10;
      const practicalScore = record?.practical_score != null ? Number(record.practical_score) : 10;
      const row = await adminCommand<Row>('student_certificates/create', { values: {
        enrollment_id: selected.id, student_id: selected.student_id, course_id: selected.course_id,
        student_name: selected.student_name.trim(), course_title: selected.course_title,
        certificate_code: 'MLD-GCN-' + year + '-' + crypto.randomUUID().slice(0, 13).replace('-', '').toUpperCase(),
        theory_score: theoryScore, practical_score: practicalScore,
        signer_name: signer.trim(), signer_title: signerTitle.trim(),
      } });
      setSelected(undefined);
      setLookup('');
      setCandidates([]);
      setSigner('');
      setSignerTitle('');
      setStatus('DRAFT');
      setPage(1);
      setSearch(row.certificate_code);
      setRefresh(value => value + 1);
      openTab('list');
      toast.success('Đã lưu bản nháp');
    } catch (err) {
      toast.error('Không thể lưu bản nháp', (err as Error).message);
    } finally { setBusy(false); }
  }

  async function transition(event: FormEvent) {
    event.preventDefault();
    if (!pending || busy || (pending.action === 'revoke' && !reason.trim())) return;
    setBusy(true);
    try {
      const row = await adminCommand<Row>('student_certificates/action', {
        key: { id: pending.row.id }, action: pending.action, reason: reason.trim(),
      });
      setPending(undefined);
      setRefresh(value => value + 1);
      setStatus(row.status);
      setPage(1);
      setSearch(row.certificate_code);
      toast.success(pending.action === 'issue' ? 'Đã phát hành giấy chứng nhận' : 'Đã thu hồi giấy chứng nhận');
      if (pending.action === 'issue') setPreview(certificate(row));
    } catch (err) {
      toast.error('Không thể cập nhật giấy chứng nhận', (err as Error).message);
    } finally { setBusy(false); }
  }

  function exportPage() {
    const escape = (value: unknown) => {
      const raw = String(value ?? '');
      const safe = /^[\s]*[=+@-]|^[\t\r]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const csv = [['Số hiệu', 'Học viên', 'Khóa đào tạo', 'Ngày cấp', 'Trạng thái'],
      ...rows.map(row => [row.certificate_code, row.student_name, row.course_title,
        row.status === 'DRAFT' ? '' : dateLabel(row.issue_date), statusLabels[row.status as keyof typeof statusLabels] || row.status])]
      .map(columns => columns.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'giay-chung-nhan-trang-' + page + '.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Học viên & đào tạo</p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Giấy chứng nhận</h1>
      </div>
      {canManage && tab !== 'issue' && <button className="admin-primary inline-flex items-center gap-2" onClick={() => openTab('issue')}><Plus size={16} /> Cấp giấy chứng nhận</button>}
    </header>
    <AdminTabs ariaLabel="Giấy chứng nhận" variant="line" activeTab={tab} onChange={openTab} tabs={[
      { id: 'list', label: 'Danh sách' }, { id: 'template', label: 'Mẫu chứng nhận' },
      ...(canManage ? [{ id: 'issue', label: 'Tạo bản nháp' }] : []),
    ]} />

    {canUseCanva && (canva.result || canva.error || canva.busy) && (
      <section aria-label="Kết quả Canva" className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 text-sm">
        {canva.busy && <p role="status">Đang xử lý trên Canva…</p>}
        {canva.error && <p role="alert" className="text-rose-800">{canva.error}</p>}
        {canva.pending && canva.error && !canva.busy && <>
          <button className="admin-secondary" onClick={() => void canva.generate(canva.pending?.certificateId)}>Kiểm tra lại tiến độ</button>
          <button className="admin-secondary" onClick={canva.clearPending}>Bỏ theo dõi</button>
        </>}
        {canva.result && <>
          <p role="status">Canva đã tạo PDF. Liên kết tải có hiệu lực 24 giờ.</p>
          <a className="admin-primary" href={canva.result.pdfUrl} target="_blank" rel="noopener noreferrer">Tải PDF Canva</a>
          <a className="admin-secondary" href={canva.result.designUrl} target="_blank" rel="noopener noreferrer">Mở bản thiết kế</a>
        </>}
      </section>
    )}

    {tab === 'list' && <section className="overflow-hidden rounded-2xl border bg-white" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <label className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-stone-500" />
          <input className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 w-full !pl-9" aria-label="Tìm chứng nhận" placeholder="Tên học viên, số hiệu hoặc khóa đào tạo" value={search} onChange={event => { setSearch(event.target.value); setPage(1); setLoading(true); }} />
        </label>
        <select className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800" aria-label="Trạng thái chứng nhận" value={status} onChange={event => { setStatus(event.target.value); setPage(1); setLoading(true); }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="admin-secondary inline-flex items-center gap-2" onClick={() => setRefresh(value => value + 1)} disabled={loading}><RotateCcw size={15} /> Tải lại</button>
        <button className="admin-secondary inline-flex items-center gap-2" disabled={loading || Boolean(error) || !rows.length} onClick={exportPage}><Download size={15} /> Xuất CSV trang này</button>
      </div>
      {loading ? <p role="status" className="p-8 text-center text-stone-600">Đang tải danh sách…</p> : error ?
        <p role="alert" className="bg-rose-50 p-5 text-rose-900">{error}</p> : !rows.length ?
        <p className="p-10 text-center text-stone-600">{search || status ? 'Không có giấy chứng nhận khớp bộ lọc.' : 'Chưa có giấy chứng nhận.'}</p> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-600"><tr>
              {['Học viên / Số hiệu', 'Khóa đào tạo', 'Ngày cấp', 'Trạng thái', 'Thao tác'].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y">{rows.map(row => <tr key={row.id}>
              <td className="px-4 py-4"><strong>{row.student_name}</strong><p className="mt-1 font-mono text-xs text-stone-600">{row.certificate_code}</p></td>
              <td className="px-4 py-4">{row.course_title}{row.status !== 'DRAFT' && row.final_grade && <p className="mt-1 text-xs text-stone-600">{row.final_grade} · LT {row.theory_score ?? '—'} · TH {row.practical_score ?? '—'}</p>}</td>
              <td className="whitespace-nowrap px-4 py-4">{row.status === 'DRAFT' ? '—' : dateLabel(row.issue_date)}</td>
              <td className="px-4 py-4"><span className={'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ' + (row.status === 'ISSUED' ? 'bg-emerald-50 text-emerald-800' : row.status === 'REVOKED' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900')}>{statusLabels[row.status as keyof typeof statusLabels] || row.status}</span>
                {row.revocation_reason && <p className="mt-1 max-w-64 break-words text-xs text-stone-600">{row.revocation_reason}</p>}</td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-2">
                <button className="admin-secondary inline-flex items-center gap-1.5" onClick={() => setPreview(certificate(row))}><Eye size={15} /> {row.status === 'ISSUED' ? 'Xem & in' : 'Xem'}</button>
                {canUseCanva && canva.status?.connected && row.status === 'ISSUED' && (
                  <button className="admin-secondary" disabled={canva.busy || !!canva.pending}
                    onClick={() => {
                      if (window.confirm('Tạo PDF Canva từ dữ liệu của chứng nhận này? Thông tin cần điền sẽ được gửi đến tài khoản Canva đã kết nối.'))
                        void canva.generate(row.id);
                    }}>Tạo PDF Canva</button>
                )}
                {canManage && row.status === 'DRAFT' && <button className="admin-primary" onClick={() => setPending({ row, action: 'issue' })}>Phát hành</button>}
                {canManage && row.status === 'ISSUED' && <button className="admin-secondary text-rose-800" onClick={() => { setReason(''); setPending({ row, action: 'revoke' }); }}>Thu hồi</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      {!loading && !error && <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <span>{total} giấy chứng nhận</span>
        <div className="flex items-center gap-2">
          <button className="admin-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button className="admin-secondary" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Sau</button>
        </div>
      </footer>}
    </section>}

    {tab === 'template' && <section className="grid gap-5 overflow-hidden rounded-2xl border bg-white lg:grid-cols-[1fr_1.4fr]">
      <div className="p-6">
        <Award className="mb-3 text-amber-800" />
        <h2 className="text-lg font-semibold">Phôi chứng nhận A4</h2>
        <p className="my-2 text-sm text-stone-600">Xem trước bố cục và lưu tùy chỉnh mẫu trên trình duyệt này.</p>
        <button className="admin-secondary mt-2" onClick={() => setPreview(sample)}>Mở trình thiết kế</button>
        {canUseCanva && <div className="mt-6 space-y-3 border-t pt-5">
          <h3 className="font-semibold">Thiết kế trên Canva</h3>
          <p className="text-sm text-stone-600">
            {!canva.status ? 'Đang kiểm tra kết nối…' : canva.status.connected ? 'Đã kết nối tài khoản Canva.' :
              canva.status.configured ? 'Kết nối Canva để kiểm tra phôi và tạo PDF cho chứng nhận đã phát hành.' :
                'Chưa cấu hình ứng dụng và ID thiết kế Canva trên máy chủ.'}
          </p>
          {canva.status?.configured && <div className="flex flex-wrap gap-2">
            <button className="admin-secondary" disabled={canva.busy} onClick={() => void canva.connect()}>
              {canva.status.connected ? 'Kết nối lại Canva' : 'Kết nối Canva'}
            </button>
            {canva.status.designId && <a className="admin-secondary" href={`https://www.canva.com/design/${canva.status.designId}/edit`} target="_blank" rel="noopener noreferrer">Chỉnh phôi trên Canva</a>}
            {canva.status.connected && <button className="admin-primary" disabled={canva.busy || !!canva.pending} onClick={() => void canva.generate()}>Tạo PDF mẫu</button>}
          </div>}
        </div>}
      </div>
      <div className="bg-stone-100 p-4 sm:p-6">
        <div className="mx-auto max-w-[420px]">
          <CertificateDocumentPreview settings={readCertificateTemplateSettings()} fields={{
            studentName: sample.studentName, courseTitle: sample.courseTitle, certificateCode: sample.certificateCode,
            dateOfBirth: '', signerName: '', signerTitle: '', issueDate: '',
          }} />
        </div>
      </div>
    </section>}

    {tab === 'issue' && <div className="grid items-start gap-4 lg:grid-cols-[1fr_0.75fr]">
      <form className="space-y-4 rounded-2xl border bg-white p-5" onSubmit={saveDraft}>
        <h2 className="text-lg font-semibold">1. Chọn hồ sơ ghi danh</h2>
        <label className="block text-sm">Tìm theo tên, mã hồ sơ hoặc số điện thoại
          <input className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 mt-1 w-full" value={lookup} onChange={event => {
            setLookup(event.target.value); setSelected(undefined); setCandidates([]);
            setLookupStatus(event.target.value.trim().length >= 2 ? 'Đang tìm…' : '');
          }} />
        </label>
        {lookupStatus && <p role="status" className="text-sm text-stone-600">{lookupStatus}</p>}
        {candidates.length > 0 && <label className="block text-sm">Hồ sơ ghi danh
          <select className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 mt-1 w-full" aria-label="Hồ sơ ghi danh" value={selected?.id || ''} onChange={event => {
            setRecord(undefined); setEligibilityError('');
            setSelected(candidates.find(row => row.id === event.target.value));
          }}>
            <option value="">Chọn hồ sơ</option>
            {candidates.map(row => <option key={row.id} value={row.id}>{row.student_name || 'Chưa có tên học viên'} · {row.order_code || row.course_title || row.id}</option>)}
          </select>
        </label>}
        {selected && <div className="space-y-2 rounded-xl bg-stone-50 p-4 text-sm">
          <strong>{selected.student_name || 'Chưa có tên học viên'}</strong>
          {selected.course_title && <p>{selected.course_title}</p>}
          {checking ? <p role="status">Đang tải hồ sơ…</p> : eligibilityError ? <p role="alert">{eligibilityError}</p> :
            <p className="text-emerald-800">Sẵn sàng cấp giấy chứng nhận cho học viên.</p>}
          {record && <p>LT {record.theory_score ?? '—'} · TH {record.practical_score ?? '—'} · Chuyên cần {record.attendance_rate ?? '—'}%</p>}
        </div>}
        <h2 className="border-t pt-4 text-lg font-semibold">2. Xác nhận người ký</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Họ tên người ký<input className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 mt-1 w-full" required maxLength={100} value={signer} onChange={event => setSigner(event.target.value)} /></label>
          <label className="text-sm">Chức danh<input className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 mt-1 w-full" required maxLength={100} value={signerTitle} onChange={event => setSignerTitle(event.target.value)} /></label>
        </div>
        <button className="admin-primary" disabled={busy || checking || !eligible || Boolean(eligibilityError) || !selected?.student_name?.trim() || !signer.trim() || !signerTitle.trim()}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</button>
      </form>
      <aside className="rounded-2xl border bg-white p-5">
        <h2 className="text-base font-semibold">Quy trình cấp chứng nhận</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-700">
          <li>Áp dụng trực tiếp cho tất cả học viên có hồ sơ ghi danh.</li>
          <li>Không bắt buộc điều kiện điểm số, chuyên cần hay tiến độ học phí.</li>
          <li>Sau khi lưu bản nháp, có thể phát hành ngay để in và tạo mã QR tra cứu.</li>
        </ul>
        <p className="mt-4 border-t pt-4 text-sm text-stone-600">Kiểm tra thông tin người ký và nội dung trước khi bấm Phát hành.</p>
      </aside>
    </div>}

    {preview && <CertificateTemplateEditor key={preview.id} certificate={preview}
      readOnly={preview.id !== sample.id} allowPrint={preview.status === 'ISSUED'}
      templateName={preview.id === sample.id ? 'Thiết kế phôi chứng nhận' : statusLabels[preview.status]}
      isExporting={exporting} onExportingChange={setExporting} onPrint={() => window.print()} onClose={() => setPreview(undefined)} />}
    {pending && <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/50 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="certificate-action-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6" onSubmit={transition}>
        <h2 id="certificate-action-title" className="text-lg font-semibold">{pending.action === 'issue' ? 'Phát hành giấy chứng nhận' : 'Thu hồi giấy chứng nhận'}</h2>
        <p className="text-sm">{pending.row.student_name} · {pending.row.certificate_code}</p>
        {pending.action === 'issue' ? <p className="text-sm text-stone-600">Giấy chứng nhận sẽ được phát hành chính thức kèm mã QR tra cứu trực tuyến.</p> :
          <label className="block text-sm">Lý do thu hồi<textarea autoFocus className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 mt-1 w-full" rows={3} maxLength={2000} required value={reason} onChange={event => setReason(event.target.value)} /></label>}
        <div className="flex justify-end gap-2">
          <button className="admin-secondary" type="button" disabled={busy} onClick={() => setPending(undefined)}>Hủy</button>
          <button className="admin-primary" disabled={busy || (pending.action === 'revoke' && !reason.trim())}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button>
        </div>
      </form>
    </div>}
  </div>;
}

export default W16_Certificates;
