# Prompt giao Antigravity hoàn thiện Web Admin trước khi vận hành

> Sao chép toàn bộ phần **Prompt dành cho Antigravity** bên dưới vào Antigravity. Yêu cầu agent làm việc trực tiếp trên repository hiện tại, báo cáo thay đổi và các bước còn cần chủ dự án thực hiện.

---

## Prompt dành cho Antigravity

Bạn là kỹ sư phần mềm cấp cao phụ trách đưa hệ thống MLD Việt Nam từ môi trường phát triển sang vận hành production. Hãy kiểm tra repository hiện tại, sửa các vấn đề có thể xử lý an toàn bằng code/cấu hình, chạy kiểm thử và lập checklist cụ thể cho các thao tác cần chủ dự án hoặc nhà cung cấp thực hiện.

Phạm vi chính là Web Admin React/Vite, backend NestJS, PostgreSQL/Supabase, lưu trữ tài liệu và các dịch vụ được Web Admin sử dụng. Không coi tài liệu cũ hoặc các báo cáo tự đánh dấu “hoàn thành” là bằng chứng; hãy xác minh trong code, schema, cấu hình và test hiện tại.

## Trạng thái đã biết

- Migration database/migrations/020_secure_document_access_and_journal_sharing.sql đã được áp dụng trên Supabase đang cấu hình vào ngày 02/11/2026.
- Kiểm thử Supabase thật với dữ liệu tổng hợp đã đạt 6/6 luồng chia sẻ nhật ký và 6/6 luồng RPC phân quyền tài liệu. Dữ liệu thử đã được xóa. Không chạy lại migration trên production nếu chưa kiểm tra trạng thái trước.
- Backend build đã thành công. Trước đó, Web Admin có 8/8 test đạt; backend có 21/22 test đạt. Test lỗi được ghi nhận tại backend/src/modules/admin/admin.service.spec.ts khoảng dòng 178: test mong đợi lỗi liên quan POS nhưng nhận “Thiếu trường expires_at”. Hãy đọc test và implementation để xác định hợp đồng đúng; không làm yếu hoặc xóa test chỉ để làm bộ test xanh.
- File migration 020 đang chưa được Git theo dõi. Các thay đổi khác trong working tree cũng có thể là công việc của chủ dự án. Hãy kiểm tra git status trước khi sửa và giữ nguyên toàn bộ thay đổi không thuộc nhiệm vụ.
- Không có quyền mặc định để thay đổi cấu hình trong Render, Vercel, Supabase, Firebase, PayOS, DNS hoặc SMTP. Thực hiện code và tài liệu trước; ghi rõ từng thao tác ngoài repository cần chủ dự án làm. Không deploy hoặc ghi thêm dữ liệu lên production.

## Yêu cầu bắt buộc

### 1. Xử lý bí mật đã lộ

1. Tìm trong source, tài liệu, YAML, script, file mẫu, bundle frontend và lịch sử Git các database URL/mật khẩu, service-role key, JWT secret, refresh secret, khóa thanh toán, SMTP credential hoặc token thật.
2. Không in giá trị bí mật vào terminal, log, test output, báo cáo, chat hoặc commit mới. Khi báo cáo chỉ nêu tên biến và file/vị trí.
3. Xóa giá trị nhạy cảm khỏi file được version control; thay bằng biến môi trường hoặc placeholder rõ ràng. Không đưa secret vào bất kỳ biến VITE_* nào.
4. Đặc biệt kiểm tra scripts/database/apply_migration_010.js, render.yaml, docs/HUONG_DAN_DEPLOY_PRODUCTION_RENDER_VERCEL.md và các tài liệu deploy/test khác.
5. Không tự ý viết lại Git history. Ghi riêng danh sách credential cần thu hồi/đổi tại nhà cung cấp, vì xóa khỏi working tree không làm vô hiệu credential cũ.
6. Thêm kiểm tra tự động phù hợp để ngăn secret mới bị commit; tránh làm lộ giá trị khi công cụ phát hiện.

### 2. Cấu hình backend production

1. Kiểm tra render.yaml, backend/src/modules/admin/admin.database.ts, backend/src/modules/admin/admin.service.ts, backend/src/main.ts và tài liệu triển khai.
2. Đảm bảo Render có cấu hình kết nối PostgreSQL mà AdminDatabase thực sự cần (ADMIN_DATABASE_URL hoặc cấu hình tương thích đã được xác minh). Secret chỉ được nhập trong Render dashboard/secret store, không ghi giá trị thật vào YAML.
3. Production phải dùng JWT_SECRET ngẫu nhiên, riêng biệt, đủ độ dài và không dùng giá trị mẫu đang bị backend từ chối. Không dùng cùng một secret cho JWT, refresh token hay môi trường khác.
4. Thay CORS * bằng danh sách origin production chính xác. Giữ cấu hình local development riêng, không làm giảm bảo vệ ở production.
5. Xác minh health check, readiness check, kết nối DB, khởi động lại/deploy rollback và giới hạn kết nối. Nếu dùng gói Render có thể sleep, nêu rõ ảnh hưởng tới thời gian phản hồi và chọn cấu hình production phù hợp.
6. Không để service-role key hoặc database URL xuất hiện ở frontend bundle, source map công khai hoặc log.

### 3. Bảo vệ tài liệu và file upload

1. Theo luồng upload tại backend/src/modules/admin/admin.controller.ts và toàn bộ nơi tiêu thụ URL tài liệu trong Web Admin, học viên và Mini App.
2. Hiện trạng đã biết: upload dùng getPublicUrl. Thiết kế và triển khai cơ chế bucket private cho tài liệu cần giới hạn quyền; backend xác minh người dùng/ghi danh rồi mới cấp signed URL có thời hạn ngắn.
3. Áp dụng kiểm tra quyền tại server/storage, không dựa vào việc ẩn nút trên UI. Chặn truy cập trực tiếp bằng URL sau khi hết hạn/thu hồi khi storage hỗ trợ.
4. Rà soát xác thực MIME thật, phần mở rộng, kích thước, tên/path, quyền upload và loại nội dung được phép. Không mở rộng loại file nếu chưa có kiểm tra an toàn.
5. Thêm test cho người đúng quyền, sai quyền, chưa đăng nhập, ghi danh hết hạn/không duyệt, URL hết hạn và link cũ.
6. Không tự chuyển bucket production hoặc xóa/di chuyển file thật. Chuẩn bị migration/rollout và rollback rõ ràng; yêu cầu chủ dự án thao tác sau khi có kế hoạch review được.

### 4. Bảo vệ Edge Function nhắc lịch

1. supabase/config.toml hiện đặt verify_jwt = false cho appointment-reminder; function có thể nhắc theo booking cụ thể hoặc chạy quét hàng loạt.
2. Chọn cơ chế xác thực production phù hợp: JWT người dùng với kiểm tra vai trò/quyền cho yêu cầu đơn lẻ, và secret nội bộ/cron đã xác thực cho batch. So sánh secret theo cách an toàn, không log secret.
3. Không cho caller ẩn danh chọn booking của người khác hoặc kích hoạt batch; giới hạn thời gian, kích thước batch và tốc độ gọi.
4. Đảm bảo trạng thái lịch, thời điểm, múi giờ Việt Nam, chống gửi trùng và ghi nhận lỗi/kết quả nhất quán. Nếu có thể, dùng khóa idempotency/unique constraint thay cho check-then-insert dễ đua.
5. Khi thiếu FCM, không báo “đã gửi push thành công”; phân biệt rõ lưu thông báo trong app với push đã được nhà cung cấp xác nhận.
6. Chỉ kiểm thử bằng fixture local/staging. Không gọi function batch trên Supabase production trong nhiệm vụ này.

### 5. Bảo vệ OTP và email

1. backend/src/modules/auth/services/email.service.ts hiện ghi OTP vào log. Xóa OTP khỏi mọi log production; chỉ log mã tương quan, trạng thái và lỗi đã làm sạch.
2. Xác minh hành vi khi SMTP thiếu/sai cấu hình. Production không được giả vờ gửi OTP thành công khi email chưa gửi; phải trả lỗi phù hợp và không để lộ OTP trong phản hồi hoặc log.
3. Kiểm tra cấu hình SMTP ở server, xác minh TLS/chứng thư và timeout hợp lý. Không vô hiệu xác minh chứng thư TLS trong production.
4. Bổ sung test xác nhận OTP không xuất hiện trong logger, response hoặc error telemetry; xác nhận thất bại email không tạo trạng thái xác thực giả.

### 6. Thanh toán và webhook

1. Rà soát toàn bộ PayOS, SePay/Casso hoặc webhook đang có trong backend và tài liệu; không giả định tích hợp đã sẵn sàng chỉ vì có endpoint.
2. Xác minh chữ ký webhook, số tiền, mã giao dịch, đúng hóa đơn/lịch, chống phát lại và idempotency; callback trùng không được thu tiền/tích điểm hai lần.
3. Thêm hoặc cập nhật test bằng payload giả lập/sandbox. Không tạo thanh toán thật, không gửi tiền và không đánh dấu hóa đơn thật đã thanh toán.
4. Nếu provider chưa cấp credential/sandbox hoặc chưa xác minh đối soát, đánh dấu rõ “chưa được chứng nhận production” và liệt kê thao tác thủ công.

### 7. Khôi phục kiểm thử và kiểm soát chất lượng

1. Chạy build/test Web Admin và backend. Điều tra, sửa đúng nguyên nhân test POS/expires_at đang thất bại; không bỏ qua assertion.
2. Chạy lint/typecheck và kiểm tra git diff --check. Thêm test có ý nghĩa cho các sửa đổi bảo mật nêu trên.
3. Tạo E2E local/staging cho đăng nhập Admin, CRUD/quyền đại diện, upload/quyền tài liệu, tạo/thu hồi link nhật ký, đăng nhập/OTP theo cấu hình email, webhook sandbox. Mọi fixture phải được dọn trong finally và có bước xác minh không còn dữ liệu.
4. Không chạy các bài test gửi email/SMS/Zalo/FCM thật, gọi batch reminder production, tải lên bucket production hoặc tạo giao dịch thật.
5. Đối chiếu toàn bộ migration cần thiết với schema production ở chế độ chỉ đọc. Migration 020 đã áp dụng; không áp dụng lại hoặc sửa schema live trong nhiệm vụ này. Xác nhận file migration 020 được đưa vào phiên bản release.

### 8. Vận hành, giám sát và nghiệm thu

1. Bổ sung checklist backup và thử khôi phục, cảnh báo lỗi backend/DB, theo dõi job nền, log không chứa PII/OTP/secret, quy trình xử lý sự cố và người chịu trách nhiệm.
2. Xác minh domain/HTTPS, redirect, health/readiness, CORS, DNS, giới hạn tải lên, chính sách retention và quyền truy cập nhân viên.
3. Cập nhật tài liệu triển khai để không chứa credential hay URL có secret; thống nhất biến môi trường giữa local, staging và production.
4. Lập UAT cho: nhập Excel theo file mẫu, PDF phiếu đăng ký, ma trận quyền tài liệu, chia sẻ nhật ký, nhắc lịch, ảnh dịch vụ, luồng thu/hoàn tiền. Ghi rõ câu hỏi cần chủ dự án/khách hàng xác nhận và tiêu chí đạt.
5. Không tuyên bố “sẵn sàng production” khi còn blocker về credential, DB connection, JWT/CORS, tài liệu public, endpoint batch chưa xác thực hoặc test nghiêm trọng thất bại.

## Quy tắc làm việc

- Bắt đầu bằng git status, đọc hướng dẫn trong repository và lần theo code thật. Bảo toàn mọi thay đổi có sẵn; không checkout/reset/clean hoặc ghi đè file của người dùng.
- Tách công việc thành các thay đổi nhỏ, reviewable. Ưu tiên sửa code, test và tài liệu trong repository; không deploy, không đổi secret ở nhà cung cấp, không ghi dữ liệu lên production nếu chưa có chỉ thị riêng.
- Không sử dụng hoặc phát lại thông tin đăng nhập từng được gửi trong chat. Không tạo tài khoản quản trị thật để kiểm thử.
- Với mỗi thay đổi, nêu file, lý do, cách kiểm thử và kết quả. Khi bị chặn bởi thiếu quyền/credential/provider, hoàn thành phần độc lập rồi đưa checklist thao tác cụ thể cho chủ dự án.
- Cuối cùng đưa ra một trong ba trạng thái: CHƯA SẴN SÀNG, SẴN SÀNG CÓ ĐIỀU KIỆN, hoặc SẴN SÀNG; kèm blocker còn lại và bằng chứng kiểm thử. Không dùng trạng thái SẴN SÀNG nếu chỉ mới build thành công.

## Kết quả mong đợi

1. Code/config được sửa an toàn trong working tree, không có secret mới.
2. Test/lint/build đã chạy và kết quả được ghi rõ; test lỗi ban đầu được xử lý có căn cứ.
3. Tài liệu deploy và checklist vận hành cập nhật, không chứa giá trị bí mật.
4. Danh sách việc cần chủ dự án thực hiện ngoài repository: xoay vòng credential, nhập secret vào Render/Supabase, chuyển bucket, deploy, webhook sandbox, domain/HTTPS, backup/monitoring và nghiệm thu khách hàng.
5. Không có thay đổi production nào được thực hiện ngoài migration 020 đã được áp dụng trước đó.

---

## Ghi chú sử dụng

Trước khi chạy prompt, bảo đảm Antigravity mở đúng repository MLD_VietNam. Không gửi thêm mật khẩu, service-role key hoặc database URL vào cuộc trò chuyện; nhập secrets trực tiếp tại secret manager của nhà cung cấp khi đến bước cấu hình.

