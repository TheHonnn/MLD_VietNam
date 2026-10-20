# Web Admin: database chung và vận hành

## Phạm vi

- Các menu nằm trong `src/admin`, API trong `backend/src/modules/admin`.
- 50 bảng được cho phép rõ ràng, đọc cấu trúc cột và khóa ngoại từ PostgreSQL thật.
- Không chạy seed, không tạo khách hàng mẫu, không tự thay đổi schema database.
- Giữ nguyên Layout, Header, các trang W01–W12 và toàn bộ URL cũ. Gộp các trang `/manage/:table` vào menu nghiệp vụ tương ứng: phòng dưới Chi nhánh, tài khoản dưới Khách hàng, check-in/out và hóa đơn dưới Thu ngân, học phí dưới Tuyển sinh, điểm danh dưới Học viên, nội dung học dưới Vận hành đào tạo. Các mục Dịch vụ, Nhân viên, Voucher & hội viên nằm trong Vận hành spa; Chứng chỉ trong Học viện; Phân quyền trong Hệ thống. Bấm tên mục cũ vẫn mở trang cũ, nút mũi tên bên cạnh chỉ đóng/mở menu con.
- Các bảng lịch sử chỉ đọc. Không xóa dây chuyền khi bản ghi còn được sử dụng.

## Chạy trên máy

Trong terminal ở thư mục gốc:

```powershell
cd backend
npm ci
npm run build
npm run start:admin:local
```

Lệnh local ưu tiên `backend/.env`; nếu chưa cấu hình kết nối thì dùng `DATABASE_URL` trong `minizalo/backend/.env` chỉ trong bộ nhớ. Không sao chép hoặc in khóa. Nếu chưa có `JWT_SECRET` riêng, phiên local dùng khóa ngẫu nhiên; khởi động lại backend sẽ yêu cầu đăng nhập lại.

Terminal thứ hai:

```powershell
cd web-admin
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Web: `http://127.0.0.1:5173`. API mặc định: `http://127.0.0.1:3000/api/v1`.
Đổi địa chỉ API bằng `web-admin/.env` với `VITE_API_BASE_URL`.

## Tài khoản hiện có chưa có mật khẩu

Hiện tạm bỏ màn hình đăng nhập khi chạy `npm run start:admin:local`. Backend chỉ lắng nghe tại `127.0.0.1`, dùng SUPER_ADMIN đang có trong database để ghi nhật ký, không tạo tài khoản giả. Chỉ chấp nhận request từ web local có origin được cho phép. Chế độ này bị vô hiệu khi `NODE_ENV=production`; không đặt `ADMIN_LOCAL_NO_AUTH=true` trên server triển khai. Khi cần bật đăng nhập lại, đặt biến này về `false` trong script local.

Chạy trực tiếp tại máy, không gửi mật khẩu qua chat hoặc Git:

```powershell
cd backend
npm run admin:password
```

Nhập SĐT/email của tài khoản ADMIN hoặc SUPER_ADMIN đang có, gõ `YES`, nhập mật khẩu mới hai lần. Mật khẩu được ẩn và băm bcrypt. Lệnh chỉ đổi mật khẩu tài khoản quản trị đã tồn tại, không tạo tài khoản hay đổi vai trò. Đây là thao tác có ghi vào database chung; chỉ chạy khi bạn muốn đặt mật khẩu.

## Cấu hình khi triển khai backend chung

- `ADMIN_DATABASE_URL`: PostgreSQL connection string của database chung, chỉ lưu ở máy chủ.
- `JWT_SECRET`: khóa ngẫu nhiên riêng ít nhất 32 ký tự; không dùng khóa ví dụ trong repository.
- `CORS_ORIGIN`: các origin web thật, phân cách bằng dấu phẩy.
- Giữ cấu hình Supabase và Redis của các phân hệ mobile đang dùng.
- Không đưa database URL, service-role key hoặc JWT secret vào biến `VITE_*`.

## Quyền truy cập

- SUPER_ADMIN: tất cả phân hệ, bao gồm vai trò/quyền và nhật ký quản trị.
- ADMIN: nghiệp vụ toàn hệ thống, không quản lý phân quyền hoặc thay đổi tài khoản nhân sự/quản trị.
- Tài khoản khác: cần `user_roles` không giới hạn chi nhánh và `role_permissions` được gán rõ ràng.
- Mã quyền: `<table>.read`, `<table>.create`, `<table>.update`, `<table>.delete`, `<table>.action`; ví dụ `services.read`.
- Vai trò chỉ giới hạn một chi nhánh chưa mở vào cổng quản trị toàn hệ thống để tránh lộ dữ liệu chi nhánh khác.
- Không thể tự khóa/xóa/đổi quyền tài khoản đang đăng nhập hoặc vô hiệu hóa SUPER_ADMIN cuối cùng.

## Các thao tác nghiệp vụ

- Nhân viên: cột Họ và tên lấy từ `users.full_name` qua `staff_profiles.user_id`; tìm kiếm theo tên, không ghi trùng tên vào hồ sơ nhân viên.
- Vận hành đào tạo: các nút Thêm video, Thêm bài trắc nghiệm, Thêm câu hỏi mở đúng form. Video dùng URL HTTP/HTTPS của file đã lưu trữ; câu hỏi có ô nhập từng đáp án và chọn đáp án đúng. Không tự tạo nội dung khi chưa có dữ liệu.
- Menu và vùng nội dung có thanh cuộn riêng trong chiều cao màn hình; header giữ nguyên vị trí, đổi trang sẽ đưa nội dung về đầu trang.

- Lịch hẹn: xác nhận → check-in → bắt đầu → check-out; check-out yêu cầu đã thanh toán.
- Hóa đơn: thêm bản nháp và chi tiết hóa đơn trước khi xác nhận nhận tiền. Tổng chi tiết phải khớp hóa đơn và lịch hẹn.
- Học phí: thêm phiếu chờ thu → xác nhận thực nhận, cập nhật số đã đóng trong cùng transaction; chặn thu lặp/vượt học phí.
- Thu tay chỉ cho tiền mặt/chuyển khoản. MoMo/VNPay cần webhook xác minh riêng, không giả lập thanh toán thành công.
- Chứng chỉ: nháp → phát hành khi tốt nghiệp, đủ học phí, điểm từ 5 và chuyên cần từ 80%; chứng chỉ phát hành chỉ được thu hồi với lý do.
- Điểm danh: đúng học viên và lớp; không tạo trùng một học viên/buổi học.
- Bản ghi đang được tham chiếu không xóa dây chuyền. Hãy ngừng hoạt động khi có trường phù hợp.

## Kiểm thử

```powershell
cd backend
npm test
npm run build
npm run test:admin:browser
```

Kiểm thử CRUD dùng PostgreSQL trong bộ nhớ, không đọc `.env`, không ghi database thật. Browser test yêu cầu web đang chạy tại port 5173 và Chrome cài sẵn; có thể đặt `CHROME_PATH`. Screenshot lưu trong `.local-archive/admin-review`, không đưa dữ liệu kiểm thử vào bundle.

Chẩn đoán schema thật chỉ đọc:

```powershell
node backend/scripts/check-admin-schema.cjs minizalo/backend/.env
```

Hoàn hóa đơn bằng thao tác hoàn toàn bộ, có lý do; hoàn học phí bằng phiếu loại `REFUND` và thao tác xác nhận hoàn, cập nhật công nợ trong cùng transaction. Đây là ghi nhận tiền đã thực tế hoàn, không tự chuyển tiền ngân hàng.

Chưa tích hợp gửi SMS, webhook ngân hàng hoặc sinh PDF chứng chỉ. Các URL ảnh/PDF cần trỏ đến file thật đã tải lên kho lưu trữ; không tạo file giả khi chưa có.
