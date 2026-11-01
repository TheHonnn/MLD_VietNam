# Hoàn thiện Mini App theo mobile — 01/11/2026

Phạm vi: Mini App và BE trong `minizalo`. Không sửa mobile, Admin, Website hay cấu trúc/dữ liệu database chung. Thanh toán tiếp tục ngoài phạm vi.

## Các luồng đã sửa và kiểm chứng

- Bài học khóa trước khi Admin duyệt; sau duyệt tiếp tục kiểm tra thứ tự bài tại BE. Không vượt khóa bằng API nội dung, tài liệu, playback, heartbeat, tiến độ hoặc quiz. Tiến độ được xác nhận thực mới mở bài kế tiếp.
- Đọc xong cập nhật danh sách bài ngay; video không bị đóng giữa lúc phát khi đạt ngưỡng hoàn thành. Sau khi đóng bài, quyền mở bài tiếp theo được đọc lại từ BE.
- Lịch cá nhân có phạm vi riêng, tách khỏi danh sách công việc theo quyền nhân viên/chi nhánh. Quyền thao tác nhân viên chỉ hiển thị trong luồng công việc.
- Sửa đích thông báo hỗ trợ, khóa học, lịch học và giấy chứng nhận; bổ sung đường dẫn banner đến các màn con. Banner phụ thuộc đối tượng không dùng cache công khai chung giữa các tài khoản.
- Đăng ký học lưu thông tin học viên, cơ sở và nhóm học viên vào các trường có sẵn, luôn chờ duyệt. BE kiểm tra chi nhánh/lớp, dữ liệu liên hệ và chủ sở hữu. Không tự mở quyền học hay tạo thanh toán.
- Bổ sung email/địa chỉ và tóm tắt trước khi đặt lịch; dữ liệu liên hệ bổ sung được lưu trong ghi chú lịch để Admin đọc được. Kết quả đặt lịch phụ thuộc phản hồi thật của BE.
- Hồ sơ cá nhân có liên hệ khẩn cấp, chi nhánh ưu tiên và xác nhận đăng xuất; dùng các trường đã có. Các mục khóa học/lịch học/liệu trình mở đúng dữ liệu riêng, không đưa về catalog thay cho dữ liệu trống.
- Bổ sung cộng đồng, chọn chi nhánh dạng bảng, chuyên viên gợi ý từ phân công thật, truy cập lịch hẹn từ Dịch vụ, tìm kiếm theo nhu cầu và bộ lọc loại thông báo.
- Quiz hiển thị từng câu, điều hướng trước/sau, thang điểm /10. Đề thi không chứa đáp án đúng; phần xem lại chỉ nhận dữ liệu đáp án được BE cho phép sau khi đạt hoặc hết lượt. Không suy diễn đáp án từ FE.
- Tài liệu PDF và danh mục dùng nội dung Admin, kiểm tra quyền theo từng yêu cầu. Một đăng ký khác không được dùng để tự vượt trạng thái thu hồi mặc định của thư viện tài liệu.
- Đồng bộ thêm màu nền, màu giá, kiểu chữ, thẻ, tiến trình lịch và icon. Giữ các bộ lọc/quản lý phiên/công việc bổ sung đang có ích.

## Hoãn theo lựa chọn của người dùng

Không thêm trường database. Đã gỡ migration 017 và phần tích hợp nghề nghiệp, theme sáng/tối, công tắc riêng thông báo liệu trình/khóa học. Các mục đó không xuất hiện như chức năng lưu được. BE từ chối rõ yêu cầu lưu cũ cho các trường bị hoãn, không trả thành công giả. Không có migration được áp dụng vào database chung trong phiên làm việc này.

## Kiểm chứng

- Toàn bộ regression BE: **300/300 qua**; sau thay đổi cuối, nhóm kiểm tra trực tiếp quyền học, trường hoãn, adapter và điểm danh: **16/16 qua**.
- FE: **27/27 qua**, TypeScript qua, production build qua và artifact không chứa development client. Audit bản dịch không thiếu chuỗi/template.
- Browser kiểm thử entry point thật trên Chromium và WebKit: 320×640, 390×844. Có kiểm tra bài kế tiếp mở ngay sau hoàn thành, không cần reload thủ công.
- HTTP/SDK và thao tác Admin trong browser là fixture; PostgreSQL test độc lập. Không dùng kết quả này để khẳng định Zalo native/production đã được nghiệm thu hoặc đo được chính xác 95% giao diện.

Chưa push Git hoặc deploy Render/Zalo. Cần deploy BE đáp ứng `mobile-parity-v2` trước bản Mini App tương ứng, rồi nghiệm thu Zalo thật với Admin thật. Phần nghiệp vụ và giao diện sửa xong trong phạm vi kiểm thử nêu trên; các mục hoãn vẫn được ghi rõ, không tính là đã triển khai.
