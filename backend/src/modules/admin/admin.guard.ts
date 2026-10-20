import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminDatabase } from './admin.database';
import { ADMIN_RESOURCES } from './admin.resources';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly db: AdminDatabase,
    private readonly config: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (this.config.get<string>('ADMIN_LOCAL_NO_AUTH') === 'true' && this.config.get<string>('NODE_ENV') !== 'production') {
      const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
      const allowedOrigins = (this.config.get<string>('CORS_ORIGIN') || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value=>value.trim());
      let localHost = false;
      let localOrigin = false;
      try {
        localHost = ['localhost','127.0.0.1','[::1]'].includes(new URL('http://' + req.headers.host).hostname);
        localOrigin = allowedOrigins.includes(req.headers.origin) && ['localhost','127.0.0.1','[::1]'].includes(new URL(req.headers.origin).hostname);
      } catch {}
      if (!loopback.has(req.socket?.remoteAddress) || !localHost || !localOrigin || req.headers['x-mld-local-admin'] !== '1') throw new ForbiddenException('Chế độ tạm bỏ đăng nhập chỉ dùng trên máy local.');
      const {rows} = await this.db.connection.query("SELECT id,full_name,role,is_active FROM users WHERE role='SUPER_ADMIN' AND is_active=true ORDER BY created_at,id LIMIT 1");
      if (!rows[0]) throw new ForbiddenException('Database chưa có SUPER_ADMIN đang hoạt động.');
      req.admin = {...rows[0],localDevelopment:true};
      return true;
    }
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
    const secret = this.config.get<string>('JWT_SECRET');
    if (
      !secret ||
      secret.length < 32 ||
      secret === 'super-secret-jwt-key-medical-healthcare-2026'
    )
      throw new UnauthorizedException(
        'Backend cần JWT_SECRET riêng, ít nhất 32 ký tự.',
      );
    let payload: { sub: string; audience?: string };
    try {
      payload = this.jwt.verify(token || '', { secret, audience: 'mld-admin' });
    } catch {
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
