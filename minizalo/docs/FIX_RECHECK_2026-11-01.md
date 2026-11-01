# Xử lý kết quả rà soát Mini App — 01/11/2026

Phạm vi: Mini App và BE trong `minizalo`. Không chạy migration hay sửa dữ liệu database chung. Không sửa mã mobile/Admin/Website. Trong lúc làm việc, repo được cập nhật đến `c1adb728`; giữ lại commit/merge và các thay đổi đang staged của phiên làm việc khác, không reset chúng.

## Kết quả xử lý

| Phát hiện trước sửa | Xử lý |
| --- | --- |
| Production gọi nhầm API `/api/v1`, các catalog 404 | Sửa về BE Mini App `https://mld-miniapp-api.onrender.com/api`. Kiểm tra server thật: backend contract qua; dịch vụ, chi nhánh, khóa học, banner đều 200 và đúng dạng dữ liệu. |
| Thông báo lịch nhân viên mở lịch cá nhân | Chọn scope công việc từ thông báo có staffBranchId và capability nhân viên thật. Nạp lịch theo ID, kể cả ngoài trang đầu; BE tiếp tục kiểm tra chủ sở hữu/phạm vi chi nhánh. |
| Banner kết quả học tập mất đích | Giữ academyTarget khi mở đích cụ thể; vào đúng tab Kết quả của đăng ký học đã duyệt. |
| Back mất scope công việc | Thêm workAppointments vào snapshot/key và khôi phục có kiểm tra quyền. Remount màn lịch khi đổi scope. |
| Voucher dẫn về Profile | Thêm ví ưu đãi dùng membership/voucher API thật, lọc có thể dùng/đã dùng/hết hạn và nhận mã. Không thêm thanh toán. |
| Tư vấn có lưu nhưng thiếu nơi tiếp nhận | Thêm hộp tư vấn trong Công việc nhân viên: chọn chi nhánh khi gửi, tiếp nhận, phản hồi, đóng yêu cầu, phân trang. Dùng support_tickets hiện có; thông tin chi nhánh được lưu có định dạng dành riêng cho endpoint này. Không thêm trường/bảng. |
| Tiếp nhận tư vấn có nguy cơ ghi đè | Kiểm tra role/chi nhánh ở BE, khóa bản ghi khi cập nhật, so trạng thái/phản hồi ban đầu để báo xung đột 409. Retry cùng kết quả không nhân audit log. Khách chỉ đọc yêu cầu của mình. |
| Tải dữ liệu quá rộng/poll trùng | Catalog cập nhật từng nguồn ngay khi trả về. Gộp refresh riêng đang chạy; bỏ polling root khi màn lịch/lịch sử đang quản lý đọc dữ liệu. Warmup trang đầu có giới hạn, giữ cursor. |
| Lịch sử/lọc chỉ chạy trên dữ liệu đã tải | Lọc tên không dấu/số điện thoại/ngày/chi nhánh/dịch vụ/trạng thái tại SQL trước cursor; màn lịch tải trang tiếp theo khi cần. Hỗ trợ/phiếu thông tin/liệu trình có nút tải tiếp, không làm mất dữ liệu sau giới hạn preload. |
| Lịch cá nhân dùng chữ của nhân viên | Tiêu đề và mô tả đổi theo scope. |
| Dữ liệu tiền thiếu có thể làm crash chi tiết lịch | Bảo vệ định dạng số; dữ liệu không hợp lệ không bị hiển thị thành giá miễn phí hoặc làm văng màn. |
| Link chia sẻ chỉ đọc URL browser | Đọc cả route params của SDK Zalo, dùng các ID khớp catalog thực. |

Luồng đặt hộ nhân viên, đặt nhiều người, giường/chuyên viên và các quyền học vẫn dùng các ràng buộc BE hiện có. Không tạo dữ liệu mẫu để làm màn trống có nội dung.

## Bảo mật và toolchain

- BE: body-parser 1.20.9, qs 6.16.1; chặn body nén bằng inflate:false. Ca kiểm thử xác nhận trả 415 trước truy vấn DB, xử lý cả dữ liệu nén có bytes thừa, API vẫn hoạt động.
- Mini App: Vite 6.4.5, PostCSS cập nhật, các chuỗi Git/tar/HTTP/JWT/multipart/glob/serializer/SVG/tệp tạm được vá và khóa trong lockfile. Bỏ công cụ PostCSS không được sử dụng.
- ZMP CLI giữ bản 4.0.5 đã kiểm thử. Có adapter CommonJS mỏng cho simple-git và URI decoder; các thao tác/safety checks vẫn do bản upstream đã vá xử lý. Decoder được bundle tại cài đặt vào cache, không chép implementation cũ dễ lỗi vào source.
- CLI 4 đọc `exports["."].import.default`; script prepare khôi phục dạng object tương đương cho metadata Vite 6. Không đổi version để che audit, không thay mã thực thi Vite. Hook chạy sau install và trước build/start/deploy.
- Lockfile được giải lại trong thư mục độc lập, sau đó **npm ci sạch thành công**. Cây cài đặt dùng Vite 6 thống nhất, không còn Vite 2 lồng trong CLI. `npm ls vite --all` qua.
- Build bằng npm và lệnh build chính thức của ZMP đã được kiểm tra; Vite tạo dev server 200 qua loader của ZMP. Local được bật lại tại cổng 5184.
- Lệnh deploy:test dùng testing/passive/description/mode production rõ ràng, có predeploy contract gate. Không chạy deploy trong phiên này.

**Audit chưa bằng 0 cho toàn bộ công cụ phát triển.** Cây cài mới còn 35 mục thấp/trung bình (2 low, 33 moderate), chủ yếu các chuỗi cũ của CLI: Octokit, zip-local/JSZip, glob/minimatch, uuid và các thư viện phụ. Không còn mục high/critical trong lần audit cây cài mới. Đây là giới hạn còn ghi nhận; không tuyên bố mọi cảnh báo dependency đã được loại bỏ. Các thay đổi lớn vào các API legacy còn lại cần kiểm chứng riêng, đặc biệt thao tác tạo project/đóng gói/deploy có xác thực. Dependencies runtime FE và BE không có cảnh báo trong lần kiểm tra tương ứng.

## Kiểm chứng

- **316/316 ca BE qua**, không skip/cancel/fail, trên DB thử cô lập. Bao gồm phân trang/lọc trước cursor, phạm vi lịch cá nhân/công việc, tư vấn đúng chi nhánh, chống ghi đè, body nén, auth và quyền học.
- **31/31 ca FE/toolchain qua**, gồm loader ZMP/Vite, factory Git có guard an toàn và decoder được vá. TypeScript qua.
- Chromium và WebKit sau cài sạch: **8/8 tổ hợp khách hàng/nhân viên × hai kích thước × hai engine qua**. WebKit có một lần timeout khi bấm thông báo; lượt chạy lại nguyên bộ không đổi mã sản phẩm đã qua, nên ghi nhận độ ổn định kiểm thử thay vì kết luận đã tìm thấy lỗi ứng dụng từ timeout đơn lẻ. Kích thước 320×640 và 390×844. Kiểm tra tên/ảnh Zalo, màn cá nhân trống, ví ưu đãi, học sau duyệt, mở bài kế tiếp, PDF, lỗi đặt lịch, cập nhật Admin, thông báo công việc, tab kết quả, Back khôi phục scope và phản hồi tư vấn.
- Production build/postbuild: manifest hợp lệ, không có development client. Audit bản dịch không thiếu chuỗi/template.
- Server thật: public catalog trả đúng dữ liệu; contract phù hợp phiên bản FE. GET không có session tại /auth/me, /bookings?scope=personal&limit=1 và /staff/consultations đều trả 401, đúng ranh giới xác thực. Không tạo booking/đăng ký học hay gửi tư vấn lên database chung để kiểm tra.

Log/ảnh đã lưu tại `minizalo/backend/.relay-local/final-results/` và thư mục cache kiểm thử; đây là artifact cục bộ bị Git bỏ qua. Log full BE: `.relay-local/fix-final-regression.log`.

## Phạm vi còn cần nghiệm thu

Quyền Zalo/native login thật, bàn phím, camera/safe area trên thiết bị, gọi điện và cơ chế bảo vệ video cần kiểm tra trên Zalo thật. Các browser tests dùng HTTP/SDK fixture, không thay thế nghiệm thu thiết bị. Thanh toán và chính sách/điều khoản vẫn theo quyết định hoãn của người dùng.

Không tự push Git hoặc phát hành Mini App testing trong phiên này. Một phần thay đổi đã nằm trong commit/merge do phiên làm việc khác cập nhật; phần bổ sung sau đó còn trong working tree, giữ nguyên staging hiện có.
