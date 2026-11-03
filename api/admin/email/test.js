const nodemailer = require('nodemailer');

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

  const { recipientEmail, recipientName, templateId, variables = {}, metadata = {} } = body || {};

  if (!recipientEmail || !recipientEmail.trim()) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Thiếu địa chỉ email người nhận (recipientEmail).'
    });
  }

  const template = DEFAULT_TEMPLATES[templateId] || DEFAULT_TEMPLATES.CONFIRMATION_ENROLLMENT;
  let subject = template.subject;
  let bodyHtml = template.html;

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
    instructor_name: 'Bác sĩ CK1 Vũ Lan Anh'
  };

  const mergedVars = { ...defaultVars, ...variables };
  for (const [k, v] of Object.entries(mergedVars)) {
    const regex = new RegExp(`{{${k}}}`, 'g');
    subject = subject.replace(regex, v || '');
    bodyHtml = bodyHtml.replace(regex, v || '');
  }

  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

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

    const senderEmail = process.env.MAIL_FROM_ADDRESS || 'xuantruong.dev26@gmail.com';
    const senderName = process.env.MAIL_FROM_NAME || 'MLD Việt Nam';

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject,
      html: bodyHtml
    });

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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
            recipient_email: recipientEmail,
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
        console.warn('[Vercel Email] Logging to Supabase failed:', logErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Đã gửi thành công email mẫu tới ${recipientEmail}`,
      data: {
        messageId: info.messageId,
        recipient: recipientEmail,
        status: 'SENT'
      }
    });
  } catch (error) {
    console.error('[Vercel Email Error]:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || 'Không thể phát email qua máy chủ SMTP Relay.',
      data: false
    });
  }
};
