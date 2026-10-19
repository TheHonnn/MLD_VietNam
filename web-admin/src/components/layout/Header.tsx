import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Calendar,
  CreditCard,
  GraduationCap,
  Sparkles,
  CheckCheck,
  Trash2,
  X,
  BellOff,
  ExternalLink,
} from 'lucide-react';
import { useAdmin } from '../../admin/Auth';
import { notificationService, AdminNotification } from '../../services';

const breadcrumbs: Record<string, string> = {
  '/': 'Tổng quan vận hành',
  '/branches': 'Quản lý chi nhánh',
  '/customers': 'Khách hàng',
  '/customer-detail': 'Hồ sơ khách hàng',
  '/customers/detail': 'Hồ sơ khách hàng',
  '/staff-schedule': 'Lịch kỹ thuật viên',
  '/medical-records': 'Quản lý liệu trình',
  '/treatment-management': 'Quản lý liệu trình',
  '/services-catalog': 'Quản lý liệu trình',
  '/cashier-pos': 'Thu ngân',
  '/academy-enrollment': 'Tuyển sinh',
  '/instructors': 'Giảng viên',
  '/attendance': 'Học viên',
  '/curriculum': 'Vận hành đào tạo',
  '/reports': 'Báo cáo doanh thu',
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Quản trị tối cao',
  ADMIN: 'Quản trị viên',
  BRANCH_MANAGER: 'Quản lý chi nhánh',
  CASHIER: 'Thu ngân',
  RECEPTIONIST: 'Lễ tân tiếp đón',
  INSTRUCTOR: 'Giảng viên',
  TECHNICIAN: 'Kỹ thuật viên',
};

const formatTimeAgo = (isoString: string): string => {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(isoString));
};

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAdmin();
  const currentTitle = breadcrumbs[location.pathname] || 'Tổng quan vận hành';

  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time notification changes
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return () => unsubscribe();
  }, []);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const handleItemClick = (item: AdminNotification) => {
    notificationService.markAsRead(item.id);
    if (item.link) {
      navigate(item.link);
      setShowNotifications(false);
    }
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    notificationService.deleteNotification(id);
  };

  const getCategoryConfig = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return {
          icon: Calendar,
          bg: 'bg-[#FAF0E6]',
          textColor: 'text-[#8A4F23]',
          borderColor: 'border-[#EAD5C3]',
        };
      case 'PAYMENT':
        return {
          icon: CreditCard,
          bg: 'bg-[#E8F5E9]',
          textColor: 'text-[#2E7D32]',
          borderColor: 'border-[#C8E6C9]',
        };
      case 'ACADEMY':
        return {
          icon: GraduationCap,
          bg: 'bg-[#EDE7F6]',
          textColor: 'text-[#5E35B1]',
          borderColor: 'border-[#D1C4E9]',
        };
      default:
        return {
          icon: Sparkles,
          bg: 'bg-[#F5EBE1]',
          textColor: 'text-[#985018]',
          borderColor: 'border-[#E8DACB]',
        };
    }
  };

  const userInitials = (user?.full_name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <header className="h-[68px] bg-white border-b border-[#EFE4D9] px-6 flex items-center justify-between relative z-30 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left: Vertically Stacked Breadcrumb + Badge */}
      <div className="flex flex-col justify-center">
        <div className="text-[12.5px] text-[#7A6D61] font-normal leading-tight">
          Quản trị <span className="mx-1 text-[#C4B7AA]">/</span>{' '}
          <span className="text-[#2C241E] font-medium">{currentTitle}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#137333] leading-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-[#137333]"></span>
            Hệ thống trực tuyến
          </span>
        </div>
      </div>

      {/* Right Controls: Branch Select, Search, Bell, User Profile */}
      <div className="flex items-center gap-3">
        {/* Branch dropdown */}
        <button className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors">
          <span>
            {location.pathname === '/staff-schedule' || location.pathname === '/cashier-pos'
              ? 'Quận 3'
              : 'Tất cả chi nhánh'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B]" />
        </button>

        {/* Search input */}
        <div className="relative w-36 sm:w-44">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full px-3.5 py-2 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* Bell notification with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Thông báo hệ thống"
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              showNotifications
                ? 'bg-[#F3E2CE] text-[#8A4F23]'
                : 'text-[#7A6D61] hover:bg-[#FAF8F5] hover:text-[#2C241E]'
            }`}
          >
            <Bell className="w-4 h-4 stroke-[2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C65420] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-in zoom-in-50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Center Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] bg-white rounded-2xl shadow-xl border border-[#EFE4D9] overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-[#EFE4D9] bg-gradient-to-r from-[#FAF6F0] to-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F3E2CE] text-[#8A4F23] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#2C241E] leading-none">
                      Thông báo hệ thống
                    </h3>
                    <p className="text-[11px] text-[#8C7A6B] mt-1 font-medium">
                      {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Đã cập nhật mới nhất'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      title="Đánh dấu tất cả đã đọc"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#8A4F23] hover:bg-[#F3E2CE] rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Đọc tất cả</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-[#A69788] hover:text-[#2C241E] rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-4 pt-2.5 pb-2 bg-white border-b border-[#F4ECE3] flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-[#8A4F23] text-white shadow-xs'
                      : 'bg-[#FAF6F0] text-[#7A6D61] hover:text-[#2C241E]'
                  }`}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === 'unread'
                      ? 'bg-[#8A4F23] text-white shadow-xs'
                      : 'bg-[#FAF6F0] text-[#7A6D61] hover:text-[#2C241E]'
                  }`}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F4ECE3]">
                {visibleNotifications.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF5EF] text-[#B0A294] flex items-center justify-center mb-3">
                      <BellOff className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <p className="text-xs font-bold text-[#4A3E34]">Không có thông báo nào</p>
                    <p className="text-[11px] text-[#8C7A6B] mt-1 max-w-[240px] mx-auto">
                      {filter === 'unread'
                        ? 'Bạn đã đọc toàn bộ thông báo. Hệ thống sẽ báo khi có cập nhật mới.'
                        : 'Hiện tại chưa có thông báo phát sinh nào.'}
                    </p>
                  </div>
                ) : (
                  visibleNotifications.map((item) => {
                    const cfg = getCategoryConfig(item.type);
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-3.5 transition-all flex items-start gap-3 cursor-pointer group ${
                          item.isRead ? 'bg-white hover:bg-[#FAF8F5]' : 'bg-[#FFF9F3] hover:bg-[#FFF3E8]'
                        }`}
                      >
                        {/* Type Icon Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl ${cfg.bg} ${cfg.textColor} border ${cfg.borderColor} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4
                              className={`text-xs leading-tight line-clamp-1 ${
                                item.isRead ? 'font-semibold text-[#2C241E]' : 'font-extrabold text-[#2C241E]'
                              }`}
                            >
                              {item.title}
                            </h4>
                            {!item.isRead && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#C65420] shrink-0 mt-1"
                                title="Chưa đọc"
                              />
                            )}
                          </div>

                          <p className="text-[11.5px] text-[#695A4E] leading-relaxed mt-1 line-clamp-2">
                            {item.message}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#F8EFE6]/60">
                            <span className="text-[10px] text-[#A69788] font-medium">
                              {formatTimeAgo(item.createdAt)}
                            </span>

                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.link && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8A4F23]">
                                  <span>Xem chi tiết</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, item.id)}
                                title="Xóa thông báo"
                                className="p-1 text-[#B0A294] hover:text-[#B83E3E] rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Popover Footer */}
              <div className="px-4 py-2.5 bg-[#FAF6F0] border-t border-[#EFE4D9] flex items-center justify-between text-[11px] text-[#8C7A6B]">
                <span>Tự động cập nhật thời gian thực</span>
                <span className="font-semibold text-[#8A4F23]">MLD Healthcare</span>
              </div>
            </div>
          )}
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#EFE4D9]">
          <div className="w-8 h-8 rounded-full bg-[#F0E5D8] text-[#8C4C22] font-bold text-xs flex items-center justify-center shrink-0">
            {userInitials || 'QT'}
          </div>
          <div className="hidden sm:block text-left">
            <div
              className="text-xs font-bold text-[#2C241E] leading-tight max-w-[140px] truncate"
              title={user?.full_name}
            >
              {user?.full_name || 'Quản lý hệ thống'}
            </div>
            <div className="text-[10px] text-[#8A4F23] font-medium leading-tight mt-0.5">
              {roleLabels[user?.role || ''] || user?.role || 'Admin'}
            </div>
          </div>

          <button
            onClick={logout}
            title="Đăng xuất khỏi hệ thống"
            className="p-2 ml-1 rounded-xl text-[#7A6D61] hover:text-[#9B1C1C] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>
      </div>
    </header>
  );
};
