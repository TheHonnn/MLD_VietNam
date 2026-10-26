-- ==============================================================================
-- MLD VIETNAM - MIGRATION 008: PORTAL CONTENT CMS & AUTOMATED EMAIL LOGS
-- Phân hệ: Quản trị Banner, Thư viện Giáo trình PDF, Cộng đồng & Kênh Email
-- ==============================================================================

-- 1. Bổ sung các cột mở rộng và nới lỏng ràng buộc cho bảng miniapp_shared_content
ALTER TABLE public.miniapp_shared_content
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN author_id DROP NOT NULL,
  ALTER COLUMN updated_by DROP NOT NULL,
  ALTER COLUMN payload_hash DROP NOT NULL,
  ALTER COLUMN payload_hash SET DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_link TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'PUBLIC', -- 'PUBLIC', 'FREE_TRIAL', 'MEMBERS_ONLY'
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS author_avatar TEXT;

-- Cập nhật ràng buộc check của kind và status
ALTER TABLE public.miniapp_shared_content DROP CONSTRAINT IF EXISTS miniapp_shared_content_kind_check;
ALTER TABLE public.miniapp_shared_content ADD CONSTRAINT miniapp_shared_content_kind_check 
  CHECK (UPPER(kind) = ANY (ARRAY['BANNER', 'DOCUMENT', 'COMMUNITY', 'ARTICLE']));

ALTER TABLE public.miniapp_shared_content DROP CONSTRAINT IF EXISTS miniapp_shared_content_status_check;
ALTER TABLE public.miniapp_shared_content ADD CONSTRAINT miniapp_shared_content_status_check 
  CHECK (UPPER(status) = ANY (ARRAY['DRAFT', 'PUBLISHED', 'APPROVED', 'PENDING', 'REJECTED', 'ARCHIVED']));

-- Đảm bảo index tối ưu cho tra cứu và sắp xếp
CREATE INDEX IF NOT EXISTS idx_shared_content_kind_status ON public.miniapp_shared_content(kind, status);
CREATE INDEX IF NOT EXISTS idx_shared_content_sort ON public.miniapp_shared_content(sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_category ON public.miniapp_shared_content(category);

-- 2. Bảng quản lý mẫu Email Đào tạo & Vận hành (email_templates)
CREATE TABLE IF NOT EXISTS public.email_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    body_html TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng lưu nhật ký gửi Email (email_logs)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(150),
    template_id VARCHAR(100) REFERENCES public.email_templates(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT', -- 'SENT', 'FAILED', 'PENDING'
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);

-- 4. Phân quyền Row-Level Security (RLS)
ALTER TABLE public.miniapp_shared_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read miniapp_shared_content" ON public.miniapp_shared_content;
CREATE POLICY "Public Read miniapp_shared_content" ON public.miniapp_shared_content
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Staff Manage miniapp_shared_content" ON public.miniapp_shared_content;
CREATE POLICY "Staff Manage miniapp_shared_content" ON public.miniapp_shared_content
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read email_templates" ON public.email_templates;
CREATE POLICY "Public Read email_templates" ON public.email_templates
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Staff Manage email_templates" ON public.email_templates;
CREATE POLICY "Staff Manage email_templates" ON public.email_templates
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read email_logs" ON public.email_logs;
CREATE POLICY "Public Read email_logs" ON public.email_logs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Staff Manage email_logs" ON public.email_logs;
CREATE POLICY "Staff Manage email_logs" ON public.email_logs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Nạp các Mẫu Email Chuẩn Doanh nghiệp cho Học viện MLD
INSERT INTO public.email_templates (id, name, subject, description, body_html, variables, is_active)
VALUES
(
  'CONFIRMATION_ENROLLMENT',
  'Xác nhận đăng ký & đặt cọc khóa học MLD',
  'MLD Việt Nam - Xác nhận đăng ký khóa học thành công: {{course_name}}',
  'Gửi tự động khi học viên đăng ký hoặc đặt cọc giữ chỗ khóa học thành công',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">VIỆN TRỊ LIỆU & ĐÀO TẠO MLD VIỆT NAM</h1>
      <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 13px;">Học viện Đào tạo Kỹ thuật Dẫn lưu Bạch huyết Chuẩn Quốc tế</p>
    </div>
    <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="font-size: 16px; font-weight: bold; color: #0f172a;">Kính gửi Anh/Chị {{student_name}},</p>
      <p>Học viện MLD Việt Nam xin trân trọng thông báo đã ghi nhận thủ tục đăng ký tham gia khóa đào tạo chuyên môn của Anh/Chị.</p>
      <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 4px 0;"><strong>Khóa học:</strong> {{course_name}}</p>
        <p style="margin: 4px 0;"><strong>Mã học viên:</strong> <span style="font-family: monospace; font-weight: bold; color: #0369a1;">{{student_code}}</span></p>
        <p style="margin: 4px 0;"><strong>Thời gian khai giảng:</strong> {{start_date}}</p>
        <p style="margin: 4px 0;"><strong>Địa điểm học tập:</strong> {{branch_address}}</p>
        <p style="margin: 4px 0;"><strong>Số tiền đã đặt cọc:</strong> {{paid_amount}} VNĐ</p>
      </div>
      <p>Anh/Chị có thể đăng nhập vào ứng dụng để xem trước giáo trình và video bài giảng lý thuyết trực tuyến trước ngày khai giảng.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://mldvietnam.edu.vn" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Truy cập Cổng Học viên</a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
      <p style="font-size: 12px; color: #64748b; margin: 0;">Hotline Ban Đào tạo: 028 3829 5678 | Email: daotao@mldvietnam.edu.vn</p>
    </div>
  </div>',
  '["student_name", "course_name", "student_code", "start_date", "branch_address", "paid_amount"]'::jsonb,
  true
),
(
  'CLASS_SCHEDULE_REMINDER',
  'Nhắc lịch học thực hành lâm sàng',
  'MLD Việt Nam - Nhắc lịch buổi học thực hành lâm sàng ngày mai: {{class_title}}',
  'Gửi tự động trước 24 giờ diễn ra buổi học thực hành tại phòng lab',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: #0284c7; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px;">NHẮC HẸN LỊCH HỌC THỰC HÀNH LÂM SÀNG</h1>
    </div>
    <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
      <p>Kính gửi Học viên <strong>{{student_name}}</strong>,</p>
      <p>Học viện xin nhắc Anh/Chị về buổi học thực hành chuyên sâu sắp diễn ra:</p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 18px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Chủ đề:</strong> {{class_title}}</p>
        <p style="margin: 4px 0;"><strong>Thời gian:</strong> {{time_slot}}, ngày {{study_date}}</p>
        <p style="margin: 4px 0;"><strong>Phòng học:</strong> {{room_name}}</p>
        <p style="margin: 4px 0;"><strong>Giảng viên phụ trách:</strong> {{instructor_name}}</p>
      </div>
      <p style="font-size: 13px; color: #475569;">* Lưu ý: Học viên vui lòng mặc trang phục y tế/spa chuyên dụng và có mặt trước 15 phút để chuẩn bị dụng cụ mô phỏng.</p>
    </div>
  </div>',
  '["student_name", "class_title", "time_slot", "study_date", "room_name", "instructor_name"]'::jsonb,
  true
),
(
  'COURSE_EXPIRY_WARNING',
  'Cảnh báo thời hạn truy cập video bài giảng',
  'MLD Việt Nam - Cảnh báo: Thời hạn học trực tuyến khóa {{course_name}} sắp hết',
  'Gửi trước 7 ngày khi thời hạn truy cập bài giảng video trực tuyến kết thúc',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: #d97706; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px;">THÔNG BÁO THỜI HẠN KHÓA HỌC</h1>
    </div>
    <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
      <p>Chào <strong>{{student_name}}</strong>,</p>
      <p>Thời hạn truy cập bài giảng trực tuyến của khóa học <strong>{{course_name}}</strong> của Anh/Chị sẽ kết thúc vào ngày <strong>{{expiry_date}}</strong> (còn 7 ngày).</p>
      <p>Vui lòng hoàn thành các bài thi Quiz trắc nghiệm và ôn tập lý thuyết trước thời điểm nêu trên để đảm bảo điều kiện cấp Giấy chứng nhận.</p>
    </div>
  </div>',
  '["student_name", "course_name", "expiry_date"]'::jsonb,
  true
),
(
  'EXAM_RESULT_AND_CERTIFICATE',
  'Thông báo kết quả thi & Cấp Giấy chứng nhận',
  'Chúc mừng {{student_name}} đã đạt chuẩn Giấy chứng nhận MLD: {{course_name}}',
  'Gửi khi học viên hoàn thành kỳ thi và được cấp Giấy chứng nhận chính thức',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">CHÚC MỪNG TỐT NGHIỆP KHÓA HỌC</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Viện Trị Liệu & Đào Tạo MLD Việt Nam</p>
    </div>
    <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
      <p style="font-size: 16px;">Kính gửi <strong>{{student_name}}</strong>,</p>
      <p>Hội đồng Chuyên môn MLD Việt Nam trân trọng chúc mừng Anh/Chị đã hoàn thành xuất sắc chương trình đào tạo và vượt qua kỳ kiểm tra tay nghề lâm sàng.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Chương trình:</strong> {{course_name}}</p>
        <p style="margin: 4px 0;"><strong>Điểm lý thuyết:</strong> {{theory_score}}/100</p>
        <p style="margin: 4px 0;"><strong>Điểm lâm sàng:</strong> {{practice_score}}/100</p>
        <p style="margin: 4px 0;"><strong>Mã Giấy chứng nhận:</strong> <span style="font-family: monospace; font-weight: bold; color: #047857;">{{certificate_code}}</span></p>
        <p style="margin: 4px 0;"><strong>Ngày cấp:</strong> {{issue_date}}</p>
      </div>
      <p>Anh/Chị có thể tải file Giấy chứng nhận điện tử đính kèm hoặc tra cứu mã QR xác thực trên hệ thống quốc gia.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="{{verification_url}}" style="background: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Tra cứu Giấy chứng nhận</a>
      </div>
    </div>
  </div>',
  '["student_name", "course_name", "theory_score", "practice_score", "certificate_code", "issue_date", "verification_url"]'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  description = EXCLUDED.description,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables,
  updated_at = CURRENT_TIMESTAMP;

-- 6. Dữ liệu mẫu khởi tạo cho Banners, Tài liệu Giáo trình và Cộng đồng
INSERT INTO public.miniapp_shared_content (
  kind, title, summary, content_text, image_url, target_link, sort_order, category, access_level, status, is_featured, download_count, likes_count, author_name, published_at
) VALUES
-- Banner 1
(
  'BANNER',
  'Khóa Đào tạo Chuyên gia Dẫn lưu Bạch huyết MLD Khóa 15',
  'Chương trình chuẩn y khoa quốc tế chuyển giao độc quyền tại Việt Nam',
  'Đăng ký khóa học chuyên sâu chuẩn Vodder với sự hướng dẫn trực tiếp từ các chuyên gia hàng đầu.',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=675&fit=crop',
  '/academy',
  1,
  'DAO_TAO',
  'PUBLIC',
  'PUBLISHED',
  true,
  0,
  128,
  'Ban Giám Đốc MLD',
  CURRENT_TIMESTAMP
),
-- Banner 2
(
  'BANNER',
  'Chương trình Tầm soát & Giảm Phù tay sau Phẫu thuật Ung thư vú',
  'Thăm khám và trị liệu phục hồi chức năng hệ bạch huyết toàn diện',
  'Ứng dụng kỹ thuật băng ép đa lớp kết hợp xoa bóp dẫn lưu bạch huyết chuẩn y tế.',
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&h=675&fit=crop',
  '/services',
  2,
  'DICH_VU',
  'PUBLIC',
  'PUBLISHED',
  true,
  0,
  95,
  'Phòng Khám Lâm Sàng',
  CURRENT_TIMESTAMP
),
-- Tài liệu PDF 1
(
  'DOCUMENT',
  'Giáo trình Giải phẫu & Sinh lý Hệ Bạch Huyết Người',
  'Tài liệu giảng dạy nhập môn dành cho học viên và chuyên viên trị liệu',
  'Tập hợp đầy đủ cấu trúc giải phẫu hạch bạch huyết, đường đi mạch bạch huyết nông và sâu, cơ chế hình thành dịch mô và nguyên nhân phù.',
  'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&fit=crop',
  'https://mldvietnam.edu.vn/docs/giao-trinh-giai-phau-bach-huyet.pdf',
  1,
  'GIAI_PHAU',
  'MEMBERS_ONLY',
  'PUBLISHED',
  true,
  342,
  76,
  'Hội đồng Chuyên môn MLD',
  CURRENT_TIMESTAMP
),
-- Tài liệu PDF 2
(
  'DOCUMENT',
  'Phác đồ Băng ép Đa lớp trong Điều trị Phù Bạch Huyết Giai đoạn 2',
  'Hướng dẫn thực hành lâm sàng chi tiết kỹ thuật băng ép vớ y khoa',
  'Quy trình chọn loại băng dãn ngắn, kỹ thuật quấn từ ngọn chi đến gốc chi, bảo vệ nếp gấp khớp và theo dõi áp lực điều trị.',
  'https://images.unsplash.com/photo-1583912267670-6575ad4736f8?w=800&fit=crop',
  'https://mldvietnam.edu.vn/docs/phac-do-bang-ep-da-lop.pdf',
  2,
  'LAM_SANG',
  'FREE_TRIAL',
  'PUBLISHED',
  false,
  215,
  45,
  'BS. CKI Lê Hoài An',
  CURRENT_TIMESTAMP
),
-- Bài viết Cộng đồng 1
(
  'COMMUNITY',
  'Kinh nghiệm phân biệt Phù mỡ (Lipedema) và Phù bạch huyết (Lymphedema)',
  'Chia sẻ ca lâm sàng thực tế giúp kỹ thuật viên chẩn đoán phân biệt chính xác',
  'Bài viết chia sẻ các dấu hiệu nhận biết quan trọng như dấu hiệu Stemmer, tính chất đối xứng ở hai chân và khả năng đáp ứng với kỹ thuật dẫn lưu MLD.',
  'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&fit=crop',
  '',
  1,
  'CHIA_SE_KINH_NGHIEM',
  'PUBLIC',
  'PUBLISHED',
  true,
  0,
  182,
  'KTV. Nguyễn Thu Hà',
  CURRENT_TIMESTAMP
),
-- Bài viết Cộng đồng 2 (Chờ duyệt)
(
  'COMMUNITY',
  'Hỏi về thời điểm an toàn bắt đầu MLD sau phẫu thuật hút mỡ bụng?',
  'Thắc mắc từ học viên mới về khoảng thời gian chỉ định dẫn lưu phục hồi',
  'Khách hàng vừa hút mỡ bụng 3 ngày, hiện đang sưng nề nhiều và đau tức. Liệu có thể thực hiện kỹ thuật MLD nhẹ nhàng ngay chưa hay cần đợi lành vết may?',
  '',
  '',
  2,
  'HOI_DAP',
  'PUBLIC',
  'PENDING',
  false,
  0,
  12,
  'Trần Minh Phương (Học viên K14)',
  NULL
)
ON CONFLICT DO NOTHING;
