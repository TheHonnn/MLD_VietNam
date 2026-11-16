import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Search,
  RotateCcw,
  Plus,
  ExternalLink,
  AlertCircle,
  LoaderCircle,
  X,
  Package,
} from 'lucide-react';
import { adminCommand, Listing, Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import { AdminTabs } from '../components/common';
import { TreatmentConfirmationPreview } from './TreatmentConfirmationPreview';
import { AssignHomeCare } from './HomeCareWorkspace';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { RealtimeTable } from '../services/realtime.service';

const REALTIME_JOURNAL_TABLES: RealtimeTable[] = ['treatment_journal', 'bookings', 'user_packages'];

const statusLabels: Record<string, string> = { DRAFT: 'Bản nháp', SUBMITTED: 'Chờ xác nhận', REVIEW_REQUIRED: 'Chờ duyệt chuyên môn', CONFIRMED: 'Đã xác nhận', REVERSED: 'Đã hoàn tác', PENDING: 'Cần ghi nhận' };
const journalBadgeClass = (value: string) => {
  if (value === 'CONFIRMED') return 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]';
  if (value === 'SUBMITTED') return 'bg-[#F5E9DB] text-[#8A4F23] border border-[#E8DFD8]';
  if (value === 'REVIEW_REQUIRED' || value === 'PENDING') return 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]';
  if (value === 'REVERSED') return 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]';
  return 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]';
};
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
  const navigate = useNavigate();
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
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    let active = true;
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError('');
    readAll('treatment_journal').then(data => { if (active) { hasLoadedOnceRef.current = true; setRows(data); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useRealtimeSync({
    tables: REALTIME_JOURNAL_TABLES,
    debounceMs: 250,
    onDataChange: () => setRevision(v => v + 1),
  });
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
  const draftOrPendingCount = rows.filter(row => ['DRAFT', 'PENDING'].includes(state(row))).length;
  const submittedCount = rows.filter(row => state(row) === 'SUBMITTED').length;
  const reviewRequiredCount = rows.filter(row => state(row) === 'REVIEW_REQUIRED').length;
  const confirmedCount = rows.filter(row => state(row) === 'CONFIRMED').length;
  const abnormalCount = rows.filter(row => row.has_abnormal_reaction).length;
  const reversedCount = rows.filter(row => state(row) === 'REVERSED').length;

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">Nhật ký điều trị</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
              Dữ liệu thực Supabase
            </span>
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">Lưu nháp → gửi hồ sơ → xác nhận buổi. Chỉ buổi đã xác nhận mới được trừ lượt.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#D7BBA6] text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
            to="/treatment-inventory"
          >
            <Package className="w-4 h-4" />
            Đối chiếu vật tư & Kho
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs whitespace-nowrap"
            to="/medical-records"
          >
            <Plus className="w-4 h-4" />
            Chọn ca đang phục vụ để ghi nhận
          </Link>
        </div>
      </div>

      <AdminTabs
        variant="line"
        ariaLabel="Điều hướng phân hệ Quản lý Liệu trình"
        activeTab="treatment_journal"
        onChange={(id) => {
          if (id === 'medical-records') navigate('/medical-records');
          else if (id === 'user_packages') navigate('/manage/user_packages');
          else if (id === 'treatment_journal') navigate('/manage/treatment_journal');
          else if (id === 'home_care_guidelines') navigate('/manage/home_care_guidelines');
        }}
        tabs={[
          { id: 'medical-records', label: '1. Hồ sơ & Phác đồ MLD' },
          { id: 'user_packages', label: '2. Sổ cái Liệu trình khách hàng' },
          { id: 'treatment_journal', label: '3. Nhật ký điều trị & Duyệt buổi', count: rows.length },
          { id: 'home_care_guidelines', label: '4. Hướng dẫn chăm sóc tại nhà' },
        ]}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Tổng quan nhật ký điều trị">
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">Tổng hồ sơ nhật ký</span>
            <FileText className="w-4 h-4 text-[#8A4F23]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{rows.length}</div>
          <div className="text-[11px] text-[#73675F] mt-2">Cần ghi nhận & Bản nháp: <strong className="text-[#2C241E]">{draftOrPendingCount}</strong></div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">Chờ xác nhận / Duyệt</span>
            <Clock className="w-4 h-4 text-[#8A4F23]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{submittedCount + reviewRequiredCount}</div>
          <div className="text-[11px] text-[#73675F] mt-2">
            Chờ xác nhận: <strong className="text-[#8A4F23]">{submittedCount}</strong> · Chờ duyệt: <strong className="text-[#D97706]">{reviewRequiredCount}</strong>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">Đã xác nhận hoàn thành</span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{confirmedCount}</div>
          <div className="text-[11px] text-[#73675F] mt-2">Đã trừ lượt và đồng bộ tiến độ gói</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#73675F]">Phản ứng bất thường / Hoàn tác</span>
            <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[28px] font-extrabold text-[#2C241E] leading-none">{abnormalCount}</span>
            <span className="text-xs font-semibold text-[#DC2626]">phản ứng bất thường</span>
          </div>
          <div className="text-[11px] text-[#73675F] mt-2">Đã hoàn tác: <strong className="text-[#2C241E]">{reversedCount}</strong> ca</div>
        </div>
      </section>

      <nav className="bg-white rounded-2xl border border-[#EFE4D9] p-2 shadow-xs flex flex-wrap items-center gap-1.5" aria-label="Trạng thái nhật ký">
        {[['ALL', 'Tất cả'], ...Object.entries(statusLabels)].map(([key, label]) => {
          const isActive = tab === key;
          const count = rows.filter(row => key === 'ALL' || state(row) === key).length;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setTab(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-[#985018] text-white shadow-xs' : 'text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E]'}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </nav>

      <section className="bg-white rounded-2xl border border-[#EFE4D9] p-3.5 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[230px]">
          <Search className="w-4 h-4 text-[#A08E80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            aria-label="Tìm nhật ký"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tên khách, số điện thoại, mã lịch hoặc chuyên viên…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] placeholder-[#A08E80] focus:outline-none focus:border-[#985018]"
          />
        </div>

        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#2C241E] bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl">
          <span className="text-[#73675F]">Từ ngày</span>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="bg-transparent text-xs text-[#2C241E] focus:outline-none"
          />
        </label>

        <label className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border cursor-pointer select-none transition-colors ${abnormal ? 'bg-[#FEE2E2]/60 border-[#FECACA] text-[#DC2626]' : 'bg-[#FAF8F5] border-[#E8DFD8] text-[#2C241E]'}`}>
          <input type="checkbox" checked={abnormal} onChange={e => setAbnormal(e.target.checked)} className="accent-[#985018]" />
          Có phản ứng bất thường
        </label>

        <button
          type="button"
          onClick={() => setRevision(v => v + 1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#D7BBA6] rounded-xl cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Tải lại
        </button>
      </section>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs font-semibold" role="status">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

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
          <span>Đang tải nhật ký…</span>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-[#EFE4D9] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#EFE4D9] flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#2C241E]">Danh sách nhật ký điều trị</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
              {visible.length} / {rows.length} hồ sơ
            </span>
          </div>

          {visible.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EFE4D9]/70 text-[11px] font-bold uppercase tracking-wider text-[#73675F]">
                    <th className="py-3 px-4 whitespace-nowrap">Khách hàng / Lịch hẹn</th>
                    <th className="py-3 px-4 whitespace-nowrap">Buổi / Ngày</th>
                    <th className="py-3 px-4 whitespace-nowrap">Chuyên viên</th>
                    <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(row => {
                    const rowState = state(row);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => { setSelected(row); setValues({ ...row }); setDialogError(''); setCommand(''); setReason(''); }}
                        className="border-b border-[#EFE4D9] last:border-0 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 align-middle">
                          <div className="font-bold text-xs text-[#2C241E]">{row.customer_name || 'Chưa có tên khách'}</div>
                          <div className="text-[11px] text-[#73675F] tabular-nums">{row.customer_phone || 'Chưa có số điện thoại'}</div>
                          <div className="text-[11px] font-mono text-[#8A4F23] mt-0.5">{row.booking_code || 'Chưa liên kết lịch hẹn'}</div>
                        </td>
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="text-xs font-bold text-[#2C241E]">Buổi {row.session_number}</div>
                          <div className="text-[11px] text-[#73675F] tabular-nums">{new Date(row.session_date).toLocaleDateString('vi-VN')}</div>
                        </td>
                        <td className="py-3.5 px-4 align-middle text-xs text-[#2C241E]">{row.technician_name || 'Chưa phân công'}</td>
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${journalBadgeClass(rowState)}`}>
                              {statusLabels[rowState] || 'Chưa xác định'}
                            </span>
                            {row.has_abnormal_reaction && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                                Có phản ứng bất thường
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelected(row); setValues({ ...row }); setDialogError(''); setCommand(''); setReason(''); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF8F5] hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] cursor-pointer transition-colors"
                          >
                            Mở hồ sơ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-xs text-[#73675F]">
              Không có nhật ký khớp bộ lọc. Nhật ký mới được tạo từ ca phục vụ thực tế.
            </div>
          )}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-title"
            className="tw-dialog tw-journal-dialog bg-white rounded-2xl border border-[#EFE4D9] shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EFE4D9] pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="journal-title" className="text-lg font-extrabold text-[#3E200C]">Nhật ký buổi {selected.session_number}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${journalBadgeClass(state(selected))}`}>
                    {statusLabels[state(selected)]}
                  </span>
                </div>
                <p className="text-xs text-[#73675F] mt-1">
                  {selected.customer_name} · {selected.booking_code || 'Chưa liên kết lịch'} · {new Date(selected.session_date).toLocaleDateString('vi-VN')} · {selected.technician_name || 'Chưa phân công'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(undefined)}
                aria-label="Đóng hộp thoại"
                className="p-1.5 rounded-lg text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selected.user_package_id && (
              <div>
                <Link
                  to={`/manage/user_packages?userPackageId=${selected.user_package_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF0E4] hover:bg-[#F5E9DB] text-[#8A4F23] border border-[#E8DFD8] text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Xem liệu trình liên quan
                </Link>
              </div>
            )}

            <fieldset disabled={!writable || busy} className="space-y-4">
              <legend className="sr-only">Thông tin buổi</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {fields.map(([title, inputs]) => (
                  <section key={title} className="rounded-2xl bg-[#FAF8F5] border border-[#EFE4D9] p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A4F23]">{title}</h3>
                    {inputs.map(([key, label]) => (
                      <label key={key} className="block space-y-1 text-xs">
                        <span className="font-semibold text-[#2C241E]">{label}</span>
                        <textarea
                          rows={2}
                          value={values[key] || ''}
                          onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] disabled:opacity-70"
                        />
                      </label>
                    ))}
                  </section>
                ))}
              </div>
              <label className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#FEF2F2]/60 border border-[#FECACA] text-xs font-semibold text-[#DC2626] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(values.has_abnormal_reaction)}
                  onChange={e => setValues(v => ({ ...v, has_abnormal_reaction: e.target.checked }))}
                  className="accent-[#DC2626]"
                />
                Có phản ứng bất thường, cần duyệt chuyên môn
              </label>
            </fieldset>

            {state(selected) === 'CONFIRMED' && <AssignHomeCare journalId={selected.id} />}

            {command === 'confirm-session' && (
              <TreatmentConfirmationPreview id={selected.id} busy={busy} onConfirm={() => act('confirm-session')} onCancel={() => setCommand('')} />
            )}

            {command === 'reverse' && (
              <div className="tw-confirm rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-3 text-xs">
                <h3 className="text-sm font-extrabold text-[#DC2626]">Hoàn tác buổi đã xác nhận</h3>
                <p className="text-[#73675F]">Hệ thống hoàn tác lượt, vật tư và hoa hồng liên quan. Lịch sử được giữ lại.</p>
                <label className="block space-y-1">
                  <span className="font-semibold text-[#2C241E]">Lý do hoàn tác</span>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#FECACA] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#DC2626]"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || reason.trim().length < 5}
                    onClick={() => act(command)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white cursor-pointer disabled:opacity-50"
                  >
                    Xác nhận thực hiện
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setCommand('')}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E8DFD8] text-[#73675F] cursor-pointer"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}

            {dialogError && (
              <p role="alert" className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2">
                {dialogError}
              </p>
            )}

            <footer className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#EFE4D9]">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelected(undefined)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF8F5] text-[#73675F] border border-[#E8DFD8] cursor-pointer"
              >
                Đóng
              </button>
              {writable && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act('save-draft')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#D7BBA6] cursor-pointer disabled:opacity-50"
                  >
                    Lưu nháp
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#985018] hover:bg-[#854412] text-white cursor-pointer disabled:opacity-50"
                    disabled={busy || !values.condition_before?.trim() || !values.condition_after?.trim() || !values.treatment_notes?.trim()}
                    onClick={() => act('submit-session')}
                  >
                    Gửi xác nhận
                  </button>
                </>
              )}
              {manager && state(selected) === 'REVIEW_REQUIRED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act('approve-clinical')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#208C58] hover:bg-[#197247] text-white cursor-pointer disabled:opacity-50"
                >
                  Duyệt chuyên môn
                </button>
              )}
              {state(selected) === 'SUBMITTED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCommand('confirm-session')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#985018] hover:bg-[#854412] text-white cursor-pointer disabled:opacity-50"
                >
                  Xác nhận buổi
                </button>
              )}
              {manager && state(selected) === 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCommand('reverse')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] cursor-pointer disabled:opacity-50"
                >
                  Hoàn tác buổi
                </button>
              )}
            </footer>
            {busy && <p role="status" className="text-xs font-semibold text-[#8A4F23] text-right">Đang xử lý…</p>}
          </section>
        </div>
      )}
    </div>
  );
}
