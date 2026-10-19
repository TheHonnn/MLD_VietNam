# Rà soát Mini App ngày 18/10/2026

## Phạm vi và cách đọc

Chỉ sửa `minizalo/` trên `develop`. Không sửa admin, backend chung ngoài
`minizalo/`, schema chung hoặc bản ghi nghiệp vụ trên database thật.

Bảng dưới là kiểm kê mã nguồn màn hình, trường dữ liệu, nút và API đang dùng.
Không đồng nghĩa tất cả nút đã được bấm trên điện thoại Zalo thật. Kiểm thử trình
duyệt tập trung vào các luồng lưu dữ liệu quan trọng; các giới hạn được ghi riêng.
Không tạo tài khoản, lịch hẹn, bài học, câu hỏi hay thanh toán giả trong app.

## Kiểm kê các màn hình

| Màn hình / phần việc | Trường và thao tác đã đối chiếu | API / nơi lưu thật | Kết luận |
| --- | --- | --- | --- |
| Khởi động, giới thiệu chăm sóc | Chờ tải, tiếp tục, bỏ qua, quay lại | Trạng thái UI; không có bản ghi nghiệp vụ | Không cần API lưu |
| Kết nối Zalo | Chấp thuận, từ chối, thử lại, đóng | `/auth/zalo`, relay xác minh phía server | Cần Zalo thật và relay hợp lệ |
| Hoàn thiện hồ sơ mới | Tên, số đã xác minh, ảnh, sinh nhật, giới tính, email | `/auth/zalo/register`; `users` | Không tự tạo tên hay số điện thoại |
| Chọn mối quan tâm | Spa, học viện, cả hai, quay lại, khám phá | `users.purpose` cùng bước đăng ký | Không báo thành công khi chưa lưu |
| Trang chủ | Chọn cơ sở, ảnh/dịch vụ nổi bật, lịch gần nhất, tìm kiếm, thông báo, khám phá, cập nhật | Catalog và dữ liệu tài khoản | Dữ liệu API; không lấy ví dụ từ Figma |
| Dịch vụ | Từ khóa không dấu, danh mục, giá từ/đến, thời lượng, sắp xếp, xóa bộ lọc, chi tiết, đặt lịch | `/services`, `/app-metadata` | Lọc dữ liệu thật; khoảng giá sai có thông báo |
| Chi tiết dịch vụ | Ảnh, danh mục, tên, giá, thời lượng, mô tả, lợi ích, các bước, ảnh phụ, đánh giá, chia sẻ | Catalog dịch vụ và `reviews` | Nút yêu thích chưa có nơi lưu nên bị khóa |
| Tìm kiếm chung | Năm lựa chọn, từ khóa, kết quả, gần đây, phổ biến, xóa một/xóa hết | `/search/history`, `/search/popular` | Lịch sử theo tài khoản; khách vãng lai không lưu lịch sử cá nhân |
| Hệ thống chi nhánh | Tìm không dấu, thành phố, danh sách/bản đồ, gần tôi, dịch vụ và ngày có lịch trống | `/branches`, `/slots` | Chỉ dùng tọa độ và giờ trống có thật |
| Chi tiết chi nhánh / chỉ đường | Ảnh chính/phụ, tên, địa chỉ, giờ mở cửa, tiện nghi, bản đồ, đặt lịch | `branches`, bản đồ bên ngoài | Không dựng khoảng cách hoặc địa chỉ giả |
| Danh sách chuyên viên | Tên/chuyên môn không dấu, cơ sở, chuyên môn, dịch vụ, ngày/giờ trống, thứ tự | `/doctors`, `/slots` | Đổi bộ lọc không dùng phản hồi cũ |
| Chi tiết chuyên viên | Ảnh, tên, chức danh, kinh nghiệm, chuyên môn, cơ sở, đánh giá, đặt lịch | `technicians`, `reviews`, `branches` | Không dựng sao đánh giá khi chưa có đánh giá |
| Đặt lịch: dịch vụ | Chọn, tìm, danh mục, giá, thời lượng, tiếp tục/quay lại | Catalog dịch vụ | UI hiện chọn một dịch vụ; BE vẫn đọc đủ lịch nhiều dịch vụ do admin tạo |
| Đặt lịch: cơ sở | Tìm, thành phố, bản đồ/danh sách, lựa chọn | Catalog cơ sở | Không tự gán dịch vụ riêng cho cơ sở |
| Đặt lịch: chuyên viên | Tự xếp/chọn chuyên viên, chuyên môn, cơ sở phù hợp | Catalog chuyên viên, `technician_slots` | BE kiểm tra và giữ chỗ trong transaction |
| Đặt lịch: ngày/giờ | Tuần trước/sau, lịch tháng, các buổi, thử lại, giờ được chọn | `/slots` | Không có giờ thì để trống, không sinh các giờ mẫu |
| Đặt lịch: người nhận | Bản thân/người khác, họ tên, điện thoại, email liên hệ, ghi chú | `bookings`; email liên hệ lưu trong `special_notes` vì schema không có cột email người nhận | Đã thử đủ bảy bước và đọc lại dữ liệu |
| Xác nhận / thanh toán lịch | Sửa dịch vụ/cơ sở/giờ/người nhận, giá và ưu đãi, xác nhận cuối | `/bookings`; `booking_items`, `technician_slots`, ví voucher, thông báo | Chỉ thanh toán tại chi nhánh; không giả giao dịch online |
| Phiếu đặt thành công | Mã, trạng thái, giá, giờ, người nhận, QR, xem lịch hẹn | Bản ghi booking trả từ BE | Chỉ hiện sau khi server lưu thành công |
| Lịch hẹn của tôi | Sắp tới/hoàn thành/hủy/tất cả, ngày, cơ sở, dịch vụ, trạng thái, đặt mới | `/bookings` theo chủ sở hữu | Lịch đã qua không xếp vào Sắp tới |
| Chi tiết / đổi / hủy lịch | Đủ dịch vụ và thời lượng, giá đã chốt, khách nhận, ghi chú; đổi giờ; xác nhận hủy | `/bookings/:id/slots`, `/reschedule`, `/cancel` | Đổi theo tổng thời lượng snapshot; không đổi giá lịch cũ theo catalog mới |
| Gói liệu trình | Danh sách trạng thái, tổng/đã dùng/còn lại, ngày mua, hạn, chi tiết | `/treatment-plans`; `user_packages`, `treatment_packages` | Số buổi sở hữu không bị thay bằng cấu hình gói hiện tại |
| Chi tiết liệu trình | Gói, dịch vụ, mô tả, thời lượng, lợi ích, các bước từng buổi, tiến độ và các phiên đã làm | Gói + dịch vụ + nhật ký theo chủ sở hữu | Đã bổ sung các trường thật; đặt buổi theo gói còn thiếu liên kết schema |
| Nhật ký chăm sóc | Buổi, ngày, cơ sở, phòng, chuyên viên, tình trạng trước/sau, nội dung, lời khuyên, ảnh, chữ ký | `/records`; `treatment_journal` | Khách đọc; không tự ghi buổi điều trị chưa xảy ra |
| Phiếu trước dịch vụ | Lịch hẹn hoặc sở thích chung, vùng chăm sóc, lực, bệnh nền, da nhạy cảm, dị ứng, yêu cầu | `/consultation-surveys` | Kiểm tra kiểu dữ liệu và sở hữu, lưu rồi mở lại được |
| Đánh giá dịch vụ | Sao, nhận xét, nhãn, ảnh, lịch sử, trả lời của cơ sở | `/reviews`, `/reviews/mine` | Chỉ lịch hoàn thành của mình; chặn gửi trùng trong transaction |
| Chăm sóc tại nhà | Danh sách, ảnh, mô tả, nội dung và các bước, quay lại | `/care-guidelines` | Chỉ bài đã xuất bản |
| Hỗ trợ | Câu hỏi thường gặp, gửi chủ đề/nội dung, lịch sử, trả lời nhân viên | `/support-faqs`, `/support-tickets` | Lưu theo tài khoản; không dựng phản hồi hỗ trợ |
| Thông báo | Tất cả/chưa đọc, đọc một/đọc hết | `/notifications`, `/notifications/:id/read`, `/read-all` | Chỉ đổi UI sau khi BE xác nhận; xử lý ngày không hợp lệ |
| Trang học viện | Hồ sơ, cơ sở đào tạo, khóa nổi bật, tìm khóa, khóa của tôi, thông báo | Catalog, `course_batches`, tài khoản | Không có khóa thuộc cơ sở thì để trống |
| Khám phá khóa học | Từ khóa không dấu, danh mục, trình độ, số giờ, học phí, cơ sở | `/courses`, catalog cơ sở/lớp | Hình thức online/offline chưa có trường nên không bịa lựa chọn |
| Chi tiết khóa học | Ảnh, học phí, giờ lý thuyết/thực hành, đầu ra, giảng viên, chương/bài, bài kiểm tra, lớp mở, xem trước | `courses`, `course_chapters`, `course_lessons`, `course_quizzes`, `course_batches` | Đã bổ sung chương trình học; không lộ bài riêng tư hoặc đáp án đúng |
| Giảng viên | Tên, ảnh, giới thiệu, kinh nghiệm, thành tích, các khóa của giảng viên | `instructors`, `courses` | Dữ liệu admin thật |
| Đăng ký khóa | Hồ sơ đã xác minh, lớp, kiểm tra học phí, gửi đăng ký | `/course-enrollments` | Kiểm tra lớp, sức chứa và trùng; lưu CONSULTING, không tự trả tiền/ghi danh |
| Học phí | Tổng đã chốt, đã thu, còn lại, mã và biên lai thật | `course_enrollments`, `tuition_transactions` | Không có thanh toán online hoặc biên lai giả |
| Khóa học của tôi | Sắp học/đang học/hoàn thành, lớp, giảng viên, lịch, tiến độ, học phí/tiếp tục học | `/course-enrollments` theo chủ sở hữu | Mỗi lớp dùng enrollment riêng |
| Nội dung lớp | Chương, bài, ghi chú, tiếp tục, chọn lớp, quay lại | `/courses/:id/learning` | Không lấy tiến trình lớp này áp sang lớp khác |
| Video / tài liệu / thực hành | Phát video, lỗi phát, tài liệu, mục tiêu, nội dung, ghi chú, xác nhận đã đọc | `course_lessons`, `/lessons/:id/progress` | Hướng dẫn thực hành có thể đọc/lưu; đóng bài lưu ghi chú, lỗi lưu giữ màn hình và bản nháp |
| Bài loại QUIZ | Mở kiểm tra của khóa thay vì khung phát video rỗng | Bộ bài kiểm tra của khóa | Schema chưa liên kết một lesson với một quiz cụ thể |
| Lịch học / tài liệu | Ngày/giờ, chủ đề, phòng, giảng viên, điểm danh; mở file thật | `batch_schedules`, `student_attendance`, attachments | Khách không được tự sửa điểm danh |
| Trắc nghiệm | Chọn đề, câu hỏi, lựa chọn, trả lời đủ, nộp, điểm, lịch sử bài làm, nhận xét giảng viên | `course_quizzes`, `quiz_questions`, `quiz_submissions` | BE chặn câu ngoài đề/đáp án không hợp lệ; lưu lựa chọn chuẩn hóa và mở lại được |
| Kết quả / chứng chỉ | Điểm, chuyên cần, nhận xét theo tiêu chí, tốt nghiệp, PDF/QR đã cấp | `student_academic_records`, `student_certificates` | Không tự cấp chứng chỉ khi trả lời quiz đúng |
| Cá nhân | Hồ sơ, số lịch/gói/khóa, mở từng mục | `/auth/me`, `/membership` | Đã cập nhật lại summary và ví sau thao tác lịch hẹn |
| Sửa hồ sơ / thông tin sức khỏe | Ảnh, tên, sinh nhật, giới tính, email, địa chỉ, liên hệ khẩn cấp, lưu | `/auth/profile`; `users` | Số điện thoại không đổi trực tiếp; trường chưa có schema bị khóa |
| Thẻ / hạng / điểm | Hạng, quyền lợi, mức tích điểm, lịch sử điểm, mã thẻ nếu được cấp | `membership_tier_rules`, `loyalty_point_settings`, `point_transactions` | Không tự sinh mã thẻ, mã vạch hoặc phần thưởng |
| Ví ưu đãi | Nhập mã, nhận, sao chép, dùng, trạng thái | `/vouchers/claim`, `/vouchers/apply`, `user_vouchers` | Điều kiện BE và ví theo chủ sở hữu; giá cuối tính lại lúc đặt |
| Giao dịch / hóa đơn | Danh sách, mở chi tiết, dòng hàng, tổng và PDF thật | `/transactions`; `invoices`, `invoice_items` | Không tự xác nhận thu tiền |
| Giới thiệu bạn bè | Mã giới thiệu, sao chép, lịch sử thưởng | `users.referral_code`, `referrals` | Chia sẻ referral chưa có luồng gán/referral URL chuẩn |
| Cài đặt / đăng xuất | Lưu tùy chọn thông báo, ngôn ngữ tài khoản, thoát phiên | `/auth/settings`, session local | Lưu tùy chọn không đồng nghĩa đã có dịch thuật/push; sinh trắc và xóa cache chưa triển khai |

## Các lỗi đã sửa trong lượt này

1. Đổi lịch nhiều dịch vụ: API riêng có xác thực dùng tổng thời lượng đã đặt,
   không dùng thời lượng của dịch vụ đầu tiên hoặc giá/thời lượng catalog mới.
2. Cập nhật cả chuyên viên trên booking và booking_items khi BE phải phân công lại.
3. Không nhận yêu cầu thanh toán online hoặc dùng gói như một booking tiền mặt bình thường.
4. Chặn giây thời gian không được hỗ trợ, cơ sở/dịch vụ/danh mục ngừng hoạt động,
   kiểu phiếu tư vấn sai, đáp án ngoài đề và đáp án thiếu/không tồn tại.
5. Khóa bản ghi khi tạo đánh giá để hạn chế gửi trùng đồng thời.
6. Đủ bước dịch vụ của gói, phòng, chữ ký và nội dung nhật ký có trong DB.
7. Hướng dẫn thực hành không còn bị xử lý như video; bài QUIZ mở phần kiểm tra.
8. Đóng bài lưu ghi chú trước; lỗi lưu không đóng màn hình hoặc làm mất bản nháp.
9. Lịch sử bài kiểm tra trả về lựa chọn đã lưu và nhận xét của giảng viên.
10. Cập nhật số lịch/ví sau đổi/hủy; không xếp lịch đã qua vào Sắp tới.

## Dữ liệu thật hiện có

Kiểm tra chỉ đọc ngày 18/10/2026: 3 dịch vụ, 2 cơ sở, 2 kỹ thuật viên,
2 khóa học, 1 giảng viên, 2 lớp. Các bảng bài học, lịch học, câu hỏi trắc nghiệm,
khung giờ kỹ thuật viên, chăm sóc tại nhà và FAQ đang có **0 bản ghi**.

Đây là thiếu nội dung admin, không phải lý do để app tự tạo dữ liệu mẫu.
Nhân viên cần nhập chương, bài, file/video hợp lệ, đề/câu hỏi/đáp án, lớp/lịch học,
ghi danh và khung giờ thật trước khi khách có thể sử dụng các nội dung đó.
Không đọc xuất hoặc thay đổi thông tin cá nhân để làm kiểm thử.

## Chưa thể gọi là hoàn chỉnh để vận hành

- **Đặt lịch theo gói:** bookings/booking_items chưa có user_package_id hoặc bảng
  giữ chỗ/hoàn buổi. Cần thống nhất schema và nghiệp vụ với admin: giữ buổi lúc đặt,
  hoàn khi hủy, trừ lúc hoàn thành, chống trừ hai lần và quá số buổi. Nút hiện khóa;
  không tạo nhật ký chăm sóc giả để thay liên kết này.
- **Đề thi có giờ giới hạn:** chưa có phiên làm bài với thời điểm bắt đầu, hết hạn,
  chính sách thi lại do server quản lý. Không dựng đồng hồ rồi coi là thi có bảo đảm.
- **Một bài QUIZ gắn một đề cụ thể:** hiện schema có bài và đề theo khóa, chưa có
  liên kết riêng giữa lesson_id và quiz_id; mở bộ đề của khóa, không đoán đề tương ứng.
- **Ảnh chụp đề tại thời điểm nộp:** submitted_answers lưu lựa chọn nhưng không lưu
  snapshot nội dung câu hỏi/đáp án. Nếu admin sửa câu hỏi sau đó, không thể hứa tái dựng
  nguyên đề cũ; UI chỉ đọc lại lựa chọn đã lưu với câu hiện có.
- **Hỏi đáp riêng theo bài/khóa và học viên đánh giá khóa:** chưa có bảng/luồng dành
  riêng trong schema hiện tại. Không dùng đánh giá dịch vụ spa để giả làm đánh giá khóa.
- **Thanh toán online, hoàn tiền, dùng điểm, cấp thẻ, referral, sinh trắc:** cần backend
  chung/nhà cung cấp tương ứng; các nút chưa hỗ trợ không báo thành công giả.
- **Zalo trên thiết bị thật:** cần thử đăng nhập/quyền/tunnel trong Zalo. Chrome không
  thay thế được kiểm thử SDK hoặc xác nhận relay trên mạng Việt Nam.

Không tự áp dụng migration mới lên database chung trong lượt này.

## Kiểm chứng

- `npm.cmd test`: **73 bài đạt**, dùng PostgreSQL tạm trong bộ nhớ.
- `check-workflow-browser.mjs`: đặt đủ bảy bước cho người khác, kiểm tra dữ liệu,
  đổi/hủy theo đủ thời lượng, gói/bước/nhật ký, ghi chú thực hành, lỗi lưu không mất
  bản nháp, bài QUIZ và đáp án đã nộp. Khung 390x844, 320x640 và 1366x900.
- `check-academy-browser.mjs`: tám màn học viện, đăng ký, tiến độ, lịch, bài kiểm tra.
- `check-search-browser.mjs`, `check-branch-navigation.mjs`: lịch sử, điều hướng,
  lọc giá/thời lượng, cơ sở, chuyên môn, giờ trống và lỗi API.
- TypeScript và Vite build; còn cảnh báo Sass legacy API và bundle lớn.

Các bản ghi ví dụ chỉ tồn tại trong `test/fixtures/` và database thử nghiệm trong
bộ nhớ, không được đưa vào bundle app hoặc ghi vào database chung.

Bản local tại `http://127.0.0.1:5177/` dùng API chỉ đọc. Xem được dữ liệu thật nhưng
không thể dùng bản local này để xác nhận thao tác ghi lên production. Không push/deploy.

## Tải trước khi khởi động, cập nhật 19/10/2026

- Catalog, cấu hình, cơ sở, chuyên viên, khóa học, chăm sóc tại nhà, FAQ và tìm kiếm
  phổ biến bắt đầu tải ngay khi mở app, kể cả khi màn xin quyền vẫn đang hiển thị.
- Sau xác thực, tải trước lịch hẹn, gói/nhật ký, ví/hạng, thông báo, cài đặt, giao dịch,
  hỗ trợ, khảo sát, đánh giá, lịch sử tìm kiếm và ghi danh. Nội dung riêng của mọi lớp
  được phép học được tải trước theo enrollment, tối đa ba yêu cầu lớp cùng lúc.
- Những trang này dùng chung bộ nhớ đệm JSON và khởi tạo từ dữ liệu đã tải; không
  gọi trùng một yêu cầu đang chạy. Khách chưa xác thực không tải dữ liệu riêng.
- Bộ nhớ đệm chỉ ở RAM, theo phiên/tài khoản, giới hạn 256 mục và thời hạn 60 giây.
  Đăng xuất/đổi tài khoản xóa dữ liệu riêng, chặn phản hồi cũ quay lại sau khi thoát.
  Phản hồi lỗi hoặc sai cấu trúc không được lưu làm dữ liệu thành công.
- Sau thao tác ghi thành công, xóa đúng nhóm cache liên quan để đọc lại dữ liệu thật.
  Nút Cập nhật dữ liệu bỏ cache và tải mới. Cấp quyền/đăng nhập không bỏ phí catalog
  công khai đã tải trong lúc chờ quyền.
- Ảnh catalog được chuẩn bị trong nền. Không tải toàn bộ byte video/PDF trước khi
  người dùng cần; điều này tránh tốn mạng/bộ nhớ. Không giữ cache giờ trống, giá/ưu đãi
  xác nhận hoặc kết quả thao tác ghi. Đặt/đổi/hủy lịch vẫn được server kiểm tra mới.
- `check-preload-browser.mjs` kiểm tra tải trong lúc xin quyền, không đọc riêng trước
  xác thực, tải trước các lớp, không gọi lại khi mở trang, invalidation sau lưu, giờ
  trống luôn mới và xóa cache khi thoát, ở ba khung màn hình.
- Bộ kiểm thử backend và tiện ích cache hiện có 77 bài đạt. Các kiểm thử ghi dữ liệu
  vẫn chỉ dùng PostgreSQL tạm trong bộ nhớ, không ghi database chung.
