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
