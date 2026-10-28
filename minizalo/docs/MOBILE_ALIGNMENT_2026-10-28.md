# Mini App: nối lại dữ liệu và luồng theo mobile — 28/10/2026

## Phạm vi

Chỉ thay đổi Mini App và BE trong `minizalo`. Đọc mobile, Admin và schema chung để đối chiếu; không sửa ba phần này, không thay đổi dữ liệu hoặc cấu trúc database dùng chung. Thanh toán không thuộc đợt này.

## Kết quả triển khai

- Khôi phục đường đi từ giao diện đang chạy đến API xác thực và dữ liệu thật. Gỡ data layer chứa danh sách dự phòng, đăng nhập bằng số điện thoại nhập tay và lưu lịch/khóa học giả trong local storage.
- Giữ bố cục 5 tab theo mobile: Trang chủ, Dịch vụ, Đào tạo, Tài liệu, Cá nhân. Dùng Montserrat, màu và cấu trúc thẻ theo mobile; bảo toàn safe area và thanh điều hướng.
- Logo là bản sao nguyên vẹn `web-admin/public/logo.png`; tên và ảnh được đồng bộ qua Zalo SDK về hồ sơ thật sau đăng nhập khi người dùng chia sẻ. Kết quả SDK trễ không được ghi vào tài khoản khác.
- Đặt lịch chỉ báo thành công sau khi BE xác nhận. Hết sức chứa/trùng giờ hiển thị lỗi thực và cho chọn lại; retry dùng cơ chế idempotency hiện có. Khi quay lại ứng dụng hoặc sau 30 giây, lịch được đọc lại để phản ánh trạng thái Admin.
- Kiểm tra phù bạch huyết mở bộ chọn dịch vụ thật, sử dụng thời lượng/giờ trống của dịch vụ đã cấu hình. Không tạo hồ sơ khám, giá hay thời lượng mẫu.
- Công cụ nhân viên vẫn kiểm tra quyền và phạm vi chi nhánh tại BE. Khách hàng và nhân viên dùng chung giao diện cá nhân; quyền thao tác công việc không được tự cấp từ FE.
- Khóa học công khai chỉ trả đề cương: tên chương/bài, loại bài, thời lượng, mục tiêu. Video, nội dung và đính kèm bị loại khỏi phản hồi công khai, kể cả bài từng bật free preview.
- Đăng ký khóa học tạo `CONSULTING`; chỉ trạng thái được duyệt `ENROLLED`, `STUDYING`, `GRADUATED` và còn quyền truy cập mới đọc được nội dung học riêng. Dừng học/thu hồi quyền khóa lại nội dung. BE kiểm tra chủ sở hữu, không tin studentId/status từ client.
- Cá nhân → Khóa học của tôi chỉ có đăng ký của tài khoản; chưa đăng ký để trống. Lịch học chỉ lấy lịch lớp trong các đăng ký có quyền học. Không tự điều hướng hai mục này về catalog.
- Cá nhân → Gói liệu trình và Nhật ký trị liệu mở đúng gói/phiếu chăm sóc, không trỏ sang Dịch vụ. Liên kết thông báo giữ mã lịch hẹn/đăng ký/liệu trình tương ứng.
- Tài liệu mặc định đọc kho nội dung Admin dùng chung. PDF mở bằng trình đọc Zalo trên Zalo, liên kết HTTPS trên trình duyệt; lỗi tải có thể thử lại. Không tạo tài liệu mẫu khi database trống.
- Các màn học, tài liệu, lịch, liệu trình và công việc được tách chunk. Không nhúng Vite/HMR vào bản production.

## Kiểm chứng

- Kết quả cuối: **295/295 kiểm thử BE**, **25/25 kiểm thử FE** qua; TypeScript và production build qua; audit bản dịch không thiếu chuỗi. Browser test qua cả Chromium/WebKit ở cả hai kích thước nêu dưới.
- TypeScript FE/BE, production build và kiểm tra artifact.
- Regression BE bằng PostgreSQL fixture độc lập: quyền truy cập, đăng ký/duyệt học, hồ sơ, lịch, tài nguyên giường/chuyên viên, thông báo, tài liệu, tiến độ và quiz. Không ghi vào database chung.
- Unit tests FE: Zalo, đổi tài khoản, đồng bộ hồ sơ, adapter dữ liệu null, catalog, locale và contract triển khai.
- Browser test chạy **entry point thật**: `scripts/check-connected-app-browser.mjs`, Chromium và WebKit ở 320×640 và 390×844. Kiểm tra khóa học/lịch học trống, đề cương khóa, đăng ký chờ duyệt, duyệt mới học, PDF Admin, đặt lịch thất bại không báo thành công và cập nhật trạng thái lịch.
- SDK, HTTP và thao tác Admin trong browser test là fixture có kiểm soát. Đây không phải kiểm thử Zalo native hoặc thao tác Admin trên production.

## Triển khai và nghiệm thu thực tế

BE health bổ sung `approval-gated-learning-v1`; kiểm tra triển khai FE yêu cầu capability này. Cần triển khai BE trước bản Mini App tương ứng để tránh FE mới chạy với API còn trả nội dung preview cũ.

Chưa tự push Git, deploy Render hoặc tạo phiên bản Zalo. Sau triển khai cần nghiệm thu bằng tài khoản Zalo thật: chia sẻ/từ chối thông tin, ảnh/tên, một lịch có đủ nguồn lực và một đăng ký được Admin duyệt, tải PDF thực, safe area trên iPhone/Android. Không kết luận tỷ lệ giống 95% hoặc không còn lỗi dựa trên fixture; cần đối chiếu ảnh hai ứng dụng trên cùng thiết bị.
