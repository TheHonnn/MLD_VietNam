# KẾ HOẠCH KIỂM THỬ TOÀN DIỆN HỆ THỐNG MLD VIỆT NAM (NHÁNH DEVELOP)

> **Môi trường:** Nhánh `develop` | **Hệ quản trị:** Web Admin + NestJS Backend + Supabase PostgreSQL Live + Mobile Flutter  
> **Mục tiêu:** Kiểm thử thực địa từng phân hệ chức năng, nghiệm thu tính toàn vẹn dữ liệu, trải nghiệm người dùng y khoa và chuẩn bảo mật trước khi đóng gói Release sang `main`.

---

## 1. MA TRẬN PHÂN CHIA PHẠM VI KIỂM THỬ (TEST MATRIX)

Kế hoạch kiểm thử được chia thành **6 Giai đoạn (Phases)** tuần tự:

| Giai đoạn | Tên phân hệ / Chức năng | Phạm vi màn hình & API | Trọng số rủi ro |
| :---: | :--- | :--- | :---: |
| **Giai đoạn 1** | **Chuyên môn Y khoa & Cấp chứng nhận** | W16 (Chứng nhận), W17 (Khám phù CDT), W06 (Bệnh án MLD) | **CỰC CAO (P0)** |
| **Giai đoạn 2** | **Học viện Đào tạo & Khóa học** | W11 (Curriculum & Quiz & DRM), W08 (Tuyển sinh), W09 (Giảng viên), W10 (Điểm danh) | **CAO (P1)** |
| **Giai đoạn 3** | **Vận hành Thu ngân, POS & Khách hàng** | W07 (POS Hóa đơn), W03/W04 (Khách hàng CRM), W02 (Chi nhánh & Phòng) | **CAO (P1)** |
| **Giai đoạn 4** | **Kho vật tư BOM & Tài chính Hoa hồng** | W15 (Định mức vật tư BOM), W13 (Hoa hồng KTV), W12 (Báo cáo tài chính) | **TRUNG BÌNH (P2)** |
| **Giai đoạn 5** | **Truyền thông, Email & Portal CMS** | W18 (Portal Content), W14 (Zalo ZNS), Email Service & Supabase Logs | **TRUNG BÌNH (P2)** |
| **Giai đoạn 6** | **Tương thích Mobile & Tích hợp Dữ liệu Thật** | Mobile D09 (Tài liệu Y khoa), Profile học viên/khách hàng, API Gateway | **CAO (P1)** |

---

## 2. KỊCH BẢN KIỂM THỬ CHI TIẾT THEO TỪNG CHỨC NĂNG

### GIAI ĐOẠN 1: CHUYÊN MÔN Y KHOA & CẤP CHỨNG NHẬN (P0)

#### Test Case 1.1: Quy trình Cấp & Tra cứu Giấy chứng nhận Y khoa (W16)
- **Màn hình:** `/certificates` (`W16_Certificates.tsx`)
- **Dữ liệu kiểm thử:** Học viên từ danh sách Tuyển sinh (`academy_enrollments`), Điểm lý thuyết: `9.5`, Điểm thực hành: `9.0`.
- **Các bước thực hiện:**
  1. Bấm nút **"Cấp Giấy chứng nhận mới"**.
  2. Chọn học viên từ dropdown liên kết dữ liệu thực.
  3. Nhập ngày sinh, số hiệu chứng nhận (tự sinh mã `MLD-2026-XXXX`).
  4. Nhập điểm lý thuyết `9.5` và thực hành `9.0` -> Xác nhận hiển thị xếp loại tự động là **XUẤT SẮC**.
  5. Chọn người ký duyệt: BS. CKI Trần Hoàng Nam & Giám Đốc Đào Tạo.
  6. Bấm **"Tạo Giấy chứng nhận"** -> Kiểm tra dòng mới xuất hiện trong bảng.
  7. Bấm **"Xem & In phôi chứng nhận"**:
     - Kiểm tra mã QR động hiển thị sắc nét, dùng camera điện thoại quét thử xem trỏ đúng link tra cứu.
     - Kiểm tra viền họa tiết hoa văn Guilloche vàng kim, phôi song ngữ Việt - Anh, dấu đỏ SVG.
     - Bấm tổ hợp phím `Ctrl + P`: Kiểm tra chế độ in A4 ngang chuẩn, ẩn hoàn toàn Sidebar/Header.
  8. Thử nghiệm chức năng **"Thu hồi chứng chỉ"**: Nhập lý do vi phạm quy chế -> Trạng thái đổi thành `Đã thu hồi` (Badge đỏ) và không cho phép in phôi.
  9. Bấm nút **"Xuất báo cáo CSV"**: Kiểm tra file tải về hiển thị đúng tiếng Việt có dấu (UTF-8 BOM).

#### Test Case 1.2: Khám lâm sàng Phù mạch bạch huyết & Kê đơn CDT (W17)
- **Màn hình:** `/edema-assessments` (`W17_EdemaAssessments.tsx`)
- **Dữ liệu kiểm thử:** Bệnh nhân phù tay sau phẫu thuật ung thư vú, Tay phải (Bệnh): 24cm - 29cm - 34cm - 38cm; Tay trái (Lành): 18cm - 22cm - 26cm - 29cm.
- **Các bước thực hiện:**
  1. Bấm **"Tạo phiếu khám mới"**.
  2. Chọn bệnh nhân và chi nhánh thực hiện.
  3. Chọn phân loại: **Phù chi trên**.
  4. Nhập chu vi 4 điểm đối xứng (Cổ tay, Dưới khuỷu 10cm, Trên khuỷu 10cm, Nách):
     - Xác nhận hệ thống tự động tính độ chênh lệch $\Delta$ tại từng vị trí.
     - Xác nhận hệ thống tự động phát hiện $\Delta > 2\text{cm}$ và gắn cờ cảnh báo phù lâm sàng.
  5. Đánh giá dấu hiệu lâm sàng:
     - Dấu hiệu Stemmer: Tích chọn **Dương tính (+)**.
     - Độ lõm Pitting Test: Chọn **Độ 2+ (Lõm 4mm, hồi phục 15s)**.
     - Mức độ xơ hóa mô: Chọn **Xơ hóa trung bình**.
     - Giai đoạn ISL: Tự động/chọn **Giai đoạn II (Không tự giảm khi kê cao chi)**.
  6. Kê đơn phác đồ điều trị CDT (4 trụ cột):
     - Số buổi MLD Vodder: `10 buổi`.
     - Kỹ thuật băng ép ngắn (Short-stretch): Chọn **Có chỉ định**.
     - Áp lực vớ y khoa: Chọn **Class II (23 - 32 mmHg)**.
  7. Bấm **"Lưu hồ sơ khám bệnh"** -> Kiểm tra phiếu khám lưu thành công vào Supabase.
  8. Bấm **"In bệnh án lâm sàng A4"**: Kiểm tra mẫu in phiếu khám đầy đủ thông tin chuẩn Bộ Y Tế.
  9. Bấm **"Liên kết cấp chứng nhận"** đối với học viên hoàn thành ca lâm sàng.

#### Test Case 1.3: Quản lý Bệnh án & Nhật ký trị liệu (W06)
- **Màn hình:** `/treatment-management` (`W06_TreatmentManagement.tsx`)
- **Các bước thực hiện:**
  1. Lọc danh sách bệnh án theo trạng thái: Đang trị liệu, Tạm hoãn, Đã hoàn thành.
  2. Mở chi tiết 1 hồ sơ điều trị -> Thêm ghi chú nhật ký buổi thứ $N$.
  3. Đính kèm ảnh theo dõi trước/sau (Before / After).
  4. Kiểm tra cảnh báo chống chỉ định tuyệt đối (Nhiễm trùng cấp, Huyết khối tĩnh mạch sâu DVT, Suy tim mất bù).

---

### GIAI ĐOẠN 2: HỌC VIỆN ĐÀO TẠO & KHÓA HỌC (P1)

#### Test Case 2.1: Phân nhóm 2 Khóa học & Thi Quiz & Trình phát Video DRM (W11)
- **Màn hình:** `/curriculum` (`W11_Curriculum.tsx`)
- **Các bước thực hiện:**
  1. Kiểm tra 2 tab danh mục khóa học:
     - Tab 1: **"Khóa học cho người mới bắt đầu"** (Chỉ hiển thị các khóa nền tảng MLD cơ bản).
     - Tab 2: **"Khóa học chuyên sâu cho KTV"** (Chỉ hiển thị các khóa chuyên đề phù bạch huyết, sau phẫu thuật).
  2. Kiểm tra bộ **Bài thi trắc nghiệm lý thuyết (Quiz Modal)**:
     - Bấm nút **"Bài thi trắc nghiệm lý thuyết"** trên khóa học.
     - Làm thử 10 câu hỏi trắc nghiệm y khoa.
     - Bấm **"Nộp bài & Chấm điểm"**:
       - Xác nhận hệ thống tự động tính điểm số và tỷ lệ phần trăm.
       - Nếu điểm $\ge 80\%$ -> Hiển thị thông báo **"ĐẠT CHUẨN LÝ THUYẾT"** (Màu xanh).
       - Nếu điểm $< 80\%$ -> Báo yêu cầu ôn tập và thi lại.
     - Xem bảng thống kê điểm thi của các học viên trong khóa.
  3. Kiểm tra tính năng **Bảo mật Video Bài giảng (DRM Watermark Simulator)**:
     - Bấm nút **"Bảo mật DRM Video"** tại một bài giảng.
     - Kiểm tra khung phát video có watermark động nhảy vị trí liên tục trên khung hình: `[Họ tên học viên] · [SĐT] · [Mã học viên]`.
     - Kiểm tra cơ chế chống tải xuống (Vô hiệu hóa menu chuột phải, không lộ direct mp4 url).

#### Test Case 2.2: Đăng ký tuyển sinh & Quản lý Học viên (W08, W09, W10)
- **Màn hình:** `/academy-enrollment`, `/instructors`, `/attendance`
- **Các bước thực hiện:**
  1. Tạo đơn ghi danh học viên mới: Nhập thông tin, chọn khóa học, ghi nhận cọc.
  2. Phân bổ giảng viên đứng lớp tại `/instructors`.
  3. Mở màn hình `/attendance`: Điểm danh từng học viên theo ngày học thực tế.

---

### GIAI ĐOẠN 3: VẬN HÀNH THU NGÂN, POS & KHÁCH HÀNG (P1)

#### Test Case 3.1: Thu ngân POS & In hóa đơn (W07)
- **Màn hình:** `/cashier-pos` (`W07_CashierPOS.tsx`)
- **Các bước thực hiện:**
  1. Thêm dịch vụ MLD lẻ, gói trị liệu 10 buổi hoặc khóa học vào giỏ hàng.
  2. Chọn khách hàng đã có hoặc tạo nhanh khách hàng mới.
  3. Áp dụng mã giảm giá voucher (nếu có) -> Kiểm tra tính toán giảm trừ chính xác.
  4. Chọn hình thức thanh toán:
     - Tiền mặt: Nhập tiền khách đưa -> Kiểm tra tiền thối lại.
     - Chuyển khoản QR: Kiểm tra mã VietQR sinh ra đúng số tiền và nội dung chuyển khoản.
  5. Bấm **"Hoàn tất thanh toán"** -> Bật hộp thoại in biên lai hóa đơn bán lẻ chuẩn nhiệt 80mm/K80.
  6. Kiểm tra dữ liệu đơn hàng được cập nhật tức thời vào doanh thu.

#### Test Case 3.2: Khách hàng CRM & Hồ sơ cá nhân (W03, W04)
- **Màn hình:** `/customers`, `/customer-detail`
- **Các bước thực hiện:**
  1. Tìm kiếm khách hàng theo Tên, Số điện thoại hoặc Mã KH.
  2. Mở trang chi tiết khách hàng `/customer-detail`:
     - Kiểm tra tab thông tin bệnh án, lịch sử mua hàng, công nợ và số buổi trị liệu còn lại.
     - Thử tạo lịch hẹn mới cho khách hàng.

---

### GIAI ĐOẠN 4: KHO VẬT TƯ BOM & TÀI CHÍNH HOA HỒNG (P2)

#### Test Case 4.1: Định mức Vật tư tiêu hao BOM (W15)
- **Màn hình:** `/inventory-bom` (`W15_InventoryBOM.tsx`)
- **Các bước thực hiện:**
  1. Cấu hình định mức vật tư cho gói trị liệu MLD:
     - Tinh dầu bạch huyết: 10ml/buổi.
     - Băng cuộn ngắn Short-stretch: 2 cuộn/buổi.
     - Găng tay y tế: 2 đôi/buổi.
  2. Thực hiện hoàn thành 1 buổi trị liệu -> Kiểm tra tồn kho tự động trừ đúng định mức.
  3. Kiểm tra cảnh báo ngưỡng tồn kho an toàn (Low stock alert).

#### Test Case 4.2: Tính hoa hồng KTV & Báo cáo Doanh thu (W13, W12)
- **Màn hình:** `/staff-commissions`, `/reports`
- **Các bước thực hiện:**
  1. Kiểm tra bảng tính hoa hồng của KTV theo số buổi thực hiện và doanh số bán gói.
  2. Xuất bảng lương hoa hồng KTV ra file Excel.
  3. Mở Báo cáo tài chính `/reports`: Lọc doanh thu theo từng chi nhánh, phân loại doanh thu Dịch vụ vs Đào tạo.

---

### GIAI ĐOẠN 5: TRUYỀN THÔNG, EMAIL & PORTAL CMS (P2)

#### Test Case 5.1: Quản trị Banner, Tài liệu & Cộng đồng (W18)
- **Màn hình:** `/portal-content` (`W18_PortalContent.tsx`)
- **Các bước thực hiện:**
  1. Tab Banner 16:9: Thêm mới banner truyền thông, đổi thứ tự hiển thị, bật/tắt trạng thái hiển thị.
  2. Tab Giáo trình PDF: Thêm tài liệu hướng dẫn chăm sóc tại nhà, gán liên kết PDF.
  3. Tab Kiểm duyệt Cộng đồng: Duyệt bài viết mới của học viên/khách hàng, thử thao tác "Duyệt hiển thị" hoặc "Ẩn bài vi phạm".

#### Test Case 5.2: Tự động hóa Kênh Email Thông báo & Supabase Logs
- **Dịch vụ:** [`email.service.ts`](file:///d:/MyProjects/vietnamchampion/projectapp/MLD_VietNam/web-admin/src/services/email.service.ts)
- **Các bước thực hiện:**
  1. Mở tab Email Templates trong `/portal-content`.
  2. Chọn 1 trong 4 mẫu email chuẩn y khoa:
     - `COURSE_EXPIRY_WARNING` (Cảnh báo thời hạn xem video bài giảng).
     - `CONFIRMATION_ENROLLMENT` (Xác nhận cọc & đăng ký khóa học).
     - `CLASS_SCHEDULE_REMINDER` (Nhắc lịch học thực hành lâm sàng).
     - `EXAM_RESULT_AND_CERTIFICATE` (Thông báo kết quả thi & Giấy chứng nhận).
  3. Bấm nút **"Gửi thử nghiệm"** đến một email test.
  4. Kiểm tra email đến có render đúng giao diện HTML responsive, logo MLD và các biến `{{student_name}}`, `{{course_name}}`.
  5. Kiểm tra bảng `email_logs` trong Supabase đã ghi nhận log gửi thành công với trạng thái `SENT`.

---

### GIAI ĐOẠN 6: TƯƠNG THÍCH MOBILE FLUTTER & DỮ LIỆU THẬT (P1)

#### Test Case 6.1: Màn hình Cẩm nang Tài liệu Y khoa D09 (Mobile)
- **Màn hình:** [`d09_documents_screen.dart`](file:///d:/MyProjects/vietnamchampion/projectapp/MLD_VietNam/mobile/lib/features/treatment/presentation/screens/d09_documents_screen.dart)
- **Các bước thực hiện:**
  1. Kiểm tra màn hình nạp dữ liệu động 100% từ bảng `home_care_guidelines` qua Supabase.
  2. Xác nhận không còn bất kỳ dữ liệu mẫu tĩnh (hardcoded mock data) nào.
  3. Kiểm tra bố cục thẻ: Hiển thị hình ảnh bìa và tiêu đề tài liệu, sạch sẽ, không có dòng mô tả thừa thãi.
  4. Bấm vào một tài liệu: Mở trang đọc cẩm nang chi tiết.

---

## 3. LỘ TRÌNH THỰC THI KIỂM THỬ (TEST EXECUTION ROADMAP)

```
[BƯỚC 1: P0] Kiểm thử Khám phù CDT & Giấy chứng nhận (W16, W17, W06)
      │
      ▼
[BƯỚC 2: P1] Kiểm thử Học viện Đào tạo, Quiz & DRM Video (W11, W08, W09)
      │
      ▼
[BƯỚC 3: P1] Kiểm thử Thu ngân POS, Doanh thu & Hồ sơ Khách hàng (W07, W03, W04)
      │
      ▼
[BƯỚC 4: P2] Kiểm thử Vật tư BOM & Báo cáo Hoa hồng KTV (W15, W13, W12)
      │
      ▼
[BƯỚC 5: P2] Kiểm thử Portal CMS, Email Service & ZNS (W18, W14, Email)
      │
      ▼
[BƯỚC 6: P1] Nghiệm thu Đồng bộ Dữ liệu Thật Mobile App & Tổng kết
```

---

## 4. TIÊU CHÍ ĐẠT CHUẨN ĐỂ RELEASE SANG MAIN (EXIT CRITERIA)

1. **Chức năng:** Toàn bộ các Test Cases trên đều đạt kết quả **PASS**.
2. **Không có lỗi chặn (Blocker / Critical bugs):** Không có lỗi crash ứng dụng, lỗi gián đoạn thanh toán hoặc lỗi sai sót thông tin y khoa.
3. **Build & Lint:** Lệnh `npm run build` trên `web-admin` và `nest build` trên `backend` đạt **0 errors**.
4. **Bảo mật:** Toàn bộ bảng dữ liệu mới có thiết lập Row Level Security (RLS) và phân quyền chặt chẽ theo vai trò (Role-based access control).
5. **Dữ liệu:** Không còn dữ liệu mock tĩnh tạm bợ; toàn bộ các luồng đều gắn kết với Supabase PostgreSQL Live.
