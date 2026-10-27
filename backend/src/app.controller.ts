import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
            formattedDuration: `${Math.floor(seconds / 60)} phút ${Math.round(seconds % 60)} giây`,
          };
        }
      } catch (err: any) {
        // ignore and return failure
      }
    }
    return { success: false, message: 'Could not extract video duration' };
  }
}
