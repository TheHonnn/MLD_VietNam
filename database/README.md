# HƯỚNG DẪN TRIỂN KHAI DATABASE SCHEMA & MIGRATION (SUPABASE / POSTGRESQL)

Tài liệu này hướng dẫn cách chạy các tệp Migration SQL và nạp dữ liệu mẫu (Seed Data) vào cơ sở dữ liệu **Supabase** hoặc **PostgreSQL 15+**.

---

## 1. CẤU TRÚC TỆP DATABASE

```
database/
├── migrations/
│   ├── 001_init_schema.sql           # DDL tạo Extensions, Enums, Bảng, Khóa ngoại, Indexes & Triggers
│   └── 002_row_level_security.sql    # Kích hoạt RLS và thiết lập Policies bảo mật dữ liệu y tế
└── seeds/
    └── 001_initial_seed.sql          # Dữ liệu ban đầu (Chuyên khoa, Phòng khám, Bác sĩ mẫu, Slots, Coupons)
```

---

## 2. CÁCH 1: CHẠY TRỰC TIẾP TRÊN SUPABASE DASHBOARD (NHANH NHẤT)

Nếu bạn đã có dự án trên [Supabase.com](https://supabase.com):

1. Đăng nhập vào **Supabase Dashboard** $\rightarrow$ Chọn Dự án của bạn.
2. Ở thanh điều hướng bên trái, chọn **SQL Editor** (Biểu tượng `>_`).
3. Nhấn **New Query**:
   - **Bước 1:** Copy toàn bộ nội dung trong tệp [`database/migrations/001_init_schema.sql`](./migrations/001_init_schema.sql) $\rightarrow$ Dán vào và bấm **Run** (Ctrl + Enter).
   - **Bước 2:** Copy nội dung tệp [`database/migrations/002_row_level_security.sql`](./migrations/002_row_level_security.sql) $\rightarrow$ Dán vào và bấm **Run**.
   - **Bước 3:** Copy nội dung tệp [`database/seeds/001_initial_seed.sql`](./seeds/001_initial_seed.sql) $\rightarrow$ Dán vào và bấm **Run**.
4. Vào mục **Table Editor** để kiểm tra: Các bảng `users`, `doctors`, `specialities`, `appointments`, `doctor_slots` đã xuất hiện kèm dữ liệu mẫu.

---

## 3. CÁCH 2: DÙNG SUPABASE CLI (LOCAL DEVELOPMENT)

Nếu bạn chạy Supabase Local bằng Docker:

```bash
# 1. Khởi động môi trường Supabase local (nếu chưa chạy)
supabase start

# 2. Reset và chạy toàn bộ migrations
supabase db reset
```

Hoặc liên kết trực tiếp với dự án Cloud:
```bash
# Đăng nhập và liên kết
supabase login
supabase link --project-ref <YOUR_PROJECT_ID>

# Đẩy schema lên database
supabase db push
```

---

## 4. CÁCH 3: DÙNG CÔNG CỤ PSQL / DOCKER POSTGRES THÔNG THƯỜNG

Nếu bạn tự host PostgreSQL trên VPS hoặc Docker container:

```bash
# Thay thế DB_URL bằng connection string thực tế của bạn
export DATABASE_URL="postgresql://postgres:252729@localhost:5432/MedicalHealthcareMobileAppSql"

# Chạy lần lượt các script SQL:
psql $DATABASE_URL -f database/migrations/001_init_schema.sql
psql $DATABASE_URL -f database/migrations/002_row_level_security.sql
psql $DATABASE_URL -f database/seeds/001_initial_seed.sql
```

---

## 5. TÀI KHOẢN MẪU SAU KHI SEED (TESTING ACCOUNTS)

Mật khẩu mặc định cho toàn bộ tài khoản bên dưới: `Password@123`

| Số điện thoại | Email | Họ và tên | Vai trò (Role) | Chức vụ |
| :--- | :--- | :--- | :--- | :--- |
| **0901000001** | `admin@medcare.vn` | Quản Trị Viên Hệ Thống | `ADMIN` | Quản lý toàn quyền |
| **0901000002** | `letan01@medcare.vn` | Nguyễn Thị Mai | `RECEPTIONIST` | Lễ tân tiếp đón, check-in QR |
| **0901000003** | `bshung.timmach@medcare.vn` | PGS.TS Trần Văn Hùng | `DOCTOR` | Bác sĩ chuyên khoa Tim Mạch |
| **0901000004** | `bstrang.nhikhoa@medcare.vn` | ThS.BS Lê Thu Trang | `DOCTOR` | Bác sĩ chuyên khoa Nhi Khoa |
| **0987654321** | `benhnhan.nam@gmail.com` | Nguyễn Văn Nam | `PATIENT` | Bệnh nhân đặt khám |

