import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Booking, Branch } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, CalendarIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import { BookingRows, BookingStatus, bookingDate, bookingDuration } from './BookingInformation';
import { apiClient } from '@/api/client';
import '@/css/appointments.scss';

interface AppointmentsManagerProps {
  bookings: Booking[];
  branches?: Branch[];
  onClose?: () => void;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onUpdateBookings: (bookings: Booking[]) => void;
  onBookNewService: () => void;
  onRebookService?: (serviceId: string) => void;
}
type AppointmentTab = 'upcoming' | 'completed' | 'cancelled' | 'all';
const toInputDate = (date: string) => /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : date.split('/').reverse().join('-');
const todayInVietnam = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
const isFutureSlot = (date: string, time: string) => Date.parse(`${date}T${time.slice(0, 5)}:00+07:00`) > Date.now();

export const AppointmentsManager: React.FC<AppointmentsManagerProps> = ({ bookings, branches = [], loading = false, error, onRefresh, onClose, onUpdateBookings, onBookNewService, onRebookService }) => {
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [dateRange, setDateRange] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(todayInVietnam);
  const [newTime, setNewTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const detailBody = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!detailBody.current) return;
    if (confirmCancel) detailBody.current.scrollTop = detailBody.current.scrollHeight;
    else if (message) detailBody.current.scrollTop = 0;
  }, [confirmCancel, message]);
  const bookingsRef = useRef(bookings);
  const mutationLock = useRef(false);
  bookingsRef.current = bookings;
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [slotsFor, setSlotsFor] = useState('');
  const slotKey = JSON.stringify([selectedBooking?.id, selectedBooking?.branchId, selectedBooking?.serviceId, selectedBooking?.doctorId, newDate, slotsVersion]);
  const slotsReady = slotsFor === slotKey && !slotsLoading && !slotsError;
  const availableTimes = slotsReady ? timeSlots : [];
  useEffect(() => {
    let cancelled = false;
    setTimeSlots([]); setNewTime(''); setSlotsError(''); setSlotsLoading(false); setSlotsFor('');
    if (!rescheduling || !selectedBooking || !newDate || newDate < todayInVietnam()) return;
    setSlotsLoading(true);
    apiClient.getBookingSlots(selectedBooking.id, newDate).then(result => {
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result?.slots || result.error) { setSlotsError(result?.error || 'Không thể tải giờ hẹn.'); return; }
      setTimeSlots(Array.from(new Set<string>(result.slots.filter((slot: { startTime: string }) => isFutureSlot(newDate, slot.startTime)).map((slot: { startTime: string; endTime: string }) => `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`))));
      setSlotsFor(slotKey);
    }).catch(() => { if (!cancelled) { setSlotsLoading(false); setSlotsError('Không thể tải giờ hẹn. Vui lòng thử lại.'); } });
    return () => { cancelled = true; };
  }, [rescheduling, selectedBooking?.id, selectedBooking?.branchId, selectedBooking?.serviceId, selectedBooking?.doctorId, newDate, slotsVersion]);

  const today = todayInVietnam();
  const rangeFrom = dateRange === 'custom' ? fromDate : dateRange === 'all' ? '' : today;
  const rangeTo = dateRange === 'custom' ? toDate : dateRange === 'all' ? '' : addDays(today, dateRange === 'week' ? 6 : 29);
  const invalidRange = Boolean(rangeFrom && rangeTo && rangeFrom > rangeTo);
  const filteredBookings = useMemo(() => bookings.filter(booking => {
    const matchesTab = activeTab === 'all' || (activeTab === 'upcoming' ? !['completed', 'cancelled', 'no_show'].includes(booking.status) && isFutureSlot(toInputDate(booking.date), booking.timeSlot) : booking.status === activeTab);
    const date = toInputDate(booking.date);
    return matchesTab && !invalidRange && (!rangeFrom || date >= rangeFrom) && (!rangeTo || date <= rangeTo)
      && (!branchFilter || booking.branchId === branchFilter) && (!statusFilter || booking.status === statusFilter)
      && (!serviceFilter || booking.serviceId === serviceFilter || booking.items?.some(item => item.serviceId === serviceFilter));
  }).sort((a, b) => `${toInputDate(a.date)} ${a.timeSlot}`.localeCompare(`${toInputDate(b.date)} ${b.timeSlot}`)), [bookings, activeTab, rangeFrom, rangeTo, invalidRange, branchFilter, statusFilter, serviceFilter]);
  const branchOptions = Array.from(new Map(bookings.map(booking => [booking.branchId, booking.branchName || branches.find(branch => branch.id === booking.branchId)?.name || ''])));
  const serviceOptions = Array.from(new Map(bookings.flatMap(booking => booking.items?.length ? booking.items.map(item => [item.serviceId, item.serviceTitle || booking.serviceTitle] as const) : [[booking.serviceId, booking.serviceTitle] as const])));
  const replaceBooking = (updated: Booking) => { onUpdateBookings(bookingsRef.current.map(item => item.id === updated.id ? updated : item)); setSelectedBooking(updated); };
  const openReschedule = () => { if (!selectedBooking) return; const date = toInputDate(selectedBooking.date); setNewDate(date >= today ? date : today); setNewTime(''); setMessage(null); setConfirmCancel(false); setRescheduling(true); };
  const submitReschedule = async () => {
    if (!selectedBooking || mutationLock.current) return;
    if (!newDate || newDate < today || !slotsReady || !availableTimes.includes(newTime) || !isFutureSlot(newDate, newTime)) { setMessage({ type: 'error', text: 'Vui lòng chọn giờ còn trống.' }); return; }
    mutationLock.current = true; setSubmitting(true); setMessage(null);
    try {
      const response = await apiClient.rescheduleBooking(selectedBooking.id, newDate, newTime);
      if (!response?.error && response?.booking?.id === selectedBooking.id) { replaceBooking(response.booking); setMessage({ type: 'success', text: 'Đổi lịch thành công.' }); setRescheduling(false); }
      else { setMessage({ type: 'error', text: response?.error || 'Không thể đổi lịch. Vui lòng thử lại.' }); setSlotsVersion(value => value + 1); }
    } catch { setMessage({ type: 'error', text: 'Không thể đổi lịch. Vui lòng thử lại.' }); }
    finally { mutationLock.current = false; setSubmitting(false); }
  };
  const cancelBooking = async () => {
    if (!selectedBooking || mutationLock.current) return;
    mutationLock.current = true; setSubmitting(true); setMessage(null);
    try {
      const response = await apiClient.cancelBooking(selectedBooking.id, 'Khách hàng hủy trên Mini App');
      if (!response?.error && response?.booking?.id === selectedBooking.id && response.booking.status === 'cancelled') { replaceBooking(response.booking); setConfirmCancel(false); setMessage({ type: 'success', text: 'Lịch hẹn đã được hủy.' }); }
      else setMessage({ type: 'error', text: response?.error || 'Không thể hủy lịch. Vui lòng thử lại.' });
    } catch { setMessage({ type: 'error', text: 'Không thể hủy lịch. Vui lòng thử lại.' }); }
    finally { mutationLock.current = false; setSubmitting(false); }
  };
  const feedback = message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`appointment-feedback is-${message.type}`}>{message.text}</p>;

  if (rescheduling && selectedBooking) return <section className="appointment-screen appointment-reschedule" aria-labelledby="reschedule-heading">
    <header className="appointment-header"><div className="appointment-topbar"><button type="button" title="Quay lại chi tiết lịch hẹn" disabled={submitting} className="appointment-back" onClick={() => setRescheduling(false)}><ArrowLeftIcon size={20} /></button><span>ĐẶT LỊCH</span></div><h1 id="reschedule-heading">Đổi lịch hẹn</h1><p>Chọn thời gian mới phù hợp với bạn.</p></header>
    <main className="appointment-body" tabIndex={0} aria-label="Đổi lịch hẹn"><p className="appointment-notice">{selectedBooking.serviceTitle}<br />Lịch hiện tại: {bookingDate(selectedBooking.date)} · {selectedBooking.timeSlot}</p><label className="appointment-filter">Ngày hẹn mới<input type="date" aria-label="Ngày hẹn mới" disabled={submitting} min={today} value={newDate} onChange={event => { setNewDate(event.target.value); setNewTime(''); setMessage(null); }} /></label>
      {slotsLoading && <p role="status">Đang tải giờ hẹn...</p>}{slotsError && <p role="alert">{slotsError} <button type="button" onClick={() => setSlotsVersion(value => value + 1)}>Thử lại</button></p>}{!slotsLoading && !slotsError && !availableTimes.length && <p></p>}
      <div className="appointment-slot-grid">{availableTimes.map(slot => <button type="button" key={slot} aria-pressed={newTime === slot} disabled={submitting} onClick={() => { setNewTime(slot); setMessage(null); }}>{slot}</button>)}</div>{feedback}
    </main><footer className="appointment-footer"><p>{bookingDate(newDate)} · {newTime || 'Chưa chọn giờ'}</p><button type="button" onClick={submitReschedule} disabled={submitting || !slotsReady || !newTime || !availableTimes.includes(newTime)}>{submitting ? 'Đang kiểm tra lịch...' : 'Xác nhận đổi lịch'}</button></footer>
  </section>;

  if (selectedBooking) {
    const canEdit = ['confirmed', 'pending'].includes(selectedBooking.status);
    const canCancel = canEdit && !['paid', 'partial'].includes(selectedBooking.paymentStatus || '');
    const duration = bookingDuration(selectedBooking);
    return <section className="appointment-screen appointment-detail" aria-labelledby="appointment-detail-heading">
      <header className="appointment-header"><div className="appointment-topbar"><button type="button" title="Quay lại lịch hẹn của tôi" disabled={submitting} className="appointment-back" onClick={() => { setSelectedBooking(null); setMessage(null); setConfirmCancel(false); }}><ArrowLeftIcon size={20} /></button><span>ĐẶT LỊCH</span></div><h1 id="appointment-detail-heading">Chi tiết lịch hẹn</h1></header>
      <main ref={detailBody} className="appointment-body" tabIndex={0} aria-label="Chi tiết lịch hẹn">{!confirmCancel && feedback}<BookingStatus booking={selectedBooking} /><p className="appointment-code">{selectedBooking.code}</p><article className="appointment-card"><EntityImage src={selectedBooking.serviceImage} alt={selectedBooking.serviceTitle} className="appointment-photo" /><h2>{selectedBooking.serviceTitle}</h2>{duration != null && <p className="appointment-duration">Thời lượng chăm sóc <strong>{duration} phút</strong></p>}<BookingRows booking={selectedBooking} branches={branches} />{selectedBooking.notes && <p className="appointment-notes">{selectedBooking.notes}</p>}</article>
        {confirmCancel && <section className="appointment-cancel-confirm"><h2>Bạn chắc chắn muốn hủy lịch này?</h2>{feedback}<div><button type="button" disabled={submitting} onClick={() => setConfirmCancel(false)}>Giữ lịch</button><button type="button" disabled={submitting} onClick={cancelBooking}>{submitting ? 'Đang hủy...' : 'Xác nhận hủy'}</button></div></section>}
      </main><footer className="appointment-footer">{canEdit ? <div className="appointment-detail-actions">{canCancel && <button type="button" className="appointment-cancel-button" disabled={submitting} onClick={() => { setMessage(null); setConfirmCancel(true); }}>Hủy lịch</button>}<button type="button" disabled={submitting} onClick={openReschedule}>Đổi lịch</button></div> : <button type="button" disabled={!selectedBooking.serviceId || !onRebookService} onClick={() => onRebookService?.(selectedBooking.serviceId)}>Đặt lại dịch vụ</button>}</footer>
    </section>;
  }

  return <section className="appointments-list" aria-labelledby="appointments-heading">
    <header className="appointments-filters"><div className="appointment-topbar">{onClose && <button type="button" title="Về trang chủ" className="appointment-back" onClick={onClose}><ArrowLeftIcon size={20} /></button>}<span>ĐẶT LỊCH</span></div><h1 id="appointments-heading">Lịch hẹn của tôi</h1><p className="appointments-subtitle">Quản lý các buổi chăm sóc đã đặt.</p>
      <div className="appointments-tabs" role="group" aria-label="Nhóm lịch hẹn">{([['upcoming', 'Sắp tới'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy'], ['all', 'Tất cả']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => { setActiveTab(id); setStatusFilter(''); }}>{label}</button>)}</div>
      <label className="appointment-filter">Khoảng ngày<select aria-label="Khoảng ngày" value={dateRange} onChange={event => setDateRange(event.target.value)}><option value="all">Tất cả ngày hẹn</option><option value="week">7 ngày tới</option><option value="month">30 ngày tới</option><option value="custom">Chọn khoảng ngày</option></select></label>
      {dateRange === 'custom' && <div className="appointments-date-range"><label className="appointment-filter">Từ ngày<input aria-label="Từ ngày" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label className="appointment-filter">Đến ngày<input aria-label="Đến ngày" type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div>}{invalidRange && <p role="alert" className="appointment-feedback is-error">Ngày kết thúc phải từ ngày bắt đầu.</p>}
      <details className="appointments-filter-menu"><summary>Chi nhánh / Dịch vụ / Trạng thái</summary><div><label className="appointment-filter">Chi nhánh<select aria-label="Lọc chi nhánh lịch hẹn" value={branchFilter} onChange={event => setBranchFilter(event.target.value)}><option value="">Tất cả</option>{branchOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="appointment-filter">Dịch vụ<select aria-label="Lọc dịch vụ lịch hẹn" value={serviceFilter} onChange={event => setServiceFilter(event.target.value)}><option value="">Tất cả</option>{serviceOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="appointment-filter">Trạng thái<select aria-label="Lọc trạng thái lịch hẹn" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tất cả</option>{[['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['checked_in', 'Đã đến'], ['in_service', 'Đang thực hiện'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy'], ['no_show', 'Không đến']].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div></details>
    </header>
    <main className="appointments-results" tabIndex={0} aria-label="Danh sách lịch hẹn">{loading && <p role="status">Đang tải lịch hẹn...</p>}{error && <p role="alert" className="appointment-feedback is-error">{error} <button type="button" onClick={onRefresh}>Thử lại</button></p>}{!loading && !error && !filteredBookings.length && <p className="appointment-empty" role="status"></p>}{filteredBookings.map(booking => <button key={booking.id} type="button" className="appointment-list-card" onClick={() => { setSelectedBooking(booking); setConfirmCancel(false); setMessage(null); }}><EntityImage src={booking.serviceImage} alt={booking.serviceTitle} className="appointment-photo" /><BookingStatus booking={booking} /><h2>{booking.serviceTitle}</h2><div className="appointment-list-row"><span>Ngày hẹn</span><strong>{bookingDate(booking.date)}</strong></div><div className="appointment-list-row"><span>Giờ hẹn</span><strong>{booking.timeSlot}</strong></div><p>{booking.branchName}</p></button>)}<button type="button" className="appointments-new" disabled={loading} onClick={onBookNewService}><CalendarIcon size={18} />Đặt lịch mới</button></main>
  </section>;
};
