# Rà soát luồng Mini App — 07/11/2026

Phạm vi: mã Mini App và BE trong `minizalo`. Không sửa mobile, Admin, database dùng chung; không triển khai thanh toán. Các kiểm thử tích hợp sử dụng database kiểm thử/HTTP fixture, không tạo dữ liệu nghiệp vụ mẫu trên database thật.

## Kết quả và các lỗi đã sửa trong lượt rà soát

1. Thông báo ưu đãi, điểm thưởng, hóa đơn trước đây chỉ mở trang cá nhân. Đã định tuyến tới đúng danh sách và bản ghi. Hóa đơn chỉ đọc, không có thao tác thanh toán.
2. Thông báo ưu đãi hết hạn/đã dùng bị bộ lọc mặc định che khuất. Mở thông báo sẽ chọn đúng nhóm trạng thái của ưu đãi đó.
3. Lịch sử điều hướng thiếu ID nhật ký/phiếu hỗ trợ. Đã lưu và khôi phục ID khi Back/Forward, cùng ID đích ưu đãi/điểm/hóa đơn.
4. Lưu chi nhánh ưu tiên chưa kiểm tra phiên sau khi nhận kết quả. Đã chặn kết quả từ phiên cũ cập nhật tài khoản mới. Màn cá nhân vốn đã được gắn key theo tài khoản.
5. Nút tạo lịch khi danh mục dịch vụ rỗng trước đây không phản hồi. Đã hiển thị thông báo dịch vụ không khả dụng; không tự tạo dịch vụ/khung giờ.
6. Cập nhật kịch bản trình duyệt đăng nhập và công việc nhân viên theo điểm vào hiện tại, API dùng chung và SDK giả lập đầy đủ; loại bỏ giả định giao diện cũ.
7. Mở lịch hẹn từ trang cá nhân rồi bấm “Về trang chủ” trước đây vẫn quay về trang cá nhân. Đã sửa callback về đúng tab trang chủ, có ca trình duyệt kiểm tra từ luồng nhân viên/kết ca.

## Ma trận phạm vi kiểm tra

| Nhóm luồng | Nội dung đối chiếu | Bằng chứng |
| --- | --- | --- |
| Khởi động/trang chủ | Catalog song song, banner Admin, liên kết, lọc, logo, đồng bộ tên/ảnh Zalo | Connected browser; portal-content/banners; frontend-data/cache |
| Xác thực | Từ chối quyền, hủy, bấm liên tiếp, storage lỗi, tài khoản chung, quyền nhân viên riêng | Auth browser; unified-zalo-login; zalo-auth; frontend-session |
| Dịch vụ/tìm kiếm | Danh mục, chi tiết, chuyên viên/cơ sở, bộ lọc, lịch sử tìm kiếm có chủ sở hữu | Connected browser; search-history; customer-regressions |
| Sản phẩm/bảng giá | Nội dung thật từ Admin, tìm/lọc, giá cập nhật, mở dịch vụ, tư vấn theo sản phẩm, trạng thái rỗng | Connected browser; customer-catalog |
| Đặt lịch | Cá nhân/đặt hộ/nhóm, cơ sở, thời lượng, lịch trống, giường/nhân viên, tranh chấp, thử lại, không báo thành công giả | Connected/staff browser; booking-groups/resources; customer-capacity; availability-dates; staff-booking |
| Lịch hẹn | Phân biệt lịch cá nhân/công việc, chi tiết, hủy/đặt lại, cập nhật Admin, kết ca | Connected/staff browser; booking-pagination; staff-session; staff-records |
| Liệu trình/nhật ký | Gói đã sở hữu, buổi dùng/giữ chỗ/còn lại, đặt bằng gói, lời dặn, hồ sơ đúng khách | Staff browser; staff-package-booking; personal-group-parity; journal-sharing |
| Đào tạo | Catalog, lọc, đề cương có khóa, đăng ký, duyệt/xếp lớp, học theo tiến độ, lịch học | Connected/staff browser; admin-approval-flow; learning-access; course-audiences; schedule-deletion |
| Video/bài học/quiz | Quyền truy cập, cách ly player, lưu tiến độ, lượt thi/thời gian, chấm/nhận xét | learning-player-isolation; lesson-media; quiz-configuration; staff-assessments; workflow-audit |
| Tài liệu/giấy chứng nhận | PDF thực, quyền tải/xem, giấy chứng nhận theo chủ sở hữu, kiểm tra mã | Connected/staff browser; document-library; portal-document-policy; certificates; certificate-verification |
| Thông báo | Chủ sở hữu, trạng thái đọc, phân trang, đích lịch/lớp/liệu trình, nhắc lịch, ưu đãi/điểm/hóa đơn | Connected browser; notifications; staff-notifications |
| Cá nhân/thiết lập | Sửa hồ sơ, phiên/đổi tài khoản, lưu thiết lập, vai trò, không lẫn dữ liệu giữa phiên | Auth browser; account-sessions; frontend-session; phone-identity; admin-users-policy |
| Tác vụ nhân viên | Khách cũ, hồ sơ/nhật ký/gói của khách, tư vấn, duyệt hồ sơ, nhận xét bài, catalog theo quyền | Connected/staff browser; consultation-inbox; staff-dashboard; staff-administration; staff-records |
| Độ bền | Cache lỗi không thành dữ liệu rỗng thành công, hủy request, kết quả cũ, idempotency, kiểm tra đầu vào | frontend-cache/session; input-boundaries; audit-integrity; submission-hardening |

Ma trận bao phủ nhóm luồng và trường hợp được kiểm thử, không phải bằng chứng đã bấm mọi tổ hợp dữ liệu trên thiết bị Zalo thật. Một số bài kiểm thử BE có fixture/mã nguồn làm bằng chứng, cần đọc tên từng ca khi đánh giá độ bao phủ.

## Kiểm tra tự động

- BE: `npm.cmd run test:safe` — **56/56 file, 323/323 kiểm thử qua**.
- FE: `node --test scripts/*.test.mjs` — **31/31 kiểm thử qua**; TypeScript không lỗi.
- Connected browser: khách hàng/nhân viên, 320×640 và 390×844, Chromium và WebKit. Bổ sung kiểm tra đích thông báo profile, kể cả ưu đãi hết hạn.
- Auth browser: Chromium/WebKit ở 320×640, 390×844, 1366×900; storage ném DOMException, từ chối quyền, hủy rồi kết quả trả muộn, chặn double click, tài khoản chưa được cấp quyền công việc vẫn đăng nhập cá nhân.
- Staff workspace browser: hồ sơ/gói/nhật ký đúng khách, tìm kiếm, cẩm nang/tài liệu, kết ca và lọc khóa học; kiểm tra nút về trang chủ sau khi đi từ trang cá nhân.
- Production build kiểm tra asset/manifest và không chứa Vite development client. Audit **1.961 chuỗi**, không thiếu bản dịch. Bản build khoảng **3,73 MB** tổng asset, file lớn nhất khoảng **1,32 MB**; không dùng kích thước này để khẳng định thời gian mở app trên thiết bị thật.
- Log tại `minizalo/backend/.relay-local/final-results/flow-audit-*`; tổng BE tại `.relay-local/flow-audit-2026-11-07.log`. Đây là file local, không đưa vào Git.

## Điều kiện còn cần xác nhận ngoài local

1. **BE đang triển khai thiếu `customer-catalog-v1`**: kiểm tra chỉ đọc `npm.cmd run backend:check` sau khi cho phép mạng xác nhận máy chủ đang chạy bản cũ đối với phần catalog mới. Cần triển khai BE tương ứng rồi kiểm tra lại trước khi đẩy Mini App. Không tự deploy trong lượt này.
2. SDK trong trình duyệt là giả lập. Cần thử Zalo thật trên iOS/Android: cấp/từ chối số điện thoại, đổi tài khoản, camera QR, mở/tải PDF, video, safe area và quay lại từ nền. WebKit không thay thế Zalo iOS thật.
3. Không ghi thử lịch, đăng ký học hoặc chỉnh hồ sơ lên database thật trong lượt audit. Kiểm thử giao dịch/giường/phân quyền chạy trên môi trường kiểm thử; cần một lượt nghiệm thu tài khoản/cơ sở thật sau deploy.
4. Không tự bỏ kiểm tra sức chứa để hiện giờ trống; không tự cấp vai trò hoặc tạo lịch vận hành. Cơ sở/dịch vụ không đủ cấu hình thật vẫn có thể không có khung giờ.
5. Thanh toán và chính sách pháp lý vẫn nằm ngoài phạm vi theo yêu cầu trước đó.

Không kết luận “không còn lỗi”: kết quả chỉ xác nhận các ca kiểm thử và phạm vi nêu trên tại phiên bản local này.
