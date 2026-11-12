# Luồng khách hàng đăng ký và sử dụng liệu trình

## Nguyên tắc nghiệp vụ

- Yêu cầu trên app không tự tạo `user_packages`. Hồ sơ liệu trình chỉ được kích hoạt sau khi admin xác nhận khách, gói, giá và POS ghi nhận thanh toán thành công.
- Một lần thu tiền gói phải tạo đồng thời: hóa đơn `PAID`, `user_packages`, liên kết `invoices.user_package_id`, chi tiết hóa đơn, ca thu ngân và hoa hồng (nếu có).
- Một lịch dùng gói đã mua có giá phải thu bằng 0, phương thức `MEMBERSHIP_WALLET`, và mang mã `user_package_id` trong ghi chú đồng bộ để admin chọn đúng gói.
- Số buổi chỉ tăng sau khi admin hoàn tất buổi và lưu nhật ký điều trị; thao tác đặt lịch không trừ buổi.

## Luồng A — Khách chưa có liệu trình

1. Khách mở **Gói liệu trình của tôi** trên app.
2. Trạng thái rỗng hiển thị **Đăng ký tư vấn liệu trình** thay cho lời kêu gọi mua gói trực tiếp.
3. Khách chọn dịch vụ, chi nhánh, ngày giờ và gửi yêu cầu lịch hẹn.
4. App tạo booking `PENDING`, `UNPAID`; admin nhận lịch tại màn hình điều phối.
5. Admin liên hệ/xác nhận, thực hiện sàng lọc và tư vấn gói phù hợp.
6. Admin mở **Quản lý liệu trình → Đăng ký gói mới**:
   - Bước 1: tìm và chọn đúng hồ sơ khách.
   - Bước 2: chọn gói đang mở bán, xem số buổi, thời hạn, giá và ưu đãi.
   - Bước 3: rà soát khách + gói + số tiền trước khi chuyển POS.
7. POS khóa khách và gói đã chọn, dùng đúng giá ưu đãi cấu hình; không cho nhập chiết khấu thủ công trong luồng này.
8. Khi thanh toán thành công, backend tạo giao dịch nguyên tử và trả về `userPackageId`.
9. Biên lai hiển thị **Liệu trình đã được kích hoạt** và hai lựa chọn:
   - **Đặt buổi đầu tiên**: về hồ sơ liệu trình, tự chọn đúng gói và mở form đặt lịch.
   - **Để sau**: kết thúc tại biên lai; khách có thể đặt từ app.
10. App tải lại `/treatment/packages/my` và hiển thị gói vừa kích hoạt.

## Luồng B — Khách đặt buổi tiếp theo từ app

1. Khách mở một gói `ACTIVE`, còn buổi và chưa hết hạn.
2. Bấm **Đặt buổi tiếp theo**.
3. App truyền `userPackageId` và tên gói vào màn hình đặt lịch.
4. Lịch được gửi với:
   - `payment_method = MEMBERSHIP_WALLET`;
   - `payment_status = UNPAID` cho đến khi admin/server đối chiếu quyền sử dụng gói;
   - `base_total = final_price = 0`;
   - ghi chú có `[Gói liệu trình: ... | user_package_id=...]`.
5. Admin thấy lịch là nguồn `TREATMENT_PACKAGE`, trạng thái **Chờ xác nhận gói** và không tự động thu lại tiền.
6. Khi mở hồ sơ hoàn tất ca, admin tải các gói còn hiệu lực của khách và ưu tiên chính xác `user_package_id` từ app.
7. Admin ghi tình trạng trước/sau, vùng trị liệu, mức áp lực và lời dặn.
8. Backend tạo nhật ký gắn với booking + gói, sau đó cập nhật `completed_sessions`.
9. App tải lại gói/nhật ký để hiển thị số buổi đã dùng, số buổi còn lại và nội dung chăm sóc sau buổi.

## Trạng thái và quyền thay đổi

| Đối tượng | Trạng thái chính | Ai thay đổi |
|---|---|---|
| Booking tư vấn | `PENDING → CONFIRMED → IN_SERVICE → COMPLETED` | Admin/lễ tân/KTV |
| Thanh toán gói | chưa tồn tại → hóa đơn `PAID` | POS workflow |
| Liệu trình khách | chưa tồn tại → `ACTIVE → COMPLETED/EXPIRED` | POS kích hoạt; nhật ký cập nhật tiến độ |
| Booking dùng gói | `PENDING`, đã được gói chi trả | Khách tạo; admin xác nhận/hoàn tất |
| Nhật ký buổi | chưa có → bản ghi theo số buổi | Admin/KTV khi hoàn tất |

## Quy tắc chống sai lệch

- Không tạo gói thủ công từ trang tài nguyên admin.
- Không trừ buổi khi khách mới đặt hoặc hủy lịch.
- Không cho luồng đăng ký gói rơi về giỏ hàng tổng quát vì sẽ mất liên kết hóa đơn–liệu trình.
- Không dùng giá từ trình duyệt làm nguồn tin cậy; backend tính lại giá gói và VAT.
- Không tự chọn gói đầu tiên nếu app đã gửi `user_package_id` hợp lệ.
- Không hiển thị giá mặc định 500.000đ cho booking dùng gói có giá 0.

## Kiểm thử bàn giao

- Frontend unit tests: 16/16 đạt.
- Backend admin tests: 32/32 đạt.
- Browser E2E: `packageRegistrationHandoff` đạt cùng kiểm tra hóa đơn, ca thu ngân và báo cáo doanh thu.
- Frontend/backend production build: đạt.
- Flutter SDK không có trong môi trường hiện tại; cần chạy `flutter analyze` và test widget/mobile trong CI hoặc máy có Flutter trước khi phát hành app.
