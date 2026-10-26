import React,{useState} from 'react';
import type {MedicalService} from '../../../../backend/src/data/database';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {searchText,serviceSearchText} from '@/utils/catalog';
import {ArrowLeftIcon,SearchIcon} from './Icons';
import {EntityImage} from './GroupBExtensions';
import '@/css/booking-flow.scss';
import '@/css/examination-booking.scss';

export const LYMPH_BOOKING_NOTE='Nhu cầu: Kiểm tra phù bạch huyết';

export function ExaminationServicePicker({services,onSelect,onClose}:{services:MedicalService[];onSelect:(service:MedicalService)=>void;onClose:()=>void}){
  const [query,setQuery]=useState('');
  useBackAction(true,onClose,2);
  const visible=services.filter(service=>serviceSearchText(service).includes(searchText(query)));
  return <section role="dialog" aria-modal="true" aria-labelledby="examination-picker-title" className="booking-flow examination-picker">
    <header className="booking-header"><div className="booking-topbar"><button type="button" className="booking-back" title="Đóng chọn dịch vụ" onClick={onClose}><ArrowLeftIcon size={20}/></button></div><h1 id="examination-picker-title">Kiểm tra phù bạch huyết</h1></header>
    <main className="booking-body"><h2>Chọn dịch vụ</h2><label className="examination-search"><SearchIcon size={20}/><input type="search" aria-label="Tìm dịch vụ kiểm tra" value={query} maxLength={150} onChange={event=>setQuery(event.target.value)}/></label>
      {visible.map(service=><button type="button" className="examination-service" key={service.id} aria-label={`Chọn dịch vụ ${service.title}`} onClick={()=>onSelect(service)}><EntityImage src={service.image} alt=""/><span><strong>{service.title}</strong><small>{service.durationMinutes} phút · {service.price.toLocaleString('vi-VN')}đ</small></span></button>)}
    </main>
  </section>;
}
