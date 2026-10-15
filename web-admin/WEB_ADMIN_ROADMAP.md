# CẨM NANG & LỘ TRÌNH TỪNG BƯỚC HOÀN THÀNH WEB ADMIN (MLD VIỆT NAM)

> **Dự án:** MLD Việt Nam — Hệ Sinh Thái Y Tế, Dưỡng Sinh Spa & Học Viện Đào Tạo Nghề  
> **Phân hệ phụ trách:** Cổng Quản Trị Web Admin (`web-admin/`)  
> **Chuẩn thiết kế:** 100% Khớp Ma Trận 12 Màn Hình Figma (W01 — W12) & Ảnh Thiết Kế Thực Tế  
> **Nguồn chân lý dữ liệu:** [`web-admin/src/types/shared_types.ts`](src/types/shared_types.ts)  
> **Nguyên tắc bất di bất dịch:** **Không chỉnh sửa thư mục `backend/`**, tuân thủ 100% hợp đồng API.

---

## 📌 BẢN ĐỒ TIẾN ĐỘ TỔNG THỂ (4 GIAI ĐOẠN)

```
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: KHỞI TẠO BỘ KHUNG (SHELL & MASTER LAYOUT)                │
│ • Entry point (main.tsx, App.tsx)                                      │
│ • Sidebar 12 menu điều hướng + Header chọn chi nhánh                   │
│ • Cấu hình Theme màu Spa Cao Cấp (Nâu Caramel & Trắng Kem)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: TẦNG DỮ LIỆU & HỢP ĐỒNG API (DATA & SERVICES)             │
│ • apiClient.ts: Bọc chuẩn phản hồi ApiResponse<T>                      │
│ • mockData.ts: Bộ dữ liệu mẫu chuẩn 100% theo shared_types.ts         │
│ • Modular Services: Tách riêng service cho từng nhóm nghiệp vụ        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: HIỆN THỰC HÓA 12 MÀN HÌNH THEO 5 CỤM NGHIỆP VỤ           │
│ • Cụm 1: Vận hành & Cơ sở (W01 Dashboard, W02 Chi nhánh & Phòng ốc)    │
│ • Cụm 2: Khách hàng & Điều trị (W03 CRM, W04 Bệnh án & Nhật ký)        │
│ • Cụm 3: Dịch vụ & Nhân sự (W05 Lịch trực KTV, W06 Dịch vụ & Gói)      │
│ • Cụm 4: Quầy Thu ngân POS (W07 Check-in/Check-out, Tích điểm, QR)    │
│ • Cụm 5: Học viện Đào tạo & Báo cáo (W08 -> W11 LMS & W12 Báo cáo)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4: KIỂM THỬ, TỐI ƯU HÓA & ĐÓNG GÓI SẢN PHẨM                  │
│ • Kiểm tra TypeScript Strict (0 lỗi đỏ)                                │
│ • Kiểm tra chạy thử Build Production (npm run build)                   │
│ • Tạo Pull Request merge vào nhánh develop                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ CHI TIẾT CÁC BƯỚC BẠN CẦN LÀM

### BƯỚC 1: XÂY DỰNG KHUNG SƯỜN NỀN TẢNG (MASTER LAYOUT)

* [ ] **1.1. Tạo file khởi chạy chính:**
  * `src/main.tsx`: Gắn ứng dụng React vào DOM.
  * `src/App.tsx`: Cấu hình BrowserRouter và định tuyến (Routing).
* [ ] **1.2. Dựng component `Sidebar.tsx`:**
  * Logo MLD Healthcare & Spa Vietnam.
  * 12 mục menu điều hướng với Icon (sử dụng thư viện `lucide-react` đã cài sẵn):
    1. 📊 `W01_Dashboard` — Tổng quan
    2. 🏢 `W02_Branches` — Chi nhánh & Phòng
    3. 👥 `W03_Customers` — Khách hàng CRM
    4. 📋 `W04_CustomerDetail` — Hồ sơ bệnh án
    5. 📅 `W05_StaffSchedule` — Lịch trực KTV
    6. 💆 `W06_ServicesCatalog` — Dịch vụ & Gói
    7. 💳 `W07_CashierPOS` — Quầy Thu ngân & Check-in
    8. 🎓 `W08_Enrollment` — Tuyển sinh Học viện
    9. 👨‍🏫 `W09_Instructors` — Giảng viên
    10. 📝 `W10_Attendance` — Điểm danh
    11. 📚 `W11_Curriculum` — Khóa học LMS
    12. 📈 `W12_FinancialReports` — Báo cáo & Chứng chỉ
* [ ] **1.3. Dựng component `Header.tsx`:**
  * Dropdown chuyển đổi cơ sở phòng khám: *MLD Quận 1 (TP.HCM)*, *MLD Cầu Giấy (Hà Nội)*, *MLD Hải Châu (Đà Nẵng)*.
  * Ô tìm kiếm nhanh toàn hệ thống (mã khách, SĐT, mã đặt lịch).
  * Chuông thông báo & Hồ sơ Quản trị viên (Super Admin).
* [ ] **1.4. Kiểm tra trên trình duyệt:**
  * Chạy `npm run dev` tại thư mục `web-admin` và truy cập `http://localhost:5173`.

---

### BƯỚC 2: THIẾT LẬP TẦNG GIAO TIẾP DỮ LIỆU (DATA CONTRACT LAYER)

* [x] **2.1. Kiểm tra file Types chuẩn:**
  * Xác nhận đã có file `web-admin/src/types/shared_types.ts`.
  * Tuyệt đối không tự sửa hoặc gõ tay interface/enum mới nếu không có trong file này.
* [x] **2.2. Xây dựng `src/services/apiClient.ts`:**
  * Thiết lập cấu hình `fetch` hoặc `axios` chuẩn.
  * Tự động bọc dữ liệu trả về theo format `ApiResponse<T>`:
    ```typescript
    {
      success: boolean;
      statusCode: number;
      message: string;
      data: T;
      meta?: { page: number; limit: number; total: number; totalPages: number; };
    }
    ```
  * Có cơ chế fallback: Khi backend NestJS chưa bật, tự động lấy dữ liệu từ `mockData.ts` để bạn kiểm thử UI không bị gián đoạn.
* [x] **2.3. Tạo bộ Mock Data chuẩn xác (`src/services/mockData.ts`):**
  * Danh sách chi nhánh, phòng VIP, phòng gội đầu dưỡng sinh, phòng trị liệu.
  * Danh sách khách hàng với các hạng thẻ (`STANDARD`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND`).
  * Danh sách đặt lịch hôm nay với các trạng thái: `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`.
  * Danh sách khóa học nghề spa và chứng chỉ tốt nghiệp điện tử.

---

### BƯỚC 3: HIỆN THỰC HÓA 12 MÀN HÌNH QUẢN TRỊ (CHIA THEO 5 CỤM)

#### CỤM 1: TRUNG TÂM ĐIỀU HÀNH & CƠ SỞ VẬT CHẤT
* [x] **Màn hình W01 — Dashboard Tổng Quan:**
  * 4 thẻ thống kê nhanh: Doanh thu ngày, Lượt phục vụ, Tỷ lệ lấp đầy phòng (%), KTV đang làm việc.
  * Biểu đồ doanh thu theo giờ/ngày.
  * Bảng "Lịch hẹn hôm nay (Live Updates)" có nút thao tác nhanh (Check-in, Xem chi tiết).
* [x] **Màn hình W02 — Quản Lý Chi Nhánh & Phòng Ốc:**
  * Danh sách phòng: VIP, Gội dưỡng sinh, Chăm sóc da, Trị liệu cơ xương khớp.
  * Quản lý công suất giường, trạng thái giường (Đang có khách / Đang trống / Đang dọn dẹp).

#### CỤM 2: KHÁCH HÀNG CRM & HỒ SƠ ĐIỀU TRỊ CHUYÊN SÂU
* [x] **Màn hình W03 — Danh Bạ Khách Hàng CRM:**
  * Bảng dữ liệu tìm kiếm nhanh theo SĐT, Họ tên.
  * Bộ lọc phân hạng thành viên (Standard, Silver, Gold, Platinum, Diamond).
  * Xem điểm tích lũy, tổng chi tiêu tích lũy, nút Khóa/Mở tài khoản.
* [x] **Màn hình W04 — Chi Tiết Khách Hàng & Hồ Sơ Bệnh Án:**
  * Thẻ thành viên VIP ảo mạ vàng.
  * Tab 1: Các gói liệu trình đang sở hữu (số buổi còn lại, ngày hết hạn).
  * Tab 2: Nhật ký trị liệu (Timeline các buổi, ảnh trước/sau điều trị, lời dặn của chuyên gia, chữ ký khách hàng).

#### CỤM 3: ĐỘI NGŨ NHÂN SỰ & DANH MỤC DỊCH VỤ
* [x] **Màn hình W05 — Lịch Trực & Phân Công Kỹ Thuật Viên:**
  * Bảng xếp ca dạng Timeline / Lưới theo ngày và khung giờ.
  * Phân công KTV vào từng phòng dịch vụ.
  * Duyệt đơn xin nghỉ phép của nhân viên.
* [x] **Màn hình W06 — Danh Mục Dịch Vụ & Gói Liệu Trình:**
  * Quản lý giá gốc, giá ưu đãi, thời lượng phút của từng dịch vụ.
  * Danh sách các bước quy trình điều trị (Steps).
  * Cấu hình gói combo liệu trình nhiều buổi.

#### CỤM 4: QUẦY THU NGÂN POS & TIẾP ĐÓN (TRỌNG TÂM VẬN HÀNH)
* [x] **Màn hình W07 — Quầy Thu Ngân POS, Check-in & Check-out:**
  * **Chức năng Check-in:**
    * Tìm kiếm mã đặt lịch hoặc quét mã QR trên điện thoại khách.
    * Gán phòng dịch vụ (`assignedRoomId`), gán số giường (`assignedBedNumber`), chỉ định KTV, ghi chú bệnh lý.
  * **Chức năng Check-out:**
    * Nhập thời lượng thực tế, áp dụng điểm thưởng để giảm giá (`pointsUsed`), áp mã voucher.
    * Chọn phương thức thanh toán: Tiền mặt (`CASH_AT_SPA`), MoMo (`MOMO`), VNPay (`VNPAY`), Chuyển khoản (`BANK_TRANSFER`).
    * Xem trước và in hóa đơn thanh toán (Hỗ trợ in trực tiếp từ trình duyệt).

#### CỤM 5: HỌC VIỆN ĐÀO TẠO NGHỀ LMS & BÁO CÁO DOANH THU
* [x] **Màn hình W08 — Tuyển Sinh & Thu Học Phí:**
  * Phễu trạng thái học viên: Tư vấn -> Đặt cọc -> Nhập học -> Đang học -> Tốt nghiệp.
  * Theo dõi lịch sử đóng học phí trả góp theo từng đợt.
* [x] **Màn hình W09 — Quản Lý Giảng Viên:**
  * Hồ sơ giảng viên, lịch đứng lớp lý thuyết và phòng thực hành.
* [x] **Màn hình W10 — Điểm Danh Học Viên:**
  * Bảng điểm danh ngày: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`.
* [x] **Màn hình W11 — Khóa Học, Bài Học & Đề Thi LMS:**
  * Cấu trúc chương, bài học video, ngân hàng câu hỏi trắc nghiệm.
* [x] **Màn hình W12 — Báo Cáo Doanh Thu & Cấp Chứng Chỉ QR:**
  * Biểu đồ doanh thu theo chi nhánh, theo phương thức thanh toán.
  * **Cấp chứng chỉ điện tử:** Nhập điểm lý thuyết, thực hành, xếp loại -> Hệ thống tự sinh mã xác thực và mã QR tra cứu chống làm giả.

---

### BƯỚC 4: RÀ SOÁT, TỐI ƯU & HOÀN TẤT DỰ ÁN

* [x] **4.1. Kiểm tra tính toàn vẹn Type (TypeScript Validation):**
  * Chạy lệnh kiểm tra lỗi:
    ```bash
    npm run build
    ```
  * Đảm bảo không còn bất kỳ lỗi lệch kiểu dữ liệu nào so với `shared_types.ts`.
* [x] **4.2. Kiểm tra tính thẩm mỹ theo ảnh Figma:**
  * Tông màu nâu caramel, vàng cát, nền kem sữa đạt chuẩn dưỡng sinh y học.
  * Bố cục các nút bấm, icon, bảng biểu cân đối trên màn hình desktop (chuẩn 1440px - 1600px).
* [ ] **4.3. Đóng gói Git Commit & Tạo Pull Request:**
  * Commit các thay đổi với thông điệp rõ ràng:
    ```bash
    git add .
    git commit -m "feat(web-admin): complete 12 management screens according to figma spec"
    git push origin feature/admin-web
    ```

---

## ⚡ CÁC LỆNH TERMINAL BẠN THƯỜNG DÙNG

| Lệnh | Vị trí chạy | Mục đích |
| :--- | :--- | :--- |
| `cd web-admin` | Thư mục gốc dự án | Di chuyển vào thư mục Web Admin |
| `npm run dev` | Bên trong `web-admin` | Khởi chạy server giao diện xem trực tiếp tại `http://localhost:5173` |
| `npm run build` | Bên trong `web-admin` | Kiểm tra lỗi biên dịch TypeScript và đóng gói bản phát hành |
| `git status` | Thư mục bất kỳ | Kiểm tra nhánh hiện tại và các file đang chỉnh sửa |

---

*Tài liệu này được tạo ra để bạn luôn có một kim chỉ nam rõ ràng trong suốt quá trình xây dựng dự án. Chúc bạn hoàn thành xuất sắc cổng quản trị Web Admin!*
