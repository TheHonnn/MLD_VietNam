import { createHmac, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ApiError } from './errors.js';
import { Store } from './store.js';

export interface ZaloAuthOptions {
  zaloAppId?: string;
  zaloAppSecret?: string;
  zaloAllowSignup?: boolean;
  fetch?: typeof fetch;
}

function providerFailure(stage: 'profile' | 'phone', response: Response, body: any, reason: string, credentials: string[] = []) {
  const rawCode = body?.error?.code ?? body?.error_code ?? body?.error;
  const code = typeof rawCode === 'number' && Number.isSafeInteger(rawCode) ? rawCode
    : typeof rawCode === 'string' && /^-?\d{1,8}$/.test(rawCode) ? Number(rawCode) : undefined;
  let providerMessage = typeof body?.message === 'string' ? body.message
    : typeof body?.error?.message === 'string' ? body.error.message : '';
  const privateValues = [...credentials, body?.id, body?.name, body?.data?.number]
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  for (const value of privateValues.sort((a, b) => b.length - a.length)) {
    providerMessage = providerMessage.split(value).join('[REDACTED]');
    providerMessage = providerMessage.split(encodeURIComponent(value)).join('[REDACTED]');
  }
  providerMessage = providerMessage
    .replace(/https?:\/\/\S+/gi, '[REDACTED_URL]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d .()-]{6,}\d/g, '[REDACTED_NUMBER]')
    .replace(/[A-Za-z0-9_=-]{16,}/g, '[REDACTED]')
    .replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 400);
  // Do not log the response body, profile, request headers or credentials.
  console.warn('[Zalo verification]', JSON.stringify({ stage, httpStatus: response.status, providerCode: code, reason, providerMessage }));
  return code == null ? '' : ` (Zalo code ${code})`;
}

export async function verifyZaloAccount(accessToken: unknown, options: ZaloAuthOptions) {
  if (typeof accessToken !== 'string' || !accessToken.trim() || accessToken.length > 8192 || /\s/.test(accessToken)) {
    throw new ApiError(400, 'A valid Zalo access token is required');
  }
  if (!/^\d+$/.test(options.zaloAppId ?? '') || !options.zaloAppSecret) {
    throw new ApiError(503, 'Configure ZALO_APP_ID and ZALO_APP_SECRET on the Mini App backend');
  }
  // Same headers and HMAC construction as the official zaloplatform/zalo-php-sdk.
  const endpoint = new URL('https://graph.zalo.me/v2.0/me');
  endpoint.searchParams.set('fields', 'id,name,picture');
  let response: Response;
  let profile: any;
  try {
    response = await (options.fetch ?? fetch)(endpoint, {
      headers: {
        access_token: accessToken,
        appsecret_proof: createHmac('sha256', options.zaloAppSecret).update(accessToken).digest('hex'),
      },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (response.status >= 500 || response.status === 429) throw new Error('Upstream unavailable');
    profile = await response.json();
  } catch {
    throw new ApiError(502, 'Cannot verify the Zalo account right now; please retry');
  }
  if (!response.ok || (profile?.error != null && profile.error !== 0)) {
    const suffix = providerFailure('profile', response, profile, !response.ok ? 'http-error' : 'provider-error', [accessToken, options.zaloAppSecret]);
    if (Number(profile?.error?.code ?? profile?.error_code ?? profile?.error) === -501) {
      throw new ApiError(502, `Zalo verification failed with a provider error; inspect the provider response in server Logs${suffix}`);
    }
    throw new ApiError(401, `Zalo rejected the access token; check the parent app credentials and sign in again${suffix}`);
  }
  if (typeof profile?.id !== 'string' || !/^\d{1,64}$/.test(profile.id)) {
    providerFailure('profile', response, profile, typeof profile?.id !== 'string' ? 'invalid-id-type' : 'invalid-id-format', [accessToken, options.zaloAppSecret]);
    throw new ApiError(502, 'Zalo profile response has an unsupported user ID format');
  }
  if (profile.app_id != null && String(profile.app_id) !== options.zaloAppId) {
    providerFailure('profile', response, profile, 'parent-app-mismatch', [accessToken, options.zaloAppSecret]);
    throw new ApiError(401, 'Zalo token belongs to another application');
  }
  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  if (!name || name.length > 150) throw new ApiError(403, 'Allow access to your Zalo name and avatar to continue');
  let avatar: string | null = null;
  try {
    const url = new URL(profile.picture?.data?.url);
    if (url.protocol === 'https:' && !url.username && !url.password) avatar = url.href;
  } catch { /* A missing avatar does not prevent login. */ }
  return { id: profile.id as string, name, avatar };
}

export async function verifyZaloPhone(accessToken: string, phoneToken: unknown, options: ZaloAuthOptions) {
  if (typeof phoneToken !== 'string' || !phoneToken || phoneToken.length > 8192 || /\s/.test(phoneToken)) {
    throw new ApiError(400, 'Allow Zalo phone sharing to connect your shared customer account');
  }
  if (!options.zaloAppSecret) throw new ApiError(503, 'Configure ZALO_APP_SECRET on the Mini App backend');
  let response: Response;
  let body: any;
  try {
    response = await (options.fetch ?? fetch)('https://graph.zalo.me/v2.0/me/info', {
      headers: { access_token: accessToken, code: phoneToken, secret_key: options.zaloAppSecret },
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (response.status >= 500 || response.status === 429) throw new Error('Upstream unavailable');
    body = await response.json();
  } catch { throw new ApiError(502, 'Cannot verify the Zalo phone right now; please retry'); }
  if (!response.ok || body?.error !== 0 || typeof body?.data?.number !== 'string') {
    const suffix = providerFailure('phone', response, body, !response.ok ? 'http-error' : 'provider-error-or-invalid-number', [accessToken, phoneToken, options.zaloAppSecret]);
    throw new ApiError(401, `Zalo phone permission expired or was rejected; please try again${suffix}`);
  }
  const international = body.data.number.replace(/^\+/, '');
  if (!/^84[1-9]\d{8,9}$/.test(international)) throw new ApiError(401, 'Zalo returned an unsupported phone number');
  return `0${international.slice(2)}`;
}

export async function resolveZaloAccount(store: Store, profile: Awaited<ReturnType<typeof verifyZaloAccount>> & { phone: string }, options: ZaloAuthOptions) {
  if (!/^0[1-9]\d{8,9}$/.test(profile.phone)) throw new ApiError(400, 'A verified local phone number is required');
  const international = `84${profile.phone.slice(1)}`;
  // Use the shared phone identity; do not change the group's schema or create
  // a separate customer namespace. Retry concurrent first-login conflicts.
  for (let attempt = 0; ; attempt++) {
    try {
      return await store.transaction(async tx => {
        await tx.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${profile.phone}))::text AS locked`);
        const accounts = await tx.query(Prisma.sql`SELECT id,is_active,role FROM public.users
          WHERE phone IN (${profile.phone},${international},${`+${international}`}) FOR UPDATE`);
        if (accounts.length > 1) throw new ApiError(409, 'Duplicate shared phone identities require administrator review');
        const account = accounts[0];
        if (account) {
          if (!account.is_active) throw new ApiError(401, 'Shared account is missing or inactive');
          if (!['CUSTOMER','STUDENT'].includes(account.role)) throw new ApiError(403, 'This account is not a customer account');
          return { userId: String(account.id), isNewUser: false };
        }
        if (!options.zaloAllowSignup) throw new ApiError(409, 'New customer signup is disabled; contact support');
        const userId = randomUUID();
        const referralCode = randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
        await tx.query(Prisma.sql`INSERT INTO public.users (id,phone,full_name,avatar_url,referral_code)
          VALUES (${userId}::uuid,${profile.phone},${profile.name},${profile.avatar},${referralCode}) RETURNING id`);
        return { userId, isNewUser: true };
      });
    } catch (error: any) {
      const retryable = error?.code === 'P2034' || error?.code === 'P2002'
        || ['23505','40001','40P01'].includes(String(error?.meta?.code ?? error?.code));
      if (!retryable || attempt >= 2) throw error;
    }
  }
}
