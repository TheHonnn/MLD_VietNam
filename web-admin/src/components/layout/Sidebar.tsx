import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SidebarItem, menuResources } from '../../admin/SidebarItem';
import { adminApi, Resource } from '../../admin/api';
import { DEFAULT_RESOURCES } from '../../admin/defaultResources';
import { toast } from '../common';
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
  Ticket,
  UserRoundCog,
  BadgeCheck,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>(DEFAULT_RESOURCES);
  useEffect(() => {
    const controller = new AbortController();
    adminApi<Resource[]>('resources', undefined, controller.signal)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setResources(res);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const sections: { title: string; items: { name: string; path: string; icon: LucideIcon; onlyWhenAllowed?: boolean }[] }[] = [
    {
      title: 'VẬN HÀNH SPA',
      items: [
        { name: 'Tổng quan', path: '/', icon: LayoutGrid },
        { name: 'Chi nhánh', path: '/branches', icon: Store },
        { name: 'Khách hàng', path: '/customers', icon: Users },
        { name: 'Dịch vụ', path: '/manage/services', icon: Leaf, onlyWhenAllowed: true },
        { name: 'Nhân viên', path: '/manage/staff_profiles', icon: UserRoundCog, onlyWhenAllowed: true },
        { name: 'Lịch kỹ thuật viên', path: '/staff-schedule', icon: Calendar },
        { name: 'Liệu trình', path: '/medical-records', icon: Leaf },
        { name: 'Thu ngân', path: '/cashier-pos', icon: CreditCard },
        { name: 'Voucher & hội viên', path: '/manage/coupons', icon: Ticket, onlyWhenAllowed: true },
      ],
    },
    {
      title: 'HỌC VIỆN',
      items: [
        { name: 'Tuyển sinh', path: '/academy-enrollment', icon: Contact },
        { name: 'Giảng viên', path: '/instructors', icon: Presentation },
        { name: 'Học viên', path: '/attendance', icon: GraduationCap },
        { name: 'Vận hành đào tạo', path: '/curriculum', icon: BookOpen },
        { name: 'Chứng chỉ', path: '/manage/student_certificates', icon: BadgeCheck, onlyWhenAllowed: true },
      ],
    },
    {
      title: 'PHÂN TÍCH',
      items: [
        { name: 'Báo cáo doanh thu', path: '/reports', icon: LineChart },
      ],
    },
    {
      title: 'HỆ THỐNG',
      items: [{ name: 'Phân quyền', path: '/manage/roles', icon: ShieldCheck, onlyWhenAllowed: true }],
    },
  ];

  return (
    <aside className="w-60 h-full min-h-0 overflow-y-auto overscroll-contain bg-white border-r border-[#EFE4D9] flex flex-col shrink-0 select-none font-['Plus_Jakarta_Sans',sans-serif]">
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
        {sections.filter(section => section.items.some(item => !item.onlyWhenAllowed || resources.some(resource => menuResources[item.path]?.includes(resource.name)))).map((section, idx) => (
          <div key={idx}>
            <div className="px-2 mb-1 text-[9.5px] font-bold text-[#A69788] uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.filter(item => !item.onlyWhenAllowed || resources.some(resource => menuResources[item.path]?.includes(resource.name))).map(item => <SidebarItem key={item.path} {...item} resources={resources} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Support & Settings */}
      <div className="p-3 border-t border-[#EFE4D9] space-y-0.5 mt-auto">
        <button
          type="button"
          onClick={() =>
            toast.info(
              'Trung tâm hỗ trợ MLD',
              'Hotline kỹ thuật: 1900 8888 · Email hỗ trợ: support@mldvietnam.vn (08:00–22:00).'
            )
          }
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#7A6D61] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#8C7A6B] stroke-[1.8]" />
          <span>Cần hỗ trợ?</span>
        </button>
        <button
          type="button"
          onClick={() =>
            toast.info(
              'Cấu hình quản trị',
              'Hệ thống đang hoạt động theo chính sách phân quyền bảo mật MLD Spa & Clinic.'
            )
          }
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#7A6D61] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-[#8C7A6B] stroke-[1.8]" />
          <span>Cài đặt</span>
        </button>
        <div className="pt-2 px-3">
          <p className="text-[10px] text-[#A69788]">Hệ thống Quản trị MLD v1.0</p>
        </div>
      </div>
    </aside>
  );
};
