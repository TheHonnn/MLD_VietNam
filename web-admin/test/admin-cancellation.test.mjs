import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('cancelling a screen request does not disable the local backend or query Supabase', async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/admin/api.ts', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent',
    plugins: [{ name: 'isolated-supabase', setup(builder) {
      builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'client', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: "export const SUPABASE_URL='https://fixture.invalid'; export const getSupabaseHeaders=()=>({});", loader: 'js',
      }));
    } }],
  });
  const original = { fetch: globalThis.fetch, window: globalThis.window, sessionStorage: globalThis.sessionStorage };
  globalThis.window = { location: { protocol: 'http:', hostname: '127.0.0.1' }, setTimeout, clearTimeout };
  globalThis.sessionStorage = { getItem: () => null };
  try {
    const { adminApi } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push(url);
      if (calls.length === 1) {
        return new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
        });
      }
      return new Response(JSON.stringify({ success: true, data: ['local-result'] }));
    };
    const controller = new AbortController();
    const cancelled = adminApi('resources', undefined, controller.signal);
    controller.abort();
    await assert.rejects(cancelled, { name: 'AbortError' });
    assert.deepEqual(await adminApi('resources'), ['local-result']);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(url => url.startsWith('http://127.0.0.1:3000/api/v1/admin/')));
  } finally {
    Object.assign(globalThis, original);
  }
});
