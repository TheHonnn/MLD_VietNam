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
import { createPublicKey } from 'crypto';
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
    let userEmail: string | undefined;

    // 1. Xác thực Supabase Auth JWT (Hỗ trợ cả ES256 Elliptic Curve & HS256 HMAC)
    try {
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
      if (header.alg === 'ES256') {
        const jwk = {
          kty: 'EC',
          crv: 'P-256',
          x: 'xyK_vjxW4mG7leB7keX57JusElzNUvFbiTodjT_mHc0',
          y: 'sqDBel18rwSBumLXNtdnXpDb31084qv9HhN6CuIIMxY',
        };
        const pubKey = createPublicKey({ key: jwk, format: 'jwk' });
        const decoded: any = this.jwt.verify(token, {
          publicKey: pubKey as any,
          algorithms: ['ES256'],
          audience: 'authenticated',
        });
        if (decoded && (decoded.sub || decoded.id)) {
          payload = { sub: decoded.sub || decoded.id, audience: decoded.aud };
          userEmail = decoded.email;
        }
      } else if (supabaseSecret && supabaseSecret.length >= 32) {
        const decoded = this.jwt.verify(token, {
          secret: supabaseSecret,
          audience: 'authenticated',
        });
        if (decoded && (decoded.sub || (decoded as any).id)) {
          payload = { sub: decoded.sub || (decoded as any).id, audience: decoded.aud };
          userEmail = (decoded as any)?.email;
        }
      }
    } catch {}

    // Supabase validates the presented token; a decoded account ID is not proof of identity.
    if (!payload && this.supabase?.adminClient) {
      try {
        const { data: sbData, error: sbErr } = await this.supabase.adminClient.auth.getUser(token);
        if (sbData?.user?.id && !sbErr) {
          payload = { sub: sbData.user.id, audience: 'authenticated' };
          userEmail = sbData.user.email;
        }
      } catch {}
    }

    // 1.2 Xác thực dự phòng qua HTTP REST API tới Supabase Auth Server
    if (!payload) {
      try {
        const sbUrl = this.config.get<string>('SUPABASE_URL');
        const sbAnon = this.config.get<string>('SUPABASE_ANON_KEY');
        if (!sbUrl || !sbAnon) throw new Error('Supabase Auth is not configured.');
        const res = await fetch(`${sbUrl.replace(/\/+$/, '')}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: sbAnon,
          },
        });
        if (res.ok) {
          const sbUser: any = await res.json();
          if (sbUser?.id) {
            payload = { sub: sbUser.id, audience: 'authenticated' };
            userEmail = sbUser.email;
          }
        }
      } catch {}
    }

    // 2. Xác thực JWT nội bộ của backend (audience: 'mld-admin')
    if (!payload && backendSecret && backendSecret.length >= 32) {
      try {
        const decoded = this.jwt.verify(token, {
          secret: backendSecret,
          audience: 'mld-admin',
        });
        payload = decoded;
        userEmail = (decoded as any)?.email;
      } catch {}
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Vui lòng đăng nhập quản trị.');
    }

    let user: any = null;
    try {
      const { rows } = await this.db.connection.query(
        'SELECT id, full_name, role, is_active FROM users WHERE id=$1',
        [payload.sub],
      );
      user = rows[0];
    } catch {}

    if (!user && this.supabase?.adminClient) {
      try {
        let query = this.supabase.adminClient
          .from('users')
          .select('id, full_name, role, is_active');
        query = query.eq('id', payload.sub);
        const { data } = await query.maybeSingle();
        user = data;
      } catch {}
    }

    if (!user || user.is_active === false)
      throw new ForbiddenException('Tài khoản không hoạt động.');

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      let permissions: string[] = [];
      let scopes: any[] = [];

      try {
        const grants = await this.db.connection.query(
          `SELECT DISTINCT p.code,ur.branch_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1`,
          [user.id],
        );
        permissions = grants.rows.map((row) => row.code);
        scopes = grants.rows.map(row => ({ permission: row.code, branchId: row.branch_id || null }));
      } catch {}

      if (!permissions.length && this.supabase?.adminClient) {
        try {
          const { data: userRoles } = await this.supabase.adminClient
            .from('user_roles')
            .select('role_id, branch_id')
            .eq('user_id', user.id);
          if (Array.isArray(userRoles) && userRoles.length > 0) {
            const roleIds = userRoles.map((r: any) => r.role_id);
            const { data: rolePerms } = await this.supabase.adminClient
              .from('role_permissions')
              .select('permission_id, permissions(code)')
              .in('role_id', roleIds);
            if (Array.isArray(rolePerms)) {
              permissions = Array.from(new Set(rolePerms.map((rp: any) => (rp as any)?.permissions?.code).filter(Boolean)));
            }
            scopes = userRoles.map((ur: any) => ({ permission: '', branchId: ur.branch_id || null }));
          }
        } catch {}
      }

      const route = String(req.route?.path || '');
      const commandPermission = route.includes('cashier/')
        ? (route.endsWith('/collect') ? 'cashier.collect' : 'cashier.shifts') : null;
      const table = req.params.table;
      const operation =
        req.method === 'GET'
          ? 'read'
          : String(req.route?.path || '')
              .split('/')
              .pop();
      if (
        !permissions.length ||
        (commandPermission && !permissions.includes(commandPermission)) ||
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
      user.scopes = scopes;
    }
    req.admin = user;
    return true;
  }
}
