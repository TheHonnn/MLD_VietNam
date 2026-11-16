import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZaloService } from './zalo.service';
import { ConfigService } from '@nestjs/config';

describe('ZaloService', () => {
  let zaloService: ZaloService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultVal: string) => {
        if (key === 'ZALO_APP_ID') return '242827298952470050';
        if (key === 'ZALO_APP_SECRET') return 'p7RikVqQ6bHyfEVn9e2L';
        if (key === 'ZALO_OA_ID') return '1424469774232439257';
        if (key === 'ZALO_OA_REFRESH_TOKEN') return 'mock_refresh_token';
        if (key === 'ZALO_OA_ACCESS_TOKEN') return 'mock_access_token';
        if (key === 'ZALO_ZNS_OTP_TEMPLATE_ID') return '351234';
        return defaultVal;
      }),
    };

    zaloService = new ZaloService(mockConfigService as ConfigService);
  });

  describe('normalizePhone', () => {
    it('should format 0987654321 to 84987654321', () => {
      const res = zaloService.normalizePhone('0987654321');
      expect(res).toBe('84987654321');
    });

    it('should format 84987654321 as is', () => {
      const res = zaloService.normalizePhone('84987654321');
      expect(res).toBe('84987654321');
    });

    it('should remove special characters and spaces', () => {
      const res = zaloService.normalizePhone('+84 987-654-321');
      expect(res).toBe('84987654321');
    });
  });

  describe('sendOtpZns', () => {
    it('should fail cleanly when template ID is not configured', async () => {
      const unconfiguredService = new ZaloService({
        get: vi.fn().mockReturnValue(''),
      } as unknown as ConfigService);

      const res = await unconfiguredService.sendOtpZns('0987654321', '123456');
      expect(res.success).toBe(false);
      expect(res.error).toContain('chưa được cấu hình');
    });
  });
});
