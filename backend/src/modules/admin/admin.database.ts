import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { inspectAdminSchema } from './admin.schema';

@Injectable()
export class AdminDatabase implements OnModuleDestroy, OnModuleInit {
  private pool?: Pool;
  constructor(private readonly config: ConfigService) {}
  async onModuleInit() {
    if (!(this.config.get<string>('ADMIN_DATABASE_URL') || this.config.get<string>('DATABASE_URL'))) {
      if (this.config.get<string>('NODE_ENV') === 'production')
        throw new ServiceUnavailableException('Admin database is not configured.');
      return;
    }
    const logger = new Logger(AdminDatabase.name);
    try {
      const status = await inspectAdminSchema(this.connection);
      if (!status.ready) throw new ServiceUnavailableException(`Admin schema is incomplete: ${status.missing.join(', ')}`);
    } catch (error) {
      logger.error('Admin database readiness check failed. Verify the database connection and migrations.');
      throw error;
    }
  }
  get connection(): Pool {
    if (!this.pool) {
      const connectionString = this.config.get<string>('ADMIN_DATABASE_URL') || this.config.get<string>('DATABASE_URL');
      if (!connectionString) throw new ServiceUnavailableException('Admin database is not configured.');
      this.pool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: true },
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
