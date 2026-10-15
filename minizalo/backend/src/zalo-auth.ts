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
  if (!response.ok || (profile?.error != null && profile.error !== 0)
    || typeof profile?.id !== 'string' || !/^\d{1,64}$/.test(profile.id)) {
    throw new ApiError(401, 'Zalo rejected the access token; please sign in again');
  }
  if (profile.app_id != null && String(profile.app_id) !== options.zaloAppId) {
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

export async function resolveZaloAccount(store: Store, profile: Awaited<ReturnType<typeof verifyZaloAccount>>, options: ZaloAuthOptions) {
  const columns = await store.query(Prisma.sql`SELECT table_name,column_name,is_nullable
    FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name IN ('zalo_identities','users')`);
  if (['zalo_app_id','zalo_user_id','user_id'].some(name => !columns.some(c => c.table_name === 'zalo_identities' && c.column_name === name))) {
    throw new ApiError(503, 'Database owner must apply the reviewed Zalo identity extension before login');
  }
  const phoneOptional = columns.some(c => c.table_name === 'users' && c.column_name === 'phone' && c.is_nullable === 'YES');
  // Retry serialization/unique conflicts from simultaneous first logins. The
  // unique provider key and transaction keep the shared user and mapping atomic.
  for (let attempt = 0; ; attempt++) {
    try {
      return await store.transaction(async tx => {
        await tx.query(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${options.zaloAppId}:${profile.id}`}))::text AS locked`);
        const [linked] = await tx.query(Prisma.sql`SELECT user_id FROM public.zalo_identities
          WHERE zalo_app_id = ${options.zaloAppId!} AND zalo_user_id = ${profile.id}`);
        if (linked) return { userId: String(linked.user_id), isNewUser: false };
        if (!options.zaloAllowSignup) throw new ApiError(409, 'Zalo account is not linked; contact support to link your existing customer account');
        if (!phoneOptional) throw new ApiError(503, 'Database owner must approve phone-free shared accounts before Zalo signup');
        const userId = randomUUID();
        const referralCode = randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
        await tx.query(Prisma.sql`INSERT INTO public.users (id,phone,full_name,avatar_url,referral_code)
          VALUES (${userId}::uuid,NULL,${profile.name},${profile.avatar},${referralCode}) RETURNING id`);
        await tx.query(Prisma.sql`INSERT INTO public.zalo_identities (zalo_app_id,zalo_user_id,user_id)
          VALUES (${options.zaloAppId!},${profile.id},${userId}::uuid) RETURNING user_id`);
        return { userId, isNewUser: true };
      });
    } catch (error: any) {
      const retryable = error?.code === 'P2034' || error?.code === 'P2002'
        || ['23505','40001','40P01'].includes(String(error?.meta?.code ?? error?.code));
      if (!retryable || attempt >= 2) throw error;
    }
  }
}
