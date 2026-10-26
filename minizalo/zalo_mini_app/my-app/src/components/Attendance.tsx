import React,{useEffect,useRef,useState} from 'react';
import {scanQRCode} from 'zmp-sdk';
import {apiClient} from '@/api/client';
import {abortable} from '@/utils/async-control';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {QRCode} from './QRCode';

export function AttendanceScanner({courseId,enrollmentId,onSaved}:{courseId:string;enrollmentId:string;onSaved:()=>void}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[courseId,enrollmentId]);
  const scan=async()=>{
    if(pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');
    const timer=window.setTimeout(()=>controller.abort(),60000);
    try{
      const result=await abortable(scanQRCode(),controller.signal);
      if(controller.signal.aborted)return;
      if(!result.content?.startsWith('MLD-ATTENDANCE:')){setMessage('Mã QR không phải mã điểm danh của buổi học.');return;}
      const saved=await apiClient.checkInClass(courseId,enrollmentId,result.content,controller.signal);
      if(controller.signal.aborted)return;
      if(saved.error)setMessage(saved.error);else if(saved.attendance){setMessage('Đã lưu điểm danh.');onSaved();}
    }catch{if(pending.current===controller)setMessage(controller.signal.aborted?'Đã hết thời gian quét. Vui lòng thử lại.':'Chưa quét được mã. Kiểm tra quyền camera và thử lại.');}
    finally{clearTimeout(timer);if(pending.current===controller){pending.current=null;setBusy(false);}}
  };
  return <section className="rounded-xl border border-blue-100 p-3"><h3>Điểm danh buổi học</h3><p>Quét mã QR đang được nhân viên hiển thị tại lớp.</p><button type="button" disabled={busy} onClick={()=>void scan()} className="mt-2 rounded-lg bg-[#2860eb] px-4 py-3 text-white disabled:opacity-50">{busy?'Đang quét…':'Quét QR điểm danh'}</button>{message&&<p role="status">{message}</p>}</section>;
}

type Schedule={id:string;topic:string;courseTitle:string;batchCode:string;branchName:string;sessionDate:string;startTime:string;endTime:string;attendanceOpen:boolean};
export function AttendanceDesk(){
  const [open,setOpen]=useState(false),[schedules,setSchedules]=useState<Schedule[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  const [code,setCode]=useState<{content:string;expiresAt:string;id:string}|null>(null),[now,setNow]=useState(Date.now());
  const pending=useRef<AbortController|null>(null);
  useBackAction(open,()=>setOpen(false));
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();setBusy(true);setError('');setCode(null);
    void apiClient.getClassSchedules(controller.signal).then(result=>{if(controller.signal.aborted)return;if(result.error)setError(result.error);else setSchedules(result.schedules||[]);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return()=>{controller.abort();pending.current?.abort();pending.current=null;};
  },[open,revision]);
  useEffect(()=>{if(!code)return;const tick=()=>{setNow(Date.now());if(document.hidden)setCode(null);};const timer=window.setInterval(tick,1000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[code]);
  const issue=async(id:string)=>{
    if(pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');setCode(null);
    try{const result=await apiClient.getAttendanceCode(id,controller.signal);if(controller.signal.aborted)return;if(result.error)setError(result.error);else if(result.content&&result.expiresAt){setNow(Date.now());setCode({...result,id});}}
    finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
  };
  return <section><button type="button" onClick={()=>setOpen(!open)} className="w-full rounded-lg border p-3 text-left">Điểm danh lớp học</button>{open&&<div className="space-y-3 py-3"><button type="button" disabled={busy} onClick={()=>setRevision(x=>x+1)}>Làm mới lịch lớp</button>{busy&&<p role="status">Đang tải…</p>}{error&&<p role="alert">{error}</p>}{schedules.map(item=><article className="rounded-xl border p-3" key={item.id}><h4>{item.courseTitle}</h4><p>{item.batchCode} · {item.topic}</p><p>{item.branchName}</p><p>{item.sessionDate.slice(0,10)} · {item.startTime}–{item.endTime}</p><button type="button" disabled={busy||!item.attendanceOpen} onClick={()=>void issue(item.id)}>Hiển thị mã QR điểm danh</button>{code?.id===item.id&&(Date.parse(code.expiresAt)>now?<><QRCode value={code.content} size={200}/><p>Mã hết hạn sau {Math.max(0,Math.ceil((Date.parse(code.expiresAt)-now)/1000))} giây</p></>:<p>Mã đã hết hạn. Hãy tạo mã mới.</p>)}</article>)}</div>}</section>;
}
