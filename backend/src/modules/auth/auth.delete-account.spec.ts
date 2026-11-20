import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService - Delete Account', () => {
  let authService: AuthService;
  let usersUpdatePayload: any;
  let userUpdateResult: { error: { message: string } | null };
  let deletedTables: string[];

  beforeEach(() => {
    usersUpdatePayload = null;
    userUpdateResult = { error: null };
    deletedTables = [];

    const mockSupabaseService = {
      adminClient: {
        from: vi.fn((table: string) => {
          if (table === 'refresh_tokens') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          if (table === 'users') {
            return {
              update: vi.fn((payload: any) => {
                usersUpdatePayload = payload;
                return {
                  eq: vi.fn().mockResolvedValue(userUpdateResult),
                };
              }),
            };
          }
          if (table === 'auth_identities' || table === 'user_settings') {
            deletedTables.push(table);
            return {
              delete: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            };
          }
          return {};
        }),
      },
    };

    const mockRedisService = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
    const mockJwtService = { sign: vi.fn(), signAsync: vi.fn() };
    const mockConfigService = {
      get: vi.fn((key: string, defaultVal: string) => defaultVal || 'test_secret'),
    };
    const mockPasswordHasherService = {
      hashPassword: vi.fn(),
      comparePassword: vi.fn(),
    };
    const mockOtpService = { generateAndSaveOtp: vi.fn(), verifyOtp: vi.fn() };
    const mockEmailService = { sendOtpEmail: vi.fn() };
    const mockSmsService = { sendOtpSms: vi.fn() };
    const mockZaloService = { sendOtpZns: vi.fn() };

    authService = new AuthService(
      mockSupabaseService as any,
      mockRedisService as any,
      mockJwtService as any,
      mockConfigService as any,
      mockPasswordHasherService as any,
      mockOtpService as any,
      mockEmailService as any,
      mockSmsService as any,
      mockZaloService as any,
    );
  });

  it('anonymizes PII with <= 20-char phone fitting VARCHAR(20) and clears sensitive fields', async () => {
    const userId = '4ee38f82-bb0a-4c15-a9d3-868d20a3f0a9';
    const res = await authService.deleteAccount(userId);

    expect(res.success).toBe(true);
    expect(usersUpdatePayload).toBeTruthy();
    expect(usersUpdatePayload.is_active).toBe(false);
    expect(usersUpdatePayload.phone).toMatch(/^del_[0-9a-f]{16}$/);
    expect(usersUpdatePayload.phone.length).toBeLessThanOrEqual(20);
    expect(usersUpdatePayload.email).toBeNull();
    expect(usersUpdatePayload.password_hash).toBeNull();
    expect(usersUpdatePayload.fcm_device_token).toBeNull();
    expect(deletedTables).toContain('auth_identities');
    expect(deletedTables).toContain('user_settings');
  });

  it('throws InternalServerErrorException when users update fails instead of returning success', async () => {
    userUpdateResult = { error: { message: 'value too long for type character varying(20)' } };

    await expect(
      authService.deleteAccount('4ee38f82-bb0a-4c15-a9d3-868d20a3f0a9'),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
