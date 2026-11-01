import { Resource } from './api';

export const DEFAULT_RESOURCES: Resource[] = [
  // 1. Dịch vụ & Định mức
  { name: 'service_categories', title: 'Danh mục dịch vụ', group: 'Dịch vụ & Định mức', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'services', title: 'Bảng giá dịch vụ', group: 'Dịch vụ & Định mức', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'service_materials', title: 'Định mức tiêu hao (BOM)', group: 'Dịch vụ & Định mức', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'inventory_consumption_logs', title: 'Xuất kho vật tư tiêu hao (BOM)', group: 'Dịch vụ & Định mức', readonly: true, actions: [] },

  // 2. Quản lý Liệu trình
  { name: 'treatment_packages', title: 'Gói liệu trình', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'user_packages', title: 'Liệu trình khách hàng', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'treatment_journal', title: 'Nhật ký điều trị', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'home_care_guidelines', title: 'Chăm sóc tại nhà', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },

  // 3. Thu ngân & Tiếp đón (Đã chuyển bookings & invoices về cùng nhóm, tách Học phí & Xuất kho vật tư)
  { name: 'bookings', title: 'Lịch hẹn / Tiếp đón', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'booking_items', title: 'Dịch vụ trong lịch hẹn', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'invoices', title: 'Hóa đơn', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'invoice_items', title: 'Chi tiết hóa đơn', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },

  // 4. Khách hàng (CRM)
  { name: 'users', title: 'Tài khoản', group: 'Khách hàng (CRM)', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'consultation_surveys', title: 'Khảo sát trước dịch vụ', group: 'Khách hàng (CRM)', actions: ['update', 'delete', 'action'] },
  { name: 'reviews', title: 'Đánh giá', group: 'Khách hàng (CRM)', actions: ['update', 'delete', 'action'] },
  { name: 'support_tickets', title: 'Yêu cầu hỗ trợ', group: 'Khách hàng (CRM)', actions: ['update', 'delete', 'action'] },
  { name: 'support_faqs', title: 'Câu hỏi thường gặp', group: 'Khách hàng (CRM)', actions: ['update', 'delete', 'action'] },

  // 5. Nhân sự & Kỹ thuật viên
  { name: 'staff_profiles', title: 'Hồ sơ nhân viên', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'technicians', title: 'Chuyên viên', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'technician_shifts', title: 'Ca làm việc', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'technician_slots', title: 'Khung giờ chuyên viên', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'staff_leaves', title: 'Đơn nghỉ phép', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'staff_commissions', title: 'Hoa hồng KTV & Lương thưởng', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },

  // 6. Voucher & Hội viên
  { name: 'coupons', title: 'Mã giảm giá', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'voucher_distribution_rules', title: 'Quy tắc phân phối', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'user_vouchers', title: 'Voucher khách hàng', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'membership_tier_rules', title: 'Hạng thành viên', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'loyalty_point_settings', title: 'Cấu hình điểm thưởng', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'point_transactions', title: 'Lịch sử điểm', group: 'Voucher & Hội viên', readonly: true, actions: [] },

  // 7. Tuyển sinh & Ghi danh
  { name: 'course_enrollments', title: 'Ghi danh', group: 'Tuyển sinh & Ghi danh', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'tuition_transactions', title: 'Học phí / Đặt cọc', group: 'Tuyển sinh & Ghi danh', actions: ['create', 'update', 'delete', 'action'] },

  // 8. Học viên & Lớp học
  { name: 'course_batches', title: 'Lớp học', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'batch_schedules', title: 'Thời khóa biểu', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'student_attendance', title: 'Điểm danh', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'student_academic_records', title: 'Bảng điểm', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },

  // 9. Chương trình đào tạo
  { name: 'course_categories', title: 'Danh mục khóa học', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'courses', title: 'Khóa học', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'instructors', title: 'Giảng viên', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_chapters', title: 'Chương học', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_lessons', title: 'Bài học & video', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_quizzes', title: 'Bài trắc nghiệm', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'quiz_questions', title: 'Ngân hàng câu hỏi', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'quiz_submissions', title: 'Bài thi đã nộp', group: 'Chương trình đào tạo', readonly: true, actions: [] },
  { name: 'user_lesson_progress', title: 'Tiến độ học', group: 'Chương trình đào tạo', readonly: true, actions: [] },

  // 10. Giấy chứng nhận
  { name: 'certificate_templates', title: 'Mẫu chứng chỉ', group: 'Giấy chứng nhận', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'student_certificates', title: 'Chứng chỉ điện tử', group: 'Giấy chứng nhận', actions: ['create', 'update', 'delete', 'action'] },

  // 11. Phân quyền & Bảo mật
  { name: 'roles', title: 'Vai trò', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'permissions', title: 'Danh mục quyền', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'role_permissions', title: 'Quyền của vai trò', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'user_roles', title: 'Phân quyền tài khoản', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'audit_logs', title: 'Nhật ký bảo mật & Audit Trail', group: 'Phân quyền & Bảo mật', readonly: true, actions: [] },
];
