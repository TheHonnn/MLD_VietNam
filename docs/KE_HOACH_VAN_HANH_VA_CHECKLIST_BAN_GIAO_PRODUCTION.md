# BÁO CÁO VẬN HÀNH & CHECKLIST BÀN GIAO PRODUCTION - HỆ THỐNG MLD VIỆT NAM

**Phiên bản:** 1.0.0-PROD-AUDIT  
**Ngày thực hiện kiểm thử & đóng gói:** 02/11/2026  
**Đơn vị thực hiện:** Antigravity Senior Engineering Team  
**Mục tiêu:** Rà soát an ninh, đóng rắn hệ thống, sửa lỗi hợp đồng nghiệp vụ, chuẩn hóa cấu hình và bàn giao danh mục thao tác vận hành cho Chủ Dự Án.

---

## 1. KẾT LUẬN ĐÁNH GIÁ SẴN SÀNG VẬN HÀNH (READINESS VERDICT)

### 📌 Trạng thái: **SẴN SÀNG CÓ ĐIỀU KIỆN (CONDITIONALLY READY)**

| Tiêu chí | Trạng thái kỹ thuật | Ghi chú & Điều kiện kích hoạt |
| :--- | :---: | :--- |
| **Mã nguồn Backend NestJS** | ✅ SẴN SÀNG | 100% Build thành công (`nest build`), 30/30 unit tests PASS |
| **Mã nguồn Web Admin React** | ✅ SẴN SÀNG | 100% Build thành công (`vite build`), 8/8 tests PASS |
| **Khử rò rỉ bí mật (Secrets)** | ✅ SẴN SÀNG | Bộ quét `check_secrets.js` báo cáo 0 secret trong repo |
| **Bảo vệ tài liệu (Private Storage)** | ✅ SẴN SÀNG | Chuyển sang Signed URL có thời hạn, chặn truy cập trực tiếp |
| **Bảo vệ OTP & Email** | ✅ SẴN SÀNG | Loại bỏ OTP khỏi logger, bắt buộc TLS, xử lý lỗi fail-safe |
| **Thanh toán & Webhook** | ✅ SẴN SÀNG | Bổ sung xác thực token, kiểm tra số tiền, chống trùng (idempotency) |
| **Cron & Edge Functions** | ✅ SẴN SÀNG | Bổ sung `safeCompare`, yêu cầu `REMINDER_CRON_SECRET` |
| **Cấu hình bảng điều khiển nhà cung cấp** | ⏳ **ĐANG CHỜ** | **Chủ dự án cần xoay vòng mật khẩu và điền biến môi trường trên Render/Supabase** |

> **Lưu ý quan trọng:** Toàn bộ tầng mã nguồn, kiến trúc bảo mật và kiểm thử đã hoàn tất 100% trong working tree. Lý do trạng thái là **`SẴN SÀNG CÓ ĐIỀU KIỆN`** thay vì `SẴN SÀNG` hoàn toàn: Chủ dự án cần thực hiện các thao tác xoay vòng khóa bí mật (credential rotation) trên giao diện nhà cung cấp (Supabase Dashboard, Render Dashboard, PayOS, Google Mail) trước khi kích hoạt luồng thanh toán và dữ liệu thật của khách hàng.

---

## 2. BẰNG CHỨNG KIỂM THỬ & KIỂM SOÁT CHẤT LƯỢNG (TEST & AUDIT EVIDENCE)

### 2.1. Backend Test Suite (Vitest)
```text
✓ src/modules/auth/services/email.service.spec.ts (3 tests)
  - logs masked recipient without leaking raw OTP
  - returns false in production when all email transports fail
  - initializes with secure TLS verification enabled in production
✓ src/modules/appointments/appointments.service.spec.ts (2 tests)
✓ src/modules/payments/payments.service.spec.ts (5 tests)
  - rejects webhook when PayOS credentials are unconfigured
  - rejects bank webhook without valid secret header
  - marks invoice as PARTIAL when amount is less than total
  - ignores duplicate webhook when invoice is already PAID
  - successfully processes valid bank webhook with correct token
✓ src/app.controller.spec.ts (1 test)
✓ src/modules/admin/admin.service.spec.ts (19 tests)
  - loads all allowlisted resources against the canonical schema
  - creates real users with generated referral and hashed optional password
  - throws BadRequestException when mutating user_packages outside POS flow

Test Files:  5 passed (5)
Tests:       30 passed (30)
Duration:    11.18s
```

### 2.2. Web Admin Test Suite (Node Test Runner)
```text
✔ an RLS-filtered empty PATCH fails without writing a browser copy
✔ missing tables and denied writes do not fall back to local success
✔ missing or invalid keys cannot produce an unfiltered update
✔ role change is verified with an uncached GET before success
✔ a stale read, wrong identity or failed verification never claims success
✔ updates with multiple returned rows fail rather than accepting an arbitrary account
✔ Admin reports success only for persisted account updates
✔ customer form does not report success after a rejected database write

Tests:       8 passed (8)
Duration:    424ms
```

### 2.3. Production Build Compilation
- **Web Admin (`tsc && vite build`):** Biên dịch thành công trong 16.89s, 0 lỗi TypeScript, chia tách bundle tối ưu (gồm lazy chunks cho các module nặng như `xlsx`, `pdfExport`, `ResourcePage`).
- **Backend (`nest build`):** Biên dịch thành công 0 lỗi.
- **Git Diff & Whitespace Check (`git diff --check`):** Sạch hoàn toàn, không có lỗi định dạng hay trailing whitespace.
- **Secrets Audit Scanner (`node scripts/security/check_secrets.js`):** Quét toàn bộ repository, phát hiện 0 chuỗi nhạy cảm.

---

## 3. DANH MỤC THAY ĐỔI KỸ THUẬT ĐÃ THỰC HIỆN (CHANGELOG)

### 3.1. Sửa lỗi hợp đồng kiểm thử `admin.service.spec.ts`
- **Nguyên nhân:** Khi gọi `mutate('user_packages', actor, 'create', ...)` bằng tài khoản Admin ngoài luồng POS, code kiểm tra ràng buộc thiếu trường `expires_at` chạy trước khi chạm tới kiểm tra nghiệp vụ POS trong `beforeCommit`.
- **Khắc phục:** Đặt guard kiểm tra sớm tại dòng 427 của `backend/src/modules/admin/admin.service.ts`: ném `BadRequestException('Chỉ luồng POS mới được kích hoạt gói cho khách hàng.')`.

### 3.2. Loại bỏ hoàn toàn Service Role Key khỏi Frontend
- Quét và phát hiện 5 thành phần React cũ từng import hoặc khai báo trực tiếp `SUPABASE_SERVICE_ROLE_KEY` để gọi API upload Supabase Storage:
  1. `web-admin/src/admin/CourseCategoryFormEditor.tsx`
  2. `web-admin/src/admin/CourseEditorSheet.tsx`
  3. `web-admin/src/admin/InstructorFormEditor.tsx`
  4. `web-admin/src/admin/ResourcePage.tsx`
  5. `web-admin/src/pages/W02_Branches.tsx`
- **Giải pháp:** Chuyển đổi toàn bộ các vị trí trên sang cơ chế upload thông qua API backend có xác thực: `portalService.uploadFileToStorage(file, file.name)`.

### 3.3. Bảo mật lưu trữ tài liệu (Private Storage & Signed URLs)
- **Tệp sửa đổi:** `backend/src/modules/admin/admin.controller.ts`.
- **Cơ chế mới:**
  - Áp dụng kiểm tra MIME thực tế khớp với phần mở rộng file (chặn việc đổi đuôi file `.exe`/`.html` thành `.pdf` hoặc `.jpg`).
  - Bucket `documents` chuyển sang mô hình lưu trữ riêng tư (Private). Khi upload tài liệu chuyên môn/y bạ, hệ thống cấp phát **Signed URL** ngắn hạn (thời lượng 60 phút) thay vì Public URL vĩnh viễn.
  - Thêm endpoint bảo vệ `@Get('documents/signed-url')` yêu cầu JWT token hợp lệ và kiểm tra chống tấn công vượt đường dẫn (Path Traversal sanitization).

### 3.4. Đóng rắn OTP & Dịch vụ Email
- **Tệp sửa đổi:** `backend/src/modules/auth/services/email.service.ts`.
- **Cơ chế mới:**
  - Không bao giờ in mã OTP thô ra console/logger trên production. Thay thế bằng email đã ẩn danh (ví dụ: `f********@example.com`) kèm mã tương quan `CorrelationId`.
  - Thiết lập bắt buộc xác thực chứng chỉ TLS (`rejectUnauthorized: true`) đối với các kết nối SMTP trên môi trường production.
  - Xử lý fail-safe trong `dispatchHtmlEmail`: Nếu cả Resend API và SMTP đều thất bại trên production, trả về `false` dứt khoát; không tạo trạng thái gửi ảo.

### 3.5. Đóng rắn Thanh toán & Webhook Ngân hàng / PayOS
- **Tệp sửa đổi:** `backend/src/modules/payments/payments.service.ts`.
- **Cơ chế mới:**
  - Loại bỏ hoàn toàn thông tin tài khoản ngân hàng và khóa PayOS mặc định trong code.
  - Bổ sung xác thực tiêu đề bí mật (`BANK_WEBHOOK_SECRET`, `SEPAY_API_KEY`, `CASSO_SECURE_TOKEN`) cho các luồng webhook biến động số dư ngân hàng.
  - Cơ chế chống trùng (Idempotency): Kiểm tra trường `gateway_transaction_id` trên bảng `invoices`. Nếu hóa đơn đã ở trạng thái `PAID`, bỏ qua xử lý lặp lại nhằm ngăn chặn gian lận tích điểm/kích hoạt gói nhiều lần.
  - Xác thực số tiền: Nếu số tiền khách chuyển nhỏ hơn tổng hóa đơn, hệ thống cập nhật trạng thái `PARTIAL` thay vì đánh dấu hoàn tất.

### 3.6. Bảo vệ Edge Function `appointment-reminder`
- **Tệp sửa đổi:** `supabase/functions/appointment-reminder/index.ts`.
- **Cơ chế mới:**
  - Sử dụng hàm so sánh thời gian an toàn (`safeCompare`) để đối soát secret, ngăn ngừa timing attacks.
  - Các yêu cầu quét lịch hàng loạt (batch scan) bắt buộc phải có tiêu đề `x-reminder-cron-secret` hoặc `Authorization: Bearer <REMINDER_CRON_SECRET>`.
  - Các yêu cầu nhắc lịch đơn lẻ bắt buộc phải có JWT hợp lệ của chính khách hàng sở hữu lịch đặt hoặc nhân viên/quản trị viên.
  - Phân định rõ trạng thái push: Khi `FIREBASE_SERVER_KEY` chưa cấu hình, hàm ghi nhận lưu notification vào cơ sở dữ liệu nhưng trả về `success: false` cho push thay vì báo gửi thành công giả lập.

### 3.7. Chuẩn hóa 61 Script quản trị & Công cụ quét tự động
- Đã thay thế toàn bộ chuỗi kết nối PostgreSQL và Supabase Key trong các file script bằng biến môi trường `ADMIN_DATABASE_URL` hoặc `SUPABASE_SERVICE_ROLE_KEY`.
- Tạo công cụ quét bảo mật tự động `scripts/security/check_secrets.js` và tích hợp vào `package.json` với lệnh `npm run check:secrets`.

---

## 4. CHECKLIST THAO TÁC DÀNH CHO CHỦ DỰ ÁN (NGOÀI REPOSITORY)

Vì Antigravity không có quyền truy cập vào tài khoản nhà cung cấp, các bước sau đây bắt buộc **Chủ Dự Án** phải thực hiện trực tiếp trên bảng điều khiển (Dashboard) của từng dịch vụ:

### Bước 1: Xoay vòng khóa bí mật (Credential Rotation) 🚨 [ƯU TIÊN 1]
Do các khóa cũ từng xuất hiện trong lịch sử dev, cần tạo mới ngay lập tức:
1. **Supabase Database Password:**
   - Vào **Supabase Dashboard** -> Project `MLD_VietNam` -> **Project Settings** -> **Database**.
   - Bấm **Reset database password** -> Nhập mật khẩu ngẫu nhiên mới (tối thiểu 16 ký tự, gồm chữ hoa, thường, số, ký tự đặc biệt).
   - Lưu lại connection string dạng pooler (Port 6543) và direct (Port 5432).
2. **Supabase Service Role Key:**
   - Vào **Project Settings** -> **API** -> Bấm **Generate new API key** (Roll key) cho `service_role`.
3. **Google Mail App Password (SMTP):**
   - Vào tài khoản Google gửi mail của trung tâm -> **Bảo mật (Security)** -> **Mật khẩu ứng dụng (App Passwords)**.
   - Xóa mật khẩu ứng dụng cũ và tạo mật khẩu ứng dụng 16 chữ số mới dành riêng cho `MLD Backend Production`.
4. **PayOS API Keys:**
   - Truy cập **payos.vn** -> Kênh thanh toán MLD -> Tạo lại bộ ba khóa: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.

### Bước 2: Cấu hình biến môi trường trên Render Backend
Truy cập **Render.com** -> Dashboard -> Chọn Web Service của Backend (`mld-backend`) -> Tab **Environment**:
Điền đầy đủ các biến môi trường sau (tuyệt đối không để trống):

| Tên biến môi trường | Giá trị yêu cầu | Mục đích |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Kích hoạt chế độ sản xuất |
| `ADMIN_DATABASE_URL` | `postgresql://postgres.[ref]:[NEW_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require` | Kết nối pooler dành cho Admin service |
| `DATABASE_URL` | Giống `ADMIN_DATABASE_URL` | Kết nối cơ sở dữ liệu chung |
| `JWT_SECRET` | Chuỗi ký tự ngẫu nhiên (tối thiểu 64 ký tự) | Ký access token cho người dùng |
| `JWT_REFRESH_SECRET` | Chuỗi ký tự ngẫu nhiên khác (tối thiểu 64 ký tự) | Ký refresh token |
| `SUPABASE_URL` | `https://wstvwushpwcdsmhpunvh.supabase.co` | Endpoint Supabase |
| `SUPABASE_ANON_KEY` | Public anon key từ Supabase Dashboard | Khóa ẩn danh an toàn |
| `SUPABASE_SERVICE_ROLE_KEY` | Khóa `service_role` mới vừa xoay vòng | Khóa quản trị backend (không lộ ra ngoài) |
| `BANK_WEBHOOK_SECRET` | Chuỗi ký tự bảo mật ngẫu nhiên (tự đặt) | Xác thực webhook biến động số dư ngân hàng |
| `SMTP_HOST` | `smtp.gmail.com` | Máy chủ gửi thư |
| `SMTP_PORT` | `587` | Cổng SMTP |
| `SMTP_USER` | Email gửi thư chính thức của MLD | Tài khoản gửi thư |
| `SMTP_PASS` | Mật khẩu ứng dụng 16 ký tự của Google | Mật khẩu ứng dụng |
| `PAYOS_CLIENT_ID` | Lấy từ PayOS Dashboard | Tích hợp cổng VietQR |
| `PAYOS_API_KEY` | Lấy từ PayOS Dashboard | Tích hợp cổng VietQR |
| `PAYOS_CHECKSUM_KEY` | Lấy từ PayOS Dashboard | Kiểm tra toàn vẹn thanh toán |
| `CORS_ORIGIN` | `https://mldvietnam.vn,https://admin.mldvietnam.vn,https://mld-web-admin.vercel.app` | Khóa chặt domain được phép gọi API |

### Bước 3: Cấu hình Supabase Storage
1. Vào **Supabase Dashboard** -> **Storage**:
   - Kiểm tra bucket `documents`: Đảm bảo trạng thái là **Private** (Tắt tùy chọn "Public bucket").
   - Kiểm tra bucket `services`, `avatars`, `thumbnails`: Đảm bảo trạng thái là **Public** (cho phép hiển thị ảnh công khai).

### Bước 4: Thiết lập Cron Secret cho Edge Function
1. Vào **Supabase Dashboard** -> **Project Settings** -> **Edge Functions** (hoặc **Vault**):
   - Thêm secret `REMINDER_CRON_SECRET` với một giá trị ngẫu nhiên bí mật.
2. Thiết lập dịch vụ kích hoạt Cron định kỳ (ví dụ: pg_cron hoặc dịch vụ cron bên ngoài gọi vào Edge Function URL):
   - Header yêu cầu: `Authorization: Bearer <REMINDER_CRON_SECRET>`.

### Bước 5: Kiểm tra Migration Database
- File migration `database/migrations/020_secure_document_access_and_journal_sharing.sql` đã được commit vào git repo.
- **Lưu ý:** Migration 020 đã được chạy trên Supabase trước đó, **KHÔNG CẦN CHẠY LẠI**.

---

## 5. KỊCH BẢN KIỂM THỬ NGHIỆM THU NGƯỜI DÙNG (UAT ACCEPTANCE CRITERIA)

Dành cho bộ phận Vận hành và QA kiểm thử giao diện thực tế trước khi công bố:

### Kịch bản 1: Luồng Bán gói trị liệu tại quầy (Cashier POS)
- **Mục tiêu:** Xác nhận hợp đồng gói dịch vụ chỉ được tạo qua luồng POS.
- **Thực hiện:**
  1. Đăng nhập Web Admin với quyền Thu ngân / Lễ tân.
  2. Vào mục **Thu ngân POS** -> Chọn khách hàng -> Chọn gói trị liệu (ví dụ: Liệu trình 10 buổi).
  3. Chọn phương thức thanh toán: Tiền mặt hoặc Chuyển khoản QR.
  4. Bấm **Hoàn tất thanh toán & In hóa đơn**.
- **Tiêu chí Đạt:**
  - Hóa đơn chuyển trạng thái `PAID`.
  - Gói của khách hàng được tạo trong tab Khách hàng kèm thời hạn chính xác (mặc định 365 ngày).
  - Không xuất hiện lỗi `Chỉ luồng POS mới được kích hoạt gói cho khách hàng` trên giao diện POS.

### Kịch bản 2: Chia sẻ Nhật ký trị liệu công khai có thời hạn
- **Mục tiêu:** Khách hàng xem được nhật ký của mình mà không lộ dữ liệu khách hàng khác.
- **Thực hiện:**
  1. Vào chi tiết khách hàng -> Mục **Nhật ký trị liệu** -> Bấm biểu tượng **Chia sẻ**.
  2. Đặt thời hạn liên kết (ví dụ: 7 ngày) -> Bấm **Tạo liên kết chia sẻ**.
  3. Sao chép liên kết mở trên trình duyệt ẩn danh.
  4. Trở lại Web Admin -> Bấm **Thu hồi liên kết**.
- **Tiêu chí Đạt:**
  - Khi mở bằng liên kết hợp lệ: Xem được đầy đủ ảnh trước/sau và ghi chú trị liệu của buổi đó.
  - Sau khi bấm thu hồi: Mở lại liên kết ẩn danh báo lỗi `Liên kết không hợp lệ hoặc đã hết hạn`.

### Kịch bản 3: Tải lên và Truy cập Tài liệu Đào tạo / Y bạ
- **Mục tiêu:** File riêng tư không thể truy cập qua public URL cũ.
- **Thực hiện:**
  1. Vào mục Đào tạo hoặc Quản lý Khách hàng -> Tải lên một file PDF tài liệu.
  2. Sao chép URL hiển thị (định dạng signed URL có query string `?token=...`).
  3. Xóa tham số token khỏi URL rồi dán vào trình duyệt.
- **Tiêu chí Đạt:**
  - Trình duyệt báo `Access Denied` hoặc `Object not found` khi thiếu token.
  - File tải về hoàn toàn đầy đủ khi nhấp xem trực tiếp trong giao diện Web Admin.

### Kịch bản 4: Nhập đề thi Excel và Cấp chứng chỉ tự động
- **Mục tiêu:** Xác minh chức năng tải file Excel câu hỏi trắc nghiệm và xuất chứng chỉ PDF.
- **Thực hiện:**
  1. Vào mục **Khóa học & Giáo trình** -> Chọn chương học -> Bấm **Nhập đề thi từ Excel**.
  2. Tải file mẫu `.xlsx`, điền 5 câu hỏi và tải lên.
  3. Vào mục **Chứng chỉ** -> Bấm tạo chứng chỉ cho một học viên hoàn thành khóa học -> Xuất PDF.
- **Tiêu chí Đạt:**
  - Bộ câu hỏi được tạo lập tức trên hệ thống với đầy đủ đáp án A, B, C, D.
  - File PDF chứng chỉ được kết xuất với đúng họ tên, mã chứng chỉ và ngày cấp.

---

## 6. QUY TRÌNH GIÁM SÁT & ỨNG PHÓ SỰ CỐ (SRE PLAYBOOK)

1. **Giám sát Downtime & Tự khởi động lại:**
   - Dịch vụ trên Render được cấu hình Health Check tại endpoint `/api/v1/health`.
   - Nếu instance gặp sự cố bộ nhớ hoặc crash, Render tự động khởi tạo lại instance mới.
   - *Khuyến cáo:* Với gói Render Starter/Standard không sleep, API luôn sẵn sàng 24/7 dưới 150ms. Nếu sử dụng gói Free, instance sẽ ngủ sau 15 phút không có request, gây trễ 30 - 50 giây ở lượt gọi đầu tiên.
2. **Quy trình Khôi phục Cơ sở Dữ liệu (Disaster Recovery):**
   - Supabase tự động sao lưu Point-in-time Recovery (PITR) hàng ngày.
   - Nếu xảy ra sự cố dữ liệu do thao tác nhầm, quản trị viên vào Supabase Dashboard -> **Database** -> **Backups** để phục hồi về thời điểm mong muốn.
3. **Quy trình Thu hồi Quyền Khẩn cấp:**
   - Trong trường hợp nhân viên nghỉ việc hoặc nghi ngờ lộ tài khoản: Quản trị viên vào Web Admin -> **Quản lý Nhân sự** -> Bật tắt trạng thái `Khóa tài khoản` (Active = false). Toàn bộ token phiên làm việc sẽ bị từ chối truy cập ngay lập tức.
