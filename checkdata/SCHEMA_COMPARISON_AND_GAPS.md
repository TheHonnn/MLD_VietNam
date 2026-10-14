# BÁO CÁO ĐỐI SOÁT VÀ PHÂN TÍCH KHOẢNG TRỐNG CƠ SỞ DỮ LIỆU (GAP ANALYSIS)
## DỰ ÁN: MLD VIỆT NAM — HIỆN TRẠNG 80% VS. CHUẨN 100% FIGMA
**Mã hồ sơ thiết kế:** `ctH76PAiMBTQLJE0BxNjOI`  
**Ngày thực hiện:** 14/10/2026  
**Đơn vị thực hiện:** Solution Architect & Database Lead  

---

## 1. TỔNG QUAN HIỆN TRẠNG DỰ ÁN (MỨC ĐỘ 80%)

Dự án hiện đã hoàn thiện phần lớn hạ tầng cốt lõi:
* **Ứng dụng Mobile Flutter (Đạt 85%):** Đã code xong toàn bộ UI & State Management (Bloc) cho Nhóm A (Onboarding/Auth), Nhóm B (Trang chủ/Khám phá), Nhóm C (Đặt lịch/Thanh toán), Nhóm D (Gói liệu trình/Nhật ký chăm sóc), và Nhóm F (Thẻ hội viên/Hồ sơ).
* **Backend API NestJS (Đạt 75%):** Đã xây dựng các module: `auth`, `doctors`, `specialities`, `appointments`, `treatment`, `membership`.
* **Cơ sở dữ liệu Database hiện có:**
  * Migration `001_mld_vietnam_schema.sql`: 19 bảng bao gồm người dùng, chi nhánh, kỹ thuật viên, slot giờ, dịch vụ, lịch hẹn cơ bản, gói liệu trình, khóa học cơ bản, điểm thưởng, đánh giá, thông báo.
  * Migration `003_group_d_treatment_and_care.sql`: 4 bảng gồm khảo sát tiền dịch vụ (`consultation_surveys`), cẩm nang tự chăm sóc (`home_care_guidelines`), câu hỏi thường gặp (`support_faqs`), và phiếu hỗ trợ (`support_tickets`).

Tuy nhiên, đối chiếu với **100% thiết kế Figma** (đặc biệt là phân hệ **Học viện đào tạo Group E** và **Cổng điều hành Web Admin Group W**, cũng như luồng **Multi-Service Booking** và **Thu ngân POS**), hệ thống còn thiếu các bảng và trường dữ liệu quan trọng dưới đây.

---

## 2. MA TRẬN ĐỐI SOÁT CHI TIẾT TỪNG PHÂN HỆ

| STT | Phân hệ nghiệp vụ | Hiện trạng trong DB (80%) | Yêu cầu chuẩn 100% Figma | Đánh giá & Khoảng trống | Mức độ ưu tiên |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | **Tài khoản & Thiết lập (Group A, F)** | Bảng `users` đã có thông tin cá nhân cơ bản, hạng thẻ, điểm thưởng, mã giới thiệu. | Cần lưu cấu hình người dùng: FaceID, bật/tắt nhắc lịch, ngôn ngữ (F08). | **Thiếu bảng `user_settings`**; thiếu trường `emergency_contact_name`, `emergency_contact_phone` trên `users`. | **Cao** |
| **2** | **Cơ sở, Phòng & Giường (Group B, W02)** | Bảng `branches` lưu thông tin chi nhánh chung chung (tọa độ, giờ mở cửa). | Figma W02, W05 quy định quản lý phòng trị liệu, số giường, phân bổ phòng cho KTV. | **Thiếu bảng `branch_rooms`** để quản lý phòng VIP, phòng massage, phòng thực hành đào tạo. | **Cao** |
| **3** | **Đội ngũ KTV & Lịch trực (Group B, C, W05)** | Đã có `technicians` và `technician_slots` với cơ chế lock 10 phút. | Figma W05 cần quản lý phân ca làm việc (ca sáng/chiều), duyệt ngày nghỉ của KTV. | **Thiếu bảng `technician_shifts`** để phục vụ màn hình phân ca trực W05. | **Trung bình** |
| **4** | **Dịch vụ Spa & Đa dịch vụ (Group B, C01)** | `services` lưu dịch vụ đơn lẻ; `bookings` chỉ liên kết trực tiếp `service_id`. | Figma C01 và component mở rộng có `MultiServiceSelector` (chọn cùng lúc nhiều dịch vụ). | **Thiếu bảng `booking_items`**. Nếu chỉ lưu 1 `service_id` trong `bookings` sẽ không hỗ trợ giỏ dịch vụ. | **Rất cao** |
| **5** | **Gói liệu trình & Chăm sóc (Group D, W04, W06)** | Đã có `treatment_packages`, `user_packages`, `treatment_journal`, `consultation_surveys`. | Khớp 100% với Figma D01 – D08. | **Đã hoàn thiện đầy đủ**. Cần bổ sung cột `assigned_room_id` để xếp phòng. | **Hoàn thành** |
| **6** | **Hội viên, Điểm & Voucher (Group F)** | Đã có `coupons`, `point_transactions`, `referrals` (lưu mã ở `users`). | Figma F05 là "Kho voucher của tôi" (My Vouchers) với các trạng thái Khả dụng, Đã dùng, Hết hạn. | **Thiếu bảng `user_vouchers`** (Ví lưu trữ voucher cá nhân mà khách đã thu thập). | **Cao** |
| **7** | **Học viện đào tạo LMS (Group E, W08-W11)** | Chỉ có 5 bảng sơ sài: `courses`, `course_categories`, `course_batches`, `course_enrollments`, `instructors`. | Figma E01-E12 & W08-W11 mô tả chi tiết: Chương/Bài học video (E08, E09), Đề thi trắc nghiệm & chấm điểm (E10), Lịch thực hành (E11), Bảng điểm 4 chiều & Chứng chỉ (E12). | **Thiếu 7 bảng cốt lõi LMS:** `course_chapters`, `course_lessons`, `user_lesson_progress`, `course_quizzes`, `quiz_questions`, `quiz_submissions`, `batch_schedules`, `student_attendance`, `student_academic_records`. | **Rất cao** |
| **8** | **Thu ngân POS & Hóa đơn (Group W07, F06, W12)** | Lưu trạng thái thanh toán tạm thời trên bảng `bookings`. | Figma W07 là màn hình Thu ngân POS tiếp đón quét QR, xuất biên nhận SPA-DEMO-000128, in hóa đơn. F06 là Lịch sử hóa đơn E-Receipt PDF. | **Thiếu bảng `invoices` và `invoice_items`** để quản lý độc lập các nguồn thu (Dịch vụ, Gói, Học phí). | **Rất cao** |
| **9** | **Nhật ký kiểm toán an ninh (EHR Audit)** | Chưa có bảng lưu vết thay đổi dữ liệu. | Chuẩn y tế số và quản trị chuỗi spa yêu cầu lưu vết thao tác đổi lịch, hủy, hoàn tiền, sửa điểm thi. | **Thiếu bảng `audit_logs`**. | **Trung bình** |

---

## 3. CHI TIẾT CÁC CỘT CẦN BỔ SUNG VÀO CÁC BẢNG ĐANG CÓ (ALTER TABLE)

Nếu giữ nguyên cơ sở dữ liệu hiện tại và cập nhật lên chuẩn 100%, cần thực hiện các lệnh bổ sung sau:

### 3.1. Bổ sung vào bảng `users`:
* `emergency_contact_name VARCHAR(150)`: Tên người liên hệ khẩn cấp (F02).
* `emergency_contact_phone VARCHAR(20)`: SĐT liên hệ khẩn cấp (F02).

### 3.2. Bổ sung vào bảng `branches`:
* `code VARCHAR(50)`: Mã định danh chi nhánh (VD: 'MLD-Q3', 'MLD-BT').

### 3.3. Bổ sung vào bảng `bookings`:
* `assigned_room_id UUID REFERENCES branch_rooms(id)`: Phòng dịch vụ xếp khách (W05, W07).
* `base_total NUMERIC(12,2)`: Tổng tiền gốc các dịch vụ thành phần.
* `points_used INT DEFAULT 0`: Số điểm MLD Loyalty khách đã trừ.
* `points_discount NUMERIC(12,2) DEFAULT 0.00`: Số tiền giảm trừ tương ứng từ điểm thưởng.
* `booked_for_name VARCHAR(150)`: Đặt cho người thân (C05).
* `booked_for_phone VARCHAR(20)`: SĐT người thân nhận dịch vụ (C05).

### 3.4. Bổ sung vào bảng `courses`:
* `theory_hours INT DEFAULT 48`: Số giờ lý thuyết (E03).
* `practice_hours INT DEFAULT 96`: Số giờ thực hành lâm sàng (E03).
* `deposit_amount NUMERIC(12,2) DEFAULT 2000000.00`: Tiền đặt cọc giữ chỗ (E05, E06).
* `learning_outcomes JSONB DEFAULT '[]'::jsonb`: Danh mục kỹ năng đầu ra (E03).

---

## 4. DANH SÁCH 13 BẢNG MỚI CẦN BỔ SUNG ĐỂ ĐẠT 100% FIGMA

1. `user_settings`: Cấu hình ứng dụng người dùng (FaceID, nhắc lịch, ngôn ngữ) — F08.
2. `branch_rooms`: Phòng dịch vụ và phòng thực hành chi nhánh — W02, W05.
3. `technician_shifts`: Phân ca trực và lịch trực của chuyên viên — W05.
4. `booking_items`: Chi tiết từng dịch vụ trong đơn đặt đa dịch vụ — C01, Nhóm C.
5. `user_vouchers`: Ví voucher cá nhân của khách hàng — F05.
6. `course_chapters`: Các chương mục trong khóa học — E08.
7. `course_lessons`: Chi tiết bài học video và tài liệu PDF — E08, E09.
8. `user_lesson_progress`: Tiến độ xem video và hoàn thành bài của học viên — E08, E09.
9. `course_quizzes` & `quiz_questions`: Ngân hàng đề thi và câu hỏi trắc nghiệm — E10.
10. `quiz_submissions`: Bài nộp và điểm thi của học viên — E10.
11. `batch_schedules`: Lịch học từng buổi thực hành lâm sàng — E11, W11.
12. `student_attendance`: Sổ điểm danh chuyên cần của học viên — E12, W10.
13. `student_academic_records`: Bảng điểm 4 chiều và chứng chỉ tốt nghiệp — E12, W10.
14. `invoices` & `invoice_items`: Hóa đơn thu ngân POS và E-Receipts — W07, F06, W12.
15. `audit_logs`: Nhật ký kiểm toán thao tác hệ thống — W01.

---

## 5. LỘ TRÌNH MIGRATION AN TOÀN (RECOMMENDED ROADMAP)

Để nâng cấp dự án từ 80% lên 100% một cách mượt mà, không gián đoạn hệ thống:
1. **Bước 1 (Chạy Script DDL):** Thực thi file `checkdata/FULL_DATABASE_STRUCTURE.sql` trên PostgreSQL/Supabase. Tất cả các lệnh đều sử dụng `CREATE TABLE IF NOT EXISTS`, đảm bảo dữ liệu hiện có không bị ảnh hưởng.
2. **Bước 2 (Cập nhật Backend NestJS Modules):**
   * Bổ sung module `AcademyModule` để cung cấp các API cho Group E (LMS, Video Lessons, Quizzes, Grading).
   * Bổ sung module `CashierModule` để cung cấp API cho màn hình Thu ngân W07 và xuất hóa đơn PDF F06.
   * Cập nhật `AppointmentsModule` để lưu `booking_items` khi người dùng chọn nhiều dịch vụ.
3. **Bước 3 (Đồng bộ Mobile App):**
   * Tích hợp model `BookingItem` vào Bloc đặt lịch C01.
   * Kết nối màn hình F05 với bảng `user_vouchers`.
   * Xây dựng phân hệ Group E (E01-E12) trên Flutter dựa trên 7 bảng Academy đã tạo.

