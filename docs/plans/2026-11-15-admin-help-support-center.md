# Kế hoạch Thiết kế Phân hệ "Cần hỗ trợ?" (Admin Help & Support Center)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Xây dựng hoàn chỉnh trang "Cần hỗ trợ?" (`/help` & `/support`) trên Web-Admin thay thế cho popup thông báo tạm thời hiện tại, cung cấp kênh liên hệ khẩn cấp, tài liệu hướng dẫn vận hành SOP nội bộ, hệ thống gửi phiếu báo lỗi/sự cố (Internal Ticket), và công cụ chẩn đoán kết nối hệ thống theo thời gian thực.

**Architecture:** Kiến trúc 3 tầng chuẩn hóa: 
1. Database: Bảng `admin_support_tickets` và `admin_sop_guides` trên Supabase PostgreSQL với Row Level Security và Trigger tự động sinh mã phiếu `TK-YYYYMM-XXXX`.
2. Backend (NestJS): Submodule `backend/src/modules/admin/support/` cung cấp API bảo mật qua `AdminGuard`, xử lý ticket, quản lý tài liệu SOP và endpoint chẩn đoán `/diagnostics`.
3. Frontend (Web-Admin): Trang `web-admin/src/pages/W21_HelpSupport.tsx` xây dựng trên nền `AdminPageShell`, kết nối qua hook `useAdminSupport.ts`, tích hợp mượt mà vào thanh Sidebar và hệ thống định tuyến React Router v6.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, NestJS 10, PostgreSQL (Supabase), Node.js, Vitest/Node test runner.

---

## Danh mục Phân rã Công việc (Task Breakdown)

### Phase 1: Thiết kế Cơ sở dữ liệu (Database Schema & Migration)

#### Task 1: Tạo tệp Migration SQL `033_admin_internal_support.sql`
- **Mục tiêu:** Tạo bảng lưu trữ phiếu hỗ trợ nội bộ `admin_support_tickets` và cẩm nang hướng dẫn `admin_sop_guides`.
- **Tệp tạo mới:** `database/migrations/033_admin_internal_support.sql`
- **Nội dung chính:**
  - Bảng `admin_support_tickets`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `ticket_code VARCHAR(30) UNIQUE NOT NULL`
    - `requester_id UUID NOT NULL REFERENCES users(id)`
    - `branch_id UUID REFERENCES branches(id)`
    - `category VARCHAR(50) NOT NULL` (`SOFTWARE_BUG`, `HARDWARE_POS`, `DATA_ISSUE`, `FEATURE_REQUEST`, `ACCOUNT_ACCESS`, `OTHER`)
    - `priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
    - `title VARCHAR(255) NOT NULL`
    - `description TEXT NOT NULL`
    - `attachments JSONB DEFAULT '[]'::jsonb`
    - `environment_info JSONB DEFAULT '{}'::jsonb`
    - `status VARCHAR(30) NOT NULL DEFAULT 'OPEN'` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`)
    - `assigned_to UUID REFERENCES users(id)`
    - `admin_reply TEXT`
    - `resolved_at TIMESTAMPTZ`
    - `created_at TIMESTAMPTZ DEFAULT NOW()`
    - `updated_at TIMESTAMPTZ DEFAULT NOW()`
  - Sequence và Trigger tự động sinh `ticket_code` dạng `TK-YYYYMM-XXXX` (VD: `TK-202611-0001`).
  - Bảng `admin_sop_guides`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `module VARCHAR(50) NOT NULL` (`POS`, `BOOKING`, `TREATMENT`, `ACADEMY`, `FINANCE`, `SYSTEM`)
    - `title VARCHAR(255) NOT NULL`
    - `summary TEXT`
    - `content_markdown TEXT NOT NULL`
    - `video_url TEXT`
    - `display_order INT DEFAULT 0`
    - `is_published BOOLEAN DEFAULT TRUE`
    - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - Row Level Security (RLS) Policies:
    - `admin_sop_guides`: Authenticated users được phép `SELECT`.
    - `admin_support_tickets`: Users authenticated xem và tạo ticket của mình; Quản lý xem ticket thuộc chi nhánh mình; Super Admin có toàn quyền xem và cập nhật.
  - Seed Data: 5 tài liệu SOP ban đầu cho Thu ngân POS, Đặt lịch, Liệu trình MLD, Chấm công, Cài đặt hệ thống.

---

### Phase 2: Thiết kế Backend & API (NestJS)

#### Task 2: Tạo DTOs cho Support Module
- **Tệp tạo mới:**
  - `backend/src/modules/admin/support/dto/create-ticket.dto.ts`
  - `backend/src/modules/admin/support/dto/update-ticket.dto.ts`
  - `backend/src/modules/admin/support/dto/query-tickets.dto.ts`
- **Quy tắc kiểm tra (Validation):**
  - Sử dụng `class-validator` và `class-transformer`.
  - Kiểm tra `category`, `priority`, độ dài tối thiểu của `title` (>= 5 ký tự) và `description` (>= 10 ký tự).

#### Task 3: Xây dựng `SupportService` (`support.service.ts`)
- **Tệp tạo mới:** `backend/src/modules/admin/support/support.service.ts`
- **Các hàm nghiệp vụ:**
  1. `getDiagnostics()`:
     - Đo độ trễ query Postgres (ping latency ms).
     - Kiểm tra trạng thái kết nối Database, Uptime server, Bộ nhớ RAM (RSS, Heap).
     - Kiểm tra cấu hình Zalo Cloud ZNS (sẵn sàng hay chưa).
     - Trả về đối tượng trạng thái hệ thống chuẩn hóa.
  2. `getGuides(module?: string, search?: string)`:
     - Lấy danh sách tài liệu SOP từ bảng `admin_sop_guides`.
     - Hỗ trợ lọc theo `module` và tìm kiếm theo từ khóa trong `title`/`summary`.
  3. `getTickets(actor: any, query: QueryTicketsDto)`:
     - Phân quyền: Super Admin lấy toàn bộ, Branch Manager lấy theo chi nhánh, Nhân viên thông thường lấy ticket do chính mình tạo.
     - Phân trang, lọc theo `status`, `priority`, `category`.
  4. `createTicket(actor: any, dto: CreateTicketDto)`:
     - Lưu ticket vào `admin_support_tickets`.
     - Tự động gắn `requester_id`, `branch_id`, thông tin `environment_info`.
  5. `updateTicket(actor: any, id: string, dto: UpdateTicketDto)`:
     - Cho phép Admin/IT cập nhật trạng thái (`status`), phản hồi (`admin_reply`), gán kỹ thuật viên phụ trách (`assigned_to`).

#### Task 4: Xây dựng `SupportController` (`support.controller.ts`)
- **Tệp tạo mới:** `backend/src/modules/admin/support/support.controller.ts`
- **Bảo mật:** Gắn `@UseGuards(AdminGuard)` và `@UseFilters(AdminExceptionFilter)`.
- **API Endpoints:**
  - `GET /api/v1/admin/support/diagnostics`: Lấy trạng thái hệ thống và độ trễ mạng/DB.
  - `GET /api/v1/admin/support/guides`: Lấy danh sách tài liệu SOP.
  - `GET /api/v1/admin/support/tickets`: Lấy danh sách ticket.
  - `POST /api/v1/admin/support/tickets`: Tạo ticket mới.
  - `GET /api/v1/admin/support/tickets/:id`: Lấy chi tiết ticket.
  - `PATCH /api/v1/admin/support/tickets/:id`: Cập nhật trạng thái/phản hồi ticket.

#### Task 5: Đăng ký `SupportModule` vào `AdminModule`
- **Tệp sửa đổi:** `backend/src/modules/admin/admin.module.ts`
- **Hành động:** Khai báo `SupportController` và `SupportService` vào danh sách `controllers` và `providers` của `AdminModule`.

#### Task 6: Viết Unit Test cho `SupportService`
- **Tệp tạo mới:** `backend/src/modules/admin/support/support.service.spec.ts`
- **Kịch bản kiểm thử:**
  - Kiểm tra `getDiagnostics` trả về cấu trúc hợp lệ khi DB kết nối thành công.
  - Kiểm tra `createTicket` tạo đúng dữ liệu và gắn đúng actor id.
  - Kiểm tra phân quyền truy cập ticket (Super Admin vs Branch Staff).
  - Kiểm tra cập nhật trạng thái ticket.

---

### Phase 3: Thiết kế Frontend (Web-Admin)

#### Task 7: Xây dựng Custom Hook `useAdminSupport.ts`
- **Tệp tạo mới:** `web-admin/src/hooks/useAdminSupport.ts`
- **Chức năng:**
  - Quản lý trạng thái: `loading`, `error`, `diagnostics`, `guides`, `tickets`.
  - Hàm `fetchDiagnostics()`: Gọi API chẩn đoán và tính toán thời gian phản hồi.
  - Hàm `fetchGuides(module?, search?)`: Tải danh sách cẩm nang SOP.
  - Hàm `fetchTickets()`: Tải danh sách phiếu hỗ trợ của người dùng.
  - Hàm `submitTicket(payload)`: Gửi phiếu hỗ trợ kèm tự động bắt thông tin môi trường (`navigator.userAgent`, URL, screen resolution).
  - Hàm `pingAgain()`: Làm mới chẩn đoán kết nối.

#### Task 8: Xây dựng Trang `W21_HelpSupport.tsx`
- **Tệp tạo mới:** `web-admin/src/pages/W21_HelpSupport.tsx`
- **Cấu trúc Giao diện:**
  - Header: Sử dụng `AdminPageShell` và `PageHeader` với tiêu đề "Trung tâm Trợ giúp & Hỗ trợ Kỹ thuật", mô tả quy trình tiếp nhận sự cố.
  - Tabs Navigation (`PageTabs`):
    1. **Kênh Liên hệ Khẩn cấp (`contacts`)**:
       - Thẻ Hotline Tổng đài Kỹ thuật: `1900 8888` (08:00 - 22:00) kèm nút gọi/sao chép.
       - Thẻ Đường dây nóng Trực ca/Khẩn cấp: `0966 888 888` (Xử lý sự cố POS kẹt ca, nghẽn mạng).
       - Thẻ Kết nối Hỗ trợ từ xa: Hướng dẫn tải và sử dụng UltraViewer / AnyDesk, nút sao chép link tải chính thức.
       - Thẻ Zalo OA & Group Cơ sở: Mã QR quét Zalo OA trực tuyến và nhóm hỗ trợ kỹ thuật các chi nhánh.
       - Thẻ Email Hỗ trợ: `support@mldvietnam.vn` với cam kết SLA tiếp nhận.
    2. **Cẩm nang Vận hành SOP (`guides`)**:
       - Thanh tìm kiếm và bộ lọc theo phân hệ: *Tất cả*, *Thu ngân POS*, *Đặt lịch*, *Liệu trình*, *Học viện*, *Hệ thống*.
       - Danh sách bài viết SOP trực quan kèm tóm tắt và thời gian đọc.
       - Modal xem chi tiết tài liệu SOP với định dạng phong phú (Markdown), các bước thực hiện tuần tự, và nút mở nhanh phân hệ liên quan.
    3. **Phiếu Hỗ trợ & Báo lỗi (`tickets`)**:
       - Nút nổi bật "Gửi yêu cầu hỗ trợ mới" mở Modal Form:
         + Chọn phân loại (Lỗi phần mềm, Lỗi máy in bill POS, Lỗi dữ liệu/báo cáo, Yêu cầu cấp quyền, Đề xuất tính năng).
         + Chọn mức độ ưu tiên (Khẩn cấp, Cao, Trung bình, Thấp).
         + Tiêu đề & Nội dung mô tả chi tiết.
         + Khu vực đính kèm ảnh chụp màn hình (kéo thả ảnh hoặc dán từ clipboard `Ctrl+V`).
       - Bảng danh sách phiếu hỗ trợ: Mã phiếu, Tiêu đề, Phân loại, Mức độ ưu tiên (Badge màu), Trạng thái tiến độ, Phản hồi của Kỹ thuật viên, Ngày tạo.
    4. **Chẩn đoán Trạng thái Hệ thống (`diagnostics`)**:
       - Khung hiển thị trực tiếp (Live Status Dashboard):
         + Trạng thái Kết nối CSDL Supabase (Ping latency ms, biểu tượng xanh/vàng/đỏ).
         + Trạng thái Máy chủ Backend API NestJS (`200 OK`, thời gian phản hồi).
         + Trạng thái Cổng thông báo Zalo ZNS Gateway.
         + Trạng thái Mạng máy trạm người dùng.
       - Nút "Chẩn đoán lại kết nối" (Ping Live) kèm hiệu ứng quay loading.
       - Thẻ thông tin phiên bản hệ thống: Phiên bản Web-Admin v1.0, Môi trường máy chủ, Thời điểm triển khai.

#### Task 9: Cập nhật Điều hướng Sidebar (`Sidebar.tsx`)
- **Tệp sửa đổi:** `web-admin/src/components/layout/Sidebar.tsx`
- **Hành động:**
  - Thay thế nút `button` gọi popup toast tạm thời bằng thành phần `NavLink` trỏ tới `/help`.
  - Thêm hiệu ứng active state đồng bộ với nút "Cài đặt" (`#FAF0E4`, viền, chữ màu cam đậm `#985018`).

#### Task 10: Cập nhật Router chính (`App.tsx`)
- **Tệp sửa đổi:** `web-admin/src/App.tsx`
- **Hành động:**
  - Lazy load `W21_HelpSupport`.
  - Khai báo route `<Route path="help" element={<W21_HelpSupport />} />`.
  - Khai báo alias `<Route path="support" element={<Navigate to="/help" replace />} />`.

---

### Phase 4: Kiểm thử, Tối ưu & Bàn giao (Testing & QA)

#### Task 11: Viết bài kiểm thử tự động cho Frontend (`web-admin/test/`)
- **Tệp tạo mới:** `web-admin/test/admin-help-support-navigation.test.mjs`
- **Kịch bản kiểm tra:**
  - Kiểm tra `App.tsx` đã đăng ký đầy đủ route `/help` và `/support`.
  - Kiểm tra `Sidebar.tsx` đã trỏ đúng liên kết `NavLink to="/help"`.
  - Kiểm tra cấu trúc phân chia tab của `W21_HelpSupport.tsx`.

#### Task 12: Chạy kiểm thử hồi quy toàn bộ hệ thống
- Chạy `npm test` trên `web-admin` (đảm bảo 100% passed).
- Chạy `npm test` trên `backend` (đảm bảo không ảnh hưởng đến các service khác).
