# Hien trang va khoang trong

Cap nhat: 2026-10-14.

## Da co

- PostgreSQL/Supabase va Prisma migration.
- Bang User, Branch, Service, Specialist, WorkSchedule, Booking, Course,
  CourseEnrollment, Notification.
- API doc dich vu, chi nhanh, chuyen vien, lich hen, khoa hoc va notification.
- Booking co unique `specialistId + scheduledAt` o muc DB.
- Web Admin co project rieng va doc du lieu tong hop qua `/admin/bootstrap`.
- Backend production Render da tung deploy thanh cong.

## Chua du de ban giao production

- Auth dang la demo: token/JWT, refresh token, Zalo verification, OTP provider va
  Admin RBAC chua hoan tat; Backend con hardcode user trong mot so endpoint.
- Response chua theo envelope thong nhat; Flutter dang ky vong API khac Backend.
- Booking conflict moi bao ve cung timestamp, chua bao ve khoang thoi luong day du.
- Admin chu yeu doc du lieu; CRUD, phan quyen va audit chua day du.
- Course chua co schema bai hoc, tai lieu, lich hoc, diem danh, progress, quiz attempt.
- Records/membership/voucher/receipt con mock hoac chua co bang day du.
- Upload avatar/storage chua co.
- Notification chua co worker/push provider va event pipeline day du.
- Payment chua trien khai; day la chu dich hoan lai den khi nghiep vu duoc chot.
- Flutter dang dung nhieu sample data va base URL cu.

## Cong viec uu tien de ba client dong bo

1. Chot auth + `AuthIdentity` + JWT/RBAC; bo tat ca hardcode user.
2. Chuan hoa response/error envelope va API versioning.
3. Hoan thien availability + transaction chong trung lich.
4. Noi Flutter vao API, bo sample data tung module.
5. Hoan thien Admin CRUD cho branch/service/specialist/schedule/course/user.
6. Them schema hoc vien: lesson, material, schedule, attendance, progress, quiz.
7. Them storage avatar va notification event pipeline.
8. Viet integration/E2E test, tao staging data va release checklist.

Cho den khi 8 muc tren dat, du an la baseline tich hop, chua phai ban production
hoan chinh. Cac man Figma co the day du ve giao dien nhung khong thay the logic API.

