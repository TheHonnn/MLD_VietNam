import React, { useMemo, useState } from 'react';
import { Booking } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, LocationIcon } from '@/components/Icons';
import { apiClient } from '@/api/client';

interface AppointmentsManagerProps {
  bookings: Booking[];
  onUpdateBookings: (bookings: Booking[]) => void;
  onBookNewService: () => void;
  onRebookService?: (serviceTitle: string) => void;
}

type AppointmentTab = 'upcoming' | 'completed' | 'cancelled';
const serviceImage = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80';
const timeSlots = ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'];

const toInputDate = (date: string) => {
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
};
const toApiDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};
const tomorrow = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
};

export const AppointmentsManager: React.FC<AppointmentsManagerProps> = ({
  bookings, onUpdateBookings, onBookNewService, onRebookService,
}) => {
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(tomorrow());
  const [newTime, setNewTime] = useState(timeSlots[0]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    if (activeTab === 'upcoming') return booking.status === 'confirmed' || booking.status === 'pending';
    if (activeTab === 'completed') return booking.status === 'completed';
    return booking.status === 'cancelled';
  }), [bookings, activeTab]);

  const replaceBooking = (updated: Booking) => {
    onUpdateBookings(bookings.map((item) => item.id === updated.id ? updated : item));
    setSelectedBooking(updated);
  };

  const openReschedule = () => {
    if (!selectedBooking) return;
    const current = toInputDate(selectedBooking.date);
    setNewDate(current >= tomorrow() ? current : tomorrow());
    setNewTime(selectedBooking.timeSlot);
    setMessage(null);
    setRescheduling(true);
  };

  const submitReschedule = async () => {
    if (!selectedBooking || submitting) return;
    setSubmitting(true);
    setMessage(null);
    const response = await apiClient.rescheduleBooking(selectedBooking.id, toApiDate(newDate), newTime);
    setSubmitting(false);
    if (response?.booking) {
      replaceBooking(response.booking);
      setMessage({ type: 'success', text: 'Đổi lịch thành công. Thông báo mới đã được tạo.' });
      setRescheduling(false);
      return;
    }
    setMessage({ type: 'error', text: response?.error || 'Không thể đổi lịch. Vui lòng thử lại.' });
  };

  const cancelBooking = async () => {
    if (!selectedBooking || submitting) return;
    setSubmitting(true);
    const response = await apiClient.cancelBooking(selectedBooking.id, 'Khách hàng hủy trên Mini App');
    setSubmitting(false);
    if (response?.booking) {
      replaceBooking(response.booking);
      setConfirmCancel(false);
      setMessage({ type: 'success', text: 'Lịch hẹn đã được hủy.' });
      return;
    }
    setMessage({ type: 'error', text: response?.error || 'Không thể hủy lịch. Vui lòng thử lại.' });
  };

  if (rescheduling && selectedBooking) {
    return <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F]">
      <header className="shrink-0 px-4 pb-3 pt-4">
        <button onClick={() => setRescheduling(false)} className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button>
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
        <label className="block text-[10px] font-semibold"><span className="mb-1.5 block">Ngày hẹn mới</span><input type="date" min={tomorrow()} value={newDate} onChange={(event) => { setNewDate(event.target.value); setMessage(null); }} className="h-11 w-full rounded-[8px] border border-[#DED2C5] bg-white px-3 text-[12px] outline-none focus:border-[#A65317]" /></label>
        <section><h3 className="mb-2 text-[10px] font-semibold">Khung giờ mới</h3><div className="grid grid-cols-2 gap-2">{timeSlots.map((slot) => <button key={slot} onClick={() => { setNewTime(slot); setMessage(null); }} className={`h-10 rounded-[8px] border text-[10px] font-semibold ${newTime === slot ? 'border-[#A65317] bg-[#A65317] text-white' : 'border-[#DED2C5] bg-white'}`}>{slot}</button>)}</div></section>
        {message?.type === 'error' && <div role="alert" className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-[10px] font-semibold text-red-700">{message.text}</div>}
      </main>
      <footer className="absolute bottom-0 left-0 right-0 border-t border-[#DED2C5] bg-white px-4 py-3"><p className="mb-2 text-[9px] text-[#6F625B]">{toApiDate(newDate)} · {newTime}</p><button onClick={submitReschedule} disabled={submitting} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[12px] font-bold text-white disabled:opacity-60">{submitting ? 'Đang kiểm tra lịch...' : 'Xác nhận đổi lịch'}</button></footer>
    </div>;
  }

  if (selectedBooking) {
    const canEdit = selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending';
    return <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F]">
      <header className="shrink-0 px-4 pb-3 pt-4"><button onClick={() => { setSelectedBooking(null); setMessage(null); }} className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button><h1 className="text-[21px] font-bold text-[#6F452C]">Chi tiết lịch hẹn</h1></header>
      <main className="flex-1 space-y-3 overflow-y-auto px-4 pb-28">
        {message && <div className={`rounded-[8px] border p-3 text-[10px] font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}
        <span className={`inline-flex rounded-[7px] px-3 py-1.5 text-[9px] font-semibold ${selectedBooking.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-[#E7F4E8] text-[#4B8B55]'}`}>{selectedBooking.status === 'cancelled' ? 'Đã hủy' : 'Đã xác nhận'}</span>
        <section className="space-y-3 rounded-[10px] border border-[#DED2C5] bg-white p-3"><img src={serviceImage} alt={selectedBooking.serviceTitle} className="h-[130px] w-full rounded-[8px] object-cover" /><h2 className="text-[13px] font-bold">{selectedBooking.serviceTitle}</h2><DetailRow label="Mã lịch" value={selectedBooking.code} /><DetailRow label="Chi nhánh" value={selectedBooking.branchName} /><DetailRow label="Ngày hẹn" value={selectedBooking.date} /><DetailRow label="Giờ chăm sóc" value={selectedBooking.timeSlot} /><DetailRow label="Chuyên viên" value={selectedBooking.doctorName} /><DetailRow label="Khách hàng" value={selectedBooking.userName} /></section>
        {confirmCancel && <section className="rounded-[10px] border border-red-200 bg-red-50 p-3"><p className="text-[11px] font-bold text-red-800">Bạn chắc chắn muốn hủy lịch này?</p><p className="mt-1 text-[9px] text-red-700">Thao tác sẽ được lưu vào hệ thống và tạo thông báo xác nhận.</p><div className="mt-3 flex gap-2"><button onClick={() => setConfirmCancel(false)} className="h-9 flex-1 rounded-[7px] border border-[#DED2C5] bg-white text-[10px] font-semibold">Giữ lịch</button><button onClick={cancelBooking} disabled={submitting} className="h-9 flex-1 rounded-[7px] bg-red-600 text-[10px] font-bold text-white disabled:opacity-60">{submitting ? 'Đang hủy...' : 'Xác nhận hủy'}</button></div></section>}
      </main>
      <footer className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-[#DED2C5] bg-white px-4 py-3">{canEdit ? <><button onClick={() => setConfirmCancel(true)} className="h-11 flex-1 rounded-[8px] border border-red-300 bg-white text-[11px] font-bold text-red-600">Hủy lịch</button><button onClick={openReschedule} className="h-11 flex-[1.4] rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white">Đổi lịch</button></> : <button onClick={() => onRebookService?.(selectedBooking.serviceTitle)} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white">Đặt lại dịch vụ</button>}</footer>
    </div>;
  }

  return <div className="space-y-3 px-3 pb-20 pt-3 text-[#40352F]">
    <header><h1 className="text-[21px] font-bold text-[#6F452C]">Lịch hẹn của tôi</h1><p className="mt-1 text-[10px] text-[#6F625B]">Quản lý các buổi chăm sóc đã đặt.</p></header>
    <div className="grid grid-cols-3 gap-2">{([['upcoming', 'Sắp tới'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy']] as const).map(([id, label]) => <button key={id} onClick={() => setActiveTab(id)} className={`h-9 rounded-[8px] border text-[9px] font-semibold ${activeTab === id ? 'border-[#A65317] bg-[#A65317] text-white' : 'border-[#DED2C5] bg-white'}`}>{label}</button>)}</div>
    <div className="space-y-3">{filteredBookings.length === 0 ? <div className="rounded-[10px] border border-[#DED2C5] bg-white p-6 text-center"><p className="text-[11px] font-bold">Chưa có lịch hẹn trong nhóm này</p><button onClick={onBookNewService} className="mt-3 h-10 rounded-[8px] bg-[#A65317] px-5 text-[10px] font-bold text-white">Đặt lịch mới</button></div> : filteredBookings.map((booking) => <button key={booking.id} onClick={() => setSelectedBooking(booking)} className="w-full space-y-2 rounded-[10px] border border-[#DED2C5] bg-white p-3 text-left"><img src={serviceImage} alt={booking.serviceTitle} className="h-[145px] w-full rounded-[8px] object-cover" /><h2 className="text-[12px] font-bold">{booking.serviceTitle}</h2><div className="flex items-center gap-1 text-[9px] text-[#7A685D]"><CalendarIcon size={11} color="#A65317" />{booking.date}<ClockIcon size={11} color="#A65317" />{booking.timeSlot}</div><div className="flex items-center gap-1 text-[9px] text-[#7A685D]"><LocationIcon size={11} color="#A65317" />{booking.branchName}</div></button>)}</div>
    <button onClick={onBookNewService} className="h-11 w-full rounded-[8px] bg-[#A65317] text-[11px] font-bold text-white">Đặt lịch mới</button>
  </div>;
};

const DetailRow = ({ label, value }: { label: string; value: string }) => <div className="flex justify-between gap-3 text-[9px]"><span className="text-[#7A685D]">{label}</span><strong className="text-right">{value}</strong></div>;
