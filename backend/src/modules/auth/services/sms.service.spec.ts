import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';

describe('SmsService', () => {
  let smsService: SmsService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultVal: string) => {
        if (key === 'SMS_PROVIDER') return 'SANDBOX';
        if (key === 'SMS_BRANDNAME') return 'MLD Vietnam';
        return defaultVal;
      }),
    };

    smsService = new SmsService(mockConfigService as ConfigService);
  });

  describe('normalizePhoneNumber', () => {
    it('should format 0987654321 correctly', () => {
      const res = smsService.normalizePhoneNumber('0987654321');
      expect(res.local).toBe('0987654321');
      expect(res.international).toBe('+84987654321');
    });

    it('should format +84987654321 correctly', () => {
      const res = smsService.normalizePhoneNumber('+84987654321');
      expect(res.local).toBe('0987654321');
      expect(res.international).toBe('+84987654321');
    });

    it('should format numbers with spaces and dashes', () => {
      const res = smsService.normalizePhoneNumber('098-765-4321');
      expect(res.local).toBe('0987654321');
      expect(res.international).toBe('+84987654321');
    });
  });

  describe('sendOtpSms in Sandbox mode', () => {
    it('should return true in Sandbox mode without making network calls', async () => {
      const result = await smsService.sendOtpSms({
        to: '0987654321',
        otp: '123456',
      });
      expect(result).toBe(true);
    });
  });
});
