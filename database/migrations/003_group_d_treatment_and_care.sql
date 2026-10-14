-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 003: GROUP D (TREATMENT PACKAGES & CUSTOMER CARE)
-- Phân hệ Gói liệu trình, Nhật ký phục hồi, Khảo sát tiền dịch vụ, Cẩm nang & CSKH
-- ==============================================================================

-- 1. BẢNG KHẢO SÁT SỨC KHỎE TRƯỚC DỊCH VỤ (CONSULTATION_SURVEYS) - Màn hình D04
CREATE TABLE IF NOT EXISTS consultation_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    focus_areas TEXT[] DEFAULT '{}',                -- ['Cổ vai gáy', 'Thắt lưng', 'Bắp chân', 'Vùng đầu']
    pressure_preference VARCHAR(30) DEFAULT 'MEDIUM', -- 'LIGHT' (Nhẹ), 'MEDIUM' (Vừa), 'STRONG' (Mạnh)
    has_sensitive_skin BOOLEAN DEFAULT FALSE,
    has_essential_oil_allergy BOOLEAN DEFAULT FALSE,
    allergy_details TEXT,
    medical_conditions TEXT[] DEFAULT '{}',          -- ['Huyết áp thấp', 'Thoái hóa đốt sống', 'Mất ngủ']
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG CẨM NANG HƯỚNG DẪN TỰ CHĂM SÓC TẠI NHÀ (HOME_CARE_GUIDELINES) - Màn hình D06
CREATE TABLE IF NOT EXISTS home_care_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,                  -- 'Phục hồi sau Massage', 'Giãn cơ văn phòng', 'Dưỡng sinh giấc ngủ'
    read_time_minutes INT DEFAULT 5,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    steps JSONB DEFAULT '[]'::jsonb,                 -- Các bước thực hiện chi tiết
    image_url TEXT NOT NULL,
    author_name VARCHAR(150) DEFAULT 'Chuyên gia MLD Vietnam',
    view_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG CÂU HỎI THƯỜNG GẶP (SUPPORT_FAQS) - Màn hình D07
CREATE TABLE IF NOT EXISTS support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,                  -- 'Đặt lịch & Đổi giờ', 'Liệu trình & Thanh toán', 'Dưỡng sinh & Sức khỏe'
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG PHIẾU HỖ TRỢ KHÁCH HÀNG (SUPPORT_TICKETS) - Màn hình D07
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',            -- 'PENDING', 'PROCESSING', 'RESOLVED'
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

-- SEED DỮ LIỆU MẪU CẨM NANG (D06)
INSERT INTO home_care_guidelines (id, title, category, read_time_minutes, summary, content, steps, image_url, is_featured)
VALUES 
(
    '77777777-7777-7777-7777-777777777701',
    'Chăm sóc cơ thể đúng cách trong 24 giờ sau liệu trình Massage',
    'Phục hồi sau Massage',
    4,
    'Những lưu ý vàng giúp cơ thể đào thải độc tố và duy trì hiệu quả đả thông kinh lạc sau buổi bấm huyệt.',
    'Sau buổi massage trị liệu, hệ tuần hoàn và kinh mạch của bạn đang trong trạng thái kích hoạt mạnh mẽ. Để đạt hiệu quả tối ưu, bạn cần duy trì những thói quen phục hồi dưới đây.',
    '[
        {"step": 1, "title": "Uống đủ nước ấm", "desc": "Bổ sung 300-500ml nước ấm ngay sau liệu trình để hỗ trợ thận đào thải axit lactic tích tụ."},
        {"step": 2, "title": "Tránh tắm nước lạnh ngay", "desc": "Nên nghỉ ngơi ít nhất 2-3 giờ trước khi tắm bằng nước ấm để không bị nhiễm hàn khí vào lỗ chân lông."},
        {"step": 3, "title": "Giữ ấm cơ thể", "desc": "Tránh ngồi trực diện luồng gió điều hòa mạnh, đặc biệt là vùng gáy và thắt lưng."},
        {"step": 4, "title": "Ngủ sớm trước 23h", "desc": "Giấc ngủ sâu là thời điểm vàng để cơ bắp tái tạo và kinh mạch gan mật bài độc."}
    ]'::jsonb,
    'assets/images/gioithieu_1.png',
    TRUE
),
(
    '77777777-7777-7777-7777-777777777702',
    '5 Động tác giãn cơ cổ vai gáy 3 phút dành cho dân văn phòng',
    'Giãn cơ văn phòng',
    3,
    'Giải phóng chèn ép đốt sống cổ ngay tại bàn làm việc mà không cần dụng cụ.',
    'Thói quen ngồi máy tính liên tục trên 6 tiếng là nguyên nhân chính gây đau mỏi vai gáy. Hãy dành 3 phút giữa giờ để thực hiện bài tập này.',
    '[
        {"step": 1, "title": "Nghiêng đầu sang bên", "desc": "Giữ mỗi bên 15 giây, cảm nhận sự kéo giãn nhẹ nhàng cơ ức đòn chũm."},
        {"step": 2, "title": "Xoay khớp vai ra sau", "desc": "Thực hiện 10 vòng xoay tròn chậm rãi, mở rộng lồng ngực."},
        {"step": 3, "title": "Đan tay đẩy cằm lên", "desc": "Dùng 2 ngón tay cái nhẹ nhàng đẩy cằm ngửa lên trần nhà trong 10 giây."},
        {"step": 4, "title": "Cúi gập cổ kéo giãn", "desc": "Đan hai tay sau gáy và nhẹ nhàng kéo đầu hướng xuống ngực."}
    ]'::jsonb,
    'assets/images/branch_hero_1.png',
    TRUE
);

-- SEED DỮ LIỆU MẪU CÂU HỎI THƯỜNG GẶP (D07)
INSERT INTO support_faqs (category, question, answer, display_order)
VALUES
('Đặt lịch & Đổi giờ', 'Tôi có thể đổi giờ hẹn hoặc hủy lịch hẹn trước bao lâu?', 'Bạn có thể tự do đổi ngày/giờ hẹn miễn phí trước ít nhất 2 giờ so với lịch hẹn dự kiến. Nếu đổi lịch trong vòng 2 giờ, vui lòng liên hệ trực tiếp hotline để được hỗ trợ.', 1),
('Đặt lịch & Đổi giờ', 'Tiền cọc giữ chỗ có được hoàn lại nếu tôi hủy lịch không?', 'Khi bạn hủy lịch trước 2 giờ, số tiền cọc sẽ được hoàn lại 100% vào tài khoản ví MLD hoặc ngân hàng trong 1-3 ngày làm việc.', 2),
('Liệu trình & Thanh toán', 'Gói liệu trình nhiều buổi có thời hạn sử dụng trong bao lâu?', 'Các gói liệu trình 5 - 10 buổi tại MLD Vietnam có thời hạn sử dụng 6 tháng kể từ ngày kích hoạt buổi đầu tiên.', 3),
('Dưỡng sinh & Sức khỏe', 'Tôi bị đau mỏi nhiều sau buổi massage đầu tiên thì có bình thường không?', 'Đây là phản ứng hoàn toàn bình thường (phản ứng sinh học khi cơ bắp giải phóng axit lactic). Cảm giác này sẽ biến mất sau 24-48 giờ và cơ thể bạn sẽ nhẹ nhõm hơn rõ rệt.', 4);

