import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Booking } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, LocationIcon } from '@/components/Icons';
import { apiClient } from '@/api/client';

interface AppointmentsManagerProps {
  bookings: Booking[];
  onUpdateBookings: (bookings: Booking[]) => void;
  onBookNewService: () => void;
  onRebookService?: (serviceId: string) => void;
}

type AppointmentTab = 'upcoming' | 'completed' | 'cancelled';
const toInputDate = (date: string) => {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const [day, month, year] = date.split('/');
  return year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
};
const toApiDate = (date: string) => {
  return date;
};
const todayInVietnam = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
const isFutureSlot = (date: string, startTime: string) =>
  Date.parse(`${date}T${startTime.slice(0, 5)}:00+07:00`) > Date.now();

export const AppointmentsManager: React.FC<AppointmentsManagerProps> = ({
  bookings, onUpdateBookings, onBookNewService, onRebookService,
}) => {
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(todayInVietnam);
  const [newTime, setNewTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [slotsVersion, setSlotsVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setTimeSlots([]);
    setNewTime('');
    setSlotsError('');
    setSlotsLoading(false);
    if (!rescheduling || !selectedBooking || !newDate || newDate < todayInVietnam()) return;
    setSlotsLoading(true);
    apiClient.getSlots(selectedBooking.branchId, newDate, selectedBooking.serviceId, selectedBooking.doctorId || undefined).then(result => {
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result?.slots || result.error) { setSlotsError(result?.error || 'Không thể tải giờ hẹn.'); return; }
      setTimeSlots(Array.from(new Set<string>(result.slots
        .filter((slot: { startTime: string }) => isFutureSlot(newDate, slot.startTime))
        .map((slot: { startTime: string; endTime: string }) => slot.startTime.slice(0, 5) + ' - ' + slot.endTime.slice(0, 5)))));
    }).catch(() => {
      if (cancelled) return;
      setSlotsLoading(false);
      setSlotsError('Không thể tải giờ hẹn. Vui lòng thử lại.');
    });
    return () => { cancelled = true; };
  }, [rescheduling, selectedBooking?.id, newDate, slotsVersion]);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    if (activeTab === 'upcoming') return !['completed', 'cancelled', 'no_show'].includes(booking.status);
    if (activeTab === 'completed') return booking.status === 'completed';
    return booking.status === 'cancelled';
  }), [bookings, activeTab]);

  const replaceBooking = (updated: Booking) => {
    onUpdateBookings(bookingsRef.current.map((item) => item.id === updated.id ? updated : item));
    setSelectedBooking(updated);
  };

  const openReschedule = () => {
    if (!selectedBooking) return;
    const current = toInputDate(selectedBooking.date);
    setNewDate(current >= todayInVietnam() ? current : todayInVietnam());
    setNewTime('');
    setMessage(null);
    setConfirmCancel(false);
    setRescheduling(true);
  };

  const submitReschedule = async () => {
    if (!selectedBooking || submitting) return;
    if (!newDate || newDate < todayInVietnam()) { setMessage({ type: 'error', text: 'Vui lòng chọn ngày từ hôm nay.' }); return; }
    if (slotsLoading || slotsError || !newTime || !timeSlots.includes(newTime) || !isFutureSlot(newDate, newTime)) { setMessage({ type: 'error', text: 'Vui lòng chọn giờ còn trống.' }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await apiClient.rescheduleBooking(selectedBooking.id, toApiDate(newDate), newTime);
      if (!response?.error && response?.booking?.id === selectedBooking.id) {
        replaceBooking(response.booking);
        setMessage({ type: 'success', text: 'Đổi lịch thành công.' });
        setRescheduling(false);
        return;
      }
      setMessage({ type: 'error', text: response?.error || 'Không thể đổi lịch. Vui lòng thử lại.' });
      setSlotsVersion(value => value + 1);
    } catch {
      setMessage({ type: 'error', text: 'Không thể đổi lịch. Vui lòng thử lại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = async () => {
    if (!selectedBooking || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await apiClient.cancelBooking(selectedBooking.id, 'Khách hàng hủy trên Mini App');
      if (!response?.error && response?.booking?.id === selectedBooking.id && response.booking.status === 'cancelled') {
        replaceBooking(response.booking);
        setConfirmCancel(false);
        setMessage({ type: 'success', text: 'Lịch hẹn đã được hủy.' });
        return;
      }
      setMessage({ type: 'error', text: response?.error || 'Không thể hủy lịch. Vui lòng thử lại.' });
    } catch {
      setMessage({ type: 'error', text: 'Không thể hủy lịch. Vui lòng thử lại.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (rescheduling && selectedBooking) {
    return <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F]">
      <header className="shrink-0 px-4 pb-3 pt-4">
        <button disabled={submitting} onClick={() => setRescheduling(false)} className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button>
        <h1 className="text-[21px] font-bold text-[#6F452C]">Đổi lịch hẹn</h1>
        <p className="mt-1 text-[10px] text-[#6F625B]">Chọn thời gian mới phù hợp với bạn.</p>
      </header>
      <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-28">
        <section className="rounded-[10px] border border-[#DED2C5] bg-white p-3">
          <p className="text-[9px] font-bold text-[#A65317]">{selectedBooking.code}</p>
          <h2 className="mt-1 text-[13px] font-bold">{selectedBooking.serviceTitle}</h2>
          <p className="mt-1 text-[10px] text-[#6F625B]">{selectedBooking.doctorName} · {selectedBooking.branchName}</p>
          <p className="mt-2 text-[10px]">Lịch hiện tại: <strong>{selectedBooking.date} · {selectedBooking.timeSlot}</strong></p>
        </section>
        <label className="block text-[10px] font-semibold"><span className="mb-1.5 block">Ngày hẹn mới</span><input type="date" disabled={submitting} min={todayInVietnam()} value={newDate} onChange={(event) => { setNewDate(event.target.value); setNewTime(''); setTimeSlots([]); setMessage(null); }} className="h-11 w-full rounded-[8px] border border-[#DED2C5] bg-white px-3 text-[12px] outline-none focus:border-[#A65317]" /></label>
        {slotsLoading && <p role="status" className="text-xs">Đang tải giờ hẹn...</p>}
        {slotsError && <p role="alert" className="text-xs text-red-700">{slotsError} <button onClick={() => setSlotsVersion(value => value + 1)}>Thử lại</button></p>}
        {!slotsLoading && !slotsError && !timeSlots.length && <p className="text-xs">Chưa có giờ còn trống.</p>}
        <section><h3 className="mb-2 text-[10px] font-semibold">Khung giờ mới</h3><div className="grid grid-cols-2 gap-2">{timeSlots.map((slot) => <button key={slot} disabled={submitting} onClick={() => { setNewTime(slot); setMessage(null); }} className={`h-10 rounded-[8px] border text-[10px] font-semibold ${newTime === slot ? 'border-[#A65317] bg-[#A65317] text-white' : 'border-[#DED2C5] bg-white'}`}>{slot}</button>)}</div></section>
        {message?.type === 'error' && <div role="alert" className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-[10px] font-semibold text-red-700">{message.text}</div>}
      </main>
      <footer className="absolute bottom-0 left-0 right-0 border-t border-[#DED2C5] bg-white px-4 py-3"><p className="mb-2 text-[9px] text-[#6F625B]">{toApiDate(newDate)} · {newTime}</p><button onClick={submitReschedule} disabled={submitting || slotsLoading || !!slotsError || !newTime || !timeSlots.includes(newTime)} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[12px] font-bold text-white disabled:opacity-60">{submitting ? 'Đang kiểm tra lịch...' : 'Xác nhận đổi lịch'}</button></footer>
    </div>;
  }

  if (selectedBooking) {
    const canEdit = selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending';
    return <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F]">
      <header className="shrink-0 px-4 pb-3 pt-4"><button disabled={submitting} onClick={() => { setSelectedBooking(null); setMessage(null); setConfirmCancel(false); }} className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button><h1 className="text-[21px] font-bold text-[#6F452C]">Chi tiết lịch hẹn</h1></header>
      <main className="flex-1 space-y-3 overflow-y-auto px-4 pb-28">
        {message && <div role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-[8px] border p-3 text-[10px] font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}
        <span className={`inline-flex rounded-[7px] px-3 py-1.5 text-[9px] font-semibold ${selectedBooking.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-[#E7F4E8] text-[#4B8B55]'}`}>{selectedBooking.status}</span>
        <section className="space-y-3 rounded-[10px] border border-[#DED2C5] bg-white p-3">{selectedBooking.serviceImage && <img src={selectedBooking.serviceImage} alt={selectedBooking.serviceTitle} className="h-[130px] w-full rounded-[8px] object-cover" />}<h2 className="text-[13px] font-bold">{selectedBooking.serviceTitle}</h2><DetailRow label="Mã lịch" value={selectedBooking.code} /><DetailRow label="Chi nhánh" value={selectedBooking.branchName} /><DetailRow label="Ngày hẹn" value={selectedBooking.date} /><DetailRow label="Giờ chăm sóc" value={selectedBooking.timeSlot} /><DetailRow label="Chuyên viên" value={selectedBooking.doctorName} /><DetailRow label="Khách hàng" value={selectedBooking.userName} /></section>
        {confirmCancel && <section className="rounded-[10px] border border-red-200 bg-red-50 p-3"><p className="text-[11px] font-bold text-red-800">Bạn chắc chắn muốn hủy lịch này?</p><p className="mt-1 text-[9px] text-red-700">Thao tác sẽ được lưu vào hệ thống và tạo thông báo xác nhận.</p><div className="mt-3 flex gap-2"><button onClick={() => setConfirmCancel(false)} className="h-9 flex-1 rounded-[7px] border border-[#DED2C5] bg-white text-[10px] font-semibold">Giữ lịch</button><button onClick={cancelBooking} disabled={submitting} className="h-9 flex-1 rounded-[7px] bg-red-600 text-[10px] font-bold text-white disabled:opacity-60">{submitting ? 'Đang hủy...' : 'Xác nhận hủy'}</button></div></section>}
      </main>
      <footer className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-[#DED2C5] bg-white px-4 py-3">{canEdit ? <><button disabled={submitting} onClick={() => { setMessage(null); setConfirmCancel(true); }} className="h-11 flex-1 rounded-[8px] border border-red-300 bg-white text-[11px] font-bold text-red-600">Hủy lịch</button><button disabled={submitting} onClick={openReschedule} className="h-11 flex-[1.4] rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white">Đổi lịch</button></> : <button disabled={!selectedBooking.serviceId || !onRebookService} onClick={() => onRebookService?.(selectedBooking.serviceId)} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white disabled:opacity-60">Đặt lại dịch vụ</button>}</footer>
    </div>;
  }

  return <div className="space-y-3 px-3 pb-20 pt-3 text-[#40352F]">
    <header><h1 className="text-[21px] font-bold text-[#6F452C]">Lịch hẹn của tôi</h1><p className="mt-1 text-[10px] text-[#6F625B]">Quản lý các buổi chăm sóc đã đặt.</p></header>
    <div className="grid grid-cols-3 gap-2">{([['upcoming', 'Sắp tới'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy']] as const).map(([id, label]) => <button key={id} onClick={() => setActiveTab(id)} className={`h-9 rounded-[8px] border text-[9px] font-semibold ${activeTab === id ? 'border-[#A65317] bg-[#A65317] text-white' : 'border-[#DED2C5] bg-white'}`}>{label}</button>)}</div>
    <div className="space-y-3">{filteredBookings.length === 0 ? <div className="rounded-[10px] border border-[#DED2C5] bg-white p-6 text-center"><p className="text-[11px] font-bold">Chưa có lịch hẹn trong nhóm này</p><button onClick={onBookNewService} className="mt-3 h-10 rounded-[8px] bg-[#A65317] px-5 text-[10px] font-bold text-white">Đặt lịch mới</button></div> : filteredBookings.map((booking) => <button key={booking.id} onClick={() => { setSelectedBooking(booking); setConfirmCancel(false); setMessage(null); }} className="w-full space-y-2 rounded-[10px] border border-[#DED2C5] bg-white p-3 text-left">{booking.serviceImage && <img src={booking.serviceImage} alt={booking.serviceTitle} className="h-[145px] w-full rounded-[8px] object-cover" />}<h2 className="text-[12px] font-bold">{booking.serviceTitle}</h2><div className="flex items-center gap-1 text-[9px] text-[#7A685D]"><CalendarIcon size={11} color="#A65317" />{booking.date}<ClockIcon size={11} color="#A65317" />{booking.timeSlot}</div><div className="flex items-center gap-1 text-[9px] text-[#7A685D]"><LocationIcon size={11} color="#A65317" />{booking.branchName}</div></button>)}</div>
    <button onClick={onBookNewService} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white">Đặt lịch mới</button>
  </div>;
};

const DetailRow = ({ label, value }: { label: string; value: string }) => <div className="flex justify-between gap-3 text-[9px]"><span className="text-[#7A685D]">{label}</span><strong className="text-right">{value}</strong></div>;
