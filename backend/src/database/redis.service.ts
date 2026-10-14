import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis | null = null;
  private isConnected = false;
  // Fallback in-memory map nếu Redis server chưa được khởi động
  private fallbackMemoryLock = new Map<string, { value: string; expiresAt: number }>();

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.redisClient = new Redis({
        host,
        port,
        password: password || undefined,
        retryStrategy: () => null, // Không spam retry nếu không tìm thấy
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      this.redisClient
        .connect()
        .then(() => {
          this.isConnected = true;
          this.logger.log(`✅ Kết nối Redis thành công tại ${host}:${port}`);
        })
        .catch(() => {
          this.isConnected = false;
          this.logger.warn(
            `⚠️ Không tìm thấy Redis tại ${host}:${port}. Hệ thống tự động chuyển sang cơ chế In-Memory Lock dự phòng.`,
          );
        });
    } catch {
      this.isConnected = false;
    }
  }

  /**
   * Khóa giữ chỗ slot khám (Distributed Lock) trong `ttlSeconds`
   * Trả về true nếu giữ chỗ thành công, false nếu slot đã có người khóa
   */
  async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.isConnected && this.redisClient) {
      try {
        const result = await this.redisClient.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (err) {
        this.logger.error(`Lỗi Redis acquireLock: ${err.message}`);
      }
    }

    // Fallback In-memory
    const now = Date.now();
    const existing = this.fallbackMemoryLock.get(key);
    if (existing && existing.expiresAt > now) {
      return false; // Đã bị giữ chỗ
    }

    this.fallbackMemoryLock.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  /**
   * Giải phóng khóa slot
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    if (this.isConnected && this.redisClient) {
      try {
        const currentValue = await this.redisClient.get(key);
        if (currentValue === value) {
          await this.redisClient.del(key);
          return true;
        }
        return false;
      } catch (err) {
        this.logger.error(`Lỗi Redis releaseLock: ${err.message}`);
      }
    }

    const existing = this.fallbackMemoryLock.get(key);
    if (existing && existing.value === value) {
      this.fallbackMemoryLock.delete(key);
      return true;
    }
    return false;
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }
}

