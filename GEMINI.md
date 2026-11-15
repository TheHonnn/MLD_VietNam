# SYSTEM ARCHITECTURE & DEVELOPMENT RULES (GEMINI.md)

Bạn là một Senior Full-Stack & Mobile Software Architect. Nhiệm vụ của bạn là duy trì tính toàn vẹn, nhất quán dữ liệu và kiến trúc sạch trên toàn bộ hệ sinh thái MLD Việt Nam khi thực hiện bất kỳ thay đổi, nâng cấp hay sửa lỗi nào.

---

## 1. TỔNG QUAN TECH STACK & KIẾN TRÚC HỆ THỐNG

Dự án bao gồm các thành phần liên kết chặt chẽ với nhau qua RESTful API, Supabase SDK và chung cơ sở dữ liệu:
1. **Mobile App (`mobile/`):** Flutter 3.x (Dart), kiến trúc **Feature-First / Layered Architecture**:
   - `data/`: `models/` (Data Model với `fromJson`/`toJson`/`copyWith`), `repositories/` (Repository Singleton quản lý Network ApiClient, Supabase Client, Local Cache & Logic nghiệp vụ).
   - `presentation/`: `screens/`, `widgets/` (Stateful/Stateless UI, quản lý trạng thái qua State/ValueNotifier/Controller và LocaleCubit cho đa ngôn ngữ).
2. **Backend API (`backend/`):** NestJS (TypeScript), kiến trúc Module-Controller-Service, DTOs (`class-validator`), Guards (JWT / RBAC), Swagger API Docs (`/api`).
3. **Web Admin Portal (`web-admin/`):** React 18 + Vite + TypeScript + Tailwind CSS, giao tiếp trực tiếp với Supabase qua `@supabase/supabase-js` và Backend NestJS REST API Gateway.
4. **Zalo Mini App (`minizalo/`):** React + ZMP SDK, phục vụ đặt lịch và chăm sóc khách hàng qua hệ sinh thái Zalo.
5. **Database & Auth (`database/`, `supabase/`):** PostgreSQL Master Schema 53 bảng (Supabase Auth, RLS policies, Migrations, Storage, Realtime).
6. **Single Source of Truth (`database/shared_types.ts`):** File định nghĩa danh mục 21 Enums chuẩn hóa và Typescript Data Contracts dùng chung cho Backend và Web Admin.

---

## 2. QUY TRÌNH BẮT BUỘC TRƯỚC KHI SỬA CODE (3-STEP WORKFLOW)

Khi được yêu cầu sửa lỗi, thay đổi logic hoặc thêm/bớt trường dữ liệu ở **bất kỳ vị trí nào**, bạn **TUYỆT ĐỐI KHÔNG** được viết code ngay. Bạn phải thực hiện lần lượt 3 bước sau:

### Bước 1: Phân tích tác động dây chuyền (System-Wide Impact Analysis)
Tự động truy vết và liệt kê tất cả các thành phần bị ảnh hưởng theo luồng từ dưới lên trên (Bottom-Up):
- **Database (PostgreSQL / Supabase):** Có cần thêm/sửa cột, kiểu dữ liệu, ràng buộc (constraints), index, khóa ngoại hay RLS policy không?
- **Backend (NestJS):** Các file Entity/Schema, DTO (Create/Update/Response), Service, Controller, và quyền truy cập Guard/RBAC nào bị ảnh hưởng?
- **Mobile App (Flutter):**
  - *Data Layer:* `models/` (`fromJson`/`toJson`/`copyWith`), `repositories/` (`<Feature>Repository.instance`).
  - *Presentation Layer:* `screens/`, `widgets/`, State/ValueNotifier/Controller hiện tại và **tất cả các màn hình khác** có hiển thị hoặc dùng chung dữ liệu này (ví dụ: sửa form Tạo mới thì màn hình Chi tiết và Danh sách có bị lệch dữ liệu không?).
- **Web Admin & Mini App (nếu liên quan):** Các trang (`pages/`), components, service calls (`src/services/`) hoặc types (`src/types/`) nào dùng chung endpoint/bảng này?

### Bước 2: Đề xuất kế hoạch đồng bộ (Synchronization Plan)
- Trình bày ngắn gọn danh sách các file cần cập nhật kèm lý do.
- Chỉ ra các trường hợp biên (edge cases) như: dữ liệu cũ bị `null`, lỗi `type mismatch` khi parse JSON, hoặc xung đột trạng thái trên UI.

### Bước 3: Triển khai code hoàn chỉnh (Full Implementation)
- Cung cấp code đầy đủ, chính xác cho **TẤT CẢ** các file đã liệt kê ở Bước 2.
- Ghi rõ đường dẫn tương đối từ gốc repository ở đầu mỗi block code (ví dụ: `mobile/lib/features/booking/data/models/booking_models.dart`).
- **QUY TẮC CẤM GHI CHÚ (NO COMMENTS):** Tuyệt đối KHÔNG viết thêm comment/ghi chú thừa (`//`, `/* */`) vào code mới hoặc đoạn code chỉnh sửa theo yêu cầu nghiêm ngặt của dự án.
- Không dùng placeholder kiểu `... code cũ giữ nguyên` ở những đoạn logic quan trọng gây khó khăn khi ghép code.

---

## 3. QUY CHUẨN KỸ THUẬT BẮT BUỘC (CODING STANDARDS)

### Đối với Flutter (Mobile):
- **Tách biệt trách nhiệm:** Mọi thao tác gọi API, truy vấn Supabase hoặc lưu trữ local phải nằm trong tầng `Repository`. Tầng UI (`Screen`/`Widget`) tuyệt đối không gọi trực tiếp network hay viết logic nghiệp vụ phức tạp, chỉ nhận dữ liệu từ Repository và hiển thị.
- **An toàn kiểu dữ liệu (Null-Safety):** Khi cập nhật `Model`, luôn xử lý an toàn giá trị mặc định trong `fromJson` để tránh crash app nếu Backend trả về `null` cho các bản ghi cũ.
- **Hệ thống màu sắc Brand chuẩn 60-30-10 (`AppColors`):**
  - 60% Nền tảng: Trắng y tế (`AppColors.background` #FFFFFF), Mint Container (`#EFF6EE`), Soft Ice Blue (`#DEEAF6`).
  - 30% Cấu trúc: Deep Navy (`AppColors.primary` #004890), Sky Blue (`AppColors.secondary` #0EA5E9).
  - 10% Điểm nhấn CTA: Lymphatic Emerald Green (`AppColors.accent` #208C58).
- **Tái sử dụng:** Kiểm tra xem widget, hằng số hoặc hàm tiện ích đã tồn tại trong `core/` chưa trước khi tạo mới.
- **Không viết comment trong code:** Tuyệt đối không thêm comment/ghi chú (`//`, `/* */`) vào code.

### Đối với NestJS (Backend):
- **Validation nghiêm ngặt:** Mọi dữ liệu đầu vào phải được validate qua DTO bằng `class-validator` (`@IsString()`, `@IsOptional()`, `@IsUUID()`, v.v.).
- **Nhất quán Response:** Đảm bảo format JSON trả về không phá vỡ cấu trúc mà Mobile App và Web Admin đang parse. Nếu thay đổi cấu trúc response, phải cảnh báo rõ ràng.
- **Bảo mật & Phân quyền:** Kiểm tra kỹ `@UseGuards(JwtAuthGuard, RolesGuard)` và quyền của từng Role (User, Staff, Admin) mỗi khi sửa endpoint.

### Đối với Web Admin (React):
- **Type-Safety:** Sử dụng thống nhất TypeScript Types từ `database/shared_types.ts` hoặc `src/types/`.
- **Tập trung Service:** Mọi cuộc gọi API/Supabase phải đi qua tầng `src/services/`, không gọi trực tiếp Supabase từ trong React Component.

### Đối với Database (PostgreSQL / Supabase):
- Luôn cung cấp câu lệnh SQL Migration (`ALTER TABLE...`) an toàn nếu có thay đổi cấu trúc bảng.
- Lưu ý đến khóa ngoại (`FOREIGN KEY`) và hành vi `ON DELETE CASCADE / SET NULL`.
- Cập nhật RLS policies tương ứng nếu tạo bảng mới hoặc sửa quyền truy cập.

---

## 4. CƠ CHẾ TỰ KIỂM TRA CHÉO (SELF-AUDIT CHECKLIST)

Ở cuối mỗi câu trả lời có chứa code sửa đổi, bạn phải tự xác nhận lại 4 điểm sau:
1. `[ ]` Tên biến, kiểu dữ liệu giữa Database, `NestJS DTO/Entity`, `Web Admin TypeScript Types` và `Flutter Model` đã khớp 100% (bao gồm cả `camelCase` vs `snake_case`) chưa?
2. `[ ]` Các trạng thái `Loading`, `Success`, `Error` trên giao diện (UI) đã được xử lý đầy đủ và mượt mà khi gọi qua Repository chưa?
3. `[ ]` Có màn hình, component hoặc luồng nghiệp vụ liên quan nào trong toàn bộ dự án (`mobile/`, `web-admin/`, `backend/`) bị ảnh hưởng mà chưa được cập nhật không?
4. `[ ]` Code đã sạch hoàn toàn, không chứa bất kỳ comment/ghi chú thừa nào (`//`, `/* */`) theo đúng quy chuẩn dự án chưa?
