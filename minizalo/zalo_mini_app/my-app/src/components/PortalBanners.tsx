import React,{useState} from 'react';
import {useCarousel} from '@/hooks/useCarousel';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {portalTarget} from '@/utils/portal-target';
import {EntityImage} from './GroupBExtensions';
import {ArrowLeftIcon} from './Icons';

export interface PortalBanner {id:string;title:string;summary?:string;contentText?:string;imageUrl?:string;targetLink?:string;category?:string;authorName?:string;}
export function PortalBanners({items,paused,onNavigate}:{items:PortalBanner[];paused:boolean;onNavigate:(screen:string)=>void}){
  const [detail,setDetail]=useState<PortalBanner|null>(null),[interacting,setInteracting]=useState(false);
  const {index,select}=useCarousel(items.map(item=>item.id),paused||Boolean(detail)||interacting);
  useBackAction(Boolean(detail),()=>setDetail(null),2);
  const banner=items[index];
  if(!banner)return null;
  const target=portalTarget(banner.targetLink);
  return <section className="home-portal" aria-label="Thông tin MLD" onPointerEnter={()=>setInteracting(true)} onPointerLeave={()=>setInteracting(false)} onFocusCapture={()=>setInteracting(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setInteracting(false);}}>
    {target?.external?<a className="home-portal-item" href={target.external} target="_blank" rel="noopener noreferrer"><EntityImage src={banner.imageUrl} alt={banner.title}/><span><strong>{banner.title}</strong>{banner.summary&&<p>{banner.summary}</p>}</span></a>:<button type="button" className="home-portal-item" onClick={()=>target?.screen?onNavigate(target.screen):setDetail(banner)}><EntityImage src={banner.imageUrl} alt={banner.title}/><span>{banner.category&&<small>{banner.category}</small>}<strong>{banner.title}</strong>{banner.summary&&<p>{banner.summary}</p>}</span></button>}
    <div className="home-pagination" aria-label="Chọn banner">{items.map((item,i)=><button key={item.id} type="button" aria-label={`Banner ${i+1}: ${item.title}`} aria-pressed={index===i} onClick={()=>select(item.id)}><span/></button>)}</div>
    {target?.external?<a className="home-portal-action" href={target.external} target="_blank" rel="noopener noreferrer">Xem thêm</a>:target?.screen&&<button type="button" className="home-portal-action" onClick={()=>onNavigate(target.screen!)}>Xem thêm</button>}
    {detail&&<div role="dialog" aria-modal="true" aria-label={detail.title} className="portal-detail"><header><button type="button" title="Đóng thông tin" onClick={()=>setDetail(null)}><ArrowLeftIcon size={20}/></button><h2>{detail.title}</h2></header><article>{detail.imageUrl&&<EntityImage src={detail.imageUrl} alt={detail.title}/>}<p>{[detail.category,detail.authorName].filter(Boolean).join(' · ')}</p><p>{detail.summary}</p><div>{detail.contentText}</div></article></div>}
  </section>;
}
