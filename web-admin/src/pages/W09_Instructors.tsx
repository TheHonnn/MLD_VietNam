import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminCommand, type Listing, type Resource, type Row } from '../admin/api';
import { InstructorFormEditor, type InstructorFormValues } from '../admin/InstructorFormEditor';
import { AdminPageShell, PageHeader } from '../components/common';
import { matchSearch } from '../utils/searchUtils';

const activeStatuses = new Set(['UPCOMING', 'OPEN_FOR_ENROLLMENT', 'IN_PROGRESS']);
const blankProfile: InstructorFormValues = {
  full_name: '', title: '', avatar_url: '', experience_years: 0, bio: '', achievements: [], is_active: true,
};
const dateKey = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
const addDays = (date: string, days: number) => {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return dateKey(value);
};
const showDate = (date?: string) => date ? date.slice(0, 10).split('-').reverse().join('/') : '—';
const courseTitle = (row: Row) => row.course_title || row.courses?.title || 'Chưa có tên khóa học';
const branchName = (row: Row) => row.branch_name || row.branches?.name || 'Chưa có tên cơ sở';

async function loadRows(table: string, signal: AbortSignal, weekStart?: string) {
  const rows: Row[] = [];
  const params = new URLSearchParams({ limit: '100', sort: 'id', direction: 'asc' });
  if (weekStart) params.set('weekStart', weekStart);
  for (let page = 1; ; page++) {
    params.set('page', String(page));
    if (signal.aborted) throw new DOMException('Đã hủy tải dữ liệu.', 'AbortError');
    const listing = await adminCommand<Listing>(table + '?' + params, undefined, signal);
    rows.push(...listing.rows);
    if (rows.length >= listing.total || listing.rows.length === 0) return rows;
  }
}

export const W09_Instructors: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [batches, setBatches] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('');
  const [assignment, setAssignment] = useState('');
  const [view, setView] = useState<'profiles' | 'week'>('profiles');
  const [week, setWeek] = useState(() => {
    const today = dateKey(new Date());
    return addDays(today, 1 - (new Date(today + 'T12:00:00Z').getUTCDay() || 7));
  });
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ id?: string; values: InstructorFormValues } | null>(null);
  const [target, setTarget] = useState<Row | null>(null);
  const [teacherId, setTeacherId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const writing = useRef(false);
  const can = (table: string, action: string) => resources.some(resource => resource.name === table && resource.actions?.includes(action));
  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const available = await adminCommand<Resource[]>('resources', undefined, signal);
        const has = (table: string) => available.some(item => item.name === table);
        const [profiles, classes] = await Promise.all([
          loadRows('instructors', signal),
          has('course_batches') ? loadRows('course_batches', signal) : [],
        ]);
        if (signal.aborted) return;
        setResources(available);
        setInstructors(profiles);
        setBatches(classes);
      } catch (err) {
        if (!signal.aborted) setError(err instanceof Error ? err.message : 'Không tải được dữ liệu giảng viên.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [version]);

  const canReadCalendar = resources.some(item => item.name === 'batch_schedules')
    && resources.some(item => item.name === 'course_batches');
  useEffect(() => {
    if (!canReadCalendar || view !== 'week') return;
    const controller = new AbortController();
    setCalendarLoading(true);
    setCalendarError('');
    void loadRows('batch_schedules', controller.signal, week).then(rows => {
      if (!controller.signal.aborted) setSessions(rows);
    }).catch(err => {
      if (!controller.signal.aborted) setCalendarError(err instanceof Error ? err.message : 'Không tải được lịch dạy.');
    }).finally(() => {
      if (!controller.signal.aborted) setCalendarLoading(false);
    });
    return () => controller.abort();
  }, [canReadCalendar, view, week, version]);

  useEffect(() => {
    if ((editor || target) && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [editor, target]);

  const active = batches.filter(row => activeStatuses.has(row.status));
  const scoped = branch ? active.filter(row => row.branch_id === branch) : active;
  const outstanding = scoped.filter(row => !row.instructor_id);
  const visible = instructors.filter(row => {
    const assigned = scoped.some(batch => batch.instructor_id === row.id);
    return matchSearch([row.full_name, row.title, row.bio], search)
      && (!assignment || (assignment === 'assigned' ? assigned : !assigned));
  });
  const selected = visible.find(row => row.id === selectedId);
  const selectedClasses = selected ? scoped.filter(row => row.instructor_id === selected.id) : [];
  const batchMap = new Map(batches.filter(row => row.status !== 'CANCELLED' && (!branch || row.branch_id === branch)).map(row => [row.id, row]));
  const teacherMap = new Map(instructors.map(row => [row.id, row]));
  const weekEnd = addDays(week, 6);
  const weekly = sessions.filter(row => batchMap.has(row.batch_id) && row.session_date >= week && row.session_date <= weekEnd)
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time));
  const branches = [...new Map(batches.map(row => [row.branch_id, branchName(row)])).entries()].filter(([id]) => id);

  function closeDialog() {
    if (writing.current) return;
    setEditor(null);
    setTarget(null);
    setSaveError('');
  }

  function editProfile(row?: Row) {
    setEditor({ id: row?.id, values: row ? {
      user_id: row.user_id || undefined, full_name: row.full_name, title: row.title || '',
      avatar_url: row.avatar_url || '', bio: row.bio || '', achievements: row.achievements || [],
      experience_years: Number(row.experience_years ?? 0), is_active: row.is_active === true,
    } : { ...blankProfile } });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (writing.current) return;
    writing.current = true;
    setSaving(true);
    setSaveError('');
    try {
      if (editor) {
        const achievements = editor.values.achievements;
        const values = { ...editor.values, title: editor.values.title.trim() || 'Master Trainer', achievements: Array.isArray(achievements) ? achievements : achievements.split('\n').map(item => item.trim()).filter(Boolean), full_name: editor.values.full_name.trim(), user_id: editor.values.user_id || null, avatar_url: editor.values.avatar_url.trim() || null };
        if (!values.full_name) throw new Error('Vui lòng nhập họ tên giảng viên.');
        if (!values.bio.trim()) throw new Error('Vui lòng nhập giới thiệu chuyên môn.');
        if (!values.avatar_url || values.avatar_url.startsWith('blob:')) throw new Error('Vui lòng chọn ảnh đại diện và chờ tải ảnh xong.');
        await adminCommand(editor.id ? 'instructors/update' : 'instructors/create', { values, ...(editor.id ? { key: { id: editor.id } } : {}) });
        setNotice('Đã lưu hồ sơ giảng viên.');
      } else if (target) {
        await adminCommand('course_batches/update', {
          key: { id: target.id }, values: { instructor_id: teacherId || null },
          expectedUpdatedAt: target.updated_at || undefined,
          expectedInstructorId: target.instructor_id ?? null,
        });
        setNotice('Đã cập nhật giảng viên phụ trách lớp ' + target.batch_code + '.');
      }
      setTarget(null);
      setEditor(null);
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không lưu được thay đổi.');
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  function assignmentButton(batch: Row) {
    return can('course_batches', 'update') && <button className="admin-secondary" onClick={() => {
      setTarget(batch);
      setTeacherId(batch.instructor_id || '');
    }}>{batch.instructor_id ? 'Đổi phân công' : 'Phân công'}</button>;
  }

  return <AdminPageShell>
    <PageHeader eyebrow="Đội ngũ giảng viên" title="Giảng viên" subtitle="Quản lý hồ sơ, giảng viên phụ trách lớp và lịch dạy từng buổi."
      actions={<><button className="admin-secondary" disabled={loading} onClick={reload}>Tải lại</button>{can('instructors', 'create') && <button className="admin-primary" onClick={() => editProfile()}>Thêm giảng viên</button>}</>} />
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div> : loading ? <p role="status">Đang tải dữ liệu giảng viên…</p> : <>
      {notice && <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={view === 'profiles' ? 'admin-primary' : 'admin-secondary'} aria-pressed={view === 'profiles'} onClick={() => setView('profiles')}>Hồ sơ &amp; phân công</button>
        {canReadCalendar && <button className={view === 'week' ? 'admin-primary' : 'admin-secondary'} aria-pressed={view === 'week'} onClick={() => setView('week')}>Lịch dạy theo tuần</button>}
        <select aria-label="Cơ sở của lớp" className="admin-secondary" value={branch} onChange={event => setBranch(event.target.value)}>
          <option value="">Tất cả cơ sở</option>{branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
      {view === 'profiles' ? <>
        <div className="mb-4 flex flex-wrap gap-2">
          <input type="search" aria-label="Tìm giảng viên" placeholder="Tìm tên hoặc chuyên môn…" value={search} onChange={event => setSearch(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm" />
          <select aria-label="Trạng thái phân công" className="admin-secondary" value={assignment} onChange={event => setAssignment(event.target.value)}>
            <option value="">Mọi trạng thái phân công</option><option value="assigned">Có lớp phụ trách</option><option value="unassigned">Chưa có lớp phụ trách</option>
          </select>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <section className="admin-table-wrap"><table className="admin-table">
            <caption className="p-4 text-left font-semibold">Đội ngũ giảng viên · {visible.length} hồ sơ</caption>
            <thead><tr><th>Giảng viên</th><th>Hồ sơ</th><th>Lớp phụ trách</th></tr></thead>
            <tbody>{visible.map(row => <tr key={row.id} className={selected?.id === row.id ? 'bg-[#FAF0E4]' : ''}>
              <td><div className="flex items-center gap-3">{row.avatar_url && <img className="h-9 w-9 rounded-full object-cover" src={row.avatar_url} alt="" loading="lazy" />}<div><button aria-pressed={selected?.id === row.id} className="text-left font-semibold text-[#985018]" onClick={() => setSelectedId(row.id)}>{row.full_name}</button><div className="text-xs text-[#73675F]">{row.title || 'Chưa có chức danh'}</div></div></div></td>
              <td>{row.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td>
              <td>{resources.some(item => item.name === 'course_batches') ? scoped.filter(batch => batch.instructor_id === row.id).length : '—'}</td>
            </tr>)}</tbody>
          </table>{!visible.length && <p className="p-6 text-sm">Không có hồ sơ phù hợp.</p>}</section>
          <section className="rounded-xl border border-[#EAD8C7] bg-white p-4">
            {selected ? <><h2 className="font-bold">{selected.full_name}</h2><p className="mt-1 text-sm text-[#73675F]">{selected.title || 'Giảng viên'} · {selected.experience_years ?? '—'} năm kinh nghiệm</p>
              {selected.bio && <p className="mt-3 whitespace-pre-wrap text-sm">{selected.bio}</p>}
              {Array.isArray(selected.achievements) && selected.achievements.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm">{selected.achievements.map((item: string, index: number) => <li key={index}>{item}</li>)}</ul>}
              {can('instructors', 'update') && <button className="admin-secondary mt-3" onClick={() => editProfile(selected)}>Sửa hồ sơ</button>}
              <h3 className="mt-5 font-semibold">Lớp đang phụ trách</h3>
              {selectedClasses.length ? selectedClasses.map(batch => <div key={batch.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="text-sm"><strong>{batch.batch_code}</strong><div>{courseTitle(batch)}</div><div className="text-xs text-[#73675F]">{branchName(batch)}</div></div>{assignmentButton(batch)}</div>) : <p className="mt-2 text-sm text-[#73675F]">Chưa có lớp phụ trách trong phạm vi đang xem.</p>}
            </> : <p className="text-sm text-[#73675F]">Chọn một giảng viên để xem hồ sơ và các lớp đang phụ trách.</p>}
          </section>
        </div>
        {resources.some(item => item.name === 'course_batches') && <section className="mt-4 rounded-xl border border-[#EAD8C7] bg-white p-4">
          <h2 className="font-bold">Lớp chờ phân công · {outstanding.length}</h2>
          {!outstanding.length && <p className="mt-2 text-sm text-[#73675F]">Không có lớp chờ phân công trong phạm vi đang xem.</p>}
          {outstanding.map(batch => <div key={batch.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="text-sm"><strong>{batch.batch_code}</strong> · {courseTitle(batch)}<div className="text-xs text-[#73675F]">{branchName(batch)}</div></div>{assignmentButton(batch)}</div>)}
        </section>}
      </> : <section className="admin-table-wrap">
        <div className="flex flex-wrap items-center gap-2 p-4"><strong>{showDate(week)} – {showDate(weekEnd)}</strong>
          <button className="admin-secondary" onClick={() => setWeek(addDays(week, -7))}>Tuần trước</button>
          <button className="admin-secondary" onClick={() => setWeek(addDays(week, 7))}>Tuần sau</button>
          <Link className="admin-secondary" to="/manage/batch_schedules">Mở thời khóa biểu</Link>
        </div>
        {calendarLoading ? <p role="status" className="p-4">Đang tải lịch dạy…</p> : calendarError ? <p role="alert" className="p-4 text-red-700">{calendarError}</p> : <><table className="admin-table"><thead><tr><th>Ngày &amp; giờ</th><th>Lớp &amp; nội dung</th><th>Giảng viên</th><th>Phòng / cơ sở</th></tr></thead><tbody>{weekly.map(row => {
          const batch = batchMap.get(row.batch_id)!;
          return <tr key={row.id}><td>{showDate(row.session_date)}<div>{row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}</div></td>
            <td><strong>{batch.batch_code}</strong><div>{row.topic || courseTitle(batch)}</div></td>
            <td>{teacherMap.get(batch.instructor_id)?.full_name || batch.instructor_name || (batch.instructor_id ? 'Chưa tải được tên' : 'Chờ phân công')}</td>
            <td>{row.assigned_room_name || row.assigned_room?.name || 'Chưa xếp phòng'}<div className="text-xs">{branchName(batch)}</div></td></tr>;
        })}</tbody></table>
        {!weekly.length && <p className="p-6 text-sm">Chưa có buổi học trong tuần này. Tạo ngày và giờ cho từng buổi ở Thời khóa biểu.</p>}</>}
      </section>}
    </>}
    {(editor || target) && <dialog ref={dialog} aria-labelledby="instructor-dialog-title" onCancel={event => { event.preventDefault(); closeDialog(); }} className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-auto rounded-xl bg-white p-5 shadow-xl backdrop:bg-black/40">
      <form onSubmit={save} className="space-y-4">
        <h2 id="instructor-dialog-title" className="text-lg font-bold">{editor ? editor.id ? 'Sửa hồ sơ giảng viên' : 'Thêm giảng viên' : 'Phân công lớp ' + target?.batch_code}</h2>
        <fieldset disabled={saving}>
          {editor ? <InstructorFormEditor values={editor.values} isCreate={!editor.id} onChange={(field, value) => setEditor(current => current ? { ...current, values: { ...current.values, [field]: value } } : null)} /> : target && <div className="space-y-3">
            <p className="text-sm">{courseTitle(target)} · {branchName(target)}</p>
            {target.instructor_id && <p className="text-sm">Đang phụ trách: {teacherMap.get(target.instructor_id)?.full_name || target.instructor_name || 'Giảng viên hiện tại'}</p>}
            <label className="block text-sm">Giảng viên phụ trách
              <select className="admin-secondary mt-1 block w-full" value={teacherId} onChange={event => setTeacherId(event.target.value)}>
                <option value="">Để lớp chờ phân công</option>
                {instructors.filter(row => row.is_active || row.id === target.instructor_id).map(row => <option key={row.id} value={row.id}>{row.full_name}</option>)}
              </select>
            </label>
            <p className="text-xs text-[#73675F]">Thay đổi áp dụng cho lớp này. Hệ thống kiểm tra trùng giờ dựa trên các buổi đã nhập ở Thời khóa biểu.</p>
          </div>}
        </fieldset>
        {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="admin-secondary" disabled={saving} onClick={closeDialog}>Đóng</button>
          <button className="admin-primary" disabled={saving || Boolean(target && teacherId === (target.instructor_id || ''))}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
      </form>
    </dialog>}
  </AdminPageShell>;
};
