import { Controller, Get, Post, Body, Query, BadRequestException, BadGatewayException } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from './modules/auth/services/email.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'MLD Vietnam Healthcare API',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('health/admin/email/test')
  async fallbackEmailTest(@Body() body: any) {
    const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
    const templateId = typeof body?.templateId === 'string' ? body.templateId.trim() : 'CONFIRMATION_ENROLLMENT';
    const variables = body?.variables || {};

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      throw new BadRequestException('Địa chỉ email người nhận không hợp lệ.');
    }

    const sent = await this.emailService.sendTemplateEmail({
      to: recipientEmail,
      recipientName: typeof body.recipientName === 'string' ? body.recipientName : '',
      templateId,
      variables,
      metadata: { is_test: true, trigger_screen: 'W18_PortalContent_Alias' },
    });

    if (!sent) {
      throw new BadGatewayException(
        `Gửi email thất bại tới ${recipientEmail}. Vui lòng kiểm tra lại cấu hình Brevo/SMTP và nhật ký Email.`,
      );
    }

    return {
      success: true,
      statusCode: 200,
      message: `Đã gửi thành công email mẫu tới ${recipientEmail}`,
      data: { sent: true, recipient: recipientEmail },
    };
  }

  @Get('media/video-info')
  async getVideoInfo(@Query('url') videoUrl?: string) {
    if (!videoUrl) {
      return { success: false, message: 'URL is required' };
    }
    const cleanUrl = String(videoUrl).trim();
    // 1. YouTube detection
    const ytMatch = cleanUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
    );
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      try {
        const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const html = await res.text();
        const durationMatch =
          html.match(/"lengthSeconds":"(\d+)"/) || html.match(/"approxDurationMs":"(\d+)"/);
        if (durationMatch && durationMatch[1]) {
          const rawNum = Number(durationMatch[1]);
          const seconds = durationMatch[1].length > 5 ? Math.round(rawNum / 1000) : rawNum;
          const minutes = Math.ceil(seconds / 60);
          return {
            success: true,
            provider: 'youtube',
            videoId,
            durationSeconds: seconds,
            durationMinutes: minutes,
            embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
          };
        }
      } catch {}
      return {
        success: true,
        provider: 'youtube',
        videoId,
        durationSeconds: 1800,
        durationMinutes: 30,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      };
    }
    return { success: false, message: 'Unsupported video provider' };
  }
}
