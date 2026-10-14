# API contract v1

Base URL: `{API_BASE_URL}/api`. Tat ca JSON dung UTF-8.

## Header

```http
Authorization: Bearer <MLD_ACCESS_TOKEN>
Content-Type: application/json
X-Request-Id: <uuid optional>
```

API dang nhap va health la public. Cac API con lai phai xac thuc truoc production.

## Envelope chuan

Thanh cong:

```json
{"data": {}, "meta": {"requestId": "..."}}
```

Danh sach:

```json
{"data": [], "meta": {"page": 1, "limit": 20, "total": 0}}
```

Loi:

```json
{
  "error": {
    "code": "BOOKING_SLOT_CONFLICT",
    "message": "Khung gio nay vua duoc dat.",
    "fields": {"scheduledAt": "Da ton tai lich trung"},
    "requestId": "..."
  }
}
```

Khong parse `message` de xu ly logic. Client xu ly theo `error.code`.

## Enum khoa

- `UserRole`: `CUSTOMER`, `STUDENT`, `SPECIALIST`, `BRANCH_STAFF`, `ADMIN`, `SUPER_ADMIN`.
- `BookingStatus`: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- `EnrollmentStatus`: `PENDING`, `CONFIRMED`, `ACTIVE`, `COMPLETED`, `CANCELLED`.
- `PaymentStatus`: `UNPAID`, `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
- `NotificationType`: `BOOKING`, `COURSE`, `PAYMENT`, `MEMBERSHIP`, `SYSTEM`.

Khong them enum rieng trong client. Neu them gia tri, cap nhat file nay va ca 3 client
trong cung dot release.

## Endpoint v1 bat buoc

| Method | Path | Quyen | Trang thai hien tai |
|---|---|---|---|
| GET | `/health` | Public | Co |
| POST | `/auth/send-otp` | Public | Co, dang mock |
| POST | `/auth/verify-otp` | Public | Co, auth chua production |
| POST | `/auth/zalo` | Public | Thieu |
| POST | `/auth/admin/login` | Public | Thieu |
| POST | `/auth/refresh` | Public | Thieu |
| GET | `/auth/me` | User | Co, con hardcode user |
| PUT | `/auth/profile` | User | Co, con hardcode user |
| GET | `/branches` | User | Co |
| GET | `/services` | User | Co |
| GET | `/services/:id` | User | Co |
| GET | `/doctors` | User | Co |
| GET | `/availability` | User | Thieu |
| GET | `/bookings` | User | Co, chua tach theo token |
| POST | `/bookings` | User | Co |
| PATCH | `/bookings/:id/reschedule` | User | Co |
| PATCH | `/bookings/:id/cancel` | User | Co |
| GET | `/courses` | User | Co |
| GET | `/courses/:id` | User | Co |
| GET/POST | `/course-enrollments` | User | Co |
| GET | `/courses/:id/lessons` | Student | Thieu |
| POST | `/lessons/:id/progress` | Student | Thieu |
| POST | `/courses/:id/quiz/submit` | Student | Co, dang mock |
| GET | `/records` | User | Co, dang mock |
| GET | `/notifications` | User | Co |
| PATCH | `/notifications/:id/read` | User | Co |
| GET | `/admin/bootstrap` | Admin | Co, chua RBAC |
| CRUD | `/admin/branches` | Admin | Thieu |
| CRUD | `/admin/services` | Admin | Thieu |
| CRUD | `/admin/specialists` | Admin | Thieu |
| CRUD | `/admin/courses` | Admin | Thieu |
| PATCH | `/admin/bookings/:id/status` | Staff | Thieu |

## Ma loi bat buoc

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`BOOKING_SLOT_CONFLICT`, `SPECIALIST_UNAVAILABLE`, `BRANCH_SERVICE_UNAVAILABLE`,
`BOOKING_NOT_CHANGEABLE`, `ALREADY_ENROLLED`, `COURSE_NOT_OPEN`,
`PAYMENT_REQUIRED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

