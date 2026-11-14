# Nội dung Portal & App — luồng quản trị

Phạm vi: giao diện web admin và dịch vụ dữ liệu dùng bởi web admin. Không sửa mã mobile, không tạo dữ liệu production, không gửi email thử trong quá trình kiểm thử.

## Thứ tự sử dụng

1. Liên hệ: kiểm tra hotline, địa chỉ và các kênh liên hệ thực tế; lưu và kiểm tra phản hồi máy chủ.
2. Đối tượng & nhu cầu: cấu hình mã, tên và thứ tự; chỉ bật các mục đang sử dụng.
3. FAQ và pháp lý: soạn nội dung, xem trước, kiểm tra phiên bản/ngày hiệu lực rồi bật hiển thị.
4. Banner: tạo nháp, tải ảnh thành công, kiểm tra đích đến rồi chọn xuất bản. Mô phỏng App chỉ dùng kiểm tra bố cục, không thay thế nghiệm thu mobile.
5. Giáo trình: tải tệp, xác định khóa học, phạm vi truy cập, điều kiện học phí và quyền tải. Lưu nháp trước; xuất bản khi đã kiểm tra các điều kiện. Việc admin mở tài liệu không tăng lượt tải của học viên.
6. Cộng đồng: soạn nháp, xem nội dung rồi duyệt hoặc từ chối. Chỉ báo thành công sau phản hồi lưu thành công.
7. Email: chọn mẫu có thật trong database, chỉnh sửa và xem trước. Người quản trị tự nhập người nhận và biến khi chủ động gửi thử. Nhật ký gửi là dữ liệu chỉ đọc.

## Bảo toàn dữ liệu

- Không dùng thông tin liên hệ/mẫu email mặc định để che lỗi kết nối.
- Truy vấn Portal giữ JWT của phiên hiện tại và các chính sách Supabase RLS hiện có; không đổi nguồn hay danh tính khi gặp lỗi.
- Đọc có phân trang và thời hạn chờ. Ghi phải trả về đúng một bản ghi; phản hồi rỗng do RLS không được coi là thành công.
- Các lần lưu giống nhau đang chạy dùng chung một yêu cầu. Lỗi mạng không tự phát lại lệnh ghi.
- Tải tệp thất bại không trả về Base64 rồi báo đã lưu lên máy chủ.
- Xem trước HTML email nằm trong iframe sandbox.
- Hai cập nhật đổi thứ tự banner chưa phải giao dịch nguyên tử. Nếu một phần thất bại, giao diện tải lại và báo lỗi để đối chiếu trạng thái thật.

## Kiểm chứng

- Frontend: 69 kiểm thử đạt; bổ sung kiểm tra điều kiện xuất bản, phản hồi rỗng/403, nhật ký chỉ đọc và lưu đồng thời.
- TypeScript và build production đạt.
- Chưa nghiệm thu thao tác tải tệp, chính sách RLS theo từng vai trò, gửi SMTP và nội dung hiển thị cuối cùng trên mobile bằng tài khoản production. Các kiểm tra tự động dùng dữ liệu cô lập, không xác nhận những thao tác production này.
