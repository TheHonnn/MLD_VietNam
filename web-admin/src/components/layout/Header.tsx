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
  Building2,
  Check,
  Search,
} from 'lucide-react';
import { useAdmin } from '../../admin/Auth';
import { notificationService, branchService, AdminNotification } from '../../services';
import { Branch } from '../../types/shared_types';

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

  // Global Branch Selection State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return localStorage.getItem('mld_selected_branch_id') || 'ALL';
  });
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  // Header Search Input State
  const [headerSearch, setHeaderSearch] = useState('');
  const [showHeaderSearchPopup, setShowHeaderSearchPopup] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Load branches and listen to global branch changes
  useEffect(() => {
    branchService.getAllBranches().then((res) => {
      if (res.success && res.data) setBranches(res.data);
    });

    const handleGlobalBranchChange = (e: any) => {
      const newBranchId = e?.detail?.branchId;
      if (newBranchId) {
        setSelectedBranchId(newBranchId);
      }
    };
    window.addEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
    return () => {
      window.removeEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
    };
  }, []);

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem('mld_selected_branch_id', branchId);
    window.dispatchEvent(new CustomEvent('mld_branch_changed', { detail: { branchId } }));
    setShowBranchMenu(false);
  };

  // Subscribe to real-time notification changes
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return () => unsubscribe();
  }, []);

  // Close popovers when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setShowBranchMenu(false);
      }
      if (searchInputRef.current && !searchInputRef.current.contains(target)) {
        setShowHeaderSearchPopup(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowBranchMenu(false);
        setShowHeaderSearchPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleHeaderSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && headerSearch.trim()) {
      setShowHeaderSearchPopup(false);
      if (location.pathname === '/') {
        // If on dashboard, scroll or focus
        window.dispatchEvent(new CustomEvent('mld_search_query', { detail: { query: headerSearch.trim() } }));
      } else {
        navigate(`/customers?search=${encodeURIComponent(headerSearch.trim())}`);
      }
    }
  };

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

  const activeBranch = branches.find((b) => b.id === selectedBranchId);
  const branchLabel =
    selectedBranchId === 'ALL'
      ? 'Tất cả chi nhánh'
      : activeBranch?.name?.replace('MLD Luxury Spa & Academy - ', '') ||
        activeBranch?.name ||
        'Chi nhánh đã chọn';

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
        <div className="relative" ref={branchMenuRef}>
          <button
            type="button"
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border bg-white text-xs font-medium transition-all cursor-pointer ${
              showBranchMenu
                ? 'border-[#985018] ring-2 ring-[#985018]/10 text-[#2C241E]'
                : 'border-[#E0D7CC] text-[#4A3E34] hover:bg-[#FAF8F5]'
            }`}
          >
            <span className="truncate max-w-[140px]">{branchLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#8C7A6B] transition-transform duration-200 ${
                showBranchMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showBranchMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-50 p-2 space-y-1 animate-in fade-in-50 zoom-in-95">
              <div className="px-3 py-1.5 border-b border-[#EFE4D9] text-xs font-bold text-[#3E200C] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#985018]" />
                Chọn chi nhánh làm việc
              </div>
              <button
                type="button"
                onClick={() => handleSelectBranch('ALL')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  selectedBranchId === 'ALL'
                    ? 'bg-[#F5EBE1] text-[#985018] font-bold'
                    : 'text-[#4A3E34] hover:bg-[#FAF8F5]'
                }`}
              >
                <span>Tất cả chi nhánh ({branches.length || 2})</span>
                {selectedBranchId === 'ALL' && <Check className="w-4 h-4 text-[#985018] stroke-[2.5]" />}
              </button>

              {branches.map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBranch(b.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#F5EBE1] text-[#985018] font-bold'
                        : 'text-[#4A3E34] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="truncate mr-2">{b.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#985018] shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-36 sm:w-48" ref={searchInputRef}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              onFocus={() => setShowHeaderSearchPopup(true)}
              onKeyDown={handleHeaderSearchKeyDown}
              placeholder="Tìm kiếm..."
              className="w-full pl-3 pr-7 py-2 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] transition-colors"
            />
            {headerSearch ? (
              <button
                type="button"
                onClick={() => setHeaderSearch('')}
                className="absolute right-2 text-[#A69788] hover:text-[#5C5046]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 text-[#A69788] absolute right-2.5 pointer-events-none" />
            )}
          </div>

          {showHeaderSearchPopup && headerSearch.trim().length > 0 && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-[#EFE4D9] shadow-xl z-50 p-2 space-y-1.5 text-xs animate-in fade-in-50 zoom-in-95">
              <div className="text-[10.5px] font-bold text-[#8C7E72] px-2 py-1">
                Tìm kiếm nhanh: "{headerSearch}"
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderSearchPopup(false);
                  navigate(`/customers?search=${encodeURIComponent(headerSearch)}`);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#FAF8F5] flex items-center justify-between text-[#2C241E]"
              >
                <span>🔍 Tìm khách hàng "{headerSearch}"</span>
                <span className="text-[10px] text-[#985018] font-bold">Khách hàng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderSearchPopup(false);
                  navigate('/');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#FAF8F5] flex items-center justify-between text-[#2C241E]"
              >
                <span>📅 Tìm lịch hẹn tại Dashboard</span>
                <span className="text-[10px] text-[#985018] font-bold">Lịch hẹn</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHeaderSearchPopup(false);
                  navigate('/cashier-pos');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-[#FAF8F5] flex items-center justify-between text-[#2C241E]"
              >
                <span>🧾 Tìm hóa đơn tại Thu ngân</span>
                <span className="text-[10px] text-[#985018] font-bold">Thu ngân</span>
              </button>
            </div>
          )}
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
                  <span className="font-bold text-sm text-[#2C241E]">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#C65420] text-white">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-[#8A4F23] hover:text-[#5B3314] px-2 py-1 rounded-lg hover:bg-white/60 transition-colors flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Đọc tất cả</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg text-[#8C7A6B] hover:text-[#2C241E] hover:bg-white/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-[#EFE4D9] bg-[#FAF8F5] text-xs">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-2 font-bold text-center border-b-2 transition-all ${
                    filter === 'all'
                      ? 'border-[#985018] text-[#985018] bg-white'
                      : 'border-transparent text-[#7A6D61] hover:text-[#2C241E]'
                  }`}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={`flex-1 py-2 font-bold text-center border-b-2 transition-all ${
                    filter === 'unread'
                      ? 'border-[#985018] text-[#985018] bg-white'
                      : 'border-transparent text-[#7A6D61] hover:text-[#2C241E]'
                  }`}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {/* List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F2EAE1]">
                {visibleNotifications.length === 0 ? (
                  <div className="py-12 text-center text-[#998A7D]">
                    <BellOff className="w-10 h-10 mx-auto text-[#D4C3B3] stroke-1 mb-2" />
                    <p className="text-xs font-semibold">Không có thông báo nào</p>
                    <p className="text-[11px] text-[#B0A294] mt-0.5">
                      {filter === 'unread' ? 'Bạn đã đọc hết mọi thông báo' : 'Hệ thống chưa có tin mới'}
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
                        className={`p-3.5 transition-colors cursor-pointer flex gap-3 relative ${
                          item.isRead
                            ? 'bg-white hover:bg-[#FAF8F5]'
                            : 'bg-[#FDF9F5] hover:bg-[#FAF3EB]'
                        }`}
                      >
                        {!item.isRead && (
                          <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-[#C65420]"></span>
                        )}

                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.textColor} ${cfg.borderColor}`}
                        >
                          <Icon className="w-4 h-4 stroke-[2]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <span
                              className={`text-xs ${
                                item.isRead ? 'font-medium text-[#4A3E34]' : 'font-bold text-[#2C241E]'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[10px] text-[#A69788] whitespace-nowrap shrink-0">
                              {formatTimeAgo(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#695A4E] leading-relaxed line-clamp-2">
                            {item.message}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-[#8A4F23] bg-[#F5EBE1] px-2 py-0.5 rounded-md">
                              {item.type === 'BOOKING'
                                ? 'Lịch hẹn'
                                : item.type === 'PAYMENT'
                                ? 'Thanh toán'
                                : item.type === 'ACADEMY'
                                ? 'Đào tạo'
                                : 'Hệ thống'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {item.link && (
                                <span className="text-[10px] text-[#985018] font-bold hover:underline flex items-center gap-0.5">
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
