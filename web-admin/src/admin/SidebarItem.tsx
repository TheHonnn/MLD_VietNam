import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Resource } from './api';

export const menuResources: Record<string, string[]> = {
  '/customers': ['users', 'consultation_surveys', 'reviews', 'support_tickets', 'support_faqs'],
  '/staff-schedule': ['technician_shifts', 'technician_slots'],
  '/medical-records': ['treatment_packages', 'user_packages', 'treatment_journal', 'home_care_guidelines'],
  '/cashier-pos': ['bookings', 'booking_items', 'invoices', 'invoice_items'],
  '/academy-enrollment': ['course_enrollments', 'tuition_transactions'],
  '/instructors': ['instructors'],
  '/attendance': ['student_attendance', 'student_academic_records'],
  '/curriculum': ['course_categories', 'courses', 'course_batches', 'batch_schedules', 'course_chapters', 'course_lessons', 'course_quizzes', 'quiz_questions', 'quiz_submissions', 'user_lesson_progress'],
  '/manage/services': ['service_categories', 'services'],
  '/manage/staff_profiles': ['staff_profiles', 'technicians', 'staff_leaves'],
  '/manage/coupons': ['coupons', 'voucher_distribution_rules', 'user_vouchers', 'membership_tier_rules', 'loyalty_point_settings', 'point_transactions'],
  '/manage/student_certificates': ['certificate_templates', 'student_certificates'],
  '/manage/roles': ['roles', 'permissions', 'role_permissions', 'user_roles', 'audit_logs'],
};

export function SidebarItem({
  name,
  path,
  icon: Icon,
  resources,
  onNavigate,
}: {
  name: string;
  path: string;
  icon: LucideIcon;
  resources: Resource[];
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const children = (menuResources[path] || []).flatMap(table => {
    const resource = resources.find(item => item.name === table);
    return resource ? [resource] : [];
  });
  const childActive = children.some(item => pathname === `/manage/${item.name}`);
  const [open, setOpen] = useState(childActive);
  useEffect(() => { if (childActive) setOpen(true); }, [pathname, childActive]);
  const expanded = open && children.length > 0;
  const submenuId = `submenu-${path.replace(/[^a-z0-9]/gi, '-')}`;
  return (
    <div>
      <div className="relative">
        <NavLink
          to={path}
          end={path === '/'}
          onClick={onNavigate}
          className={({isActive}) => `flex items-center gap-2.5 px-3 py-2 ${children.length ? 'pr-10' : ''} rounded-xl text-xs font-semibold transition-all duration-150 ${isActive || childActive || (path === '/customers' && pathname.startsWith('/customer')) ? 'bg-[#F3E2CE] text-[#8A4F23] shadow-xs' : 'text-[#4A3E34] hover:bg-[#FAF7F2] hover:text-[#2C241E]'}`}
        >
          <Icon className={`w-4 h-4 shrink-0 stroke-[1.8] ${childActive || pathname === path ? 'text-[#8A4F23]' : 'text-[#8C7A6B]'}`} />
          <span>{name}</span>
        </NavLink>
        {children.length > 0 && (
          <button
            type="button"
            title={`${expanded ? 'Thu gọn' : 'Mở'} ${name}`}
            aria-label={`${expanded ? 'Thu gọn' : 'Mở'} ${name}`}
            aria-expanded={expanded}
            aria-controls={submenuId}
            onClick={() => setOpen(value => !value)}
            className="absolute right-1 top-1 w-7 h-7 flex items-center justify-center rounded-lg text-[#8C7A6B] hover:bg-[#F3E2CE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#985018]"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {children.length > 0 && (
        <div id={submenuId} hidden={!expanded} className="ml-5 pl-2 mt-1 mb-1 border-l border-[#EFE4D9] space-y-0.5">
          {children.map(resource => (
            <NavLink
              key={resource.name}
              to={`/manage/${resource.name}`}
              onClick={onNavigate}
              className={({isActive}) => `block px-3 py-2 rounded-xl text-[11px] font-medium leading-normal ${isActive ? 'bg-[#F3E2CE] text-[#8A4F23]' : 'text-[#7A6D61] hover:bg-[#FAF7F2] hover:text-[#2C241E]'}`}
            >
              {resource.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
