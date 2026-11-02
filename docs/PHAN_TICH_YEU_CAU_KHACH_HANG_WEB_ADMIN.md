# Phân tích yêu cầu khách hàng — Web Admin MLD

> **Nguồn:** Ghi chú trong ảnh khách hàng gửi ngày 02/11/2026.  
> **Phạm vi:** Đào tạo, hồ sơ khách hàng, dịch vụ và điều trị trên Web Admin.  
> **Trạng thái:** Bản phân tích ban đầu; các mục **Cần chốt** phải được xác nhận trước khi triển khai.

## 1. Danh sách yêu cầu

| ID | Yêu cầu | Ưu tiên đề xuất | Phụ thuộc chính |
|---|---|---:|---|
| REQ-01 | Đổi thuật ngữ “chứng chỉ” thành “chứng nhận” | P1 | Chốt phạm vi thuật ngữ và giấy tờ |
| REQ-02 | Kiểm thử, sửa luồng nhập đề thi từ Excel | P1 | File Excel mẫu và quy tắc nhập |
| REQ-03 | Phân quyền xem/tải giáo trình, tài liệu | P1 | Ma trận vai trò và phạm vi khóa học |
| REQ-04 | Sửa phiếu đăng ký và/hoặc tải phiếu PDF | P1 | Mẫu phiếu, trường được sửa, quyền sửa |
| REQ-05 | Chia sẻ nhật ký điều trị qua liên kết/kênh gửi/PDF | P2 | Quyền riêng tư, bảo vệ liên kết, kênh gửi |
| REQ-06 | Nhắc lịch khách hàng và/hoặc học viên | P2 | Mốc nhắc, đối tượng, kênh gửi |
| REQ-07 | Hiển thị ảnh dịch vụ thay icon | P3 | Vị trí hiển thị và nguồn ảnh |

**Quy ước ưu tiên:** P1 là nghiệp vụ/dữ liệu/quyền truy cập cần xử lý trước; P2 là chia sẻ và thông báo; P3 là cải thiện giao diện. Đây là thứ tự đề xuất, không phải cam kết về thời gian hoặc thứ tự kinh doanh.

## 2. Phân tích và cách làm

### REQ-01 — Đổi “chứng chỉ” thành “chứng nhận”

**Mục tiêu:** Dùng thuật ngữ thống nhất tại các màn hình và tài liệu mà khách hàng chỉ định.

**Cách làm:**

1. Tìm các vị trí hiển thị thuật ngữ: menu, tiêu đề, biểu mẫu, thông báo, PDF và trang tra cứu.
2. Chốt đây là thay đổi nhãn hiển thị hay thay đổi tên loại văn bằng/nghiệp vụ.
3. Nếu chỉ đổi nhãn, cập nhật nội dung giao diện và đầu ra được yêu cầu; giữ nguyên schema, API và mã định danh.
4. Kiểm tra hồ sơ đã cấp, mã QR/mã tra cứu và luồng cấp mới để bảo đảm vẫn hoạt động.

**Cần chốt:** Áp dụng toàn hệ thống hay chỉ ở một số màn hình? Có sửa mẫu PDF và giấy tờ đã phát hành không?

### REQ-02 — Kiểm thử nhập đề thi từ Excel

**Mục tiêu:** Nhập đúng câu hỏi và đáp án, đồng thời chỉ rõ dòng lỗi trước khi dữ liệu được sử dụng.

**Cách làm:**

1. Lấy file Excel khách hàng đang dùng và xác nhận định dạng được hỗ trợ.
2. Đối chiếu các cột với dữ liệu hệ thống: câu hỏi, lựa chọn, đáp án đúng, giải thích và phân loại nếu có.
3. Thử file hợp lệ và các trường hợp lỗi: thiếu cột, thiếu đáp án, dòng trống, tiếng Việt, dữ liệu trùng.
4. Kiểm tra bước xem trước/xác nhận nhập; kết quả cần báo số dòng thành công và lỗi kèm số dòng, nguyên nhân.
5. Xác minh câu hỏi sau nhập hiển thị đúng trong ngân hàng câu hỏi và dùng được khi tạo đề.

**Cần chốt:** File mẫu chính thức; cách xác định câu hỏi trùng; khi có lỗi thì từ chối toàn bộ hay cho nhập các dòng hợp lệ?

### REQ-03 — Phân quyền tải giáo trình/tài liệu

**Mục tiêu:** Người dùng chỉ truy cập được tài liệu phù hợp với vai trò và quyền học tập của họ.

**Cách làm:**

1. Lập ma trận quyền cho quản trị viên, nhân viên đào tạo, giảng viên và học viên.
2. Xác định quyền riêng cho xem, tải, tải lên, sửa, xóa và chia sẻ; xác định phạm vi theo khóa học/lớp/bài học.
3. Thực thi kiểm tra quyền tại API và nơi lưu file; ẩn nút trên giao diện chỉ là hỗ trợ, không thay thế kiểm soát truy cập.
4. Nếu tệp cần bảo vệ đang truy cập bằng URL công khai, chuyển sang cơ chế bảo vệ phù hợp với hạ tầng hiện có.
5. Thử truy cập bằng tài khoản đúng quyền, sai quyền, đã đăng xuất và bằng URL trực tiếp.

**Cần chốt:** Ma trận quyền; thời hạn học viên được truy cập sau khóa học; quyền tải lên của giảng viên.

### REQ-04 — Sửa phiếu đăng ký và tải PDF

**Mục tiêu:** Nhân viên có thể cập nhật các trường được phép và lưu/tải phiếu đăng ký để in hoặc gửi.

**Cách làm:**

1. Xác định phiếu trong ảnh và luồng dữ liệu tạo phiếu.
2. Chốt trường được sửa, vai trò được sửa và thời điểm khóa chỉnh sửa (ví dụ sau duyệt hoặc thanh toán).
3. Xác định có cần lưu người sửa, thời điểm sửa và lịch sử phiên bản.
4. Bổ sung xem trước và tải PDF từ dữ liệu đã lưu; bảo đảm đúng mẫu, tiếng Việt, ngày tháng, tiền tệ và trường hợp nhiều trang.
5. Kiểm thử PDF tải xuống với dữ liệu đầy đủ, thiếu trường tùy chọn và nội dung dài.

**Cần chốt:** Tên/mẫu phiếu; trường được sửa; chữ ký/con dấu; chỉ tải PDF hay cần gửi qua email/Zalo.

### REQ-05 — Chia sẻ nhật ký điều trị

**Mục tiêu:** Gửi đúng nội dung nhật ký cho đúng khách hàng, đồng thời nhân viên theo dõi được kết quả gửi.

**Cách làm:**

1. Phân định trường được chia sẻ và ghi chú nội bộ không được đưa ra ngoài.
2. Chọn cách bảo vệ liên kết: đăng nhập hoặc mã xác thực, thời hạn, giới hạn người xem và khả năng thu hồi.
3. Tạo trang xem phù hợp điện thoại và PDF từ cùng bộ dữ liệu đã được phép chia sẻ.
4. Tích hợp các kênh được khách hàng chọn (email, Zalo OA, SMS); ghi nhận người gửi, người nhận, thời gian, trạng thái và lỗi.
5. Chống gửi trùng khi thao tác lặp; kiểm thử gửi thử và tình huống gửi thất bại trước khi bật chính thức.

**Cần chốt:** Nội dung chia sẻ; yêu cầu đăng nhập/mã xác thực/thời hạn; kênh gửi; mẫu tin; yêu cầu lưu trữ và thu hồi PDF/liên kết.

### REQ-06 — Nhắc lịch khách hàng/học viên

**Mục tiêu:** Gửi nhắc đúng lịch, đúng người, đúng thời điểm và không gửi lặp.

**Cách làm:**

1. Tách lịch dịch vụ của khách hàng và lịch học của học viên để xác định quy tắc riêng.
2. Chỉ rõ trạng thái lịch được nhắc; loại trừ lịch đã hủy/hoàn thành theo quy tắc đã chốt.
3. Cấu hình mốc gửi và kênh gửi theo từng đối tượng.
4. Chống gửi trùng theo lịch và mốc nhắc; ghi lịch sử gửi và lỗi.
5. Kiểm thử lịch mới, lịch đổi giờ, lịch hủy, người nhận thiếu thông tin và lỗi từ nhà cung cấp kênh gửi.

**Cần chốt:** Nhắc khách hàng, học viên hay cả hai; nhắc trước bao lâu; kênh; xử lý khi lịch đổi/hủy; nội dung tin.

### REQ-07 — Thay icon bằng ảnh dịch vụ

**Mục tiêu:** Hiển thị ảnh đại diện đúng dịch vụ tại vị trí khách hàng yêu cầu.

**Cách làm:**

1. Chỉ rõ màn hình/vị trí cần thay icon.
2. Xác định ảnh có sẵn hay cần tải lên, người quản lý ảnh và có khác nhau theo chi nhánh không.
3. Dùng trường ảnh dịch vụ hiện có nếu đáp ứng; thống nhất tỷ lệ, kích thước hiển thị và ảnh mặc định.
4. Kiểm tra ảnh lỗi/thiếu, tải chậm, danh sách dài và các kích thước màn hình.

**Cần chốt:** Vị trí thay icon; nguồn ảnh; người được cập nhật ảnh; quy tắc ảnh mặc định.

## 3. Trình tự triển khai

### Bước 1 — Chốt đầu vào với khách hàng

- Nhận file Excel mẫu, mẫu phiếu, ảnh dịch vụ và mẫu nội dung thông báo.
- Xác nhận các câu hỏi **Cần chốt** ở từng yêu cầu.
- Chốt ma trận quyền và các kênh gửi có sẵn/tài khoản tích hợp.

### Bước 2 — Kiểm tra hiện trạng

- Chạy thử nhập Excel, xuất PDF, chia sẻ nhật ký và nhắc lịch đang có.
- Kiểm tra quyền tài liệu tại giao diện, API và storage.
- Ghi lại lỗi tái hiện được, phần cần cấu hình và phần cần phát triển mới.

### Bước 3 — Triển khai theo rủi ro và phụ thuộc

1. Đổi thuật ngữ và ảnh dịch vụ sau khi phạm vi/nội dung đã chốt.
2. Sửa nhập Excel và xuất PDF phiếu đăng ký.
3. Hoàn thiện kiểm soát quyền tài liệu tại backend/storage, sau đó cập nhật giao diện.
4. Hoàn thiện chia sẻ nhật ký và nhắc lịch sau khi chốt quyền riêng tư, kênh gửi và quy tắc chống trùng.

### Bước 4 — Kiểm thử và nghiệm thu

1. Kiểm thử từng yêu cầu trên dữ liệu thử và tài khoản thuộc các vai trò liên quan.
2. Đối chiếu kết quả với tiêu chí nghiệm thu bên dưới.
3. Khách hàng xác nhận đạt/chưa đạt từng yêu cầu; ghi lại lỗi còn tồn tại trước khi phát hành.

## 4. Điều kiện nghiệm thu chung

- Hệ thống thực hiện đúng quy tắc nghiệp vụ và ma trận quyền đã được khách hàng xác nhận.
- Dữ liệu nhập, PDF và nội dung chia sẻ khớp với hồ sơ đã lưu; tiếng Việt hiển thị đúng.
- Tài liệu và nhật ký không thể truy cập vượt quyền, kể cả qua URL/API trực tiếp.
- Gửi nhắc/chia sẻ có trạng thái thành công hoặc lỗi, có lịch sử tra cứu và không gửi trùng ngoài ý muốn.
- Các luồng cũ như tra cứu hồ sơ đã cấp, QR, xem tài liệu của học viên đủ quyền vẫn hoạt động.
- Không có lỗi mức nghiêm trọng/cao trong các kịch bản đã thống nhất.

## 5. Điểm cần khách hàng xác nhận

1. Phạm vi đổi “chứng chỉ” thành “chứng nhận”, gồm PDF và hồ sơ cũ hay không.
2. File Excel chuẩn, quy tắc dữ liệu trùng và cách xử lý file có dòng lỗi.
3. Ma trận quyền tải tài liệu, gồm quyền của học viên sau khi kết thúc khóa.
4. Phiếu đăng ký cần sửa/tải, trường được sửa, quyền sửa và yêu cầu chữ ký/con dấu.
5. Dữ liệu nhật ký được chia sẻ, cách bảo vệ liên kết, các kênh gửi và mẫu thông báo.
6. Đối tượng, thời điểm, kênh và quy tắc xử lý lịch đổi/hủy khi nhắc lịch.
7. Vị trí hiển thị ảnh dịch vụ, nguồn ảnh và người quản lý ảnh.

## 6. Điểm bắt đầu kiểm tra trong mã nguồn

Đây là vị trí tham khảo để kiểm tra hiện trạng, không khẳng định chức năng đã hoàn chỉnh:

- Nhập đề thi Excel: `web-admin/src/admin/ExcelQuizImportModal.tsx`, `ResourcePage.tsx`, `QuestionEditorSheet.tsx`.
- Giáo trình/tài liệu: `web-admin/src/admin/LessonEditorSheet.tsx`.
- Nhật ký điều trị/PDF/chia sẻ và ảnh dịch vụ: `web-admin/src/admin/ResourcePage.tsx`, `ServiceDetailView.tsx`.
- Nhắc lịch: `supabase/functions/appointment-reminder/index.ts`.
- Dữ liệu chứng nhận: `database/schema.sql`, `web-admin/src/admin` (các màn hình quản lý chứng nhận).

## 7. Tình trạng triển khai trong mã nguồn

| ID | Đã làm | Còn cần trước khi nghiệm thu |
|---|---|---|
| REQ-01 | Đồng bộ các nhãn chính trên Web Admin, email, mẫu mặc định và tên chứng nhận khóa học mới. | Dữ liệu/mẫu đã phát hành được giữ nguyên để tránh sửa chứng từ lịch sử; khách hàng cần duyệt riêng nếu muốn sửa chúng. |
| REQ-02 | Siết nhận diện cột Excel, kiểm tra đáp án khớp lựa chọn, số câu trùng, phần mở rộng/dung lượng file và yêu cầu xác nhận khi bỏ qua dòng lỗi. | Kiểm thử thêm bằng file Excel chuẩn do khách hàng cung cấp. |
| REQ-03 | Kiểm tra quyền RPC gắn với tài khoản Supabase đã đăng nhập; upload chuyển qua API backend có xác thực, bỏ khóa đặc quyền khỏi frontend. | **Chưa hoàn tất bảo vệ file gốc:** các URL tài liệu hiện có thể trỏ tới bucket công khai. Muốn chống tải trực tiếp cần chuyển bucket sang private, cấp URL có chữ ký sau khi kiểm tra quyền, cập nhật cả ứng dụng học viên và xác minh dữ liệu URL hiện có. |
| REQ-04 | Phiếu đăng ký có nút tải PDF trực tiếp; xuất PDF hỗ trợ nội dung nhiều trang. | Khách hàng kiểm tra mẫu PDF và dữ liệu trên file thực tế. |
| REQ-05 | Nhật ký dùng token ngẫu nhiên lưu dạng hash, hết hạn sau 30 ngày, có thao tác thu hồi; trang công khai không còn truy vấn hồ sơ bằng ID trực tiếp. | Cần chạy migration và cấu hình backend; email hiện mở ứng dụng email, Zalo mở cuộc trò chuyện để nhân viên gửi thủ công. Gửi tự động qua Zalo OA/SMS cần cấu hình tài khoản, mẫu và thông tin tích hợp. |
| REQ-06 | Hàm nhắc lịch hiện có tiếp tục nhắc khách đặt dịch vụ và được mở rộng để quét lịch buổi học, chống gửi lặp theo mã lịch, dùng múi giờ Việt Nam. | Cần triển khai lại Supabase Edge Function `appointment-reminder` và xác nhận biến FCM để gửi push thật; nếu thiếu khóa FCM, hệ thống chỉ lưu thông báo vào cơ sở dữ liệu theo cơ chế hiện có. |
| REQ-07 | Danh sách dịch vụ dùng cột ảnh đại diện đã có; bổ sung ảnh dự phòng khi URL lỗi/thiếu. | Cần kiểm tra ảnh thật và vị trí hiển thị với khách hàng. |

### Các bước cần thực hiện khi triển khai

1. Chạy `database/migrations/020_secure_document_access_and_journal_sharing.sql` trên Supabase trước khi dùng link nhật ký mới.
2. Triển khai backend và Web Admin cùng phiên bản để API tạo/đọc/thu hồi link hoạt động.
3. Triển khai lại Edge Function `appointment-reminder` để bật nhắc lịch học.
4. Cấu hình `SUPABASE_SERVICE_ROLE_KEY` chỉ ở backend; khóa service-role từng bị đặt trong mã frontend cần được **thu hồi và tạo lại tại Supabase**. Việc sửa mã không làm vô hiệu khóa cũ.
5. Hoàn tất chuyển tài liệu đào tạo sang private storage và signed URL trước khi tuyên bố phân quyền tải đã được bảo vệ hoàn toàn.
6. Chạy lại kịch bản UAT với file Excel, phiếu PDF, tài liệu của từng vai trò, link nhật ký hết hạn/thu hồi, nhắc lịch dịch vụ/lớp học và ảnh dịch vụ.

