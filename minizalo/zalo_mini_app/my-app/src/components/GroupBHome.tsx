import React, { useState } from 'react';
import type { MedicalService, Doctor, Branch, Booking, Course } from '../../../../backend/src/data/database';
import type { ServiceCategory } from '../../../../../database/shared_types';
import { SearchIcon } from '@/components/Icons';
import { EntityImage, BranchHours } from './GroupBExtensions';
import type { ServiceDetails, DoctorDetails, BranchDetails } from './GroupBExtensions';

interface HomeMetadata {
  serviceCategories?: ServiceCategory[];
  faqs?: { id: string; question: string; answer: string; isActive?: boolean }[];
}

export interface GroupBHomeProps {
  services: ServiceDetails[];
  doctors: DoctorDetails[];
  branches: BranchDetails[];
  upcomingBooking?: Booking | null;
  userName?: string;
  metadata?: HomeMetadata;
  courses?: Course[];
  onSelectCourse?: (course: Course) => void;
  guidelines?: { id: string; title: string; summary: string; content?: string; imageUrl?: string; isPublished?: boolean }[];
  onSelectService: (service: MedicalService) => void;
  onViewServiceDetail: (service: MedicalService) => void;
  onSelectDoctor: (doctor: Doctor) => void;
  onSelectBranch: (branch: Branch) => void;
  onOpenDirections: (branch: Branch) => void;
  onNavigateTab: (tabKey: string) => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  unreadNotifications?: number;
  onOpenBranches?: () => void;
  onOpenSpecialists?: () => void;
}

const buttonClass = 'rounded-[8px] border border-[#DED2C5] bg-white px-3 py-2 text-xs font-semibold text-[#98501B]';
const inputClass = 'h-10 w-full min-w-0 rounded-[8px] border border-[#DED2C5] bg-white px-2 text-xs';
const bookingStatuses: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đã đến',
  in_service: 'Đang thực hiện', completed: 'Hoàn thành', cancelled: 'Đã hủy', no_show: 'Không đến',
};

export const HomeCatalog: React.FC<GroupBHomeProps> = ({
  services, doctors, branches, upcomingBooking, userName, metadata, courses = [], guidelines = [],
  onSelectService, onViewServiceDetail, onSelectDoctor, onSelectBranch, onOpenDirections, onSelectCourse,
  onNavigateTab, onOpenSearch, onOpenNotifications, unreadNotifications = 0, onOpenBranches, onOpenSpecialists,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('name');
  const categories = metadata?.serviceCategories
    ? metadata.serviceCategories.filter(item => item.isActive !== false).sort((a, b) => a.displayOrder - b.displayOrder)
    : Array.from(new Set(services.map(service => service.category).filter(Boolean))).map(name => ({ id: name, name }));
  const cities = Array.from(new Set(branches.map(branch => branch.city).filter(Boolean)));
  const visibleBranches = branches.filter(branch => !city || branch.city === city);
  const selectedCategory = categories.find(item => item.id === category);
  const visibleServices = services.filter(service => (!category || service.categoryId === category || service.category === selectedCategory?.name)
    && (service.title + ' ' + service.description).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
    .sort((a, b) => sort === 'priceAsc' ? a.price - b.price : sort === 'priceDesc' ? b.price - a.price : sort === 'duration' ? a.durationMinutes - b.durationMinutes : a.title.localeCompare(b.title, 'vi'));
  const faqs = metadata?.faqs?.filter(faq => faq.isActive !== false) || [];

  return <div className="space-y-5 px-3 pb-16 pt-3 text-xs text-[#40352F] [overflow-wrap:anywhere]">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-base font-bold">{userName?.trim() ? 'Xin chào, ' + userName.trim() + '!' : 'Xin chào!'}</h1>
      {onOpenNotifications && <button onClick={onOpenNotifications} className={buttonClass}>Thông báo{unreadNotifications > 0 ? ' (' + unreadNotifications + ')' : ''}</button>}
    </header>
    {onOpenSearch && <button onClick={onOpenSearch} className={buttonClass + ' flex w-full items-center gap-2 text-left'}><SearchIcon size={16} />Tìm dịch vụ, khóa học, chuyên viên...</button>}

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Dịch vụ</h2><button onClick={() => onNavigateTab('services')} className={buttonClass}>Xem tất cả</button></div>
      <label className="block">Tìm dịch vụ<input value={query} onChange={event => setQuery(event.target.value)} className={inputClass + ' mt-1'} placeholder="Tên hoặc mô tả..." /></label>
      <div className="grid grid-cols-2 gap-2">
        <label>Danh mục<select value={category} onChange={event => setCategory(event.target.value)} className={inputClass + ' mt-1'}><option value="">Tất cả</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Sắp xếp<select value={sort} onChange={event => setSort(event.target.value)} className={inputClass + ' mt-1'}><option value="name">Tên dịch vụ</option><option value="priceAsc">Giá tăng dần</option><option value="priceDesc">Giá giảm dần</option><option value="duration">Thời lượng</option></select></label>
      </div>
      {!visibleServices.length && <p className="text-stone-500">Không có dịch vụ phù hợp.</p>}
      {visibleServices.map(service => <article key={service.id} className="space-y-3 rounded-[8px] border border-[#EADECF] bg-white p-3">
        <button onClick={() => onViewServiceDetail(service)} className="block w-full space-y-2 text-left"><h3 className="font-bold">{service.title}</h3><EntityImage src={service.image} alt={service.title} /><p>{service.description}</p></button>
        <p>{service.durationMinutes} phút · {service.price.toLocaleString('vi-VN')} ₫</p>
        <div className="flex flex-wrap justify-between gap-2"><button onClick={() => onViewServiceDetail(service)} className={buttonClass}>Xem chi tiết</button><button onClick={() => onSelectService(service)} className={buttonClass}>Đặt lịch</button></div>
      </article>)}
    </section>

    <section className="space-y-2">
      <h2 className="text-sm font-bold">Lịch hẹn sắp tới</h2>
      {upcomingBooking ? <div className="space-y-2">
        <h3 className="font-bold">{upcomingBooking.serviceTitle || 'Chưa có tên dịch vụ'}</h3>
        <p>{upcomingBooking.date} · {upcomingBooking.timeSlot}</p><p>{upcomingBooking.branchName || branches.find(branch => branch.id === upcomingBooking.branchId)?.name || 'Chưa có tên chi nhánh'}</p>
        <p>{bookingStatuses[upcomingBooking.status.toLowerCase()] || upcomingBooking.status}</p>
      </div> : <p className="text-stone-500">Chưa có lịch hẹn sắp tới.</p>}
      <button onClick={() => onNavigateTab('booking')} className={buttonClass}>Xem lịch hẹn</button>
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Chuyên viên</h2>{onOpenSpecialists && <button onClick={onOpenSpecialists} className={buttonClass}>Xem tất cả</button>}</div>
      {!doctors.length && <p className="text-stone-500">Chưa có thông tin chuyên viên.</p>}
      {doctors.slice(0, 2).map(doctor => <button key={doctor.id} onClick={() => onSelectDoctor(doctor)} className="flex w-full items-center gap-3 rounded-[8px] border border-[#EADECF] bg-white p-3 text-left">
        <EntityImage src={doctor.avatar} alt={doctor.name} className="h-16 w-16 shrink-0" /><div className="min-w-0 space-y-1"><h3 className="font-bold">{doctor.name}</h3><p>{doctor.title}</p><p>{doctor.specialty}</p><p>{doctor.hospital}</p></div>
      </button>)}
    </section>

    <section className="space-y-3">
      <h2 className="text-sm font-bold">Khóa học</h2>
      {!courses.length && <p className="text-stone-500">Chưa có thông tin khóa học.</p>}
      {courses.slice(0, 2).map(course => <article key={course.id} className="space-y-2 rounded-[8px] border border-[#EADECF] bg-white p-3"><EntityImage src={course.image} alt={course.title} /><h3 className="font-bold">{course.title}</h3><p>{course.description}</p><p>{course.duration} · {course.price.toLocaleString('vi-VN')} ₫</p>{onSelectCourse && <button onClick={() => onSelectCourse(course)} className={buttonClass}>Xem chi tiết</button>}</article>)}
      <button onClick={() => onNavigateTab('academy')} className={buttonClass}>Xem khóa học</button>
    </section>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Chi nhánh</h2>{onOpenBranches && <button onClick={onOpenBranches} className={buttonClass}>Xem tất cả · {branches.length}</button>}</div>
      <label className="block">Tỉnh / thành phố<select value={city} onChange={event => setCity(event.target.value)} className={inputClass + ' mt-1'}><option value="">Tất cả</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
      {!visibleBranches.length && <p className="text-stone-500">Không có chi nhánh phù hợp.</p>}
      {visibleBranches.map(branch => <article key={branch.id} className="space-y-3 rounded-[8px] border border-[#EADECF] bg-white p-3">
        <EntityImage src={branch.imageUrl} alt={branch.name} /><h3 className="font-bold">{branch.name}</h3><p>{branch.address || 'Chưa cập nhật địa chỉ'}</p><BranchHours branch={branch} />
        <div className="flex flex-wrap gap-2"><button onClick={() => onSelectBranch(branch)} className={buttonClass}>Xem chi tiết</button><button onClick={() => onOpenDirections(branch)} className={buttonClass}>Chỉ đường</button></div>
        {!!branch.galleryUrls?.length && <div className="grid grid-cols-2 gap-2">{branch.galleryUrls.filter(Boolean).map((url, index) => <EntityImage key={url + index} src={url} alt={branch.name} className="h-28 w-full" />)}</div>}
      </article>)}
    </section>

    {!!guidelines.length && <section className="space-y-2"><h2 className="text-sm font-bold">Cẩm nang chăm sóc</h2>{guidelines.filter(item => item.isPublished !== false).map(item => <details key={item.id} className="border-b border-[#EADECF] py-2"><summary className="cursor-pointer font-semibold">{item.title}</summary><div className="space-y-2 pt-2">{item.imageUrl && <EntityImage src={item.imageUrl} alt={item.title} />}<p>{item.summary}</p>{item.content && <p className="whitespace-pre-line">{item.content}</p>}</div></details>)}</section>}
    {!!faqs.length && <section className="space-y-2"><h2 className="text-sm font-bold">Câu hỏi thường gặp</h2>{faqs.map(faq => <details key={faq.id} className="border-b border-[#EADECF] py-2"><summary className="cursor-pointer font-semibold">{faq.question}</summary><p className="whitespace-pre-line pt-2">{faq.answer}</p></details>)}</section>}
  </div>;
};
