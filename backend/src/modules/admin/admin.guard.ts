import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminDatabase } from './admin.database';
import { ADMIN_RESOURCES } from './admin.resources';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: AdminDatabase,
    private readonly config: ConfigService,
    @Optional() private readonly supabase?: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // 0. Chế độ phát triển máy nội bộ (Local Development)
    if (this.config.get<string>('ADMIN_LOCAL_NO_AUTH') === 'true' && this.config.get<string>('NODE_ENV') !== 'production') {
      const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
      const originSetting = this.config.get<string>('CORS_ORIGIN') || 'http://localhost:5173,http://127.0.0.1:5173';
      const allowedOrigins = originSetting.split(',').map((v) => v.trim());
      let localHost = false;
      let localOrigin = false;
      try {
        localHost = ['localhost', '127.0.0.1', '[::1]'].includes(new URL('http://' + req.headers.host).hostname);
        localOrigin =
          allowedOrigins.includes(req.headers.origin) &&
          ['localhost', '127.0.0.1', '[::1]'].includes(new URL(req.headers.origin).hostname);
      } catch {}

      if (
        !loopback.has(req.socket?.remoteAddress) ||
        !localHost ||
        !localOrigin ||
        req.headers['x-mld-local-admin'] !== '1'
      ) {
        throw new ForbiddenException('Chế độ tạm bỏ đăng nhập chỉ dùng trên máy local.');
      }

      const { rows } = await this.db.connection.query(
        "SELECT id, full_name, role, is_active FROM users WHERE role='SUPER_ADMIN' AND is_active=true ORDER BY created_at, id LIMIT 1",
      );
      if (!rows[0]) throw new ForbiddenException('Database chưa có SUPER_ADMIN đang hoạt động.');
      req.admin = { ...rows[0], localDevelopment: true };
      return true;
    }

    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) {
      throw new UnauthorizedException('Vui lòng đăng nhập quản trị.');
    }

    const supabaseSecret = this.config.get<string>('SUPABASE_JWT_SECRET');
    const backendSecret = this.config.get<string>('JWT_SECRET');

    let payload: { sub: string; audience?: string } | null = null;

    // 1. Xác thực Supabase Auth JWT (nếu có cấu hình SUPABASE_JWT_SECRET)
    if (supabaseSecret && supabaseSecret.length >= 32) {
      try {
        payload = this.jwt.verify(token, {
          secret: supabaseSecret,
          audience: 'authenticated',
        });
      } catch {}
    }

    // 1.1 Xác thực trực tiếp qua Supabase Auth API nếu có SupabaseService
    if (!payload && this.supabase?.adminClient) {
      try {
        const { data: sbData, error: sbErr } = await this.supabase.adminClient.auth.getUser(token);
        if (sbData?.user?.id && !sbErr) {
          payload = { sub: sbData.user.id, audience: 'authenticated' };
        }
      } catch {}
    }

    // 2. Xác thực JWT nội bộ của backend (audience: 'mld-admin')
    if (!payload && backendSecret && backendSecret.length >= 32) {
      try {
        payload = this.jwt.verify(token, {
          secret: backendSecret,
          audience: 'mld-admin',
        });
      } catch {}
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Vui lòng đăng nhập quản trị.');
    }

    const { rows } = await this.db.connection.query(
      'SELECT id, full_name, role, is_active FROM users WHERE id=$1',
      [payload.sub],
    );
    const user = rows[0];
    if (!user?.is_active)
      throw new ForbiddenException('Tài khoản không hoạt động.');
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      const grants = await this.db.connection.query(
        `SELECT DISTINCT p.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1 AND ur.branch_id IS NULL`,
        [user.id],
      );
      const permissions = grants.rows.map((row) => row.code);
      const table = req.params.table;
      const operation =
        req.method === 'GET'
          ? 'read'
          : String(req.route?.path || '')
              .split('/')
              .pop();
      if (
        !permissions.length ||
        (table && !permissions.includes(`${table}.${operation}`)) ||
        (!table && String(req.route?.path || '').endsWith('summary'))
      )
        throw new ForbiddenException(
          'Tài khoản chưa được cấp quyền cho thao tác này.',
        );
      if (table && ADMIN_RESOURCES[table]?.group === 'Phân quyền')
        throw new ForbiddenException(
          'Chỉ SUPER_ADMIN được quản lý phân quyền.',
        );
      user.permissions = permissions;
    }
    req.admin = user;
    return true;
  }
}
