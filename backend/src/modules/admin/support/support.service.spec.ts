import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SupportService } from './support.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('SupportService (Backend Admin Support & Diagnostics)', () => {
  let service: SupportService;
  let mockSupabase: any;
  let mockDb: any;
  let mockConfig: any;

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

    mockConfig = {
      get: vi.fn().mockReturnValue(null),
    };

    service = new SupportService(mockSupabase, mockDb, mockConfig);
  });

  describe('getDiagnostics', () => {
    it('returns healthy status when database is reachable', async () => {
      mockDb.connection.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      const result = await service.getDiagnostics();

      expect(result.status).toBe('healthy');
      expect(result.database.status).toBe('connected');
      expect(typeof result.database.latencyMs).toBe('number');
      expect(result.backend.status).toBe('running');
      expect(result.appVersion).toBe('v1.0.4');
    });

    it('returns unhealthy status when database connection fails', async () => {
      mockDb.connection.query.mockRejectedValue(new Error('Connection timed out'));
      const result = await service.getDiagnostics();

      expect(result.status).toBe('unhealthy');
      expect(result.database.status).toBe('error');
      expect(result.database.error).toContain('Connection timed out');
    });
  });

  describe('getGuides', () => {
    it('returns list of SOP guides ordered by display_order', async () => {
      const mockGuides = [
        { id: 'guide-1', title: 'SOP Thu ngân POS', module: 'POS', display_order: 1 },
        { id: 'guide-2', title: 'SOP Tiếp đón', module: 'BOOKING', display_order: 2 },
      ];

      mockSupabase.adminClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockGuides, error: null }),
          }),
        }),
      });

      const guides = await service.getGuides();
      expect(guides).toHaveLength(2);
      expect(guides[0].title).toBe('SOP Thu ngân POS');
    });
  });

  describe('createTicket', () => {
    it('throws ForbiddenException if actor is missing', async () => {
      await expect(
        service.createTicket(null, {
          title: 'Lỗi in bill',
          description: 'Máy in bill không phản hồi',
          category: 'HARDWARE_POS',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates ticket and returns record', async () => {
      const actor = { id: 'user-001', role: 'CASHIER', branchId: 'branch-001' };
      const dto = {
        title: 'Lỗi in bill tại quầy POS',
        description: 'Khi bấm In Bill máy không nhận lệnh',
        category: 'HARDWARE_POS',
        priority: 'HIGH',
      };

      const createdTicket = {
        id: 'ticket-123',
        ticket_code: 'TK-202611-0001',
        ...dto,
        requester_id: actor.id,
        status: 'OPEN',
      };

      mockSupabase.adminClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdTicket, error: null }),
          }),
        }),
      });

      const result = await service.createTicket(actor, dto);
      expect(result.id).toBe('ticket-123');
      expect(result.ticket_code).toBe('TK-202611-0001');
      expect(result.priority).toBe('HIGH');
    });
  });

  describe('updateTicket', () => {
    it('rejects update if actor is not an admin', async () => {
      const staffActor = { id: 'user-staff', role: 'TECHNICIAN' };
      await expect(
        service.updateTicket(staffActor, 'ticket-1', { status: 'RESOLVED' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates ticket status and admin reply for admin actor', async () => {
      const adminActor = { id: 'admin-1', role: 'ADMIN' };
      const updatedRow = {
        id: 'ticket-1',
        status: 'RESOLVED',
        admin_reply: 'Đã cấu hình lại driver máy in',
      };

      mockDb.connection.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await service.updateTicket(adminActor, 'ticket-1', {
        status: 'RESOLVED',
        admin_reply: 'Đã cấu hình lại driver máy in',
      });

      expect(result.status).toBe('RESOLVED');
      expect(result.admin_reply).toBe('Đã cấu hình lại driver máy in');
    });
  });
});
