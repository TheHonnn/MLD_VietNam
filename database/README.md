# HƯỚNG DẪN TRIỂN KHAI VÀ QUẢN TRỊ DATABASE MLD VIỆT NAM (POSTGRESQL / SUPABASE)

Tài liệu này cung cấp hướng dẫn toàn diện dành cho các kỹ sư Backend (NestJS), Frontend Web Admin và Mobile Developer để cài đặt, khởi tạo dữ liệu mẫu và tích hợp chuẩn hóa vào hệ thống cơ sở dữ liệu **MLD Việt Nam**.

---

## 1. CẤU TRÚC THƯ MỤC DATABASE

Toàn bộ hệ thống cơ sở dữ liệu đã được hợp nhất 100% theo tiêu chuẩn Single Source of Truth (SSOT):

```
database/
├── schema.sql                                  # MASTER DDL: 53 bảng, 21 Enums, Indexes, Triggers, RLS
├── shared_types.ts                             # TypeScript Types & Enums dùng chung (Backend & Frontend Admin)
├── DATABASE_SCHEMA_SPECIFICATION.md            # Tài liệu đặc tả 53 bảng, ERD, CRUD Admin & API Contracts
├── DEVELOPER_UNIFICATION_GUIDE.md              # 6 Quy tắc vàng thống nhất code, tránh lệch API/Database
├── DATABASE_SELF_EVALUATION_REPORT.md          # Báo cáo đánh giá chất lượng (Audit Score 9.8/10)
├── DATA_DICTIONARY.json                        # Từ điển dữ liệu chuẩn định dạng JSON (cho auto-generator)
│
├── migrations/
│   ├── 001_master_mld_vietnam_schema.sql       # File migration chuẩn dùng cho Supabase CLI / CI-CD pipeline
│   └── archive_legacy/                         # [LƯU TRỮ LỊCH SỬ] Các file migration mẫu cũ đã được gom lại
│       ├── 001_init_schema.sql
│       ├── 001_mld_vietnam_schema.sql
│       ├── 002_mld_vietnam_rls.sql
│       ├── 002_row_level_security.sql
│       └── 003_group_d_treatment_and_care.sql
│
└── seeds/
    ├── 001_mld_vietnam_seeds.sql               # Dữ liệu mẫu hoàn chỉnh: Chi nhánh, Phòng, Tài khoản, Dịch vụ, Khóa học...
    └── archive_legacy/                         # [LƯU TRỮ LỊCH SỬ] Seed mẫu ban đầu
        └── 001_initial_seed.sql
```

---

## 2. QUY TRÌNH TRIỂN KHAI NHANH (QUICK START)

### Cách 1: Chạy trực tiếp trên Supabase Dashboard (Khuyên dùng)
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard) $\rightarrow$ Mở dự án **MLD Việt Nam**.
2. Chọn menu **SQL Editor** (icon `>_` ở cột bên trái).
3. Bấm **New Query**:
   - **Bước 1 (Khởi tạo Schema & Triggers):** Copy toàn bộ nội dung tệp [`database/schema.sql`](./schema.sql) $\rightarrow$ Dán vào và bấm **Run** (Ctrl + Enter).
   - **Bước 2 (Nạp dữ liệu mẫu):** Copy toàn bộ nội dung tệp [`database/seeds/001_mld_vietnam_seeds.sql`](./seeds/001_mld_vietnam_seeds.sql) $\rightarrow$ Dán vào và bấm **Run**.
4. Mở **Table Editor**: Xác nhận đủ 53 bảng hệ sinh thái MLD Việt Nam đã hiển thị đầy đủ.

---

### Cách 2: Dùng Supabase CLI (Local Development với Docker)
```bash
# 1. Khởi động môi trường Supabase local
supabase start

# 2. Reset và áp dụng schema
supabase db reset

# Hoặc đẩy trực tiếp lên Cloud Project:
supabase login
supabase link --project-ref <YOUR_PROJECT_ID>
supabase db push
```

---

### Cách 3: Dùng psql / PostgreSQL thông thường (Docker / VPS)
```bash
# Cấu hình biến môi trường DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@localhost:5432/mld_vietnam_db"

# Bước 1: Tạo Schema, Enums, Indexes, Triggers
psql $DATABASE_URL -f database/schema.sql

# Bước 2: Nạp dữ liệu Seeding
psql $DATABASE_URL -f database/seeds/001_mld_vietnam_seeds.sql
```

---

## 3. DANH SÁCH TÀI KHOẢN MẪU KIỂM THỬ (TEST ACCOUNTS)

> Mật khẩu mặc định cho tất cả tài khoản bên dưới: `Password@123`

| Số điện thoại | Email | Họ và tên | Vai trò (Role) | Hạng hội viên | Mục đích |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0901000001** | `admin@mldvietnam.vn` | Ban Quản Trị MLD Việt Nam | `SUPER_ADMIN` | `DIAMOND` | Quản trị toàn hệ thống |
| **0901000002** | `letan.q3@mldvietnam.vn` | Lễ Tân Hoàng Yến | `RECEPTIONIST` | `STANDARD` | Tiếp đón, quét QR Check-in/out |
| **0901000003** | `ktv.lananh@mldvietnam.vn` | Chuyên viên Lan Anh | `TECHNICIAN` | `GOLD` | Kỹ thuật viên làm dịch vụ |
| **0901000004** | `giangvien.ngocthao@mldvietnam.vn` | Master Trainer Thảo Ngọc | `INSTRUCTOR` | `PLATINUM` | Đào tạo Academy, điểm danh |
| **0987654321** | `khachhang.myduyen@gmail.com` | Nguyễn Mỹ Duyên | `CUSTOMER` | `GOLD` | Khách hàng đặt lịch, mua khóa học |

---

## 4. BỘ NGUYÊN TẮC THỐNG NHẤT CHO NHÂN SỰ MỚI (DEVELOPER ONBOARDING)

Để một lập trình viên khác (làm Admin Web, Backend NestJS, hay Mobile App) có thể tiếp nối dự án mà **không bị sai lệch API hay xung đột logic**:

1. **Tuân thủ quy ước đặt tên (Naming Case Conversion):**
   - **Database (PostgreSQL):** Bắt buộc `snake_case` (ví dụ: `membership_tier`, `reward_points`, `treatment_stage_id`).
   - **Backend API & Web/Mobile:** Bắt buộc `camelCase` (ví dụ: `membershipTier`, `rewardPoints`, `treatmentStageId`).
   - Tự động convert thông qua Interceptor/Serializer ở Backend, không được sửa tên cột database tùy tiện.
2. **Sử dụng Type dùng chung (`shared_types.ts`):**
   - Frontend Admin và Backend NestJS copy trực tiếp [`database/shared_types.ts`](./shared_types.ts) vào project để dùng chung Interface và Enum.
3. **Chuẩn hóa ApiResponse Envelope:**
   - Mọi API trả về định dạng: `{ success: boolean, data: T, message?: string, meta?: any, error?: any }`.
4. **Logic tài chính và điểm thưởng chạy Server-side:**
   - Cơ chế thăng hạng (`STANDARD` $\rightarrow$ `SILVER` $\rightarrow$ `GOLD` $\rightarrow$ `PLATINUM` $\rightarrow$ `DIAMOND`), tích điểm ($100.000\text{đ} = 10\text{ điểm}$) và trừ điểm được kích hoạt tự động qua Trigger `process_invoice_paid_complete` khi trạng thái hóa đơn đổi thành `PAID` hoặc `REFUNDED`.

Chi tiết toàn bộ quy tắc đọc tại: [`database/DEVELOPER_UNIFICATION_GUIDE.md`](./DEVELOPER_UNIFICATION_GUIDE.md).
