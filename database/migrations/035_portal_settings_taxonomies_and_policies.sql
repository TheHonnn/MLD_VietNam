-- ==============================================================================
-- MLD VIETNAM - MIGRATION 035: PORTAL SETTINGS, TAXONOMIES, FAQS & LEGAL POLICIES
-- Phân hệ: Cổng nội dung Portal (W18), Kênh liên hệ Spa, Đối tượng & Nhu cầu, 
--          Hỏi đáp thường gặp FAQs và Chính sách pháp lý (Đồng bộ App Mobile)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẢNG THÔNG TIN LIÊN HỆ & MẠNG XÃ HỘI TOÀN HỆ THỐNG (portal_contacts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_contacts (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'primary_mld_contacts',
    hotline_support VARCHAR(50) NOT NULL DEFAULT '096.7786.399',
    hotline_training VARCHAR(50) NOT NULL DEFAULT '096.7786.399',
    zalo_oa_url TEXT NOT NULL DEFAULT 'https://zalo.me/1424469774232439257?src=qr',
    messenger_url TEXT NOT NULL DEFAULT 'https://m.me/hebachhuyet.mldvietnam',
    fanpage_url TEXT NOT NULL DEFAULT 'https://facebook.com/hebachhuyet.mldvietnam',
    tiktok_url TEXT NOT NULL DEFAULT 'https://tiktok.com/@mldvietnam',
    youtube_url TEXT DEFAULT '',
    working_hours VARCHAR(150) NOT NULL DEFAULT '09:00 – 20:00 hàng ngày',
    headquarters_address TEXT NOT NULL DEFAULT 'Chi nhánh Quận 3, 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
    consultation_badge_text VARCHAR(100) DEFAULT 'TƯ VẤN Y KHOA MLD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed hàng cấu hình mặc định ban đầu
INSERT INTO public.portal_contacts (
    id,
    hotline_support,
    hotline_training,
    zalo_oa_url,
    messenger_url,
    fanpage_url,
    tiktok_url,
    working_hours,
    headquarters_address,
    consultation_badge_text
) VALUES (
    'primary_mld_contacts',
    '096.7786.399',
    '096.7786.399',
    'https://zalo.me/1424469774232439257?src=qr',
    'https://m.me/hebachhuyet.mldvietnam',
    'https://facebook.com/hebachhuyet.mldvietnam',
    'https://tiktok.com/@mldvietnam',
    '09:00 – 20:00 hàng ngày',
    'Chi nhánh Quận 3, 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
    'TƯ VẤN Y KHOA MLD'
) ON CONFLICT (id) DO UPDATE SET
    hotline_support = EXCLUDED.hotline_support,
    zalo_oa_url = EXCLUDED.zalo_oa_url,
    messenger_url = EXCLUDED.messenger_url,
    working_hours = EXCLUDED.working_hours,
    headquarters_address = EXCLUDED.headquarters_address,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------------------------
-- 2. BẢNG DANH MỤC ĐỐI TƯỢNG & NHU CẦU MASTER (portal_taxonomies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_taxonomies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'TARGET_AUDIENCE' hoặc 'TARGET_NEED'
    code VARCHAR(100) NOT NULL, -- Mã định danh duy nhất trong nhóm (VD: 'BEGINNER', 'SPA_PRO')
    name VARCHAR(200) NOT NULL, -- Tên hiển thị (VD: 'Người mới bắt đầu', 'Đang làm nghề')
    description TEXT, -- Mô tả hiển thị trên thẻ chọn (phụ đề App)
    icon_name VARCHAR(100) DEFAULT 'person',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_portal_taxonomies_type_code UNIQUE (type, code)
);

CREATE INDEX IF NOT EXISTS idx_portal_taxonomies_type_sort ON public.portal_taxonomies(type, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_portal_taxonomies_active ON public.portal_taxonomies(is_active);

-- Seed danh mục Đối tượng (TARGET_AUDIENCE)
INSERT INTO public.portal_taxonomies (type, code, name, description, icon_name, sort_order, is_active)
VALUES
('TARGET_AUDIENCE', 'BEGINNER', 'Người mới bắt đầu', 'Chưa có kinh nghiệm, muốn học kiến thức nền tảng và tự chăm sóc cơ bản theo chuẩn Vodder.', 'school', 1, TRUE),
('TARGET_AUDIENCE', 'SPA_PRO', 'Đang làm nghề', 'Kỹ thuật viên, chủ Spa, y bác sĩ muốn chuẩn hóa tay nghề và tích hợp liệu trình chuyên sâu.', 'spa', 2, TRUE),
('TARGET_AUDIENCE', 'MEDICAL_STAFF', 'Y bác sĩ & Điều dưỡng', 'Nhân viên y tế chuyên khoa phục hồi chức năng, chăm sóc sau phẫu thuật và giảm phù y khoa.', 'medical_services', 3, TRUE),
('TARGET_AUDIENCE', 'SELF_CARE', 'Người chăm sóc gia đình', 'Học kỹ thuật dẫn lưu cơ bản để chăm sóc sức khỏe cho người thân và bản thân.', 'favorite', 4, TRUE)
ON CONFLICT (type, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Seed danh mục Nhu cầu (TARGET_NEED)
INSERT INTO public.portal_taxonomies (type, code, name, description, icon_name, sort_order, is_active)
VALUES
('TARGET_NEED', 'FOUNDATION', 'Kiến thức nền tảng & Tự chăm sóc', 'Hiểu rõ nguyên lý hệ bạch huyết và kỹ thuật xoa bóp dẫn lưu Vodder cơ bản.', 'menu_book', 1, TRUE),
('TARGET_NEED', 'INTEGRATION', 'Tích hợp dịch vụ mới', 'Bổ sung dịch vụ dẫn lưu bạch huyết y khoa vào menu dịch vụ của spa/clinic.', 'add_business', 2, TRUE),
('TARGET_NEED', 'CARE_CENTER', 'Mở cơ sở chăm sóc', 'Đào tạo toàn diện về kỹ thuật, quy trình vận hành và setup phòng trị liệu MLD chuyên nghiệp.', 'storefront', 3, TRUE),
('TARGET_NEED', 'VODDER_STANDARD', 'Chuẩn hóa kỹ thuật Vodder Châu Âu', 'Nâng cao tay nghề và cấp chứng nhận chuẩn quốc tế từ chuyên gia đầu ngành.', 'verified', 4, TRUE)
ON CONFLICT (type, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------------------------
-- 3. CỦNG CỐ BẢNG CÂU HỎI THƯỜNG GẶP (support_faqs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_faqs_category_order ON public.support_faqs(category, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_support_faqs_active ON public.support_faqs(is_active);

-- Seed dữ liệu FAQ chuyên nghiệp
INSERT INTO public.support_faqs (category, question, answer, display_order, is_active)
VALUES
(
    'DAO_TAO',
    'Khóa học Kỹ thuật viên Dẫn lưu Bạch huyết MLD kéo dài bao lâu?',
    'Khóa học đào tạo Kỹ thuật viên MLD tiêu chuẩn kéo dài trong 3 tuần gồm 24 giờ lý thuyết giải phẫu sinh lý hệ bạch huyết và 48 giờ thực hành trực tiếp trên người thật có chuyên gia kèm 1:1. Học viên sau khi hoàn thành và đạt bài thi đánh giá sẽ được cấp chứng chỉ hành nghề có giá trị toàn quốc.',
    1,
    TRUE
),
(
    'DAO_TAO',
    'Người mới bắt đầu chưa có kiến thức y khoa có theo học được không?',
    'Hoàn toàn được. Giáo trình MLD Việt Nam được thiết kế từ cơ bản đến chuyên sâu, có hình ảnh minh họa 3D và video hướng dẫn từng bước. Các chuyên gia sẽ trực tiếp hướng dẫn cảm nhận lực tay nhẹ nhàng đặc thù của phương pháp Vodder từ bài học đầu tiên.',
    2,
    TRUE
),
(
    'DICH_VU',
    'Dẫn lưu bạch huyết MLD có khác gì so với massage thư giãn thông thường?',
    'Khác biệt hoàn toàn. Massage thông thường tác động vào cơ bắp với lực mạnh để giảm mỏi cơ. Trong khi đó, Dẫn lưu Bạch huyết MLD là liệu pháp y khoa tác động vào lớp thượng bì và mạng lưới mao mạch bạch huyết với áp lực rất nhẹ (<30-40 mmHg), nhịp điệu chậm rãi và hướng dòng chảy cố định để giảm phù nề, đào thải độc tố và tăng cường miễn dịch.',
    1,
    TRUE
),
(
    'DICH_VU',
    'Sau phẫu thuật thẩm mỹ (hút mỡ, nâng ngực) bao lâu thì có thể thực hiện MLD?',
    'Thông thường khách hàng có thể bắt đầu trị liệu MLD nhẹ nhàng từ 24 - 48 giờ sau phẫu thuật (theo chỉ định của bác sĩ chuyên khoa). Liệu pháp MLD giúp giảm bầm tím tới 60%, tiêu phù nề cấp tốc và phòng ngừa xơ hóa mô sẹo sau phẫu thuật.',
    2,
    TRUE
),
(
    'DAT_LICH',
    'Tôi có thể đổi lịch hoặc hủy ca hẹn đã đặt trước bao lâu?',
    'Quý khách có thể tự do đổi ca hoặc hủy lịch hẹn trực tiếp trên ứng dụng trước giờ hẹn tối thiểu 02 tiếng mà không phát sinh bất kỳ chi phí nào. Trong trường hợp có việc khẩn cấp, xin vui lòng gọi hotline 096.7786.399 để chuyên viên hỗ trợ kịp thời.',
    1,
    TRUE
),
(
    'HOI_VIEN',
    'Điểm tích lũy hội viên MLD được sử dụng như thế nào?',
    'Mỗi 100.000 VNĐ chi tiêu tại MLD Việt Nam, quý khách sẽ được tích lũy 10 điểm thưởng (tương đương 10.000 VNĐ). Điểm thưởng có thể dùng để khấu trừ trực tiếp khi thanh toán dịch vụ trị liệu, đăng ký khóa học mới hoặc đổi lấy các sản phẩm y khoa tại hệ thống.',
    1,
    TRUE
)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. BẢNG CHÍNH SÁCH & ĐIỀU KHOẢN PHÁP LÝ (legal_policies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- 'privacy_policy', 'terms_of_service', 'refund_policy'
    title VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    content_markdown TEXT NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_legal_policies_slug ON public.legal_policies(slug);
CREATE INDEX IF NOT EXISTS idx_legal_policies_published ON public.legal_policies(is_published);

-- Seed 3 văn bản chính sách pháp lý chuẩn mực
INSERT INTO public.legal_policies (slug, title, version, content_markdown, effective_date, is_published)
VALUES
(
    'privacy_policy',
    'Chính sách Bảo mật & Quyền riêng tư',
    '1.2',
    '# CHÍNH SÁCH BẢO MẬT VÀ BẢO VỆ DỮ LIỆU CÁ NHÂN

MLD Việt Nam (thuộc Công ty TNHH Giáo dục và Đào tạo Minh Anh) cam kết bảo mật tuyệt đối thông tin cá nhân và hồ sơ y khoa của khách hàng theo đúng quy định pháp luật Việt Nam.

## 1. Mục đích thu thập thông tin
Việc thu thập dữ liệu trên ứng dụng MLD Việt Nam bao gồm: họ tên, số điện thoại, email, địa chỉ và thông tin ghi nhận tình trạng thể chất khi trị liệu nhằm:
- Xác nhận lịch hẹn trị liệu và cấp chứng nhận đào tạo học viên.
- Theo dõi tiến trình phục hồi và cá nhân hóa phác đồ dẫn lưu bạch huyết y khoa.
- Thông báo các chương trình ưu đãi, nhắc nhở lịch hẹn và bảo vệ quyền lợi thành viên.

## 2. Phạm vi sử dụng & Chia sẻ thông tin
Hệ thống cam kết:
- Không bán, trao đổi hay chia sẻ dữ liệu người dùng cho bất kỳ bên thứ ba nào vì mục đích thương mại.
- Chỉ chia sẻ dữ liệu y khoa với bác sĩ, kỹ thuật viên trực tiếp phụ trách ca điều trị.
- Dữ liệu được mã hóa đường truyền SSL/TLS 256-bit và lưu trữ trên hệ thống máy chủ đám mây bảo mật cao.

## 3. Quyền của người dùng
Khách hàng có toàn quyền tra cứu, cập nhật, chỉnh sửa hoặc yêu cầu xóa bỏ hoàn toàn dữ liệu cá nhân của mình bất kỳ lúc nào trên ứng dụng hoặc qua hotline 096.7786.399.',
    CURRENT_DATE,
    TRUE
),
(
    'terms_of_service',
    'Điều khoản & Điều kiện Sử dụng Dịch vụ',
    '1.0',
    '# ĐIỀU KHOẢN VÀ ĐIỀU KIỆN SỬ DỤNG DỊCH VỤ MLD VIỆT NAM

Khi truy cập và sử dụng dịch vụ trên ứng dụng MLD Việt Nam, quý khách xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản dưới đây.

## 1. Quy định chung về Dịch vụ Trị liệu
- Liệu pháp Dẫn lưu Bạch huyết MLD là liệu pháp hỗ trợ phục hồi và chăm sóc sức khỏe chuyên sâu, không thay thế hoàn toàn các chỉ định cấp cứu hoặc phẫu thuật xâm lấn của bác sĩ chuyên khoa.
- Khách hàng có trách nhiệm khai báo trung thực tiền sử sức khỏe (bệnh tim mạch, huyết khối tĩnh mạch sâu, nhiễm trùng cấp tính hoặc khối u ác tính) để kỹ thuật viên thiết lập phác đồ an toàn.

## 2. Đặt lịch & Hủy lịch
- Quý khách có thể tự do đặt lịch hẹn trước tối đa 30 ngày.
- Mọi điều chỉnh về giờ hẹn vui lòng thực hiện trước giờ bắt đầu tối thiểu 02 tiếng.

## 3. Bản quyền & Sở hữu Trí tuệ
- Toàn bộ giáo trình, video bài giảng, hình ảnh phác đồ và tài liệu kỹ thuật trên ứng dụng thuộc bản quyền của MLD Việt Nam.
- Nghiêm cấm mọi hành vi sao chép, phát tán trái phép tài liệu đào tạo dưới mọi hình thức.',
    CURRENT_DATE,
    TRUE
),
(
    'refund_policy',
    'Quy chế Hoàn tiền, Đổi lịch & Bảo lưu Khóa học',
    '1.1',
    '# QUY CHẾ HOÀN TIỀN, ĐỔI LỊCH VÀ BẢO LƯU

MLD Việt Nam luôn hướng đến sự hài lòng tối đa và bảo vệ quyền lợi chính đáng của học viên cũng như khách hàng trị liệu.

## 1. Đối với Dịch vụ Trị liệu
- Khách hàng đã mua gói liệu trình nhiều buổi được quyền bảo lưu thời hạn sử dụng lên đến 12 tháng kể từ ngày kích hoạt.
- Có thể chuyển nhượng số buổi chưa sử dụng cho người thân (vợ/chồng, cha mẹ, con cái) hoàn toàn miễn phí.

## 2. Đối với Khóa học Đào tạo
- Học viên có quyền yêu cầu bảo lưu khóa học và tham gia vào khóa tiếp theo nếu có lý do sức khỏe hoặc công tác đột xuất (thông báo trước ngày khai giảng tối thiểu 03 ngày).
- Học viên được học bù miễn phí các buổi học đã vắng trong các khóa kế tiếp của học viện.',
    CURRENT_DATE,
    TRUE
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    version = EXCLUDED.version,
    content_markdown = EXCLUDED.content_markdown,
    effective_date = EXCLUDED.effective_date,
    is_published = EXCLUDED.is_published,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------------------------
-- 5. THIẾT LẬP ROW LEVEL SECURITY (RLS) & PHÂN QUYỀN
-- ------------------------------------------------------------------------------
ALTER TABLE public.portal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_policies ENABLE ROW LEVEL SECURITY;

-- 5.1. Chính sách cho portal_contacts
DROP POLICY IF EXISTS "Public Read portal_contacts" ON public.portal_contacts;
CREATE POLICY "Public Read portal_contacts" ON public.portal_contacts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Staff Manage portal_contacts" ON public.portal_contacts;
CREATE POLICY "Staff Manage portal_contacts" ON public.portal_contacts FOR ALL USING (TRUE);

-- 5.2. Chính sách cho portal_taxonomies
DROP POLICY IF EXISTS "Public Read portal_taxonomies" ON public.portal_taxonomies;
CREATE POLICY "Public Read portal_taxonomies" ON public.portal_taxonomies FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Staff Manage portal_taxonomies" ON public.portal_taxonomies;
CREATE POLICY "Staff Manage portal_taxonomies" ON public.portal_taxonomies FOR ALL USING (TRUE);

-- 5.3. Chính sách cho support_faqs
DROP POLICY IF EXISTS "Public Read support_faqs" ON public.support_faqs;
CREATE POLICY "Public Read support_faqs" ON public.support_faqs FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Staff Manage support_faqs" ON public.support_faqs;
CREATE POLICY "Staff Manage support_faqs" ON public.support_faqs FOR ALL USING (TRUE);

-- 5.4. Chính sách cho legal_policies
DROP POLICY IF EXISTS "Public Read legal_policies" ON public.legal_policies;
CREATE POLICY "Public Read legal_policies" ON public.legal_policies FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Staff Manage legal_policies" ON public.legal_policies;
CREATE POLICY "Staff Manage legal_policies" ON public.legal_policies FOR ALL USING (TRUE);

-- 5.5. Trao quyền truy cập cho anon, authenticated, service_role
GRANT ALL ON TABLE public.portal_contacts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.portal_taxonomies TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.support_faqs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.legal_policies TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
