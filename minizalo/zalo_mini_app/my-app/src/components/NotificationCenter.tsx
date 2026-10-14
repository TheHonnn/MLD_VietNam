import React, { useMemo, useState } from 'react';
import { apiClient } from '@/api/client';
import { AppNotification } from '../../../../backend/src/data/database';
import { ArrowLeftIcon, BellIcon, CalendarIcon, NavAcademyIcon } from '@/components/Icons';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onClose: () => void;
  onChange: (notifications: AppNotification[]) => void;
}

const relativeTime = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onChange }) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy, setBusy] = useState(false);
  const visible = useMemo(() => filter === 'unread' ? notifications.filter((item) => !item.isRead) : notifications, [filter, notifications]);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const readOne = async (item: AppNotification) => {
    if (item.isRead) return;
    onChange(notifications.map((current) => current.id === item.id ? { ...current, isRead: true } : current));
    await apiClient.markNotificationRead(item.id);
  };

  const readAll = async () => {
    if (!unreadCount || busy) return;
    setBusy(true);
    const response = await apiClient.markAllNotificationsRead();
    setBusy(false);
    if (response) onChange(notifications.map((item) => ({ ...item, isRead: true })));
  };

  return <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F]">
    <header className="shrink-0 border-b border-[#E8DDD2] bg-white px-4 pb-3 pt-4">
      <div className="flex items-center justify-between"><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DED2C5] bg-white"><ArrowLeftIcon size={18} color="#40352F" /></button><button onClick={readAll} disabled={!unreadCount || busy} className="text-[10px] font-bold text-[#A65317] disabled:text-[#A79C95]">{busy ? 'Đang cập nhật...' : 'Đọc tất cả'}</button></div>
      <h1 className="mt-3 text-[21px] font-bold text-[#6F452C]">Thông báo</h1>
      <p className="mt-1 text-[10px] text-[#6F625B]">{unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem tất cả thông báo'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">{([['all', `Tất cả (${notifications.length})`], ['unread', `Chưa đọc (${unreadCount})`]] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`h-9 rounded-[8px] border text-[10px] font-semibold ${filter === id ? 'border-[#A65317] bg-[#A65317] text-white' : 'border-[#DED2C5] bg-white'}`}>{label}</button>)}</div>
    </header>
    <main className="flex-1 space-y-2 overflow-y-auto px-3 py-3 pb-20">
      {visible.length === 0 ? <div className="rounded-[10px] border border-[#DED2C5] bg-white p-8 text-center"><BellIcon size={24} color="#A65317" /><p className="mt-3 text-[11px] font-bold">Không có thông báo mới</p><p className="mt-1 text-[9px] text-[#7A685D]">Các thay đổi về lịch hẹn và khóa học sẽ xuất hiện tại đây.</p></div> : visible.map((item) => {
        const Icon = item.type === 'course' ? NavAcademyIcon : CalendarIcon;
        return <button key={item.id} onClick={() => readOne(item)} className={`flex w-full gap-3 rounded-[10px] border p-3 text-left ${item.isRead ? 'border-[#E8DDD2] bg-white' : 'border-[#E4C6AA] bg-[#FFF8F1]'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${item.isRead ? 'bg-[#F4F0EB]' : 'bg-[#F3E2CE]'}`}><Icon size={17} color="#A65317" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="text-[11px]">{item.title}</strong>{!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#C65420]" />}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#6F625B]">{item.message}</span><span className="mt-2 block text-[8px] text-[#9A8D84]">{relativeTime(item.createdAt)}</span></span></button>;
      })}
    </main>
  </div>;
};
