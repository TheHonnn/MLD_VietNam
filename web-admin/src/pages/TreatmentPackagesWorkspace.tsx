import { availableTreatmentSessions } from '../services/treatment-display.mjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Leaf,
  Calendar,
  Clock,
  ShieldAlert,
  Search,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  X,
} from 'lucide-react';
import { adminCommand, Listing, Row } from '../admin/api';
import { useAdmin } from '../admin/Auth';
import { AdminTabs } from '../components/common';
import { TreatmentPackageHistory } from './TreatmentPackageHistory';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { RealtimeTable } from '../services/realtime.service';

const REALTIME_PACKAGE_TABLES: RealtimeTable[] = ['bookings', 'user_packages', 'treatment_journal'];

const labels: Record<string, string> = { ACTIVE: 'Đang sử dụng', PAUSED: 'Tạm dừng', COMPLETED: 'Hoàn thành', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền', TRANSFERRED: 'Đã chuyển nhượng' };
const actionLabels: Record<string, string> = { pause: 'Tạm dừng', resume: 'Tiếp tục', extend: 'Gia hạn', cancel: 'Hủy gói', refund: 'Hoàn tiền', transfer: 'Chuyển nhượng' };
const date = (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
const remaining = (row: Row) => Math.max(0, Number(row.total_sessions) - Number(row.completed_sessions));
const expired = (row: Row) => row.expires_at && new Date(row.expires_at).getTime() <= Date.now();
const available = (row: Row) => availableTreatmentSessions(row.status, row.total_sessions, row.completed_sessions, Boolean(expired(row)));

const badgeClass = (row: Row) => {
  const effective = row.status === 'ACTIVE' && expired(row) ? 'EXPIRED' : row.status;
  if (effective === 'COMPLETED') return 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]';
  if (effective === 'ACTIVE') return 'bg-[#F5E9DB] text-[#8A4F23] border border-[#E8DFD8]';
  if (effective === 'PAUSED') return 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]';
  if (effective === 'EXPIRED') return 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]';
  if (effective === 'TRANSFERRED') return 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]';
  return 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]';
};

export function TreatmentPackagesWorkspace() {
  const navigate = useNavigate();
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
  const detailRef = useRef<HTMLDivElement>(null);
  const hasLoadedOnceRef = useRef(false);
  const selected = rows.find(row => row.id === params.get('userPackageId') && (!branch || (row.package_branches || []).some((b: Row) => b.id === branch)));
  useEffect(() => {
    const controller = new AbortController();
    if (!hasLoadedOnceRef.current) setLoading(true);
    setError('');
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
      hasLoadedOnceRef.current = true;
      setRows(collected);
    })().catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  useRealtimeSync({
    tables: REALTIME_PACKAGE_TABLES,
    debounceMs: 250,
    onDataChange: () => setRevision(value => value + 1),
  });
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
  const activeCount = branchRows.filter(row => row.status === 'ACTIVE' && !expired(row)).length;
  const remainingCount = branchRows.filter(row => row.status === 'ACTIVE' && !expired(row)).reduce((sum, row) => sum + available(row), 0);
  const completedCount = branchRows.reduce((sum, row) => sum + Number(row.completed_sessions || 0), 0);
  const upcomingCount = branchRows.filter(row => row.next_booking).length;
  const expiringCount = branchRows.filter(row => row.status === 'ACTIVE' && !expired(row) && row.expires_at && new Date(row.expires_at).getTime() <= Date.now() + 30 * 86400000).length;
  const pausedCount = branchRows.filter(row => row.status === 'PAUSED').length;

  const selectPackage = (id: string) => {
    setParams({ userPackageId: id });
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">Liệu trình khách hàng</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
              Dữ liệu thực Supabase
            </span>
          </div>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">Theo dõi gói đã mua, số buổi còn lại và lịch sử phục vụ.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs whitespace-nowrap"
            to="/cashier-pos?tab=pos&source=package"
          >
            <Plus className="w-4 h-4" />
            Mở thu ngân để bán gói
          </Link>
        </div>
      </div>

      <AdminTabs
        variant="line"
        ariaLabel="Điều hướng phân hệ Quản lý Liệu trình"
        activeTab="user_packages"
        onChange={(id) => {
          if (id === 'medical-records') navigate('/medical-records');
          else if (id === 'user_packages') navigate('/manage/user_packages');
          else if (id === 'treatment_journal') navigate('/manage/treatment_journal');
          else if (id === 'home_care_guidelines') navigate('/manage/home_care_guidelines');
        }}
        tabs={[
          { id: 'medical-records', label: '1. Hồ sơ & Phác đồ MLD' },
          { id: 'user_packages', label: '2. Sổ cái Liệu trình khách hàng', count: rows.length },
          { id: 'treatment_journal', label: '3. Nhật ký điều trị & Duyệt buổi' },
          { id: 'home_care_guidelines', label: '4. Hướng dẫn chăm sóc tại nhà' },
        ]}
      />

      {notice && (
        <div role="status" className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Không tải được liệu trình: {error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRevision(value => value + 1)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#FECACA] text-[#DC2626] hover:bg-[#FEE2E2] font-bold cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div role="status" className="bg-white rounded-2xl border border-[#EFE4D9] p-10 shadow-xs flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#73675F]">
          <LoaderCircle className="w-5 h-5 animate-spin text-[#985018]" />
          <span>Đang tải liệu trình và số buổi từ hệ thống…</span>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Tổng quan liệu trình">
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#73675F]">Gói đang hoạt động</span>
                <Leaf className="w-4 h-4 text-[#8A4F23]" />
              </div>
              <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{activeCount}</div>
              <div className="text-[11px] text-[#73675F] mt-2">
                Tạm dừng: <strong className="text-[#D97706]">{pausedCount}</strong> · Sắp hết hạn: <strong className="text-[#DC2626]">{expiringCount}</strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#73675F]">Buổi còn sử dụng / Đã xác nhận</span>
                <Calendar className="w-4 h-4 text-[#8A4F23]" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-[28px] font-extrabold text-[#2C241E] leading-none">{remainingCount}</span>
                <span className="text-xs font-semibold text-[#73675F]">/ {completedCount} đã xác nhận</span>
              </div>
              <div className="text-[11px] text-[#73675F] mt-2">Buổi khả dụng được tính từ các gói đang sử dụng.</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#73675F]">Lịch hẹn sắp tới</span>
                <Clock className="w-4 h-4 text-[#8A4F23]" />
              </div>
              <div className="text-[28px] font-extrabold text-[#2C241E] leading-none mt-2">{upcomingCount}</div>
              <div className="text-[11px] text-[#73675F] mt-2">Gói đã đặt lịch phục vụ tiếp theo</div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#73675F]">Gói sắp hết hạn / Tạm dừng</span>
                <ShieldAlert className="w-4 h-4 text-[#8A4F23]" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-[28px] font-extrabold text-[#2C241E] leading-none">{expiringCount}</span>
                <span className="text-xs font-semibold text-[#DC2626]">sắp hết hạn</span>
              </div>
              <div className="text-[11px] text-[#73675F] mt-2">
                Gói tạm dừng: <strong className="text-[#2C241E]">{pausedCount}</strong> · Tổng gói: <strong className="text-[#2C241E]">{branchRows.length}</strong>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-[#EFE4D9] p-3.5 shadow-xs flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[230px]">
              <Search className="w-4 h-4 text-[#A08E80] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                aria-label="Tìm liệu trình"
                placeholder="Tìm tên khách, số điện thoại, tên gói hoặc mã liệu trình…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] placeholder-[#A08E80] focus:outline-none focus:border-[#985018]"
              />
            </div>

            <select
              aria-label="Chi nhánh"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
            >
              <option value="">Tất cả chi nhánh được phép</option>
              {branchOptions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>

            <select
              aria-label="Loại gói"
              value={packageType}
              onChange={e => setPackageType(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
            >
              <option value="">Tất cả loại gói</option>
              {packageOptions.map(([id, name]) => <option key={id} value={id}>{name || 'Chưa có tên gói'}</option>)}
            </select>

            <select
              aria-label="Trạng thái"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>

            <label className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border cursor-pointer select-none transition-colors ${expiry ? 'bg-[#FAF0E4] border-[#985018]/40 text-[#8A4F23]' : 'bg-[#FAF8F5] border-[#E8DFD8] text-[#2C241E]'}`}>
              <input type="checkbox" checked={expiry} onChange={e => setExpiry(e.target.checked)} className="accent-[#985018]" />
              Hết hạn trong 30 ngày
            </label>

            <label className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border cursor-pointer select-none transition-colors ${withoutBooking ? 'bg-[#FAF0E4] border-[#985018]/40 text-[#8A4F23]' : 'bg-[#FAF8F5] border-[#E8DFD8] text-[#2C241E]'}`}>
              <input type="checkbox" checked={withoutBooking} onChange={e => setWithoutBooking(e.target.checked)} className="accent-[#985018]" />
              Chưa có lịch tiếp theo
            </label>

            <button
              type="button"
              onClick={() => setRevision(value => value + 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#D7BBA6] rounded-xl cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tải lại
            </button>
          </section>

          <section className="bg-white rounded-2xl border border-[#EFE4D9] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#EFE4D9] flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-[#2C241E]">Danh sách liệu trình</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                {filtered.length} / {rows.length} gói
              </span>
            </div>

            {filtered.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#EFE4D9]/70 text-[11px] font-bold uppercase tracking-wider text-[#73675F]">
                      <th className="py-3 px-4 whitespace-nowrap">Khách hàng / Gói</th>
                      <th className="py-3 px-4 whitespace-nowrap">Tiến độ</th>
                      <th className="py-3 px-4 whitespace-nowrap">Hết hạn</th>
                      <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(row => {
                      const totalSessions = Math.max(1, Number(row.total_sessions || 1));
                      const pct = Math.min(100, Math.round((Number(row.completed_sessions || 0) / totalSessions) * 100));
                      const isRowSelected = selected?.id === row.id;
                      return (
                        <tr
                          key={row.id}
                          aria-selected={isRowSelected}
                          onClick={() => selectPackage(row.id)}
                          className={`border-b border-[#EFE4D9] last:border-0 transition-colors cursor-pointer ${isRowSelected ? 'bg-[#FAF0E4]/75' : 'hover:bg-[#FAF8F5]'}`}
                        >
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-bold text-xs text-[#2C241E]">{row.customer_name || 'Chưa có tên khách hàng'}</div>
                            <div className="text-[11px] text-[#73675F] tabular-nums">{row.customer_phone || 'Chưa có số điện thoại'}</div>
                            <div className="text-xs font-semibold text-[#3E200C] mt-1">{row.package_name || 'Chưa xác định tên gói'}</div>
                            <div className="text-[11px] text-[#73675F] mt-0.5">
                              {(row.package_branches || []).map((b: Row) => b.name).join(', ') || 'Chưa xác định chi nhánh'}
                              {' · '}
                              {row.next_booking ? `Lịch tiếp: ${date(row.next_booking.date)} · ${String(row.next_booking.time).slice(0, 5)}` : 'Chưa có lịch tiếp theo'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <div className="text-xs font-bold text-[#2C241E] tabular-nums">{row.completed_sessions} / {row.total_sessions} buổi</div>
                            <div className="text-[11px] text-[#73675F]">Có thể sử dụng {available(row)} buổi</div>
                            <div className="w-28 h-1.5 bg-[#EFE4D9] rounded-full overflow-hidden mt-1.5">
                              <div className="h-full bg-[#985018] rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 align-middle text-xs text-[#2C241E] tabular-nums whitespace-nowrap">{date(row.expires_at)}</td>
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass(row)}`}>
                              {row.status === 'ACTIVE' && expired(row) ? labels.EXPIRED : labels[row.status] || row.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); selectPackage(row.id); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF8F5] hover:bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8] cursor-pointer transition-colors"
                            >
                              Xem gói
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
                {rows.length ? 'Không có liệu trình khớp bộ lọc.' : 'Chưa có liệu trình. Gói được kích hoạt sau khi thanh toán tại thu ngân.'}
              </div>
            )}

            <nav className="px-5 py-3 border-t border-[#EFE4D9] flex items-center justify-between gap-3 text-xs text-[#73675F]" aria-label="Phân trang">
              <span>Hiển thị {filtered.length ? `${(Math.min(page, pageCount) - 1) * 20 + 1} - ${Math.min(Math.min(page, pageCount) * 20, filtered.length)}` : '0'} / {filtered.length} gói liệu trình</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-white hover:bg-[#FAF8F5] text-[#2C241E] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Trước
                </button>
                <span className="px-2.5 py-1 rounded-lg bg-[#FAF0E4] text-[#8A4F23] font-bold">
                  Trang {Math.min(page, pageCount)} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage(p => p + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E8DFD8] bg-white hover:bg-[#FAF8F5] text-[#2C241E] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Sau
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          </section>

          <div ref={detailRef} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {selected ? (
              <>
                <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass(selected)}`}>
                        {selected.status === 'ACTIVE' && expired(selected) ? labels.EXPIRED : labels[selected.status] || selected.status}
                      </span>
                      <h2 className="text-base font-extrabold text-[#3E200C] mt-2">{selected.package_name || 'Chi tiết liệu trình'}</h2>
                      <h3 className="text-xs font-bold text-[#2C241E] mt-1">{selected.customer_name || 'Chưa có tên khách hàng'}</h3>
                      <p className="text-xs text-[#73675F] tabular-nums">{selected.customer_phone || 'Chưa có số điện thoại'}</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3 col-span-2">
                      <dt className="text-[11px] text-[#73675F]">Mã liệu trình</dt>
                      <dd className="font-mono font-bold text-[#2C241E] mt-0.5 break-all">{selected.id}</dd>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3">
                      <dt className="text-[11px] text-[#73675F]">Ngày mua</dt>
                      <dd className="font-bold text-[#2C241E] mt-0.5">{date(selected.purchased_at)}</dd>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3">
                      <dt className="text-[11px] text-[#73675F]">Ngày hết hạn</dt>
                      <dd className="font-bold text-[#2C241E] mt-0.5">{date(selected.expires_at)}</dd>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3">
                      <dt className="text-[11px] text-[#73675F]">Đã xác nhận</dt>
                      <dd className="font-bold text-[#2C241E] mt-0.5">{selected.completed_sessions} / {selected.total_sessions} buổi</dd>
                    </div>
                    <div className="rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3">
                      <dt className="text-[11px] text-[#73675F]">Buổi có thể sử dụng</dt>
                      <dd className="font-extrabold text-[#985018] mt-0.5">{available(selected)} buổi</dd>
                    </div>
                  </dl>

                  <p className="text-[11px] text-[#73675F] bg-[#FAF8F5] border border-[#EFE4D9] rounded-xl px-3 py-2">
                    Chỉ buổi đã được xác nhận mới được tính vào tiến độ.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold transition-colors"
                      to={`/medical-records?userPackageId=${selected.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Mở hồ sơ và lịch sử buổi
                    </Link>

                    {selected.status === 'ACTIVE' && !expired(selected) && remaining(selected) > 0 && (
                      <Link
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#208C58] hover:bg-[#197247] text-white text-xs font-bold transition-colors"
                        to={`/medical-records?userPackageId=${selected.id}&action=book-first-session`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Đặt buổi tiếp theo
                      </Link>
                    )}

                    {actions.map(value => {
                      const danger = value === 'cancel' || value === 'refund';
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { setAction(value); setReason(''); setActionError(''); setAmount(''); setRecipient(''); setRecipients([]); setRecipientSearch(''); }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${danger ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]' : 'bg-white hover:bg-[#FAF0E4] text-[#8A4F23] border-[#D7BBA6]'}`}
                        >
                          {actionLabels[value]}
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <section className="lg:col-span-7 bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-4">
                  <div className="border-b border-[#EFE4D9] pb-3">
                    <h2 className="text-sm font-bold text-[#2C241E]">Lịch sử buổi chăm sóc & Timeline vận hành</h2>
                    <p className="text-[11px] text-[#73675F] mt-0.5">Đồng bộ hóa đơn kích hoạt, lịch hẹn và nhật ký thao tác gói.</p>
                  </div>
                  <TreatmentPackageHistory id={selected.id} revision={revision} />
                </section>
              </>
            ) : (
              <div className="lg:col-span-12 bg-white rounded-2xl border border-[#EFE4D9] p-8 shadow-xs text-center text-xs text-[#73675F]">
                Chọn một liệu trình để xem tiến độ và thao tác.
              </div>
            )}
          </div>
        </>
      )}

      {action && selected && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tw-action-title"
            className="tw-dialog bg-white rounded-2xl border border-[#EFE4D9] shadow-xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-6"
          >
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="tw-action-title" className="text-lg font-extrabold text-[#3E200C]">{actionLabels[action]}</h2>
                  <p className="text-xs text-[#73675F] mt-0.5">{selected.customer_name} · {selected.package_name}</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setAction('')}
                  aria-label="Đóng hộp thoại"
                  className="p-1.5 rounded-lg text-[#73675F] hover:bg-[#FAF8F5] hover:text-[#2C241E] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {action === 'refund' && (
                <p className="text-xs text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3">
                  Thao tác ghi nhận hoàn tiền gói. Kiểm tra số tiền và điều kiện trước khi xác nhận.
                </p>
              )}
              {action === 'cancel' && (
                <p className="text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3">
                  Gói sẽ ngừng sử dụng. Lịch sử các buổi được giữ lại.
                </p>
              )}

              <label className="block space-y-1.5 text-xs">
                <span className="font-semibold text-[#2C241E]">Lý do thực hiện</span>
                <textarea
                  required
                  minLength={5}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </label>

              {action === 'extend' && (
                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold text-[#2C241E]">Số tháng gia hạn</span>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={months}
                    onChange={e => setMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </label>
              )}

              {action === 'refund' && (
                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold text-[#2C241E]">Số tiền hoàn (đ)</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </label>
              )}

              {action === 'transfer' && (
                <div className="space-y-3 rounded-xl bg-[#FAF8F5] border border-[#EFE4D9] p-3.5">
                  <p className="text-xs text-[#73675F]">
                    Chuyển <strong className="text-[#2C241E]">{remaining(selected)} buổi</strong> còn lại cho khách nhận. Gói hiện tại sẽ được lưu ở trạng thái đã chuyển nhượng.
                  </p>
                  <label className="block space-y-1.5 text-xs">
                    <span className="font-semibold text-[#2C241E]">Tìm khách nhận</span>
                    <input
                      value={recipientSearch}
                      onChange={e => setRecipientSearch(e.target.value)}
                      placeholder="Tên hoặc số điện thoại"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs">
                    <span className="font-semibold text-[#2C241E]">Khách nhận</span>
                    <select
                      required
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    >
                      <option value="">Chọn khách nhận</option>
                      {recipients.map(row => <option key={row.id} value={row.id}>{row.full_name} · {row.phone || row.email}</option>)}
                    </select>
                  </label>
                </div>
              )}

              {actionError && (
                <p role="alert" className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2">
                  {actionError}
                </p>
              )}

              <footer className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFE4D9]">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setAction('')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF8F5] text-[#73675F] border border-[#E8DFD8] cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#985018] hover:bg-[#854412] text-white transition-colors cursor-pointer disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Đang xử lý…' : 'Xác nhận'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}




