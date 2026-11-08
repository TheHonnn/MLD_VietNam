import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SidebarItem, type SubMenuItem } from '../../admin/SidebarItem';
import { adminApi, Resource } from '../../admin/api';
import { DEFAULT_RESOURCES } from '../../admin/defaultResources';
import { toast } from '../common';
import {
  LayoutGrid,
  Store,
  Users,
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
  ShieldCheck,
  Smartphone,
  Layers,
  Award,
  Sparkles,
  type LucideIcon,
  X,
} from 'lucide-react';

export interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface SidebarSectionItem {
  name: string;
  path: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
  onlyWhenAllowed?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarSectionItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
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

  const sections: SidebarSection[] = [
    {
      title: 'TỔNG QUAN',
      items: [
        { name: 'Tổng quan', path: '/', icon: LayoutGrid },
      ],
    },
    {
      title: 'CƠ SỞ VẬT CHẤT',
      items: [
        {
          name: 'Chi nhánh & Phòng ốc',
          path: '/branches',
          icon: Store,
          subItems: [
            { name: 'Danh sách chi nhánh', path: '/branches' },
            { name: 'Phòng & Giường trị liệu', path: '/branches?tab=rooms' },
          ],
        },
      ],
    },
    {
      title: 'VẬN HÀNH DỊCH VỤ SPA',
      items: [
        {
          name: 'Thu ngân & Tiếp đón',
          path: '/cashier-pos',
          icon: CreditCard,
          subItems: [
            { name: 'Thu ngân POS', path: '/cashier-pos' },
            { name: 'Sản phẩm mang về', path: '/home-products' },
            { name: 'Lịch hẹn & Tiếp đón', path: '/manage/bookings' },
            { name: 'Dịch vụ trong lịch hẹn', path: '/manage/booking_items' },
            { name: 'Hóa đơn thanh toán', path: '/manage/invoices' },
            { name: 'Chi tiết hóa đơn', path: '/manage/invoice_items' },
          ],
        },
        {
          name: 'Khách hàng (CRM)',
          path: '/customers',
          icon: Users,
          subItems: [
            { name: 'Hồ sơ Khách hàng', path: '/customers' },
            { name: 'Đánh giá từ khách', path: '/manage/reviews' },
          ],
        },
        {
          name: 'Quản lý Liệu trình',
          path: '/medical-records',
          icon: Leaf,
          subItems: [
            { name: 'Hồ sơ phác đồ MLD', path: '/medical-records' },
            { name: 'Bảng giá & Gói liệu trình', path: '/services-catalog' },
            { name: 'Gói liệu trình Spa (CSDL)', path: '/manage/treatment_packages' },
            { name: 'Liệu trình khách hàng', path: '/manage/user_packages' },
            { name: 'Nhật ký điều trị', path: '/manage/treatment_journal' },
            { name: 'Hướng dẫn chăm sóc tại nhà', path: '/manage/home_care_guidelines' },
          ],
        },
        {
          name: 'Dịch vụ & Định mức',
          path: '/services-catalog',
          icon: Sparkles,
          subItems: [
            { name: 'Bảng giá niêm yết MLD', path: '/services-catalog' },
            { name: 'Dịch vụ lẻ (CSDL)', path: '/manage/services' },
            { name: 'Danh mục nhóm dịch vụ', path: '/manage/service_categories' },
            { name: 'Định mức tiêu hao vật tư (BOM)', path: '/manage/service_materials' },
            { name: 'Xuất kho vật tư tiêu hao (BOM)', path: '/manage/inventory_consumption_logs' },
          ],
        },
        {
          name: 'Nhân sự & Kỹ thuật viên',
          path: '/staff-schedule',
          icon: UserRoundCog,
          subItems: [
            { name: 'Lịch trực & Điều phối ca', path: '/staff-schedule' },
            { name: 'Hồ sơ nhân viên', path: '/manage/staff_profiles' },
            { name: 'Đội ngũ Chuyên viên KTV', path: '/manage/technicians' },
            { name: 'Ca làm việc', path: '/manage/technician_shifts' },
            { name: 'Khung giờ chuyên viên', path: '/manage/technician_slots' },
            { name: 'Đơn nghỉ phép', path: '/manage/staff_leaves' },
            { name: 'Hoa hồng KTV & Thưởng', path: '/commissions' },
          ],
        },
        {
          name: 'Voucher & Hội viên',
          path: '/manage/coupons',
          icon: Ticket,
          subItems: [
            { name: 'Mã giảm giá (Voucher)', path: '/manage/coupons' },
            { name: 'Voucher khách hàng', path: '/manage/user_vouchers' },
            { name: 'Quy tắc phân phối', path: '/manage/voucher_distribution_rules' },
            { name: 'Hạng thành viên', path: '/manage/membership_tier_rules' },
            { name: 'Cấu hình điểm thưởng', path: '/manage/loyalty_point_settings' },
            { name: 'Lịch sử giao dịch điểm', path: '/manage/point_transactions' },
          ],
        },
      ],
    },
    {
      title: 'HỌC VIỆN & ĐÀO TẠO',
      items: [
        {
          name: 'Tuyển sinh & Ghi danh',
          path: '/academy-enrollment',
          icon: Contact,
          subItems: [
            { name: 'Hồ sơ tư vấn tuyển sinh', path: '/academy-enrollment' },
            { name: 'Danh sách ghi danh', path: '/manage/course_enrollments' },
            { name: 'Thu học phí & Đặt cọc', path: '/manage/tuition_transactions' },
          ],
        },
        {
          name: 'Đội ngũ Giảng viên',
          path: '/instructors',
          icon: Presentation,
        },
        {
          name: 'Học viên & Lớp học',
          path: '/attendance',
          icon: GraduationCap,
          subItems: [
            { name: 'Điểm danh & Sổ theo dõi', path: '/attendance' },
            { name: 'Lớp học đang mở', path: '/manage/course_batches' },
            { name: 'Thời khóa biểu', path: '/manage/batch_schedules' },
            { name: 'Bảng điểm học viên', path: '/manage/student_academic_records' },
          ],
        },
        {
          name: 'Chương trình đào tạo',
          path: '/curriculum',
          icon: BookOpen,
          subItems: [
            { name: 'Khung chương trình', path: '/curriculum' },
            { name: 'Danh mục khóa học', path: '/manage/course_categories' },
            { name: 'Khóa đào tạo', path: '/manage/courses' },
            { name: 'Chương & Bài học video', path: '/manage/course_chapters' },
            { name: 'Bài học & video', path: '/manage/course_lessons' },
            { name: 'Đề thi & Trắc nghiệm', path: '/manage/course_quizzes' },
            { name: 'Ngân hàng câu hỏi', path: '/manage/quiz_questions' },
            { name: 'Bài thi đã nộp', path: '/manage/quiz_submissions' },
            { name: 'Tiến độ học', path: '/manage/user_lesson_progress' },
          ],
        },
        {
          name: 'Giấy chứng nhận',
          path: '/certificates',
          icon: Award,
          subItems: [
            { name: 'Quản lý cấp chứng nhận', path: '/certificates' },
            { name: 'Mẫu chứng nhận', path: '/manage/certificate_templates' },
            { name: 'Danh sách đã cấp', path: '/manage/student_certificates' },
          ],
        },
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
      items: [
        { name: 'Nội dung Portal', path: '/portal-content', icon: Layers },
        { name: 'CSKH Zalo ZNS', path: '/zalo-zns', icon: Smartphone },
        {
          name: 'Phân quyền & Bảo mật',
          path: '/manage/roles',
          icon: ShieldCheck,
          subItems: [
            { name: 'Danh sách Vai trò', path: '/manage/roles' },
            { name: 'Danh mục quyền hạn', path: '/manage/permissions' },
            { name: 'Quyền của vai trò', path: '/manage/role_permissions' },
            { name: 'Phân quyền tài khoản', path: '/manage/user_roles' },
            { name: 'Nhật ký bảo mật Audit Trail', path: '/manage/audit_logs' },
          ],
        },
      ],
    },
  ];

  const isItemAllowed = (item: SidebarSectionItem) => {
    if (!item.onlyWhenAllowed) return true;
    if (item.subItems && item.subItems.length > 0) {
      return item.subItems.some((sub) => {
        if (sub.path.startsWith('/manage/')) {
          const tbl = sub.path.replace('/manage/', '').split('?')[0];
          return resources.some((r) => r.name === tbl);
        }
        return true;
      });
    }
    return true;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 transition-opacity duration-300 lg:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] h-full min-h-0 overflow-y-auto overscroll-contain bg-white border-r border-[#EFE4D9] flex flex-col shrink-0 select-none font-['Plus_Jakarta_Sans',sans-serif] transition-transform duration-300 ease-in-out lg:static lg:w-60 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Logo Header Box (Exact Figma Pill Shape) with Mobile Close Button */}
        <div className="p-3.5 pb-2 flex items-center justify-between gap-2">
          <NavLink
            to="/"
            onClick={onCloseMobile}
            title="MLD Vietnam - Tổng quan vận hành"
            className="border border-[#D8C4B2] rounded-2xl px-3 py-2 bg-white flex items-center justify-center h-[56px] flex-1 shadow-xs hover:border-[#BA7E4C] transition-colors"
          >
            <img
              src="/logo_mld.png"
              alt="MLD Vietnam - Cộng Đồng Dẫn Lưu Bạch Huyết Việt Nam"
              className="w-full h-full object-contain"
            />
          </NavLink>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-[#7A6D61] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            title="Đóng danh mục"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Section Header */}
        <div className="px-4 pt-2 pb-1.5">
          <span className="text-[10px] font-bold text-[#A69788] uppercase tracking-wider">
            KHÔNG GIAN QUẢN TRỊ
          </span>
        </div>

        {/* Navigation Sections */}
        <nav className="px-3 py-1 space-y-3.5 flex-1 pb-6">
          {sections
            .filter((section) => section.items.some((item) => isItemAllowed(item)))
            .map((section, idx) => (
              <div key={idx}>
                <div className="px-2 mb-1 text-[9.5px] font-bold text-[#A69788] uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items
                    .filter((item) => isItemAllowed(item))
                    .map((item) => (
                      <SidebarItem
                        key={item.path}
                        {...item}
                        resources={resources}
                        onNavigate={onCloseMobile}
                      />
                    ))}
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
    </>
  );
};
