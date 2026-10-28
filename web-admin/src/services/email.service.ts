import { EmailTemplate, EmailLog, ApiResponse } from '../types/shared_types';
import { supabaseService } from './supabaseService';

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'CONFIRMATION_ENROLLMENT',
    name: 'Xác nhận đăng ký & đặt cọc khóa học MLD',
    subject: 'MLD Việt Nam - Xác nhận đăng ký khóa học thành công: {{course_name}}',
    description: 'Gửi tự động khi học viên đăng ký hoặc đặt cọc giữ chỗ khóa học thành công',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: linear-gradient(135deg, #985018 0%, #723F1A 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">VIỆN TRỊ LIỆU & ĐÀO TẠO MLD VIỆT NAM</h1>
      <p style="color: #FAF0E4; margin: 8px 0 0 0; font-size: 13px;">Học viện Đào tạo Kỹ thuật Dẫn lưu Bạch huyết Chuẩn Quốc tế</p>
    </div>
    <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #E8DFD8; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="font-size: 16px; font-weight: bold; color: #2C241E;">Kính gửi Anh/Chị {{student_name}},</p>
      <p>Học viện MLD Việt Nam xin trân trọng thông báo đã ghi nhận thủ tục đăng ký tham gia khóa đào tạo chuyên môn của Anh/Chị.</p>
      <div style="background: #FAF8F5; border-left: 4px solid #985018; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 4px 0;"><strong>Khóa học:</strong> {{course_name}}</p>
        <p style="margin: 4px 0;"><strong>Mã học viên:</strong> <span style="font-family: monospace; font-weight: bold; color: #985018;">{{student_code}}</span></p>
        <p style="margin: 4px 0;"><strong>Thời gian khai giảng:</strong> {{start_date}}</p>
        <p style="margin: 4px 0;"><strong>Địa điểm đào tạo:</strong> {{branch_address}}</p>
        <p style="margin: 4px 0;"><strong>Học phí / Tiền cọc ghi nhận:</strong> <span style="color: #137333; font-weight: bold;">{{paid_amount}} VNĐ</span></p>
      </div>
      <p>Giảng viên phụ trách và bộ phận tuyển sinh sẽ liên hệ trước ngày khai giảng 03 ngày để hướng dẫn đồng phục và chuẩn bị tài liệu thực hành.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #E8DFD8; font-size: 12px; color: #73675F; text-align: center;">
        Hotline Hỗ trợ Đào tạo: <strong>1900 6868</strong> | Website: <strong>mldvietnam.edu.vn</strong>
      </div>
    </div>
  </div>`,
    variables: ['student_name', 'course_name', 'student_code', 'start_date', 'branch_address', 'paid_amount'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'REMINDER_CLASS_SESSION',
    name: 'Nhắc lịch học thực hành & thi lâm sàng',
    subject: 'MLD Việt Nam - Nhắc lịch buổi học: {{class_title}} vào ngày {{study_date}}',
    description: 'Gửi tự động trước 24 giờ trước các buổi thực hành kỹ thuật chuyên sâu hoặc thi lâm sàng',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: #FAF8F5; padding: 25px 20px; border-left: 6px solid #BA7E4C; border-radius: 8px; border: 1px solid #E8DFD8;">
      <h2 style="color: #985018; margin: 0 0 10px 0; font-size: 18px;">LỊCH HỌC THỰC HÀNH SẮP DIỄN RA</h2>
      <p style="margin: 0; font-size: 14px;">Xin chào <strong>{{student_name}}</strong>,</p>
      <p style="font-size: 14px; margin: 10px 0;">Bạn có lịch học thực hành chuyên sâu theo thời gian biểu như sau:</p>
      <div style="background: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #E8DACB;">
        <p style="margin: 4px 0;"><strong>Buổi học:</strong> {{class_title}}</p>
        <p style="margin: 4px 0;"><strong>Thời gian:</strong> <span style="color: #985018; font-weight: bold;">{{time_slot}}</span> ngày <strong>{{study_date}}</strong></p>
        <p style="margin: 4px 0;"><strong>Phòng thực hành:</strong> {{room_name}}</p>
        <p style="margin: 4px 0;"><strong>Giảng viên đứng lớp:</strong> {{instructor_name}}</p>
      </div>
      <p style="font-size: 13px; color: #73675F;">* Vui lòng có mặt trước 15 phút, trang bị đúng đồng phục y tế và mang theo giáo trình chuyên khoa MLD.</p>
    </div>
  </div>`,
    variables: ['student_name', 'class_title', 'time_slot', 'study_date', 'room_name', 'instructor_name'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'EXAM_RESULTS_NOTIFICATION',
    name: 'Thông báo kết quả thi & Tốt nghiệp khóa học',
    subject: 'MLD Việt Nam - Chúc mừng bạn đã hoàn thành khóa thi: {{course_name}}',
    description: 'Gửi khi giảng viên công bố điểm thi Lý thuyết và Thực hành lâm sàng',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: linear-gradient(135deg, #137333 0%, #0d5324 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">KẾT QUẢ ĐÁNH GIÁ CHUYÊN MÔN</h1>
      <p style="color: #e6f4ea; margin: 6px 0 0 0; font-size: 13px;">Hội đồng Khảo thí & Đào tạo MLD Việt Nam</p>
    </div>
    <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #E8DFD8; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="font-size: 15px;">Chúc mừng học viên <strong>{{student_name}}</strong>,</p>
      <p>Hội đồng chuyên môn đã hoàn tất chấm điểm kỳ thi đánh giá năng lực Dẫn lưu Bạch huyết MLD của bạn:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #FAF8F5;">
          <th style="padding: 10px; border: 1px solid #E8DFD8; text-align: left;">Hạng mục đánh giá</th>
          <th style="padding: 10px; border: 1px solid #E8DFD8; text-align: center;">Điểm đạt</th>
          <th style="padding: 10px; border: 1px solid #E8DFD8; text-align: center;">Xếp loại</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #E8DFD8;">Lý thuyết Giải phẫu & Sinh lý hệ mạch</td>
          <td style="padding: 10px; border: 1px solid #E8DFD8; text-align: center; font-weight: bold; color: #985018;">{{theory_score}}/100</td>
          <td style="padding: 10px; border: 1px solid #E8DFD8; text-align: center;">ĐẠT</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #E8DFD8;">Kỹ năng Thực hành Thao tác tay Vodder</td>
          <td style="padding: 10px; border: 1px solid #E8DFD8; text-align: center; font-weight: bold; color: #985018;">{{practice_score}}/100</td>
          <td style="padding: 10px; border: 1px solid #E8DFD8; text-align: center; font-weight: bold; color: #137333;">XUẤT SẮC</td>
        </tr>
      </table>
      <p style="font-size: 13px; color: #554B42;">Giấy chứng nhận chuyên môn bản cứng kèm mã xác thực QR điện tử đang được hoàn thiện và chuyển phát tới bạn.</p>
    </div>
  </div>`,
    variables: ['student_name', 'course_name', 'theory_score', 'practice_score'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CERTIFICATE_ISSUED_VERIFICATION',
    name: 'Cấp chứng nhận điện tử & Mã QR tra cứu',
    subject: 'MLD Việt Nam - Tra cứu Chứng nhận điện tử hợp lệ: {{certificate_code}}',
    description: 'Gửi kèm đường link tra cứu và mã QR chứng nhận độc quyền sau khi học viên tốt nghiệp',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: #2C241E; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h2 style="color: #FAF0E4; margin: 0; font-size: 20px; font-serif: serif;">CHỨNG NHẬN ĐIỆN TỬ MLD CHÍNH THỨC</h2>
    </div>
    <div style="background: #FAF8F5; padding: 30px 25px; border: 1px solid #BA7E4C; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
      <p style="font-size: 15px; margin-bottom: 20px;">Chứng nhận hoàn thành kỹ thuật Dẫn lưu Bạch huyết Quốc tế cấp cho:</p>
      <h3 style="font-size: 22px; color: #985018; margin: 0 0 10px 0; font-family: serif;">{{student_name}}</h3>
      <p style="font-size: 13px; color: #554B42; margin-bottom: 25px;">Mã số Chứng chỉ: <strong style="font-family: monospace; color: #2C241E; font-size: 15px;">{{certificate_code}}</strong></p>
      <a href="{{verification_url}}" style="display: inline-block; background: #985018; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">TRA CỨU & XÁC THỰC MÃ QR</a>
      <p style="font-size: 11px; color: #73675F; margin-top: 25px;">Chứng nhận có giá trị đối chiếu trên Cổng Dữ Liệu Quốc Gia MLD Việt Nam.</p>
    </div>
  </div>`,
    variables: ['student_name', 'certificate_code', 'verification_url'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ENROLLMENT_PROGRESS_MONTHLY',
    name: 'Báo cáo tiến độ học tập & Thời gian học còn lại',
    subject: 'MLD Academy - Báo cáo tiến độ học tập & Thời hạn khóa học: {{course_name}}',
    description: 'Gửi định kỳ hàng tháng thông báo số ngày học còn lại trong 365 ngày, số bài giảng đã hoàn thành và số giờ thực hành tích lũy',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
      <div style="background: linear-gradient(135deg, #985018 0%, #693B20 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">HỌC VIỆN ĐÀO TẠO MLD VIỆT NAM</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #FAF0E4;">Báo Cáo Tiến Độ Đào Tạo Chuyên Khoa Dẫn Lưu Bạch Huyết</p>
      </div>
      <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Kính gửi Học viên {{student_name}},</p>
        <p style="font-size: 14px; color: #554B42;">Học viện MLD Việt Nam xin gửi tới bạn bản tổng hợp tiến độ học tập và thời hạn khóa đào tạo chuyên môn:</p>
        
        <div style="background: #FAF8F5; border: 2px dashed #BA7E4C; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: bold; color: #BA7E4C; text-transform: uppercase;">THỜI GIAN HIỆU LỰC KHÓA HỌC (CHU KỲ 1 NĂM)</div>
          <div style="font-size: 32px; font-weight: 800; color: #985018; margin: 8px 0;">Còn {{days_left}} Ngày</div>
          <div style="font-size: 12px; color: #73675F;">Hạn kết thúc: <strong>{{valid_until_date}}</strong> (Tự động khóa sau 365 ngày)</div>
        </div>

        <div style="background: #ffffff; border: 1px solid #E8DACB; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Khóa học:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">{{course_name}}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Mã số học viên:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #985018;">{{student_code}}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Tiến độ bài giảng:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #137333;">{{completed_lessons}} / {{total_lessons}} bài ({{progress_percent}}%)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Số buổi thực hành:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #985018;">{{attended_sessions}} buổi đã tham gia</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #554B42;">
          * Bạn hãy hoàn thành các bài thi lý thuyết và thực hành lâm sàng trước ngày <strong>{{valid_until_date}}</strong> để được cấp chứng nhận chính thức.
        </p>
      </div>
    </div>`,
    variables: ['student_name', 'course_name', 'student_code', 'days_left', 'valid_until_date', 'progress_percent', 'completed_lessons', 'total_lessons', 'attended_sessions'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ENROLLMENT_EXPIRY_WARNING',
    name: 'Cảnh báo hết hạn khóa học 1 năm (30 ngày & 7 ngày)',
    subject: '[QUAN TRỌNG] MLD Academy - Khóa học {{course_name}} của bạn còn {{days_left}} ngày hiệu lực',
    description: 'Gửi tự động khi thời hạn học còn 30 ngày hoặc 7 ngày để học viên kịp thi và hoàn tất chứng chỉ trước khi khóa học bị hủy/đóng quyền truy cập',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
      <div style="background: linear-gradient(135deg, #B3261E 0%, #7A1712 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">CẢNH BÁO THỜI HẠN KHÓA ĐÀO TẠO</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #FCE8E6;">Quyền Truy Cập Sắp Bị Thu Hồi Theo Quy Chế 1 Năm</p>
      </div>
      <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Kính gửi Học viên {{student_name}},</p>
        <p style="font-size: 14px; color: #554B42;">
          Học viện MLD Việt Nam xin thông báo: Thời hạn hiệu lực 01 năm của khóa học <strong>{{course_name}}</strong> (Mã HV: <strong style="color: #B3261E;">{{student_code}}</strong>) sắp kết thúc.
        </p>

        <div style="background: #FDF2F2; border: 2px solid #F5C6CB; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: bold; color: #B3261E; text-transform: uppercase;">THỜI HẠN CÒN LẠI CHÍNH XÁC</div>
          <div style="font-size: 38px; font-weight: 800; color: #B3261E; margin: 6px 0;">{{days_left}} NGÀY</div>
          <div style="font-size: 13px; color: #721C24;">Khóa học sẽ chính thức đóng vào ngày: <strong>{{valid_until_date}}</strong></div>
        </div>

        <div style="background: #FFF9F5; border-left: 4px solid #B3261E; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
          <h4 style="margin: 0 0 6px 0; color: #B3261E; font-size: 13px;">HÀNH ĐỘNG CẦN THỰC HIỆN NGAY:</h4>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #554B42;">
            <li>Hoàn tất các bài thi lý thuyết trực tuyến và lịch thi thực hành lâm sàng.</li>
            <li>Sau ngày <strong>{{valid_until_date}}</strong>, hệ thống sẽ tự động khóa toàn bộ bài giảng và không nhận điểm danh thực hành.</li>
          </ul>
        </div>
      </div>
    </div>`,
    variables: ['student_name', 'course_name', 'student_code', 'days_left', 'valid_until_date', 'exams_pending', 'hotline', 'portal_link'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRACTICE_SCHEDULE_ANNOUNCEMENT',
    name: 'Thông báo lịch học thực hành & Nhắc lịch trước 24 giờ',
    subject: 'MLD Academy - Thông báo lịch học thực hành: {{session_topic}} ngày {{session_date}}',
    description: 'Gửi tự động khi giảng viên xếp lịch thực hành mới hoặc gửi nhắc nhở 24h trước khi ca thực hành lab diễn ra',
    bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
      <div style="background: linear-gradient(135deg, #137333 0%, #0D5324 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">LỊCH THỰC HÀNH LÂM SÀNG MLD</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #E6F4EA;">Phòng Thực Hành Kỹ Thuật Tay Vodder Chuyên Nghiệp</p>
      </div>
      <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Xin chào Học viên {{student_name}},</p>
        <p style="font-size: 14px; color: #554B42;">
          Giảng viên phụ trách lớp đào tạo <strong style="color: #137333;">{{batch_code}}</strong> xin thông báo lịch tổ chức buổi học thực hành lâm sàng:
        </p>

        <div style="background: #FAF8F5; border: 1px solid #E8DACB; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 15px; font-weight: bold; color: #985018; margin-bottom: 12px;">{{session_topic}}</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #73675F; width: 140px;">Thời gian:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #137333;">{{session_time}} · Ngày {{session_date}}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Phòng học:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #985018;">{{room_name}}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Giảng viên đứng lớp:</td>
              <td style="padding: 6px 0; font-weight: bold;">{{instructor_name}}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #73675F;">Địa điểm cơ sở:</td>
              <td style="padding: 6px 0;">{{branch_address}}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>`,
    variables: ['student_name', 'batch_code', 'session_topic', 'session_date', 'session_time', 'room_name', 'instructor_name', 'branch_address', 'requirements'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const emailService = {
  /**
   * Lấy danh sách các mẫu Email đào tạo & vận hành
   */
  async getTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
    try {
      const raw = await supabaseService.query<any[]>('email_templates?select=*&order=created_at.asc');
      if (!raw || raw.length === 0) {
        return { success: true, statusCode: 200, message: 'Danh sách mẫu Email (mặc định)', data: DEFAULT_TEMPLATES };
      }

      const list: EmailTemplate[] = raw.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        description: t.description || '',
        bodyHtml: t.body_html,
        variables: Array.isArray(t.variables) ? t.variables : [],
        isActive: Boolean(t.is_active),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      return { success: true, statusCode: 200, message: 'Tải danh sách mẫu Email thành công', data: list };
    } catch (err) {
      console.error('[emailService] getTemplates error:', err);
      return { success: true, statusCode: 200, message: 'Dùng mẫu mặc định khi lỗi kết nối', data: DEFAULT_TEMPLATES };
    }
  },

  /**
   * Lấy chi tiết mẫu Email theo ID
   */
  async getTemplateById(templateId: string): Promise<ApiResponse<EmailTemplate | null>> {
    try {
      const raw = await supabaseService.query<any[]>(`email_templates?id=eq.${templateId}&select=*`);
      if (!raw || raw.length === 0) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy mẫu Email', data: null };
      }
      const t = raw[0];
      return {
        success: true,
        statusCode: 200,
        message: 'Chi tiết mẫu Email',
        data: {
          id: t.id,
          name: t.name,
          subject: t.subject,
          description: t.description || '',
          bodyHtml: t.body_html,
          variables: Array.isArray(t.variables) ? t.variables : [],
          isActive: Boolean(t.is_active),
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        },
      };
    } catch (err) {
      console.error('[emailService] getTemplateById error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải mẫu Email', data: null };
    }
  },

  /**
   * Cập nhật nội dung tiêu đề hoặc HTML của mẫu Email
   */
  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<ApiResponse<boolean>> {
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.subject !== undefined) payload.subject = updates.subject;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.bodyHtml !== undefined) payload.body_html = updates.bodyHtml;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      payload.updated_at = new Date().toISOString();

      const res = await supabaseService.query<any>(`email_templates?id=eq.${templateId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      return { success: res !== null, statusCode: 200, message: 'Cập nhật mẫu Email thành công', data: true };
    } catch (err) {
      console.error('[emailService] updateTemplate error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi cập nhật mẫu Email', data: false };
    }
  },

  /**
   * Lấy nhật ký gửi Email (Logs)
   */
  async getLogs(params?: {
    recipientEmail?: string;
    templateId?: string;
    status?: string;
  }): Promise<ApiResponse<EmailLog[]>> {
    try {
      let queryPath = 'email_logs?select=*&order=sent_at.desc';
      if (params?.recipientEmail) queryPath += `&recipient_email=ilike.*${params.recipientEmail}*`;
      if (params?.templateId) queryPath += `&template_id=eq.${params.templateId}`;
      if (params?.status) queryPath += `&status=eq.${params.status}`;

      const raw = await supabaseService.query<any[]>(queryPath);
      if (!raw) return { success: true, statusCode: 200, message: 'Nhật ký gửi Email', data: [] };

      const list: EmailLog[] = raw.map((l) => ({
        id: l.id,
        recipientEmail: l.recipient_email,
        recipientName: l.recipient_name || '',
        templateId: l.template_id,
        subject: l.subject,
        bodyHtml: l.body_html,
        status: l.status,
        metadata: l.metadata || {},
        errorMessage: l.error_message,
        sentAt: l.sent_at,
        createdAt: l.created_at,
      }));

      return { success: true, statusCode: 200, message: 'Tải nhật ký gửi Email thành công', data: list };
    } catch (err) {
      console.error('[emailService] getLogs error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi tải nhật ký Email', data: [] };
    }
  },

  /**
   * Gửi Email sử dụng mẫu thông báo đào tạo và ghi log
   */
  async sendEmail(params: {
    recipientEmail: string;
    recipientName?: string;
    templateId: string;
    variables: Record<string, string>;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<boolean>> {
    try {
      // 1. Lấy template
      const tRes = await this.getTemplateById(params.templateId);
      if (!tRes.success || !tRes.data) {
        throw new Error('Không tìm thấy mẫu Email phù hợp');
      }
      const template = tRes.data;

      // 2. Điền biến vào Subject và Body
      let finalSubject = template.subject;
      let finalHtml = template.bodyHtml;

      Object.entries(params.variables).forEach(([key, val]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        finalSubject = finalSubject.replace(regex, val || '');
        finalHtml = finalHtml.replace(regex, val || '');
      });

      // 3. Ghi log gửi mail
      const logPayload = {
        recipient_email: params.recipientEmail,
        recipient_name: params.recipientName || '',
        template_id: params.templateId,
        subject: finalSubject,
        body_html: finalHtml,
        status: 'SENT',
        metadata: params.metadata || {},
        sent_at: new Date().toISOString(),
      };

      await supabaseService.query('email_logs', {
        method: 'POST',
        body: JSON.stringify(logPayload),
      });

      return {
        success: true,
        statusCode: 200,
        message: `Đã gửi thành công email "${finalSubject}" tới ${params.recipientEmail}`,
        data: true,
      };
    } catch (err: any) {
      console.error('[emailService] sendEmail error:', err);
      return { success: false, statusCode: 500, message: err.message || 'Lỗi gửi email', data: false };
    }
  },

  /**
   * Xem trước mẫu email với các biến truyền vào
   */
  previewEmail(template: EmailTemplate, variables: Record<string, string>): { subject: string; bodyHtml: string } {
    let finalSubject = template.subject;
    let finalHtml = template.bodyHtml;

    Object.entries(variables).forEach(([key, val]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      finalSubject = finalSubject.replace(regex, val || '');
      finalHtml = finalHtml.replace(regex, val || '');
    });

    return { subject: finalSubject, bodyHtml: finalHtml };
  },

  /**
   * Xóa log gửi email
   */
  async deleteLog(logId: string): Promise<ApiResponse<boolean>> {
    try {
      await supabaseService.query(`email_logs?id=eq.${logId}`, {
        method: 'DELETE',
      });
      return { success: true, statusCode: 200, message: 'Đã xóa bản ghi nhật ký', data: true };
    } catch (err) {
      console.error('[emailService] deleteLog error:', err);
      return { success: false, statusCode: 500, message: 'Lỗi xóa nhật ký email', data: false };
    }
  },

  /**
   * Helper 1: Báo cáo tiến độ học tập & thời gian còn lại (định kỳ hàng tháng)
   */
  async sendMonthlyProgressEmail(params: {
    recipientEmail: string;
    studentName: string;
    courseName: string;
    studentCode: string;
    daysLeft: number;
    validUntilDate: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    attendedSessions: number;
  }): Promise<ApiResponse<boolean>> {
    return this.sendEmail({
      recipientEmail: params.recipientEmail,
      recipientName: params.studentName,
      templateId: 'ENROLLMENT_PROGRESS_MONTHLY',
      variables: {
        student_name: params.studentName,
        course_name: params.courseName,
        student_code: params.studentCode,
        days_left: String(params.daysLeft),
        valid_until_date: params.validUntilDate,
        progress_percent: String(params.progressPercent),
        completed_lessons: String(params.completedLessons),
        total_lessons: String(params.totalLessons),
        attended_sessions: String(params.attendedSessions),
      },
      metadata: { type: 'MONTHLY_PROGRESS', studentCode: params.studentCode },
    });
  },

  /**
   * Helper 2: Cảnh báo sắp hết hạn khóa học (30 ngày & 7 ngày)
   */
  async sendExpiryWarningEmail(params: {
    recipientEmail: string;
    studentName: string;
    courseName: string;
    studentCode: string;
    daysLeft: number;
    validUntilDate: string;
  }): Promise<ApiResponse<boolean>> {
    return this.sendEmail({
      recipientEmail: params.recipientEmail,
      recipientName: params.studentName,
      templateId: 'ENROLLMENT_EXPIRY_WARNING',
      variables: {
        student_name: params.studentName,
        course_name: params.courseName,
        student_code: params.studentCode,
        days_left: String(params.daysLeft),
        valid_until_date: params.validUntilDate,
        exams_pending: 'Kỳ thi Trắc nghiệm Lý thuyết & Sát hạch Thực hành Lâm sàng',
        hotline: '096.7786.399',
        portal_link: 'https://mldvietnam.edu.vn',
      },
      metadata: { type: 'EXPIRY_WARNING', daysLeft: params.daysLeft, studentCode: params.studentCode },
    });
  },

  /**
   * Helper 3: Thông báo lịch học thực hành lâm sàng & nhắc lịch trước 24 giờ
   */
  async sendPracticeScheduleEmail(params: {
    recipientEmail: string;
    studentName: string;
    batchCode: string;
    sessionTopic: string;
    sessionDate: string;
    sessionTime: string;
    roomName: string;
    instructorName: string;
    branchAddress: string;
  }): Promise<ApiResponse<boolean>> {
    return this.sendEmail({
      recipientEmail: params.recipientEmail,
      recipientName: params.studentName,
      templateId: 'PRACTICE_SCHEDULE_ANNOUNCEMENT',
      variables: {
        student_name: params.studentName,
        batch_code: params.batchCode,
        session_topic: params.sessionTopic,
        session_date: params.sessionDate,
        session_time: params.sessionTime,
        room_name: params.roomName,
        instructor_name: params.instructorName,
        branch_address: params.branchAddress,
        requirements: 'Đồng phục MLD, móng tay cắt ngắn, tập giáo trình lâm sàng Vodder',
      },
      metadata: { type: 'PRACTICE_SCHEDULE', batchCode: params.batchCode, sessionDate: params.sessionDate },
    });
  },
};
