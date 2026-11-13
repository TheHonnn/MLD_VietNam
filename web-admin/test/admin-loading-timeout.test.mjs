import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('a stalled production coupon read times out instead of leaving the screen loading', async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/admin/api.ts', import.meta.url))],
    define: { 'import.meta.env': JSON.stringify({ VITE_ADMIN_DATA_SOURCE: 'supabase' }) },
    bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent',
    plugins: [{ name: 'isolated-supabase', setup(builder) {
      builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'client', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: "export const SUPABASE_URL='https://fixture.invalid'; export const getSupabaseHeaders=()=>({});", loader: 'js',
      }));
    } }],
  });
  const original = { fetch: globalThis.fetch, window: globalThis.window, sessionStorage: globalThis.sessionStorage };
  let scheduled;
  const calls = [];
  globalThis.window = {
    location: { protocol: 'https:', hostname: 'admin.invalid' },
    setTimeout: callback => { scheduled = callback; return 1; },
    clearTimeout: () => {},
  };
  globalThis.sessionStorage = { getItem: () => null };
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    return new Promise((resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
    });
  };
  try {
    const { adminApi } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    const result = adminApi('coupons?', undefined, new AbortController().signal).then(
      () => ({ success: true }),
      error => ({ error }),
    );
    scheduled?.();
    const outcome = await Promise.race([result, new Promise(resolve => setTimeout(() => resolve({ stalled: true }), 50))]);
    assert.ok(outcome.error, 'coupon request stayed pending after its loading deadline');
    assert.match(outcome.error.message, /tải lại|quá thời gian/i);
    assert.equal(calls.length, 1, 'a failed read must not switch data source');
    globalThis.fetch = async (url) => {
      calls.push(url);
      return new Response(JSON.stringify([]), { headers: { 'Content-Range': '*/0' } });
    };
    const retried = await adminApi('coupons?');
    assert.deepEqual(retried.rows, []);
    assert.ok(calls.every(url => url.startsWith('https://fixture.invalid/')), 'retry uses the original data source');
    const cancelled = new AbortController();
    globalThis.fetch = async (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
    });
    const interrupted = adminApi('coupons?', undefined, cancelled.signal);
    cancelled.abort();
    await assert.rejects(interrupted, { name: 'AbortError' });
  } finally {
    Object.assign(globalThis, original);
  }
});
