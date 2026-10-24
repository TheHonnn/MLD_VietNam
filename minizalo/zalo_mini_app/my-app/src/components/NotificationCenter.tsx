import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { AppNotification } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, BellIcon, CalendarIcon, NavAcademyIcon } from '@/components/Icons';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onOpen: (notification: AppNotification) => Promise<void>;
  loadError?: string;
  onRefresh: () => void;
  unreadCount:number;
  totalCount:number;
  onUnreadCount:(value:number)=>void;
  hasMore:boolean;
  loadingMore:boolean;
  onLoadMore:()=>void;
  filter:'all'|'unread';
  onFilter:(filter:'all'|'unread')=>void;
}

const relativeTime = (value: string) => {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onChange, onOpen, loadError, onRefresh,unreadCount,totalCount,onUnreadCount,hasMore,loadingMore,onLoadMore,filter,onFilter:setFilter }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const visible = useMemo(() => filter === 'unread' ? notifications.filter((item) => !item.isRead) : notifications, [filter, notifications]);

  const readOne = async (item: AppNotification) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const epoch=apiClient.sessionVersion();
    try {
      if (!item.isRead) {
        const response = await apiClient.markNotificationRead(item.id);
        if(!mounted.current||epoch!==apiClient.sessionVersion())return;
        if (!response?.notification || response.error) throw new Error(response?.error || 'Không thể cập nhật thông báo. Vui lòng thử lại.');
        onChange(current => current.map(value => value.id === item.id ? {...value,isRead:true} : value));
        if(Number.isInteger(response.unreadCount))onUnreadCount(response.unreadCount);
      }
      if(mounted.current&&epoch===apiClient.sessionVersion())await onOpen(item);
    } catch (failure) { if(mounted.current&&epoch===apiClient.sessionVersion())setError(failure instanceof Error ? failure.message : 'Không thể mở thông báo. Vui lòng thử lại.'); }
    finally { lock.current = false; if(mounted.current)setBusy(false); }
  };

  const readAll = async () => {
    if (!unreadCount || lock.current || loadingMore) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const ids = new Set(notifications.map(item => item.id));
    const epoch=apiClient.sessionVersion();
    try {
      const response = await apiClient.markAllNotificationsRead();
      if(!mounted.current||epoch!==apiClient.sessionVersion())return;
      if (!response?.updated || response.error) throw new Error(response?.error || 'Không thể cập nhật thông báo. Vui lòng thử lại.');
      onChange(current => current.map(item => ids.has(item.id) ? {...item,isRead:true} : item));
      if(Number.isInteger(response.unreadCount))onUnreadCount(response.unreadCount);
    } catch (failure) { if(mounted.current&&epoch===apiClient.sessionVersion())setError(failure instanceof Error ? failure.message : 'Không thể cập nhật thông báo.'); }
    finally { lock.current = false; if(mounted.current)setBusy(false); }
  };

  return <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#ffffff] text-[#183b47]">
    <header className="shrink-0 border-b border-[#dbe8eb] bg-white px-4 pb-3 pt-4">
      <div className="flex items-center justify-between"><button type="button" title="Quay lại" aria-label="Quay lại" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#c8dde3] bg-white"><ArrowLeftIcon size={18} color="#183b47" /></button><button onClick={readAll} disabled={!unreadCount || busy} className="text-[10px] font-bold text-[#087e9c] disabled:text-[#A79C95]">{busy ? 'Đang cập nhật...' : 'Đọc tất cả'}</button></div>
      <h1 className="mt-3 text-[21px] font-bold text-[#164e63]">Thông báo</h1>
      <p className="mt-1 text-[10px] text-[#526a73]">{unreadCount ? `${unreadCount} thông báo chưa đọc` : ''}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">{([['all', `Tất cả (${totalCount})`], ['unread', `Chưa đọc (${unreadCount})`]] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`h-9 rounded-[8px] border text-[10px] font-semibold ${filter === id ? 'border-[#087e9c] bg-[#087e9c] text-white' : 'border-[#c8dde3] bg-white'}`}>{label}</button>)}</div>
    </header>
    <main className="flex-1 space-y-2 overflow-y-auto px-3 py-3 pb-20">
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {loadError && <div role="alert" className="text-xs text-red-700">{loadError}<button className="ml-2 underline" onClick={onRefresh}>Thử lại</button></div>}
      {visible.map((item) => {
        const Icon = item.type.toUpperCase() === 'COURSE' ? NavAcademyIcon : CalendarIcon;
        return <button key={item.id} disabled={busy} onClick={() => void readOne(item)} className={`flex w-full gap-3 rounded-[8px] border p-3 text-left disabled:opacity-60 ${item.isRead ? 'border-[#dbe8eb] bg-white' : 'border-[#E4C6AA] bg-[#FFF8F1]'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${item.isRead ? 'bg-[#F4F0EB]' : 'bg-[#e8f4f7]'}`}><Icon size={17} color="#087e9c" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="text-[11px]">{item.title}</strong>{!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#C65420]" />}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#526a73]">{item.message}</span><span className="mt-2 block text-[8px] text-[#9A8D84]">{relativeTime(item.createdAt)}</span></span></button>;
      })}
      {hasMore&&<button className="min-h-10 w-full rounded-[8px] border bg-white text-xs" disabled={loadingMore||busy} onClick={onLoadMore}>{loadingMore?'Đang tải...':'Xem thông báo cũ hơn'}</button>}
    </main>
  </div>;
};
