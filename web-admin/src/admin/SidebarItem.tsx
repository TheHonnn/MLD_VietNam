import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Resource } from './api';
import { useAdmin } from './Auth';
import { canAccessAdminPath } from './access';
import { formatBadgeCount } from '../pages/action-center.rules';

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
  '/manage/courses': ['courses', 'course_chapters', 'course_lessons', 'course_quizzes', 'quiz_questions', 'quiz_submissions'],
  '/manage/course_categories': ['course_categories'],
  '/curriculum': ['course_categories', 'courses', 'course_batches', 'batch_schedules', 'course_chapters', 'course_lessons', 'course_quizzes', 'quiz_questions', 'quiz_submissions'],
  '/manage/services': ['service_categories', 'services', 'service_materials'],
  '/manage/staff_profiles': ['staff_profiles', 'technicians'],
  '/manage/coupons': ['coupons', 'voucher_distribution_rules', 'user_vouchers', 'loyalty_point_settings', 'point_transactions'],
  '/manage/roles': ['roles', 'permissions', 'role_permissions', 'user_roles', 'audit_logs'],
};

export interface SidebarItemProps {
  name: string;
  path: string;
  icon: LucideIcon;
  resources?: Resource[];
  subItems?: SubMenuItem[];
  onlyWhenAllowed?: boolean;
  badgeCount?: number;
  badgeMap?: Record<string, number>;
  onNavigate?: () => void;
}

export function SidebarItem({
  name,
  path,
  icon: Icon,
  resources = [],
  subItems,
  badgeCount = 0,
  badgeMap,
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
          className={`flex items-center gap-2.5 px-3 py-2 ${children.length ? 'pr-10' : ''
            } rounded-xl text-xs font-semibold transition-all duration-150 ${isParentActive || childActive
              ? 'bg-[#EBF3FC] text-[#0F172A] font-bold shadow-xs'
              : 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`}
        >
          <Icon
            className={`w-4 h-4 shrink-0 stroke-[1.8] ${childActive || isParentActive ? 'text-[#004890]' : 'text-[#64748B]'
              }`}
          />
          <span className="truncate flex-1">{name}</span>
          {formatBadgeCount(badgeCount) && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#985018] text-white leading-none">
              {formatBadgeCount(badgeCount)}
            </span>
          )}
        </NavLink>
        {children.length > 0 && (
          <button
            type="button"
            title={`${expanded ? 'Thu gọn' : 'Mở'} ${name}`}
            aria-label={`${expanded ? 'Thu gọn' : 'Mở'} ${name}`}
            aria-expanded={expanded}
            aria-controls={submenuId}
            onClick={() => setOpen((value) => !value)}
            className="absolute right-1 top-1 w-7 h-7 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EBF3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#004890] cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {children.length > 0 && (
        <div id={submenuId} hidden={!expanded} className="ml-5 pl-2.5 mt-1 mb-1.5 border-l border-[#E2E8F0] space-y-0.5">
          {children.map((sub) => {
            const active = isSubActive(sub.path);
            return (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium leading-normal transition-all ${active
                  ? 'bg-[#EBF3FC] text-[#0F172A] font-bold shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${active ? 'bg-[#004890]' : 'bg-[#CBD5E1]'
                    }`}
                />
                <span className="truncate flex-1">{sub.name}</span>
                {formatBadgeCount(badgeMap?.[sub.path]) && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-[#985018] text-white leading-none">
                    {formatBadgeCount(badgeMap?.[sub.path])}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
