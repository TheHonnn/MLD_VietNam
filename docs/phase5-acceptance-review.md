# Nghiệm thu Giai đoạn 5 — 2026-11-13

Kết luận vòng nghiệm thu ban đầu: CHƯA ĐẠT. Các phát hiện bên dưới được giữ làm bằng chứng trước sửa. Bản cải thiện ngày 2026-11-13 đã khắc phục 5 điểm nghiệp vụ ở cấp mã và kiểm thử cô lập; chưa xác nhận sẵn sàng production khi chưa kiểm thử trình duyệt và triển khai schema mới.

## Cập nhật sau sửa

- Khóa generic CRUD nhật ký: không đổi status, approval, reversal hoặc liên kết định danh qua form chung; chỉ command mới xác nhận buổi. Có test giả mạo trạng thái/phê duyệt và đối chiếu số lượt không thay đổi.
- W06 dùng completed_sessions từ backend, không suy ra số đã dùng từ bản nháp; chỉ nhận lịch có marker chính xác của gói. W04 chuyển tới workspace thay vì tự tăng lượt; W05 lưu nháp gói rồi chuyển sang nhật ký, không chạy tiếp trừ kho/hoàn tất ca cũ, không tự chọn gói đầu tiên.
- API book-session lưu booking + dịch vụ + audit trong một transaction, khóa nghiệp vụ, kiểm tra gói/khách/dịch vụ/chi nhánh hoạt động, thời gian, phòng/giường/chuyên viên, lượt đã đặt và request ID. Retry trả lại lịch đã lưu; item lỗi rollback lịch. Số buổi nháp được cấp trong transaction thay vì đọc trước ngoài khóa.
- Scope gói kế thừa nguồn chuyển nhượng qua lineage có giới hạn và chống chu trình. Test đảm bảo chi nhánh nguồn xem được gói nhận, chi nhánh khác không xem được.
- Có số tồn thực theo chi nhánh và sổ biến động (migration 034); worker đọc outbox mỗi 15 giây. Thiếu số kiểm kê/thiếu tồn thì FAILED, không tự tạo tồn. Trừ/hoàn tồn trong transaction, retry một lần, phục hồi từ bút toán gốc. Kiểm kê cần quyền và lý do, kiểm tra số dư trước cập nhật để chặn ghi đè số tồn vừa thay đổi.
- Admin có `/treatment-inventory`, đi từ liên kết trong Nhật ký điều trị: kiểm kê, xem tồn/sổ kho và thử lại yêu cầu lỗi. Không nhập số tồn mẫu. Các quyền kho mới chỉ đăng ký danh mục, không tự cấp rộng cho các vai trò.
- Duyệt chuyên môn là bước riêng. Admin cũng không được confirm ngầm ca bất thường; không được gửi lại hồ sơ đã gửi để xóa yêu cầu duyệt. Preview cảnh báo lịch không còn phục vụ, khách/dịch vụ không khớp, cùng các điều kiện gói và phê duyệt.
- Đổi tên hàm frontend sang saveSessionDraftFromBooking, bỏ tham số completed/total cũ.

Bằng chứng hồi quy: backend 98/98, frontend 49/49; nhóm liệu trình 30/30 gồm rollback đặt lịch, đối chiếu preview/confirm, cấm bypass, scope chuyển nhượng và trừ/hoàn tồn thật trên PGlite. Build backend/frontend đạt. Dữ liệu fixture chỉ tồn tại trong database kiểm thử cô lập.

Giới hạn còn phải xác minh: thao tác trực quan bằng tài khoản thật (công cụ trình duyệt chưa khởi tạo được), migration 033/034 và phiên bản triển khai. Các workspace gói/nhật ký/hướng dẫn vẫn tải nhiều trang để lọc phía client; cần tối ưu pagination/count phía backend trước khi dùng ở quy mô dữ liệu lớn. Không có kiểm thử tải nhiều tiến trình bằng PostgreSQL production trong đợt sửa này.

Migration 032 đã áp dụng production trong đợt trước. Theo yêu cầu riêng tiếp theo của người dùng, 033/034 đã áp dụng và xác minh trên production lúc 2026-11-13T07:55:46Z bằng scripts/migrate_treatment_033_034.cjs. Gói 1→1, nhật ký 1→1, hàng đợi kho 0→0; hai bảng kho mới đều có 0 bản ghi. Index partial hợp lệ, RLS bật trên hai bảng, không cấp quyền ghi trực tiếp cho authenticated/anon. Chưa push hoặc deploy bản mã này. Startup được chuẩn bị chạy 034 sau 031–033 khi triển khai code mới.

Phạm vi: bản mã làm việc hiện tại (tracked diff và file mới), so với HEAD `146f54cabb6b5452934524876ab6b33ea6513bbd`. Yêu cầu gốc là kế hoạch Giai đoạn 5 trong cuộc trao đổi, đối chiếu cùng `treatment-integration-phase5.md` và `home-care-admin-workflow.md`.

## Nghiệp vụ — 5 phát hiện

1. P1 — CRUD nhật ký bỏ qua command xác nhận. `admin.service.ts` chỉ chặn CREATE CONFIRMED, chưa chặn UPDATE DRAFT thành CONFIRMED. `syncRelated` tăng số buổi nhưng inventory/commission của command không chạy. Đã tái hiện bằng AdminService và schema thật trong PGlite cô lập: genericUpdateAccepted=true, completedSessions=1, không gọi submit/confirm. Cần khóa status, approval và identity trên CRUD; thêm regression test cho cả cập nhật giả mạo phê duyệt.
2. P1 — Màn hình W06 vẫn đếm tất cả journal chưa reverse bằng `Math.max(completedSessions, activeJournals.length)`. DRAFT/SUBMITTED có thể làm UI hết lượt trước backend. Cần dùng số xác nhận của backend; bản nháp có trạng thái riêng.
3. P1 — W06 liên kết lịch với gói theo service trước khi xét mã gói. Hai gói cùng dịch vụ có thể nhận nhầm lịch. Tạo booking và booking_item vẫn tách thành hai request; lỗi item bị log rồi tiếp tục. Chưa có transaction backend kiểm tra đầy đủ eligibility/sức chứa/linkage và chống tạo lịch trùng do retry.
4. P1 — Gói nhận chuyển nhượng chưa có invoice/journal nên không thỏa branchPredicate cho user_packages. Nhân viên chi nhánh không truy cập được gói mới trước buổi đầu. Cần kế thừa chi nhánh từ gói nguồn và kiểm thử luồng chuyển nhượng→đặt lịch→nháp bằng tài khoản chi nhánh.
5. P2 — Inventory hiện mới ghi PENDING_SYNC trong outbox. Chưa tìm thấy consumer trong backend cập nhật tồn thực và chưa có test trừ/hoàn tồn thực đúng một lần. Không được nghiệm thu hàng đợi như đồng bộ tồn kho đã hoàn tất.

## Chất lượng triển khai — 4 nhận xét

Không tìm thấy quy chuẩn repo riêng cho phần này; các nhận xét dưới đây là đánh giá thiết kế, không phải lỗi định dạng:

- Cấp số buổi bị lặp ở startTreatmentDraft và businessRules, một lần ngoài transaction rồi tính lại trong transaction; request cạnh tranh có thể bị từ chối dù còn số trống.
- Logic preview/confirm tính eligibility và commission ở hai nơi, đã có khác biệt về cho phép manager duyệt ngầm ca bất thường.
- Tên completePackageSession và tham số completed/total đã lỗi thời sau khi đổi thành lưu nháp.
- Các workspace đều tải toàn bộ trang dữ liệu rồi lọc trên client; cần backend pagination/filter/count và hủy request nhất quán khi dữ liệu tăng.

## Bằng chứng kiểm tra

- Chạy lại `npm --prefix backend test`: hoàn tất, exit 0.
- Chạy lại `npm --prefix web-admin test`: hoàn tất, exit 0.
- `git diff --check`: exit 0 (có cảnh báo LF/CRLF, không có lỗi whitespace).
- Build backend/frontend đã đạt ở vòng phát triển ngay trước nghiệm thu.
- Diagnostic bypass chạy trên PGlite mới khởi tạo trong RAM; không dùng URL hoặc dữ liệu production.

Test xanh chưa chứng minh đầy đủ spec: thiếu coverage cho CRUD bypass, UI tính nháp thành đã dùng, chuyển nhượng theo scope chi nhánh, concurrency tạo lịch và tồn kho thực.

## Điều kiện nghiệm thu lại

Sửa 5 phát hiện nghiệp vụ, bổ sung các test hồi quy tương ứng, đồng bộ preview/confirm; chạy integration từ POS đến buổi cuối và reverse với quyền admin/chi nhánh, sau đó kiểm thử trình duyệt. Migration 033 cần được áp dụng/xác minh trước deploy; migration 032 đã chạy production trước đó. Không sửa mobile trong đợt này.

Chưa kiểm thử trực quan tài khoản thật do công cụ trình duyệt chưa khởi tạo được. Chưa xác nhận phiên bản code hiện tại đã deploy. Trong đợt nghiệm thu không commit/push/deploy, không chạy migration production và không sửa code nghiệp vụ.
