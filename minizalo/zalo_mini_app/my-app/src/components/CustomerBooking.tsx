import React,{useEffect,useRef,useState} from 'react';
import type {MedicalService,Branch,User,Booking} from '../../../../backend/src/data/database';
import {apiClient} from '@/api/client';
import {ArrowLeftIcon} from './Icons';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {vietnamToday} from '@/utils/catalog';
import {contactPhone} from '@/utils/phone';
import '@/css/booking-flow.scss';
import '@/css/staff-booking.scss';

type OwnedPackage={id:string;name:string;serviceId:string;status:string;totalSessions:number;completedSessions:number;reservedSessions:number;expiresAt:string};
type Slot={startTime:string;endTime:string};
const label=(slot:Slot)=>`${slot.startTime.slice(0,5)} - ${slot.endTime.slice(0,5)}`;

export function CustomerBooking({currentUser,initialService,initialBranch,initialPackageId,initialNotes='',allServices,branches,onClose,onBookingSuccess,onCatalogUpdate}:{currentUser:User;initialService:MedicalService;initialBranch:Branch|null;initialPackageId?:string;initialNotes?:string;allServices:MedicalService[];branches:Branch[];onClose:()=>void;onBookingSuccess:(booking:Booking)=>void;onCatalogUpdate?:(services:MedicalService[])=>void}) {
  const [catalog,setCatalog]=useState(allServices),[serviceId,setServiceId]=useState(initialService.id),[branchId,setBranchId]=useState(initialBranch?.id||branches[0]?.id||'');
  const [date,setDate]=useState(vietnamToday),[time,setTime]=useState(''),[slots,setSlots]=useState<Slot[]>([]),[dates,setDates]=useState<string[]>([]);
  const [version,setVersion]=useState(0),[loading,setLoading]=useState(true),[slotsError,setSlotsError]=useState(''),[slotsFor,setSlotsFor]=useState('');
  const [forSelf,setForSelf]=useState(true),[name,setName]=useState(currentUser.name),[phone,setPhone]=useState(currentUser.phone),[notes,setNotes]=useState(initialNotes),[email,setEmail]=useState(currentUser.email||''),[address,setAddress]=useState(currentUser.address||'');
  const [packages,setPackages]=useState<OwnedPackage[]>([]),[packageId,setPackageId]=useState(initialPackageId||''),[packageError,setPackageError]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const locked=useRef(false),mounted=useRef(true),epoch=useRef(apiClient.sessionVersion());
  const service=catalog.find(item=>item.id===serviceId),key=JSON.stringify([branchId,serviceId,date,version]);
  const ready=slotsFor===key&&!loading&&!slotsError;
  const availablePackages=packages.filter(item=>item.serviceId===serviceId&&item.status.toUpperCase()==='ACTIVE'&&item.totalSessions-item.completedSessions-item.reservedSessions>0&&Date.parse(item.expiresAt)>Date.parse(`${date}T23:59:59+07:00`));
  const packageReady=!packageId||availablePackages.some(item=>item.id===packageId);
  const valid=Boolean(service&&branches.some(item=>item.id===branchId)&&ready&&slots.some(slot=>label(slot)===time)&&name.trim()&&contactPhone(phone)&&(!email.trim()||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))&&packageReady);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>setCatalog(allServices),[allServices]);
  useBackAction(true,()=>{if(!locked.current)onClose();},1);
  useEffect(()=>{
    let active=true;
    apiClient.getTreatmentPlans().then(result=>{
      if(!active)return;
      if(!Array.isArray(result?.treatmentPlans)){setPackageError(result?.error||'Không thể tải liệu trình.');return;}
      setPackages(result.treatmentPlans);
    });
    return()=>{active=false;};
  },[currentUser.id,version]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();
    setLoading(true);setSlotsError('');setSlotsFor('');setTime('');
    apiClient.getSlots(branchId,date,serviceId,undefined,controller.signal).then(result=>{
      if(!active)return;
      if(!Array.isArray(result?.slots)){setSlotsError(result?.error||'Không thể tải giờ trống.');return;}
      setSlots(result.slots.filter((slot:Slot)=>typeof slot.startTime==='string'&&typeof slot.endTime==='string'));setSlotsFor(key);
    }).finally(()=>{if(active)setLoading(false);});
    const through=new Date(Date.parse(date+'T12:00:00Z')+30*86400000).toISOString().slice(0,10);
    setDates([]);
    apiClient.getSlotDates(branchId,date,through,serviceId,undefined,controller.signal).then(result=>{if(active&&Array.isArray(result?.dates))setDates(result.dates);});
    return()=>{active=false;controller.abort();};
  },[key]);
  const submit=async()=>{
    if(locked.current||!valid||!service)return;
    locked.current=true;setBusy(true);setError('');
    try{
      const result=await apiClient.createBooking({serviceId,branchId,date,timeSlot:time,people:1,bookedForName:name.trim(),bookedForPhone:contactPhone(phone),specialNotes:[notes.trim(),email.trim()?`Email liên hệ: ${email.trim()}`:'',address.trim()?`Địa chỉ liên hệ: ${address.trim()}`:''].filter(Boolean).join('\n'),expectedFinalPrice:packageId?0:service.price,...(packageId?{userPackageId:packageId}:{})},currentUser.id);
      if(!mounted.current||epoch.current!==apiClient.sessionVersion())return;
      if(result?.booking?.id){onBookingSuccess(result.booking);return;}
      setError(result?.error||'Không thể đặt lịch. Vui lòng thử lại.');
      if(result?.code==='PRICE_CHANGED'){
        apiClient.invalidateReadPaths(['/services']);const fresh=await apiClient.getServices();
        if(mounted.current&&epoch.current===apiClient.sessionVersion()&&Array.isArray(fresh?.services)){setCatalog(fresh.services);onCatalogUpdate?.(fresh.services);}
      }
      if(result?.status===409){setTime('');setVersion(value=>value+1);}
    }finally{locked.current=false;if(mounted.current)setBusy(false);}
  };
  return <section className="booking-flow staff-booking" aria-labelledby="customer-booking-heading">
    <header className="booking-header"><div className="booking-topbar"><button type="button" className="booking-back" title="Đóng đặt lịch" disabled={busy} onClick={onClose}><ArrowLeftIcon size={20}/></button><span>ĐẶT LỊCH</span></div><h1 id="customer-booking-heading">Đặt lịch trị liệu</h1></header>
    <main className="booking-body"><fieldset className="staff-booking-fields" disabled={busy}>
      <section><h2>Dịch vụ và lịch hẹn</h2>
        <label>Lựa chọn dịch vụ<select aria-label="Lựa chọn dịch vụ" value={serviceId} onChange={event=>{setServiceId(event.target.value);setPackageId('');setError('');}}>{catalog.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>Địa điểm cơ sở<select aria-label="Địa điểm cơ sở" value={branchId} onChange={event=>setBranchId(event.target.value)}>{branches.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Ngày đến<input type="date" aria-label="Ngày đến" value={date} min={vietnamToday()} onChange={event=>{const value=event.target.value;if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>=vietnamToday()&&Number.isFinite(Date.parse(value)))setDate(value);}}/></label>
        {dates.length>0&&<label>Ngày có lịch trống<select aria-label="Ngày có lịch trống" value={dates.includes(date)?date:''} onChange={event=>setDate(event.target.value)}><option value="" disabled>Chọn ngày</option>{dates.map(day=><option key={day} value={day}>{day.split('-').reverse().join('/')}</option>)}</select></label>}
        <h3>Khung giờ đến</h3>{loading&&<p role="status">Đang tải giờ trống...</p>}{slotsError&&<p role="alert">{slotsError}</p>}
        <div className="staff-slot-grid">{ready&&Array.from(new Set(slots.map(label))).map(value=><button key={value} type="button" aria-pressed={time===value} onClick={()=>setTime(value)}>{value}</button>)}</div>
        <button type="button" className="staff-refresh" onClick={()=>setVersion(value=>value+1)}>Cập nhật giờ trống</button>
      </section>
      <section><h2>Thông tin người sử dụng</h2><div className="staff-customer-modes">{([true,false]).map(value=><label key={String(value)}><input type="radio" name="booking-recipient" checked={forSelf===value} onChange={()=>{setForSelf(value);setName(value?currentUser.name:'');setPhone(value?currentUser.phone:'');setEmail(value?currentUser.email||'':'');setAddress(value?currentUser.address||'':'');}}/>{value?'Bản thân':'Đặt hộ người khác'}</label>)}</div>
        <label>Họ và tên<input aria-label="Họ tên người sử dụng" value={name} maxLength={150} autoComplete="name" onChange={event=>setName(event.target.value)}/></label>
        <label>Số điện thoại<input aria-label="Số điện thoại người sử dụng" type="tel" value={phone} maxLength={20} autoComplete="tel" onChange={event=>setPhone(event.target.value)}/></label>
        <label>Email liên hệ<input aria-label="Email liên hệ" type="email" value={email} maxLength={150} onChange={e=>setEmail(e.target.value)}/></label><label>Địa chỉ liên hệ<input aria-label="Địa chỉ liên hệ" value={address} maxLength={500} onChange={e=>setAddress(e.target.value)}/></label>
        <label>Ghi chú<textarea aria-label="Ghi chú đặt lịch" value={notes} maxLength={9000} onChange={event=>setNotes(event.target.value)}/></label>
        {(availablePackages.length>0||packageId)&&<label>Liệu trình của tôi<select aria-label="Liệu trình của tôi" value={packageId} onChange={event=>setPackageId(event.target.value)}><option value="">Không dùng liệu trình</option>{!packageReady&&<option value={packageId} disabled>Liệu trình không còn khả dụng</option>}{availablePackages.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        {packageId&&packageError&&<p role="alert">{packageError}</p>}
      </section>
      <section className="booking-summary"><h2>Thông tin đặt lịch</h2><p>{service?.title}</p><p>{branches.find(b=>b.id===branchId)?.name}</p><p>{date.split('-').reverse().join('/')} · {time}</p><p>{name} · {phone}</p>{email&&<p>{email}</p>}{address&&<p>{address}</p>}</section>
    </fieldset></main>
    <footer className="booking-footer">{error&&<p role="alert" className="booking-error">{error}</p>}<div className="booking-footer-summary">{service&&`${service.durationMinutes} phút · ${packageId?'Đặt bằng liệu trình':service.price.toLocaleString('vi-VN')+'đ'}`}</div><button type="button" disabled={busy||!valid} onClick={()=>void submit()}>{busy?'Đang lưu lịch hẹn...':'Xác nhận đặt lịch'}</button></footer>
  </section>;
}
