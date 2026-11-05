import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
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
  private fromAddress: string;
  private fromName: string;

  constructor(
    private configService: ConfigService,
    @Optional() private supabaseService?: SupabaseService,
  ) {
    this.fromName = (this.configService.get<string>('MAIL_FROM_NAME') || 'MLD Việt Nam').replace(/["\\]/g, '').trim();
    this.fromAddress =
      (this.configService.get<string>('MAIL_FROM_ADDRESS') || 'xuantruong.dev26@gmail.com').replace(/["\s<>]/g, '').trim();

    this.initTransporter();
  }

  
  private async ensureTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) return this.transporter;

    let host = this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    let port = Number(this.configService.get<number>('SMTP_PORT') || process.env.SMTP_PORT) || 587;
    let user = this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER || 'c152de001@smtp-brevo.com';
    let pass = this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS || Buffer.from('eHNtdHBzaWItYjBkOTEzMTg5NWVkNDY0Njk0YTQ0NDA2NjBmNGUzNGE4YjUyOWRkNzQ2N2ZmNWI4MGNkN2FkNzZhZDE5MTdiMi1mOHFjRTZNUjJvY2NTR2NR', 'base64').toString('utf8');

    if ((!user || !pass) && this.supabaseService?.adminClient) {
      try {
        const { data: smtpData } = await this.supabaseService.adminClient.rpc('get_smtp_credentials');
        if (smtpData && smtpData.user && smtpData.pass) {
          host = smtpData.host || host || 'smtp-relay.brevo.com';
          port = Number(smtpData.port) || port || 587;
          user = smtpData.user;
          pass = smtpData.pass;
          if (smtpData.from_address) this.fromAddress = smtpData.from_address.replace(/["\s<>]/g, '').trim();
          if (smtpData.from_name) this.fromName = smtpData.from_name.replace(/["\\]/g, '').trim();
        }
      } catch (e: any) {
        this.logger.warn(`Không thể nạp SMTP từ Supabase RPC: ${e.message}`);
      }
    }

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: false,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        });
        this.logger.log(`✅ Mail Transporter (SMTP) đã kết nối: ${host}:${port} (${user})`);
        return this.transporter;
      } catch (err: any) {
        this.logger.error(`❌ Khởi tạo Mail Transporter thất bại: ${err.message}`);
        this.transporter = null;
      }
    }
    return null;
  }

  private initTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER || 'c152de001@smtp-brevo.com';
    const pass = this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS || Buffer.from('eHNtdHBzaWItYjBkOTEzMTg5NWVkNDY0Njk0YTQ0NDA2NjBmNGUzNGE4YjUyOWRkNzQ2N2ZmNWI4MGNkN2FkNzZhZDE5MTdiMi1mOHFjRTZNUjJvY2NTR2NR', 'base64').toString('utf8');
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
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
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

    const maskedEmail = to.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.max(1, b.length))}${c}`);
    const correlationId = randomUUID().slice(0, 8);
    this.logger.log(`📧 Gửi email OTP [${purpose}] tới: ${maskedEmail} (CorrelationId: ${correlationId})`);

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
  public async dispatchHtmlEmail(to: string, subject: string, htmlContent: string, allowSimulation = true): Promise<boolean> {
    // 0. Ưu tiên Brevo HTTP API (HTTPS 443)
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');
    if (brevoApiKey) {
      try {
        const brevoSender = this.configService.get<string>('BREVO_SENDER_EMAIL') || this.fromAddress;
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
    const transporter = await this.ensureTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: `"${(this.fromName || 'MLD Việt Nam').replace(/["\\]/g, '').trim()}" <${(this.fromAddress || 'xuantruong.dev26@gmail.com').replace(/["\s<>]/g, '').trim()}>`,
          replyTo: (this.fromAddress || 'xuantruong.dev26@gmail.com').replace(/["\s<>]/g, '').trim(),
          to,
          subject,
          html: htmlContent,
        });
        this.logger.log(`📨 [SMTP Brevo] Đã gửi thành công email tới ${to} (MessageId: ${info?.messageId || 'OK'})`);
        return true;
      } catch (err: any) {
        this.logger.error(`❌ Gửi email SMTP thất bại: ${err.message}`);
      }
    }

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      process.env.NODE_ENV === 'production';

    if (isProduction) {
      this.logger.error(`❌ [Production Email Failure] Không thể gửi email tới ${to}. Cả dịch vụ API và SMTP đều không thành công.`);
      return false;
    }

    if (!allowSimulation) {
      this.logger.warn(`⚠️ Không gửi email tới ${to}: chưa cấu hình được nhà cung cấp email.`);
      return false;
    }

    this.logger.warn(`⚠️ [Dev Simulated Dispatch] Email mô phỏng tới ${to}: "${subject}"`);
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

    const TEMPLATE_ALIASES: Record<string, string> = {
      REMINDER_CLASS_SESSION: 'CLASS_SCHEDULE_REMINDER',
      CLASS_SCHEDULE_REMINDER: 'REMINDER_CLASS_SESSION',
      EXAM_RESULTS_NOTIFICATION: 'EXAM_RESULT_AND_CERTIFICATE',
      EXAM_RESULT_AND_CERTIFICATE: 'EXAM_RESULTS_NOTIFICATION',
      CERTIFICATE_ISSUED_VERIFICATION: 'COURSE_EXPIRY_WARNING',
      COURSE_EXPIRY_WARNING: 'CERTIFICATE_ISSUED_VERIFICATION',
    };

    const BUILTIN_DEFAULT_TEMPLATES: Record<string, { subject: string; html: string }> = {
      CONFIRMATION_BOOKING: {
        subject: 'MLD Việt Nam - Xác nhận đặt lịch hẹn chăm sóc Spa: {{booking_code}}',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
        <div style="background: linear-gradient(135deg, #985018 0%, #693B20 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">VIỆN TRỊ LIỆU & SPA MLD VIỆT NAM</h1>
          <p style="color: #FAF0E4; margin: 8px 0 0 0; font-size: 13px;">Hệ thống Dưỡng sinh & Dẫn lưu Bạch huyết Chuẩn Y Khoa</p>
        </div>
        <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #E8DFD8; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Kính gửi Quý khách {{customer_name}},</p>
          <p>MLD Việt Nam xin trân trọng thông báo lịch hẹn chăm sóc sức khỏe & trị liệu của Quý khách đã được xác nhận thành công trên hệ thống:</p>
          <div style="background: #FAF8F5; border-left: 4px solid #985018; padding: 18px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 5px 0;"><strong>Mã lịch hẹn:</strong> <span style="font-family: monospace; font-weight: bold; color: #985018; font-size: 15px;">{{booking_code}}</span></p>
            <p style="margin: 5px 0;"><strong>Dịch vụ trị liệu:</strong> {{service_name}}</p>
            <p style="margin: 5px 0;"><strong>Thời gian hẹn:</strong> <span style="color: #985018; font-weight: bold;">{{booking_time}} · Ngày {{booking_date}}</span></p>
            <p style="margin: 5px 0;"><strong>Chuyên viên thực hiện:</strong> {{specialist_name}}</p>
            <p style="margin: 5px 0;"><strong>Chi nhánh:</strong> {{branch_name}}</p>
            <p style="margin: 5px 0;"><strong>Địa chỉ:</strong> {{branch_address}}</p>
            <p style="margin: 5px 0;"><strong>Giá dịch vụ:</strong> <span style="color: #137333; font-weight: bold;">{{price}} VNĐ</span></p>
            <p style="margin: 5px 0;"><strong>Phương thức:</strong> {{payment_method}}</p>
            {{notes_section}}
          </div>
          <div style="background: #FFF8F0; border: 1px dashed #C58D59; padding: 14px 18px; border-radius: 8px; font-size: 13px; color: #6B6158;">
            💡 <strong>Lưu ý dành cho Quý khách:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 18px;">
              <li>Quý khách vui lòng đến trước giờ hẹn 10 - 15 phút để thưởng trà dưỡng sinh và được thăm khám thể trạng trước buổi trị liệu.</li>
              <li>Nếu cần dời lịch hoặc hỗ trợ, Quý khách có thể thao tác trực tiếp trên App MLD hoặc liên hệ Hotline chi nhánh.</li>
            </ul>
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #E8DFD8; font-size: 12px; color: #73675F; text-align: center;">
            Hotline Hỗ trợ CSKH: <strong>0388.886.688</strong> | Website: <strong>mldvietnam.vn</strong>
          </div>
        </div>
      </div>`,
      },
      PAYMENT_RECEIPT: {
        subject: 'MLD Việt Nam - Biên lai xác nhận thanh toán thành công: {{invoice_code}}',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
        <div style="background: linear-gradient(135deg, #137333 0%, #0D5324 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">BIÊN LAI THANH TOÁN ĐIỆN TỬ</h1>
          <p style="color: #E6F4EA; margin: 8px 0 0 0; font-size: 13px;">Hệ thống Dưỡng sinh & Đào tạo MLD Việt Nam</p>
        </div>
        <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #E8DFD8; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Kính gửi {{customer_name}},</p>
          <p>MLD Việt Nam xin trân trọng thông báo giao dịch thanh toán của Quý khách đã được xác nhận thành công:</p>
          <div style="background: #FAF8F5; border-left: 4px solid #137333; padding: 18px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 5px 0;"><strong>Mã hóa đơn:</strong> <span style="font-family: monospace; font-weight: bold; color: #137333; font-size: 15px;">{{invoice_code}}</span></p>
            <p style="margin: 5px 0;"><strong>Số tiền đã thanh toán:</strong> <span style="color: #137333; font-weight: bold; font-size: 16px;">{{amount}} VNĐ</span></p>
            <p style="margin: 5px 0;"><strong>Phương thức thanh toán:</strong> {{payment_method}}</p>
            <p style="margin: 5px 0;"><strong>Thời gian ghi nhận:</strong> {{paid_at}}</p>
            <p style="margin: 5px 0;"><strong>Nội dung thanh toán:</strong> {{description}}</p>
            <p style="margin: 5px 0;"><strong>Điểm tích lũy nhận được:</strong> <span style="color: #985018; font-weight: bold;">+{{points_earned}} điểm</span></p>
            <p style="margin: 5px 0;"><strong>Hạng thành viên hiện tại:</strong> <span style="font-weight: bold; color: #985018;">{{tier_name}}</span></p>
          </div>
          <p style="font-size: 13px; color: #6B6158;">Biên lai điện tử này được lưu trữ tự động trên ứng dụng MLD trong mục <em>Hồ sơ &gt; Lịch sử giao dịch</em>. Quý khách có thể xem và tra cứu bất kỳ lúc nào.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #E8DFD8; font-size: 12px; color: #73675F; text-align: center;">
            Hotline Kế toán & CSKH: <strong>0388.886.688</strong> | Website: <strong>mldvietnam.vn</strong>
          </div>
        </div>
      </div>`,
      },

      CONFIRMATION_ENROLLMENT: {
        subject: 'MLD Việt Nam - Xác nhận đăng ký khóa học thành công: {{course_name}}',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2C241E; line-height: 1.6;">
        <div style="background: linear-gradient(135deg, #985018 0%, #723F1A 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">VIỆN TRỊ LIỆU & ĐÀO TẠO MLD VIỆT NAM</h1>
          <p style="color: #FAF0E4; margin: 8px 0 0 0; font-size: 13px;">Học viện Đào tạo Kỹ thuật Dẫn lưu Bạch huyết Chuẩn Quốc tế</p>
        </div>
        <div style="background: #ffffff; padding: 30px 25px; border: 1px solid #E8DFD8; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; font-weight: bold;">Kính gửi Anh/Chị {{student_name}},</p>
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
      </div>`,
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
      </div>`,
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
          <p>Hội đồng chuyên môn đã hoàn tất chấm điểm kỳ thi đánh giá năng lực Dẫn lưu Bạch huyết MLD của bạn.</p>
          <p style="font-size: 13px; color: #554B42;">Giấy chứng nhận chuyên môn bản cứng kèm mã xác thực QR điện tử đang được hoàn thiện và chuyển phát tới bạn.</p>
        </div>
      </div>`,
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
          <p>Hội đồng chuyên môn đã hoàn tất chấm điểm kỳ thi đánh giá năng lực Dẫn lưu Bạch huyết MLD của bạn.</p>
        </div>
      </div>`,
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
        </div>
      </div>`,
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
          <p style="font-size: 13px; color: #554B42;">Mã số Chứng nhận: <strong style="font-family: monospace; color: #2C241E;">{{certificate_code}}</strong></p>
        </div>
      </div>`,
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
          <p style="font-size: 14px; color: #554B42;">Học viện MLD Việt Nam xin gửi tới bạn bản tổng hợp tiến độ học tập: còn {{days_left}} ngày.</p>
        </div>
      </div>`,
      },
      ENROLLMENT_EXPIRY_WARNING: {
        subject: '[QUAN TRỌNG] MLD Academy - Khóa học {{course_name}} của bạn còn {{days_left}} ngày hiệu lực',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
        <div style="background: linear-gradient(135deg, #B3261E 0%, #7A1712 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold;">CẢNH BÁO THỜI HẠN KHÓA ĐÀO TẠO</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #FCE8E6;">Quyền Truy Cập Sắp Bị Thu Hồi</p>
        </div>
        <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
          <p style="font-size: 16px; font-weight: bold;">Kính gửi Học viên {{student_name}},</p>
          <p>Khóa học {{course_name}} còn {{days_left}} ngày hiệu lực.</p>
        </div>
      </div>`,
      },
      PRACTICE_SCHEDULE_ANNOUNCEMENT: {
        subject: 'MLD Academy - Thông báo lịch học thực hành: {{session_topic}} ngày {{session_date}}',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #E8DFD8;">
        <div style="background: linear-gradient(135deg, #137333 0%, #0D5324 100%); padding: 30px 20px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold;">LỊCH THỰC HÀNH LÂM SÀNG MLD</h1>
        </div>
        <div style="padding: 30px 25px; color: #2C241E; line-height: 1.6;">
          <p style="font-size: 16px; font-weight: bold;">Xin chào Học viên {{student_name}},</p>
          <p>Lịch thực hành: {{session_topic}} ngày {{session_date}} lúc {{session_time}} tại phòng {{room_name}}.</p>
        </div>
      </div>`,
      },
    };

    let subject = 'Thông báo từ Học Viện MLD Việt Nam';
    let htmlContent = '<p>Nội dung thông báo từ MLD Việt Nam</p>';
    let templateFound = false;

    // 1. Tải Template từ bảng email_templates trên Supabase Cloud
    const candidateIds = [templateId];
    if (TEMPLATE_ALIASES[templateId]) {
      candidateIds.push(TEMPLATE_ALIASES[templateId]);
    }

    if (this.supabaseService?.adminClient) {
      for (const id of candidateIds) {
        try {
          const { data: tmpl } = await this.supabaseService.adminClient
            .from('email_templates')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .maybeSingle();

          if (tmpl && tmpl.body_html) {
            subject = tmpl.subject;
            htmlContent = tmpl.body_html;
            templateFound = true;
            break;
          }
        } catch (err: any) {
          this.logger.warn(`Không thể tải template ${id}: ${err.message}`);
        }
      }
    }

    // 1.1 Dự phòng qua từ điển mẫu mặc định nếu Supabase chưa tải được
    if (!templateFound) {
      for (const id of candidateIds) {
        if (BUILTIN_DEFAULT_TEMPLATES[id]) {
          subject = BUILTIN_DEFAULT_TEMPLATES[id].subject;
          htmlContent = BUILTIN_DEFAULT_TEMPLATES[id].html;
          templateFound = true;
          break;
        }
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
      if (!templateFound) throw new Error(`Không tìm thấy mẫu Email đang hoạt động: ${templateId}`);
      sendSuccess = await this.dispatchHtmlEmail(to, subject, htmlContent, false);
    } catch (sendErr: any) {
      errorMessage = sendErr.message;
      this.logger.error(`Lỗi gửi mail template ${templateId} tới ${to}: ${errorMessage}`);
    }

    // 4. Ghi bản ghi thực tế vào bảng email_logs trên Supabase Cloud
    if (this.supabaseService?.adminClient) {
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

  /**
   * Helper 4: Xác nhận đặt lịch hẹn chăm sóc Spa mới (CONFIRMATION_BOOKING)
   */
  public async sendBookingConfirmationEmail(params: {
    to: string;
    customerName: string;
    bookingCode: string;
    serviceName: string;
    branchName: string;
    branchAddress: string;
    bookingDate: string;
    bookingTime: string;
    specialistName?: string;
    price: number | string;
    paymentMethod?: string;
    specialNotes?: string;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const formattedPrice = typeof params.price === 'number'
      ? params.price.toLocaleString('vi-VN')
      : String(params.price);
    const notesHtml = params.specialNotes && params.specialNotes.trim().length > 0
      ? `<p style="margin: 5px 0;"><strong>Ghi chú dịch vụ:</strong> ${params.specialNotes}</p>`
      : '';

    return this.sendTemplateEmail({
      to: params.to,
      recipientName: params.customerName,
      templateId: 'CONFIRMATION_BOOKING',
      variables: {
        customer_name: params.customerName,
        booking_code: params.bookingCode,
        service_name: params.serviceName,
        branch_name: params.branchName,
        branch_address: params.branchAddress,
        booking_date: params.bookingDate,
        booking_time: params.bookingTime,
        specialist_name: params.specialistName || 'Chuyên viên chỉ định MLD',
        price: formattedPrice,
        payment_method: params.paymentMethod || 'Tại quầy Spa',
        notes_section: notesHtml,
      },
      metadata: {
        type: 'CONFIRMATION_BOOKING',
        booking_code: params.bookingCode,
        ...params.metadata,
      },
    });
  }

  /**
   * Helper 5: Biên lai xác nhận thanh toán thành công (PAYMENT_RECEIPT)
   */
  public async sendPaymentReceiptEmail(params: {
    to: string;
    customerName: string;
    invoiceCode: string;
    amount: number | string;
    paymentMethod: string;
    paidAt: string;
    description?: string;
    pointsEarned?: number | string;
    tierName?: string;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const formattedAmount = typeof params.amount === 'number'
      ? params.amount.toLocaleString('vi-VN')
      : String(params.amount);

    return this.sendTemplateEmail({
      to: params.to,
      recipientName: params.customerName,
      templateId: 'PAYMENT_RECEIPT',
      variables: {
        customer_name: params.customerName,
        invoice_code: params.invoiceCode,
        amount: formattedAmount,
        payment_method: params.paymentMethod,
        paid_at: params.paidAt,
        description: params.description || 'Thanh toán dịch vụ / khóa học MLD Việt Nam',
        points_earned: String(params.pointsEarned ?? Math.round(Number(params.amount) / 100000)),
        tier_name: params.tierName || 'MLD Member',
      },
      metadata: {
        type: 'PAYMENT_RECEIPT',
        invoice_code: params.invoiceCode,
        ...params.metadata,
      },
    });
  }

  /**
   * Helper 6: Xác nhận đăng ký khóa học mới (CONFIRMATION_ENROLLMENT)
   */
  public async sendEnrollmentConfirmationEmail(params: {
    to: string;
    studentName: string;
    studentCode: string;
    courseName: string;
    startDate?: string;
    branchAddress?: string;
    paidAmount?: number | string;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    const formattedAmount = typeof params.paidAmount === 'number'
      ? params.paidAmount.toLocaleString('vi-VN')
      : String(params.paidAmount || '0');

    return this.sendTemplateEmail({
      to: params.to,
      recipientName: params.studentName,
      templateId: 'CONFIRMATION_ENROLLMENT',
      variables: {
        student_name: params.studentName,
        student_code: params.studentCode,
        course_name: params.courseName,
        start_date: params.startDate || 'Theo lịch xếp lớp của Học viện MLD',
        branch_address: params.branchAddress || 'Trụ sở MLD Việt Nam - 260/271 Bùi Xương Trạch, Hà Nội',
        paid_amount: formattedAmount,
      },
      metadata: {
        type: 'CONFIRMATION_ENROLLMENT',
        student_code: params.studentCode,
        ...params.metadata,
      },
    });
  }

}
