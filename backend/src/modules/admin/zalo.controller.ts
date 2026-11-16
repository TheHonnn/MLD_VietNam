import { randomUUID } from 'node:crypto';
import {
  BadGatewayException, BadRequestException, Body, Controller,
  ForbiddenException, Get, Post, Req, ServiceUnavailableException, UseFilters, UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminExceptionFilter } from './admin.filter';

@Controller('admin/zalo')
@UseGuards(AdminGuard)
@UseFilters(AdminExceptionFilter)
export class ZaloController {
  @Get('status')
  status(@Req() request: { admin?: { role?: string } }) {
    this.assertAdmin(request);
    return {
      tokenConfigured: Boolean(process.env.ZALO_OA_ACCESS_TOKEN?.trim()),
      templateConfigured: /^\d+$/.test(process.env.ZALO_BOOKING_CONFIRMATION_TEMPLATE_ID?.trim() || ''),
      testPhoneConfigured: Boolean(this.normalizePhone(process.env.ZALO_TEST_PHONE)),
    };
  }

  @Post('test')
  async sendTest(
    @Req() request: { admin?: { role?: string } },
    @Body() body: { recipientPhone?: unknown; templateCode?: unknown; paramsSent?: unknown },
  ) {
    const status = this.status(request);
    if (!status.tokenConfigured || !status.templateConfigured || !status.testPhoneConfigured)
      throw new ServiceUnavailableException('Chưa cấu hình đủ token, mẫu xác nhận lịch và số nhận thử trên Render.');

    const phone = this.normalizePhone(body?.recipientPhone);
    if (!phone || phone !== this.normalizePhone(process.env.ZALO_TEST_PHONE))
      throw new BadRequestException('Số nhận thử phải khớp ZALO_TEST_PHONE trên Render.');
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
          access_token: process.env.ZALO_OA_ACCESS_TOKEN!.trim(),
        },
        body: JSON.stringify({
          phone,
          template_id: process.env.ZALO_BOOKING_CONFIRMATION_TEMPLATE_ID!.trim(),
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
