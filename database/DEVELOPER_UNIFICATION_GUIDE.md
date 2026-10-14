# CẨM NANG THỐNG NHẤT TOÀN DIỆN DỰ ÁN (DEVELOPER UNIFICATION & HANDOVER GUIDE)
## DỰ ÁN: MLD VIỆT NAM — HỆ SINH THÁI Y TẾ, DƯỠNG SINH SPA & HỌC VIỆN ĐÀO TẠO NGHỀ
**Mục tiêu:** Đảm bảo lập trình viên tiếp quản hoặc xây dựng Web Admin / Backend **hoàn hảo 100%, không xảy ra bất kỳ lỗi lệch trường, lệch API, hay xung đột logic**.  
**Phiên bản:** 4.0.0 Production Enterprise Standard  
**Ngày phát hành:** 14/10/2026  

---

## 1. NGUYÊN TẮC CỐT LÕI: SINGLE SOURCE OF TRUTH (NGUỒN CHÂN LÝ DUY NHẤT)

Mọi xung đột giữa các đội ngũ phát triển (Frontend Admin vs. Backend vs. Mobile) thường bắt nguồn từ 3 sai lầm:
1. Mỗi người tự nghĩ ra tên trường (Dev A viết `booking_code`, Dev B viết `bookingCode`, Dev C viết `code`).
2. Giá trị trạng thái viết hoa/thường tùy tiện (Backend trả `'CONFIRMED'`, Frontend check `'confirmed'`).
3. Logic tính toán phân tán (Frontend tự trừ điểm, tự nâng hạng thay vì do Backend/CSDL quyết định).

Để giải quyết triệt để, dự án thiết lập **Hệ thống phân cấp chân lý (Truth Hierarchy)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│             NGUỒN CHÂN LÝ DUY NHẤT (SINGLE SOURCE OF TRUTH)            │
│               checkdata/FULL_DATABASE_STRUCTURE.sql                    │
│                                  │                                     │
│                Tự động sinh ra / Tham chiếu 1:1                        │
│                                  ▼                                     │
│                 checkdata/shared_types.ts (TypeScript)                 │
├──────────────────────────────────┬─────────────────────────────────────┤
│                 │                │                  │                  │
│                 ▼                ▼                  ▼                  ▼
│           [BACKEND API]     [WEB ADMIN]       [MOBILE APP]     [DB MIGRATIONS]
│          NestJS DTO/Entity  React/Vite TS     Flutter / Bloc     PostgreSQL
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 6 QUY TẮC BẮT BUỘC ĐỂ KHÔNG BAO GIỜ LỆCH DỮ LIỆU

### QUY TẮC 1: CẤM TỰ GÕ TAY INTERFACE / DTO
* Mọi lập trình viên Frontend Admin hoặc Backend **tuyệt đối không tự viết tay** các Interface hay Enum.
* Hãy copy hoặc import trực tiếp từ file:  
  👉 [`checkdata/shared_types.ts`](file:///d:/VN_Champion/MLD_VietNam/checkdata/shared_types.ts)
* Trong file này đã định nghĩa sẵn **21 Enum chuẩn hóa** và **toàn bộ Interface (User, Booking, Service, Invoice, StaffProfile...)**. Bất kỳ ai gõ sai tên trường (ví dụ gõ `booking_id` thay vì `bookingId`), TypeScript IDE sẽ báo lỗi đỏ ngay lập tức trước khi build!

### QUY TẮC 2: QUY ƯỚC ĐẶT TÊN 3 TẦNG (CASE CONVERSION PIPELINE)
* **Tầng CSDL (PostgreSQL):** 100% dùng **`snake_case`** (ví dụ: `booking_code`, `checked_in_at`, `assigned_room_id`).
* **Tầng Code & API JSON (TypeScript / NestJS / React / Flutter):** 100% dùng **`camelCase`** (ví dụ: `bookingCode`, `checkedInAt`, `assignedRoomId`).
* **Tầng Trạng thái (Enums):** 100% dùng **`UPPERCASE_SNAKE_CASE`** (ví dụ: `'CHECKED_IN'`, `'IN_SERVICE'`, `'PAID'`, `'MOMO'`).
* **Cơ chế tự động tại Backend:** Backend NestJS sử dụng `TransformInterceptor` tự động chuyển `snake_case` từ DB sang `camelCase` khi trả về JSON cho client, và DTO tự động map ngược lại khi nhận request.

### QUY TẮC 3: CHUẨN ĐÓNG GÓI API RESPONSE (STANDARD ENVELOPE)
Mọi API do Backend cung cấp cho Admin và Mobile **bắt buộc phải bọc trong chuẩn ApiResponse<T>** định nghĩa tại [`shared_types.ts`](file:///d:/VN_Champion/MLD_VietNam/checkdata/shared_types.ts):

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thao tác thành công",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 128,
    "totalPages": 13
  }
}
```
* **Lợi ích:** Frontend Admin chỉ cần viết đúng 1 interceptor Axios / React Query duy nhất để xử lý thông báo thành công hoặc bắt lỗi toàn cục.

### QUY TẮC 4: LOGIC TÍNH TIỀN, ĐIỂM VÀ THĂNG HẠNG CHỈ NẰM Ở SERVER
* **Không tính tiền ở Client:** Web Admin hoặc Mobile **tuyệt đối không tự tính `finalPrice = basePrice - discount`** rồi gửi kết quả lên. Client chỉ gửi `serviceIds`, `couponCode`, `pointsToUse`. Backend sẽ tự query CSDL và tính toán ra con số chính xác.
* **Thăng hạng hội viên:** Do Trigger CSDL `process_invoice_paid_complete` tự động xử lý khi hóa đơn chuyển sang `PAID`. Admin không cần viết code cập nhật hạng thủ công.

### QUY TẮC 5: MÔ HÌNH VÒNG ĐỜI TRẠNG THÁI KHÔNG THỂ BỎ BƯỚC (STATE MACHINE)
Trạng thái lịch hẹn trong bảng `bookings` tuân theo vòng đời nghiêm ngặt:
```
[PENDING] (Chờ xác nhận)
   │
   ▼
[CONFIRMED] (Đã xếp lịch/giữ chỗ)
   │
   ▼ (Quét QR tại quầy tiếp đón W07)
[CHECKED_IN] (Ghi nhận checkedInAt, checkedInById, xếp assignedRoomId, assignedBedNumber)
   │
   ▼ (Khách vào phòng làm liệu trình)
[IN_SERVICE] (Ghi nhận serviceStartedAt)
   │
   ▼ (Làm xong ra quầy thanh toán)
[COMPLETED] (Ghi nhận checkedOutAt, checkedOutById, actualDurationMinutes)
```
* Trạng thái hủy: `CANCELLED` chỉ được phép chuyển từ `PENDING` hoặc `CONFIRMED`. Nếu đã `IN_SERVICE` thì không được hủy mà phải xử lý qua luồng hoàn tiền (`REFUNDED`).

### QUY TẮC 6: QUY TRÌNH THAY ĐỔI CSDL (MIGRATION DISCIPLINE)
* Tuyệt đối không ai được tự ý mở pgAdmin hay DBeaver sửa trực tiếp trên database đang chạy.
* Mọi thay đổi bảng/cột mới phải tạo file migration tiếp theo (ví dụ: `005_feature_name.sql`) trong thư mục `database/migrations/`, đồng thời cập nhật file [`checkdata/FULL_DATABASE_STRUCTURE.sql`](file:///d:/VN_Champion/MLD_VietNam/checkdata/FULL_DATABASE_STRUCTURE.sql) và [`checkdata/shared_types.ts`](file:///d:/VN_Champion/MLD_VietNam/checkdata/shared_types.ts).

---

## 3. CHECKLIST 4 BƯỚC BÀN GIAO CHO LẬP TRÌNH VIÊN ADMIN MỚI

Khi một lập trình viên mới bắt đầu xây dựng **Web Admin** (hoặc tiếp tục hoàn thiện dự án), hãy gửi cho họ 4 bước đơn giản sau:

### Bước 1: Khởi tạo CSDL
* Chạy file script: [`checkdata/FULL_DATABASE_STRUCTURE.sql`](file:///d:/VN_Champion/MLD_VietNam/checkdata/FULL_DATABASE_STRUCTURE.sql) trên PostgreSQL / Supabase để có đầy đủ 53 bảng, 21 Enums, các Trigger tự động và dữ liệu Seed mẫu.

### Bước 2: Import Type Definition vào Web Admin
* Copy file [`checkdata/shared_types.ts`](file:///d:/VN_Champion/MLD_VietNam/checkdata/shared_types.ts) đặt vào thư mục `admin/src/types/` hoặc `backend/src/common/types/`.
* Mọi component React/Vue chỉ việc import:
  ```typescript
  import { Booking, BookingStatus, UserRole, ApiResponse } from '@/types/shared_types';
  ```

### Bước 3: Tra cứu nghiệp vụ và Payload mẫu
* Đọc tài liệu [`checkdata/DATABASE_SCHEMA_SPECIFICATION.md`](file:///d:/VN_Champion/MLD_VietNam/checkdata/DATABASE_SCHEMA_SPECIFICATION.md) tại **Mục 1 (Ma trận 12 CRUD Admin)** và **Mục 5 (Chuẩn hóa Payload API)** để biết chính xác từng endpoint cần truyền lên body JSON như thế nào.

### Bước 4: Kiểm tra và đánh giá
* Tham chiếu file [`checkdata/DATABASE_SELF_EVALUATION_REPORT.md`](file:///d:/VN_Champion/MLD_VietNam/checkdata/DATABASE_SELF_EVALUATION_REPORT.md) để nắm rõ các bài toán bẫy concurrency, cơ chế hoàn tiền và an ninh y tế.
