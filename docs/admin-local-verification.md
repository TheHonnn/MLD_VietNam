# Kiểm chứng giao diện quản trị trên máy local

Chạy từ thư mục `backend`:

```powershell
npm run test:browser
```

Lệnh build backend rồi tự khởi động Vite và Nest trên loopback. Cần cài dependencies của cả `backend` và `web-admin`, cùng Google Chrome. Có thể đặt `CHROME_PATH` để chọn trình duyệt và `ADMIN_BROWSER_OUTPUT_DIR` để chọn nơi lưu bằng chứng.

## Dữ liệu và dịch vụ

- Database PGlite nằm trong bộ nhớ, được tạo từ `database/schema.sql` rồi hủy sau khi chạy.
- Tài khoản quản trị, chi nhánh, nhân viên, khóa học và lớp học đều là dữ liệu kiểm thử.
- Đăng nhập Supabase được giả lập trong trình duyệt. Các request Supabase bị chặn và trả dữ liệu kiểm thử; không được gửi ra dịch vụ thật.
- API quản trị được chuyển đến Nest local và dùng PGlite. Email, SMS, Redis và Supabase phía Nest được thay bằng provider giả lập.

## Những gì lệnh kiểm tra

- Đăng nhập và dashboard; cấu trúc menu, đường dẫn và cuộn sidebar độc lập.
- Hiển thị đúng tên nhân viên từ tài khoản đã tạo.
- Mở các biểu mẫu bài học, bài kiểm tra và câu hỏi theo giao diện hiện tại.
- 51 đường dẫn phân hệ: 46 trang danh sách quản trị và 5 trang riêng (chi nhánh, phòng, chứng nhận, dịch vụ, gói liệu trình). Năm trang riêng chỉ được kiểm tra chuyển trang và hiển thị tiêu đề.
- Mở biểu mẫu tạo mới của các trang quản trị cho phép ghi. Các màn hình ghi danh, điểm danh và bảng điểm được chuyển sang bộ lọc toàn bộ lớp.
- Thêm, sửa, xóa một danh mục dịch vụ qua giao diện và kiểm tra kết quả xóa trong database.
- Không có lỗi JavaScript trên trang; các trang danh sách quản trị phải có phản hồi API local thành công.

Kết quả thành công được lưu tại `.local-archive/admin-review/result.json`, cùng ảnh chụp. Nếu lỗi, kiểm tra `failure.png`, `failure.html` và `requests.json` trong cùng thư mục. Các tệp lỗi có thể thuộc lần chạy trước; đối chiếu thời gian với `checkedAt` của kết quả thành công.

## Giới hạn của kết quả

Đây là kiểm thử tích hợp local cho web quản trị. Kết quả không chứng minh mọi thao tác nghiệp vụ trên mọi biểu mẫu đều đúng, cũng không xác minh production, Supabase RLS thực tế, gửi email/SMS/Zalo, thanh toán bên ngoài hoặc ứng dụng mobile.

Chạy riêng test frontend bằng `npm test` trong `web-admin`, test backend bằng `npm test` trong `backend`. Test hồi quy `web-admin/test/admin-cancellation.test.mjs` kiểm tra rằng hủy request khi rời màn hình không làm các request sau chuyển nguồn dữ liệu.
