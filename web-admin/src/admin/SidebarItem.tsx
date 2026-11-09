import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Resource } from './api';
import { useAdmin } from './Auth';
import { canAccessAdminPath } from './access';

export interface SubMenuItem {
  name: string;
  path: string;
  resourceName?: string;
}

export const menuResources: Record<string, string[]> = {
  '/customers': ['users', 'reviews'],
  '/staff-schedule': ['technician_shifts', 'technician_slots'],
  '/medical-records': ['treatment_packages', 'user_packages', 'treatment_journal', 'home_care_guidelines'],
  '/cashier-pos': ['bookings', 'booking_items', 'invoices', 'invoice_items'],
  '/academy-enrollment': ['course_enrollments', 'tuition_transactions'],
  '/instructors': ['instructors'],
  '/attendance': ['student_attendance', 'student_academic_records'],
  '/curriculum': ['course_categories', 'courses', 'course_batches', 'batch_schedules', 'course_chapters', 'course_lessons', 'course_quizzes', 'quiz_questions', 'quiz_submissions', 'user_lesson_progress'],
  '/manage/services': ['service_categories', 'services', 'service_materials'],
  '/manage/staff_profiles': ['staff_profiles', 'technicians', 'staff_leaves'],
  '/manage/coupons': ['coupons', 'voucher_distribution_rules', 'user_vouchers', 'membership_tier_rules', 'loyalty_point_settings', 'point_transactions'],
  '/manage/roles': ['roles', 'permissions', 'role_permissions', 'user_roles', 'audit_logs'],
};

export interface SidebarItemProps {
  name: string;
  path: string;
  icon: LucideIcon;
  resources?: Resource[];
  subItems?: SubMenuItem[];
  onlyWhenAllowed?: boolean;
  onNavigate?: () => void;
}

export function SidebarItem({
  name,
  path,
  icon: Icon,
  resources = [],
  subItems,
  onNavigate,
}: SidebarItemProps) {
  const { user } = useAdmin();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentFull = location.pathname + location.search;

  // Resolve sub-items: either custom subItems or fallback to menuResources mapping
  const children: SubMenuItem[] = (() => {
    if (subItems && subItems.length > 0) {
      return subItems.filter((item) => {
        if (item.resourceName) {
          return resources.some((r) => r.name === item.resourceName);
        }
        if (item.path.startsWith('/manage/')) {
          const tbl = item.path.replace('/manage/', '').split('?')[0];
          return resources.some((r) => r.name === tbl);
        }
        return true;
      });
    }

    return (menuResources[path] || []).flatMap((table) => {
      const resource = resources.find((item) => item.name === table);
      return resource ? [{ name: resource.title, path: `/manage/${resource.name}` }] : [];
    });
  })();

  const isSubActive = (subPath: string) => {
    // 1. Exact match with query params (e.g. /branches?tab=rooms)
    if (subPath.includes('?')) {
      return currentFull === subPath;
    }

    // 2. If subPath has NO query params:
    if (currentPath !== subPath) {
      // Check known aliases for specific screens
      if (subPath === '/customers' && currentPath.startsWith('/customer')) return true;
      if (subPath === '/medical-records' && currentPath.startsWith('/treatment-management')) return true;
      if (subPath === '/staff-schedule' && currentPath.startsWith('/technician-schedule')) return true;
      return false;
    }

    // If currentFull has query params, check if any sibling specifically matches those query params
    if (location.search) {
      const siblingWithQueryMatches = children.some(
        (sibling) => sibling.path.includes('?') && currentFull === sibling.path
      );
      if (siblingWithQueryMatches) {
        return false;
      }
    }

    return true;
  };

  const childActive = children.some((item) => isSubActive(item.path));

  // Determine if parent is directly active or an alias is active
  const isParentActive = (() => {
    if (path === '/') return currentPath === '/';
    if (currentPath === path) return true;
    if (path === '/customers' && currentPath.startsWith('/customer')) return true;
    if (
      path === '/medical-records' &&
      (currentPath.startsWith('/medical-records') || currentPath.startsWith('/treatment-management'))
    )
      return true;
    if (
      path === '/staff-schedule' &&
      (currentPath.startsWith('/staff-schedule') || currentPath.startsWith('/technician-schedule'))
    )
      return true;
    if (
      path === '/cashier-pos' &&
      (currentPath === '/cashier-pos' ||
        currentPath === '/invoices' ||
        currentPath === '/receipts' ||
        currentPath === '/hoa-don')
    )
      return true;
    if (path === '/instructors' && (currentPath.startsWith('/instructor') || currentPath.startsWith('/giang-vien')))
      return true;
    if (
      path === '/certificates' &&
      (currentPath.startsWith('/certificate') ||
        currentPath.startsWith('/chung-chi') ||
        currentPath.startsWith('/giay-chung-nhan'))
    )
      return true;
    if (path === '/portal-content' && currentPath.startsWith('/portal')) return true;
    if (path === '/zalo-zns' && (currentPath.startsWith('/zalo-zns') || currentPath.startsWith('/crm-zns')))
      return true;
    if (path === '/branches' && currentPath.startsWith('/branches')) return true;
    if (path === '/services-catalog' && currentPath.startsWith('/services-catalog')) return true;
    return false;
  })();

  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const expanded = open && children.length > 0;
  const submenuId = `submenu-${path.replace(/[^a-z0-9]/gi, '-')}`;

  const handleParentClick = () => {
    if (children.length > 0) {
      setOpen(true);
    }
    if (onNavigate) onNavigate();
  };

  return (
    <div>
      <div className="relative">
        <NavLink
          to={path}
          end={path === '/'}
          onClick={handleParentClick}
          className={`flex items-center gap-2.5 px-3 py-2 ${
            children.length ? 'pr-10' : ''
          } rounded-xl text-xs font-semibold transition-all duration-150 ${
            isParentActive || childActive
              ? 'bg-[#F3E2CE] text-[#8A4F23] shadow-xs'
              : 'text-[#4A3E34] hover:bg-[#FAF7F2] hover:text-[#2C241E]'
          }`}
        >
          <Icon
            className={`w-4 h-4 shrink-0 stroke-[1.8] ${
              childActive || isParentActive ? 'text-[#8A4F23]' : 'text-[#8C7A6B]'
            }`}
          />
          <span className="truncate">{name}</span>
        </NavLink>
        {children.length > 0 && (
          <button
            type="button"
            title={`${expanded ? 'Thu gọn' : 'Mở'} ${name}`}
            aria-label={`${expanded ? 'Thu gọn' : 'Mở'} ${name}`}
            aria-expanded={expanded}
            aria-controls={submenuId}
            onClick={() => setOpen((value) => !value)}
            className="absolute right-1 top-1 w-7 h-7 flex items-center justify-center rounded-lg text-[#8C7A6B] hover:bg-[#F3E2CE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#985018] cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {children.length > 0 && (
        <div id={submenuId} hidden={!expanded} className="ml-5 pl-2.5 mt-1 mb-1.5 border-l border-[#EFE4D9] space-y-0.5">
          {children.map((sub) => {
            const active = isSubActive(sub.path);
            return (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium leading-normal transition-all ${
                  active
                    ? 'bg-[#F2DFCD] text-[#7A3F15] font-semibold shadow-2xs'
                    : 'text-[#7A6D61] hover:bg-[#FAF7F2] hover:text-[#2C241E]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${
                    active ? 'bg-[#985018]' : 'bg-[#D8C4B2]/40'
                  }`}
                />
                <span className="truncate">{sub.name}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
