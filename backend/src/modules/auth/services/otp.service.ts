import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../../../database/redis.service';
import { SupabaseService } from '../../../database/supabase.service';

export type OtpPurpose = 'REGISTER' | 'RESET_PASSWORD' | 'ACCOUNT_LINKING' | 'LOGIN';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpTtlSeconds = 300; // 5 phút
  private readonly maxAttempts = 5;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Tạo mã OTP ngẫu nhiên an toàn (CSPRNG), mã hóa bằng SHA-256 + Secret Salt trước khi lưu trữ
   * Trả về mã OTP dạng thô duy nhất 1 lần để gửi email/SMS tới người dùng
   */
  async generateAndSaveOtp(identifier: string, purpose: OtpPurpose): Promise<string> {
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(rawOtp, identifier);

    // 1. Lưu bản băm vào Redis để truy xuất tốc độ cao (TTL 5 phút)
    const redisKey = `otp:${purpose}:${identifier}`;
    const payload = JSON.stringify({
      otpHash,
      attempts: 0,
      createdAt: Date.now(),
    });
    await this.redisService.set(redisKey, payload, this.otpTtlSeconds);

    // 2. Ghi nhận vào Database bảng otp_verifications để lưu vết kiểm toán
    const expiresAt = new Date(Date.now() + this.otpTtlSeconds * 1000).toISOString();
    try {
      await this.supabaseService.adminClient
        .from('otp_verifications')
        .insert({
          identifier,
          purpose,
          otp_hash: otpHash,
          attempts: 0,
          max_attempts: this.maxAttempts,
          expires_at: expiresAt,
          is_used: false,
        });
    } catch (err: any) {
      this.logger.warn(`Không thể ghi log OTP vào DB: ${err.message}`);
    }

    this.logger.log(`🔑 Đã tạo và mã hóa OTP cho [${purpose}] -> ${identifier}`);
    return rawOtp;
  }

  /**
   * Xác thực mã OTP người dùng nhập vào
   * So khớp mã băm, đếm số lần nhập sai, chặn tấn công Brute-force
   */
  async verifyOtp(identifier: string, purpose: OtpPurpose, rawOtp: string): Promise<boolean> {
    const redisKey = `otp:${purpose}:${identifier}`;
    const dataStr = await this.redisService.get(redisKey);

    if (!dataStr) {
      // Thử tìm trong DB nếu cache hết hạn hoặc mất kết nối
      const { data: dbOtp } = await this.supabaseService.adminClient
        .from('otp_verifications')
        .select('*')
        .eq('identifier', identifier)
        .eq('purpose', purpose)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!dbOtp) {
        throw new BadRequestException('Mã xác thực đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.');
      }

      if (dbOtp.attempts >= dbOtp.max_attempts) {
        throw new BadRequestException('Mã xác thực đã bị vô hiệu do nhập sai quá nhiều lần.');
      }

      const inputHash = this.hashOtp(rawOtp, identifier);
      if (inputHash !== dbOtp.otp_hash) {
        await this.supabaseService.adminClient
          .from('otp_verifications')
          .update({ attempts: dbOtp.attempts + 1 })
          .eq('id', dbOtp.id);
        throw new BadRequestException(`Mã xác thực không chính xác. Bạn còn ${dbOtp.max_attempts - dbOtp.attempts - 1} lần thử.`);
      }

      // Đánh dấu đã dùng
      await this.supabaseService.adminClient
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('id', dbOtp.id);

      return true;
    }

    const cached = JSON.parse(dataStr);
    if (cached.attempts >= this.maxAttempts) {
      await this.redisService.del(redisKey);
      throw new BadRequestException('Bạn đã nhập sai mã xác thực quá số lần quy định. Vui lòng nhận mã mới.');
    }

    const inputHash = this.hashOtp(rawOtp, identifier);
    if (inputHash !== cached.otpHash) {
      cached.attempts += 1;
      const remainingSeconds = Math.max(1, Math.floor((cached.createdAt + this.otpTtlSeconds * 1000 - Date.now()) / 1000));
      await this.redisService.set(redisKey, JSON.stringify(cached), remainingSeconds);
      throw new BadRequestException(`Mã xác thực không chính xác. Bạn còn ${this.maxAttempts - cached.attempts} lần thử.`);
    }

    // Xác thực thành công: xóa ngay OTP khỏi Redis
    await this.redisService.del(redisKey);

    // Cập nhật trạng thái trong DB
    try {
      await this.supabaseService.adminClient
        .from('otp_verifications')
        .update({ is_used: true })
        .eq('identifier', identifier)
        .eq('purpose', purpose)
        .eq('is_used', false);
    } catch {}

    return true;
  }

  /**
   * Băm mã OTP bằng SHA-256 kết hợp identifier và secret salt
   */
  private hashOtp(rawOtp: string, identifier: string): string {
    const salt = this.configService.get<string>('JWT_SECRET', 'mld-otp-salt-key-2026');
    return crypto
      .createHmac('sha256', salt)
      .update(`${identifier}:${rawOtp.trim()}`)
      .digest('hex');
  }
}

