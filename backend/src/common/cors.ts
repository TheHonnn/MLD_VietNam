export const DEFAULT_PROD_ORIGINS = [
  'https://mldvietnam.vn',
  'https://www.mldvietnam.vn',
  'https://admin.mldvietnam.vn',
  'https://mld-web-admin.vercel.app',
  'https://mld-vietnam.vercel.app',
];

const MLD_PREVIEW_ORIGIN_PATTERNS = [
  /^https:\/\/(?:mld-vietnam|mld-web-admin)(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/(?:[a-z0-9-]+\.)?mldvietnam\.vn$/i,
];

function normalizeOrigin(origin: string): string {
  return String(origin || '').trim().replace(/\/+$/, '');
}

export function resolveAllowedCorsOrigins(rawCorsOrigin?: string): string[] {
  const configured = String(rawCorsOrigin || '')
    .split(',')
    .map(normalizeOrigin)
    .filter((item) => Boolean(item) && item !== '*');

  return Array.from(new Set([...DEFAULT_PROD_ORIGINS, ...configured]));
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  isProduction: boolean,
): boolean {
  if (!origin || !isProduction) {
    return true;
  }
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) {
    return true;
  }
  return MLD_PREVIEW_ORIGIN_PATTERNS.some((pattern) => pattern.test(normalized));
}
