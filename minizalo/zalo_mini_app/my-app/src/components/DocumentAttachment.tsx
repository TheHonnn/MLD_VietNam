import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import {openDocument} from 'zmp-sdk';
import {FileTextIcon} from './Icons';
import {abortable} from '@/utils/async-control';
import {useBackAction} from '@/hooks/useNavigationHistory';
const ReadOnlyPdf=lazy(()=>import('./ReadOnlyPdf'));
export function DocumentAttachment({file,canDownload=true,watermark}:{file:{url:string;name:string;canDownload?:boolean};canDownload?:boolean;watermark?:string}){
  const [reading,setReading]=useState(false);
  useBackAction(reading,()=>setReading(false),3);
  const downloadable=canDownload&&file.canDownload!==false;
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef<AbortController|null>(null);
  useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
  let url:URL;try{url=new URL(file.url);if(url.protocol!=='https:'||url.username||url.password)return null;}catch{return null;}
  const pdf=/\.pdf$/i.test(url.pathname)||/\.pdf$/i.test(file.name);
  if(!downloadable)return <div><button type="button" disabled={busy} onClick={async()=>{
    if(pdf){setReading(true);return;}if(pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');const timer=setTimeout(()=>controller.abort(),20000);
    try{await abortable(openDocument({url:url.href,title:file.name,share:false,download:false,edit:false}),controller.signal);}catch{if(pending.current===controller)setError('Không thể mở tài liệu chỉ đọc trên thiết bị này.');}finally{clearTimeout(timer);if(pending.current===controller){pending.current=null;setBusy(false);}}
  }} className="record-row"><FileTextIcon size={18}/>{file.name}</button>{error&&<p role="alert">{error}</p>}{reading&&<Suspense fallback={<p role="status">Đang mở tài liệu...</p>}><ReadOnlyPdf url={url.href} title={file.name} watermark={watermark} onClose={()=>setReading(false)}/></Suspense>}</div>;
  return <div><a href={url.href} target="_blank" rel="noopener noreferrer" aria-busy={busy} onClick={async event=>{
    if(!pdf||!(/Zalo/i.test(navigator.userAgent)||Boolean((window as any).ZJSBridge)))return;
    event.preventDefault();if(pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');const timer=window.setTimeout(()=>controller.abort(),20000);
    try{await abortable(openDocument({url:url.href,title:file.name,share:false,download:true,edit:false}),controller.signal);}catch{if(pending.current===controller)setError('Không thể mở tài liệu. Vui lòng thử lại.');}finally{clearTimeout(timer);if(pending.current===controller){pending.current=null;setBusy(false);}}
  }}><FileTextIcon size={18}/>{file.name}</a>{error&&<p role="alert">{error}</p>}</div>;
}
