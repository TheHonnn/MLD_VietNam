import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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

  it('exposes unconfigured gateway state safely when env credentials are left blank', async () => {
    const config = new ConfigService({
      PAYMENT_GATEWAY_PROVIDER: '',
      PAYMENT_GATEWAY_API_KEY: '',
      PAYMENT_GATEWAY_SECRET_KEY: '',
    });
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    const publicConfig = service.getGatewayPublicConfig();
    expect(publicConfig.provider).toBe('UNCONFIGURED');
    expect(publicConfig.configured).toBe(false);

    const intent = await service.createGatewayIntent({
      amount: 500000,
      description: 'MLD BK-001',
      targetType: 'BOOKING',
      targetId: 'bk-uuid-1',
      referenceCode: 'BK-001',
    });

    expect(intent.gatewayConfigured).toBe(false);
    expect(intent.status).toBe('PENDING');
    expect(intent.isPaid).toBe(false);
    expect(intent.orderCode).toBeGreaterThan(0);
  });

  it('rejects generic gateway webhook when credentials are left blank', async () => {
    const config = new ConfigService({});
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    await expect(
      service.handleGenericGatewayWebhook('custom', { orderCode: 123456, amount: 500000 }, {}),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('verifies HMAC signature on generic gateway webhook and reconciles intent idempotently', async () => {
    const secretKey = 'plug-and-play-secret-key';
    const config = new ConfigService({
      PAYMENT_GATEWAY_PROVIDER: 'CUSTOM',
      PAYMENT_GATEWAY_SECRET_KEY: secretKey,
      PAYMENT_GATEWAY_WEBHOOK_SECRET: 'wh-secret',
    });
    const service = new PaymentsService(config, mockSupabase, mockRedis);

    const intentUpdateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const bookingUpdateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    let currentStatus = 'PENDING';

    mockSupabase.adminClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'payment_gateway_intents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(async () => ({
                data: {
                  id: 'intent-1',
                  order_code: 998877,
                  target_type: 'BOOKING',
                  target_id: 'bk-99',
                  reference_code: 'BK-998877',
                  amount: 750000,
                  amount_paid: currentStatus === 'PAID' ? 750000 : 0,
                  status: currentStatus,
                },
              })),
            }),
          }),
          update: (payload: any) => {
            currentStatus = 'PAID';
            return intentUpdateSpy(payload);
          },
        };
      }
      if (table === 'bookings') {
        return { update: bookingUpdateSpy };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    const payload = {
      orderCode: 998877,
      amount: 750000,
      status: 'PAID',
      transactionId: 'GW-TX-01',
    };
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    await expect(
      service.handleGenericGatewayWebhook('custom', payload, { 'x-signature': 'bad-sig' }),
    ).rejects.toThrow(BadRequestException);

    const first = await service.handleGenericGatewayWebhook('custom', payload, { 'x-signature': signature });
    expect(first.reconciled).toBe(true);
    expect(first.idempotent).toBe(false);
    expect(intentUpdateSpy).toHaveBeenCalledTimes(1);
    expect(bookingUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_status: 'PAID',
        status: 'CONFIRMED',
      }),
    );

    const second = await service.handleGenericGatewayWebhook('custom', payload, { 'x-signature': signature });
    expect(second.idempotent).toBe(true);
    expect(intentUpdateSpy).toHaveBeenCalledTimes(1);
  });
});
