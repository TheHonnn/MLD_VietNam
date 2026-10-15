import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Store,
  Users,
  Calendar,
  Leaf,
  CreditCard,
  Contact,
  Presentation,
  GraduationCap,
  BookOpen,
  LineChart,
  HelpCircle,
  Settings,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const sections = [
    {
      title: 'VẬN HÀNH SPA',
      items: [
        { name: 'Tổng quan', path: '/', icon: LayoutGrid },
        { name: 'Chi nhánh', path: '/branches', icon: Store },
        { name: 'Khách hàng', path: '/customers', icon: Users },
        { name: 'Lịch kỹ thuật viên', path: '/staff-schedule', icon: Calendar },
        { name: 'Liệu trình', path: '/medical-records', icon: Leaf },
        { name: 'Thu ngân', path: '/cashier-pos', icon: CreditCard },
      ],
    },
    {
      title: 'HỌC VIỆN',
      items: [
        { name: 'Tuyển sinh', path: '/academy-enrollment', icon: Contact },
        { name: 'Giảng viên', path: '/instructors', icon: Presentation },
        { name: 'Học viên', path: '/attendance', icon: GraduationCap },
        { name: 'Vận hành đào tạo', path: '/curriculum', icon: BookOpen },
      ],
    },
    {
      title: 'PHÂN TÍCH',
      items: [
        { name: 'Báo cáo doanh thu', path: '/reports', icon: LineChart },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-[#EFE4D9] min-h-screen flex flex-col shrink-0 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Brand Logo Header Box (Exact Figma Pill Shape) */}
      <div className="p-3.5 pb-2">
        <NavLink
          to="/"
          title="MLD Vietnam - Tổng quan vận hành"
          className="border border-[#D8C4B2] rounded-2xl px-3 py-2 bg-white flex items-center justify-center h-[56px] shadow-xs hover:border-[#BA7E4C] transition-colors"
        >
          <img
            src="/logo.png"
            alt="MLD Vietnam - Cộng Đồng Dẫn Lưu Bạch Huyết Việt Nam"
            className="w-full h-full object-contain"
          />
        </NavLink>
      </div>

      {/* Workspace Section Header */}
      <div className="px-4 pt-2 pb-1.5">
        <span className="text-[10px] font-bold text-[#A69788] uppercase tracking-wider">
          KHÔNG GIAN QUẢN TRỊ
        </span>
      </div>

      {/* Navigation Sections */}
      <nav className="px-3 py-1 space-y-3.5 flex-1">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="px-2 mb-1 text-[9.5px] font-bold text-[#A69788] uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => {
                      const isItemActive =
                        isActive ||
                        (item.path === '/customers' &&
                          location.pathname.startsWith('/customer'));
                      return `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isItemActive
                          ? 'bg-[#F3E2CE] text-[#8A4F23] shadow-xs'
                          : 'text-[#4A3E34] hover:bg-[#FAF7F2] hover:text-[#2C241E]'
                      }`;
                    }}
                  >
                    {({ isActive }) => {
                      const isItemActive =
                        isActive ||
                        (item.path === '/customers' &&
                          location.pathname.startsWith('/customer'));
                      return (
                        <>
                          <Icon
                            className={`w-4 h-4 shrink-0 stroke-[1.8] ${
                              isItemActive ? 'text-[#8A4F23]' : 'text-[#8C7A6B]'
                            }`}
                          />
                          <span>{item.name}</span>
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Support & Settings */}
      <div className="p-3 border-t border-[#EFE4D9] space-y-0.5 mt-auto">
        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#7A6D61] hover:bg-[#FAF7F2] transition-colors">
          <HelpCircle className="w-4 h-4 text-[#8C7A6B] stroke-[1.8]" />
          <span>Cần hỗ trợ?</span>
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#7A6D61] hover:bg-[#FAF7F2] transition-colors">
          <Settings className="w-4 h-4 text-[#8C7A6B] stroke-[1.8]" />
          <span>Cài đặt</span>
        </button>
        <div className="pt-2 px-3">
          <p className="text-[10px] text-[#A69788]">Giao diện minh họa tĩnh</p>
        </div>
      </div>
    </aside>
  );
};
