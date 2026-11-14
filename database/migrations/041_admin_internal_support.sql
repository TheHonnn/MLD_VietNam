-- 041_admin_internal_support.sql
-- Phân hệ Hỗ trợ Kỹ thuật & Cẩm nang Vận hành Nội bộ (Admin Help & Support Center)

-- 1. BẢNG PHIẾU HỖ TRỢ & BÁO LỖI NỘI BỘ (ADMIN SUPPORT TICKETS)
CREATE TABLE IF NOT EXISTS public.admin_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(30) UNIQUE NOT NULL,
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'SOFTWARE_BUG', -- SOFTWARE_BUG, HARDWARE_POS, DATA_ISSUE, FEATURE_REQUEST, ACCOUNT_ACCESS, OTHER
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    environment_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_reply TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_support_tickets_requester ON public.admin_support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_admin_support_tickets_branch ON public.admin_support_tickets(branch_id);
CREATE INDEX IF NOT EXISTS idx_admin_support_tickets_status ON public.admin_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_admin_support_tickets_created_at ON public.admin_support_tickets(created_at DESC);

-- Trigger tự động sinh mã phiếu TK-YYYYMM-XXXX
CREATE SEQUENCE IF NOT EXISTS admin_ticket_code_seq START 1;

CREATE OR REPLACE FUNCTION public.fn_generate_admin_ticket_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_code IS NULL OR NEW.ticket_code = '' THEN
        NEW.ticket_code := 'TK-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || lpad(nextval('admin_ticket_code_seq')::text, 4, '0');
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_ticket_code ON public.admin_support_tickets;
CREATE TRIGGER trg_admin_ticket_code
BEFORE INSERT OR UPDATE ON public.admin_support_tickets
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_admin_ticket_code();

-- 2. BẢNG CẨM NANG HƯỚNG DẪN VẬN HÀNH SOP (ADMIN SOP GUIDES)
CREATE TABLE IF NOT EXISTS public.admin_sop_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL, -- POS, BOOKING, TREATMENT, ACADEMY, FINANCE, SYSTEM
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content_markdown TEXT NOT NULL,
    video_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_sop_guides_module ON public.admin_sop_guides(module);
CREATE INDEX IF NOT EXISTS idx_admin_sop_guides_order ON public.admin_sop_guides(display_order ASC);

-- 3. BẢO MẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.admin_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sop_guides ENABLE ROW LEVEL SECURITY;

-- Chính sách đọc SOP Guides
DROP POLICY IF EXISTS "Allow authenticated read sop_guides" ON public.admin_sop_guides;
CREATE POLICY "Allow authenticated read sop_guides" ON public.admin_sop_guides
    FOR SELECT TO authenticated USING (is_published = true);

DROP POLICY IF EXISTS "Allow admins manage sop_guides" ON public.admin_sop_guides;
CREATE POLICY "Allow admins manage sop_guides" ON public.admin_sop_guides
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Chính sách cho Support Tickets
DROP POLICY IF EXISTS "Allow users read own tickets or admin read all" ON public.admin_support_tickets;
CREATE POLICY "Allow users read own tickets or admin read all" ON public.admin_support_tickets
    FOR SELECT TO authenticated
    USING (
        requester_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SUPER_ADMIN', 'ADMIN')
        )
        OR EXISTS (
            SELECT 1 FROM public.staff_profiles 
            WHERE staff_profiles.user_id = auth.uid() 
            AND staff_profiles.branch_id = admin_support_tickets.branch_id
        )
    );

DROP POLICY IF EXISTS "Allow authenticated create tickets" ON public.admin_support_tickets;
CREATE POLICY "Allow authenticated create tickets" ON public.admin_support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Allow admins update tickets" ON public.admin_support_tickets;
CREATE POLICY "Allow admins update tickets" ON public.admin_support_tickets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- 4. SEED DỮ LIỆU CẨM NANG HƯỚNG DẪN VẬN HÀNH (SOP) BAN ĐẦU
INSERT INTO public.admin_sop_guides (module, title, summary, content_markdown, display_order, is_published)
VALUES
(
    'POS',
    'Quy trình Mở ca, Thu ngân & Đóng ca POS cuối ngày',
    'Hướng dẫn từng bước cách khai báo tiền đầu ca, thanh toán hóa đơn bằng QR/tiền mặt và chốt két cuối ngày.',
    '### 1. Quy trình Đầu ca (Mở ca)\n- Thu ngân đăng nhập tài khoản vào phân hệ **Thu ngân & Tiếp đón** (`/cashier-pos`).\n- Kiểm tra số dư tiền mặt thực tế trong két tiền và nhập số dư đầu ca.\n- Kiểm tra máy in hóa đơn bill 80mm và máy quét mã vạch.\n\n### 2. Thu tiền & Xuất hóa đơn\n- Tìm kiếm khách hàng theo số điện thoại hoặc mã hồ sơ.\n- Thêm dịch vụ/sản phẩm hoặc liệu trình vào giỏ hàng.\n- Chọn hình thức thanh toán (Tiền mặt, Chuyển khoản VietQR, Thẻ POS).\n- Bấm **Hoàn tất & In Bill** để đưa hóa đơn cho khách hàng.\n\n### 3. Quy trình Đóng ca cuối ngày\n- Kiểm đếm tổng tiền mặt trong két và đối soát với tổng doanh thu trên màn hình.\n- Bấm **Đóng ca & In biên bản bàn giao**.',
    1,
    true
),
(
    'BOOKING',
    'Hướng dẫn Tiếp đón Khách hàng & Điều phối Giường trị liệu',
    'Cách kiểm tra lịch hẹn đến giờ, check-in phòng và gán kỹ thuật viên chuẩn quy trình MLD.',
    '### 1. Kiểm tra Lịch hẹn Trong ngày\n- Mở phân hệ **Thu ngân & Tiếp đón** -> Tab **Lịch hẹn**.\n- Lọc danh sách khách hàng có lịch trong khung giờ hiện tại.\n\n### 2. Tiếp đón & Check-in\n- Chào đón khách hàng tại quầy lễ tân và mời dùng trà thanh lọc cơ thể.\n- Bấm nút **Check-in** trên hệ thống để chuyển trạng thái sang `Đang phục vụ`.\n- Thông báo cho Kỹ thuật viên phụ trách chuẩn bị phòng trị liệu và khăn tiệt trùng.\n\n### 3. Xử lý Trễ hẹn hoặc Đổi lịch\n- Nếu khách trễ quá 15 phút, liên hệ lại qua điện thoại để xác nhận.\n- Chuyển ca sang khung giờ kế tiếp nếu còn phòng trống.',
    2,
    true
),
(
    'TREATMENT',
    'Quy trình Lập Hồ sơ Phác đồ MLD & Giao Lời dặn Chăm sóc',
    'Cách số hóa nhật ký điều trị sau mỗi buổi và giao cẩm nang chăm sóc tại nhà cho khách hàng.',
    '### 1. Ghi nhận Sau buổi Trị liệu\n- Bác sĩ/Chuyên viên mở phân hệ **Quản lý Liệu trình** -> **Nhật ký điều trị**.\n- Ghi nhận tình trạng phù nề, mức độ đau mỏi và kỹ thuật dẫn lưu đã thực hiện.\n\n### 2. Giao Hướng dẫn Chăm sóc Tại nhà\n- Chọn mục **Hướng dẫn chăm sóc tại nhà** (`/manage/home_care_guidelines`).\n- Chọn mẫu hướng dẫn phù hợp với tình trạng của khách hàng (VD: Dẫn lưu phù nề sau phẫu thuật, Chăm sóc xương khớp).\n- Bấm **Giao vào Ứng dụng** để gửi trực tiếp thông báo và cẩm nang vào App Mobile của khách.',
    3,
    true
),
(
    'ACADEMY',
    'Quy trình Điểm danh & Cấp Chứng chỉ Đào tạo Học viện',
    'Hướng dẫn điều phối học viên, điểm danh buổi học lý thuyết/thực hành và cấp mã chứng nhận số.',
    '### 1. Điểm danh Buổi học\n- Giảng viên mở phân hệ **Điểm danh & Lớp học** (`/attendance`).\n- Chọn lớp học và buổi đào tạo theo lịch.\n- Quét mã QR hoặc tích chọn từng học viên có mặt.\n\n### 2. Cấp Giấy Chứng nhận\n- Khi học viên hoàn thành đủ số buổi và đạt bài thi sát hạch lý thuyết/thực hành Vodder.\n- Mở phân hệ **Giấy chứng nhận** (`/certificates`) -> Bấm **Cấp chứng chỉ mới**.\n- Hệ thống tự sinh mã chứng chỉ số hóa có QR xác thực trên cổng tra cứu.',
    4,
    true
),
(
    'SYSTEM',
    'Khắc phục Sự cố Kỹ thuật & Kết nối Máy in Hóa đơn POS',
    'Hướng dẫn xử lý các lỗi thường gặp: mất kết nối máy in, lỗi mạng cục bộ hoặc không tải được dữ liệu.',
    '### 1. Máy in Bill không in được\n- Kiểm tra nguồn điện máy in và dây cáp USB/LAN nối với máy tính.\n- Kiểm tra đèn báo trên máy in (đèn đỏ: hết giấy in nhiệt hoặc nắp máy chưa đóng chặt).\n- Vào mục **Cần hỗ trợ?** -> Tab **Chẩn đoán** để kiểm tra kết nối mạng nội bộ.\n\n### 2. Mạng chập chờn hoặc không lưu được dữ liệu\n- Kiểm tra biểu tượng kết nối mạng ở góc màn hình.\n- Bấm phím **F5** (hoặc `Ctrl + Shift + R`) để tải lại trang.\n- Nếu vẫn bị lỗi, vào **Cần hỗ trợ?** -> Tab **Gửi phiếu hỗ trợ** để báo ngay cho IT trực ban.',
    5,
    true
);

NOTIFY pgrst, 'reload schema';
