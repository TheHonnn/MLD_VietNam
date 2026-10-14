# MLD Healthcare Platform - Vietnam

Dịch vụ chăm sóc sức khỏe & Nền tảng Y tế Số (HealthTech Platform) bao gồm Ứng dụng di động (Flutter Mobile App) và Hạ tầng Backend API (NestJS).

---

## 📁 Cấu trúc Thư mục Dự án

```
MLD_VietNam/
├── backend/          # Backend Core API Gateway (NestJS + TypeScript)
├── mobile/           # Mobile App dành cho Bệnh nhân / Khách hàng (Flutter 3.x)
├── database/         # Database Migrations & Seed data (PostgreSQL / Supabase)
├── docs/             # Tài liệu kiến trúc, đặc tả API & luồng nghiệp vụ
├── checkdata/        # Đặc tả Schema, Data Dictionary & SQL Structure
├── figma_assets/     # Tài liệu specs và script bóc tách giao diện Figma
└── scripts/          # Các công cụ hỗ trợ phân tích & tải assets
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Môi Trường Local

### 1. Backend (NestJS API)
```bash
cd backend
npm install
cp .env.example .env   # Cấu hình biến môi trường Supabase & Redis
npm run start:dev      # Khởi chạy server tại http://localhost:3000
```
- Swagger API Docs: `http://localhost:3000/api`

### 2. Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

### 3. Database (PostgreSQL / Supabase)
- Thư mục `database/migrations/`: Các file khởi tạo bảng dữ liệu và thiết lập Row Level Security (RLS).
- Thư mục `database/seeds/`: Dữ liệu mẫu (chuyên khoa, bác sĩ, cơ sở phòng khám).

---

## 🌿 Quy Chuẩn Phân Nhánh Git (Git Branching Workflow)

- `main`: Nhánh ổn định cao nhất, dùng để release production.
- `develop`: Nhánh tích hợp chính (Active Development). Toàn bộ tính năng mới merge vào đây.
- `feature/<tên-tính-năng>`: Nhánh làm việc cá nhân/tính năng mới (tạo ra từ `develop`, hoàn thành tạo PR vào `develop`).
- `hotfix/<tên-lỗi>`: Sửa lỗi khẩn cấp trên `main`.
