import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('permission catalog uses the persisted session when a new tab has no sessionStorage token', async () => {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/admin/api.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent',
    define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: 'https://api.invalid/api/v1' }) },
    plugins: [{ name: 'isolated-client', setup(builder) {
      builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'client', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: "export const SUPABASE_URL='https://fixture.invalid';export const getSupabaseHeaders=()=>({});", loader: 'js' }));
    } }],
  });
  const original = { window: globalThis.window, sessionStorage: globalThis.sessionStorage, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
  globalThis.window = { location: { protocol: 'https:', hostname: 'admin.invalid' }, setTimeout, clearTimeout };
  globalThis.sessionStorage = { getItem: () => null };
  globalThis.localStorage = { getItem: key => key === 'mld_admin_token' ? 'persisted-test-session' : null };
  globalThis.fetch = async (_url, options) => options.headers.Authorization === 'Bearer persisted-test-session'
    ? new Response(JSON.stringify({ success: true, data: [{ name: 'courses', actions: [] }] }))
    : new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
  try {
    const { adminCommand } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
    assert.equal((await adminCommand('resources'))[0].name, 'courses');
  } finally { Object.assign(globalThis, original); }
});

async function resourceLoader() {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/admin/loadResources.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
    plugins: [{ name: 'resource-fixture', setup(builder) {
      builder.onResolve({ filter: /^\.\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const adminCommand=(...args)=>globalThis.sidebarRequest(...args);', loader: 'js' }));
    } }],
  });
  return (await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'))).loadResources;
}

test('permission catalog recovers from a transient backend failure', async () => {
  const load = await resourceLoader();
  let calls = 0;
  globalThis.sidebarRequest = async () => {
    if (++calls === 1) throw Object.assign(new Error('Starting'), { statusCode: 503 });
    return [{ name: 'courses', actions: [] }];
  };
  try { assert.equal((await load(new AbortController().signal))[0].name, 'courses'); assert.equal(calls, 2); }
  finally { delete globalThis.sidebarRequest; }
});

test('permission denial and malformed catalogs never grant defaults or retry', async () => {
  const load = await resourceLoader();
  try {
    for (const statusCode of [401, 403]) {
      let calls = 0;
      globalThis.sidebarRequest = async () => { calls++; throw Object.assign(new Error('Denied'), { statusCode }); };
      await assert.rejects(load(new AbortController().signal), /Denied/); assert.equal(calls, 1);
    }
    globalThis.sidebarRequest = async () => ({ resources: 'invalid' });
    await assert.rejects(load(new AbortController().signal), /không hợp lệ/);
  } finally { delete globalThis.sidebarRequest; }
});

test('changing session cancels a pending permission retry', async () => {
  const load = await resourceLoader();
  const controller = new AbortController();
  let calls = 0;
  globalThis.sidebarRequest = async () => { calls++; throw Object.assign(new Error('Starting'), { statusCode: 503 }); };
  try {
    await assert.rejects(load(controller.signal, () => controller.abort()), { name: 'AbortError' });
    assert.equal(calls, 1);
  } finally { delete globalThis.sidebarRequest; }
});
