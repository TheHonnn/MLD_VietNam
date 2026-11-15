import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

describe('PaymentsService Security & Webhook Hardening Tests', () => {
  let mockSupabase: any;
  let mockRedis: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase = {
      adminClient: {
        from: vi.fn(),
      },
    };
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    };
  });

  it('does not store hardcoded credentials when env variables are missing', () => {
    const config = new ConfigService({});
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    expect((service as any).payos).toBeNull();
  });

  it('records a confirmed KH VietQR transfer once and ignores outbound transfers', async () => {
    const enrollment = {
      id: 'enrollment', student_id: 'student', course_id: 'course', receipt_branch_id: 'hq',
      consultation_status: 'CONFIRMED', tuition_total: 350000, amount_paid: 0,
    };
    let receipt: { enrollment_id: string; amount: number } | undefined;
    const query = vi.fn(async (sql: string, values?: unknown[]) => {
      if (sql.includes('FOR UPDATE OF e')) return { rows: [enrollment] };
      if (sql.startsWith('SELECT enrollment_id')) return { rows: receipt ? [receipt] : [] };
      if (sql.includes('INSERT INTO tuition_transactions')) receipt = { enrollment_id: 'enrollment', amount: Number(values?.[6]) };
      return { rows: [] };
    });
    const db = { connection: { connect: async () => ({ query, release: vi.fn() }) } };
    const service = new PaymentsService(new ConfigService({ BANK_WEBHOOK_SECRET: 'test-secret' }), mockSupabase, mockRedis, undefined, db as any);
    const headers = { authorization: 'Bearer test-secret' };
    const transfer = { transferAmount: 350000, content: 'MLD KH-20261114-001', referenceCode: 'bank-1', transferType: 'in' };
    await service.handleBankTransferWebhook({ ...transfer, transferType: 'out' }, headers);
    expect(query).not.toHaveBeenCalled();
    const result = await service.handleBankTransferWebhook(transfer, headers);
    expect(result.data).toEqual([expect.objectContaining({ matchedType: 'ENROLLMENT', matchedId: 'enrollment' })]);
    await service.handleBankTransferWebhook(transfer, headers);
    expect(query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO tuition_transactions'))).toHaveLength(1);
    expect(query.mock.calls.filter(([sql]) => sql.includes('UPDATE course_enrollments'))).toHaveLength(1);
    expect(mockSupabase.adminClient.from).not.toHaveBeenCalled();
  });

  it('rejects handleWebhook when PayOS is not configured with ServiceUnavailableException', async () => {
    const config = new ConfigService({});
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    await expect(service.handleWebhook({ code: '00', data: {} })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects bank transfer webhook in production if secret token is invalid or missing', async () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      BANK_WEBHOOK_SECRET: 'my-super-secure-webhook-token',
    });
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    // Call without headers
    await expect(
      service.handleBankTransferWebhook({ amount: 500000, content: 'INV-001' }, {}),
    ).rejects.toThrow(BadRequestException);

    // Call with wrong header
    await expect(
      service.handleBankTransferWebhook(
        { amount: 500000, content: 'INV-001' },
        { authorization: 'Bearer wrong-secret' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('skips duplicate payment processing when invoice is already PAID (Idempotency)', async () => {
    const config = new ConfigService({
      BANK_WEBHOOK_SECRET: 'test-secret',
    });
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockSupabase.adminClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'inv-123',
                  invoice_code: 'HD-SPA-123',
                  total_amount: 500000,
                  payment_status: 'PAID', // Already paid
                },
              }),
            }),
          }),
          update: updateSpy,
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    const result = await service.handleBankTransferWebhook(
      { amount: 500000, content: 'HD-SPA-123' },
      { authorization: 'Bearer test-secret' },
    );

    // Update should NOT have been called because it was already PAID
    expect(updateSpy).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('marks invoice as PARTIAL when amount transferred is less than invoice total', async () => {
    const config = new ConfigService({
      BANK_WEBHOOK_SECRET: 'test-secret',
    });
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockSupabase.adminClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'inv-456',
                  invoice_code: 'HD-SPA-456',
                  total_amount: 1000000, // Total is 1,000,000đ
                  payment_status: 'UNPAID',
                },
              }),
            }),
          }),
          update: updateSpy,
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    await service.handleBankTransferWebhook(
      { amount: 400000, content: 'HD-SPA-456' }, // Only paid 400,000đ
      { authorization: 'Bearer test-secret' },
    );

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: 'PARTIAL',
      }),
    );
  });
});
