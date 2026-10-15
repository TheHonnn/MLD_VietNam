import express, { Request, Response, NextFunction } from 'express';
import { ApiError } from './errors.js';
import { verifyZaloPhone, ZaloAuthOptions } from './zalo-auth.js';
import { RELAY_PATH, RELAY_WINDOW_MS, validRelaySignature, encryptRelayPayload, decryptRelayPayload } from './zalo-relay-protocol.js';

interface RelayOptions extends ZaloAuthOptions { relaySecret: string; }

export function createZaloRelay(options: RelayOptions) {
  if (options.relaySecret.length < 32 || !/^\d{1,64}$/.test(options.zaloAppId ?? '') || !options.zaloAppSecret) {
    throw new Error('Relay requires ZALO_APP_ID, ZALO_APP_SECRET and a relay secret of at least 32 characters');
  }
  const app = express();
  app.disable('x-powered-by');
  const nonces = new Map<string, number>();
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.post(RELAY_PATH, express.raw({ type: 'application/json', limit: '24kb' }), (req, res, next) => {
    Promise.resolve().then(async () => {
      const timestamp = req.get('X-Relay-Timestamp') ?? '';
      const nonce = req.get('X-Relay-Nonce') ?? '';
      const signature = req.get('X-Relay-Signature') ?? '';
      const now = Date.now();
      if (req.originalUrl !== RELAY_PATH || !Buffer.isBuffer(req.body) || !/^\d{13}$/.test(timestamp)
        || !/^[a-f0-9-]{36}$/.test(nonce) || Math.abs(now - Number(timestamp)) > RELAY_WINDOW_MS
        || !validRelaySignature(req.body.toString('utf8'), timestamp, nonce, signature, options.relaySecret)) {
        throw new ApiError(401, 'Invalid relay request signature or timestamp');
      }
      for (const [key, expires] of nonces) if (expires <= now) nonces.delete(key);
      if (nonces.has(nonce)) throw new ApiError(401, 'Relay request has already been used');
      if (nonces.size >= 10000) throw new ApiError(503, 'Relay capacity reached; retry later');
      nonces.set(nonce, now + 2 * RELAY_WINDOW_MS);
      let input: any;
      try { input = decryptRelayPayload(JSON.parse(req.body.toString('utf8')), options.relaySecret, 'request', timestamp, nonce); }
      catch { throw new ApiError(400, 'Invalid encrypted relay request'); }
      const phone = await verifyZaloPhone(input?.accessToken, input?.phoneToken, options);
      res.json({ success: true, data: encryptRelayPayload({ phone, appId: options.zaloAppId }, options.relaySecret, 'response', timestamp, nonce) });
    }).catch(next);
  });
  app.use((_req, res) => res.status(404).json({ success: false, statusCode: 404, message: 'Not found' }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const oversized = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
    const status = error instanceof ApiError ? error.status : oversized ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ success: false, statusCode: status,
      message: error instanceof ApiError ? error.message : 'Relay request failed' });
  });
  return app;
}
