import React from 'react';
import type {User,MedicalService,Branch,Doctor,Course} from '../../../../../backend/src/data/database';
import {BellIcon as Bell,SearchIcon as Search,MapIcon as MapPin,NavAcademyIcon as GraduationCap,CalendarIcon as Calendar,UserCheckIcon as Users} from '@/components/Icons';
import {BranchChooser} from '@/components/BranchChooser';
import logo from '@/static/logo-admin.png';
import {PortalBanners,PortalBanner} from '@/components/PortalBanners';
import {EntityImage} from '@/components/GroupBExtensions';
import '@/css/home-dashboard.scss';

export function HomeScreen({user,services,branches,doctors,courses,banners,activeBranchId,onBranch,onNavigate,onSearch,onService,onCourse,onSpecialist,onBook,unread}:{user:User|null;services:MedicalService[];branches:Branch[];doctors:Doctor[];courses:Course[];banners:PortalBanner[];activeBranchId:string;onBranch:(id:string)=>void;onNavigate:(view:string)=>void;onSearch:()=>void;onService:(item:MedicalService)=>void;onCourse:(item:Course)=>void;onSpecialist:(item:Doctor)=>void;onBook:(item:MedicalService)=>void;unread:number}){
  const featured=services.find(s=>(s as any).isFeatured)||services[0];
  return <div className="mobile-home mobile-body"><header className="mobile-home-header"><img className="mobile-brand-logo" src={logo} alt="MLD Việt Nam"/><div className="flex items-center gap-3"><button type="button" aria-label="Thông báo" onClick={()=>onNavigate('notifications')} className="relative"><Bell size={23}/>{unread>0&&<span className="mobile-unread">{unread}</span>}</button><button type="button" aria-label="Cá nhân" onClick={()=>onNavigate('profile')}>{user?.avatar?<img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.name}/>:<Users size={23}/>}</button></div></header>
    <div><h1>{user?.name?`Xin chào, ${user.name}!`:'Xin chào!'}</h1><p>Chăm sóc sức khỏe và phát triển chuyên môn</p></div>
    <BranchChooser branches={branches} value={activeBranchId} onChange={onBranch}/>
    <button type="button" className="mobile-search" onClick={onSearch}><Search size={20}/><span>Tìm dịch vụ, khóa học, chuyên viên...</span></button>
    <PortalBanners items={banners} paused={false} onNavigate={onNavigate}/>
    <nav className="mobile-quick-actions" aria-label="Tiện ích nhanh">{[{id:'new-booking',label:'Đặt lịch',Icon:Calendar},{id:'academy',label:'Đào tạo',Icon:GraduationCap},{id:'branches',label:'Chi nhánh',Icon:MapPin},{id:'specialists',label:'Chuyên viên',Icon:Users}].map(({id,label,Icon})=><button key={id} disabled={id==='new-booking'&&!services.length} onClick={()=>onNavigate(id)} type="button"><Icon size={22}/><span>{label}</span></button>)}</nav>
    <button type="button" className="mobile-list-card" onClick={()=>onNavigate('examination')}>Kiểm tra phù bạch huyết</button>
    {featured&&<section className="mobile-card mobile-core-service"><button type="button" className="w-full text-left" onClick={()=>onService(featured)}><EntityImage src={featured.image} alt={featured.title}/><div className="p-4"><h2>{featured.title}</h2><strong>{featured.price.toLocaleString('vi-VN')} ₫</strong></div></button><div><button className="mobile-primary" type="button" onClick={()=>onBook(featured)}>Đặt lịch ngay</button></div></section>}
    <section><div className="mobile-section-heading"><h2>Dịch vụ chăm sóc</h2><button onClick={()=>onNavigate('services')}>Xem tất cả</button></div><div className="mobile-horizontal-cards">{services.filter(s=>s.id!==featured?.id).slice(0,6).map(service=><button className="mobile-card" key={service.id} type="button" onClick={()=>onService(service)}><EntityImage src={service.image} alt={service.title}/><div><h3>{service.title}</h3><p>{service.durationMinutes} phút</p><strong>{service.price.toLocaleString('vi-VN')} ₫</strong></div></button>)}</div></section>
    {courses.length>0&&<section><div className="mobile-section-heading"><h2>Đào tạo chuyên môn</h2><button onClick={()=>onNavigate('academy')}>Xem tất cả</button></div>{courses.slice(0,3).map(course=><button type="button" className="mobile-list-card" key={course.id} onClick={()=>onCourse(course)}><EntityImage src={course.image} alt={course.title}/><span>{course.title}</span></button>)}</section>}
    {doctors.length>0&&<section><h2>Đội ngũ chuyên viên</h2>{doctors.slice(0,3).map(doctor=><button type="button" className="mobile-list-card" key={doctor.id} onClick={()=>onSpecialist(doctor)}><EntityImage src={doctor.avatar} alt={doctor.name}/><span><strong>{doctor.name}</strong><small>{doctor.title}</small></span></button>)}</section>}
    <section className="mobile-community-card"><h2>Cộng đồng chuyên gia MLD</h2><p>Chia sẻ ca lâm sàng, kiến thức và tài liệu chuyên môn.</p><button type="button" className="mobile-primary" onClick={()=>onNavigate('community')}>Xem bài viết chuyên môn</button></section>
    <section className="mobile-card p-4"><h2>Đồng hành cùng bạn</h2><p>Theo dõi lịch hẹn, quá trình chăm sóc và hành trình học tập của bạn.</p><button type="button" className="mobile-primary" onClick={()=>onNavigate('profile')}>Cá nhân</button></section>
  </div>;
}
