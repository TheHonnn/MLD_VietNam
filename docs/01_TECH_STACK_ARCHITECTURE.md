# TÀI LIỆU KIẾN TRÚC & CÔNG NGHỆ HỆ THỐNG Y TẾ (HEALTHCARE SYSTEM)
**Dự án:** Medical - Healthcare Mobile App & Web Admin  
**Phiên bản:** 1.0.0  
**Tác giả:** Technical Lead / Solution Architect  
**Trạng thái:** Đã phê duyệt (Approved)

---

## 1. TỔNG QUAN HỆ THỐNG & ĐÁNH GIÁ KIẾN TRÚC

### 1.1. Bối cảnh dự án
Hệ thống là nền tảng y tế số (HealthTech) đa nền tảng gồm:
1. **Khách hàng / Bệnh nhân:** Ứng dụng di động trên iOS và Android phục vụ tìm kiếm bác sĩ, chuyên khoa, đặt lịch khám, quản lý hồ sơ sức khỏe và nhận thông báo.
2. **Nhà quản trị / Lễ tân / Bác sĩ:** Cổng quản trị web (Web Admin) để điều phối lịch hẹn, quản lý ca trực của bác sĩ, quản lý hồ sơ bệnh nhân, doanh thu và báo cáo.
3. **Hạ tầng Backend & Database:** Hệ thống API trung tâm xử lý logic nghiệp vụ, giao dịch thanh toán, chống trùng lịch khám, và bảo mật thông tin y tế.

### 1.2. Đánh giá đề xuất ban đầu (Flutter + Supabase + React)
- **Điểm mạnh:** 
  - Tốc độ phát triển ban đầu cực nhanh.
  - Supabase cung cấp sẵn Authentication, PostgreSQL, Storage và Row Level Security (RLS).
  - Flutter cho trải nghiệm UI đồng nhất, hiệu năng cao trên cả hai nền tảng di động.
- **Rủi ro kỹ thuật trong thực tế ngành Y tế:**
  - **Bài toán tranh chấp lịch (Race Condition / Overbooking):** Nếu 2 bệnh nhân cùng đặt 1 bác sĩ tại cùng 1 slot giờ, việc chỉ gọi trực tiếp Supabase qua RLS không đủ an toàn nếu thiếu Distributed Lock và Transaction chặt chẽ.
  - **Tích hợp bên thứ 3 phức tạp:** Cổng thanh toán (VNPay, MoMo), tổng đài SMS Brandname / Zalo ZNS, cổng bảo hiểm y tế nếu viết hoàn toàn bằng PostgreSQL Function / Deno Edge Function sẽ rất khó debug, test và scale.
  - **Quy định bảo mật y tế (EHR Audit Trail):** Dữ liệu bệnh án cần cơ chế lưu vết truy cập (ai đã xem, lúc nào, sửa gì) một cách minh bạch.

---

## 2. BẢN CHỐT STACK CÔNG NGHỆ CHUẨN PRODUCTION

```
                           ┌────────────────────────┐
                           │      Mobile App        │
                           │   Flutter 3.x (Bloc)   │
                           │     (iOS & Android)    │
                           └───────────┬────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌────────────────────────┐  REST API  ┌────────────────────────┐  Realtime/WSS  ┌────────────────────────┐
│       Web Admin        │───────────▶│   Backend API Gateway  │◀───────────────│    Notification Svcs   │
│ React + Vite + TS +    │            │     NestJS (Node.js)   │                │   (FCM, ZNS, SMS)      │
│ TanStack + Antd/Shadcn │            └───────────┬────────────┘                └────────────────────────┘
└────────────────────────┘                        │
                     ┌────────────────────────────┼────────────────────────────┐
                     ▼                            ▼                            ▼
         ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
         │      PostgreSQL       │    │     Redis Cluster     │    │   Supabase Storage    │
         │  (Supabase / RDS)     │    │  (Lock, Cache, Queue) │    │  (Private S3 Bucket)  │
         │  Data, RLS, Audit Log │    │  BullMQ Appointment   │    │  Đơn thuốc, Hồ sơ     │
         └───────────────────────┘    └───────────────────────┘    └───────────────────────┘
```

---

### 2.1. Mobile Application (iOS & Android)
* **Framework:** **Flutter 3.x (Dart 3)**
  * **Lý do:** Render engine Impeller mới nhất loại bỏ hiện tượng giật khung hình (shader jank), đảm bảo 60–120fps trên cả các dòng máy Android phân khúc bình dân.
* **Kiến trúc mã nguồn:** **Clean Architecture** (Data - Domain - Presentation).
* **State Management:** **`flutter_bloc`** kết hợp `freezed`
  * Lý do: Flow dữ liệu đơn hướng (Unidirectional Data Flow), dễ debug trạng thái đặt lịch (Initial -> Loading -> SlotHolding -> Success -> Failure), dễ viết Unit test cho logic khám.
* **Networking:** `dio` kết hợp `retrofit` + Interceptors (tự động gắn Bearer Token, bắt lỗi 401 tự động refresh token).
* **Local Storage & Bảo mật:**
  * `flutter_secure_storage`: Lưu Access/Refresh Token vào iOS Keychain và Android EncryptedSharedPreferences (Keystore).
  * `hive` / `isar`: Cache danh mục chuyên khoa, danh sách phòng khám để mở app tức thì (Offline-first cache).
* **Push Notification:** `firebase_messaging` (FCM) + `flutter_local_notifications` (hiển thị thông báo hẹn giờ offline).
* **Deep Linking:** Flutter Deep Linking (`app_links`) để mở thẳng trang chi tiết lịch hẹn từ SMS/Zalo.

---

### 2.2. Web Admin Portal
* **Core:** **React 18/19 + TypeScript + Vite**
  * **Lý do:** Đây là trang nội bộ cho lễ tân/bác sĩ, không cần SEO công khai. Vite cho tốc độ build dưới 5 giây, hot reload tức thì, nhẹ hơn và rẻ hơn Next.js khi deploy.
* **UI Component Library:** 
  * **Ant Design (antd v5)**: Lựa chọn tối ưu nhất cho Dashboard Y tế nhiều bảng biểu, bộ lọc nhiều tiêu chí (bác sĩ, ngày, trạng thái khám, khoa), date-picker dải thời gian, và in hóa đơn/phiếu khám trực tiếp.
  * *(Phương án thay thế nếu muốn đồng nhất UI Figma 100%): Tailwind CSS + Shadcn/ui + Lucide Icons.*
* **Data Fetching & Caching:** **TanStack Query (React Query v5)**
  * Quản lý cache server-side, tự động refetch định kỳ khi có bệnh nhân mới đặt lịch (Polling hoặc SSE).
* **Table & Form Handling:**
  * `TanStack Table v8`: Xử lý bảng hàng nghìn bệnh nhân mượt mà, hỗ trợ virtual scrolling.
  * `React Hook Form` + `Zod`: Validate form nhập hồ sơ bệnh án, thông tin thuốc chặt chẽ.
* **Role-Based Access Control (RBAC):** Phân quyền nghiêm ngặt: `SuperAdmin`, `ClinicManager`, `Doctor`, `Receptionist`.

---

### 2.3. Backend Core & API Gateway
* **Framework:** **NestJS (Node.js + TypeScript)**
  * **Lý do:** Kiến trúc Module hóa chuẩn Enterprise (tương tự Angular/Spring Boot), Dependency Injection mạnh mẽ, hỗ trợ DTO validation bằng `class-validator`. Chia sẻ Types/Interface TypeScript trực tiếp với Web Admin.
* **Cấu trúc Module dự kiến:**
  * `AuthModule`: Đăng ký, đăng nhập OTP, phân quyền RBAC.
  * `DoctorModule`: Quản lý danh mục bác sĩ, chuyên khoa, cấu hình khung giờ làm việc.
  * `AppointmentModule`: Xử lý đặt lịch, giữ slot khám, đổi lịch, hủy lịch.
  * `PatientRecordModule`: Quản lý hồ sơ bệnh án điện tử (EHR), tiền sử bệnh.
  * `PaymentModule`: Tích hợp VNPay, MoMo, ZaloPay (IPN webhook xử lý idempotent).
  * `NotificationModule`: Worker gửi FCM, Zalo ZNS, SMS Brandname.
* **Job Queue & Background Worker:** **BullMQ (Redis-based)**
  * Điều phối các tác vụ ngầm: Gửi thông báo nhắc lịch tự động trước 24h và 2h, quét hủy các slot giữ chỗ quá 10 phút chưa thanh toán.

---

### 2.4. Database & Storage
* **Primary Database:** **PostgreSQL 15+** (Triển khai trên Supabase Managed hoặc AWS RDS)
  * Sử dụng extension `uuid-ossp` cho ID định danh an toàn.
  * Sử dụng extension `pg_trgm` (Trigram) để hỗ trợ tìm kiếm full-text tiếng Việt không dấu (ví dụ: tìm "nhi khoa", "tai mui hong", tên bác sĩ).
  * Transaction Isolation Level: `READ COMMITTED` kết hợp `SELECT ... FOR UPDATE` khi lock slot khám.
* **In-Memory Cache & Lock:** **Redis 7.x**
  * Lưu trữ session/token blacklist.
  * **Redis Distributed Lock (Redlock)** để khóa slot khám trong thời gian thực, chống trùng lịch tuyệt đối.
  * Cache thông tin danh mục ít thay đổi (chuyên khoa, giá khám cơ bản) với TTL 1 giờ.
* **File Storage:** **Supabase Storage (hoặc AWS S3)**
  * **Public Bucket:** Ảnh đại diện bác sĩ, banner phòng khám, icon chuyên khoa.
  * **Private Bucket (Signed URL có thời hạn):** Ảnh đơn thuốc, kết quả xét nghiệm, file chẩn đoán hình ảnh (chỉ bệnh nhân sở hữu và bác sĩ phụ trách mới có quyền tải URL truy cập trong 15 phút).

---

## 3. KIẾN TRÚC BẢO MẬT & XỬ LÝ NGHIỆP VỤ Y TẾ SỐNG CÒN

### 3.1. Cơ chế chống Double-Booking (Trùng lịch khám)
```
[Bệnh nhân A] ──(1) Chọn Slot 09:00──▶ [Backend API]
                                            │
                                            ├─▶ (2) Redis SETNX "lock:doctor_123:slot_0900" EX 600
                                            │       ├──▶ Thành công: Khóa slot 10 phút, trả về trạng thái "HOLD"
                                            │       └──▶ Thất bại: Trả về lỗi "Slot vừa được người khác chọn"
                                            │
[Bệnh nhân A] ──(3) Xác nhận/Thanh toán ────▶ [Backend API]
                                            │
                                            └─▶ (4) DB Transaction:
                                                    - INSERT INTO appointments (status='CONFIRMED')
                                                    - UPDATE doctor_slots SET is_booked=TRUE
                                                    - Redis DEL "lock:..."
```

### 3.2. Bảo mật hồ sơ bệnh án (Medical Audit Trail)
* Mọi hành vi đọc hoặc ghi vào bảng `medical_records` đều phải kích hoạt trigger tự động ghi vào bảng `audit_logs`:
  * `actor_id` (ID người thao tác).
  * `patient_id` (Bệnh nhân bị truy cập).
  * `action` (`VIEW`, `CREATE`, `UPDATE`, `EXPORT`).
  * `ip_address`, `user_agent`, `timestamp`.
* Dữ liệu nhạy cảm (số CCCD/CMND, tiền sử bệnh lý đặc biệt) được mã hóa ở tầng ứng dụng bằng thuật toán **AES-256-GCM** trước khi lưu vào DB.

### 3.3. Vòng đời nhắc hẹn (Notification Lifecycle)
1. **Ngay khi đặt thành công:** Bắn Push Notification + Zalo ZNS kèm mã QR và mã đặt khám.
2. **Trước 24 giờ:** Background Worker (BullMQ) tự động gửi tin nhắc kiểm tra lịch, chuẩn bị giấy tờ/nhịn ăn xét nghiệm (nếu có).
3. **Trước 2 giờ:** Push notification nhắc nhở di chuyển, hiển thị chỉ đường Google Maps đến phòng khám.
4. **Sau khi khám xong:** Thông báo cảm ơn và gửi link đánh giá bác sĩ (Rating & Review).

---

## 4. CHIẾN LƯỢC DEVOPS & HẠ TẦNG

* **Containerization:** Docker & Docker Compose cho môi trường Development và Production.
* **CI/CD Pipeline:** GitHub Actions:
  * Mobile: Build tự động file APK / AAB (Google Play Internal Track) và TestFlight cho iOS.
  * Web Admin: Build Vite SPA và deploy lên Cloudflare Pages / Vercel / S3 + CloudFront.
  * Backend: Build Docker image, chạy test và deploy lên VPS (Coolify / Portainer) hoặc AWS ECS.
* **Giám sát & Logs:**
  * Sentry: Bắt lỗi crash trên Flutter App và lỗi exception 500 trên Backend.
  * Prometheus + Grafana: Theo dõi tài nguyên server, latency của API.

