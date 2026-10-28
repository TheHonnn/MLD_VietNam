-- ============================================================================
-- MIGRATION 012: STANDARD EMAIL TEMPLATES (ACADEMY 1-YEAR LIFECYCLE & PRACTICE SCHEDULE)
-- Table: public.email_templates
-- ============================================================================

INSERT INTO public.email_templates (id, name, subject, description, body_html, variables, is_active, created_at, updated_at)
VALUES
-- ----------------------------------------------------------------------------
-- TEMPLATE 1: BÁO CÁO TIẾN ĐỘ HỌC TẬP & THỜI HẠN CÒN LẠI (ĐỊNH KỲ HÀNG THÁNG)
-- ----------------------------------------------------------------------------
(
  'ENROLLMENT_PROGRESS_MONTHLY',
  'Báo cáo tiến độ học tập & Thời gian học còn lại',
  'MLD Academy - Báo cáo tiến độ học tập & Thời hạn khóa học: {{course_name}}',
  'Gửi định kỳ hàng tháng thông báo số ngày học còn lại trong 365 ngày, số bài giảng đã hoàn thành và số giờ thực hành tích lũy',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8; box-shadow: 0 4px 20px rgba(152, 80, 24, 0.08);">
    <div style="background: linear-gradient(135deg, #985018 0%, #693B20 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">HỌC VIỆN ĐÀO TẠO MLD VIỆT NAM</h1>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #FAF0E4;">Báo Cáo Tiến Độ Đào Tạo Chuyên Khoa Dẫn Lưu Bạch Huyết</p>
    </div>
    <div style="padding: 32px 28px; color: #2C241E; line-height: 1.6;">
      <p style="font-size: 16px; font-weight: 600; margin-top: 0;">Kính gửi Học viên <strong>{{student_name}}</strong>,</p>
      <p style="font-size: 14px; color: #554B42;">Học viện MLD Việt Nam xin gửi tới Anh/Chị bản tổng hợp tiến độ học tập và thời hạn sử dụng khóa đào tạo chuyên môn tính đến thời điểm hiện tại:</p>
      
      <!-- Thẻ đếm ngược thời gian còn lại -->
      <div style="background: #FAF8F5; border: 2px dashed #BA7E4C; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #BA7E4C; text-transform: uppercase; letter-spacing: 1.5px;">THỜI GIAN HIỆU LỰC KHÓA HỌC (CHU KỲ 1 NĂM)</div>
        <div style="font-size: 32px; font-weight: 800; color: #985018; margin: 8px 0;">Còn {{days_left}} Ngày</div>
        <div style="font-size: 12px; color: #73675F;">Hạn kết thúc: <strong>{{valid_until_date}}</strong> (Tự động khóa sau 365 ngày)</div>
      </div>

      <!-- Thẻ thống kê chi tiết -->
      <div style="background: #ffffff; border: 1px solid #E8DACB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 700; color: #985018; margin-bottom: 14px; border-bottom: 1px solid #F0E6DE; padding-bottom: 8px;">
          THÔNG TIN KHÓA ĐÀO TẠO
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #73675F;">Khóa học:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #2C241E;">{{course_name}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #73675F;">Mã số học viên:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; font-family: monospace; color: #985018;">{{student_code}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #73675F;">Tiến độ hoàn thành bài giảng:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #137333;">{{completed_lessons}} / {{total_lessons}} bài ({{progress_percent}}%)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #73675F;">Số buổi thực hành đã điểm danh:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #985018;">{{attended_sessions}} buổi thực hành</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #554B42;">
        * Nhắc nhở: Học viên vui lòng hoàn thành toàn bộ bài kiểm tra lý thuyết và đăng ký đủ các ca thực hành lâm sàng trước ngày <strong>{{valid_until_date}}</strong> để được cấp Giấy chứng nhận tốt nghiệp chính thức.
      </p>

      <div style="text-align: center; margin-top: 28px;">
        <a href="https://mldvietnam.edu.vn" style="display: inline-block; background: #985018; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(152, 80, 24, 0.3);">
          VÀO HỌC TRỰC TUYẾN NGAY
        </a>
      </div>
    </div>
    <div style="background: #FAF8F5; border-top: 1px solid #E8DFD8; padding: 20px; text-align: center; font-size: 12px; color: #73675F;">
      <div>Phòng Quản lý Đào tạo & Khảo thí — Viện Trị Liệu & Học Viện MLD Việt Nam</div>
      <div>Hotline Hỗ Trợ Học Viên: <strong>096.7786.399</strong> | Email: <strong>daotao@mldvietnam.vn</strong></div>
    </div>
  </div>',
  '["student_name", "course_name", "student_code", "days_left", "valid_until_date", "progress_percent", "completed_lessons", "total_lessons", "attended_sessions"]'::jsonb,
  TRUE,
  NOW(),
  NOW()
),

-- ----------------------------------------------------------------------------
-- TEMPLATE 2: CẢNH BÁO SẮP HẾT HẠN KHÓA HỌC 1 NĂM (30 NGÀY & 7 NGÀY)
-- ----------------------------------------------------------------------------
(
  'ENROLLMENT_EXPIRY_WARNING',
  'Cảnh báo hết hạn khóa học 1 năm (30 ngày & 7 ngày)',
  '[QUAN TRỌNG] MLD Academy - Khóa học {{course_name}} của bạn còn {{days_left}} ngày hiệu lực',
  'Gửi tự động khi thời hạn học còn 30 ngày hoặc 7 ngày để học viên kịp thi và hoàn tất chứng chỉ trước khi khóa học bị hủy/đóng quyền truy cập',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8; box-shadow: 0 4px 20px rgba(197, 34, 31, 0.1);">
    <div style="background: linear-gradient(135deg, #B3261E 0%, #7A1712 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">CẢNH BÁO THỜI HẠN KHÓA ĐÀO TẠO</h1>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #FCE8E6;">Quyền Truy Cập Sắp Bị Thu Hồi Theo Quy Chế 1 Năm</p>
    </div>
    <div style="padding: 32px 28px; color: #2C241E; line-height: 1.6;">
      <p style="font-size: 16px; font-weight: 600; margin-top: 0;">Kính gửi Học viên <strong>{{student_name}}</strong>,</p>
      <p style="font-size: 14px; color: #554B42;">
        Học viện MLD Việt Nam xin thông báo: Thời hạn hiệu lực 01 năm của khóa học <strong>{{course_name}}</strong> (Mã HV: <strong style="color: #B3261E;">{{student_code}}</strong>) sắp kết thúc.
      </p>

      <!-- Hộp cảnh báo khẩn -->
      <div style="background: #FDF2F2; border: 2px solid #F5C6CB; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #B3261E; text-transform: uppercase; letter-spacing: 1px;">THỜI HẠN CÒN LẠI CHÍNH XÁC</div>
        <div style="font-size: 38px; font-weight: 800; color: #B3261E; margin: 6px 0;">{{days_left}} NGÀY</div>
        <div style="font-size: 13px; color: #721C24;">Khóa học sẽ chính thức đóng vào ngày: <strong>{{valid_until_date}}</strong></div>
      </div>

      <div style="background: #FFF9F5; border-left: 4px solid #B3261E; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #B3261E; font-size: 14px;">HÀNH ĐỘNG CẦN THỰC HIỆN NGAY:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #554B42;">
          <li style="margin-bottom: 6px;">Hoàn tất các bài thi lý thuyết còn dang dở trên hệ thống trực tuyến.</li>
          <li style="margin-bottom: 6px;">Liên hệ bộ phận giáo vụ để xếp lịch kiểm tra tay nghề lâm sàng nếu chưa đủ điều kiện tốt nghiệp.</li>
          <li>Sau ngày <strong>{{valid_until_date}}</strong>, hệ thống sẽ tự động khóa toàn bộ video, tài liệu và không nhận điểm danh thực hành.</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #73675F;">
        * Trong trường hợp quý học viên gặp lý do sức khỏe hoặc điều kiện bất khả kháng cần xin gia hạn, vui lòng nộp hồ sơ minh chứng về Ban Giám Đốc Học Viện trước ngày hết hạn tối thiểu 05 ngày làm việc.
      </p>

      <div style="text-align: center; margin-top: 28px;">
        <a href="https://mldvietnam.edu.vn" style="display: inline-block; background: #B3261E; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(179, 38, 30, 0.3);">
          HOÀN TẤT BÀI THI NGAY BÂY GIỜ
        </a>
      </div>
    </div>
    <div style="background: #FAF8F5; border-top: 1px solid #E8DFD8; padding: 20px; text-align: center; font-size: 12px; color: #73675F;">
      <div>Phòng Khảo Thí & Cấp Chứng Chỉ — Viện Trị Liệu & Học Viện MLD Việt Nam</div>
      <div>Hotline Khẩn Cấp: <strong>096.7786.399</strong> | Hotline Giám Đốc Đào Tạo: <strong>0388.886.688</strong></div>
    </div>
  </div>',
  '["student_name", "course_name", "student_code", "days_left", "valid_until_date", "exams_pending", "hotline", "portal_link"]'::jsonb,
  TRUE,
  NOW(),
  NOW()
),

-- ----------------------------------------------------------------------------
-- TEMPLATE 3: THÔNG BÁO LỊCH HỌC THỰC HÀNH & NHẮC LỊCH TRƯỚC 24 GIỜ
-- ----------------------------------------------------------------------------
(
  'PRACTICE_SCHEDULE_ANNOUNCEMENT',
  'Thông báo lịch học thực hành & Nhắc lịch trước 24 giờ',
  'MLD Academy - Thông báo lịch học thực hành: {{session_topic}} ngày {{session_date}}',
  'Gửi tự động khi giảng viên xếp lịch thực hành mới hoặc gửi nhắc nhở 24h trước khi ca thực hành lab diễn ra',
  '<div style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8; box-shadow: 0 4px 20px rgba(152, 80, 24, 0.08);">
    <div style="background: linear-gradient(135deg, #137333 0%, #0D5324 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">LỊCH THỰC HÀNH LÂM SÀNG MLD</h1>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #E6F4EA;">Phòng Thực Hành Kỹ Thuật Tay Vodder Chuyên Nghiệp</p>
    </div>
    <div style="padding: 32px 28px; color: #2C241E; line-height: 1.6;">
      <p style="font-size: 16px; font-weight: 600; margin-top: 0;">Xin chào Học viên <strong>{{student_name}}</strong>,</p>
      <p style="font-size: 14px; color: #554B42;">
        Giảng viên phụ trách lớp đào tạo <strong style="color: #137333;">{{batch_code}}</strong> xin thông báo lịch tổ chức buổi học thực hành lâm sàng chi tiết như sau:
      </p>

      <!-- Khung thông tin buổi học -->
      <div style="background: #FAF8F5; border: 1px solid #E8DACB; border-radius: 12px; padding: 22px; margin: 24px 0;">
        <div style="font-size: 16px; font-weight: 700; color: #985018; margin-bottom: 16px; border-bottom: 1px solid #E8DFD8; padding-bottom: 10px;">
          {{session_topic}}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #73675F; width: 140px;">Thời gian:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #137333;">{{session_time}} · Ngày {{session_date}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #73675F;">Phòng học:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #985018;">{{room_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #73675F;">Giảng viên đứng lớp:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #2C241E;">{{instructor_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #73675F; vertical-align: top;">Địa điểm cơ sở:</td>
            <td style="padding: 8px 0; color: #554B42;">{{branch_address}}</td>
          </tr>
        </table>
      </div>

      <!-- Quy định trước khi vào lớp -->
      <div style="background: #FFFDF8; border-left: 4px solid #BA7E4C; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #985018; font-size: 13px; text-transform: uppercase;">QUY CHẾ VÀO PHÒNG LAB THỰC HÀNH:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #554B42;">
          <li style="margin-bottom: 4px;">Có mặt trước giờ vào ca tối thiểu 15 phút để hoàn tất thủ tục điểm danh QR.</li>
          <li style="margin-bottom: 4px;">Trang phục bắt buộc: Đồng phục y tế MLD chuẩn, móng tay cắt ngắn, vệ sinh tay bằng dung dịch sát khuẩn y khoa.</li>
          <li>Mang theo tập giáo trình lâm sàng Vodder và sổ tay ghi chép chuyên môn.</li>
        </ul>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://mldvietnam.edu.vn" style="display: inline-block; background: #137333; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 8px rgba(19, 115, 51, 0.3);">
          XEM THỜI KHÓA BIỂU TOÀN KHÓA
        </a>
      </div>
    </div>
    <div style="background: #FAF8F5; border-top: 1px solid #E8DFD8; padding: 20px; text-align: center; font-size: 12px; color: #73675F;">
      <div>Hội đồng Đào tạo & Giảng viên Chuyên Khoa MLD Việt Nam</div>
      <div>Hotline Hỗ Trợ Đào Tạo: <strong>096.7786.399</strong> | Địa chỉ: Trụ sở MLD Việt Nam</div>
    </div>
  </div>',
  '["student_name", "batch_code", "session_topic", "session_date", "session_time", "room_name", "instructor_name", "branch_address", "requirements"]'::jsonb,
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  description = EXCLUDED.description,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables,
  is_active = TRUE,
  updated_at = NOW();
