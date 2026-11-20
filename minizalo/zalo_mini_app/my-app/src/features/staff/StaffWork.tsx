import {ConsultationInbox} from './ConsultationInbox';
import React,{useEffect,useState} from 'react';
import type {User,MedicalService,Branch,Booking} from '../../../../../backend/src/data/database';
import type {CustomerSection,StaffDashboard} from '@/types/staff';
import {apiClient} from '@/api/client';
import {StaffWorkspace} from '@/components/StaffWorkspace';
import {StaffCustomers,StaffRecordCustomer} from '@/components/SharedRecords';
import {StaffBooking} from '@/components/StaffBooking';
import {StaffAcademy,StaffCatalog,StaffReviews} from './StaffAdministration';
import {useBackAction} from '@/hooks/useNavigationHistory';

type ShiftRow={id:string;shiftDate:string;startTime:string;endTime:string;shiftSlot:'morning'|'afternoon'|'evening';technicianName:string;branchName:string};
const shiftMonth=(base:string,delta:number)=>{const [y,m]=base.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));return d.toISOString().slice(0,7);};
const shiftSlotLabel=(slot:ShiftRow['shiftSlot'])=>slot==='morning'?'Ca sáng':slot==='afternoon'?'Ca chiều':'Ca tối';

function StaffShiftsPanel({onBack}:{onBack:()=>void}){
  const [month,setMonth]=useState(()=>new Date(Date.now()+7*3600_000).toISOString().slice(0,7));
  const [shifts,setShifts]=useState<ShiftRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let active=true;setLoading(true);setError('');void apiClient.getStaffShifts(month).then(res=>{if(!active)return;setLoading(false);if(res?.error)setError(res.error);else setShifts(Array.isArray(res?.shifts)?res.shifts:[]);});return()=>{active=false;};},[month]);
  return <section className="mobile-body"><header className="mobile-page-header"><button type="button" onClick={onBack}>Quay lại</button><h1>Ca làm việc theo tháng</h1></header><div className="flex items-center justify-between gap-2 my-3"><button type="button" className="mobile-card px-3 py-2" onClick={()=>setMonth(m=>shiftMonth(m,-1))}>Tháng trước</button><strong>{month}</strong><button type="button" className="mobile-card px-3 py-2" onClick={()=>setMonth(m=>shiftMonth(m,1))}>Tháng sau</button></div>{error&&<p role="alert">{error}</p>}{loading?<p>Đang tải ca làm việc...</p>:shifts.length===0?<p>Không có ca làm việc trong tháng này.</p>:<div className="space-y-3">{shifts.map(s=><article className="mobile-card p-3" key={s.id}><strong>{s.shiftDate} · {shiftSlotLabel(s.shiftSlot)}</strong><p>{s.startTime.slice(0,5)} - {s.endTime.slice(0,5)}</p><p>{s.technicianName} · {s.branchName}</p></article>)}</div>}</section>;
}

export function StaffWork({user,services,branches,onBack,onAppointment,onNavigate,onBooked,onChanged}:{user:User;services:MedicalService[];branches:Branch[];onBack:()=>void;onAppointment:(id:string)=>void;onNavigate:(view:string)=>void;onBooked:(booking:Booking)=>void;onChanged:()=>void}){
  const [panel,setPanel]=useState<'academy'|'catalog'|'reviews'|'shifts'|null>(null);
  const [consultations,setConsultations]=useState(false);
  const [data,setData]=useState<StaffDashboard|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0),[section,setSection]=useState<CustomerSection|null>(null),[booking,setBooking]=useState<{service:MedicalService;customer?:StaffRecordCustomer;packageId?:string}|null>(null);
  useBackAction(Boolean(panel||consultations||section||booking),()=>{setPanel(null);setConsultations(false);setSection(null);setBooking(null);},1);
  useEffect(()=>{let active=true;void apiClient.getStaffDashboard().then(result=>{if(active){if(result.error)setError(result.error);else setData(result);}});return()=>{active=false;};},[user.id,version]);
  if(consultations)return <ConsultationInbox onBack={()=>setConsultations(false)}/>;
  if(panel==='shifts')return <StaffShiftsPanel onBack={()=>setPanel(null)}/>;
  if(panel==='academy')return <StaffAcademy onReviews={['ADMIN','SUPER_ADMIN','BRANCH_MANAGER'].includes((user.role||'').toUpperCase())?()=>setPanel('reviews'):undefined} onBack={()=>setPanel(null)} onChanged={onChanged}/>;
  if(panel==='reviews')return <StaffReviews onBack={()=>setPanel(null)} onChanged={onChanged}/>;
  if(panel==='catalog')return <StaffCatalog onBack={()=>setPanel(null)} onChanged={onChanged}/>;
  if(booking)return <StaffBooking currentUser={user} initialService={booking.service} initialBranch={branches.find(b=>b.id===data?.scope.branchId)||null} initialCustomer={booking.customer} initialPackageId={booking.packageId} allServices={services} branches={branches} onClose={()=>setBooking(null)} onBookingSuccess={onBooked}/>;
  if(section)return <StaffCustomers initialSection={section} onBack={()=>setSection(null)} onAppointment={onAppointment} onBookPackage={(customer,serviceId,ownedPackage)=>{const service=services.find(s=>s.id===serviceId);if(service)setBooking({service,customer,packageId:ownedPackage.id});else setError('Dịch vụ của liệu trình hiện không khả dụng.');}}/>;
  return <section className="mobile-body"><header><button type="button" onClick={onBack}>Quay lại</button><h1>Công việc nhân viên</h1></header><nav className="records-tabs" aria-label="Điều hướng công việc"><button type="button" aria-current="page">Tổng quan</button><button type="button" onClick={()=>onNavigate('booking')}>Tiếp đón Spa</button><button type="button" onClick={()=>setPanel('shifts')}>Ca theo tháng</button>{['ADMIN','SUPER_ADMIN','BRANCH_MANAGER','RECEPTIONIST'].includes((user.role||'').toUpperCase())&&<button type="button" onClick={()=>setPanel('academy')}>Đào tạo</button>}{['ADMIN','SUPER_ADMIN'].includes((user.role||'').toUpperCase())&&<button type="button" onClick={()=>setPanel('catalog')}>Dịch vụ & khóa</button>}</nav>{(user.role||'').toUpperCase()==='INSTRUCTOR'&&<button type="button" className="mobile-primary" onClick={()=>setPanel('reviews')}>Nhận xét bài kiểm tra</button>}{services.length>0&&<button className="mobile-primary" onClick={()=>setBooking({service:services[0]})}>Đặt lịch cho khách</button>}<button type="button" className="mobile-primary" onClick={()=>setConsultations(true)}>Yêu cầu tư vấn</button><StaffWorkspace data={data} error={error} onRetry={()=>setVersion(v=>v+1)} onAppointments={()=>onNavigate('booking')} onCustomers={setSection} onAcademy={()=>onNavigate('learning')} onDocuments={()=>onNavigate('documents')} onCommunity={()=>onNavigate('community')}/></section>;
}
