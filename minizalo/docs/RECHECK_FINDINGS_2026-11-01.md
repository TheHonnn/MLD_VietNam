# Rà soát lại Mini App và BE — 01/11/2026

Kết luận: bản hiện tại **chưa sẵn sàng phát hành**. Kiểm thử hồi quy qua không đồng nghĩa toàn bộ điều hướng và server production tương thích. Lần này không sửa mã nguồn ứng dụng, dependencies, database, mobile, Admin hay Website; chỉ chạy kiểm tra và ghi báo cáo.

## 1. Chặn phát hành: API production không đúng hợp đồng Mini App

Nguồn cấu hình hiệu lực: `loadEnv('production', process.cwd(), 'VITE_')`, cùng cách đọc của `scripts/check-backend.mjs`. Base URL hiện là `https://mld-vietnam.onrender.com/api/v1`.

GET chỉ đọc, có Origin `https://h5.zdn.vn`, đã xác minh qua mạng ngoài sandbox:

| Endpoint | HTTP | Kết quả |
| --- | --- | --- |
| /health | 200 | data chỉ có status/service/timestamp; không có authFlow/contentContract/features cần thiết. |
| /services | 404 | Không có data.services. |
| /branches | 404 | Không có data.branches. |
| /courses | 404 | Không có data.courses. |
| /app-metadata | 404 | Không có metadata. |
| /portal/banners | 404 | Không có banner. |

CORS trả `*`, vì vậy kết quả này không phải chỉ do thiếu CORS hay database không có bản ghi. Đây là lỗi route/contract/deployment. Không kết luận server chết: health vẫn hoạt động. Không khẳng định bản Zalo đã phát hành đang dùng cùng URL với cấu hình local này.

Vị trí: `src/api/client.ts:13`, `scripts/check-backend.mjs`, `scripts/backend-contract.mjs`, đối chiếu `minizalo/render.yaml` (rootDir minizalo/backend; health /api/health).

Hướng xử lý: xác định đúng deployment Mini App BE, deploy phiên bản tương ứng, đặt đúng API base và chạy contract check trước khi build/deploy FE. Không xóa gate để ép deploy hoặc giả danh tính/quyền cho qua đăng nhập.

## 2. Cao: body-parser trong BE có advisory DoS

`minizalo/backend/package-lock.json:734` đang khóa body-parser **1.20.8** qua Express **4.22.3**. `src/server.ts:265` dùng `express.json({limit:'1mb'})`, chưa tắt inflate. Advisory GHSA-27r3-jxmh-p828 ảnh hưởng nhánh <1.20.9; middleware đọc JSON có thể bị ảnh hưởng trước bước xử lý route/auth. Không thử payload phá tiến trình trên server thật.

Hướng xử lý: cập nhật đường phụ thuộc tương thích để lấy bản vá; nếu app không nhận body nén, cân nhắc `inflate:false`, kiểm tra client rồi chạy lại test. Không coi limit 1 MB là bản vá cho lỗi decompression này.

Nguồn: https://github.com/advisories/GHSA-27r3-jxmh-p828

BE còn qs **6.16.0**, advisory mức trung bình GHSA-6pq8-jhm2-2vcw. Đường lỗi yêu cầu `qs.stringify(..., {arrayFormat:'comma'})`; rà source BE chưa thấy lời gọi đó nên **chưa chứng minh được khả năng khai thác trực tiếp trong app**. Vẫn cần đưa thư viện về bản vá tương thích.

Nguồn: https://github.com/advisories/GHSA-6pq8-jhm2-2vcw

## 3. Cao: toolchain Mini App có dependencies được audit đánh dấu

`npm audit --json` cả devDependencies báo **142 mục dependency**: 4 critical, 38 high, 94 moderate, 6 low. Đây không phải 142 lỗi app độc lập; có các cảnh báo kế thừa qua chuỗi phụ thuộc. Nhóm critical gồm decompress/simple-git/tar/zmp-cli trong cây công cụ phát triển. Các dependency trực tiếp được gắn mức rủi ro gồm zmp-cli, vite, esbuild, postcss-preset-env và zmp-vite-plugin.

`npm audit --omit=dev` riêng FE: **0 cảnh báo**. Không được gộp số của CLI/dev server thành lỗ hổng runtime trên thiết bị.

Vị trí: `my-app/package.json:52–64`, package-lock và cây zmp-cli. Hướng xử lý: nâng cấp/override có kiểm chứng tương thích ZMP; kiểm tra build/start/deploy. Không chạy `audit fix --force` mù quáng: audit hiện có gợi ý đổi zmp-cli về 1.0.0 và có dependency chưa có fix tự động.

## 4. Cao: thông báo lịch của nhân viên mở lịch cá nhân

`src/layout/ConnectedLayout.tsx:96` gọi `visit('appointments')` khi nhận thông báo booking. Nhưng `visit` tại dòng 58 luôn đặt `workAppointments=false`. Danh sách sau đó dùng scope personal và lọc userId bằng tài khoản nhân viên. Lịch được đặt cho khách khác không xuất hiện, initialBookingId cũng bị xóa khi không tìm thấy trong danh sách.

Đã tái hiện bằng entry point thật với SDK/HTTP fixture: nhân viên có quyền, một lịch của khách khác và thông báo staffBranchId; bấm thông báo mở “Lịch hẹn khách hàng” trống, không mở chi tiết lịch được thông báo. Không có pageerror hoặc route fixture thiếu.

Hướng xử lý: giữ scope từ thông báo công việc, kiểm tra lại capability BE và nạp đúng lịch theo ID; thông báo cá nhân vẫn dùng personal. Không mở toàn bộ lịch cho tài khoản khách.

## 5. Trung bình: banner Kết quả học tập mất đích

`src/layout/ConnectedLayout.tsx:92` setAcademyTarget(tab results) rồi gọi `visit('my-courses')`. `visit` tại dòng 58 xóa academyTarget cho cùng đích, nên React giữ undefined sau batch.

Đã tái hiện banner `/academy/results` với đăng ký học đã duyệt: mở danh sách “Khóa học của tôi”, không chọn tab Kết quả của lớp.

Hướng xử lý: phân biệt mở danh sách mặc định với mở một đích học tập cụ thể; giữ enrollmentId/tab khi đã có target. Thêm kiểm thử tích hợp route, không chỉ test bảng ánh xạ portalTarget.

## 6. Trung bình: Back không khôi phục phạm vi lịch công việc

`src/layout/ConnectedLayout.tsx:59` lưu snapshot tab/view/bookingId nhưng thiếu workAppointments. Khi chuyển giữa lịch cá nhân và lịch công việc rồi quay lại history, view/ID được khôi phục nhưng scope vẫn là giá trị của màn vừa rời. Có thể quay lại màn đúng tên nhưng danh sách hoặc thao tác thuộc scope khác.

Bằng chứng từ source, chưa coi là kịch bản native Back đã nghiệm thu. Hướng xử lý: đưa scope vào navigation state và xác minh quyền khi restore, hoặc dùng route riêng cho lịch cá nhân/công việc.

## 7. Trung bình: đích voucher không mở ví voucher

`src/utils/portal-target.ts` chấp nhận `/profile/vouchers`, nhưng `ConnectedLayout.tsx:93` chỉ chuyển sang Profile. ProfileScreen hiện không có màn ví voucher tương ứng.

Banner có đích này sẽ dẫn sai chức năng. Hướng xử lý: nối đúng màn dữ liệu thật hoặc bỏ đích khỏi những đích được coi là đã hỗ trợ. Không dựng số dư/voucher giả. Đây không phải yêu cầu triển khai thanh toán.

## 8. Trung bình: tư vấn lưu thật nhưng chưa có luồng tiếp nhận trên Admin

ConsultationRequest ghi support_tickets, có ID rồi mới báo thành công. Commit Admin 4ee729b3 đã bỏ navigation support_tickets/support_faqs. Vì vậy lưu DB thành công chưa chứng minh cơ sở nhìn thấy lead để gọi lại.

Đây là giới hạn đã biết từ lượt trước, không phải lỗi mới do test. Cần thống nhất điểm tiếp nhận thực tế hoặc giao diện phải mô tả chính xác đây là yêu cầu hỗ trợ đang lưu. Không tự sửa Admin trong phạm vi hiện tại.

## 9. Trung bình: cold start và dữ liệu lịch sử còn tải quá rộng

- `ConnectedLayout.tsx:63` chỉ gán cả sáu nguồn catalog sau Promise.all. Một API chậm giữ lại cả những danh mục đã trả xong, có thể tới timeout 30 giây của client.
- `client.ts:116–134` tự theo mọi nextCursor cho bookings/treatment-plans/support-tickets/consultation-surveys. “Xem thêm” ở UI chỉ cắt danh sách đã nạp, không giảm lượng dữ liệu đầu vào.
- `ConnectedLayout.tsx:77–87` vô hiệu cache và đọc dữ liệu riêng định kỳ, bên cạnh preloadPrivateData và polling của màn con. Với lịch sử dài có nguy cơ nhiều request, bộ nhớ và độ trễ tăng.

Đây là rủi ro suy ra từ source, chưa có đo tải với dataset production lớn. Hướng xử lý: gán catalog từng nguồn khi hoàn thành, phân trang thực tại màn lịch sử, gộp polling/in-flight và chỉ preload dữ liệu cần thiết. Giữ việc khởi động tải sớm mà người dùng đã yêu cầu.

## 10. Thấp: chữ trên lịch cá nhân vẫn là chữ dành cho nhân viên

`AppointmentsManager.tsx:228` luôn hiện “Lịch hẹn khách hàng”, “Quản lý các buổi chăm sóc tại cơ sở”, kể cả khách đang xem lịch của mình. Chưa đồng bộ nội dung theo scope. Không ảnh hưởng quyền BE nhưng khiến người dùng hiểu nhầm vai trò.

## Kiểm chứng và giới hạn

- Toàn bộ BE chạy lại: **308/308 qua**, 0 fail/skip/cancel.
- Toàn bộ `scripts/*.test.mjs` FE: **28/28 qua**, gồm hai navigation-target unit tests mà lượt báo cáo trước chưa tính trong nhóm 26.
- FE TypeScript, BE build, production build/postbuild và audit bản dịch qua; 1.729 chuỗi, thiếu 0 bản dịch/template. Artifact không có development client.
- Browser regression sẵn có: Chromium và WebKit, 320×640 và 390×844 đều qua.
- Hai tình huống browser bổ sung đã tái hiện các mục 4 và 5. Test cũ chỉ kiểm tra mapping URL, chưa kiểm tra đầy đủ state của MainLayout; cần thêm regression sau khi sửa.
- backend:check thất bại do contract API cấu hình hiện tại. GET catalog thật trả 404 như bảng trên.
- release:check chưa qua vì thiếu URL chính sách/điều khoản. Người dùng đã hoãn các mục này, nên không tính thành bug chức năng mới và không tự viết/công bố nội dung pháp lý.
- Rà các effect/timer/listener đang hoạt động đã đọc có cleanup và nhiều guard session/race. Không có cơ sở tuyên bố toàn repo không còn mọi memory leak/race condition.
- Không dùng tài khoản Zalo thật, không thực hiện booking/enrollment trên DB chung, không thử tấn công server. Native quyền, quay/chụp màn hình, bàn phím/safe area và nhận nội dung Admin trên bản Zalo phát hành vẫn cần nghiệm thu thực tế.
- Không sửa file mobile/Admin/database; không push/deploy. Log kiểm tra và harness browser bổ sung nằm trong thư mục tạm bị Git bỏ qua.

Ưu tiên xử lý: API/deployment → bản vá body-parser → điều hướng thông báo công việc/kết quả → scope khi Back → toolchain và tối ưu tải → các mục UI/nội dung. Không dùng số lượng test qua để đánh dấu các phát hiện này là đã được sửa.
