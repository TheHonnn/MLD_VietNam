# Cải tiến độ tin cậy admin

## Phạm vi đã triển khai

| Nhóm | Thay đổi |
| --- | --- |
| API và lỗi dữ liệu | Chọn nguồn trước khi gửi; không fallback khi bị từ chối, lỗi máy chủ hoặc kết quả ghi chưa xác minh. Không thử lại POST ở URL khác. Hai lệnh lưu giống nhau đang chạy dùng chung một request. |
| Thu ngân và học viện | POS đọc dữ liệu và thu tiền qua backend. Hóa đơn, chi tiết, gói khách hàng, hoa hồng, học phí, doanh thu ca và mã chống thu trùng được ghi trong transaction. Backend tính giá từ danh mục, kiểm tra tổng tiền, khoản còn phải thu và chi nhánh. |
| Schema và migration | Bộ test dùng chung schema + enterprise extension + các migration admin đầy đủ. Có endpoint readiness, preflight CLI và kiểm tra schema trước thao tác ghi trên backend thật. |
| Quyền | Giữ quyền theo chi nhánh từ user_roles, áp dụng cho đọc, tạo, sửa, xóa, action và thao tác thu ngân. Workspace POS chỉ trả dữ liệu thuộc phạm vi được cấp, không trả password_hash của tài khoản. Menu dùng danh mục quyền thực tế; khi chưa tải được quyền sẽ không cấp quyền ghi dự phòng. |
| Biểu mẫu | Cảnh báo đóng khi có dữ liệu chưa lưu, cảnh báo rời trang, khóa submit trùng, nhãn cho trường nhập và lỗi validation tại trường. Các biểu mẫu chuyên biệt trong RecordDialog dùng chung guard. |
| Vận hành | Tải lại sau lỗi, trạng thái đang tải, bỏ kết quả request cũ khi đổi chi nhánh, tên dữ liệu tham chiếu, tìm kiếm theo tên liên quan và đưa trang vượt giới hạn về trang hợp lệ. Không báo đã gửi ZNS hoặc xuất kho khi chưa xác nhận. |

## Cập nhật trước khi đưa vào production

1. Kiểm tra database đã có schema nền và enterprise extension cùng migration 022, 024, 025, 026.
2. Áp dụng migration `database/migrations/027_admin_reliability.sql` theo quy trình triển khai của dự án. Migration thêm sổ mã yêu cầu thu tiền và cột nhân viên tư vấn; không được thay bằng dữ liệu trình duyệt.
3. Cấu hình backend `ADMIN_DATABASE_URL` (hoặc `DATABASE_URL`), JWT và Supabase Auth theo môi trường.
4. Cấu hình frontend `VITE_ADMIN_DATA_SOURCE=backend` và `VITE_API_BASE_URL=<API của môi trường>/api/v1`.
5. Trong backend, chạy `npm run check:admin-schema` với biến kết nối của môi trường đã được cung cấp. Lệnh chỉ đọc cấu trúc; kết quả phải có `ready: true`.
6. Cấp các quyền `cashier.shifts`, `cashier.collect` và quyền phân hệ cần thiết cho vai trò theo từng chi nhánh. ADMIN/SUPER_ADMIN giữ phạm vi toàn hệ thống.

Các bước production ở trên chưa được thực hiện tự động trong công việc local này.

## Kiểm chứng

- `web-admin: npm test`: lỗi HTTP, hủy request, kết quả ghi, submit trùng, quyền menu và giữ mã thu tiền qua mất kết nối/đổi giỏ.
- `backend: npm test`: transaction, thu tiền/gửi lại, đóng ca, rollback giá sai, ghi danh → đặt cọc → tất toán → điểm danh → bảng điểm → cấp/thu hồi chứng nhận; quyền chi nhánh và tên tham chiếu.
- `backend: npm run test:browser`: các trang admin, JWT thật qua HTTP, tài khoản bị khóa, phạm vi chi nhánh, biểu mẫu chưa lưu, lỗi trường, từ chối truy cập/retry, submit hai lần và POS qua giao diện với đối chiếu database.

Xem `docs/admin-local-verification.md` và `.local-archive/admin-review/result.json` để biết phạm vi và kết quả của lần chạy hiện tại. Không dùng kết quả local để khẳng định các tích hợp thanh toán, email/SMS/Zalo bên ngoài hoặc toàn bộ chính sách RLS production đã được xác minh.
