# Kiểm tra khả năng demo Mini App — 08/11/2026

## Kết luận

**Chưa đủ điều kiện demo trọn luồng đặt lịch thật.** Có thể trình diễn giao diện và tra cứu danh mục trên bản local đã vá. API thật hoạt động, nhưng dữ liệu vận hành chưa phân công chuyên viên cho ba dịch vụ hiện hành; không có ngày đặt được trong khoảng đã kiểm tra 09–15/11/2026.

Không triển khai thanh toán, không sửa Admin/mobile/database, không tạo lịch, hồ sơ hoặc dữ liệu thử trên database thật. Chưa commit, push hay deploy các bản vá trong lượt kiểm tra này.

## Lỗi đã xác nhận và vá

- Dấu xung đột merge bị commit trong `ConnectedLayout.tsx`: TypeScript báo TS1185 tại ba dòng. Đã gộp giữ cả điều hướng hướng dẫn chăm sóc và đích ưu đãi/điểm/hóa đơn.
- Tab Liên hệ của hồ sơ khách đọc bản ghi danh sách thay vì `customer` từ API hồ sơ chi tiết. Đã lấy đúng dữ liệu chi tiết, hiển thị loading/lỗi/thử lại và để trống trường chưa có dữ liệu. Thêm ca trình duyệt kiểm tra email/người liên hệ chỉ có trong phản hồi chi tiết.
- Chuyển từ mục truy cập nhanh ở cuối trang chủ sang dịch vụ giữ vị trí cuộn cũ. Đã reset vị trí cuộn khi đổi màn/chi tiết, thêm kiểm tra mở trang dịch vụ ở đầu trang.
- Các nhãn và chuỗi động mới thiếu bản dịch tiếng Anh: đã bổ sung, không thay đổi nội dung dữ liệu nghiệp vụ.

## Kiểm tra API thật, chỉ đọc

BE cấu hình production: `https://mld-miniapp-api.onrender.com/api`.

| API | Trạng thái | Kết quả lúc kiểm tra |
| --- | --- | --- |
| `/services` | 200 | 3 dịch vụ |
| `/branches` | 200 | 1 cơ sở |
| `/courses` | 200 | 11 khóa học |
| `/portal/banners` | 200 | 1 banner |
| `/portal/products` | 200 | 8 sản phẩm trong trang trả về |
| `/portal/pricing` | 200 | 3 dịch vụ, 9 gói liệu trình |
| `backend:check` | Qua | BE tương thích bản Mini App hiện tại |
| `/slots/dates`, 1 người, 09–15/11/2026 | 200 | Cả 3 dịch vụ trả 0 ngày, `NO_SERVICE_ASSIGNMENT` |

Các dịch vụ kiểm tra tại Trụ sở MLD Việt Nam (5 Master LV3): Chăm sóc khu trú 45 phút, mở rộng 60 phút, toàn diện 90 phút. Kết quả chỉ mô tả khoảng ngày và sức chứa một người đã truy vấn, không khẳng định mọi ngày tương lai đều không đặt được.

Đã mở trang chủ và trang dịch vụ trên trình duyệt với BE thật: các API danh mục trả 200, không có alert API và không tràn ngang tại 390px. Trình duyệt thường ghi nhận SDK Zalo `login`, mã `-2000`; đây chưa phải kiểm thử đăng nhập trong Zalo thật. Không dùng tài khoản giả hay vượt kiểm tra quyền.

## Kiểm tra tự động và giới hạn bằng chứng

- BE: 56 file, **324 kiểm thử qua**, không thất bại; môi trường kiểm thử, không phải giao dịch production.
- FE: **31 kiểm thử qua**; TypeScript qua, 1.973 chuỗi được audit và không thiếu bản dịch.
- Kịch bản connected app trên Chromium/WebKit, 320×640 và 390×844: khách/nhân viên, đồng bộ hồ sơ Zalo, danh mục, tư vấn, thông báo, đặt lịch thất bại/thành công, trạng thái lịch thay đổi, đăng ký khóa học, duyệt mở bài, PDF và lịch sử điều hướng. SDK/API nghiệp vụ được giả lập trong nhóm này.
- Staff workspace trên Chromium/WebKit, 320×640, 390×844, 1366×900: hồ sơ/gói/nhật ký đúng khách, tab liên hệ từ dữ liệu chi tiết, tìm kiếm, tài liệu, kết ca và bộ lọc đào tạo. Dữ liệu fixture không được ghi lên database chung.
- Auth WebKit ở ba cỡ màn hình: từ chối quyền, storage lỗi, hủy yêu cầu trả muộn, bấm liên tiếp, đăng nhập cá nhân khi chưa có quyền công việc. Cần thử lại SDK thật trên điện thoại.
- Build production qua và kiểm tra manifest/asset/no-development-client qua: tổng asset 3.729.374 byte, file lớn nhất 1.321.307 byte. Vite vẫn cảnh báo chunk lớn; đây là điểm tối ưu cold start, chưa có phép đo thời gian mở trên Zalo thật. Log tại `minizalo/backend/.relay-local/demo-2026-11-08/`; đây là thư mục local, không đưa vào Git.

## Việc cần làm trước demo khách hàng trên Zalo

1. Quản trị viên phân công chuyên viên đủ điều kiện cho dịch vụ, kiểm tra ca làm, giường và khung giờ thật. Chạy lại kiểm tra ngày trống; không bỏ kiểm tra sức chứa để tạo giờ giả.
2. Chuẩn bị tài khoản Zalo của người demo: có liên kết hồ sơ đúng; có quyền công việc nếu trình diễn tác vụ nhân viên. Chuẩn bị hồ sơ đăng ký học đã được duyệt nếu cần trình diễn nội dung học bị khóa.
3. Sau khi chốt bản vá, push/deploy Mini App đúng phiên bản. Buổi kiểm tra này không cập nhật bản testing đang cài trên điện thoại.
4. Nghiệm thu trên Zalo thật iOS/Android: cấp/từ chối thông tin, ngày/giờ đặt, ghi lịch và nhìn thấy trên Admin, camera QR, PDF/video, safe area và quay lại từ nền. Chỉ tạo lịch/hồ sơ khi được cho phép dùng dữ liệu demo trên môi trường đã thống nhất.
5. Hoàn thiện ảnh/nội dung còn trống nếu muốn trình bày đẹp; không tự sinh nội dung hoặc gán dữ liệu để lấp chỗ trống. Thanh toán và chính sách pháp lý nằm ngoài lượt demo này theo phạm vi đã chốt.

Các kiểm thử qua không phải cam kết không còn lỗi ở mọi thiết bị, tài khoản và tổ hợp dữ liệu.
