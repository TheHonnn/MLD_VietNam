# Bổ sung nội dung Admin vào Mini App — 07/11/2026

Phạm vi đã xác nhận: giữ các luồng lấy dữ liệu thật, bổ sung nội dung/giao diện còn thiếu; mọi phần mới vẫn dùng dữ liệu thật. Chỉ sửa `minizalo`, không sửa mobile, web Admin hoặc database chung; không tạo dữ liệu nghiệp vụ mẫu, không chạy migration, không tự push/deploy. Mốc đầu lượt: `develop` tại `f1b0cf77`, working tree sạch.

## Nội dung mới

- **Sản phẩm bổ trợ tại nhà:** danh sách, nhóm sản phẩm từ dữ liệu thật, tìm không dấu tại BE, phân trang theo thứ tự Admin, chi tiết, khoảng giá, đơn vị, ảnh và nội dung. Đọc bảng `home_products`; thiếu bảng thì trả danh sách trống, thiếu ảnh thì không dùng ảnh sản phẩm giả. Chỉ trả các trường công khai; nếu có cột is_active thì bỏ sản phẩm ngừng hoạt động.
- **Bảng giá & gói liệu trình:** đọc `services` và `treatment_packages` đang hoạt động, cùng danh mục dịch vụ đang hoạt động. Hiện buổi lẻ/gói thật, giá ưu đãi có hiệu lực, số buổi, thời hạn và mô tả; lọc dịch vụ/số buổi, tìm cả tên dịch vụ và gói. Không tự tạo đủ chín gói nếu DB chỉ có ít gói. Không gắn nhãn VAT hoặc mức giảm viết sẵn.
- **Đường vào:** thêm trên trang chủ và trang dịch vụ; banner Admin có thể dẫn tới `/products`, `/home/products`, `/home-products`, `/services/pricing`, `/services/packages`, `/pricing`.
- **Tư vấn có ngữ cảnh:** chọn sản phẩm/gói sẽ mở form tư vấn với đúng tên trong nội dung, người dùng có thể sửa; gửi qua endpoint tư vấn thật đang có. Giữ ghi chú khi cần đăng nhập Zalo. Không tự chuyển yêu cầu tư vấn thành booking giá 0 hoặc chiếm giường.
- **Xem dịch vụ từ bảng giá:** đọc lại chi tiết thật trước khi mở, cập nhật bản ghi tương ứng ở Mini App và quay lại bảng giá khi đóng chi tiết. Không sử dụng bản dịch vụ cũ từ trang chủ khi Admin đã cập nhật.
- **Cập nhật nội dung:** đọc lại trên focus/online/hiện lại trang và mỗi 30 giây khi trang đang hiển thị; hủy/bỏ kết quả API cũ khi đổi bộ lọc/đóng trang. Chi tiết sản phẩm đọc riêng theo ID nên không mất khi nạp lại trang danh sách đầu tiên.
- **Ngôn ngữ và bố cục:** bổ sung tiếng Anh, layout màn hẹp, trạng thái lỗi/thử lại và chống bấm lặp khi mở dịch vụ/tải trang tiếp. Dữ liệu rỗng giữ trống, không hiển thị bản ghi mẫu hoặc thông báo giả có dữ liệu.

Không thêm mua hàng/thanh toán, quản trị nhân sự/phân quyền sâu, mẫu chứng nhận hay bộ gửi email mới trong lượt này. Những phần này không được coi là đã đồng bộ chỉ vì bổ sung hai catalog.

## API và phát hành

- GET `/api/portal/products`: bộ lọc tìm kiếm/nhóm, cursor và limit.
- GET `/api/portal/products/:id`: chi tiết sản phẩm công khai còn khả dụng.
- GET `/api/portal/pricing`: dịch vụ và gói đang hoạt động, giá từ DB.
- Capability mới: `customer-catalog-v1`, được yêu cầu bởi `backend:check` trước deploy Mini App. **Cập nhật BE trước FE**, không bỏ qua gate nếu server chưa có endpoint mới. Không cần migration mới cho thay đổi này.

## Kiểm chứng

BE kiểm tra trên database thử cô lập: không có bảng, danh sách trống, lọc không dấu/ký tự `%`, cursor hợp lệ/không hợp lệ, giới hạn trang, thứ tự Admin, không lộ trường nội bộ, sửa giá/ảnh và ẩn sản phẩm; giá gói bằng 0 thật, tắt gói/dịch vụ, không tự sinh gói dự phòng. Nhóm liên quan gồm catalog mới, portal, banner và quản trị catalog/tuyển sinh.

Browser dùng entry thật với HTTP/SDK fixture: đọc sản phẩm và giá thay đổi, nội dung tư vấn đúng sản phẩm, danh sách trống không có dữ liệu mẫu, bảng giá/lọc gói, chi tiết dịch vụ mới nhất, nút Back và các luồng đặt lịch/học/công việc cũ. Chromium/WebKit, 320×640 và 390×844. Chưa thay thế nghiệm thu Zalo/native và dữ liệu production thật.

Kết quả: **6/6 ca BE liên quan qua**, **31/31 FE/toolchain qua**, TypeScript qua, audit **1.953 chuỗi UI** không thiếu bản dịch/template. Chromium/WebKit qua khách hàng và nhân viên ở hai kích thước; sau bổ sung tìm tên gói và nạp mới chi tiết dịch vụ, chạy lại khách hàng trên cả hai engine/hai kích thước đều qua. Đã xem ảnh chụp bảng giá và chi tiết sản phẩm. Production build/postbuild qua: **3.724.506 byte**, file lớn nhất **1.321.307 byte**, không có development client.

Log: `minizalo/backend/.relay-local/final-results/customer-catalog-*`, `catalog-chromium.log`, `catalog-webkit.log`, `catalog-search-*.log`; ảnh ở cache `connected-app/`. Local được chạy tại `http://127.0.0.1:5184/`; browser kiểm thử dùng fixtures, chưa phải xác nhận dữ liệu production hoặc đăng nhập Zalo native thật.
