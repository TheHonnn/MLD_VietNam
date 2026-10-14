import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../../database/supabase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { phone, password, fullName, email } = registerDto;

    // 1. Kiểm tra số điện thoại đã tồn tại chưa
    const { data: existingUser } = await this.supabaseService.adminClient
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('Số điện thoại này đã được đăng ký tài khoản');
    }

    // 2. Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Tạo tài khoản mới trong bảng users
    const { data: newUser, error } = await this.supabaseService.adminClient
      .from('users')
      .insert({
        phone,
        password_hash: passwordHash,
        full_name: fullName,
        email: email || null,
        role: 'PATIENT',
      })
      .select('id, phone, email, full_name, role, avatar_url')
      .single();

    if (error || !newUser) {
      throw new Error(`Không thể khởi tạo tài khoản: ${error?.message}`);
    }

    // 4. Cấp JWT Token
    const tokens = this.generateTokens(newUser.id, newUser.phone, newUser.role);

    return {
      user: newUser,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { identifier, password, fcmToken } = loginDto;

    // 1. Tìm user theo số điện thoại hoặc email
    const { data: user, error } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, password_hash, full_name, role, is_active, avatar_url')
      .or(`phone.eq.${identifier},email.eq.${identifier}`)
      .maybeSingle();

    if (error || !user) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không chính xác');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản này đã bị tạm khóa');
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Số điện thoại hoặc mật khẩu không chính xác');
    }

    // 3. Cập nhật FCM Token nếu có
    if (fcmToken) {
      await this.supabaseService.adminClient
        .from('users')
        .update({ fcm_device_token: fcmToken })
        .eq('id', user.id);
    }

    // 4. Trả về thông tin và Token
    const { password_hash, ...userInfo } = user;
    const tokens = this.generateTokens(user.id, user.phone, user.role);

    return {
      user: userInfo,
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const { data: user, error } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, full_name, avatar_url, gender, date_of_birth, address, role, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    return user;
  }

  private generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}

