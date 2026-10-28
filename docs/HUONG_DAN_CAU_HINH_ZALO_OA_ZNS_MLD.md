# 📘 CẨM NANG HƯỚNG DẪN CẤU HÌNH ZALO OFFICIAL ACCOUNT (OA) & CỔNG ZNS TỰ ĐỘNG
## Hệ Thống Quản Trị Viện Trị Liệu & Học Viện Đào Tạo MLD Việt Nam

Tài liệu này cung cấp hướng dẫn chi tiết từng bước (Step-by-Step) dành cho Ban Quản trị và Đội ngũ Kỹ thuật MLD Việt Nam để thiết lập kết nối từ trang **Zalo Official Account (OA)** chính thức tới phân hệ **CSKH Zalo ZNS (`W14`)** trên Cổng Quản trị Web Admin.

---

## 📑 MỤC LỤC
1. [Tổng Quan Về Giải Pháp Zalo ZNS Trong Vận Hành MLD](#1-tổng-quan-về-giải-pháp-zalo-zns-trong-vận-hành-mld)
2. [Điều Kiện Cần Chuẩn Bị (Prerequisites)](#2-điều-kiện-cần-chuẩn-bị-prerequisites)
3. [Quy Trình Cấu Hình 4 Bước Chi Tiết](#3-quy-trình-cấu-hình-4-bước-chi-tiết)
   - [Bước 1: Lấy Zalo Official Account ID (OA ID)](#bước-1-lấy-zalo-official-account-id-oa-id)
   - [Bước 2: Tạo Ứng Dụng & Lấy App ID, App Secret](#bước-2-tạo-ứng-dụng--lấy-app-id-app-secret)
   - [Bước 3: Lấy Access Token & Refresh Token (OAuth v4)](#bước-3-lấy-access-token--refresh-token-oauth-v4)
   - [Bước 4: Nhập Thông Số Vào Cổng Quản Trị Web Admin MLD](#bước-4-nhập-thông-số-vào-cổng-quản-trị-web-admin-mld)
4. [Kiểm Thử & Nghiệm Thu Gửi Tin Thực Tế](#4-kiểm-thử--nghiệm-thu-gửi-tin-thực-tế)
5. [Cơ Chế Tự Động Hóa Chạy Ngầm (Cron Job Auto-Refresh)](#5-cơ-chế-tự-động-hóa-chạy-ngầm-cron-job-auto-refresh)
6. [Bảng Tra Cứu Mã Lỗi Zalo Thường Gặp & Cách Khắc Phục](#6-bảng-tra-cứu-mã-lỗi-zalo-thường-gặp--cách-khắc-phục)

---

## 1. Tổng Quan Về Giải Pháp Zalo ZNS Trong Vận Hành MLD

**ZNS (Zalo Notification Service)** là dịch vụ gửi thông báo chăm sóc khách hàng qua Zalo OA có tích vàng của Doanh nghiệp. Tin nhắn được gửi trực tiếp vào hộp thư Zalo cá nhân của khách hàng với giao diện chuẩn nhận diện thương hiệu **MLD Vietnam**.

Hệ thống MLD đã tích hợp sẵn **4 kịch bản ZNS chuẩn hóa tự động**:
1. **Xác nhận đặt lịch (`BOOKING_CONFIRMATION`):** Tự động gửi ngay khi khách đặt lịch thành công qua Mobile App hoặc Lễ tân tạo lịch tại quầy.
2. **Nhắc hẹn trước giờ trị liệu 2 tiếng (`BOOKING_REMINDER`):** Giảm tỷ lệ quên lịch (No-show), nhắc nhở khách uống đủ nước trước ca dẫn lưu bạch huyết Vodder.
3. **Dặn dò & Chăm sóc sau trị liệu 24h (`POST_TREATMENT_CARE`):** Dặn dò chế độ nghỉ ngơi, uống nước ấm và theo dõi phản ứng đào thải độc tố tự nhiên của hệ bạch huyết.
4. **Nhắc tái khám định kỳ 14 ngày (`FOLLOWUP_CARE`):** Nhắc khách quay lại tái đánh giá chu vi phù nề (W17) và duy trì liệu trình.

---

## 2. Điều Kiện Cần Chuẩn Bị (Prerequisites)

Trước khi thực hiện kết nối kỹ thuật, Doanh nghiệp MLD cần chuẩn bị:
1. **01 Tài khoản Zalo Official Account (OA) Doanh nghiệp:** Đã được Zalo xác minh tích vàng tại [oa.zalo.me](https://oa.zalo.me).
2. **01 Tài khoản Nhà phát triển Zalo (Zalo for Developers):** Đăng ký bằng số điện thoại người quản trị tại [developers.zalo.me](https://developers.zalo.me).
3. **Tài khoản ZNS có số dư:** Đã nạp tiền dịch vụ ZNS trên cổng [business.zalo.me](https://business.zalo.me) (chi phí khoảng 200đ - 300đ/tin nhắn).
4. **Mẫu tin ZNS đã được phê duyệt:** Đã tạo và được Zalo duyệt 4 mẫu template tương ứng với các kịch bản trên.

---

## 3. Quy Trình Cấu Hình 4 Bước Chi Tiết

### Bước 1: Lấy Zalo Official Account ID (OA ID)
1. Truy cập trang quản trị Zalo OA: **[oa.zalo.me/manage](https://oa.zalo.me/manage)**.
2. Đăng nhập bằng tài khoản Quản trị viên của trang OA MLD Việt Nam.
3. Chọn trang OA: **MLD Việt Nam**.
4. Tìm mã **OA ID**:
   - Mã này hiển thị ngay dưới Tên trang hoặc vào mục **Quản lý** -> **Thông tin tài khoản**.
   - Dãy số có dạng: `2849182390192830192` (gồm 18-19 chữ số).
5. Lưu lại mã này để chuẩn bị nhập vào Web Admin.

---

### Bước 2: Tạo Ứng Dụng & Lấy App ID, App Secret
1. Truy cập Cổng phát triển Zalo: **[developers.zalo.me](https://developers.zalo.me)**.
2. Bấm nút **Thêm ứng dụng mới** (hoặc chọn ứng dụng MLD đã tạo sẵn).
   - *Tên ứng dụng:* `MLD Vietnam CRM & Booking`
   - *Mục đích:* Quản lý chăm sóc khách hàng và thông báo lịch hẹn y khoa.
3. Vào menu **Cài đặt** (Settings) -> **Cài đặt cơ bản**:
   - **App ID (Mã ứng dụng):** Sao chép dãy số này (VD: `4928109283019283`).
   - **Khóa bí mật của ứng dụng (App Secret):** Bấm nút **Hiện** -> Nhập mật khẩu Zalo để xác thực -> Sao chép chuỗi mã bảo mật này.
4. **Liên kết Ứng dụng với Trang Zalo OA:**
   - Tại menu bên trái, chọn mục **Official Account** -> Bấm **Quản lý Official Account**.
   - Bấm nút **Liên kết OA** -> Chọn trang **MLD Việt Nam**.
   - Đánh dấu cấp quyền:
     - `oa.manage` (Quản lý OA)
     - `oa.send.message` (Gửi tin nhắn thông báo / ZNS)
   - Bấm **Xác nhận liên kết**.

---

### Bước 3: Lấy Access Token & Refresh Token (OAuth v4)

Do Zalo áp dụng chuẩn bảo mật OAuth v4, Access Token có thời hạn sử dụng là **25 giờ**. Hệ thống MLD hỗ trợ 2 cơ chế:

#### Cách 3.1: Lấy Access Token nhanh (Dùng để kiểm thử ngay lập tức)
1. Tại trang [developers.zalo.me](https://developers.zalo.me), nhìn lên thanh menu trên cùng, chọn **Công cụ** -> **Công cụ kiểm tra API (API Explorer)**.
2. Thiết lập:
   - *Chọn ứng dụng:* `MLD Vietnam CRM & Booking`
   - *Loại Token:* Chọn **Official Account (OA)**
   - *Chọn OA:* `MLD Việt Nam`
   - *Phạm vi quyền (Scopes):* Tích chọn `oa.send.message` và `oa.manage`.
3. Bấm **Tạo Access Token**.
4. Sao chép toàn bộ chuỗi **Access Token** vừa sinh ra.

#### Cách 3.2: Lấy Refresh Token (Khuyến nghị - Để tự động gia hạn mãi mãi)
1. Tại mục **Công cụ** -> Chọn **OAuth 2.0 / v4 Token Generator**.
2. Chọn Ứng dụng và OA MLD, bấm cấp quyền để hệ thống sinh ra cặp:
   - `access_token`
   - `refresh_token`
3. Sao chép chuỗi `refresh_token` này để nạp vào hệ thống MLD. Tiến trình Cronjob của MLD sẽ sử dụng Refresh Token này để tự động xin cấp mới Access Token vĩnh viễn mà người quản trị không cần thao tác lại.

---

### Bước 4: Nhập Thông Số Vào Cổng Quản Trị Web Admin MLD

1. Mở trang Quản trị Web Admin MLD trên trình duyệt.
2. Tại menu điều hướng bên trái, bấm chọn: **`CSKH Zalo ZNS`** (mã màn hình `W14`).
3. Chuyển sang tab thứ 3: **`Cấu hình Zalo Cloud API`**.
4. Điền đầy đủ các trường thông tin:

| Tên trường trên màn hình | Dữ liệu tương ứng cần điền |
| :--- | :--- |
| **Zalo Official Account ID (OA ID)** | Dãy số OA ID lấy tại Bước 1 (VD: `2849182390192830192`) |
| **Zalo App ID (Mã Ứng Dụng)** | App ID lấy tại Bước 2 (VD: `4928109283019283`) |
| **Zalo App Secret (Khóa bí mật)** | Chuỗi bí mật ứng dụng lấy tại Bước 2 |
| **Zalo Refresh Token** | Chuỗi Refresh Token lấy tại Bước 3.2 (để tự động gia hạn) |
| **Zalo Cloud Access Token** | Chuỗi Access Token thật lấy tại Bước 3.1 *(Xóa chữ `test_access_token_mock` cũ)* |
| **Webhook Callback URL** | Giữ nguyên URL mặc định để nhận báo cáo trạng thái giao tin |

5. Bấm nút màu xanh: **`Lưu cấu hình Cổng Zalo`**.
6. Cuộn lên trên và bấm nút: **`Kiểm tra kết nối Zalo`**:
   - Nếu hệ thống hiện thông báo màu xanh lá:  
     `✅ Kết nối Zalo OA thành công! Trang: MLD Vietnam`  
     👉 **Chúc mừng bạn! Cổng kết nối Zalo Cloud đã sẵn sàng vận hành 100%.**
7. Nếu có Refresh Token, hãy bấm tiếp nút: **`Tự động làm mới Token (OAuth v4)`** để kiểm tra tính năng gia hạn tự động. Hệ thống sẽ đếm ngược thời gian hết hạn (`24:59:xx`) trực quan.

---

## 4. Kiểm Thử & Nghiệm Thu Gửi Tin Thực Tế

Sau khi kết nối báo xanh, hãy thực hiện kiểm thử gửi tin:

1. Chuyển về tab **`4 Kịch bản ZNS Chuẩn`**.
2. Bấm nút màu xanh **`Gửi tin kiểm thử`** ở góc trên bên phải.
3. Trong bảng popup:
   - **Chọn kịch bản:** Chọn `Nhắc hẹn trước giờ trị liệu (2 tiếng)`.
   - **Tên khách hàng test:** Nhập tên của bạn (VD: `Nguyễn Văn A`).
   - **Số điện thoại nhận tin:** Nhập số điện thoại Zalo của bạn (VD: `0912345678`).
4. Bấm **`Gửi tin ngay`**.
5. Mở ứng dụng Zalo trên điện thoại cá nhân -> Kiểm tra hộp thư Zalo từ **MLD Vietnam (Official Verified)** gửi đến.
6. Chuyển sang tab **`Nhật ký gửi tin`** trên Web Admin để xem lại báo cáo trạng thái: `DELIVERED`, mã phản hồi `0`, thời gian gửi chuẩn xác.

---

## 5. Cơ Chế Tự Động Hóa Chạy Ngầm (Cron Job Auto-Refresh)

Hệ thống backend NestJS của MLD được trang bị module tự động hóa `TasksService`:
- **Chu kỳ chạy:** Định kỳ mỗi 6 tiếng (`@Cron('0 */6 * * *')`).
- **Nghiệp vụ:**
  1. Đọc thông số từ bảng bảo mật `public.zns_config` trên Supabase Cloud.
  2. Kiểm tra thời hạn `expires_at` của Access Token.
  3. Nếu thời hạn còn **dưới 6 tiếng**, hệ thống tự động phát lệnh HTTP POST chuẩn OAuth v4 tới Zalo:
     ```http
     POST https://oauth.zaloapp.com/v4/oa/access_token
     Header: secret_key: <app_secret>
     Body: refresh_token=<token>&app_id=<app_id>&grant_type=refresh_token
     ```
  4. Nhận cặp token mới và tự động cập nhật lại `expires_at` (+25 giờ) vào cơ sở dữ liệu.
- **Lợi ích:** Đảm bảo hệ thống gửi tin ZNS chăm sóc khách hàng hoạt động liên tục 24/7/365 mà không bao giờ bị gián đoạn do token hết hạn.

---

## 6. Bảng Tra Cứu Mã Lỗi Zalo Thường Gặp & Cách Khắc Phục

| Mã lỗi Zalo | Thông báo lỗi | Nguyên nhân | Cách khắc phục |
| :---: | :--- | :--- | :--- |
| **`-14002`** | `Invalid app id` | Sai App ID hoặc ứng dụng bị khóa trên Zalo Developers. | Kiểm tra lại mã `Zalo App ID` trong Cài đặt cơ bản. |
| **`-14014`** | `Invalid secret key` | Khóa bí mật (App Secret) nhập không đúng. | Bấm nút Hiện trên Zalo Developers để copy lại chuỗi bí mật. |
| **`-216`** | `Access token invalid` | Token đã hết hạn 25 giờ hoặc chuỗi token bị cắt bớt ký tự. | Lấy Access Token mới hoặc bấm "Tự động làm mới Token (OAuth v4)". |
| **`-209`** | `OA is not linked` | Ứng dụng chưa được cấp quyền liên kết với Zalo OA MLD. | Vào Zalo Developers -> `Official Account` -> Bấm `Liên kết OA`. |
| **`-213`** | `User not in allowed list` | Đang ở chế độ thử nghiệm (Sandbox) và SĐT nhận chưa được thêm vào danh sách kiểm thử. | Thêm số điện thoại vào mục `Người dùng thử nghiệm` trên Zalo Developers hoặc kích hoạt OA sang chế độ Production. |
| **`-220`** | `Template id not found` | Mã mẫu tin ZNS (`template_id`) không tồn tại hoặc chưa duyệt. | Kiểm tra mã template đã được duyệt trên `business.zalo.me`. |
| **`-221`** | `Not enough balance` | Tài khoản trả trước ZNS của doanh nghiệp hết tiền. | Nạp tiền vào tài khoản ZCA / ZNS của doanh nghiệp trên Zalo. |
