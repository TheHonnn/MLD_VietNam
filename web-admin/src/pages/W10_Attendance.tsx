import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminCommand, type Listing, type Resource, type Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import { academyClassLink, getResourceNavigation } from '../admin/navigation';
import { AdminPageShell, AdminTabs, PageHeader } from '../components/common';

const statuses = { PRESENT: 'Có mặt', LATE: 'Đi muộn', ABSENT: 'Vắng', EXCUSED: 'Vắng có phép' };
type Status = keyof typeof statuses;
type Student = { id: string; full_name: string; status: Status | null; eligible: boolean };

async function list(resource: string, filter?: object) {
  const rows: Row[] = [];
  const params = new URLSearchParams({ limit: '100', sort: 'id' });
  if (filter) params.set('filter', JSON.stringify(filter));
  for (let page = 1; ; page++) {
    params.set('page', String(page));
    const response = await adminCommand<Listing>(resource + '?' + params);
    rows.push(...response.rows);
    if (rows.length >= response.total || !response.rows.length) return rows;
  }
}

export function W10_Attendance() {
  const { user } = useAdmin();
  const [params, setParams] = useSearchParams();
  const batchId = params.get('batch_id') || '';
  const sessionId = params.get('schedule_id') || '';
  const [resources, setResources] = useState<Resource[]>([]);
  const [batches, setBatches] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [roster, setRoster] = useState<{ rows: Student[]; writable: boolean } | null>(null);
  const [draft, setDraft] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRoster(null);
    setDraft({});
    void (async () => {
      try {
        const catalog = await adminCommand<Resource[]>('resources');
        const classes = await list('course_batches');
        const selected = classes.some(row => row.id === batchId);
        const timetable = selected ? await list('batch_schedules', { batch_id: batchId }) : [];
        timetable.sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time));
        if (!active) return;
        setResources(catalog);
        setBatches(classes);
        setSessions(timetable);
        if (timetable.some(row => row.id === sessionId)) {
          const result = await adminCommand<{ rows: Student[]; writable: boolean }>('academy/attendance/' + sessionId);
          if (active) setRoster(result);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu điểm danh.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [batchId, sessionId, version]);

  const actions = resources.find(row => row.name === 'student_attendance')?.actions;
  const canMark = (student: Student) => roster?.writable && student.eligible &&
    actions?.includes(student.status ? 'update' : 'create');
  const changes = (roster?.rows || []).filter(row => draft[row.id] && draft[row.id] !== row.status);
  useEffect(() => {
    if (!changes.length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changes.length]);
  const selected = batches.find(row => row.id === batchId);
  const reload = () => setVersion(value => value + 1);
  function selectClassOrSession(batch: string, session?: string) {
    if (changes.length && !window.confirm('Bỏ các thay đổi điểm danh chưa lưu?')) return;
    setNotice('');
    setParams({ ...(batch ? { batch_id: batch } : {}), ...(session ? { schedule_id: session } : {}) });
  }
  async function save() {
    if (savingRef.current || !changes.length) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await adminCommand('academy/attendance/' + sessionId, {
        changes: changes.map(row => ({ enrollmentId: row.id, previous: row.status, status: draft[row.id] })),
      });
      setNotice('Đã lưu điểm danh cho ' + changes.length + ' học viên.');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được điểm danh.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const tabs = getResourceNavigation('student_attendance', resources, user?.role || '').map(tab => ({
    ...tab, href: academyClassLink(tab.href, selected?.id), disabled: saving || changes.length > 0,
  }));

  return <AdminPageShell>
    <PageHeader eyebrow="Học viên & Lớp học" title="Điểm danh & Sổ theo dõi" subtitle="Chọn lớp và buổi học để ghi nhận chuyên cần." />
    <AdminTabs tabs={tabs} variant="line" activeTab="student_attendance" ariaLabel="Học viên & Lớp học" />
    <div className="mb-4 grid gap-3 rounded-xl border border-[#EAD8C7] bg-white p-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Lớp học
        <select className="mt-1 block w-full rounded-lg border p-2" value={selected?.id || ''} disabled={loading || saving} onChange={event => selectClassOrSession(event.target.value)}>
          <option value="">Chọn lớp học</option>
          {batches.map(row => <option key={row.id} value={row.id}>{row.batch_code} · {row.course_title || row.courses?.title || 'Khóa học'}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Buổi học
        <select className="mt-1 block w-full rounded-lg border p-2" value={sessions.some(row => row.id === sessionId) ? sessionId : ''} disabled={loading || saving || !sessions.length} onChange={event => selectClassOrSession(batchId, event.target.value)}>
          <option value="">Chọn buổi học</option>
          {sessions.map(row => <option key={row.id} value={row.id}>{row.session_date.split('-').reverse().join('/')} · {row.start_time.slice(0, 5)} · {row.topic}</option>)}
        </select>
      </label>
      {selected && <p className="text-sm text-[#73675F]">{selected.branch_name || selected.branches?.name} · {selected.instructor_name || selected.instructors?.full_name || 'Chờ phân công giảng viên'}</p>}
    </div>
    {notice && <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p>}
    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error} <button className="ml-2 underline" disabled={saving} onClick={() => { if (!changes.length || window.confirm('Bỏ thay đổi chưa lưu và tải lại?')) reload(); }}>Tải lại</button></div>}
    {loading ? <p role="status">Đang tải dữ liệu lớp…</p> : roster ? <section className="admin-table-wrap">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
        <h2 className="font-semibold">Sổ điểm danh · {roster.rows.length} học viên</h2>
        {changes.length > 0 && <button className="admin-primary" disabled={saving} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu điểm danh (' + changes.length + ')'}</button>}
        {changes.length > 0 && <button className="admin-secondary" disabled={saving} onClick={() => setDraft({})}>Bỏ thay đổi</button>}
      </div>
      {!roster.writable && <p className="px-4 pb-3 text-sm">Buổi học chưa đến ngày hoặc lớp đã đóng. Bạn có thể xem dữ liệu đã ghi nhận.</p>}
      {roster.rows.length ? <table className="admin-table"><thead><tr><th>Học viên</th><th>Chuyên cần</th></tr></thead><tbody>
        {roster.rows.map(row => <tr key={row.id}><td>{row.full_name}</td><td>{canMark(row) ? <select aria-label={'Điểm danh ' + row.full_name} className="rounded-lg border bg-white p-2" disabled={saving} value={draft[row.id] ?? row.status ?? ''} onChange={event => {
          const status = event.target.value as Status;
          setDraft(current => { const next = { ...current }; if (status) next[row.id] = status; else delete next[row.id]; return next; });
        }}>
          <option value="" disabled={Boolean(row.status)}>Chưa điểm danh</option>
          {Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select> : row.status ? statuses[row.status] : 'Chưa điểm danh'}</td></tr>)}
      </tbody></table> : <p className="p-4 text-sm">Buổi học chưa có học viên đủ điều kiện điểm danh.</p>}
    </section> : !error && <div className="rounded-xl border bg-white p-6 text-sm">
      {selected && !sessions.length ? <>Lớp chưa có buổi học. {tabs.some(tab => tab.id === 'batch_schedules') && <Link className="font-semibold underline" to={academyClassLink('/manage/batch_schedules', batchId)}>Mở thời khóa biểu</Link>}</> : selected ? 'Chọn buổi học để mở sổ điểm danh.' : 'Chọn lớp để xem danh sách buổi học.'}
    </div>}
  </AdminPageShell>;
}
