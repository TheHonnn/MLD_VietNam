# Luồng đặt và hoàn thành dịch vụ

Ngày chốt luồng: 10/11/2026.

## Trạng thái chuẩn

`PENDING → CONFIRMED → CHECKED_IN → IN_SERVICE → COMPLETED`

- `PENDING`: khách vừa gửi yêu cầu; admin phải kiểm tra chi nhánh, dịch vụ, ngày giờ và chuyên viên.
- `CONFIRMED`: lịch đã được cơ sở cam kết phục vụ. Chỉ trạng thái này mới được tiếp đón hoặc đánh dấu khách không đến.
- `CHECKED_IN`: lễ tân đã xác nhận khách có mặt. Với buổi thuộc gói, backend đồng thời xác minh gói đúng khách, đúng dịch vụ, còn buổi và còn hạn.
- `IN_SERVICE`: chuyên viên đã bắt đầu thực hiện. Hoàn tất chuyên môn yêu cầu có hồ sơ buổi chăm sóc.
- `COMPLETED`: hồ sơ chuyên môn hoàn tất và nghĩa vụ thanh toán đã hoàn tất.

Nhánh kết thúc sớm:

- `PENDING/CONFIRMED → CANCELLED`: bắt buộc có lý do; không được hủy sau check-in.
- `CONFIRMED → NO_SHOW`: bắt buộc có lý do; dùng cho lịch quá hạn khách không đến.

## Vai trò của app khách hàng

1. Khách chọn dịch vụ, cơ sở, thời gian, chuyên viên và gửi yêu cầu.
2. App hiển thị `Chờ xác nhận`; việc gửi yêu cầu chưa đồng nghĩa cơ sở đã nhận phục vụ.
3. Sau khi admin xác nhận, app hiển thị `Đã xác nhận`.
4. Khi khách đến, app lần lượt hiển thị `Đã tiếp đón`, `Đang thực hiện`, rồi `Hoàn tất`.
5. Khách chỉ được tự hủy khi lịch còn `PENDING` hoặc `CONFIRMED`.
6. `NO_SHOW` được hiển thị riêng, không bị đánh đồng với hủy chủ động.

## Vai trò của admin

### 1. Duyệt yêu cầu

Admin mở lịch tại màn Điều phối, kiểm tra dữ liệu và bấm **Xác nhận lịch**. Không được bắt đầu dịch vụ trực tiếp từ `PENDING`.

### 2. Tiếp đón

Khi khách có mặt, lễ tân bấm **Khách đã đến**. Hệ thống chuyển sang `CHECKED_IN`, lưu thời điểm và người tiếp đón.

Nếu lịch dùng gói liệu trình (`MEMBERSHIP_WALLET`), backend phải xác minh `userPackageId`. Check-in chỉ đánh dấu buổi được gói bảo đảm; số buổi chỉ bị trừ khi hồ sơ chuyên môn được lưu thành công.

### 3. Bắt đầu phục vụ

Từ `CHECKED_IN`, admin bấm **Bắt đầu dịch vụ**. Hệ thống chuyển sang `IN_SERVICE`, đặt `session_status=IN_SERVICE` và ghi thời điểm bắt đầu.

### 4. Hoàn tất chuyên môn

Chuyên viên lưu hồ sơ buổi chăm sóc, vật tư và kết quả. Sau đó thao tác `finish-service` đặt `session_status=COMPLETED`.

- Nếu lịch đã được thanh toán hoặc được gói hợp lệ chi trả, lịch tự chuyển `COMPLETED`.
- Nếu chưa thanh toán, lịch vẫn ở `IN_SERVICE` nhưng giao diện ghi rõ **Chờ thanh toán** và đưa lễ tân sang POS.

### 5. Thu tiền và đóng dịch vụ

POS thu đúng lịch và ghi hóa đơn. Khi thanh toán thành công, backend tự chuyển lịch đã hoàn tất chuyên môn sang `COMPLETED`, lưu người và thời điểm check-out. Không cần thao tác đóng ca dịch vụ thủ công lần hai.

## Các ràng buộc backend

- Mọi chuyển trạng thái đi qua endpoint hành động admin; màn Điều phối không cập nhật trực tiếp trạng thái booking.
- Không thể bỏ qua bước check-in.
- Không thể hoàn tất nếu chưa có `treatment_journal`.
- Không thể check-out nếu chuyên môn chưa hoàn tất hoặc chưa thanh toán.
- Thanh toán sau khi chuyên môn hoàn tất tự đóng booking trong cùng giao dịch.
- Request thu tiền giữ tính idempotent để gửi lại không tạo hóa đơn hoặc trừ tiền hai lần.
- Schema khởi tạo mới và migration gốc đều có `bookings.session_status`.

## Kiểm thử đã thực hiện

- Frontend unit tests: 16/16 đạt.
- Backend full tests: 55/55 đạt.
- Backend workflow tests tập trung: 29/29 đạt, gồm dịch vụ thường và buổi dùng gói.
- Frontend production build: đạt.
- Backend production build: đạt.
- Flutter SDK không có trong máy chạy hiện tại nên chưa thể chạy `flutter analyze`; các nhánh enum trên mobile đã được rà tĩnh và cập nhật đầy đủ.
