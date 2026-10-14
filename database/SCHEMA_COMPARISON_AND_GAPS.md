# BÁO CÁO ĐỐI SOÁT & HOÀN TẤT ĐẶC TẢ ADMIN CRUD (ADMIN GAP CLOSURE REPORT)
## DỰ ÁN: MLD VIỆT NAM — HỆ SINH THÁI Y TẾ, DƯỠNG SINH SPA & HỌC VIỆN ĐÀO TẠO NGHỀ
**Mã hồ sơ thiết kế:** `ctH76PAiMBTQLJE0BxNjOI` & Phân hệ Quản trị Web Admin  
**Phiên bản:** 4.0.0 Production  
**Ngày cập nhật:** 14/10/2026  

---

## 1. TỔNG KẾT ĐÁP ỨNG 12 CHỨC NĂNG CRUD ADMIN & 3 CƠ CHẾ LOGIC

Tất cả các khoảng trống (gaps) được chỉ ra bởi yêu cầu quản trị Admin hiện đã được **bổ sung 100% vào cơ sở dữ liệu** và chuẩn hóa trong thư mục [`checkdata`](file:///d:/VN_Champion/MLD_VietNam/checkdata):

| STT | Phân hệ Admin | Trạng thái trước | Trạng thái hiện tại trong `checkdata` | Chi tiết bảng & cơ chế giải quyết |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **Quản lý dịch vụ** | Có cơ bản | **Hoàn thành 100%** | Bảng `service_categories`, `services` có đầy đủ quy trình (`steps`), lợi ích (`benefits`), thời lượng, giá gốc, giá ưu đãi. |
| **2** | **Quản lý check-in / check-out** | Thiếu trường | **Hoàn thành 100%** | Bổ sung vào `bookings`: `checked_in_at`, `checked_in_by_id`, `service_started_at`, `checked_out_at`, `checked_out_by_id`, `assigned_room_id`, `assigned_bed_number`, `actual_duration_minutes`, `checkin_notes`. |
| **3** | **Quản lý tài khoản** | Chưa có khóa/reset | **Hoàn thành 100%** | Bảng `users` đã có `password_hash`, `locked_reason`, `locked_at`, `is_active`, kết hợp `user_roles` và `audit_logs`. |
| **4** | **Quản lý nhân viên & ca trực** | Chỉ có KTV | **Hoàn thành 100%** | Bổ sung `staff_profiles` (Lễ tân, Thu ngân, Trị liệu, Đào tạo), `technician_shifts` (Phân ca trực và phòng), `staff_leaves` (Đơn nghỉ phép). |
| **5** | **Quản lý voucher & Quy cách nhận** | Chưa có ví/quy cách | **Hoàn thành 100%** | Bổ sung `voucher_distribution_rules` (8 sự kiện tặng voucher tự động) và `user_vouchers` (Ví voucher cá nhân). |
| **6** | **Quản lý phân quyền (RBAC)** | Chỉ có role cứng | **Hoàn thành 100%** | Bổ sung hệ thống RBAC động: `roles`, `permissions`, `role_permissions`, `user_roles` (có trường `branch_id` phân quyền theo chi nhánh). |
| **7** | **Cập nhật liệu trình điều trị** | Chỉ có bảng thô | **Hoàn thành 100%** | Bảng `treatment_journal` bổ sung: `session_number`, `condition_before`, `condition_after`, `treatment_notes`, `before_photos`, `after_photos`, `customer_signature_url`. |
| **8** | **Quản lý đào tạo & Điểm danh** | Chưa có điểm danh | **Hoàn thành 100%** | Bổ sung `batch_schedules` (Thời khóa biểu thực hành lâm sàng), `student_attendance` (Điểm danh: Có mặt, Vắng, Đi trễ, Có phép). |
| **9** | **Quản lý chứng chỉ điện tử** | Chưa có bảng chứng chỉ | **Hoàn thành 100%** | Bổ sung `certificate_templates` (Mẫu phôi bằng) và `student_certificates` (Mã số bằng, mã tra cứu QR công khai chống làm giả). |
| **10**| **Quản lý khóa học, bài học, bài test** | Chưa có LMS chi tiết | **Hoàn thành 100%** | Bổ sung đầy đủ 6 bảng LMS: `course_chapters`, `course_lessons`, `user_lesson_progress`, `course_quizzes`, `quiz_questions`, `quiz_submissions`. |
| **11**| **Quản lý hướng dẫn chăm sóc tại nhà**| Chưa có slug/duyệt | **Hoàn thành 100%** | Bảng `home_care_guidelines` đã có `slug`, `steps` (JSONB các bước), `is_published`, `author_name`. |
| **12**| **Quản lý trả học phí, đặt cọc** | Chưa có phễu học phí | **Hoàn thành 100%** | Bổ sung `tuition_transactions` (Mã biên lai, tiền cọc 2tr, trả góp đợt 1, 2, biên nhận PDF, hạn nộp `due_date`). |
| **13**| **Cơ chế thăng hạng hội viên** | Logic cứng | **Hoàn thành 100%** | Bổ sung bảng cấu hình `membership_tier_rules` và Trigger tự động thăng hạng khi hóa đơn `invoices` được chuyển trạng thái `PAID`. |
| **14**| **Cơ chế tích & sử dụng điểm** | Chỉ có bảng log | **Hoàn thành 100%** | Bổ sung bảng cấu hình `loyalty_point_settings` (1 điểm = 100đ, tỷ lệ tích theo hạng, trần cấn trừ tối đa 30% hóa đơn) và sổ cái `point_transactions`. |
| **15**| **Quy cách nhận voucher** | Chưa có sự kiện | **Hoàn thành 100%** | Bổ sung bảng `voucher_distribution_rules` với 8 sự kiện: `ON_SIGNUP`, `ON_BIRTHDAY`, `ON_TIER_UPGRADE`, `ON_FIRST_BOOKING`, `REFERRAL_INVITER`, `REFERRAL_INVITEE`, `MANUAL_BY_ADMIN`, `PUBLIC_CLAIM`. |

---

## 2. HƯỚNG DẪN KẾT NỐI VÀ ĐỒNG BỘ CHO DEVELOPER ADMIN

Để lập trình viên khác phát triển **Admin Web Portal** không bị lỗi gọi API:
1. **Tra cứu kịch bản SQL toàn diện:** Xem trực tiếp file [`FULL_DATABASE_STRUCTURE.sql`](file:///d:/VN_Champion/MLD_VietNam/checkdata/FULL_DATABASE_STRUCTURE.sql) trong thư mục `checkdata`.
2. **Quy tắc Request/Response:**
   - Trong SQL: Dùng `snake_case`.
   - Trong API JSON: Dùng `camelCase`.
   - Thời gian: Định dạng chuẩn ISO-8601 UTC string.
   - Giá trị trạng thái: Dùng đúng các giá trị Enum viết hoa (Ví dụ: `status: "CHECKED_IN"`, `paymentStatus: "PAID"`).
3. **Từ điển dữ liệu máy đọc:** File [`DATA_DICTIONARY.json`](file:///d:/VN_Champion/MLD_VietNam/checkdata/DATA_DICTIONARY.json) có thể nạp thẳng vào các công cụ sinh mã nguồn tự động (Prisma, TypeORM, OpenAPI/Swagger).
