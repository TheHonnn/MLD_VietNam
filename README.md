# MLD Healthcare Platform - Vietnam

Dịch vụ chăm sóc sức khỏe & Nền tảng Y tế Số (HealthTech Platform) bao gồm Ứng dụng di động (Flutter Mobile App), Cổng quản trị (Web Admin), Zalo Mini App và Hạ tầng Backend API (NestJS).

---

## 📁 Cấu trúc Dự án

```
MLD_VietNam/
├── 📱 mobile/          # Ứng dụng Mobile dành cho Bệnh nhân / Khách hàng (Flutter 3.x)
├── 💻 web-admin/       # Không gian làm việc Cổng Quản trị Web Admin (React + Vite)
├── 💬 minizalo/        # Không gian làm việc Zalo Mini App (React + ZMP SDK)
│
├── ⚙️ backend/         # Máy chủ trung tâm API Gateway & Core Logic (NestJS)
├── 🗄️ database/        # CSDL PostgreSQL Master Schema, Seeds, TypeScript Shared Types
└── 📚 docs/            # Toàn bộ tài liệu kiến trúc, đặc tả Figma & công cụ tiện ích
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

### 1. Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

### 2. Backend (NestJS API)
```bash
cd backend
npm install
cp .env.example .env   # Cấu hình biến môi trường Supabase & Redis
npm run start:dev      # Khởi chạy server tại http://localhost:3000
```
- Swagger API Docs: `http://localhost:3000/api`

### 3. Database (PostgreSQL / Supabase)
- File [`database/schema.sql`](database/schema.sql) : DDL Master gồm 53 bảng quan hệ, Enums, Triggers, RLS.
- File [`database/shared_types.ts`](database/shared_types.ts) : TypeScript Types dùng chung cho Backend, Web Admin và Mini App.
- Thư mục [`database/seeds/`](database/seeds/) : Dữ liệu mẫu (chuyên khoa, bác sĩ, cơ sở phòng khám, dịch vụ).

---

## 🌿 Quy Chuẩn Phân Nhánh Git (Git Branching Workflow)

- `main`: Nhánh ổn định cao nhất, dùng để release production.
- `develop`: Nhánh tích hợp chính (Active Development). Toàn bộ tính năng mới merge vào đây.
- `feature/<tên-tính-năng>`: Nhánh làm việc cá nhân/tính năng mới (tạo ra từ `develop`, hoàn thành tạo PR vào `develop`).
  - Ví dụ: `feature/mobile-e05`, `feature/admin-dashboard`, `feature/zalo-booking`.
- `hotfix/<tên-lỗi>`: Sửa lỗi khẩn cấp trên `main`.

---

## 📋 Hướng Dẫn Dành Cho Thành Viên Khi Clone Nhánh `develop`

### 1. Lưu ý quan trọng khi Build trên các thiết bị khác nhau

#### 🤖 Android:
- Dự án đã cấu hình `ndkVersion = flutter.ndkVersion` tự động tương thích với bộ NDK có sẵn trong Android Studio của bạn.
- Yêu cầu JDK: **Java 17**.

#### 🍏 iOS / macOS:
- Sau khi pull code về trên máy Mac, bắt buộc chạy lệnh cài đặt Pods:
  ```bash
  cd mobile
  flutter pub get
  cd ios
  pod install
  ```

---

## 💳 Cấu Hình Cổng Thanh Toán VietQR (PayOS)
Hệ thống thanh toán đã tích hợp chuẩn **VietQR Napas 247** qua PayOS:
- **Tài khoản nhận:** MBBank - `0394316963` (BUI THE HOANG).
- **Cơ chế xác thực:** Cơ chế kiểm tra đối soát 2 lớp:
  - Mobile App tự động kiểm tra trạng thái giao dịch ngân hàng theo thời gian thực (Polling mỗi 3 giây).
  - Quy tắc bảo đảm an toàn: **"Chưa nhận tiền – Chưa hoàn tất đơn hàng"** (Không thể bypass nếu khách chưa quét mã chuyển khoản thành công).
- **Các biến môi trường Backend (`backend/.env`):**
  ```env
  PAYOS_CLIENT_ID=bc4b5481-da88-4f8f-bacd-4226e4ce959a
  PAYOS_API_KEY=3fc4338f-0940-40df-bd37-30cf6e8ad734
  PAYOS_CHECKSUM_KEY=46edada6e9e516bfca357fc1db04bddb529ce2f1185be31e6a3b9e9de7aad436
  PAYOS_RETURN_URL=mld://payment/success
  PAYOS_CANCEL_URL=mld://payment/cancel
  ```

---

## 🛡️ Tiêu Chuẩn Kiểm Thử Trước Khi Tạo PR vào `develop`

Trước khi push hoặc tạo Pull Request, lập trình viên cần chạy kiểm tra bắt buộc:

1. **Kiểm tra cú pháp & cảnh báo Mobile (Bắt buộc 0 issues):**
   ```bash
   cd mobile
   flutter analyze
   ```
2. **Chạy toàn bộ 28 bộ Unit/Widget Test:**
   ```bash
   flutter test
   ```
3. **Kiểm tra biên dịch Backend:**
   ```bash
   cd backend
   npm run build
   ```

---

## 📌 Lịch Sử Cập Nhật Nhánh `develop` (Changelog)

### [v0.3.0] - 2026-10-21
- **Live API Integration**: Thay thế toàn bộ Mock Data bằng API Backend thực tế (Đặt lịch khám, hồ sơ trị liệu, khóa học & quản lý hội viên/voucher).
- **VietQR Payment**: Đấu nối thành công cổng thanh toán tự động VietQR Napas qua PayOS.
- **Cross-Platform Compatibility**:
  - Tự động hóa `flutter.ndkVersion` cho Android build.
  - Bổ sung `mobile/ios/Podfile` chuẩn cho macOS/iPhone build.
- **Responsive UI Overhaul**:
  - Bọc `SingleChildScrollView` toàn bộ modal, bottom sheets và dialog (tránh hoàn toàn lỗi tràn chữ `RenderFlex overflow` trên màn hình nhỏ từ 320px và khi bàn phím ảo bật lên).
