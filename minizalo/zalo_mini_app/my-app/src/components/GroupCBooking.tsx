import React, { useEffect, useMemo, useState } from 'react';
import { MedicalService, Doctor, Branch, Booking } from '../../../../backend/src/data/database';
import { apiClient } from '../api/client';
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ClockIcon, SearchIcon } from '@/components/Icons';

interface GroupCBookingProps {
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

const stepTitles: Record<BookingStep, { title: string; subtitle: string; action: string }> = {
  1: { title: 'Chọn dịch vụ', subtitle: 'Lựa chọn dịch vụ chăm sóc phù hợp với bạn.', action: 'Tiếp tục' },
  2: { title: 'Chọn chi nhánh', subtitle: 'Bạn muốn trải nghiệm dịch vụ tại cơ sở nào?', action: 'Tiếp tục chọn chuyên viên' },
  3: { title: 'Chọn chuyên viên', subtitle: 'Chọn người đồng hành cùng bạn trong buổi chăm sóc.', action: 'Chọn ngày và giờ' },
  4: { title: 'Chọn ngày và giờ', subtitle: 'Lựa chọn thời gian phù hợp với lịch của bạn.', action: 'Tiếp tục' },
  5: { title: 'Thông tin đặt lịch', subtitle: 'Vui lòng kiểm tra và bổ sung thông tin người sử dụng dịch vụ.', action: 'Kiểm tra đặt lịch' },
  6: { title: 'Xác nhận đặt lịch', subtitle: 'Kiểm tra thông tin trước khi hoàn tất.', action: 'Tiếp tục xác nhận' },
  7: { title: 'Thanh toán', subtitle: 'Chọn phương thức thanh toán thuận tiện cho bạn.', action: 'Xác nhận đặt lịch' },
};

export const GroupCBooking: React.FC<GroupCBookingProps> = ({
  initialService, initialBranch, initialDoctor, allServices, doctors, branches, onClose, onBookingSuccess,
}) => {
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedService, setSelectedService] = useState<MedicalService>(initialService || allServices[0]);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(initialBranch || branches[0]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(initialDoctor || doctors[0]);
  const [autoAssign, setAutoAssign] = useState(!initialDoctor);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const categories = Array.from(new Set(allServices.map(service => service.category))).filter(Boolean);
  const visibleServices = allServices.filter(service => (!serviceCategory || service.category === serviceCategory) && `${service.title} ${service.description}`.toLowerCase().includes(serviceSearch.toLowerCase()));
  const visibleBranches = branches.filter(branch => (!branchCity || branch.city === branchCity) && `${branch.name} ${branch.address}`.toLowerCase().includes(branchSearch.toLowerCase()));
  const availableDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date();
    value.setDate(value.getDate() + index + 1);
    return value;
  }), []);
  const formatDate = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
  const [selectedDate, setSelectedDate] = useState(() => formatDate(availableDates[0]));
  const [selectedTime, setSelectedTime] = useState('');
  const [customerMode, setCustomerMode] = useState<'self' | 'other'>('self');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selfRecipient, setSelfRecipient] = useState({ name: '', phone: '' });
  const chooseRecipient = (mode: 'self' | 'other') => {
    setCustomerMode(mode);
    setCustomerName(mode === 'self' ? selfRecipient.name : '');
    setCustomerPhone(mode === 'self' ? selfRecipient.phone : '');
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
  const branchDoctors = doctors.filter(d => d.branchId === selectedBranch?.id);
  const labelsFor = (min: number, max: number) => Array.from(new Set(slots
    .filter(slot => Number(slot.startTime.slice(0, 2)) >= min && Number(slot.startTime.slice(0, 2)) < max)
    .map(slot => slot.startTime.slice(0, 5) + ' - ' + slot.endTime.slice(0, 5))));
  const morningSlots = labelsFor(0, 12);
  const afternoonSlots = labelsFor(12, 18);
  const eveningSlots = labelsFor(18, 24);

  useEffect(() => {
    apiClient.getCurrentUser().then(result => {
      if (!result?.user) return;
      setCustomerName(result.user.name);
      setCustomerPhone(result.user.phone);
      setSelfRecipient({ name: result.user.name, phone: result.user.phone });
    });
  }, []);

  useEffect(() => {
    if (selectedDoctor?.branchId !== selectedBranch?.id) { setAutoAssign(true); }
  }, [selectedBranch?.id, selectedDoctor?.branchId]);

  useEffect(() => {
    let cancelled = false;
    setSelectedTime('');
    setSlots([]);
    setSlotsError('');
    if (!selectedBranch?.id || !selectedService?.id) return;
    setSlotsLoading(true);
    apiClient.getSlots(selectedBranch.id, selectedDate, selectedService.id, autoAssign ? undefined : selectedDoctor?.id).then(result => {
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result?.slots || result.error) { setSlotsError(result?.error || 'Không thể tải giờ hẹn.'); return; }
      setSlots(result.slots);
    });
    return () => { cancelled = true; };
  }, [selectedBranch?.id, selectedService?.id, selectedDate, autoAssign, selectedDoctor?.id, slotsVersion]);
  const total = selectedService?.price || 0;
  const discountedTotal = Math.max(0, total - voucherDiscount);
  const progressStage = step === 1 ? 1 : step <= 4 ? 2 : 3;
  const selectedDateNumber = selectedDate.split('-')[2];
  const summary = useMemo(() => ({
    doctor: autoAssign ? 'Trung tâm sắp xếp' : selectedDoctor?.name || '',
  }), [autoAssign, selectedDoctor]);

  useEffect(() => {
    const raw = localStorage.getItem('mld_pending_voucher');
    if (!raw || !selectedService) return;
    try {
      const pending = JSON.parse(raw);
      if (pending.scope === 'course') return;
      apiClient.applyVoucher(pending.code, selectedService.price, 'service', selectedService.category).then((response) => {
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
      localStorage.removeItem('mld_pending_voucher');
    }
  }, [selectedService]);

  const goBack = () => step === 1 ? onClose() : setStep((value) => (value - 1) as BookingStep);
  const goNext = () => {
    if (!selectedService || !selectedBranch || (step === 3 && !autoAssign && !selectedDoctor)) {
      setSubmitError('Vui lòng chọn dịch vụ, chi nhánh và chuyên viên phù hợp.');
      return;
    }
    if (step === 4 && !selectedTime) { setSubmitError('Vui lòng chọn giờ hẹn còn trống.'); return; }
    if (step === 5 && (!customerName.trim() || !/^(?:0|\+?84)[1-9]\d{8,9}$/.test(customerPhone))) { setSubmitError('Vui lòng nhập họ tên và số điện thoại hợp lệ.'); return; }
    setSubmitError('');
    setStep((value) => Math.min(7, value + 1) as BookingStep);
  };

  const finishBooking = async () => {
    if (submitting) return;
    if (!selectedTime || !slots.some(slot => slot.startTime.slice(0, 5) + ' - ' + slot.endTime.slice(0, 5) === selectedTime)) { setSubmitError('Vui lòng chọn giờ hẹn còn trống.'); return; }
    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }
    setSubmitError('');
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
      notes: note,
      voucherCode: voucherCode || undefined,
    };
    const response = await apiClient.createBooking(payload);
    setSubmitting(false);
    if (response?.booking) {
      if (voucherCode) localStorage.removeItem('mld_pending_voucher');
      return onBookingSuccess(response.booking);
    }
    setSubmitError(response?.error || 'Không thể đặt lịch. Vui lòng thử lại.');
  };

  if (!selectedService || !selectedBranch) return (
    <div className="absolute inset-0 z-50 bg-[#FAF6F0] p-4 space-y-3">
      <button onClick={onClose} className="text-xs">Đóng</button>
      <p role="status" className="text-xs">Chưa có dịch vụ hoặc chi nhánh để đặt lịch.</p>
      <button disabled className="text-xs">Tiếp tục</button>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden text-[#40352F]">
      <header className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goBack} className="w-9 h-9 rounded-[8px] bg-white border border-[#DED2C5] flex items-center justify-center"><ArrowLeftIcon size={18} color="#40352F" /></button>
          <span className="text-[10px] font-semibold text-[#A65317]">ĐẶT LỊCH</span>
        </div>
        <h1 className="text-[21px] font-bold text-[#6F452C] leading-tight">{stepTitles[step].title}</h1>
        <p className="text-[11px] text-[#6F625B] mt-1">{stepTitles[step].subtitle}</p>
        <div className="grid grid-cols-4 gap-1.5 mt-3">
          {['Dịch vụ', 'Lịch hẹn', 'Xác nhận', 'Hoàn tất'].map((label, index) => (
            <div key={label} className="text-center"><div className={`h-[3px] rounded-full ${index + 1 <= progressStage ? 'bg-[#A65317]' : 'bg-white'}`} /><span className={`text-[9px] mt-1 block ${index + 1 <= progressStage ? 'text-[#A65317]' : 'text-[#8F837B]'}`}>{label}</span></div>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {step === 1 && <div className="space-y-3">
          <SearchField placeholder="Tìm dịch vụ chăm sóc..." value={serviceSearch} onChange={setServiceSearch} />
          <div className="flex flex-wrap gap-2">{['', ...categories].map(item => <button key={item} onClick={() => setServiceCategory(item)} className={`px-3 py-2 rounded-[8px] border text-[10px] ${serviceCategory === item ? 'bg-[#A65317] text-white' : 'bg-white'}`}>{item || 'Tất cả'}</button>)}</div>
          {!visibleServices.length && <p className="text-xs">Không có dịch vụ phù hợp.</p>}
          {visibleServices.map((service) => { const active = selectedService?.id === service.id; return <button key={service.id} onClick={() => setSelectedService(service)} className={`w-full text-left rounded-[10px] overflow-hidden border bg-white ${active ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="px-3 py-2 flex items-center gap-2 text-[10px]"><Radio active={active} />{active ? `Đã chọn · ${service.title}` : service.title}</div><img src={service.image} alt={service.title} className="w-full h-[170px] object-cover" /><div className="px-3 py-2 flex justify-between text-[10px]"><span>{service.durationMinutes} phút</span><strong className="text-[#A65317]">{service.price.toLocaleString('vi-VN')}đ</strong></div></button>; })}
        </div>}

        {step === 2 && <div className="space-y-3">
          <SearchField placeholder="Tìm chi nhánh, địa chỉ..." value={branchSearch} onChange={setBranchSearch} />
          <label className="block text-xs">Tỉnh / thành phố<select value={branchCity} onChange={event => setBranchCity(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-white px-3"><option value="">Tất cả tỉnh / thành phố</option>{Array.from(new Set(branches.map(branch => branch.city))).map(city => <option key={city} value={city}>{city}</option>)}</select></label>
          {!visibleBranches.length && <p className="text-xs">Không có chi nhánh phù hợp.</p>}
          {visibleBranches.map((branch) => { const active = selectedBranch?.id === branch.id; return <button key={branch.id} onClick={() => setSelectedBranch(branch)} className={`w-full rounded-[10px] border bg-white p-2 text-left ${active ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="flex items-start gap-2 px-1 py-1.5"><Radio active={active} /><div><strong className="block text-[12px]">{branch.name}</strong><span className="mt-0.5 block text-[9px] text-[#A65317]">{active ? 'Đã chọn chi nhánh' : 'Chọn chi nhánh'}</span></div></div>{branch.imageUrl && <img src={branch.imageUrl} alt={branch.name} className="mt-1 h-[180px] w-full rounded-[8px] object-cover" />}<p className="px-1 pb-1 pt-2 text-[10px] text-[#7A685D]">{branch.address}</p></button>; })}
        </div>}

        {step === 3 && <div className="space-y-3">
          <button onClick={() => setAutoAssign(true)} className={`w-full p-3 rounded-[10px] border text-left bg-white ${autoAssign ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="flex items-center gap-2 text-[11px]"><Radio active={autoAssign} />Để trung tâm sắp xếp</div><p className="text-[10px] text-[#7A685D] mt-2">Hệ thống sẽ lựa chọn chuyên viên phù hợp với dịch vụ và lịch hẹn.</p></button>
          <p className="text-xs">{selectedService.category} · {selectedBranch.name}</p>
          {branchDoctors.map((doctor) => { const active = !autoAssign && selectedDoctor?.id === doctor.id; return <button key={doctor.id} onClick={() => { setAutoAssign(false); setSelectedDoctor(doctor); }} className={`w-full rounded-[10px] border bg-white p-2 text-left ${active ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="flex items-start gap-2 px-1 py-1.5"><Radio active={active} /><div><strong className="block text-[12px]">{doctor.name}</strong><span className="mt-0.5 block text-[9px] text-[#A65317]">{active ? 'Chuyên viên ưu tiên' : doctor.title}</span></div></div><img src={doctor.avatar} alt={doctor.name} className="mt-1 h-[180px] w-full rounded-[8px] object-cover object-top" /><div className="px-1 pb-1 pt-2"><p className="text-[10px] text-[#7A685D]">{doctor.title}</p><p className="mt-1 text-[9px] text-[#7A685D]">{doctor.reviewsCount > 0 ? `★ ${doctor.rating}` : 'Chưa có đánh giá'} · {doctor.experienceYears} năm kinh nghiệm</p></div></button>; })}
        </div>}

        {step === 4 && <div className="space-y-4">
          <div className="p-3 rounded-[10px] bg-[#F3E2CE] text-[10px]"><strong>{selectedService.title}</strong><p className="mt-1">{selectedBranch.name} · {summary.doctor} · {selectedService.durationMinutes} phút</p><div className="flex justify-between mt-2"><strong>Đang chọn</strong><strong className="text-[#A65317]">{selectedTime}</strong></div></div>
          <div><div className="flex justify-between text-[11px] font-bold mb-2"><span>Ngày phù hợp</span><span>7 ngày tới</span></div><div className="grid grid-cols-7 gap-1.5">{availableDates.map((date) => { const formatted = formatDate(date); const number = String(date.getDate()).padStart(2, '0'); return <button key={formatted} onClick={() => { setSelectedDate(formatted); setSubmitError(''); }} className={`h-14 rounded-[8px] border text-[10px] ${selectedDateNumber === number ? 'bg-[#A65317] border-[#A65317] text-white' : 'bg-white border-[#DED2C5]'}`}><span className="block opacity-70">{dayLabels[date.getDay()]}</span><strong className="text-[12px]">{number}</strong></button>; })}</div></div>
          {slotsLoading && <p role="status" className="text-xs">Đang tải giờ hẹn...</p>}
          {slotsError && <p role="alert" className="text-xs text-red-700">{slotsError} <button onClick={() => setSlotsVersion(value => value + 1)}>Thử lại</button></p>}
          {!slotsLoading && !slotsError && !slots.length && <p className="text-xs">Chưa có giờ hẹn còn trống.</p>}
          <TimeSlots title="Buổi sáng" slots={morningSlots} selected={selectedTime} onSelect={setSelectedTime} /><TimeSlots title="Buổi chiều" slots={afternoonSlots} selected={selectedTime} onSelect={setSelectedTime} /><TimeSlots title="Buổi tối" slots={eveningSlots} selected={selectedTime} onSelect={setSelectedTime} />
        </div>}

        {step === 5 && <div className="space-y-3">
          <div className="p-3 rounded-[10px] bg-white border border-[#DED2C5] space-y-3"><button onClick={() => chooseRecipient('self')} className="flex items-center gap-2 text-[11px]"><Radio active={customerMode === 'self'} />Tôi sử dụng dịch vụ</button><button onClick={() => chooseRecipient('other')} className="flex items-center gap-2 text-[11px]"><Radio active={customerMode === 'other'} />Đặt cho người khác</button></div>
          <InputField label="Họ và tên *" value={customerName} onChange={setCustomerName} readOnly={customerMode === 'self'} /><InputField label="Số điện thoại *" value={customerPhone} onChange={setCustomerPhone} readOnly={customerMode === 'self'} /><InputField label="Ghi chú" value={note} onChange={setNote} />
        </div>}

        {step === 6 && <div className="space-y-3">
          <div className="p-3 rounded-[8px] bg-[#F3E2CE] text-[10px]">Kiểm tra thông tin trước khi đặt lịch.</div>
          <SummarySection title={selectedService.title} image={selectedService.image} rows={[['Thời lượng chăm sóc', `${selectedService.durationMinutes} phút`]]} /><SummarySection title={selectedBranch.name} rows={[['Địa chỉ', selectedBranch.address]]} /><SummarySection title={summary.doctor} rows={[['Ngày hẹn', selectedDate], ['Giờ hẹn', selectedTime]]} /><SummarySection title={customerName} rows={[['Số điện thoại', customerPhone]]} />
        </div>}

        {step === 7 && <div className="space-y-3 text-xs">
          <h3 className="font-bold">Xác nhận đặt lịch</h3>
          <p>Tổng dự kiến: {discountedTotal.toLocaleString('vi-VN')}đ</p>
          {voucherMessage && <p>{voucherMessage}</p>}
          <p>Thanh toán tại chi nhánh. Lịch hẹn sau khi đặt vẫn chưa thanh toán.</p>
        </div>}

      </main>

      <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#DED2C5] px-4 pt-2 pb-4">{submitError && <div role="alert" className="mb-2 rounded-[7px] border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700">{submitError}</div>}<div className="text-[9px] text-[#6F625B] mb-2 truncate">{selectedDate} · {selectedTime} · {selectedService.durationMinutes} phút</div><button onClick={step === 7 ? finishBooking : goNext} disabled={submitting} className="w-full h-11 rounded-[8px] bg-[#A65317] text-white text-[12px] font-bold disabled:opacity-60">{submitting ? 'Đang kiểm tra lịch...' : stepTitles[step].action}</button></footer>
    </div>
  );
};

const SearchField = ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (value: string) => void }) => <div className="flex gap-2"><span className="w-10 h-10 bg-white border border-[#DED2C5] rounded-[8px] flex items-center justify-center"><SearchIcon size={17} color="#A65317" /></span><input aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-10 min-w-0 flex-1 bg-white border border-[#DED2C5] rounded-[8px] px-3 text-[10px]" /></div>;
const SelectField = ({ label, value }: { label: string; value: string }) => <label className="block text-[10px] text-[#6F625B]"><span className="block mb-1">{label}</span><span className="h-10 px-3 rounded-[8px] bg-white border border-[#DED2C5] flex items-center justify-between text-[#40352F]">{value}<ChevronDownIcon size={14} color="#7A685D" /></span></label>;
const Radio = ({ active }: { active: boolean }) => <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'bg-[#A65317] border-[#A65317]' : 'bg-white border-[#BDAA9A]'}`}>{active && <CheckIcon size={11} color="#fff" />}</span>;
const TimeSlots = ({ title, slots, selected, onSelect }: { title: string; slots: string[]; selected: string; onSelect: (slot: string) => void }) => <div><h3 className="text-[11px] font-bold mb-2">{title}</h3><div className="grid grid-cols-3 gap-2">{slots.map((slot) => <button key={slot} onClick={() => onSelect(slot)} className={`h-10 rounded-[8px] border text-[10px] ${selected === slot ? 'bg-[#A65317] text-white border-[#A65317]' : 'bg-white border-[#DED2C5]'}`}><ClockIcon size={11} className="inline mr-1" />{slot.split(' ')[0]}</button>)}</div></div>;
const InputField = ({ label, value, onChange, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; readOnly?: boolean }) => <label className="block text-[10px] font-semibold text-[#6F625B]"><span className="block mb-1">{label}</span><input value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#DED2C5] text-[11px] text-[#40352F] outline-none focus:border-[#A65317]" /></label>;
const SummarySection = ({ title, image, rows }: { title: string; image?: string; rows: [string, string][] }) => <section className="p-3 rounded-[10px] bg-white border border-[#DED2C5] space-y-2"><h3 className="text-[12px] font-bold">{title}</h3>{image && <img src={image} alt={title} className="w-full h-28 rounded-[8px] object-cover" />}{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-[10px]"><span className="text-[#7A685D]">{label}</span><strong className="text-right">{value}</strong></div>)}</section>;
