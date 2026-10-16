import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class AdminDatabase implements OnModuleDestroy {
  private pool?: Pool;
  constructor(private readonly config: ConfigService) {}
  get connection(): Pool {
    if (!this.pool) {
      const connectionString =
        this.config.get<string>('ADMIN_DATABASE_URL') ||
        this.config.get<string>('DATABASE_URL');
      if (!connectionString)
        throw new ServiceUnavailableException(
          'Backend chưa cấu hình ADMIN_DATABASE_URL hoặc DATABASE_URL của database chung.',
        );
      this.pool = new Pool({
        connectionString,
        max: 5,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000,
        idleTimeoutMillis: 30000,
      });
      this.pool.on('error', () => {});
    }
    return this.pool;
  }
  async onModuleDestroy() {
    await this.pool?.end();
  }
}
