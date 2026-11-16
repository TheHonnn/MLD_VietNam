import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  Plus,
  AlertCircle,
  LoaderCircle,
  Eye,
  Edit3,
  X,
} from 'lucide-react';
import { adminCommand, Listing, Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import { AdminTabs } from '../components/common';

const deliveryBadgeClass = (tab: string, row: Row) => {
  if (tab === 'templates') {
    return row.is_published
      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
      : 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]';
  }
  const status = String(row.status);
  if (status === 'SENT') return 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]';
  if (status === 'FAILED') return 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]';
  return 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]';
};

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
  const navigate = useNavigate();
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
  const doneCount = rows.filter(row => tab === 'templates' ? Boolean(row.is_published) : row.status === 'SENT').length;
  const pendingOrDraftCount = rows.length - doneCount;

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">Hướng dẫn chăm sóc tại nhà</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
              Dữ liệu thực Supabase
            </span>
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">Quản lý mẫu hướng dẫn và theo dõi nội dung đã giao theo từng buổi.</p>
        </div>
        {tab === 'templates' && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => edit()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Soạn mẫu hướng dẫn
            </button>
          </div>
        )}
      </div>

      <AdminTabs
        variant="line"
        ariaLabel="Điều hướng phân hệ Quản lý Liệu trình"
        activeTab="home_care_guidelines"
        onChange={(id) => {
          if (id === 'medical-records') navigate('/medical-records');
          else if (id === 'user_packages') navigate('/manage/user_packages');
          else if (id === 'treatment_journal') navigate('/manage/treatment_journal');
          else if (id === 'home_care_guidelines') navigate('/manage/home_care_guidelines');
        }}
        tabs={[
          { id: 'medical-records', label: '1. Hồ sơ & Phác đồ MLD' },
          { id: 'user_packages', label: '2. Sổ cái Liệu trình khách hàng' },
          { id: 'treatment_journal', label: '3. Nhật ký điều trị & Duyệt buổi' },
          { id: 'home_care_guidelines', label: '4. Hướng dẫn chăm sóc tại nhà', count: rows.length },
        ]}
      />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" aria-label="Tổng quan hướng dẫn chăm sóc">
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">
              {tab === 'templates' ? 'Tổng mẫu hướng dẫn' : tab === 'deliveries' ? 'Tổng lượt đã giao' : 'Tổng hàng đợi lời dặn'}
            </span>
            <BookOpen className="w-4 h-4 text-[#8A4F23]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{rows.length}</div>
          <div className="text-[11px] text-[#73675F] mt-2">Đồng bộ phiên bản & lịch sử gửi cho khách hàng</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">
              {tab === 'templates' ? 'Đã xuất bản' : 'Đã gửi thành công'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{doneCount}</div>
          <div className="text-[11px] text-[#73675F] mt-2">
            {tab === 'templates' ? 'Sẵn sàng chọn khi kết thúc buổi điều trị' : 'Khách đã nhận thông báo trên ứng dụng'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">
              {tab === 'templates' ? 'Bản nháp / Gỡ xuất bản' : 'Chưa gửi / Lỗi'}
            </span>
            <Clock className="w-4 h-4 text-[#8A4F23]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{pendingOrDraftCount}</div>
          <div className="text-[11px] text-[#73675F] mt-2">Cần hoàn thiện hoặc theo dõi trạng thái xử lý</div>
        </div>
      </section>

      <nav className="bg-white rounded-2xl border border-[#EFE4D9] p-2 shadow-xs flex flex-wrap items-center gap-1.5">
        {[
          ['templates', 'Mẫu hướng dẫn'],
          ['deliveries', 'Đã giao trong ứng dụng'],
          ['queue', 'Hàng đợi lời dặn'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => { setTab(key); setPublished(''); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${tab === key ? 'bg-[#985018] text-white shadow-xs' : 'text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E]'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="bg-white rounded-2xl border border-[#EFE4D9] p-3.5 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[230px]">
          <Search className="w-4 h-4 text-[#A08E80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            aria-label="Tìm hướng dẫn"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tiêu đề, chuyên mục hoặc tên khách…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] placeholder-[#A08E80] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {tab === 'templates' && (
          <select
            aria-label="Xuất bản"
            value={published}
            onChange={e => setPublished(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đã xuất bản</option>
            <option value="false">Bản nháp / Đã gỡ xuất bản</option>
          </select>
        )}

        <button
          type="button"
          onClick={() => setRevision(v => v + 1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#D7BBA6] rounded-xl cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Tải lại
        </button>
      </section>

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRevision(v => v + 1)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#FECACA] text-[#DC2626] hover:bg-[#FEE2E2] font-bold cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div role="status" className="bg-white rounded-2xl border border-[#EFE4D9] p-10 shadow-xs flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#73675F]">
          <LoaderCircle className="w-5 h-5 animate-spin text-[#985018]" />
          <span>Đang tải hướng dẫn…</span>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-[#EFE4D9] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EFE4D9] flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#2C241E]">
              {tab === 'templates' ? 'Thư viện mẫu hướng dẫn' : tab === 'deliveries' ? 'Nhật ký đã giao cho khách' : 'Hàng đợi gửi lời dặn'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
              {filtered.length} / {rows.length} mục
            </span>
          </div>

          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EFE4D9]/70 text-[11px] font-bold uppercase tracking-wider text-[#73675F]">
                    <th className="py-3 px-4 whitespace-nowrap">{tab === 'templates' ? 'Tiêu đề / Chuyên mục' : 'Khách hàng / Hướng dẫn'}</th>
                    <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                    <th className="py-3 px-4 whitespace-nowrap">Phiên bản / Thời gian</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id} className="border-b border-[#EFE4D9] last:border-0 hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-bold text-xs text-[#2C241E]">
                          {tab === 'templates' ? row.title : row.customer_name || 'Chưa có tên khách'}
                        </div>
                        <div className="text-[11px] text-[#73675F] mt-0.5">
                          {tab === 'templates' ? row.category : row.content_snapshot?.title || 'Lời dặn ghi nhận theo buổi'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${deliveryBadgeClass(tab, row)}`}>
                          {tab === 'templates'
                            ? row.is_published
                              ? 'Đã xuất bản'
                              : 'Bản nháp / Đã gỡ xuất bản'
                            : { PENDING: 'Đã xếp hàng, chưa gửi', SENT: 'Đã gửi', FAILED: 'Gửi thất bại' }[String(row.status)] || row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="text-xs font-semibold text-[#3E200C]">
                          {tab === 'templates' ? `Phiên bản ${row.version}` : `Phiên bản ${row.guideline_version || '—'}`}
                        </div>
                        <div className="text-[11px] text-[#73675F] tabular-nums">
                          {new Date(row.updated_at || row.sent_at || row.created_at).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetail(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF8F5] hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem nội dung
                          </button>
                          {tab === 'templates' && (
                            <button
                              type="button"
                              onClick={() => edit(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#D7BBA6] cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Chỉnh sửa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-10 text-center text-xs text-[#73675F]">Chưa có nội dung phù hợp.</p>
          )}
        </section>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <section
            className="tw-dialog tw-journal-dialog tw-care-dialog bg-white rounded-2xl border border-[#EFE4D9] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-edit-title"
          >
            <form onSubmit={save} className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-[#EFE4D9] pb-3.5">
                <div>
                  <h2 id="care-edit-title" className="text-lg font-extrabold text-[#3E200C]">
                    {editing.id ? 'Cập nhật mẫu hướng dẫn' : 'Soạn mẫu hướng dẫn'}
                  </h2>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Nội dung đã giao cho khách được giữ nguyên. Bản chỉnh sửa được lưu thành phiên bản mới.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(undefined)}
                  aria-label="Đóng hộp thoại"
                  className="p-1.5 rounded-lg text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['title', 'Tiêu đề'],
                  ['category', 'Chuyên mục'],
                  ['summary', 'Tóm tắt'],
                  ['content', 'Nội dung, điều cần tránh và dấu hiệu cần liên hệ'],
                  ['image_url', 'Đường dẫn hình ảnh'],
                  ['author_name', 'Tác giả'],
                ].map(([key, label]) => {
                  const fullSpan = ['summary', 'content'].includes(key);
                  return (
                    <label key={key} className={`block space-y-1 text-xs ${fullSpan ? 'md:col-span-2' : ''}`}>
                      <span className="font-semibold text-[#2C241E]">{label}</span>
                      {fullSpan ? (
                        <textarea
                          required
                          rows={key === 'content' ? 4 : 2}
                          value={editing[key]}
                          onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                        />
                      ) : (
                        <input
                          required
                          type={key === 'image_url' ? 'url' : 'text'}
                          value={editing[key]}
                          onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                        />
                      )}
                    </label>
                  );
                })}

                <label className="block space-y-1 text-xs md:col-span-2">
                  <span className="font-semibold text-[#2C241E]">Dịch vụ áp dụng</span>
                  <select
                    value={editing.service_id || ''}
                    onChange={e => setEditing({ ...editing, service_id: e.target.value || null })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="">Dùng chung cho các dịch vụ</option>
                    {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>
                </label>

                <label className="block space-y-1 text-xs md:col-span-2">
                  <span className="font-semibold text-[#2C241E]">Các bước thực hiện (mỗi dòng một bước)</span>
                  <textarea
                    rows={3}
                    value={steps}
                    onChange={e => setSteps(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </label>
              </div>

              {canPublish && (
                <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8DFD8] text-xs font-semibold text-[#2C241E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_published}
                    onChange={e => setEditing({ ...editing, is_published: e.target.checked })}
                    className="accent-[#985018]"
                  />
                  Xuất bản phiên bản này
                </label>
              )}

              {formError && (
                <p role="alert" className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              <footer className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(undefined)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF8F5] text-[#73675F] border border-[#E8DFD8] cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#985018] hover:bg-[#854412] text-white cursor-pointer disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu…' : 'Lưu phiên bản'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <section
            className="tw-dialog tw-journal-dialog tw-care-dialog bg-white rounded-2xl border border-[#EFE4D9] shadow-xl w-full max-w-xl max-h-[88vh] overflow-y-auto p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-detail-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EFE4D9] pb-3">
              <h2 id="care-detail-title" className="text-lg font-extrabold text-[#3E200C]">
                {detail.title || detail.content_snapshot?.title || 'Nội dung chăm sóc đã giao'}
              </h2>
              <button
                type="button"
                onClick={() => setDetail(undefined)}
                aria-label="Đóng hộp thoại"
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-4 text-xs text-[#2C241E] whitespace-pre-wrap leading-relaxed">
              {detail.content_snapshot?.content || detail.content}
            </div>

            {Array.isArray(detail.steps) && detail.steps.length > 0 && (
              <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-4 space-y-1.5 text-xs text-[#2C241E]">
                {detail.steps.map((step: unknown, index: number) => (
                  <p key={index}>
                    <strong className="text-[#8A4F23]">{index + 1}.</strong> {typeof step === 'string' ? step : JSON.stringify(step)}
                  </p>
                ))}
              </div>
            )}

            {detail.error_message && (
              <p role="alert" className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2">
                {detail.error_message}
              </p>
            )}

            <div className="flex justify-end pt-2 border-t border-[#EFE4D9]">
              <button
                type="button"
                onClick={() => setDetail(undefined)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF8F5] text-[#73675F] border border-[#E8DFD8] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
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
  return (
    <section className="tw-confirm rounded-2xl bg-[#FAF8F5] border border-[#E8DFD8] p-4 space-y-3 text-xs">
      <h3 className="text-sm font-extrabold text-[#3E200C]">Giao hướng dẫn chăm sóc</h3>
      <label className="block space-y-1.5">
        <span className="font-semibold text-[#2C241E]">Mẫu đã xuất bản</span>
        <select
          value={selected}
          disabled={busy}
          onChange={e => { setSelected(e.target.value); setNotice(''); }}
          className="w-full px-3 py-2 text-xs bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
        >
          <option value="">Chọn hướng dẫn</option>
          {rows.map(row => <option key={row.id} value={row.id}>{row.title} · v{row.version}</option>)}
        </select>
      </label>
      {template && (
        <details open className="rounded-xl bg-white border border-[#EFE4D9] p-3 space-y-1.5">
          <summary className="cursor-pointer font-semibold text-[#8A4F23]">Xem trước nội dung</summary>
          <p className="text-[#2C241E] whitespace-pre-wrap leading-relaxed pt-1">{template.content}</p>
        </details>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2">{error}</p>}
      {notice && <p role="status" className="text-xs font-semibold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-3 py-2">{notice}</p>}
      <button
        type="button"
        disabled={!template || busy}
        onClick={assign}
        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#208C58] hover:bg-[#197247] text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Đang giao…' : 'Xác nhận giao hướng dẫn'}
      </button>
    </section>
  );
}


