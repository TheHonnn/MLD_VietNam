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
  6: { title: 'Xác nhận đặt lịch', subtitle: 'Kiểm tra thông tin trước khi hoàn tất.', action: 'Tiếp tục thanh toán' },
  7: { title: 'Thanh toán', subtitle: 'Chọn phương thức thanh toán thuận tiện cho bạn.', action: 'Thanh toán và hoàn tất' },
};

const categories = ['Massage thư giãn', 'Chăm sóc da', 'Chăm sóc cơ thể', 'Chăm sóc sức khỏe', 'Gói liệu trình'];

export const GroupCBooking: React.FC<GroupCBookingProps> = ({
  initialService, initialBranch, initialDoctor, allServices, doctors, branches, onClose, onBookingSuccess,
}) => {
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedService, setSelectedService] = useState<MedicalService>(initialService || allServices[0]);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(initialBranch || branches[0]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(initialDoctor || doctors[0]);
  const [autoAssign, setAutoAssign] = useState(!initialDoctor);
  const availableDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date();
    value.setDate(value.getDate() + index + 1);
    return value;
  }), []);
  const formatDate = (value: Date) => new Intl.DateTimeFormat('en-GB').format(value);
  const [selectedDate, setSelectedDate] = useState(() => formatDate(availableDates[0]));
  const [selectedTime, setSelectedTime] = useState('14:00 - 15:00');
  const [customerMode, setCustomerMode] = useState<'self' | 'other'>('self');
  const [customerName, setCustomerName] = useState('Nguyễn Minh Anh');
  const [customerPhone, setCustomerPhone] = useState('0912 345 678');
  const [customerEmail, setCustomerEmail] = useState('minh.anh@example.com');
  const [note, setNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<'deposit' | 'full'>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'cash'>('bank');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');

  const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const morningSlots = ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00'];
  const afternoonSlots = ['14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'];
  const total = selectedService?.price || 0;
  const discountedTotal = Math.max(0, total - voucherDiscount);
  const deposit = 150000;
  const payable = paymentAmount === 'deposit' ? Math.min(deposit, discountedTotal) : discountedTotal;
  const progressStage = step === 1 ? 1 : step <= 4 ? 2 : 3;
  const selectedDateNumber = selectedDate.split('/')[0];
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
  const goNext = () => setStep((value) => Math.min(7, value + 1) as BookingStep);

  const finishBooking = async () => {
    if (submitting) return;
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
      paymentMethod: paymentMethod === 'bank' ? 'vnpay' : 'hospital',
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

  return (
    <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden text-[#40352F]">
      <header className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goBack} className="w-9 h-9 rounded-[8px] bg-white border border-[#DED2C5] flex items-center justify-center"><ArrowLeftIcon size={18} color="#40352F" /></button>
          <span className="text-[10px] font-semibold text-[#A65317]">ĐẶT LỊCH · MINH HỌA</span>
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
          <SearchField placeholder="Tìm dịch vụ chăm sóc..." />
          <div className="flex flex-wrap gap-2"><button className="px-3 py-2 rounded-[8px] bg-[#A65317] text-white text-[10px]">Tất cả</button>{categories.map((item) => <button key={item} className="px-3 py-2 rounded-[8px] bg-white border border-[#DED2C5] text-[10px]">{item}</button>)}</div>
          {allServices.map((service) => { const active = selectedService?.id === service.id; return <button key={service.id} onClick={() => setSelectedService(service)} className={`w-full text-left rounded-[10px] overflow-hidden border bg-white ${active ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="px-3 py-2 flex items-center gap-2 text-[10px]"><Radio active={active} />{active ? `Đã chọn · ${service.title}` : service.title}</div><img src={service.image} alt={service.title} className="w-full h-[170px] object-cover" /><div className="px-3 py-2 flex justify-between text-[10px]"><span>{service.durationMinutes} phút</span><strong className="text-[#A65317]">{service.price.toLocaleString('vi-VN')}đ</strong></div></button>; })}
        </div>}

        {step === 2 && <div className="space-y-3">
          <SearchField placeholder="Tìm chi nhánh, địa chỉ..." /><SelectField label="Tỉnh / thành phố" value="Tất cả tỉnh / thành phố" />
          <div className="flex gap-2"><button className="px-4 h-10 rounded-[8px] bg-[#A65317] text-white text-[10px]">Danh sách</button><button className="px-4 h-10 rounded-[8px] bg-white border border-[#DED2C5] text-[10px]">Bản đồ</button></div>
          {branches.map((branch) => { const active = selectedBranch?.id === branch.id; return <button key={branch.id} onClick={() => setSelectedBranch(branch)} className={`w-full rounded-[10px] border bg-white p-2 text-left ${active ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="flex items-start gap-2 px-1 py-1.5"><Radio active={active} /><div><strong className="block text-[12px]">{branch.name}</strong><span className="mt-0.5 block text-[9px] text-[#A65317]">{active ? 'Có thể đặt lịch tại chi nhánh này' : 'Chọn chi nhánh'}</span></div></div><img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&auto=format&fit=crop&q=80" alt={branch.name} className="mt-1 h-[180px] w-full rounded-[8px] object-cover" /><p className="px-1 pb-1 pt-2 text-[10px] text-[#7A685D]">{branch.address}</p></button>; })}
        </div>}

        {step === 3 && <div className="space-y-3">
          <button onClick={() => setAutoAssign(true)} className={`w-full p-3 rounded-[10px] border text-left bg-white ${autoAssign ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="flex items-center gap-2 text-[11px]"><Radio active={autoAssign} />Để trung tâm sắp xếp</div><p className="text-[10px] text-[#7A685D] mt-2">Hệ thống sẽ lựa chọn chuyên viên phù hợp với dịch vụ và lịch hẹn.</p></button>
          <SelectField label="Lọc theo chuyên môn" value={`${selectedService.category} · ${selectedBranch.name}`} />
          {doctors.map((doctor) => { const active = !autoAssign && selectedDoctor?.id === doctor.id; return <button key={doctor.id} onClick={() => { setAutoAssign(false); setSelectedDoctor(doctor); }} className={`w-full rounded-[10px] border bg-white p-2 text-left ${active ? 'border-[#A65317]' : 'border-[#DED2C5]'}`}><div className="flex items-start gap-2 px-1 py-1.5"><Radio active={active} /><div><strong className="block text-[12px]">{doctor.name}</strong><span className="mt-0.5 block text-[9px] text-[#A65317]">{active ? 'Chuyên viên ưu tiên' : doctor.title}</span></div></div><img src={doctor.avatar} alt={doctor.name} className="mt-1 h-[180px] w-full rounded-[8px] object-cover object-top" /><div className="px-1 pb-1 pt-2"><p className="text-[10px] text-[#7A685D]">{doctor.title}</p><p className="mt-1 text-[9px] text-[#7A685D]">★ {doctor.rating} · {doctor.experienceYears} năm kinh nghiệm</p></div></button>; })}
        </div>}

        {step === 4 && <div className="space-y-4">
          <div className="p-3 rounded-[10px] bg-[#F3E2CE] text-[10px]"><strong>{selectedService.title}</strong><p className="mt-1">{selectedBranch.name} · {summary.doctor} · {selectedService.durationMinutes} phút</p><div className="flex justify-between mt-2"><strong>Đang chọn</strong><strong className="text-[#A65317]">{selectedTime}</strong></div></div>
          <div><div className="flex justify-between text-[11px] font-bold mb-2"><span>Ngày phù hợp</span><span>7 ngày tới</span></div><div className="grid grid-cols-7 gap-1.5">{availableDates.map((date) => { const formatted = formatDate(date); const number = String(date.getDate()).padStart(2, '0'); return <button key={formatted} onClick={() => { setSelectedDate(formatted); setSubmitError(''); }} className={`h-14 rounded-[8px] border text-[10px] ${selectedDateNumber === number ? 'bg-[#A65317] border-[#A65317] text-white' : 'bg-white border-[#DED2C5]'}`}><span className="block opacity-70">{dayLabels[date.getDay()]}</span><strong className="text-[12px]">{number}</strong></button>; })}</div></div>
          <TimeSlots title="Buổi sáng" slots={morningSlots} selected={selectedTime} onSelect={setSelectedTime} /><TimeSlots title="Buổi chiều" slots={afternoonSlots} selected={selectedTime} onSelect={setSelectedTime} />
        </div>}

        {step === 5 && <div className="space-y-3">
          <div className="p-3 rounded-[10px] bg-white border border-[#DED2C5] space-y-3"><button onClick={() => setCustomerMode('self')} className="flex items-center gap-2 text-[11px]"><Radio active={customerMode === 'self'} />Tôi sử dụng dịch vụ</button><button onClick={() => setCustomerMode('other')} className="flex items-center gap-2 text-[11px]"><Radio active={customerMode === 'other'} />Đặt cho người khác</button></div>
          <InputField label="Họ và tên *" value={customerName} onChange={setCustomerName} /><InputField label="Số điện thoại *" value={customerPhone} onChange={setCustomerPhone} /><InputField label="Email (tùy chọn)" value={customerEmail} onChange={setCustomerEmail} /><InputField label="Ghi chú" value={note} onChange={setNote} />
        </div>}

        {step === 6 && <div className="space-y-3">
          <div className="p-3 rounded-[8px] bg-[#F3E2CE] text-[10px]">Tóm tắt minh họa · Chưa phải lịch hẹn đã xác nhận.</div>
          <SummarySection title={selectedService.title} image={selectedService.image} rows={[['Thời lượng chăm sóc', `${selectedService.durationMinutes} phút`]]} /><SummarySection title={selectedBranch.name} rows={[['Địa chỉ', selectedBranch.address]]} /><SummarySection title={summary.doctor} rows={[['Ngày hẹn', selectedDate], ['Giờ hẹn', selectedTime]]} /><SummarySection title={customerName} rows={[['Số điện thoại', customerPhone], ['Email', customerEmail]]} />
        </div>}

        {step === 7 && <div className="space-y-3">
          <div className="p-3 rounded-[8px] bg-[#F3E2CE] text-[10px]"><strong className="text-[#A65317]">Chờ thanh toán</strong><p className="mt-1">Minh họa tĩnh · Chưa xác nhận lịch hẹn.</p></div>
          <div className="p-3 rounded-[10px] bg-[#F3E2CE] border border-[#E3D0BD] space-y-3"><h3 className="font-bold text-[15px]">Thanh toán ngay {payable.toLocaleString('vi-VN')}đ</h3>{voucherMessage && <div className={`rounded-[7px] px-2.5 py-2 text-[10px] font-semibold ${voucherCode ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{voucherMessage}</div>}{voucherCode && <div className="flex justify-between text-[10px]"><span>Mã {voucherCode}</span><strong>-{voucherDiscount.toLocaleString('vi-VN')}đ</strong></div>}<button onClick={() => setPaymentAmount('deposit')} className="flex items-center gap-2 text-[11px]"><Radio active={paymentAmount === 'deposit'} />Đặt cọc {deposit.toLocaleString('vi-VN')}đ</button><button onClick={() => setPaymentAmount('full')} className="flex items-center gap-2 text-[11px]"><Radio active={paymentAmount === 'full'} />Thanh toán toàn bộ {discountedTotal.toLocaleString('vi-VN')}đ</button><p className="text-[10px]">Còn {(discountedTotal - payable).toLocaleString('vi-VN')}đ thanh toán tại cơ sở.</p></div>
          <button onClick={() => setPaymentMethod('bank')} className={`w-full p-4 rounded-[10px] border text-left text-[11px] ${paymentMethod === 'bank' ? 'bg-[#F3E2CE] border-[#A65317]' : 'bg-white border-[#DED2C5]'}`}><span className="flex items-center gap-2"><Radio active={paymentMethod === 'bank'} />Chuyển khoản ngân hàng / QR</span></button><button onClick={() => setPaymentMethod('cash')} className={`w-full p-4 rounded-[10px] border text-left text-[11px] ${paymentMethod === 'cash' ? 'bg-[#F3E2CE] border-[#A65317]' : 'bg-white border-[#DED2C5]'}`}><span className="flex items-center gap-2"><Radio active={paymentMethod === 'cash'} />Thanh toán tại chi nhánh</span></button>
        </div>}
      </main>

      <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#DED2C5] px-4 pt-2 pb-4">{submitError && <div role="alert" className="mb-2 rounded-[7px] border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700">{submitError}</div>}<div className="text-[9px] text-[#6F625B] mb-2 truncate">{selectedDate} · {selectedTime} · {selectedService.durationMinutes} phút</div><button onClick={step === 7 ? finishBooking : goNext} disabled={submitting} className="w-full h-11 rounded-[8px] bg-[#A65317] text-white text-[12px] font-bold disabled:opacity-60">{submitting ? 'Đang kiểm tra lịch...' : stepTitles[step].action}</button></footer>
    </div>
  );
};

const SearchField = ({ placeholder }: { placeholder: string }) => <div className="flex gap-2"><span className="w-10 h-10 bg-white border border-[#DED2C5] rounded-[8px] flex items-center justify-center"><SearchIcon size={17} color="#A65317" /></span><div className="h-10 flex-1 bg-white border border-[#DED2C5] rounded-[8px] px-3 flex items-center text-[10px] text-[#8A7D74]">{placeholder}</div></div>;
const SelectField = ({ label, value }: { label: string; value: string }) => <label className="block text-[10px] text-[#6F625B]"><span className="block mb-1">{label}</span><span className="h-10 px-3 rounded-[8px] bg-white border border-[#DED2C5] flex items-center justify-between text-[#40352F]">{value}<ChevronDownIcon size={14} color="#7A685D" /></span></label>;
const Radio = ({ active }: { active: boolean }) => <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'bg-[#A65317] border-[#A65317]' : 'bg-white border-[#BDAA9A]'}`}>{active && <CheckIcon size={11} color="#fff" />}</span>;
const TimeSlots = ({ title, slots, selected, onSelect }: { title: string; slots: string[]; selected: string; onSelect: (slot: string) => void }) => <div><h3 className="text-[11px] font-bold mb-2">{title}</h3><div className="grid grid-cols-3 gap-2">{slots.map((slot) => <button key={slot} onClick={() => onSelect(slot)} className={`h-10 rounded-[8px] border text-[10px] ${selected === slot ? 'bg-[#A65317] text-white border-[#A65317]' : 'bg-white border-[#DED2C5]'}`}><ClockIcon size={11} className="inline mr-1" />{slot.split(' ')[0]}</button>)}</div></div>;
const InputField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <label className="block text-[10px] font-semibold text-[#6F625B]"><span className="block mb-1">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full h-11 px-3 rounded-[8px] bg-white border border-[#DED2C5] text-[11px] text-[#40352F] outline-none focus:border-[#A65317]" /></label>;
const SummarySection = ({ title, image, rows }: { title: string; image?: string; rows: [string, string][] }) => <section className="p-3 rounded-[10px] bg-white border border-[#DED2C5] space-y-2"><h3 className="text-[12px] font-bold">{title}</h3>{image && <img src={image} alt={title} className="w-full h-28 rounded-[8px] object-cover" />}{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-[10px]"><span className="text-[#7A685D]">{label}</span><strong className="text-right">{value}</strong></div>)}</section>;
