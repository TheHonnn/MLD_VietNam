import type { Resource } from './api';
import { DEFAULT_RESOURCES } from './defaultResources';
import { canAccessAdminPath } from './access';

export interface AdminNavigationItem { id: string; label: string; href: string; }
interface NavigationGroup { label: string; tables: string[]; items: AdminNavigationItem[]; }
const item = (id: string, label?: string, href = '/manage/' + id): AdminNavigationItem => ({
  id, label: label || DEFAULT_RESOURCES.find(resource => resource.name === id)?.title || id, href,
});
const group = (label: string, tables: string[], items?: AdminNavigationItem[]): NavigationGroup => ({label,tables,items:items || tables.map(name=>item(name))});

// UI grouping is explicit: backend resource groups describe storage domains and
// must not determine page navigation or its order.
export const ADMIN_NAVIGATION_GROUPS: NavigationGroup[] = [
  group('Chi nhánh & Phòng ốc',['branches','branch_rooms'],[
    item('branches','Danh sách chi nhánh','/branches'),item('branch_rooms','Phòng & Giường trị liệu','/branches?tab=rooms'),
  ]),
  group('Thu ngân & Tiếp đón',['bookings','booking_items','invoices','invoice_items'],[
    item('cashier','Thu ngân POS','/cashier-pos'),item('bookings'),item('booking_items'),item('invoices','Hóa đơn & Đối soát','/cashier-pos?tab=receipts'),item('invoice_items'),
  ]),
  group('Khách hàng (CRM)',['reviews','support_tickets','support_faqs'],[
    item('customers','Hồ sơ Khách hàng','/customers'),item('reviews'),item('support_tickets'),item('support_faqs'),
  ]),
  group('Quản lý Liệu trình',['user_packages','treatment_journal','home_care_guidelines'],[
    item('medical-records','Hồ sơ phác đồ MLD','/medical-records'),item('user_packages'),item('treatment_journal'),item('home_care_guidelines'),
  ]),
  group('Dịch vụ & Định mức',['services','treatment_packages','home_products','service_categories','service_materials','inventory_consumption_logs'],[
    item('catalog','Bảng giá & Gói liệu trình','/services-catalog'),item('home_products','Sản phẩm mang về','/home-products'),item('service_categories'),item('service_materials'),item('inventory_consumption_logs'),
  ]),
  group('Nhân sự & Kỹ thuật viên',['staff_profiles','departments','technicians','technician_shifts','technician_slots','staff_commissions'],[
    item('staff-schedule','Lịch trực & Điều phối ca','/staff-schedule'),item('staff_profiles'),item('departments'),item('technicians'),item('technician_shifts'),item('technician_slots'),item('staff_commissions','Hoa hồng KTV & Thưởng','/commissions'),
  ]),
  group('Voucher & Hội viên',['coupons','user_vouchers','voucher_distribution_rules','membership_tier_rules','loyalty_point_settings','point_transactions']),
  group('Tuyển sinh & Ghi danh',['course_enrollments','tuition_transactions','enrollment_change_requests','enrollment_status_history','academy_enrollment_funnel'],[
    item('academy-enrollment','Hồ sơ tư vấn tuyển sinh','/academy-enrollment'),item('course_enrollments'),item('tuition_transactions'),item('enrollment_change_requests','Yêu cầu thay đổi học tập'),item('enrollment_status_history','Lịch sử xử lý tuyển sinh'),item('academy_enrollment_funnel'),
  ]),
  group('Đội ngũ Giảng viên',['instructors'],[item('instructors','Giảng viên','/instructors')]),
  group('Học viên & Lớp học',['course_batches','course_batch_assistants','batch_schedules','student_attendance','student_academic_records'],[
    item('course_batches','Lớp học'),item('course_batch_assistants'),item('batch_schedules','Thời khóa biểu'),item('student_attendance','Điểm danh & Sổ theo dõi','/attendance'),item('student_academic_records'),
  ]),
  group('Chương trình đào tạo',['course_categories','courses','course_chapters','course_lessons','course_quizzes','quiz_questions','quiz_submissions','user_lesson_progress'],[
    item('curriculum','Khung chương trình','/curriculum'),...['course_categories','courses','course_chapters','course_lessons','course_quizzes','quiz_questions','quiz_submissions','user_lesson_progress'].map(name=>item(name)),
  ]),
  group('Giấy chứng nhận',['certificate_templates','student_certificates'],[item('student_certificates','Danh sách đã cấp','/certificates'),item('certificate_templates')]),
  group('Phân quyền & Bảo mật',['users','roles','permissions','role_permissions','user_roles','audit_logs']),
];

export function navigationGroupForTable(table: string) {
  return ADMIN_NAVIGATION_GROUPS.find(group=>group.tables.includes(table));
}
export function academyClassLink(href: string, batchId?: string) {
  return batchId && batchId !== '__ALL__' ? href + '?batch_id=' + encodeURIComponent(batchId) : href;
}
export function getResourceNavigation(table: string, resources: Resource[], role: string): AdminNavigationItem[] {
  const currentGroup = navigationGroupForTable(table);
  if (currentGroup) return currentGroup.items.filter(entry =>
    (entry.id === table || canAccessAdminPath(entry.href,role,resources)) &&
    (!entry.href.startsWith('/manage/') || resources.some(resource=>resource.name === entry.id)),
  ).map(entry => entry.id === 'catalog' && ['services','treatment_packages'].includes(table) ? {...entry,id:table} : entry);
  const current = resources.find(resource=>resource.name===table);
  if (!current?.group) return [];
  return resources.filter(resource=>resource.group===current.group).map(resource=>item(resource.name,resource.title));
}
