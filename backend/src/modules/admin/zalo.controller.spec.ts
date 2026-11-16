import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AdminDatabase } from './admin.database';
import { ZaloController } from './zalo.controller';

describe('Zalo OA test send', () => {
  const query = vi.fn();
  const controller = new ZaloController({ connection: { query } } as unknown as AdminDatabase);
  const admin = { admin: { role: 'SUPER_ADMIN' } };
  const request = {
    recipientPhone: '0900 000 123',
    templateCode: 'BOOKING_CONFIRMATION',
    paramsSent: { booking_time: '14:30' },
  };
  const originalEnv = process.env;
  let send: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    query.mockReset().mockResolvedValue({ rows: [] });
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

  it('fails when the token is missing and never returns the token', async () => {
    delete process.env.ZALO_OA_ACCESS_TOKEN;
    await expect(controller.status(admin)).resolves.toEqual({
      tokenConfigured: false, templateConfigured: true, testPhoneConfigured: true,
      templateId: '123', testPhone: '84900000123',
    });
    await expect(controller.sendTest(admin, request)).rejects.toMatchObject({ status: 503 });
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects unauthorized writes before touching the database', async () => {
    await expect(controller.saveSettings({ admin: { role: 'RECEPTIONIST' } }, {
      accessToken: 'test-token', templateId: '123', testPhone: '0900000123',
    })).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
  });

  it('saves private configuration, keeps a blank replacement token and uses the saved values', async () => {
    const database = new PGlite();
    try {
      await database.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
      const migration = readFileSync(resolve(__dirname, '../../../../database/migrations/042_zalo_oa_admin_settings.sql'), 'utf8');
      await database.exec(migration);
      await database.exec(migration);
      const stored = new ZaloController({ connection: database } as unknown as AdminDatabase);
      const first = await stored.saveSettings(admin, {
        accessToken: 'stored-oa-token', templateId: '456', testPhone: '0900000124',
      });
      expect(first).toEqual({
        tokenConfigured: true, templateConfigured: true, testPhoneConfigured: true,
        templateId: '456', testPhone: '84900000124',
      });
      await stored.saveSettings(admin, { templateId: '789', testPhone: '0900000125' });
      await stored.sendTest(admin, { ...request, recipientPhone: '0900000125' });
      const [, options] = send.mock.calls[0];
      expect(options?.headers).toMatchObject({ access_token: 'stored-oa-token' });
      expect(JSON.parse(String(options?.body))).toMatchObject({ template_id: '789', phone: '84900000125' });
      for (const role of ['anon', 'authenticated']) {
        await database.exec('SET ROLE ' + role);
        await expect(database.query('SELECT access_token FROM mld_private.zalo_oa_settings')).rejects.toMatchObject({ code: '42501' });
        await database.exec('RESET ROLE');
      }
    } finally {
      await database.close();
    }
  }, 20000);

  it('does not report success on provider rejection or a missing receipt', async () => {
    send.mockResolvedValueOnce(Response.json({ error: -124 }));
    send.mockResolvedValueOnce(Response.json({ error: 0 }));
    await expect(controller.sendTest(admin, request)).rejects.toMatchObject({ status: 502 });
    await expect(controller.sendTest(admin, request)).rejects.toMatchObject({ status: 502 });
  });
});
