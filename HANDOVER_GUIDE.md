# 📦 TÀI LIỆU HƯỚNG DẪN BÀN GIAO DỰ ÁN (HANDOVER GUIDE)
## Hệ Thống Y Tế & Chăm Sóc Sức Khỏe MLD Healthcare Platform - Vietnam

Tài liệu này được biên soạn để hướng dẫn chi tiết quy trình bàn giao toàn bộ hệ thống từ Lập trình viên (Developer) sang Đơn vị Vận hành / Khách hàng / Quản trị viên mới, đảm bảo **bảo mật 100% tài khoản cá nhân của lập trình viên** và **duy trì tính toàn vẹn của mã nguồn cũng như dữ liệu hệ thống**.

---

## 📑 MỤC LỤC
1. [Tổng Quan Các Cấu Phần Bàn Giao](#1-tổng-quan-các-cấu-phần-bàn-giao)
2. [Quy Trình Chuyển Giao Quyền Quản Trị Các Nền Tảng Cloud](#2-quy-trình-chuyển-giao-quyền-quản-trị-các-nền-tảng-cloud)
3. [Cấu Hình Cổng Thanh Toán VietQR (Chuyển Sang Tài Khoản Doanh Nghiệp)](#3-cấu-hình-cổng-thanh-toán-vietqr-chuyển-sang-tài-khoản-doanh-nghiệp)
4. [Bảng Kê Biến Môi Trường Cần Thiết (.env)](#4-bảng-kê-biến-môi-trường-cần-thiết-env)
5. [Quy Trình Khởi Động & Kiểm Thử Nghiệm Thu (Acceptance Checklist)](#5-quy-trình-khởi-động--kiểm-thử-nghiệm-thu-acceptance-checklist)
6. [Các Bước Thu Hồi & Bảo Vệ Tài Khoản Cá Nhân Sau Bàn Giao](#6-các-bước-thu-hồi--bảo-vệ-tài-khoản-cá-nhân-sau-bàn-giao)

---

## 1. Tổng Quan Các Cấu Phần Bàn Giao

Hệ thống bao gồm các cấu phần mã nguồn đã được đồng bộ lên nhánh `develop` tại kho lưu trữ GitHub:
- **Ứng dụng Di động (`mobile/`):** Phát triển trên Flutter 3.x, tương thích Android (Java 17 / NDK tự động) & iOS (iOS 13.0+ / CocoaPods). Tích hợp toàn diện Live API và giao diện chuẩn Figma.
- **Hệ thống Backend API (`backend/`):** Nền tảng NestJS TypeScript, cấu trúc Modular (Auth, Appointments, Treatment, Academy, Membership, Payments VietQR, Tasks).
- **Cơ sở Dữ liệu (`database/`):** Master Schema PostgreSQL 53 bảng quan hệ, RLS, Triggers, Seed data và TypeScript Shared Types.
- **Cổng Quản trị Web Admin (`web-admin/`):** React + Vite.
- **Ứng dụng Zalo Mini App (`minizalo/`):** React + ZMP SDK.

---

## 2. Quy Trình Chuyển Giao Quyền Quản Trị Các Nền Tảng Cloud

> [!IMPORTANT]
> **Nguyên tắc cốt lõi:** Lập trình viên **không bao giờ cung cấp mật khẩu cá nhân**. Thay vào đó, sử dụng tính năng **Mời Quản trị viên (Invite Admin/Owner)** hoặc **Chuyển nhượng quyền sở hữu (Transfer Ownership)** của từng nền tảng.

### 2.1. Chuyển nhượng Kho lưu trữ GitHub (Source Code)
1. Bên tiếp nhận cung cấp `Username` tài khoản GitHub của họ.
2. Lập trình viên truy cập: `https://github.com/TheHonnn/MLD_VietNam/settings`.
3. Kéo xuống cuối trang, tại mục **Danger Zone** -> Chọn **Transfer ownership**.
4. Nhập `Username` hoặc `Organization` của bên tiếp nhận và xác nhận chuyển giao.
5. Bên nhận mở email xác nhận là hoàn tất việc nắm giữ 100% mã nguồn.

### 2.2. Chuyển nhượng Cơ sở Dữ liệu Supabase Cloud (PostgreSQL & Storage)
1. Bên tiếp nhận đăng ký tài khoản miễn phí tại [supabase.com](https://supabase.com) bằng email doanh nghiệp của họ.
2. Lập trình viên đăng nhập vào Supabase Dashboard hiện tại -> Chọn dự án `MLD_VietNam` -> Vào **Project Settings** -> **Members**.
3. Bấm **Invite Member** -> Nhập email của bên tiếp nhận -> Gán quyền cao nhất: **Owner** (Chủ sở hữu).
4. Bên tiếp nhận mở email bấm chấp nhận lời mời.
5. Sau khi bên tiếp nhận đã trở thành Owner, lập trình viên có thể rời khỏi dự án (Leave Project) hoặc chuyển nhượng tổ chức (Transfer Project). Toàn bộ 53 bảng CSDL, người dùng, dữ liệu mẫu và ảnh lưu trữ được bảo toàn 100%.

---

## 3. Cấu Hình Cổng Thanh Toán VietQR (Chuyển Sang Tài Khoản Doanh Nghiệp)

Trong giai đoạn lập trình và kiểm thử, hệ thống sử dụng tài khoản cá nhân của lập trình viên để test dòng tiền. Khi bàn giao đưa vào vận hành thực tế, **bắt buộc phải chuyển đổi sang tài khoản ngân hàng của Đơn vị vận hành / Doanh nghiệp**.

### Các bước thực hiện:
1. Đơn vị vận hành truy cập [payos.vn](https://payos.vn) và đăng ký tài khoản bằng thông tin doanh nghiệp.
2. Vào mục **Kênh thanh toán** -> Chọn **Thêm tài khoản ngân hàng thụ hưởng**:
   - Nhập Ngân hàng của doanh nghiệp (MBBank, Vietcombank, Techcombank, ACB,...).
   - Nhập Số tài khoản ngân hàng chính thức nhận tiền dịch vụ spa và học phí của MLD.
   - Nhập Tên chủ tài khoản doanh nghiệp.
3. Vào mục **Cài đặt tích hợp (API Credentials)** để lấy 3 thông số bảo mật:
   - `Client ID`
   - `API Key`
   - `Checksum Key`
4. Cập nhật các thông số mới này vào file biến môi trường `backend/.env` hoặc bảng điều khiển của Server Cloud (xem mục 4).

---

## 4. Bảng Kê Biến Môi Trường Cần Thiết (.env)

Khi bàn giao, lập trình viên bàn giao file `backend/.env` riêng qua kênh bảo mật nội bộ (không commit lên Git). File này có cấu trúc mẫu như sau:

```env
# ==============================================================================
# 1. CẤU HÌNH HỆ THỐNG CHUNG
# ==============================================================================
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*

# ==============================================================================
# 2. CƠ SỞ DỮ LIỆU CLOUD (SUPABASE POSTGRESQL)
# Lấy tại: Supabase Dashboard -> Project Settings -> API
# ==============================================================================
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# ==============================================================================
# 3. XÁC THỰC BẢO MẬT (JWT AUTHENTICATION)
# Chuỗi khóa bí mật dùng để mã hóa phiên đăng nhập
# ==============================================================================
JWT_SECRET=super-secret-jwt-key-medical-healthcare-2026
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=super-secret-refresh-token-key-mld-vietnam-2026
JWT_REFRESH_EXPIRES_IN=30d

# ==============================================================================
# 4. CỔNG THANH TOÁN VIETQR (PAYOS OPEN BANKING)
# Điền thông tin tài khoản doanh nghiệp nhận tiền của MLD
# ==============================================================================
PAYOS_CLIENT_ID=<Client_ID_doanh_nghiep>
PAYOS_API_KEY=<API_Key_doanh_nghiep>
PAYOS_CHECKSUM_KEY=<Checksum_Key_doanh_nghiep>
PAYOS_BANK_BIN=970422
PAYOS_BANK_ACCOUNT_NO=<So_tai_khoan_ngan_hang_doanh_nghiep>
PAYOS_BANK_ACCOUNT_NAME=<Ten_chu_tai_khoan_doanh_nghiep>
PAYOS_RETURN_URL=mld://payment/success
PAYOS_CANCEL_URL=mld://payment/cancel

# ==============================================================================
# 5. DỊCH VỤ EMAIL GỬI MÃ OTP & THÔNG BÁO (SMTP GMAIL / RESEND)
# Tạo mật khẩu ứng dụng 16 ký tự tại: https://myaccount.google.com/apppasswords
# ==============================================================================
MAIL_FROM_NAME="MLD Việt Nam"
MAIL_FROM_ADDRESS="no-reply@mldvietnam.vn"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email-doanh-nghiep@gmail.com
SMTP_PASS=mat-khau-ung-dung-16-ky-tu
```

---

## 5. Quy Trình Khởi Động & Kiểm Thử Nghiệm Thu (Acceptance Checklist)

Bên tiếp nhận có thể thực hiện kiểm tra nghiệm thu hệ thống theo các bước tiêu chuẩn:

### 5.1. Khởi chạy Backend:
```bash
cd backend
npm install
npm run build      # Biên dịch NestJS (bắt buộc hoàn tất không lỗi)
npm run start:prod # Hoặc npm run start:dev
```
- Kiểm tra tài liệu Swagger API: `http://localhost:3000/api/docs`.

### 5.2. Khởi chạy Mobile App:
```bash
cd mobile
flutter pub get
flutter test       # Bắt buộc đạt 28/28 bộ test passed
flutter analyze    # Bắt buộc đạt 0 warnings / 0 errors
flutter run
```

### 5.3. Kịch bản kiểm thử thực tế (Smoke Tests):
1. **Đặt lịch khám (Booking Flow):** Chọn dịch vụ -> Chọn chuyên viên -> Chọn giờ hẹn -> Quét mã VietQR kiểm tra đối soát -> Tạo lịch thành công.
2. **Quản lý lịch hẹn:** Thử đổi giờ hẹn (Reschedule) và hủy lịch hẹn (Cancel) với các khung giờ bận/trống.
3. **Trị liệu (Treatment):** Xem danh sách buổi điều trị thật, xem hình ảnh nhật ký spa, gửi biểu mẫu đánh giá sao.
4. **Học viện (Academy):** Xem danh mục khóa học thật, điền đơn ghi danh, làm bài trắc nghiệm nộp bài.
5. **Hội viên (Membership):** Xem điểm tích lũy, quy đổi voucher, kiểm tra đồng bộ thông tin hồ sơ giữa ứng dụng và cơ sở dữ liệu.

---

## 6. Các Bước Thu Hồi & Bảo Vệ Tài Khoản Cá Nhân Sau Bàn Giao

Sau khi đơn vị tiếp nhận đã xác nhận chuyển đổi thành công sang tài khoản và ngân hàng của họ, lập trình viên thực hiện các thao tác dọn dẹp cuối cùng:
1. **PayOS:** Truy cập `payos.vn` bằng tài khoản cá nhân, xóa hoặc hủy liên kết tài khoản ngân hàng thử nghiệm cũ.
2. **Supabase:** Rút tài khoản cá nhân ra khỏi danh sách quản trị viên (Leave Project).
3. **GitHub:** Xác nhận quyền Owner đã thuộc về bên tiếp nhận.

---
*Tài liệu được cập nhật tự động theo phiên bản phát hành MLD Healthcare v0.3.0.*
