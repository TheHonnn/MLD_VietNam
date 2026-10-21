import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MedicalService, Doctor, Branch, Booking, User } from '../../../../backend/src/data/database';
import { apiClient } from '../api/client';
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckIcon, ClockIcon, SearchIcon } from '@/components/Icons';
import { BranchMap, EntityImage } from './GroupBExtensions';
import '@/css/booking-flow.scss';
import { searchText } from '@/utils/catalog';
import { useBackAction } from '@/hooks/useNavigationHistory';

interface GroupCBookingProps {
  userPackage?:{id:string;name:string};
  currentUser?: User;
  initialService: MedicalService | null;
  initialBranch?: Branch | null;
  initialDoctor?: Doctor | null;
  allServices: MedicalService[];
  doctors: Doctor[];
  branches: Branch[];
  onClose: () => void;
  onBookingSuccess: (booking: Booking) => void;
}

type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const vietnamToday = () => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
};
const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const stepTitles: Record<BookingStep, { title: string; subtitle: string; action: string }> = {
  1: { title: 'Chọn dịch vụ', subtitle: 'Lựa chọn dịch vụ chăm sóc phù hợp với bạn.', action: 'Tiếp tục' },
  2: { title: 'Chọn chi nhánh', subtitle: 'Bạn muốn trải nghiệm dịch vụ tại cơ sở nào?', action: 'Tiếp tục chọn chuyên viên' },
  3: { title: 'Chọn chuyên viên', subtitle: 'Chọn người đồng hành cùng bạn trong buổi chăm sóc.', action: 'Chọn ngày và giờ' },
  4: { title: 'Chọn ngày và giờ', subtitle: 'Lựa chọn thời gian phù hợp với lịch của bạn.', action: 'Tiếp tục' },
  5: { title: 'Thông tin đặt lịch', subtitle: 'Vui lòng kiểm tra và bổ sung thông tin người sử dụng dịch vụ.', action: 'Kiểm tra đặt lịch' },
  6: { title: 'Xác nhận đặt lịch', subtitle: 'Kiểm tra thông tin trước khi hoàn tất.', action: 'Tiếp tục thanh toán' },
  7: { title: 'Thanh toán', subtitle: 'Chọn phương thức thanh toán thuận tiện cho bạn.', action: 'Xác nhận đặt lịch' },
};

export const GroupCBooking: React.FC<GroupCBookingProps> = ({
  initialService, initialBranch, initialDoctor, allServices, doctors, branches, onClose, onBookingSuccess, currentUser,userPackage,
}) => {
  const [step, setStep] = useState<BookingStep>(1);
  const body = useRef<HTMLElement>(null);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [step]);
  const [selectedService, setSelectedService] = useState<MedicalService>(initialService || allServices[0]);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(initialBranch || branches[0]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(initialDoctor || doctors[0]);
  const [autoAssign, setAutoAssign] = useState(!initialDoctor);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchMode, setBranchMode] = useState<'list' | 'map'>('list');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const categories = Array.from(new Set(allServices.map(service => service.category))).filter(Boolean);
  const visibleServices = allServices.filter(service => (!userPackage||service.id===initialService?.id) && (!serviceCategory || service.category === serviceCategory) && searchText(`${service.title} ${service.description}`).includes(searchText(serviceSearch)));
  const visibleBranches = branches.filter(branch => (!branchCity || branch.city === branchCity) && searchText(`${branch.name} ${branch.address}`).includes(searchText(branchSearch)));
  const today = vietnamToday();
  const [selectedDate, setSelectedDate] = useState(() => shiftDate(vietnamToday(), 1));
  const availableDates = useMemo(() => {
    const day = new Date(`${selectedDate}T12:00:00Z`).getUTCDay();
    const monday = shiftDate(selectedDate, -((day + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
  }, [selectedDate]);
  const [selectedTime, setSelectedTime] = useState('');
  const [customerMode, setCustomerMode] = useState<'self' | 'other'>('self');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [selfRecipient, setSelfRecipient] = useState({ name: currentUser?.name || '', phone: currentUser?.phone || '', email: currentUser?.email || '' });
  const recipientMode = useRef<'self' | 'other'>('self');
  const submissionLock = useRef(false);
  const chooseRecipient = (mode: 'self' | 'other') => {
    setSubmitError('');
    setCustomerMode(mode);
    recipientMode.current = mode;
    setCustomerName(mode === 'self' ? selfRecipient.name : '');
    setCustomerPhone(mode === 'self' ? selfRecipient.phone : '');
    setCustomerEmail(mode === 'self' ? selfRecipient.email : '');
  };
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');

  const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const [slots, setSlots] = useState<{ id: string; technicianId: string; startTime: string; endTime: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [slotsFor, setSlotsFor] = useState('');
  const slotRequestKey = JSON.stringify([selectedBranch?.id, selectedService?.id, selectedService?.durationMinutes, selectedDate, autoAssign ? null : selectedDoctor?.id, slotsVersion]);
  const slotsReady = slotsFor === slotRequestKey && !slotsLoading && !slotsError;
  const availableSlots = slotsReady ? slots : [];
  const branchDoctors = doctors.filter(d => d.branchId === selectedBranch?.id && d.serviceIds?.includes(selectedService?.id));
  const specialtiesFor = (doctor: Doctor) => doctor.specialty.split(',').map(value => value.trim()).filter(Boolean);
  const specialties = Array.from(new Set(branchDoctors.flatMap(specialtiesFor)));
  const visibleDoctors = branchDoctors.filter(doctor => !doctorSpecialty || specialtiesFor(doctor).includes(doctorSpecialty));
  const labelsFor = (min: number, max: number) => Array.from(new Set(availableSlots
    .filter(slot => Number(slot.startTime.slice(0, 2)) >= min && Number(slot.startTime.slice(0, 2)) < max)
    .map(slot => slot.startTime.slice(0, 5) + ' - ' + slot.endTime.slice(0, 5))));
  const morningSlots = labelsFor(0, 12);
  const afternoonSlots = labelsFor(12, 18);
  const eveningSlots = labelsFor(18, 24);

  useEffect(() => {
    if (currentUser?.id) return;
    let cancelled = false;
    apiClient.getCurrentUser().then(result => {
      if (cancelled || !result?.user) return;
      const recipient = { name: result.user.name, phone: result.user.phone, email: result.user.email || '' };
      setSelfRecipient(recipient);
      if (recipientMode.current === 'self') { setCustomerName(recipient.name); setCustomerPhone(recipient.phone); setCustomerEmail(recipient.email); }
    });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedDoctor?.branchId !== selectedBranch?.id || !selectedDoctor?.serviceIds?.includes(selectedService?.id)) { setAutoAssign(true); }
  }, [selectedBranch?.id, selectedDoctor?.branchId,selectedService?.id]);
  useEffect(() => { setDoctorSpecialty(''); }, [selectedBranch?.id]);

  useEffect(() => {
    let cancelled = false;
    setSelectedTime('');
    setSlots([]);
    setSlotsError('');
    setSlotsFor('');
    if (!selectedBranch?.id || !selectedService?.id) return;
    setSlotsLoading(true);
    apiClient.getSlots(selectedBranch.id, selectedDate, selectedService.id, autoAssign ? undefined : selectedDoctor?.id).then(result => {
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result?.slots || result.error) { setSlotsError(result?.error || 'Không thể tải giờ hẹn.'); return; }
      setSlots(result.slots);
      setSlotsFor(slotRequestKey);
    });
    return () => { cancelled = true; };
  }, [selectedBranch?.id, selectedService?.id, selectedService?.durationMinutes, selectedDate, autoAssign, selectedDoctor?.id, slotsVersion]);
  const total = userPackage?0:selectedService?.price || 0;
  const discountedTotal = Math.max(0, total - voucherDiscount);
  const progressStage = step === 1 ? 1 : step <= 4 ? 2 : 3;
  const chooseDate = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) return;
    setSelectedDate(date); setSelectedTime(''); setSubmitError('');
  };
  const summary = useMemo(() => ({
    doctor: autoAssign ? 'Trung tâm sắp xếp' : selectedDoctor?.name || '',
  }), [autoAssign, selectedDoctor]);

  useEffect(() => {
    let cancelled = false;
    setVoucherCode(''); setVoucherDiscount(0); setVoucherMessage('');
    if(userPackage) return;
    try {
      const raw = localStorage.getItem('mld_pending_voucher');
      if (!raw || !selectedService) return;
      const pending = JSON.parse(raw);
      if (pending.scope === 'course') return;
      apiClient.applyVoucher(pending.code, selectedService.price, 'service', selectedService.category).then((response) => {
        if (cancelled) return;
        if (response?.valid) {
          setVoucherCode(response.code);
          setVoucherDiscount(response.discountAmount);
          setVoucherMessage(response.message);
        } else {
          setVoucherCode('');
          setVoucherDiscount(0);
          setVoucherMessage(response?.error || 'Mã ưu đãi không phù hợp với dịch vụ này.');
        }
      });
    } catch {
      try { localStorage.removeItem('mld_pending_voucher'); } catch { /* Storage may be unavailable in the webview. */ }
    }
    return () => { cancelled = true; };
  }, [selectedService]);

  const goBack = () => step === 1 ? onClose() : setStep((value) => (value - 1) as BookingStep);
  useBackAction(step > 1 || submitting, () => { if (!submissionLock.current) goBack(); }, 1);
  const goNext = () => {
    if (!selectedService || !selectedBranch || (step === 3 && !autoAssign && !selectedDoctor)) {
      setSubmitError('Vui lòng chọn dịch vụ, chi nhánh và chuyên viên phù hợp.');
      return;
    }
    if (step === 4 && (!selectedTime || !slotsReady || !availableSlots.some(slot => slot.startTime.slice(0, 5) + ' - ' + slot.endTime.slice(0, 5) === selectedTime))) { setSubmitError('Vui lòng chọn giờ hẹn còn trống.'); return; }
    if (step === 5 && (!customerName.trim() || !/^(?:0|\+?84)[1-9]\d{8,9}$/.test(customerPhone))) { setSubmitError('Vui lòng nhập họ tên và số điện thoại hợp lệ.'); return; }
    if (step === 5 && customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) { setSubmitError('Vui lòng nhập email hợp lệ hoặc để trống.'); return; }
    setSubmitError('');
    setStep((value) => Math.min(7, value + 1) as BookingStep);
  };

  const finishBooking = async () => {
    if (submissionLock.current) return;
    if (!selectedTime || !slotsReady || !availableSlots.some(slot => slot.startTime.slice(0, 5) + ' - ' + slot.endTime.slice(0, 5) === selectedTime)) { setSubmitError('Vui lòng chọn giờ hẹn còn trống.'); return; }
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }
    setSubmitError('');
    submissionLock.current = true;
    setSubmitting(true);
    const payload = {
      serviceId: selectedService.id,
      doctorId: autoAssign ? undefined : selectedDoctor?.id,
      branchId: selectedBranch.id,
      date: selectedDate,
      timeSlot: selectedTime,
      userName: customerName,
      userPhone: customerPhone,
      paymentMethod: 'CASH_AT_SPA',
      expectedFinalPrice: discountedTotal,
      userPackageId:userPackage?.id,
      notes: [customerEmail.trim() ? `Email liên hệ: ${customerEmail.trim()}` : '', note.trim()].filter(Boolean).join('\n'),
      voucherCode: voucherCode || undefined,
    };
    try {
      const response = await apiClient.createBooking(payload,currentUser?.id);
      if (response?.booking?.id) {
        if (voucherCode) { try { localStorage.removeItem('mld_pending_voucher'); } catch { /* Booking is already saved. */ } }
        return onBookingSuccess(response.booking);
      }
      if (response?.code === 'PRICE_CHANGED') {
        if(response.pricing){
          setVoucherDiscount(Number(response.pricing.discount)||0);
        }
        apiClient.invalidateReadPaths(['/services']);
        const fresh = await apiClient.getServices();
        const updated = fresh?.services?.find((item: MedicalService) => item.id === selectedService.id);
        if (updated) setSelectedService(updated);
        setStep(6);
      }
      setSubmitError(response?.error || 'Không thể đặt lịch. Vui lòng thử lại.');
    } catch { setSubmitError('Không thể đặt lịch. Vui lòng thử lại.'); }
    finally { submissionLock.current = false; setSubmitting(false); }
  };

  if (!selectedService || !selectedBranch) return (
    <section className="booking-flow"><header className="booking-header"><button type="button" onClick={onClose} title="Đóng đặt lịch" className="booking-back"><ArrowLeftIcon size={20} /></button></header><main className="booking-body"><p role="status"></p></main><footer className="booking-footer"><div className="booking-footer-summary">Chưa thể đặt lịch</div><button disabled type="button">Tiếp tục</button></footer></section>
  );

  return (
    <section className="booking-flow" aria-labelledby="booking-step-heading" data-step={step}>
      <header className="booking-header">
        <div className="booking-topbar">
          <button type="button" title="Quay lại" disabled={submitting} onClick={goBack} className="booking-back"><ArrowLeftIcon size={20} /></button>
          <span>ĐẶT LỊCH</span>
        </div>
        <h1 id="booking-step-heading">{stepTitles[step].title}</h1>
        <p className="booking-subtitle">{stepTitles[step].subtitle}</p>
        <ol className="booking-progress" aria-label="Tiến trình đặt lịch">
          {['Dịch vụ', 'Lịch hẹn', 'Xác nhận', 'Hoàn tất'].map((label, index) => (
            <li key={label} className={index + 1 <= progressStage ? 'is-active' : ''} aria-current={index + 1 === progressStage ? 'step' : undefined}><span />{label}</li>
          ))}
        </ol>
      </header>

      <main ref={body} className="booking-body" tabIndex={0} aria-label={stepTitles[step].title}>
        {step === 1 && <div className="booking-section">
          <SearchField placeholder="Tìm dịch vụ chăm sóc..." value={serviceSearch} onChange={setServiceSearch} />
          <div className="booking-categories" role="group" aria-label="Danh mục dịch vụ">{['', ...categories].map(item => <button key={item} type="button" aria-pressed={serviceCategory === item} onClick={() => setServiceCategory(item)}>{item || 'Tất cả'}</button>)}</div>
          {visibleServices.map(service => { const active = selectedService?.id === service.id; return <button key={service.id} type="button" aria-pressed={active} onClick={() => { setSelectedService(service); setSelectedTime(''); }} className="booking-choice booking-service-choice"><div className="booking-choice-heading"><Radio active={active} square />{active ? `Đã chọn · ${service.title}` : service.title}</div><EntityImage src={service.image} alt={service.title} className="booking-service-photo" /><div className="booking-price"><span>{service.durationMinutes} phút</span><strong>{service.price.toLocaleString('vi-VN')}đ</strong></div></button>; })}
        </div>}

        {step === 2 && <div className="booking-section">
          <SearchField placeholder="Tìm chi nhánh, địa chỉ..." value={branchSearch} onChange={setBranchSearch} />
          <label className="booking-filter">Tỉnh / thành phố<select aria-label="Tỉnh / thành phố" value={branchCity} onChange={event => setBranchCity(event.target.value)}><option value="">Tất cả tỉnh / thành phố</option>{Array.from(new Set(branches.map(branch => branch.city).filter(Boolean))).map(city => <option key={city} value={city}>{city}</option>)}</select></label>
          <div className="booking-view-modes" role="group" aria-label="Hiển thị chi nhánh"><button type="button" aria-pressed={branchMode === 'list'} onClick={() => setBranchMode('list')}>Danh sách</button><button type="button" aria-pressed={branchMode === 'map'} onClick={() => setBranchMode('map')}>Bản đồ</button></div>
          {!visibleBranches.length && <p className="text-xs"></p>}
          {branchMode === 'map' && visibleBranches.length > 0 && <div className="booking-branch-map"><label className="booking-filter">Chi nhánh trên bản đồ<select aria-label="Chi nhánh trên bản đồ" value={visibleBranches.some(branch => branch.id === selectedBranch.id) ? selectedBranch.id : ''} onChange={event => { const branch = branches.find(branch => branch.id === event.target.value); if (branch) { setSelectedBranch(branch); setSelectedTime(''); } }}><option value="" disabled>Chọn chi nhánh</option>{visibleBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>{visibleBranches.some(branch => branch.id === selectedBranch.id) && <BranchMap branch={selectedBranch} />}</div>}
          {branchMode === 'list' && visibleBranches.map(branch => { const active = selectedBranch?.id === branch.id; return <button key={branch.id} type="button" aria-pressed={active} onClick={() => { setSelectedBranch(branch); setSelectedTime(''); }} className="booking-choice booking-branch-choice"><div className="booking-choice-heading"><Radio active={active} /><span>{active ? 'Đang chọn · ' : ''}{branch.name}</span></div><EntityImage src={branch.imageUrl} alt={branch.name} className="booking-branch-photo" /><p className="booking-branch-address">{branch.address || ''}</p></button>; })}
        </div>}

        {step === 3 && <div className="booking-section">
          <button type="button" onClick={() => { setAutoAssign(true); setSelectedTime(''); }} aria-pressed={autoAssign} className="booking-auto-assign"><span className="booking-choice-heading"><Radio active={autoAssign} />Để trung tâm sắp xếp</span><p>Hệ thống sẽ lựa chọn chuyên viên phù hợp với dịch vụ và lịch hẹn.</p></button>
          <label className="booking-filter">Lọc theo chuyên môn<select aria-label="Lọc theo chuyên môn" value={doctorSpecialty} onChange={event => setDoctorSpecialty(event.target.value)}><option value="">Tất cả · {selectedBranch.name}</option>{specialties.map(specialty => <option key={specialty}>{specialty}</option>)}</select></label>
          {!visibleDoctors.length && <p className="booking-empty"></p>}
          {visibleDoctors.map(doctor => { const active = !autoAssign && selectedDoctor?.id === doctor.id; return <button key={doctor.id} type="button" aria-pressed={active} onClick={() => { setAutoAssign(false); setSelectedDoctor(doctor); setSelectedTime(''); }} className="booking-choice booking-doctor-choice"><div className="booking-choice-heading"><Radio active={active} />{active ? 'Chuyên viên ưu tiên' : 'Chọn chuyên viên'}</div><div className="booking-doctor-info"><EntityImage src={doctor.avatar} alt={doctor.name} className="booking-doctor-photo" /><div><h2>{doctor.name}</h2><p>{doctor.title || doctor.specialty}</p><span>{doctor.reviewsCount > 0 && Number.isFinite(doctor.rating) ? `${doctor.rating}/5 · ${doctor.reviewsCount} đánh giá` : ''}</span>{doctor.experienceYears != null && <p>{doctor.experienceYears} năm kinh nghiệm</p>}</div></div></button>; })}
        </div>}

        {step === 4 && <div className="booking-section booking-date-section">
          <div className="booking-appointment-summary"><strong>{selectedService.title}</strong><p>{selectedBranch.name} · {summary.doctor} · {selectedService.durationMinutes} phút</p><div><strong>Đang chọn</strong><strong>{selectedTime || 'Chưa chọn giờ'}</strong></div></div>
          <div className="booking-calendar"><div className="booking-calendar-heading"><button type="button" title="Tuần trước" disabled={availableDates[0] <= today} onClick={() => chooseDate(shiftDate(selectedDate, -7) < today ? today : shiftDate(selectedDate, -7))}><ArrowLeftIcon size={16} /></button><strong>{new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDate}T12:00:00Z`))}</strong><button type="button" title="Tuần sau" onClick={() => chooseDate(shiftDate(selectedDate, 7))}><ArrowRightIcon size={16} /></button></div><div className="booking-week">{availableDates.map(date => <button key={date} type="button" aria-label={date} aria-pressed={selectedDate === date} disabled={date < today} onClick={() => chooseDate(date)}><span>{dayLabels[new Date(`${date}T12:00:00Z`).getUTCDay()]}</span><strong>{date.slice(8)}</strong></button>)}</div><label className="booking-month-picker"><CalendarIcon size={17} />Mở lịch tháng<input type="date" aria-label="Chọn ngày trong lịch tháng" min={today} value={selectedDate} onChange={event => chooseDate(event.target.value)} /></label><p className="booking-date-caption">{availableDates[0].split('-').reverse().join('/')} – {availableDates[6].split('-').reverse().join('/')}</p></div>
          {slotsLoading && <p role="status" className="text-xs">Đang tải giờ hẹn...</p>}
          {slotsError && <p role="alert" className="text-xs text-red-700">{slotsError} <button onClick={() => setSlotsVersion(value => value + 1)}>Thử lại</button></p>}
          {!slotsLoading && !slotsError && !availableSlots.length && <p className="booking-empty"></p>}
          <TimeSlots title="Buổi sáng" slots={morningSlots} selected={selectedTime} onSelect={setSelectedTime} /><TimeSlots title="Buổi chiều" slots={afternoonSlots} selected={selectedTime} onSelect={setSelectedTime} /><TimeSlots title="Buổi tối" slots={eveningSlots} selected={selectedTime} onSelect={setSelectedTime} />
        </div>}

        {step === 5 && <div className="booking-section booking-recipient">
          <fieldset className="booking-recipient-modes"><legend className="sr-only">Người sử dụng dịch vụ</legend>{([['self', 'Tôi sử dụng dịch vụ'], ['other', 'Đặt cho người khác']] as const).map(([mode, label]) => <label key={mode}><input type="radio" name="booking-recipient" value={mode} checked={customerMode === mode} onChange={() => chooseRecipient(mode)} /><Radio active={customerMode === mode} />{label}</label>)}</fieldset>
          <InputField label="Họ và tên" required value={customerName} maxLength={150} onChange={value => { setCustomerName(value); setSubmitError(''); }} readOnly={customerMode === 'self'} /><InputField label="Số điện thoại" required type="tel" value={customerPhone} maxLength={16} onChange={value => { setCustomerPhone(value); setSubmitError(''); }} readOnly={customerMode === 'self'} /><InputField label="Email (tùy chọn)" type="email" maxLength={254} value={customerEmail} onChange={value => { setCustomerEmail(value); setSubmitError(''); }} />
          <label className="booking-input-field">Ghi chú<textarea value={note} maxLength={9600} rows={3} onChange={event => setNote(event.target.value)} /></label>
        </div>}

        {step === 6 && <div className="booking-section">
          <p className="booking-review-notice">Vui lòng kiểm tra thông tin. Lịch hẹn chỉ được lưu sau khi bạn xác nhận ở bước tiếp theo.</p>
          <article className="booking-review-card"><EntityImage src={selectedService.image} alt={selectedService.title} className="booking-review-photo" /><h2>{selectedService.title}</h2><ReviewRow label="Thời lượng chăm sóc" value={`${selectedService.durationMinutes} phút`} /><button type="button" onClick={() => setStep(1)}>Sửa dịch vụ</button><h3>{selectedBranch.name}</h3><p>{selectedBranch.address || ''}</p><button type="button" onClick={() => setStep(2)}>Sửa chi nhánh</button><ReviewRow label="Chuyên viên" value={summary.doctor} /><ReviewRow label="Ngày hẹn" value={selectedDate.split('-').reverse().join('/')} /><ReviewRow label="Giờ hẹn" value={selectedTime} /><button type="button" onClick={() => setStep(4)}>Sửa ngày và giờ</button><ReviewRow label="Khách hàng" value={customerName} /><ReviewRow label="Số điện thoại" value={customerPhone} />{customerEmail.trim() && <ReviewRow label="Email liên hệ" value={customerEmail.trim()} />}{note.trim() && <p className="booking-review-note">{note.trim()}</p>}<button type="button" onClick={() => setStep(5)}>Sửa thông tin</button></article>
        </div>}

        {step === 7 && <div className="booking-section">
          <div className="booking-review-notice booking-payment-notice"><ClockIcon size={20} /><div><strong>Thanh toán tại chi nhánh</strong><p>Chưa phát sinh giao dịch thanh toán. Vui lòng thanh toán khi đến sử dụng dịch vụ.</p></div></div>
          <section className="booking-payment-total"><h2>Tổng dự kiến {discountedTotal.toLocaleString('vi-VN')}đ</h2><ReviewRow label="Giá dịch vụ" value={`${total.toLocaleString('vi-VN')}đ`} />{voucherDiscount > 0 && <ReviewRow label="Ưu đãi" value={`−${voucherDiscount.toLocaleString('vi-VN')}đ`} />}<ReviewRow label="Thanh toán tại chi nhánh" value={`${discountedTotal.toLocaleString('vi-VN')}đ`} />{voucherMessage && <p>{voucherMessage}</p>}{voucherCode&&<button type="button" disabled={submitting} onClick={()=>{setVoucherCode('');setVoucherDiscount(0);setVoucherMessage('');setSubmitError('');try{localStorage.removeItem('mld_pending_voucher');}catch{}}}>Bỏ mã ưu đãi</button>}</section>
          <fieldset className="booking-payment-method"><legend className="sr-only">Phương thức thanh toán</legend><label><input type="radio" name="payment-method" value="CASH_AT_SPA" checked readOnly /><Radio active />Thanh toán tại chi nhánh</label></fieldset>
        </div>}

      </main>

      <footer className="booking-footer">{submitError && <div role="alert" className="booking-error">{submitError}</div>}<div className="booking-footer-summary">{userPackage ? `${userPackage.name} · Giữ 1 buổi, không thu phí buổi này` : step >= 6 ? `Tổng dự kiến ${discountedTotal.toLocaleString('vi-VN')}đ · Thanh toán tại chi nhánh` : step === 5 ? '' : step === 1 ? `1 dịch vụ · ${selectedService.durationMinutes} phút · ${total.toLocaleString('vi-VN')}đ` : step === 2 ? `Đang chọn: ${selectedBranch.name}` : step === 3 ? summary.doctor : `${selectedDate.split('-').reverse().join('/')} · ${selectedTime || 'Chưa chọn giờ'} · ${selectedService.durationMinutes} phút`}</div><button type="button" onClick={step === 7 || (userPackage && step===6) ? finishBooking : goNext} disabled={submitting || (step === 4 && (!selectedTime || !slotsReady))}>{submitting ? 'Đang kiểm tra lịch...' : userPackage&&step===6 ? 'Xác nhận giữ buổi' : stepTitles[step].action}</button></footer>
    </section>
  );
};

const SearchField = ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) => <label className="booking-search"><span><SearchIcon size={19} /></span><input aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
const Radio = ({ active, square = false }: { active: boolean; square?: boolean }) => <span aria-hidden="true" className={`booking-radio ${active ? 'is-active' : ''} ${square ? 'is-square' : ''}`}>{active && <CheckIcon size={12} color="#fff" />}</span>;
const TimeSlots = ({ title, slots, selected, onSelect }: { title: string; slots: string[]; selected: string; onSelect: (slot: string) => void }) => !slots.length ? null : <section className="booking-time-group"><h2>{title}</h2><div>{slots.map(slot => <button key={slot} type="button" aria-pressed={selected === slot} aria-label={slot} onClick={() => onSelect(slot)}><ClockIcon size={13} />{slot.split(' ')[0]}</button>)}</div></section>;
const InputField = ({ label, value, onChange, readOnly = false, required = false, type = 'text', maxLength }: { label: string; value: string; onChange: (value: string) => void; readOnly?: boolean; required?: boolean; type?: string; maxLength?: number }) => <label className="booking-input-field"><span>{label}{required && <span className="booking-required"> *</span>}</span><input aria-label={label} type={type} required={required} maxLength={maxLength} value={value} readOnly={readOnly} onChange={event => onChange(event.target.value)} /></label>;
const ReviewRow = ({ label, value }: { label: string; value: string }) => <div className="booking-review-row"><span>{label}</span><strong>{value}</strong></div>;
