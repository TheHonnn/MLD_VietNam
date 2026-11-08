import { Resource } from './api';

export const DEFAULT_RESOURCES: Resource[] = [
  // 1. Cơ sở vật chất
  { name: 'branches', title: 'Danh sách chi nhánh', group: 'Cơ sở vật chất', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'branch_rooms', title: 'Phòng & Giường trị liệu', group: 'Cơ sở vật chất', actions: ['create', 'update', 'delete', 'action'] },

  // 2. Thu ngân & Tiếp đón (Lịch hẹn, Hóa đơn & Bảng kê thanh toán)
  { name: 'bookings', title: 'Lịch hẹn & Tiếp đón', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'booking_items', title: 'Dịch vụ trong lịch hẹn', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'invoices', title: 'Hóa đơn thanh toán', group: 'Thu ngân & Tiếp đón', actions: ['action'] },
  { name: 'invoice_items', title: 'Chi tiết hóa đơn', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'home_products', title: 'Sản phẩm mang về', group: 'Thu ngân & Tiếp đón', actions: ['create', 'update', 'delete'] },

  // 3. Khách hàng (CRM)
  { name: 'users', title: 'Hồ sơ khách hàng', group: 'Khách hàng (CRM)', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'reviews', title: 'Đánh giá từ khách', group: 'Khách hàng (CRM)', actions: ['update', 'delete', 'action'] },

  // 4. Quản lý Liệu trình
  { name: 'treatment_packages', title: 'Gói liệu trình Spa', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'user_packages', title: 'Liệu trình khách hàng', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'treatment_journal', title: 'Nhật ký điều trị', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'home_care_guidelines', title: 'Hướng dẫn chăm sóc tại nhà', group: 'Quản lý Liệu trình', actions: ['create', 'update', 'delete', 'action'] },

  // 5. Dịch vụ & Định mức
  { name: 'service_categories', title: 'Danh mục dịch vụ', group: 'Dịch vụ & Định mức', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'services', title: 'Bảng giá dịch vụ', group: 'Dịch vụ & Định mức', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'service_materials', title: 'Định mức tiêu hao vật tư (BOM)', group: 'Dịch vụ & Định mức', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'inventory_consumption_logs', title: 'Xuất kho vật tư tiêu hao (BOM)', group: 'Dịch vụ & Định mức', readonly: true, actions: [] },

  // 6. Nhân sự & Kỹ thuật viên
  { name: 'staff_profiles', title: 'Hồ sơ nhân viên', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'departments', title: 'Bộ phận', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete'] },
  { name: 'technicians', title: 'Đội ngũ Chuyên viên KTV', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'technician_shifts', title: 'Ca làm việc', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'technician_slots', title: 'Khung giờ chuyên viên', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'staff_leaves', title: 'Đơn nghỉ phép', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'staff_commissions', title: 'Hoa hồng KTV & Thưởng', group: 'Nhân sự & Kỹ thuật viên', actions: ['create', 'update', 'delete', 'action'] },

  // 7. Voucher & Hội viên
  { name: 'coupons', title: 'Mã giảm giá (Voucher)', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'user_vouchers', title: 'Voucher khách hàng', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'voucher_distribution_rules', title: 'Quy tắc phân phối', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'membership_tier_rules', title: 'Hạng thành viên', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'loyalty_point_settings', title: 'Cấu hình điểm thưởng', group: 'Voucher & Hội viên', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'point_transactions', title: 'Lịch sử giao dịch điểm', group: 'Voucher & Hội viên', readonly: true, actions: [] },

  // 8. Tuyển sinh & Ghi danh
  { name: 'course_enrollments', title: 'Danh sách ghi danh', group: 'Tuyển sinh & Ghi danh', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'tuition_transactions', title: 'Thu học phí & Đặt cọc', group: 'Tuyển sinh & Ghi danh', actions: ['create', 'update', 'delete', 'action'] },

  // 9. Đội ngũ Giảng viên
  { name: 'instructors', title: 'Đội ngũ Giảng viên', group: 'Đội ngũ Giảng viên', actions: ['create', 'update', 'delete', 'action'] },

  // 10. Học viên & Lớp học
  { name: 'course_batches', title: 'Lớp học đang mở', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_batch_assistants', title: 'Trợ giảng theo lớp', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete'] },
  { name: 'batch_schedules', title: 'Thời khóa biểu', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'student_attendance', title: 'Điểm danh', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'student_academic_records', title: 'Bảng điểm học viên', group: 'Học viên & Lớp học', actions: ['create', 'update', 'delete', 'action'] },

  // 11. Chương trình đào tạo (Đã tách riêng Giảng viên ra mục độc lập)
  { name: 'course_categories', title: 'Danh mục khóa học', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'courses', title: 'Khóa đào tạo', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_chapters', title: 'Chương & Bài học video', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_lessons', title: 'Bài học & video', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'course_quizzes', title: 'Đề thi & Trắc nghiệm', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'quiz_questions', title: 'Ngân hàng câu hỏi', group: 'Chương trình đào tạo', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'quiz_submissions', title: 'Bài thi đã nộp', group: 'Chương trình đào tạo', readonly: true, actions: [] },
  { name: 'user_lesson_progress', title: 'Tiến độ học', group: 'Chương trình đào tạo', readonly: true, actions: [] },

  // 12. Giấy chứng nhận
  { name: 'certificate_templates', title: 'Mẫu chứng nhận', group: 'Giấy chứng nhận', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'student_certificates', title: 'Danh sách đã cấp', group: 'Giấy chứng nhận', actions: ['create', 'update', 'delete', 'action'] },

  // 13. Phân quyền & Bảo mật
  { name: 'roles', title: 'Danh sách Vai trò', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'permissions', title: 'Danh mục quyền hạn', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'role_permissions', title: 'Quyền của vai trò', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'user_roles', title: 'Phân quyền tài khoản', group: 'Phân quyền & Bảo mật', actions: ['create', 'update', 'delete', 'action'] },
  { name: 'audit_logs', title: 'Nhật ký bảo mật Audit Trail', group: 'Phân quyền & Bảo mật', readonly: true, actions: [] },
];
