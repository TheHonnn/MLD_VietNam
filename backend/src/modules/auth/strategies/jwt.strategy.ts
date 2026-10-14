import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../database/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key-medical-healthcare-2026',
    });
  }

  async validate(payload: { sub: string; phone: string; role: string }) {
    const { data: user, error } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, full_name, role, is_active, avatar_url')
      .eq('id', payload.sub)
      .single();

    if (error || !user || !user.is_active) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc tài khoản bị khóa');
    }

    return user;
  }
}

