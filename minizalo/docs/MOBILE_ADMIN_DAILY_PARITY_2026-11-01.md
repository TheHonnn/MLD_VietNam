# Đồng bộ Mini App với mobile và Admin — 01/11/2026

## Phạm vi đã chốt

Người dùng chọn: **đồng bộ dữ liệu và tác vụ hằng ngày; quản trị sâu giữ ở web Admin**. Chỉ chỉnh `minizalo`; không sửa mobile, web Admin, database/migrations chung. Không chạy migration hay ghi dữ liệu thử lên DB thật. Thanh toán và chính sách pháp lý tiếp tục ngoài phạm vi. Không tự push/deploy.

Mốc repo: `develop` tại `c1adb728`, giữ nguyên staging và các sửa đổi có trước. Mã nguồn mobile/Admin được đọc làm tham chiếu, không coi nội dung mẫu hoặc nhánh báo thành công local là chuẩn nghiệp vụ.

## Phần bổ sung

| Nhóm | Mini App sau thay đổi |
| --- | --- |
| Quyền tài liệu từ Admin | Đọc `course_id`, `access_level`, `allow_download`, `require_full_payment`, `allowed_roles`, `watermark_text` của tài liệu chung. Kiểm tra quyền cả danh sách và chi tiết, khóa học/nhóm khóa đang hoạt động, hồ sơ duyệt, thời hạn/tạm dừng truy cập. Cột tùy chọn được đọc qua JSON để không bắt buộc chạy migration mới. Thiếu cờ cho tải thì tài liệu mặc định chỉ đọc. |
| Học viên và thành viên | Học viên có ghi danh đã duyệt được nhận diện từ enrollment thật; không bắt buộc có thêm thẻ hội viên để đọc tài liệu khóa học. Quyền STUDENT không được suy ra chỉ từ quyền nhân viên. |
| PDF chỉ đọc | Trình đọc PDF lazy-load, phân trang, watermark theo Admin, hủy task khi đóng/chuyển tài liệu. Không có link/nút tải trong chế độ này. File được cho tải giữ đường mở/tải SDK. Không dùng iframe toolbar ẩn để giả quyền. |
| Refresh tài liệu | Thay đổi quyền từ Admin được đọc lại theo chu kỳ/focus; không reset trang đọc chỉ vì refresh bình thường. Nếu quyền bị thu hồi, nội dung bị đóng. |
| Nhật ký và PDF | Chủ hồ sơ hoặc nhân viên đúng phạm vi có thể tạo link ký số 24 giờ sau xác nhận trong UI. PDF tiếng Việt thật dùng font Noto Sans/OFL. Trang chia sẻ có ảnh trước/sau và chữ ký khi bản ghi có; PDF hiện các trường thật và link ảnh/chữ ký. Không tự tạo chữ ký hay buổi trị liệu. |
| Quyền chia sẻ | Không tra hồ sơ công khai bằng UUID trần. Link hết hạn, bị sửa chữ ký, hồ sơ thay đổi hoặc người chia sẻ mất quyền thì không còn đọc được. Trang có no-store, no-referrer, noindex và CSP. Không thêm bảng để lưu token. |
| Tuyển sinh/xếp lớp | Thêm màn hồ sơ thật, tìm kiếm/phân trang, chọn lớp thật, kiểm tra sĩ số và phạm vi cơ sở. Duyệt lưu cả status và approval_status/approved_by/approved_at, có transaction, khóa lớp/hồ sơ, audit và kiểm tra dữ liệu cũ trước cập nhật. |
| Nhận xét bài kiểm tra | Thêm danh sách bài làm và lưu nhận xét giảng viên. ADMIN/SUPER_ADMIN xem theo phạm vi; quản lý theo chi nhánh; INSTRUCTOR chỉ xem khóa/lớp được phân công thật. Lễ tân/khách không có quyền. So nhận xét cũ trước lưu, ghi audit, giữ nguyên điểm và kết quả chấm BE. Không mang chức năng sửa tùy ý kết quả trắc nghiệm của client sang Mini App. |
| Quyền học | BE và adapter FE không coi ENROLLED/STUDYING nhưng approval_status còn pending là đã duyệt. Các API nội dung/tiến độ/thi/điểm danh dùng lại guard enrollment. Danh sách PDF bài học cũng kiểm tra duyệt. |
| Dịch vụ/khóa học | Thêm màn quản lý catalog cho ADMIN/SUPER_ADMIN: danh sách có tìm kiếm/phân trang, tạo/sửa thông tin cơ bản, giá, thời lượng/giờ học, danh mục, giảng viên, trạng thái hoạt động/nổi bật. Không xóa bản ghi. Rich fields như bước trị liệu/lợi ích/tài nguyên không bị ghi rỗng khi chỉnh form cơ bản. |
| Chống ghi đè | Catalog có version từ bản ghi thật; request dùng version cũ bị từ chối 409. Hồ sơ tuyển sinh so cả trạng thái duyệt và lớp cũ. Màn lỗi có đường tải lại. |
| Cache | Sau sửa catalog, invalidate services/courses/metadata; sau duyệt học invalidate enrollment/course/membership/notification. Không giữ giá hoặc trạng thái học cũ trong cache của thao tác vừa thực hiện. |
| FE mobile | Nhóm công việc theo Tổng quan, Tiếp đón Spa, Đào tạo, Dịch vụ & khóa; mục hiển thị theo vai trò đã chuẩn hóa. Giữ Montserrat/màu chung/bố cục mobile hiện có, sửa header/form/tab cho màn hẹp. Banner trang chủ đổi sang chu kỳ 5 giây giống mobile hiện tại; onboarding giữ chu kỳ riêng. |
| Ngôn ngữ | Bổ sung bản dịch và thông báo lỗi cho các màn/quy tắc mới; không dịch payload nghiệp vụ. |
| Build | Thêm kiểm tra tổng gói 10 MiB và từng file 3 MiB. PDF engine/worker ở asset lazy, không đưa vào entry chính. Build ZMP thật đã thành công. |

## Những phần vẫn dùng dữ liệu chung hiện có

Logo/portal/banner, dịch vụ, cơ sở, chuyên viên, khóa học/đề cương, đăng ký học, lớp/lịch học, quiz, tiến độ, giấy chứng nhận được cấp, tài liệu/cộng đồng, lịch cá nhân/nhân viên/nhóm, liệu trình/nhật ký, phản hồi tư vấn và thông báo trong app. Không tạo nội dung nghiệp vụ thay thế khi nguồn rỗng hoặc lỗi.

## Khác biệt giữ lại có chủ đích

- Đăng nhập Zalo và thanh hệ thống/điều hướng native khác Flutter. Không thêm mật khẩu MLD hoặc OTP giả vào Zalo.
- Quản trị nhân sự/phân quyền sâu, báo cáo đầy đủ, cấu hình hệ thống và quản trị nội dung/bài học hàng loạt vẫn ở web Admin theo câu trả lời người dùng; không coi các màn này là tính năng khách hàng còn thiếu.
- Không sao chép nhánh mock, mã enrollment giả, giá/giờ mặc định hoặc thông báo thành công khi chưa lưu của mobile.
- Quy tắc hoàn thành video Mini App vẫn do BE xác nhận 95%; mobile hiện 85% tại client. Không sửa mobile trong phạm vi này nên **chưa thể tuyên bố tiến độ video hai bản đã hoàn toàn thống nhất**. Cần mobile dùng cùng API/quy tắc khi được phép chỉnh mobile.
- Chỉ đọc PDF và watermark là kiểm soát trong UI; không phải DRM ngăn tuyệt đối trích xuất file, chụp/quay màn hình. File Storage công khai vẫn cần chính sách truy cập tương ứng tại nguồn để bảo vệ ngoài ứng dụng.
- Link nhật ký mới được ký/hết hạn tại BE Mini App; không sao chép route Admin truy vấn bằng UUID trần. Link Admin và Mini App có cách trình bày/địa chỉ khác nhau nhưng đọc cùng bản ghi thật.
- PDF xuất nhật ký có nội dung chữ và link ảnh/chữ ký, chưa phải bản in giống từng pixel với trang PDF của Admin.
- Chưa có kiểm chứng pixel parity với Flutter chạy trên cùng thiết bị. Không tuyên bố đạt tỷ lệ 95% hay hết mọi lỗi.

## Kiểm chứng và phát hành

Kiểm thử dùng DB cô lập và HTTP/SDK fixtures, không ghi dữ liệu nghiệp vụ lên production. Các test mới kiểm tra quyền PDF, mất quyền, lớp đầy/sai chi nhánh, version cũ, PDF thật, chữ ký link và thu hồi quyền chia sẻ. Browser kiểm tra khách/nhân viên trên Chromium và WebKit ở 320×640, 390×844, gồm đọc PDF có watermark, duyệt/xếp lớp và lưu catalog.

Kết quả: bộ hồi quy BE **320/320 ca qua** trong 54 file; sau đó thêm test riêng cho phạm vi nhận xét giảng viên và ca này đã qua. FE/toolchain **31/31 qua**. Chromium/WebKit đều qua các luồng khách/nhân viên ở hai kích thước, gồm PDF chỉ đọc, duyệt học, nhận xét bài và sửa catalog. TypeScript qua. Audit **1.908 chuỗi**, thiếu 0 bản dịch/template. Audit runtime FE và BE: 0 cảnh báo ở lần kiểm tra tương ứng; không đồng nghĩa toolchain cũ của ZMP đã sạch mọi cảnh báo.

Build chính thức ZMP qua; gói cuối **3.709.334 byte (khoảng 3,71 MB)**, file lớn nhất **1,32 MB**. Kiểm tra kích thước được thực thi lại ở postbuild. Artifacts cục bộ: `minizalo/backend/.relay-local/final-results/parity-*`; bộ hồi quy BE: `.relay-local/parity-admin-mobile-final.log`; nhóm tính năng mới cuối: `.relay-local/final-results/parity-new-final.log`.

**Phải phát hành BE trước FE**. Health và predeploy contract bổ sung: `admin-document-policy-v1`, `journal-sharing-v1`, `staff-academy-approval-v1`, `staff-catalog-v1`. Nếu `backend:check` báo thiếu, đó là server chưa được cập nhật, không bỏ qua gate để phát hành FE lệch phiên bản. BE cần mang theo `assets/fonts/` khi triển khai.

Native Zalo thật, CSP/worker, CORS của từng URL Storage, quyền mở file và safe area cần nghiệm thu thiết bị. Bộ kiểm thử browser không thay thế bước đó.
