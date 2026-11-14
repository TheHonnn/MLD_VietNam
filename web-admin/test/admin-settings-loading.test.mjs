import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('settings read exposes API failures instead of returning editable defaults', async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/services/settings.service.ts', import.meta.url))],
    bundle: true, write: false, format: 'esm',
    plugins: [{ name: 'settings-api', setup(builder) {
      builder.onResolve({ filter: /admin\/api$/ }, () => ({ path: 'api', namespace: 'fixture' }));
      builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'client', namespace: 'client-fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'client-fixture' }, () => ({ contents: "export const SUPABASE_URL = 'https://fixture.invalid'; export const getAdminAuthToken = () => 'token'; export const getSupabaseHeaders = () => ({});" }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: "export const adminCommand = async () => { throw new Error('Service unavailable'); }; export const adminApi = adminCommand;",
      }));
    } }],
  });
  const { settingsService } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  await assert.rejects(settingsService.getAllSettings(), /Service unavailable/);

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://fixture.invalid/rest/v1/rpc/admin_read_system_settings');
      assert.equal(options.cache, 'no-store');
      return Response.json({ general: { data: { company_name: 'Saved company' } } });
    };
    assert.equal((await settingsService.getAllSettings(undefined, 'SUPER_ADMIN')).general.data.company_name, 'Saved company');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
