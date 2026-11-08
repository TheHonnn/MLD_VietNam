# HỆ THỐNG QUY CHUẨN CHUYỂN ĐỘNG & ĐIỀU HƯỚNG MLD VIỆT NAM (MLD MOTION & NAVIGATION SYSTEM)

> **Mục tiêu cốt lõi:** Xây dựng hệ thống chuyển động thực chiến theo hành vi người dùng: *Nhanh – Dứt khoát – Không giữ chân vô ích – Độc lập với dữ liệu mạng – Chuẩn y khoa tinh tế*.

---

## I. NGUYÊN TẮC THỰC CHIẾN CỐT LÕI (CORE PRINCIPLES)

### 1. Tách biệt Hoạt cảnh và Quá trình Nạp Dữ liệu (Decoupled Pipeline)
Hai tiến trình này vận hành trên hai trục độc lập hoàn toàn, không bắt nhau phải chờ đợi:
* **Trục Hoạt cảnh Logo (Visual Brand Animation):**
  - **Cold Start (Khởi động nguội từ số 0):** Logo MLD Fade In nhẹ nhàng trong lúc chờ dữ liệu, chạy **tối đa** trong khoảng **$800\text{ ms} - 1.000\text{ ms}$** (đây là mốc thời lượng tối đa, tuyệt đối không phải thời gian bắt buộc người dùng phải xem). 
  - **Quy chuẩn Tap to skip:** Người dùng chạm vào màn hình Splash được phép bỏ qua ngay hoạt cảnh nhận diện thương hiệu. **Lưu ý đặc biệt:** Tap to skip CHỈ bỏ qua hoạt cảnh hình ảnh Logo, TUYỆT ĐỐI KHÔNG bỏ qua hoặc ngắt quãng quá trình xác thực phiên làm việc (Auth Session) hay nạp dữ liệu.
    + Nếu session/dữ liệu đã sẵn sàng: Lập tức kích hoạt Pure Cross-fade $300\text{ ms}$ vào thẳng Trang chủ.
    + Nếu session/dữ liệu chưa sẵn sàng: Ứng dụng tiếp tục giữ giao diện tĩnh nhẹ nhàng chờ kết nối cho đến Hard Timeout $1.5\text{s}$ rồi mới chuyển sang Guest Mode (kèm cache cục bộ). Không được bỏ qua xác thực làm mất token, mất tài khoản hay tạo route thừa.
  - **Warm Start (Quay lại app từ đa nhiệm / chạy ngầm):** **$0\text{ ms}$ Splash**, vào thẳng màn hình và vị trí cuộn đang thao tác dở.
* **Trục Dữ liệu & Phiên làm việc (Data Pipeline & Session Checking):**
  - Quá trình kiểm tra token / nạp session chạy ngầm song song và hoàn toàn độc lập với animation.
  - **Chuyển Home ngay khi session sẵn sàng:** Ngay khi session/token được xác thực thành công (kể cả sau $200\text{ ms}$ hay $300\text{ ms}$), ứng dụng lập tức kích hoạt chuyển sang Trang chủ bằng Pure Cross-fade $300\text{ ms}$ (Scale cố định 1.0). **Tuyệt đối không đặt thời lượng tối thiểu và không bắt buộc chờ đủ $800\text{ ms}$.**
  - **Hard Timeout an toàn kỹ thuật ($1.5\text{ giây}$):** Đây là **giới hạn tối đa chờ phản hồi session từ mạng khi kết nối bị lag/lỗi**, KHÔNG PHẢI thời lượng animation. Nếu session chưa hoàn tất sau $1.5\text{s}$ $\rightarrow$ Cưỡng chế đóng Splash, đưa thẳng người dùng vào Trang chủ ở **Chế độ Khách (Guest Mode)** cùng cache cục bộ và thanh thông báo ngoại tuyến nhẹ nhàng. **Tuyệt đối không treo màn hình Splash quá 1.5s.**
  - **Cơ chế phản hồi Session đến muộn (Late-arriving Session Response):** Khi ứng dụng đã vào Trang chủ ở Chế độ Khách do chạm Hard Timeout $1.5\text{s}$, nếu sau đó API xác thực session mới phản hồi thành công:
    + Tuyệt đối **KHÔNG** tự động điều hướng (No auto re-routing), **KHÔNG** reload lại Splash, **KHÔNG** đẩy route mới, và **KHÔNG** văng người dùng khỏi màn hình hiện tại.
    + Hệ thống âm thầm cập nhật `AuthState` / User Profile trong nền (Silent Background Update).
    + Giao diện chỉ cập nhật trạng thái người dùng (như avatar, huy hiệu) mà không load lại trang, hoặc cập nhật toàn diện khi người dùng chủ động thao tác / chạm vào tính năng yêu cầu tài khoản.

---

### 2. Splash Screen Tối Giản – Đúng 3 Thành Phần (Scale = 1.0 Cố Định)
Loại bỏ hoàn toàn khỏi Splash: Flow Shimmer, thanh Pulse Line, Text Stagger nhiều lớp, Glow nở liên tục, Logo phóng lớn thu nhỏ, và các hiệu ứng loading xoay tròn chờ API.
**Chỉ giữ đúng 3 thành phần tinh khiết:**
1. Nền sáng tinh khiết (`#F8FAFC`).
2. Logo MLD Fade In nhẹ nhàng ($0.0 \rightarrow 1.0$, tối đa $800 - 1.000\text{ ms}$).
3. Pure Cross-fade hòa tan êm ái sang Trang chủ ($300\text{ ms}$), **hoàn toàn không có hiệu ứng Scale (Scale = 1.0 cố định, không phóng to hay thu nhỏ)**.

---

### 3. Phân cấp Điều hướng Màn hình (Navigation Hierarchy)
* **5 Tab chính (Trang chủ, Dịch vụ, Đào tạo, Kiến thức, Cá nhân):** Phân định rõ 2 phương thức:
  - **Instant ($0\text{ ms}$):** Chuyển tức thì, không độ trễ, dùng `IndexedStack` bảo lưu trạng thái và vị trí cuộn.
  - **Micro-fade ($\le 80\text{ ms}$):** Hòa tan vi mô êm dịu giữa các tab, không trượt ngang, không fadeScale toàn màn hình.
* **Đào sâu (Drill-down: Chi tiết DV, Khóa học, Cơ sở):** Trượt ngang $12\%$ dứt khoát từ phải sang trái ($240\text{ ms}$), chiều Back từ trái sang phải ($190\text{ ms}$, nhanh hơn khoảng 21%). Parallax tắt mặc định.
* **Thao tác phụ (Modal, BottomSheet: Đặt lịch, Lọc, Form tư vấn, Xác nhận):** Trượt đáy $18\%$ ($260\text{ ms}$), chiều đóng ($200\text{ ms}$, nhanh hơn khoảng 23%).

---

### 4. Quy tắc Điều hướng Back & Xử lý Khi Push/Pop Đang Chạy
Quy định rõ ràng hành vi tương tác dứt khoát, an toàn tuyệt đối cho Route Stack:
1. **Khi thao tác Push đang chạy (màn hình mới đang trượt vào chưa tới đích):** Người dùng bấm Back $\rightarrow$ Route đang mở lập tức **đảo chiều animation hiện tại (cancel & reverse)**. Ngay sau khi hoạt cảnh đảo chiều hoàn tất:
   - Route đang mở phải được **thu dọn sạch sẽ khỏi navigation stack** (`Navigator.pop` / remove route khỏi stack).
   - Màn hình trước đó giữ nguyên vẹn $100\%$ toàn bộ trạng thái (dữ liệu đã nạp, vị trí cuộn, input form).
   - Tuyệt đối không tạo thêm route Pop mới đè lên, không để lại route rác trong stack, và không dispose nhầm màn hình gốc bên dưới.
2. **Khi thao tác Pop đang chạy (màn hình đang rút lui):** Người dùng bấm Back tiếp $\rightarrow$ Bỏ qua (ignore), ngăn chặn việc pop kép (double-pop) làm mất màn hình gốc.
3. **Khi màn hình đã mở hoàn tất:** Bấm Back thực hiện Pop bình thường theo thông số Token quy chuẩn.
4. **Quy tắc khóa 150ms chống double-tap:** Khóa vi mô $150\text{ ms}$ **chỉ ngăn thao tác Push mới trùng lặp, TUYỆT ĐỐI KHÔNG ĐƯỢC CHẶN BACK**. Nếu thao tác Back xảy ra trong thời gian khóa Push, hệ thống vẫn phải lập tức đảo chiều animation hiện tại và đóng dọn route đang mở.

---

### 5. Reduce Motion Ghi Đè Toàn Bộ (Global Override)
Khi hệ điều hành kích hoạt cài đặt *Giảm chuyển động (Reduce Motion)* (`MediaQuery.maybeOf(context)?.disableAnimations == true`), cơ chế này **GHI ĐÈ TOÀN BỘ (GLOBAL OVERRIDE)** bảng Motion Tokens:
* Mọi thời lượng chuyển động (Duration) chuyển sang **Tức thì ($0\text{ ms}$)** hoặc Fade siêu nhẹ ($\le 50\text{ ms}$).
* Mọi thông số trượt (Offset) chuyển về `Offset.zero` (không có chuyển động trượt).
* Mọi thông số Scale cố định ở `1.0` (không phóng to hay thu nhỏ).
* Toàn bộ Parallax, Glow chuyển động: Tắt $100\%$.
* **Đảm bảo dữ liệu và trải nghiệm:** Toàn bộ nội dung, trạng thái, logic nghiệp vụ vẫn cập nhật và hiển thị đầy đủ $100\%$, không bị mất thông tin hay bỏ qua thao tác của người dùng.
* Xử lý tập trung ở `AppPageTransitions`, không xử lý riêng lẻ rải rác từng màn hình.

---

## II. BẢNG THÔNG SỐ MOTION TOKENS (DUY NHẤT & ĐỒNG BỘ TOÀN DỰ ÁN)

> **Lưu ý:** Đây là bảng thông số duy nhất có giá trị thi hành cho toàn bộ dự án. Đã tách biệt rõ ràng từng token cụ thể. Mọi màn hình và bộ chuyển cảnh phải áp dụng chính xác các giá trị dưới đây.

| Nhóm chuyển động (Motion Token) | Thời lượng đi (Push) | Thời lượng về (Pop / Back) | Khoảng trượt (Offset) | Tỷ lệ phóng (Scale) | Hiệu ứng Parallax | Đường cong chuyển động (Curve) | Phạm vi áp dụng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Instant** | $0\text{ ms}$ | $0\text{ ms}$ | Không trượt (`Offset.zero`) | $1.0$ (Cố định) | Tắt | `Curves.linear` | 5 Tab chính khi tắt hiệu ứng chuyển tab, chuyển tức thời |
| **Micro-fade** | $\le 80\text{ ms}$ | $\le 80\text{ ms}$ | Không trượt (`Offset.zero`) | $1.0$ (Cố định) | Tắt | `Curves.linear` | 5 Tab chính hòa tan nhẹ, chuyển đổi trạng thái giao diện nhỏ |
| **Micro-interaction** | $140\text{ ms}$ | **$100\text{ ms}$** *(Nhanh hơn khoảng 28%)* | Không trượt (`Offset.zero`) | $0.98 \rightarrow 1.0$ | Tắt | `Curves.easeOutCubic` | Nút bấm, Toggle, Icon phản hồi xúc giác |
| **Drill-down** | $240\text{ ms}$ | **$190\text{ ms}$** *(Nhanh hơn khoảng 21%)* | Trượt ngang $12\%$ (`0.12, 0.0`) | **$1.0$ (Không scale)** | **Tắt mặc định** | Đi: `Curves.easeOutCubic`<br>Về: `Curves.easeInCubic` | Chi tiết Dịch vụ, Khóa học, Cơ sở chi nhánh |
| **Modal / Bottom Sheet** | $260\text{ ms}$ | **$200\text{ ms}$** *(Nhanh hơn khoảng 23%)* | Trượt đáy $18\%$ (`0.0, 0.18`) | **$1.0$ (Không scale)** | Tắt | Đi: `Curves.easeOutCubic`<br>Về: `Curves.easeInCubic` | Đặt lịch nhanh, Bộ lọc, Form tư vấn, Đăng nhập |
| **Splash Ingress $\rightarrow$ Home** | $300\text{ ms}$ | N/A | Không trượt (`Offset.zero`) | **$1.0$ (Không scale)** | Tắt | `Curves.linear` | Chuyển tiếp hòa tan Pure Cross-fade từ Splash sang Home |

---

## III. QUY TẮC ĐIỀU HƯỚNG CHI TIẾT THEO TỪNG MÀN HÌNH

| Màn hình / Thành phần | Kiểu chuyển cảnh | Thời lượng Transition | Cơ chế Back | Ghi chú vận hành & Phân biệt Session |
| :--- | :--- | :--- | :--- | :--- |
| **Khởi động $\rightarrow$ Trang chủ (Cold Start)** | Pure Cross-fade (Không scale) | **$300\text{ ms}$** (Scale 1.0 cố định) | Không áp dụng | **Tách biệt rõ thời gian:**<br>- Logo Fade In: chạy **tối đa** $\le 800 - 1.000\text{ ms}$ (không bắt buộc chờ).<br>- Splash $\rightarrow$ Home: đúng **$300\text{ ms}$** Pure Cross-fade.<br>- Session: chạy ngầm độc lập, sẵn sàng là vào Home ngay.<br>- Hard Timeout session: tối đa **$1.5\text{s}$**, quá hạn tự vào Guest Mode. Tap to skip chỉ bỏ qua logo, không bỏ qua auth. |
| **Khởi động lại (Warm Start)** | Instant | $0\text{ ms}$ | Giữ nguyên lịch sử | Khôi phục nguyên vẹn màn hình và vị trí cuộn đang thao tác dở. |
| **5 Tab chính (BottomBar)** | Instant hoặc Micro-fade | $0\text{ ms}$ hoặc $\le 80\text{ ms}$ | Nhấn Back về Home | Dùng `IndexedStack`, không chạy slide ngang, không fadeScale toàn màn hình. |
| **Chi tiết Dịch vụ ([B03](file:///d:/VN_Champion/MLD_VietNam/mobile/lib/features/services/presentation/screens/b03_service_detail_screen.dart))** | Drill-down Slide | Đi $240\text{ ms}$ / Về $190\text{ ms}$ *(nhanh hơn 21%)* | Trượt ngược $12\%$ Trái $\rightarrow$ Phải | Parallax tắt mặc định để tối ưu máy yếu. |
| **Chi tiết Khóa học ([E03](file:///d:/VN_Champion/MLD_VietNam/mobile/lib/features/academy/presentation/screens/e03_course_detail_screen.dart))** | Drill-down Slide | Đi $240\text{ ms}$ / Về $190\text{ ms}$ *(nhanh hơn 21%)* | Trượt ngược $12\%$ Trái $\rightarrow$ Phải | Chuyển êm ái, giữ nguyên dữ liệu đã nạp. |
| **Danh sách Chi nhánh ([B05](file:///d:/VN_Champion/MLD_VietNam/mobile/lib/features/directory/presentation/screens/b05_branch_listing_screen.dart))** | Drill-down Slide | Đi $240\text{ ms}$ / Về $190\text{ ms}$ *(nhanh hơn 21%)* | Trượt ngược $12\%$ Trái $\rightarrow$ Phải | Nạp bản đồ nhẹ nhàng sau khi mở màn hình. |
| **Đặt lịch nhanh ([AllInOne](file:///d:/VN_Champion/MLD_VietNam/mobile/lib/features/booking/presentation/screens/all_in_one_booking_screen.dart))** | Modal Slide Up | Đi $260\text{ ms}$ / Về $200\text{ ms}$ *(nhanh hơn 23%)* | Trượt xuống đáy | Đóng ngay khi bấm nút Hủy hoặc vuốt xuống. |
| **Bộ lọc Dịch vụ / Cơ sở** | BottomSheet Slide Up | Đi $260\text{ ms}$ / Về $200\text{ ms}$ *(nhanh hơn 23%)* | Trượt xuống đáy | Phản hồi lựa chọn tức thì, đóng bảng dứt khoát. |
| **Đăng nhập ([A03](file:///d:/VN_Champion/MLD_VietNam/mobile/lib/features/auth/presentation/screens/a03_login_screen.dart))** | Modal Slide Up | Đi $260\text{ ms}$ / Về $200\text{ ms}$ *(nhanh hơn 23%)* | Trượt xuống đáy | Giữ nguyên trạng thái form khi vô tình vuốt nhẹ. |

---

## IV. QUY CHUẨN XỬ LÝ LỖI & PHIÊN LÀM VIỆC (ERROR & SESSION RESILIENCE)

1. **Mất kết nối mạng / Ngoại tuyến:**
   - Ứng dụng ưu tiên nạp dữ liệu từ SharedPreferences / Local Cache.
   - Hiển thị thanh trạng thái *"Đang ngoại tuyến – Hiển thị dữ liệu đã lưu"* thanh mảnh ở mép trên/dưới, không chặn thao tác xem thông tin của khách hàng.
2. **Phiên đăng nhập hết hạn (401 Unauthorized):**
   - Interceptor tự động làm mới Token trong nền (Silent Refresh).
   - Nếu làm mới thất bại $\rightarrow$ Chuyển về **Chế độ Khách (Guest Mode)** tĩnh lặng, bảo toàn giao diện đang xem, không phát lại Splash dài hay văng app.
3. **Phản hồi Session đến muộn sau Hard Timeout (Late Session Arrival):**
   - Nếu đã vượt qua $1.5\text{s}$ và đang ở Trang chủ với Guest Mode, khi session API phản hồi về sau:
     + Tuyệt đối **không reload lại Splash**, **không tự ý chuyển hướng (no auto re-routing)** làm mất vị trí cuộn hay gián đoạn thao tác của người dùng.
     + Âm thầm ghi nhận phiên đăng nhập (`AuthState`) trong nền.
     + Cập nhật các thành phần trạng thái (avatar, tên, huy hiệu) tĩnh lặng mà không dựng lại toàn bộ cây widget.
4. **API không phản hồi / 500 Internal Server Error:**
   - Hiển thị khối trạng thái trống (Empty State) kèm nút *"Thử lại"* tinh tế, không làm gián đoạn chuyển động của ứng dụng.

---

## V. TIÊU CHUẨN KIỂM THỬ HIỆU NĂNG & NGHIỆM THU (QA & ACCEPTANCE CRITERIA)

1. **Mục tiêu hiệu năng chính (Frame Budget):**
   - **Mục tiêu chính:** Duy trì chuẩn **60fps** trên thiết bị Android thực tế tầm trung (chip phổ thông Helio G85 hoặc Snapdragon 680). Ngân sách khung hình chuyển động duy trì $\le 16.6\text{ ms}$.
   - **Thiết bị tần số quét cao (90Hz / 120Hz):** Đánh giá riêng với ngân sách khung hình $\le 11.1\text{ ms}$ (90Hz) hoặc $\le 8.3\text{ ms}$ (120Hz).
   - **Đo lường bằng công cụ chuyên dụng:** Dùng Flutter DevTools Performance Profile để đánh giá Frame Timing, Jank và Memory, kiểm thử trên thiết bị thật, không chỉ dựa trên Emulator.
2. **Quản lý vòng đời AnimationController & Route Stack:**
   - Không khởi tạo AnimationController không cần thiết.
   - Bắt buộc gọi `dispose()` triệt để khi màn hình thoát để tránh rò rỉ bộ nhớ.
   - Khi Back ngắt quãng Push: Hoạt cảnh đảo chiều ngay lập tức và route phải được thu dọn khỏi stack sạch sẽ ngay khi kết thúc đảo chiều, không để rò rỉ controller hay route ẩn.
3. **Kiểm thử chịu tải thao tác (Stress Test):**
   - Chuyển đổi qua lại giữa 5 Tab chính liên tục 15 lần trong 3 giây: Bộ nhớ ổn định, không giật khung hình.
   - Nhấn mở chi tiết và bấm Back ngay lập tức khi đang trượt: Đảo chiều dứt khoát, thu dọn route chuẩn xác, không sinh route rác, không chớp màn hình đen.
   - Thu nhỏ ứng dụng ra màn hình chính điện thoại rồi mở lại: Khôi phục $0\text{ ms}$ đúng trạng thái cũ.
4. **Kiểm thử Reduce Motion:**
   - Bật cài đặt *"Giảm chuyển động"* trên hệ thống $\rightarrow$ Mọi chuyển cảnh trong app tự động chuyển sang $0\text{ ms}$ hoặc Fade vi mô, nội dung hiển thị chuẩn xác $100\%$.

---

## VI. BỘ ĐỊNH TUYẾN DÙNG CHUNG ĐỒNG BỘ MÃ NGUỒN

Vị trí file triển khai dùng chung:  
📁 [mobile/lib/core/motion/app_page_transitions.dart](file:///d:/VN_Champion/MLD_VietNam/mobile/lib/core/motion/app_page_transitions.dart)  
*(Được thiết kế làm điểm quy tụ duy nhất cho toàn bộ PageRoute của ứng dụng).*
