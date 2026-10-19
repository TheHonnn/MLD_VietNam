import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAdmin } from '../../admin/Auth';

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

export const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAdmin();
  const currentTitle = breadcrumbs[location.pathname] || 'Tổng quan vận hành';

  const userInitials = (user?.full_name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <header className="h-[68px] bg-white border-b border-[#EFE4D9] px-6 flex items-center justify-between relative z-20 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left: Vertically Stacked Breadcrumb + Badge */}
      <div className="flex flex-col justify-center">
        <div className="text-[12.5px] text-[#7A6D61] font-normal leading-tight">
          Quản trị <span className="mx-1 text-[#C4B7AA]">/</span>{' '}
          <span className="text-[#2C241E] font-medium">{currentTitle}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#137333] leading-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-[#137333]"></span>
            Supabase Cloud Live
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

        {/* Bell notification */}
        <button
          title="Thông báo"
          className="p-1.5 rounded-lg text-[#7A6D61] hover:bg-[#FAF8F5] transition-colors"
        >
          <Bell className="w-4 h-4 stroke-[1.8]" />
        </button>

        {/* User profile & Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#EFE4D9]">
          <div className="w-8 h-8 rounded-full bg-[#F0E5D8] text-[#8C4C22] font-bold text-xs flex items-center justify-center shrink-0">
            {userInitials || 'QT'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[#2C241E] leading-tight max-w-[140px] truncate" title={user?.full_name}>
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
