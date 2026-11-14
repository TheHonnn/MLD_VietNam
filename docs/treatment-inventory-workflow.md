# Kho vật tư điều trị

Phạm vi: admin và backend. Không thay đổi mobile; không tạo số tồn hay giao dịch mẫu trên production.

## Chuẩn bị triển khai

Migration 034 tạo branch_material_stock, treatment_stock_movements và cột sync_error của outbox; không thêm bản ghi tồn. Chạy sau 031–033. Script prestart:prod đã nối theo thứ tự. Không bật code có schema requirement mới khi migration chưa thành công.

Đã áp dụng 033 và 034 lên Supabase production theo yêu cầu lúc 2026-11-13T07:55:46Z, trong cùng transaction. Đã xác minh lại catalog sau COMMIT: index 033 hợp lệ, RLS hai bảng kho bật, đủ 5 mã quyền, không có quyền ghi trực tiếp từ authenticated/anon. Dữ liệu gói/nhật ký/hàng đợi giữ nguyên; số tồn và sổ kho mới đều rỗng. Chưa khai báo tồn thực tế và chưa deploy code mới trong bước này.

ADMIN/SUPER_ADMIN sử dụng quyền quản trị hiện có. Quản lý chi nhánh phải được cấp đúng branch_material_stock.read/action, treatment_stock_movements.read, treatment_inventory_outbox.read/action và quyền đọc branches tại chi nhánh tương ứng. Migration chỉ tạo danh mục quyền, không tự cấp quyền. Vai trò ngoài quản lý không được ghi kiểm kê.

## Vận hành

1. Mở Nhật ký điều trị → Đối chiếu vật tư → Ghi nhận vật tư đã kiểm kê. Nhập chi nhánh, tên vật tư, đơn vị đúng như nhật ký, số đếm thực tế và lý do. Số lượng tối đa 3 chữ số thập phân. Không tự khai báo số dư để làm hết lỗi hàng đợi.
2. Xác nhận chuyên môn tạo yêu cầu xuất vật tư và tiêu thụ lượt trong luồng hiện có. Trạng thái kho chờ đồng bộ không được coi là đã xuất thành công.
3. Worker chạy mỗi 15 giây khi backend có cấu hình DB. Khóa hàng đợi và số dư; vật tư chưa kiểm kê hoặc thiếu tồn làm toàn bộ lần xuất rollback, lưu FAILED và lỗi để quản lý xử lý. Không trừ dở dang một phần vật tư.
4. Sau kiểm kê/đối chiếu, bấm thử lại hoặc chờ worker. Retry cùng outbox không trừ lại. Yêu cầu khác trùng buổi/loại đã SYNCED bị giữ lỗi để đối chiếu, không tự bỏ qua như thành công.
5. Hoàn tác buổi tạo REVERSE_RESTORE. Chỉ hoàn kho khi có xuất kho gốc đã SYNCED và có ledger. Phục hồi đúng delta gốc, không dựa vào số vật tư nhập lại. Không có ledger gốc thì giữ lỗi; không giả lập hoàn kho.
6. Tải lại số tồn/hàng đợi để xem kết quả worker. Xem sổ biến động để đối chiếu thời điểm kiểm kê, xuất, hoàn. Kiểm kê cũ bị từ chối nếu số dư đã đổi; hủy form, tải lại rồi đối chiếu lại số đếm trước khi lưu.

## Kiểm thử

Integration PGlite dùng schema migration thật và fixture trong RAM: thiếu vật tư, thiếu tồn, rollback một phần, xuất một lần, retry, yêu cầu trùng, hoàn trước xuất, hoàn một lần, stale count và sai chi nhánh. Không kết nối Supabase production trong các test này.

Đây là sổ vật tư phục vụ liệu trình; không gộp số tồn này với sản phẩm mang về hoặc tự suy số tồn từ BOM. Khi cần tích hợp một hệ thống kho chung khác phải đối chiếu nguồn số dư trước, tránh hai hệ thống cùng trừ.
