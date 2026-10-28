import React,{useEffect,useState} from 'react';
import type {User,MedicalService,Branch,Booking} from '../../../../../backend/src/data/database';
import type {CustomerSection,StaffDashboard} from '@/types/staff';
import {apiClient} from '@/api/client';
import {StaffWorkspace} from '@/components/StaffWorkspace';
import {StaffCustomers,StaffRecordCustomer} from '@/components/SharedRecords';
import {StaffBooking} from '@/components/StaffBooking';
export function StaffWork({user,services,branches,onBack,onAppointment,onNavigate,onBooked}:{user:User;services:MedicalService[];branches:Branch[];onBack:()=>void;onAppointment:(id:string)=>void;onNavigate:(view:string)=>void;onBooked:(booking:Booking)=>void}){
  const [data,setData]=useState<StaffDashboard|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0),[section,setSection]=useState<CustomerSection|null>(null),[booking,setBooking]=useState<{service:MedicalService;customer?:StaffRecordCustomer;packageId?:string}|null>(null);
  useEffect(()=>{let active=true;void apiClient.getStaffDashboard().then(result=>{if(active){if(result.error)setError(result.error);else setData(result);}});return()=>{active=false;};},[user.id,version]);
  if(booking)return <StaffBooking currentUser={user} initialService={booking.service} initialBranch={branches.find(b=>b.id===data?.scope.branchId)||null} initialCustomer={booking.customer} initialPackageId={booking.packageId} allServices={services} branches={branches} onClose={()=>setBooking(null)} onBookingSuccess={onBooked}/>;
  if(section)return <StaffCustomers initialSection={section} onBack={()=>setSection(null)} onAppointment={onAppointment} onBookPackage={(customer,serviceId,ownedPackage)=>{const service=services.find(s=>s.id===serviceId);if(service)setBooking({service,customer,packageId:ownedPackage.id});else setError('Dịch vụ của liệu trình hiện không khả dụng.');}}/>;
  return <section className="mobile-body"><header><button type="button" onClick={onBack}>Quay lại</button><h1>Công việc nhân viên</h1></header>{services.length>0&&<button className="mobile-primary" onClick={()=>setBooking({service:services[0]})}>Đặt lịch cho khách</button>}<StaffWorkspace data={data} error={error} onRetry={()=>setVersion(v=>v+1)} onAppointments={()=>onNavigate('booking')} onCustomers={setSection} onAcademy={()=>onNavigate('learning')} onDocuments={()=>onNavigate('documents')} onCommunity={()=>onNavigate('community')}/></section>;
}
