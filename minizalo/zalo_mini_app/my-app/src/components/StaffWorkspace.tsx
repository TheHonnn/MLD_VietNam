import React from 'react';
import type {CustomerSection,StaffDashboard} from '@/types/staff';
import {CalendarIcon,UserCheckIcon,HeartIcon,FileTextIcon,NavAcademyIcon,ArrowRightIcon} from './Icons';
import '@/css/staff-workspace.scss';
import {AttendanceDesk} from './Attendance';

export function StaffWorkspace({data,error,onRetry,onAppointments,onCustomers,onAcademy,onDocuments,onCommunity}:{
  data:StaffDashboard|null;error?:string;onRetry?:()=>void;onAppointments:()=>void;onCustomers:(section:CustomerSection)=>void;
  onAcademy:()=>void;onDocuments:()=>void;onCommunity:()=>void;
}){
  const summary=data?.summary;
  const actions=[
    {label:'Lịch hẹn khách hàng',icon:CalendarIcon,onClick:onAppointments},
    {label:'Hồ sơ khách hàng',icon:UserCheckIcon,onClick:()=>onCustomers('appointments')},
    {label:'Liệu trình khách hàng',icon:HeartIcon,onClick:()=>onCustomers('packages')},
    {label:'Nhật ký trị liệu',icon:FileTextIcon,onClick:()=>onCustomers('treatments')},
    {label:'Đào tạo của tôi',icon:NavAcademyIcon,onClick:onAcademy},
    {label:'Tài liệu',icon:FileTextIcon,onClick:onDocuments},
    {label:'Cộng đồng',icon:UserCheckIcon,onClick:onCommunity},
  ];
  return <section className="staff-workspace" aria-label="Công việc nhân viên">
    <dl className="staff-work-facts">
      {data?.profile&&<>{data.profile.employeeCode&&<><dt>Mã nhân viên</dt><dd>{data.profile.employeeCode}</dd></>}{data.profile.position&&<><dt>Chức vụ</dt><dd>{data.profile.position}</dd></>}{data.profile.branchName&&<><dt>Cơ sở công tác</dt><dd>{data.profile.branchName}</dd></>}</>}
      {data&&data.scope.branchId===null&&<><dt>Phạm vi quản lý</dt><dd>Tất cả chi nhánh</dd></>}
    </dl>
    {error?<div role="alert" className="staff-work-error">{error}<button type="button" onClick={onRetry}>Thử lại</button></div>:!data&&<p role="status">Đang tải thông tin công tác...</p>}
    <div className="staff-work-stats" aria-busy={!data&&!error}>
      {[
        {value:summary?.todayBookings,label:'Lịch hôm nay'},
        {value:summary?.pendingBookings,label:'Chờ xác nhận'},
        {value:summary?.inServiceBookings,label:'Đang tiếp nhận'},
      ].map(item=><div key={item.label}><strong>{item.value??''}</strong><span>{item.label}</span></div>)}
    </div>
    <AttendanceDesk/>
    <h3>Công việc</h3>
    <nav aria-label="Công việc nhân viên">{actions.map(({label,icon:Icon,onClick})=><button type="button" key={label} onClick={onClick}><Icon size={19}/><span>{label}</span><ArrowRightIcon size={17}/></button>)}</nav>
  </section>;
}
