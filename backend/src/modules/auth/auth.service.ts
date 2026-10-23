import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SupabaseService } from '../../database/supabase.service';
import { RedisService } from '../../database/redis.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailRegisterDto } from './dto/email-register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { AccountLinkDto } from './dto/account-link.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtlSeconds = 30 * 24 * 3600; // 30 ngày

  constructor(
    private supabaseService: SupabaseService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private passwordHasherService: PasswordHasherService,
    private otpService: OtpService,
    private emailService: EmailService,
  ) {}

  /**
   * Đăng ký tài khoản bằng Số điện thoại (Legacy / Phone flow)
   */
  async register(registerDto: RegisterDto) {
    const { phone, password, fullName, email } = registerDto;

    const { data: existingUser } = await this.supabaseService.adminClient
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('Số điện thoại này đã được đăng ký tài khoản');
    }

    if (email) {
      const { data: existingEmail } = await this.supabaseService.adminClient
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existingEmail) {
        throw new ConflictException('Địa chỉ email này đã được sử dụng bởi một tài khoản khác');
      }
    }

    const passwordHash = await this.passwordHasherService.hashPassword(password);
    const referralCode = `MLD${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { data: newUser, error } = await this.supabaseService.adminClient
      .from('users')
      .insert({
        phone,
        password_hash: passwordHash,
        full_name: fullName,
        email: email || null,
        role: 'CUSTOMER',
        referral_code: referralCode,
        is_phone_verified: true,
        is_active: true,
      })
      .select('id, phone, email, full_name, role, avatar_url')
      .single();

    if (error || !newUser) {
      throw new Error(`Không thể khởi tạo tài khoản: ${error?.message}`);
    }

    // Ghi nhận định danh SĐT
    await this.supabaseService.adminClient.from('auth_identities').insert({
      user_id: newUser.id,
      provider: 'PHONE_OTP',
      identifier: phone,
      password_hash: passwordHash,
      is_verified: true,
    });

    const tokens = await this.generateTokens(newUser.id, newUser.phone, newUser.role);
    return {
      user: newUser,
      ...tokens,
    };
  }

  /**
   * Đăng ký tài khoản bằng Email: Gửi mã OTP xác thực về Email trước khi cấp token
   */
  async registerEmail(dto: EmailRegisterDto) {
    const { email, password, fullName, phone } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra Email đã tồn tại trong bảng users chưa
    const { data: existingUser } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, password_hash, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.password_hash) {
        throw new ConflictException('Địa chỉ email này đã có tài khoản. Vui lòng đăng nhập hoặc sử dụng Quên mật khẩu.');
      }
      // Đã có user (đăng ký qua SĐT trước đó nhưng chưa có mật khẩu email) -> Đề xuất liên kết
      const rawOtp = await this.otpService.generateAndSaveOtp(normalizedEmail, 'ACCOUNT_LINKING');
      this.emailService.sendOtpEmail({
        to: normalizedEmail,
        otp: rawOtp,
        purpose: 'ACCOUNT_LINKING',
        fullName: existingUser.full_name,
      }).catch(err => this.logger.error(`Email sending error: ${err.message}`));
      return {
        needAccountLinking: true,
        message: 'Email này đã gắn với tài khoản số điện thoại của bạn. Hệ thống đã gửi mã OTP xác nhận để kích hoạt đăng nhập Email.',
        email: normalizedEmail,
      };
    }

    // 2. Kiểm tra số điện thoại (nếu có truyền)
    if (phone) {
      const { data: existingPhone } = await this.supabaseService.adminClient
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();
      if (existingPhone) {
        throw new ConflictException('Số điện thoại này đã được sử dụng bởi một tài khoản khác');
      }
    }

    // 3. Hash mật khẩu và lưu thông tin đăng ký chờ xác thực vào Redis
    const passwordHash = await this.passwordHasherService.hashPassword(password);
    const pendingData = JSON.stringify({
      email: normalizedEmail,
      fullName,
      passwordHash,
      phone: phone || null,
    });
    await this.redisService.set(`pending_email_reg:${normalizedEmail}`, pendingData, 900); // 15 phút

    // 4. Sinh OTP an toàn, băm trước khi lưu và gửi Email thật (không chặn luồng HTTP)
    const rawOtp = await this.otpService.generateAndSaveOtp(normalizedEmail, 'REGISTER');
    this.emailService.sendOtpEmail({
      to: normalizedEmail,
      otp: rawOtp,
      purpose: 'REGISTER',
      fullName,
    }).catch(err => this.logger.error(`Email sending error: ${err.message}`));

    return {
      success: true,
      message: 'Mã xác thực OTP gồm 6 chữ số đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.',
      email: normalizedEmail,

    };
  }

  /**
   * Gửi lại mã xác thực OTP tới Email
   */
  async resendEmailOtp(email: string, purpose: 'REGISTER' | 'RESET_PASSWORD' | 'ACCOUNT_LINKING' | 'LOGIN' = 'REGISTER') {
    const normalizedEmail = email.toLowerCase().trim();
    const pendingJson = await this.redisService.get(`pending_email_reg:${normalizedEmail}`);
    let fullName: string | undefined;
    if (pendingJson) {
      try {
        const pending = JSON.parse(pendingJson);
        fullName = pending.fullName;
      } catch (_) {}
    }

    const rawOtp = await this.otpService.generateAndSaveOtp(normalizedEmail, purpose);
    this.emailService.sendOtpEmail({
      to: normalizedEmail,
      otp: rawOtp,
      purpose,
      fullName,
    }).catch(err => this.logger.error(`Email sending error: ${err.message}`));

    return {
      success: true,
      message: 'Mã xác thực OTP gồm 6 chữ số đã được gửi lại tới email của bạn. Vui lòng kiểm tra hộp thư.',
      email: normalizedEmail,

    };
  }

  /**
   * Xác thực OTP hoàn tất đăng ký Email -> Kích hoạt tài khoản và cấp Token
   */
  async verifyEmailRegister(dto: VerifyEmailOtpDto) {
    const { email, otp } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Xác thực OTP đã băm
    await this.otpService.verifyOtp(normalizedEmail, 'REGISTER', otp);

    // 2. Lấy dữ liệu tạm từ Redis
    const pendingDataStr = await this.redisService.get(`pending_email_reg:${normalizedEmail}`);
    let pending: any = null;
    if (pendingDataStr) {
      try {
        pending = JSON.parse(pendingDataStr);
      } catch (_) {}
    }

    // Kiểm tra xem tài khoản đã tồn tại trong bảng users chưa
    const { data: existingUser } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, full_name, role, avatar_url')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!pending && !existingUser) {
      throw new BadRequestException('Phiên đăng ký đã hết hạn. Vui lòng thực hiện lại từ đầu.');
    }

    let userRecord = existingUser;

    if (!userRecord && pending) {
      // 3. Tạo tài khoản trong bảng users
      const referralCode = `MLD${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data: newUser, error } = await this.supabaseService.adminClient
        .from('users')
        .insert({
          email: normalizedEmail,
          phone: pending.phone || null,
          password_hash: pending.passwordHash,
          full_name: pending.fullName || 'Khách hàng MLD',
          role: 'CUSTOMER',
          referral_code: referralCode,
          is_email_verified: true,
          is_phone_verified: !!pending.phone,
          is_active: true,
        })
        .select('id, phone, email, full_name, role, avatar_url')
        .maybeSingle();

      if (error || !newUser) {
        throw new Error(`Không thể khởi tạo tài khoản người dùng: ${error?.message}`);
      }
      userRecord = newUser;

      // 4. Lưu liên kết định danh trong bảng auth_identities
      try {
        await this.supabaseService.adminClient.from('auth_identities').upsert({
          user_id: userRecord.id,
          provider: 'EMAIL_PASSWORD',
          identifier: normalizedEmail,
          password_hash: pending.passwordHash,
          is_verified: true,
        }, { onConflict: 'provider,identifier' });
      } catch (_) {}

      // 5. Khởi tạo thiết lập người dùng mặc định
      try {
        await this.supabaseService.adminClient.from('user_settings').upsert({
          user_id: userRecord.id,
          language: 'vi',
          appointment_reminder: true,
          promotion_notify: true,
          system_notify: true,
        }, { onConflict: 'user_id' });
      } catch (_) {}
    } else if (userRecord) {
      await this.supabaseService.adminClient
        .from('users')
        .update({ is_email_verified: true, is_active: true })
        .eq('id', userRecord.id);
    }

    // 6. Xóa cache đăng ký tạm
    await this.redisService.del(`pending_email_reg:${normalizedEmail}`);

    // 7. Cấp Access Token (30m) & Refresh Token (30d)
    const tokens = await this.generateTokens(userRecord.id, userRecord.email, userRecord.role || 'CUSTOMER');
    return {
      message: 'Kích hoạt tài khoản thành công',
      user: userRecord,
      ...tokens,
    };
  }

  /**
   * Đăng nhập hợp nhất (Hỗ trợ Identifier là Phone hoặc Email)
   */
  async login(loginDto: LoginDto) {
    const { identifier, password, fcmToken } = loginDto;
    const cleanId = identifier.trim();

    // 1. Tìm user theo số điện thoại hoặc email
    const { data: user, error } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, password_hash, full_name, role, is_active, avatar_url')
      .or(`phone.eq.${cleanId},email.eq.${cleanId.toLowerCase()}`)
      .maybeSingle();

    if (error || !user) {
      await this.recordFailedLoginAttempt(cleanId);
      throw new UnauthorizedException('Thông tin tài khoản hoặc mật khẩu không chính xác');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản này đã bị tạm khóa');
    }

    // 2. Kiểm tra mật khẩu qua PasswordHasherService
    const isPasswordValid = await this.passwordHasherService.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      await this.recordFailedLoginAttempt(cleanId);
      throw new UnauthorizedException('Thông tin tài khoản hoặc mật khẩu không chính xác');
    }

    // Xóa số lần nhập sai nếu đăng nhập thành công
    await this.redisService.del(`failed_login:${cleanId.toLowerCase()}`);

    // 3. Cập nhật FCM Token nếu có
    if (fcmToken) {
      await this.supabaseService.adminClient
        .from('users')
        .update({ fcm_device_token: fcmToken })
        .eq('id', user.id);
    }

    // 4. Trả về thông tin và bộ Tokens (Access Token 30m + Refresh Token 30d)
    const { password_hash, ...userInfo } = user;
    const tokens = await this.generateTokens(user.id, user.phone || user.email, user.role);

    return {
      user: userInfo,
      ...tokens,
    };
  }

  /**
   * Đăng nhập trực tiếp bằng Email & Password
   */
  async loginEmail(dto: EmailLoginDto) {
    return this.login({
      identifier: dto.email,
      password: dto.password,
      fcmToken: dto.fcmToken,
    });
  }

  /**
   * Validate user bằng email & password cho Passport Strategy
   */
  async validateUserByEmail(email: string, pass: string): Promise<any> {
    const cleanEmail = email.toLowerCase().trim();
    const { data: user } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, password_hash, full_name, role, is_active')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!user || !user.is_active) return null;
    const match = await this.passwordHasherService.comparePassword(pass, user.password_hash);
    if (!match) return null;

    const { password_hash, ...result } = user;
    return result;
  }

  /**
   * Làm mới Access Token thông qua Refresh Token (Silent Refresh / Token Rotation)
   */
  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super-secret-refresh-token-key-mld-vietnam-2026';

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const { sub: userId, jti, role, identifier } = payload;
    if (!userId || !jti) {
      throw new UnauthorizedException('Cấu trúc Refresh Token không hợp lệ');
    }

    // 1. Kiểm tra Token trong Redis
    const redisKey = `refresh_token:${userId}:${jti}`;
    const tokenExists = await this.redisService.get(redisKey);

    if (!tokenExists) {
      // Token Reuse Detection: Nếu token không còn trong Redis hoặc bị revoked, thu hồi toàn bộ token của user
      this.logger.warn(`⚠️ Phát hiện hành vi tái sử dụng Refresh Token bị thu hồi: user=${userId}, jti=${jti}`);
      await this.revokeAllTokens(userId);
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi.');
    }

    // 2. Thu hồi Token cũ (Token Rotation)
    await this.redisService.del(redisKey);
    try {
      await this.supabaseService.adminClient
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('jti', jti);
    } catch {}

    // 3. Tạo bộ Token mới
    const tokens = await this.generateTokens(userId, identifier || '', role || 'CUSTOMER');
    return {
      message: 'Làm mới phiên đăng nhập thành công',
      ...tokens,
    };
  }

  /**
   * Đăng xuất và thu hồi Refresh Token
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const refreshSecret =
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super-secret-refresh-token-key-mld-vietnam-2026';
        const payload: any = this.jwtService.verify(refreshToken, { secret: refreshSecret, ignoreExpiration: true });
        if (payload?.jti) {
          await this.redisService.del(`refresh_token:${userId}:${payload.jti}`);
          await this.supabaseService.adminClient
            .from('refresh_tokens')
            .update({ is_revoked: true })
            .eq('jti', payload.jti);
        }
      } catch {}
    } else {
      await this.revokeAllTokens(userId);
    }

    return { success: true, message: 'Đăng xuất thành công, phiên làm việc đã được thu hồi.' };
  }

  /**
   * Quên mật khẩu: Gửi OTP xác minh về Email
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    const { data: user } = await this.supabaseService.adminClient
      .from('users')
      .select('id, email, full_name')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!user) {
      // Để bảo mật thông tin, không tiết lộ email có tồn tại hay không
      return {
        success: true,
        message: 'Nếu địa chỉ email tồn tại trong hệ thống, mã xác thực OTP sẽ được gửi về hộp thư của bạn.',
      };
    }

    const rawOtp = await this.otpService.generateAndSaveOtp(cleanEmail, 'RESET_PASSWORD');
    this.emailService.sendOtpEmail({
      to: cleanEmail,
      otp: rawOtp,
      purpose: 'RESET_PASSWORD',
      fullName: user.full_name,
    }).catch(err => this.logger.error(`Email sending error: ${err.message}`));

    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.',
    };
  }

  /**
   * Đặt lại mật khẩu mới sau khi xác thực OTP thành công
   */
  async resetPassword(dto: ResetPasswordDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    await this.otpService.verifyOtp(cleanEmail, 'RESET_PASSWORD', dto.otp);

    const newHash = await this.passwordHasherService.hashPassword(dto.newPassword);

    const { data: user, error } = await this.supabaseService.adminClient
      .from('users')
      .update({ password_hash: newHash })
      .eq('email', cleanEmail)
      .select('id')
      .single();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy tài khoản để cập nhật mật khẩu');
    }

    // Cập nhật cả trong auth_identities
    await this.supabaseService.adminClient
      .from('auth_identities')
      .update({ password_hash: newHash })
      .eq('user_id', user.id)
      .eq('identifier', cleanEmail);

    // Thu hồi tất cả các phiên đăng nhập cũ để đảm bảo an toàn
    await this.revokeAllTokens(user.id);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
    };
  }

  /**
   * Liên kết tài khoản: Bổ sung Email & Mật khẩu vào tài khoản đã đăng ký bằng SĐT
   */
  async linkAccountWithEmail(userId: string, dto: AccountLinkDto) {
    const cleanEmail = dto.email.toLowerCase().trim();
    await this.otpService.verifyOtp(cleanEmail, 'ACCOUNT_LINKING', dto.otp);

    const passwordHash = await this.passwordHasherService.hashPassword(dto.password);

    await this.supabaseService.adminClient
      .from('users')
      .update({
        email: cleanEmail,
        password_hash: passwordHash,
        is_email_verified: true,
      })
      .eq('id', userId);

    await this.supabaseService.adminClient.from('auth_identities').upsert(
      {
        user_id: userId,
        provider: 'EMAIL_PASSWORD',
        identifier: cleanEmail,
        password_hash: passwordHash,
        is_verified: true,
      },
      { onConflict: 'provider,identifier' },
    );

    return {
      success: true,
      message: 'Liên kết Email và thiết lập mật khẩu thành công.',
    };
  }

  async getProfile(userId: string) {
    const { data: user, error } = await this.supabaseService.adminClient
      .from('users')
      .select('id, phone, email, full_name, avatar_url, gender, date_of_birth, address, role, created_at, is_email_verified, is_phone_verified')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    return user;
  }

  /**
   * Cập nhật số điện thoại cho tài khoản (đặc biệt khi đăng ký bằng Email)
   */
  async updatePhone(userId: string, phone: string) {
    if (!phone) {
      throw new BadRequestException('Số điện thoại không được để trống');
    }
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(cleanPhone)) {
      throw new BadRequestException('Số điện thoại không đúng định dạng Việt Nam (10 chữ số)');
    }

    // Kiểm tra số điện thoại đã tồn tại cho tài khoản khác chưa
    const { data: existingUser } = await this.supabaseService.adminClient
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .neq('id', userId)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('Số điện thoại này đã được sử dụng bởi một tài khoản khác');
    }

    // Cập nhật bảng users trong Supabase
    const { data: updatedUser, error } = await this.supabaseService.adminClient
      .from('users')
      .update({
        phone: cleanPhone,
        is_phone_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, phone, email, full_name, avatar_url')
      .single();

    if (error) {
      throw new BadRequestException(`Không thể cập nhật số điện thoại: ${error.message}`);
    }

    // Đồng thời cập nhật identity PHONE_OTP nếu chưa có
    try {
      await this.supabaseService.adminClient.from('auth_identities').upsert(
        {
          user_id: userId,
          provider: 'PHONE_OTP',
          identifier: cleanPhone,
          is_verified: true,
        },
        { onConflict: 'provider,identifier' },
      );
    } catch (_) {}

    return {
      success: true,
      message: 'Cập nhật số điện thoại thành công',
      user: updatedUser,
    };
  }

  /**
   * Cấp cặp Tokens: Access Token (30m) & Refresh Token (30d) kèm cơ chế lưu trữ Redis & DB
   */
  private async generateTokens(userId: string, identifier: string, role: string) {
    const jti = crypto.randomUUID();
    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'super-secret-jwt-key-medical-healthcare-2026';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super-secret-refresh-token-key-mld-vietnam-2026';

    const accessPayload = { sub: userId, identifier, role };
    const refreshPayload = { sub: userId, jti, identifier, role };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: accessSecret,
      expiresIn: '30m',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: '30d',
    });

    // 1. Lưu Refresh Token vào Redis với TTL 30 ngày
    const redisKey = `refresh_token:${userId}:${jti}`;
    await this.redisService.set(redisKey, 'ACTIVE', this.refreshTtlSeconds);

    // 2. Lưu vào DB để kiểm toán
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000).toISOString();
    try {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.supabaseService.adminClient.from('refresh_tokens').insert({
        user_id: userId,
        token_hash: tokenHash,
        jti,
        expires_at: expiresAt,
        is_revoked: false,
      });
    } catch {}

    return {
      accessToken,
      refreshToken,
      expiresIn: 1800, // 30 phút tính theo giây
    };
  }

  /**
   * Ghi nhận và khóa tạm tài khoản nếu đăng nhập sai quá 5 lần liên tiếp
   */
  private async recordFailedLoginAttempt(identifier: string) {
    const key = `failed_login:${identifier.toLowerCase()}`;
    const attempts = await this.redisService.incr(key, 900); // 15 phút
    if (attempts >= 5) {
      await this.redisService.set(`account_lock:${identifier.toLowerCase()}`, 'LOCKED', 900);
      this.logger.warn(`🔒 Tài khoản ${identifier} bị khóa tạm thời 15 phút do nhập sai 5 lần.`);
    }
  }

  /**
   * Thu hồi toàn bộ Refresh Token của User
   */
  private async revokeAllTokens(userId: string) {
    try {
      await this.supabaseService.adminClient
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId);
    } catch {}
  }
}
