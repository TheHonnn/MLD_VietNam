# Quy tac nghiep vu v1

## Dat va doi lich

Backend la noi duy nhat quyet dinh slot co hop le hay khong. Client chi hien thi.

1. Branch, service va specialist phai active.
2. Service phai duoc mo tai branch; specialist phai thuoc branch va lam service do.
3. Slot phai nam trong `WorkSchedule`, khong o qua khu va du thoi luong dich vu.
4. Khong trung specialist trong khoang
   `[scheduledAt, scheduledAt + durationMinutes)`.
5. Khong cho cung user co hai booking dang hoat dong bi trung gio.
6. Trang thai gay conflict: `PENDING`, `CONFIRMED`.
7. `CANCELLED`, `COMPLETED`, `NO_SHOW` khong giu slot.
8. Tao/doi lich chay trong transaction. DB constraint la lop bao ve cuoi cung.
9. Conflict tra HTTP `409` va code `BOOKING_SLOT_CONFLICT`.
10. Doi/huy lich phai ghi audit va tao notification.

## Khoa hoc

- Mot user chi co mot enrollment hoat dong tren moi course.
- Enrollment phai lien ket `userId`, `courseId`, status va thong tin thanh toan.
- Bai hoc, tai lieu, lich hoc, diem danh, tien do, quiz attempt va ket qua la bang
  backend; khong luu duy nhat o local storage.
- Quiz cham diem tren Backend; client khong gui tong diem tu tinh.
- Admin thay doi khoa/bai hoc phai co audit log va khong lam mat progress cu.

## Ho so va avatar

- Profile luu qua Backend va lay lai tu `/auth/me` khi mo app.
- Avatar: client xin upload URL, upload file vao storage, Backend luu public/signed URL.
- Kiem tra MIME, kich thuoc, dung luong; khong nhan base64 dai trong profile JSON.
- So dien thoai da xac minh khong duoc sua nhu text thuong.

## Thong bao

- Event tao notification: dat/doi/huy/xac nhan lich; dang ky khoa; lich hoc;
  ket qua quiz; thanh toan; thay doi hang hoi vien.
- Notification luu DB truoc, push/Zalo/SMS la kenh phat sau.
- Doc/chua doc phai dong bo server. Push that bai khong duoc mat notification trong app.
- Moi event co `entityId`, `type`, `createdAt`; bam vao mo dung man hinh dich.

## Thanh toan

Thanh toan de giai doan sau la hop ly, nhung schema phai du cho `Payment`,
`PaymentAttempt`, `Refund` va webhook idempotency. Khong danh dau `PAID` tu client;
chi Backend xu ly callback da xac thuc moi duoc doi trang thai.

