# Báo cáo kiểm thử: Đồng nhất Admin và luồng người dùng

- Ngày kiểm thử: 2026-10-28
- Phạm vi: Web Admin, Backend NestJS, MiniZalo backend/UI, Mobile Flutter; ưu tiên dữ liệu và trạng thái nghiệp vụ được tạo từ phía người dùng rồi hiển thị/thao tác từ admin.
- Kết luận: **Chưa đủ điều kiện nghiệm thu end-to-end.** Có một sai lệch dữ liệu nhìn thấy được trong luồng hủy lịch, một rủi ro false-green ở script tổng hợp; một số bộ kiểm thử không chạy được trong môi trường hiện tại. Chưa có xác minh trên DB/staging thật.

## Phát hiện cần xử lý

### [P1] Script `test:develop` có thể trả mã thoát thành công dù một hay nhiều giai đoạn lỗi

- Bằng chứng: `scripts/testing/run_all_tests.js` bắt lỗi từng giai đoạn và đặt `allSuccess = false`, nhưng kết thúc chỉ in cảnh báo, không đặt `process.exitCode` hoặc ném lỗi.
- Tác động: CI/Antigravity có thể hiểu lượt kiểm thử thất bại là thành công nếu chỉ dựa vào exit code. Kết quả kiểm thử và trạng thái pipeline không đồng nhất.
- Trạng thái: **Đã khắc phục trong worktree.** Runner trả exit code 1 khi có bước lỗi; `node scripts/testing/verify_runner_exit_code.js` đạt cả kịch bản pass và fail.

### [P2] Lý do hủy lịch không được phản ánh trong trạng thái mobile sau khi API thành công

- Bằng chứng: `mobile/lib/features/booking/data/repositories/booking_repository.dart:389` gửi `reason` đến API, nhưng dòng 397 cập nhật ghi chú bằng chuỗi cố định `'Lý do hủy: '` thay vì nối `reason`. Backend lưu `cancellation_reason` tại `backend/src/modules/appointments/appointments.service.ts:775`.
- Tác động: ngay sau khi hủy, dữ liệu hiển thị/giữ trong bộ nhớ mobile thiếu lý do. Admin có thể thấy lý do đã lưu trong DB trong khi màn hình người dùng không thấy cùng nội dung, gây lệch trải nghiệm và khó đối soát.
- Trạng thái: **Đã khắc phục trong lượt tối ưu tiếp theo.** Mobile giữ ghi chú gốc và nối lý do hủy vào dữ liệu hiển thị tại chỗ. Chưa thể chạy Flutter regression do môi trường không có Flutter SDK.

### [P1, đã khắc phục] Booking người dùng có thể báo thành công dù không tồn tại trong DB/admin

- Bằng chứng ban đầu: form Mobile gửi `timeSlot: 'Trong ngày'`; repository biến giá trị này thành giờ bắt đầu không hợp lệ. Backend bắt lỗi ghi booking, sau đó trả về ID `bk-*` giả với `success: true`.
- Tác động: người dùng thấy thành công nhưng lịch không xuất hiện trong admin; booking_items cũng có thể lỗi mà booking cha vẫn còn.
- Trạng thái: **Đã khắc phục.** Form yêu cầu chọn giờ cụ thể; mobile chờ ID thật từ API trước khi báo đã gửi yêu cầu; backend chỉ xác nhận sau khi lưu booking và dịch vụ, từ chối khi không kiểm tra được dịch vụ/năng lực chỗ trống, và hoàn tác bản ghi nếu lưu phần liên quan thất bại.

### [P2, đã khắc phục] Admin xử lý nhanh có thể bỏ qua bước xác nhận

- Bằng chứng ban đầu: hành động trên booking `PENDING` ở cửa sổ check-in nhanh chuyển thẳng trạng thái sang `IN_SERVICE`.
- Trạng thái: **Đã khắc phục.** Hành động nhanh giờ chuyển `PENDING` sang `CONFIRMED`; bắt đầu phục vụ vẫn là hành động riêng.

## Kết quả chạy kiểm thử

| Phân hệ | Lệnh / kiểm tra | Kết quả | Ghi chú |
|---|---|---|---|
| Web Admin | `npm test` | **Đạt, 8/8** | Bao gồm kiểm tra cập nhật tài khoản/khách hàng chỉ báo thành công khi ghi DB được xác nhận. |
| Web Admin | `npm run build` | **Đạt** | TypeScript và Vite production build thành công. |
| Backend NestJS | `npm run build` | **Đạt** | Nest build thành công. |
| Backend NestJS | `npm test` | **18/19 đạt; 1 timeout** | `src/app.controller.spec.ts` timeout ở hook `beforeEach` sau 10 giây; test này là controller mẫu Hello World, chưa phải lỗi nghiệp vụ booking được xác nhận. Có cảnh báo cấu hình Vitest/Vite. |
| Backend booking | `npx vitest run src/modules/appointments/appointments.service.spec.ts` | **Đạt, 2/2** | Test mới xác nhận không báo thành công khi DB insert lỗi và booking tiền mặt vẫn bắt đầu `PENDING/UNPAID` cho admin xác nhận. |
| Backend NestJS | `npm run build` sau thay đổi | **Đạt** | Build lại sau phần tối ưu luồng booking. |
| Web Admin | `npm test` và `npm run build` sau thay đổi | **Đạt** | Test 8/8; production build thành công. |
| Test runner tổng hợp | `node scripts/testing/verify_runner_exit_code.js` | **Đạt** | Cả kịch bản toàn bộ pass (exit 0) và có bước fail (exit 1) đều đạt. |
| MiniZalo backend | `npm test` | **Build đạt; test runner không chạy được** | 46 file test đều thoát trước assertion do Node 24 báo `uv_os_get_passwd returned ENOMEM`. Thử tuần tự (`--test-concurrency=1`) vẫn gặp cùng lỗi; đây chưa phải bằng chứng 46 lỗi sản phẩm. |
| MiniZalo UI | `npm run test:catalog` | **Không chạy được** | Thiếu dependency `esbuild` (`ERR_MODULE_NOT_FOUND`) trong workspace mini app. |
| Mobile Flutter | Flutter test/analyze | **Không chạy được** | Không tìm thấy lệnh `flutter` trên PATH; không thể xác nhận widget test hoặc phân tích tĩnh. |
| E2E tích hợp | script `test:develop` / live flows | **Chưa chạy** | Script bao gồm live DB, webhook ngân hàng, Zalo Cloud và thao tác vận hành thật; không chạy để tránh ghi dữ liệu/gọi dịch vụ bên ngoài ngoài phạm vi an toàn của lượt kiểm thử này. |

## Đối chiếu luồng nghiệp vụ

| Luồng | Bằng chứng trong mã/test | Trạng thái xác minh |
|---|---|---|
| Admin cập nhật khách hàng / tài khoản | Web Admin có test xác nhận chỉ báo thành công sau khi đọc lại dữ liệu đã lưu | Unit test đạt; chưa xác minh với DB/staging thật |
| Người dùng tạo lịch → admin xem lịch | Mobile gửi booking đến API; admin có service booking; bộ test MiniZalo có kiểm thử booking/staff | Chưa chạy E2E xuyên ứng dụng và cùng bản ghi DB |
| Người dùng đổi lịch → admin thấy lịch/nhân viên/slot mới | Có API reschedule và service admin | Chưa xác minh đồng bộ end-to-end |
| Người dùng hủy lịch → admin thấy trạng thái và lý do | Backend lưu cancellation reason; mobile hiện bỏ nội dung reason trong cập nhật tại chỗ | **Có sai lệch cần sửa**; cần test hồi quy cả hai giao diện |
| Admin đổi trạng thái/thanh toán → người dùng thấy đúng trạng thái | Có hàm cập nhật trạng thái booking ở admin và parser trạng thái ở mobile | Chưa xác minh xuyên suốt bằng dữ liệu dùng chung |
| Booking/slot capacity và điều phối kỹ thuật viên | Có test MiniZalo cho resource/capacity/booking, và code kiểm tra DRC | Test không thể thực thi trong môi trường này; cần chạy lại ở runner Node ổn định |

## Việc Antigravity cần làm tiếp

1. Cài/khôi phục dependency `esbuild` đúng lockfile cho MiniZalo UI; không cập nhật dependency ngoài ý muốn.
2. Chạy MiniZalo backend test trong môi trường Node không gặp `uv_os_get_passwd ENOMEM`; ghi lại tổng pass/fail assertion thực sự.
3. Chạy `flutter analyze` và `flutter test` trên máy có Flutter SDK.
4. Sau khi các test cục bộ đạt, chạy E2E trên staging/test DB với một bộ dữ liệu riêng: tạo lịch từ mobile/Zalo, xác nhận nhìn thấy trong admin; admin đổi trạng thái; người dùng tải lại; thử reschedule/cancel và kiểm tra reason/slot được giải phóng. Đối soát theo ID bản ghi, status, payment status, thời gian, chi nhánh, dịch vụ, kỹ thuật viên và audit log.

## Giới hạn

Đây là kiểm thử trên mã nguồn và các test có thể chạy cục bộ trong môi trường hiện tại, không phải nghiệm thu production. Không có credentials/staging session được sử dụng; các luồng PayOS, webhook, gửi Zalo/email, RLS trên dịch vụ thật và trải nghiệm UI chạy thực tế vẫn cần được xác minh riêng.
