# Đối chiếu Admin, database và Mini App ngày 25/10/2026

## Phạm vi và nguồn đối chiếu

Chỉ sửa trong `minizalo/`. Không sửa `database/`, `web-admin/`, Website hoặc BE ở thư mục gốc. Không chạy migration, thêm dữ liệu thật, đổi vai trò hay triển khai lên server.

Đã đối chiếu `database/schema.sql`, `web-admin/src/admin/Auth.tsx`, `web-admin/src/admin/api.ts`, `web-admin/src/services/staff.service.ts` và `customer.service.ts` với auth, staff booking, dữ liệu và form Mini App. Admin xác thực bằng `users.role`; có bản ghi `staff_profiles` riêng không tự biến một tài khoản CUSTOMER thành nhân viên. Không suy luận quyền từ tên, chức danh hoặc chỉ việc có mặt trong danh sách.

## Các lỗi đã vá

1. Đối chiếu số điện thoại đăng nhập chỉ nhận dạng viết liền, trong khi Admin giữ định dạng nhập. BE nhận các dấu cách/chấm/gạch ngang/ngoặc ở số điện thoại, vẫn giữ nguyên số gốc và ID trong database. Chỉ dùng số đã được Zalo xác minh để đăng nhập; không tin số do client tự khai.
2. Tìm khách, chọn khách cũ và tạo lịch hộ sử dụng cùng cách đối chiếu. Hồ sơ có cùng số sau chuẩn hóa bị chặn để quản trị viên xử lý, không tùy chọn một tài khoản và không tạo thêm khách trùng.
3. FE từng khóa nút đặt lịch khi khách thật lấy từ Admin có số dạng `0900 000 001`. Form liên hệ và thông tin từng người trong nhóm nay thống nhất với BE. Không loại chữ hay mã máy lẻ để đoán số.
4. Trước đây tài khoản không tồn tại và tài khoản có vai trò không phù hợp đều có cùng thông báo. Nay có ba mã riêng: `STAFF_ACCOUNT_NOT_FOUND`, `STAFF_ACCESS_REQUIRED`, `STAFF_PROFILE_INACTIVE`. Không đưa số điện thoại, token hay hồ sơ nhân viên vào lỗi trả về.
5. Bước kiểm tra build quét cả các chunk tải sau, chặn mã Vite HMR/development trong bản phát hành. Không tắt console, nuốt lỗi WebSocket hoặc thay đổi SDK của Zalo.

## Phân quyền vẫn phải dựa vào dữ liệu thật

- Số điện thoại được Zalo xác minh phải khớp đúng một `users.phone`.
- Tài khoản phải hoạt động và có vai trò nhân viên được phép trong `users.role`.
- Nhân viên ngoài ADMIN/SUPER_ADMIN phải có hồ sơ nhân viên hoạt động, chưa nghỉ việc, thuộc chi nhánh hoạt động.
- Khách hàng không được cấp quyền nhân viên bằng cách đổi audience trên client. Vai trò và hồ sơ bị thu hồi vẫn bị BE từ chối dù JWT chưa hết hạn.
- Không có thay đổi nào tự cấp quyền hoặc giả đăng nhập để bỏ thông báo.

## Kiểm chứng

- Bộ kiểm thử cuối `npm.cmd test` ở `minizalo/backend`: **282/282 đạt**, chạy với database PGlite tạm từ schema chung và migrations trong fixture, không ghi database chung.
- Bộ auth frontend `npm.cmd run test:auth`: **9/9 đạt**, bao gồm mã không tìm thấy tài khoản mới bổ sung.
- TypeScript frontend, build BE, build Mini App và kiểm tra manifest đạt. Quét 12 script/HTML trong build không thấy development client.
- Chromium và WebKit: kiểm tra ba viewport 320×640, 390×844, 1366×900; từ chối quyền, hủy kết nối, bấm đúp, storage lỗi và ba loại lỗi tài khoản. Native bridge/API là fixture, không phải kiểm thử trên Zalo/iPhone thật.
- Bộ hồi quy bao phủ lịch nhóm, công suất giường/chuyên viên, đổi/hủy lịch, khóa học, bài học, bài thi, giấy chứng nhận, thông báo, hồ sơ, phân trang và ranh giới người dùng/chi nhánh. Kết quả không đồng nghĩa đã bấm từng nút trên mọi điện thoại.

## Chưa thể xác nhận trên môi trường thật

Kiểm tra chỉ đọc từ máy này chưa kết nối được database đang cấu hình: `PrismaClientInitializationError`, dấu hiệu không truy cập được endpoint. Không in URL hoặc thông tin đăng nhập. Vì vậy chưa xác định được tài khoản cụ thể đang thiếu vai trò, thiếu hồ sơ hay không khớp số trên server.

Ảnh chỉ có `[WebSocket] Error` và stack Eruda do Zalo cung cấp. Mã Mini App không tạo WebSocket trực tiếp; bản production không chứa Vite HMR. Chưa có chứng cứ lỗi này do API nghiệp vụ và chưa khẳng định đã hết lỗi trên iPhone. Cần thử lại bản đã cập nhật trên Zalo thật.

Thay đổi hiện ở local; phải cập nhật cả Mini App và BE `minizalo/backend` lên môi trường tương ứng mới có hiệu lực trên điện thoại. Chưa push Git, deploy Render hoặc xuất bản Zalo trong lượt này.
