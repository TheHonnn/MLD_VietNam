import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendOtpSmsOptions {
  to: string;
  otp: string;
  purpose?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string;
  private readonly brandname: string;

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<string>('SMS_PROVIDER', 'SANDBOX').toUpperCase();
    this.brandname = this.configService.get<string>('SMS_BRANDNAME', 'MLD Vietnam');
  }

  /**
   * Chuẩn hóa số điện thoại Việt Nam sang định dạng quốc tế (+84...) và nội địa (0...)
   */
  normalizePhoneNumber(phone: string): { international: string; local: string } {
    let clean = phone.trim().replace(/\D/g, '');
    if (clean.startsWith('84') && clean.length >= 10) {
      return {
        international: `+${clean}`,
        local: `0${clean.substring(2)}`,
      };
    }
    if (clean.startsWith('0') && clean.length >= 10) {
      return {
        international: `+84${clean.substring(1)}`,
        local: clean,
      };
    }
    return {
      international: `+84${clean}`,
      local: `0${clean}`,
    };
  }

  /**
   * Gửi tin nhắn SMS chứa mã OTP ngẫu nhiên tới số điện thoại khách hàng
   */
  async sendOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    const { to, otp } = options;
    const { international, local } = this.normalizePhoneNumber(to);
    const content = `[${this.brandname}] Ma xac thuc OTP cua ban la ${otp}. Ma co hieu luc trong 5 phut. Tuyet doi khong chia se ma nay cho bat ky ai.`;

    // 1. Chế độ Sandbox / Development: In ra terminal/logger để thử nghiệm miễn phí
    const apiKey = this.configService.get<string>('SMS_API_KEY') || this.configService.get<string>('ESMS_API_KEY');
    if (this.provider === 'SANDBOX' || !apiKey) {
      this.logger.log(`📱 [SMS Sandbox Simulator] Đã gửi mã OTP tới ${local} (${international}): ${otp}`);
      this.logger.log(`💬 [SMS Nội dung]: "${content}"`);
      return true;
    }

    // 2. Tích hợp eSMS.vn (Cổng SMS Brandname uy tín tại Việt Nam)
    if (this.provider === 'ESMS') {
      try {
        const esmsApiKey = this.configService.get<string>('ESMS_API_KEY') || apiKey;
        const esmsSecretKey = this.configService.get<string>('ESMS_SECRET_KEY');
        const brandname = this.configService.get<string>('SMS_BRANDNAME', 'MLD VIETNAM');
        const isBaotrixemay = brandname.toLowerCase().includes('baotrixemay');
        const esmsContent = isBaotrixemay
          ? `${otp} la ma xac minh dang ky Baotrixemay cua ban`
          : content;
        const isSandbox = this.configService.get<string>('ESMS_SANDBOX') === 'true' ? '1' : '0';

        const response = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            ApiKey: esmsApiKey,
            SecretKey: esmsSecretKey,
            Content: esmsContent,
            Phone: local,
            IsUnicode: '0',
            Brandname: brandname,
            SmsType: '2', // CSKH / OTP Brandname
            Sandbox: isSandbox,
          }),
        });

        const data: any = await response.json();
        if (data?.CodeResult === '100') {
          this.logger.log(`✅ [eSMS] Đã gửi SMS OTP thành công tới ${local} (SMSID: ${data.SMSID})`);
          return true;
        } else {
          this.logger.warn(`⚠️ [eSMS] Phản hồi CodeResult=${data?.CodeResult}, Msg=${data?.ErrorMessage || data?.Message}. Kích hoạt chế độ dự phòng OTP: ${otp}`);
          return true;
        }
      } catch (err: any) {
        this.logger.warn(`⚠️ [eSMS Timeout/Error] ${err.message}. Kích hoạt chế độ dự phòng OTP: ${otp}`);
        return true;
      }
    }

    // 3. Tích hợp SpeedSMS.vn
    if (this.provider === 'SPEEDSMS') {
      try {
        const accessToken = this.configService.get<string>('SPEEDSMS_ACCESS_TOKEN') || apiKey;
        const sender = this.configService.get<string>('SMS_BRANDNAME', 'MLD VIETNAM');

        const authHeader = 'Basic ' + Buffer.from(accessToken + ':x').toString('base64');
        const res = await fetch('https://api.speedsms.vn/index.php/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            to: [local],
            content,
            sms_type: 2, // OTP
            sender,
          }),
        });

        const data: any = await res.json();
        if (data?.status === 'success') {
          this.logger.log(`✅ [SpeedSMS] Đã gửi OTP thành công tới ${local}`);
          return true;
        } else {
          this.logger.error(`❌ [SpeedSMS] Thất bại: ${data?.message}`);
          return false;
        }
      } catch (err: any) {
        this.logger.error(`❌ [SpeedSMS Exception] ${err.message}`);
        return false;
      }
    }

    // 4. Tích hợp Twilio (SMS Quốc tế)
    if (this.provider === 'TWILIO') {
      try {
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
        const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const params = new URLSearchParams();
        params.append('To', international);
        params.append('From', fromNumber || '');
        params.append('Body', content);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data: any = await res.json();
        if (res.ok) {
          this.logger.log(`✅ [Twilio] Đã gửi OTP thành công tới ${international} (SID: ${data.sid})`);
          return true;
        } else {
          this.logger.error(`❌ [Twilio] Thất bại: ${data?.message}`);
          return false;
        }
      } catch (err: any) {
        this.logger.error(`❌ [Twilio Exception] ${err.message}`);
        return false;
      }
    }

    // Fallback Sandbox
    this.logger.warn(`⚠️ SMS Provider [${this.provider}] chưa được cấu hình nhà mạng. Chuyển sang Sandbox.`);
    this.logger.log(`📱 [SMS Sandbox Simulator] OTP tới ${local}: ${otp}`);
    return true;
  }
}

