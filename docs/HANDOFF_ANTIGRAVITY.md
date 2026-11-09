# Bàn giao cải tiến admin cho Antigravity

> Cập nhật 09/11/2026: bộ test admin **32/32**, frontend **16/16**, build backend/frontend đạt. E2E full 51/51 và E2E tập trung có kiểm tra báo cáo học phí đều đạt. Xem `docs/ADMIN_IMPLEMENTATION_STATUS_2026-11-09.md` để biết trạng thái cuối. Các thống kê cũ bên dưới chỉ là bằng chứng lịch sử.

## Yêu cầu của người dùng

Tiếp tục cải tiến cả sáu nhóm: độ tin cậy API, luồng thu ngân/học viện, đồng bộ schema/migration, quyền theo vai trò/chi nhánh, biểu mẫu và trải nghiệm vận hành. Người dùng đã đổi mốc dừng và đóng gói bàn giao thành **10% hạn mức Codex còn lại**. Không triển khai production tự động.

## Việc Antigravity cần làm tiếp trước khi vận hành

1. Xoay vòng DB password và JWT signing secret từng có trong mã/lịch sử và bản ZIP cũ; kiểm tra cấu hình thật. Patch trong gói mới cố ý bỏ hai tệp từng có dòng secret bị xóa. Snapshot hiện tại của chúng nằm trong `files/`.
2. Kiểm tra và áp migration `028_admin_access_hardening.sql` trên staging sau backup. Dùng tài khoản thật để thử RLS/RPC khách, thu ngân, nhân viên chi nhánh khác, quản lý và service role. PGlite local chỉ chứng minh logic SQL trong fixture.
3. Chuyển các thao tác ghi học phí còn dùng Supabase REST ở `academy.service.ts` sang backend transaction có idempotency/đối soát ca. Policy hiện vẫn cho nhân viên tài chính thuộc chi nhánh INSERT giao dịch học phí trực tiếp, nên chưa bảo đảm toàn vẹn tiền.
4. Hoàn thiện sổ giao dịch doanh thu chuẩn trên server, liên kết từng hóa đơn với từng khoản thu/hoàn; đối soát dữ liệu lịch sử. Báo cáo UI hiện tránh đếm trùng hóa đơn tổng hợp học phí và tính các đợt/hoàn, nhưng chưa xử lý mọi hóa đơn hỗn hợp và hoàn POS.
5. Thêm kiểm tra tài liệu theo chủ sở hữu/chi nhánh để nhân viên lấy signed URL phù hợp. Hiện chỉ ADMIN/SUPER_ADMIN được phép dùng API signed URL.
6. Chỉnh màn gửi hướng dẫn chăm sóc để nhân viên chọn lịch/buổi trị liệu bắt buộc, rồi kiểm thử trên staging. Migration 028 đã chặn gửi chéo chi nhánh và gửi không kèm liên kết đối với nhân viên.
7. Kiểm chứng staging: thanh toán/webhook, email/SMS/Zalo, quyền bucket, backup/restore, giám sát job, tải và quy trình quay lui. Không coi kết quả browser local là xác nhận production.

**Bằng chứng mới nhất:** `evidence/final-admin-tests.log` (32/32), `evidence/final-frontend-tests.log` (16/16), `evidence/final-browser-full.log` (51/51 resource), `evidence/final-browser-reports.log` (đối soát học phí), `evidence/final-access-tests.log` (RLS/RPC chi nhánh). Các lệnh trong phần cũ bên dưới chỉ là tham khảo lịch sử.

## Workspace và trạng thái Git

- Worktree: `C:\Users\lamxu\.codex\worktrees\admin-reliability\MLD_VietNam`.
- Base commit: `2c600f03739a6f0c097fa723851b75865914cc60`.
- Các thay đổi sau base chưa được commit. Không reset/clean checkout; không ghi đè thay đổi trong checkout gốc ở ổ D.
- Worktree được tạo vì checkout gốc đang được chỉnh sửa/commit đồng thời. Một phần thay đổi đầu đợt đã nằm trong base commit, ví dụ migration 027, schema loader và các phần scope/readiness. Vì vậy chỉ xem `git diff` sẽ không mô tả toàn bộ công việc của đợt này.
- `backend/node_modules` và `web-admin/node_modules` là junction đến dependencies ở checkout gốc. Gói ZIP không chứa dependencies hoặc `.env`.

## Đã thực hiện

1. API giữ lỗi HTTP, không tự chuyển nguồn sau lỗi, không thử lại POST ở URL khác; gom các request ghi giống nhau đang chạy. Giữ mã thu tiền chưa xác minh trong session qua thay đổi giỏ hàng.
2. POS dùng backend workspace có lọc chi nhánh; các khoản thu BOOKING/TUITION/PACKAGE/CART dùng transaction. Có sổ yêu cầu chống thu trùng trong cùng transaction, kiểm tra giá/tổng tiền, hạn mức học phí, doanh thu ca; sửa lỗi kiểu số của câu lệnh đóng ca.
3. Shared loader dùng schema, enterprise extension và migration admin đầy đủ; schema contract, startup/readiness check, chặn ghi khi schema thiếu; CLI preflight giữ khả năng đọc đường dẫn `.env` và thống kê vai trò cũ.
4. Giữ phạm vi chi nhánh từ JWT guard vào đọc/ghi/action; kiểm tra quyền thu ngân. Menu lấy danh mục quyền thực tế, không dùng toàn bộ quyền ghi dự phòng khi tải lỗi.
5. RecordDialog có guard dữ liệu chưa lưu, beforeunload, submit trùng, nhãn và lỗi trường. Kiểm thử thực tế hủy đóng, validation, 403/retry và hai submit.
6. Tên tham chiếu, tìm kiếm theo tên liên quan, phân trang hợp lệ; POS có trạng thái tải/lỗi và bỏ kết quả tải cũ. Các sửa cuối thêm giá ưu đãi, chi tiết dịch vụ lịch hẹn, phiếu thu/hoàn học phí và số thực thu, loại lương/tài khoản ngân hàng nhân viên khỏi workspace POS.

Xem `docs/admin-reliability-improvements.md` và `docs/admin-local-verification.md`.

## Bằng chứng kiểm thử

- Frontend: **16/16** test đạt sau sửa cuối về giá và phiếu thu.
- Backend: **51/51** test đạt (10 tệp), gồm transaction, gửi lại khoản thu, đóng ca, rollback, chuỗi học viện, phạm vi quyền, tên tham chiếu và phép chiếu phiếu thu/hoàn học phí.
- Backend build đạt sau sửa cuối. Frontend build đạt; một lần chạy sandbox lỗi quyền đọc esbuild, chạy lại với quyền đọc dependencies liên kết đã build thành công.
- `result.json` lúc **20:44 ngày 08/11/2026, giờ Việt Nam**: đầy đủ 51 đường dẫn, 44 trang quản trị + 7 trang riêng, CRUD thật, JWT/chi nhánh/tài khoản khóa qua HTTP, form guard/retry, thanh toán POS và đối soát ca đạt, không lỗi JavaScript. Kết quả này trước lượt sửa cuối về giá/phiếu thu.
- `result-focused.json` lúc **21:02:55 ngày 08/11/2026, giờ Việt Nam**: lượt sửa cuối đã qua E2E, gồm `discountedPrice: passed`, `tuitionHistoryNet: passed`, JWT/quyền chi nhánh, form guard/retry, CRUD, POS và đối soát ca; không có lỗi JavaScript.
- Các ảnh/log lỗi có thể thuộc lần trước. Không suy luận trạng thái hiện tại chỉ từ `failure.png`.

## Việc còn lại và thứ tự tiếp tục

### 1. Kiểm thử trình duyệt cuối đã hoàn tất — lệnh chạy lại khi cần

Chạy tại `backend`:

```powershell
$env:ADMIN_BROWSER_RESOURCES='service_categories'
npm run test:browser
```

Lần chạy này vẫn kiểm tra JWT, form/retry và POS, đồng thời kiểm tra giá ưu đãi 80.000, phiếu thu 200.000 trừ hoàn 50.000 và bỏ phiếu chờ thu 800.000: KPI thực thu phải là **150.000đ**. Nếu thất bại, xem các helper trong `backend/test/support/`, `failure.html` và `requests.json`. Đã bổ sung xử lý request bị hủy trong Playwright route để tránh ECONNRESET nền che khuất lỗi chính.

Lượt này đã đạt; không cần chạy lại chỉ để thay báo cáo cũ. Bỏ biến `ADMIN_BROWSER_RESOURCES` và chạy đầy đủ nếu thay đổi tiếp vào route/menu/shared form; nếu chỉ sửa phép chiếu POS, đánh giá phạm vi cần chạy lại theo thay đổi.

### 2. Kiểm tra bổ sung trước khi merge/deploy

- Rà soát diff và migration, nhất là mọi thay đổi về tiền và scope. Không đánh dấu toàn bộ admin production đã được kiểm chứng.
- Mở rộng E2E **giao diện** chuỗi ghi danh → thu học phí → điểm danh → chấm điểm → chứng nhận. Chuỗi backend đã có test, các màn hình chuyên biệt chưa được kiểm chứng trọn luồng bằng trình duyệt.
- Rà soát các trang chuyên biệt còn dùng `supabaseService` trực tiếp (học viện, chứng nhận, khách hàng, nội dung...). Quyền backend generic và POS đã test; không suy diễn thành bằng chứng cho mọi policy Supabase của các trang đó.
- Đối soát dữ liệu lịch sử nếu hệ thống cũ đồng thời có hóa đơn học phí và tuition_transactions cho cùng một khoản thu. Không tự xóa hoặc gộp dữ liệu theo số tiền/thời gian phỏng đoán.
- Kiểm tra phân bổ hoa hồng ở luồng BOOKING, giỏ nhiều gói, khoản giảm giá và hoàn tiền với quy tắc vận hành thực tế. CART/PACKAGE đã có logic transaction; không thay quy tắc kinh doanh bằng tỷ lệ mặc định.
- Kiểm tra dirty guard cho các trình soạn thảo dùng nút điều khiển thay vì input/change, chuyển mode và tải tệp; hiện cảnh báo đã được test với nhập liệu trong RecordDialog, không khẳng định mọi dạng tương tác tùy biến đều đã được bao phủ.

### 3. Staging/production — chưa thực hiện

- Áp dụng migration `027_admin_reliability.sql` sau các dependency theo tài liệu triển khai.
- Cấu hình `VITE_ADMIN_DATA_SOURCE=backend`, `VITE_API_BASE_URL`, database/JWT/Supabase của môi trường.
- Cấp `cashier.collect`, `cashier.shifts` và quyền phân hệ theo chi nhánh.
- Chạy `npm run check:admin-schema` với môi trường đã được cấp; cần `ready: true`.
- Kiểm chứng Supabase RLS bằng tài khoản/role thực trên staging và các tích hợp thanh toán/email/SMS/Zalo. PGlite có `auth.uid()` giả lập, không phải bằng chứng rằng mọi policy production đã đúng.

## Các lệnh xác minh

```powershell
# web-admin
npm test
npm run build

# backend
npm test
npm run build
npm run test:browser
```

Trên host Codex hiện tại, esbuild/Vite dùng dependencies junction có thể cần quyền đọc ngoài sandbox. Đây là lỗi môi trường, không được bỏ test hoặc đổi kỳ vọng để biến nó thành kết quả đạt.

## Nội dung gói bàn giao

`working-tree.patch` chứa diff tracked từ base. `files/` chứa snapshot tệp thay đổi/tệp mới và một số dependency đã nằm trong base. `manifest.json` chứa danh sách cùng SHA-256. `evidence/` chứa báo cáo/ảnh đã chọn, không chứa `.env`, token thật, node_modules hay Git database.

Nếu làm ngay trên worktree này thì không cần áp patch. Nếu dùng checkout khác, kiểm tra đúng base và review trước; không copy snapshot đè mù lên thay đổi của người dùng.
