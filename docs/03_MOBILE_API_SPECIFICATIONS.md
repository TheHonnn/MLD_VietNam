# MLD VIỆT NAM - TÀI LIỆU API SPECIFICATIONS (MOBILE APP)
## HỆ THỐNG Y TẾ, DƯỠNG SINH SPA & HỌC VIỆN ĐÀO TẠO NGHỀ MLD
**Phiên bản:** 3.0.0 (Chuẩn hóa 100% theo Database Schema `database/schema.sql` & Figma Mobile App)  
**Tương thích cơ sở dữ liệu:** PostgreSQL 15+ / Supabase (Bao gồm 53 bảng và 16 kiểu ENUM chuẩn)  
**Giao thức:** RESTful JSON API over HTTPS  
**Base URL Development:** `http://localhost:3000/api/v1`  
**Base URL Production:** `https://api.mldvietnam.vn/api/v1`  

---

## 1. QUY CHUẨN GIAO TIẾP & HEADER CHUẨN HÓA

### 1.1. HTTP Request Headers
Mọi request từ App Mobile gửi lên máy chủ phải đính kèm:
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <jwt_access_token>  (đối với các API yêu cầu đăng nhập)
X-App-Version: 1.0.0
X-Platform: ios | android
X-Device-Id: <uuid_device>
```

### 1.2. Cấu trúc Response chuẩn (`ApiResponse<T>`)
Tất cả các API Endpoints đều trả về định dạng JSON thống nhất:

#### Phản hồi thành công (200 OK, 201 Created):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thao tác thành công",
  "data": { ... }
}
```

#### Phản hồi phân trang (200 OK):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách thành công",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

#### Phản hồi lỗi (400, 401, 403, 404, 422, 500):
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Dữ liệu gửi lên không hợp lệ",
  "error": "Bad Request",
  "details": [
    {
      "field": "phone",
      "issue": "Số điện thoại không đúng định dạng Việt Nam"
    }
  ]
}
```

---

## 2. DANH MỤC CÁC ENUM DỮ LIỆU CHUẨN TỪ `schema.sql`
- **`user_role`**: `'CUSTOMER'`, `'STUDENT'`, `'TECHNICIAN'`, `'INSTRUCTOR'`, `'CASHIER'`, `'RECEPTIONIST'`, `'BRANCH_MANAGER'`, `'ADMIN'`, `'SUPER_ADMIN'`
- **`purpose_interest`**: `'BEAUTY_SPA'`, `'ACADEMY'`, `'BOTH'`
- **`member_tier`**: `'STANDARD'`, `'SILVER'`, `'GOLD'`, `'PLATINUM'`, `'DIAMOND'`
- **`booking_status`**: `'PENDING'`, `'CONFIRMED'`, `'CHECKED_IN'`, `'IN_SERVICE'`, `'COMPLETED'`, `'CANCELLED'`, `'NO_SHOW'`
- **`payment_status`**: `'UNPAID'`, `'PENDING'`, `'PARTIAL'`, `'PAID'`, `'REFUNDED'`, `'FAILED'`
- **`payment_method`**: `'CASH_AT_SPA'`, `'VNPAY'`, `'MOMO'`, `'BANK_TRANSFER'`, `'MEMBERSHIP_WALLET'`, `'SPLIT_PAYMENT'`
- **`slot_status`**: `'AVAILABLE'`, `'HOLD'`, `'BOOKED'`, `'BLOCKED'`
- **`course_level`**: `'BEGINNER'`, `'INTERMEDIATE'`, `'ADVANCED'`, `'MASTER'`
- **`batch_status`**: `'UPCOMING'`, `'OPEN_FOR_ENROLLMENT'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'CANCELLED'`
- **`enrollment_status`**: `'CONSULTING'`, `'DEPOSITED'`, `'ENROLLED'`, `'STUDYING'`, `'GRADUATED'`, `'DROPPED'`
- **`lesson_type`**: `'VIDEO'`, `'READING_DOC'`, `'PRACTICE_GUIDE'`, `'QUIZ'`
- **`attendance_status`**: `'PRESENT'`, `'ABSENT'`, `'LATE'`, `'EXCUSED'`
- **`package_status`**: `'ACTIVE'`, `'COMPLETED'`, `'EXPIRED'`, `'CANCELLED'`, `'PAUSED'`
- **`voucher_status`**: `'AVAILABLE'`, `'USED'`, `'EXPIRED'`
- **`ticket_status`**: `'PENDING'`, `'PROCESSING'`, `'RESOLVED'`, `'CLOSED'`

---

# PHẦN I: PHÂN HỆ AUTHENTICATION & ONBOARDING (GROUP A: A01 - A06)

### A1. Gửi mã xác thực OTP đăng nhập
* **Màn hình:** `A03_Login`
* **Method:** `POST`
* **URL:** `/api/v1/auth/send-otp`
* **Auth:** Không yêu cầu (Public)
* **Body gửi lên:**
```json
{
  "phone": "0987654321"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mã xác thực OTP đã được gửi đến số điện thoại 0987654321",
  "data": {
    "requestId": "req_88a7c29e-10b2-4d1a",
    "expiresIn": 60
  }
}
```

---

### A2. Xác thực mã OTP & Đăng nhập
* **Màn hình:** `A04_OTP`
* **Method:** `POST`
* **URL:** `/api/v1/auth/verify-otp`
* **Auth:** Không yêu cầu (Public)
* **Body gửi lên:**
```json
{
  "phone": "0987654321",
  "otp": "123456",
  "fcm_device_token": "fcm_token_sample_string_123"
}
```
* **JSON trả về (200 OK - Đã có thông tin):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isProfileCompleted": true,
    "user": {
      "id": "e2a1b9f4-859a-4c2f-b485-6f6880da6a41",
      "phone": "0987654321",
      "fullName": "Nguyễn Thị Mai",
      "email": "mai.nguyen@example.com",
      "avatarUrl": "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
      "role": "CUSTOMER",
      "purpose": "BEAUTY_SPA",
      "membershipTier": "GOLD",
      "rewardPoints": 1250,
      "referralCode": "MLD8823"
    }
  }
}
```
* **JSON trả về (200 OK - Tài khoản mới cần thiết lập hồ sơ):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Xác thực thành công. Vui lòng hoàn tất hồ sơ",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isProfileCompleted": false,
    "user": {
      "id": "e2a1b9f4-859a-4c2f-b485-6f6880da6a41",
      "phone": "0987654321",
      "role": "CUSTOMER"
    }
  }
}
```

---

### A3. Hoàn tất hồ sơ cá nhân ban đầu
* **Màn hình:** `A05_ProfileSetup`
* **Method:** `POST`
* **URL:** `/api/v1/auth/profile-setup`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `users`):**
```json
{
  "full_name": "Trần Thu Hà",
  "email": "thuha.tran@example.com",
  "gender": "FEMALE",
  "date_of_birth": "1996-05-18",
  "address": "128 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM",
  "emergency_contact_name": "Trần Văn Nam",
  "emergency_contact_phone": "0912345678",
  "referred_by_code": "MLD8823"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thiết lập hồ sơ thành công",
  "data": {
    "id": "e2a1b9f4-859a-4c2f-b485-6f6880da6a41",
    "phone": "0987654321",
    "fullName": "Trần Thu Hà",
    "email": "thuha.tran@example.com",
    "gender": "FEMALE",
    "dateOfBirth": "1996-05-18",
    "membershipTier": "STANDARD",
    "rewardPoints": 100,
    "referralCode": "MLD9941"
  }
}
```

---

### A4. Lựa chọn mục tiêu quan tâm (Spa / Học viện / Cả hai)
* **Màn hình:** `A06_PurposeSelection`
* **Method:** `POST`
* **URL:** `/api/v1/auth/purpose-selection`
* **Auth:** Bearer Token
* **Body gửi lên:**
```json
{
  "purpose": "BOTH"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lưu định hướng mục tiêu thành công",
  "data": {
    "id": "e2a1b9f4-859a-4c2f-b485-6f6880da6a41",
    "purpose": "BOTH"
  }
}
```

---

# PHẦN II: KHÁM PHÁ DỊCH VỤ, CƠ SỞ & ĐỘI NGŨ (GROUP B: B01 - B08)

### B1. Lấy dữ liệu bảng tin Trang chủ tổng hợp
* **Màn hình:** `B01_Home`
* **Method:** `GET`
* **URL:** `/api/v1/home/feed?branch_id=uuid_optional`
* **Auth:** Tùy chọn (Public hoặc Bearer Token)
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy bảng tin trang chủ thành công",
  "data": {
    "banners": [
      {
        "id": "banner-01",
        "title": "Ưu đãi trị liệu Da Y khoa đón Hè",
        "imageUrl": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
        "targetType": "SERVICE",
        "targetId": "c4d3b2a1-0000-0000-0000-000000000001"
      }
    ],
    "categories": [
      {
        "id": "11111111-2222-3333-4444-555555555551",
        "name": "Chăm sóc & Điều trị Da",
        "code": "SKIN_CARE",
        "iconUrl": "https://assets.mldvietnam.vn/icons/skin.png"
      },
      {
        "id": "11111111-2222-3333-4444-555555555552",
        "name": "Gội đầu Dưỡng sinh Y học",
        "code": "HEAD_SPA",
        "iconUrl": "https://assets.mldvietnam.vn/icons/head_spa.png"
      }
    ],
    "featuredPackages": [
      {
        "id": "pkg-001",
        "name": "Gói Điều Trị Nám Chuyên Sâu 10 Buổi",
        "totalSessions": 10,
        "price": 15000000.00,
        "discountPrice": 12000000.00,
        "imageUrl": "https://images.unsplash.com/photo-1512290900672-1f49615e4499"
      }
    ],
    "topSpecialists": [
      {
        "id": "tech-001",
        "fullName": "Bác sĩ CKI Lê Thu Trang",
        "title": "Bác sĩ Da liễu & Thẩm mỹ",
        "avatarUrl": "https://images.unsplash.com/photo-1594824813589-943e26f59795",
        "ratingAvg": 4.95,
        "reviewCount": 184
      }
    ],
    "unreadNotificationsCount": 3
  }
}
```

---

### B2. Danh mục & Danh sách dịch vụ Spa
* **Màn hình:** `B02_ServiceList`
* **Method:** `GET`
* **URL:** `/api/v1/services?category_id=uuid&search=string&is_featured=boolean&page=1&limit=20`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách dịch vụ thành công",
  "data": [
    {
      "id": "c4d3b2a1-0000-0000-0000-000000000001",
      "categoryId": "11111111-2222-3333-4444-555555555551",
      "name": "Thải độc & Phục hồi Da Đa tầng Bio-Detox",
      "slug": "thai-doc-phuc-hoi-da-bio-detox",
      "shortDescription": "Quy trình thanh lọc sâu sử dụng khoáng chất sinh học và ánh sáng sinh học",
      "durationMinutes": 75,
      "price": 850000.00,
      "discountPrice": 680000.00,
      "imageUrl": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
      "isFeatured": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "totalItems": 32, "totalPages": 2 }
}
```

---

### B3. Chi tiết dịch vụ Spa chuyên sâu
* **Màn hình:** `B03_ServiceDetail`
* **Method:** `GET`
* **URL:** `/api/v1/services/:id`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chi tiết dịch vụ",
  "data": {
    "id": "c4d3b2a1-0000-0000-0000-000000000001",
    "name": "Thải độc & Phục hồi Da Đa tầng Bio-Detox",
    "slug": "thai-doc-phuc-hoi-da-bio-detox",
    "shortDescription": "Quy trình thanh lọc sâu sử dụng khoáng chất sinh học",
    "fullDescription": "Phác đồ điều trị được phát triển bởi các chuyên gia da liễu...",
    "durationMinutes": 75,
    "price": 850000.00,
    "discountPrice": 680000.00,
    "imageUrl": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
    "galleryUrls": [
      "https://images.unsplash.com/photo-1512290900672-1f49615e4499",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2"
    ],
    "steps": [
      { "step": 1, "name": "Tẩy trang & Rửa mặt dịu nhẹ", "duration": "10 phút" },
      { "step": 2, "name": "Tẩy tế bào chết enzyme & Hút dầu mụn", "duration": "15 phút" },
      { "step": 3, "name": "Điện di tinh chất Bio-Serum làm dịu", "duration": "25 phút" },
      { "step": 4, "name": "Đắp mặt nạ sinh học & Chiếu ánh sáng sinh học", "duration": "25 phút" }
    ],
    "benefits": [
      "Làm sạch sâu bã nhờn và độc tố tích tụ dưới da",
      "Tăng sinh collagen tự nhiên và phục hồi hàng rào bảo vệ da"
    ]
  }
}
```

---

### B4. Danh sách các chi nhánh Spa & Viện thẩm mỹ
* **Màn hình:** `B05_BranchList`
* **Method:** `GET`
* **URL:** `/api/v1/branches?city=TP.%20H%E1%BB%93%20Ch%C3%AD%20Minh`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Danh sách chi nhánh",
  "data": [
    {
      "id": "b1a2c3d4-0000-0000-0000-000000000001",
      "name": "MLD Premium Flagship Quận 1",
      "code": "MLD-Q1",
      "phone": "02838229988",
      "address": "45 Lê Duẩn, Phường Bến Nghé, Quận 1",
      "district": "Quận 1",
      "city": "TP. Hồ Chí Minh",
      "latitude": 10.7828110,
      "longitude": 106.6997450,
      "openingTime": "08:30:00",
      "closingTime": "20:30:00",
      "imageUrl": "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
      "amenities": ["Bãi đỗ ô tô miễn phí", "Phòng chờ VIP chuẩn 5 sao", "Phòng riêng biệt lập"]
    }
  ]
}
```

---

### B5. Danh sách Kỹ thuật viên & Bác sĩ chuyên khoa
* **Màn hình:** `B07_SpecialistList`, `B08_SpecialistDetail`
* **Method:** `GET`
* **URL:** `/api/v1/technicians?branch_id=uuid&specialty=SKINCARE`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách kỹ thuật viên",
  "data": [
    {
      "id": "t1a2b3c4-0000-0000-0000-000000000001",
      "fullName": "Nguyễn Hoàng Yến",
      "title": "Kỹ thuật viên Trưởng Trị liệu Da",
      "avatarUrl": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2",
      "experienceYears": 6,
      "ratingAvg": 4.96,
      "reviewCount": 218,
      "specialties": ["Trị mụn viêm y khoa", "Phục hồi da sau laser", "Điện di tinh chất"],
      "bio": "Hơn 6 năm kinh nghiệm điều trị da liễu thẩm mỹ chuẩn y khoa."
    }
  ]
}
```

---

# PHẦN III: ĐẶT LỊCH HẸN & THANH TOÁN (GROUP C: C01 - C10)

### C1. Lấy khung giờ khả dụng thời gian thực
* **Màn hình:** `C04_DateTimeSelection`
* **Method:** `GET`
* **URL:** `/api/v1/technicians/slots?technician_id=uuid&branch_id=uuid&date=2026-10-20`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Danh sách khung giờ khả dụng",
  "data": [
    {
      "id": "slot-0900",
      "startTime": "09:00:00",
      "endTime": "10:30:00",
      "status": "AVAILABLE"
    },
    {
      "id": "slot-1030",
      "startTime": "10:30:00",
      "endTime": "12:00:00",
      "status": "BOOKED"
    },
    {
      "id": "slot-1400",
      "startTime": "14:00:00",
      "endTime": "15:30:00",
      "status": "AVAILABLE"
    }
  ]
}
```

---

### C2. Giữ chỗ tạm thời trong 10 phút (Hold Slot)
* **Màn hình:** `C04_DateTimeSelection`
* **Method:** `POST`
* **URL:** `/api/v1/technicians/slots/hold`
* **Auth:** Bearer Token
* **Body gửi lên:**
```json
{
  "technician_id": "t1a2b3c4-0000-0000-0000-000000000001",
  "branch_id": "b1a2c3d4-0000-0000-0000-000000000001",
  "slot_date": "2026-10-20",
  "start_time": "14:00:00",
  "end_time": "15:30:00"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Đã giữ chỗ thành công trong 10 phút",
  "data": {
    "slotId": "slot_55a9b1c2-3d4e",
    "holdExpiresAt": "2026-10-20T14:10:00.000Z"
  }
}
```

---

### C3. Tính toán hóa đơn đặt hẹn & Áp voucher / tích điểm
* **Màn hình:** `C05_BookingInfo`
* **Method:** `POST`
* **URL:** `/api/v1/bookings/calculate-price`
* **Auth:** Bearer Token
* **Body gửi lên:**
```json
{
  "service_ids": ["c4d3b2a1-0000-0000-0000-000000000001"],
  "coupon_code": "MLDHE2026",
  "points_to_redeem": 50,
  "branch_id": "b1a2c3d4-0000-0000-0000-000000000001"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tính toán chi phí thành công",
  "data": {
    "baseTotal": 850000.00,
    "couponDiscount": 100000.00,
    "pointsDiscount": 50000.00,
    "pointsUsed": 50,
    "finalPrice": 700000.00,
    "appliedCoupon": {
      "id": "cpn-001",
      "code": "MLDHE2026",
      "title": "Ưu đãi mùa hè giảm 100.000đ"
    }
  }
}
```

---

### C4. Tạo đơn đặt lịch hẹn (Booking Creation)
* **Màn hình:** `C06_BookingConfirmation`
* **Method:** `POST`
* **URL:** `/api/v1/bookings`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `bookings` & `booking_items`):**
```json
{
  "branch_id": "b1a2c3d4-0000-0000-0000-000000000001",
  "technician_id": "t1a2b3c4-0000-0000-0000-000000000001",
  "booking_date": "2026-10-20",
  "start_time": "14:00:00",
  "end_time": "15:30:00",
  "service_ids": [
    "c4d3b2a1-0000-0000-0000-000000000001"
  ],
  "coupon_id": "cpn-001",
  "points_used": 50,
  "payment_method": "VNPAY",
  "booked_for_name": "Nguyễn Thị Mai",
  "booked_for_phone": "0987654321",
  "special_notes": "Khách có tiền sử dị ứng tinh dầu quế"
}
```
* **JSON trả về (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Đặt lịch hẹn thành công",
  "data": {
    "bookingId": "bk_99e8a7b6-c5d4-4f3e-a2b1-0987654321ab",
    "bookingCode": "MLD-BK-20261020-089",
    "status": "CONFIRMED",
    "paymentStatus": "UNPAID",
    "finalPrice": 700000.00,
    "qrCodeHash": "mld_checkin_qr_20261020_089_hash",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
  }
}
```

---

### C5. Lịch hẹn của tôi & Chi tiết lịch hẹn
* **Màn hình:** `C09_MyAppointments`, `C10_AppointmentDetail`
* **Method:** `GET`
* **URL:** `/api/v1/bookings/my-bookings?status=CONFIRMED&page=1&limit=10`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách lịch hẹn thành công",
  "data": [
    {
      "id": "bk_99e8a7b6-c5d4-4f3e-a2b1-0987654321ab",
      "bookingCode": "MLD-BK-20261020-089",
      "bookingDate": "2026-10-20",
      "startTime": "14:00:00",
      "endTime": "15:30:00",
      "status": "CONFIRMED",
      "paymentStatus": "PAID",
      "paymentMethod": "VNPAY",
      "finalPrice": 700000.00,
      "qrCodeHash": "mld_checkin_qr_20261020_089_hash",
      "branch": {
        "id": "b1a2c3d4-0000-0000-0000-000000000001",
        "name": "MLD Premium Flagship Quận 1",
        "address": "45 Lê Duẩn, Phường Bến Nghé, Quận 1"
      },
      "technician": {
        "id": "t1a2b3c4-0000-0000-0000-000000000001",
        "fullName": "Nguyễn Hoàng Yến",
        "title": "Kỹ thuật viên Trưởng"
      },
      "items": [
        {
          "serviceId": "c4d3b2a1-0000-0000-0000-000000000001",
          "serviceName": "Thải độc & Phục hồi Da Đa tầng Bio-Detox",
          "price": 850000.00
        }
      ]
    }
  ]
}
```

---

### C6. Hủy lịch hẹn
* **Màn hình:** `C10_AppointmentDetail`
* **Method:** `PATCH`
* **URL:** `/api/v1/bookings/:id/cancel`
* **Auth:** Bearer Token
* **Body gửi lên:**
```json
{
  "cancellation_reason": "Có việc gia đình đột xuất không đến được"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Hủy lịch hẹn thành công",
  "data": {
    "bookingId": "bk_99e8a7b6-c5d4-4f3e-a2b1-0987654321ab",
    "status": "CANCELLED"
  }
}
```

---

# PHẦN IV: GÓI LIỆU TRÌNH, NHẬT KÝ & CHĂM SÓC KHÁCH HÀNG (GROUP D: D01 - D08)

### D1. Gói liệu trình khách hàng sở hữu
* **Màn hình:** `D01_MyPackages`, `D02_PackageDetail`
* **Method:** `GET`
* **URL:** `/api/v1/treatment-packages/my-packages`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Danh sách gói liệu trình cá nhân",
  "data": [
    {
      "id": "upkg_11223344-5566-7788-99aa-bbccddeeff00",
      "packageName": "Liệu Trình Điều Trị Sẹo Rỗ Laser Fractional CO2",
      "totalSessions": 6,
      "completedSessions": 2,
      "status": "ACTIVE",
      "purchasedAt": "2026-08-15T09:00:00Z",
      "expiresAt": "2027-02-15T23:59:59Z",
      "description": "Gói điều trị chuẩn y khoa kết hợp tế bào gốc tự thân"
    }
  ]
}
```

---

### D2. Nhật ký hồ sơ chăm sóc da từng buổi (Care Journal)
* **Màn hình:** `D03_CareJournal`
* **Method:** `GET`
* **URL:** `/api/v1/treatment-journals/my-journal?user_package_id=uuid`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Nhật ký chăm sóc điều trị",
  "data": [
    {
      "id": "jrn-01",
      "sessionNumber": 2,
      "sessionDate": "2026-09-20",
      "conditionBefore": "Nốt mụn viêm giảm 60%, bề mặt da bớt tiết bã nhờn",
      "conditionAfter": "Da được cấp ẩm sâu, vết thâm đỏ dịu hẳn sau bước điện di tinh chất",
      "treatmentNotes": "Điện di tinh chất phục hồi nồng độ 15%, tránh vùng mũi nhạy cảm",
      "specialistAdvice": "Dùng kem chống nắng SPF50+ 2 lần/ngày, uống đủ 2 lít nước",
      "beforePhotos": [
        "https://assets.mldvietnam.vn/journals/jrn01_before1.jpg"
      ],
      "afterPhotos": [
        "https://assets.mldvietnam.vn/journals/jrn01_after1.jpg"
      ],
      "technicianName": "Nguyễn Hoàng Yến"
    }
  ]
}
```

---

### D3. Khảo sát tiền dịch vụ (Pre-service Survey)
* **Màn hình:** `D04_PreServiceSurvey`
* **Method:** `POST`
* **URL:** `/api/v1/surveys/consultation`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `consultation_surveys`):**
```json
{
  "booking_id": "bk_99e8a7b6-c5d4-4f3e-a2b1-0987654321ab",
  "focus_areas": ["Vùng chữ T nhiều dầu", "Hai bên gò má có vết nám nhẹ"],
  "pressure_pref": "MEDIUM",
  "has_sensitive_skin": true,
  "has_oil_allergy": false,
  "allergy_details": "Dị ứng với mỹ phẩm có hương liệu nhân tạo",
  "medical_conditions": ["Viêm xoang nhẹ"],
  "special_requests": "Phòng yên tĩnh, hạn chế bật nhạc có lời"
}
```
* **JSON trả về (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Lưu phiếu khảo sát tiền dịch vụ thành công",
  "data": {
    "surveyId": "srv_77889900-aabb-ccdd"
  }
}
```

---

### D4. Đánh giá chất lượng dịch vụ & Kỹ thuật viên
* **Màn hình:** `D05_ServiceReview`
* **Method:** `POST`
* **URL:** `/api/v1/reviews`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `reviews`):**
```json
{
  "booking_id": "bk_99e8a7b6-c5d4-4f3e-a2b1-0987654321ab",
  "service_id": "c4d3b2a1-0000-0000-0000-000000000001",
  "technician_id": "t1a2b3c4-0000-0000-0000-000000000001",
  "rating": 5,
  "review_tags": ["KTV tay nghề cao", "Không gian sang trọng", "Phục vụ chu đáo"],
  "comment": "Bạn Yến làm rất êm tay, giải thích tình trạng da kỹ lưỡng. Chắc chắn sẽ quay lại!",
  "photos": [
    "https://assets.mldvietnam.vn/reviews/rev01.jpg"
  ]
}
```
* **JSON trả về (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Cảm ơn bạn đã gửi đánh giá. Bạn được cộng 50 điểm thưởng MLD!",
  "data": {
    "reviewId": "rev_12345678-abcd",
    "rewardPointsEarned": 50
  }
}
```

---

### D5. Cẩm nang chăm sóc da tại nhà
* **Màn hình:** `D06_HomeCareGuidelines`
* **Method:** `GET`
* **URL:** `/api/v1/guidelines?category=SKIN_CARE&page=1&limit=10`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Danh sách cẩm nang chăm sóc",
  "data": [
    {
      "id": "gd-001",
      "title": "5 Bước Chăm Sóc Da Sau Khi Làm Liệu Trình Laser Fractional",
      "slug": "5-buoc-cham-soc-da-sau-laser-fractional",
      "category": "SKIN_CARE",
      "readTimeMinutes": 4,
      "summary": "Hướng dẫn chi tiết cách vệ sinh bằng nước muối sinh lý và chống nắng bảo vệ màng da non",
      "imageUrl": "https://images.unsplash.com/photo-1556228720-195a672e8a03",
      "authorName": "ThS. BS Lê Thu Trang",
      "viewCount": 1540
    }
  ]
}
```

---

### D6. Gửi yêu cầu hỗ trợ khách hàng (Support Ticket)
* **Màn hình:** `D07_CustomerSupport`
* **Method:** `POST`
* **URL:** `/api/v1/support/tickets`
* **Auth:** Bearer Token
* **Body gửi lên:**
```json
{
  "subject": "Thắc mắc về hóa đơn thanh toán ngày 15/10",
  "message": "Tôi thấy số điểm tích lũy chưa được cập nhật sau khi thanh toán đơn hàng..."
}
```
* **JSON trả về (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Yêu cầu đã được tiếp nhận. Đội ngũ CSKH sẽ phản hồi trong 2 giờ làm việc",
  "data": {
    "ticketId": "tkt_55667788-9900",
    "status": "PENDING"
  }
}
```

---

### D7. Danh sách thông báo đẩy (Push Notifications)
* **Màn hình:** `D08_Notifications`
* **Method:** `GET`
* **URL:** `/api/v1/notifications?page=1&limit=20`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lấy danh sách thông báo thành công",
  "data": [
    {
      "id": "notif-01",
      "title": "Nhắc hẹn trị liệu ngày mai",
      "message": "Lịch hẹn Thải độc da của bạn lúc 14:00 ngày 20/10 tại MLD Quận 1 đã sẵn sàng.",
      "type": "APPOINTMENT",
      "data": { "bookingId": "bk_99e8a7b6-c5d4-4f3e-a2b1-0987654321ab" },
      "isRead": false,
      "createdAt": "2026-10-19T08:00:00Z"
    }
  ]
}
```

---

# PHẦN V: HỌC VIỆN ĐÀO TẠO NGHỀ THẨM MỸ (GROUP E: E01 - E12)

### E1. Bảng tin Học viện Đào tạo (Academy Feed)
* **Màn hình:** `E01_AcademyHome`
* **Method:** `GET`
* **URL:** `/api/v1/academy/feed`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dữ liệu học viện đào tạo",
  "data": {
    "featuredCourses": [
      {
        "id": "crs-001",
        "title": "Khóa Đào Tạo Kỹ Thuật Viên Spa & Trị Liệu Da Chuyên Nghiệp",
        "code": "MLD-ACAD-SKIN-PRO",
        "level": "BEGINNER",
        "totalHours": 144,
        "tuitionFee": 15000000.00,
        "depositAmount": 3000000.00,
        "certificateTitle": "Chứng chỉ Kỹ thuật viên Da Y khoa MLD",
        "imageUrl": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d"
      }
    ],
    "upcomingBatches": [
      {
        "id": "batch-k18",
        "batchCode": "K18-Q1-2026",
        "courseTitle": "Kỹ thuật viên Da Chuyên Nghiệp",
        "startDate": "2026-11-01",
        "scheduleText": "Thứ 2 - 4 - 6 (18:00 - 21:00)",
        "availableSlots": 4
      }
    ]
  }
}
```

---

### E2. Chi tiết khóa học đào tạo chuyên môn
* **Màn hình:** `E03_CourseDetail`
* **Method:** `GET`
* **URL:** `/api/v1/academy/courses/:id`
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chi tiết khóa học đào tạo",
  "data": {
    "id": "crs-001",
    "title": "Khóa Đào Tạo Kỹ Thuật Viên Spa & Trị Liệu Da Chuyên Nghiệp",
    "code": "MLD-ACAD-SKIN-PRO",
    "level": "BEGINNER",
    "totalHours": 144,
    "theoryHours": 48,
    "practiceHours": 96,
    "totalLessons": 24,
    "tuitionFee": 15000000.00,
    "depositAmount": 3000000.00,
    "certificateTitle": "Chứng chỉ Kỹ thuật viên Da Y khoa MLD",
    "primaryInstructor": {
      "id": "inst-01",
      "fullName": "ThS. Nguyễn Thu Hà",
      "title": "Hiệu trưởng Học viện MLD Vietnam",
      "experienceYears": 12,
      "avatarUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956"
    },
    "learningOutcomes": [
      "Nắm vững sinh lý học da và cách phân loại bệnh lý da liễu",
      "Thực hành thành thạo máy soi da vi điểm và công nghệ laser",
      "Cam kết 100% giới thiệu việc làm tại hệ thống MLD"
    ],
    "chapters": [
      {
        "id": "ch-01",
        "chapterOrder": 1,
        "title": "Phần I: Đại cương về Giải phẫu học và Sinh lý Da",
        "lessonsCount": 6
      }
    ]
  }
}
```

---

### E3. Đăng ký nhập học khóa đào tạo
* **Màn hình:** `E05_EnrollmentForm`
* **Method:** `POST`
* **URL:** `/api/v1/academy/enrollments`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `course_enrollments`):**
```json
{
  "course_id": "crs-001",
  "batch_id": "batch-k18",
  "notes": "Muốn đăng ký lịch thực hành ca tối"
}
```
* **JSON trả về (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Đăng ký khóa học thành công",
  "data": {
    "enrollmentId": "enr_33445566-7788",
    "courseId": "crs-001",
    "status": "CONSULTING",
    "tuitionTotal": 15000000.00,
    "depositRequired": 3000000.00
  }
}
```

---

### E4. Đóng học phí hoặc Đặt cọc giữ chỗ
* **Màn hình:** `E06_TuitionPayment`
* **Method:** `POST`
* **URL:** `/api/v1/academy/tuition/pay`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `tuition_transactions`):**
```json
{
  "enrollment_id": "enr_33445566-7788",
  "amount": 3000000.00,
  "transaction_type": "DEPOSIT",
  "payment_method": "BANK_TRANSFER"
}
```
* **JSON trả về (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Giao dịch học phí đã được tạo",
  "data": {
    "transactionCode": "MLD-TUI-20261020-004",
    "amount": 3000000.00,
    "paymentStatus": "PAID",
    "paidAt": "2026-10-20T10:15:00Z",
    "receiptPdfUrl": "https://assets.mldvietnam.vn/receipts/tui_004.pdf"
  }
}
```

---

### E5. Khóa học của tôi & Bài học Video trực tuyến
* **Màn hình:** `E07_MyCourses`, `E08_ClassDetail`, `E09_LessonScreen`
* **Method:** `GET`
* **URL:** `/api/v1/academy/lessons/:id`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Nội dung bài học",
  "data": {
    "id": "les-05",
    "title": "Bài 5: Kỹ thuật Thải độc Hạch Bạch Huyết Mặt & Cổ",
    "lessonType": "VIDEO",
    "durationMinutes": 25,
    "videoUrl": "https://video.mldvietnam.vn/hls/lesson5/master.m3u8",
    "contentText": "Tóm tắt các điểm huyệt đạo quan trọng trên khuôn mặt...",
    "attachments": [
      {
        "name": "So_do_huyet_dao_MLD.pdf",
        "url": "https://assets.mldvietnam.vn/docs/huyet_dao.pdf"
      }
    ],
    "isCompleted": false
  }
}
```

---

### E6. Cập nhật tiến độ xem bài học
* **Màn hình:** `E09_LessonScreen`
* **Method:** `POST`
* **URL:** `/api/v1/academy/lessons/:id/progress`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `user_lesson_progress`):**
```json
{
  "enrollment_id": "enr_33445566-7788",
  "watched_seconds": 1500,
  "is_completed": true,
  "student_notes": "Cần chú ý lực miết ngón cái tại huyệt Thừa Tương"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Đã ghi nhận hoàn thành bài học",
  "data": {
    "isCompleted": true,
    "totalCourseProgressPercent": 45
  }
}
```

---

### E7. Thi trắc nghiệm & Nộp bài kiểm tra
* **Màn hình:** `E10_QuizScreen`
* **Method:** `POST`
* **URL:** `/api/v1/academy/quizzes/submit`
* **Auth:** Bearer Token
* **Body gửi lên (Ánh xạ bảng `quiz_submissions`):**
```json
{
  "enrollment_id": "enr_33445566-7788",
  "quiz_id": "quiz_1122-3344",
  "submitted_answers": {
    "1": "B",
    "2": "A",
    "3": "C",
    "4": "D",
    "5": "B"
  }
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Nộp bài kiểm tra thành công",
  "data": {
    "score": 9.0,
    "correctCount": 18,
    "totalQuestions": 20,
    "passed": true,
    "instructorFeedback": "Kiến thức lý thuyết rất vững, tiếp tục phát huy!"
  }
}
```

---

### E8. Bảng điểm học tập & Chứng chỉ điện tử E-Certificate
* **Màn hình:** `E12_LearningRecords`
* **Method:** `GET`
* **URL:** `/api/v1/academy/my-academic-record/:enrollmentId`
* **Auth:** Bearer Token
* **JSON trả về (200 OK - Ánh xạ `student_academic_records` & `student_certificates`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Kết quả học tập toàn khóa",
  "data": {
    "theoryScore": 9.20,
    "practicalScore": 9.50,
    "attendedSessions": 20,
    "totalBatchSessions": 20,
    "attendanceRate": 100.0,
    "isGraduated": true,
    "graduationDate": "2026-10-15",
    "certificate": {
      "certificateCode": "MLD-CERT-2026-9908",
      "qrVerificationCode": "mld_cert_verify_9908_hash",
      "studentName": "Trần Thu Hà",
      "courseTitle": "Kỹ thuật viên Da Chuyên Nghiệp",
      "issueDate": "2026-10-15",
      "finalGrade": "XUẤT SẮC",
      "certificatePdfUrl": "https://assets.mldvietnam.vn/certs/cert_9908.pdf"
    }
  }
}
```

---

# PHẦN VI: HỘI VIÊN, ĐIỂM THƯỞNG & TÀI KHOẢN (GROUP F: F01 - F08)

### F1. Hồ sơ cá nhân người dùng
* **Màn hình:** `F01_Profile`, `F02_EditProfile`
* **Method:** `GET`
* **URL:** `/api/v1/users/profile`
* **Auth:** Bearer Token
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thông tin hồ sơ người dùng",
  "data": {
    "id": "e2a1b9f4-859a-4c2f-b485-6f6880da6a41",
    "phone": "0987654321",
    "email": "thuha.tran@example.com",
    "fullName": "Trần Thu Hà",
    "avatarUrl": "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    "gender": "FEMALE",
    "dateOfBirth": "1996-05-18",
    "address": "128 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM",
    "emergencyContactName": "Trần Văn Nam",
    "emergencyContactPhone": "0912345678",
    "membershipTier": "PLATINUM",
    "rewardPoints": 1850,
    "totalSpent": 32500000.00,
    "referralCode": "MLD9941"
  }
}
```

---

### F2. Cập nhật hồ sơ cá nhân
* **Màn hình:** `F02_EditProfile`
* **Method:** `PUT`
* **URL:** `/api/v1/users/profile`
* **Auth:** Bearer Token
* **Body gửi lên:**
```json
{
  "full_name": "Trần Thu Hà",
  "email": "thuha.mld@gmail.com",
  "gender": "FEMALE",
  "address": "250 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Cập nhật hồ sơ thành công",
  "data": {
    "fullName": "Trần Thu Hà",
    "email": "thuha.mld@gmail.com"
  }
}
```

---

### F3. Hạng hội viên & Đặc quyền nâng hạng (Tier Perks)
* **Màn hình:** `F03_MembershipCard`
* **Method:** `GET`
* **URL:** `/api/v1/membership/my-tier`
* **Auth:** Bearer Token
* **JSON trả về (200 OK - Ánh xạ `membership_tier_rules`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thông tin hạng hội viên",
  "data": {
    "currentTier": "PLATINUM",
    "totalSpent": 32500000.00,
    "pointEarningRate": 1.5,
    "discountServicePercent": 15.0,
    "freeHeadSpaSessions": 2,
    "priorityBooking": true,
    "nextTier": {
      "tier": "DIAMOND",
      "minAccumulatedSpent": 50000000.00,
      "spentNeeded": 17500000.00,
      "discountServicePercent": 20.0
    }
  }
}
```

---

### F4. Điểm thưởng & Lịch sử biến động điểm
* **Màn hình:** `F04_LoyaltyPoints`
* **Method:** `GET`
* **URL:** `/api/v1/loyalty/transactions?page=1&limit=20`
* **Auth:** Bearer Token
* **JSON trả về (200 OK - Ánh xạ `point_transactions`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Lịch sử biến động điểm thưởng",
  "data": [
    {
      "id": "pt-01",
      "pointsChange": 150,
      "balanceAfter": 1850,
      "actionType": "BOOKING_EARN",
      "description": "Tích điểm từ đơn dịch vụ #MLD-BK-20261020-089",
      "createdAt": "2026-10-20T16:00:00Z"
    },
    {
      "id": "pt-02",
      "pointsChange": -50,
      "balanceAfter": 1700,
      "actionType": "REDEEM_DISCOUNT",
      "description": "Đổi điểm giảm trừ trực tiếp trên hóa đơn",
      "createdAt": "2026-10-20T14:00:00Z"
    }
  ],
  "currentBalance": 1850,
  "redeemRate": "100đ / điểm"
}
```

---

### F5. Ví Voucher khuyến mãi cá nhân
* **Màn hình:** `F05_MyVouchers`
* **Method:** `GET`
* **URL:** `/api/v1/vouchers/my-vouchers?status=AVAILABLE`
* **Auth:** Bearer Token
* **JSON trả về (200 OK - Ánh xạ `user_vouchers` JOIN `coupons`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Danh sách voucher cá nhân",
  "data": [
    {
      "id": "uv-01",
      "code": "MLDSINHNHAT2026",
      "title": "Voucher Mừng Sinh Nhật Hội Viên",
      "discountAmount": 200000.00,
      "minOrderAmount": 500000.00,
      "status": "AVAILABLE",
      "expiresAt": "2026-11-18T23:59:59Z",
      "description": "Áp dụng cho mọi dịch vụ chăm sóc da và gội đầu dưỡng sinh"
    }
  ]
}
```

---

### F6. Lịch sử hóa đơn thanh toán & Tải PDF
* **Màn hình:** `F06_PaymentHistory`
* **Method:** `GET`
* **URL:** `/api/v1/invoices/my-invoices?page=1&limit=10`
* **Auth:** Bearer Token
* **JSON trả về (200 OK - Ánh xạ `invoices`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Danh sách hóa đơn thanh toán",
  "data": [
    {
      "id": "inv_88990011-2233",
      "invoiceCode": "HD-MLD-20261020-055",
      "subtotal": 850000.00,
      "discountAmount": 100000.00,
      "pointsRedeemedAmount": 50000.00,
      "vatAmount": 0.00,
      "totalAmount": 700000.00,
      "paymentMethod": "VNPAY",
      "paymentStatus": "PAID",
      "paidAt": "2026-10-20T14:05:00Z",
      "receiptPdfUrl": "https://assets.mldvietnam.vn/invoices/HD-MLD-20261020-055.pdf"
    }
  ]
}
```

---

### F7. Giới thiệu bạn bè nhận thưởng 2 chiều (Referral)
* **Màn hình:** `F07_ReferralRewards`
* **Method:** `GET`
* **URL:** `/api/v1/referrals/my-code`
* **Auth:** Bearer Token
* **JSON trả về (200 OK - Ánh xạ `referrals`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thông tin mã giới thiệu cá nhân",
  "data": {
    "referralCode": "MLD9941",
    "shareUrl": "https://mldvietnam.vn/join?ref=MLD9941",
    "totalReferees": 12,
    "totalPointsEarned": 1200,
    "rewardPerInvite": "100 điểm thưởng + Voucher 50.000đ cho cả 2 người"
  }
}
```

---

### F8. Thiết lập cài đặt ứng dụng
* **Màn hình:** `F08_Settings`
* **Method:** `GET` & `PUT`
* **URL:** `/api/v1/user-settings`
* **Auth:** Bearer Token
* **Body gửi lên (PUT - Ánh xạ bảng `user_settings`):**
```json
{
  "biometric_enabled": true,
  "appointment_reminder": true,
  "promotion_notify": false,
  "system_notify": true,
  "language": "vi"
}
```
* **JSON trả về (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Cập nhật cài đặt ứng dụng thành công",
  "data": {
    "biometricEnabled": true,
    "appointmentReminder": true,
    "promotionNotify": false,
    "systemNotify": true,
    "language": "vi"
  }
}
```

---

## 3. BẢNG TỔNG HỢP MÃ LỖI CHUẨN TOÀN HỆ THỐNG (ERROR CODES)

| Mã lỗi HTTP | Mã định danh hệ thống | Ý nghĩa & Tình huống xảy ra |
| :---: | :--- | :--- |
| **400** | `INVALID_INPUT_DATA` | Thiếu trường bắt buộc hoặc dữ liệu sai định dạng (số điện thoại, ngày tháng...). |
| **401** | `UNAUTHORIZED_TOKEN_EXPIRED` | Phiên đăng nhập hết hạn hoặc chưa truyền JWT Bearer Token. |
| **403** | `FORBIDDEN_TIER_RESTRICTION` | Tài khoản chưa đạt hạng hội viên VIP hoặc không có quyền truy cập. |
| **404** | `RESOURCE_NOT_FOUND` | Không tìm thấy dịch vụ, chi nhánh, kỹ thuật viên hoặc lịch hẹn tương ứng. |
| **409** | `SLOT_ALREADY_BOOKED` | Khung giờ kỹ thuật viên vừa chọn đã có khách khác đặt hoặc đang bị giữ chỗ. |
| **422** | `INSUFFICIENT_POINTS_BALANCE` | Số điểm thưởng trong ví của người dùng không đủ để trừ trên hóa đơn. |
| **500** | `INTERNAL_SERVER_ERROR` | Lỗi máy chủ cơ sở dữ liệu hoặc cổng thanh toán bên thứ ba (VNPay / MoMo). |

---

*Tài liệu được khởi tạo và kiểm duyệt tự động dựa trên cấu trúc bảng của `database/schema.sql` và thiết kế Flutter Mobile App MLD Vietnam.*
