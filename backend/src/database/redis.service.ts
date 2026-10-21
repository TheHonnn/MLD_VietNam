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

  /**
   * Lấy giá trị chuỗi theo key
   */
  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch (err) {
        this.logger.error(`Lỗi Redis get: ${err.message}`);
      }
    }

    const now = Date.now();
    const item = this.fallbackMemoryLock.get(key);
    if (item && item.expiresAt > now) {
      return item.value;
    }
    if (item && item.expiresAt <= now) {
      this.fallbackMemoryLock.delete(key);
    }
    return null;
  }

  /**
   * Lưu key/value kèm thời gian hết hạn (TTL giây)
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        this.logger.error(`Lỗi Redis set: ${err.message}`);
      }
    }

    this.fallbackMemoryLock.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Xóa key khỏi Redis hoặc In-memory cache
   */
  async del(key: string): Promise<void> {
    if (this.isConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err) {
        this.logger.error(`Lỗi Redis del: ${err.message}`);
      }
    }

    this.fallbackMemoryLock.delete(key);
  }

  /**
   * Tăng biến đếm và thiết lập TTL (phục vụ Rate Limiting)
   */
  async incr(key: string, ttlSeconds: number): Promise<number> {
    if (this.isConnected && this.redisClient) {
      try {
        const count = await this.redisClient.incr(key);
        if (count === 1) {
          await this.redisClient.expire(key, ttlSeconds);
        }
        return count;
      } catch (err) {
        this.logger.error(`Lỗi Redis incr: ${err.message}`);
      }
    }

    const now = Date.now();
    const item = this.fallbackMemoryLock.get(key);
    let count = 1;
    if (item && item.expiresAt > now) {
      count = parseInt(item.value, 10) + 1;
      this.fallbackMemoryLock.set(key, {
        value: count.toString(),
        expiresAt: item.expiresAt,
      });
    } else {
      this.fallbackMemoryLock.set(key, {
        value: '1',
        expiresAt: now + ttlSeconds * 1000,
      });
    }
    return count;
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }
}

