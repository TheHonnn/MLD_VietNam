import React,{useEffect,useRef,useState} from 'react';
import {closeApp} from 'zmp-sdk';
import {apiClient} from '@/api/client';
import {abortable} from '@/utils/async-control';
import {useBackAction} from '@/hooks/useNavigationHistory';
import {ArrowLeftIcon,ShieldIcon,ArrowRightIcon} from './Icons';
import '@/css/account-controls.scss';

export function ZaloAccountOptions({busy,onLogin,onCancel}:{busy:boolean;onLogin:(manageDevices?:boolean)=>void;onCancel:()=>void}){
  const [open,setOpen]=useState(false),[switching,setSwitching]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const leave=async()=>{
    if(lock.current||busy)return;lock.current=true;setSwitching(true);setError('');
    const pending=apiClient.logout(),epoch=apiClient.sessionVersion();
    let revoked=false;
    try{
      const result=await pending;if(epoch!==apiClient.sessionVersion())return;
      if('error' in result)throw new Error(result.error);
      revoked=true;
      const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),8000);
      try{await abortable(closeApp(),controller.signal);}finally{clearTimeout(timer);}
    }catch{
      if(epoch!==apiClient.sessionVersion())return;
      const message=revoked?'Phiên MLD đã đóng. Hãy đóng Mini App, đổi tài khoản trong Zalo rồi mở lại MLD.':'Đã đăng xuất trên máy nhưng chưa thu hồi được phiên trên máy chủ. Khi có mạng, hãy đăng nhập lại và đăng xuất các phiên khác.';
      if(mounted.current)setError(message);
      window.dispatchEvent(new CustomEvent('mld:auth-notice',{detail:{message}}));
    }finally{lock.current=false;if(mounted.current)setSwitching(false);}
  };
  return <div className="account-options">
    {busy?<button type="button" className="account-link" onClick={onCancel}>Hủy kết nối</button>:<button type="button" className="account-link" aria-expanded={open} disabled={switching} onClick={()=>{setOpen(value=>!value);setError('');}}>Đổi tài khoản / dùng máy khác <ArrowRightIcon size={16}/></button>}
    {open&&!busy&&<div className="account-options-actions">
      <button type="button" disabled={switching} onClick={()=>onLogin()}>Đăng nhập lại với Zalo</button>
      <button type="button" disabled={switching} onClick={()=>onLogin(true)}><ShieldIcon size={18}/>Đăng nhập và quản lý phiên</button>
      <button type="button" disabled={switching} onClick={()=>void leave()}>{switching?'Đang đóng phiên...':'Đóng Mini App để đổi Zalo'}</button>
    </div>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}

type AccountSession={id:string;deviceLabel:string;createdAt:string;lastSeenAt:string;expiresAt:string;isCurrent:boolean};
const time=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
export function AccountSessions({userId,userName,phone,onClose,onLogout}:{userId:string;userName:string;phone?:string;onClose:()=>void;onLogout:()=>Promise<void>}){
  const [items,setItems]=useState<AccountSession[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[version,setVersion]=useState(0),[hasMore,setHasMore]=useState(false);
  const [confirm,setConfirm]=useState<{id?:string;label:string}|null>(null),lock=useRef(false),mounted=useRef(true);
  const request=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current++;};},[]);
  useBackAction(true,()=>{if(!lock.current){if(confirm)setConfirm(null);else onClose();}},3);
  useEffect(()=>{
    const revision=++request.current;if(busy)return;
    const controller=new AbortController();setLoading(true);setError('');
    apiClient.getAccountSessions(controller.signal).then(result=>{
      if(!mounted.current||revision!==request.current)return;
      if(!Array.isArray(result?.sessions)){if(result?.status===401||result?.status===403)setItems([]);setError(result?.error||'Không thể tải phiên đăng nhập.');return;}
      setItems(result.sessions);setHasMore(result.hasMore===true);
    }).catch(()=>{if(mounted.current&&revision===request.current)setError('Không thể tải phiên đăng nhập.');}).finally(()=>{if(mounted.current&&revision===request.current)setLoading(false);});
    return()=>controller.abort();
  },[userId,version,busy]);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden&&!lock.current)setVersion(value=>value+1);};
    const timer=window.setInterval(refresh,30000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  const revoke=async()=>{
    if(!confirm||lock.current)return;lock.current=true;request.current++;setBusy(true);setError('');setNotice('');
    const target=confirm,epoch=apiClient.sessionVersion();
    try{
      const result=await apiClient.revokeAccountSession(target.id);
      if(!mounted.current||epoch!==apiClient.sessionVersion())return;
      if(!result?.revoked){setError(result?.error||'Không thể thu hồi phiên đăng nhập.');return;}
      if(target.id&&items.some(item=>item.id===target.id&&item.isCurrent)){await onLogout();return;}
      setConfirm(null);setNotice('Đã đăng xuất phiên được chọn.');setVersion(value=>value+1);
    }finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  return <section className="account-sessions" role="dialog" aria-modal="true" aria-labelledby="account-sessions-title">
    <header><button type="button" title="Đóng quản lý phiên" disabled={busy} onClick={onClose}><ArrowLeftIcon size={20}/></button><h1 id="account-sessions-title">Tài khoản & thiết bị</h1></header>
    <main><p className="account-owner"><strong>{userName}</strong>{phone&&<span>{phone.slice(0,3)}***{phone.slice(-3)}</span>}</p>{loading&&!busy&&<p role="status">Đang tải phiên đăng nhập...</p>}{error&&<div role="alert">{error}<button type="button" disabled={busy||loading} onClick={()=>setVersion(value=>value+1)}>Thử lại</button></div>}{notice&&<p role="status">{notice}</p>}
      {hasMore&&<p>100 phiên gần nhất</p>}
      {items.map(item=><article className="account-session" key={item.id} data-session-id={item.id}><div><strong>{item.deviceLabel}</strong>{item.isCurrent&&<span>Phiên hiện tại</span>}</div><p>Đăng nhập: {time(item.createdAt)}</p><p>Hoạt động gần nhất: {time(item.lastSeenAt)}</p><p>Hết hạn: {time(item.expiresAt)}</p><button type="button" disabled={busy||loading} onClick={()=>setConfirm({id:item.id,label:item.isCurrent?'phiên hiện tại':item.deviceLabel})}>Đăng xuất phiên</button></article>)}
    </main>
    <footer><button type="button" disabled={busy||loading||(!hasMore&&!items.some(item=>!item.isCurrent))} onClick={()=>setConfirm({label:'tất cả phiên khác'})}>Đăng xuất các phiên khác</button><button type="button" disabled={busy} onClick={()=>setVersion(value=>value+1)}>Cập nhật danh sách</button></footer>
    {confirm&&<div className="account-confirm" role="alertdialog" aria-modal="true" aria-label="Xác nhận đăng xuất phiên"><div><h2>Đăng xuất {confirm.label}?</h2><p>Dữ liệu trên hệ thống được giữ nguyên.</p><button type="button" disabled={busy} onClick={()=>void revoke()}>{busy?'Đang đăng xuất...':'Xác nhận đăng xuất'}</button><button type="button" disabled={busy} onClick={()=>setConfirm(null)}>Hủy</button></div></div>}
  </section>;
}
