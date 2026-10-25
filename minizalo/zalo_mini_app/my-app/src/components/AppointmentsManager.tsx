import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Booking, Branch } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, CalendarIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import { BookingRows, BookingStatus, bookingDate, bookingDuration } from './BookingInformation';
import { apiClient } from '@/api/client';
import '@/css/appointments.scss';
import { useBackAction } from '@/hooks/useNavigationHistory';
import {matchesBookingSearch} from '@/utils/booking-search';

interface AppointmentsManagerProps {
  initialBookingId?: string;
  bookings: Booking[];
  branches?: Branch[];
  onClose?: () => void;
  loading?: boolean;
  authenticated?: boolean;
  onBusyChange?: (busy:boolean) => void;
  onRequireLogin?: () => void;
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
const isFutureSlot = (date: string, time: string, now=Date.now()) => Date.parse(`${date}T${time.slice(0, 5)}:00+07:00`) > now;

export const AppointmentsManager: React.FC<AppointmentsManagerProps> = ({ bookings, branches = [], loading = false, authenticated = true, onBusyChange, onRequireLogin, error, onRefresh, onClose, onUpdateBookings, onBookNewService, onRebookService, initialBookingId }) => {
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [search,setSearch]=useState('');
  const [clockNow,setClockNow]=useState(Date.now);
  const [dateRange, setDateRange] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibleCount,setVisibleCount]=useState(50);
  useEffect(()=>setVisibleCount(50),[activeTab,dateRange,fromDate,toDate,branchFilter,serviceFilter,statusFilter,search]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(initialBookingId || null);
  const [groupBookings,setGroupBookings]=useState<Booking[]>([]),[groupLoading,setGroupLoading]=useState(false),[groupError,setGroupError]=useState(''),[groupVersion,setGroupVersion]=useState(0),[cancelWholeGroup,setCancelWholeGroup]=useState(false);
  const selectedBooking = groupBookings.find(item=>item.id===selectedBookingId)||bookings.find(item => item.id === selectedBookingId) || null;
  const groupId=selectedBooking?.groupId;
  const groupAnchor=bookings.find(item=>item.groupId===groupId)?.id;
  useEffect(()=>{
    setGroupBookings(current=>current.filter(item=>item.groupId===groupId));setGroupError('');setGroupLoading(false);setCancelWholeGroup(false);
    if(!groupId||!groupAnchor||!authenticated)return;
    let active=true;const controller=new AbortController();setGroupLoading(true);
    apiClient.getBookingGroup(groupAnchor,controller.signal).then(result=>{
      if(!active)return;
      if(!Array.isArray(result?.bookings)||result.bookings.some((item:Booking)=>item.groupId!==groupId)){setGroupError(result?.error||'Không thể tải nhóm đặt lịch.');return;}
      setGroupBookings(result.bookings);
    }).finally(()=>{if(active)setGroupLoading(false);});
    return()=>{active=false;controller.abort();};
  },[groupId,groupAnchor,groupVersion,authenticated,bookings]);
  const setSelectedBooking = (booking: Booking | null) => setSelectedBookingId(booking?.id || null);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(todayInVietnam);
  const [newTime, setNewTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(()=>{onBusyChange?.(submitting);return()=>onBusyChange?.(false);},[submitting,onBusyChange]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [treatmentNotes,setTreatmentNotes]=useState('');
  const [treatmentDetails,setTreatmentDetails]=useState({conditionBefore:'',conditionAfter:'',specialistAdvice:''});
  useEffect(()=>{setTreatmentNotes('');setTreatmentDetails({conditionBefore:'',conditionAfter:'',specialistAdvice:''});},[selectedBookingId]);
  const detailBody = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!detailBody.current) return;
    if (confirmCancel) detailBody.current.scrollTop = detailBody.current.scrollHeight;
    else if (message) detailBody.current.scrollTop = 0;
  }, [confirmCancel, message]);
  const bookingsRef = useRef(bookings);
  const mutationLock = useRef(false);
  const refreshGeneration=useRef(0);
  const updateBookings=useRef(onUpdateBookings);updateBookings.current=onUpdateBookings;
  const [refreshError,setRefreshError]=useState('');
  useEffect(()=>setRefreshError(''),[bookings]);
  useEffect(()=>{
    if(!authenticated)return;
    let disposed=false,pending=false,repeat=false;
    const refresh=async()=>{
      if(disposed||document.visibilityState==='hidden')return;
      setClockNow(Date.now());
      if(pending){repeat=true;return;}
      if(mutationLock.current)return;
      pending=true;const generation=++refreshGeneration.current;
      try {
        apiClient.invalidateReadPaths(['/bookings']);
        const response=await apiClient.getBookings();
        if(disposed||generation!==refreshGeneration.current)return;
        if(response?.error||!Array.isArray(response?.bookings)){setRefreshError('Không thể cập nhật lịch hẹn. Vui lòng thử lại.');return;}
        setRefreshError('');
        if(JSON.stringify(response.bookings)!==JSON.stringify(bookingsRef.current))updateBookings.current(response.bookings);
      } finally {pending=false;if(repeat){repeat=false;void refresh();}}
    };
    const timer=window.setInterval(()=>void refresh(),30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{disposed=true;refreshGeneration.current++;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[authenticated]);
  useBackAction(Boolean(selectedBooking || rescheduling || confirmCancel || submitting), () => {
    if (mutationLock.current) return;
    setMessage(null);
    if (confirmCancel) {setConfirmCancel(false);setCancelWholeGroup(false);}
    else if (rescheduling) setRescheduling(false);
    else setSelectedBooking(null);
  });
  useEffect(() => {
    if (!initialBookingId) return;
    setSelectedBookingId(initialBookingId);setRescheduling(false);setConfirmCancel(false);setMessage(null);
  }, [initialBookingId]);
  useEffect(() => {
    if (selectedBookingId && !selectedBooking && !loading) {
      setSelectedBookingId(null);setRescheduling(false);setConfirmCancel(false);setMessage(null);
    }
    if (selectedBooking && !['pending','confirmed'].includes(selectedBooking.status)) {
      setRescheduling(false);setConfirmCancel(false);
    }
  }, [selectedBookingId,selectedBooking,loading]);
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
    const matchesTab = activeTab === 'all' || (activeTab === 'upcoming' ? !['completed', 'cancelled', 'no_show'].includes(booking.status) && (isFutureSlot(toInputDate(booking.date), booking.timeSlot,clockNow)||toInputDate(booking.date)===todayInVietnam()||['checked_in','in_service'].includes(booking.status)) : booking.status === activeTab);
    const date = toInputDate(booking.date);
    return matchesTab && matchesBookingSearch(booking,search) && !invalidRange && (!rangeFrom || date >= rangeFrom) && (!rangeTo || date <= rangeTo)
      && (!branchFilter || booking.branchId === branchFilter) && (!statusFilter || booking.status === statusFilter)
      && (!serviceFilter || booking.serviceId === serviceFilter || booking.items?.some(item => item.serviceId === serviceFilter));
  }).sort((a, b) => `${toInputDate(a.date)} ${a.timeSlot}`.localeCompare(`${toInputDate(b.date)} ${b.timeSlot}`)), [bookings, activeTab, rangeFrom, rangeTo, invalidRange, branchFilter, statusFilter, serviceFilter,clockNow,search]);
  const branchOptions = Array.from(new Map(bookings.map(booking => [booking.branchId, booking.branchName || branches.find(branch => branch.id === booking.branchId)?.name || ''])));
  const serviceOptions = Array.from(new Map(bookings.flatMap(booking => booking.items?.length ? booking.items.map(item => [item.serviceId, item.serviceTitle || booking.serviceTitle] as const) : [[booking.serviceId, booking.serviceTitle] as const])));
  const replaceBooking = (updated: Booking) => { setGroupBookings(current=>current.map(item=>item.id===updated.id?updated:item));onUpdateBookings(bookingsRef.current.map(item => item.id === updated.id ? updated : item)); setSelectedBooking(updated); };
  const openReschedule = () => { if (!selectedBooking) return; const date = toInputDate(selectedBooking.date); setNewDate(date >= today ? date : today); setNewTime(''); setMessage(null); setConfirmCancel(false); setRescheduling(true); };
  const submitReschedule = async () => {
    if (!selectedBooking || mutationLock.current) return;
    if (!newDate || newDate < today || !slotsReady || !availableTimes.includes(newTime) || !isFutureSlot(newDate, newTime)) { setMessage({ type: 'error', text: 'Vui lòng chọn giờ còn trống.' }); return; }
    mutationLock.current = true;refreshGeneration.current++;setSubmitting(true);setMessage(null);
    try {
      const response = await apiClient.rescheduleBooking(selectedBooking.id, newDate, newTime);
      if (!response?.error && response?.booking?.id === selectedBooking.id) { replaceBooking(response.booking); setMessage({ type: 'success', text: 'Đổi lịch thành công.' }); setRescheduling(false); }
      else { setMessage({ type: 'error', text: response?.error || 'Không thể đổi lịch. Vui lòng thử lại.' }); setSlotsVersion(value => value + 1); }
    } catch { setMessage({ type: 'error', text: 'Không thể đổi lịch. Vui lòng thử lại.' }); }
    finally { mutationLock.current = false; setSubmitting(false); }
  };
  const cancelBooking = async () => {
    if (!selectedBooking || mutationLock.current) return;
    mutationLock.current = true;refreshGeneration.current++;setSubmitting(true);setMessage(null);
    try {
      if(cancelWholeGroup){
        const response=await apiClient.cancelBookingGroup(selectedBooking.id);
        if(response?.error||!Array.isArray(response?.bookings)||!response.bookings.length||response.bookings.some((item:Booking)=>item.groupId!==selectedBooking.groupId||item.status!=='cancelled')){setMessage({type:'error',text:response?.error||'Không thể hủy nhóm. Vui lòng cập nhật lại lịch.'});setGroupVersion(value=>value+1);return;}
        const changed=new Map<string,Booking>(response.bookings.map((item:Booking)=>[item.id,item]));
        setGroupBookings(response.bookings);onUpdateBookings(bookingsRef.current.map(item=>changed.get(item.id)||item));setConfirmCancel(false);setCancelWholeGroup(false);setMessage({type:'success',text:'Đã hủy toàn bộ nhóm đặt lịch.'});return;
      }
      const response = await apiClient.cancelBooking(selectedBooking.id, 'Nhân viên hủy lịch trên Mini App');
      if (!response?.error && response?.booking?.id === selectedBooking.id && response.booking.status === 'cancelled') { replaceBooking(response.booking); setConfirmCancel(false); setMessage({ type: 'success', text: 'Lịch hẹn đã được hủy.' }); }
      else setMessage({ type: 'error', text: response?.error || 'Không thể hủy lịch. Vui lòng thử lại.' });
    } catch { setMessage({ type: 'error', text: 'Không thể hủy lịch. Vui lòng thử lại.' }); }
    finally { mutationLock.current = false; setSubmitting(false); }
  };
  const updateSession=async(status:string)=>{
    if(!selectedBooking||mutationLock.current)return;
    mutationLock.current=true;refreshGeneration.current++;setSubmitting(true);setMessage(null);
    try{
      const result=await apiClient.updateStaffSession(selectedBooking.id,status,status==='COMPLETED'?treatmentNotes.trim():undefined,status==='COMPLETED'?treatmentDetails:undefined);
      if(result?.booking?.id===selectedBooking.id){replaceBooking(result.booking);setMessage({type:'success',text:'Đã cập nhật ca trị liệu.'});}
      else setMessage({type:'error',text:result?.error||'Không thể cập nhật ca trị liệu.'});
    }finally{mutationLock.current=false;setSubmitting(false);}
  };
  const feedback = <>{refreshError&&<p role="alert" className="appointment-feedback is-error">{refreshError}</p>}{message&&<p role={message.type === 'error' ? 'alert' : 'status'} className={`appointment-feedback is-${message.type}`}>{message.text}</p>}</>;

  if (rescheduling && selectedBooking) return <section className="appointment-screen appointment-reschedule" aria-labelledby="reschedule-heading">
    <header className="appointment-header"><div className="appointment-topbar"><button type="button" title="Quay lại chi tiết lịch hẹn" disabled={submitting} className="appointment-back" onClick={() => setRescheduling(false)}><ArrowLeftIcon size={20} /></button><span>ĐẶT LỊCH</span></div><h1 id="reschedule-heading">Đổi lịch hẹn</h1><p>Chọn thời gian mới phù hợp với bạn.</p></header>
    <main className="appointment-body" tabIndex={0} aria-label="Đổi lịch hẹn"><p className="appointment-notice">{selectedBooking.serviceTitle}<br />Lịch hiện tại: {bookingDate(selectedBooking.date)} · {selectedBooking.timeSlot}</p><label className="appointment-filter">Ngày hẹn mới<input type="date" aria-label="Ngày hẹn mới" disabled={submitting} min={today} value={newDate} onChange={event => { setNewDate(event.target.value); setNewTime(''); setMessage(null); }} /></label>
      {slotsLoading && <p role="status">Đang tải giờ hẹn...</p>}{slotsError && <p role="alert">{slotsError} <button type="button" onClick={() => setSlotsVersion(value => value + 1)}>Thử lại</button></p>}{!slotsLoading && !slotsError && !availableTimes.length && <p></p>}
      <div className="appointment-slot-grid">{availableTimes.map(slot => <button type="button" key={slot} aria-pressed={newTime === slot} disabled={submitting} onClick={() => { setNewTime(slot); setMessage(null); }}>{slot}</button>)}</div>{feedback}
    </main><footer className="appointment-footer"><p>{bookingDate(newDate)} · {newTime || 'Chưa chọn giờ'}</p><button type="button" onClick={submitReschedule} disabled={submitting || !slotsReady || !newTime || !availableTimes.includes(newTime)}>{submitting ? 'Đang kiểm tra lịch...' : 'Xác nhận đổi lịch'}</button></footer>
  </section>;

  if (selectedBooking) {
    const canEdit = ['confirmed', 'pending'].includes(selectedBooking.status) && isFutureSlot(toInputDate(selectedBooking.date),selectedBooking.timeSlot,clockNow);
    const canCancel = canEdit && !['paid', 'partial'].includes(selectedBooking.paymentStatus || '');
    const duration = bookingDuration(selectedBooking);
    const sessionAction=selectedBooking.status==='confirmed'&&toInputDate(selectedBooking.date)===todayInVietnam()?{status:'CHECKED_IN',label:'Xác nhận khách đã đến'}:selectedBooking.status==='checked_in'&&!isFutureSlot(toInputDate(selectedBooking.date),selectedBooking.timeSlot,clockNow)?{status:'IN_SERVICE',label:'Bắt đầu trị liệu'}:selectedBooking.status==='in_service'?{status:'COMPLETED',label:'Kết ca trị liệu'}:null;
    return <section className="appointment-screen appointment-detail" aria-labelledby="appointment-detail-heading">
      <header className="appointment-header"><div className="appointment-topbar"><button type="button" title="Quay lại lịch hẹn khách hàng" disabled={submitting} className="appointment-back" onClick={() => { setSelectedBooking(null); setMessage(null); setConfirmCancel(false); }}><ArrowLeftIcon size={20} /></button><span>ĐẶT LỊCH</span></div><h1 id="appointment-detail-heading">Chi tiết lịch hẹn</h1></header>
      <main ref={detailBody} className="appointment-body" tabIndex={0} aria-label="Chi tiết lịch hẹn">{!confirmCancel && feedback}<BookingStatus booking={selectedBooking} /><p className="appointment-code">{selectedBooking.code}</p><article className="appointment-card"><EntityImage src={selectedBooking.serviceImage} alt={selectedBooking.serviceTitle} className="appointment-photo" /><h2>{selectedBooking.serviceTitle}</h2>{duration != null && <p className="appointment-duration">Thời lượng chăm sóc <strong>{duration} phút</strong></p>}<BookingRows booking={selectedBooking} branches={branches} />{selectedBooking.notes && <p className="appointment-notes">{selectedBooking.notes}</p>}</article>
        {selectedBooking.groupId&&selectedBooking.groupSize&&selectedBooking.groupSize>1&&<section className="appointment-card appointment-group"><h2>Nhóm {selectedBooking.groupSize} người</h2>{groupLoading&&<p role="status">Đang tải nhóm...</p>}{groupError&&<p role="alert">{groupError}<button type="button" disabled={submitting||groupLoading} onClick={()=>setGroupVersion(value=>value+1)}>Thử lại</button></p>}{!groupLoading&&!groupError&&groupBookings.slice().sort((a,b)=>(a.memberNumber||0)-(b.memberNumber||0)).map(item=><button type="button" key={item.id} disabled={submitting||item.id===selectedBooking.id} onClick={()=>{setSelectedBooking(item);setMessage(null);setConfirmCancel(false);setCancelWholeGroup(false);}}>{item.userName} · Người {item.memberNumber}<br/>{item.code}<BookingStatus booking={item}/></button>)}{!groupLoading&&!groupError&&groupBookings.length===selectedBooking.groupSize&&groupBookings.every(item=>['pending','confirmed','cancelled'].includes(item.status)&&(['cancelled'].includes(item.status)||(!['paid','partial'].includes(item.paymentStatus||'')&&isFutureSlot(toInputDate(item.date),item.timeSlot,clockNow))))&&groupBookings.some(item=>item.status!=='cancelled')&&<button type="button" className="appointment-cancel-button" disabled={submitting} onClick={()=>{setCancelWholeGroup(true);setConfirmCancel(true);setMessage(null);}}>Hủy cả nhóm</button>}</section>}
        {sessionAction&&<section className="appointment-card">{sessionAction.status==='COMPLETED'&&<div className="appointment-clinical-fields"><label className="appointment-filter">Ghi nhận ca trị liệu<textarea aria-label="Ghi nhận ca trị liệu" value={treatmentNotes} maxLength={10000} disabled={submitting} onChange={event=>setTreatmentNotes(event.target.value)}/></label>{([['conditionBefore','Tình trạng trước trị liệu'],['conditionAfter','Tình trạng sau trị liệu'],['specialistAdvice','Lời dặn chăm sóc']] as const).map(([key,label])=><label className="appointment-filter" key={key}>{label}<textarea aria-label={label} value={treatmentDetails[key]} maxLength={10000} disabled={submitting} onChange={event=>setTreatmentDetails(current=>({...current,[key]:event.target.value}))}/></label>)}</div>}<button type="button" className="appointments-new" disabled={submitting||(sessionAction.status==='COMPLETED'&&!treatmentNotes.trim())} onClick={()=>void updateSession(sessionAction.status)}>{submitting?'Đang lưu...':sessionAction.label}</button></section>}
        {confirmCancel && <section className="appointment-cancel-confirm"><h2>{cancelWholeGroup?'Hủy toàn bộ lịch trong nhóm này?':'Bạn chắc chắn muốn hủy lịch này?'}</h2>{feedback}<div><button type="button" disabled={submitting} onClick={() => {setConfirmCancel(false);setCancelWholeGroup(false);}}>Giữ lịch</button><button type="button" disabled={submitting} onClick={cancelBooking}>{submitting ? 'Đang hủy...' : 'Xác nhận hủy'}</button></div></section>}
      </main><footer className="appointment-footer">{canEdit ? <div className="appointment-detail-actions">{canCancel && <button type="button" className="appointment-cancel-button" disabled={submitting} onClick={() => { setMessage(null);setCancelWholeGroup(false); setConfirmCancel(true); }}>Hủy lịch</button>}<button type="button" disabled={submitting} onClick={openReschedule}>Đổi lịch</button></div> : <button type="button" disabled={!selectedBooking.serviceId || !onRebookService} onClick={() => onRebookService?.(selectedBooking.serviceId)}>Đặt lại dịch vụ</button>}</footer>
    </section>;
  }

  return <section className="appointments-list" aria-labelledby="appointments-heading">
    {refreshError&&<p role="alert" className="appointment-feedback is-error">{refreshError} <button type="button" disabled={loading} onClick={onRefresh}>Thử lại</button></p>}
    <header className="appointments-filters"><div className="appointment-topbar">{onClose && <button type="button" title="Về trang chủ" className="appointment-back" onClick={onClose}><ArrowLeftIcon size={20} /></button>}<span>ĐẶT LỊCH</span></div><h1 id="appointments-heading">Lịch hẹn khách hàng</h1><p className="appointments-subtitle">Quản lý các buổi chăm sóc tại cơ sở.</p>
      {!authenticated&&onRequireLogin&&<button type="button" className="appointments-new" onClick={onRequireLogin}>Đăng nhập để xem lịch hẹn</button>}
      <div className="appointments-tabs" role="group" aria-label="Nhóm lịch hẹn">{([['upcoming', 'Sắp tới'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy'], ['all', 'Tất cả']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => { setActiveTab(id); setStatusFilter(''); }}>{label}</button>)}</div>
      <label className="appointment-filter">Tìm lịch hẹn<input type="search" aria-label="Tìm lịch hẹn khách hàng" placeholder="Tên khách, số điện thoại, mã lịch hẹn..." value={search} maxLength={150} onChange={event=>setSearch(event.target.value)}/></label>
      <label className="appointment-filter">Khoảng ngày<select aria-label="Khoảng ngày" value={dateRange} onChange={event => setDateRange(event.target.value)}><option value="all">Tất cả ngày hẹn</option><option value="week">7 ngày tới</option><option value="month">30 ngày tới</option><option value="custom">Chọn khoảng ngày</option></select></label>
      {dateRange === 'custom' && <div className="appointments-date-range"><label className="appointment-filter">Từ ngày<input aria-label="Từ ngày" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /></label><label className="appointment-filter">Đến ngày<input aria-label="Đến ngày" type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></label></div>}{invalidRange && <p role="alert" className="appointment-feedback is-error">Ngày kết thúc phải từ ngày bắt đầu.</p>}
      <details className="appointments-filter-menu"><summary>Chi nhánh / Dịch vụ / Trạng thái</summary><div><label className="appointment-filter">Chi nhánh<select aria-label="Lọc chi nhánh lịch hẹn" value={branchFilter} onChange={event => setBranchFilter(event.target.value)}><option value="">Tất cả</option>{branchOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="appointment-filter">Dịch vụ<select aria-label="Lọc dịch vụ lịch hẹn" value={serviceFilter} onChange={event => setServiceFilter(event.target.value)}><option value="">Tất cả</option>{serviceOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="appointment-filter">Trạng thái<select aria-label="Lọc trạng thái lịch hẹn" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tất cả</option>{[['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['checked_in', 'Đã đến'], ['in_service', 'Đang thực hiện'], ['completed', 'Đã hoàn thành'], ['cancelled', 'Đã hủy'], ['no_show', 'Không đến']].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div></details>
    </header>
    <main className="appointments-results" tabIndex={0} aria-label="Danh sách lịch hẹn">{loading && <p role="status">Đang tải lịch hẹn...</p>}{error && <p role="alert" className="appointment-feedback is-error">{error} <button type="button" onClick={onRefresh}>Thử lại</button></p>}{!loading && !error && !filteredBookings.length && <p className="appointment-empty" role="status"></p>}{filteredBookings.slice(0,visibleCount).map(booking => <button key={booking.id} type="button" className="appointment-list-card" onClick={() => { setSelectedBooking(booking); setConfirmCancel(false); setMessage(null); }}><EntityImage src={booking.serviceImage} alt={booking.serviceTitle} className="appointment-photo" /><BookingStatus booking={booking} /><h2>{booking.serviceTitle}</h2><p>{booking.userName}</p>{booking.groupSize&&booking.groupSize>1&&<p>Nhóm {booking.groupSize} người · lượt {booking.memberNumber}</p>}<div className="appointment-list-row"><span>Ngày hẹn</span><strong>{bookingDate(booking.date)}</strong></div><div className="appointment-list-row"><span>Giờ hẹn</span><strong>{booking.timeSlot}</strong></div><p>{booking.branchName}</p></button>)}{visibleCount<filteredBookings.length&&<button type="button" className="appointments-new" onClick={()=>setVisibleCount(value=>value+50)}>Xem thêm lịch hẹn</button>}<button type="button" className="appointments-new" disabled={loading} onClick={onBookNewService}><CalendarIcon size={18} />Đặt lịch mới</button></main>
  </section>;
};
