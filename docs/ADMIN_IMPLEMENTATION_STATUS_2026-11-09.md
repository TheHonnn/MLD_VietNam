# Trạng thái xử lý admin — 09/11/2026

## Đã sửa trong worktree

- Xác thực Supabase token qua `auth.getUser(token)`; loại bỏ nhánh decode rồi tra ID, loại bỏ tự cấp SUPER_ADMIN theo email, chỉ đọc profile theo ID token. Bài kiểm chứng cô lập cho thấy token sai chữ ký bị từ chối.
- Bỏ DB connection string/JWT signing secret dự phòng trong mã; thiếu DB config ở production hoặc schema chưa đủ thì khởi động thất bại. Kết nối TLS từ xa xác minh chứng chỉ. **Vẫn phải xoay vòng credential đã có trong lịch sử Git và cấu hình ngoài repo.**
- Migration `028_admin_access_hardening.sql` thu hồi RPC tự đóng lịch và RPC sửa biên lai cũ thiếu kiểm tra chi nhánh; chặn RPC gửi hướng dẫn chăm sóc không có lịch/buổi trị liệu thuộc chi nhánh; giới hạn hóa đơn, dòng hóa đơn, học phí, nhật ký điều trị, tiêu hao và user_roles theo chủ sở hữu/chi nhánh. Browser bị cấm tạo/sửa trực tiếp hóa đơn và dòng hóa đơn; POS dùng transaction backend. Giữ quyền khách đọc dữ liệu của chính mình. Chưa áp migration lên DB staging/production.
- POS workspace giới hạn nhánh, hóa đơn, khách và trường hồ sơ nhân viên; hoàn thiện backend build. Thu tiền booking không tự checkout, sửa kiểu số khi chốt ca. Danh sách admin tìm theo tên chi nhánh, thêm tên tham chiếu và chặn phân trang vào trang rỗng.
- Lớp SupabaseService cũ không gửi lại bằng anon sau 401 và không chuyển nguồn khi thao tác ghi có kết quả chưa rõ. Khôi phục chi nhánh/phòng chỉ báo thành công sau khi máy chủ xác nhận. Bảng giá phân biệt lỗi/rỗng, không bán khi danh mục không đủ và kiểm tra update trả về bản ghi.
- POS hiển thị/bán theo giá giảm hợp lệ; màn học phí hiển thị thực thu trừ hoàn. Báo cáo theo tháng thực, trừ hoàn tiền, ưu tiên từng giao dịch học phí hơn hóa đơn tổng hợp cũ cùng hồ sơ, dùng chi nhánh thật và báo lỗi khi thiếu nguồn dữ liệu. CORS production dùng allowlist; cache Supabase trong browser được xóa khi đổi phiên/đăng xuất.
- Thêm CI admin chạy test/build/màn hình trình duyệt cô lập, cùng test RLS chi nhánh và RPC sửa biên lai chéo chi nhánh.

## Kiểm chứng gần nhất

- Backend admin: **32/32** test đạt sau thay đổi quyền INSERT hóa đơn và RPC gửi hướng dẫn (`final-admin-tests.log`).
- Frontend: **16/16** test đạt (`final-frontend-tests.log`), build đạt (`final-frontend-build.log`).
- Migration 028 nạp được bằng PGlite; bài test role authenticated từ chối xem/ghi hóa đơn chéo chi nhánh, sửa biên lai chéo chi nhánh và gửi hướng dẫn chăm sóc không có lịch hoặc có lịch ở chi nhánh khác đạt.
- Browser E2E full: **51/51** resource đạt, CRUD, JWT/quyền chi nhánh, biểu mẫu, POS/đối soát, không lỗi trang (`result.json`, `final-browser-full.log`). Browser E2E tập trung sau sửa báo cáo đã đạt phép đối soát hóa đơn học phí cũ với nhiều đợt thu và hoàn (`result-focused.json`, `final-browser-reports.log`).

## Còn lại trước khi vận hành thật

1. **Bên ngoài repo:** xoay vòng DB password/JWT secret cũ; cấu hình env và CA/TLS thật, kiểm tra lịch sử/gói đã chia sẻ. Gói ZIP cũ trong workspace đã bị xóa; nếu đã tải hoặc gửi cho người khác thì vẫn phải thu hồi bí mật.
2. Review/apply migration 028 trên staging sau backup; kiểm tra policy/grant/RPC hiện hữu bằng tài khoản thật của khách, nhân viên, quản lý, thu ngân và service role. Kiểm tra quyền khách đọc nhật ký của chính mình.
3. Di chuyển các màn hình chuyên biệt còn ghi Supabase trực tiếp sang backend hoặc RPC có kiểm quyền. **Ưu tiên luồng ghi học phí trong `academy.service.ts`: browser vẫn INSERT `tuition_transactions` trực tiếp theo policy chi nhánh; chưa bảo đảm toàn vẹn số tiền/đối soát ca như `cashier.collect`.** Sau đó xử lý bảng giá, kho, hoa hồng và các màn hình còn lại.
4. Báo cáo doanh thu hiện ưu tiên toàn bộ giao dịch học phí khi hồ sơ có sổ giao dịch, tránh bỏ nhiều đợt thu/hoàn. Nhưng hóa đơn và giao dịch vẫn thiếu khóa liên kết cấp khoản thu; cần sổ giao dịch chuẩn ở server và đối soát dữ liệu lịch sử, nhất là hóa đơn ghép nhiều loại hàng hoặc hoàn tiền từ hóa đơn POS.
5. Gắn quyền sở hữu/chi nhánh vào tài liệu trước khi cấp signed URL cho nhân viên. Hiện API chỉ cho ADMIN/SUPER_ADMIN lấy signed URL như biện pháp hạn chế tạm thời; cần thiết kế cấp quyền theo tài liệu để nhân viên có chức năng phù hợp.
6. Kiểm thử giao diện gửi hướng dẫn chăm sóc với vai trò nhân viên sau migration 028: nhãn form nay báo nhân viên cần chọn lịch, nhưng UI vẫn cho phép gửi không gắn lịch để ADMIN/SUPER_ADMIN gửi hướng dẫn chung. Nhân viên phải chọn lịch/buổi trị liệu thuộc chi nhánh; bài PGlite xác minh thiếu liên kết và lịch chéo chi nhánh bị từ chối. Chưa thử giao diện này trên staging.
7. Thử nghiệm phát hành và quay lui trên staging: migrations nâng cấp, backup/restore, webhook thanh toán, phân quyền bucket, đối soát ca, giám sát lỗi/job, và tải thực tế. Chưa dùng dữ liệu hoặc tài khoản production để kết luận.

Gói bàn giao cuối nằm trong `.local-archive/handoff/antigravity-admin-2026-11-09-10pct-final.zip`. Patch bỏ hai tệp từng chứa secret ở dòng bị xóa; snapshot mã đã làm sạch nằm trong `files/`.
