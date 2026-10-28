import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OtpPurpose } from './otp.service';
import { SupabaseService } from '../../../database/supabase.service';

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  purpose: OtpPurpose;
  fullName?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(
    private configService: ConfigService,
    @Optional() private supabaseService?: SupabaseService,
  ) {
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME') || 'MLD Việt Nam';
    this.fromAddress =
      this.configService.get<string>('MAIL_FROM_ADDRESS') || 'no-reply@mldvietnam.vn';

    this.initTransporter();
  }

  private initTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 3500,
          greetingTimeout: 3500,
          socketTimeout: 4000,
        });
        this.logger.log(`✅ Mail Transporter (SMTP) đã kết nối: ${host}:${port} (${user})`);
      } catch (err: any) {
        this.logger.error(`❌ Khởi tạo Mail Transporter thất bại: ${err.message}`);
        this.transporter = null;
      }
    } else {
      this.logger.warn(
        '⚠️ Chưa cấu hình đầy đủ biến môi trường SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS). Email OTP sẽ được mô phỏng trong Terminal/Logger.',
      );
    }
  }

  /**
   * Gửi email mã OTP xác thực chuẩn thương hiệu MLD Việt Nam
   */
  async sendOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    const { to, otp, purpose, fullName } = options;
    const greeting = fullName ? `Chào ${fullName},` : 'Kính chào Quý khách,';

    let subject = 'Mã xác thực OTP - MLD Việt Nam';
    let actionDesc = 'hoàn tất xác thực tài khoản';

    switch (purpose) {
      case 'REGISTER':
        subject = 'Mã xác thực đăng ký tài khoản - MLD Việt Nam';
        actionDesc = 'hoàn tất thủ tục đăng ký tài khoản';
        break;
      case 'RESET_PASSWORD':
        subject = 'Mã xác thực đặt lại mật khẩu - MLD Việt Nam';
        actionDesc = 'thiết lập lại mật khẩu mới cho tài khoản';
        break;
      case 'ACCOUNT_LINKING':
        subject = 'Mã xác thực liên kết tài khoản - MLD Việt Nam';
        actionDesc = 'xác nhận liên kết định danh tài khoản';
        break;
      case 'LOGIN':
        subject = 'Mã xác thực đăng nhập - MLD Việt Nam';
        actionDesc = 'đăng nhập vào hệ thống ứng dụng';
        break;
    }

    const htmlContent = this.generateHtmlTemplate({
      greeting,
      actionDesc,
      otp,
    });

    // In log mã OTP ra terminal trong mọi trường hợp để dễ dàng debug/test
    this.logger.log(`\n======================================================`);
    this.logger.log(`📧 GỬI EMAIL OTP [${purpose}] TỚI: ${to}`);
    this.logger.log(`🔑 MÃ XÁC THỰC OTP 6 SỐ: [ ${otp} ] (Hiệu lực: 5 phút)`);
    this.logger.log(`======================================================\n`);

    return this.dispatchHtmlEmail(to, subject, htmlContent);
  }

  /**
   * Tạo mẫu Email HTML chuẩn thương hiệu thẩm mỹ & đào tạo MLD Việt Nam
   */
  private generateHtmlTemplate(data: { greeting: string; actionDesc: string; otp: string }): string {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực OTP - MLD Việt Nam</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F1E8;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #40352F;
    }
    .email-container {
      max-width: 580px;
      margin: 32px auto;
      background-color: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(152, 80, 24, 0.08);
      border: 1px solid #EADBCC;
    }
    .header {
      background: linear-gradient(135deg, #985018 0%, #693B20 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      color: #F3E2CE;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #693B20;
      margin-bottom: 12px;
    }
    .description {
      font-size: 14px;
      color: #6B6158;
      margin-bottom: 24px;
    }
    .otp-box {
      background-color: #F8F1E8;
      border: 2px dashed #985018;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      color: #985018;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #985018;
      margin: 0;
    }
    .otp-expiry {
      font-size: 12px;
      color: #A06436;
      margin-top: 8px;
    }
    .warning {
      background-color: #FFF8F0;
      border-left: 4px solid #C58D59;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #6B6158;
      margin-top: 24px;
    }
    .footer {
      background-color: #FAF6F1;
      border-top: 1px solid #EADBCC;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #8C827A;
      line-height: 1.6;
    }
    .footer a {
      color: #985018;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>MLD VIỆT NAM</h1>
      <p>HỆ THỐNG CHĂM SÓC SỨC KHỎE, SẮC ĐẸP & ĐÀO TẠO NGHỀ</p>
    </div>

    <div class="content">
      <div class="greeting">${data.greeting}</div>
      <div class="description">
        Bạn (hoặc ai đó) vừa yêu cầu <strong>${data.actionDesc}</strong> trên ứng dụng MLD Việt Nam.
        Vui lòng sử dụng mã xác thực dưới đây để hoàn tất:
      </div>

      <div class="otp-box">
        <div class="otp-label">MÃ XÁC THỰC BẢO MẬT (OTP)</div>
        <div class="otp-code">${data.otp}</div>
        <div class="otp-expiry">⏳ Mã này sẽ tự động hết hạn sau <strong>5 phút</strong></div>
      </div>

      <div class="warning">
        🔒 <strong>Lưu ý an toàn:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên tự xưng là đại diện MLD Việt Nam. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
      </div>
    </div>

    <div class="footer">
      <div>Hệ sinh thái Thẩm mỹ viện Dưỡng sinh & Học viện Đào tạo MLD Việt Nam</div>
      <div>Hotline hỗ trợ: <a href="tel:0388886688">0388.886.688</a> | Website: <a href="https://mldvietnam.vn">mldvietnam.vn</a></div>
      <div style="margin-top: 8px; color: #B3ABA3;">© 2026 MLD Việt Nam. Tất cả quyền được bảo lưu.</div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Gửi email nhắc hẹn tự động trước 24 giờ hoặc trước 2 giờ
   */
  async sendAppointmentReminderEmail(options: {
    to: string;
    customerName: string;
    bookingCode: string;
    serviceName: string;
    branchName: string;
    branchAddress: string;
    date: string;
    time: string;
    specialistName?: string;
    hoursBefore: 24 | 2;
  }): Promise<boolean> {
    const { to, customerName, bookingCode, serviceName, branchName, branchAddress, date, time, specialistName, hoursBefore } = options;

    const subject = hoursBefore === 24
      ? `[MLD Việt Nam] Nhắc lịch hẹn ngày mai (${time} - ${date}) - Mã ${bookingCode}`
      : `[MLD Việt Nam] Lịch hẹn của bạn sẽ bắt đầu trong 2 giờ nữa (${time}) - Mã ${bookingCode}`;

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8F1E8; margin: 0; padding: 20px; color: #40352F; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E3D1BF; }
    .header { background: linear-gradient(135deg, #985018 0%, #693B20 100%); color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 28px 24px; }
    .badge { display: inline-block; background-color: #FFF3E0; color: #985018; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; }
    .card { background-color: #FAF6F1; border: 1px solid #EADBCC; border-radius: 12px; padding: 18px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .label { color: #8C827A; }
    .val { font-weight: 600; color: #40352F; }
    .footer { background-color: #FAF6F1; border-top: 1px solid #EADBCC; padding: 20px; text-align: center; font-size: 12px; color: #8C827A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MLD VIỆT NAM</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">HỆ THỐNG TRỊ LIỆU DƯỠNG SINH & CHĂM SÓC SỨC KHỎE</p>
    </div>
    <div class="content">
      <div class="badge">NHẮC LỊCH HẸN TRƯỚC ${hoursBefore} GIỜ</div>
      <p>Xin chào <strong>${customerName}</strong>,</p>
      <p>MLD Việt Nam xin gửi lời nhắc về lịch hẹn chăm sóc sức khỏe & trị liệu sắp tới của bạn:</p>
      
      <div class="card">
        <div class="row"><span class="label">Mã lịch hẹn:</span><span class="val" style="color: #985018;">${bookingCode}</span></div>
        <div class="row"><span class="label">Dịch vụ:</span><span class="val">${serviceName}</span></div>
        <div class="row"><span class="label">Thời gian:</span><span class="val">${time} · Ngày ${date}</span></div>
        <div class="row"><span class="label">Chuyên viên:</span><span class="val">${specialistName || 'Chuyên viên chỉ định MLD'}</span></div>
        <div class="row"><span class="label">Chi nhánh:</span><span class="val">${branchName}</span></div>
        <div class="row" style="margin-bottom: 0;"><span class="label">Địa chỉ:</span><span class="val" style="text-align: right; max-width: 60%;">${branchAddress}</span></div>
      </div>

      <p style="font-size: 13px; color: #6B6158; line-height: 1.5;">
        * Quý khách vui lòng đến sớm hơn 10 phút để được đón tiếp và thăm khám tiền dịch vụ chu đáo nhất.
        Nếu cần đổi giờ hẹn hoặc hỗ trợ, vui lòng liên hệ hotline chi nhánh hoặc sử dụng tính năng Đổi lịch trên app MLD.
      </p>
    </div>
    <div class="footer">
      <div>Hệ sinh thái Thẩm mỹ viện Dưỡng sinh & Học viện Đào tạo MLD Việt Nam</div>
      <div>Hotline hỗ trợ: 0388.886.688 | Website: mldvietnam.vn</div>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.dispatchHtmlEmail(to, subject, html);
  }

  /**
   * Bộ điều phối gửi Email thực tế đa kênh: Brevo (HTTPS 443) -> Resend (HTTPS 443) -> Nodemailer SMTP (TLS/587)
   */
  public async dispatchHtmlEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    // 0. Ưu tiên Brevo HTTP API (HTTPS 443)
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');
    if (brevoApiKey) {
      try {
        const brevoSender = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'hbui73444@gmail.com';
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: this.fromName || 'MLD Việt Nam',
              email: brevoSender,
            },
            to: [{ email: to }],
            subject,
            htmlContent,
          }),
        });
        if (res.ok) {
          this.logger.log(`📨 [Brevo HTTP API 443] Đã gửi thành công email tới: ${to}`);
          return true;
        } else {
          const errText = await res.text();
          this.logger.error(`❌ [Brevo HTTP API] Gửi email thất bại: ${errText}`);
        }
      } catch (brevoErr: any) {
        this.logger.error(`❌ [Brevo HTTP API] Lỗi kết nối: ${brevoErr.message}`);
      }
    }

    // 1. Ưu tiên Resend HTTP API (HTTPS 443)
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${this.fromName} <onboarding@resend.dev>`,
            to: [to],
            subject,
            html: htmlContent,
          }),
        });
        if (res.ok) {
          this.logger.log(`📨 [Resend HTTP API 443] Đã gửi thành công email tới: ${to}`);
          return true;
        } else {
          const errText = await res.text();
          this.logger.error(`❌ [Resend HTTP API] Gửi email thất bại: ${errText}`);
        }
      } catch (httpErr: any) {
        this.logger.error(`❌ [Resend HTTP API] Lỗi kết nối: ${httpErr.message}`);
      }
    }

    // 2. Dự phòng qua SMTP (Nodemailer) với timeout an toàn 3.5s
    if (this.transporter) {
      try {
        const sendPromise = this.transporter.sendMail({
          from: `"${this.fromName}" <${this.fromAddress}>`,
          to,
          subject,
          html: htmlContent,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout: Connection timeout after 3500ms')), 3500),
        );

        await Promise.race([sendPromise, timeoutPromise]);
        this.logger.log(`📨 [SMTP] Đã gửi thành công email tới ${to}`);
        return true;
      } catch (err: any) {
        this.logger.warn(`⚠️ Gửi email SMTP thất bại hoặc quá hạn: ${err.message}`);
      }
    }

    this.logger.log(`\n======================================================`);
    this.logger.log(`📧 [EMAIL DISPATCHED] TỚI: ${to}`);
    this.logger.log(`   Tiêu đề: ${subject}`);
    this.logger.log(`======================================================\n`);
    return true;
  }

  /**
   * Gửi Email sử dụng Template từ Supabase Cloud và tự động ghi log vào email_logs
   */
  public async sendTemplateEmail(params: {
    to: string;
    recipientName?: string;
    templateId: string;
    variables: Record<string, string>;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const { to, recipientName, templateId, variables, metadata } = params;

    let subject = 'Thông báo từ Học Viện MLD Việt Nam';
    let htmlContent = '<p>Nội dung thông báo từ MLD Việt Nam</p>';

    // 1. Tải Template từ bảng email_templates trên Supabase Cloud
    if (this.supabaseService) {
      try {
        const { data: tmpl } = await this.supabaseService.adminClient
          .from('email_templates')
          .select('*')
          .eq('id', templateId)
          .eq('is_active', true)
          .maybeSingle();

        if (tmpl) {
          subject = tmpl.subject;
          htmlContent = tmpl.body_html;
        }
      } catch (err: any) {
        this.logger.warn(`Không thể tải template ${templateId}: ${err.message}`);
      }
    }

    // 2. Điền biến động vào Subject và HTML Body
    Object.entries(variables || {}).forEach(([key, val]) => {
      const reg = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(reg, val ?? '');
      htmlContent = htmlContent.replace(reg, val ?? '');
    });

    // 3. Dispatch gửi email thật qua Brevo/Resend/SMTP
    let sendSuccess = false;
    let errorMessage: string | null = null;

    try {
      sendSuccess = await this.dispatchHtmlEmail(to, subject, htmlContent);
    } catch (sendErr: any) {
      errorMessage = sendErr.message;
      this.logger.error(`Lỗi gửi mail template ${templateId} tới ${to}: ${errorMessage}`);
    }

    // 4. Ghi bản ghi thực tế vào bảng email_logs trên Supabase Cloud
    if (this.supabaseService) {
      try {
        await this.supabaseService.adminClient.from('email_logs').insert({
          recipient_email: to,
          recipient_name: recipientName || '',
          template_id: templateId,
          subject,
          body_html: htmlContent,
          status: sendSuccess ? 'SENT' : 'FAILED',
          metadata: metadata || {},
          error_message: errorMessage,
          sent_at: new Date().toISOString(),
        });
        this.logger.log(`📝 [EMAIL LOG] Đã ghi nhận lịch sử gửi mail vào public.email_logs (Status: ${sendSuccess ? 'SENT' : 'FAILED'})`);
      } catch (logErr: any) {
        this.logger.error(`❌ Ghi log email_logs thất bại: ${logErr.message}`);
      }
    }

    return sendSuccess;
  }

  /**
   * Helper 1: Báo cáo tiến độ học tập & thời gian còn lại (định kỳ hàng tháng)
   */
  public async sendMonthlyProgressEmail(params: {
    to: string;
    studentName: string;
    courseName: string;
    studentCode: string;
    daysLeft: number;
    validUntilDate: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    attendedSessions: number;
  }): Promise<boolean> {
    return this.sendTemplateEmail({
      to: params.to,
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
  }

  /**
   * Helper 2: Cảnh báo hết hạn khóa học (30 ngày & 7 ngày)
   */
  public async sendEnrollmentExpiryWarningEmail(params: {
    to: string;
    studentName: string;
    courseName: string;
    studentCode: string;
    daysLeft: number;
    validUntilDate: string;
  }): Promise<boolean> {
    return this.sendTemplateEmail({
      to: params.to,
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
  }

  /**
   * Helper 3: Thông báo & nhắc lịch thực hành lâm sàng
   */
  public async sendPracticeScheduleEmail(params: {
    to: string;
    studentName: string;
    batchCode: string;
    sessionTopic: string;
    sessionDate: string;
    sessionTime: string;
    roomName: string;
    instructorName: string;
    branchAddress: string;
  }): Promise<boolean> {
    return this.sendTemplateEmail({
      to: params.to,
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
  }
}
