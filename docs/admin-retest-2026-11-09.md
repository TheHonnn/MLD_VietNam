# Kiểm thử lại admin — 09/11/2026 (Asia/Saigon)

Kết quả hiện tại chưa đạt toàn bộ. Các kết quả 51/51 backend và 51 màn hình trong tài liệu bàn giao trước đây là kết quả lịch sử, không đại diện cho mã nguồn đang có ở worktree.

## Kết quả

| Hạng mục | Kết quả |
| --- | --- |
| Frontend `npm test` | 16/16 đạt khi được đọc dependencies junction |
| Frontend production build | Đạt (`tsc && vite build`, exit code 0) |
| Backend `npm test` | 46/51 đạt, 5 thất bại trong `admin.workflows.spec.ts` |
| Backend build / admin browser suite | Chặn tại TypeScript TS2339, chưa chạy các bước trình duyệt |
| Bảng giá riêng bằng Chrome headless | Đạt ở 1440px, 768px và 390px; không có pageerror |

## Các lỗi backend tái hiện

1. `admin.controller.ts:226` gọi `AdminService.cashierWorkspace`, nhưng lớp service hiện không có hàm này. Backend không build được; bài test giới hạn dữ liệu POS cũng lỗi `cashierWorkspace is not a function`.
2. Bài test lịch hẹn thất bại ở bước checkout sau thu tiền: `collectCashierPayment` đã đặt lịch thành `COMPLETED`, còn action checkout yêu cầu `IN_SERVICE`. Hai bài tiếp theo báo ca đang mở vì bài trước dừng trước khi đóng ca. Đây là lỗi dây chuyền trong fixture dùng chung, chưa phải bằng chứng của hai nguyên nhân độc lập.
3. Tìm nhân sự bằng tên chi nhánh trả về 0 dòng thay vì 1. Logic list hiện chưa tìm qua trường tên chi nhánh như kỳ vọng trong workflow test. Các kỳ vọng phân trang nằm sau assertion này chưa được thực hiện.

Không thay đổi logic nghiệp vụ backend hoặc nới kỳ vọng test để làm kết quả đạt trong đợt kiểm thử này.

## Giao diện bảng giá

Harness độc lập `.local-archive/pricing-retest.cjs` bundle component thật cùng CSS production, dùng MemoryRouter và chặn dịch vụ ngoài. Supabase trả về danh sách rỗng; bảng giá dùng dữ liệu dự phòng có sẵn của component. Đây là kiểm tra giao diện và tương tác local, không xác minh việc lưu giá thật hoặc đăng nhập tích hợp.

Đã kiểm tra: bốn cột, bốn mức buổi/gói; mở sửa giá với giá ban đầu đúng và hủy; chuyển cả ba tab và trạng thái được chọn; gọi in và ẩn thanh tab khi in; không tràn ngang toàn trang ở 390/768px; bảng cuộn ngang được. Phát hiện và sửa nhãn “Phổ biến nhất” bị cắt ở mép vùng cuộn bằng thêm padding phía trên; assertion và kiểm tra trình duyệt chạy lại đạt.

Bằng chứng:

- `.local-archive/admin-review/pricing-retest/result.json`
- `.local-archive/admin-review/pricing-retest/desktop.png`
- `.local-archive/admin-review/pricing-retest/width-390.png`
- `.local-archive/admin-review/pricing-retest/width-768.png`
- `.local-archive/admin-review/retest-browser.log`
- `.local-archive/admin-review/retest-frontend-build.log`

Gói ZIP bàn giao ngày 08/11 chưa được tạo lại trong lượt kiểm thử này; dùng worktree hiện tại và báo cáo này để tiếp tục.
