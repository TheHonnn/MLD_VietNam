# Rà soát Mini App dành cho nhân viên, 26/10/2026

## Phạm vi

Đọc tài liệu người dùng đánh số tới 157, đối chiếu Mini App, BE trong minizalo,
schema chung và dữ liệu thật theo truy vấn chỉ đọc. Không sửa Admin/Website,
không thay đổi database trong lượt này; không thêm khách, lịch, bài học hoặc
phân công giả. Thanh toán, VAT, POS vẫn để ngoài phạm vi theo yêu cầu đã chốt.

## Các lỗi đã sửa

| Mức độ | Vấn đề đã xác nhận | Cách sửa |
| --- | --- | --- |
| Cao | Cá nhân của nhân viên vẫn là trang hội viên khách hàng | Thay thẻ VIP, điểm, voucher, giới thiệu bạn bè bằng thông tin công tác và menu công việc |
| Cao | Số liệu cá nhân đọc theo customer_id của nhân viên, làm lịch/liệu trình khách trống | Thêm /staff/dashboard tính công việc theo phạm vi chi nhánh từ staffScope |
| Cao | Trang hồ sơ khách mở trống, chỉ truy vấn sau khi nhập tên/số đủ điều kiện | Thêm directory phân trang theo chi nhánh, tải ngay khi mở và tìm kiếm trên cùng phạm vi |
| Cao | Trộn nhật ký/y tế của nhân viên với hồ sơ khách | Luồng nhân viên mở dossier của khách đã chọn; bỏ tab thể trạng/chi nhánh yêu thích trong hồ sơ nhân viên |
| Cao | Trang kết ca chưa gửi đủ trường BE đã hỗ trợ | Thêm tình trạng trước/sau và lời dặn; gửi cùng nội dung ca, lưu bằng workflow hiện có |
| Trung bình | Liệu trình khách chỉ có số buổi, thiếu nội dung và các bước dịch vụ | Trả và hiển thị mô tả gói, tên dịch vụ, thời lượng, các bước thật trong hồ sơ khách |
| Trung bình | Nhật ký thiếu liên kết về lịch hẹn và tên dịch vụ | Trả bookingId, tên dịch vụ, số buổi; thêm nút mở lịch hẹn tương ứng |
| Trung bình | Gói đã qua hạn vẫn hiện trạng thái đang sử dụng ở hồ sơ khách | Tính EXPIRED theo ngày hết hạn thật, thống nhất với luồng liệu trình |
| Trung bình | Lịch nhân viên thiếu tìm tên khách/số điện thoại/mã lịch | Thêm tìm kiếm không dấu, số định dạng nội địa/quốc tế, người trong nhóm và người liên hệ |
| Trung bình | Quay lại từ hồ sơ khách/tài liệu bị về nhầm Trang chủ | Giữ trang xuất phát và tab hồ sơ khách trong lịch sử điều hướng |
| Trung bình | Mở danh sách lịch từ Cá nhân có thể mở lại chi tiết lịch cũ | Xóa bookingTarget khi chủ động vào danh sách; giữ target khi mở từ hồ sơ/thông báo |
| Trung bình | Prefetch nhân viên gọi cả giao dịch, hội viên và bệnh án cá nhân | Chỉ warmup cài đặt, lịch sử tìm kiếm và đào tạo sở hữu; công việc tải bằng endpoint dành cho nhân viên |
| Trung bình | Dữ liệu công việc cũ còn trên màn hình khi BE từ chối quyền | Xóa dashboard/lịch/thông báo tương ứng khi nhận 401/403, không coi lỗi là dữ liệu rỗng thành công |
| Trung bình | Máy chủ cũ thiếu endpoint mới hiển thị như nội dung bị mất | Thông báo cần cập nhật BE, không tự điền số 0 hoặc bản ghi mẫu |
| Thấp | Mục đào tạo và thông báo ưu đãi còn mang ngữ cảnh khách hàng | Dùng nhãn Đào tạo, giữ khóa học nhân viên thực sự sở hữu, ẩn tùy chọn ưu đãi ở tài khoản nhân viên |

Endpoints mới kiểm tra lại quyền trên server mỗi lần gọi. ADMIN/SUPER_ADMIN có
phạm vi toàn hệ thống; nhân viên thông thường chỉ được xem khách đã có lịch ở
chi nhánh của mình. Không mở rộng quyền đọc bệnh án theo việc biết tên/số điện
thoại. Tra cứu khách cũ khi đặt hộ vẫn là luồng riêng với dữ liệu liên hệ tối thiểu.

## Kết quả đọc dữ liệu thật

| Dữ liệu | Kết quả quan sát |
| --- | --- |
| Dịch vụ đang bật | 1 |
| Chi nhánh đang bật | 2 |
| Chuyên viên đang bật | 7 |
| Khóa học đang bật | 8 |
| Bài học khóa học | 0 |
| Nội dung bảng miniapp_shared_content | 0 |
| Phân công bảng miniapp_technician_services | 0 |
| Ca làm từ ngày kiểm tra trở đi | 30 |
| Khung giờ AVAILABLE từ ngày kiểm tra trở đi | 155 |
| NV102 | RECEPTIONIST, hồ sơ và chi nhánh hoạt động |
| Đăng ký khóa học của NV102 | 2 bản ghi; không đồng nghĩa hai khóa đã có nội dung học |
| Công việc và khách đủ điều kiện trong phạm vi NV102 | 0 tại thời điểm đọc |

Có khung giờ không có nghĩa có thể bán dịch vụ: phải có phân công phù hợp,
thời lượng, ca làm, giường và chuyên viên không xung đột. Không tự gán mọi
chuyên viên cho mọi dịch vụ để làm xuất hiện giờ trống.

## Đối chiếu tài liệu yêu cầu

Các nhóm sau có luồng/code và kiểm thử hiện có; trạng thái dữ liệu và môi trường
thật được ghi riêng, không coi việc có code là đã vận hành toàn bộ hệ thống.

| Mục | Kết luận |
| --- | --- |
| 1–17, 19, 21–23 | Đặt hộ khách cũ/mới, nhiều người, tự phân bổ, kiểm tra giường/chuyên viên, chống trùng, kết ca và liệu trình có workflow. Đang thiếu phân công thật trong database nên không tự mở giờ nhận khách |
| 18, 20 | Đặt/điều chỉnh lịch thủ công thuộc Admin; không thay đổi hoặc xác nhận toàn bộ UI Admin trong lượt này |
| 24 | Thanh toán để cuối theo yêu cầu trước |
| 25–27, 29–31 | Dịch vụ/giá/tìm kiếm và ảnh chuyên viên đọc từ dữ liệu chung; đặt lịch không chọn chuyên viên |
| 28 | Tài liệu được gửi không có mục mang số 28 |
| 32–48 | Có hai nhóm đào tạo, nội dung chương/bài/video, YouTube theo chính sách, quiz, kết quả và quyền học; cần bài học/video thật. Đào tạo của nhân viên chỉ đọc đăng ký thuộc chính nhân viên |
| 49–51 | Nhắc lịch/kết quả qua email cần xác minh kênh gửi và cấu hình môi trường; thông báo trong app không phải bằng chứng email đã được gửi |
| 52–63 | Có kiểm tra quyền học, phiên video, watermark động và quản lý phiên tài khoản; chưa thể chứng nhận chặn quay/chụp trên mọi thiết bị |
| 64–65 | Chưa có bằng chứng DRM hoàn chỉnh. YouTube chỉ dành cho nội dung cho phép nhúng công khai, không thay cho streaming có DRM |
| 66–75 | Có Giấy chứng nhận, ngày sinh/ngày cấp, mã, QR tra cứu có chữ ký, quyền sở hữu và URL PDF thật. File/phôi được cấp là dữ liệu do đơn vị cung cấp; không tạo giả chữ ký/con dấu |
| 76–84 | Mục kiểm tra phù bạch huyết vẫn chờ cấu hình nghiệp vụ thật như đã chốt trước; chưa coi placeholder là hoàn thành luồng kiểm tra/kết quả/cấp giấy |
| 85–98 | Thanh toán, VAT, POS, in bill và đối soát để cuối; không đánh dấu đã hoàn thành |
| 99–110 | Thông báo nội bộ/nhắc lịch và chống lặp có workflow. OA/email gửi ra ngoài cần xác minh tích hợp và cấu hình môi trường thật |
| 111 | Đồng bộ qua database chung; chưa coi mọi chức năng Website và Mini App giống nhau nếu chưa kiểm thử Website |
| 112–127 | Có Trang chủ/Dịch vụ/Đào tạo/Tài liệu/Cá nhân, Cộng đồng, chi nhánh/chuyên viên, lịch và dossier khách. Tài liệu/cộng đồng trống vì chưa có nội dung được nhập; bài học khóa học cũng đang trống |
| 128–135 | Mini App theo giao diện trắng/xanh hiện có, đã kiểm tra responsive các luồng được sửa. Đồng bộ toàn Website/Admin cần phạm vi kiểm tra riêng |
| 136–157 | Các yêu cầu quản trị thuộc hệ thống Admin; lượt này chỉ dùng làm nguồn đối chiếu, không tuyên bố đã kiểm thử hoặc triển khai hết trên Admin |

## Kiểm chứng và giới hạn

- Bộ hồi quy minizalo/backend: 289/289 đạt sau khi thêm dashboard/directory.
- Sau bổ sung chi tiết liệu trình, chạy lại 14 kiểm thử liên quan dashboard,
  hồ sơ khách và kết ca: đạt.
- Frontend auth: 9/9; staff search/prefetch/payload kết ca: 2/2 đạt.
- TypeScript, build BE và build Mini App đạt; manifest không chứa development client.
- Chromium/WebKit, mỗi engine ở 320×640, 390×844, 1366×900: kiểm tra hồ sơ nhân viên,
  khách tự tải, tìm kiếm, mở đúng tab liệu trình, các bước dịch vụ, nhật ký, quay lại,
  tìm lịch và gửi đủ trường kết ca. SDK và dữ liệu trong browser test là fixture;
  không gửi yêu cầu ghi vào database chung.
- SDK Zalo có auto-login khi import entrypoint; browser fixture mô phỏng cả SDK ở
  lớp API và các import UI để không gọi bridge thật bên ngoài Zalo. Không thêm bộ
  nuốt lỗi vào ứng dụng. Chưa thay thế việc thử bản testing trên Zalo/iPhone thật.

Các thay đổi mới cần cập nhật BE minizalo/backend và bản Mini App cùng nhau.
Lượt này chưa push/deploy. Không có thay đổi mới ở Admin, Website hoặc database.
