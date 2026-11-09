import type { Resource } from './api';
const routeResources: Record<string, string[]> = {
  '/branches': ['branches', 'branch_rooms'], '/customers': ['users', 'reviews', 'consultation_surveys'],
  '/staff-schedule': ['staff_profiles', 'technicians', 'technician_shifts', 'technician_slots'],
  '/medical-records': ['treatment_packages', 'user_packages', 'treatment_journal', 'home_care_guidelines'],
  '/services-catalog': ['services', 'treatment_packages', 'service_categories'],
  '/cashier-pos': ['cashier', 'invoices', 'tuition_transactions'], '/home-products': ['home_products'],
  '/academy-enrollment': ['course_enrollments', 'tuition_transactions'], '/instructors': ['instructors'],
  '/attendance': ['student_attendance', 'student_academic_records', 'course_batches'],
  '/curriculum': ['courses', 'course_batches', 'batch_schedules', 'course_lessons', 'course_quizzes', 'quiz_questions'],
  '/certificates': ['student_certificates', 'certificate_templates'],
  '/reports': ['invoices', 'tuition_transactions'], '/commissions': ['staff_commissions'],
  '/portal-content': ['portal_banners', 'documents', 'email_templates'], '/zalo-zns': ['zalo_zns_logs'],
};
export function canAccessAdminPath(path: string, role: string, resources: Resource[]) {
  const route = path.split('?')[0];
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'ADMIN') {
    const protectedNames = ['roles','permissions','role_permissions','user_roles','audit_logs'];
    const resource = route.startsWith('/manage/') ? route.slice('/manage/'.length) : '';
    return !protectedNames.includes(resource) || resources.some(item => item.name === resource);
  }
  if (route === '/') return true;
  const names = route.startsWith('/manage/') ? [route.slice('/manage/'.length)] : routeResources[route] || [];
  return names.some(name => resources.some(resource => resource.name === name));
}
