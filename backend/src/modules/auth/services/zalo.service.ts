import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendOtpZnsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);
  private accessToken: string;
  private refreshToken: string;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly oaId: string;
  private readonly templateId: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('ZALO_APP_ID', '242827298952470050').trim();
    this.appSecret = this.configService.get<string>('ZALO_APP_SECRET', 'p7RikVqQ6bHyfEVn9e2L').trim();
    this.oaId = this.configService.get<string>('ZALO_OA_ID', '1424469774232439257').trim();
    this.accessToken = this.configService.get<string>('ZALO_OA_ACCESS_TOKEN', '').trim();
    this.refreshToken = this.configService.get<string>('ZALO_OA_REFRESH_TOKEN', '').trim();
    this.templateId = this.configService.get<string>('ZALO_ZNS_OTP_TEMPLATE_ID', '').trim();
  }

  normalizePhone(raw: string): string {
    const digits = raw.trim().replace(/\D/g, '');
    if (digits.startsWith('84')) return digits;
    if (digits.startsWith('0')) return `84${digits.substring(1)}`;
    return `84${digits}`;
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.appId || !this.appSecret || !this.refreshToken) {
      this.logger.error('Missing Zalo credentials to refresh token');
      return null;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        app_id: this.appId,
      }).toString();

      const res = await fetch('https://oauth.zalo.me/v4/oa/access_token', {
        method: 'POST',
        headers: {
          secret_key: this.appSecret,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      const data: any = await res.json();
      if (data?.access_token) {
        this.accessToken = data.access_token;
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
        }
        this.logger.log('Zalo OA access token refreshed successfully');
        return this.accessToken;
      }

      this.logger.error(`Failed to refresh Zalo token: ${data?.error_description || data?.message || 'Unknown error'}`);
      return null;
    } catch (err: any) {
      this.logger.error(`Zalo refresh token exception: ${err.message}`);
      return null;
    }
  }

  async sendOtpZns(phone: string, otp: string): Promise<SendOtpZnsResult> {
    const formattedPhone = this.normalizePhone(phone);
    const targetTemplateId = this.templateId;

    if (!targetTemplateId || !/^\d{4,20}$/.test(targetTemplateId)) {
      this.logger.warn(`ZNS Template ID is not configured or pending approval: ${targetTemplateId}`);
      return {
        success: false,
        error: 'ZNS Template ID chưa được cấu hình hoặc chưa được Zalo duyệt.',
      };
    }

    let token = this.accessToken;
    if (!token) {
      token = (await this.refreshAccessToken()) || '';
    }

    if (!token) {
      return {
        success: false,
        error: 'Không có Zalo Access Token hợp lệ.',
      };
    }

    const payload = {
      phone: formattedPhone,
      template_id: targetTemplateId,
      template_data: {
        otp,
      },
    };

    try {
      let res = await fetch('https://business.openapi.zalo.me/message/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: token,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      let data: any = await res.json();

      if (data?.error === -124 || data?.error === -216) {
        this.logger.warn('Zalo access token expired, refreshing and retrying...');
        const refreshedToken = await this.refreshAccessToken();
        if (refreshedToken) {
          res = await fetch('https://business.openapi.zalo.me/message/template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              access_token: refreshedToken,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
          });
          data = await res.json();
        }
      }

      if (data?.error === 0) {
        this.logger.log(`ZNS OTP sent successfully to ${formattedPhone} (msg_id: ${data.data?.msg_id})`);
        return {
          success: true,
          messageId: data.data?.msg_id,
        };
      }

      this.logger.error(`Zalo ZNS send failed: ${data?.message} (code: ${data?.error})`);
      return {
        success: false,
        error: `Zalo từ chối: ${data?.message || 'Lỗi gửi tin'} (mã: ${data?.error})`,
      };
    } catch (err: any) {
      this.logger.error(`Zalo ZNS exception: ${err.message}`);
      return {
        success: false,
        error: `Lỗi kết nối Zalo: ${err.message}`,
      };
    }
  }
}
