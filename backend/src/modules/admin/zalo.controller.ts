import { randomUUID } from 'node:crypto';
import {
  BadGatewayException, BadRequestException, Body, Controller,
  ForbiddenException, Get, Header, Post, Req, ServiceUnavailableException, UseFilters, UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminExceptionFilter } from './admin.filter';
import { AdminDatabase } from './admin.database';

type ZaloSettings = { access_token?: string | null; template_id?: string; test_phone?: string };

@Controller('admin/zalo')
@UseGuards(AdminGuard)
@UseFilters(AdminExceptionFilter)
export class ZaloController {
  constructor(private readonly db: AdminDatabase) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status(@Req() request: { admin?: { role?: string } }) {
    this.assertAdmin(request);
    return this.describeSettings(await this.loadSettings());
  }

  @Post('configuration')
  @Header('Cache-Control', 'no-store')
  async saveSettings(
    @Req() request: { admin?: { role?: string } },
    @Body() body: { accessToken?: unknown; templateId?: unknown; testPhone?: unknown },
  ) {
    this.assertAdmin(request);
    const token = body?.accessToken;
    if (token !== undefined && (typeof token !== 'string' || !/^[!-~]{1,4096}$/.test(token)))
      throw new BadRequestException('OA Access Token không hợp lệ.');
    const templateId = typeof body?.templateId === 'string' ? body.templateId.trim() : '';
    const testPhone = this.normalizePhone(body?.testPhone);
    if (!/^\d{1,30}$/.test(templateId) || !testPhone)
      throw new BadRequestException('Nhập mã mẫu tin dạng số và số điện thoại Việt Nam hợp lệ.');
    if (!token && !(await this.loadSettings()).access_token)
      throw new BadRequestException('Nhập OA Access Token cho lần cấu hình đầu tiên.');

    const { rows } = await this.db.connection.query<ZaloSettings>(
      `INSERT INTO mld_private.zalo_oa_settings AS settings (singleton, access_token, template_id, test_phone)
       VALUES (true, $1, $2, $3)
       ON CONFLICT (singleton) DO UPDATE SET
         access_token = COALESCE(EXCLUDED.access_token, settings.access_token),
         template_id = EXCLUDED.template_id, test_phone = EXCLUDED.test_phone, updated_at = now()
       RETURNING access_token, template_id, test_phone`,
      [token ?? null, templateId, testPhone],
    );
    return this.describeSettings(this.withDefaults(rows[0]));
  }

  private async loadSettings() {
    const { rows } = await this.db.connection.query<ZaloSettings>(
      'SELECT access_token, template_id, test_phone FROM mld_private.zalo_oa_settings WHERE singleton',
    );
    return this.withDefaults(rows[0]);
  }

  private withDefaults(saved?: ZaloSettings) {
    return {
      access_token: saved?.access_token ?? process.env.ZALO_OA_ACCESS_TOKEN?.trim(),
      template_id: saved?.template_id ?? process.env.ZALO_BOOKING_CONFIRMATION_TEMPLATE_ID?.trim() ?? '',
      test_phone: this.normalizePhone(saved?.test_phone ?? process.env.ZALO_TEST_PHONE),
    };
  }

  private describeSettings(settings: ReturnType<ZaloController['withDefaults']>) {
    return {
      tokenConfigured: Boolean(settings.access_token),
      templateConfigured: /^\d+$/.test(settings.template_id),
      testPhoneConfigured: Boolean(settings.test_phone),
      templateId: settings.template_id,
      testPhone: settings.test_phone,
    };
  }

  @Post('test')
  async sendTest(
    @Req() request: { admin?: { role?: string } },
    @Body() body: { recipientPhone?: unknown; templateCode?: unknown; paramsSent?: unknown },
  ) {
    this.assertAdmin(request);
    const settings = await this.loadSettings();
    if (!settings.access_token || !/^\d+$/.test(settings.template_id) || !settings.test_phone)
      throw new ServiceUnavailableException('Lưu đủ token, mẫu xác nhận lịch và số nhận thử trước khi gửi.');

    const phone = this.normalizePhone(body?.recipientPhone);
    if (!phone || phone !== settings.test_phone)
      throw new BadRequestException('Số nhận thử phải khớp với số đã lưu trong cấu hình Zalo OA.');
    if (body?.templateCode !== 'BOOKING_CONFIRMATION')
      throw new BadRequestException('Chỉ hỗ trợ gửi thử mẫu xác nhận lịch hẹn.');

    const params = body.paramsSent;
    if (!params || typeof params !== 'object' || Array.isArray(params))
      throw new BadRequestException('Tham số mẫu phải là một đối tượng JSON.');
    const entries = Object.entries(params);
    if (!entries.length || entries.length > 30 || entries.some(([key, value]) =>
      !/^[a-zA-Z0-9_]{1,100}$/.test(key) || typeof value !== 'string' || value.length > 500,
    )) throw new BadRequestException('Tham số mẫu phải có tên hợp lệ và giá trị dạng văn bản.');

    const trackingId = randomUUID().replace(/-/g, '');
    let result: { error?: number; data?: { msg_id?: string } };
    let ok: boolean;
    try {
      const response = await fetch('https://business.openapi.zalo.me/message/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: settings.access_token,
        },
        body: JSON.stringify({
          phone,
          template_id: settings.template_id,
          template_data: Object.fromEntries(entries),
          tracking_id: trackingId,
        }),
        signal: AbortSignal.timeout(10000),
      });
      ok = response.ok;
      result = await response.json();
    } catch {
      throw new BadGatewayException('Chưa xác minh được kết quả gửi. Kiểm tra Zalo trước khi thử lại.');
    }

    if (!ok || result?.error !== 0)
      throw new BadGatewayException(`Zalo từ chối gửi${Number.isInteger(result?.error) ? ` (mã ${result.error})` : ''}. Kiểm tra quyền OA, mẫu tin và số dư ZBS.`);
    if (!result.data?.msg_id)
      throw new BadGatewayException('Zalo chưa trả mã tin. Kiểm tra Zalo trước khi thử lại.');

    return { messageId: result.data.msg_id, trackingId };
  }

  @Get('cloud-config')
  @Header('Cache-Control', 'no-store')
  async getCloudConfig(@Req() request: { admin?: { role?: string } }) {
    this.assertZnsStaff(request);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(request.admin?.role || '');
    try {
      const { rows } = await this.db.connection.query<any>(
        "SELECT * FROM public.zns_config WHERE id = 'default' LIMIT 1",
      );
      const row = rows[0] || {};
      const oaSettings = await this.loadSettings().catch(() => ({ access_token: '', template_id: '', test_phone: '' }));
      return {
        oaId: row.oa_id || '2849182390192830192',
        appId: row.app_id || '4928109283019283',
        appSecret: isAdmin ? (row.app_secret || '') : '',
        accessToken: isAdmin ? (row.access_token || oaSettings.access_token || '') : '',
        refreshToken: isAdmin ? (row.refresh_token || '') : '',
        webhookUrl: row.webhook_url || 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
        isLiveMode: Boolean(row.access_token || oaSettings.access_token),
        expiresAt: row.expires_at || null,
      };
    } catch {
      return {
        oaId: '2849182390192830192',
        appId: '4928109283019283',
        appSecret: '',
        accessToken: '',
        refreshToken: '',
        webhookUrl: 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
        isLiveMode: false,
      };
    }
  }

  @Post('cloud-config')
  @Header('Cache-Control', 'no-store')
  async saveCloudConfig(@Req() request: { admin?: { role?: string } }, @Body() body: Record<string, any>) {
    this.assertAdmin(request);
    const oaId = String(body?.oaId || '2849182390192830192');
    const appId = String(body?.appId || '4928109283019283');
    const appSecret = String(body?.appSecret || '');
    const accessToken = String(body?.accessToken || '');
    const refreshToken = String(body?.refreshToken || '');
    const expiresAt = body?.expiresAt || null;
    await this.db.connection.query(
      `INSERT INTO public.zns_config (id, oa_id, app_id, app_secret, access_token, refresh_token, is_live_mode, expires_at, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (id) DO UPDATE SET
         oa_id = EXCLUDED.oa_id,
         app_id = EXCLUDED.app_id,
         app_secret = EXCLUDED.app_secret,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         is_live_mode = EXCLUDED.is_live_mode,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`,
      [oaId, appId, appSecret, accessToken, refreshToken, Boolean(accessToken), expiresAt],
    ).catch(() => {});
    return { success: true };
  }

  @Get('templates')
  @Header('Cache-Control', 'no-store')
  async getTemplates(@Req() request: { admin?: { role?: string } }) {
    this.assertZnsStaff(request);
    try {
      const { rows } = await this.db.connection.query<any>(
        'SELECT * FROM public.zns_templates ORDER BY created_at ASC',
      );
      return rows;
    } catch {
      return [];
    }
  }

  @Post('templates/toggle')
  @Header('Cache-Control', 'no-store')
  async toggleTemplate(@Req() request: { admin?: { role?: string } }, @Body() body: { id?: string; isActive?: boolean }) {
    this.assertZnsStaff(request);
    if (!body?.id) throw new BadRequestException('Thiếu mã kịch bản ZNS.');
    await this.db.connection.query(
      'UPDATE public.zns_templates SET is_active = $2, updated_at = now() WHERE id = $1',
      [body.id, Boolean(body.isActive)],
    );
    return { success: true };
  }

  @Get('logs')
  @Header('Cache-Control', 'no-store')
  async getLogs(@Req() request: { admin?: { role?: string } }) {
    this.assertZnsStaff(request);
    try {
      const { rows } = await this.db.connection.query<any>(
        'SELECT * FROM public.zns_logs ORDER BY sent_at DESC LIMIT 200',
      );
      return rows;
    } catch {
      return [];
    }
  }

  @Post('logs')
  @Header('Cache-Control', 'no-store')
  async createLog(@Req() request: { admin?: { role?: string } }, @Body() body: Record<string, any>) {
    this.assertZnsStaff(request);
    const { rows } = await this.db.connection.query<any>(
      `INSERT INTO public.zns_logs (recipient_phone, recipient_name, template_code, booking_id, params_sent, status, response_code, error_message)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       RETURNING *`,
      [
        String(body?.recipient_phone || ''),
        String(body?.recipient_name || 'Khách hàng'),
        String(body?.template_code || 'BOOKING_CONFIRMATION'),
        body?.booking_id || null,
        JSON.stringify(body?.params_sent || {}),
        String(body?.status || 'SENT'),
        String(body?.response_code || '0'),
        body?.error_message || null,
      ],
    );
    return rows;
  }

  private assertZnsStaff(request: { admin?: { role?: string } }) {
    if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'].includes(request.admin?.role || ''))
      throw new ForbiddenException('Tài khoản không có quyền truy cập phân hệ Zalo ZNS.');
  }

  private assertAdmin(request: { admin?: { role?: string } }) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(request.admin?.role || ''))
      throw new ForbiddenException('Chỉ quản trị viên được kiểm tra cấu hình và gửi thử Zalo.');
  }

  private normalizePhone(value: unknown) {
    if (typeof value !== 'string' || !/^[+\d\s().-]+$/.test(value)) return '';
    const digits = value.replace(/\D/g, '');
    const phone = digits.startsWith('0') ? `84${digits.slice(1)}` : digits;
    return /^84[35789]\d{8}$/.test(phone) ? phone : '';
  }
}
