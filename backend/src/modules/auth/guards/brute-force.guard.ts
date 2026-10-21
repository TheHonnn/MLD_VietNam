import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../../database/redis.service';

@Injectable()
export class BruteForceGuard implements CanActivate {
  private readonly logger = new Logger(BruteForceGuard.name);
  private readonly maxAttemptsPerIp = 15;
  private readonly windowSeconds = 300; // 5 phút

  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp =
      request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown-ip';

    const identifier = request.body?.identifier || request.body?.email || request.body?.phone;
    const ipKey = `rate_limit:ip:${clientIp}`;

    const ipRequests = await this.redisService.incr(ipKey, this.windowSeconds);
    if (ipRequests > this.maxAttemptsPerIp) {
      this.logger.warn(`🛑 Chặn IP ${clientIp} do vượt quá ${this.maxAttemptsPerIp} yêu cầu/5 phút.`);
      throw new HttpException(
        'Hệ thống phát hiện quá nhiều yêu cầu bất thường từ thiết bị của bạn. Vui lòng thử lại sau 5 phút.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (identifier) {
      const accountLockKey = `account_lock:${identifier.toLowerCase().trim()}`;
      const isLocked = await this.redisService.get(accountLockKey);
      if (isLocked) {
        throw new HttpException(
          'Tài khoản này đang tạm thời bị khóa do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút hoặc sử dụng tính năng Quên mật khẩu.',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return true;
  }
}

