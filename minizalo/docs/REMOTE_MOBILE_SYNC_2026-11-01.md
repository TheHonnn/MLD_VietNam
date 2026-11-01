# Đồng bộ Mini App với mobile sau khi cập nhật Git — 01/11/2026

## Mốc so sánh

Đã fetch toàn bộ remote, prune tham chiếu cũ và fast-forward develop từ `eee36019` đến `4ee729b3`. Giữ lại thay đổi cục bộ, không merge các nhánh tính năng vào nhau. Bản diff trước pull được lưu trong thư mục tạm bị Git bỏ qua của backend.

| Nhánh cục bộ và origin tương ứng | Commit sau cập nhật |
| --- | --- |
| develop | 4ee729b3 |
| main | 4ee729b3 |
| feature/admin-web | d662008e |
| feature/portal-content-and-email | 8213a9ef |

Phạm vi chỉnh sửa của phiên này chỉ trong `minizalo`. Mobile, Admin, Website và database chung được đọc để đối chiếu. Không chạy migration hoặc ghi dữ liệu vào database chung. Thanh toán ngoài phạm vi.

Đối chiếu `--cherry-pick --right-only` không có commit nội dung riêng còn thiếu từ hai nhánh feature vào develop đối với mobile/Admin/database. Khác biệt lịch sử merge không được coi là tính năng mới để ghép lại lần nữa.

## Thay đổi mới từ remote đã đối chiếu

| Commit | Nội dung đáng chú ý |
| --- | --- |
| 1ff4723a | Mobile chỉ bật bảo vệ ghi/chụp màn hình trong lúc xem video khóa học. |
| e6b54d4c | Trang chủ mới: ảnh nền, tìm khóa học/dịch vụ và thẻ dịch vụ. |
| 93bbc1bd | Thẻ dịch vụ dùng ảnh dẫn lưu bạch huyết; mobile có giá mặc định 700.000đ. |
| f0321ab9 | Header/avatar, truy cập nhanh Cá nhân, TikTok, điều hướng và form đăng ký/đặt lịch. |
| 1772edba | Avatar lưu Storage; giờ mở/đóng cơ sở; hủy lịch đang chờ xác nhận. |
| 624ca088 | Admin sửa upload icon danh mục và tên học viên đăng ký. |
| 7ec4fd80 | Admin chia lại sidebar thành sáu nhóm. |
| 9f225875 | Admin sửa nhiều mục sidebar cùng active do query params. |
| 801e769f | Admin ghép nhóm tài nguyên với tab mới. |
| 50e1841a | Admin chuẩn hóa tên tab và tài nguyên giảng viên. |
| 816f8229 | Admin bổ sung các mục con sidebar còn thiếu. |
| 4ee729b3 | Admin bỏ mục support_tickets/support_faqs khỏi navigation; bảng và API không bị xóa. |

Có mã module Admin mới trong mobile nhưng `AdminMainLayoutScreen` chưa có điểm gọi từ route/layout khác trong bản đang so sánh. Không tự cấp quyền quản trị hoặc coi module chưa nối đó là luồng người dùng đã hoạt động.

## Đồng bộ đã triển khai

| Khu vực | Mini App sau sửa |
| --- | --- |
| Header trang chủ | Logo Admin, thông báo và ảnh/tên tài khoản Zalo thật. |
| Hero | Bố cục cao 360–440px, ảnh/nội dung banner Admin, gradient, gọi tư vấn và đặt lịch. Ảnh thương hiệu dự phòng dùng đúng `chinhanh.webp` của mobile; không tạo nội dung banner giả. |
| Carousel | Tự chuyển sau ba giây, chọn chấm, mở đúng đích banner/nội dung; không điều hướng bằng JavaScript URL. |
| Tìm kiếm nhanh | Hai tab khóa học và dịch vụ/cơ sở. Đối tượng/nhu cầu lấy từ metadata thật; lựa chọn được truyền sang bộ lọc catalog. |
| Thẻ dịch vụ | Tên/ảnh/giá/thời lượng từ API; không sao chép giá mặc định 700.000đ của mobile. Không gắn ảnh trị liệu vào một dịch vụ khác chỉ vì thiếu ảnh. |
| Tư vấn | Form tên/số điện thoại, xác thực Zalo khi cần, chống gửi lặp; lưu support ticket thật và chỉ báo thành công khi có ID BE. |
| Liên hệ | Bốn kênh Zalo/Facebook/TikTok/Messenger dùng cùng địa chỉ thương hiệu trong source mobile. Gọi điện dùng số thật của cơ sở đang chọn. |
| Truy cập nhanh | Dịch vụ, Tài liệu, Đào tạo, Cá nhân; giữ các đường vào chức năng cũ. |
| Điều hướng đáy | Trang chủ, Gọi ngay, Tư vấn, Cơ sở theo mobile mới; cố định trong vùng hiển thị và giữ safe area. |
| Cơ sở | Địa chỉ/giờ thật; trạng thái mở cửa cập nhật theo giờ Việt Nam, hỗ trợ giờ qua đêm. Thiếu giờ thì không đoán trạng thái. |
| Đặt lịch | Chọn dịch vụ, cơ sở, ngày/giờ và 1–10 người trong luồng cá nhân. Giờ trống kiểm tra đủ giường và chuyên viên cho toàn bộ số người. |
| Thông tin người đặt | Tên từ hồ sơ; điện thoại/email/địa chỉ không tự điền vào liên hệ người khác. Có nút dùng thông tin tài khoản khi người dùng chủ động chọn. |
| Lưu nhóm lịch | Mỗi người có booking/giường/chuyên viên thật, cùng chủ sở hữu và mã nhóm; transaction toàn bộ, thiếu tài nguyên thì rollback toàn bộ. Không dùng một gói/voucher cá nhân cho nhiều người. |
| Chờ xác nhận | Lịch cá nhân tạo PENDING, hiện được trong công việc Admin/nhân viên; nhân viên đúng quyền có thể xác nhận lịch tương lai. Luồng đặt hộ của nhân viên giữ quy tắc hiện có. |
| Hủy lịch | Hủy lịch chờ duyệt, lưu lý do; xem/hủy nhóm theo đúng tài khoản hoặc phạm vi chi nhánh. Hủy nhóm kiểm tra tất cả thành viên trước khi ghi. |
| Đăng ký học | Form ban đầu trống như mobile, có nút dùng hồ sơ thật. Cơ sở dạng radio có địa chỉ/hotline; nhóm BEGINNER/PRO và lớp từ dữ liệu thật. |
| Quyền học | Xem đề cương trước đăng ký, bài học khóa trước duyệt; BE giữ khóa thứ tự, video, quiz, tài liệu và tiến độ. |
| Cá nhân | Khóa học/lịch học/liệu trình riêng; chưa có dữ liệu thì trống, không đưa về catalog. Công việc nhân viên chỉ mở khi BE xác nhận quyền. |
| Ngôn ngữ | Bổ sung các chuỗi UI mới vào bộ dịch, không thay đổi payload dữ liệu nghiệp vụ. |
| Phát hành | Kiểm tra BE phải có `personal-group-booking-v1`, tránh đẩy FE mới lên một BE vẫn từ chối nhóm lịch cá nhân. |

## Các khác biệt còn giữ có lý do

- Đăng nhập/đổi tài khoản bằng Zalo và phần thanh hệ thống do Zalo quản lý khác ứng dụng Flutter. Không dùng mật khẩu/OTP của mobile để giả đăng nhập Zalo.
- Mobile có giá/giờ đặt lịch dự phòng và form tư vấn chỉ chờ rồi báo thành công; Mini App dùng giá/khả dụng BE và lưu thật. Support ticket đã lưu có thể đọc tại mục hỗ trợ của Mini App; sidebar Admin mới đã bỏ màn support nên **chưa phải quy trình tiếp nhận lead/gọi lại được nghiệm thu trên Admin**. Không tự sửa Admin để thêm lại màn này.
- Mobile upload avatar lên Storage; Mini App nhận HTTPS từ Zalo và xử lý ảnh người dùng trong giới hạn hiện có. Không thêm Storage credentials hay sửa bucket/database trong phiên này.
- Các mục nghề nghiệp, theme, công tắc riêng thông báo liệu trình/khóa học tiếp tục hoãn theo quyết định giữ database hiện tại. Không hiện nút lưu giả cho dữ liệu chưa có trường.
- Chức năng native như chặn quay màn hình, trình phát/tài liệu, quyền Zalo, gọi điện, liên kết ngoài, bàn phím và safe area cần nghiệm thu trên Zalo thật. Test WebKit/Chromium không chứng minh được toàn bộ native SDK.
- Mini App giữ các kiểm tra quyền/transaction/idempotency và bộ lọc có ích. Không đổi API thành truy vấn Supabase trực tiếp chỉ để giống cách triển khai mobile.
- Chưa đo pixel parity giữa Flutter trên thiết bị và WebView. Không quy đổi kết quả kiểm thử thành tuyên bố giống 95% hoặc không còn mọi lỗi.

## Kiểm chứng

- Toàn bộ BE: **308/308 kiểm thử qua**, 0 fail/skip/cancel; log cục bộ `.relay-local/remote-sync-final.log`.
- Nhóm FE/auth/catalog/language/staff/release contract: **26/26 qua**.
- TypeScript FE/BE qua. Production build và postbuild artifact check qua: manifest đúng, không có development client.
- Audit 1.729 chuỗi UI: thiếu 0 bản dịch và 0 template.
- Browser Chromium và WebKit đều qua 320×640, 390×844: filter dịch vụ từ trang chủ, lưu yêu cầu tư vấn, đồng bộ Zalo, màn cá nhân trống, quyền học sau duyệt, mở bài kế tiếp không reload, PDF Admin, đặt lịch thất bại không báo thành công và cập nhật trạng thái từ Admin.
- Đã xem ảnh chụp trang chủ sau sửa; không tràn ngang ở các viewport kiểm thử. Branch-hours test kiểm tra giờ Việt Nam, biên đóng cửa, giờ qua đêm và trường trống.
- Test nhóm lịch xác nhận rollback khi thiếu chuyên viên, giới hạn số người, giường/chuyên viên riêng, PENDING, xác nhận đúng chi nhánh, chống truy cập tài khoản khác và hủy nhóm có lý do/idempotency.
- `git diff --check` qua; diff ngoài `minizalo` trong mobile/Admin/database trống.

Browser dùng entry point thật nhưng HTTP/SDK là fixture độc lập; PostgreSQL regression dùng database test cô lập. Không ghi dữ liệu thử vào database chung và không suy ra rằng production/Zalo native đã qua nghiệm thu.

Chưa commit/push hoặc deploy BE/Zalo cho các thay đổi của phiên này. Cần phát hành BE tương ứng trước FE và nghiệm thu bằng tài khoản thật với Admin thật.
