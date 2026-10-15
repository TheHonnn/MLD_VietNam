import { randomUUID } from 'node:crypto';
import { ApiError } from './errors.js';
import { verifyZaloPhone, ZaloAuthOptions } from './zalo-auth.js';
import { RELAY_PATH, signRelayRequest } from './zalo-relay-protocol.js';

export interface RelayAuthOptions extends ZaloAuthOptions {
  zaloRelayUrl?: string;
  zaloRelaySecret?: string;
}

export async function authenticateZalo(accessToken: unknown, phoneToken: unknown, options: RelayAuthOptions) {
  if (!options.zaloRelayUrl) {
    const phone = await verifyZaloPhone(accessToken, phoneToken, options);
    return { phone };
  }
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > 8192 || /\s/.test(accessToken)
    || typeof phoneToken !== 'string' || !phoneToken || phoneToken.length > 8192 || /\s/.test(phoneToken)) {
    throw new ApiError(400, 'Zalo access token and phone permission code are required');
  }
  let base: URL;
  try { base = new URL(options.zaloRelayUrl); }
  catch { throw new ApiError(503, 'Invalid private Zalo relay configuration'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/'
    || (options.zaloRelaySecret?.length ?? 0) < 32 || !/^\d{1,64}$/.test(options.zaloAppId ?? '')) {
    throw new ApiError(503, 'Private relay requires an HTTPS origin, app ID and a secret of at least 32 characters');
  }
  const body = JSON.stringify({ accessToken, phoneToken });
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  let response: Response;
  let result: any;
  try {
    response = await (options.fetch ?? fetch)(new URL(RELAY_PATH, base), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Timestamp': timestamp,
        'X-Relay-Nonce': nonce,
        'X-Relay-Signature': signRelayRequest(body, timestamp, nonce, options.zaloRelaySecret!),
      },
      body, redirect: 'error', signal: AbortSignal.timeout(25000),
    });
    result = await response.json();
  } catch { throw new ApiError(502, 'Private Zalo relay is unavailable; please retry'); }
  if (!response.ok || result?.success !== true) {
    const providerStatus = Number(result?.statusCode);
    const status = response.status === providerStatus && [400,401,403].includes(providerStatus) ? providerStatus : 502;
    console.warn('[Zalo relay]', JSON.stringify({ httpStatus: response.status, reason: 'verification-failed' }));
    // Do not pass arbitrary relay error messages into the frontend or logs.
    throw new ApiError(status, status === 502 ? 'Private Zalo relay could not verify the account; check relay Logs'
      : 'Zalo verification failed; grant permissions and sign in again');
  }
  const profile = result.data;
  if (profile?.appId !== options.zaloAppId || typeof profile?.phone !== 'string' || !/^0[1-9]\d{8,9}$/.test(profile.phone)) {
    throw new ApiError(502, 'Private Zalo relay returned an invalid account or parent app ID');
  }
  return { phone: profile.phone as string };
}
