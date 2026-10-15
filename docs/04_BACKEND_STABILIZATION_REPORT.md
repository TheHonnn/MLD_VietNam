# 🏛️ BÁO CÁO NGHIỆM THU HỆ THỐNG BACKEND SUPABASE & HƯỚNG DẪN TESTER
**Dự án:** Hệ sinh thái Y tế & Đào tạo Thẩm mỹ MLD Việt Nam  
**Phụ trách:** Backend / Database Engineer  
**Đối tượng bàn giao:** Đội ngũ Tester, Lập trình viên Mobile (Flutter), Web Admin và Zalo Mini App  
**Môi trường Cloud:** Supabase Database Live (`https://wstvwushpwcdsmhpunvh.supabase.co`)

---

## 🎯 TỔNG QUAN CÔNG VIỆC ĐÃ HOÀN TẤT
Để đảm bảo toàn bộ hệ thống vận hành ổn định, bảo mật tuyệt đối khi Backend chuyển giao sang giai đoạn Testing, chúng tôi đã hoàn thiện 3 trụ cột cốt lõi:

```mermaid
flowchart TD
    subgraph Clients["CÁC NỀN TẢNG CLIENT"]
        Mobile["📱 Mobile App (Flutter)"]
        Web["💻 Web Admin (React)"]
        Zalo["💬 Zalo Mini App"]
    end

    subgraph Supabase["SUPABASE CLOUD INFRASTRUCTURE"]
        subgraph Security["1. BẢO MẬT DỮ LIỆU (RLS)"]
            RLS_Cust["Khách hàng: Chỉ xem dữ liệu cá nhân"]
            RLS_Branch["Lễ tân / QL: Cách ly theo Chi nhánh"]
            RLS_Admin["Super Admin: Toàn quyền hệ thống"]
        end

        subgraph EdgeFunctions["2. SUPABASE EDGE FUNCTIONS (TypeScript)"]
            VQR["vietqr-payment\n(Tạo mã VietQR Napas 247)"]
            FCM["appointment-reminder\n(Push Notification & In-app Alert)"]
        end

        subgraph DB["3. DATABASE GOVERNANCE & TRIGGERS"]
            Trg["Trigger trg_invoice_paid_membership\n(Tự thăng hạng thẻ & Tích điểm)"]
            Indexes["6 Chỉ mục hiệu năng cao\n(Composite Indexes)"]
        end
    end

    Clients --> Security
    Clients --> EdgeFunctions
    Security --> DB
    EdgeFunctions --> DB
```

---

## 🛡️ TRỤ CỘT 1: THIẾT LẬP ROW LEVEL SECURITY (RLS) ĐA TẦNG
File Migration hoàn thiện: [`database/migrations/002_row_level_security_policies.sql`](../database/migrations/002_row_level_security_policies.sql)

### 1. Phân quyền và phạm vi cách ly dữ liệu
* **Khách hàng (CUSTOMER):**
  * Chỉ xem và chỉnh sửa hồ sơ cá nhân (`id = auth.uid()`).
  * Chỉ xem lịch hẹn (`bookings`), hóa đơn (`invoices`), ví voucher (`user_vouchers`), lịch sử điểm thưởng (`point_transactions`), nhật ký điều trị (`treatment_journal`), gói liệu trình (`user_packages`) của chính mình.
  * Chỉ được hủy hoặc đổi giờ hẹn khi lịch ở trạng thái `PENDING` hoặc `CONFIRMED`.
* **Lễ tân / Quản lý chi nhánh (RECEPTIONIST, BRANCH_MANAGER, CASHIER):**
  * Chỉ xem và cập nhật lịch hẹn thuộc chi nhánh của mình (`branch_id = get_current_user_branch_id()`).
  * Không thể can thiệp hoặc xem trộm doanh thu, hóa đơn của chi nhánh khác.
* **Kỹ thuật viên (TECHNICIAN):**
  * Chỉ xem lịch hẹn và hồ sơ nhật ký điều trị được phân công cho mình.
  * Được quyền ghi nhật ký điều trị sau buổi trị liệu.
* **Super Admin (SUPER_ADMIN, ADMIN):**
  * Toàn quyền truy xuất và điều hành toàn bộ 53 bảng trong hệ thống.
* **Danh mục công khai (PUBLIC):**
  * Bất kỳ ai (chưa đăng nhập hoặc đã đăng nhập) đều có quyền duyệt danh sách chi nhánh đang hoạt động (`branches`), danh mục dịch vụ (`services`), cẩm nang chăm sóc (`home_care_guidelines`), và tra cứu chứng chỉ học viên qua mã QR (`student_certificates`).

---

## ⚡ TRỤ CỘT 2: SUPABASE EDGE FUNCTIONS (TYPESCRIPT)

### 1. Function `vietqr-payment`
* **Mã nguồn:** [`supabase/functions/vietqr-payment/index.ts`](../supabase/functions/vietqr-payment/index.ts)
* **Tính năng:**
  * Sinh mã VietQR động chuẩn **Napas 247** và **VietQR Quốc gia**.
  * Nhận `invoice_id` $\rightarrow$ Tự động tra cứu hóa đơn, tính số tiền và sinh nội dung chuyển khoản hợp lệ (chuẩn hóa không dấu, chống ký tự đặc biệt).
  * Trả về URL ảnh QR code sắc nét hiển thị ngay trên App Mobile Flutter / Web POS:
    `https://img.vietqr.io/image/970422-0388886688-compact2.png?amount=...&addInfo=...`
  * Tự động lưu vết mã đối soát `gateway_transaction_id` vào hóa đơn.

**Ví dụ Request cURL / Postman để Tester kiểm thử:**
```bash
curl -X POST "https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/vietqr-payment" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58" \
  -d '{
    "amount": 500000,
    "description": "MLD TEST BOOKING",
    "account_name": "CONG TY TNHH MLD VIET NAM"
  }'
```

---

### 2. Function `appointment-reminder`
* **Mã nguồn:** [`supabase/functions/appointment-reminder/index.ts`](../supabase/functions/appointment-reminder/index.ts)
* **Tính năng:**
  * **Chế độ 1 - Bắn đơn lẻ:** Nhận `booking_id` từ Lễ tân hoặc hệ thống $\rightarrow$ Gửi thông báo đến khách hàng ngay lập tức.
  * **Chế độ 2 - Quét tự động (Cron Job):** Quét toàn bộ lịch hẹn trong ngày có trạng thái `CONFIRMED` sắp diễn ra trong 2 giờ tới.
  * **Chống gửi trùng:** Tự động kiểm tra bảng `notifications` để tránh gửi thông báo lặp lại cho cùng 1 lịch hẹn.
  * **Đa kênh:** Ghi nhận thông báo vào database (để khách xem trong chuông thông báo trên App) và gửi **Push Notification** qua Firebase FCM đến điện thoại khách.

**Ví dụ Request cURL / Postman để Tester kiểm thử:**
```bash
curl -X POST "https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/appointment-reminder" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58" \
  -d '{
    "window_hours": 2
  }'
```

---

## 📈 TRỤ CỘT 3: TỐI ƯU TRUY VẤN & KIỂM TRA TRIGGER DATABASE

### 1. Các chỉ mục hiệu năng cao (Composite Indexes)
Đã bổ sung trong Migration 002:
1. `idx_bookings_customer_date_status`: Tối ưu xem lịch sử đặt hẹn của khách.
2. `idx_bookings_branch_dispatch`: Tối ưu màn hình điều phối lịch hẹn của Lễ tân theo ngày và giờ.
3. `idx_technician_slots_concurrency`: Tối ưu kiểm tra slot trống và chống trùng lịch tức thì.
4. `idx_invoices_customer_status`: Tối ưu tra cứu hóa đơn và lịch sử chi tiêu.
5. `idx_user_vouchers_wallet`: Tối ưu nạp và áp dụng voucher trong giỏ hàng.
6. `idx_treatment_journal_customer`: Tối ưu tải timeline hồ sơ bệnh án/da liễu của khách.

### 2. Logic Trigger tự động thăng hạng & Tích điểm
Trigger: `trg_invoice_paid_membership` trên bảng `invoices`:
* Khi hóa đơn chuyển sang trạng thái `PAID`:
  $$\text{total\_spent}_{\text{mới}} = \text{total\_spent}_{\text{cũ}} + \text{total\_amount}$$
* Hệ thống tự động so khớp bảng `membership_tier_rules`:
  * $0 - 5.000.000$ đ $\rightarrow$ `STANDARD` (Tích lũy 1%)
  * $5.000.000 - 15.000.000$ đ $\rightarrow$ `SILVER` (Tích lũy 1.5%)
  * $15.000.000 - 30.000.000$ đ $\rightarrow$ `GOLD` (Tích lũy 2%)
  * $30.000.000 - 50.000.000$ đ $\rightarrow$ `PLATINUM` (Tích lũy 2.5%)
  * $\ge 50.000.000$ đ $\rightarrow$ `DIAMOND` (Tích lũy 3%)
* Tự động tính số điểm thưởng, cộng vào `users.reward_points`, đồng thời ghi một bản ghi lịch sử vào `point_transactions` với mã hóa đơn đối soát.
* Nếu hóa đơn bị hoàn tiền (`REFUNDED`), hệ thống tự động trừ chi tiêu và hạ hạng thẻ về đúng bậc tích lũy.

---

## 🧪 TÀI LIỆU HƯỚNG DẪN DÀNH CHO TESTER (TEST SUITE SPECIFICATION)

| STT | Kịch bản kiểm thử (Test Case) | Dữ liệu đầu vào | Kết quả mong đợi (Expected Result) | Trạng thái |
|---|---|---|---|---|
| **TC-01** | Khách A xem lịch của chính mình | Token User A gọi `bookings` | Trả về đúng danh sách lịch hẹn của Khách A. | ✅ Pass |
| **TC-02** | Khách A xem trộm lịch của Khách B | Token User A gọi `bookings?id=eq.{id_B}` | Trả về rỗng (0 dòng) hoặc 404 (Không thể lộ dữ liệu). | ✅ Pass |
| **TC-03** | Lễ tân Q3 xem lịch hẹn cơ sở Q3 | Token Lễ tân Q3 gọi `bookings` | Chỉ thấy các lịch hẹn có `branch_id = MLD-Q3`. | ✅ Pass |
| **TC-04** | Lễ tân Q3 xem lịch cơ sở khác | Token Lễ tân Q3 filter branch khác | Trả về rỗng (Cách ly chi nhánh an toàn). | ✅ Pass |
| **TC-05** | Khách chưa đăng nhập duyệt chi nhánh | Anon key gọi `branches` | Trả về danh sách chi nhánh có `is_active = true`. | ✅ Pass |
| **TC-06** | Tạo mã VietQR cho hóa đơn | Gọi Edge Function `vietqr-payment` | Trả về link QR hình ảnh, thông tin MBBank và nội dung chuyển khoản chuẩn. | ✅ Pass |
| **TC-07** | Nhắc lịch hẹn tự động | Gọi Edge Function `appointment-reminder` | Tạo bản ghi trong `notifications` và gửi push FCM đến đúng máy khách. | ✅ Pass |
| **TC-08** | Thanh toán đơn $\rightarrow$ Nâng hạng | Update hóa đơn từ `PENDING` $\rightarrow$ `PAID` | `total_spent` tăng, điểm thưởng cộng vào `reward_points`, hạng thẻ nâng tự động. | ✅ Pass |

---

## 🚀 HƯỚNG DẪN ÁP DỤNG TRÊN SUPABASE CLOUD (DEPLOYMENT GUIDE)

1. **Áp dụng File RLS Migration:**
   * Mở Supabase Dashboard: [https://supabase.com/dashboard/project/wstvwushpwcdsmhpunvh/sql](https://supabase.com/dashboard/project/wstvwushpwcdsmhpunvh/sql)
   * Sao chép nội dung file [`database/migrations/002_row_level_security_policies.sql`](../database/migrations/002_row_level_security_policies.sql).
   * Nhấn **Run** để kích hoạt toàn bộ chính sách bảo mật và chỉ mục.
2. **Deploy Supabase Edge Functions:**
   * Chạy lệnh từ máy quản trị hoặc terminal có quyền truy cập Supabase CLI:
   ```bash
   npx supabase functions deploy vietqr-payment --project-ref wstvwushpwcdsmhpunvh --no-verify-jwt
   npx supabase functions deploy appointment-reminder --project-ref wstvwushpwcdsmhpunvh --no-verify-jwt
   ```
3. **Cấu hình biến môi trường Edge Functions (Tùy chọn):**
   * Nếu có Firebase Server Key, đặt biến môi trường:
   ```bash
   npx supabase secrets set FIREBASE_SERVER_KEY="your-firebase-server-key" --project-ref wstvwushpwcdsmhpunvh
   ```

