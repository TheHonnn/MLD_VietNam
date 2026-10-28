# 🚀 HƯỚNG DẪN TRIỂN KHAI PRODUCTION (RENDER & VERCEL)
## Hệ Thống Y Tế & Quản Trị Viện Trị Liệu MLD Việt Nam

Tài liệu này hướng dẫn chi tiết từng bước đưa hệ thống **Backend (NestJS)** lên **Render** và **Web Admin (React + Vite)** lên **Vercel** từ nhánh **`develop`**.

---

## 📌 THÔNG TIN QUAN TRỌNG TRƯỚC KHI DEPLOY
- **Kho lưu trữ GitHub:** `https://github.com/TheHonnn/MLD_VietNam.git` (hoặc `XuanTruong205/mld-vietnam.git`)
- **Nhánh triển khai chính thức (Production Branch):** `develop` *(Chứa toàn bộ 12 giai đoạn tính năng thực tế, RLS bảo mật và Zalo OAuth v4)*
- **Cơ sở dữ liệu Live Supabase:** `https://wstvwushpwcdsmhpunvh.supabase.co`

---

## PHẦN 1: TRIỂN KHAI BACKEND LÊN RENDER CLOUD (NESTJS)

### Cách 1: Sử dụng tính năng Blueprint (render.yaml - Khuyến nghị)
Hệ thống đã có sẵn cấu hình tự động tại file [`render.yaml`](file:///d:/MyProjects/vietnamchampion/projectapp/MLD_VietNam/render.yaml).

1. Truy cập [dashboard.render.com](https://dashboard.render.com) và đăng nhập (bằng tài khoản GitHub chứa repo `MLD_VietNam`).
2. Bấm nút **New +** ở góc trên cùng bên phải -> Chọn **Blueprint**.
3. Chọn Repository: `TheHonnn/MLD_VietNam` (hoặc `XuanTruong205/mld-vietnam`).
4. Tại mục **Branch**, chọn nhánh: **`develop`**.
5. Render sẽ tự động quét file `render.yaml` và nhận diện service `mld-vietnam-backend`.
6. Điền các biến môi trường nhạy cảm (Secret Values) khi được nhắc (xem danh sách ở Cách 2).
7. Bấm **Apply** để khởi tạo quá trình Build & Deploy tự động.

---

### Cách 2: Tạo thủ công Web Service trên Render
1. Truy cập [dashboard.render.com](https://dashboard.render.com) -> Bấm **New +** -> Chọn **Web Service**.
2. Chọn Repository `MLD_VietNam` -> Chọn Branch: **`develop`**.
3. Điền các trường cấu hình:
   - **Name:** `mld-vietnam-backend`
   - **Region:** `Singapore (Southeast Asia)`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Instance Type:** `Free` (hoặc `Starter` để hệ thống không bị sleep)
   - **Health Check Path:** `/api/v1/health`

4. Thêm các **Environment Variables (Biến môi trường)**:

| Key (Khóa) | Value (Giá trị mẫu) | Ghi chú |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Bắt buộc |
| `PORT` | `3000` | Render tự cấp PORT hoặc nhận 3000 |
| `CORS_ORIGIN` | `*` (hoặc domain web-admin Vercel) | Cho phép Web Admin gọi API |
| `SUPABASE_URL` | `https://wstvwushpwcdsmhpunvh.supabase.co` | Supabase Cloud Live |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Key công khai |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Key đặc quyền server |
| `JWT_SECRET` | `super-secret-jwt-key-medical-healthcare-2026` | Ký JWT Token |
| `JWT_EXPIRES_IN` | `30m` | Thời gian sống access token |
| `JWT_REFRESH_SECRET` | `super-secret-refresh-token-key-mld-vietnam-2026` | Ký Refresh Token |
| `JWT_REFRESH_EXPIRES_IN`| `30d` | Thời hạn refresh token |
| `PAYOS_CLIENT_ID` | `bc4b5481-da88-4f8f-bacd-4226e4ce959a` | VietQR Gateway |
| `PAYOS_API_KEY` | `3fc4338f-0940-40df-bd37-30cf6e8ad734` | VietQR Gateway |
| `PAYOS_CHECKSUM_KEY` | `46edada6e9e516bfca357fc1db04bddb529ce2f...` | Ký webhook đối soát |
| `PAYOS_BANK_BIN` | `970422` | Mã BIN MBBank |
| `PAYOS_BANK_ACCOUNT_NO` | `0394316963` | Số tài khoản nhận tiền |
| `PAYOS_BANK_ACCOUNT_NAME`| `BUI THE HOANG` | Tên chủ tài khoản |

5. Bấm **Create Web Service**. Chờ từ 2 - 3 phút để Render build xong.
6. Khi thấy dòng log `Nest application successfully started`, copy URL Backend của bạn:
   *(Ví dụ: `https://mld-vietnam-backend.onrender.com`)*.
7. Thử truy cập trình duyệt: `https://mld-vietnam-backend.onrender.com/api/v1/health`
   -> Kết quả trả về `{ "status": "ok", "service": "MLD Vietnam Healthcare API" }` là thành công 100%!

---

## PHẦN 2: TRIỂN KHAI WEB ADMIN LÊN VERCEL (REACT + VITE)

1. Truy cập [vercel.com](https://vercel.com) và đăng nhập tài khoản.
2. Tại trang **Dashboard**, bấm **Add New...** -> Chọn **Project**.
3. Tìm và chọn kho lưu trữ: `TheHonnn/MLD_VietNam` (hoặc `XuanTruong205/mld-vietnam`).
4. Thiết lập thông số dự án:
   - **Project Name:** `mld-web-admin` (hoặc tùy chọn)
   - **Framework Preset:** `Vite`
   - **Root Directory:** Bấm **Edit** -> Chọn thư mục **`web-admin`** (hoặc để trống `./` nếu dùng root vercel.json). Khuyến nghị: Chọn **`web-admin`**.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Thêm các **Environment Variables** cho Web Admin:

| Variable Name | Value (Giá trị) |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://mld-vietnam-backend.onrender.com/api/v1` *(Điền link Render ở Phần 1)* |
| `VITE_SUPABASE_URL` | `https://wstvwushpwcdsmhpunvh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58` |

6. Bấm **Deploy**. Vercel sẽ biên dịch mã nguồn trong khoảng 30 - 45 giây.
7. Khi hoàn tất, Vercel cung cấp URL chính thức: *(Ví dụ: `https://mld-web-admin.vercel.app`)*.

---

## PHẦN 3: KẾT NỐI & KIỂM THỬ ĐẦU CUỐI SAU KHI DEPLOY

### 1. Cấu hình Webhook Ngân Hàng tự động (SePay / Casso / PayOS)
Truy cập trang quản trị của SePay / Casso hoặc PayOS:
- Đặt **Webhook URL** trỏ về:
  `https://mld-vietnam-backend.onrender.com/api/v1/payments/bank-transfer-webhook`
  *(Hoặc `.../payments/sepay-webhook` nếu dùng SePay, `.../payments/casso-webhook` nếu dùng Casso)*.
- Khi có bất kỳ ai chuyển khoản học phí (`UAT-EDU-...`) hoặc hóa đơn Spa (`HD-SPA-...`), Render backend sẽ nhận webhook, gạch nợ tự động và trích hoa hồng ngay lập tức.

### 2. Kiểm tra Đăng nhập & Đếm ngược Zalo Token
1. Truy cập Web Admin trên Vercel: `https://mld-web-admin.vercel.app`.
2. Đăng nhập bằng tài khoản Quản trị viên MLD.
3. Vào trang **Cấu hình Zalo ZNS (`W14_ZaloZNS`)**:
   - Xác nhận huy hiệu đếm ngược Token thời gian thực hiển thị bình thường.
   - Bấm nút **"Tự động làm mới Token (OAuth v4)"** để kiểm tra kết nối thông suốt giữa Vercel Admin -> Render Backend -> Zalo OAuth API.

---

## 🎯 GHI CHÚ BẢO TRÌ & CICD TỰ ĐỘNG
- Mỗi khi lập trình viên `git push` code mới lên nhánh **`develop`**:
  - Render sẽ tự động build lại Backend.
  - Vercel sẽ tự động build và cập nhật Web Admin trong vòng 1 phút mà không gây gián đoạn hệ thống.
