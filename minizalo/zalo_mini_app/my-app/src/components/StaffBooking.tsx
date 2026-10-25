import React,{useEffect,useRef,useState} from 'react';
import type {MedicalService,Branch,User,Booking} from '../../../../backend/src/data/database';
import {apiClient} from '@/api/client';
import {ArrowLeftIcon} from './Icons';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {contactPhone} from '@/utils/phone';
import '@/css/booking-flow.scss';
import '@/css/staff-booking.scss';

type Customer={id:string;fullName:string;phone:string|null};
type CustomerPackage={id:string;name:string;serviceId:string;totalSessions:number;completedSessions:number;reservedSessions:number;remainingSessions:number;expiresAt:string};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const addDays=(date:string,days:number)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const slotLabel=(slot:any)=>slot.startTime.slice(0,5)+' - '+slot.endTime.slice(0,5);

export function StaffBooking({currentUser,initialService,initialBranch,initialCustomer,initialPackageId,allServices,branches,onClose,onBookingSuccess,onCatalogUpdate}:{currentUser:User;initialService:MedicalService;initialBranch:Branch|null;initialCustomer?:Customer|null;initialPackageId?:string;allServices:MedicalService[];branches:Branch[];onClose:()=>void;onBookingSuccess:(booking:Booking)=>void;onCatalogUpdate?:(items:MedicalService[])=>void}){
  const [scope,setScope]=useState<{branchId:string|null}|null>(null),[contextError,setContextError]=useState(''),[version,setVersion]=useState(0);
  const [catalog,setCatalog]=useState(allServices);
  const [people,setPeople]=useState(1);
  const [identifyGuests,setIdentifyGuests]=useState(false),[guests,setGuests]=useState<{name:string;phone:string}[]>([]);
  const validGuests=!identifyGuests||(guests.length===people&&guests.every(guest=>guest.name.trim()&&(!guest.phone.trim()||contactPhone(guest.phone))));
  const [packages,setPackages]=useState<CustomerPackage[]>([]),[packagesFor,setPackagesFor]=useState(''),[packageId,setPackageId]=useState(''),[packageError,setPackageError]=useState(''),[packagesLoading,setPackagesLoading]=useState(false);
  const [serviceId,setServiceId]=useState(initialService.id),[branchId,setBranchId]=useState(initialBranch?.id||'');
  const [date,setDate]=useState(today),[range,setRange]=useState(today),[dates,setDates]=useState<string[]>([]),[datesLoading,setDatesLoading]=useState(false),[datesError,setDatesError]=useState('');
  const [slots,setSlots]=useState<any[]>([]),[slotFor,setSlotFor]=useState(''),[slotsLoading,setSlotsLoading]=useState(false),[slotsError,setSlotsError]=useState(''),[reason,setReason]=useState(''),[selectedTime,setSelectedTime]=useState('');
  const [mode,setMode]=useState<'existing'|'new'>('existing'),[query,setQuery]=useState(initialCustomer?.phone||initialCustomer?.fullName||''),[customers,setCustomers]=useState<Customer[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[customer,setCustomer]=useState<Customer|null>(initialCustomer||null);
  const [name,setName]=useState(''),[phone,setPhone]=useState(initialCustomer?.phone||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const requestedPackage=useRef(initialPackageId||'');
  const lock=useRef(false),mounted=useRef(true),manualDate=useRef(false),epoch=useRef(apiClient.sessionVersion());
  const service=catalog.find(item=>item.id===serviceId);
  const chosenPackage=mode==='existing'&&people===1&&packagesFor===customer?.id?packages.find(item=>item.id===packageId&&item.serviceId===serviceId&&item.remainingSessions>0):undefined;
  const visibleBranches=scope?branches.filter(branch=>!scope.branchId||branch.id===scope.branchId):[];
  const key=JSON.stringify([branchId,serviceId,date,people]);
  const ready=slotFor===key&&!slotsLoading&&!slotsError;
  const labels=ready?[...new Set<string>(slots.map(slotLabel))]:[];
  const contact=contactPhone(mode==='existing'?customer?.phone||phone:phone);
  const validCustomer=Boolean(contact&&(mode==='existing'?customer:name.trim()));
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>setCatalog(allServices),[allServices]);
  useEffect(()=>{
    if(customer?.id!==initialCustomer?.id||mode!=='existing'||people!==1||serviceId!==initialService.id)requestedPackage.current='';
  },[customer?.id,mode,people,serviceId]);
  useEffect(()=>{
    setPackages([]);setPackagesFor('');setPackageId('');setPackageError('');setPackagesLoading(false);
    if(!scope||!customer||mode!=='existing'||people!==1)return;
    let active=true;const controller=new AbortController();setPackagesLoading(true);
    apiClient.getStaffCustomerPackages(customer.id,controller.signal).then(result=>{
      if(!active)return;setPackagesLoading(false);
      if(!Array.isArray(result?.packages)){setPackageError(result?.error||'Không thể tải liệu trình của khách.');return;}
      setPackages(result.packages);setPackagesFor(customer.id);
      if(requestedPackage.current&&customer.id===initialCustomer?.id){
        const requested=requestedPackage.current;requestedPackage.current='';
        if(result.packages.some((item:CustomerPackage)=>item.id===requested&&item.serviceId===serviceId&&item.remainingSessions>0))setPackageId(requested);
        else{setPackageId(requested);setPackageError('Liệu trình đã thay đổi hoặc không còn buổi khả dụng. Vui lòng chọn lại.');}
      }
    });
    return()=>{active=false;controller.abort();};
  },[scope,customer?.id,mode,people]);
  useEffect(()=>setPackageId(''),[serviceId]);
  useBackAction(true,()=>{if(!lock.current)onClose();},1);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setContextError('');setScope(null);
    apiClient.getStaffContext(controller.signal).then(result=>{
      if(!active)return;
      if(!result?.scope){setContextError(result?.error||'Không thể tải quyền đặt lịch.');setCustomer(null);setCustomers([]);return;}
      setScope(result.scope);
      setBranchId(value=>branches.some(b=>b.id===value&&(!result.scope.branchId||b.id===result.scope.branchId))?value:branches.find(b=>!result.scope.branchId||b.id===result.scope.branchId)?.id||'');
    });
    return()=>{active=false;controller.abort();};
  },[currentUser.id,version]);
  useEffect(()=>{
    if(!scope||!branchId||!serviceId)return;
    let active=true;const controller=new AbortController();setDatesLoading(true);setDatesError('');setDates([]);
    apiClient.getStaffSlots(branchId,range,serviceId,people,controller.signal,addDays(range,30)).then(result=>{
      if(!active)return;setDatesLoading(false);
      if(!Array.isArray(result?.dates)){setDatesError(result?.error||'Không thể tải ngày có lịch.');return;}
      setDates(result.dates);if(!manualDate.current&&result.dates.length)setDate(result.dates[0]);
    });
    return()=>{active=false;controller.abort();};
  },[scope,branchId,serviceId,range,people]);
  useEffect(()=>{
    if(!scope||!visibleBranches.some(b=>b.id===branchId)||!serviceId)return;
    let active=true;const controller=new AbortController();setSlotsLoading(true);setSlotsError('');setSlotFor('');
    apiClient.getStaffSlots(branchId,date,serviceId,people,controller.signal).then(result=>{
      if(!active)return;setSlotsLoading(false);
      if(!Array.isArray(result?.slots)){setSlotsError(result?.error||'Không thể tải khung giờ.');return;}
      setSlots(result.slots);setSlotFor(key);setReason(result.availabilityReason||'');
      setSelectedTime(value=>result.slots.some((slot:any)=>slotLabel(slot)===value)?value:'');
    });
    return()=>{active=false;controller.abort();};
  },[scope,branchId,serviceId,date,people]);
  useEffect(()=>{
    setCustomers([]);setSearchError('');setSearching(false);
    if(mode!=='existing'||!scope||query.trim().length<2)return;
    let active=true;const controller=new AbortController();setSearching(true);
    const timer=window.setTimeout(()=>{apiClient.getStaffCustomers(query.trim(),controller.signal).then(result=>{
      if(!active)return;setSearching(false);
      if(!Array.isArray(result?.customers)){setSearchError(result?.error||'Không thể tìm khách.');return;}
      setCustomers(result.customers);
    });},300);
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[query,mode,scope]);
  const resetDate=()=>{manualDate.current=false;setDate(today());setRange(today());setSelectedTime('');setError('');};
  const chooseDate=(value:string)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<today()||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)return;
    manualDate.current=true;setDate(value);setSelectedTime('');setError('');if(value<range||value>addDays(range,30))setRange(value);
  };
  const submit=async()=>{
    if(lock.current||!scope||!service||!ready||!labels.includes(selectedTime)||!validCustomer||!validGuests||(packageId&&!chosenPackage))return;
    lock.current=true;setBusy(true);setError('');
    const input={serviceId,branchId,date,people,timeSlot:selectedTime,expectedFinalPrice:packageId?0:service.price*people,...(identifyGuests?{guests:guests.map(guest=>({name:guest.name.trim(),phone:contactPhone(guest.phone)||''}))}:{}),...(packageId?{userPackageId:packageId}:{}),...(mode==='existing'?{customerId:customer!.id,customerPhone:contact}:{customer:{name:name.trim(),phone:contact}})};
    try{
      const result=await apiClient.createStaffBooking(input,currentUser.id);
      if(!mounted.current||epoch.current!==apiClient.sessionVersion())return;
      if(result?.booking?.id){onBookingSuccess(result.booking);return;}
      setError(result?.error||'Không thể đặt lịch. Vui lòng thử lại.');
      if(result?.code==='PRICE_CHANGED'){
        apiClient.invalidateReadPaths(['/services']);
        const fresh=await apiClient.getServices();
        if(mounted.current&&epoch.current===apiClient.sessionVersion()&&Array.isArray(fresh?.services)){setCatalog(fresh.services);onCatalogUpdate?.(fresh.services);setSelectedTime('');setVersion(value=>value+1);}
      }
      else if(result?.status===409||result?.code==='NO_BED_CAPACITY'){setSelectedTime('');setVersion(value=>value+1);}
    }finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  return <section className="booking-flow staff-booking" aria-labelledby="staff-booking-heading">
    <header className="booking-header"><div className="booking-topbar"><button type="button" className="booking-back" title="Đóng đặt lịch" disabled={busy} onClick={onClose}><ArrowLeftIcon size={20}/></button><span>NHÂN VIÊN</span></div><h1 id="staff-booking-heading">Đặt lịch cho khách</h1></header>
    <main className="booking-body"><fieldset disabled={busy||!scope} className="staff-booking-fields">
      <section><h2>Khách hàng</h2><div className="staff-customer-modes">{([['existing','Khách đã có'],['new','Khách mới']] as const).map(([value,label])=><label key={value}><input type="radio" name="staff-customer-mode" checked={mode===value} onChange={()=>{setMode(value);setCustomer(null);setPhone('');setName('');setError('');}}/>{label}</label>)}</div>
      {mode==='existing'?<><label>Tìm khách hàng<input value={query} maxLength={150} placeholder="Số điện thoại hoặc họ tên đầy đủ" onChange={e=>{setQuery(e.target.value);setCustomer(null);setPhone('');}}/></label>{searching&&<p role="status">Đang tìm khách...</p>}{searchError&&<p role="alert">{searchError}</p>}<div className="staff-customer-results">{customers.map(item=><button key={item.id} type="button" aria-pressed={customer?.id===item.id} onClick={()=>{setCustomer(item);setPhone(item.phone||'');setError('');}}><strong>{item.fullName}</strong><span>{item.phone}</span></button>)}</div>{customer&&!customer.phone&&<label>Số điện thoại liên hệ<input type="tel" value={phone} maxLength={16} autoComplete="tel" onChange={e=>setPhone(e.target.value)}/></label>}{!searching&&!searchError&&query.trim().length>=2&&!customers.length&&<p role="status">Không tìm thấy khách phù hợp.</p>}</>:<><label>Họ tên khách<input value={name} maxLength={150} autoComplete="name" onChange={e=>setName(e.target.value)}/></label><label>Số điện thoại khách<input type="tel" value={phone} maxLength={16} autoComplete="tel" onChange={e=>setPhone(e.target.value)}/></label></>}
      <label>Số người đến trị liệu<select aria-label="Số người đến trị liệu" value={people} onChange={e=>{const count=Number(e.target.value);setPeople(count);setGuests(current=>Array.from({length:count},(_,index)=>current[index]||{name:'',phone:''}));if(count===1)setIdentifyGuests(false);resetDate();}}>{Array.from({length:20},(_,index)=><option key={index+1} value={index+1}>{index+1} người</option>)}</select></label>
      {people>1&&<><label className="staff-guest-toggle"><input type="checkbox" checked={identifyGuests} onChange={event=>{setIdentifyGuests(event.target.checked);setGuests(current=>Array.from({length:people},(_,index)=>current[index]||{name:'',phone:''}));}}/>Nhập thông tin từng người</label>{identifyGuests&&guests.map((guest,index)=><fieldset className="staff-guest" key={index}><legend>Người {index+1}</legend><label>Họ tên<input aria-label={`Họ tên người ${index+1}`} value={guest.name} maxLength={150} onChange={event=>setGuests(current=>current.map((item,i)=>i===index?{...item,name:event.target.value}:item))}/></label><label>Số điện thoại (tùy chọn)<input type="tel" aria-label={`Số điện thoại người ${index+1}`} value={guest.phone} maxLength={16} onChange={event=>setGuests(current=>current.map((item,i)=>i===index?{...item,phone:event.target.value}:item))}/></label></fieldset>)}</>}
      </section>
      <section><h2>Lịch hẹn</h2><label>Lựa chọn dịch vụ<select aria-label="Lựa chọn dịch vụ" value={serviceId} onChange={e=>{setServiceId(e.target.value);resetDate();}}>{catalog.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Địa điểm cơ sở<select aria-label="Địa điểm cơ sở" value={branchId} onChange={e=>{setBranchId(e.target.value);resetDate();}}>{visibleBranches.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ngày đến<input type="date" aria-label="Ngày đến" min={today()} value={date} onChange={e=>chooseDate(e.target.value)}/></label>
      {dates.length>0&&<label>Ngày có lịch trống<select aria-label="Ngày có lịch trống" value={dates.includes(date)?date:''} onChange={e=>chooseDate(e.target.value)}><option value="" disabled>Chọn ngày</option>{dates.map(value=><option key={value} value={value}>{value.split('-').reverse().join('/')}</option>)}</select></label>}
      {customer&&people===1&&<><label>Liệu trình của khách<select aria-label="Liệu trình của khách" value={packageId} disabled={packagesLoading} onChange={e=>{requestedPackage.current='';setPackageId(e.target.value);setPackageError('');setError('');}}><option value="">Không dùng liệu trình</option>{packages.filter(item=>item.serviceId===serviceId&&item.remainingSessions>0).map(item=><option key={item.id} value={item.id}>{item.name} · còn {item.remainingSessions} buổi</option>)}</select></label>{packagesLoading&&<p role="status">Đang tải liệu trình...</p>}{packageError&&<p role="alert">{packageError}</p>}</>}
      <h3>Khung giờ đến</h3>{(datesLoading||slotsLoading)&&<p role="status">Đang cập nhật giờ trống...</p>}{datesError&&<p role="alert">{datesError}</p>}{slotsError&&<p role="alert">{slotsError}</p>}
      <div className="staff-slot-grid">{labels.map(label=><button type="button" key={label} aria-pressed={selectedTime===label} onClick={()=>{setSelectedTime(label);setError('');}}>{label}</button>)}</div>
      {ready&&!labels.length&&!datesLoading&&<p role="status">{reason==='NO_SERVICE_ASSIGNMENT'?'Cơ sở chưa được phân công chuyên viên cho dịch vụ này.':reason==='NO_PUBLISHED_SLOTS'?'Cơ sở chưa mở lịch nhận khách cho dịch vụ này.':`Ngày này chưa có khung giờ đủ giường và kỹ thuật viên cho ${people} người.`}</p>}
      <button type="button" className="staff-refresh" onClick={()=>setVersion(value=>value+1)}>Cập nhật giờ trống</button></section>
    </fieldset>{contextError&&<div role="alert">{contextError}<button type="button" disabled={busy} onClick={()=>setVersion(value=>value+1)}>Thử lại</button></div>}{!scope&&!contextError&&<p role="status">Đang kiểm tra quyền nhân viên...</p>}</main>
    <footer className="booking-footer">{error&&<p role="alert" className="booking-error">{error}</p>}<div className="booking-footer-summary">{service?`${people} người · ${service.durationMinutes} phút · ${packageId?'Đặt bằng liệu trình':(service.price*people).toLocaleString('vi-VN')+'đ'}`:''}</div><button type="button" disabled={busy||!scope||!ready||!labels.includes(selectedTime)||!validCustomer||!validGuests||Boolean(packageId&&!chosenPackage)||Boolean(requestedPackage.current)} onClick={()=>void submit()}>{busy?'Đang lưu lịch hẹn...':'Xác nhận đặt lịch'}</button></footer>
  </section>;
}
