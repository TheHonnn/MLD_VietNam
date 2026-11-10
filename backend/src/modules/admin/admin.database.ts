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

export function adminDatabaseSsl(connectionString: string): false | { rejectUnauthorized: boolean } {
  const url = new URL(connectionString);
  if (['localhost', '127.0.0.1'].includes(url.hostname)) return false;
  // Supabase documents sslmode=require for its managed pooler. This keeps the
  // transport encrypted while accommodating the platform-managed CA chain.
  if (url.hostname.endsWith('.pooler.supabase.com')) return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

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
      const databaseError = error as { code?: string; message?: string; stack?: string };
      logger.error(
        `Admin database readiness check failed${databaseError.code ? ` [${databaseError.code}]` : ''}: ${databaseError.message || 'Unknown database error'}`,
        databaseError.stack,
      );
      throw error;
    }
  }
  get connection(): Pool {
    if (!this.pool) {
      const connectionString = this.config.get<string>('ADMIN_DATABASE_URL') || this.config.get<string>('DATABASE_URL');
      if (!connectionString) throw new ServiceUnavailableException('Admin database is not configured.');
      this.pool = new Pool({
        connectionString,
        ssl: adminDatabaseSsl(connectionString),
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
