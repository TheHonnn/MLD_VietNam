const nodemailer = require('nodemailer');

const TEMPLATE_ALIASES = {
  REMINDER_CLASS_SESSION: 'CLASS_SCHEDULE_REMINDER',
  CLASS_SCHEDULE_REMINDER: 'REMINDER_CLASS_SESSION',
  EXAM_RESULTS_NOTIFICATION: 'EXAM_RESULT_AND_CERTIFICATE',
  EXAM_RESULT_AND_CERTIFICATE: 'EXAM_RESULTS_NOTIFICATION',
  CERTIFICATE_ISSUED_VERIFICATION: 'COURSE_EXPIRY_WARNING',
  COURSE_EXPIRY_WARNING: 'CERTIFICATE_ISSUED_VERIFICATION'
};

const DEFAULT_TEMPLATES = {
  CONFIRMATION_ENROLLMENT: {
    subject: 'MLD Việt Nam - Xác nhận đăng ký khóa học thành công: {{course_name}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
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
  </div>`
  },
  CLASS_SCHEDULE_REMINDER: {
    subject: 'MLD Việt Nam - Nhắc lịch buổi học: {{class_title}} vào ngày {{study_date}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
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
  </div>`
  },
  REMINDER_CLASS_SESSION: {
    subject: 'MLD Việt Nam - Nhắc lịch buổi học: {{class_title}} vào ngày {{study_date}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
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
  </div>`
  },
  EXAM_RESULT_AND_CERTIFICATE: {
    subject: 'MLD Việt Nam - Chúc mừng bạn đã hoàn thành khóa thi: {{course_name}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
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
  </div>`
  },
  EXAM_RESULTS_NOTIFICATION: {
    subject: 'MLD Việt Nam - Chúc mừng bạn đã hoàn thành khóa thi: {{course_name}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
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
  </div>`
  },
  COURSE_EXPIRY_WARNING: {
    subject: 'MLD Việt Nam - Cảnh báo: Thời hạn học trực tuyến khóa {{course_name}} sắp hết',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: #2C241E; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h2 style="color: #FAF0E4; margin: 0; font-size: 20px;">CẢNH BÁO THỜI HẠN VIDEO BÀI GIẢNG</h2>
    </div>
    <div style="background: #FAF8F5; padding: 30px 25px; border: 1px solid #BA7E4C; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="font-size: 15px;">Kính gửi Học viên <strong>{{student_name}}</strong>,</p>
      <p>Thời hạn truy cập kho bài giảng video của khóa học <strong>{{course_name}}</strong> sắp hết hiệu lực vào ngày <strong>{{expiry_date}}</strong>.</p>
      <p style="font-size: 13px; color: #73675F;">Vui lòng hoàn tất xem video bài giảng và ôn tập trước ngày hết hạn để đảm bảo kết quả tốt nhất.</p>
    </div>
  </div>`
  },
  CERTIFICATE_ISSUED_VERIFICATION: {
    subject: 'MLD Việt Nam - Tra cứu Chứng nhận điện tử hợp lệ: {{certificate_code}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
    <div style="background: #2C241E; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h2 style="color: #FAF0E4; margin: 0; font-size: 20px;">CHỨNG NHẬN ĐIỆN TỬ MLD CHÍNH THỨC</h2>
    </div>
    <div style="background: #FAF8F5; padding: 30px 25px; border: 1px solid #BA7E4C; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
      <p style="font-size: 15px; margin-bottom: 20px;">Chứng nhận hoàn thành kỹ thuật Dẫn lưu Bạch huyết Quốc tế cấp cho:</p>
      <h3 style="font-size: 22px; color: #985018; margin: 0 0 10px 0;">{{student_name}}</h3>
      <p style="font-size: 13px; color: #554B42; margin-bottom: 25px;">Mã số Chứng nhận: <strong style="font-family: monospace; color: #2C241E; font-size: 15px;">{{certificate_code}}</strong></p>
      <p style="font-size: 11px; color: #73675F; margin-top: 25px;">Chứng nhận có giá trị đối chiếu trên Cổng Dữ Liệu Quốc Gia MLD Việt Nam.</p>
    </div>
  </div>`
  },
  ENROLLMENT_PROGRESS_MONTHLY: {
    subject: 'MLD Academy - Báo cáo tiến độ học tập & Thời hạn khóa học: {{course_name}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
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
          </table>
        </div>
      </div>
    </div>`
  },
  ENROLLMENT_EXPIRY_WARNING: {
    subject: '[QUAN TRỌNG] MLD Academy - Khóa học {{course_name}} của bạn còn {{days_left}} ngày hiệu lực',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
      <div style="background: linear-gradient(135deg, #B3261E 0%, #7A1712 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">CẢNH BÁO THỜI HẠN KHÓA ĐÀO TẠO</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #FCE8E6;">Quyền Truy Cập Sắp Bị Thu Hồi Theo Quy Chế 1 Năm</p>
      </div>
      <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Kính gửi Học viên {{student_name}},</p>
        <p style="font-size: 14px; color: #554B42;">
          Học viện MLD Việt Nam xin thông báo: Thời hạn hiệu lực 01 năm của khóa học <strong>{{course_name}}</strong> sắp kết thúc.
        </p>
        <div style="background: #FDF2F2; border: 2px solid #F5C6CB; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: bold; color: #B3261E; text-transform: uppercase;">THỜI HẠN CÒN LẠI CHÍNH XÁC</div>
          <div style="font-size: 38px; font-weight: 800; color: #B3261E; margin: 6px 0;">{{days_left}} NGÀY</div>
          <div style="font-size: 13px; color: #721C24;">Khóa học sẽ chính thức đóng vào ngày: <strong>{{valid_until_date}}</strong></div>
        </div>
      </div>
    </div>`
  },
  PRACTICE_SCHEDULE_ANNOUNCEMENT: {
    subject: 'MLD Academy - Thông báo lịch học thực hành: {{session_topic}} ngày {{session_date}}',
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
      <div style="background: linear-gradient(135deg, #137333 0%, #0D5324 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: bold;">LỊCH THỰC HÀNH LÂM SÀNG MLD</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #E6F4EA;">Phòng Thực Hành Kỹ Thuật Tay Vodder Chuyên Nghiệp</p>
      </div>
      <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Xin chào Học viên {{student_name}},</p>
        <p style="font-size: 14px; color: #554B42;">
          Giảng viên phụ trách lớp đào tạo <strong style="color: #137333;">{{batch_code}}</strong> xin thông báo lịch tổ chức buổi học thực hành:
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
          </table>
        </div>
      </div>
    </div>`
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-MLD-Local-Admin, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ success: true, message: 'MLD Email Test API Ready' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { recipientEmail, recipientName, templateId = 'CONFIRMATION_ENROLLMENT', variables = {}, metadata = {} } = body || {};

  if (!recipientEmail || !recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Địa chỉ email người nhận không hợp lệ.'
    });
  }

  const targetEmail = recipientEmail.trim();

  // 1. Kiểm tra từ Supabase Cloud REST trước (nếu có cấu hình)
  const DEFAULT_SUPABASE_URL = 'https://wstvwushpwcdsmhpunvh.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzdHZ3dXNocHdjZHNtaHB1bnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMTk0MjAsImV4cCI6MjEwNzU5NTQyMH0.1mDiB0Rsst_nyseC5k-AyfLOwYTRe96ZzQ4yHEU5Z58';

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  let subject = '';
  let bodyHtml = '';
  let templateFound = false;

  const candidateIds = [templateId];
  if (TEMPLATE_ALIASES[templateId]) {
    candidateIds.push(TEMPLATE_ALIASES[templateId]);
  }

  if (supabaseUrl && supabaseKey) {
    for (const candId of candidateIds) {
      try {
        const tmplRes = await fetch(`${supabaseUrl}/rest/v1/email_templates?id=eq.${encodeURIComponent(candId)}&is_active=eq.true&select=subject,body_html`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (tmplRes.ok) {
          const tmpls = await tmplRes.json();
          if (Array.isArray(tmpls) && tmpls.length > 0 && tmpls[0].body_html) {
            subject = tmpls[0].subject || '';
            bodyHtml = tmpls[0].body_html || '';
            templateFound = true;
            break;
          }
        }
      } catch (tmplErr) {
        console.warn(`[Vercel Email] Không thể tải template ${candId} từ Supabase:`, tmplErr.message);
      }
    }
  }

  // 2. Dự phòng từ từ điển tích hợp sẵn
  if (!templateFound) {
    for (const candId of candidateIds) {
      if (DEFAULT_TEMPLATES[candId]) {
        subject = DEFAULT_TEMPLATES[candId].subject;
        bodyHtml = DEFAULT_TEMPLATES[candId].html;
        templateFound = true;
        break;
      }
    }
  }

  if (!templateFound) {
    const fallback = DEFAULT_TEMPLATES.CONFIRMATION_ENROLLMENT;
    subject = fallback.subject;
    bodyHtml = fallback.html;
  }

  const defaultVars = {
    student_name: recipientName || 'Học viên',
    course_name: 'K26-CDT-Q3 — Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT',
    student_code: 'KH-20261028-001',
    start_date: '12/11/2026',
    branch_address: 'Học viện MLD Việt Nam — CS1 Hà Nội',
    paid_amount: '15,000,000',
    class_title: 'Kỹ thuật dẫn lưu Vodder cơ bản',
    time_slot: '18:00 - 21:00',
    study_date: '12/11/2026',
    room_name: 'Phòng thực hành lâm sàng 201',
    instructor_name: 'Bác sĩ CK1 Vũ Lan Anh',
    theory_score: '95',
    practice_score: '98',
    certificate_code: 'MLD-2026-CERT-001',
    days_left: '30',
    valid_until_date: '12/11/2027',
    session_topic: 'Kỹ thuật băng ép áp lực đa lớp CDT',
    session_date: '15/11/2026',
    session_time: '18:00 - 21:00',
    batch_code: 'Lớp CDT-K26'
  };

  const mergedVars = { ...defaultVars, ...variables };
  for (const [k, v] of Object.entries(mergedVars)) {
    const regex = new RegExp(`{{${k}}}`, 'g');
    subject = subject.replace(regex, v || '');
    bodyHtml = bodyHtml.replace(regex, v || '');
  }

  try {
    let smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    let smtpPort = Number(process.env.SMTP_PORT) || 587;
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS;
    let senderEmail = process.env.MAIL_FROM_ADDRESS || 'xuantruong.dev26@gmail.com';
    let senderName = process.env.MAIL_FROM_NAME || 'MLD Việt Nam';

    // Tự động nạp cấu hình Brevo SMTP từ Supabase RPC nếu môi trường Vercel chưa có biến
    if ((!smtpUser || !smtpPass) && supabaseUrl && supabaseKey) {
      try {
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_smtp_credentials`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (rpcRes.ok) {
          const cfg = await rpcRes.json();
          if (cfg && cfg.user && cfg.pass) {
            smtpHost = cfg.host || smtpHost;
            smtpPort = Number(cfg.port) || smtpPort;
            smtpUser = cfg.user;
            smtpPass = cfg.pass;
            senderEmail = cfg.from_address || senderEmail;
            senderName = cfg.from_name || senderName;
          }
        }
      } catch (rpcErr) {
        console.warn('[Vercel Email] Không thể nạp SMTP từ Supabase RPC:', rpcErr.message);
      }
    }

    if (!smtpUser || !smtpPass) {
      throw new Error('Chưa cấu hình tài khoản SMTP (SMTP_USER / SMTP_PASS).');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: targetEmail,
      subject,
      html: bodyHtml
    });

    const isAccepted = Array.isArray(info.accepted) && info.accepted.length > 0;
    if (!isAccepted) {
      throw new Error(`Máy chủ SMTP từ chối gửi tới địa chỉ: ${targetEmail}`);
    }

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            recipient_email: targetEmail,
            recipient_name: recipientName || 'Học viên',
            template_id: templateId || 'CONFIRMATION_ENROLLMENT',
            subject,
            body_html: bodyHtml,
            status: 'SENT',
            sent_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              messageId: info.messageId,
              provider: 'Brevo SMTP Relay Vercel',
              accepted: info.accepted
            }
          })
        });
      } catch (logErr) {
        console.warn('[Vercel Email] Ghi log Supabase thất bại:', logErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Đã gửi thành công email mẫu tới ${targetEmail}`,
      data: {
        messageId: info.messageId,
        recipient: targetEmail,
        status: 'SENT'
      }
    });
  } catch (error) {
    console.error('[Vercel Email Error]:', error);

    // Ghi log lỗi vào Supabase nếu có thể
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            recipient_email: targetEmail,
            recipient_name: recipientName || 'Học viên',
            template_id: templateId || 'CONFIRMATION_ENROLLMENT',
            subject,
            body_html: bodyHtml,
            status: 'FAILED',
            error_message: error.message,
            sent_at: new Date().toISOString(),
            metadata: { ...metadata, provider: 'Brevo SMTP Relay Vercel' }
          })
        });
      } catch {}
    }

    return res.status(502).json({
      success: false,
      statusCode: 502,
      message: error.message || 'Không thể phát email qua máy chủ SMTP Relay.',
      data: { sent: false, recipient: targetEmail }
    });
  }
};
