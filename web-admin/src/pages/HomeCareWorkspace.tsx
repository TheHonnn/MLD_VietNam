import React, { useEffect, useState } from 'react';
import { adminCommand, Listing, Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import './TreatmentPackagesWorkspace.css';

export async function loadHomeCareRows(table: string, filter?: Row) {
  const rows: Row[] = [];
  for (let page = 1; ; page++) {
    const result = await adminCommand<Listing>(`${table}?limit=100&page=${page}${filter ? '&filter=' + encodeURIComponent(JSON.stringify(filter)) : ''}`);
    rows.push(...result.rows);
    if (rows.length >= result.total) return rows;
    if (!result.rows.length) throw new Error('Dữ liệu thay đổi khi tải. Hãy thử lại.');
  }
}
export function HomeCareWorkspace() {
  const { user } = useAdmin();
  const [tab, setTab] = useState('templates');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Row>();
  const [steps, setSteps] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [detail, setDetail] = useState<Row>();
  const [services, setServices] = useState<Row[]>([]);
  const canPublish = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');
  useEffect(() => {
    if (!editing) return;
    let active = true;
    loadHomeCareRows('services').then(data => { if (active) setServices(data); }).catch(e => { if (active) setFormError(e.message); });
    return () => { active = false; };
  }, [Boolean(editing)]);
  useEffect(() => {
    if (!editing && !detail) return;
    const previous = document.activeElement as HTMLElement;
    const modal = document.querySelector<HTMLElement>('.tw-care-dialog');
    const selector = 'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)';
    modal?.querySelector<HTMLElement>(selector)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) { setEditing(undefined); setDetail(undefined); }
      if (event.key !== 'Tab' || !modal) return;
      const nodes = Array.from(modal.querySelectorAll<HTMLElement>(selector));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [Boolean(editing), Boolean(detail), saving]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]);
    loadHomeCareRows(tab === 'templates' ? 'home_care_guidelines' : tab === 'deliveries' ? 'home_care_deliveries' : 'post_care_outbox')
      .then(data => { if (active) setRows(data); })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, revision]);
  const filtered = rows.filter(row => `${row.title || ''} ${row.category || ''} ${row.customer_name || ''} ${row.content_snapshot?.title || ''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) && (!published || String(row.is_published) === published));
  function edit(row?: Row) {
    setEditing(row ? { ...row, is_published: false } : { title: '', category: '', summary: '', content: '', image_url: '', author_name: user?.full_name || '', is_published: false });
    setSteps(Array.isArray(row?.steps) ? row.steps.map((step: unknown) => typeof step === 'string' ? step : JSON.stringify(step)).join('\n') : '');
    setFormError('');
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true); setFormError('');
    try {
      const values = Object.fromEntries(['title', 'category', 'summary', 'content', 'image_url', 'author_name', 'is_published'].map(key => [key, editing[key]]));
      values.service_id = editing.service_id || null;
      const parsedSteps = steps.split('\n').map(step => step.trim()).filter(Boolean).map(step => {
        if (!step.startsWith('{')) return step;
        try { return JSON.parse(step); } catch { throw new Error('Bước hướng dẫn dạng JSON chưa hợp lệ. Vui lòng kiểm tra lại.'); }
      });
      await adminCommand(`home_care_guidelines/${editing.id ? 'update' : 'create'}`, { ...(editing.id ? { key: { id: editing.id }, expectedUpdatedAt: editing.updated_at } : {}), values: { ...values, steps: parsedSteps } });
      setEditing(undefined); setRevision(v => v + 1);
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Không lưu được hướng dẫn.'); }
    finally { setSaving(false); }
  }
  return <main className="treatment-workspace"><header><div><p className="tw-eyebrow">QUẢN LÝ LIỆU TRÌNH</p><h1>Hướng dẫn chăm sóc tại nhà</h1><p>Quản lý mẫu hướng dẫn và theo dõi nội dung đã giao theo từng buổi.</p></div>{tab === 'templates' && <button className="tw-primary" onClick={() => edit()}>Soạn mẫu hướng dẫn</button>}</header><nav className="tw-journal-tabs"><button aria-pressed={tab === 'templates'} onClick={() => { setTab('templates'); setPublished(''); }}>Mẫu hướng dẫn</button><button aria-pressed={tab === 'deliveries'} onClick={() => { setTab('deliveries'); setPublished(''); }}>Đã giao trong ứng dụng</button><button aria-pressed={tab === 'queue'} onClick={() => { setTab('queue'); setPublished(''); }}>Hàng đợi lời dặn</button></nav>
    <section className="tw-filters"><input aria-label="Tìm hướng dẫn" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tiêu đề, chuyên mục hoặc tên khách…" />{tab === 'templates' && <select aria-label="Xuất bản" value={published} onChange={e => setPublished(e.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Đã xuất bản</option><option value="false">Bản nháp / Đã gỡ xuất bản</option></select>}<button onClick={() => setRevision(v => v + 1)}>Tải lại</button></section>
    {error ? <p role="alert" className="tw-error">{error}</p> : loading ? <p role="status">Đang tải hướng dẫn…</p> : <section className="tw-panel"><div className="tw-table"><table><thead><tr><th>{tab === 'templates' ? 'Tiêu đề / Chuyên mục' : 'Khách hàng / Hướng dẫn'}</th><th>Trạng thái</th><th>Phiên bản / Thời gian</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td><strong>{tab === 'templates' ? row.title : row.customer_name || 'Chưa có tên khách'}</strong><span>{tab === 'templates' ? row.category : row.content_snapshot?.title || 'Lời dặn ghi nhận theo buổi'}</span></td><td>{tab === 'templates' ? row.is_published ? 'Đã xuất bản' : 'Bản nháp / Đã gỡ xuất bản' : ({ PENDING: 'Đã xếp hàng, chưa gửi', SENT: 'Đã gửi', FAILED: 'Gửi thất bại' }[String(row.status)] || row.status)}</td><td>{tab === 'templates' ? `Phiên bản ${row.version}` : `Phiên bản ${row.guideline_version || '—'}`}<span>{new Date(row.updated_at || row.sent_at || row.created_at).toLocaleString('vi-VN')}</span></td><td><button onClick={() => setDetail(row)}>Xem nội dung</button>{tab === 'templates' && <button onClick={() => edit(row)}>Chỉnh sửa</button>}</td></tr>)}</tbody></table></div>{!filtered.length && <p className="tw-empty">Chưa có nội dung phù hợp.</p>}</section>}
    {editing && <div className="tw-overlay"><section className="tw-dialog tw-journal-dialog tw-care-dialog" role="dialog" aria-modal="true" aria-labelledby="care-edit-title"><form onSubmit={save}><h2 id="care-edit-title">{editing.id ? 'Cập nhật mẫu hướng dẫn' : 'Soạn mẫu hướng dẫn'}</h2><p>Nội dung đã giao cho khách được giữ nguyên. Bản chỉnh sửa được lưu thành phiên bản mới.</p>{[['title','Tiêu đề'],['category','Chuyên mục'],['summary','Tóm tắt'],['content','Nội dung, điều cần tránh và dấu hiệu cần liên hệ'],['image_url','Đường dẫn hình ảnh'],['author_name','Tác giả']].map(([key,label]) => <label key={key}>{label}{['summary','content'].includes(key) ? <textarea required value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value })} /> : <input required type={key === 'image_url' ? 'url' : 'text'} value={editing[key]} onChange={e => setEditing({ ...editing, [key]: e.target.value })} />}</label>)}<label>Dịch vụ áp dụng<select value={editing.service_id || ''} onChange={e => setEditing({ ...editing, service_id: e.target.value || null })}><option value="">Dùng chung cho các dịch vụ</option>{services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><label>Các bước thực hiện (mỗi dòng một bước)<textarea value={steps} onChange={e => setSteps(e.target.value)} /></label>{canPublish && <label><input type="checkbox" checked={editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })} /> Xuất bản phiên bản này</label>}{formError && <p role="alert" className="tw-error">{formError}</p>}<footer><button type="button" disabled={saving} onClick={() => setEditing(undefined)}>Đóng</button><button className="tw-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu phiên bản'}</button></footer></form></section></div>}
    {detail && <div className="tw-overlay"><section className="tw-dialog tw-journal-dialog tw-care-dialog" role="dialog" aria-modal="true" aria-labelledby="care-detail-title"><h2 id="care-detail-title">{detail.title || detail.content_snapshot?.title || 'Nội dung chăm sóc đã giao'}</h2><p style={{ whiteSpace: 'pre-wrap' }}>{detail.content_snapshot?.content || detail.content}</p>{Array.isArray(detail.steps) && detail.steps.map((step: unknown,index: number) => <p key={index}>{index + 1}. {typeof step === 'string' ? step : JSON.stringify(step)}</p>)}{detail.error_message && <p role="alert">{detail.error_message}</p>}<button onClick={() => setDetail(undefined)}>Đóng</button></section></div>}
  </main>;
}

export function AssignHomeCare({ journalId }: { journalId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; setRows([]); setSelected(''); setError(''); setNotice(''); adminCommand<Row[]>(`treatment/journals/${journalId}/home-care-templates`).then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [journalId]);
  const template = rows.find(row => row.id === selected);
  async function assign() {
    if (!template || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { const result = await adminCommand<Row>(`treatment/journals/${journalId}/home-care`, { guidelineId: template.id }); setNotice(result.status === 'SENT' ? 'Đã lưu hướng dẫn trong ứng dụng và thông báo cho khách. Gửi lại cùng phiên bản không tạo bản trùng.' : 'Chưa xác nhận giao hướng dẫn.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không giao được hướng dẫn.'); }
    finally { setBusy(false); }
  }
  return <section className="tw-confirm"><h3>Giao hướng dẫn chăm sóc</h3><label>Mẫu đã xuất bản<select value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setNotice(''); }}><option value="">Chọn hướng dẫn</option>{rows.map(row => <option key={row.id} value={row.id}>{row.title} · v{row.version}</option>)}</select></label>{template && <details open><summary>Xem trước nội dung</summary><p style={{ whiteSpace: 'pre-wrap' }}>{template.content}</p></details>}{error && <p role="alert" className="tw-error">{error}</p>}{notice && <p role="status">{notice}</p>}<button disabled={!template || busy} onClick={assign}>{busy ? 'Đang giao…' : 'Xác nhận giao hướng dẫn'}</button></section>;
}


