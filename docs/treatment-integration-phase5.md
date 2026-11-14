# Tích hợp liệu trình — giai đoạn 5

## Đã nối và kiểm thử

- POS bán gói: giữ transaction kích hoạt gói và hóa đơn đã thanh toán, cùng cơ chế request ID hiện có.
- Check-in gói: kiểm tra chủ sở hữu, dịch vụ, hạn dùng, số buổi, gói đã liên kết và khoản phải thu bằng 0; ghi lại mã gói trên lịch hẹn để các trang dùng cùng liên kết.
- Khởi tạo nhật ký: API `POST /admin/treatment/packages/:id/start-draft` nhận bookingId, suy ra khách/chuyên viên/phòng/ngày từ booking; cấp số buổi còn hiệu lực từ backend.
- Retry cùng booking trả lại nhật ký cũ, không tạo thêm. Frontend tiếp tục bằng command lưu nháp; không báo hoàn tất buổi.
- Không cho đóng chuyên môn của lịch dùng gói khi journal còn draft/submitted.
- Confirm buổi dùng gói: tiêu thụ lượt, ghi tác động, hoàn tất ca được gói chi trả. Không tự thu tiền cho dịch vụ ngoài gói.
- Hoàn tác giữ nhật ký lịch sử. Buổi còn trống có thể được ghi nhận lại trên lịch hẹn mới.
- Ảnh trước/sau được lưu qua command nháp thay vì bị bỏ qua khi nối API mới.

## Migration

`033_treatment_replacement_sessions.sql` thay chỉ mục duy nhất trên (gói, số buổi) bằng chỉ mục chỉ xét nhật ký chưa reverse. Giữ chỉ mục booking duy nhất: mỗi lịch vẫn có tối đa một nhật ký. Script startup đã thêm migration 033 sau 032.

Migration 033 chưa chạy production trong giai đoạn phát triển này. Không deploy code mới trước khi schema tương ứng sẵn sàng. Nếu rollback ứng dụng, không khôi phục chỉ mục cũ khi đã có nhật ký thay thế cùng số buổi: cần giữ lịch sử và kiểm tra dữ liệu trước.

## Chưa nghiệm thu toàn bộ

- Tạo lịch từ màn hình cũ vẫn dùng bookingService/luồng kiểm tra sức chứa hiện tại; chưa chuyển toàn bộ thao tác tạo lịch sang một transaction backend riêng.
- Chưa kiểm thử giao diện bằng trình duyệt với tài khoản thật vì công cụ kết nối trình duyệt chưa hoạt động.
- Mobile không thay đổi. Cần phối hợp kiểm tra hiển thị snapshot hướng dẫn và trạng thái buổi trên mobile.
- Các thay đổi chưa commit/push/deploy.
