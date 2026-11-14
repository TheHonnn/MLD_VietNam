# Hướng dẫn chăm sóc trên admin

## Triển khai

Áp dụng `database/migrations/032_home_care_delivery_snapshots.sql` sau migration 031 trước khi chạy backend mới. Script `prestart:prod` đã bổ sung bước này. Không có migration production nào được chạy trong quá trình phát triển.

Migration thêm số phiên bản mẫu và phiên bản nguồn của bản giao; tái sử dụng `home_care_deliveries.content_snapshot`, không tạo kho lịch sử thứ hai. Chỉ mục duy nhất ngăn giao trùng cùng mẫu, phiên bản và buổi. Không xóa các cột hoặc bản giao khi rollback ứng dụng vì cần giữ lịch sử.

## Vận hành

- `/manage/home_care_guidelines`: soạn mẫu, chọn dịch vụ áp dụng hoặc dùng chung, lưu nháp, xuất bản bởi ADMIN/SUPER_ADMIN.
- Sửa mẫu tăng phiên bản và chuyển về nháp nếu không chọn xuất bản lại. Không xóa cứng; gỡ xuất bản bằng cách lưu bản nháp.
- `/manage/treatment_journal`: mở buổi đã CONFIRMED, chọn mẫu đã xuất bản phù hợp dịch vụ, xem trước rồi xác nhận giao.
- Giao trong ứng dụng tạo `home_care_deliveries` cùng thông báo trong một transaction. Không suy diễn rằng Zalo/SMS/email đã được gửi hoặc khách đã đọc.
- Giao lại cùng phiên bản không tạo thêm bản giao/thông báo. Phiên bản mới có thể được giao riêng.
- Tab "Đã giao trong ứng dụng" và hồ sơ liệu trình hiển thị lịch sử. Tab "Hàng đợi lời dặn" giữ trạng thái thực tế của `post_care_outbox` từ luồng cũ.

## Kiểm soát

API kiểm tra quyền action và phạm vi chi nhánh trên nhật ký, trạng thái CONFIRMED/chưa reverse, mẫu published và dịch vụ khớp. Khách hàng được suy ra từ nhật ký. Nội dung bản giao là snapshot, chỉnh mẫu không thay đổi nội dung cũ.

Mobile không được chỉnh sửa trong giai đoạn này. Khả năng mobile mở đúng snapshot của delivery cần kiểm thử phối hợp với người phụ trách mobile; thông báo sử dụng cùng cấu trúc đã có trong migration 025.
