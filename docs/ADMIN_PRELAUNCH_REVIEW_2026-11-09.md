# Rà soát mức sẵn sàng vận hành — Admin MLD Việt Nam

> Đây là ảnh chụp **trước đợt sửa tiếp theo trong ngày 09/11**. Các số liệu lỗi bên dưới đã thay đổi; xem `docs/ADMIN_IMPLEMENTATION_STATUS_2026-11-09.md` để biết trạng thái hiện tại.

Ngày rà soát: 09/11/2026. Phạm vi: `web-admin`, module admin trong backend, migration/RPC và cấu hình phục vụ admin. Không đánh giá ứng dụng khách hàng, mobile hay minizalo.

**Kết luận: chưa nên mở admin cho vận hành thật.** Cần đóng các lỗi P0 bên dưới trước, sau đó nghiệm thu dữ liệu và các luồng nghiệp vụ trên staging. Lượt này phân tích và kiểm chứng, không thay đổi mã nghiệp vụ hoặc cấu hình production.

## Bằng chứng kiểm tra hiện tại

- Frontend `npm test`: 16/16 đạt; log `.local-archive/admin-review/audit-frontend-tests.log`.
- Riêng backend admin `npx vitest run src/modules/admin`: 24/29 đạt, 5 thất bại; log `.local-archive/admin-review/audit-admin-tests.log`.
- Backend build: TS2339 tại `admin.controller.ts:226` do thiếu `AdminService.cashierWorkspace`; log `.local-archive/admin-review/audit-backend-build.log`. Chưa thể xác nhận lại E2E toàn admin.
- Bộ backend toàn dự án chạy trong lượt này có 45/51 đạt; ngoài 5 lỗi admin còn 1 lỗi app controller. Lỗi ngoài admin không nằm trong danh sách ưu tiên của báo cáo này.
- Kiểm chứng AdminGuard cô lập: chữ ký token bị từ chối nhưng guard vẫn chấp nhận qua nhánh lookup tài khoản và gán SUPER_ADMIN từ fixture. Script `.local-archive/admin-auth-audit.cjs`; bằng chứng `.local-archive/admin-review/admin-auth-audit.json`. Không có kết nối mạng, không dùng tài khoản thật.
- Giao diện bảng giá đã có kết quả local ở 1440/768/390px trong lượt kiểm tra trước: chuyển tab, mở/hủy sửa giá, gọi in, cuộn ngang; không phải bằng chứng lưu dữ liệu thật.

## P0 — Phải hoàn tất trước khi mở truy cập thật

### 1. Xác thực token đang có đường đi không kiểm tra chữ ký

**Nguồn:** `backend/src/modules/admin/admin.guard.ts:107–114`, `:180–188`.

Sau khi verify thất bại, guard decode token rồi gọi `auth.admin.getUserById(sub)`. Lookup này chỉ xác nhận tài khoản tồn tại, không chứng minh token thuộc người gọi. Kiểm chứng cô lập đã tái hiện guard chấp nhận token sai chữ ký. Ngoài ra còn nhánh tự dựng SUPER_ADMIN theo email khi không tìm được bản ghi users.

**Cần nâng cấp:** chỉ xác thực bằng kiểm tra chữ ký/issuer/audience/expiry đúng nguồn hoặc `auth.getUser(token)`; xóa đường đi chỉ dựa vào decode/lookup; không tự cấp quyền theo email. Tài khoản phải tồn tại và còn hoạt động, lỗi DB/quyền phải từ chối truy cập.

**Nghiệm thu:** token sai chữ ký, hết hạn, sai issuer/audience, người dùng bị khóa/xóa và lỗi dịch vụ xác thực đều bị chặn; token hợp lệ chỉ nhận đúng role/scope được cấp. Thêm kiểm thử cho chính nhánh fallback, không chỉ đường JWT nội bộ hợp lệ.

### 2. Bí mật và kết nối DB dự phòng nằm trong mã nguồn

**Nguồn:** `backend/src/modules/admin/admin.database.ts:28–34`, `admin.guard.ts:64–66`.

Có connection string chứa thông tin đăng nhập DB và JWT secret dự phòng trong mã nguồn. Thiếu cấu hình có thể khiến ứng dụng dùng kết nối dự phòng thay vì dừng. Kết nối DB cũng đang tắt xác minh chứng chỉ TLS. Báo cáo không chép lại giá trị nhạy cảm.

**Cần nâng cấp:** xoay vòng các credential liên quan nếu còn sử dụng, đưa secret vào cấu hình triển khai; xóa giá trị dự phòng; thiếu env phải dừng với lỗi rõ; cấu hình TLS theo chứng chỉ tin cậy. Rà lịch sử Git và gói bàn giao vì xóa khỏi tệp hiện tại không thu hồi được giá trị đã phát tán. Anon key trên trình duyệt là khóa công khai, không đánh đồng nó với DB password hoặc JWT signing secret.

**Nghiệm thu:** không còn secret thật trong mã/artifact; credential cũ bị thu hồi; bản triển khai thiếu env không tự kết nối DB khác.

### 3. Quyền RLS/RPC có nhánh mở quá rộng

**Nguồn:** `database/migrations/023_fix_rls_security_and_timezone_auto_release.sql:14–40`, `:43–76`; `026_receipt_items_refund_commission.sql:80–89`.

Migration 023 tạo policy FOR ALL cho toàn bộ `authenticated` với `USING(true)` và `WITH CHECK(true)` trên nhật ký điều trị, log tiêu hao và user_roles. Nó cũng cấp anon quyền chạy RPC SECURITY DEFINER cập nhật trạng thái lịch hẹn, cho phép bỏ trống chi nhánh và không kiểm tra người gọi trong thân hàm. Nếu policy và table grants này đang có hiệu lực, tài khoản đăng nhập thông thường có thể có quyền vượt xa chức năng được giao. RPC sửa biên lai tại migration 026 kiểm tra role nhưng chưa kiểm tra hóa đơn thuộc chi nhánh được cấp cho thu ngân/quản lý.

**Cần nâng cấp:** lấy danh sách policy/grant/function thực tế trên staging, lập migration thu hẹp theo vai trò, hành động và chi nhánh; thu hồi quyền anon không cần thiết; hàm đặc quyền phải kiểm tra scope trong thân hàm. Không chỉ sửa tên policy hoặc chặn menu frontend.

**Giới hạn xác minh:** đã xác nhận nội dung SQL trong repo; chưa xác nhận các policy nào đang chạy trên Supabase thật. Không được kết luận môi trường thật đã bị truy cập trái phép từ bằng chứng này.

**Nghiệm thu:** khách hàng, nhân viên chi nhánh A, thu ngân A không thể đọc/ghi hoặc gọi RPC tác động dữ liệu chi nhánh B; kiểm tra bằng JWT thật trên staging cho cả REST và RPC.

### 4. Backend chưa tạo được bản triển khai

**Nguồn:** `backend/src/modules/admin/admin.controller.ts:226`, `admin.workflows.spec.ts:118`.

Endpoint workspace POS gọi phương thức chưa tồn tại. Đây là lỗi build đã tái hiện, đồng thời chặn kiểm tra tích hợp của admin.

**Cần nâng cấp:** hoàn thiện phương thức workspace với hợp đồng dữ liệu khớp frontend, lọc chi nhánh và loại trường nhạy cảm. Không khắc phục bằng cách bỏ endpoint hoặc bỏ test. Sau đó chạy build và E2E từ cùng một snapshot mã nguồn.

## P1 — Hoàn tất trước khi nhận giao dịch và dữ liệu vận hành

### 5. Thống nhất nguồn dữ liệu và bỏ chuyển nguồn sau lỗi ghi

**Nguồn:** `web-admin/src/services/supabaseService.ts:159–224`, `src/admin/api.ts:1517–1534`, `pages/W06_ServicesCatalog.tsx:116,267`.

Lớp adminApi đã giữ lỗi tốt hơn, nhưng SupabaseService cũ vẫn gửi lại yêu cầu với anon key sau 401, rồi có thể chuyển POST/PATCH sang adminApi sau lỗi. Nếu máy chủ đã ghi nhưng phản hồi bị mất, cách này có thể phát sinh lần ghi tiếp theo; lỗi quyền cũng có thể bị che thành null/danh sách rỗng. Chọn `VITE_ADMIN_DATA_SOURCE=backend` không tự chuyển các màn hình đang gọi Supabase SDK trực tiếp.

**Cần nâng cấp:** mọi thao tác nghiệp vụ admin đi qua một hợp đồng API được kiểm quyền, kiểm dữ liệu, transaction và audit nhất quán. Nếu giữ REST/RPC trực tiếp thì phải có bảo vệ tương đương ở DB. Không thử lại ghi hoặc đổi danh tính khi kết quả chưa rõ; chỉ refresh phiên hợp lệ và buộc xác minh kết quả. Idempotency phải nằm ở server cho khoản thu, hoàn tiền và thao tác quan trọng.

**Nghiệm thu:** 401/403/409, mất mạng sau commit và bấm hai lần không tạo trùng hoặc đổi nguồn; giao diện phân biệt lỗi, rỗng và kết quả chưa xác minh. Kiểm tra cả lớp SupabaseService cũ.

### 6. Khép kín phân quyền theo bản ghi, tài liệu và liên kết chia sẻ

**Nguồn:** `admin.controller.ts:90–129`, `:210–221`; RPC sửa biên lai đã nêu ở mục 3.

Endpoint tạo/thu hồi link nhật ký kiểm tra quyền module rồi cập nhật bằng service role theo id, chưa kiểm tra phạm vi chi nhánh của bản ghi. Endpoint ký URL tài liệu nhận path do người gọi đưa vào, chưa có kiểm tra quyền với tài liệu tương ứng. Guard có thể cho tài khoản có quyền module khác đi tới route không chứa table, nên đăng nhập không đủ thay thế kiểm tra quyền tài liệu.

**Cần nâng cấp:** kiểm tra quyền hành động và quyền đối với bản ghi/tệp trước khi dùng service role; lưu chủ sở hữu/chi nhánh của tệp; bảo vệ riêng ảnh điều trị thay vì mặc định xem mọi ảnh như tài sản công khai. Audit việc chia sẻ, thu hồi và tải dữ liệu nhạy cảm.

**Nghiệm thu:** dùng tài khoản A thử id/path của B phải bị từ chối; link hết hạn/thu hồi không đọc được; quyền xem không tự bao gồm quyền chia sẻ.

### 7. Chốt lại luồng thu tiền, hoàn tiền và báo cáo

**Nguồn:** `admin.service.ts:1243–1249`, `:1713`; `W12_FinancialReports.tsx:129–214`.

Thu tiền đặt lịch chuyển booking thành COMPLETED trong khi thao tác checkout kế tiếp yêu cầu IN_SERVICE. Bài test đã thất bại; hai bài ca thu ngân sau bị lỗi dây chuyền vì fixture dùng chung chưa đóng ca. Cần chốt hành vi nghiệp vụ trước khi sửa code/test.

Báo cáo tài chính lấy giao dịch PAID và dùng `tt.amount` dương mà chưa đảo dấu theo `transactionType=REFUND`, trong khi backend đã có công thức trừ refund. Báo cáo còn suy đoán gói theo giá >=2 triệu, loại giao dịch học phí theo cả enrollment khi đã có một hóa đơn, và dùng ngày UTC cho dateKey. Các cách này có thể tạo số liệu sai theo loại dịch vụ, từng lần thu và ngày Việt Nam.

**Cần nâng cấp:** trạng thái dịch vụ độc lập với thanh toán theo quy tắc đã chốt; một sổ giao dịch chuẩn cho dashboard, POS, doanh thu và hoa hồng; liên kết chống đếm trùng bằng giao dịch cụ thể; phân loại từ invoice_items; kỳ báo cáo theo Asia/Ho_Chi_Minh; tổng hợp có phân trang/aggregation phía server.

**Nghiệm thu:** thu nhiều đợt, hoàn một phần/toàn phần, đóng/mở ca, đổi ngày lúc 00:00 Việt Nam và giao dịch trên nhiều chi nhánh cho tổng nhất quán ở mọi màn hình. Ví dụ khoản thu học phí 500.000 và hoàn 100.000 phải cho thực thu 400.000, không phải 600.000.

### 8. Loại trạng thái thành công giả và dữ liệu dự phòng khỏi màn hình vận hành

**Nguồn:** `W02_Branches.tsx:1389–1462`, `W06_ServicesCatalog.tsx:113–139,153–200,267–294`.

Khôi phục chi nhánh cập nhật state/localStorage và báo thành công trước khi gọi máy chủ; kết quả trả về không được kiểm tra để phục hồi UI. Bảng giá không xử lý `srvRes.error/pkgRes.error`, vẫn có giá/ID dự phòng; cập nhật chỉ xét error, không xác minh có bản ghi được sửa. Khi thiếu quyền hoặc thiếu dữ liệu, người vận hành có thể thấy thông tin tưởng là dữ liệu thật.

**Cần nâng cấp:** chỉ báo thành công sau xác nhận đã ghi, đọc lại khi cần; rollback optimistic UI khi thất bại; trạng thái tải/lỗi/rỗng rõ; bỏ giá và ID mẫu trong chế độ vận hành, chặn sửa/bán khi danh mục chưa sẵn sàng. Cache phải gắn với phiên/quyền/chi nhánh và xóa khi đăng xuất, không chỉ theo URL.

**Nghiệm thu:** giả lập lỗi quyền, zero-row update, mất mạng, hai người sửa cùng bản ghi và đổi tài khoản; tải lại trang phải thấy đúng dữ liệu đã lưu, không giữ dữ liệu của phiên trước.

### 9. Biến kiểm tra schema và CI thành điều kiện phát hành

**Nguồn:** `admin.database.ts:16–24`, `AdminReadiness.tsx:11–18`, `database/testing/admin-schema.cjs:4–10`, `.github/workflows`.

Kiểm tra schema hiện ghi log/cảnh báo, không phải điều kiện chặn phát hành thống nhất; banner chỉ bật khi cấu hình nguồn là backend. Bộ loader test có một tập migration chọn lọc, không chạy migration 023 đang có các policy rủi ro. Trong `.github/workflows` chỉ tìm thấy workflow build APK, chưa có gate CI dành cho admin.

**Cần nâng cấp:** pipeline frontend test/build, backend admin test/build, migration trên DB rỗng và DB nâng cấp, E2E có xác thực và RLS; tách readiness của admin khỏi liveness của ứng dụng; thiếu schema phải chặn thao tác ghi. Mỗi test workflow cần fixture riêng hoặc rollback để tránh lỗi dây chuyền.

**Nghiệm thu:** commit thiếu method, sai migration hoặc thiếu quyền bị chặn trước deploy; log/bằng chứng ghi đúng commit và ngày kiểm tra. Không tái sử dụng tuyên bố 100% đạt từ tài liệu cũ cho mã nguồn hiện tại.

## P2 — Sau khi đóng P0/P1, trước khi mở rộng vận hành

- Chuẩn hóa biểu mẫu, tìm kiếm theo tên tham chiếu và phân trang; bài test tìm nhân sự theo tên chi nhánh đang đỏ. Áp dụng kiểm tra dữ liệu, focus, thông báo lỗi và cảnh báo mất thay đổi nhất quán cho màn hình chuyên biệt.
- Chuẩn hóa thiết kế admin từ bảng giá sang CRM, học viện, báo cáo, ca thu ngân; ưu tiên dễ đọc, trạng thái lỗi/rỗng, thao tác nhanh, truy cập bàn phím và tablet.
- Tách module lớn theo nghiệp vụ: POS, enrollment, receipt, authorization. Đây là việc giảm rủi ro sửa đổi; không thay thế sửa lỗi chức năng trước mắt.
- Chuẩn bị giám sát lỗi và giao dịch thất bại, cảnh báo DB/job, giới hạn request, audit trước/sau, retention; thử khôi phục backup và rollback bản triển khai trên môi trường thử. Chưa có bằng chứng thực thi các quy trình này trong lượt rà soát.
- Sửa CORS production: `backend/src/main.ts:45` vẫn chấp nhận origin ngoài danh sách với credentials. CORS không thay thế xác thực, nhưng allowlist hiện không được thực thi.

## Thứ tự thực hiện đề xuất

1. Vá xác thực, thu hồi secret và kiểm tra quyền DB/RPC; đóng đường truy cập vượt quyền.
2. Khôi phục build admin và thống nhất scope/nguồn dữ liệu cho các endpoint quan trọng.
3. Chốt thu tiền → checkout → hoàn tiền → chốt ca; đối soát báo cáo/hoa hồng.
4. Hoàn thiện lưu thật, lỗi thật, danh mục thật; bỏ fallback và xác nhận thành công giả.
5. Chạy toàn bộ pipeline trên staging, kiểm thử vai trò thật, backup/restore/rollback; ký nghiệm thu trước mở vận hành.

Chưa kiểm tra trực tiếp deployment, DB, grants, bucket, webhook thanh toán, tài khoản hay log production. Các mục này cần đối chiếu staging rồi mới kết luận trạng thái môi trường thực tế.
