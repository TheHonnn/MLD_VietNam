import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZaloController } from './zalo.controller';

describe('Zalo OA test send', () => {
  const controller = new ZaloController();
  const admin = { admin: { role: 'SUPER_ADMIN' } };
  const request = {
    recipientPhone: '0900 000 123',
    templateCode: 'BOOKING_CONFIRMATION',
    paramsSent: { booking_time: '14:30' },
  };
  const originalEnv = process.env;
  let send: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ZALO_OA_ACCESS_TOKEN: 'test-token',
      ZALO_BOOKING_CONFIRMATION_TEMPLATE_ID: '123',
      ZALO_TEST_PHONE: '+84900000123',
    };
    send = vi.spyOn(global, 'fetch').mockResolvedValue(
      Response.json({ error: 0, data: { msg_id: 'zalo-message-id' } }),
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns the receipt only after the provider accepts the template', async () => {
    const receipt = await controller.sendTest(admin, request);
    expect(receipt.messageId).toBe('zalo-message-id');
    const [url, options] = send.mock.calls[0];
    expect(url).toBe('https://business.openapi.zalo.me/message/template');
    expect(options.headers.access_token).toBe('test-token');
    expect(JSON.parse(options.body)).toEqual({
      phone: '84900000123', template_id: '123',
      template_data: request.paramsSent, tracking_id: receipt.trackingId,
    });
  });

  it('blocks unauthorized users and other recipients before contacting Zalo', async () => {
    await expect(controller.sendTest({ admin: { role: 'RECEPTIONIST' } }, request))
      .rejects.toMatchObject({ status: 403 });
    await expect(controller.sendTest(admin, { ...request, recipientPhone: '0900000124' }))
      .rejects.toMatchObject({ status: 400 });
    expect(send).not.toHaveBeenCalled();
  });

  it('fails when the token is missing and exposes only readiness flags', async () => {
    delete process.env.ZALO_OA_ACCESS_TOKEN;
    expect(controller.status(admin)).toEqual({
      tokenConfigured: false, templateConfigured: true, testPhoneConfigured: true,
    });
    await expect(controller.sendTest(admin, request)).rejects.toMatchObject({ status: 503 });
    expect(send).not.toHaveBeenCalled();
  });

  it('does not report success on provider rejection or a missing receipt', async () => {
    send.mockResolvedValueOnce(Response.json({ error: -124 }));
    send.mockResolvedValueOnce(Response.json({ error: 0 }));
    await expect(controller.sendTest(admin, request)).rejects.toMatchObject({ status: 502 });
    await expect(controller.sendTest(admin, request)).rejects.toMatchObject({ status: 502 });
  });
});
