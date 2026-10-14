# QUY TRÌNH & THIẾT KẾ LOGIC CHI TIẾT DỰ ÁN MEDICAL HEALTHCARE
## CHUẨN HÓA 100% THEO THIẾT KẾ FIGMA: "Medical Healthcare Mobile App" (ctH76PAiMBTQLJE0BxNjOI)

**Phiên bản:** 2.0.0 (Cập nhật trực tiếp từ Figma Design System)  
**Phạm vi:** 
- **Mobile App (Flutter — 390x844 px):** Gồm 6 Nhóm tính năng (Group A, B, C, D, E, F) với 26 màn hình.
- **Web Admin Portal (React + TypeScript — 1600 px):** Gồm Nhóm W với 12 màn hình Dashboard điều hành.

---

# MỤC LỤC TỔNG QUAN HỆ THỐNG

1. [PHẦN I: MOBILE APP - CHI TIẾT TỪNG MÀN HÌNH & LOGIC NGHIỆP VỤ](#phần-i-mobile-app---chi-tiết-từng-màn-hình--logic-nghiệp-vụ)
   - [GROUP A: ONBOARDING & XÁC THỰC (A01 - A06)](#group-a-onboarding--xác-thực-a01---a06)
   - [GROUP B: KHÁM PHÁ DỊCH VỤ, CƠ SỞ & ĐỘI NGŨ](#group-b-khám-phá-dịch-vụ-cơ-sở--đội-ngũ)
   - [GROUP C: ĐẶT LỊCH & THANH TOÁN](#group-c-đặt-lịch--thanh-toán)
   - [GROUP D: GÓI LIỆU TRÌNH, NHẬT KÝ & CHĂM SÓC KHÁCH HÀNG (D01 - D08)](#group-d-gói-liệu-trình-nhật-ký--chăm-sóc-khách-hàng-d01---d08)
   - [GROUP E: HỌC VIỆN ĐÀO TẠO Y KHOA / CHUYÊN MÔN (ACADEMY)](#group-e-học-viện-đào-tạo-y-khoa--chuyên-môn-academy)
   - [GROUP F: THẺ HỘI VIÊN, ĐIỂM THƯỞNG & TÀI KHOẢN (F01 - F08)](#group-f-thẻ-hội-viên-điểm-thưởng--tài-khoản-f01---f08)
2. [PHẦN II: WEB ADMIN - 12 MÀN HÌNH QUẢN TRỊ ĐIỀU HÀNH (W01 - W12)](#phần-ii-web-admin---12-màn-hình-quản-trị-điều-hành-w01---w12)
3. [PHẦN III: ÁNH XẠ DỮ LIỆU BACKEND & DATABASE CHO DỰ ÁN](#phần-iii-ánh-xạ-dữ-liệu-backend--database-cho-dự-án)

---

# PHẦN I: MOBILE APP - CHI TIẾT TỪNG MÀN HÌNH & LOGIC NGHIỆP VỤ

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           KIẾN TRÚC LUỒNG MOBILE APP                      │
│                                                                           │
│ [A01_Splash] ──▶ [A02_Onboarding] ──▶ [A03_Login] ──▶ [A04_OTP]           │
│                                           │                               │
│                                           ▼                               │
│                      [A05_ProfileSetup] ──▶ [A06_PurposeSelection]        │
│                                                    │                      │
│                                                    ▼                      │
│                                            ┌──────────────┐               │
│                                            │  BOTTOM NAV  │               │
│                                            └───────┬──────┘               │
│                 ┌──────────────────┬───────────────┼──────────────┬───────┤
│                 ▼                  ▼               ▼              ▼       │
│             [GROUP B]          [GROUP C]       [GROUP D]      [GROUP F]   │
│             Trang chủ          Đặt lịch &      Liệu trình &   Hội viên &  │
│             Khám phá           Thanh toán      Nhật ký CS     Tài khoản   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## GROUP A: ONBOARDING & XÁC THỰC (A01 - A06)

### 1. `A01_Splash` (Màn hình khởi động)
* **Kích thước:** `390x844 px` | **Node ID:** `8107:5499`
* **Giao diện:**
  * Logo thương hiệu Medical Healthcare hiển thị trung tâm trên nền gradient nhẹ nhàng.
  * Slogan y tế và dòng bản quyền ở cuối màn hình.
* **Logic kỹ thuật:**
  * Kiểm tra token bảo mật lưu trong `flutter_secure_storage`.
  * Nếu chưa từng mở app $\rightarrow$ Điều hướng sang `A02_Onboarding`.
  * Nếu đã có token hợp lệ $\rightarrow$ Điều hướng thẳng vào `GROUP B (Trang chủ)`.
  * Nếu phiên đăng nhập hết hạn $\rightarrow$ Điều hướng về `A03_Login`.

### 2. `A02_Onboarding` (Giới thiệu giải pháp)
* **Kích thước:** `390x844 px` | **Node ID:** `8107:5522`
* **Giao diện:**
  * Slider 3 màn hình minh họa: 
    1. *Khám phá dịch vụ y tế & trị liệu cao cấp.*
    2. *Quản lý phác đồ điều trị & nhật ký chăm sóc cá nhân hóa.*
    3. *Tích lũy điểm hội viên & đặc quyền chăm sóc sức khỏe.*
  * Dots Indicator chuyển trang mượt mà.
  * Nút "Bỏ qua" (Skip) góc trên và Nút CTA "Bắt đầu ngay".
* **Logic kỹ thuật:**
  * Lưu cờ `has_seen_onboarding = true` vào bộ nhớ máy để không lặp lại ở các lần mở sau.

### 3. `A03_Login` (Đăng nhập)
* **Kích thước:** `390x844 px` | **Node ID:** `8107:5548`
* **Giao diện:**
  * Header chào đón: "Chào mừng bạn quay trở lại".
  * Ô nhập Số điện thoại định dạng chuẩn Việt Nam.
  * Checkbox "Ghi nhớ đăng nhập" và "Đồng ý điều khoản sử dụng".
  * Nút CTA "Tiếp tục" / "Nhận mã OTP".
  * Nút đăng nhập phụ: Google, Apple ID.
* **Logic & API:**
  * Validate số điện thoại (10 chữ số).
  * Gọi API `POST /api/v1/auth/send-otp` $\rightarrow$ Chuyển sang `A04_OTP`.

### 4. `A04_OTP` (Xác thực mã bảo mật)
* **Kích thước:** `390x844 px` | **Node ID:** `8107:5588`
* **Giao diện:**
  * Thông báo gửi mã đến số điện thoại người dùng: `+84 987***321`.
  * 6 ô nhập mã OTP tách biệt với tính năng tự động nhảy ô và paste từ SMS.
  * Bộ đếm ngược gửi lại mã: 60 giây.
* **Logic & API:**
  * Gọi `POST /api/v1/auth/verify-otp`.
  * Nếu tài khoản mới chưa có thông tin $\rightarrow$ Điều hướng sang `A05_ProfileSetup`.
  * Nếu tài khoản cũ đã có đầy đủ thông tin $\rightarrow$ Vào thẳng Trang chủ.

### 5. `A05_ProfileSetup` (Thiết lập hồ sơ cá nhân)
* **Kích thước:** `390x844 px` | **Node ID:** `8107:5634`
* **Giao diện:**
  * Chọn ảnh đại diện (Upload Avatar).
  * Họ và tên đầy đủ.
  * Giới tính (Nam / Nữ / Khác).
  * Ngày tháng năm sinh.
  * Địa chỉ / Khu vực sinh sống.
* **Logic & API:**
  * Validate bắt buộc Họ tên và Ngày sinh.
  * Gọi API `PATCH /api/v1/auth/profile` lưu thông tin vào bảng `users`.
  * Chuyển tiếp sang `A06_PurposeSelection`.

### 6. `A06_PurposeSelection` (Chọn mục đích & nhu cầu y tế)
* **Kích thước:** `390x844 px` | **Node ID:** `8107:5688`
* **Giao diện:**
  * Tiêu đề: "Bạn quan tâm đến dịch vụ chăm sóc nào nhất?".
  * Danh sách các thẻ lựa chọn (Multi-select Chips):
    - *Khám sức khỏe tổng quát*
    - *Trị liệu chuyên sâu & Phục hồi*
    - *Chăm sóc da & Thẩm mỹ y khoa*
    - *Gói chăm sóc định kỳ cho gia đình*
    - *Khóa đào tạo chuyên môn y tế / spa y khoa*
  * Nút CTA "Hoàn tất & Khám phá ngay".
* **Logic & API:**
  * Lưu sở thích người dùng để cá nhân hóa đề xuất dịch vụ trên Trang chủ `GROUP B`.

---

## GROUP B: KHÁM PHÁ DỊCH VỤ, CƠ SỞ & ĐỘI NGŨ

### 1. `Màn hình khám phá` (Home & Service Discovery)
* **Kích thước:** `1704x844 px` | **Node ID:** `8109:14562`
* **Giao diện:**
  * **Header:** Avatar, Tên khách hàng, Hạng thành viên (Silver/Gold/Diamond), Icon chuông thông báo (badge đỏ).
  * **Thanh tìm kiếm:** Tìm nhanh dịch vụ, gói trị liệu, bác sĩ hoặc cơ sở gần nhất.
  * **Banner Slider:** Chương trình khuyến mãi, gói khám sức khỏe độc quyền.
  * **Quick Actions / Chuyên mục dịch vụ:** Grid icon các nhóm dịch vụ trị liệu chính.
  * **Gói liệu trình nổi bật (Featured Packages):** Card gói khám gồm giá ưu đãi, thời gian liệu trình và số buổi.
  * **Đội ngũ chuyên gia / Bác sĩ tiêu biểu:** Danh sách bác sĩ có rating cao, số năm kinh nghiệm.
* **Logic & API:**
  * Gọi API `GET /api/v1/home/feed` tải dữ liệu tổng hợp. Cache offline để mở app tức thì.

### 2. `Cơ sở và đội ngũ` (Branches & Specialists Directory)
* **Kích thước:** `1704x844 px` | **Node ID:** `8109:14993`
* **Giao diện:**
  * **Tab 1: Danh sách chi nhánh / Cơ sở y tế:**
    - Tên cơ sở, ảnh phòng khám, địa chỉ, khoảng cách (km).
    - Giờ mở cửa/đóng cửa, hotline liên hệ, nút chỉ đường Google Maps.
  * **Tab 2: Đội ngũ Bác sĩ & Chuyên viên trị liệu:**
    - Ảnh chân dung, học vị, chuyên môn, cơ sở trực thuộc.
    - Điểm đánh giá sao, lượt nhận xét, nút "Xem lịch trống & Đặt hẹn".
* **Logic & API:**
  * `GET /api/v1/clinics` (danh sách chi nhánh) và `GET /api/v1/doctors` (danh sách bác sĩ/chuyên gia).

---

## GROUP C: ĐẶT LỊCH & THANH TOÁN

### `Đặt lịch và thanh toán` (Booking & Payment Flow)
* **Kích thước:** `2142x1838 px` | **Node ID:** `8111:26450`
* **Quy trình logic gồm 4 bước liền mạch:**
  1. **Bước 1 — Chọn Dịch vụ & Chuyên gia:**
     - Chọn gói liệu trình hoặc dịch vụ lẻ.
     - Chọn bác sĩ/kỹ thuật viên ưu tiên (hoặc để hệ thống tự phân bổ).
     - Chọn chi nhánh thực hiện.
  2. **Bước 2 — Chọn Ngày & Khung giờ (Slot Selection):**
     - Calendar chọn ngày.
     - Danh sách các slot 30-45 phút (Sáng / Chiều / Tối).
     - Slot nào đã kín chỗ hiển thị màu xám mờ.
     - **Cơ chế giữ chỗ 10 phút:** Khi người dùng chọn slot $\rightarrow$ Backend khóa tạm bằng Redis để chống tranh chấp lịch (Double-Booking).
  3. **Bước 3 — Thông tin Khách hàng & Mã giảm giá:**
     - Đặt cho bản thân hoặc người thân.
     - Ghi chú tình trạng sức khỏe / yêu cầu đặc biệt.
     - Nhập mã voucher giảm giá (`HEALTHY20`, `VOUCHER50K`).
     - Tùy chọn: Dùng điểm tích lũy (`Loyalty Points`) để khấu trừ viện phí.
  4. **Bước 4 — Thanh toán & Nhận phiếu:**
     - Phương thức: Trả sau tại quầy, Ví MoMo, VNPay QR, Thẻ ngân hàng.
     - Sau khi đặt thành công: Xuất **Phiếu hẹn điện tử kèm Mã QR check-in**.

---

## GROUP D: GÓI LIỆU TRÌNH, NHẬT KÝ & CHĂM SÓC KHÁCH HÀNG (D01 - D08)

Đây là **phân hệ khác biệt lớn nhất** so với các app y tế thông thường:

### 1. `D01_MyPackages` (Gói dịch vụ / Liệu trình của tôi)
* **Node ID:** `8112:7819`
* **Giao diện & Logic:**
  * Danh sách các gói liệu trình khách hàng đang sở hữu (Đang điều trị / Đã hoàn thành).
  * Thanh tiến độ (Progress bar): Ví dụ *Đã thực hiện 3/10 buổi*.
  * Hạn sử dụng của gói và chi nhánh đăng ký.
  * Nút CTA "Đặt lịch buổi tiếp theo".

### 2. `D02_PackageDetails` (Chi tiết gói liệu trình)
* **Node ID:** `8112:8015`
* **Giao diện & Logic:**
  * Toàn bộ phác đồ điều trị: Mục tiêu liệu trình, lộ trình từng buổi khám/chăm sóc.
  * Bác sĩ/Chuyên viên phụ trách chính.
  * Lịch sử các buổi đã thực hiện kèm ghi chú của bác sĩ sau từng buổi.

### 3. `D03_CareJournal` (Nhật ký chăm sóc & theo dõi sức khỏe)
* **Node ID:** `8112:8110`
* **Giao diện & Logic:**
  * Dòng thời gian (Timeline) theo dõi chỉ số sức khỏe, tình trạng phục hồi sau mỗi buổi trị liệu.
  * Cho phép khách hàng tải ảnh chụp tình trạng hiện tại để bác sĩ theo dõi từ xa.
  * Lời dặn dò và phản hồi trực tiếp từ chuyên gia y tế.

### 4. `D04_PreServiceConsultation` (Tư vấn trước dịch vụ)
* **Node ID:** `8112:8246`
* **Giao diện & Logic:**
  * Bảng câu hỏi sàng lọc sức khỏe trực tuyến (Pre-screening checklist): Tiền sử dị ứng, bệnh nền, thuốc đang sử dụng.
  * Đảm bảo an toàn tuyệt đối trước khi tiến hành thủ thuật hoặc liệu trình.

### 5. `D05_ServiceReview` (Đánh giá dịch vụ & chuyên gia)
* **Node ID:** `8112:8402`
* **Giao diện & Logic:**
  * Chấm điểm 5 sao cho Bác sĩ / Kỹ thuật viên và Cơ sở vật chất phòng khám.
  * Chọn các tag nhanh: "Chuyên môn cao", "Nhẹ nhàng", "Phòng sạch sẽ", "Đúng giờ".
  * Nhận xét chi tiết và tải ảnh feedback.

### 6. `D06_HomeCareGuidelines` (Cẩm nang hướng dẫn tự chăm sóc tại nhà)
* **Node ID:** `8112:8509`
* **Giao diện & Logic:**
  * Hướng dẫn chi tiết sau điều trị: Chế độ ăn uống kiêng cữ, bài tập phục hồi, cách dùng thuốc.
  * Tài liệu video/hình ảnh trực quan do chính bác sĩ biên soạn.

### 7. `D07_CustomerSupport` (Hỗ trợ khách hàng & Hotline)
* **Node ID:** `8112:8584`
* **Giao diện & Logic:**
  * Kênh liên hệ khẩn cấp: Hotline cấp cứu/tư vấn 24/7.
  * Chat trực tiếp với nhân viên CSKH hoặc Đặt câu hỏi cho bác sĩ.
  * Danh mục câu hỏi thường gặp (FAQ).

### 8. `D08_Notifications` (Trung tâm thông báo)
* **Node ID:** `8112:8648`
* **Giao diện & Logic:**
  * Phân loại tab: *Lịch hẹn & Nhắc nhở* | *Ưu đãi & Voucher* | *Hệ thống*.
  * Tự động nhắc trước giờ hẹn 24h và 2h. Nhắc lịch tái khám hoặc thực hiện buổi trị liệu tiếp theo.

---

## GROUP E: HỌC VIỆN ĐÀO TẠO Y KHOA / CHUYÊN MÔN (ACADEMY)

* **Node ID:** `8116:26866`
* **Mục đích:** Phục vụ học viên quan tâm đến các khóa đào tạo nghề y tế, chứng chỉ chăm sóc sức khỏe, thẩm mỹ y khoa.
* **Giao diện & Logic:**
  * Danh mục khóa học: Giảng viên phụ trách, thời lượng, giáo trình thực hành.
  * Thông tin tuyển sinh, học phí và lịch khai giảng.
  * Nút "Đăng ký tư vấn khóa học" hoặc "Nộp hồ sơ trực tuyến".

---

## GROUP F: THẺ HỘI VIÊN, ĐIỂM THƯỞNG & TÀI KHOẢN (F01 - F08)

### 1. `F01_ProfileDashboard` & `F02_EditProfile` (Hồ sơ người dùng)
* **Node ID:** `8120:13677` & `8120:13871`
* **Giao diện & Logic:** Quản lý avatar, họ tên, số điện thoại, nhóm máu, địa chỉ, người liên hệ khẩn cấp.

### 2. `F03_MembershipCard` (Thẻ thành viên điện tử)
* **Node ID:** `8120:13954`
* **Giao diện & Logic:**
  * Thẻ ảo với mã vạch / mã QR định danh khách hàng.
  * Hạng thẻ: Silver $\rightarrow$ Gold $\rightarrow$ Platinum $\rightarrow$ Diamond.
  * Danh sách quyền lợi độc quyền: Giảm % dịch vụ, ưu tiên xếp lịch, quà sinh nhật.

### 3. `F04_LoyaltyPoints` (Điểm thưởng tích lũy)
* **Node ID:** `8120:14046`
* **Giao diện & Logic:**
  * Số điểm hiện có (VD: `2.450 điểm` = `245.000 đ`).
  * Lịch sử cộng/trừ điểm sau mỗi lần sử dụng dịch vụ.
  * Đổi điểm lấy Voucher hoặc quà tặng chăm sóc sức khỏe.

### 4. `F05_MyVouchers` (Kho Voucher của tôi)
* **Node ID:** `8120:14155`
* **Giao diện & Logic:**
  * Danh sách voucher: Khả dụng / Đã dùng / Hết hạn.
  * Nút "Sử dụng ngay" (tự động áp vào luồng đặt lịch).

### 5. `F06_PaymentHistory` (Lịch sử thanh toán & Hóa đơn)
* **Node ID:** `8120:14250`
* **Giao diện & Logic:**
  * Danh sách giao dịch: Ngày giờ, số tiền, phương thức, trạng thái (Thành công/Hoàn tiền).
  * Xem và tải hóa đơn điện tử (E-Receipt PDF).

### 6. `F07_ReferralProgram` (Giới thiệu bạn bè nhận thưởng)
* **Node ID:** `8120:14442`
* **Giao diện & Logic:**
  * Mã giới thiệu cá nhân + Link chia sẻ qua Zalo/Facebook.
  * Cơ chế: Người giới thiệu nhận 100 điểm, người được giới thiệu nhận voucher 100k.

### 7. `F08_Settings` (Cài đặt ứng dụng)
* **Node ID:** `8120:14530`
* **Giao diện & Logic:** Đổi mật khẩu, cài đặt FaceID/Vân tay, cài đặt thông báo, đổi ngôn ngữ, điều khoản bảo mật.

---

# PHẦN II: WEB ADMIN - 12 MÀN HÌNH QUẢN TRỊ ĐIỀU HÀNH (W01 - W12)

Được thiết kế chuẩn hóa cho màn hình Desktop độ phân giải 1600px:

```
┌────────────────────────────────────────────────────────────────────────┐
│  MED-CARE MANAGEMENT PORTAL             Chi nhánh: [Quận 1 ▼]  👤Admin │
├───────────────┬────────────────────────────────────────────────────────┤
│ 📊 W01 Tổng quan│ W01: OVERVIEW DASHBOARD                                │
│ 🏢 W02 Chi nhánh│ - Doanh thu hôm nay: 48.500.000 đ                      │
│ 👥 W03 CRM KH   │ - Tổng lượt khám/dịch vụ hôm nay: 64 ca                │
│ 📅 W05 Lịch trực│ - Tỷ lệ lấp đầy phòng khám: 88%                        │
│ 📦 W06 Gói trị liệu - Bác sĩ / Kỹ thuật viên đang trực: 14 người         │
│ 💳 W07 Thu ngân ├──────────────────────────────────────────────────────┤
│ 🎓 W08-W11 Đào tạo LỊCH HẸN HÔM NAY (Live Updates)                     │
│ 📈 W12 Báo cáo TC ├──────┬──────────────┬──────────┬───────────┬────────┤
└───────────────┴──────┴──────────────┴──────────┴───────────┴────────┘
```

### Chi tiết 12 màn hình Web Admin:

1. **`W01_Overview` (Dashboard Tổng quan):**
   * Theo dõi thời gian thực: Doanh thu theo ngày, số lịch hẹn mới, số khách đang tại cơ sở, tỷ lệ hủy/vắng mặt.
2. **`W02_BranchManagement` (Quản lý Chi nhánh):**
   * Quản lý danh sách các cơ sở phòng khám, số lượng phòng trị liệu, danh mục trang thiết bị y tế tại từng chi nhánh.
3. **`W03_CustomerCRM` (Quản lý Khách hàng CRM):**
   * Danh bạ toàn bộ khách hàng: Lọc theo phân hạng (VIP/Thường), ngày khám gần nhất, tổng chi tiêu.
4. **`W04_CustomerDetail` (Chi tiết Khách hàng & Bệnh án):**
   * Hồ sơ 360 độ: Tiền sử bệnh, các gói liệu trình đang theo, nhật ký trị liệu, đơn thuốc và lịch sử thanh toán.
5. **`W05_TechnicianSchedule` (Lịch trực Bác sĩ & Kỹ thuật viên):**
   * Bảng phân ca làm việc, điều phối kỹ thuật viên vào từng phòng khám, quản lý slot trống và ngày nghỉ phép.
6. **`W06_TreatmentPackages` (Quản lý Gói dịch vụ & Liệu trình):**
   * Cấu hình các gói trị liệu: Số buổi, giá bán, phác đồ điều trị mẫu, chiết khấu.
7. **`W07_Cashier` (Quầy Thu ngân & Thanh toán):**
   * Tiếp đón khách, quét mã QR check-in trên app của khách, xuất hóa đơn, ghi nhận thanh toán tiền mặt/chuyển khoản/MoMo.
8. **`W08_Enrollment` (Đăng ký Đào tạo):**
   * Tiếp nhận hồ sơ học viên đăng ký các khóa đào tạo chuyên môn y tế.
9. **`W09_InstructorManagement` (Quản lý Giảng viên):**
   * Hồ sơ giảng viên, phân công lịch dạy lý thuyết và thực hành.
10. **`W10_StudentManagement` (Quản lý Học viên):**
   * Danh sách học viên, theo dõi điểm danh, tiến độ thực hành và cấp chứng chỉ.
11. **`W11_TrainingOperations` (Vận hành Đào tạo):**
    * Quản lý lớp học, phòng thực hành lâm sàng, giáo trình và thời khóa biểu.
12. **`W12_RevenueReports` (Báo cáo Doanh thu & Tài chính):**
    * Báo cáo phân tích doanh thu đa chiều: Theo chi nhánh, theo gói dịch vụ, theo bác sĩ, đối soát công nợ.

---

# PHẦN III: ÁNH XẠ DỮ LIỆU BACKEND & DATABASE CHO DỰ ÁN

Để đáp ứng trọn vẹn mô hình Figma thực tế trên, hệ thống Database và Backend API cần bổ sung các bảng mở rộng sau:

### 1. Bổ sung bảng cho Gói liệu trình (`treatment_packages` & `user_packages`):
* `packages`: `id`, `name`, `total_sessions`, `price`, `description`, `validity_days`.
* `user_packages`: `id`, `user_id`, `package_id`, `sessions_completed`, `status (ACTIVE, COMPLETED, EXPIRED)`.
* `treatment_journal`: `id`, `user_package_id`, `session_number`, `technician_id`, `notes`, `customer_feedback_photos`.

### 2. Bổ sung bảng cho Thẻ thành viên & Tích điểm (`memberships` & `loyalty_points`):
* `memberships`: `user_id`, `tier (SILVER, GOLD, PLATINUM, DIAMOND)`, `current_points`, `accumulated_spent`.
* `point_transactions`: `id`, `user_id`, `points_change`, `reason`, `created_at`.
* `referrals`: `referrer_id`, `referee_id`, `reward_status`.

### 3. Tận dụng Backend NestJS đã dựng:
* Các module `Auth`, `Specialities`, `Doctors`, `Appointments` đã viết ở các bước trước hoàn toàn tương thích và là nền tảng để vận hành luồng `GROUP A`, `GROUP B`, `GROUP C`.
* Chỉ cần bổ sung thêm 2 module nghiệp vụ nhỏ: `PackagesModule` và `MembershipModule` là hệ thống bao phủ 100% nghiệp vụ Figma!
