# Checklist Triển Khai, Kiểm Thử Và Quay Lui Staging (Admin MLD Việt Nam)
*Ngày lập: 09/11/2026*  
*Môi trường mục tiêu: Staging (`staging.mld.vn` / `mld-staging.vercel.app`)*  
*Mã nguồn cơ sở: Worktree `admin-reliability` (bao gồm Migration 028, Backend POS transaction, RLS/RPC access hardening)*

---

> [!WARNING]
> **Quy tắc an toàn tuyệt đối:**
> 1. Không coi kết quả kiểm thử local là xác nhận đạt production.
> 2. Mọi thông tin nhạy cảm (Database Password, Supabase Service Role Key, JWT Secret) từng xuất hiện trong lịch sử git/commit/file cũ **phải được xoay vòng ngay lập tức** trên Staging và Production.
> 3. Tuyệt đối không in hoặc lưu trữ giá trị bí mật vào log, console, diff hoặc tài liệu bàn giao.
> 4. Phải sao lưu (backup) cơ sở dữ liệu staging trước khi áp dụng bất kỳ migration nào.

---

## I. Kế hoạch Xoay Vòng Thông Tin Nhạy Cảm (Secret Rotation)

Trước khi kích hoạt hệ thống trên Staging hoặc Production, bắt buộc thực hiện xoay vòng toàn bộ các credential sau:

| Thành phần | Khóa / Biến môi trường | Nơi lưu trữ an toàn | Hành động bắt buộc |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database** | `DATABASE_URL` | Cloud Secret Manager / Doppler | Đổi mật khẩu tài khoản DB; tạo role ứng dụng riêng biệt có quyền tối thiểu, không dùng role superuser cho backend API. |
| **Supabase Admin** | `SUPABASE_SERVICE_ROLE_KEY` | Backend Environment (.env trên server) | Xoay vòng Service Role Key trong Supabase Dashboard; không để lộ ra web-admin client. |
| **JWT Authentication** | `JWT_SECRET` | Backend Secret Manager | Sinh mới chuỗi ngẫu nhiên tối thiểu 64 bytes (256-bit entropy). Buộc tất cả phiên đăng nhập cũ phải xác thực lại. |
| **Cổng thanh toán PayOS** | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Backend Secrets | Kiểm tra và tái cấu hình webhook secret trên PayOS dashboard. |
| **Email Relay & SMS** | `BREVO_API_KEY`, `SMS_API_KEY` | Backend Secrets | Cấp lại token API nhà cung cấp gửi tin. |

---

## II. Quy Trình Triển Khai Trên Staging (Pre-Deployment & Deployment)

### Bước 1: Sao lưu toàn diện Cơ sở dữ liệu Staging (Snapshot Backup)
Thực hiện sao lưu logic và snapshot vật lý:
```bash
# Lệnh sao lưu dump dữ liệu staging (thay thế host/user bằng biến staging)
pg_dump -h $STAGING_DB_HOST -U $STAGING_DB_USER -d $STAGING_DB_NAME -F c -b -v -f "./backups/staging_pre_028_$(date +%Y%m%d_%H%M%S).dump"
```
*Tiêu chí hoàn thành:* Tệp backup được tạo thành công, dung lượng khớp và có thể kiểm tra giải nén (`pg_restore -l`).

### Bước 2: Kiểm tra Schema & Trạng thái hiện tại
1. Kết nối tới DB staging và kiểm tra version migration hiện hữu.
2. Đảm bảo bảng `cashier_shifts`, `invoices`, `tuition_transactions`, `admin_payment_requests` đã sẵn sàng các cột theo `ADMIN_SCHEMA_REQUIREMENTS`.

### Bước 3: Áp dụng Migration 028 (`028_admin_access_hardening.sql`)
Chạy file script migration:
```bash
psql -h $STAGING_DB_HOST -U $STAGING_DB_USER -d $STAGING_DB_NAME -f "database/migrations/028_admin_access_hardening.sql"
```
*Mục tiêu chính sách bảo mật được thiết lập:*
- Thu hồi quyền `INSERT, UPDATE, DELETE` trên `invoices`, `invoice_items`, `tuition_transactions` đối với role `authenticated`.
- Tạo các hàm kiểm quyền chi nhánh: `admin_can_access_branch(uuid)`, `admin_can_access_journal(uuid,uuid)`, `admin_can_collect_finance(uuid)`.
- Thiết lập 11 RLS policies bảo vệ bảng doanh thu, tiêu hao, vai trò và nhật ký trị liệu.

### Bước 4: Kiểm tra xác nhận tự động (Post-migration Verification)
Chạy script kiểm tra schema và chính sách từ backend staging:
```bash
npm run schema:check
```
*Kết quả yêu cầu:* `ready: true`, danh sách `missing: []`.

### Bước 5: Triển khai Backend Staging
1. Cập nhật biến môi trường đã xoay vòng vào staging container / Cloud Run / VPS.
2. Khởi động backend API.
3. Kiểm tra endpoint Health & Schema:
   - `GET /api/health` -> HTTP 200 `{ "status": "ok" }`
   - `GET /api/admin/schema/status` -> HTTP 200 `{ "ready": true, "missing": [] }`

### Bước 6: Triển khai Web Admin Staging
1. Cập nhật biến môi trường `VITE_API_BASE_URL` và `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. Build và publish lên staging hosting (Vercel Staging / Cloudflare Pages).
3. Xác minh tải trang và đăng nhập bằng tài khoản thử nghiệm.

---

## III. Ma Trận Kiểm Thử Phân Quyền & Vận Hành Trên Staging (Manual Role Matrix)

Kiểm thử bằng các tài khoản thật đại diện cho từng vai trò trên môi trường staging:

| Vai trò kiểm thử | Tài khoản / Phạm vi | Kịch bản kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- |
| **Role 1: SUPER_ADMIN** | Toàn quyền hệ thống | 1. Xem danh sách chi nhánh, nhân sự toàn hệ thống.<br>2. Xem báo cáo tài chính tổng hợp.<br>3. Truy cập tài liệu và cấp quyền tài liệu. | Truy cập thành công tất cả phân hệ, không bị chặn bởi bộ lọc chi nhánh. |
| **Role 2: CASHIER (Thu ngân)** | Chi nhánh A | 1. **Mở ca thu ngân:** Khai báo số tiền mặt đầu ca.<br>2. **Thu tiền lịch hẹn POS:** Thực hiện thu tiền mặt hoặc chuyển khoản; kiểm tra số dư ca tăng đúng.<br>3. **Thu học phí qua POS:** Ghi nhận học phí học viên khóa học thuộc chi nhánh A.<br>4. **Chống ghi trùng:** Bấm thanh toán 2 lần liên tiếp -> request thứ hai trả về kết quả đã ghi nhận trước đó (Idempotency).<br>5. **Thử ghi lậu:** Mở DevTools Console, gửi POST trực tiếp tới Supabase REST `tuition_transactions` hoặc `invoices`. | 1. Ca mở thành công, hiển thị trạng thái OPEN.<br>2. Hóa đơn và giao dịch cập nhật PAID, gắn đúng `shift_id`.<br>3. Học phí ghi nhận vào sổ giao dịch, hoa hồng tư vấn (nếu có) được tạo tự động.<br>4. Không phát sinh 2 khoản thu trùng lặp.<br>5. **PHẢI BỊ TỪ CHỐI** (403 Forbidden / RLS violation). |
| **Role 3: TECHNICIAN (KTV)** | KTV tại Chi nhánh A | 1. **Ghi nhật ký điều trị:** Tạo nhật ký lâm sàng cho lịch hẹn tại Chi nhánh A.<br>2. **Xem nhật ký chi nhánh B:** Thử truy cập nhật ký hoặc khách hàng chỉ có lịch ở chi nhánh B.<br>3. **Gửi hướng dẫn chăm sóc tại nhà:** Gửi hướng dẫn trong modal `W04_CustomerDetail`. | 1. Ghi nhật ký thành công, hình ảnh lưu hợp lệ.<br>2. Bị chặn truy cập (không thấy dữ liệu hoặc 403).<br>3. Bắt buộc phải chọn lịch hẹn thuộc chi nhánh A. Nếu không chọn lịch hẹn -> nút gửi bị vô hiệu hóa và cảnh báo lỗi. |
| **Role 4: INSTRUCTOR (Giảng viên / Trợ giảng)** | Lớp học Chi nhánh A | 1. Xem danh sách học viên lớp học phụ trách.<br>2. Trợ giảng thực hiện điểm danh hoặc nhập điểm theo quyền được phân công (`can_mark_attendance`, `can_enter_grades`).<br>3. Tải tài liệu giáo trình PDF từ hệ thống (`documents/signed-url`). | 1. Hiển thị đúng danh sách.<br>2. Chỉ thao tác được các hành động có cờ cho phép.<br>3. Tạo được signed URL hợp lệ trong thời hạn 3600s. |
| **Role 5: CUSTOMER (Khách hàng / Học viên)** | Ứng dụng di động / Portal khách | 1. Đăng nhập và xem thông tin cá nhân.<br>2. Xem lịch hẹn và nhật ký điều trị của chính mình.<br>3. Thử đọc thông tin khách hàng khác qua API Supabase. | 1. Đọc đúng dữ liệu cá nhân.<br>2. RLS `Customer reads own treatment journal` cho phép đọc.<br>3. Dữ liệu khách hàng khác trả về rỗng (0 dòng). |

---

## IV. Kịch Bản & Quy Trình Quay Lui Khẩn Cấp (Rollback Plan)

### 1. Điều kiện kích hoạt Quay lui (Rollback Triggers)
Kích hoạt quay lui ngay lập tức nếu phát hiện một trong các tình huống sau trên Staging:
- Phát hiện lỗi nghiêm trọng (Fatal Exception) khiến hệ thống POS không thể thu tiền hoặc không thể mở/chốt ca.
- Dữ liệu tài chính bị sai lệch không thể đối soát giữa sổ giao dịch và ca thu ngân.
- Migration 028 gây lỗi deadlock hoặc chặn nhầm các thao tác hợp lệ của khách hàng trên mobile app mà không thể khắc phục nhanh.

### 2. Các bước tiến hành Quay lui (Step-by-step Rollback)

#### Bước 2.1: Rollback Ứng dụng (Web Admin & Backend)
1. Trên nền tảng Hosting (Vercel / Cloud Run / Docker):
   - Chuyển `Deployment target` về phiên bản build ổn định trước đó (Instant Rollback).
   - Kiểm tra log container đảm bảo phiên bản cũ đã phục vụ lưu lượng.

#### Bước 2.2: Rollback Cơ sở dữ liệu (Nếu cần thiết)
- **Trường hợp A: Chỉ cần gỡ bỏ các ràng buộc/hàm mới của Migration 028:**
  Chạy lệnh thu hồi các policy và cấp lại quyền tạm thời:
  ```sql
  BEGIN;
  DROP POLICY IF EXISTS "No direct tuition writes" ON public.tuition_transactions;
  DROP POLICY IF EXISTS "No direct invoice updates" ON public.invoices;
  DROP POLICY IF EXISTS "No direct invoice item updates" ON public.invoice_items;
  -- Khôi phục grant tạm thời nếu hệ thống cũ phụ thuộc vào REST trực tiếp
  GRANT INSERT, UPDATE ON public.tuition_transactions TO authenticated;
  GRANT INSERT, UPDATE ON public.invoices TO authenticated;
  GRANT INSERT, UPDATE ON public.invoice_items TO authenticated;
  COMMIT;
  ```
- **Trường hợp B: Cần khôi phục nguyên trạng snapshot trước triển khai:**
  ```bash
  pg_restore -h $STAGING_DB_HOST -U $STAGING_DB_USER -d $STAGING_DB_NAME --clean --if-exists -v "./backups/staging_pre_028_YYYYMMDD_HHMMSS.dump"
  ```

#### Bước 2.3: Kiểm tra sau khi quay lui (Post-Rollback Health Check)
1. Đăng nhập quản trị viên kiểm tra xem các chức năng cũ đã hoạt động bình thường chưa.
2. Kiểm tra tính toàn vẹn của dữ liệu thu ngân và lịch hẹn.
3. Ghi chép nhật ký sự cố, nguyên nhân và bài học kinh nghiệm trước khi lên kế hoạch triển khai lại.

---

*Tài liệu này được lưu trữ tại `docs/STAGING_DEPLOYMENT_AND_ROLLBACK_CHECKLIST_2026-11-09.md` trong kho mã nguồn.*

