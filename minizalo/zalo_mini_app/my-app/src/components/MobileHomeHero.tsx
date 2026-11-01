import React,{useState} from 'react';
import type {PortalBanner} from './PortalBanners';
import {useCarousel} from '@/hooks/useCarousel';
import {portalTarget} from '@/utils/portal-target';
import {useBackAction} from '@/hooks/useNavigationHistory';
import heroImage from '@/static/brand-hero.webp';
export function MobileHomeHero({banners,phone,onBook,onNavigate}:{banners:PortalBanner[];phone:string;onBook?:()=>void;onNavigate:(target:string)=>void}){
  const [detail,setDetail]=useState<PortalBanner|null>(null);
  const {index,select}=useCarousel(banners.map(b=>b.id),Boolean(detail));
  const banner=banners[index],target=portalTarget(banner?.targetLink);
  useBackAction(Boolean(detail),()=>setDetail(null),2);
  const picture=<img src={banner?.imageUrl||heroImage} alt={banner?.title||''} onError={e=>{if(e.currentTarget.src!==new URL(heroImage,location.href).href)e.currentTarget.src=heroImage;}}/>;
  return <><section className="matched-hero" aria-label="Thông tin MLD"><div className="matched-hero-background">{target?.external?<a href={target.external} target="_blank" rel="noopener noreferrer">{picture}</a>:<button type="button" disabled={!banner} aria-label={banner?.title||'Thông tin MLD'} onClick={()=>target?.screen?onNavigate(target.screen):banner&&setDetail(banner)}>{picture}</button>}</div><div className="matched-hero-gradient"/><div className="matched-hero-copy"><div>{banner?.title&&<h1>{banner.title}</h1>}{banner?.summary&&<p>{banner.summary}</p>}</div><div className="matched-hero-actions">{phone&&<a href={`tel:${phone}`}>Gọi tư vấn ngay</a>}<button type="button" disabled={!onBook} onClick={onBook}>Đặt lịch</button></div></div>{banners.length>1&&<div className="matched-hero-dots">{banners.map((b,i)=><button type="button" key={b.id} aria-label={`Banner ${i+1}: ${b.title}`} aria-pressed={i===index} onClick={()=>select(b.id)}/>)}</div>}</section>{detail&&<div role="dialog" aria-modal="true" aria-label={detail.title} className="mobile-overlay"><header className="mobile-page-header"><button onClick={()=>setDetail(null)}>Quay lại</button><h1>{detail.title}</h1></header><article className="mobile-body"><p>{detail.summary}</p><p className="whitespace-pre-wrap">{detail.contentText}</p></article></div>}</>;
}
