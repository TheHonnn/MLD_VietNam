import { describe, expect, it } from 'vitest';
import { isOriginAllowed, resolveAllowedCorsOrigins } from './cors';

describe('Backend CORS origin policy', () => {
  it('retains default production Vercel and MLD origins even when CORS_ORIGIN omits them', () => {
    const allowed = resolveAllowedCorsOrigins(
      'https://mldvietnam.vn, https://admin.mldvietnam.vn/, https://custom.example.com/',
    );

    expect(isOriginAllowed('https://mld-vietnam.vercel.app', allowed, true)).toBe(true);
    expect(isOriginAllowed('https://mld-vietnam.vercel.app/', allowed, true)).toBe(true);
    expect(isOriginAllowed('https://mld-web-admin.vercel.app', allowed, true)).toBe(true);
    expect(isOriginAllowed('https://admin.mldvietnam.vn', allowed, true)).toBe(true);
    expect(isOriginAllowed('https://custom.example.com', allowed, true)).toBe(true);
  });

  it('allows MLD Vercel preview URLs and rejects third-party origins in production', () => {
    const allowed = resolveAllowedCorsOrigins('');

    expect(
      isOriginAllowed(
        'https://mld-vietnam-git-develop-xuantruongdev26-2352s-projects.vercel.app',
        allowed,
        true,
      ),
    ).toBe(true);
    expect(isOriginAllowed('https://evil-app.vercel.app', allowed, true)).toBe(false);
    expect(isOriginAllowed('https://mld-vietnam.evil.com', allowed, true)).toBe(false);
    expect(isOriginAllowed('http://localhost:5173', allowed, false)).toBe(true);
  });
});
