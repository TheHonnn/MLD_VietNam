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
Hệ thống thanh toán đã tích hợp chuẩn **VietQR Napas 247** qua cổng Open Banking PayOS:
- **Nguyên lý hoạt động:**
  - Tạo link và mã QR động kèm chính xác số tiền dịch vụ và nội dung chuyển khoản tự động.
  - Mobile App đối soát trạng thái giao dịch ngân hàng theo thời gian thực (Polling mỗi 3 giây).
  - Quy tắc an toàn bắt buộc: **"Chưa nhận tiền – Chưa hoàn tất đơn hàng"** (Chỉ khi ngân hàng xác nhận giao dịch thành công mới chuyển trạng thái hoàn tất).
- **Cấu trúc biến môi trường mẫu (`backend/.env`):**
  ```env
  PAYOS_CLIENT_ID=your_client_id_here
  PAYOS_API_KEY=your_api_key_here
  PAYOS_CHECKSUM_KEY=your_checksum_key_here
  PAYOS_BANK_BIN=970422
  PAYOS_BANK_ACCOUNT_NO=your_account_number_here
  PAYOS_BANK_ACCOUNT_NAME=your_account_name_here
  PAYOS_RETURN_URL=mld://payment/success
  PAYOS_CANCEL_URL=mld://payment/cancel
  ```
  *(Lấy thông tin kết nối và bộ khóa API tại [payos.vn](https://payos.vn) và lưu vào file `.env` cục bộ).*

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

## 📊 Bảng Tiến Độ Dự Án (Mobile App & Backend Status)

| Phân hệ / Tính năng | Mô tả chi tiết | Trạng thái |
| :--- | :--- | :---: |
| **Giao diện chuẩn Figma** | Toàn bộ 50+ màn hình Mobile hoàn thiện 100% theo bản vẽ Figma | ✅ Hoàn thành |
| **Tương thích Responsive** | Bọc `SingleChildScrollView` toàn bộ Form, Dialog, Bottom Sheet; chống tràn chữ trên mọi cỡ màn hình | ✅ Hoàn thành |
| **Hỗ trợ Cross-Platform** | Tự động hóa `flutter.ndkVersion` cho Android; Podfile chuẩn cho iOS/macOS | ✅ Hoàn thành |
| **Live API: Đặt lịch khám (Booking)** | Tạo lịch thật, hủy lịch thật, đổi lịch thật kết nối DB PostgreSQL | ✅ Hoàn thành |
| **Live API: Trị liệu (Treatment)** | Nhật ký buổi điều trị thực tế, ảnh chăm sóc spa, đánh giá dịch vụ | ✅ Hoàn thành |
| **Live API: Học viện (Academy)** | Danh mục khóa học thật, nộp hồ sơ ghi danh, thời khóa biểu, làm bài test | ✅ Hoàn thành |
| **Live API: Hội viên (Membership)** | Điểm tích lũy, đổi voucher thật, đồng bộ hồ sơ khách hàng giữa Mobile và Máy chủ | ✅ Hoàn thành |
| **Thanh toán VietQR Napas** | Tích hợp PayOS VietQR, quét mã chuẩn xác số tiền, chặn hoàn tất khi chưa nhận tiền | ✅ Hoàn thành |
| **Tự động Webhook ngân hàng** | Đấu nối nhận Webhook từ ngân hàng khi triển khai server production | ⏳ Chờ Server Free |
| **Thông báo đẩy (FCM)** | Đẩy nhắc lịch hẹn, nhắc ca học qua Firebase Cloud Messaging | ⏳ Chờ Server Free |
| **Web Admin & Mini App** | Các không gian làm việc độc lập do nhóm chuyên trách phát triển | 🔄 Đang triển khai |

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
