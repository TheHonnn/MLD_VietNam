# 🏥 MediLearn Healthcare & Vocational Academy Ecosystem
> **Hệ Thống Y Tế Chuyên Sâu & Đào Tạo Nghề Y Dược Đa Nền Tảng (Mobile App Flutter + Web Admin React/TypeScript)**  
> Thiết kế dựa trên Figma: [Medical Healthcare Mobile App](https://www.figma.com/design/ctH76PAiMBTQLJE0BxNjOI/Medical-Healthcare-Mobile-App?node-id=0-1&p=f&t=6M1JbduVs0EV863f-0)

---

## 🌟 Tổng Quan Kiến Trúc (Architecture Overview)

Dự án được xây dựng theo tiêu chuẩn Enterprise với **Clean Architecture** phân lớp nghiêm ngặt, tách biệt hoàn toàn giữa UI, Business Logic (Use cases/Controllers) và Data Models:

```
MLD/
├── lib/                                    # ỨNG DỤNG DI ĐỘNG (FLUTTER)
│   ├── app.dart                            # MultiProvider, AppTheme & Root Navigation
│   ├── main.dart                           # App Entrypoint & System UI
│   ├── core/
│   │   ├── theme/                          # Design System (Colors, Typography, Light/Dark Theme)
│   │   ├── constants/                      # Mock Data, Assets & System Constants
│   │   ├── utils/                          # Formatters (VND, Dates, Day of Week, Durations)
│   │   └── widgets/                        # Reusable Component Library (Buttons, Inputs, Cards, Badges...)
│   └── features/
│       ├── auth/                           # [GROUP A] Splash, Onboarding & Dual-Role Auth (OTP)
│       ├── home_service/                   # [GROUP B] Home Dashboard, Banners & Service Discovery
│       ├── booking_payment/                # [GROUP C] Multi-step Booking Flow & Multi-gateway Payment
│       ├── treatment_care/                 # [GROUP D] EMR Bệnh Án Điện Tử & Telehealth Live Chat
│       ├── vocational_training/            # [GROUP E] Academy Video Player, Speed Toggle & Quiz Cert
│       └── profile_membership/             # [GROUP F] Digital VIP Membership Card, Points & Vouchers
│
└── admin_web/                              # [GROUP W] CỔNG QUẢN TRỊ ADMIN (REACT + TS + TAILWIND)
    ├── package.json                        # Vite + React 18 + TypeScript + TailwindCSS
    ├── index.html
    ├── src/
    │   ├── App.tsx                         # Master Layout & Multi-tab Navigation
    │   ├── types/                          # Shared Admin Interfaces & Types
    │   └── components/
    │       ├── Sidebar.tsx                 # Navigation Drawer with Admin Profile
    │       ├── Header.tsx                  # Global Search, SLA Status & Notifications
    │       ├── OverviewTab.tsx             # KPI Metrics, Volume Chart & Recent Logs
    │       ├── UsersTab.tsx                # RBAC User Management & Role Toggling
    │       ├── AppointmentsTab.tsx         # Booking Approval & Revenue Analytics
    │       ├── ServicesTab.tsx             # Medical Services CMS
    │       └── CoursesTab.tsx              # Vocational Training Academy CMS
```

---

## 🎨 I. Design System & UI/UX (Page `02 — DESIGN SYSTEM`)

1. **Color Palette:**
   - **Primary (Medical Blue):** `#0066F6` (Xanh y tế công nghệ cao), Hỗ trợ Gradient chuyển màu mượt mà.
   - **Secondary (Teal / Mint):** `#00BFA5` (Màu xanh phục hồi & hy vọng).
   - **Vocational Accent (Gold / Amber):** `#F59E0B` (Huy hiệu chứng chỉ & học viện nghề).
   - **Status Colors:** Success (`#10B981`), Warning (`#F59E0B`), Error (`#EF4444`), Info (`#3B82F6`).
   - **Chế độ Light & Dark Mode:** Tự động điều chỉnh độ tương phản, nền OLED `#0B1329`, Card `#131F37`, Border `#263554`.

2. **Typography Hierarchy:**
   - Font tiêu chuẩn: **Inter** qua `google_fonts`.
   - Phân cấp rõ ràng: Display Large (28px Bold), Display Medium (22px Bold), Title Medium (16px SemiBold), Body Large (15px Regular), Label Large (15px SemiBold cho nút CTA).

3. **Component Library:**
   - `CustomButton`: 4 biến thể (Primary, Outline, Text, Icon), hỗ trợ trạng thái Loading và Disabled.
   - `CustomTextField`: Hỗ trợ prefix/suffix icons, hiển thị/ẩn mật khẩu, tìm kiếm kèm nút lọc nhanh.
   - `SkeletonBox` & `SkeletonCard`: Hiệu ứng shimmer mượt mà trong quá trình tải dữ liệu.
   - `StatusBadge`: Nhãn trạng thái đa màu sắc cho lịch hẹn, hạng thẻ và khóa học.
   - `ServiceCard`, `DoctorCard`, `CourseCard`: Thiết kế dạng ngang (Horizontal Slider) và dạng dọc (Vertical Feed).

---

## 📱 II. Chi Tiết Tính Năng Theo Các Group Figma

### 1. Group A: Onboarding & Authentication
- **Splash Screen:** Hiệu ứng logo chuyển động kết hợp biểu tượng Chữ thập Y tế + Mũ cử nhân học viện.
- **Onboarding Carousel:** 3 màn hình giới thiệu giá trị cốt lõi: Y tế chuyên sâu, Đào tạo chuẩn Kaigo Nhật Bản, và Bệnh án điện tử.
- **Phân quyền người dùng kép (Dual-role Auth):**
  - Khách hàng / Bệnh nhân khám bệnh
  - Học viên tham gia đào tạo nghề y khoa
- **Xác thực OTP:** Hỗ trợ nhập mã OTP 6 số qua SMS, ghi nhớ phiên đăng nhập an toàn bằng `SharedPreferences`.

### 2. Group B: Home & Service Discovery
- **Hero Banner Slider:** Tự động xoay vòng mỗi 4 giây quảng bá các gói khám tầm soát và khóa học mới.
- **Danh mục chuyên khoa nhanh:** Khám Tổng Quát, Tim Mạch, Da Liễu, Nha Khoa, Nhi Khoa, Học Viện.
- **Service Detail Screen:** Hero banner dạng Parallax, danh mục 32 chỉ số xét nghiệm, quy trình chuẩn bị trước khám, đội ngũ Giáo sư/Bác sĩ phụ trách, và nút CTA "Đặt Lịch Ngay" cố định chân trang.

### 3. Group C: Booking Flow & Payment Gateways
- **Quy trình đặt lịch 4 bước:**
  - Bước 1: Chọn Bác sĩ / Giáo sư chuyên khoa.
  - Bước 2: Chọn ngày trong tuần & Khung giờ khám (Khóa tự động các khung giờ đã kín lịch kèm biểu tượng ổ khóa).
  - Bước 3: Nhập thông tin triệu chứng bệnh lý và người khám.
  - Bước 4: Thanh toán đa cổng tích hợp (VNPay QR/ATM, Ví MoMo, Ví ZaloPay, Thẻ Visa/Mastercard, Thanh toán tại viện).
- **Hệ thống Voucher:** Nhập mã `MEDIVIP200` để được khấu trừ 200.000 ₫ ngay lập tức.
- **E-Ticket & QR Pass:** Sinh phiếu khám bệnh điện tử chứa mã vé (VD: `MED-2026-9812`) và mã QR hỗ trợ check-in tự động tại Kiosk bệnh viện.

### 4. Group D: Treatment & Customer Care (EMR)
- **Hồ sơ bệnh án điện tử (EMR):** Lưu trữ lịch sử khám, chẩn đoán bệnh lý, chỉ số xét nghiệm cận lâm sàng và phác đồ điều trị.
- **Toa thuốc điện tử:** Hiển thị chi tiết liều dùng, tần suất uống thuốc, tích hợp chuông nhắc giờ uống thuốc.
- **Telehealth Consultation Live Chat:** Phòng khám từ xa mã hóa HIPAA, tương tác trực tiếp với PGS. TS. BS. Nguyễn Văn Hùng, đính kèm toa thuốc và hỗ trợ cuộc gọi thoại/video y khoa.

### 5. Group E: Vocational Training Academy (Đào Tạo Nghề Y Dược)
- **Danh mục khóa học chuẩn quốc tế:** Điều dưỡng đa khoa, Chứng chỉ Kaigo chuẩn Nhật Bản, Thẩm mỹ y khoa, Trợ thủ nha khoa.
- **Trình phát video bài giảng tối ưu:** Điều chỉnh tốc độ (0.75x, 1x, 1.25x, 1.5x, 2x), thanh tua tiến độ, ghi nhớ bài học đã hoàn thành.
- **Hệ thống đánh giá năng lực (Quiz Assessment):** Bộ câu hỏi trắc nghiệm thực hành lâm sàng, tính điểm tức thì và cấp Chứng Chỉ Tốt Nghiệp Số (Certificate of Completion) có thể tải về PDF.

### 6. Group F: Membership & Profile
- **Digital VIP Membership Card:** Thẻ thành viên số đổi màu theo hạng (Bạc, Vàng, Bạch Kim, Kim Cương), tích hợp chip thông minh và mã vạch định danh.
- **Thanh tiến độ tích điểm:** Theo dõi điểm loyalty tích lũy khi khám chữa bệnh hoặc nộp học phí.
- **Kho Voucher:** Quản lý mã giảm giá khám bệnh và học bổng học viện.
- **Chuyển đổi giao diện tức thì:** Cho phép người dùng chuyển đổi giữa giao diện Bệnh nhân và Học viên chỉ với 1 chạm.

---

## 💻 III. Group W: Web Admin Dashboard (React 18 + TypeScript + Tailwind)

Thư mục: `admin_web/`
- **Dashboard Tổng Quan:** Giám sát thời gian thực các chỉ số KPI, biểu đồ cột so sánh lượt khám vs đào tạo, danh sách cảnh báo vận hành.
- **Quản lý người dùng & Phân quyền (RBAC):** Quản lý Admin, Bác sĩ, Học viên, Bệnh nhân. Hỗ trợ thêm mới, khóa/mở tài khoản, đổi vai trò trực tiếp.
- **Quản lý lịch hẹn & Doanh thu:** Kiểm soát các ca khám, duyệt lịch chờ, theo dõi dòng tiền qua VNPay, MoMo, Visa. Xuất dữ liệu báo cáo Excel/CSV.
- **CMS Dịch vụ y tế & Khóa học đào tạo:** Thêm, sửa, xóa, bật/tắt dịch vụ khám bệnh và các chương trình huấn luyện nghề y khoa.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Getting Started)

### 1. Khởi chạy Ứng dụng Di động Flutter
```bash
# Cài đặt thư viện Flutter
flutter pub get

# Kiểm tra tính toàn vẹn mã nguồn (0 compile error)
flutter analyze

# Chạy ứng dụng trên thiết bị ảo hoặc Chrome
flutter run -d chrome
# hoặc chọn thiết bị Android/iOS kết nối
flutter run
```

### 2. Khởi chạy Web Admin Dashboard (React + TypeScript)
```bash
cd admin_web

# Cài đặt dependencies
npm install

# Khởi chạy máy chủ phát triển
npm run dev
# Dashboard sẽ khả dụng tại: http://localhost:3000
```
