import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SettingsService } from './settings.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('SettingsService (Backend Admin Settings)', () => {
  let service: SettingsService;
  let mockSupabase: any;
  let mockDb: any;

  beforeEach(() => {
    mockSupabase = {
      adminClient: {
        from: vi.fn(),
      },
    };

    mockDb = {
      connection: {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      },
    };

    service = new SettingsService(mockSupabase, mockDb);
  });

  describe('getSettings', () => {
    it('throws ForbiddenException if adminUser is missing', async () => {
      await expect(service.getSettings(null)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for invalid category', async () => {
      const admin = { id: 'admin-1', role: 'SUPER_ADMIN' };
      await expect(service.getSettings(admin, 'invalid_cat')).rejects.toThrow(NotFoundException);
    });

    it('returns category data from system_settings table', async () => {
      const admin = { id: 'admin-1', role: 'SUPER_ADMIN' };
      const sampleData = { company_name: 'MLD Vietnam' };

      mockSupabase.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { category: 'general', data: sampleData, updated_at: '2026-11-14T12:00:00Z' },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getSettings(admin, 'general');
      expect(result.category).toBe('general');
      expect(result.data.company_name).toBe('MLD Vietnam');
    });
  });

  describe('updateSettings', () => {
    it('rejects update if user role is not SUPER_ADMIN or ADMIN', async () => {
      const cashier = { id: 'cashier-1', role: 'CASHIER' };
      await expect(service.updateSettings(cashier, 'general', { foo: 'bar' })).rejects.toThrow(ForbiddenException);
    });

    it('saves updated settings and records audit log', async () => {
      const admin = { id: 'super-admin-1', role: 'SUPER_ADMIN' };
      const newSettings = { open_time: '08:00', close_time: '21:30' };

      mockSupabase.adminClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { category: 'booking', data: newSettings, updated_at: '2026-11-14T12:05:00Z' },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.updateSettings(admin, 'booking', newSettings);
      expect(result.success).toBe(true);
      expect(result.data.open_time).toBe('08:00');
      expect(mockDb.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        ['super-admin-1', 'UPDATE_SETTINGS', 'system_settings', 'booking'],
      );
    });
  });

  describe('testZnsConnection', () => {
    it('returns error message if ZNS is disabled in settings', async () => {
      const admin = { id: 'admin-1', role: 'SUPER_ADMIN' };

      mockSupabase.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { data: { zns_enabled: false } },
            }),
          }),
        }),
      });

      const result = await service.testZnsConnection(admin);
      expect(result.success).toBe(false);
      expect(result.message).toContain('TẮT');
    });

    it('returns success message if ZNS is configured and active', async () => {
      const admin = { id: 'admin-1', role: 'SUPER_ADMIN' };

      mockSupabase.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { data: { zns_enabled: true, zns_oa_id: '123456789' } },
            }),
          }),
        }),
      });

      const result = await service.testZnsConnection(admin);
      expect(result.success).toBe(true);
      expect(result.message).toContain('123456789');
    });
  });

  describe('changePassword', () => {
    it('rejects if old password does not match', async () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const hash = await bcrypt.hash('CorrectPassword123!', 10);

      mockSupabase.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'admin-1', password_hash: hash },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.changePassword(admin, {
          oldPassword: 'WrongPassword!',
          newPassword: 'BrandNewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password hash when old password matches', async () => {
      const admin = { id: 'admin-1', role: 'ADMIN' };
      const hash = await bcrypt.hash('CorrectPassword123!', 10);

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'admin-1', password_hash: hash },
              error: null,
            }),
          }),
        }),
        update: updateMock,
      });

      const result = await service.changePassword(admin, {
        oldPassword: 'CorrectPassword123!',
        newPassword: 'BrandNewPassword123!',
      });

      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
