import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('AuthService - Login OTP Flow', () => {
  let authService: AuthService;
  let mockSupabaseService: any;
  let mockRedisService: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockPasswordHasherService: any;
  let mockOtpService: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockSupabaseService = {
      adminClient: {
        from: vi.fn(),
      },
    };

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock_jwt_token'),
      signAsync: vi.fn().mockResolvedValue('mock_jwt_token'),
    };

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultVal: string) => defaultVal || 'test_secret'),
    };

    mockPasswordHasherService = {
      hashPassword: vi.fn(),
      comparePassword: vi.fn(),
    };

    mockOtpService = {
      generateAndSaveOtp: vi.fn().mockResolvedValue('654321'),
      verifyOtp: vi.fn().mockResolvedValue(true),
    };

    mockEmailService = {
      sendOtpEmail: vi.fn().mockResolvedValue(true),
    };

    authService = new AuthService(
      mockSupabaseService,
      mockRedisService,
      mockJwtService,
      mockConfigService,
      mockPasswordHasherService,
      mockOtpService,
      mockEmailService,
    );
  });

  describe('requestLoginOtp', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockSupabaseService.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await expect(
        authService.requestLoginOtp({ email: 'unknown@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user is deactivated', async () => {
      mockSupabaseService.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'u1', email: 'locked@example.com', is_active: false },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        authService.requestLoginOtp({ email: 'locked@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should generate random OTP and send email for active user', async () => {
      mockSupabaseService.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'u1',
                email: 'test@mld.vn',
                full_name: 'Nguyen Van A',
                is_active: true,
                role: 'CUSTOMER',
              },
              error: null,
            }),
          }),
        }),
      });

      const res = await authService.requestLoginOtp({ email: 'test@mld.vn' });

      expect(res.success).toBe(true);
      expect(mockOtpService.generateAndSaveOtp).toHaveBeenCalledWith('test@mld.vn', 'LOGIN');
      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@mld.vn',
          otp: '654321',
          purpose: 'LOGIN',
          fullName: 'Nguyen Van A',
        }),
      );
    });
  });

  describe('verifyLoginOtp', () => {
    it('should verify OTP and return tokens for active user', async () => {
      mockSupabaseService.adminClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'u1',
                    phone: '0987654321',
                    email: 'test@mld.vn',
                    full_name: 'Nguyen Van A',
                    role: 'CUSTOMER',
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'refresh_tokens') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }),
        };
      });

      const res = await authService.verifyLoginOtp({
        email: 'test@mld.vn',
        otp: '654321',
        fcmToken: 'fcm_123',
      });

      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('test@mld.vn', 'LOGIN', '654321');
      expect(res.user.email).toBe('test@mld.vn');
      expect(res.accessToken).toBe('mock_jwt_token');
      expect(res.refreshToken).toBe('mock_jwt_token');
    });
  });
});
